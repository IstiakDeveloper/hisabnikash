import 'dart:async';
import 'dart:convert';
import 'package:drift/drift.dart' show Variable;
import 'package:uuid/uuid.dart';
import 'database.dart';
import 'models.dart';
import 'vault.dart';
import 'money.dart';
import 'lifecycle.dart';
import 'planning.dart';
part 'schedules.dart';
part 'professional_repository.dart';
part 'flexible_schedules.dart';

class FinanceRepository {
  FinanceRepository(this.db, this.cipher);
  final FinanceDatabase db;
  final VaultCipher cipher;
  final changes = StreamController<void>.broadcast();
  final lifecycle = VaultLifecycle();
  final _decoded = <String, (String, Json)>{};
  final uuid = const Uuid();
  static const kinds = {
    'category',
    'space',
    'account',
    'transaction',
    'budget',
    'bill',
    'goal',
    'loan',
    'schedule',
    'daily_review',
    'month_close',
    'party',
    'invoice',
    'installment',
    'expectation',
    'template'
  };

  Future<String?> getSetting(String key) async {
    final rows = await db.customSelect('SELECT key, value FROM settings').get();
    for (final row in rows) {
      if (row.read<String>('key') == key) return row.read<String>('value');
    }
    return null;
  }

  Future<void> setSetting(String key, String value) async {
    await db.customStatement(
        'INSERT OR REPLACE INTO settings(key, value) VALUES (?, ?)',
        [key, value]);
    changes.add(null);
  }

  Future<FinanceSnapshot> snapshot() async {
    final rows =
        await db.customSelect('SELECT * FROM records WHERE deleted = 0').get();
    final records = <Record>[];
    for (final row in rows) {
      final id = row.read<String>('id'), payload = row.read<String>('payload');
      var cached = _decoded[id];
      if (cached == null || cached.$1 != payload) {
        cached = (payload, await cipher.open(payload) as Json);
        _decoded[id] = cached;
      }
      records.add(Record(id, row.read<String>('kind'), cached.$2,
          revision: row.read<int>('revision'),
          localVersion: row.read<int>('local_version')));
    }
    final pending =
        (await db.customSelect('SELECT COUNT(*) AS n FROM outbox').getSingle())
            .read<int>('n');
    final conflicts = (await db
            .customSelect('SELECT COUNT(*) AS n FROM conflicts')
            .getSingle())
        .read<int>('n');
    return FinanceSnapshot(records, pending, conflicts);
  }

