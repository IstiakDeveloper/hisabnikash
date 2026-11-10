import 'dart:convert';
import 'dart:ffi';
import 'dart:io';
import 'package:cryptography/cryptography.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqlite3/open.dart';
import 'package:hisabnikash_mobile/core/database.dart';
import 'package:hisabnikash_mobile/core/money.dart';
import 'package:hisabnikash_mobile/core/repository.dart';
import 'package:hisabnikash_mobile/core/vault.dart';

void main() {
  if (Platform.isWindows) {
    open.overrideFor(
        OperatingSystem.windows, () => DynamicLibrary.open('winsqlite3.dll'));
  }
  test(
      'desktop debug diagnostic: encrypted snapshot and 20-account aggregation',
      () async {
    final repo = FinanceRepository(FinanceDatabase.memory(),
        VaultCipher(await AesGcm.with256bits().newSecretKey()));
    addTearDown(repo.dispose);
    await repo.db.transaction(() async {
      for (var i = 0; i < 20; i++) {
        await repo.db.customStatement(
            'INSERT INTO records(id,kind,payload) VALUES (?,?,?)', [
          'account-$i',
          'account',
          await repo.cipher
              .seal({'space': 'perf', 'name': 'Account $i', 'opening': 0})
        ]);
      }
      for (var i = 0; i < 2000; i++) {
        await repo.db.customStatement(
            'INSERT INTO records(id,kind,payload) VALUES (?,?,?)', [
          'tx-$i',
          'transaction',
          await repo.cipher.seal({
            'space': 'perf',
            'account': 'account-${i % 20}',
            'type': 'expense',
            'amount': 100,
            'category': 'Other',
            'date': dayKey(DateTime.now())
          })
        ]);
      }
    });
    final read = Stopwatch()..start();
    final state = await repo.snapshot();
    read.stop();
    final aggregate = Stopwatch()..start();
    final balance = state.spaceBalance('all');
    aggregate.stop();
    expect(balance, -200000);
    debugPrint('[AUDIT PERFORMANCE] ${jsonEncode({
          'environment': 'Windows desktop debug, in-memory SQLite; no receipts',
          'accounts': 20,
          'transactions': 2000,
          'snapshot_ms': read.elapsedMilliseconds,
          'balance_aggregation_ms': aggregate.elapsedMilliseconds
        })}');
  });
}
