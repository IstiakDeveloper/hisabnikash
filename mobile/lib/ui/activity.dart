import 'localization.dart';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../app/providers.dart';
import '../core/models.dart';
import '../core/money.dart';
import '../core/repository.dart';
import 'design.dart';
import 'editors.dart';
import 'finance_center.dart';

class ActivityScreen extends ConsumerStatefulWidget {
  const ActivityScreen(this.state, {super.key});
  final FinanceSnapshot state;
  @override
  ConsumerState<ActivityScreen> createState() => _ActivityScreenState();
}

class _ActivityScreenState extends ConsumerState<ActivityScreen> {
  String _query = '', _type = 'all';
  String _account = 'all',
      _category = 'all',
      _sort = 'newest',
      _from = '',
      _to = '';
  @override
  Widget build(BuildContext context) {
    final all = widget.state
        .transactions(ref.watch(spaceProvider), ref.watch(monthProvider));
    final transactions = all
        .where((r) =>
            (_type == 'all' || r.text('type') == _type) &&
            (_account == 'all' ||
                r.text('account') == _account ||
                r.text('destination') == _account) &&
            (_category == 'all' ||
                widget.state.expenseParts(r).containsKey(_category) ||
                r.text('category') == _category) &&
            (_from.isEmpty || r.text('date').compareTo(_from) >= 0) &&
            (_to.isEmpty || r.text('date').compareTo(_to) <= 0) &&
            '${r.text('note')} ${r.text('category')} ${widget.state.find(r.text('account'))?.text('name')}'
                .toLowerCase()
                .contains(_query.toLowerCase()))
        .toList();
    if (_sort == 'oldest') {
      transactions.sort((a, b) => a.text('date').compareTo(b.text('date')));
    }
    if (_sort == 'amount') {
      transactions
          .sort((a, b) => b.number('amount').compareTo(a.number('amount')));
    }
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
            Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                    icon: const Icon(Icons.filter_list),
                    label: LText(tr(ref, 'Filter and sort', 'ফিল্টার ও সাজান')),
                    onPressed: () async {
                      final month = ref.read(monthProvider);
                      final data = await financeForm(context,
                          tr(ref, 'Filter transactions', 'লেনদেনের ফিল্টার'), [
                        FormFieldSpec(
                            'account', tr(ref, 'Account', 'অ্যাকাউন্ট'),
                            initial: _account,
                            choices: {
                              'all': tr(ref, 'All accounts', 'সব অ্যাকাউন্ট'),
                              for (final a in widget.state.of('account'))
                                a.id: a.text('name')
                            }),
                        FormFieldSpec(
                            'category', tr(ref, 'Category', 'ক্যাটাগরি'),
                            initial: _category,
                            choices: {
                              'all': tr(ref, 'All categories', 'সব ক্যাটাগরি'),
                              for (final c in {
                                ...expenseCategories,
                                ...incomeCategories,
                                ...all.expand(
                                    (r) => widget.state.expenseParts(r).keys)
                              })
                                c: c
                            }),
                        FormFieldSpec(
                            'from', tr(ref, 'From date', 'শুরুর তারিখ'),
                            kind: 'date',
                            initial: _from.isEmpty ? dayKey(month) : _from),
                        FormFieldSpec('to', tr(ref, 'To date', 'শেষ তারিখ'),
                            kind: 'date',
                            initial: _to.isEmpty
                                ? dayKey(
                                    DateTime(month.year, month.month + 1, 0))
                                : _to),
                        FormFieldSpec('sort', tr(ref, 'Sort', 'সাজান'),
                            initial: _sort,
                            choices: {
                              'newest': tr(ref, 'Newest first', 'নতুন আগে'),
                              'oldest': tr(ref, 'Oldest first', 'পুরোনো আগে'),
                              'amount':
                                  tr(ref, 'Largest first', 'বেশি টাকা আগে')
                            })
                      ]);
                      if (data != null && mounted) {
                        setState(() {
                          _account = data['account'];
                          _category = data['category'];
                          _from = data['from'];
                          _to = data['to'];
                          _sort = data['sort'];
                        });
                      }
                    })),
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
                            label: LText(pair.value),
                            selected: _type == pair.key,
                            onSelected: (_) =>
                                setState(() => _type = pair.key))),
                ])),
            const SizedBox(height: 12),
            Align(
                alignment: Alignment.centerLeft,
                child: LText('${transactions.length} transactions',
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
                              child: LText(r.text('date'),
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
                    LText(record.text('type').toUpperCase(),
                        style: Theme.of(context).textTheme.labelMedium),
                    const SizedBox(height: 10),
                    LText(
                        ref.watch(privacyProvider)
                            ? '••••'
                            : money(record.number('amount')),
                        style: Theme.of(context).textTheme.headlineLarge),
                    const SizedBox(height: 20),
                    LText(
                        '${record.text('date')} · ${record.text('category', 'Transfer')}'),
                    const SizedBox(height: 8),
                    LText(
                        'Account: ${state.find(record.text('account'))?.text('name')}'),
                    if (record.text('type') == 'transfer')
                      LText(
                          'To: ${state.find(record.text('destination'))?.text('name')}'),
                    if (record.text('note').isNotEmpty)
                      Padding(
                          padding: const EdgeInsets.only(top: 12),
                          child: Text(record.text('note'))),
                    if (record.data['receipt'] != null &&
                        !ref.watch(privacyProvider))
                      Padding(
                          padding: const EdgeInsets.only(top: 20),
                          child: Image.memory(
                              base64Decode(record.data['receipt']['bytes']),
                              height: 260,
                              fit: BoxFit.contain,
                              errorBuilder: (_, __, ___) =>
                                  const LText('Receipt preview unavailable'))),
                    const SizedBox(height: 24),
                    if (record.text('type') != 'reversal' &&
                        record.text('type') != 'refund' &&
                        !record.flag('adjustment') &&
                        record.text('invoice').isEmpty &&
                        record.text('expectation').isEmpty &&
                        !state
                            .of('transaction')
                            .any((r) => r.text('refundOf') == record.id) &&
                        !state.isReversed(record) &&
                        record.text('bill').isEmpty &&
                        record.text('loan').isEmpty) ...[
                      ListTile(
                          leading: const Icon(Icons.edit_outlined),
                          title: const LText('Edit transaction'),
                          onTap: () => Navigator.pop(context, 'edit')),
                      ListTile(
                          leading:
                              const Icon(Icons.delete_outline, color: rust),
                          title: const LText('Delete transaction'),
                          onTap: () => Navigator.pop(context, 'delete')),
                    ] else
                      const LText(
                          'This entry is protected to preserve payment and correction history.'),
                    ListTile(
                        enabled: record.text('type') != 'reversal' &&
                            !state.isReversed(record) &&
                            state.isPosted(record),
                        leading: const Icon(Icons.undo),
                        title: LText(state.isReversed(record)
                            ? 'Already reversed'
                            : 'Reverse with a correction entry'),
                        subtitle: const LText(
                            'Keeps the original and restores its account movement'),
                        onTap: () => Navigator.pop(context, 'reverse')),
                    ListTile(
                        leading: const Icon(Icons.copy_outlined),
                        title: LText(tr(ref, 'Copy as new transaction',
                            'নতুন লেনদেন হিসেবে কপি')),
                        onTap: () => Navigator.pop(context, 'copy')),
                    ListTile(
                        leading: const Icon(Icons.star_border),
                        title: LText(tr(
                            ref,
                            'Use account and category as defaults',
                            'অ্যাকাউন্ট ও ক্যাটাগরি পছন্দ হিসেবে রাখুন')),
                        onTap: () => Navigator.pop(context, 'favorite')),
                    if ({'income', 'expense', 'transfer'}
                            .contains(record.text('type')) &&
                        !record.flag('adjustment') &&
                        ['bill', 'loan', 'invoice', 'expectation']
                            .every((f) => record.text(f).isEmpty))
                      ListTile(
                          leading: const Icon(Icons.bolt),
                          title: LText(tr(ref, 'Save as quick template',
                              'দ্রুত এন্ট্রির জন্য রাখুন')),
                          onTap: () => Navigator.pop(context, 'template')),
                    if (record.text('type') == 'expense' &&
                        !state.isReversed(record) &&
                        !record.flag('adjustment') &&
                        record.text('bill').isEmpty &&
                        record.text('invoice').isEmpty)
                      ListTile(
                          leading: const Icon(Icons.keyboard_return),
                          title: LText(tr(
                              ref, 'Record a refund', 'ফেরত পাওয়া টাকা লিখুন')),
                          onTap: () => Navigator.pop(context, 'refund')),
                    ListTile(
                        leading: const Icon(Icons.history),
                        title: const LText('Change history'),
                        onTap: () => Navigator.pop(context, 'history')),
                  ]))));
  if (!context.mounted) return;
  if (action == 'favorite') {
    final repository = await ref.read(repositoryProvider.future),
        favorites = await (await ref.read(repositoryProvider.future))
            .privateData('favorites');
    await repository.writePrivate('favorites', {
      ...favorites,
      'account:${record.text('space')}': record.text('account'),
      'category:${record.text('space')}:${record.text('type')}':
          record.text('category')
    });
    return;
  }
  if (action == 'copy') {
    await openEditor(context, 'transaction', initialData: {
      'space': record.text('space'),
      'account': record.text('account'),
      'type': {'income', 'expense', 'transfer'}.contains(record.text('type'))
          ? record.text('type')
          : 'expense',
      'destination': record.text('destination'),
      'amount': record.number('amount'),
      'category': record.text('category'),
      'date': dayKey(financeNow()),
      'note': record.text('note'),
      'fee': record.number('fee'),
      if (record.data['splits'] != null) 'splits': record.data['splits']
    });
    return;
  }
  if (action == 'template') {
    final input = await financeForm(
        context,
        tr(ref, 'Quick template', 'দ্রুত এন্ট্রি'),
        [FormFieldSpec('name', tr(ref, 'Template name', 'নাম'))]);
    if (input == null) return;
    try {
      await (await ref.read(repositoryProvider.future)).save('template', {
        'space': record.text('space'),
        'name': input['name'],
        'transaction': record.data
      });
    } catch (e) {
      if (context.mounted) feedbackMessage(context, e);
    }
    return;
  }
  if (action == 'refund') {
    final account = await chooseAccount(context, state, record.text('space'));
    if (account == null || !context.mounted) return;
    final input = await financeForm(
        context, tr(ref, 'Record refund', 'ফেরত টাকা লিখুন'), [
      FormFieldSpec('amount', tr(ref, 'Amount', 'টাকা'), kind: 'money'),
      FormFieldSpec('reason', tr(ref, 'Reason', 'কারণ'))
    ]);
    if (input == null) return;
    try {
      await (await ref.read(repositoryProvider.future))
          .refund(record, account, input['amount'], input['reason']);
    } catch (e) {
      if (context.mounted) feedbackMessage(context, e);
    }
    return;
  }
  if (action == 'reverse') {
    var reason = '';
    final accepted = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
                title: const LText('Reverse this transaction?'),
                content: TextField(
                    autofocus: true,
                    maxLength: 300,
                    decoration: InputDecoration(
                        labelText: localText(context, 'Correction reason')),
                    onChanged: (v) => reason = v),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(context, false),
                      child: const LText('Cancel')),
                  FilledButton(
                      onPressed: () => Navigator.pop(context, true),
                      child: const LText('Reverse'))
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
                  LText('Previous versions',
                      style: Theme.of(context).textTheme.titleLarge),
                  if (history.isEmpty)
                    const Padding(
                        padding: EdgeInsets.symmetric(vertical: 24),
                        child: LText('No edits have been made.')),
                  ...history.map((h) => ListTile(
                      title: LText(money((h['data']['amount'] as int?) ?? 0)),
                      subtitle: LText(h['at'] as String))),
                ])));
  }
}
