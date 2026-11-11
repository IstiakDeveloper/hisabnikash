import 'dart:convert';
import 'dart:io';
import 'package:image/image.dart' as img;

// This geometry is the source for the vector master and native raster exports.
void main() {
  final green = img.ColorRgb8(18, 63, 54);
  final ivory = img.ColorRgb8(247, 246, 237);
  final gold = img.ColorRgb8(223, 194, 133);
  img.Image mark({bool foreground = false}) {
    final canvas = img.Image(width: 1024, height: 1024, numChannels: 4);
    img.fill(canvas, color: foreground ? img.ColorRgba8(0, 0, 0, 0) : green);
    img.fillRect(canvas,
        x1: 246, y1: 205, x2: 760, y2: 812, radius: 70, color: ivory);
    img.fillRect(canvas,
        x1: 246, y1: 205, x2: 324, y2: 812, radius: 32, color: gold);
    for (final x in [402, 588]) {
      img.fillRect(canvas,
          x1: x, y1: 350, x2: x + 46, y2: 656, radius: 23, color: green);
    }
    img.fillRect(canvas,
        x1: 424, y1: 480, x2: 612, y2: 526, radius: 20, color: green);
    img.fillCircle(canvas, x: 708, y: 726, radius: 120, color: green);
    img.fillCircle(canvas, x: 708, y: 726, radius: 98, color: gold);
    img.fillRect(canvas,
        x1: 658, y1: 696, x2: 758, y2: 724, radius: 14, color: green);
    img.fillRect(canvas,
        x1: 675, y1: 740, x2: 741, y2: 768, radius: 14, color: green);
    return canvas;
  }

  void png(String path, img.Image image, int size) {
    File(path).parent.createSync(recursive: true);
    File(path).writeAsBytesSync(img.encodePng(img.copyResize(image,
        width: size, height: size, interpolation: img.Interpolation.average)));
  }

  final icon = mark(), foreground = mark(foreground: true);
  png('assets/brand/icon.png', icon, 1024);
  File('assets/brand/mark.svg').writeAsStringSync(
      '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#123f36"/><rect x="246" y="205" width="514" height="607" rx="70" fill="#f7f6ed"/><rect x="246" y="205" width="78" height="607" rx="32" fill="#dfc285"/><g fill="#123f36"><rect x="402" y="350" width="46" height="306" rx="23"/><rect x="588" y="350" width="46" height="306" rx="23"/><rect x="424" y="480" width="188" height="46" rx="20"/><circle cx="708" cy="726" r="120"/></g><circle cx="708" cy="726" r="98" fill="#dfc285"/><g fill="#123f36"><rect x="658" y="696" width="100" height="28" rx="14"/><rect x="675" y="740" width="66" height="28" rx="14"/></g></svg>''');
  for (final entry in {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192
  }.entries) {
    png('android/app/src/main/res/mipmap-${entry.key}/ic_launcher.png', icon,
        entry.value);
    png('android/app/src/main/res/mipmap-${entry.key}/ic_launcher_foreground.png',
        foreground, entry.value * 108 ~/ 48);
  }
  final catalog = Directory('ios/Runner/Assets.xcassets/AppIcon.appiconset');
  final contents =
      jsonDecode(File('${catalog.path}/Contents.json').readAsStringSync());
  for (final raw in contents['images']) {
    final size = (double.parse(raw['size'].split('x').first) *
            double.parse(raw['scale'].replaceAll('x', '')))
        .round();
    png('${catalog.path}/${raw['filename']}', icon.convert(numChannels: 3),
        size);
  }
  // Native launch uses a rounded tile to match BrandMark in the first Flutter frame.
  final tile = img.Image.from(icon);
  for (var y = 0; y < 1024; y++) {
    for (var x = 0; x < 1024; x++) {
      final dx = x < 228
          ? 228 - x
          : x > 795
              ? x - 795
              : 0;
      final dy = y < 228
          ? 228 - y
          : y > 795
              ? y - 795
              : 0;
      if (dx * dx + dy * dy > 228 * 228) tile.setPixelRgba(x, y, 0, 0, 0, 0);
    }
  }
  for (final scale in [1, 2, 3]) {
    png('ios/Runner/Assets.xcassets/LaunchImage.imageset/LaunchImage${scale == 1 ? '' : '@${scale}x'}.png',
        tile, 88 * scale);
    png(
        'android/app/src/main/res/drawable-${{
          1: 'mdpi',
          2: 'xhdpi',
          3: 'xxhdpi'
        }[scale]}/brand_launch.png',
        tile,
        88 * scale);
  }
  for (final size in [192, 512]) {
    png('web/icons/Icon-$size.png', icon, size);
    png('web/icons/Icon-maskable-$size.png', icon, size);
  }
  png('web/favicon.png', icon, 32);
}
