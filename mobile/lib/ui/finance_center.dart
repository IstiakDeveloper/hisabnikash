import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import '../app/providers.dart';
import '../core/models.dart';
import '../core/money.dart';
import '../core/planning.dart';
import '../core/repository.dart';
import '../core/reminders.dart';
import '../core/reports.dart';
import 'design.dart';
import 'editors.dart';
import 'statement.dart';
import 'localization.dart';

Future<void> handleFinanceNotification(
    BuildContext context, WidgetRef ref, Json data) async {
  final action = data['action'] as String? ?? '', kind = data['kind'];
  final date = data['date'] as String? ?? '';
  if (kind == 'daily' && (action == 'complete' || action == 'snooze')) {
    final key = date.isEmpty ? dayKey(financeNow()) : date;
    if (key != dayKey(financeNow())) {
      feedbackMessage(
          context,
          tr(ref, 'This reminder belongs to an earlier day. Review today.',
              'এটি আগের দিনের রিমাইন্ডার। আজকের হিসাব দেখুন।'));
      return;
    }
    if (action == 'snooze') {
      await ref
          .read(remindersProvider)
          .snooze(key, bangla: ref.read(languageProvider) == 'bn');
      return;
    }
    if (!await confirm(
        context,
        tr(ref, 'Complete today’s accounts?', 'আজকের হিসাব সম্পূর্ণ?'),
        tr(
            ref,
            'Confirm that all of today’s income and expenses have been recorded.',
            'আজকের সব আয়-খরচ লেখা হয়েছে কি না নিশ্চিত করুন।'),
        action: tr(ref, 'Complete', 'হিসাব শেষ'))) return;
    try {
      await (await ref.read(repositoryProvider.future))
          .completeDay(financeNow());
    } catch (e) {
      if (context.mounted) feedbackMessage(context, e);
    }
    return;
  }
  if (kind == 'daily') {
    ref.read(navigationProvider.notifier).state = 1;
    return;
  }
  await openFinanceCenter(context,
      tab: kind == 'test'
          ? 4
          : kind == 'summary'
              ? 1
              : kind == 'invoice'
                  ? 3
                  : kind == 'installment'
                      ? 2
                      : 0);
}

class DailyReviewCard extends ConsumerWidget {
  const DailyReviewCard(this.state, {super.key});
  final FinanceSnapshot state;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final date = financeNow(), done = state.dailyComplete(financeNow());
    Future<void> finish(bool none) async {
      try {
        await (await ref.read(repositoryProvider.future))
            .completeDay(date, noTransactions: none);
      } catch (e) {
        if (context.mounted) feedbackMessage(context, e);
      }
    }

    return Surface(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Icon(done ? Icons.check_circle_outline : Icons.today_outlined),
        const SizedBox(width: 8),
        Expanded(
            child: LText(
                tr(
                    ref,
                    done
                        ? 'Today’s accounts complete'
                        : 'Today’s account review',
                    done ? 'আজকের হিসাব সম্পূর্ণ' : 'আজকের হিসাব পর্যালোচনা'),
                style: Theme.of(context).textTheme.titleMedium))
      ]),
      const SizedBox(height: 8),
      LText(
          '${state.dailyEntries(date)} ${tr(ref, 'entries today', 'টি লেনদেন আজ')}'),
      if (!done)
        Wrap(spacing: 8, children: [
          TextButton(
              onPressed: () => finish(false),
              child: LText(tr(ref, 'Day complete', 'আজ হিসাব শেষ'))),
          if (state.dailyEntries(date) == 0)
            TextButton(
                onPressed: () => finish(true),
                child:
                    LText(tr(ref, 'No transactions today', 'আজ লেনদেন হয়নি')))
        ]),
      TextButton.icon(
          onPressed: () => openFinanceCenter(context, tab: 4),
          icon: const Icon(Icons.notifications_outlined, size: 18),
          label: LText(tr(ref, 'Set daily reminder · 8 PM',
              'দৈনিক রিমাইন্ডার দিন · রাত ৮টা'))),
    ]));
  }
}

class MoneyHealthCard extends ConsumerWidget {
  const MoneyHealthCard(this.state, {super.key});
  final FinanceSnapshot state;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final health = state.moneyHealth(ref.watch(spaceProvider));
    final hidden = ref.watch(privacyProvider);
    String a(int n) => hidden ? '••••' : money(n);
    return Surface(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      LText(tr(ref, 'This month’s funding', 'চলতি মাসের পরিকল্পনার টাকা'),
          style: Theme.of(context).textTheme.titleMedium),
      const SizedBox(height: 8),
      LText(
          '${tr(ref, 'Remaining plan', 'বাকি পরিকল্পনা')}: ${a(health.required)}'),
      LText(
          '${tr(ref, 'Reserved savings', 'সঞ্চয়ের জন্য রাখা')}: ${a(health.reserved)}'),
      LText(
          '${health.shortage > 0 ? tr(ref, 'Shortage', 'ঘাটতি') : tr(ref, 'After plan', 'পরিকল্পনার পরে বাকি')}: ${a(health.shortage > 0 ? health.shortage : health.remaining)}',
          style: TextStyle(
              color: health.shortage > 0
                  ? Theme.of(context).colorScheme.error
                  : null,
              fontWeight: FontWeight.w600)),
      if (health.dailyLimit != null)
        LText(
            '${tr(ref, 'Daily discretionary limit', 'দৈনিক ঐচ্ছিক খরচের সীমা')}: ${a(health.dailyLimit!)}'),
      if (!health.hasBudgets)
        LText(tr(ref, 'Add budgets to complete your plan.',
            'পরিকল্পনা সম্পূর্ণ করতে বাজেট যোগ করুন।')),
      TextButton(
          onPressed: () => openFinanceCenter(context, tab: 1),
          child: LText(tr(ref, 'View cash flow and breakdown',
              'নগদ প্রবাহ ও বিস্তারিত দেখুন')))
    ]));
  }
}

Future<void> openFinanceCenter(BuildContext context, {int tab = 0}) =>
    Navigator.push(context,
        MaterialPageRoute(builder: (_) => FinanceCenter(initialTab: tab)));

class FinanceCenter extends ConsumerStatefulWidget {
  const FinanceCenter({super.key, this.initialTab = 0});
  final int initialTab;
  @override
  ConsumerState<FinanceCenter> createState() => _FinanceCenterState();
}

class _FinanceCenterState extends ConsumerState<FinanceCenter> {
  late int _tab;
  bool _busy = false, _expected = false;
  int _days = 7;
  Json _prefs = {}, _inbox = {};
  String? _backup;
  bool? _permission;
  String t(String en, String bn) =>
      ref.read(languageProvider) == 'bn' ? bn : en;
  String amount(int value) => ref.read(privacyProvider) ? '••••' : money(value);
  @override
  void initState() {
    super.initState();
    _tab = widget.initialTab;
    _load();
  }

