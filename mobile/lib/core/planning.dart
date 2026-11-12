import 'dart:convert';
import 'dart:math' as math;
import 'package:crypto/crypto.dart';
import 'models.dart';
import 'money.dart';

class MoneyHealth {
  const MoneyHealth(this.balance, this.reserved, this.required, this.budgeted,
      this.obligations, this.dailyLimit, this.hasBudgets);
  final int balance, reserved, required, budgeted, obligations;
  final int? dailyLimit;
  final bool hasBudgets;
  int get available => balance - reserved;
  int get remaining => available - required;
  int get shortage => math.max(0, -remaining);
}

class CashDay {
  const CashDay(this.date, this.change, this.balance, this.labels);
  final DateTime date;
  final int change, balance;
  final List<String> labels;
}

class SmartAlert {
  const SmartAlert(this.id, this.kind, this.title, this.message,
      {this.recordId = '', this.severity = 'info'});
  final String id, kind, title, message, recordId, severity;
  Json toJson() => {
        'id': id,
        'kind': kind,
        'title': title,
        'message': message,
        'recordId': recordId,
        'severity': severity
      };
}

extension PlanningSnapshot on FinanceSnapshot {
  Iterable<Record> scoped(String kind, String space) =>
      of(kind).where((r) => space == 'all' || r.text('space') == space);

  String dailyFingerprint(DateTime date) {
    final rows = of('transaction')
        .where((r) => r.text('date') == dayKey(date))
        .toList()
      ..sort((a, b) => a.id.compareTo(b.id));
    // Content, rather than device-local versions, makes completion portable.
    return sha256
        .convert(utf8.encode(
            jsonEncode(rows.map((r) => [r.id, _canonical(r.data)]).toList())))
        .toString();
  }

  bool dailyComplete(DateTime date) => of('daily_review').any((r) =>
      r.text('date') == dayKey(date) &&
      r.text('fingerprint') == dailyFingerprint(date));
  int dailyEntries(DateTime date) => of('transaction')
      .where((r) =>
          r.text('date') == dayKey(date) &&
          r.text('type') != 'reversal' &&
          !isReversed(r))
      .length;

  int invoicePaid(Record invoice) => of('transaction')
      .where((r) =>
          r.text('invoice') == invoice.id && isPosted(r) && !isReversed(r))
      .fold(0, (sum, r) => sum + r.number('amount'));
  int invoiceRemaining(Record invoice) =>
      math.max(0, invoice.number('amount') - invoicePaid(invoice));
  int installmentPaid(Record installment) => of('transaction')
      .where((r) =>
          r.text('installment') == installment.id &&
          isPosted(r) &&
          !isReversed(r))
      .fold(0, (sum, r) => sum + r.number('amount') + r.number('fee'));
  int installmentRemaining(Record installment) => math.max(
      0,
      installment.number('principal') +
          installment.number('interest') -
          installmentPaid(installment));
  bool expectationReceived(Record expectation) => of('transaction').any((r) =>
      r.text('expectation') == expectation.id && isPosted(r) && !isReversed(r));

  int reservedBalance(String space) {
    var reserved = 0;
    for (final account in scoped('account', space)) {
      final earmarked = of('goal')
          .where((g) => g.text('backingAccount') == account.id)
          .fold(0, (sum, g) => sum + g.number('saved'));
      reserved += math.min(math.max(0, balance(account)), earmarked);
    }
    return reserved;
  }

  Map<String, int> categorySpending(String space, DateTime month) {
    final result = <String, int>{};
    for (final r in transactions(space, month).where(
        (r) => isPosted(r) && (space == 'all' || r.text('space') == space))) {
      for (final entry in expenseParts(r).entries) {
        result.update(entry.key, (n) => n + entry.value,
            ifAbsent: () => entry.value);
      }
    }
    return result;
  }

