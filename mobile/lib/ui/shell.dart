import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../app/providers.dart';
import '../core/models.dart';
import 'dashboard.dart';
import 'activity.dart';
import 'plans.dart';
import 'insights.dart';
import 'settings.dart';
import 'editors.dart';
import 'design.dart';
import 'spaces.dart';

class AppShell extends ConsumerWidget {
  const AppShell({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(snapshotProvider),
        tab = ref.watch(navigationProvider);
    final month = ref.watch(monthProvider), space = ref.watch(spaceProvider);
    final desktop = MediaQuery.sizeOf(context).width >= 1000;
    final labels = [
      tr(ref, 'Home', 'হোম'),
      tr(ref, 'Activity', 'লেনদেন'),
      tr(ref, 'Plan', 'পরিকল্পনা'),
      tr(ref, 'Insights', 'বিশ্লেষণ'),
      tr(ref, 'More', 'আরও')
    ];
    const icons = [
      Icons.grid_view_rounded,
      Icons.swap_vert,
      Icons.donut_small_outlined,
      Icons.bar_chart_rounded,
      Icons.tune
    ];
    final titles = [
      tr(ref, 'Overview', 'এক নজরে'),
      tr(ref, 'Activity', 'লেনদেন'),
      tr(ref, 'Your plan', 'পরিকল্পনা'),
      tr(ref, 'Insights', 'বিশ্লেষণ'),
      tr(ref, 'Settings', 'সেটিংস')
    ];
    void navigate(int value) =>
        ref.read(navigationProvider.notifier).state = value;
    Future<void> addTransaction() async {
      final state = async.valueOrNull;
      if (state == null) return;
      if (!state
          .of('account')
          .any((r) => space == 'all' || r.text('space') == space)) {
        await openEditor(context, 'account',
            initialSpace: space == 'all' ? null : space);
        final fresh =
            await (await ref.read(repositoryProvider.future)).snapshot();
        if (!context.mounted ||
            !fresh
                .of('account')
                .any((r) => space == 'all' || r.text('space') == space)) return;
      }
      if (context.mounted) {
        await openEditor(context, 'transaction',
            initialSpace: space == 'all' ? null : space);
      }
    }

    return Scaffold(
      appBar: AppBar(
          toolbarHeight: 80,
          titleSpacing: 24,
          title:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('HISABNIKASH',
                style: TextStyle(
                    color: Theme.of(context).colorScheme.primary,
                    fontSize: 10,
                    letterSpacing: 2.4,
                    fontWeight: FontWeight.w700)),
            const SizedBox(height: 5),
            Text(titles[tab], style: Theme.of(context).textTheme.headlineMedium)
          ]),
          actions: [
            IconButton(
                tooltip: 'Manage spaces',
                onPressed: () => openSpaces(context),
                icon: const Icon(Icons.workspaces_outline)),
            IconButton(
                tooltip: 'Hide balances',
                onPressed: () => ref.read(privacyProvider.notifier).state =
                    !ref.read(privacyProvider),
                icon: Icon(ref.watch(privacyProvider)
                    ? Icons.visibility_off_outlined
                    : Icons.visibility_outlined)),
            const SizedBox(width: 12)
          ]),
      body: Row(children: [
        if (desktop) ...[
          NavigationRail(
              selectedIndex: tab,
              onDestinationSelected: navigate,
              labelType: NavigationRailLabelType.all,
              leading: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 28),
                  child: FloatingActionButton.small(
                      heroTag: 'desktop-add',
                      tooltip: 'Add transaction',
                      onPressed: addTransaction,
                      child: const Icon(Icons.add))),
              destinations: List.generate(
                  5,
                  (i) => NavigationRailDestination(
                      icon: Icon(icons[i]), label: Text(labels[i])))),
          VerticalDivider(
              width: 1, color: Theme.of(context).dividerColor.withOpacity(.2))
        ],
        Expanded(
            child: async.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (_, __) => Center(
                    child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: EmptyState('Unable to load your vault',
                            'Your saved data has not been changed.',
                            action: TextButton(
                                onPressed: () =>
                                    ref.invalidate(snapshotProvider),
                                child: const Text('Try again'))))),
                data: (state) => Center(
                    child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 1000),
                        child: Column(children: [
                          if (tab != 4)
                            _ContextBar(
                                state: state, space: space, month: month),
                          Expanded(
                              child: switch (tab) {
                            0 =>
                              Dashboard(state, onActivity: () => navigate(1)),
                            1 => ActivityScreen(state),
                            2 => PlansScreen(state),
                            3 => InsightsScreen(state),
                            _ => SettingsScreen(state),
                          }),
                        ]))))),
      ]),
      floatingActionButton: tab < 2
          ? FloatingActionButton.extended(
              onPressed: addTransaction,
              backgroundColor: forest,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add),
              label: Text(tr(ref, 'Add transaction', 'লেনদেন যোগ করুন')))
          : null,
      bottomNavigationBar: desktop
          ? null
          : NavigationBar(
              selectedIndex: tab,
              onDestinationSelected: navigate,
              destinations: List.generate(
                  5,
                  (i) => NavigationDestination(
                      icon: Icon(icons[i]), label: labels[i]))),
    );
  }
}