  Future<void> _load() async {
    final repo = await ref.read(repositoryProvider.future);
    await ref.read(remindersProvider).reconcile(repo);
    final prefs = await repo.privateData('notifications'),
        inbox = await repo.privateData('inbox');
    prefs.putIfAbsent('bills', () => false);
    if (await repo.getSetting('reminders') == 'true') prefs['bills'] = true;
    final backup = await repo.getSetting('lastBackupExport');
    bool? permission;
    try {
      permission = await ref.read(remindersProvider).permissionGranted();
    } catch (_) {/* Desktop preview. */}
    if (mounted) {
      setState(() {
        _prefs = prefs;
        _inbox = inbox;
        _backup = backup;
        _permission = permission;
      });
    }
  }

  Future<void> run(Future<void> Function() action) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await action();
      await _load();
    } catch (e) {
      if (mounted) feedbackMessage(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String scope(FinanceSnapshot s) {
    final selected = ref.read(spaceProvider);
    return selected == 'all' ? s.of('space').first.id : selected;
  }

  ListTile tool(
          String title, String subtitle, IconData icon, VoidCallback action) =>
      ListTile(
          leading: Icon(icon),
          title: LText(title),
          subtitle: LText(subtitle),
          trailing: const Icon(Icons.chevron_right),
          onTap: _busy ? null : action);
  @override
  Widget build(BuildContext context) {
    ref.watch(languageProvider);
    ref.watch(privacyProvider);
    final labels = [
      t('Notifications', 'নোটিফিকেশন'),
      t('Cash flow', 'নগদ প্রবাহ'),
      t('Tools', 'হিসাবের সুবিধা'),
      t('Business', 'ব্যবসা'),
      t('Reminders', 'রিমাইন্ডার')
    ];
    return Scaffold(
        appBar: AppBar(title: LText(t('Finance center', 'হিসাব কেন্দ্র'))),
        body: Column(children: [
          SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                  children: List.generate(
                      labels.length,
                      (i) => Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                              label: LText(labels[i]),
                              selected: _tab == i,
                              onSelected: (_) => setState(() => _tab = i)))))),
          if (_busy) const LinearProgressIndicator(),
          Expanded(
              child: ref.watch(snapshotProvider).when(
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (e, _) => Center(
                      child: LText(
                          t('Could not load accounts', 'হিসাব খোলা যায়নি'))),
                  data: (s) => RefreshIndicator(
                      onRefresh: _load,
                      child: ListView(
                          padding: const EdgeInsets.all(20),
                          children: s.of('space').isEmpty
                              ? [
                                  LText(t('Create a space first',
                                      'আগে একটি হিসাব খুলুন'))
                                ]
                              : switch (_tab) {
                                  0 => _alerts(s),
                                  1 => _calendar(s),
                                  2 => _tools(s),
                                  3 => _business(s),
                                  _ => _settings(s)
                                }))))
        ]));
  }

  List<Widget> _alerts(FinanceSnapshot s) {
    final rows = (_inbox['rows'] as List? ?? []).cast<Map>();
    return [
      Row(children: [
        Expanded(
            child: LText(t('Updates and reminders', 'আপডেট ও রিমাইন্ডার'),
                style: Theme.of(context).textTheme.titleLarge)),
        TextButton(
            onPressed: () => run(() async {
                  for (final r in rows) {
                    r['read'] = true;
                  }
                  await (await ref.read(repositoryProvider.future))
                      .writePrivate('inbox', _inbox);
                }),
            child: LText(t('Read all', 'সব পড়েছি')))
      ]),
      if (rows.isEmpty)
        Padding(
            padding: const EdgeInsets.all(24),
            child:
                LText(t('No notifications yet', 'এখনো কোনো নোটিফিকেশন নেই'))),
      ...rows.map((r) => Card(
          child: ListTile(
              leading: Icon(r['read'] == true
                  ? Icons.notifications_none
                  : Icons.notifications_active_outlined),
              title: LText(r['title'] as String),
              subtitle: LText(
                  '${ref.watch(privacyProvider) ? '••••' : r['message']}\n${r['active'] == true ? t('Active', 'চলমান') : t('Resolved', 'সমাধান হয়েছে')} · ${(r['at'] as String).substring(0, 10)}'),
              isThreeLine: true,
              onTap: () => run(() async {
                    r['read'] = true;
                    await (await ref.read(repositoryProvider.future))
                        .writePrivate('inbox', _inbox);
                    if (!mounted) return;
                    final record = s.find(r['recordId'] as String? ?? '');
                    if (record?.kind == 'account') {
                      await Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => AccountStatement(record!.id)));
                    } else if ({'invoice', 'party'}.contains(record?.kind)) {
                      setState(() => _tab = 3);
                    } else if (record?.kind == 'installment') {
                      setState(() => _tab = 2);
                    } else if (record != null) {
                      await showDialog<void>(
                          context: context,
                          builder: (c) => AlertDialog(
                                  title: LText(r['title'] as String),
                                  content: LText(ref.watch(privacyProvider)
                                      ? '••••'
                                      : '${r['message']}\n${record.text('category', record.text('name'))}'),
                                  actions: [
                                    TextButton(
                                        onPressed: () => Navigator.pop(c),
                                        child: LText(t('Close', 'বন্ধ করুন')))
                                  ]));
                    } else {
                      setState(() => _tab = 2);
                    }
                  }))))
    ];
  }

  List<Widget> _calendar(FinanceSnapshot s) {
    final space = ref.watch(spaceProvider), month = ref.watch(monthProvider);
    final health = s.moneyHealth(space),
        days = s.cashCalendar(space, _days, expectedIncome: _expected);
    final weekly = s
        .of('transaction')
        .where((r) =>
            s.belongsToSpace(r, space) &&
            s.isPosted(r) &&
            r.text('date').compareTo(
                    dayKey(financeNow().subtract(const Duration(days: 6)))) >=
                0)
        .toList();
    final weeklyExpense = weekly.fold<int>(
        0,
        (sum, r) =>
            sum + s.expenseParts(r).values.fold<int>(0, (a, b) => a + b));
    return [
      LText(t('Based on recorded transactions and obligations',
          'লেখা লেনদেন ও দায়ের ভিত্তিতে সম্ভাব্য হিসাব')),
      const SizedBox(height: 12),
      Surface(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        LText(
            '${t('Current balance', 'বর্তমান ব্যালেন্স')}: ${amount(health.balance)}'),
        LText(
            '${t('Reserved savings', 'সঞ্চয়ের জন্য রাখা')}: ${amount(health.reserved)}'),
        LText(
            '${t('Remaining monthly plan', 'মাসের বাকি পরিকল্পনা')}: ${amount(health.required)}'),
        LText(
            '${health.shortage > 0 ? t('Shortage', 'ঘাটতি') : t('After plan', 'পরিকল্পনার পরে বাকি')}: ${amount(health.shortage > 0 ? health.shortage : health.remaining)}'),
        if (health.dailyLimit != null)
          LText(
              '${t('Daily discretionary limit', 'দৈনিক ঐচ্ছিক খরচের সীমা')}: ${amount(health.dailyLimit!)}'),
        if (!health.hasBudgets)
          LText(t('No budgets added. Add budgets for a fuller plan.',
              'বাজেট যোগ করা হয়নি। পূর্ণ পরিকল্পনার জন্য বাজেট যোগ করুন।')),
      ])),
      Wrap(spacing: 8, children: [
        for (final n in [7, 30])
          ChoiceChip(
              label: LText('$n ${t('days', 'দিন')}'),
              selected: _days == n,
              onSelected: (_) => setState(() => _days = n))
      ]),
      SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: LText(t('Include expected income', 'প্রত্যাশিত আয়সহ দেখুন')),
          subtitle: LText(t(
              'Forecast only; current balances stay based on posted entries',
              'সম্ভাব্য হিসাব; বর্তমান ব্যালেন্সে শুধু লেখা লেনদেন')),
          value: _expected,
          onChanged: (v) => setState(() => _expected = v)),
      ...days.map((d) => ListTile(
          contentPadding: EdgeInsets.zero,
          title: LText(dayKey(d.date)),
          subtitle: LText(d.labels.isEmpty
              ? t('No dated obligations', 'নির্ধারিত দায় নেই')
              : d.labels.join(' · ')),
          trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                LText(amount(d.balance),
                    style: TextStyle(color: d.balance < 0 ? Colors.red : null)),
                LText(amount(d.change),
                    style: Theme.of(context).textTheme.bodySmall)
              ]))),
      const Divider(),
      LText(
          '${t('Recorded income in last 7 days', 'গত ৭ দিনের লেখা আয়')}: ${amount(weekly.where((r) => !r.flag('adjustment') && s.effectiveType(r) == 'income').fold<int>(0, (sum, r) => sum + s.signedAmount(r)))}'),
      LText(
          '${t('Recorded expenses in last 7 days', 'গত ৭ দিনের লেখা খরচ')}: ${amount(weeklyExpense)}'),
      const SizedBox(height: 16),
      LText(
          '${t('Budget versus actual', 'বাজেট বনাম খরচ')} · ${monthKey(month)}',
          style: Theme.of(context).textTheme.titleMedium),
      ...s
          .scoped('budget', space)
          .where((b) => b.text('month') == monthKey(month))
          .map((b) => ListTile(
              contentPadding: EdgeInsets.zero,
              title: LText(s.categoryName(b)),
              subtitle: LText(
                  '${t('Budget', 'বাজেট')}: ${amount(b.number('amount'))}'),
              trailing: LText(amount(s.spent(
                  b.text('space'), b.text('month'), s.categoryName(b)))))),
    ];
  }

  List<Widget> _tools(FinanceSnapshot s) {
    final selected = scope(s),
        space = ref.watch(spaceProvider),
        month = ref.watch(monthProvider);
    final review = s
        .scoped('month_close', selected)
        .where((r) => r.text('month') == monthKey(month))
        .firstOrNull;
    return [
      LText(t('Accounts and month review', 'অ্যাকাউন্ট ও মাসশেষ পর্যালোচনা'),
          style: Theme.of(context).textTheme.titleLarge),
      tool(
          t('Reconcile actual balance', 'বাস্তব ব্যালেন্স মেলান'),
          t('Compare cash, bank or wallet balances',
              'ক্যাশ, ব্যাংক বা ওয়ালেটের টাকা মিলিয়ে নিন'),
          Icons.fact_check_outlined,
          () => run(() => _reconcile(s))),
      tool(
          t('Month review', 'মাসের হিসাব পর্যালোচনা'),
          '${s.find(selected)?.text('name')} · ${monthKey(month)} · ${review?.flag('closed') == true ? t('Closed', 'বন্ধ') : t('Open', 'খোলা')}',
          Icons.event_available,
          () => run(() => _monthReview(s, selected, month))),
      tool(
          t('Monthly PDF', 'মাসিক PDF'),
          t('Export the selected space and month',
              'নির্বাচিত হিসাব ও মাসের রিপোর্ট'),
          Icons.picture_as_pdf_outlined,
          () => run(() async {
                final bytes = await monthlyReport(s, space, month,
                    language: ref.read(languageProvider));
                if (!mounted) return;
                final box = context.findRenderObject() as RenderBox?;
                await Share.shareXFiles([
                  XFile.fromData(bytes,
                      mimeType: 'application/pdf',
                      name: 'hisab-${monthKey(month)}.pdf')
                ],
                    sharePositionOrigin: box == null
                        ? null
                        : box.localToGlobal(Offset.zero) & box.size);
              })),
      tool(
          t('Backup health', 'ব্যাকআপের অবস্থা'),
          _backup == null
              ? t('No backup exported yet. Use More → Sync & recovery.',
                  'এখনো ব্যাকআপ export হয়নি। আরও → সিঙ্ক ও ব্যাকআপ খুলুন।')
              : '${t('Last export', 'শেষ export')}: ${_backup!.substring(0, 10)}',
          Icons.backup_outlined, () {
        ref.read(navigationProvider.notifier).state = 4;
        Navigator.pop(context);
      }),
      tool(
          t('Trash and recovery', 'মুছে ফেলা তথ্য ফেরত আনুন'),
          t('Review deleted ordinary transactions',
              'মুছে ফেলা সাধারণ লেনদেন পর্যালোচনা'),
          Icons.restore_from_trash_outlined,
          () => run(() => _trash())),
      const Divider(),
      LText(t('Income and debt timeline', 'আয় ও ঋণের সময়সূচি'),
          style: Theme.of(context).textTheme.titleLarge),
      tool(
          t('Expected income', 'প্রত্যাশিত আয়'),
          t('Salary and recurring income expectations',
              'বেতন ও নিয়মিত আয়ের সম্ভাব্য সময়সূচি'),
          Icons.calendar_month,
          () => run(() => _expectation(s))),
      ...s.scoped('expectation', space).map((e) => ListTile(
          title: Text(e.text('name')),
          subtitle: LText('${e.text('due')} · ${amount(e.number('amount'))}'),
          trailing: s.expectationReceived(e)
              ? const Icon(Icons.check_circle_outline)
              : TextButton(
                  onPressed: _busy
                      ? null
                      : () => run(() async {
                            final a = await chooseAccount(
                                context, s, e.text('space'));
                            if (a != null) {
                              await (await ref.read(repositoryProvider.future))
                                  .receiveExpectation(e, a);
                            }
                          }),
                  child: LText(t('Received', 'পেয়েছি'))))),
      tool(
          t('Create installment schedule', 'কিস্তির সময়সূচি তৈরি'),
          t('Principal, interest, due dates and payment history',
              'মূল টাকা, সুদ, তারিখ ও পরিশোধের ইতিহাস'),
          Icons.date_range,
          () => run(() => _loanSchedule(s))),
      ...s.scoped('installment', space).map((i) => ListTile(
          title: LText(s.find(i.text('loan'))?.text('name') ?? ''),
          subtitle: LText(
              '${i.text('due')} · ${t('Principal', 'মূল')}: ${amount(i.number('principal'))} · ${t('Interest', 'সুদ')}: ${amount(i.number('interest'))}'),
          trailing: s.installmentRemaining(i) == 0
              ? const Icon(Icons.check_circle_outline)
              : TextButton(
                  onPressed: _busy
                      ? null
                      : () => run(() async {
                            final a = await chooseAccount(
                                context, s, i.text('space'));
                            if (a != null) {
                              await (await ref.read(repositoryProvider.future))
                                  .payInstallment(i, a);
                            }
                          }),
                  child: LText(t('Pay', 'পরিশোধ'))))),
      const Divider(),
      LText(t('Savings and quick entry', 'সঞ্চয় ও দ্রুত এন্ট্রি'),
          style: Theme.of(context).textTheme.titleLarge),
      tool(
          t('Fund a savings goal', 'লক্ষ্যের জন্য টাকা রাখুন'),
          t('Assign existing account money to a goal',
              'অ্যাকাউন্টের টাকা সঞ্চয়ের লক্ষ্যে বরাদ্দ করুন'),
          Icons.savings_outlined,
          () => run(() => _fundGoal(s))),
      ...s.scoped('goal', space).map((g) => ListTile(
          title: Text(g.text('name')),
          subtitle: LText(
              '${amount(g.number('saved'))} · ${g.text('backingAccount').isEmpty ? t('Unfunded earmark', 'অ্যাকাউন্ট বরাদ্দ নেই') : s.find(g.text('backingAccount'))?.text('name')}'))),
      ...s.scoped('template', space).map((r) => tool(
          r.text('name'),
          t('Use saved transaction template', 'সংরক্ষিত লেনদেন ব্যবহার করুন'),
          Icons.bolt,
          () => openEditor(context, 'transaction', initialData: {
                ...Map<String, dynamic>.from(r.data['transaction']),
                'date': dayKey(financeNow())
              }))),
    ];
  }

  Future<void> _reconcile(FinanceSnapshot s) async {
    final accounts = s.of('account');
    if (accounts.isEmpty) return;
    final data =
        await financeForm(context, t('Reconcile balance', 'ব্যালেন্স মেলান'), [
      FormFieldSpec('account', t('Account', 'অ্যাকাউন্ট'),
          choices: {for (final a in accounts) a.id: a.text('name')}),
      FormFieldSpec('actual', t('Actual balance', 'বাস্তব ব্যালেন্স'),
          kind: 'money', zero: true),
      FormFieldSpec('reason', t('Reason for difference', 'পার্থক্যের কারণ'))
    ]);
    if (data == null || !mounted) return;
    final account = s.find(data['account'])!,
        difference = (data['actual'] as int) - s.balance(account);
    if (!await confirm(
        context,
        t('Record balance adjustment?', 'সমন্বয়ের এন্ট্রি করবেন?'),
        '${t('Difference', 'পার্থক্য')}: ${amount(difference)}\n${t('Kept separately from income and everyday spending.', 'আয় ও দৈনন্দিন খরচ থেকে আলাদা থাকবে।')}',
        action: t('Adjust', 'সমন্বয় করুন'))) return;
    await (await ref.read(repositoryProvider.future))
        .reconcile(account, data['actual'], data['reason']);
  }

  Future<void> _monthReview(
      FinanceSnapshot s, String space, DateTime month) async {
    final review = s
        .scoped('month_close', space)
        .where((r) => r.text('month') == monthKey(month))
        .firstOrNull;
    final closed = review?.flag('closed') == true;
    final changed = closed &&
        review!.text('fingerprint') != s.monthFingerprint(space, month);
    final unpaid = s
        .scoped('bill', space)
        .where(
            (b) => b.text('due').startsWith(monthKey(month)) && !s.billPaid(b))
        .length;
    if (!await confirm(context, t('Month review', 'মাসের হিসাব পর্যালোচনা'),
        '${monthKey(month)}\n${t('Income', 'আয়')}: ${amount(s.total(space, month, 'income'))}\n${t('Expenses', 'খরচ')}: ${amount(s.total(space, month, 'expense'))}\n${t('Unpaid bills', 'অপরিশোধিত বিল')}: $unpaid\n${changed ? t('Synced changes need another review.', 'সিঙ্কের পরিবর্তন আবার পর্যালোচনা করুন।') : ''}\n${closed ? t('Reopen to allow corrections.', 'সংশোধনের জন্য আবার খুলুন।') : t('Closing prevents local transaction changes until reopened.', 'বন্ধ করলে আবার খোলা পর্যন্ত এই মাসের লেনদেন বদলানো যাবে না।')}',
        action: closed
            ? t('Reopen', 'আবার খুলুন')
            : t('Close month', 'মাস বন্ধ করুন'))) return;
    await (await ref.read(repositoryProvider.future))
        .reviewMonth(space, month, close: !closed);
  }

  Future<void> _trash() async {
    final repo = await ref.read(repositoryProvider.future),
        records = await (await ref.read(repositoryProvider.future))
            .deletedTransactions();
    if (!mounted) return;
    final id = await showDialog<String>(
        context: context,
        builder: (c) => SimpleDialog(
                title: LText(t('Deleted transactions', 'মুছে ফেলা লেনদেন')),
                children: [
                  if (records.isEmpty)
                    Padding(
                        padding: const EdgeInsets.all(20),
                        child:
                            LText(t('Trash is empty', 'কিছু মুছে ফেলা হয়নি'))),
                  ...records.map((r) => SimpleDialogOption(
                      onPressed: () => Navigator.pop(c, r.id),
                      child: LText(
                          '${r.text('date')} · ${amount(r.number('amount'))} · ${r.text('category')}')))
                ]));
    if (id != null) await repo.restoreTransaction(id);
  }

  Future<void> _expectation(FinanceSnapshot s) async {
    final data =
        await financeForm(context, t('Expected income', 'প্রত্যাশিত আয়'), [
      FormFieldSpec('space', t('Space', 'হিসাব'),
          initial: scope(s),
          choices: {for (final r in s.of('space')) r.id: r.text('name')}),
      FormFieldSpec('name', t('Source', 'আয়ের উৎস')),
      FormFieldSpec('amount', t('Amount', 'টাকা'), kind: 'money'),
      FormFieldSpec('category', t('Category', 'ক্যাটাগরি'), initial: 'Salary'),
      FormFieldSpec('due', t('Expected date', 'প্রত্যাশিত তারিখ'),
          kind: 'date'),
      FormFieldSpec('months', t('Number of monthly occurrences', 'মাসিক কতবার'),
          kind: 'integer', initial: '1')
    ]);
    if (data == null) return;
    final months = data.remove('months') as int;
    if (months < 1 || months > 60) {
      throw const FormatException('Choose 1–60 occurrences.');
    }
    await (await ref.read(repositoryProvider.future))
        .createExpectations(data, months);
  }

  Future<void> _loanSchedule(FinanceSnapshot s) async {
    if (s.of('loan').isEmpty) {
      throw const FormatException('Add a loan in Plan first.');
    }
    final data = await financeForm(
        context, t('Installment schedule', 'কিস্তির সময়সূচি'), [
      FormFieldSpec('loan', t('Loan', 'ঋণ'),
          choices: {for (final r in s.of('loan')) r.id: r.text('name')}),
      FormFieldSpec('rate', t('Annual interest %', 'বার্ষিক সুদ %'),
          kind: 'money', zero: true, initial: '0'),
      FormFieldSpec('months', t('Number of installments', 'কিস্তির সংখ্যা'),
          kind: 'integer', initial: '12'),
      FormFieldSpec('due', t('First due date', 'প্রথম কিস্তির তারিখ'),
          kind: 'date'),
      FormFieldSpec('model', t('Interest calculation', 'সুদের হিসাব'),
          choices: {
            'reducing': t('Reducing balance', 'অবশিষ্ট মূল টাকার উপর'),
            'flat': t('Flat rate', 'একই মূল টাকার উপর')
          })
    ]);
    if (data == null) return;
    await (await ref.read(repositoryProvider.future)).scheduleLoan(
        s.find(data['loan'])!,
        data['rate'],
        data['months'],
        DateTime.parse(data['due']),
        model: data['model']);
  }

  Future<void> _fundGoal(FinanceSnapshot s) async {
    if (s.of('goal').isEmpty || s.of('account').isEmpty) {
      throw const FormatException('Add a goal and an account first.');
    }
    final data =
        await financeForm(context, t('Fund savings', 'সঞ্চয়ের টাকা বরাদ্দ'), [
      FormFieldSpec('goal', t('Goal', 'লক্ষ্য'),
          choices: {for (final g in s.of('goal')) g.id: g.text('name')}),
      FormFieldSpec('account', t('Backing account', 'টাকা রাখা অ্যাকাউন্ট'),
          choices: {for (final a in s.of('account')) a.id: a.text('name')}),
      FormFieldSpec('saved', t('Total allocated amount', 'মোট বরাদ্দ টাকা'),
          kind: 'money', zero: true)
    ]);
    if (data == null) return;
    final goal = s.find(data['goal'])!;
    await (await ref.read(repositoryProvider.future)).save(
        'goal',
        {
          ...goal.data,
          'saved': data['saved'],
          'backingAccount': data['account']
        },
        id: goal.id,
        expectedVersion: goal.localVersion);
  }

  List<Widget> _business(FinanceSnapshot s) {
    final space = ref.watch(spaceProvider),
        parties = s.scoped('party', ref.watch(spaceProvider)).toList();
    final invoices = s.scoped('invoice', space).toList()
      ..sort((a, b) => a.text('due').compareTo(b.text('due')));
    final incoming = invoices
        .where((i) => i.text('direction') == 'receivable')
        .fold<int>(0, (n, i) => n + s.invoiceRemaining(i));
    final outgoing = invoices
        .where((i) => i.text('direction') == 'payable')
        .fold<int>(0, (n, i) => n + s.invoiceRemaining(i));
    return [
      Surface(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        LText('${t('Receivable', 'পাবেন')}: ${amount(incoming)}'),
        LText('${t('Payable', 'দিতে হবে')}: ${amount(outgoing)}'),
        LText(t('Invoices do not move money until a payment is recorded.',
            'পরিশোধ লেখা হলে অ্যাকাউন্টে টাকার পরিবর্তন হবে।'))
      ])),
      tool(
          t('Add customer / supplier', 'ক্রেতা / সরবরাহকারী যোগ'),
          t('Contact and account history', 'যোগাযোগ ও লেনদেনের খাতা'),
          Icons.people_outline,
          () => run(() => _party(s))),
      tool(
          t('Create invoice', 'ইনভয়েস তৈরি'),
          t('Items, quantities, prices, due date',
              'পণ্য/সেবা, পরিমাণ, দাম ও পরিশোধের তারিখ'),
          Icons.receipt_long_outlined,
          () => run(() => _invoice(s))),
      ...parties.map((p) => ExpansionTile(
              title: Text(p.text('name')),
              subtitle: LText(
                  '${p.text('type') == 'customer' ? t('Customer', 'ক্রেতা') : t('Supplier', 'সরবরাহকারী')} · ${p.text('contact')}'),
              children: [
                ...invoices.where((i) => i.text('party') == p.id).map((i) =>
                    ListTile(
                        title: Text(i.text('name')),
                        subtitle: LText(
                            '${i.text('due')} · ${amount(s.invoiceRemaining(i))} ${t('outstanding', 'বাকি')}')))
              ])),
      const SizedBox(height: 16),
      LText(t('Invoices', 'ইনভয়েস'),
          style: Theme.of(context).textTheme.titleLarge),
      ...invoices.map((i) => Card(
              child: Column(children: [
            ListTile(
                title: Text(i.text('name')),
                subtitle: LText(
                    '${s.find(i.text('party'))?.text('name')} · ${i.text('due')}'),
                trailing: LText(amount(s.invoiceRemaining(i)))),
            Wrap(spacing: 12, children: [
              TextButton(
                  onPressed: () => run(() async {
                        final bytes = await invoiceReport(s, i,
                            language: ref.read(languageProvider));
                        if (!mounted) return;
                        final box = context.findRenderObject() as RenderBox?;
                        await Share.shareXFiles([
                          XFile.fromData(bytes,
                              mimeType: 'application/pdf', name: 'invoice.pdf')
                        ],
                            sharePositionOrigin: box == null
                                ? null
                                : box.localToGlobal(Offset.zero) & box.size);
                      }),
                  child: LText(t('PDF', 'PDF'))),
              if (s.invoiceRemaining(i) > 0)
                TextButton(
                    onPressed: _busy
                        ? null
                        : () => run(() async {
                              final account = await chooseAccount(
                                  context, s, i.text('space'));
                              if (account == null || !mounted) return;
                              final value = await askAmount(
                                  context, t('Payment amount', 'পরিশোধের টাকা'),
                                  initial: s.invoiceRemaining(i));
                              if (value != null) {
                                await (await ref
                                        .read(repositoryProvider.future))
                                    .settleInvoice(i, account, value);
                              }
                            }),
                    child: LText(t('Record payment', 'পরিশোধ লিখুন')))
            ])
          ]))),
    ];
  }

  Future<void> _party(FinanceSnapshot s) async {
    final data =
        await financeForm(context, t('Add contact', 'যোগাযোগ যোগ করুন'), [
      FormFieldSpec('space', t('Space', 'হিসাব'),
          initial: scope(s),
          choices: {for (final r in s.of('space')) r.id: r.text('name')}),
      FormFieldSpec('name', t('Name', 'নাম')),
      FormFieldSpec('type', t('Type', 'ধরন'), choices: {
        'customer': t('Customer', 'ক্রেতা'),
        'supplier': t('Supplier', 'সরবরাহকারী')
      }),
      FormFieldSpec('contact', t('Phone / address', 'ফোন / ঠিকানা'),
          required: false)
    ]);
    if (data != null) {
      await (await ref.read(repositoryProvider.future)).save('party', data);
    }
  }

  Future<void> _invoice(FinanceSnapshot s) async {
    if (s.of('party').isEmpty) {
      throw const FormatException('Add a customer or supplier first.');
    }
    final data =
        await financeForm(context, t('Create invoice', 'ইনভয়েস তৈরি'), [
      FormFieldSpec('party', t('Customer / supplier', 'ক্রেতা / সরবরাহকারী'),
          choices: {for (final p in s.of('party')) p.id: p.text('name')}),
      FormFieldSpec('name', t('Invoice number', 'ইনভয়েস নম্বর')),
      FormFieldSpec('direction', t('Payment direction', 'টাকার ধরন'), choices: {
        'receivable': t('I will receive', 'আমি পাব'),
        'payable': t('I will pay', 'আমি দেব')
      }),
      FormFieldSpec('due', t('Due date', 'পরিশোধের তারিখ'), kind: 'date'),
      FormFieldSpec('note', t('Note', 'নোট'), required: false)
    ]);
    if (data == null || !mounted) return;
    final lines = await editInvoiceLines(context, ref);
    if (lines == null) return;
    data.addAll({
      'space': s.find(data['party'])!.text('space'),
      'lines': lines,
      'category': 'Business',
      'amount': lines.fold<int>(
          0,
          (sum, line) =>
              sum + (line['quantity'] as int) * (line['unitPrice'] as int))
    });
    await (await ref.read(repositoryProvider.future)).save('invoice', data);
  }

  Future<void> _preference(String key, Object value) async {
    await run(() async {
      if (value == true &&
          {'daily', 'bills', 'budget', 'balance', 'summary'}.contains(key) &&
          !await ref.read(remindersProvider).requestPermission()) {
        throw const FormatException(
            'Enable notification permission in device settings.');
      }
      final prefs = {..._prefs, key: value};
      final repo = await ref.read(repositoryProvider.future);
      await repo.writePrivate('notifications', prefs);
      if (key == 'bills') await repo.setSetting('reminders', '$value');
    });
  }

  List<Widget> _settings(FinanceSnapshot s) {
    final p = NotificationPreferences.fromJson(_prefs);
    Widget toggle(String key, String en, String bn, bool value) =>
        SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: LText(t(en, bn)),
            value: value,
            onChanged: _busy || kIsWeb ? null : (v) => _preference(key, v));
    return [
      LText(t('Notification preferences', 'নোটিফিকেশন পছন্দ'),
          style: Theme.of(context).textTheme.titleLarge),
      LText(kIsWeb
          ? t('Local reminders are available in Android and iOS apps.',
              'লোকাল রিমাইন্ডার Android ও iOS অ্যাপে পাওয়া যাবে।')
          : _permission == true
              ? t('Notification permission enabled', 'নোটিফিকেশনের অনুমতি চালু')
              : _permission == false
                  ? t('Notification permission is off',
                      'নোটিফিকেশনের অনুমতি বন্ধ')
                  : t('Permission status depends on device settings',
                      'ডিভাইসের settings-এ অনুমতি দেখুন')),
      tool(
          t('Check notification delivery', 'নোটিফিকেশন পরীক্ষা করুন'),
          t('Permission, queued reminders and a one-minute test',
              'অনুমতি, অপেক্ষায় থাকা রিমাইন্ডার ও এক মিনিটের পরীক্ষা'),
          Icons.notifications_active_outlined,
          () => run(() async {
                final service = ref.read(remindersProvider),
                    result = await ref.read(remindersProvider).diagnostics();
                if (!mounted) return;
                final test = await confirm(
                    context,
                    t('Notification check', 'নোটিফিকেশন পরীক্ষা'),
                    '${t('Permission', 'অনুমতি')}: ${result['permission'] == true ? t('Enabled', 'চালু') : t('Not enabled', 'চালু নেই')}\n${t('Queued reminders', 'অপেক্ষায় থাকা রিমাইন্ডার')}: ${result['pending']}\n${t('Delivered notifications', 'পৌঁছানো নোটিফিকেশন')}: ${result['delivered']}\n${t('Send an immediate test and a second reminder after one minute. Background the app to check the second notification. Device settings can delay it.', 'এখন একটি এবং এক মিনিট পরে আরেকটি পরীক্ষার বার্তা পাঠান। দ্বিতীয়টি দেখতে অ্যাপ আড়ালে রাখুন। ফোনের সেটিংসে দেরি হতে পারে।')}',
                    action: t('Send test', 'পরীক্ষার বার্তা দিন'));
                if (test) {
                  await service.testDelivery(
                      bangla: ref.read(languageProvider) == 'bn');
                }
              })),
      toggle('daily', 'Daily account reminder', 'দৈনিক হিসাবের রিমাইন্ডার',
          p.daily),
      ListTile(
          contentPadding: EdgeInsets.zero,
          title: LText(t('Daily reminder time', 'দৈনিক রিমাইন্ডারের সময়')),
          subtitle: LText(
              '${p.hour.toString().padLeft(2, '0')}:${p.minute.toString().padLeft(2, '0')} · ${p.timezone}'),
          onTap: _busy
              ? null
              : () async {
                  final time = await showTimePicker(
                      context: context,
                      initialTime: TimeOfDay(hour: p.hour, minute: p.minute));
                  if (time == null) return;
                  await _preference('hour', time.hour);
                  await _preference('minute', time.minute);
                }),
      toggle('missingOnly', 'Only when no entry exists',
          'শুধু কোনো এন্ট্রি না থাকলে', p.missingOnly),
      toggle('bills', 'Bills, installments and invoice reminders',
          'বিল, কিস্তি ও ইনভয়েস রিমাইন্ডার', p.bills),
      toggle('budget', 'Budget threshold alerts', 'বাজেটের সীমার সতর্কতা',
          p.budget),
      toggle('balance', 'Low balance and shortage alerts',
          'কম ব্যালেন্স ও ঘাটতির সতর্কতা', p.balance),
      toggle('summary', 'Weekly and monthly review reminders',
          'সাপ্তাহিক ও মাসিক রিমাইন্ডার', p.summary),
      toggle('private', 'Hide financial details on lock screen',
          'লক স্ক্রিনে আর্থিক তথ্য লুকান', p.private),
      ListTile(
          contentPadding: EdgeInsets.zero,
          title: LText(t('Quiet hours', 'নীরব সময়')),
          subtitle: LText('${p.quietStart}:00 – ${p.quietEnd}:00'),
          onTap: () => run(() async {
                final data =
                    await financeForm(context, t('Quiet hours', 'নীরব সময়'), [
                  FormFieldSpec(
                      'start', t('Start hour (0–23)', 'শুরুর ঘণ্টা (০–২৩)'),
                      kind: 'integer', zero: true, initial: '${p.quietStart}'),
                  FormFieldSpec('end', t('End hour (0–23)', 'শেষ ঘণ্টা (০–২৩)'),
                      kind: 'integer', zero: true, initial: '${p.quietEnd}')
                ]);
                if (data == null) return;
                if (data['start'] > 23 || data['end'] > 23) {
                  throw const FormatException('Choose hours from 0 to 23.');
                }
                await (await ref.read(repositoryProvider.future)).writePrivate(
                    'notifications', {
                  ..._prefs,
                  'quietStart': data['start'],
                  'quietEnd': data['end']
                });
              })),
      ListTile(
          contentPadding: EdgeInsets.zero,
          title: LText(t('Timezone', 'সময়ের অঞ্চল')),
          subtitle: LText(p.timezone),
          onTap: () => run(() async {
                final data =
                    await financeForm(context, t('Timezone', 'সময়ের অঞ্চল'), [
                  FormFieldSpec('timezone', t('Timezone', 'সময়ের অঞ্চল'),
                      initial: p.timezone,
                      choices: {
                        for (final zone in [
                          'Asia/Dhaka',
                          'Asia/Kolkata',
                          'Asia/Dubai',
                          'Asia/Riyadh',
                          'Europe/London',
                          'America/New_York',
                          'Australia/Sydney'
                        ])
                          zone: zone
                      })
                ]);
                if (data != null) {
                  await (await ref.read(repositoryProvider.future))
                      .writePrivate('notifications', {..._prefs, ...data});
                }
              })),
      LText(t(
          'Bill reminders: 3 days before, 1 day before and due day at 9 AM. Daily reminders cover 21 days and renew whenever you use the app. A renewal reminder follows if the app stays unopened. Delivery follows device settings.',
          'বিল: ৩ দিন আগে, আগের দিন ও নির্ধারিত দিনে সকাল ৯টা। দৈনিক রিমাইন্ডারের ২১ দিনের সূচি অ্যাপ খুললে নবায়ন হবে। দীর্ঘদিন না খুললে নবায়নের রিমাইন্ডার আসবে। ফোনের settings অনুযায়ী delivery হবে।')),
      const SizedBox(height: 16),
      tool(
          t('Account low balance limit', 'অ্যাকাউন্টের কম টাকার সীমা'),
          t('Choose a limit for each account', 'অ্যাকাউন্ট অনুযায়ী সীমা দিন'),
          Icons.account_balance_wallet_outlined,
          () => run(() async {
                if (s.of('account').isEmpty) return;
                final data = await financeForm(
                    context, t('Low balance alert', 'কম ব্যালেন্সের সতর্কতা'), [
                  FormFieldSpec('account', t('Account', 'অ্যাকাউন্ট'),
                      choices: {
                        for (final a in s.of('account')) a.id: a.text('name')
                      }),
                  FormFieldSpec(
                      'lowBalance', t('Alert below', 'এর কম হলে সতর্কতা'),
                      kind: 'money', zero: true)
                ]);
                if (data == null) return;
                final account = s.find(data['account'])!;
                await (await ref.read(repositoryProvider.future)).save(
                    'account',
                    {...account.data, 'lowBalance': data['lowBalance']},
                    id: account.id,
                    expectedVersion: account.localVersion);
              })),
    ];
  }
}

