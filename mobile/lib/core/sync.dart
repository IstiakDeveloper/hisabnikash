import 'dart:convert';
import 'dart:async';
import 'package:dio/dio.dart';
import 'package:drift/drift.dart' show Variable;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'models.dart';
import 'repository.dart';

class SyncService {
  SyncService(this.repository, this.secrets) {
    _unlisten = repository.lifecycle
        .listen(() => _cancel?.cancel('Vault session changed'));
  }
  late final void Function() _unlisten;
  final status = StreamController<String>.broadcast();
  String currentStatus = 'Ready';
  void _status(String value) {
    currentStatus = value;
    if (!status.isClosed) status.add(value);
  }

  void dispose() {
    _unlisten();
    _cancel?.cancel('Sync service closed');
    status.close();
  }

  final FinanceRepository repository;
  final FlutterSecureStorage secrets;
  Future<void>? _inFlight;
  int _flightEpoch = -1;
  CancelToken? _cancel;
  static dynamic canonical(dynamic value) {
    if (value is Map) {
      final keys = value.keys.cast<String>().toList()..sort();
      return {for (final key in keys) key: canonical(value[key])};
    }
    if (value is List) return value.map(canonical).toList();
    return value;
  }

  Dio client(String base, String? token) => Dio(BaseOptions(
          baseUrl: '$base/api/mobile/v1',
          connectTimeout: const Duration(seconds: 15),
          receiveTimeout: const Duration(seconds: 30),
          headers: {
            'Accept': 'application/json',
            if (token != null) 'Authorization': 'Bearer $token'
          }));

  static String validateUrl(String raw) {
    final uri = Uri.tryParse(raw.trim());
    if (uri == null ||
        uri.scheme != 'https' ||
        uri.host.isEmpty ||
        uri.userInfo.isNotEmpty ||
        uri.hasQuery ||
        uri.hasFragment ||
        (uri.path != '' && uri.path != '/')) {
      throw const FormatException(
          'Use an HTTPS server origin, such as https://sync.example.com');
    }
    return uri.toString().replaceFirst(RegExp(r'/$'), '');
  }

  Future<void> connect(String baseUrl, String email, String password,
      {bool allowRestoredMerge = false}) async {
    if (await repository.getSetting('restoreCloudReview') == 'true' &&
        !allowRestoredMerge) {
      throw const FormatException(
          'This vault was restored from backup. Review and confirm merging with cloud before connecting.');
    }
    final revocation = await secrets.read(key: 'pendingRevocation');
    if (revocation != null) {
      final old = jsonDecode(revocation) as Json;
      try {
        await client(old['base'], old['token']).post('/logout');
        await secrets.delete(key: 'pendingRevocation');
      } on DioException catch (e) {
        if (e.response?.statusCode == 401) {
          await secrets.delete(key: 'pendingRevocation');
        }
      }
    }
    final base = validateUrl(baseUrl);
    final response = await client(base, null).post('/login', data: {
      'email': email.trim(),
      'password': password,
      'device_name': 'HisabNikash mobile',
    });
    final body = Map<String, dynamic>.from(response.data);
    final user = body['user_id'].toString();
    final bound = await repository.getSetting('vaultOwner');
    if (bound != null && bound != '$base:$user') {
      throw const FormatException(
          'This vault belongs to another cloud account. Use a separate installation or restore a separate backup.');
    }
    await secrets.write(key: 'syncToken', value: body['token'] as String);
    await repository.setSetting('syncUrl', base);
    await repository.setSetting('vaultOwner', '$base:$user');
    await repository.setSetting('cloudUser', user);
    await repository.db
        .customStatement("DELETE FROM settings WHERE key='restoreCloudReview'");
    await sync();
  }

  Future<void> disconnect() async {
    repository.lifecycle.invalidate();
    final base = await repository.getSetting('syncUrl');
    final token = await secrets.read(key: 'syncToken');
    await secrets.delete(key: 'syncToken');
    await repository.db
        .customStatement("DELETE FROM settings WHERE key = 'cloudUser'");
    repository.changes.add(null);
    _status('Disconnected · data stays on this device');
    if (base != null && token != null) {
      await secrets.write(
          key: 'pendingRevocation',
          value: jsonEncode({'base': base, 'token': token}));
      try {
        await client(base, token).post('/logout');
        await secrets.delete(key: 'pendingRevocation');
      } on DioException {
        // Local disconnect works offline. Retain a revocation request securely.
        await secrets.write(
            key: 'pendingRevocation',
            value: jsonEncode({'base': base, 'token': token}));
      }
    }
  }

