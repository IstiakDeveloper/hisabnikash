part of 'repository.dart';

const professionalKinds = {
  'daily_review',
  'month_close',
  'party',
  'invoice',
  'installment',
  'expectation',
  'template'
};

void _validateProfessional(String kind, Json data, FinanceSnapshot state,
    {String? id}) {
  void text(String key, {bool required = true}) {
    if (!required && data[key] == null) return;
    if (data[key] is! String ||
        (data[key] as String).length > 1000 ||
        (required && (data[key] as String).trim().isEmpty)) {
      throw FormatException('Enter a valid $key.');
    }
  }

  void amount(String key, {bool zero = false, bool optional = false}) {
    if (optional && data[key] == null) return;
    if (data[key] is! int ||
        data[key] < (zero ? 0 : 1) ||
        data[key] > 99999999999999) {
      throw FormatException('Invalid $key amount.');
    }
  }

  void date(String key) {
    text(key);
    final value = DateTime.tryParse(data[key]);
    if (value == null || dayKey(value) != data[key]) {
      throw FormatException('Invalid $key date.');
    }
  }

  Record reference(String key, String expected) {
    text(key);
    final r = state.find(data[key]);
    if (r == null ||
        r.kind != expected ||
        (data['space'] != null && r.text('space') != data['space'])) {
      throw FormatException('Choose a valid $key in this space.');
    }
    return r;
  }

  if (kind == 'transaction') {
    final reversed = id != null &&
        state.find(id) != null &&
        state.isReversed(state.find(id)!);
    if ((data['loan'] as String? ?? '').isNotEmpty &&
        data['type'] != 'reversal' &&
        !reversed) {
      final loan = reference('loan', 'loan');
      final paid = state
          .of('transaction')
          .where((r) =>
              r.id != id && r.text('loan') == loan.id && !state.isReversed(r))
          .fold<int>(0, (s, r) => s + r.number('amount'));
      if (data['amount'] is! int ||
          data['amount'] + paid + loan.number('repaid') >
              loan.number('principal')) {
        throw const FormatException(
            'Repayment exceeds the outstanding principal.');
      }
    }
    final account = state.find(data['account'] as String? ?? '');
    if (account != null &&
        data['date'] is String &&
        account.text('openingDate').compareTo(data['date']) > 0) {
      throw const FormatException(
          'Transaction date cannot precede the account opening date.');
    }
    amount('fee', zero: true, optional: true);
    text('feeCategory', required: false);
    for (final flag in ['adjustment']) {
      if (data[flag] != null && data[flag] is! bool) {
        throw FormatException('Invalid $flag.');
      }
    }
    if (data['adjustment'] == true &&
        (!{'income', 'expense', 'reversal'}.contains(data['type']) ||
            data['splits'] != null ||
            (data['fee'] ?? 0) != 0 ||
            (data['note'] as String? ?? '').trim().isEmpty)) {
      throw const FormatException(
          'An adjustment needs a reason and cannot have splits or fees.');
    }
    final splits = data['splits'];
    if (splits != null) {
      if (splits is! List ||
          splits.isEmpty ||
          splits.length > 30 ||
          !{'expense', 'refund', 'reversal'}.contains(data['type'])) {
        throw const FormatException('Only expenses and refunds can be split.');
      }
      var sum = 0;
      for (final split in splits) {
        if (split is! Map ||
            split['category'] is! String ||
            (split['category'] as String).trim().isEmpty ||
            split['amount'] is! int ||
            split['amount'] < 1 ||
            split['amount'] > 99999999999999) {
          throw const FormatException('Invalid split allocation.');
        }
        sum += split['amount'] as int;
      }
      if (sum != data['amount']) {
        throw const FormatException(
            'Split amounts must equal the transaction amount.');
      }
    }
    if (data['type'] == 'refund') {
      final original = reference('refundOf', 'transaction');
      if (original.text('type') != 'expense' ||
          (state.isReversed(original) && !reversed) ||
          !state.isPosted(original) ||
          original.text('invoice').isNotEmpty ||
          original.text('bill').isNotEmpty ||
          original.flag('adjustment')) {
        throw const FormatException(
            'Choose an ordinary posted expense to refund.');
      }
      final refunded = state
          .of('transaction')
          .where((r) =>
              r.id != id &&
              r.text('refundOf') == original.id &&
              !state.isReversed(r))
          .fold<int>(0, (s, r) => s + r.number('amount'));
      if (data['amount'] is! int ||
          (!reversed &&
              data['amount'] > original.number('amount') - refunded) ||
          (data['date'] as String? ?? '').compareTo(original.text('date')) <
              0) {
        throw const FormatException(
            'Refund exceeds the unrefunded expense or predates it.');
      }
    }
    if ((data['invoice'] as String? ?? '').isNotEmpty) {
      final invoice = reference('invoice', 'invoice');
      final paid = state
          .of('transaction')
          .where((r) =>
              r.id != id &&
              r.text('invoice') == invoice.id &&
              !state.isReversed(r))
          .fold<int>(0, (s, r) => s + r.number('amount'));
      if (data['type'] !=
              (invoice.text('direction') == 'receivable'
                  ? 'income'
                  : 'expense') ||
          (!reversed && data['amount'] > invoice.number('amount') - paid)) {
        throw const FormatException(
            'Invoice payment exceeds its outstanding amount.');
      }
    }
    if ((data['installment'] as String? ?? '').isNotEmpty) {
      final installment = reference('installment', 'installment');
      final paid = state
          .of('transaction')
          .where((r) =>
              r.id != id &&
              r.text('installment') == installment.id &&
              !state.isReversed(r))
          .toList();
      if (data['loan'] != installment.text('loan') ||
          (!reversed &&
              (data['amount'] >
                      installment.number('principal') -
                          paid.fold<int>(0, (s, r) => s + r.number('amount')) ||
                  (data['fee'] ?? 0) >
                      installment.number('interest') -
                          paid.fold<int>(0, (s, r) => s + r.number('fee'))))) {
        throw const FormatException(
            'Installment payment exceeds its principal or interest.');
      }
    }
    if ((data['expectation'] as String? ?? '').isNotEmpty) {
      final e = reference('expectation', 'expectation');
      if (data['type'] != 'income' ||
          data['amount'] != e.number('amount') ||
          (!reversed &&
              state.of('transaction').any((r) =>
                  r.id != id &&
                  r.text('expectation') == e.id &&
                  !state.isReversed(r)))) {
        throw const FormatException(
            'Expected income already received or mismatched.');
      }
    }
  }
  if (kind == 'account') {
    amount('lowBalance', zero: true, optional: true);
    if (data['openingDate'] != null) date('openingDate');
  }
  if (kind == 'goal' && (data['backingAccount'] as String? ?? '').isNotEmpty) {
    reference('backingAccount', 'account');
  }
  if (kind == 'bill' && data['category'] != null) text('category');
  if (kind == 'schedule' && data['frequency'] != null) {
    if (!{'once', 'monthly', 'weekly', 'yearly', 'custom'}
        .contains(data['frequency'])) {
      throw const FormatException('Invalid schedule frequency.');
    }
    if (data['frequency'] == 'custom' &&
        (data['intervalDays'] is! int ||
            data['intervalDays'] < 1 ||
            data['intervalDays'] > 3650)) {
      throw const FormatException('Invalid schedule interval.');
    }
  }
  if (!professionalKinds.contains(kind)) return;
  switch (kind) {
    case 'daily_review':
      date('date');
      text('fingerprint');
      if (data['noTransactions'] is! bool) {
        throw const FormatException('Invalid daily review.');
      }
      break;
    case 'month_close':
      text('month');
      text('fingerprint');
      if (!RegExp(r'^\d{4}-(0[1-9]|1[0-2])$').hasMatch(data['month']) ||
          data['closed'] is! bool) {
        throw const FormatException('Invalid month review.');
      }
      break;
    case 'party':
      text('name');
      if (!{'customer', 'supplier'}.contains(data['type'])) {
        throw const FormatException('Choose customer or supplier.');
      }
      text('contact', required: false);
      break;
    case 'invoice':
      text('name');
      amount('amount');
      date('due');
      reference('party', 'party');
      if (!{'receivable', 'payable'}.contains(data['direction'])) {
        throw const FormatException('Invalid invoice direction.');
      }
      if (state.of('invoice').any((i) =>
          i.id != id &&
          i.text('space') == data['space'] &&
          i.text('name') == data['name'])) {
        throw const FormatException(
            'Invoice number already exists in this space.');
      }
      if (data['lines'] is! List ||
          (data['lines'] as List).isEmpty ||
          (data['lines'] as List).length > 100) {
        throw const FormatException('Add invoice items.');
      }
      var sum = 0;
      for (final line in data['lines']) {
        if (line is! Map ||
            line['name'] is! String ||
            (line['name'] as String).trim().isEmpty ||
            line['quantity'] is! int ||
            line['quantity'] < 1 ||
            line['quantity'] > 1000000 ||
            line['unitPrice'] is! int ||
            line['unitPrice'] < 1) {
          throw const FormatException('Invalid invoice item.');
        }
        sum += (line['quantity'] as int) * (line['unitPrice'] as int);
      }
      if (sum != data['amount']) {
        throw const FormatException('Invoice total must match its items.');
      }
      if (state.find(id ?? '') != null &&
          state.invoicePaid(state.find(id!)!) > 0 &&
          jsonEncode(state.find(id)!.data) != jsonEncode(data)) {
        throw const FormatException('A paid invoice is retained as history.');
      }
      break;
    case 'installment':
      final loan = reference('loan', 'loan');
      date('due');
      amount('principal');
      amount('interest', zero: true);
      if (loan.text('direction') == 'lent' && data['interest'] != 0) {
        throw const FormatException(
            'Interest-bearing receivable schedules are not supported.');
      }
      final principal = state
          .of('installment')
          .where((i) => i.id != id && i.text('loan') == loan.id)
          .fold<int>(0, (s, i) => s + i.number('principal'));
      if (principal + data['principal'] >
          loan.number('principal') - loan.number('repaid')) {
        throw const FormatException(
            'Scheduled principal exceeds the loan balance.');
      }
      break;
    case 'expectation':
      text('name');
      amount('amount');
      date('due');
      text('category');
      break;
    case 'template':
      text('name');
      if (data['transaction'] is! Map) {
        throw const FormatException('Invalid transaction template.');
      }
      final tx = Map<String, dynamic>.from(data['transaction']);
      if (!{'income', 'expense', 'transfer'}.contains(tx['type']) ||
          tx['space'] != data['space'] ||
          [
            'bill',
            'loan',
            'invoice',
            'installment',
            'expectation',
            'reversalOf',
            'refundOf'
          ].any((f) => (tx[f] as String? ?? '').isNotEmpty)) {
        throw const FormatException(
            'Templates require an ordinary transaction.');
      }
      FinanceRepository.validate('transaction', tx, state);
      break;
  }
}

