import 'dart:ffi';
import 'dart:io';
import 'package:cryptography/cryptography.dart';
import 'package:drift/native.dart';
import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:flutter_test/flutter_test.dart';
import 'package:sqlite3/open.dart';
import 'package:sqlite3/sqlite3.dart' as sqlite;
import 'package:hisabnikash_mobile/core/database.dart';
import 'package:hisabnikash_mobile/core/money.dart';
import 'package:hisabnikash_mobile/core/repository.dart';
import 'package:hisabnikash_mobile/core/vault.dart';

void main() {
  driftRuntimeOptions.dontWarnAboutMultipleDatabases = true;
  if (Platform.isWindows) {
    open.overrideFor(
        OperatingSystem.windows, () => DynamicLibrary.open('winsqlite3.dll'));
  }
  late FinanceRepository repo;
  late String space, cash, bank;
  setUp(() async {
    repo = FinanceRepository(FinanceDatabase.memory(),
        VaultCipher(await AesGcm.with256bits().newSecretKey()));
    space = await repo.save('space', {'name': 'Personal'});
    cash = await repo
        .save('account', {'space': space, 'name': 'Cash', 'opening': 10000});
    bank = await repo
        .save('account', {'space': space, 'name': 'Bank', 'opening': 0});
  });
  tearDown(() => repo.dispose());
  test(
      'transfer reversal balances both accounts and statements preserve every leg',
      () async {
    final id = await repo.save('transaction', {
      'space': space,
      'type': 'transfer',
      'account': cash,
      'destination': bank,
      'amount': 1200,
      'date': dayKey(DateTime.now()),
      'category': ''
    });
    await repo.reverse((await repo.snapshot()).find(id)!, 'Wrong destination');
    final state = await repo.snapshot();
    expect(state.balance(state.find(cash)!), 10000);
    expect(state.balance(state.find(bank)!), 0);
    for (final account in state.of('account')) {
      final entries = state.statement(account);
      expect(entries.length, 2);
      expect(entries.last.balance, state.balance(account));
      expect(entries.fold(0, (int sum, e) => sum + e.movement), 0);
    }
    await expectLater(
        repo.reverse(state.find(id)!, 'Again'), throwsFormatException);
    await expectLater(repo.remove(state.find(id)!), throwsFormatException);
  });
  test('reversing a bill payment reopens the bill and allows one new payment',
      () async {
    final id = await repo.save('bill', {
      'space': space,
      'name': 'Internet',
      'amount': 1000,
      'due': dayKey(DateTime.now()),
      'frequency': 'once',
      'paid': false
    });
    await repo.payBill((await repo.snapshot()).find(id)!, cash);
    var state = await repo.snapshot();
    final payment = state.of('transaction').single;
    expect(state.billPaid(state.find(id)!), true);
    await repo.reverse(payment, 'Paid from the wrong account');
    state = await repo.snapshot();
    expect(state.billPaid(state.find(id)!), false);
    expect(state.balance(state.find(cash)!), 10000);
    await repo.payBill(state.find(id)!, bank);
    state = await repo.snapshot();
    expect(state.billPaid(state.find(id)!), true);
    expect(state.total(space, DateTime.now(), 'expense'), 1000);
    expect(state.balance(state.find(bank)!), -1000);
  });
  test(
      'loan reversal restores outstanding principal and permits repayment again',
      () async {
    final id = await repo.save('loan', {
      'space': space,
      'name': 'Family',
      'principal': 5000,
      'repaid': 0,
      'direction': 'borrowed'
    });
    await repo.repayLoan((await repo.snapshot()).find(id)!, cash, 2000);
    var state = await repo.snapshot();
    expect(state.repaid(state.find(id)!), 2000);
    await repo.reverse(state.of('transaction').single, 'Duplicate receipt');
    state = await repo.snapshot();
    expect(state.repaid(state.find(id)!), 0);
    await expectLater(repo.remove(state.find(id)!), throwsFormatException);
    await expectLater(
        repo.save('loan', {...state.find(id)!.data, 'direction': 'lent'},
            id: id, expectedVersion: state.find(id)!.localVersion),
        throwsFormatException);
    expect(state.balance(state.find(cash)!), 10000);
    await repo.repayLoan(state.find(id)!, cash, 5000);
    expect((await repo.snapshot()).repaid(state.find(id)!), 5000);
  });
  test(
      'single occurrence changes leave the controller and later bills unchanged',
      () async {
    final id = await repo.save('bill', {
      'space': space,
      'name': 'Rent',
      'amount': 1000,
      'due': '2026-01-31',
      'frequency': 'monthly',
      'paid': false
    });
    await repo.ensureBillOccurrences(now: DateTime(2026, 1));
    var state = await repo.snapshot();
    final feb =
        state.of('bill').firstWhere((b) => b.text('due') == '2026-02-28');
    await repo.save('bill', {...feb.data, 'amount': 900, 'frequency': 'once'},
        id: feb.id,
        expectedVersion: feb.localVersion,
        billEditScope: 'occurrence');
    await repo.ensureBillOccurrences(now: DateTime(2026, 3));
    state = await repo.snapshot();
    expect(state.find(feb.id)!.number('amount'), 900);
    expect(
        state
            .of('bill')
            .firstWhere((b) => b.text('due') == '2026-04-30')
            .number('amount'),
        1000);
    expect(
        state.find(state.find(id)!.text('scheduleId'))!.flag('active'), true);
  });
  test('v2 restore retains tombstones, correction history and account balances',
      () async {
    final id = await repo.save('transaction', {
      'space': space,
      'type': 'expense',
      'account': cash,
      'category': 'Food & groceries',
      'amount': 500,
      'date': dayKey(DateTime.now())
    });
    var record = (await repo.snapshot()).find(id)!;
    await repo.save('transaction', {...record.data, 'amount': 600},
        id: id, expectedVersion: record.localVersion);
    record = (await repo.snapshot()).find(id)!;
    await repo.remove(record);
    final backup = await repo.exportData();
    expect(backup['schema'], 2);
    expect((backup['history'] as List).length, 2);
    await repo.restore(backup);
    expect((await repo.record(id))!.deleted, true);
    expect((await repo.history(id)).length, 2);
    expect((await repo.snapshot()).balance((await repo.snapshot()).find(cash)!),
        10000);
  });
  test(
      'restore invalidates an editor even when the backup has the same record IDs',
      () async {
    final stale = (await repo.snapshot()).find(cash)!;
    await repo.restore(await repo.exportData());
    await expectLater(
        repo.save('account', {...stale.data, 'name': 'Stale rename'},
            id: stale.id, expectedVersion: stale.localVersion),
        throwsFormatException);
  });
  test(
      'v1 database migrates encrypted records, queue and settings without loss',
      () async {
    final directory = await Directory.systemTemp.createTemp('hisab-migration-');
    final file = File('${directory.path}/legacy.sqlite');
    final old = sqlite.sqlite3.open(file.path);
    old.execute(
        'CREATE TABLE records (id TEXT PRIMARY KEY, kind TEXT NOT NULL, payload TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, deleted INTEGER NOT NULL DEFAULT 0)');
    old.execute(
        'CREATE TABLE outbox (record_id TEXT PRIMARY KEY, operation_id TEXT UNIQUE NOT NULL, base_revision INTEGER NOT NULL, blocked INTEGER NOT NULL DEFAULT 0)');
    old.execute(
        'CREATE TABLE audit (id INTEGER PRIMARY KEY AUTOINCREMENT, record_id TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL)');
    old.execute(
        'CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    old.execute(
        'CREATE TABLE conflicts (record_id TEXT PRIMARY KEY, remote TEXT NOT NULL)');
    final encrypted = await repo.cipher.seal({'name': 'Legacy'});
    old.execute('INSERT INTO records VALUES (?,?,?,?,?)',
        ['legacy', 'space', encrypted, 4, 0]);
    old.execute("INSERT INTO settings VALUES ('selectedSpace','legacy')");
    old.execute("INSERT INTO outbox VALUES ('legacy','operation',4,0)");
    old.execute('PRAGMA user_version=1');
    old.dispose();
    final migrated =
        FinanceRepository(FinanceDatabase(NativeDatabase(file)), repo.cipher);
    try {
      final state = await migrated.snapshot();
      expect(state.find('legacy')!.revision, 4);
      expect(state.find('legacy')!.localVersion, 1);
      expect(state.pending, 1);
      expect(await migrated.getSetting('selectedSpace'), 'legacy');
      await migrated.save('space', {'name': 'Updated'},
          id: 'legacy', expectedVersion: 1);
      expect((await migrated.snapshot()).find('legacy')!.localVersion, 2);
    } finally {
      await migrated.dispose();
      await directory.delete(recursive: true);
    }
  });
}
