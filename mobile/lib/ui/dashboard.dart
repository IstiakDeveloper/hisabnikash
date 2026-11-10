import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../app/providers.dart';
import '../core/models.dart';
import '../core/money.dart';
import 'design.dart';
import 'editors.dart';
import 'activity.dart';
import 'statement.dart';

class Dashboard extends ConsumerWidget {
  const Dashboard(this.state, {super.key, required this.onActivity});
  final FinanceSnapshot state;
  final VoidCallback onActivity;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final space = ref.watch(spaceProvider), hidden = ref.watch(privacyProvider);
    final month = ref.watch(monthProvider);
    final accounts = state
        .of('account')
        .where((r) => space == 'all' || r.text('space') == space)
        .toList();
    final balance = accounts.fold(0, (sum, r) => sum + state.balance(r));
    final income = state.cashIn(space, month);
    final expense = state.cashOut(space, month);
    final transactions = state
        .transactions(space, month)
        .where((r) => state.isPosted(r))
        .toList();
    final bills = state
        .of('bill')
        .where((r) =>
            !state.billPaid(r) && (space == 'all' || r.text('space') == space))
        .toList()
      ..sort((a, b) => a.text('due').compareTo(b.text('due')));
    String display(int n) => hidden ? '••••••' : money(n);
    return ListView(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 110),
        children: [
          Container(
              padding: const EdgeInsets.all(26),
              decoration: BoxDecoration(
                  color: forest, borderRadius: BorderRadius.circular(28)),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Expanded(
                          child: Text(tr(ref, 'Total balance', 'মোট ব্যালেন্স'),
                              style:
                                  const TextStyle(color: Color(0xFFC4DCD0)))),
                      const Icon(Icons.account_balance_wallet_outlined,
                          color: Color(0xFFC4DCD0), size: 20)
                    ]),
                    const SizedBox(height: 12),
                    FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Text(display(balance),
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 43,
                                fontWeight: FontWeight.w600,
                                letterSpacing: -1.5))),
                    const SizedBox(height: 8),
                    Text(
                        tr(
                            ref,
                            'Across ${accounts.length} accounts · current balance',
                            '${accounts.length}টি অ্যাকাউন্টের বর্তমান ব্যালেন্স'),
                        style: const TextStyle(
                            color: Color(0xFFB2CFC0), fontSize: 12)),
                    const Padding(
                        padding: EdgeInsets.symmetric(vertical: 20),
                        child: Divider(color: Color(0xFF397360), height: 1)),
                    Text(
                        '${DateFormat('MMMM yyyy').format(month)} · Actual cash movement',
                        style: const TextStyle(
                            color: Color(0xFFC4DCD0), fontSize: 11)),
                    const SizedBox(height: 14),
                    Row(children: [
                      Expanded(
                          child: _metric(tr(ref, 'Cash in', 'টাকা এসেছে'),
                              display(income), Icons.south_west)),
                      Expanded(
                          child: _metric(tr(ref, 'Cash out', 'টাকা গেছে'),
                              display(expense), Icons.north_east))
                    ]),
                  ])),
          const SizedBox(height: 14),
          Row(children: [
            const Icon(Icons.lock_outline, size: 13, color: Colors.grey),
            const SizedBox(width: 6),
            Expanded(
                child: Text(
                    tr(ref, 'Saved on this device', 'এই ডিভাইসে সংরক্ষিত'),
                    style: Theme.of(context).textTheme.bodySmall)),
            if (state.conflicts > 0)
              Text('${state.conflicts} conflicts',
                  style: const TextStyle(color: rust))
          ]),
          SectionTitle(tr(ref, 'Your accounts', 'আপনার অ্যাকাউন্ট'),
              action: tr(ref, 'Add', 'যোগ করুন'),
              onTap: () => openEditor(context, 'account')),
          if (accounts.isEmpty)
            const EmptyState('Give your money a home',
                'Add cash, a bank account, or a mobile wallet.'),
          ...accounts.map((account) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Surface(
                  padding: 16,
                  onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) => AccountStatement(account.id))),
                  child: Row(children: [
                    Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                            color:
                                Theme.of(context).colorScheme.primaryContainer,
                            borderRadius: BorderRadius.circular(14)),
                        child: const Icon(Icons.account_balance_wallet_outlined,
                            size: 22)),
                    const SizedBox(width: 14),
                    Expanded(
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                          Text(account.text('name'),
                              style:
                                  const TextStyle(fontWeight: FontWeight.w600)),
                          Text(
                              state.find(account.text('space'))?.text('name') ??
                                  '',
                              style: Theme.of(context).textTheme.bodySmall)
                        ])),
                    const SizedBox(width: 12),
                    Flexible(
                        flex: 2,
                        child: Align(
                            alignment: Alignment.centerRight,
                            child: FittedBox(
                                fit: BoxFit.scaleDown,
                                child: Text(display(state.balance(account)),
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 17))))),
                  ])))),
          if (bills.isNotEmpty) ...[
            SectionTitle(tr(ref, 'Coming up', 'সামনে যা দিতে হবে')),
            Surface(
                child: Column(
                    children: bills.take(3).map((bill) {
              final overdue =
                  bill.text('due').compareTo(dayKey(DateTime.now())) < 0;
              return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(Icons.event_note_outlined,
                      color: overdue ? rust : null),
                  title: Text(bill.text('name')),
                  subtitle:
                      Text('${overdue ? 'Overdue · ' : ''}${bill.text('due')}'),
                  trailing: Text(display(bill.number('amount')),
                      style: const TextStyle(fontWeight: FontWeight.w700)));
            }).toList())),
          ],
          SectionTitle(tr(ref, 'Recent activity', 'সাম্প্রতিক লেনদেন'),
              action: tr(ref, 'See all', 'সব দেখুন'), onTap: onActivity),
          if (transactions.isEmpty)
            EmptyState(
                tr(ref, 'A fresh start', 'নতুন শুরু'),
                tr(
                    ref,
                    'Your transactions will appear here. Add your first one whenever you are ready.',
                    'প্রথম লেনদেন যোগ করুন, এখানে আপনার হিসাব দেখতে পাবেন।'),
                icon: Icons.receipt_long_outlined,
                action: TextButton(
                    onPressed: () => openEditor(context, 'transaction'),
                    child:
                        Text(tr(ref, 'Add a transaction', 'লেনদেন যোগ করুন'))))
          else
            Surface(
                padding: 14,
                child: Column(
                    children: transactions
                        .take(5)
                        .map((r) => TransactionTile(r, state,
                            space: space,
                            hidden: hidden,
                            onTap: () =>
                                transactionDetails(context, ref, r, state)))
                        .toList())),
          const SizedBox(height: 24),
          Text(
              '${DateFormat('MMMM').format(month)} · ${tr(ref, 'Small steps make a big difference.', 'ছোট ছোট পদক্ষেপেই বড় পরিবর্তন।')}',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall),
        ]);
  }

  Widget _metric(String label, String value, IconData icon) =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, color: const Color(0xFFC4DCD0), size: 14),
          const SizedBox(width: 5),
          Text(label,
              style: const TextStyle(color: Color(0xFFC4DCD0), fontSize: 12))
        ]),
        const SizedBox(height: 8),
        FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(value,
                style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                    fontSize: 21))),
      ]);
}
