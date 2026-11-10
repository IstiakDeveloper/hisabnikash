import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../app/providers.dart';
import '../core/models.dart';
import '../core/money.dart';
import 'design.dart';
import 'editors.dart';

class ActivityScreen extends ConsumerStatefulWidget {
  const ActivityScreen(this.state, {super.key});
  final FinanceSnapshot state;
  @override
  ConsumerState<ActivityScreen> createState() => _ActivityScreenState();
}

class _ActivityScreenState extends ConsumerState<ActivityScreen> {
  String _query = '', _type = 'all';
  @override
  Widget build(BuildContext context) {
    final all = widget.state
        .transactions(ref.watch(spaceProvider), ref.watch(monthProvider));
    final transactions = all
        .where((r) =>
            (_type == 'all' || r.text('type') == _type) &&
            '${r.text('note')} ${r.text('category')} ${widget.state.find(r.text('account'))?.text('name')}'
                .toLowerCase()
                .contains(_query.toLowerCase()))
        .toList();
    return CustomScrollView(slivers: [
      SliverPadding(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 16),
          sliver: SliverToBoxAdapter(
              child: Column(children: [
            TextField(
                decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.search),
                    hintText:
                        tr(ref, 'Search your transactions', 'লেনদেন খুঁজুন')),
                onChanged: (value) => setState(() => _query = value)),
            const SizedBox(height: 16),
            SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(children: [
                  for (final pair in {
                    'all': 'All',
                    'expense': 'Expenses',
                    'income': 'Income',
                    'transfer': 'Transfers'
                  }.entries)
                    Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                            label: Text(pair.value),
                            selected: _type == pair.key,
                            onSelected: (_) =>
                                setState(() => _type = pair.key))),
                ])),
            const SizedBox(height: 12),
            Align(
                alignment: Alignment.centerLeft,
                child: Text('${transactions.length} transactions',
                    style: Theme.of(context).textTheme.bodySmall)),
          ]))),
      if (transactions.isEmpty)
        const SliverPadding(
            padding: EdgeInsets.all(24),
            sliver: SliverToBoxAdapter(
                child: EmptyState('Nothing here yet',
                    'Try another month or filter, or add a transaction.')))
      else
        SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            sliver: SliverList.builder(
                itemCount: transactions.length,
                itemBuilder: (context, index) {
                  final r = transactions[index];
                  final newDay = index == 0 ||
                      transactions[index - 1].text('date') != r.text('date');
                  return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (newDay)
                          Padding(
                              padding:
                                  const EdgeInsets.only(top: 18, bottom: 8),
                              child: Text(r.text('date'),
                                  style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600))),
                        TransactionTile(r, widget.state,
                            space: ref.watch(spaceProvider),
                            hidden: ref.watch(privacyProvider),
                            onTap: () => transactionDetails(
                                context, ref, r, widget.state)),
                        const Divider(height: 1),
                      ]);
                })),
      const SliverToBoxAdapter(child: SizedBox(height: 110)),
    ]);
  }
}

Future<void> transactionDetails(BuildContext context, WidgetRef ref,
    Record record, FinanceSnapshot state) async {
  final action = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) => SafeArea(
          child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(record.text('type').toUpperCase(),
                        style: Theme.of(context).textTheme.labelMedium),
                    const SizedBox(height: 10),
                    Text(money(record.number('amount')),
                        style: Theme.of(context).textTheme.headlineLarge),
                    const SizedBox(height: 20),
                    Text(
                        '${record.text('date')} · ${record.text('category', 'Transfer')}'),
                    const SizedBox(height: 8),
                    Text(
                        'Account: ${state.find(record.text('account'))?.text('name')}'),
                    if (record.text('type') == 'transfer')
                      Text(
                          'To: ${state.find(record.text('destination'))?.text('name')}'),
                    if (record.text('note').isNotEmpty)
                      Padding(
                          padding: const EdgeInsets.only(top: 12),
                          child: Text(record.text('note'))),
                    if (record.data['receipt'] != null)
                      Padding(
                          padding: const EdgeInsets.only(top: 20),
                          child: Image.memory(
                              base64Decode(record.data['receipt']['bytes']),
                              height: 260,
                              fit: BoxFit.contain,
                              errorBuilder: (_, __, ___) =>
                                  const Text('Receipt preview unavailable'))),
                    const SizedBox(height: 24),
                    if (record.text('type') != 'reversal' &&
                        !state.isReversed(record) &&
                        record.text('bill').isEmpty &&
                        record.text('loan').isEmpty) ...[
                      ListTile(
                          leading: const Icon(Icons.edit_outlined),
                          title: const Text('Edit transaction'),
                          onTap: () => Navigator.pop(context, 'edit')),
                      ListTile(
                          leading:
                              const Icon(Icons.delete_outline, color: rust),
                          title: const Text('Delete transaction'),
                          onTap: () => Navigator.pop(context, 'delete')),
                    ] else
                      const Text(
                          'This entry is protected to preserve payment and correction history.'),
                    ListTile(
                        enabled: record.text('type') != 'reversal' &&
                            !state.isReversed(record) &&
                            state.isPosted(record),
                        leading: const Icon(Icons.undo),
                        title: Text(state.isReversed(record)
                            ? 'Already reversed'
                            : 'Reverse with a correction entry'),
                        subtitle: const Text(
                            'Keeps the original and restores its account movement'),
                        onTap: () => Navigator.pop(context, 'reverse')),
                    ListTile(
                        leading: const Icon(Icons.history),
                        title: const Text('Change history'),
                        onTap: () => Navigator.pop(context, 'history')),
                  ]))));
  if (!context.mounted) return;
  if (action == 'reverse') {
    var reason = '';
    final accepted = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
                title: const Text('Reverse this transaction?'),
                content: TextField(
                    autofocus: true,
                    maxLength: 300,
                    decoration:
                        const InputDecoration(labelText: 'Correction reason'),
                    onChanged: (v) => reason = v),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(context, false),
                      child: const Text('Cancel')),
                  FilledButton(
                      onPressed: () => Navigator.pop(context, true),
                      child: const Text('Reverse'))
                ]));
    if (accepted == true) {
      try {
        await (await ref.read(repositoryProvider.future))
            .reverse(record, reason);
      } catch (e) {
        if (context.mounted) feedbackMessage(context, e);
      }
    }
  }
  if (!context.mounted) return;
  if (action == 'edit') {
    await openEditor(context, 'transaction', record: record);
  }
  if (!context.mounted) return;
  if (action == 'delete') {
    if (!await confirm(context, 'Delete transaction?',
        'Your account balance will be recalculated. A copy remains in local change history.',
        action: 'Delete')) return;
    try {
      await (await ref.read(repositoryProvider.future)).remove(record);
    } catch (e) {
      if (context.mounted) feedbackMessage(context, e);
    }
  }
  if (action == 'history') {
    final history =
        await (await ref.read(repositoryProvider.future)).history(record.id);
    if (!context.mounted) return;
    await showModalBottomSheet<void>(
        context: context,
        showDragHandle: true,
        builder: (context) => SafeArea(
                child: ListView(
                    shrinkWrap: true,
                    padding: const EdgeInsets.all(24),
                    children: [
                  Text('Previous versions',
                      style: Theme.of(context).textTheme.titleLarge),
                  if (history.isEmpty)
                    const Padding(
                        padding: EdgeInsets.symmetric(vertical: 24),
                        child: Text('No edits have been made.')),
                  ...history.map((h) => ListTile(
                      title: Text(money((h['data']['amount'] as int?) ?? 0)),
                      subtitle: Text(h['at'] as String))),
                ])));
  }
}