  Future<String> save(String kind, Json data,
      {String? id,
      int? expectedVersion,
      String billEditScope = 'future'}) async {
    late String recordId;
    await db.transaction(() async {
      final current = await snapshot();
      data = _categoryFields(kind, {...data}, current);
      recordId = id ??
          (kind == 'budget'
              ? uuid.v5(Namespace.url.value,
                  'hisabnikash/budget/${data['space']}/${data['categoryId']}/${data['month']}')
              : kind == 'category'
                  ? uuid.v5(Namespace.url.value,
                      'hisabnikash/category/${data['space']}/${data['type']}/${FinanceSnapshot.normalized(data['name'] as String? ?? '')}')
                  : uuid.v4());
      final old = current.find(recordId);
      if (old != null &&
          (id == null ||
              expectedVersion == null ||
              old.localVersion != expectedVersion)) {
        throw const FormatException(
            'This record changed since it was opened. Your draft is safe. Reopen the latest version before saving.');
      }
      if (id != null && old == null) {
        throw const FormatException(
            'This record was deleted on another screen or device.');
      }
      if (old != null && old.kind != kind) {
        throw const FormatException('A record cannot change its type.');
      }
      if (kind == 'loan' && old != null) {
        final repaid = current.repaid(old);
        final history = current
            .of('transaction')
            .where((r) => r.text('loan') == old.id)
            .toList();
        final minimum = history.fold(
            repaid,
            (int amount, r) =>
                r.number('amount') > amount ? r.number('amount') : amount);
        if (data['principal'] is int && (data['principal'] as int) < minimum) {
          throw const FormatException(
              'Principal cannot be less than recorded repayments.');
        }
        if (history.isNotEmpty &&
            (data['direction'] != old.text('direction') ||
                data['space'] != old.text('space'))) {
          throw const FormatException(
              'A loan with repayments cannot change direction or space.');
        }
      }
      if (old?.kind == 'bill' &&
          (current.billPaid(old!) ||
              current.of('transaction').any((r) => r.text('bill') == old.id))) {
        throw const FormatException(
            'Paid bills are retained as history. Edit the next occurrence instead.');
      }
      if (old?.kind == 'bill' &&
          old!.text('scheduleId').isNotEmpty &&
          data['space'] != old.text('space')) {
        throw const FormatException(
            'Keep a recurring bill in its original space. Create a new schedule for another space.');
      }
      if (old?.kind == 'transaction' &&
          (old!.text('bill').isNotEmpty ||
              old.text('invoice').isNotEmpty ||
              old.text('expectation').isNotEmpty ||
              old.text('type') == 'refund' ||
              old.flag('adjustment') ||
              current
                  .of('transaction')
                  .any((r) => r.text('refundOf') == old.id) ||
              old.text('loan').isNotEmpty ||
              old.text('type') == 'reversal' ||
              current.isReversed(old))) {
        throw const FormatException(
            'Linked payments cannot be edited directly.');
      }
      if (kind == 'account' &&
          old != null &&
          old.text('space') != data['space'] &&
          current.of('transaction').any((r) =>
              r.text('account') == recordId ||
              r.text('destination') == recordId)) {
        throw const FormatException(
            'An account with transactions cannot move to another space.');
      }
      if (kind == 'account' &&
          old != null &&
          current.of('transaction').any((r) =>
              r.text('account') == old.id || r.text('destination') == old.id) &&
          (data['opening'] != old.number('opening') ||
              (data['openingDate'] ?? '') != old.text('openingDate'))) {
        throw const FormatException(
            'Use reconciliation to change an account balance with transaction history.');
      }
      if (kind == 'loan' &&
          old != null &&
          current.of('installment').any((i) => i.text('loan') == old.id) &&
          (data['principal'] != old.number('principal') ||
              data['space'] != old.text('space') ||
              data['direction'] != old.text('direction'))) {
        throw const FormatException(
            'A scheduled loan cannot change principal, direction or space.');
      }
      validate(kind, data, current, id: recordId);
      if (kind == 'goal' &&
          (data['backingAccount'] as String? ?? '').isNotEmpty &&
          (old == null ||
              data['backingAccount'] != old.text('backingAccount') ||
              data['saved'] > old.number('saved'))) {
        final account = current.find(data['backingAccount'])!;
        final allocated = current
            .of('goal')
            .where((g) =>
                g.id != recordId && g.text('backingAccount') == account.id)
            .fold<int>(0, (s, g) => s + g.number('saved'));
        if (allocated + data['saved'] > current.balance(account)) {
          throw const FormatException(
              'Savings allocation exceeds the recorded account balance.');
        }
      }
      if (kind == 'category' && old != null) {
        final linked = current.records
            .where((r) =>
                {'transaction', 'budget'}.contains(r.kind) &&
                current.categoryIdentity(r) == old.id)
            .toList();
        if (linked.isNotEmpty &&
            (data['space'] != old.text('space') ||
                data['type'] != old.text('type'))) {
          throw const FormatException(
              'A category with history cannot move to another space or type.');
        }
        data['aliases'] = {
          ...(old.data['aliases'] as List? ?? const []),
          if (data['name'] != old.text('name')) old.text('name')
        }.toList();
        for (final r in linked) {
          await _write(
              r.id,
              r.kind,
              {...r.data, 'categoryId': old.id, 'category': data['name']},
              r.revision);
        }
      }
      if (kind == 'bill') {
        data =
            await _configureBill(recordId, data, old, current, billEditScope);
      }
      await _write(recordId, kind, data, current.find(recordId)?.revision ?? 0);
    });
    changes.add(null);
    return recordId;
  }

  Future<void> _write(String id, String kind, Json data, int revision,
      {bool deleted = false}) async {
    if (kind == 'transaction') await _assertOpenPeriod(id, data);
    final payload = await cipher.seal(data);
    final previous = await db.customSelect('SELECT * FROM records WHERE id = ?',
        variables: [Variable.withString(id)]).get();
    for (final row in previous) {
      await db.customStatement(
          'INSERT INTO audit(record_id, payload, created_at) VALUES (?, ?, ?)',
          [
            id,
            row.read<String>('payload'),
            financeNow().toUtc().toIso8601String()
          ]);
    }
    await db.customStatement(
        'INSERT INTO records(id, kind, payload, revision, deleted, local_version) VALUES (?, ?, ?, ?, ?, 1) ON CONFLICT(id) DO UPDATE SET kind=excluded.kind, payload=excluded.payload, revision=excluded.revision, deleted=excluded.deleted, local_version=records.local_version+1',
        [id, kind, payload, revision, deleted ? 1 : 0]);
    await db.customStatement(
        'INSERT OR REPLACE INTO outbox(record_id, operation_id, base_revision, blocked) VALUES (?, ?, ?, 0)',
        [id, uuid.v4(), revision]);
    await db.customStatement('DELETE FROM conflicts WHERE record_id = ?', [id]);
  }

