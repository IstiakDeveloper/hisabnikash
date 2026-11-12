import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'models.dart';
import 'money.dart';
import 'localization.dart';
import 'report_layout.dart';

Future<Uint8List> monthlyReport(
    FinanceSnapshot state, String space, DateTime month,
    {String language = 'en'}) async {
  await initializeDateFormatting(language);
  String t(String value) => translateText(value, language: language);
  String amount(int value) => 'BDT ${editableMoney(value)}';
  final font =
      pw.Font.ttf(await rootBundle.load('assets/fonts/NotoSans-Regular.ttf'));
  final pdf = pw.Document(
      title: t('Monthly money report'),
      theme: pw.ThemeData.withFont(base: font));
  final layout = ReportLayout();
  final title = await layout.text(t('Monthly money report'), size: 24);
  final period = await layout.text(
      '${DateFormat('MMMM yyyy', language).format(month)} · ${space == 'all' ? t('All spaces') : state.find(space)?.text('name') ?? ''}');
  final footer = await layout.text(t('Private financial information'),
      size: 8, width: 330);
  final summaries = <String, int>{
    'Net cash flow': state.cashFlow(space, month),
    'Income': state.total(space, month, 'income'),
    'Expenses': state.total(space, month, 'expense'),
    'Loan repayments': state.total(space, month, 'debt_payment'),
    'Loan collections': state.total(space, month, 'debt_collection'),
    'Balance adjustments': state.adjustmentTotal(space, month, incoming: true) -
        state.adjustmentTotal(space, month, incoming: false),
    'Transfers from other spaces':
        state.transferTotal(space, month, incoming: true),
    'Transfers to other spaces':
        state.transferTotal(space, month, incoming: false),
  };
  final summary = <pw.Widget>[];
  for (final entry in summaries.entries) {
    summary.add(await layout.text('${t(entry.key)}: ${amount(entry.value)}'));
  }
  final note = await layout.text(t(
      'Transfers and opening balances are excluded from income and expenses.'));
  final rows = state
      .transactions(space, month)
      .where((r) => state.isPosted(r))
      .map((r) => [
            r.text('date'),
            r.text('type') == 'reversal'
                ? '${t('Reverse')} (${t(r.text('originalType'))})'
                : t(r.text('type')),
            '${t(state.categoryName(r))}\n${r.text('note')}\n${(r.data['splits'] as List? ?? []).map((s) => '${t(s['category'])}: ${editableMoney(s['amount'])}').join('\n')}',
            editableMoney(state.signedAmount(r)),
            editableMoney(
                (r.text('type') == 'reversal' ? -1 : 1) * r.number('fee')),
          ])
      .toList();
  final table = await layout.table(
      ['Date', 'Type', 'Category / note', 'Amount BDT', 'Fee BDT']
          .map(t)
          .toList(),
      rows,
      [66, 84, 210, 84, 66]);
  pdf.addPage(pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(38),
      header: (_) =>
          pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
            pw.Text('HISABNIKASH', style: const pw.TextStyle(fontSize: 12)),
            pw.SizedBox(height: 8),
            title,
            period,
            pw.Divider()
          ]),
      footer: (c) => pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          children: [footer, pw.Text('${c.pageNumber} / ${c.pagesCount}')]),
      build: (_) => [
            pw.SizedBox(height: 12),
            ...summary,
            pw.SizedBox(height: 16),
            note,
            pw.SizedBox(height: 16),
            table
          ]));
  return pdf.save();
}

Future<Uint8List> invoiceReport(FinanceSnapshot state, Record invoice,
    {String language = 'en'}) async {
  String t(String value) => translateText(value, language: language);
  final font =
      pw.Font.ttf(await rootBundle.load('assets/fonts/NotoSans-Regular.ttf'));
  final pdf = pw.Document(
      title: '${t('invoice')} ${invoice.text('name')}',
      theme: pw.ThemeData.withFont(base: font));
  final layout = ReportLayout(), party = state.find(invoice.text('party'));
  final payments = state
      .of('transaction')
      .where((r) =>
          r.text('invoice') == invoice.id &&
          state.isPosted(r) &&
          !state.isReversed(r))
      .toList();
  final paid = payments.fold<int>(0, (sum, r) => sum + r.number('amount'));
  final header = <pw.Widget>[
    pw.Text('HISABNIKASH', style: const pw.TextStyle(fontSize: 24)),
    pw.SizedBox(height: 16),
    await layout.text('${t('invoice')} ${invoice.text('name')}', size: 18),
    await layout.text(state.find(invoice.text('space'))?.text('name') ?? ''),
    await layout
        .text('${party?.text('name') ?? ''} · ${party?.text('contact') ?? ''}'),
    await layout.text('${t('Due')}: ${invoice.text('due')}'),
    pw.SizedBox(height: 16),
  ];
  final rows = (invoice.data['lines'] as List)
      .map((l) => [
            l['name'] as String,
            '${l['quantity']}',
            editableMoney(l['unitPrice']),
            editableMoney((l['unitPrice'] as int) * (l['quantity'] as int))
          ])
      .toList();
  final table = await layout.table(
      ['Item / service', 'Qty', 'Unit BDT', 'Total BDT'].map(t).toList(),
      rows,
      [240, 50, 110, 110]);
  final totals = <pw.Widget>[];
  for (final entry in {
    'Total': invoice.number('amount'),
    'Paid': paid,
    'Outstanding': invoice.number('amount') - paid
  }.entries) {
    totals.add(await layout
        .text('${t(entry.key)}: BDT ${editableMoney(entry.value)}'));
  }
  final notes = await layout.text(invoice.text('note'));
  final history = <pw.Widget>[await layout.text(t('Payment history'))];
  for (final payment in payments) {
    history.add(await layout.text(
        '${payment.text('date')} · BDT ${editableMoney(payment.number('amount'))}'));
  }
  pdf.addPage(pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(38),
      build: (_) => [
            ...header,
            table,
            pw.SizedBox(height: 16),
            ...totals,
            notes,
            pw.SizedBox(height: 16),
            ...history
          ]));
  return pdf.save();
}