void _beforeProfessionalRemove(Record record, FinanceSnapshot state) {
  if (record.kind == 'transaction' && record.flag('adjustment')) {
    throw const FormatException(
        'Reverse reconciliation adjustments to retain their audit history.');
  }
  if (record.kind == 'expectation' &&
      state.of('transaction').any((t) => t.text('expectation') == record.id)) {
    throw const FormatException('Keep expected income with receipt history.');
  }
  if (record.kind == 'transaction' &&
      (record.text('invoice').isNotEmpty ||
          record.text('installment').isNotEmpty ||
          record.text('expectation').isNotEmpty ||
          state.of('transaction').any((r) =>
              r.text('refundOf') == record.id && !state.isReversed(r)))) {
    throw const FormatException(
        'Reverse linked transactions to preserve their history.');
  }
  if (record.kind == 'party' &&
      state.of('invoice').any((i) => i.text('party') == record.id)) {
    throw const FormatException('This contact has invoice history.');
  }
  if (record.kind == 'invoice' &&
      state.of('transaction').any((t) => t.text('invoice') == record.id)) {
    throw const FormatException('Keep invoices with payment history.');
  }
  if (record.kind == 'installment' &&
      state.of('transaction').any((t) => t.text('installment') == record.id)) {
    throw const FormatException('Keep installments with payment history.');
  }
  if (record.kind == 'month_close') {
    throw const FormatException('Reopen the month from month review.');
  }
  if (record.kind == 'account' &&
      state.of('goal').any((g) => g.text('backingAccount') == record.id)) {
    throw const FormatException(
        'Remove savings allocations before removing the account.');
  }
  if (record.kind == 'loan' &&
      state.of('installment').any((i) => i.text('loan') == record.id)) {
    throw const FormatException('Keep loans with installment schedules.');
  }
}

