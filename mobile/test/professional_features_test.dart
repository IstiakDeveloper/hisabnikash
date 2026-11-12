import 'dart:ffi';
import 'dart:io';
import 'package:cryptography/cryptography.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqlite3/open.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;
import 'package:hisabnikash_mobile/core/database.dart';
import 'package:hisabnikash_mobile/core/models.dart';
import 'package:hisabnikash_mobile/core/money.dart';
import 'package:hisabnikash_mobile/core/planning.dart';
import 'package:hisabnikash_mobile/core/reminders.dart';
import 'package:hisabnikash_mobile/core/repository.dart';
import 'package:hisabnikash_mobile/core/vault.dart';

void main() {
  if (Platform.isWindows) {
    open.overrideFor(
        OperatingSystem.windows, () => DynamicLibrary.open('winsqlite3.dll'));
  }
  tzdata.initializeTimeZones();
  late FinanceRepository repo;
  late String space, account, bank;
  final today = DateTime.now();
  setUp(() async {
    repo = FinanceRepository(FinanceDatabase.memory(),
        VaultCipher(await AesGcm.with256bits().newSecretKey()));
    space = await repo.save('space', {'name': 'Personal', 'type': 'personal'});
    account = await repo
        .save('account', {'name': 'Cash', 'space': space, 'opening': 1000000});
    bank = await repo
        .save('account', {'name': 'Bank', 'space': space, 'opening': 0});
  });
  tearDown(() async => repo.dispose());
  Json expense(int amount) => {
        'space': space,
        'account': account,
        'type': 'expense',
        'category': 'Food & groceries',
        'amount': amount,
        'date': dayKey(today)
      };
  Future<Record> record(String id) async => (await repo.snapshot()).find(id)!;
  test(
      'split allocations and transfer fees reconcile to journal and category totals',
      () async {
    await repo.save('transaction', {
      ...expense(10000),
      'fee': 100,
      'splits': [
        {'category': 'Food & groceries', 'amount': 6000},
        {'category': 'Home & rent', 'amount': 4000}
      ]
    });
    await repo.save('transaction', {
      ...expense(20000),
      'type': 'transfer',
      'destination': bank,
      'fee': 200,
      'category': ''
    });
    final s = await repo.snapshot();
    expect(s.balance(s.find(account)!), 969700);
    expect(s.balance(s.find(bank)!), 20000);
    expect(s.total(space, today, 'expense'), 10300);
    expect(s.spent(space, monthKey(today), 'Food & groceries'), 6000);
    expect(s.spent(space, monthKey(today), 'Fees'), 300);
    expect(s.cashFlow(space, today), -10300);
    expect(
        () => FinanceRepository.validate(
            'transaction',
            {
              ...expense(100),
              'splits': [
                {'category': 'Food', 'amount': 99}
              ]
            },
            s),
        throwsFormatException);
  });
  test(
      'partial split refund reduces expense and reversal restores the same categories',
      () async {
    final id = await repo.save('transaction', {
      ...expense(10000),
      'splits': [
        {'category': 'Food & groceries', 'amount': 6000},
        {'category': 'Home & rent', 'amount': 4000}
      ]
    });
    await repo.refund(await record(id), bank, 5000, 'Returned items');
    var s = await repo.snapshot();
    expect(s.balance(s.find(bank)!), 5000);
    expect(s.total(space, today, 'expense'), 5000);
    expect(s.spent(space, monthKey(today), 'Food & groceries'), 3000);
    await expectLater(repo.refund(await record(id), bank, 6000, 'Too much'),
        throwsFormatException);
    await expectLater(
        repo.reverse(await record(id), 'Cannot reverse before refunds'),
        throwsFormatException);
    final refund =
        s.of('transaction').firstWhere((t) => t.text('type') == 'refund');
    await repo.reverse(refund, 'Refund was recorded incorrectly');
    s = await repo.snapshot();
    expect(s.total(space, today, 'expense'), 10000);
    expect(s.balance(s.find(bank)!), 0);
    await repo.reverse(await record(id), 'Original correction');
    s = await repo.snapshot();
    expect(s.total(space, today, 'expense'), 0);
    FinanceRepository.validateBackup(await repo.exportData());
  });
  test(
      'partial bill payments derive remaining amounts and reverse independently',
      () async {
    final id = await repo.save('bill', {
      'space': space,
      'name': 'Rent',
      'amount': 10000,
      'due': dayKey(today),
      'frequency': 'once',
      'category': 'Home & rent'
    });
    await repo.payBill(await record(id), account, amount: 4000);
    var s = await repo.snapshot();
    expect(s.billPaid(s.find(id)!), false);
    expect(s.billPaidAmount(s.find(id)!), 4000);
    await expectLater(repo.payBill(await record(id), account, amount: 7000),
        throwsFormatException);
    await repo.payBill(await record(id), account, amount: 6000);
    s = await repo.snapshot();
    expect(s.billPaid(s.find(id)!), true);
    await repo.reverse(s.of('transaction').first, 'Wrong payment');
    s = await repo.snapshot();
    expect(s.billPaid(s.find(id)!), false);
    expect(s.billPaidAmount(s.find(id)!), 6000);
  });
  test('budget obligations are grouped without double counting category bills',
      () async {
    await repo.save('budget', {
      'space': space,
      'category': 'Home & rent',
      'month': monthKey(today),
      'amount': 1200000
    });
    await repo.save('bill', {
      'space': space,
      'name': 'Rent',
      'amount': 300000,
      'due': dayKey(today),
      'frequency': 'once',
      'category': 'Home & rent'
    });
    var s = await repo.snapshot(), health = s.moneyHealth(space);
    expect(health.required, 1200000);
    expect(health.shortage, 200000);
    await repo.save('bill', {
      'space': space,
      'name': 'Internet',
      'amount': 100000,
      'due': dayKey(today),
      'frequency': 'once',
      'category': 'Bills & utilities'
    });
    s = await repo.snapshot();
    expect(s.moneyHealth(space).required, 1300000);
    expect(s.moneyHealth(space).shortage, 300000);
  });
  test(
      'multiple bills beyond remaining category budget use their combined total',
      () async {
    await repo.save('budget', {
      'space': space,
      'category': 'Home & rent',
      'month': monthKey(today),
      'amount': 50000
    });
    for (final name in ['Rent', 'Utilities']) {
      await repo.save('bill', {
        'space': space,
        'name': name,
        'amount': 40000,
        'due': dayKey(today),
        'frequency': 'once',
        'category': 'Home & rent'
      });
    }
    expect((await repo.snapshot()).moneyHealth(space).required, 80000);
  });
  test('funded savings reserve only once and reject over-allocation', () async {
    final id = await repo.save('goal', {
      'space': space,
      'name': 'Emergency',
      'target': 900000,
      'saved': 300000,
      'backingAccount': account
    });
    final s = await repo.snapshot();
    expect(s.moneyHealth(space).reserved, 300000);
    expect(s.moneyHealth(space).available, 700000);
    await expectLater(
        repo.save('goal', {
          'space': space,
          'name': 'Home',
          'target': 900000,
          'saved': 800000,
          'backingAccount': account
        }),
        throwsFormatException);
    final g = await record(id);
    await repo.save('goal', {...g.data, 'saved': 0},
        id: g.id, expectedVersion: g.localVersion);
    expect((await repo.snapshot()).reservedBalance(space), 0);
  });
  test(
      'daily completion changes only with transaction content for that local day',
      () async {
    await repo.completeDay(today, noTransactions: true);
    expect((await repo.snapshot()).dailyComplete(today), true);
    final id = await repo.save('transaction', expense(100));
    expect((await repo.snapshot()).dailyComplete(today), false);
    await expectLater(
        repo.completeDay(today, noTransactions: true), throwsFormatException);
    await repo.completeDay(today);
    expect((await repo.snapshot()).dailyComplete(today), true);
    await repo.save('transaction', {
      ...expense(500),
      'date': dayKey(today.subtract(const Duration(days: 1)))
    });
    expect((await repo.snapshot()).dailyComplete(today), true);
    final r = await record(id);
    await repo.save('transaction', {...r.data, 'note': 'New detail'},
        id: r.id, expectedVersion: r.localVersion);
    expect((await repo.snapshot()).dailyComplete(today), false);
  });
  test(
      'daily completion fingerprint is canonical and stable across device versions',
      () {
    final a = FinanceSnapshot([
      Record('a', 'transaction',
          {'date': dayKey(today), 'amount': 100, 'account': 'a'},
          localVersion: 1)
    ], 0, 0);
    final b = FinanceSnapshot([
      Record('a', 'transaction',
          {'account': 'a', 'amount': 100, 'date': dayKey(today)},
          localVersion: 99)
    ], 0, 0);
    expect(a.dailyFingerprint(today), b.dailyFingerprint(today));
    expect(a.dailyFingerprint(today).length, 64);
  });
  test(
      'reminder planner suppresses reviewed day and preserves future reminders',
      () async {
    final loc = tz.getLocation('Asia/Dhaka'),
        now = tz.TZDateTime(tz.getLocation('Asia/Dhaka'), today.year,
            today.month, today.day, 10);
    var plans = buildReminderPlan(
        await repo.snapshot(), const NotificationPreferences(daily: true), now);
    expect(plans.first.time.hour, 20);
    expect(plans.where((p) => p.kind == 'daily').length, 21);
    await repo.completeDay(today, noTransactions: true);
    plans = buildReminderPlan(
        await repo.snapshot(), const NotificationPreferences(daily: true), now);
    expect(plans.any((p) => p.key == 'daily:${dayKey(today)}'), false);
    expect(plans.any((p) => p.key == 'daily:renew'), true);
    expect(plans.every((p) => p.time.location == loc), true);
  });
  test('notification quotas reserve room for daily, summary and nearest bills',
      () async {
    for (var i = 0; i < 30; i++) {
      await repo.save('bill', {
        'space': space,
        'name': 'Bill $i',
        'amount': 100,
        'frequency': 'once',
        'due': dayKey(today.add(Duration(days: i + 5)))
      });
    }
    final now = tz.TZDateTime(
        tz.getLocation('Asia/Dhaka'), today.year, today.month, today.day, 10);
    final plans = buildReminderPlan(
        await repo.snapshot(),
        const NotificationPreferences(daily: true, bills: true, summary: true),
        now);
    expect(plans.length, lessThanOrEqualTo(59));
    expect(plans.map((p) => p.id).toSet().length, plans.length);
    expect(plans.where((p) => p.kind == 'bill').length, 35);
    final dailyOnly = buildReminderPlan(await repo.snapshot(),
        const NotificationPreferences(daily: true, bills: false), now);
    expect(dailyOnly.any((p) => p.kind == 'bill'), false);
  });
  test('quiet hours wrap midnight and can be disabled', () {
    const p = NotificationPreferences();
    expect(p.quiet(23), true);
    expect(p.quiet(7), true);
    expect(p.quiet(8), false);
    expect(const NotificationPreferences(quietStart: 0, quietEnd: 0).quiet(12),
        false);
  });
  test('closed month blocks creation, moving and deletion until reopened',
      () async {
    final previous = DateTime(today.year, today.month - 1, 12);
    final id = await repo
        .save('transaction', {...expense(100), 'date': dayKey(previous)});
    await repo.reviewMonth(space, previous);
    await expectLater(
        repo.save('transaction', {...expense(200), 'date': dayKey(previous)}),
        throwsFormatException);
    var r = await record(id);
    await expectLater(
        repo.save('transaction', {...r.data, 'date': dayKey(today)},
            id: r.id, expectedVersion: r.localVersion),
        throwsFormatException);
    await expectLater(repo.remove(r), throwsFormatException);
    await repo.reviewMonth(space, previous, close: false);
    r = await record(id);
    await repo.remove(r);
    expect((await repo.snapshot()).find(id), null);
  });
  test('reconciliation affects cash flow without inflating income or expenses',
      () async {
    await repo.reconcile(await record(account), 900000, 'Counted cash');
    var s = await repo.snapshot();
    expect(s.balance(s.find(account)!), 900000);
    expect(s.total(space, today, 'expense'), 0);
    expect(s.cashFlow(space, today), -100000);
    await repo.reverse(s.of('transaction').single, 'Wrong actual count');
    s = await repo.snapshot();
    expect(s.balance(s.find(account)!), 1000000);
    expect(s.cashFlow(space, today), 0);
  });
  test(
      'invoice items, partial payments and reversals produce a consistent ledger',
      () async {
    final party = await repo.save(
        'party', {'space': space, 'name': 'Customer', 'type': 'customer'});
    final invoice = await repo.save('invoice', {
      'space': space,
      'party': party,
      'name': 'INV-1',
      'direction': 'receivable',
      'due': dayKey(today),
      'amount': 10000,
      'lines': [
        {'name': 'Design', 'quantity': 2, 'unitPrice': 5000}
      ]
    });
    expect((await repo.snapshot()).balance((await repo.snapshot()).find(bank)!),
        0);
    await repo.settleInvoice(await record(invoice), bank, 4000);
    var s = await repo.snapshot();
    expect(s.invoiceRemaining(s.find(invoice)!), 6000);
    expect(s.balance(s.find(bank)!), 4000);
    await expectLater(repo.settleInvoice(await record(invoice), bank, 7000),
        throwsFormatException);
    await repo.reverse(s.of('transaction').single, 'Incorrect collection');
    s = await repo.snapshot();
    expect(s.invoiceRemaining(s.find(invoice)!), 10000);
    expect(s.balance(s.find(bank)!), 0);
  });
  test(
      'reducing and flat loan schedules preserve exact principal and month-end dates',
      () {
    for (final model in ['flat', 'reducing']) {
      final rows =
          loanSchedule(1000000, 1200, 12, DateTime(2028, 1, 31), model: model);
      expect(rows.fold<int>(0, (s, r) => s + (r['principal'] as int)), 1000000);
      expect(rows[1]['due'], '2028-02-29');
      expect(rows.every((r) => r['principal'] > 0 && r['interest'] >= 0), true);
    }
  });
  test(
      'installment payment separates principal and interest and reopens on reversal',
      () async {
    final loan = await repo.save('loan', {
      'space': space,
      'name': 'Bank loan',
      'principal': 100000,
      'repaid': 0,
      'direction': 'borrowed'
    });
    await repo.scheduleLoan(await record(loan), 1200, 2, today);
    var s = await repo.snapshot();
    final installment = s.of('installment').first;
    await repo.payInstallment(installment, account);
    s = await repo.snapshot();
    expect(s.repaid(s.find(loan)!), installment.number('principal'));
    expect(s.total(space, today, 'expense'), installment.number('interest'));
    expect(s.installmentRemaining(s.find(installment.id)!), 0);
    await expectLater(repo.repayLoan(await record(loan), account, 100),
        throwsFormatException);
    await repo.reverse(s.of('transaction').single, 'Wrong account');
    s = await repo.snapshot();
    expect(s.repaid(s.find(loan)!), 0);
    expect(s.installmentRemaining(s.find(installment.id)!),
        installment.number('principal') + installment.number('interest'));
  });
  test('expected salary affects forecast only until explicitly received',
      () async {
    await repo.createExpectations({
      'space': space,
      'name': 'Salary',
      'category': 'Salary',
      'amount': 100000,
      'due': dayKey(today)
    }, 1);
    var s = await repo.snapshot();
    expect(s.total(space, today, 'income'), 0);
    expect(
        s.cashCalendar(space, 1, expectedIncome: true).single.balance, 1100000);
    expect(s.cashCalendar(space, 1).single.balance, 1000000);
    final e = s.of('expectation').single;
    await repo.receiveExpectation(e, bank);
    s = await repo.snapshot();
    expect(s.total(space, today, 'income'), 100000);
    expect(
        s.cashCalendar(space, 1, expectedIncome: true).single.balance, 1100000);
    await expectLater(repo.receiveExpectation(e, bank), throwsFormatException);
  });
  test(
      'encrypted drafts and preferences round-trip with extended domain backup',
      () async {
    await repo.writePrivate('draft:transaction:new', {
      'values': ['unsaved private note']
    });
    await repo.writePrivate('notifications', {'daily': true, 'hour': 20});
    await repo.save(
        'party', {'space': space, 'name': 'Supplier', 'type': 'supplier'});
    final stored = await repo.getSetting('private:draft:transaction:new');
    expect(stored, isNot(contains('unsaved private note')));
    final data = await repo.exportData();
    FinanceRepository.validateBackup(data);
    await repo.writePrivate('notifications', {'daily': false});
    await repo.restore(data);
    expect((await repo.privateData('notifications'))['daily'], true);
    expect((await repo.snapshot()).of('party').single.text('name'), 'Supplier');
  });
  test('trash restore restores balances and respects closed periods', () async {
    final id = await repo.save('transaction', expense(1000));
    await repo.remove(await record(id));
    expect((await repo.deletedTransactions()).single.id, id);
    await repo.restoreTransaction(id);
    final s = await repo.snapshot();
    expect(s.balance(s.find(account)!), 999000);
  });
  test('reversed historical payments remain valid after replacement and backup',
      () async {
    final bill = await repo.save('bill', {
      'space': space,
      'name': 'Bill',
      'amount': 10000,
      'due': dayKey(today),
      'frequency': 'once'
    });
    await repo.payBill(await record(bill), account);
    await repo.reverse(
        (await repo.snapshot()).of('transaction').single, 'Replace payment');
    await repo.payBill(await record(bill), bank);
    final payload = await repo.exportData();
    FinanceRepository.validateBackup(payload);
    await repo.restore(payload);
    expect(
        (await repo.snapshot()).billPaid((await repo.snapshot()).find(bill)!),
        true);
  });
  test(
      'spending reserved cash produces an unfunded balance without invalidating backup',
      () async {
    await repo.save('goal', {
      'space': space,
      'name': 'Emergency',
      'target': 1000000,
      'saved': 900000,
      'backingAccount': account
    });
    await repo.save('transaction', expense(500000));
    final s = await repo.snapshot();
    expect(s.reservedBalance(space), 500000);
    FinanceRepository.validateBackup(await repo.exportData());
  });
  test('a single overspending event produces only its highest threshold',
      () async {
    await repo.save('budget', {
      'space': space,
      'category': 'Food & groceries',
      'month': monthKey(today),
      'amount': 10000
    });
    await repo.save('transaction', expense(10500));
    final alerts = (await repo.snapshot())
        .smartAlerts()
        .where((a) => a.id.startsWith('budget:'))
        .toList();
    expect(alerts.length, 1);
    expect(alerts.single.id, endsWith(':100'));
  });
  test('weekly bills retain skipped cycles and update future unpaid amounts',
      () async {
    final id = await repo.save('bill', {
      'space': space,
      'name': 'Weekly',
      'amount': 1000,
      'due': dayKey(today),
      'frequency': 'weekly',
      'category': 'Bills & utilities'
    });
    await repo.ensureBillOccurrences();
    var s = await repo.snapshot();
    final next = s.of('bill').firstWhere((b) =>
        b.text('due') ==
        dayKey(DateTime(today.year, today.month, today.day + 7)));
    await repo.remove(next);
    await repo.payBill(await record(id), account);
    await repo.ensureBillOccurrences();
    expect((await repo.record(next.id))!.deleted, true);
    s = await repo.snapshot();
    final future = s
        .of('bill')
        .firstWhere((b) => b.text('due').compareTo(dayKey(today)) > 0);
    await repo.save('bill', {...future.data, 'amount': 1500},
        id: future.id, expectedVersion: future.localVersion);
    await repo.ensureBillOccurrences();
    s = await repo.snapshot();
    expect(
        s
            .of('bill')
            .where((b) => b.text('due').compareTo(future.text('due')) >= 0)
            .every((b) => b.number('amount') == 1500),
        true);
  });
  test('custom interval bills and annual leap-day schedules have correct dates',
      () async {
    await repo.save('bill', {
      'space': space,
      'name': 'Every ten days',
      'amount': 100,
      'due': dayKey(today),
      'frequency': 'custom',
      'intervalDays': 10
    });
    await repo.ensureBillOccurrences();
    expect(
        (await repo.snapshot()).of('bill').any((b) =>
            b.text('due') ==
            dayKey(DateTime(today.year, today.month, today.day + 10))),
        true);
    await expectLater(
        repo.save('bill', {
          'space': space,
          'name': 'Bad',
          'amount': 100,
          'due': dayKey(today),
          'frequency': 'custom',
          'intervalDays': 0
        }),
        throwsFormatException);
    await repo.save('bill', {
      'space': space,
      'name': 'Annual',
      'amount': 100,
      'due': '2028-02-29',
      'frequency': 'yearly'
    });
    await repo.ensureBillOccurrences(now: DateTime(2029, 2, 1));
    expect(
        (await repo.snapshot()).of('bill').any(
            (b) => b.text('name') == 'Annual' && b.text('due') == '2029-02-28'),
        true);
  });
  test('closed receiving space blocks cross-space transfer corrections',
      () async {
    final other =
        await repo.save('space', {'name': 'Business', 'type': 'business'});
    final otherAccount = await repo.save(
        'account', {'space': other, 'name': 'Business cash', 'opening': 0});
    final previous = DateTime(today.year, today.month - 1, 10);
    await repo.reviewMonth(other, previous);
    await expectLater(
        repo.save('transaction', {
          ...expense(100),
          'type': 'transfer',
          'destination': otherAccount,
          'date': dayKey(previous)
        }),
        throwsFormatException);
  });
}
