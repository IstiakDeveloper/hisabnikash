// Regression coverage for the eight audit findings and related lifecycle cases.
import 'dart:async';
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
import 'package:hisabnikash_mobile/core/money.dart';
import 'package:hisabnikash_mobile/core/repository.dart';
import 'package:hisabnikash_mobile/core/sync.dart';
import 'package:hisabnikash_mobile/core/vault.dart';
import 'sync_test.dart' as harness;

class ProbeServer extends harness.SyncServer {
  bool offlineLogout = false;
  int pushCalls = 0, pullsAfterLogout = 0;
  bool revoked = false;
  Completer<void>? gate, entered;
  @override
  Future<ResponseBody> fetch(RequestOptions options,
      Stream<Uint8List>? requestStream, Future<void>? cancelFuture) async {
    if (options.path == '/logout') {
      if (offlineLogout) {
        throw DioException(
            requestOptions: options, type: DioExceptionType.connectionError);
      }
      revoked = true;
      return ResponseBody.fromString('{"revoked":true}', 200, headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType]
      });
    }
    if (options.path == '/sync/pull' && revoked) {
      pullsAfterLogout++;
      return ResponseBody.fromString('{}', 401, headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType]
      });
    }
    if (options.path == '/sync/push') {
      pushCalls++;
      if (gate != null) {
        if (!entered!.isCompleted) entered!.complete();
        await gate!.future;
      }
    }
    return super.fetch(options, requestStream, cancelFuture);
  }
}

class ProbeSync extends SyncService {
  ProbeSync(FinanceRepository repo, this.server)
      : super(repo, const FlutterSecureStorage());
  final ProbeServer server;
  @override
  Dio client(String base, String? token) => Dio()..httpClientAdapter = server;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  driftRuntimeOptions.dontWarnAboutMultipleDatabases = true;
  if (Platform.isWindows) {
    open.overrideFor(
        OperatingSystem.windows, () => DynamicLibrary.open('winsqlite3.dll'));
  }
  late FinanceRepository a, b;
  late ProbeSync syncA, syncB;
  late ProbeServer server;
  late String space, cash;
  setUp(() async {
    // ignore: invalid_use_of_visible_for_testing_member
    FlutterSecureStorage.setMockInitialValues({'syncToken': 'audit-token'});
    Future<FinanceRepository> make() async {
      final repo = FinanceRepository(FinanceDatabase.memory(),
          VaultCipher(await AesGcm.with256bits().newSecretKey()));
      await repo.setSetting('syncUrl', 'https://audit.invalid');
      await repo.setSetting('cloudUser', '1');
      return repo;
    }

    a = await make();
    b = await make();
    server = ProbeServer();
    syncA = ProbeSync(a, server);
    syncB = ProbeSync(b, server);
    space =
        await a.save('space', {'name': 'Audit personal', 'type': 'personal'});
    cash = await a.save(
        'account', {'space': space, 'name': 'Audit cash', 'opening': 100000});
    await syncA.sync();
    await syncB.sync();
    server.pushCalls = 0;
  });
  tearDown(() async {
    syncA.dispose();
    syncB.dispose();
    await a.dispose();
    await b.dispose();
  });
  Json expense(int amount, {String category = 'Food & groceries'}) => {
        'space': space,
        'type': 'expense',
        'account': cash,
        'amount': amount,
        'category': category,
        'date': dayKey(DateTime.now())
      };