class FormFieldSpec {
  const FormFieldSpec(this.key, this.label,
      {this.kind = 'text',
      this.initial = '',
      this.choices,
      this.required = true,
      this.zero = false});
  final String key, label, kind, initial;
  final Map<String, String>? choices;
  final bool required, zero;
}

Future<Json?> financeForm(
    BuildContext context, String title, List<FormFieldSpec> fields) async {
  final controllers = {
    for (final f in fields)
      f.key: TextEditingController(
          text: f.initial.isNotEmpty
              ? f.initial
              : f.kind == 'date'
                  ? dayKey(financeNow())
                  : f.choices?.keys.firstOrNull ?? '')
  };
  final form = GlobalKey<FormState>();
  final result = await showDialog<Json>(
      context: context,
      builder: (dialog) => StatefulBuilder(
          builder: (dialog, setState) => AlertDialog(
                  title: LText(title),
                  content: SizedBox(
                      width: 440,
                      child: Form(
                          key: form,
                          child: SingleChildScrollView(
                              child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                for (final field in fields)
                                  Padding(
                                      padding:
                                          const EdgeInsets.only(bottom: 16),
                                      child: field.choices != null
                                          ? DropdownButtonFormField<String>(
                                              value: field.choices!.containsKey(
                                                      controllers[field.key]!
                                                          .text)
                                                  ? controllers[field.key]!.text
                                                  : field.choices!.keys.first,
                                              isExpanded: true,
                                              decoration: InputDecoration(
                                                  labelText: field.label),
                                              items: field.choices!.entries
                                                  .map((e) => DropdownMenuItem(
                                                      value: e.key,
                                                      child: Text(e.value,
                                                          overflow: TextOverflow
                                                              .ellipsis)))
                                                  .toList(),
                                              onChanged: (v) =>
                                                  controllers[field.key]!.text = v ?? '')
                                          : TextFormField(
                                              controller: controllers[field.key],
                                              decoration: InputDecoration(
                                                  labelText: field.label,
                                                  suffixIcon: field.kind == 'date'
                                                      ? IconButton(
                                                          icon: const Icon(Icons.calendar_month),
                                                          onPressed: () async {
                                                            final picked = await showDatePicker(
                                                                context: dialog,
                                                                initialDate: DateTime.tryParse(
                                                                        controllers[field.key]!
                                                                            .text) ??
                                                                    DateTime
                                                                        .now(),
                                                                firstDate:
                                                                    DateTime(
                                                                        2000),
                                                                lastDate:
                                                                    DateTime(
                                                                        2100));
                                                            if (picked !=
                                                                null) {
                                                              setState(() =>
                                                                  controllers[field
                                                                              .key]!
                                                                          .text =
                                                                      dayKey(
                                                                          picked));
                                                            }
                                                          })
                                                      : null),
                                              keyboardType: {'money', 'integer'}.contains(field.kind) ? const TextInputType.numberWithOptions(decimal: true) : TextInputType.text,
                                              maxLength: field.kind == 'text' ? 500 : null,
                                              validator: (value) {
                                                try {
                                                  if (!field.required &&
                                                      (value ?? '').isEmpty) {
                                                    return null;
                                                  }
                                                  if (field.kind == 'money') {
                                                    parseMoney(value ?? '',
                                                        allowZero: field.zero);
                                                  } else if (field.kind ==
                                                      'integer') {
                                                    final n = int.tryParse(
                                                        value ?? '');
                                                    if (n == null ||
                                                        n <
                                                            (field.zero
                                                                ? 0
                                                                : 1) ||
                                                        n > 1000000) {
                                                      return localText(context,
                                                          'Enter a valid number');
                                                    }
                                                  } else if (field.kind ==
                                                      'date') {
                                                    final date =
                                                        DateTime.tryParse(
                                                            value ?? '');
                                                    if (date == null ||
                                                        dayKey(date) != value) {
                                                      return localText(context,
                                                          'Choose a valid date');
                                                    }
                                                  } else if ((value ?? '')
                                                      .trim()
                                                      .isEmpty) {
                                                    return localText(
                                                        context, 'Required');
                                                  }
                                                  return null;
                                                } on FormatException catch (e) {
                                                  return localText(
                                                      context, e.message);
                                                }
                                              }))
                              ])))),
                  actions: [
                    TextButton(
                        onPressed: () => Navigator.pop(dialog),
                        child: LText(localText(context, 'Cancel'))),
                    FilledButton(
                        onPressed: () {
                          if (!form.currentState!.validate()) return;
                          Navigator.pop(dialog, {
                            for (final f in fields)
                              f.key: f.kind == 'money'
                                  ? parseMoney(controllers[f.key]!.text,
                                      allowZero: f.zero)
                                  : f.kind == 'integer'
                                      ? int.parse(controllers[f.key]!.text)
                                      : controllers[f.key]!.text.trim()
                          });
                        },
                        child: LText(localText(context, 'Continue')))
                  ])));
  WidgetsBinding.instance.addPostFrameCallback((_) {
    for (final c in controllers.values) {
      c.dispose();
    }
  });
  return result;
}

