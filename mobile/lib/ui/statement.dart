import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../app/providers.dart';
import '../core/money.dart';
import 'activity.dart';
import 'design.dart';

class AccountStatement extends ConsumerWidget {
  const AccountStatement(this.accountId, {super.key});
  final String accountId;
  @override
  Widget build(BuildContext context, WidgetRef ref) => Scaffold(
      appBar: AppBar(title: const Text('Account statement')),
      body: ref.watch(snapshotProvider).when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(child: Text(e.toString())),
          data: (state) {
            final account = state.find(accountId);
            if (account == null) {
              return const Center(child: Text('This account was removed.'));
            }
            final lines = state.statement(account);
            final hidden = ref.watch(privacyProvider);
            String amount(int value) => hidden ? '••••' : money(value);
            return ListView.builder(
                padding: const EdgeInsets.all(24),
                itemCount: lines.length + 2,
                itemBuilder: (context, index) {
                  if (index == 0) {
                    return Surface(
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                          Text(account.text('name'),
                              style: Theme.of(context).textTheme.titleLarge),
                          const SizedBox(height: 12),
                          Text(amount(state.balance(account)),
                              style:
                                  Theme.of(context).textTheme.headlineMedium),
                          const Text(
                              'Current balance · posted transactions only'),
                          const SizedBox(height: 12),
                          Text(
                              'Opening balance: ${amount(account.number('opening'))}'),
                        ]));
                  }
                  if (index == 1) {
                    return const Padding(
                        padding: EdgeInsets.symmetric(vertical: 20),
                        child: Text(
                            'Date order · running balance after each entry'));
                  }
                  final line = lines[index - 2], transaction = line.record;
                  return ListTile(
                      contentPadding: const EdgeInsets.symmetric(vertical: 8),
                      title: Text(transaction.text('note').isEmpty
                          ? (state.effectiveType(transaction) == 'transfer'
                              ? 'Transfer'
                              : state.categoryName(transaction))
                          : transaction.text('note')),
                      subtitle: Text(
                          '${transaction.text('date')} · ${transaction.text('type')}'),
                      trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                                '${!hidden && line.movement > 0 ? '+' : ''}${amount(line.movement)}',
                                style: TextStyle(
                                    color: line.movement >= 0 ? forest : rust)),
                            Text('Balance ${amount(line.balance)}',
                                style: Theme.of(context).textTheme.bodySmall),
                          ]),
                      onTap: () =>
                          transactionDetails(context, ref, transaction, state));
                });
          }));
}