  Json _categoryFields(String kind, Json data, FinanceSnapshot state) {
    if (kind == 'budget' ||
        (kind == 'transaction' &&
            !{'transfer', 'reversal', 'debt_payment', 'debt_collection'}
                .contains(data['type']))) {
      final type =
          kind == 'budget' || data['type'] != 'income' ? 'expense' : 'income';
      final identity = state.categoryId(data['space'] as String? ?? '', type,
          data['category'] as String? ?? '');
      data['categoryId'] = identity;
      data['category'] = state.find(identity)?.text('name') ?? data['category'];
    }
    return data;
  }

  Future<Record?> record(String id) async {
    final row = await db.customSelect('SELECT * FROM records WHERE id=?',
        variables: [Variable.withString(id)]).getSingleOrNull();
    if (row == null) return null;
    return Record(id, row.read<String>('kind'),
        await cipher.open(row.read<String>('payload')) as Json,
        revision: row.read<int>('revision'),
        localVersion: row.read<int>('local_version'),
        deleted: row.read<int>('deleted') == 1);
  }

  Future<void> applyRemote(Json remote) async {
    final old = await record(remote['id'] as String);
    if (old != null) {
      await db.customStatement(
          'INSERT INTO audit(record_id,payload,created_at) VALUES (?,?,?)', [
        old.id,
        await cipher.seal(old.data),
        financeNow().toUtc().toIso8601String()
      ]);
    }
    await db.customStatement(
        'INSERT INTO records(id,kind,payload,revision,deleted,local_version) VALUES (?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET kind=excluded.kind,payload=excluded.payload,revision=excluded.revision,deleted=excluded.deleted,local_version=records.local_version+1',
        [
          remote['id'],
          remote['kind'],
          await cipher.seal(remote['data']),
          remote['revision'],
          remote['deleted'] == true ? 1 : 0
        ]);
  }

  Future<Json> _configureBill(String id, Json data, Record? old,
          FinanceSnapshot state, String scope) =>
      _BillScheduler(this).configure(id, data, old, state, scope);

  Future<void> migrateDomain() async {
    await db.transaction(() async {
      final state = await snapshot();
      for (final r in state.records.where((r) =>
          {'transaction', 'budget'}.contains(r.kind) &&
          r.text('categoryId').isEmpty &&
          r.text('category').isNotEmpty &&
          !{'reversal', 'debt_payment', 'debt_collection'}
              .contains(r.text('type')))) {
        final data = _categoryFields(r.kind, {...r.data}, state);
        await _write(r.id, r.kind, data, r.revision);
      }
    });
    await ensureBillOccurrences();
  }

  Future<void> reverse(Record original, String reason) async {
    if (reason.trim().isEmpty || reason.length > 300) {
      throw const FormatException(
          'Enter a correction reason (up to 300 characters).');
    }
    await db.transaction(() async {
      final state = await snapshot();
      final fresh = state.find(original.id);
      if (fresh == null || fresh.localVersion != original.localVersion) {
        throw const FormatException(
            'This transaction changed. Reopen it before correcting.');
      }
      if (fresh.text('type') == 'reversal' ||
          state.isReversed(fresh) ||
          !state.isPosted(fresh)) {
        throw const FormatException(
            'Only a posted, unreversed transaction can be reversed.');
      }
      if (state
          .of('transaction')
          .any((r) => r.text('refundOf') == fresh.id && !state.isReversed(r))) {
        throw const FormatException(
            'Reverse the refunds before reversing this expense.');
      }
      final data = <String, dynamic>{
        ...fresh.data,
        'type': 'reversal',
        'originalType': fresh.text('type'),
        'reversalOf': fresh.id,
        'date': dayKey(financeNow()),
        'note': 'Correction: ${reason.trim()}'
      };
      for (final field in [
        'bill',
        'loan',
        'receipt',
        'invoice',
        'installment',
        'expectation',
        'refundOf'
      ]) {
        data.remove(field);
      }
      final id = 'reversal:${fresh.id}';
      validate('transaction', data, state, id: id);
      await _write(id, 'transaction', data, 0);
    });
    changes.add(null);
  }

