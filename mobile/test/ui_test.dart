import 'dart:ffi' show DynamicLibrary;
import 'dart:io';
import 'dart:ui' as ui;
import 'package:cryptography/cryptography.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqlite3/open.dart';
import 'package:hisabnikash_mobile/app/app.dart';
import 'package:hisabnikash_mobile/app/providers.dart';
import 'package:hisabnikash_mobile/core/database.dart';
import 'package:hisabnikash_mobile/core/money.dart';
import 'package:hisabnikash_mobile/core/repository.dart';
import 'package:hisabnikash_mobile/core/vault.dart';
import 'package:hisabnikash_mobile/ui/onboarding.dart';
import 'package:hisabnikash_mobile/ui/design.dart';
import 'package:hisabnikash_mobile/ui/spaces.dart';
import 'package:hisabnikash_mobile/ui/search_select.dart';
import 'package:hisabnikash_mobile/ui/editors.dart';
import 'package:hisabnikash_mobile/ui/statement.dart';
import 'package:hisabnikash_mobile/ui/insights.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() async {
    for (final font in ['NotoSans', 'NotoSansBengali']) {
      final loader = FontLoader(font);
      for (final weight in ['Regular', 'Medium', 'SemiBold', 'Bold']) {
        loader.addFont(rootBundle.load('assets/fonts/$font-$weight.ttf'));
      }
      await loader.load();
    }
    await (FontLoader('MaterialIcons')
          ..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf')))
        .load();
  });
  if (Platform.isWindows) {
    open.overrideFor(
        OperatingSystem.windows, () => DynamicLibrary.open('winsqlite3.dll'));
  }
  testWidgets(
      'unsaved editor requires discard and account statement shows running balance',
      (tester) async {
    final statementPreview = GlobalKey();
    final repository = FinanceRepository(FinanceDatabase.memory(),
        VaultCipher(await AesGcm.with256bits().newSecretKey()));
    addTearDown(repository.dispose);
    final space = await repository.save('space', {'name': 'Personal'});
    final account = await repository
        .save('account', {'space': space, 'name': 'Cash', 'opening': 10000});
    await repository.save('transaction', {
      'space': space,
      'account': account,
      'type': 'expense',
      'category': 'Food & groceries',
      'date': dayKey(DateTime.now()),
      'amount': 2000
    });
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(ProviderScope(
        overrides: [repositoryProvider.overrideWith((ref) async => repository)],
        child: MaterialApp(
            theme: appTheme(false),
            home: Builder(
                builder: (context) => Scaffold(
                        body: Column(children: [
                      TextButton(
                          onPressed: () => openEditor(context, 'transaction'),
                          child: const Text('New entry')),
                      TextButton(
                          onPressed: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (_) => RepaintBoundary(
                                      key: statementPreview,
                                      child: AccountStatement(account)))),
                          child: const Text('Statement')),
                    ]))))));
    await tester.tap(find.text('New entry'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField).first, '123');
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.text('Discard unsaved changes?'), findsOneWidget);
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(find.text('123'), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.tap(find.text('Discard'));
    await tester.pumpAndSettle();
    expect((await repository.snapshot()).of('transaction'), hasLength(1));
    await tester.tap(find.text('Statement'));
    await tester.pumpAndSettle();
    expect(find.text('Account statement'), findsOneWidget);
    expect(find.text('Balance ${money(8000)}'), findsOneWidget);
    await tester.runAsync(() async {
      final image = await (statementPreview.currentContext!.findRenderObject()
              as RenderRepaintBoundary)
          .toImage();
      await Directory('artifacts').create(recursive: true);
      await File('artifacts/account-statement.png').writeAsBytes(
          (await image.toByteData(format: ui.ImageByteFormat.png))!
              .buffer
              .asUint8List());
    });
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
    await repository.reverse(
        (await repository.snapshot()).of('transaction').single,
        'Incorrect purchase');
    final corrected = await repository.snapshot();
    await tester.pumpWidget(ProviderScope(
        overrides: [repositoryProvider.overrideWith((ref) async => repository)],
        child: MaterialApp(
            theme: appTheme(false),
            home: Scaffold(body: InsightsScreen(corrected)))));
    await tester.pumpAndSettle();
    expect(find.text('Your story is just beginning'), findsOneWidget);
    expect(tester.takeException(), isNull,
        reason:
            'Fully reversed expenses must not divide by zero in category charts');
    await tester.pumpWidget(const SizedBox());
  });
  testWidgets('onboarding creates a usable offline vault without login',
      (tester) async {
    final repository = FinanceRepository(FinanceDatabase.memory(),
        VaultCipher(await AesGcm.with256bits().newSecretKey()));
    addTearDown(repository.dispose);
    tester.view.physicalSize = const Size(430, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    var completed = false;
    final onboardingPreview = GlobalKey();
    await tester.pumpWidget(ProviderScope(
        overrides: [repositoryProvider.overrideWith((ref) async => repository)],
        child: MaterialApp(
            theme: appTheme(false),
            home: RepaintBoundary(
                key: onboardingPreview,
                child: Onboarding(onComplete: () => completed = true)))));
    await tester.pumpAndSettle();
    await tester.runAsync(() async {
      final image = await (onboardingPreview.currentContext!.findRenderObject()
              as RenderRepaintBoundary)
          .toImage();
      await Directory('artifacts').create(recursive: true);
      await File('artifacts/onboarding.png').writeAsBytes(
          (await image.toByteData(format: ui.ImageByteFormat.png))!
              .buffer
              .asUint8List());
    });
    await tester.enterText(find.byType(TextField).last, '2500.50');
    await tester.ensureVisible(find.text('Start my money journey'));
    await tester.tap(find.text('Start my money journey'));
    await tester.pumpAndSettle();
    expect(completed, true);
    final state = await repository.snapshot();
    expect(state.of('space').single.text('name'), 'Personal');
    expect(state.balance(state.of('account').single), 250050);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('dashboard, quick add, navigation and narrow screens work',
      (tester) async {
    final repository = FinanceRepository(FinanceDatabase.memory(),
        VaultCipher(await AesGcm.with256bits().newSecretKey()));
    addTearDown(repository.dispose);
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final space = await repository.save('space', {'name': 'Personal'});
    final cash = await repository.save('account',
        {'name': 'Everyday cash', 'space': space, 'opening': 1250000});
    await repository.save('account',
        {'name': 'Savings account', 'space': space, 'opening': 4200000});
    await repository.save('transaction', {
      'space': space,
      'type': 'income',
      'amount': 6500000,
      'account': cash,
      'category': 'Salary',
      'date': dayKey(DateTime.now()),
      'note': 'Monthly salary'
    });
    await repository.save('transaction', {
      'space': space,
      'type': 'expense',
      'amount': 185000,
      'account': cash,
      'category': 'Food & groceries',
      'date': dayKey(DateTime.now()),
      'note': 'Weekly groceries'
    });
    await repository.save('bill', {
      'space': space,
      'name': 'Internet subscription',
      'amount': 120000,
      'due': dayKey(DateTime.now().add(const Duration(days: 3))),
      'frequency': 'monthly',
      'paid': false
    });
    await repository.setSetting('onboarded', 'true');
    final boundary = GlobalKey();
    await tester.pumpWidget(ProviderScope(
        overrides: [repositoryProvider.overrideWith((ref) async => repository)],
        child: RepaintBoundary(key: boundary, child: const HisabNikashApp())));
    await tester.pumpAndSettle();
    expect(find.text('Overview'), findsOneWidget);
    expect(find.text('Everyday cash'), findsOneWidget);
    expect(tester.takeException(), isNull);
    // A deterministic render of the actual widgets; fixture data exists only here.
    await tester.runAsync(() async {
      final image = await (boundary.currentContext!.findRenderObject()
              as RenderRepaintBoundary)
          .toImage();
      final bytes = (await image.toByteData(format: ui.ImageByteFormat.png))!
          .buffer
          .asUint8List();
      await Directory('artifacts').create(recursive: true);
      await File('artifacts/dashboard.png').writeAsBytes(bytes);
    });
    await tester.tap(find.text('Add transaction'));
    await tester.pumpAndSettle();
    expect(find.text('Add transaction'), findsOneWidget);
    await tester.runAsync(() async {
      final image = await (boundary.currentContext!.findRenderObject()
              as RenderRepaintBoundary)
          .toImage();
      await File('artifacts/transaction-form.png').writeAsBytes(
          (await image.toByteData(format: ui.ImageByteFormat.png))!
              .buffer
              .asUint8List());
    });
    expect(tester.getBottomRight(find.text('Save transaction')).dy,
        lessThan(tester.view.physicalSize.height));
    await tester.tap(find.byWidgetPredicate(
        (w) => w is SearchSelectField && w.label == 'Category'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const ValueKey('picker-search')), 'Food');
    await tester.pumpAndSettle();
    await tester.runAsync(() async {
      final image = await (boundary.currentContext!.findRenderObject()
              as RenderRepaintBoundary)
          .toImage();
      await File('artifacts/search-select.png').writeAsBytes(
          (await image.toByteData(format: ui.ImageByteFormat.png))!
              .buffer
              .asUint8List());
    });
    await tester.tap(find.byKey(const ValueKey('option-Food & groceries')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField).first, '125.50');
    await tester.ensureVisible(find.text('Save transaction'));
    await tester.tap(find.text('Save transaction'));
    // Drift schedules executor locks across event-loop turns. Interleave real
    // native IO and fake widget frames instead of advancing ten fake minutes.
    for (var i = 0;
        i < 100 && find.text('Saving…').evaluate().isNotEmpty;
        i++) {
      await tester.pump(const Duration(milliseconds: 30));
      await tester.runAsync(
          () => Future<void>.delayed(const Duration(milliseconds: 20)));
    }
    await tester.pumpAndSettle();
    expect((await repository.snapshot()).of('transaction').length, 3);
    expect(tester.takeException(), isNull);
    for (final label in ['Activity', 'Plan', 'Insights', 'More', 'Home']) {
      await tester.tap(find.text(label).last);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull, reason: label);
    }
    tester.view.physicalSize = const Size(320, 700);
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    tester.view.physicalSize = const Size(1280, 900);
    await tester.pumpAndSettle();
    expect(find.byType(NavigationRail), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.runAsync(() async {
      final image = await (boundary.currentContext!.findRenderObject()
              as RenderRepaintBoundary)
          .toImage();
      await File('artifacts/dashboard-desktop.png').writeAsBytes(
          (await image.toByteData(format: ui.ImageByteFormat.png))!
              .buffer
              .asUint8List());
    });
    await tester.pumpWidget(const SizedBox());
  });
  testWidgets(
      'spaces preserve personal type, scope new accounts and remember selection',
      (tester) async {
    final repository = FinanceRepository(FinanceDatabase.memory(),
        VaultCipher(await AesGcm.with256bits().newSecretKey()));
    addTearDown(repository.dispose);
    tester.view.physicalSize = const Size(430, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final personal = await repository
        .save('space', {'name': 'Personal', 'type': 'personal'});
    final business = await repository
        .save('space', {'name': 'Rice shop', 'type': 'business'});
    await tester.pumpWidget(ProviderScope(
        overrides: [repositoryProvider.overrideWith((ref) async => repository)],
        child: MaterialApp(
            theme: appTheme(false),
            home: Builder(
                builder: (context) => Scaffold(
                    body: TextButton(
                        onPressed: () => openSpaces(context),
                        child: const Text('Manage spaces')))))));
    await tester.tap(find.text('Manage spaces'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Manage Personal'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Edit space'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField).first, 'My personal');
    await tester.ensureVisible(find.text('Save space'));
    await tester.tap(find.text('Save space'));
    await tester.pumpAndSettle();
    expect(
        (await repository.snapshot()).find(personal)!.text('type'), 'personal');
    await tester.enterText(
        find.byKey(const ValueKey('spaces-search')), 'Rice shop');
    await tester.pumpAndSettle();
    expect(find.text('My personal'), findsNothing);
    await tester.ensureVisible(find.byKey(ValueKey('add-account-$business')));
    await tester.tap(find.byKey(ValueKey('add-account-$business')));
    await tester.pumpAndSettle();
    final spaceField = tester
        .widgetList<SearchSelectField>(find.byType(SearchSelectField))
        .firstWhere((w) => w.label == 'Space');
    expect(spaceField.value, business);
    await tester.enterText(find.byType(TextFormField).first, '500');
    await tester.enterText(find.byType(TextFormField).at(1), 'Shop cash');
    await tester.ensureVisible(find.text('Save account'));
    await tester.tap(find.text('Save account'));
    await tester.pumpAndSettle();
    final state = await repository.snapshot();
    expect(state.of('account').single.text('space'), business);
    expect(state.spaceBalance(business), 50000);
    await tester.ensureVisible(find.byKey(ValueKey('open-space-$business')));
    await tester.tap(find.byKey(ValueKey('open-space-$business')));
    await tester.pumpAndSettle();
    expect(await repository.getSetting('selectedSpace'), business);
    expect(find.text('Manage spaces'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });
  testWidgets(
      'Bengali dark dashboard supports large text and keyboard-safe save',
      (tester) async {
    final repository = FinanceRepository(FinanceDatabase.memory(),
        VaultCipher(await AesGcm.with256bits().newSecretKey()));
    addTearDown(repository.dispose);
    final space = await repository
        .save('space', {'name': 'ব্যক্তিগত', 'type': 'personal'});
    await repository.save(
        'account', {'name': 'নগদ টাকা', 'space': space, 'opening': 1250000});
    for (final setting
        in {'onboarded': 'true', 'dark': 'true', 'language': 'bn'}.entries) {
      await repository.setSetting(setting.key, setting.value);
    }
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    tester.platformDispatcher.textScaleFactorTestValue = 1.5;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    final boundary = GlobalKey();
    await tester.pumpWidget(ProviderScope(
        overrides: [repositoryProvider.overrideWith((ref) async => repository)],
        child: RepaintBoundary(key: boundary, child: const HisabNikashApp())));
    await tester.pumpAndSettle();
    expect(find.text('এক নজরে'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.runAsync(() async {
      final image = await (boundary.currentContext!.findRenderObject()
              as RenderRepaintBoundary)
          .toImage();
      await File('artifacts/dashboard-dark-bn-large.png').writeAsBytes(
          (await image.toByteData(format: ui.ImageByteFormat.png))!
              .buffer
              .asUint8List());
    });
    await tester.tap(find.text('লেনদেন যোগ করুন'));
    await tester.pumpAndSettle();
    tester.view.viewInsets = const FakeViewPadding(bottom: 280);
    addTearDown(tester.view.resetViewInsets);
    await tester.pumpAndSettle();
    expect(tester.getBottomRight(find.text('লেনদেন সংরক্ষণ করুন')).dy,
        lessThan(844 - 280));
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });
}
