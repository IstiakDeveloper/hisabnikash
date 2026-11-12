import 'localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../app/providers.dart';
import '../core/models.dart';
import '../core/money.dart';
import 'design.dart';
import 'editors.dart';
import 'finance_center.dart';

class PlansScreen extends ConsumerStatefulWidget {
  const PlansScreen(this.state, {super.key});
  final FinanceSnapshot state;
  @override
  ConsumerState<PlansScreen> createState() => _PlansScreenState();
}

class _PlansScreenState extends ConsumerState<PlansScreen> {
  String _kind = 'budget';
  bool _working = false;
  Future<void> _action(Future<void> Function() callback) async {
    if (_working) return;
    setState(() => _working = true);
    try {
      await callback();
    } catch (e) {
      if (mounted) feedbackMessage(context, e);
    } finally {
      if (mounted) setState(() => _working = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final space = ref.watch(spaceProvider), month = ref.watch(monthProvider);
    final records = widget.state
        .of(_kind)
        .where((r) =>
            (space == 'all' || r.text('space') == space) &&
            (_kind != 'budget' || r.text('month') == monthKey(month)))
        .toList();
    if (_kind == 'bill') {
      records.sort((a, b) => a.text('due').compareTo(b.text('due')));
    }
    final title = {
      'budget': 'Budgets',
      'bill': 'Bills',
      'goal': 'Goals',
      'loan': 'Loans'
    }[_kind]!;
    return ListView(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
        children: [
          LText(
              tr(ref, 'Make a little room for tomorrow.',
                  'আগামীর জন্য একটু পরিকল্পনা।'),
              style: Theme.of(context).textTheme.bodyLarge),
          const SizedBox(height: 20),
          SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(children: [
                for (final pair in {
                  'budget': 'Budgets',
                  'bill': 'Bills',
                  'goal': 'Goals',
                  'loan': 'Loans'
                }.entries)
                  Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                          label: LText(pair.value),
                          selected: _kind == pair.key,
                          onSelected: (_) => setState(() => _kind = pair.key))),
              ])),
          SectionTitle(title,
              action: '+ Add', onTap: () => openEditor(context, _kind)),
          if (_kind == 'budget')
            Wrap(spacing: 8, children: [
              TextButton(
                  onPressed: _working
                      ? null
                      : () => _action(() async {
                            final count = await (await ref
                                    .read(repositoryProvider.future))
                                .copyBudgets(month, space);
                            if (context.mounted) {
                              feedbackMessage(
                                  context,
                                  count == 0
                                      ? 'No new budgets to copy from the previous month.'
                                      : '$count budgets copied');
                            }
                          }),
                  child: const LText('Copy previous month')),
              TextButton(
                  onPressed: _working
                      ? null
                      : () => _action(() async {
                            final count = await (await ref
                                    .read(repositoryProvider.future))
                                .copyBudgets(month, space, carryUnspent: true);
                            if (context.mounted) {
                              feedbackMessage(
                                  context,
                                  count == 0
                                      ? 'No new budgets to carry forward.'
                                      : '$count budgets copied with unspent money');
                            }
                          }),
                  child: const LText('Copy with rollover')),
            ]),
          if (records.isEmpty)
            EmptyState(
                'A plan starts with one step',
                switch (_kind) {
                  'budget' =>
                    'Give each category a spending limit for this month.',
                  'bill' =>
                    'Stay a step ahead of rent, utilities, and regular payments.',
                  'goal' => 'Set aside a little for something that matters.',
                  _ => 'Track what you owe and what others owe you.',
                },
                action: FilledButton(
                    onPressed: () => openEditor(context, _kind),
                    child: LText(
                        'Create ${_kind == 'budget' ? 'a budget' : 'a $_kind'}'))),
          ...records.map((r) => Padding(
              padding: const EdgeInsets.only(bottom: 14), child: _card(r))),
          if (_kind == 'goal')
            const Padding(
                padding: EdgeInsets.only(top: 16),
                child: LText(
                    'Goals earmark existing money. Progress does not move money or change account balances.',
                    style: TextStyle(fontSize: 12))),
          if (_kind == 'loan')
            const Padding(
                padding: EdgeInsets.only(top: 16),
                child: LText(
                    'Principal repayments stay separate from everyday spending. Add dated installments and interest in Finance center.',
                    style: TextStyle(fontSize: 12))),
          if (_kind == 'bill')
            const Padding(
                padding: EdgeInsets.only(top: 16),
                child: LText(
                    'Monthly bills are prepared through the next two months, including unpaid periods. Enable private local reminders in More. Delivery follows your device notification and battery settings.',
                    style: TextStyle(fontSize: 12))),
        ]);
  }

  Widget _card(Record r) {
    String displayMoney(int amount) =>
        ref.watch(privacyProvider) ? '••••' : money(amount);
    final state = widget.state;
    int current = 0, target = 1;
    String headline = r.text('name'),
        subtitle = state.find(r.text('space'))?.text('name') ?? '';
    String? progressLabel;
    if (r.kind == 'budget') {
      headline = r.text('category');
      target = r.number('amount');
      current = state.spent(r.text('space'), r.text('month'), headline);
      subtitle =
          '${displayMoney(current)} spent · ${displayMoney(target - current)} left';
      progressLabel = '${(current / target * 100).round()}% used';
    } else if (r.kind == 'goal') {
      current = r.number('saved');
      target = r.number('target');
      subtitle = '${displayMoney(current)} of ${displayMoney(target)}';
      progressLabel = '${(current / target * 100).round()}% saved';
    } else if (r.kind == 'loan') {
      current = state.repaid(r);
      target = r.number('principal');
      subtitle = current > target
          ? '${displayMoney(current - target)} overpaid · review payments'
          : '${r.text('direction') == 'borrowed' ? 'I owe' : 'Owed to me'} · ${displayMoney(target - current)} remaining';
      progressLabel = '${displayMoney(current)} repaid';
    } else {
      subtitle =
          '${r.text('due')} · ${state.billPaid(r) ? 'Paid' : r.text('due').compareTo(dayKey(financeNow())) < 0 ? 'Overdue' : 'Upcoming'}';
    }
    final ratio = (current / target).clamp(0.0, 1.0);
    return Surface(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Expanded(
            child: LText(headline,
                style: Theme.of(context).textTheme.titleMedium)),
        PopupMenuButton<String>(
            tooltip: localText(context, 'Manage record'),
            onSelected: (action) async {
              if (action == 'repeat') {
                await _action(() async => (await ref
                        .read(repositoryProvider.future))
                    .setScheduleActive(
                        r,
                        !(state.find(r.text('scheduleId'))?.flag('active') ??
                            false)));
                return;
              }
              if (action == 'edit') {
                await openEditor(context, r.kind, record: r);
              }
              if (action == 'delete' &&
                  mounted &&
                  await confirm(context, 'Delete ${r.kind}?',
                      'This removes the plan from this device and connected devices.',
                      action: 'Delete')) {
                await _action(() async =>
                    (await ref.read(repositoryProvider.future)).remove(r));
              }
            },
            itemBuilder: (_) => [
                  if (!(r.kind == 'bill' && state.billPaid(r)))
                    const PopupMenuItem(value: 'edit', child: LText('Edit')),
                  const PopupMenuItem(value: 'delete', child: LText('Delete')),
                  if (r.kind == 'bill' &&
                      r.text('scheduleId').isNotEmpty &&
                      r.text('frequency') != 'once')
                    PopupMenuItem(
                        value: 'repeat',
                        child: LText(tr(
                            ref,
                            (state.find(r.text('scheduleId'))?.flag('active') ??
                                    false)
                                ? 'Pause repeating'
                                : 'Resume repeating',
                            (state.find(r.text('scheduleId'))?.flag('active') ??
                                    false)
                                ? 'পুনরাবৃত্তি বন্ধ করুন'
                                : 'পুনরাবৃত্তি চালু করুন'))),
                ]),
      ]),
      const SizedBox(height: 6),
      LText(subtitle),
      if (r.kind != 'bill') ...[
        const SizedBox(height: 18),
        ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
                value: ratio,
                minHeight: 7,
                color: r.kind == 'budget' && current > target
                    ? rust
                    : Theme.of(context).colorScheme.primary,
                backgroundColor:
                    Theme.of(context).colorScheme.primaryContainer)),
        const SizedBox(height: 8),
        LText(progressLabel!, style: Theme.of(context).textTheme.bodySmall),
      ],
      if (r.kind == 'goal')
        Align(
            alignment: Alignment.centerRight,
            child: TextButton(
                onPressed: _working
                    ? null
                    : () => _action(() async {
                          final amount = await askAmount(
                              context, 'Total earmarked savings',
                              initial: r.number('saved'));
                          if (amount != null) {
                            await (await ref.read(repositoryProvider.future))
                                .save('goal', {...r.data, 'saved': amount},
                                    id: r.id, expectedVersion: r.localVersion);
                          }
                        }),
                child: const LText('Update progress'))),
      if (r.kind == 'loan' && current < target)
        Align(
            alignment: Alignment.centerRight,
            child: TextButton(
                onPressed: _working
                    ? null
                    : () => _action(() async {
                          if (state
                              .of('installment')
                              .any((i) => i.text('loan') == r.id)) {
                            await openFinanceCenter(context, tab: 2);
                            return;
                          }
                          final account = await chooseAccount(
                              context, state, r.text('space'));
                          if (account == null || !mounted) return;
                          final amount =
                              await askAmount(context, 'Record repayment');
                          if (amount != null) {
                            await (await ref.read(repositoryProvider.future))
                                .repayLoan(r, account, amount);
                          }
                        }),
                child: const LText('Record repayment'))),
      if (r.kind == 'bill')
        Row(children: [
          Expanded(
              child: LText(displayMoney(r.number('amount')),
                  style: Theme.of(context).textTheme.titleLarge)),
          if (!state.billPaid(r))
            TextButton(
                onPressed: _working
                    ? null
                    : () => _action(() async {
                          final account = await chooseAccount(
                              context, state, r.text('space'));
                          if (account != null) {
                            if (!mounted) return;
                            final amount = await askAmount(context,
                                tr(ref, 'Payment amount', 'পরিশোধের টাকা'),
                                initial: r.number('amount') -
                                    state.billPaidAmount(r));
                            if (amount == null) return;
                            await (await ref.read(repositoryProvider.future))
                                .payBill(r, account, amount: amount);
                          }
                        }),
                child: LText(tr(ref, 'Record payment', 'পরিশোধ লিখুন')))
          else
            const Icon(Icons.check_circle_outline, color: forest),
        ]),
    ]));
  }
}