  Future<void> sync() {
    final epoch = repository.lifecycle.generation;
    if (_inFlight != null && _flightEpoch == epoch) return _inFlight!;
    late Future<void> operation;
    operation = _run(epoch).whenComplete(() {
      if (identical(_inFlight, operation)) _inFlight = null;
    });
    _flightEpoch = epoch;
    return _inFlight = operation;
  }

  Future<void> _run(int epoch) async {
    _status('Syncing…');
    try {
      await _sync(epoch);
      if (epoch != repository.lifecycle.generation) return;
      final state = await repository.snapshot();
      _status(await secrets.read(key: 'syncToken') == null
          ? 'Offline vault'
          : state.conflicts > 0
              ? '${state.conflicts} conflicts need review'
              : state.pending > 0
                  ? '${state.pending} changes queued'
                  : 'All changes synced');
    } catch (e) {
      if (epoch == repository.lifecycle.generation) {
        _status(e is DioException && e.response?.statusCode == 401
            ? 'Sign in again to resume sync'
            : e is FormatException
                ? e.message
                : 'Sync paused · changes saved on this device');
      }
      rethrow;
    }
  }

  Future<void> _sync(int epoch) async {
    final cancellation = CancelToken();
    _cancel = cancellation;
    void check() {
      if (epoch != repository.lifecycle.generation) {
        throw DioException(
            requestOptions: RequestOptions(),
            type: DioExceptionType.cancel,
            message: 'Vault session changed');
      }
    }

    final base = await repository.getSetting('syncUrl');
    final token = await secrets.read(key: 'syncToken');
    check();
    if (base == null || token == null) return;
    try {
      final api = client(base, token);
      final pending = await repository.db
          .customSelect(
              'SELECT o.*, r.kind, r.payload, r.deleted FROM outbox o JOIN records r ON r.id = o.record_id WHERE o.blocked = 0 LIMIT 100')
          .get();
      if (pending.isNotEmpty) {
        final operations = <Json>[];
        var bytes = 0;
        for (final row in pending) {
          final operation = <String, dynamic>{
            'operation_id': row.read<String>('operation_id'),
            'id': row.read<String>('record_id'),
            'kind': row.read<String>('kind'),
            'base_revision': row.read<int>('base_revision'),
            'deleted': row.read<int>('deleted') == 1,
            'data': await repository.cipher.open(row.read<String>('payload'))
          };
          final length = utf8.encode(jsonEncode(operation)).length;
          if (bytes + length > 1500000 && operations.isNotEmpty) break;
          bytes += length;
          operations.add(operation);
        }
        final response = await api.post('/sync/push',
            data: {'operations': operations}, cancelToken: cancellation);
        check();
        await repository.db.transaction(() async {
          check();
          for (final raw in response.data['results']) {
            final result = Map<String, dynamic>.from(raw);
            final id = result['id'];
            if (result['status'] == 'accepted') {
              await repository.db.customStatement(
                  'UPDATE records SET revision = ? WHERE id = ?',
                  [result['revision'], id]);
              await repository.db.customStatement(
                  'DELETE FROM outbox WHERE record_id = ? AND operation_id = ?',
                  [id, result['operation_id']]);
              await repository.db.customStatement(
                  'UPDATE outbox SET base_revision = ? WHERE record_id = ?',
                  [result['revision'], id]);
            } else if (result['status'] == 'conflict') {
              final remote = result['remote'] as Json;
              final sent = operations.firstWhere(
                  (o) => o['operation_id'] == result['operation_id']);
              if (sent['kind'] == remote['kind'] &&
                  sent['deleted'] == remote['deleted'] &&
                  jsonEncode(canonical(sent['data'])) ==
                      jsonEncode(canonical(remote['data']))) {
                // The same deterministic bill occurrence/payment may have been
                // created independently. Identical content is already synced.
                await repository.db.customStatement(
                    'UPDATE records SET revision = ? WHERE id = ?',
                    [remote['revision'], id]);
                await repository.db.customStatement(
                    'DELETE FROM outbox WHERE record_id = ? AND operation_id = ?',
                    [id, result['operation_id']]);
                await repository.db.customStatement(
                    'UPDATE outbox SET base_revision = ? WHERE record_id = ?',
                    [remote['revision'], id]);
                continue;
              }
              await repository.db.customStatement(
                  'INSERT OR REPLACE INTO conflicts(record_id,remote) VALUES (?,?)',
                  [id, await repository.cipher.seal(result['remote'])]);
              await repository.db.customStatement(
                  'UPDATE outbox SET blocked = 1 WHERE record_id = ?', [id]);
            } else {
              throw const FormatException(
                  'Sync server returned an unsupported operation result.');
            }
          }
          check();
        });
      }
      var hasMore = true;
      var cursor =
          int.tryParse(await repository.getSetting('cursor') ?? '0') ?? 0;
      final incoming = <String, Json>{};
      while (hasMore) {
        final response = await api.get('/sync/pull',
            queryParameters: {'cursor': cursor}, cancelToken: cancellation);
        check();
        for (final raw in response.data['changes']) {
          final remote = Map<String, dynamic>.from(raw);
          incoming[remote['id'] as String] = remote;
        }
        final nextCursor = response.data['cursor'] as int;
        hasMore = response.data['has_more'] == true;
        if (hasMore && nextCursor <= cursor) {
          throw const FormatException('Sync cursor did not advance.');
        }
        cursor = nextCursor;
      }
      // Apply complete pages together: users never see half of a remote transfer
      // or dependent accounts without their spaces after an interrupted pull.
      await repository.db.transaction(() async {
        check();
        final queued = (await repository.db
                .customSelect('SELECT record_id FROM outbox')
                .get())
            .map((r) => r.read<String>('record_id'))
            .toSet();
        for (final remote in incoming.values) {
          final id = remote['id'] as String;
          if (queued.contains(id)) continue;
          final existing = await repository.db.customSelect(
              'SELECT revision FROM records WHERE id = ?',
              variables: [Variable.withString(id)]).getSingleOrNull();
          if (existing != null &&
              existing.read<int>('revision') >= (remote['revision'] as int)) {
            continue;
          }
          await repository.applyRemote(remote);
        }
        // Keep a remotely deleted parent when an offline financial child still
        // references it. The user resolves the deletion explicitly.
        final beforeRepair = await repository.snapshot();
        for (final record in beforeRepair.records) {
          final references = <String, String>{
            if (record.kind != 'space') 'space': 'space',
            if (record.kind == 'transaction') 'account': 'account',
            if (record.kind == 'transaction' &&
                record.text('type') == 'transfer')
              'destination': 'account',
            if (record.kind == 'transaction' && record.text('bill').isNotEmpty)
              'bill': 'bill',
            if (record.kind == 'transaction' && record.text('loan').isNotEmpty)
              'loan': 'loan',
          };
          for (final reference in references.entries) {
            final parentId = record.text(reference.key);
            if (beforeRepair.find(parentId) != null) continue;
            final parent = await repository.db.customSelect(
                'SELECT * FROM records WHERE id = ?',
                variables: [Variable.withString(parentId)]).getSingleOrNull();
            if (parent == null ||
                parent.read<String>('kind') != reference.value) {
              throw const FormatException(
                  'A related record is missing from the server. Local records have been retained.');
            }
            if (parent.read<int>('deleted') == 0) continue;
            final remote = incoming[parentId] ??
                <String, dynamic>{
                  'id': parentId,
                  'kind': parent.read<String>('kind'),
                  'data': await repository.cipher
                      .open(parent.read<String>('payload')),
                  'revision': parent.read<int>('revision'),
                  'deleted': true
                };
            await repository.db.customStatement(
                'UPDATE records SET deleted = 0 WHERE id = ?', [parentId]);
            await repository.db.customStatement(
                'INSERT OR REPLACE INTO conflicts(record_id,remote) VALUES (?,?)',
                [parentId, await repository.cipher.seal(remote)]);
            await repository.db.customStatement(
                'INSERT OR REPLACE INTO outbox(record_id,operation_id,base_revision,blocked) VALUES (?,?,?,1)',
                [parentId, repository.uuid.v4(), remote['revision']]);
          }
        }
        await _reconcileBudgets();
        final merged = await repository.snapshot();
        for (final record in merged.records) {
          FinanceRepository.validate(record.kind, record.data, merged,
              id: record.id);
        }
        await repository.db.customStatement(
            'INSERT OR REPLACE INTO settings(key,value) VALUES (?,?)',
            ['cursor', '$cursor']);
        check();
      });
      check();
      await repository.setSetting(
          'lastSync', DateTime.now().toUtc().toIso8601String());
      repository.changes.add(null);
    } finally {
      if (identical(_cancel, cancellation)) _cancel = null;
    }
  }

