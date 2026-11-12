import 'dart:ui' as ui;
import 'package:flutter/services.dart';
import 'package:pdf/widgets.dart' as pw;

Future<void>? _fonts;
Future<void> _loadFonts() => _fonts ??= () async {
      for (final name in ['NotoSans', 'NotoSansBengali']) {
        final loader = FontLoader('Report$name');
        loader.addFont(rootBundle.load('assets/fonts/$name-Regular.ttf'));
        await loader.load();
      }
    }();

/// Skia shapes Bengali conjuncts and vowel marks before PDF embedding. Latin
/// text stays native PDF text. No document content leaves the device.
class ReportLayout {
  final _cache = <String, (pw.MemoryImage, double)>{};
  Future<pw.Widget> text(String value,
      {double width = 510, double size = 10}) async {
    if (!RegExp(r'[\u0980-\u09ff]').hasMatch(value)) {
      return pw.Text(value, style: pw.TextStyle(fontSize: size));
    }
    final key = '$width:$size:$value';
    final cached = _cache[key];
    if (cached != null) {
      return pw.Image(cached.$1, width: width, height: cached.$2);
    }
    await _loadFonts();
    final paragraph = (ui.ParagraphBuilder(ui.ParagraphStyle(
            fontSize: size, fontFamily: 'ReportNotoSansBengali', height: 1.35))
          ..pushStyle(ui.TextStyle(
              color: const ui.Color(0xff17231f),
              fontFamily: 'ReportNotoSansBengali',
              fontFamilyFallback: ['ReportNotoSans'],
              fontSize: size))
          ..addText(value))
        .build()
      ..layout(ui.ParagraphConstraints(width: width));
    const scale = 3.0;
    final recorder = ui.PictureRecorder();
    final canvas = ui.Canvas(recorder)..scale(scale);
    canvas.drawColor(const ui.Color(0xffffffff), ui.BlendMode.src);
    canvas.drawParagraph(paragraph, ui.Offset.zero);
    final picture = recorder.endRecording();
    final raster = await picture.toImage(
        (width * scale).ceil(), ((paragraph.height + 2) * scale).ceil());
    final data = await raster.toByteData(format: ui.ImageByteFormat.png);
    if (data == null) throw StateError('Could not render report text.');
    final provider = pw.MemoryImage(
        data.buffer.asUint8List(data.offsetInBytes, data.lengthInBytes));
    final widget =
        pw.Image(provider, width: width, height: paragraph.height + 2);
    raster.dispose();
    picture.dispose();
    paragraph.dispose();
    _cache[key] = (provider, widget.height!);
    return widget;
  }

  Future<pw.Widget> table(List<String> headers, List<List<String>> rows,
      List<double> widths) async {
    final prepared = <pw.TableRow>[];
    for (var n = -1; n < rows.length; n++) {
      final row = n < 0 ? headers : rows[n];
      final cells = <pw.Widget>[];
      for (var c = 0; c < row.length; c++) {
        cells.add(pw.Padding(
            padding: const pw.EdgeInsets.all(5),
            child: await text(row[c], width: widths[c] - 10, size: 9)));
      }
      prepared.add(pw.TableRow(repeat: n < 0, children: cells));
    }
    return pw.Table(columnWidths: {
      for (var n = 0; n < widths.length; n++) n: pw.FixedColumnWidth(widths[n])
    }, children: prepared);
  }
}
