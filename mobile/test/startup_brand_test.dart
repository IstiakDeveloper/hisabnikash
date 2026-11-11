import 'dart:async';
import 'dart:ffi' show DynamicLibrary;
import 'dart:io';
import 'dart:ui' as ui;
import 'package:cryptography/cryptography.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;
import 'package:sqlite3/open.dart';
import 'package:hisabnikash_mobile/app/app.dart';
import 'package:hisabnikash_mobile/app/providers.dart';
import 'package:hisabnikash_mobile/core/database.dart';
import 'package:hisabnikash_mobile/core/repository.dart';
import 'package:hisabnikash_mobile/core/vault.dart';
import 'package:hisabnikash_mobile/ui/brand.dart';
import 'package:hisabnikash_mobile/ui/design.dart';
import 'package:hisabnikash_mobile/ui/onboarding.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  if (Platform.isWindows) {
    open.overrideFor(
        OperatingSystem.windows, () => DynamicLibrary.open('winsqlite3.dll'));
  }
  setUpAll(() async {
    for (final family in ['NotoSans', 'NotoSansBengali']) {
      final loader = FontLoader(family);
      for (final weight in ['Regular', 'Medium', 'SemiBold', 'Bold']) {
        loader.addFont(rootBundle.load('assets/fonts/$family-$weight.ttf'));
      }
      await loader.load();
    }
  });
  test('launch images have visible artwork rather than placeholder pixels', () {
    for (final suffix in ['', '@2x', '@3x']) {
      final image = img.decodePng(File(
              'ios/Runner/Assets.xcassets/LaunchImage.imageset/LaunchImage$suffix.png')
          .readAsBytesSync())!;
      expect(image.width, greaterThanOrEqualTo(88));
      expect(image.getPixel(image.width ~/ 2, image.height ~/ 2).a, 255);
      expect(image.getPixel(0, 0).a, 0,
          reason: 'Launch tile and Flutter rounded tile must match');
    }
  });
  testWidgets(
      'real initialization controls startup, with no forced splash delay',
      (tester) async {
    final repository = FinanceRepository(FinanceDatabase.memory(),
        VaultCipher(await AesGcm.with256bits().newSecretKey()));
    addTearDown(repository.dispose);
    final gate = Completer<FinanceRepository>();
    await tester.pumpWidget(ProviderScope(
        overrides: [repositoryProvider.overrideWith((ref) => gate.future)],
        child: const HisabNikashApp()));
    await tester.pump(const Duration(milliseconds: 800));
    expect(find.byType(StartupView), findsOneWidget);
    expect(find.byType(BrandMark), findsOneWidget);
    gate.complete(repository);
    await tester.pumpAndSettle();
    expect(find.byType(StartupView), findsNothing);
    expect(find.byType(Onboarding), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });
  testWidgets(
      'startup screenshots, dark mode, Bengali and reduced motion render cleanly',
      (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    for (final dark in [false, true]) {
      final boundary = GlobalKey();
      await tester.pumpWidget(MaterialApp(
          theme: appTheme(dark),
          home: MediaQuery(
              data: MediaQueryData(
                  size: const Size(390, 844),
                  platformBrightness: dark ? Brightness.dark : Brightness.light,
                  disableAnimations: true),
              child: RepaintBoundary(
                  key: boundary, child: StartupView(bangla: dark)))));
      await tester.pumpAndSettle();
      expect(tester.binding.transientCallbackCount, 0,
          reason:
              'Reduced motion must not keep an indeterminate animation running');
      expect(tester.takeException(), isNull);
      await tester.runAsync(() async {
        final image = await (boundary.currentContext!.findRenderObject()
                as RenderRepaintBoundary)
            .toImage();
        await Directory('artifacts').create(recursive: true);
        await File('artifacts/startup-${dark ? 'dark-bn' : 'light'}.png')
            .writeAsBytes(
                (await image.toByteData(format: ui.ImageByteFormat.png))!
                    .buffer
                    .asUint8List());
      });
    }
    await tester.pumpWidget(const SizedBox());
  });
}
