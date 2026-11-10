import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../app/providers.dart';
import '../core/models.dart';
import '../core/money.dart';
import 'design.dart';

class InsightsScreen extends ConsumerWidget {
  const InsightsScreen(this.state, {super.key});
  final FinanceSnapshot state;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final space = ref.watch(spaceProvider),
        month = ref.watch(monthProvider),
        hidden = ref.watch(privacyProvider);
    final income = state.total(space, month, 'income'),
        expense = state.total(space, month, 'expense');
    final debtsOut = state.total(space, month, 'debt_payment'),
        debtsIn = state.total(space, month, 'debt_collection');
    final transfersIn = state.transferTotal(space, month, incoming: true);
    final transfersOut = state.transferTotal(space, month, incoming: false);
    var chartMax = 0;
    for (var offset = 0; offset < 6; offset++) {
      final period = DateTime(month.year, month.month - offset);
      for (final type in ['income', 'expense']) {
        final amount = state.total(space, period, type);
        if (amount > chartMax) chartMax = amount;
      }
    }
    final grouped = <String, int>{};
    for (final r in state.transactions(space, month).where(
        (r) => state.effectiveType(r) == 'expense' && state.isPosted(r))) {
      grouped.update(
          state.categoryName(r), (value) => value + state.signedAmount(r),
          ifAbsent: () => state.signedAmount(r));
    }
    grouped.removeWhere((_, amount) => amount == 0);
    final categories = grouped.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    String display(int value) => hidden ? '••••' : money(value);
    return ListView(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
        children: [
          Text(tr(ref, 'See the bigger picture.', 'আপনার টাকার পুরো চিত্র।'),
              style: Theme.of(context).textTheme.bodyLarge),
          const SizedBox(height: 20),
          Surface(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(tr(ref, 'Monthly cash flow', 'মাসের নগদ প্রবাহ'),
                    style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 12),
                Text(display(state.cashFlow(space, month)),
                    style: Theme.of(context).textTheme.headlineLarge),
                const SizedBox(height: 20),
                _row('Income', display(income), forest),
                _row('Expenses', display(expense), rust),
                if (debtsIn != 0)
                  _row('Loan collections', display(debtsIn), forest),
                if (debtsOut != 0)
                  _row('Loan repayments', display(debtsOut), rust),
                if (transfersIn != 0)
                  _row('Transfers from other spaces', display(transfersIn),
                      forest),
                if (transfersOut != 0)
                  _row(
                      'Transfers to other spaces', display(transfersOut), rust),
                const SizedBox(height: 10),
                const Text(
                    'Opening balances and internal transfers are excluded.',
                    style: TextStyle(fontSize: 12)),
              ])),
          SectionTitle(tr(ref, 'Where your money went', 'কোথায় কত খরচ')),
          if (categories.isEmpty)
            const EmptyState('Your story is just beginning',
                'Add expenses to see a category breakdown.',
                icon: Icons.bar_chart_rounded)
          else
            Surface(
                child: Column(
                    children: categories
                        .map((entry) => Padding(
                            padding: const EdgeInsets.only(bottom: 18),
                            child: Column(children: [
                              Row(children: [
                                Icon(categoryIcon(entry.key), size: 18),
                                const SizedBox(width: 10),
                                Expanded(child: Text(entry.key)),
                                Text(display(entry.value),
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w600))
                              ]),
                              const SizedBox(height: 10),
                              ClipRRect(
                                  borderRadius: BorderRadius.circular(6),
                                  child: LinearProgressIndicator(
                                      value: expense > 0
                                          ? (entry.value / expense).clamp(0, 1)
                                          : 0,
                                      minHeight: 6,
                                      backgroundColor: Theme.of(context)
                                          .colorScheme
                                          .primaryContainer)),
                              const SizedBox(height: 5),
                              Align(
                                  alignment: Alignment.centerRight,
                                  child: Text(
                                      expense > 0 && entry.value >= 0
                                          ? '${(entry.value / expense * 100).round()}%'
                                          : 'Net correction',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall)),
                            ])))
                        .toList())),
          SectionTitle(tr(ref, 'The last six months', 'গত ছয় মাস')),
          Surface(
              child: Column(children: [
            for (var offset = 5; offset >= 0; offset--)
              Builder(builder: (context) {
                final period = DateTime(month.year, month.month - offset);
                final incoming = state.total(space, period, 'income'),
                    outgoing = state.total(space, period, 'expense');
                return Padding(
                    padding: const EdgeInsets.only(bottom: 18),
                    child: Row(children: [
                      SizedBox(
                          width: 42,
                          child: Text(DateFormat('MMM').format(period))),
                      Expanded(
                          child: Column(children: [
                        LinearProgressIndicator(
                            value: chartMax == 0
                                ? 0
                                : (incoming / chartMax).clamp(0, 1),
                            minHeight: 7,
                            color: forest,
                            backgroundColor: Theme.of(context)
                                .colorScheme
                                .surfaceContainerHighest),
                        const SizedBox(height: 5),
                        LinearProgressIndicator(
                            value: chartMax == 0
                                ? 0
                                : (outgoing / chartMax).clamp(0, 1),
                            minHeight: 7,
                            color: rust,
                            backgroundColor: Theme.of(context)
                                .colorScheme
                                .surfaceContainerHighest)
                      ])),
                      const SizedBox(width: 12),
                      SizedBox(
                          width: 100,
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(display(incoming),
                                    style: const TextStyle(fontSize: 12)),
                                Text(display(outgoing),
                                    style: const TextStyle(fontSize: 12))
                              ])),
                    ]));
              }),
            const Text(
                'Top: income · Bottom: expenses\nAll months use the same scale. Scheduled entries are excluded.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12)),
          ])),
        ]);
  }

  Widget _row(String name, String value, Color color) => Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(children: [
        Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 10),
        Expanded(child: Text(name)),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
      ]));
}
