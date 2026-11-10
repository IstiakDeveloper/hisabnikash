import 'dart:convert';
import 'dart:ffi';
import 'dart:io';
import 'dart:typed_data';
import 'package:cryptography/cryptography.dart';
import 'package:dio/dio.dart';
import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqlite3/open.dart';
import 'package:hisabnikash_mobile/core/database.dart';
import 'package:hisabnikash_mobile/core/models.dart';
import 'package:hisabnikash_mobile/core/repository.dart';
import 'package:hisabnikash_mobile/core/sync.dart';
import 'package:hisabnikash_mobile/core/vault.dart';

/// In-memory transport exercises the real mobile sync client, SQLite and crypto.
class SyncServer implements HttpClientAdapter {
  final records = <String, Json>{};
  final changes = <Json>[];
  final receipts = <String, Json>{};
  bool dropNextPushResponse = false;
  Future<void> Function()? beforeResponse;
  @override
  Future<ResponseBody> fetch(RequestOptions options,
      Stream<Uint8List>? requestStream, Future<void>? cancelFuture) async {
    Json body;
    if (options.path == '/sync/push') {
      final results = <Json>[];
      for (final raw in options.data['operations']) {
        final operation = Map<String, dynamic>.from(raw);
        final id = operation['id'] as String,
            operationId = operation['operation_id'] as String;
        if (receipts.containsKey(operationId)) {
          results.add(receipts[operationId]!);
          continue;
        }
        final prior = records[id];
        if ((prior?['revision'] ?? 0) != operation['base_revision']) {
          results.add({
            'id': id,
            'operation_id': operationId,
            'status': 'conflict',
            'remote': prior
          });
          continue;
        }
        final revision = (prior?['revision'] as int? ?? 0) + 1;
        final record = <String, dynamic>{
          'id': id,
          'kind': operation['kind'],
          'data': operation['data'],
          'deleted': operation['deleted'],
          'revision': revision
        };
        records[id] = record;
        changes.add(record);
        final result = <String, dynamic>{
          'id': id,
          'operation_id': operationId,
          'status': 'accepted',
          'revision': revision
        };
        receipts[operationId] = result;
        results.add(result);
      }
      if (beforeResponse != null) {
        final callback = beforeResponse!;
        beforeResponse = null;
        await callback();
      }
      if (dropNextPushResponse) {
        dropNextPushResponse = false;
        throw DioException(
            requestOptions: options, type: DioExceptionType.receiveTimeout);
      }
      body = {'results': results};
    } else {
      final cursor = options.queryParameters['cursor'] as int;
      final end = (cursor + 2).clamp(0, changes.length);
      body = {
        'changes': changes.sublist(cursor, end),
        'cursor': end,
        'has_more': end < changes.length
      };
    }
    return ResponseBody.fromString(jsonEncode(body), 200, headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType]
    });
  }

  @override
  void close({bool force = false}) {}
}

class TestSync extends SyncService {
  TestSync(FinanceRepository repository, this.server)
      : super(repository, const FlutterSecureStorage());
  final SyncServer server;
  @override
  Dio client(String base, String? token) => Dio()..httpClientAdapter = server;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  // Each simulated device owns an independent in-memory SQLite executor.
  driftRuntimeOptions.dontWarnAboutMultipleDatabases = true;
  if (Platform.isWindows) {
    open.overrideFor(
        OperatingSystem.windows, () => DynamicLibrary.open('winsqlite3.dll'));
  }
  late FinanceRepository a, b;
  late SyncServer server;
  late TestSync syncA, syncB;
  late String space, cash;
  setUp(() async {
    FlutterSecureStorage.setMockInitialValues({'syncToken': 'test-token'});
    Future<FinanceRepository> make() async {
      final repo = FinanceRepository(FinanceDatabase.memory(),
          VaultCipher(await AesGcm.with256bits().newSecretKey()));
      await repo.setSetting('syncUrl', 'https://example.test');
      return repo;
    }

    a = await make();
    b = await make();
    server = SyncServer();
    syncA = TestSync(a, server);
    syncB = TestSync(b, server);
    space = await a.save('space', {'name': 'Personal'});
    cash = await a
        .save('account', {'name': 'Cash', 'space': space, 'opening': 100000});
    await syncA.sync();
    await syncB.sync();
  });
  tearDown(() async {
    await a.dispose();
    await b.dispose();
  });
  Json expense(int amount) => {
        'space': space,
        'type': 'expense',
        'amount': amount,
        'account': cash,
        'category': 'Food & groceries',
        'date': '2026-11-10'
      };