extension ProfessionalRepository on FinanceRepository {
  Future<List<Record>> deletedTransactions() async {
    final rows = await db
        .customSelect(
            "SELECT id FROM records WHERE deleted=1 AND kind='transaction'")
        .get();
    return [for (final row in rows) (await record(row.read<String>('id')))!];
  }

  Future<void> restoreTransaction(String id) async {
    await db.transaction(() async {
      final old = await record(id), state = await snapshot();
      if (old == null ||
          !old.deleted ||
          old.kind != 'transaction' ||
          !{'income', 'expense', 'transfer', 'refund'}
              .contains(old.text('type')) ||
          ['bill', 'loan', 'invoice', 'installment', 'expectation']
              .any((f) => old.text(f).isNotEmpty)) {
        throw const FormatException(
            'Only deleted ordinary transactions can be restored.');
      }
      FinanceRepository.validate(old.kind, old.data, state, id: old.id);
      await _write(old.id, old.kind, old.data, old.revision);
    });
    changes.add(null);
  }

  Future<void> createExpectations(Json data, int months) async {
    if (months < 1 || months > 60) {
      throw const FormatException('Choose 1–60 occurrences.');
    }
    await db.transaction(() async {
      final start = DateTime.parse(data['due'] as String),
          state = await snapshot();
      for (var n = 0; n < months; n++) {
        final base = DateTime(start.year, start.month + n),
            last = DateTime(start.year, start.month + n + 1, 0).day;
        final entry = <String, dynamic>{
          ...data,
          'due': dayKey(DateTime(
              base.year, base.month, start.day > last ? last : start.day))
        };
        FinanceRepository.validate('expectation', entry, state);
        await _write(uuid.v4(), 'expectation', entry, 0);
      }
    });
    changes.add(null);
  }