  MoneyHealth moneyHealth(String space, {DateTime? now}) {
    final date = now ?? financeNow();
    final month = monthKey(date);
    final end = dayKey(DateTime(date.year, date.month + 1, 0));
    var required = 0, budgeted = 0, obligations = 0, discretionary = 0;
    var hasDiscretionary = false;
    final budgets =
        scoped('budget', space).where((r) => r.text('month') == month).toList();
    final remainders = <String, int>{}, dues = <String, int>{};
    for (final b in budgets) {
      final left = math.max(0,
          b.number('amount') - spent(b.text('space'), month, categoryName(b)));
      remainders['${b.text('space')}:${categoryIdentity(b)}'] = left;
      budgeted += left;
      if (b.flag('discretionary')) {
        discretionary += left;
        hasDiscretionary = true;
      }
    }
    void due(String key, int amount) {
      obligations += amount;
      dues.update(key, (n) => n + amount, ifAbsent: () => amount);
    }

    for (final b in scoped('bill', space)
        .where((b) => b.text('due').compareTo(end) <= 0 && !billPaid(b))) {
      final key =
          '${b.text('space')}:${categoryId(b.text('space'), 'expense', b.text('category', 'Bills & utilities'))}';
      due(key, math.max(0, b.number('amount') - billPaidAmount(b)));
    }
    for (final i in scoped('installment', space).where((i) =>
        i.text('due').compareTo(end) <= 0 &&
        find(i.text('loan'))?.text('direction') == 'borrowed')) {
      final payments = of('transaction').where((r) =>
          r.text('installment') == i.id && isPosted(r) && !isReversed(r));
      final principalPaid =
          payments.fold<int>(0, (s, r) => s + r.number('amount'));
      final interestPaid = payments.fold<int>(0, (s, r) => s + r.number('fee'));
      due('installment:${i.id}',
          math.max(0, i.number('principal') - principalPaid));
      due('${i.text('space')}:${categoryId(i.text('space'), 'expense', 'Loan interest')}',
          math.max(0, i.number('interest') - interestPaid));
    }
    for (final i in scoped('invoice', space).where((i) =>
        i.text('direction') == 'payable' &&
        i.text('due').compareTo(end) <= 0)) {
      due('${i.text('space')}:${categoryId(i.text('space'), 'expense', i.text('category', 'Business'))}',
          invoiceRemaining(i));
    }
    for (final t in scoped('transaction', space).where((t) =>
        t.text('date').compareTo(dayKey(date)) > 0 &&
        t.text('date').compareTo(end) <= 0 &&
        t.text('bill').isEmpty &&
        t.text('installment').isEmpty &&
        t.text('invoice').isEmpty)) {
      if (effectiveType(t) == 'expense') {
        for (final e in expenseParts(t).entries) {
          due('${t.text('space')}:${categoryId(t.text('space'), 'expense', e.key)}',
              e.value);
        }
      } else if (effectiveType(t) == 'debt_payment') {
        due('scheduled:${t.id}', t.number('amount') + t.number('fee'));
      }
    }
    for (final key in {...remainders.keys, ...dues.keys}) {
      required += math.max(remainders[key] ?? 0, dues[key] ?? 0);
    }
    final balance = spaceBalance(space), reserved = reservedBalance(space);
    final fixed = math.max(0, required - discretionary);
    final daily = hasDiscretionary
        ? math.min(discretionary, math.max(0, balance - reserved - fixed)) ~/
            (DateTime(date.year, date.month + 1, 0).day - date.day + 1)
        : null;
    return MoneyHealth(balance, reserved, required, budgeted, obligations,
        daily, budgets.isNotEmpty);
  }

  List<CashDay> cashCalendar(String space, int days,
      {DateTime? now, bool expectedIncome = false}) {
    final today = now ?? financeNow();
    final floor = DateTime(today.year, today.month, today.day);
    var running = spaceBalance(space);
    final result = <CashDay>[];
    for (var n = 0; n < days; n++) {
      final date = DateTime(floor.year, floor.month, floor.day + n),
          key = dayKey(DateTime(floor.year, floor.month, floor.day + n));
      var change = 0;
      final labels = <String>[];
      bool matches(String due) => n == 0 ? due.compareTo(key) <= 0 : due == key;
      for (final b in scoped('bill', space)
          .where((b) => !billPaid(b) && matches(b.text('due')))) {
        change -= b.number('amount') - billPaidAmount(b);
        labels.add(b.text('name'));
      }
      for (final i in scoped('installment', space)
          .where((i) => matches(i.text('due')))) {
        final loan = find(i.text('loan'));
        if (loan?.text('direction') == 'borrowed') {
          change -= installmentRemaining(i);
          labels.add(loan!.text('name'));
        } else if (expectedIncome) {
          change += installmentRemaining(i);
          labels.add(loan?.text('name') ?? 'Loan');
        }
      }
      for (final i
          in scoped('invoice', space).where((i) => matches(i.text('due')))) {
        if (i.text('direction') == 'payable' || expectedIncome) {
          change +=
              (i.text('direction') == 'payable' ? -1 : 1) * invoiceRemaining(i);
          labels.add(i.text('name'));
        }
      }
      for (final t in of('transaction').where((t) =>
          belongsToSpace(t, space) &&
          t.text('date') == key &&
          t.text('date').compareTo(dayKey(today)) > 0 &&
          t.text('bill').isEmpty &&
          t.text('installment').isEmpty &&
          t.text('invoice').isEmpty)) {
        final accounts = scoped('account', space).map((a) => a.id).toSet();
        final movement = journalLines(t.data)
            .where((l) => accounts.contains(l.accountId))
            .fold(0, (s, l) => s + l.amount);
        if (movement <= 0 || expectedIncome) {
          change += movement;
          labels.add(t.text('note', t.text('category')));
        }
      }
      if (expectedIncome) {
        for (final e in scoped('expectation', space)
            .where((e) => matches(e.text('due')) && !expectationReceived(e))) {
          change += e.number('amount');
          labels.add(e.text('name'));
        }
      }
      running += change;
      result.add(CashDay(date, change, running, labels));
    }
    return result;
  }

