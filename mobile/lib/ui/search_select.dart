import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

const createSelection = '__create_selection__';

class SelectOption {
  const SelectOption(this.value, this.label, {this.subtitle, this.icon});
  final String value, label;
  final String? subtitle;
  final IconData? icon;
  factory SelectOption.fromLabel(String value, String text) {
    final parts = text.split(' · ');
    return SelectOption(value, parts.first,
        subtitle: parts.length > 1 ? parts.skip(1).join(' · ') : null);
  }
}

Future<String?> showSearchPicker(BuildContext context,
    {required String title,
    required List<SelectOption> options,
    String? selected,
    String? actionLabel,
    IconData actionIcon = Icons.add}) {
  final desktop = MediaQuery.sizeOf(context).width >= 600;
  Widget body(BuildContext context) {
    final media = MediaQuery.of(context);
    final height = math.min(640.0,
        math.max(180.0, media.size.height - media.viewInsets.bottom - 100));
    final picker = SizedBox(
        width: 520,
        height: height,
        child: _SearchPicker(
            title: title,
            options: options,
            selected: selected,
            actionLabel: actionLabel,
            actionIcon: actionIcon));
    return desktop
        ? Dialog(
            clipBehavior: Clip.antiAlias,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
            child: picker)
        : Padding(
            padding: EdgeInsets.only(bottom: media.viewInsets.bottom),
            child: picker);
  }

  return desktop
      ? showDialog<String>(context: context, builder: body)
      : showModalBottomSheet<String>(
          context: context,
          isScrollControlled: true,
          useSafeArea: true,
          showDragHandle: true,
          builder: body);
}

class _SearchPicker extends StatefulWidget {
  const _SearchPicker(
      {required this.title,
      required this.options,
      this.selected,
      this.actionLabel,
      required this.actionIcon});
  final String title;
  final List<SelectOption> options;
  final String? selected, actionLabel;
  final IconData actionIcon;
  @override
  State<_SearchPicker> createState() => _SearchPickerState();
}

class _SearchPickerState extends State<_SearchPicker> {
  final _search = TextEditingController();
  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final query = _search.text.trim().toLowerCase();
    final filtered = widget.options
        .where((option) => '${option.label} ${option.subtitle ?? ''}'
            .toLowerCase()
            .contains(query))
        .toList();
    return CallbackShortcuts(
        bindings: {
          const SingleActivator(LogicalKeyboardKey.escape): () =>
              Navigator.pop(context)
        },
        child:
            Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Padding(
              padding: const EdgeInsets.fromLTRB(24, 18, 12, 12),
              child: Row(children: [
                Expanded(
                    child: Text(widget.title,
                        style: Theme.of(context).textTheme.titleLarge)),
                IconButton(
                    tooltip: 'Close selection',
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close)),
              ])),
          Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: TextField(
                  key: const ValueKey('picker-search'),
                  controller: _search,
                  autofocus: true,
                  onChanged: (_) => setState(() {}),
                  onSubmitted: (_) {
                    if (filtered.length == 1) {
                      Navigator.pop(context, filtered.single.value);
                    }
                  },
                  decoration: InputDecoration(
                      hintText: 'Search ${widget.title.toLowerCase()}…',
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: query.isEmpty
                          ? null
                          : IconButton(
                              tooltip: 'Clear search',
                              icon: const Icon(Icons.close, size: 18),
                              onPressed: () => setState(_search.clear))))),
          Padding(
              padding: const EdgeInsets.fromLTRB(24, 12, 24, 6),
              child: Text(
                  '${filtered.length} ${filtered.length == 1 ? 'option' : 'options'}',
                  style: Theme.of(context).textTheme.bodySmall)),
          Expanded(
              child: filtered.isEmpty
                  ? Center(
                      child: Padding(
                          padding: const EdgeInsets.all(24),
                          child:
                              Column(mainAxisSize: MainAxisSize.min, children: [
                            const Icon(Icons.search_off, size: 32),
                            const SizedBox(height: 12),
                            Text(query.isEmpty
                                ? 'No options yet'
                                : 'No matching results'),
                            const SizedBox(height: 6),
                            const Text('Try another name or create a new one.',
                                textAlign: TextAlign.center)
                          ])))
                  : ListView.separated(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      itemCount: filtered.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 4),
                      itemBuilder: (context, index) {
                        final option = filtered[index];
                        final selected = option.value == widget.selected;
                        return ListTile(
                            key: ValueKey('option-${option.value}'),
                            selected: selected,
                            selectedTileColor: Theme.of(context)
                                .colorScheme
                                .primaryContainer
                                .withOpacity(.45),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14)),
                            leading:
                                option.icon == null ? null : Icon(option.icon),
                            title: Text(option.label,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600)),
                            subtitle: option.subtitle == null
                                ? null
                                : Text(option.subtitle!),
                            trailing: selected
                                ? Icon(Icons.check_circle,
                                    color:
                                        Theme.of(context).colorScheme.primary)
                                : const Icon(Icons.circle_outlined, size: 20),
                            onTap: () => Navigator.pop(context, option.value));
                      })),
          if (widget.actionLabel != null) ...[
            const Divider(height: 1),
            Padding(
                padding: const EdgeInsets.all(16),
                child: OutlinedButton.icon(
                    onPressed: () => Navigator.pop(context, createSelection),
                    icon: Icon(widget.actionIcon),
                    label: Text(widget.actionLabel!)))
          ],
          const SizedBox(height: 8),
        ]));
  }
}

class SearchSelectField extends StatelessWidget {
  const SearchSelectField(
      {super.key,
      required this.label,
      required this.value,
      required this.choices,
      required this.onChanged,
      this.enabled = true,
      this.actionLabel,
      this.onCreate,
      this.icon});
  final String label, value;
  final Map<String, String> choices;
  final ValueChanged<String> onChanged;
  final bool enabled;
  final String? actionLabel;
  final Future<String?> Function()? onCreate;
  final IconData? icon;
  @override
  Widget build(BuildContext context) => FormField<String>(
      key: ValueKey('$label:$value'),
      initialValue: choices.containsKey(value) ? value : null,
      validator: (v) => v == null || !choices.containsKey(v)
          ? 'Select ${label.toLowerCase()}'
          : null,
      builder: (field) => Semantics(
          button: true,
          label: label,
          child: InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: !enabled
                  ? null
                  : () async {
                      FocusScope.of(context).unfocus();
                      var result = await showSearchPicker(context,
                          title: label,
                          selected: value,
                          options: choices.entries
                              .map(
                                  (e) => SelectOption.fromLabel(e.key, e.value))
                              .toList(),
                          actionLabel: onCreate == null ? null : actionLabel);
                      if (result == createSelection) {
                        result = await onCreate?.call();
                      }
                      if (result != null &&
                          context.mounted &&
                          result != createSelection) {
                        field.didChange(result);
                        onChanged(result);
                      }
                    },
              child: InputDecorator(
                  isEmpty: field.value == null,
                  decoration: InputDecoration(
                      labelText: label,
                      errorText: field.errorText,
                      enabled: enabled,
                      prefixIcon: icon == null ? null : Icon(icon),
                      suffixIcon:
                          const Icon(Icons.unfold_more_rounded, size: 20)),
                  child: Text(choices[field.value] ?? 'Search and select',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          color: field.value == null
                              ? Theme.of(context).hintColor
                              : null))))));
}