  Future<Json> privateData(String key) async {
    final value = await getSetting('private:$key');
    return value == null
        ? <String, dynamic>{}
        : Map<String, dynamic>.from(await cipher.open(value) as Map);
  }

  Future<void> writePrivate(String key, Json data, {bool notify = true}) async {
    if (key == 'notifications') {
      configureFinanceClock(data['timezone'] as String?);
    }
    await db.customStatement(
        'INSERT OR REPLACE INTO settings(key,value) VALUES (?,?)',
        ['private:$key', await cipher.seal(data)]);
    if (notify) changes.add(null);
  }

  Future<void> _assertOpenPeriod(String id, Json data) async {
    final state = await snapshot();
    final old = state.find(id);
    for (final tx in [if (old != null) old.data, data]) {
      final spaces = {
        tx['space'],
        if (tx['type'] == 'transfer' || tx['originalType'] == 'transfer')
          state.find(tx['destination'] as String? ?? '')?.text('space')
      };
      if (state.of('month_close').any((m) =>
          m.flag('closed') &&
          spaces.contains(m.text('space')) &&
          (tx['date'] as String? ?? '').startsWith(m.text('month')))) {
        throw const FormatException(
            'This month is closed. Reopen it in month review before changing transactions.');
      }
    }
  }

  Future<void> completeDay(DateTime date, {bool noTransactions = false}) async {
    await db.transaction(() async {
      final state = await snapshot();
      if (dayKey(date) != dayKey(financeNow())) {
        throw const FormatException(
            'Review today’s transactions before completing today.');
      }
      if (noTransactions && state.dailyEntries(date) > 0) {
        throw const FormatException(
            'Today has transactions. Review them and choose “Day complete”.');
      }
      final space = state.of('space').firstOrNull;
      if (space == null) throw const FormatException('Create a space first.');
      final id = 'daily:${dayKey(date)}';
      final old = await record(id);
      await _write(
          id,
          'daily_review',
          {
            'space': space.id,
            'date': dayKey(date),
            'fingerprint': state.dailyFingerprint(date),
            'noTransactions': noTransactions
          },
          old?.revision ?? 0);
    });
    changes.add(null);
  }