  static void validate(String kind, Json data, FinanceSnapshot state,
      {String? id}) {
    if (!kinds.contains(kind)) {
      throw const FormatException('Unknown record type.');
    }
    _validateProfessional(kind, data, state, id: id);
    for (final field in [
      'space',
      'name',
      'type',
      'account',
      'destination',
      'category',
      'categoryId',
      'date',
      'due',
      'frequency',
      'direction',
      'month',
      'bill',
      'loan',
      'reversalOf',
      'originalType',
      'scheduleId',
      'series',
      'cycle'
    ]) {
      if (data[field] != null && data[field] is! String) {
        throw FormatException('Invalid $field.');
      }
    }
    for (final field in ['paid', 'active', 'archived']) {
      if (data[field] != null && data[field] is! bool) {
        throw FormatException('Invalid $field.');
      }
    }
    if (data['note'] != null &&
        (data['note'] is! String || (data['note'] as String).length > 500)) {
      throw const FormatException('Notes must be 500 characters or less.');
    }
    if (data['receipt'] != null) {
      final receipt = data['receipt'];
      if (receipt is! Map ||
          receipt['bytes'] is! String ||
          !{'image/jpeg', 'image/png'}.contains(receipt['mime']) ||
          (receipt['bytes'] as String).length > 700000) {
        throw const FormatException('Invalid receipt attachment.');
      }
      final bytes = base64Decode(receipt['bytes']);
      const pngHeader = [137, 80, 78, 71, 13, 10, 26, 10];
      final png = bytes.length > 8 &&
          List.generate(8, (i) => bytes[i] == pngHeader[i]).every((v) => v);
      final jpg = bytes.length > 3 &&
          bytes[0] == 255 &&
          bytes[1] == 216 &&
          bytes[2] == 255;
      if (bytes.length > 512 * 1024 ||
          !(receipt['mime'] == 'image/png' ? png : jpg)) {
        throw const FormatException(
            'Receipt must be a JPG or PNG under 512 KB.');
      }
    }
    String requiredText(String field) {
      final value = data[field];
      if (value is! String || value.trim().isEmpty || value.length > 500) {
        throw FormatException('A valid $field is required.');
      }
      return value;
    }

    int amount(String field, {bool zero = false}) {
      final value = data[field];
      if (value is! int || value < (zero ? 0 : 1) || value > 99999999999999) {
        throw FormatException('Invalid $field amount.');
      }
      return value;
    }

    void reference(String field, String type) {
      final record = state.find(requiredText(field));
      if (record == null || record.kind != type) {
        throw FormatException('Choose a valid $field.');
      }
    }

    void date(String field) {
      final raw = requiredText(field);
      final parsed = DateTime.tryParse(raw);
      if (parsed == null || dayKey(parsed) != raw) {
        throw FormatException('Invalid $field.');
      }
    }

    if (kind == 'space') {
      requiredText('name');
      if (data['type'] != null &&
          !{'personal', 'business'}.contains(data['type'])) {
        throw const FormatException('Choose personal or business space.');
      }
      return;
    }
    reference('space', 'space');
    switch (kind) {
      case 'category':
        requiredText('name');
        if (data['aliases'] != null &&
            (data['aliases'] is! List ||
                (data['aliases'] as List).any((v) => v is! String))) {
          throw const FormatException('Invalid category aliases.');
        }
        if (!{'expense', 'income'}.contains(data['type'])) {
          throw const FormatException('Choose expense or income.');
        }
        if (state.of('category').any((r) =>
            r.id != id &&
            r.text('space') == data['space'] &&
            r.text('type') == data['type'] &&
            r.text('name').toLowerCase() ==
                (data['name'] as String).toLowerCase())) {
          throw const FormatException('This category already exists.');
        }
        break;
      case 'account':
        requiredText('name');
        amount('opening', zero: true);
        break;
      case 'transaction':
        amount('amount');
        date('date');
        reference('account', 'account');
        if (state.find(data['account'])!.text('space') != data['space']) {
          throw const FormatException('Account belongs to another space.');
        }
        final effectiveType =
            data['type'] == 'reversal' ? data['originalType'] : data['type'];
        if (effectiveType == 'transfer') reference('destination', 'account');
        if (effectiveType != 'transfer') requiredText('category');
        if (data['type'] == 'reversal') {
          reference('reversalOf', 'transaction');
          final original = state.find(data['reversalOf'])!;
          if (original.text('type') == 'reversal' ||
              data['originalType'] != original.text('type') ||
              data['amount'] != original.number('amount') ||
              data['space'] != original.text('space') ||
              data['account'] != original.text('account') ||
              (data['destination'] ?? '') != original.text('destination') ||
              (data['date'] as String).compareTo(original.text('date')) < 0) {
            throw const FormatException(
                'The reversal must match its original transaction.');
          }
          if (state.of('transaction').any((r) =>
              r.id != id && r.text('reversalOf') == data['reversalOf'])) {
            throw const FormatException(
                'This transaction is already reversed.');
          }
        } else if (data['originalType'] != null || data['reversalOf'] != null) {
          throw const FormatException('Invalid reversal metadata.');
        }
        if (data['bill'] != null && data['bill'] != '') {
          reference('bill', 'bill');
          final bill = state.find(data['bill'])!;
          if (data['type'] != 'expense' ||
              data['space'] != bill.text('space') ||
              (!(id != null &&
                      state.find(id) != null &&
                      state.isReversed(state.find(id)!)) &&
                  (data['amount'] as int) >
                      bill.number('amount') -
                          state
                              .of('transaction')
                              .where((r) =>
                                  r.id != id &&
                                  r.text('bill') == bill.id &&
                                  state.isPosted(r) &&
                                  !state.isReversed(r))
                              .fold<int>(
                                  0, (s, r) => s + r.number('amount')))) {
            throw const FormatException(
                'Bill payment does not match the bill.');
          }
        }
        if (data['loan'] != null && data['loan'] != '') {
          reference('loan', 'loan');
          final loan = state.find(data['loan'])!;
          if (data['type'] !=
                  (loan.text('direction') == 'borrowed'
                      ? 'debt_payment'
                      : 'debt_collection') ||
              data['space'] != loan.text('space') ||
              (data['amount'] as int) > loan.number('principal')) {
            throw const FormatException('Repayment does not match the loan.');
          }
        }
        if ({'debt_payment', 'debt_collection'}.contains(data['type']) &&
            (data['loan'] == null || data['loan'] == '')) {
          throw const FormatException(
              'Choose a valid loan for this repayment.');
        }
        journalLines(data);
        break;
      case 'budget':
        amount('amount');
        requiredText('category');
        if (!RegExp(r'^\d{4}-(0[1-9]|1[0-2])$')
            .hasMatch(requiredText('month'))) {
          throw const FormatException('Invalid budget month.');
        }
        if (state.of('budget').any((r) =>
            r.id != id &&
            r.text('space') == data['space'] &&
            r.text('month') == data['month'] &&
            r.text('category') == data['category'])) {
          throw const FormatException(
              'This category already has a budget this month.');
        }
        break;
      case 'bill':
        requiredText('name');
        amount('amount');
        date('due');
        if (!{'once', 'monthly', 'weekly', 'yearly', 'custom'}
            .contains(data['frequency'])) {
          throw const FormatException('Invalid frequency.');
        }
        if (data['frequency'] == 'custom' &&
            (data['intervalDays'] is! int ||
                data['intervalDays'] < 1 ||
                data['intervalDays'] > 3650)) {
          throw const FormatException(
              'Choose a repeat interval from 1 to 3650 days.');
        }
        if (data['scheduleId'] != null) reference('scheduleId', 'schedule');
        break;
      case 'schedule':
        requiredText('name');
        amount('amount');
        date('startDate');
        if (data['anchorDay'] is! int ||
            (data['anchorDay'] as int) < 1 ||
            (data['anchorDay'] as int) > 31 ||
            data['active'] is! bool) {
          throw const FormatException('Invalid bill schedule.');
        }
        break;
      case 'goal':
        requiredText('name');
        amount('target');
        amount('saved', zero: true);
        break;
      case 'loan':
        requiredText('name');
        amount('principal');
        amount('repaid', zero: true);
        if (data['repaid'] > data['principal']) {
          throw const FormatException('Repayment exceeds principal.');
        }
        if (!{'borrowed', 'lent'}.contains(data['direction'])) {
          throw const FormatException('Invalid loan direction.');
        }
        break;
    }
  }