Future<List<Json>?> editInvoiceLines(
    BuildContext context, WidgetRef ref) async {
  final rows = <List<TextEditingController>>[
        [
          TextEditingController(),
          TextEditingController(text: '1'),
          TextEditingController()
        ]
      ],
      all = <TextEditingController>[];
  final form = GlobalKey<FormState>();
  String t(String en, String bn) => tr(ref, en, bn);
  final result = await showDialog<List<Json>>(
      context: context,
      builder: (c) => StatefulBuilder(
          builder: (c, update) => AlertDialog(
                  title: LText(t('Invoice items', 'ইনভয়েসের পণ্য/সেবা')),
                  content: SizedBox(
                      width: 480,
                      child: Form(
                          key: form,
                          child: SingleChildScrollView(
                              child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                for (final row in rows)
                                  Column(children: [
                                    TextFormField(
                                        controller: row[0],
                                        decoration: InputDecoration(
                                            labelText: t('Item / service',
                                                'পণ্য / সেবা')),
                                        validator: (v) =>
                                            (v ?? '').trim().isEmpty
                                                ? 'Required'
                                                : null),
                                    Row(children: [
                                      Expanded(
                                          child: TextFormField(
                                              controller: row[1],
                                              decoration: InputDecoration(
                                                  labelText:
                                                      t('Quantity', 'পরিমাণ')),
                                              keyboardType:
                                                  TextInputType.number,
                                              validator: (v) =>
                                                  (int.tryParse(v ?? '') ?? 0) <
                                                          1
                                                      ? 'Invalid'
                                                      : null)),
                                      const SizedBox(width: 12),
                                      Expanded(
                                          child: TextFormField(
                                              controller: row[2],
                                              decoration: InputDecoration(
                                                  labelText: t('Unit price',
                                                      'এককের দাম')),
                                              keyboardType: const TextInputType
                                                  .numberWithOptions(
                                                  decimal: true),
                                              validator: (v) {
                                                try {
                                                  parseMoney(v ?? '');
                                                  return null;
                                                } catch (_) {
                                                  return 'Invalid';
                                                }
                                              })),
                                      IconButton(
                                          onPressed: rows.length < 2
                                              ? null
                                              : () => update(() {
                                                    all.addAll(row);
                                                    rows.remove(row);
                                                  }),
                                          icon: const Icon(Icons.close))
                                    ]),
                                    const SizedBox(height: 16)
                                  ]),
                                TextButton.icon(
                                    onPressed: rows.length >= 100
                                        ? null
                                        : () => update(() => rows.add([
                                              TextEditingController(),
                                              TextEditingController(text: '1'),
                                              TextEditingController()
                                            ])),
                                    icon: const Icon(Icons.add),
                                    label: LText(t('Add item', 'আরও যোগ করুন')))
                              ])))),
                  actions: [
                    TextButton(
                        onPressed: () => Navigator.pop(c),
                        child: LText(t('Cancel', 'বাতিল'))),
                    FilledButton(
                        onPressed: () {
                          if (!form.currentState!.validate()) return;
                          Navigator.pop(
                              c,
                              rows
                                  .map((row) => <String, dynamic>{
                                        'name': row[0].text.trim(),
                                        'quantity': int.parse(row[1].text),
                                        'unitPrice': parseMoney(row[2].text)
                                      })
                                  .toList());
                        },
                        child: LText(t('Save invoice', 'ইনভয়েস সংরক্ষণ')))
                  ])));
  WidgetsBinding.instance.addPostFrameCallback((_) {
    for (final controller in [...all, ...rows.expand((r) => r)]) {
      controller.dispose();
    }
  });
  return result;
}