  String monthFingerprint(String space, DateTime month) {
    final rows = transactions(space, month).toList()
      ..sort((a, b) => a.id.compareTo(b.id));
    return sha256
        .convert(utf8.encode(
            jsonEncode(rows.map((r) => [r.id, _canonical(r.data)]).toList())))
        .toString();
  }

  List<SmartAlert> smartAlerts({DateTime? now, bool bangla = false}) {
    final date = now ?? financeNow(), results = <SmartAlert>[];
    String t(String en, String bn) => bangla ? bn : en;
    for (final b
        in of('budget').where((b) => b.text('month') == monthKey(date))) {
      final used = spent(b.text('space'), b.text('month'), categoryName(b));
      final level = used >= b.number('amount')
          ? 100
          : used * 100 >= b.number('amount') * 90
              ? 90
              : used * 100 >= b.number('amount') * 80
                  ? 80
                  : 0;
      if (level > 0) {
        results.add(SmartAlert(
            'budget:${b.id}:$level',
            'budget',
            t('Budget $level% used', 'বাজেটের $level% শেষ'),
            '${categoryName(b)} · ${money(b.number('amount') - used)} ${t('left', 'বাকি')}',
            recordId: b.id,
            severity: level == 100 ? 'danger' : 'warning'));
      }
      if (date.day >= 7 &&
          used > 0 &&
          used * DateTime(date.year, date.month + 1, 0).day >
              b.number('amount') * date.day) {
        results.add(SmartAlert(
            'pace:${b.id}',
            'budget',
            t('Spending ahead of plan', 'পরিকল্পনার চেয়ে দ্রুত খরচ'),
            '${categoryName(b)} · ${t('Projection based on recorded spending', 'লেখা খরচের ভিত্তিতে সম্ভাব্য হিসাব')}',
            recordId: b.id));
      }
    }
    for (final space in of('space')) {
      final health = moneyHealth(space.id, now: date);
      if (health.shortage > 0) {
        results.add(SmartAlert(
            'shortage:${space.id}:${monthKey(date)}',
            'balance',
            t('Plan funding shortage', 'পরিকল্পনার জন্য টাকার ঘাটতি'),
            '${space.text('name')} · ${money(health.shortage)}',
            recordId: space.id,
            severity: 'warning'));
      }
      if (date.day <= 3 &&
          !scoped('budget', space.id)
              .any((b) => b.text('month') == monthKey(date))) {
        results.add(SmartAlert(
            'newmonth:${space.id}:${monthKey(date)}',
            'summary',
            t('Review this month’s budget', 'এই মাসের বাজেট তৈরি করুন'),
            space.text('name'),
            recordId: space.id));
      }
    }
    for (final a in of('account').where((a) =>
        a.data['lowBalance'] is int && balance(a) < a.number('lowBalance'))) {
      results.add(SmartAlert(
          'account:${a.id}',
          'balance',
          t('Low account balance', 'অ্যাকাউন্টে টাকা কম'),
          '${a.text('name')} · ${money(balance(a))}',
          recordId: a.id,
          severity: 'warning'));
    }
    for (final account in of('account')) {
      final allocated = of('goal')
          .where((g) => g.text('backingAccount') == account.id)
          .fold<int>(0, (s, g) => s + g.number('saved'));
      final shortage = allocated - math.max(0, balance(account)).toInt();
      if (shortage > 0) {
        results.add(SmartAlert(
            'savings:${account.id}',
            'balance',
            t('Savings allocation is underfunded',
                'সঞ্চয়ের বরাদ্দে টাকার ঘাটতি'),
            '${account.text('name')} · ${money(shortage)}',
            recordId: account.id,
            severity: 'warning'));
      }
    }
    for (final b in of('bill').where((b) => !billPaid(b))) {
      final delta = DateTime.parse(b.text('due'))
          .difference(DateTime(date.year, date.month, date.day))
          .inDays;
      if (delta <= 3) {
        results.add(SmartAlert(
            'bill:${b.id}:${delta < 0 ? 'overdue' : delta}',
            'bill',
            delta < 0
                ? t('Bill overdue', 'বিল বকেয়া')
                : t('Bill due soon', 'বিল দেওয়ার সময় হয়েছে'),
            '${b.text('name')} · ${b.text('due')} · ${money(b.number('amount') - billPaidAmount(b))}',
            recordId: b.id,
            severity: delta < 0 ? 'danger' : 'warning'));
      }
    }
    for (final i
        in of('installment').where((i) => installmentRemaining(i) > 0)) {
      if (DateTime.parse(i.text('due')).difference(date).inDays <= 3) {
        results.add(SmartAlert(
            'emi:${i.id}',
            'bill',
            t('Installment due', 'কিস্তির সময় হয়েছে'),
            '${find(i.text('loan'))?.text('name')} · ${i.text('due')} · ${money(installmentRemaining(i))}',
            recordId: i.id));
      }
    }
    for (final e in of('expectation').where((e) =>
        e.text('due').compareTo(dayKey(date)) < 0 && !expectationReceived(e))) {
      results.add(SmartAlert(
          'income:${e.id}',
          'income',
          t('Expected income not recorded', 'প্রত্যাশিত আয় লেখা হয়নি'),
          '${e.text('name')} · ${e.text('due')}',
          recordId: e.id));
    }
    for (final i in of('invoice').where((i) =>
        i.text('due').compareTo(dayKey(date)) <= 0 &&
        invoiceRemaining(i) > 0)) {
      results.add(SmartAlert(
          'invoice:${i.id}',
          'business',
          t('Invoice outstanding', 'ইনভয়েসের বকেয়া'),
          '${i.text('name')} · ${money(invoiceRemaining(i))}',
          recordId: i.id));
    }
    return results;
  }
}