  Future<void> remove(Record record) async {
    await db.transaction(() async {
      final state = await snapshot();
      final fresh = state.find(record.id);
      if (fresh == null || fresh.localVersion != record.localVersion) {
        throw const FormatException(
            'This record changed. Reopen it before deleting.');
      }
      if (record.kind == 'category') {
        await _write(record.id, record.kind, {...record.data, 'archived': true},
            record.revision);
        return;
      }
      _beforeProfessionalRemove(record, state);
      if (record.kind == 'transaction' &&
          (record.text('bill').isNotEmpty ||
              record.text('loan').isNotEmpty ||
              record.text('type') == 'reversal' ||
              state.isReversed(record))) {
        throw const FormatException(
            'Linked payments cannot be removed directly.');
      }
      if (record.kind == 'loan' &&
          (state.repaid(record) > 0 ||
              state
                  .of('transaction')
                  .any((r) => r.text('loan') == record.id))) {
        throw const FormatException('A loan with repayments must be retained.');
      }
      if (record.kind == 'bill' &&
          (state.billPaid(record) ||
              state
                  .of('transaction')
                  .any((r) => r.text('bill') == record.id))) {
        throw const FormatException('Paid bills must be retained.');
      }
      if (record.kind == 'account' &&
          state.of('transaction').any((r) =>
              r.text('account') == record.id ||
              r.text('destination') == record.id)) {
        throw const FormatException(
            'This account has transactions. Keep it to preserve your history.');
      }
      if (record.kind == 'space' &&
          state.records.any((r) => r.text('space') == record.id)) {
        throw const FormatException('This space contains records.');
      }
      await _write(record.id, record.kind, record.data, record.revision,
          deleted: true);
    });
    changes.add(null);
  }

