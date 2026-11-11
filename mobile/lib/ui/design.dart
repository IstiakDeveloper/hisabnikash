import 'package:flutter/material.dart';
import '../core/models.dart';
import '../core/money.dart';

const forest = Color(0xFF123F36);
const mint = Color(0xFFE5EEE7);
const rust = Color(0xFFBC5C46);
const ink = Color(0xFF202D28);

ThemeData appTheme(bool dark) {
  final scheme = ColorScheme.fromSeed(
      seedColor: forest, brightness: dark ? Brightness.dark : Brightness.light);
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    fontFamily: 'NotoSans',
    fontFamilyFallback: const ['NotoSansBengali'],
    scaffoldBackgroundColor:
        dark ? const Color(0xFF111E19) : const Color(0xFFF7F6F0),
    appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent, scrolledUnderElevation: 0),
    cardTheme: CardTheme(
        elevation: 0,
        margin: EdgeInsets.zero,
        color: dark ? const Color(0xFF1C2821) : Colors.white,
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: BorderSide(
                color:
                    dark ? const Color(0xFF2B3B32) : const Color(0xFFE8EAE3)))),
    inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: dark ? const Color(0xFF26342C) : const Color(0xFFF0F3EE),
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide.none),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 18, vertical: 18)),
    filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
            minimumSize: const Size(48, 52),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 15),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16)))),
    navigationBarTheme: NavigationBarThemeData(
        elevation: 0,
        height: 76,
        backgroundColor:
            dark ? const Color(0xFF1C2821) : const Color(0xFFFEFEFA),
        indicatorColor: dark ? forest : mint),
    textTheme: const TextTheme(
        headlineLarge: TextStyle(
            fontSize: 34,
            fontWeight: FontWeight.w700,
            letterSpacing: -1.1,
            fontFeatures: [FontFeature.tabularFigures()]),
        headlineMedium: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.8,
            fontFeatures: [FontFeature.tabularFigures()]),
        titleLarge: TextStyle(
            fontSize: 20, fontWeight: FontWeight.w700, letterSpacing: -0.4),
        titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        bodyLarge: TextStyle(fontSize: 16, height: 1.5),
        bodyMedium: TextStyle(fontSize: 14, height: 1.45),
        labelLarge: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
  );
}

class Surface extends StatelessWidget {
  const Surface(
      {super.key, required this.child, this.padding = 20, this.onTap});
  final Widget child;
  final double padding;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
          onTap: onTap,
          child: Padding(padding: EdgeInsets.all(padding), child: child)));
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.title, {super.key, this.action, this.onTap});
  final String title;
  final String? action;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => Padding(
      padding: const EdgeInsets.only(top: 24, bottom: 12),
      child: Row(children: [
        Expanded(
            child: Text(title, style: Theme.of(context).textTheme.titleLarge)),
        if (action != null) TextButton(onPressed: onTap, child: Text(action!))
      ]));
}

class EmptyState extends StatelessWidget {
  const EmptyState(this.title, this.message,
      {super.key, this.icon = Icons.spa_outlined, this.action});
  final String title, message;
  final IconData icon;
  final Widget? action;
  @override
  Widget build(BuildContext context) => Surface(
          child: Column(children: [
        const SizedBox(height: 12),
        CircleAvatar(
            radius: 30,
            backgroundColor: Theme.of(context).colorScheme.primaryContainer,
            child: Icon(icon,
                size: 28,
                color: Theme.of(context).colorScheme.onPrimaryContainer)),
        const SizedBox(height: 18),
        Text(title,
            style: Theme.of(context).textTheme.titleMedium,
            textAlign: TextAlign.center),
        const SizedBox(height: 8),
        Text(message, textAlign: TextAlign.center),
        if (action != null)
          Padding(padding: const EdgeInsets.only(top: 16), child: action!),
        const SizedBox(height: 12),
      ]));
}

IconData categoryIcon(String category) {
  if (category.contains('Food')) return Icons.restaurant_rounded;
  if (category.contains('Transport')) return Icons.directions_bus_outlined;
  if (category.contains('Shopping')) return Icons.shopping_bag_outlined;
  if (category.contains('Home')) return Icons.home_outlined;
  if (category.contains('Health')) return Icons.favorite_border;
  if (category.contains('Bills')) return Icons.receipt_long_outlined;
  if (category.contains('Salary')) return Icons.work_outline;
  if (category.contains('Education')) return Icons.school_outlined;
  return Icons.payments_outlined;
}

class TransactionTile extends StatelessWidget {
  const TransactionTile(this.record, this.snapshot,
      {super.key, this.onTap, this.hidden = false, this.space = 'all'});
  final Record record;
  final FinanceSnapshot snapshot;
  final VoidCallback? onTap;
  final bool hidden;
  final String space;
  @override
  Widget build(BuildContext context) {
    final type = snapshot.effectiveType(record);
    final reversed = record.text('type') == 'reversal';
    final crossSpace = type == 'transfer' &&
        snapshot.find(record.text('account'))?.text('space') !=
            snapshot.find(record.text('destination'))?.text('space');
    final incoming = crossSpace &&
        space != 'all' &&
        snapshot.find(record.text('destination'))?.text('space') == space;
    final outgoing = crossSpace && space != 'all' && !incoming;
    final scheduled = !snapshot.isPosted(record);
    final category = type == 'transfer'
        ? incoming
            ? 'Transfer in'
            : outgoing
                ? 'Transfer out'
                : 'Transfer'
        : snapshot.categoryName(record);
    final baseDirection =
        type == 'income' || type == 'debt_collection' || incoming
            ? 1
            : type == 'expense' || type == 'debt_payment' || outgoing
                ? -1
                : 0;
    final direction = reversed ? -baseDirection : baseDirection;
    final income = direction > 0;
    final color = income
        ? forest
        : type == 'transfer'
            ? Colors.blueGrey
            : rust;
    return ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
        onTap: onTap,
        leading: Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
                color: color.withOpacity(.10),
                borderRadius: BorderRadius.circular(15)),
            child: Icon(
                type == 'transfer' ? Icons.swap_horiz : categoryIcon(category),
                color: color)),
        title: Text(
            record.text('note').isEmpty ? category : record.text('note'),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(
            '${scheduled ? 'Scheduled · ' : ''}${snapshot.find(record.text('account'))?.text('name') ?? 'Account'}${type == 'transfer' ? ' → ${snapshot.find(record.text('destination'))?.text('name') ?? 'Account'}' : ''} · ${record.text('date')}',
            style: Theme.of(context).textTheme.bodySmall),
        trailing: Text(
            hidden
                ? '••••'
                : '${direction > 0 ? '+' : direction < 0 ? '−' : ''}${money(record.number('amount'))}',
            style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: income ? Theme.of(context).colorScheme.primary : null)));
  }
}

void feedbackMessage(BuildContext context, Object message) {
  final text =
      message is FormatException ? message.message : message.toString();
  ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(text), behavior: SnackBarBehavior.floating));
}

Future<bool> confirm(BuildContext context, String title, String message,
        {String action = 'Continue'}) async =>
    await showDialog<bool>(
        context: context,
        builder: (context) =>
            AlertDialog(title: Text(title), content: Text(message), actions: [
              TextButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: const Text('Cancel')),
              FilledButton(
                  onPressed: () => Navigator.pop(context, true),
                  child: Text(action))
            ])) ??
    false;