  Future<void> reviewMonth(String space, DateTime month,
      {bool close = true}) async {
    final now = financeNow();
    if (monthKey(month).compareTo(monthKey(now)) >= 0 && close) {
      throw const FormatException('Only completed months can be closed.');
    }
    await db.transaction(() async {
      final state = await snapshot();
      if (state.find(space)?.kind != 'space') {
        throw const FormatException('Choose one space to review.');
      }
      final id = 'month:$space:${monthKey(month)}';
      final old = await record(id);
      await _write(
          id,
          'month_close',
          {
            'space': space,
            'month': monthKey(month),
            'closed': close,
            'fingerprint': state.monthFingerprint(space, month),
            'reviewedAt': now.toUtc().toIso8601String()
          },
          old?.revision ?? 0);
    });
    changes.add(null);
  }

  Future<void> reconcile(Record account, int actual, String reason) async {
    if (actual < 0 || reason.trim().isEmpty) {
      throw const FormatException('Enter the actual balance and a reason.');
    }
    await db.transaction(() async {
      final state = await snapshot(), fresh = await record(account.id);
      if (fresh == null ||
          fresh.deleted ||
          fresh.localVersion != account.localVersion) {
        throw const FormatException('Account changed. Reopen reconciliation.');
      }
      final difference = actual - state.balance(fresh);
      if (difference == 0) return;
      final data = <String, dynamic>{
        'space': fresh.text('space'),
        'type': difference > 0 ? 'income' : 'expense',
        'account': fresh.id,
        'amount': difference.abs(),
        'category': 'Balance adjustment',
        'adjustment': true,
        'date': dayKey(financeNow()),
        'note': reason.trim()
      };
      FinanceRepository.validate('transaction', data, state);
      await _write(uuid.v4(), 'transaction', data, 0);
    });
    changes.add(null);
  }

  Future<void> refund(
      Record original, String account, int amount, String reason) async {
    await db.transaction(() async {
      final state = await snapshot();
      final fresh = state.find(original.id);
      if (fresh == null || fresh.localVersion != original.localVersion) {
        throw const FormatException('Expense changed. Reopen it.');
      }
      final splits = fresh.data['splits'] as List?;
      final allocations = <Json>[];
      if (splits != null) {
        var residual = amount;
        for (var n = 0; n < splits.length; n++) {
          final portion = n == splits.length - 1
              ? residual
              : amount * (splits[n]['amount'] as int) ~/ fresh.number('amount');
          if (portion > 0) {
            allocations.add(
                {...Map<String, dynamic>.from(splits[n]), 'amount': portion});
          }
          residual -= portion;
        }
      }
      final data = <String, dynamic>{
        'space': fresh.text('space'),
        'type': 'refund',
        'refundOf': fresh.id,
        'account': account,
        'amount': amount,
        'category': fresh.text('category'),
        'categoryId': fresh.text('categoryId'),
        'date': dayKey(financeNow()),
        'note': reason.trim(),
        if (allocations.isNotEmpty) 'splits': allocations
      };
      FinanceRepository.validate('transaction', data, state);
      await _write(uuid.v4(), 'transaction', data, 0);
    });
    changes.add(null);
  }

  Future<List<Record>> duplicates(Json data, {String? excluding}) async =>
      (await snapshot())
          .of('transaction')
          .where((r) =>
              r.id != excluding &&
              r.text('type') == data['type'] &&
              r.text('account') == data['account'] &&
              r.text('date') == data['date'] &&
              r.number('amount') == data['amount'] &&
              !r.flag('adjustment') &&
              r.text('type') != 'reversal')
          .toList();

