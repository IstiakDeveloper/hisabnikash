import 'localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../app/providers.dart';
import '../core/models.dart';
import '../core/money.dart';
import 'design.dart';
import 'brand.dart';
import 'editors.dart';
import 'search_select.dart';

Future<void> openSpaces(BuildContext context) => Navigator.push(
    context, MaterialPageRoute(builder: (_) => const SpacesScreen()));

Future<void> switchSpace(
    BuildContext context, WidgetRef ref, FinanceSnapshot state) async {
  final hidden = ref.read(privacyProvider);
  final selected = await showSearchPicker(context,
      title: 'Switch space',
      selected: ref.read(spaceProvider),
      actionLabel: 'Manage spaces',
      actionIcon: Icons.workspaces_outline,
      options: [
        const SelectOption('all', 'All spaces',
            subtitle: 'Combined overview', icon: Icons.layers_outlined),
        ...state.of('space').map((r) => SelectOption(r.id, r.text('name'),
            subtitle:
                '${r.text('type', 'personal') == 'business' ? 'Business' : 'Personal'} · ${hidden ? '••••' : money(state.spaceBalance(r.id))}',
            icon: r.text('type') == 'business'
                ? Icons.storefront_outlined
                : Icons.person_outline))
      ]);
  if (!context.mounted) return;
  if (selected == createSelection) {
    await openSpaces(context);
  } else if (selected != null) {
    await selectSpace(ref, selected);
  }
}

class SpacesScreen extends ConsumerStatefulWidget {
  const SpacesScreen({super.key});
  @override
  ConsumerState<SpacesScreen> createState() => _SpacesScreenState();
}