Object? _canonical(Object? value) {
  if (value is Map) {
    final keys = value.keys.cast<String>().toList()..sort();
    return {for (final key in keys) key: _canonical(value[key])};
  }
  if (value is List) return value.map(_canonical).toList();
  return value;
}

/// Reducing-balance annuity schedule. Rate is annual basis points (100 = 1%).
/// Final principal is the exact residual; all persisted amounts are paisa.
List<Json> loanSchedule(
    int principal, int annualBps, int months, DateTime start,
    {String model = 'reducing'}) {
  if (principal <= 0 ||
      annualBps < 0 ||
      annualBps > 10000 ||
      months < 1 ||
      months > 600 ||
      months > principal ||
      !{'reducing', 'flat'}.contains(model)) {
    throw const FormatException('Invalid loan schedule parameters.');
  }
  final monthly = annualBps / 120000.0;
  final payment = monthly == 0
      ? (principal / months).ceil()
      : (principal * monthly / (1 - math.pow(1 + monthly, -months))).ceil();
  var outstanding = principal;
  final result = <Json>[];
  for (var n = 0; n < months; n++) {
    final base = DateTime(start.year, start.month + n);
    final due = DateTime(base.year, base.month,
        math.min(start.day, DateTime(base.year, base.month + 1, 0).day));
    final interest = model == 'flat'
        ? (principal * annualBps / 120000).round()
        : (outstanding * annualBps / 120000).round();
    final portion = n == months - 1
        ? outstanding
        : math.min(
            outstanding,
            math.max(
                1,
                model == 'flat' || monthly == 0
                    ? (principal / months).floor()
                    : payment - interest));
    result
        .add({'due': dayKey(due), 'principal': portion, 'interest': interest});
    outstanding -= portion;
  }
  return result;
}
