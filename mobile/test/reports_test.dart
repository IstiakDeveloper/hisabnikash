import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:hisabnikash_mobile/core/models.dart';
import 'package:hisabnikash_mobile/core/reports.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test('monthly PDF is generated entirely offline with bundled fonts',
      () async {
    const state = FinanceSnapshot([
      Record('personal', 'space', {'name': 'Personal'}),
      Record('cash', 'account',
          {'space': 'personal', 'name': 'Cash', 'opening': 100000}),
      Record('tx', 'transaction', {
        'space': 'personal',
        'type': 'expense',
        'account': 'cash',
        'category': 'Food & groceries',
        'amount': 15050,
        'date': '2026-11-10',
        'note': 'সকালের বাজার'
      }),
    ], 0, 0);
    final bytes = await monthlyReport(state, 'personal', DateTime(2026, 11));
    expect(ascii.decode(bytes.take(4).toList()), '%PDF');
    expect(bytes.length, greaterThan(1000));
    await Directory('artifacts').create(recursive: true);
    await File('artifacts/monthly-report.pdf').writeAsBytes(bytes);
  });
}