  Future<void> payBill(Record bill, String accountId, {int? amount}) async {
    await db.transaction(() async {
      final state = await snapshot();
      final fresh = state.find(bill.id);
      if (fresh == null || state.billPaid(fresh)) {
        throw const FormatException('This bill is already paid.');
      }
      if (fresh.localVersion != bill.localVersion) {
        throw const FormatException(
            'This bill changed. Review its current amount before paying.');
      }
      final tx = <String, dynamic>{
        'space': fresh.text('space'),
        'type': 'expense',
        'amount':
            amount ?? fresh.number('amount') - state.billPaidAmount(fresh),
        'account': accountId,
        'category': fresh.text('category', 'Bills & utilities'),
        'date': dayKey(financeNow()),
        'note': fresh.text('name'),
        'bill': fresh.id
      };
      final previous = state
          .of('transaction')
          .where((r) => r.text('bill') == fresh.id)
          .length;
      final id = previous == 0
          ? '${fresh.id}:payment'
          : '${fresh.id}:payment:$previous';
      validate('transaction', tx, state, id: id);
      await _write(id, 'transaction', tx, 0);
      if ((amount ?? fresh.number('amount') - state.billPaidAmount(fresh)) +
              state.billPaidAmount(fresh) >=
          fresh.number('amount')) await _BillScheduler(this).next(fresh);
    });
    changes.add(null);
  }

  Future<void> ensureBillOccurrences({DateTime? now}) async {
    var changed = false;
    await db.transaction(() async {
      changed = await _BillScheduler(this).materialize(now ?? financeNow());
      changed =
          await _FlexibleBillScheduler(this).materialize(now ?? financeNow()) ||
              changed;
    });
    if (changed) changes.add(null);
  }

  Future<void> setScheduleActive(Record bill, bool active) async {
    await db.transaction(() async {
      final schedule = await record(bill.text('scheduleId'));
      if (schedule == null || schedule.deleted) {
        throw const FormatException('This bill has no repeating schedule.');
      }
      await _write(schedule.id, schedule.kind,
          {...schedule.data, 'active': active}, schedule.revision);
    });
    if (active) await ensureBillOccurrences();
    changes.add(null);
  }

  Future<int> copyBudgets(DateTime month, String space,
      {bool carryUnspent = false}) async {
    var count = 0;
    await db.transaction(() async {
      final state = await snapshot();
      final sourceMonth = monthKey(DateTime(month.year, month.month - 1));
      final targetMonth = monthKey(month);
      for (final budget in state.of('budget').where((r) =>
          r.text('month') == sourceMonth &&
          (space == 'all' || r.text('space') == space))) {
        if (state.of('budget').any((r) =>
            r.text('space') == budget.text('space') &&
            r.text('month') == targetMonth &&
            r.text('category') == budget.text('category'))) continue;
        final unused = budget.number('amount') -
            state.spent(
                budget.text('space'), sourceMonth, budget.text('category'));
        await _write(
            uuid.v5(Namespace.url.value,
                'hisabnikash/budget/${budget.text('space')}/${state.categoryIdentity(budget)}/$targetMonth'),
            'budget',
            {
              ...budget.data,
              'month': targetMonth,
              'amount': budget.number('amount') +
                  (carryUnspent && unused > 0 ? unused : 0)
            },
            0);
        count++;
      }
    });
    if (count > 0) changes.add(null);
    return count;
  }