  Future<void> scheduleLoan(
      Record loan, int annualBps, int months, DateTime start,
      {String model = 'reducing'}) async {
    await db.transaction(() async {
      var state = await snapshot();
      final fresh = state.find(loan.id);
      if (fresh == null || fresh.localVersion != loan.localVersion) {
        throw const FormatException('Loan changed. Reopen it.');
      }
      if (state.of('installment').any((i) => i.text('loan') == loan.id)) {
        throw const FormatException('This loan already has a schedule.');
      }
      final remaining = fresh.number('principal') - state.repaid(fresh);
      if (fresh.text('direction') == 'lent' && annualBps != 0) {
        throw const FormatException(
            'Use an interest-free schedule for money lent.');
      }
      for (final entry
          in loanSchedule(remaining, annualBps, months, start, model: model)) {
        final data = <String, dynamic>{
          ...entry,
          'space': fresh.text('space'),
          'loan': fresh.id,
          'rateBps': annualBps,
          'model': model
        };
        final id = uuid.v4();
        FinanceRepository.validate('installment', data, state, id: id);
        await _write(id, 'installment', data, 0);
        state = await snapshot();
      }
    });
    changes.add(null);
  }

  Future<void> payInstallment(Record installment, String account) async {
    await db.transaction(() async {
      final state = await snapshot(), fresh = await record(installment.id);
      if (fresh == null ||
          fresh.deleted ||
          fresh.localVersion != installment.localVersion) {
        throw const FormatException('Installment changed. Reopen it.');
      }
      final loan = state.find(fresh.text('loan'))!;
      final paid = state
          .of('transaction')
          .where(
              (r) => r.text('installment') == fresh.id && !state.isReversed(r))
          .toList();
      final principal = fresh.number('principal') -
          paid.fold<int>(0, (s, r) => s + r.number('amount'));
      final interest = fresh.number('interest') -
          paid.fold<int>(0, (s, r) => s + r.number('fee'));
      if (principal <= 0) {
        throw const FormatException('Installment is already paid.');
      }
      final data = <String, dynamic>{
        'space': loan.text('space'),
        'loan': loan.id,
        'installment': fresh.id,
        'type': loan.text('direction') == 'borrowed'
            ? 'debt_payment'
            : 'debt_collection',
        'amount': principal,
        'fee': interest,
        'feeCategory': 'Loan interest',
        'account': account,
        'category': 'Loan repayment',
        'date': dayKey(financeNow()),
        'note': loan.text('name')
      };
      FinanceRepository.validate('transaction', data, state);
      await _write(uuid.v4(), 'transaction', data, 0);
    });
    changes.add(null);
  }

  Future<void> settleInvoice(Record invoice, String account, int amount) async {
    await db.transaction(() async {
      final state = await snapshot(), fresh = state.find(invoice.id);
      if (fresh == null || fresh.localVersion != invoice.localVersion) {
        throw const FormatException('Invoice changed. Reopen it.');
      }
      final data = <String, dynamic>{
        'space': fresh.text('space'),
        'invoice': fresh.id,
        'account': account,
        'type': fresh.text('direction') == 'receivable' ? 'income' : 'expense',
        'amount': amount,
        'category': fresh.text('category', 'Business'),
        'date': dayKey(financeNow()),
        'note': fresh.text('name')
      };
      FinanceRepository.validate('transaction', data, state);
      await _write(uuid.v4(), 'transaction', data, 0);
    });
    changes.add(null);
  }

  Future<void> receiveExpectation(Record expectation, String account) async {
    await db.transaction(() async {
      final state = await snapshot(), fresh = state.find(expectation.id);
      if (fresh == null || fresh.localVersion != expectation.localVersion) {
        throw const FormatException('Expected income changed. Reopen it.');
      }
      final data = <String, dynamic>{
        'space': fresh.text('space'),
        'expectation': fresh.id,
        'account': account,
        'type': 'income',
        'amount': fresh.number('amount'),
        'category': fresh.text('category'),
        'date': dayKey(financeNow()),
        'note': fresh.text('name')
      };
      FinanceRepository.validate('transaction', data, state);
      await _write(uuid.v4(), 'transaction', data, 0);
    });
    changes.add(null);
  }
}