  Future<List<Json>> conflicts() async {
    final list = <Json>[];
    for (final row
        in await repository.db.customSelect('SELECT * FROM conflicts').get()) {
      list.add({
        'id': row.read<String>('record_id'),
        'remote': await repository.cipher.open(row.read<String>('remote'))
      });
    }
    return list;
  }

  Future<void> _reconcileBudgets() async {
    final state = await repository.snapshot();
    final budgets = state.of('budget').toList()
      ..sort((a, b) => a.id.compareTo(b.id));
    final seen = <String, Record>{};
    for (final budget in budgets) {
      final key =
          '${budget.text('space')}/${state.categoryIdentity(budget)}/${budget.text('month')}';
      final target = seen[key];
      if (target == null) {
        seen[key] = budget;
        continue;
      }
      // Retain both versions, but expose only one active budget until reviewed.
      await repository.db.customStatement(
          'UPDATE records SET deleted=1,local_version=local_version+1 WHERE id=?',
          [budget.id]);
      await repository.db.customStatement(
          'INSERT OR REPLACE INTO conflicts(record_id,remote) VALUES (?,?)', [
        budget.id,
        await repository.cipher.seal({
          'id': budget.id,
          'kind': budget.kind,
          'data': budget.data,
          'revision': budget.revision,
          'deleted': false,
          'semanticTarget': target.id
        })
      ]);
      await repository.db.customStatement(
          'INSERT OR REPLACE INTO outbox(record_id,operation_id,base_revision,blocked) VALUES (?,?,?,1)',
          [budget.id, repository.uuid.v4(), budget.revision]);
    }
  }