  Future<void> repayLoan(Record loan, String accountId, int amount) async {
    await db.transaction(() async {
      final state = await snapshot();
      final fresh = state.find(loan.id);
      if (state.of('installment').any((i) => i.text('loan') == loan.id)) {
        throw const FormatException(
            'Pay this loan through its installment schedule.');
      }
      if (fresh == null ||
          fresh.localVersion != loan.localVersion ||
          amount <= 0 ||
          amount > fresh.number('principal') - state.repaid(fresh)) {
        throw const FormatException(
            'Enter a payment within the outstanding balance.');
      }
      final tx = <String, dynamic>{
        'space': fresh.text('space'),
        'type': fresh.text('direction') == 'borrowed'
            ? 'debt_payment'
            : 'debt_collection',
        'amount': amount,
        'account': accountId,
        'category': 'Loan repayment',
        'date': dayKey(financeNow()),
        'note': fresh.text('name'),
        'loan': fresh.id
      };
      validate('transaction', tx, state);
      await _write(uuid.v4(), 'transaction', tx, 0);
    });
    changes.add(null);
  }

  Future<List<Json>> history(String id) async {
    final result = <Json>[];
    for (final row in await db.customSelect(
        'SELECT * FROM audit WHERE record_id = ? ORDER BY id DESC',
        variables: [Variable.withString(id)]).get()) {
      result.add({
        'at': row.read<String>('created_at'),
        'data': await cipher.open(row.read<String>('payload'))
      });
    }
    return result;
  }

  Future<Json> exportData() => db.transaction(() async {
        final records = <Json>[], history = <Json>[];
        for (final row
            in await db.customSelect('SELECT id FROM records').get()) {
          records.add((await record(row.read<String>('id')))!.toJson());
        }
        for (final row
            in await db.customSelect('SELECT * FROM audit ORDER BY id').get()) {
          history.add({
            'record': row.read<String>('record_id'),
            'at': row.read<String>('created_at'),
            'data': await cipher.open(row.read<String>('payload'))
          });
        }
        return {
          'schema': 2,
          'createdAt': financeNow().toUtc().toIso8601String(),
          'records': records,
          'history': history,
          'localData': {
            for (final row in await db
                .customSelect(
                    "SELECT key,value FROM settings WHERE key LIKE 'private:%'")
                .get())
              row.read<String>('key').substring(8):
                  await cipher.open(row.read<String>('value'))
          },
          'preferences': {
            for (final key in ['dark', 'language', 'selectedSpace'])
              if (await getSetting(key) != null) key: await getSetting(key)
          }
        };
      });

  static List<Record> validateBackup(Json payload) {
    final notificationData = payload['localData'] is Map
        ? (payload['localData'] as Map)['notifications']
        : null;
    if (notificationData is Map &&
        !validFinanceTimezone(notificationData['timezone'])) {
      throw const FormatException('Invalid backup timezone.');
    }
    if (!{1, 2}.contains(payload['schema']) ||
        payload['records'] is! List ||
        (payload['records'] as List).length > 100000) {
      throw const FormatException('Unsupported backup data.');
    }
    final records = (payload['records'] as List).map((raw) {
      final map = Map<String, dynamic>.from(raw as Map);
      if (map['id'] is! String ||
          (map['id'] as String).isEmpty ||
          (map['id'] as String).length > 150 ||
          map['kind'] is! String ||
          map['data'] is! Map) {
        throw const FormatException('Invalid backup record.');
      }
      if (!kinds.contains(map['kind']) ||
          (map['deleted'] != null && map['deleted'] is! bool)) {
        throw const FormatException('Invalid backup record type.');
      }
      return Record(
          map['id'], map['kind'], Map<String, dynamic>.from(map['data']),
          deleted: map['deleted'] == true);
    }).toList();
    if (records.map((r) => r.id).toSet().length != records.length) {
      throw const FormatException('Duplicate backup records.');
    }
    final snapshot =
        FinanceSnapshot(records.where((r) => !r.deleted).toList(), 0, 0);
    if (snapshot.of('space').isEmpty) {
      throw const FormatException('Backup has no spaces.');
    }
    for (final r in snapshot.records) {
      validate(r.kind, r.data, snapshot, id: r.id);
    }
    if (payload['history'] != null) {
      if (payload['history'] is! List ||
          (payload['history'] as List).any((h) =>
              h is! Map ||
              h['record'] is! String ||
              !records.any((r) => r.id == h['record']) ||
              h['at'] is! String ||
              DateTime.tryParse(h['at']) == null ||
              h['data'] is! Map)) {
        throw const FormatException('Invalid backup history.');
      }
    }
    final preferences = payload['preferences'];
    if (payload['localData'] != null &&
        (payload['localData'] is! Map ||
            (payload['localData'] as Map).entries.any((e) =>
                e.key is! String ||
                !RegExp(r'^(notifications|inbox|draft:[a-zA-Z0-9:_-]+|favorites)$')
                    .hasMatch(e.key) ||
                e.value is! Map))) {
      throw const FormatException('Invalid backup local data.');
    }
    if (preferences != null &&
        (preferences is! Map ||
            preferences.entries.any((e) =>
                !{'dark', 'language', 'selectedSpace'}.contains(e.key) ||
                e.value is! String))) {
      throw const FormatException('Invalid backup preferences.');
    }
    return records;
  }

