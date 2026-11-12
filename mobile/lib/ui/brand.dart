import 'localization.dart';
import 'package:flutter/material.dart';
import 'dart:math' as math;

const brandBackground = Color(0xFFF7F6F0);

class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.size = 48});
  final double size;
  @override
  Widget build(BuildContext context) => Semantics(
      label: 'HisabNikash',
      image: true,
      child: ClipRRect(
          borderRadius: BorderRadius.circular(size * .223),
          child: Image.asset('assets/brand/icon.png',
              width: size,
              height: size,
              filterQuality: FilterQuality.high,
              frameBuilder: (context, child, frame, loadedSynchronously) =>
                  frame == null
                      ? CustomPaint(
                          size: Size.square(size),
                          painter: const _BrandPainter())
                      : child,
              errorBuilder: (context, error, stack) => CustomPaint(
                  size: Size.square(size), painter: const _BrandPainter()))));
}

// Synchronous first-frame geometry prevents a blank logo while PNG decoding runs.
class _BrandPainter extends CustomPainter {
  const _BrandPainter();
  @override
  void paint(Canvas canvas, Size size) {
    canvas.scale(size.width / 1024, size.height / 1024);
    const green = Color(0xFF123F36),
        ivory = Color(0xFFF7F6ED),
        gold = Color(0xFFDFC285);
    final brush = Paint();
    void box(double x, double y, double width, double height, double radius,
        Color color) {
      brush.color = color;
      canvas.drawRRect(
          RRect.fromRectAndRadius(
              Rect.fromLTWH(x, y, width, height), Radius.circular(radius)),
          brush);
    }

    canvas.drawColor(green, BlendMode.src);
    box(246, 205, 514, 607, 70, ivory);
    box(246, 205, 78, 607, 32, gold);
    box(402, 350, 46, 306, 23, green);
    box(588, 350, 46, 306, 23, green);
    box(424, 480, 188, 46, 20, green);
    brush.color = green;
    canvas.drawCircle(const Offset(708, 726), 120, brush);
    brush.color = gold;
    canvas.drawCircle(const Offset(708, 726), 98, brush);
    box(658, 696, 100, 28, 14, green);
    box(675, 740, 66, 28, 14, green);
  }

  @override
  bool shouldRepaint(covariant _BrandPainter oldDelegate) => false;
}

class StartupView extends StatelessWidget {
  const StartupView({super.key, this.bangla = false});
  final bool bangla;
  @override
  Widget build(BuildContext context) {
    final reduced = MediaQuery.disableAnimationsOf(context);
    final dark = MediaQuery.platformBrightnessOf(context) == Brightness.dark;
    return Scaffold(
        backgroundColor: dark ? const Color(0xFF111E19) : brandBackground,
        body: Stack(children: [
          Center(
              child: TweenAnimationBuilder<double>(
                  duration: Duration(milliseconds: reduced ? 0 : 460),
                  tween: Tween(begin: 0, end: 1),
                  child: const BrandMark(size: 88),
                  builder: (context, value, child) => Transform.scale(
                      scale: reduced ? 1 : 1 + math.sin(value * math.pi) * .045,
                      child: child))),
          Align(
              alignment: const Alignment(0, .35),
              child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 32),
                  child: TweenAnimationBuilder<double>(
                      tween: Tween(begin: reduced ? 1 : 0, end: 1),
                      duration: Duration(milliseconds: reduced ? 0 : 360),
                      builder: (context, value, child) => Opacity(
                          opacity: value,
                          child: Transform.translate(
                              offset: Offset(0, 8 * (1 - value)),
                              child: child)),
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        LText(bangla ? 'হিসাবনিকাশ' : 'HisabNikash',
                            style: TextStyle(
                                color: dark
                                    ? const Color(0xFFF7F6ED)
                                    : const Color(0xFF123F36),
                                fontSize: 28,
                                fontWeight: FontWeight.w700,
                                letterSpacing: -.8)),
                        const SizedBox(height: 8),
                        Semantics(
                            liveRegion: true,
                            child: LText(
                                bangla
                                    ? 'আপনার ব্যক্তিগত হিসাব খুলছে…'
                                    : 'Opening your private vault…',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                    color: dark
                                        ? const Color(0xFFB5C8BE)
                                        : const Color(0xFF64746C)))),
                        const SizedBox(height: 24),
                        SizedBox(
                            width: 112,
                            height: reduced ? 18 : 3,
                            child: reduced
                                ? const LText('•••',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(color: Color(0xFF8A9D91)))
                                : const LinearProgressIndicator(
                                    color: Color(0xFF123F36),
                                    backgroundColor: Color(0xFFE3E7DF))),
                      ])))),
        ]));
  }
}

/// A finite entrance animation; accessibility settings bypass movement.
class ContentEntrance extends StatelessWidget {
  const ContentEntrance({super.key, required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) {
    if (MediaQuery.disableAnimationsOf(context)) return child;
    return TweenAnimationBuilder<double>(
        duration: const Duration(milliseconds: 200),
        tween: Tween(begin: 0, end: 1),
        child: child,
        builder: (context, value, child) => Opacity(
            opacity: value,
            child: Transform.translate(
                offset: Offset(0, 6 * (1 - value)), child: child)));
  }
}

class VaultSkeleton extends StatelessWidget {
  const VaultSkeleton({super.key});
  @override
  Widget build(BuildContext context) => Semantics(
      label: 'Loading your records',
      liveRegion: true,
      child: ListView(padding: const EdgeInsets.all(20), children: [
        const SizedBox(height: 12),
        for (final height in [160.0, 64.0, 80.0, 80.0])
          Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Container(
                  height: height,
                  decoration: BoxDecoration(
                      color:
                          Theme.of(context).colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(20)))),
      ]));
}
