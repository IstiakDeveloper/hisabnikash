import 'package:flutter_test/flutter_test.dart';
import 'package:hisabnikash_mobile/core/models.dart';
import 'package:hisabnikash_mobile/core/money.dart';

void main() {
  const personal =
      Record('personal', 'space', {'name': 'Personal', 'type': 'personal'});
  const business =
      Record('business', 'space', {'name': 'Business', 'type': 'business'});
  const cash = Record('cash', 'account',
      {'space': 'personal', 'name': 'Cash', 'opening': 100000});
  const bank = Record('bank', 'account',
      {'space': 'business', 'name': 'Bank', 'opening': 200000});
  test('cross-space transfer appears in the receiving space activity', () {
    final now = DateTime.now();
    final state = FinanceSnapshot([
      personal,
      business,
      cash,
      bank,
      Record('transfer', 'transaction', {
        'space': 'personal',
        'account': 'cash',
        'destination': 'bank',
        'type': 'transfer',
        'amount': 25000,
        'date': dayKey(now)
      })
    ], 0, 0);
    expect(state.transactions('business', now).map((r) => r.id),
        contains('transfer'));
    expect(state.balance(cash), 75000);
    expect(state.balance(bank), 225000);
    expect(state.total('all', now, 'income'), 0);
    expect(state.total('all', now, 'expense'), 0);
    expect(state.cashFlow('personal', now), -25000);
    expect(state.cashFlow('business', now), 25000);
    expect(state.cashFlow('all', now), 0);
  });
  test(
      'scheduled transactions do not change today’s actual balance or spending',
      () {
    final future = DateTime.now().add(const Duration(days: 40));
    final state = FinanceSnapshot([
      personal,
      cash,
      Record('scheduled', 'transaction', {
        'space': 'personal',
        'account': 'cash',
        'category': 'Food & groceries',
        'type': 'expense',
        'amount': 10000,
        'date': dayKey(future)
      })
    ], 0, 0);
    expect(state.balance(cash), 100000);
    expect(state.total('personal', future, 'expense'), 0);
    expect(state.spent('personal', monthKey(future), 'Food & groceries'), 0);
    expect(state.balance(cash, asOf: future), 90000);
  });
  test('negative amounts below one taka keep their sign in exports', () {
    expect(editableMoney(-50), '-0.50');
    expect(editableMoney(-12550), '-125.50');
  });
  test('hand-calculated mixed ledger reconciles across spaces and cash flow',
      () {
    final now = DateTime.now();
    Record entry(
            String id, String space, String account, String type, int amount,
            {String? destination, DateTime? date}) =>
        Record(id, 'transaction', {
          'space': space,
          'account': account,
          'type': type,
          'amount': amount,
          'category': 'Food & groceries',
          'date': dayKey(date ?? now),
          if (destination != null) 'destination': destination
        });
    final state = FinanceSnapshot([
      personal,
      business,
      cash,
      bank,
      const Record('wallet', 'account',
          {'space': 'personal', 'name': 'Wallet', 'opening': 0}),
      entry('salary', 'personal', 'cash', 'income', 50000),
      entry('lunch', 'personal', 'cash', 'expense', 12345),
      entry('owner', 'personal', 'cash', 'transfer', 25000,
          destination: 'bank'),
      entry('stock', 'business', 'bank', 'expense', 20000),
      entry('repayment', 'personal', 'cash', 'debt_payment', 5000),
      entry('collection', 'business', 'bank', 'debt_collection', 1000),
      entry('internal', 'personal', 'cash', 'transfer', 10000,
          destination: 'wallet'),
      entry('future', 'business', 'bank', 'expense', 90000,
          date: now.add(const Duration(days: 40)))
    ], 0, 0);
    expect(state.spaceBalance('personal'), 107655);
    expect(state.spaceBalance('business'), 206000);
    expect(state.spaceBalance('all'), 313655);
    expect(state.cashFlow('personal', now), 7655);
    expect(state.cashFlow('business', now), 6000);
    expect(state.cashFlow('all', now), 13655);
    expect(state.total('all', now, 'income'), 50000);
    expect(state.total('all', now, 'expense'), 32345);
    expect(state.spaceBalance('all') - 300000, state.cashFlow('all', now));
  });
}