  test(
      'two devices converge through paginated pull without losing offline writes',
      () async {
    await a.save('transaction', expense(1000));
    await b.save('transaction', expense(2000));
    await syncA.sync();
    await syncB.sync();
    await syncA.sync();
    final stateA = await a.snapshot(), stateB = await b.snapshot();
    expect(stateA.of('transaction').length, 2);
    expect(stateA.balance(stateA.find(cash)!), 97000);
    expect(stateB.balance(stateB.find(cash)!), 97000);
    expect(stateA.pending, 0);
    expect(stateB.pending, 0);
  });
  test('lost push response retries exactly once on the server', () async {
    await a.save('transaction', expense(500));
    server.dropNextPushResponse = true;
    await expectLater(syncA.sync(), throwsA(isA<DioException>()));
    expect((await a.snapshot()).pending, 1);
    await syncA.sync();
    expect(
        server.records.values.where((r) => r['kind'] == 'transaction').length,
        1);
    expect(server.changes.length, 3);
    expect((await a.snapshot()).pending, 0);
  });
  test('new local edit during upload survives the previous acknowledgement',
      () async {
    final id = await a.save('transaction', expense(500));
    server.beforeResponse = () async {
      await a.save('transaction', expense(700),
          id: id, expectedVersion: (await a.snapshot()).find(id)!.localVersion);
    };
    await syncA.sync();
    expect((await a.snapshot()).find(id)!.number('amount'), 700);
    expect((await a.snapshot()).pending, 1);
    await syncA.sync();
    await syncB.sync();
    expect((await b.snapshot()).find(id)!.number('amount'), 700);
    expect((await a.snapshot()).pending, 0);
  });
  test('conflicting amounts require explicit resolution and preserve audit',
      () async {
    final id = await a.save('transaction', expense(500));
    await syncA.sync();
    await syncB.sync();
    await a.save('transaction', expense(600),
        id: id, expectedVersion: (await a.snapshot()).find(id)!.localVersion);
    await b.save('transaction', expense(800),
        id: id, expectedVersion: (await b.snapshot()).find(id)!.localVersion);
    await syncA.sync();
    await syncB.sync();
    expect((await b.snapshot()).find(id)!.number('amount'), 800);
    expect((await b.snapshot()).conflicts, 1);
    await syncB.resolve(id, keepLocal: true);
    await syncB.sync();
    await syncA.sync();
    expect((await a.snapshot()).find(id)!.number('amount'), 800);
    expect((await b.snapshot()).conflicts, 0);
    expect((await b.history(id)).any((h) => h['data']['amount'] == 600), true);
  });
  test('same bill paid on two devices produces one payment', () async {
    final id = await a.save('bill', {
      'space': space,
      'name': 'Rent',
      'amount': 10000,
      'due': '2026-11-15',
      'frequency': 'monthly',
      'paid': false
    });
    await syncA.sync();
    await syncB.sync();
    await a.payBill((await a.snapshot()).find(id)!, cash);
    await b.payBill((await b.snapshot()).find(id)!, cash);
    await syncA.sync();
    await syncB.sync();
    await syncA.sync();
    final state = await a.snapshot();
    expect(state.of('transaction').length, 1);
    expect(state.billPaid(state.find(id)!), true);
    expect(state.of('bill').length, 2);
    expect((await b.snapshot()).conflicts, 0);
  });
  test('remote parent deletion retains a concurrent offline financial entry',
      () async {
    await a.remove((await a.snapshot()).find(cash)!);
    await b.save('transaction', expense(2000));
    await syncA.sync();
    await syncB.sync();
    final stateB = await b.snapshot();
    expect(stateB.find(cash), isNotNull);
    expect(stateB.of('transaction').length, 1);
    expect(stateB.conflicts, 1);
    await expectLater(
        syncB.resolve(cash, keepLocal: false), throwsFormatException);
    await syncB.resolve(cash, keepLocal: true);
    await syncB.sync();
    await syncA.sync();
    final stateA = await a.snapshot();
    expect(stateA.balance(stateA.find(cash)!), 98000);
    expect(stateA.conflicts, 0);
  });
}
