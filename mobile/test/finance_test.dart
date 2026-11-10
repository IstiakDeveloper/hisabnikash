import 'dart:convert';
import 'dart:ffi';
import 'dart:io';
import 'package:cryptography/cryptography.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqlite3/open.dart';
import 'package:hisabnikash_mobile/core/database.dart';
import 'package:hisabnikash_mobile/core/models.dart';
import 'package:hisabnikash_mobile/core/money.dart';
import 'package:hisabnikash_mobile/core/repository.dart';
import 'package:hisabnikash_mobile/core/vault.dart';

void main() {
  if (Platform.isWindows) {
    open.overrideFor(
        OperatingSystem.windows, () => DynamicLibrary.open('winsqlite3.dll'));
  }
  test('money parsing preserves paisa and accepts Bengali digits', () {
    expect(parseMoney('১২,৩৪৫.৬৭'), 1234567);
    expect(parseMoney('0.01'), 1);
    expect(() => parseMoney('12.345'), throwsFormatException);
    expect(() => parseMoney('-1'), throwsFormatException);
    expect(() => parseMoney('NaN'), throwsFormatException);
    expect(() => parseMoney('0'), throwsFormatException);
    expect(money(1234567), '৳12,345.67');
  });
  test('every supported journal is balanced', () {
    for (final type in [
      'income',
      'expense',
      'transfer',
      'debt_payment',
      'debt_collection'
    ]) {
      final lines = journalLines(
          {'type': type, 'amount': 101, 'account': 'a', 'destination': 'b'});
      expect(lines.fold<int>(0, (sum, line) => sum + line.amount), 0);
    }
    expect(
        () => journalLines({
              'type': 'transfer',
              'amount': 100,
              'account': 'a',
              'destination': 'a'
            }),
        throwsArgumentError);
  });

  group('encrypted offline repository', () {
    late FinanceRepository repository;
    late String space, cash, bank;
    setUp(() async {
      repository = FinanceRepository(FinanceDatabase.memory(),
          VaultCipher(await AesGcm.with256bits().newSecretKey()));
      space = await repository.save('space', {'name': 'Personal'});
      cash = await repository
          .save('account', {'name': 'Cash', 'space': space, 'opening': 100000});
      bank = await repository
          .save('account', {'name': 'Bank', 'space': space, 'opening': 0});
    });
    tearDown(() async => repository.dispose());
    Json expense(int amount) => {
          'space': space,
          'type': 'expense',
          'amount': amount,
          'account': cash,
          'category': 'Food & groceries',
          'date': '2026-11-10',
          'note': 'Private lunch'
        };
    test('transaction and outbox commit together and payload is encrypted',
        () async {
      final id = await repository.save('transaction', expense(12345));
      final state = await repository.snapshot();
      expect(state.balance(state.find(cash)!), 87655);
      expect(state.pending, 4);
      final stored =
          await repository.db.customSelect('SELECT payload FROM records').get();
      expect(
          stored
              .any((r) => r.read<String>('payload').contains('Private lunch')),
          false);
      await repository.save('transaction', expense(20000),
          id: id,
          expectedVersion:
              (await repository.snapshot()).find(id)!.localVersion);
      expect((await repository.snapshot()).pending, 4,
          reason: 'Unsent edits coalesce');
      expect((await repository.history(id)).single['data']['amount'], 12345);
    });
    test('invalid write rolls back without creating queue entries', () async {
      await expectLater(
          repository.save('transaction', expense(-1)), throwsFormatException);
      expect((await repository.snapshot()).pending, 3);
      expect((await repository.snapshot()).of('transaction'), isEmpty);
    });
    test('transfer changes accounts without inflating income or expense',
        () async {
      await repository.save('transaction', {
        'space': space,
        'type': 'transfer',
        'amount': 25000,
        'account': cash,
        'destination': bank,
        'date': '2026-11-10'
      });
      final state = await repository.snapshot();
      expect(state.balance(state.find(cash)!), 75000);
      expect(state.balance(state.find(bank)!), 25000);
      expect(state.total('all', DateTime(2026, 11), 'income'), 0);
      expect(state.total('all', DateTime(2026, 11), 'expense'), 0);
      await expectLater(
          repository.remove(state.find(cash)!), throwsFormatException);
    });
    test(
        'bill payment is atomic, not duplicated, and preserves month-end anchor',
        () async {
      final bill = await repository.save('bill', {
        'space': space,
        'name': 'Rent',
        'amount': 10000,
        'due': '2026-01-31',
        'frequency': 'monthly',
        'paid': false
      });
      final original = (await repository.snapshot()).find(bill)!;
      await repository.payBill(original, cash);
      await expectLater(
          repository.payBill(original, cash), throwsFormatException);
      var state = await repository.snapshot();
      expect(state.of('transaction').length, 1);
      final feb = state.of('bill').firstWhere((r) => !state.billPaid(r));
      expect(feb.text('due'), '2026-02-28');
      await repository.payBill(feb, cash);
      state = await repository.snapshot();
      expect(state.of('bill').firstWhere((r) => !state.billPaid(r)).text('due'),
          '2026-03-31');
    });
    test('loan repayment affects balance but not spending, rejects overpayment',
        () async {
      final id = await repository.save('loan', {
        'space': space,
        'name': 'Family',
        'principal': 10000,
        'repaid': 0,
        'direction': 'borrowed'
      });
      final loan = (await repository.snapshot()).find(id)!;
      await repository.repayLoan(loan, cash, 6000);
      await expectLater(
          repository.repayLoan(loan, cash, 5000), throwsFormatException);
      final state = await repository.snapshot();
      expect(state.balance(state.find(cash)!), 94000);
      expect(state.repaid(state.find(id)!), 6000);
      expect(state.total('all', DateTime.now(), 'expense'), 0);
    });
    test('backup validation rejects broken references before replacing data',
        () async {
      final data = await repository.exportData();
      final invalid = jsonDecode(jsonEncode(data)) as Json;
      (invalid['records'] as List).removeWhere((r) => r['id'] == space);
      await expectLater(repository.restore(invalid), throwsFormatException);
      expect((await repository.snapshot()).of('account').length, 2);
      await repository.save('transaction', expense(100));
      await repository.restore(data);
      expect((await repository.snapshot()).of('transaction'), isEmpty);
      expect((await repository.snapshot()).of('account').length, 2);
    });
    test('encrypted backup roundtrip and wrong password protection', () async {
      final data = await repository.exportData();
      final encoded = await BackupCodec.encode(data, 'correct-password-123');
      expect(encoded.contains('Cash'), false);
      final decoded = await BackupCodec.decode(encoded, 'correct-password-123');
      expect(decoded['records'], data['records']);
      await expectLater(
          BackupCodec.decode(encoded, 'wrong-password'), throwsFormatException);
    });
    test(
        'unpaid recurring periods materialize idempotently and keep the anchor',
        () async {
      await repository.save('bill', {
        'space': space,
        'name': 'Rent',
        'amount': 1000,
        'due': '2026-01-31',
        'frequency': 'monthly',
        'paid': false
      });
      await repository.ensureBillOccurrences(now: DateTime(2026, 2, 1));
      final first = await repository.snapshot();
      expect(first.of('bill').map((r) => r.text('due')).toSet(),
          {'2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'});
      await repository.ensureBillOccurrences(now: DateTime(2026, 2, 1));
      expect((await repository.snapshot()).of('bill').length, 4);
      final jan =
          first.of('bill').firstWhere((r) => r.text('due') == '2026-01-31');
      await repository.payBill(jan, cash);
      expect((await repository.snapshot()).of('bill').length, 4);
    });
    test('budget templates copy once with optional unspent rollover', () async {
      await repository.save('budget', {
        'space': space,
        'category': 'Food & groceries',
        'month': '2026-11',
        'amount': 10000
      });
      await repository.save('transaction', expense(3000));
      expect(
          await repository.copyBudgets(DateTime(2026, 12), space,
              carryUnspent: true),
          1);
      expect(await repository.copyBudgets(DateTime(2026, 12), space), 0);
      final budget = (await repository.snapshot())
          .of('budget')
          .firstWhere((r) => r.text('month') == '2026-12');
      expect(budget.number('amount'), 17000);
    });
    test('custom categories are scoped and duplicate names rejected', () async {
      await repository.save('category',
          {'space': space, 'name': 'Pet supplies', 'type': 'expense'});
      await expectLater(
          repository.save('category',
              {'space': space, 'name': 'pet supplies', 'type': 'expense'}),
          throwsFormatException);
    });
    test(
        'editing a paid loan cannot reduce principal below repayments or reverse direction',
        () async {
      final data = <String, dynamic>{
        'space': space,
        'name': 'Family',
        'principal': 10000,
        'repaid': 0,
        'direction': 'borrowed'
      };
      final id = await repository.save('loan', data);
      await repository.repayLoan(
          (await repository.snapshot()).find(id)!, cash, 6000);
      await expectLater(
          repository.save('loan', {...data, 'principal': 5000},
              id: id,
              expectedVersion:
                  (await repository.snapshot()).find(id)!.localVersion),
          throwsFormatException);
      await expectLater(
          repository.save('loan', {...data, 'direction': 'lent'},
              id: id,
              expectedVersion:
                  (await repository.snapshot()).find(id)!.localVersion),
          throwsFormatException);
      expect(
          (await repository.snapshot()).find(id)!.number('principal'), 10000);
    });
  });
}