class _SpacesScreenState extends ConsumerState<SpacesScreen> {
  String _query = '';
  bool _busy = false;
  Future<void> _open(String id) async {
    await selectSpace(ref, id);
    ref.read(navigationProvider.notifier).state = 0;
    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: const LText('Spaces'), actions: [
        Padding(
            padding: const EdgeInsets.only(right: 16),
            child: IconButton.filledTonal(
                tooltip: localText(context, 'Create space'),
                onPressed: () => openEditor(context, 'space'),
                icon: const Icon(Icons.add)))
      ]),
      body: ref.watch(snapshotProvider).when(
          loading: () => const VaultSkeleton(),
          error: (_, __) =>
              const Center(child: LText('Could not load spaces.')),
          data: (state) {
            final month = ref.watch(monthProvider),
                hidden = ref.watch(privacyProvider);
            final spaces = state
                .of('space')
                .where((r) => '${r.text('name')} ${r.text('type')}'
                    .toLowerCase()
                    .contains(_query.toLowerCase()))
                .toList();
            String display(int amount) => hidden ? '••••' : money(amount);
            return Center(
                child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 1000),
                    child:
                        ListView(padding: const EdgeInsets.all(24), children: [
                      LText('A clear home for every part of your life.',
                          style: Theme.of(context).textTheme.headlineMedium),
                      const SizedBox(height: 12),
                      const LText(
                          'Keep personal and business money separate. Switch spaces without losing the bigger picture.'),
                      const SizedBox(height: 24),
                      InkWell(
                          borderRadius: BorderRadius.circular(24),
                          onTap: () => _open('all'),
                          child: Container(
                              padding: const EdgeInsets.all(24),
                              decoration: BoxDecoration(
                                  color: forest,
                                  borderRadius: BorderRadius.circular(24)),
                              child: Row(children: [
                                const Icon(Icons.layers_outlined,
                                    size: 34, color: Colors.white),
                                const SizedBox(width: 18),
                                Expanded(
                                    child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                      const LText('All spaces',
                                          style: TextStyle(
                                              color: Colors.white,
                                              fontWeight: FontWeight.w700)),
                                      const SizedBox(height: 6),
                                      FittedBox(
                                          fit: BoxFit.scaleDown,
                                          child: LText(
                                              display(
                                                  state.spaceBalance('all')),
                                              style: const TextStyle(
                                                  color: Colors.white,
                                                  fontSize: 28,
                                                  fontWeight:
                                                      FontWeight.w700))),
                                      LText(
                                          '${state.of('space').length} spaces · ${state.of('account').length} accounts · balance today',
                                          style: const TextStyle(
                                              color: Color(0xFFC4DCD0),
                                              fontSize: 12)),
                                    ])),
                                const Icon(Icons.arrow_forward,
                                    color: Colors.white)
                              ]))),
                      const SizedBox(height: 24),
                      TextField(
                          key: const ValueKey('spaces-search'),
                          onChanged: (v) => setState(() => _query = v),
                          decoration: InputDecoration(
                              prefixIcon: const Icon(Icons.search),
                              hintText: localText(context,
                                  'Search personal or business spaces'))),
                      const SizedBox(height: 20),
                      if (spaces.isEmpty)
                        const EmptyState('No matching spaces',
                            'Try another name, or create a new space using the + button.'),
                      ...spaces.map((space) {
                        final accounts = state
                            .of('account')
                            .where((a) => a.text('space') == space.id)
                            .toList();
                        final business = space.text('type') == 'business';
                        final selected = ref.watch(spaceProvider) == space.id;
                        return Padding(
                            padding: const EdgeInsets.only(bottom: 16),
                            child: Surface(
                                child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                  Row(children: [
                                    CircleAvatar(
                                        backgroundColor: Theme.of(context)
                                            .colorScheme
                                            .primaryContainer,
                                        child: Icon(business
                                            ? Icons.storefront_outlined
                                            : Icons.person_outline)),
                                    const SizedBox(width: 14),
                                    Expanded(
                                        child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                          Text(space.text('name'),
                                              style: Theme.of(context)
                                                  .textTheme
                                                  .titleLarge),
                                          LText(
                                              '${business ? 'Business' : 'Personal'}${selected ? ' · Active' : ''}',
                                              style: Theme.of(context)
                                                  .textTheme
                                                  .bodySmall)
                                        ])),
                                    PopupMenuButton<String>(
                                        tooltip: localText(context,
                                            'Manage ${space.text('name')}'),
                                        onSelected: (action) async {
                                          if (action == 'edit') {
                                            await openEditor(context, 'space',
                                                record: space);
                                            return;
                                          }
                                          if (_busy ||
                                              !await confirm(
                                                  context,
                                                  'Delete empty space?',
                                                  'A space containing accounts or other records cannot be deleted.',
                                                  action: 'Delete')) return;
                                          setState(() => _busy = true);
                                          try {
                                            await (await ref.read(
                                                    repositoryProvider.future))
                                                .remove(space);
                                            if (ref.read(spaceProvider) ==
                                                space.id) {
                                              ref
                                                  .read(spaceProvider.notifier)
                                                  .state = 'all';
                                            }
                                          } catch (e) {
                                            if (context.mounted) {
                                              feedbackMessage(context, e);
                                            }
                                          } finally {
                                            if (mounted) {
                                              setState(() => _busy = false);
                                            }
                                          }
                                        },
                                        itemBuilder: (_) => [
                                              const PopupMenuItem(
                                                  value: 'edit',
                                                  child: LText('Edit space')),
                                              const PopupMenuItem(
                                                  value: 'delete',
                                                  child: LText(
                                                      'Delete empty space'))
                                            ]),
                                  ]),
                                  const SizedBox(height: 22),
                                  LText('BALANCE TODAY',
                                      style: Theme.of(context)
                                          .textTheme
                                          .labelSmall
                                          ?.copyWith(letterSpacing: 1.2)),
                                  const SizedBox(height: 6),
                                  LText(display(state.spaceBalance(space.id)),
                                      style: Theme.of(context)
                                          .textTheme
                                          .headlineMedium),
                                  const SizedBox(height: 8),
                                  LText(
                                      accounts.isEmpty
                                          ? 'No accounts yet — add your first one below.'
                                          : accounts
                                              .map((a) => a.text('name'))
                                              .join(' · '),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall),
                                  const SizedBox(height: 20),
                                  Row(children: [
                                    Expanded(
                                        child: _metric(
                                            context,
                                            'Income this month',
                                            display(state.total(
                                                space.id, month, 'income')))),
                                    Expanded(
                                        child: _metric(
                                            context,
                                            'Expenses this month',
                                            display(state.total(
                                                space.id, month, 'expense'))))
                                  ]),
                                  const SizedBox(height: 20),
                                  Wrap(spacing: 10, runSpacing: 8, children: [
                                    FilledButton.tonalIcon(
                                        key: ValueKey('open-space-${space.id}'),
                                        onPressed: () => _open(space.id),
                                        icon: const Icon(Icons.arrow_forward,
                                            size: 18),
                                        label: const LText('Open space')),
                                    TextButton.icon(
                                        key:
                                            ValueKey('add-account-${space.id}'),
                                        onPressed: () => openEditor(
                                            context, 'account',
                                            initialSpace: space.id),
                                        icon: const Icon(Icons.add, size: 18),
                                        label: const LText('Add account')),
                                  ]),
                                ])));
                      }),
                    ])));
          }));
  Widget _metric(BuildContext context, String label, String amount) =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        LText(label, style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: 6),
        LText(amount, style: Theme.of(context).textTheme.titleMedium)
      ]);
}
