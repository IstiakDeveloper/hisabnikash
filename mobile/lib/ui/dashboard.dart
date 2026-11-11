import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../app/providers.dart';
import '../core/models.dart';
import '../core/money.dart';
import 'brand.dart';
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
    final space = ref.watch(spaceProvider),
        hidden = ref.watch(privacyProvider),
        month = ref.watch(monthProvider);
    final accounts = state
        .of('account')
        .where((r) => space == 'all' || r.text('space') == space)
        .toList();
    final balance = accounts.fold(0, (int sum, r) => sum + state.balance(r));
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
    String display(int amount) => hidden ? '••••••' : money(amount);
    return ContentEntrance(
        child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
            children: [
          Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                  color: forest, borderRadius: BorderRadius.circular(24)),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Expanded(
                          child: Text(
                              tr(ref, 'Your balance', 'আপনার ব্যালেন্স'),
                              style: const TextStyle(
                                  color: Color(0xFFCCE0D4), fontSize: 14))),
                      const Icon(Icons.account_balance_wallet_outlined,
                          size: 22, color: Color(0xFFCCE0D4))
                    ]),
                    const SizedBox(height: 12),
                    FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Text(display(balance),
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 40,
                                height: 1.15,
                                fontWeight: FontWeight.w600,
                                letterSpacing: -1.4,
                                fontFeatures: [FontFeature.tabularFigures()]))),
                    const SizedBox(height: 12),
                    Text(
                        tr(ref, '${accounts.length} accounts · Available today',
                            '${accounts.length}টি অ্যাকাউন্ট · আজকের ব্যালেন্স'),
                        style: const TextStyle(
                            color: Color(0xFFCCE0D4), fontSize: 12)),
                    const SizedBox(height: 20),
                    Row(children: [
                      const Icon(Icons.lock_outline_rounded,
                          size: 14, color: Color(0xFFDFC285)),
                      const SizedBox(width: 6),
                      Expanded(
                          child: Text(
                              tr(ref, 'Saved on this device',
                                  'এই ডিভাইসে সংরক্ষিত'),
                              style: const TextStyle(
                                  color: Color(0xFFDFE9E0), fontSize: 12)))
                    ]),
                  ])),
          const SizedBox(height: 18),
          Row(children: [
            Expanded(
                child: FilledButton.icon(
                    onPressed: () => openEditor(context, 'transaction'),
                    icon: const Icon(Icons.add, size: 20),
                    label:
                        Text(tr(ref, 'Add transaction', 'লেনদেন যোগ করুন')))),
            const SizedBox(width: 8),
            IconButton.filledTonal(
                tooltip: tr(ref, 'Add income', 'আয় যোগ করুন'),
                onPressed: () =>
                    openEditor(context, 'transaction', initialType: 'income'),
                icon: const Icon(Icons.south_west)),
            const SizedBox(width: 4),
            IconButton.filledTonal(
                tooltip: tr(ref, 'Transfer money', 'টাকা স্থানান্তর'),
                onPressed: () =>
                    openEditor(context, 'transaction', initialType: 'transfer'),
                icon: const Icon(Icons.swap_horiz)),
          ]),
          const SizedBox(height: 24),
          Text(
              '${DateFormat('MMMM yyyy', ref.watch(languageProvider)).format(month)} · ${tr(ref, 'Cash movement', 'টাকার চলাচল')}',
              style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 10),
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(
                child: _movement(
                    context,
                    tr(ref, 'Cash in', 'টাকা এসেছে'),
                    display(state.cashIn(space, month)),
                    Icons.south_west,
                    forest)),
            const SizedBox(width: 12),
            Expanded(
                child: _movement(
                    context,
                    tr(ref, 'Cash out', 'টাকা গেছে'),
                    display(state.cashOut(space, month)),
                    Icons.north_east,
                    rust)),
          ]),
          if (state.conflicts > 0)
            Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text('${state.conflicts} sync conflicts need review',
                    style: const TextStyle(color: rust))),
          SectionTitle(tr(ref, 'Your accounts', 'আপনার অ্যাকাউন্ট'),
              action: tr(ref, 'Add', 'যোগ করুন'),
              onTap: () => openEditor(context, 'account')),
          if (accounts.isEmpty)
            const EmptyState('Give your money a home',
                'Add cash, a bank account, or a mobile wallet.'),
          if (accounts.isNotEmpty)
            Surface(
                padding: 4,
                child: Column(children: [
                  for (var i = 0; i < accounts.length; i++) ...[
                    if (i > 0) const Divider(height: 1, indent: 64),
                    ListTile(
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        leading: Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                                color: mint,
                                borderRadius: BorderRadius.circular(13)),
                            child: Icon(
                                accounts[i].text('type') == 'bank'
                                    ? Icons.account_balance_outlined
                                    : accounts[i].text('type') == 'wallet'
                                        ? Icons.phone_android_rounded
                                        : Icons.account_balance_wallet_outlined,
                                color: forest,
                                size: 20)),
                        title: Text(accounts[i].text('name'),
                            style: const TextStyle(
                                fontSize: 14, fontWeight: FontWeight.w600)),
                        subtitle:
                            Text(state.find(accounts[i].text('space'))?.text('name') ?? '',
                                style: Theme.of(context).textTheme.bodySmall),
                        trailing: ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 136),
                            child: FittedBox(
                                fit: BoxFit.scaleDown,
                                child: Text(display(state.balance(accounts[i])),
                                    style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                        fontFeatures: [
                                          FontFeature.tabularFigures()
                                        ])))),
                        onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => AccountStatement(accounts[i].id)))),
                  ],
                ])),
          if (bills.isNotEmpty) ...[
            SectionTitle(tr(ref, 'Coming up', 'সামনে যা দিতে হবে')),
            Surface(
                padding: 14,
                child: Column(
                    children: bills.take(3).map((bill) {
                  final overdue =
                      bill.text('due').compareTo(dayKey(DateTime.now())) < 0;
                  return ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Icon(Icons.calendar_today_outlined,
                          color: overdue ? rust : forest, size: 22),
                      title: Text(bill.text('name'),
                          style: const TextStyle(
                              fontSize: 14, fontWeight: FontWeight.w500)),
                      subtitle: Text(
                          '${overdue ? 'Overdue · ' : ''}${bill.text('due')}'),
                      trailing: Text(display(bill.number('amount')),
                          style: const TextStyle(fontWeight: FontWeight.w600)));
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
                icon: Icons.receipt_long_outlined)
          else
            Surface(
                padding: 12,
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
              tr(ref, 'A little clarity, every day.',
                  'প্রতিদিনের হিসাবে স্বচ্ছতা।'),
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall),
        ]));
  }

  Widget _movement(BuildContext context, String label, String amount,
      IconData icon, Color color) {
    final visibleColor = Theme.of(context).brightness == Brightness.dark
        ? (color == forest ? const Color(0xFFA8D8C4) : const Color(0xFFEDA88D))
        : color;
    return Surface(
        padding: 16,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Icon(icon, size: 16, color: visibleColor),
            const SizedBox(width: 6),
            Expanded(
                child:
                    Text(label, style: Theme.of(context).textTheme.bodySmall))
          ]),
          const SizedBox(height: 10),
          FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(amount,
                  style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                      color: visibleColor,
                      fontFeatures: const [FontFeature.tabularFigures()]))),
        ]));
  }
}
