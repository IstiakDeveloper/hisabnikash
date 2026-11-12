import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:hisabnikash_mobile/core/models.dart';
import 'package:hisabnikash_mobile/core/reports.dart';
import 'package:hisabnikash_mobile/core/report_layout.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:image/image.dart' as im;

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
  test(
      'Bengali conjuncts use shaped glyphs and Bengali reports are generated offline',
      () async {
    final shaped = await ReportLayout()
        .text('ক্ষুদ্রঋণের কিস্তি, ব্যয় ও সঞ্চয়ের হিসাব', size: 20, width: 480);
    expect(shaped, isA<pw.Image>());
    final bytes = ((shaped as pw.Image).image as pw.MemoryImage).bytes;
    final image = im.decodePng(bytes)!;
    expect(image.width, 1440);
    expect(image.height, greaterThan(50));
    expect(
        image.any((p) => p.a > 0 && p.r < 100 && p.g < 100 && p.b < 100), true);
    await Directory('artifacts').create(recursive: true);
    await File('artifacts/bengali-report-shaping.png').writeAsBytes(bytes);
    const state = FinanceSnapshot([
      Record('personal', 'space', {'name': 'ব্যক্তিগত'})
    ], 0, 0);
    final pdf = await monthlyReport(state, 'personal', DateTime(2026, 11),
        language: 'bn');
    expect(ascii.decode(pdf.take(4).toList()), '%PDF');
    await File('artifacts/monthly-report-bn.pdf').writeAsBytes(pdf);
  });
  test('Bengali transaction tables paginate with repeated shaped labels',
      () async {
    final state = FinanceSnapshot([
      const Record('personal', 'space', {'name': 'ব্যক্তিগত'}),
      const Record('cash', 'account',
          {'space': 'personal', 'name': 'নগদ', 'opening': 100000}),
      for (var n = 0; n < 80; n++)
        Record('expense-$n', 'transaction', {
          'space': 'personal',
          'type': 'expense',
          'account': 'cash',
          'category': 'Food & groceries',
          'amount': 100 + n,
          'date': '2026-11-10',
          'note': 'সকালের বাজার ও প্রয়োজনীয় খরচ'
        })
    ], 0, 0);
    final bytes = await monthlyReport(state, 'personal', DateTime(2026, 11),
        language: 'bn');
    expect(RegExp(r'/Type\s*/Page\b').allMatches(latin1.decode(bytes)).length,
        greaterThan(1));
    await File('artifacts/monthly-report-bn-multipage.pdf').writeAsBytes(bytes);
  });
}
