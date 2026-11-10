import 'dart:convert';
import 'dart:io';
import 'package:image/image.dart' as img;

/// Reproducible vector-style ledger mark, rasterized for native app catalogs.
void main() {
  final icon = img.Image(width: 1024, height: 1024);
  final green = img.ColorRgb8(18, 91, 73);
  final paper = img.ColorRgb8(240, 248, 237);
  final soft = img.ColorRgb8(175, 217, 186);
  img.fill(icon, color: green);
  img.fillRect(icon,
      x1: 245, y1: 205, x2: 779, y2: 819, radius: 75, color: paper);
  img.fillRect(icon,
      x1: 245, y1: 205, x2: 335, y2: 819, radius: 34, color: soft);
  for (final y in [350, 490, 630]) {
    img.fillRect(icon,
        x1: 418,
        y1: y,
        x2: y == 630 ? 600 : 671,
        y2: y + 43,
        radius: 20,
        color: green);
  }
  for (final entry in {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192
  }.entries) {
    File('android/app/src/main/res/mipmap-${entry.key}/ic_launcher.png')
        .writeAsBytesSync(img.encodePng(img.copyResize(icon,
            width: entry.value,
            height: entry.value,
            interpolation: img.Interpolation.average)));
  }
  final catalog = Directory('ios/Runner/Assets.xcassets/AppIcon.appiconset');
  final contents =
      jsonDecode(File('${catalog.path}/Contents.json').readAsStringSync())
          as Map<String, dynamic>;
  for (final raw in contents['images'] as List) {
    final size = (double.parse((raw['size'] as String).split('x').first) *
            double.parse((raw['scale'] as String).replaceAll('x', '')))
        .round();
    File('${catalog.path}/${raw['filename']}').writeAsBytesSync(img.encodePng(
        img.copyResize(icon,
            width: size,
            height: size,
            interpolation: img.Interpolation.average)));
  }
  Directory('assets/brand').createSync(recursive: true);
  File('assets/brand/icon.png').writeAsBytesSync(img.encodePng(icon));
  if (Directory('web').existsSync()) {
    for (final size in [192, 512]) {
      final bytes = img.encodePng(img.copyResize(icon,
          width: size, height: size, interpolation: img.Interpolation.average));
      File('web/icons/Icon-$size.png').writeAsBytesSync(bytes);
      File('web/icons/Icon-maskable-$size.png').writeAsBytesSync(bytes);
    }
    File('web/favicon.png').writeAsBytesSync(img.encodePng(img.copyResize(icon,
        width: 32, height: 32, interpolation: img.Interpolation.average)));
  }
}