  Future<void> resolve(String id, {required bool keepLocal}) async {
    await repository.db.transaction(() async {
      final all = await conflicts();
      final remote = all.firstWhere((r) => r['id'] == id)['remote'] as Json;
      if (remote['semanticTarget'] != null) {
        final duplicate = await repository.record(id);
        final target = await repository.record(remote['semanticTarget']);
        if (duplicate == null || target == null || target.deleted) {
          throw const FormatException(
              'The matching budget changed. Sync and review again.');
        }
        await repository.save(
            'budget', keepLocal ? target.data : duplicate.data,
            id: target.id, expectedVersion: target.localVersion);
        await repository.applyRemote({...remote, 'deleted': true});
        await repository.db.customStatement(
            'UPDATE outbox SET operation_id=?,base_revision=?,blocked=0 WHERE record_id=?',
            [repository.uuid.v4(), remote['revision'], id]);
        await repository.db
            .customStatement('DELETE FROM conflicts WHERE record_id=?', [id]);
        return;
      }
      final state = await repository.snapshot();
      final local = state.find(id);
      if (keepLocal) {
        final exists = await repository.db.customSelect(
            'SELECT id FROM records WHERE id = ?',
            variables: [Variable.withString(id)]).getSingleOrNull();
        if (local == null && exists == null) {
          throw const FormatException('This local record no longer exists.');
        }
        await repository.db.customStatement(
            'INSERT INTO audit(record_id,payload,created_at) VALUES (?,?,?)', [
          id,
          await repository.cipher.seal(remote['data']),
          DateTime.now().toUtc().toIso8601String()
        ]);
        await repository.db.customStatement(
            'UPDATE records SET revision = ? WHERE id = ?',
            [remote['revision'], id]);
        await repository.db.customStatement(
            'UPDATE outbox SET operation_id = ?, base_revision = ?, blocked = 0 WHERE record_id = ?',
            [repository.uuid.v4(), remote['revision'], id]);
      } else {
        await repository.applyRemote(remote);
        await repository.db
            .customStatement('DELETE FROM outbox WHERE record_id = ?', [id]);
      }
      await repository.db
          .customStatement('DELETE FROM conflicts WHERE record_id = ?', [id]);
      final merged = await repository.snapshot();
      for (final record in merged.records) {
        FinanceRepository.validate(record.kind, record.data, merged,
            id: record.id);
      }
    });
    repository.changes.add(null);
  }
}
