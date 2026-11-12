import 'dart:io';
import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hisabnikash_mobile/app/providers.dart';
import 'package:hisabnikash_mobile/ui/localization.dart';
import '../tool/localization_inventory.dart';

void main() {
  test(
      'application messages and validation strings have Bengali catalog coverage',
      () {
    final entries = <String, Set<String>>{};
    for (final file in Directory('lib')
        .listSync(recursive: true)
        .whereType<File>()
        .where((f) =>
            f.path.endsWith('.dart') && !f.path.contains('localization'))) {
      parseString(content: file.readAsStringSync(), path: file.path)
          .unit
          .accept(Inventory(file.path, entries));
    }
    final missing = entries.keys
        .where((s) => !isTechnicalString(s) && !translationsBn.containsKey(s))
        .toList()
      ..sort();
    expect(missing, isEmpty,
        reason: 'User-facing source messages need Bengali translations.');
  });
  test(
      'dynamic headings and errors localize while amounts and reference data remain intact',
      () {
    const values = {
      'Save transaction': 'লেনদেন সংরক্ষণ করুন',
      'Add account': 'অ্যাকাউন্ট যোগ করুন',
      'Invalid opening amount.': 'শুরুর ব্যালেন্স টাকার পরিমাণ সঠিক নয়।',
      'Choose a valid account in this space.':
          'এই হিসাবে সঠিক অ্যাকাউন্ট বেছে নিন।',
      '3 transactions': '৩টি লেনদেন',
      '80% used': '৮০% খরচ হয়েছে',
      'BDT 123.45': 'BDT 123.45',
      'INV-2026-041': 'INV-2026-041',
    };
    for (final entry in values.entries) {
      expect(translateText(entry.key, language: 'bn'), entry.value);
      expect(translateText(entry.key), entry.key);
    }
  });
  testWidgets(
      'localized text reacts to a language change and keeps hidden balances masked',
      (tester) async {
    late WidgetRef ref;
    await tester.pumpWidget(
        ProviderScope(child: Consumer(builder: (context, currentRef, _) {
      ref = currentRef;
      final language = currentRef.watch(languageProvider);
      return MaterialApp(
          locale: Locale(language),
          supportedLocales: const [Locale('en'), Locale('bn')],
          localizationsDelegates: GlobalMaterialLocalizations.delegates,
          home: const Scaffold(
              body: Column(
                  children: [LText('Save transaction'), LText('••••')])));
    })));
    expect(find.text('Save transaction'), findsOneWidget);
    ref.read(languageProvider.notifier).state = 'bn';
    await tester.pumpAndSettle();
    expect(find.text('লেনদেন সংরক্ষণ করুন'), findsOneWidget);
    expect(find.text('••••'), findsOneWidget);
  });
}