Future<List<Json>?> editSplitAllocations(BuildContext context, WidgetRef ref,
    FinanceSnapshot state, String space, int total,
    {List? existing}) async {
  final categories = {
    ...expenseCategories,
    ...state
        .scoped('category', space)
        .where((c) => c.text('type') == 'expense' && !c.flag('archived'))
        .map((c) => c.text('name'))
  };
  final rows = <Json>[
    for (final e in existing ?? []) Map<String, dynamic>.from(e)
  ];
  if (rows.isEmpty) rows.add({'category': categories.first, 'amount': total});
  final controllers = <TextEditingController>[];
  final amounts = <Json, TextEditingController>{};
  for (final row in rows) {
    final c = TextEditingController(text: editableMoney(row['amount']));
    amounts[row] = c;
    controllers.add(c);
  }
  final form = GlobalKey<FormState>();
  String? error;
  String t(String en, String bn) => tr(ref, en, bn);
  final result = await showDialog<List<Json>>(
      context: context,
      builder: (c) => StatefulBuilder(
          builder: (c, update) => AlertDialog(
                  title: LText(t('Split expense', 'খরচ ভাগ করুন')),
                  content: SizedBox(
                      width: 440,
                      child: Form(
                          key: form,
                          child: SingleChildScrollView(
                              child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                LText('${t('Total', 'মোট')}: ${money(total)}'),
                                for (final row in rows)
                                  Column(children: [
                                    DropdownButtonFormField<String>(
                                        isExpanded: true,
                                        value:
                                            categories.contains(row['category'])
                                                ? row['category']
                                                : categories.first,
                                        items: categories
                                            .map((category) => DropdownMenuItem(
                                                value: category,
                                                child: LText(category)))
                                            .toList(),
                                        onChanged: (v) => row['category'] = v),
                                    Row(children: [
                                      Expanded(
                                          child: TextFormField(
                                              controller: amounts[row],
                                              keyboardType: const TextInputType
                                                  .numberWithOptions(
                                                  decimal: true),
                                              decoration: const InputDecoration(
                                                  prefixText: '৳ '),
                                              validator: (v) {
                                                try {
                                                  parseMoney(v ?? '');
                                                  return null;
                                                } catch (_) {
                                                  return 'Invalid';
                                                }
                                              })),
                                      IconButton(
                                          onPressed: rows.length < 2
                                              ? null
                                              : () => update(
                                                  () => rows.remove(row)),
                                          icon: const Icon(Icons.close))
                                    ]),
                                    const SizedBox(height: 12)
                                  ]),
                                if (error != null)
                                  LText(error!,
                                      style: TextStyle(
                                          color:
                                              Theme.of(c).colorScheme.error)),
                                TextButton(
                                    onPressed: rows.length >= 30
                                        ? null
                                        : () => update(() {
                                              final row = <String, dynamic>{
                                                'category': categories.first
                                              };
                                              final controller =
                                                  TextEditingController();
                                              rows.add(row);
                                              amounts[row] = controller;
                                              controllers.add(controller);
                                            }),
                                    child: LText(t(
                                        'Add category', 'ক্যাটাগরি যোগ করুন')))
                              ])))),
                  actions: [
                    TextButton(
                        onPressed: () => Navigator.pop(c),
                        child: LText(t('Cancel', 'বাতিল'))),
                    FilledButton(
                        onPressed: () {
                          if (!form.currentState!.validate()) return;
                          final result = rows
                              .map((r) => <String, dynamic>{
                                    'category': r['category'],
                                    'categoryId': state.categoryId(
                                        space, 'expense', r['category']),
                                    'amount': parseMoney(amounts[r]!.text)
                                  })
                              .toList();
                          if (result.fold<int>(
                                  0, (sum, r) => sum + (r['amount'] as int)) !=
                              total) {
                            update(() => error = t(
                                'Allocations must equal the total.',
                                'ভাগ করা টাকার যোগফল মোট টাকার সমান হতে হবে।'));
                            return;
                          }
                          Navigator.pop(c, result);
                        },
                        child: LText(t('Apply', 'প্রয়োগ করুন')))
                  ])));
  WidgetsBinding.instance.addPostFrameCallback((_) {
    for (final controller in controllers) {
      controller.dispose();
    }
  });
  return result;
}