class _ContextBar extends ConsumerWidget {
  const _ContextBar(
      {required this.state, required this.space, required this.month});
  final FinanceSnapshot state;
  final String space;
  final DateTime month;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final current = state.find(space);
    Widget spaces() => Expanded(
        child: InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: () => switchSpace(context, ref, state),
            child: Padding(
                padding: const EdgeInsets.all(10),
                child: Row(children: [
                  Container(
                      padding: const EdgeInsets.all(9),
                      decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.primaryContainer,
                          borderRadius: BorderRadius.circular(11)),
                      child: Icon(
                          space == 'all'
                              ? Icons.layers_outlined
                              : current?.text('type') == 'business'
                                  ? Icons.storefront_outlined
                                  : Icons.person_outline,
                          size: 20)),
                  const SizedBox(width: 10),
                  Expanded(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                        Text(
                            current?.text('name') ??
                                tr(ref, 'All spaces', 'সব হিসাব'),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 14)),
                        Text(
                            space == 'all'
                                ? 'Combined overview'
                                : current?.text('type') == 'business'
                                    ? 'Business space'
                                    : 'Personal space',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context)
                                .textTheme
                                .bodySmall
                                ?.copyWith(fontSize: 11))
                      ])),
                  const SizedBox(width: 6),
                  const Icon(Icons.expand_more, size: 18),
                ]))));
    Widget months() => Row(mainAxisSize: MainAxisSize.min, children: [
          IconButton(
              tooltip: 'Previous month',
              onPressed: () => ref.read(monthProvider.notifier).state =
                  DateTime(month.year, month.month - 1),
              icon: const Icon(Icons.chevron_left, size: 20)),
          TextButton(
              onPressed: () async {
                final picked = await showDatePicker(
                    context: context,
                    initialDate: month,
                    firstDate: DateTime(2000),
                    lastDate: DateTime(2100),
                    helpText: 'Choose a month');
                if (picked != null) {
                  ref.read(monthProvider.notifier).state =
                      DateTime(picked.year, picked.month);
                }
              },
              child: Text(DateFormat('MMM yyyy').format(month),
                  style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurface,
                      fontWeight: FontWeight.w600))),
          IconButton(
              tooltip: 'Next month',
              onPressed: () => ref.read(monthProvider.notifier).state =
                  DateTime(month.year, month.month + 1),
              icon: const Icon(Icons.chevron_right, size: 20)),
        ]);
    return Container(
        margin: const EdgeInsets.fromLTRB(24, 8, 24, 16),
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
            color: Theme.of(context).cardTheme.color,
            borderRadius: BorderRadius.circular(19),
            border: Border.all(
                color: Theme.of(context).dividerColor.withOpacity(.12))),
        child: LayoutBuilder(
            builder: (context, constraints) => constraints.maxWidth < 330
                ? Column(children: [
                    Row(children: [spaces()]),
                    const Divider(height: 1),
                    months()
                  ])
                : Row(children: [
                    spaces(),
                    Container(
                        height: 32,
                        width: 1,
                        color: Theme.of(context).dividerColor.withOpacity(.15)),
                    months()
                  ])));
  }
}