  test('A01 stale form must not silently replace a newer synced amount',
      () async {
    final id = await a.save('transaction', expense(1000));
    final stale = (await a.snapshot()).find(id)!;
    await a.db.customStatement(
        'UPDATE records SET payload = ?, revision = 2, local_version = local_version + 1 WHERE id = ?',
        [await a.cipher.seal(expense(2000)), id]);
    await expectLater(
        a.save('transaction', {...stale.data, 'note': 'Only changing note'},
            id: id, expectedVersion: stale.localVersion),
        throwsFormatException);
  });
  test(
      'A02 deleted monthly occurrence must not reappear when previous bill is paid',
      () async {
    final id = await a.save('bill', {
      'space': space,
      'name': 'Audit rent',
      'amount': 1000,
      'due': '2026-01-31',
      'frequency': 'monthly',
      'paid': false
    });
    await a.ensureBillOccurrences(now: DateTime(2026, 1, 1));
    final state = await a.snapshot();
    final feb =
        state.of('bill').firstWhere((r) => r.text('due') == '2026-02-28');
    await a.remove(feb);
    await a.payBill(state.find(id)!, cash);
    expect((await a.snapshot()).find(feb.id), isNull);
  });
  test(
      'A03 switching recurring series to once must stop new monthly occurrences',
      () async {
    final id = await a.save('bill', {
      'space': space,
      'name': 'Audit rent',
      'amount': 1000,
      'due': '2026-01-31',
      'frequency': 'monthly',
      'paid': false
    });
    await a.ensureBillOccurrences(now: DateTime(2026, 1, 1));
    final bill = (await a.snapshot()).find(id)!;
    await a.save('bill', {...bill.data, 'frequency': 'once'},
        id: id, expectedVersion: bill.localVersion);
    await a.ensureBillOccurrences(now: DateTime(2026, 4, 1));
    expect(
        (await a.snapshot())
            .of('bill')
            .where((r) => r.text('due').compareTo('2026-03-31') > 0),
        isEmpty);
  });
  test('A04 category rename must preserve category spending identity',
      () async {
    final category = await a.save('category',
        {'space': space, 'name': 'Pet supplies', 'type': 'expense'});
    await a.save('transaction', expense(1000, category: 'Pet supplies'));
    final old = (await a.snapshot()).find(category)!;
    await a.save('category', {...old.data, 'name': 'Pet food'},
        id: category, expectedVersion: old.localVersion);
    expect(
        (await a.snapshot()).spent(space, monthKey(DateTime.now()), 'Pet food'),
        1000);
  });
  test('A05 duplicate semantic budgets across devices must remain resolvable',
      () async {
    final data = <String, dynamic>{
      'space': space,
      'category': 'Food & groceries',
      'month': monthKey(DateTime.now()),
      'amount': 10000
    };
    await a.save('budget', data);
    await b.save('budget', data);
    await syncA.sync();
    await syncB.sync();
    final state = await b.snapshot();
    expect(state.of('budget').length == 1 || state.conflicts > 0, true);
  });
  test('A06 overlapping sync calls must share a single running operation',
      () async {
    await a.save('transaction', expense(1000));
    await Future.wait([syncA.sync(), syncA.sync()]);
    expect(server.pushCalls, 1);
  });
  test(
      'legacy budgets with different record IDs produce a resolvable semantic conflict',
      () async {
    final data = <String, dynamic>{
      'space': space,
      'category': 'Food & groceries',
      'month': monthKey(DateTime.now()),
      'amount': 10000
    };
    final first = await a.save('budget', data);
    await syncA.sync();
    final legacy = <String, dynamic>{
      'id': 'legacy-budget',
      'kind': 'budget',
      'data': {...data, 'amount': 15000},
      'deleted': false,
      'revision': 1
    };
    server.records['legacy-budget'] = legacy;
    server.changes.add(legacy);
    await syncB.sync();
    var state = await b.snapshot();
    expect(state.of('budget'), hasLength(1));
    expect(state.conflicts, 1);
    final conflict = (await syncB.conflicts()).single;
    final remote = conflict['remote'] as Json;
    final duplicateAmount = (remote['data'] as Json)['amount'];
    await syncB.resolve(conflict['id'], keepLocal: false);
    await syncB.sync();
    await syncA.sync();
    state = await a.snapshot();
    expect(state.of('budget'), hasLength(1));
    expect(state.of('budget').single.number('amount'), duplicateAmount);
    expect((await b.snapshot()).conflicts, 0);
    expect(
        server.records.values
            .where((r) => r['kind'] == 'budget' && r['deleted'] != true),
        hasLength(1));
    expect(await b.record(first), isNotNull);
  });
  test(
      'A07 disconnect must stop the in-flight sync from starting a subsequent pull',
      () async {
    await a.save('transaction', expense(1000));
    server.gate = Completer<void>();
    server.entered = Completer<void>();
    final running = syncA.sync().catchError((Object e) {
      if (e is! DioException || e.type != DioExceptionType.cancel) throw e;
    });
    await server.entered!.future;
    await syncA.disconnect();
    server.gate!.complete();
    try {
      await running;
    } on DioException {/* Real revoked tokens get 401. */}
    expect(server.pullsAfterLogout, 0);
  });
  test('A08 backup validation must reject repayment links to nonexistent loans',
      () async {
    final backup = await a.exportData();
    (backup['records'] as List).add({
      'id': 'orphan-payment',
      'kind': 'transaction',
      'data': {...expense(1000), 'type': 'debt_payment', 'loan': 'missing-loan'}
    });
    expect(
        () => FinanceRepository.validateBackup(backup), throwsFormatException);
  });
  test(
      'offline disconnect clears local credentials and retains secure revocation retry',
      () async {
    server.offlineLogout = true;
    await syncA.disconnect();
    expect(await const FlutterSecureStorage().read(key: 'syncToken'), isNull);
    expect(await a.getSetting('cloudUser'), isNull);
    expect(await const FlutterSecureStorage().read(key: 'pendingRevocation'),
        isNotNull);
  });
}