  Future<void> restore(Json payload) async {
    final records = validateBackup(payload);
    if (await getSetting('cloudUser') != null) {
      throw const FormatException(
          'Disconnect cloud sync before replacing this device data.');
    }
    lifecycle.invalidate();
    await db.transaction(() async {
      final previous = {
        for (final row in await db
            .customSelect('SELECT id,local_version FROM records')
            .get())
          row.read<String>('id'): row.read<int>('local_version')
      };
      for (final table in ['outbox', 'conflicts', 'audit', 'records']) {
        await db.customStatement('DELETE FROM $table');
      }
      await db.customStatement(
          "DELETE FROM settings WHERE key IN ('cursor', 'lastSync')");
      await db
          .customStatement("DELETE FROM settings WHERE key LIKE 'private:%'");
      for (final entry in (payload['localData'] as Map? ?? const {}).entries) {
        await db.customStatement('INSERT INTO settings(key,value) VALUES (?,?)',
            ['private:${entry.key}', await cipher.seal(entry.value)]);
      }
      await db.customStatement(
          "INSERT OR REPLACE INTO settings(key,value) VALUES ('restoreCloudReview','true')");
      for (final r in records) {
        await _write(r.id, r.kind, r.data, 0, deleted: r.deleted);
        if (previous.containsKey(r.id)) {
          await db.customStatement(
              'UPDATE records SET local_version=? WHERE id=?',
              [previous[r.id]! + 1, r.id]);
        }
      }
      for (final h in payload['history'] as List? ?? const []) {
        await db.customStatement(
            'INSERT INTO audit(record_id,payload,created_at) VALUES (?,?,?)',
            [h['record'], await cipher.seal(h['data']), h['at']]);
      }
      for (final entry
          in (payload['preferences'] as Map? ?? const {}).entries) {
        await db.customStatement(
            'INSERT OR REPLACE INTO settings(key,value) VALUES (?,?)',
            [entry.key, entry.value]);
      }
      await db.customStatement(
          "INSERT OR REPLACE INTO settings(key,value) VALUES ('onboarded','true')");
    });
    _decoded.clear();
    configureFinanceClock(
        (await privateData('notifications'))['timezone'] as String?);
    changes.add(null);
  }

  String csv(FinanceSnapshot snapshot) {
    String cell(Object? value) {
      var text = (value ?? '').toString();
      if (RegExp(r'^[=+@\-\t\r]').hasMatch(text)) text = "'$text";
      return '"${text.replaceAll('"', '""')}"';
    }

    return [
      'Date,Type,Category,Amount BDT,Account,Note,Space,Destination,Status,Fee BDT,Splits,Invoice',
      ...snapshot.of('transaction').map((r) => [
            r.text('date'),
            r.text('type') == 'reversal'
                ? 'reversal (${r.text('originalType')})'
                : r.text('type'),
            snapshot.categoryName(r),
            editableMoney(snapshot.signedAmount(r)),
            snapshot.find(r.text('account'))?.text('name'),
            r.text('note'),
            snapshot.find(r.text('space'))?.text('name'),
            snapshot.find(r.text('destination'))?.text('name'),
            snapshot.isPosted(r) ? 'Posted' : 'Scheduled',
            editableMoney(r.number('fee')),
            jsonEncode(r.data['splits'] ?? []),
            snapshot.find(r.text('invoice'))?.text('name'),
          ].map(cell).join(','))
    ].join('\r\n');
  }

  Future<void> dispose() async {
    lifecycle.invalidate();
    _decoded.clear();
    await changes.close();
    await db.close();
  }
}
