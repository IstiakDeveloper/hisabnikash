import 'dart:ffi' show DynamicLibrary;
import 'dart:io';
import 'package:cryptography/cryptography.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqlite3/open.dart';
import 'package:hisabnikash_mobile/app/providers.dart';
import 'package:hisabnikash_mobile/core/database.dart';
import 'package:hisabnikash_mobile/core/repository.dart';
import 'package:hisabnikash_mobile/core/vault.dart';
import 'package:hisabnikash_mobile/ui/finance_center.dart';
import 'package:hisabnikash_mobile/ui/design.dart';

void main() {
  Future<void> settle(WidgetTester tester) async {
    await tester.pump();
    await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 300)));
    // A submitted tool keeps its progress indicator active while its dialog
    // waits for user input, so wait for route animations rather than all frames.
    for (var n = 0; n < 12; n++) {
      await tester.pump(const Duration(milliseconds: 50));
    }
  }

  if (Platform.isWindows) {
    open.overrideFor(
        OperatingSystem.windows, () => DynamicLibrary.open('winsqlite3.dll'));
  }
  testWidgets(
      'finance center exposes forecast, business and reminder controls on a narrow screen',
      (tester) async {
    final repo = FinanceRepository(FinanceDatabase.memory(),
        VaultCipher(await AesGcm.with256bits().newSecretKey()));
    addTearDown(repo.dispose);
    final space = await repo.save('space', {'name': 'Personal'});
    await repo
        .save('account', {'name': 'Cash', 'space': space, 'opening': 100000});
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(ProviderScope(
        overrides: [repositoryProvider.overrideWith((ref) async => repo)],
        child:
            MaterialApp(theme: appTheme(false), home: const FinanceCenter())));
    await settle(tester);
    expect(find.text('Review your backup'), findsOneWidget);
    await tester.tap(find.text('Cash flow'));
    await settle(tester);
    expect(find.text('Include expected income'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.ensureVisible(find.text('Business'));
    await tester.tap(find.text('Business'));
    await settle(tester);
    expect(find.text('Create invoice'), findsOneWidget);
    await tester.tap(find.text('Add customer / supplier'));
    await settle(tester);
    expect(find.text('Add contact'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.tap(find.text('Cancel'));
    await settle(tester);
    await tester.ensureVisible(find.text('Reminders'));
    await tester.tap(find.text('Reminders'));
    await settle(tester);
    expect(find.text('Daily account reminder'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });
  testWidgets('split expense validates totals before accepting categories',
      (tester) async {
    final repo = FinanceRepository(FinanceDatabase.memory(),
        VaultCipher(await AesGcm.with256bits().newSecretKey()));
    addTearDown(repo.dispose);
    final space = await repo.save('space', {'name': 'Personal'}),
        state = await repo.snapshot();
    await tester.pumpWidget(ProviderScope(
        overrides: [repositoryProvider.overrideWith((ref) async => repo)],
        child: MaterialApp(
            home: Consumer(
                builder: (context, ref, _) => Scaffold(
                    body: TextButton(
                        onPressed: () => editSplitAllocations(
                            context, ref, state, space, 10000),
                        child: const Text('Split')))))));
    await tester.tap(find.text('Split'));
    await settle(tester);
    await tester.enterText(find.byType(TextFormField), '99');
    await tester.tap(find.text('Apply'));
    await settle(tester);
    expect(find.text('Allocations must equal the total.'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.enterText(find.byType(TextFormField), '100');
    await tester.tap(find.text('Apply'));
    await settle(tester);
    expect(find.text('Split expense'), findsNothing);
    await tester.pumpWidget(const SizedBox());
  });
}
