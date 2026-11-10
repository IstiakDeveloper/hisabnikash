import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'models.dart';
import 'money.dart';

Future<Uint8List> monthlyReport(
    FinanceSnapshot state, String space, DateTime month) async {
  final latin =
      pw.Font.ttf(await rootBundle.load('assets/fonts/NotoSans-Regular.ttf'));
  final bengali = pw.Font.ttf(
      await rootBundle.load('assets/fonts/NotoSansBengali-Regular.ttf'));
  final pdf = pw.Document(
      theme: pw.ThemeData.withFont(
          base: latin, bold: latin, fontFallback: [bengali]));
  String amount(int value) => 'BDT ${editableMoney(value)}';
  final transactions =
      state.transactions(space, month).where((r) => state.isPosted(r)).toList();
  pdf.addPage(pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      header: (_) =>
          pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
            pw.Text('HISABNIKASH',
                style: pw.TextStyle(
                    color: PdfColor.fromHex('#125B49'), fontSize: 12)),
            pw.SizedBox(height: 10),
            pw.Text('Monthly money report',
                style: const pw.TextStyle(fontSize: 25)),
            pw.Text(
                '${DateFormat('MMMM yyyy').format(month)} · ${space == 'all' ? 'All spaces' : state.find(space)?.text('name') ?? ''}'),
            pw.Divider(),
          ]),
      footer: (context) => pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text('Private financial information',
                    style: const pw.TextStyle(fontSize: 9)),
                pw.Text('${context.pageNumber} / ${context.pagesCount}',
                    style: const pw.TextStyle(fontSize: 9)),
              ]),
      build: (_) => [
            pw.SizedBox(height: 16),
            pw.Text('Net cash flow: ${amount(state.cashFlow(space, month))}'),
            pw.Text('Income: ${amount(state.total(space, month, 'income'))}'),
            pw.Text(
                'Expenses: ${amount(state.total(space, month, 'expense'))}'),
            pw.Text(
                'Loan repayments: ${amount(state.total(space, month, 'debt_payment'))}'),
            pw.Text(
                'Loan collections: ${amount(state.total(space, month, 'debt_collection'))}'),
            pw.Text(
                'Transfers from other spaces: ${amount(state.transferTotal(space, month, incoming: true))}'),
            pw.Text(
                'Transfers to other spaces: ${amount(state.transferTotal(space, month, incoming: false))}'),
            pw.SizedBox(height: 20),
            pw.Text(
                'Transfers and opening balances are excluded from income and expenses.'),
            pw.SizedBox(height: 20),
            pw.TableHelper.fromTextArray(
                headers: ['Date', 'Type', 'Category / note', 'Amount BDT'],
                headerDecoration:
                    pw.BoxDecoration(color: PdfColor.fromHex('#DCEEE4')),
                cellStyle: const pw.TextStyle(fontSize: 9),
                headerStyle: const pw.TextStyle(fontSize: 9),
                data: transactions
                    .map((r) => [
                          r.text('date'),
                          r.text('type') == 'reversal'
                              ? 'Reversal (${r.text('originalType')})'
                              : r.text('type'),
                          '${state.categoryName(r)}\n${r.text('note')}',
                          editableMoney(state.signedAmount(r))
                        ])
                    .toList()),
          ]));
  return pdf.save();
}
