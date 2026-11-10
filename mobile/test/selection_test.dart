import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hisabnikash_mobile/ui/design.dart';
import 'package:hisabnikash_mobile/ui/search_select.dart';

void main() {
  testWidgets('selectors search, show the selected option and accept a result',
      (tester) async {
    tester.view.physicalSize = const Size(430, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    var selected = 'cash';
    await tester.pumpWidget(MaterialApp(
        theme: appTheme(false),
        home: Scaffold(
            body: StatefulBuilder(
                builder: (context, setState) => Padding(
                    padding: const EdgeInsets.all(24),
                    child: SearchSelectField(
                        label: 'Account',
                        value: selected,
                        choices: const {
                          'cash': 'Cash · ৳1,000',
                          'bank': 'Savings bank · Business',
                          'wallet': 'Mobile wallet · Personal'
                        },
                        onChanged: (value) =>
                            setState(() => selected = value)))))));
    await tester.tap(find.byType(SearchSelectField));
    await tester.pumpAndSettle();
    expect(find.byIcon(Icons.check_circle), findsOneWidget);
    await tester.enterText(
        find.byKey(const ValueKey('picker-search')), 'business');
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('option-bank')), findsOneWidget);
    expect(find.byKey(const ValueKey('option-cash')), findsNothing);
    await tester.tap(find.byKey(const ValueKey('option-bank')));
    await tester.pumpAndSettle();
    expect(selected, 'bank');
    expect(find.text('Savings bank · Business'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  testWidgets('no-match picker can create and select a new option',
      (tester) async {
    var selected = 'food';
    final choices = {'food': 'Food & groceries'};
    await tester.pumpWidget(MaterialApp(
        theme: appTheme(false),
        home: Scaffold(
            body: StatefulBuilder(
                builder: (context, setState) => Padding(
                    padding: const EdgeInsets.all(24),
                    child: SearchSelectField(
                        label: 'Category',
                        value: selected,
                        choices: choices,
                        actionLabel: 'Create category',
                        onCreate: () async {
                          choices['pets'] = 'Pet supplies';
                          return 'pets';
                        },
                        onChanged: (value) =>
                            setState(() => selected = value)))))));
    await tester.tap(find.byType(SearchSelectField));
    await tester.pumpAndSettle();
    await tester.enterText(
        find.byKey(const ValueKey('picker-search')), 'Pet supplies');
    await tester.pumpAndSettle();
    expect(find.text('No matching results'), findsOneWidget);
    await tester.tap(find.text('Create category'));
    await tester.pumpAndSettle();
    expect(selected, 'pets');
    expect(find.text('Pet supplies'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
