import 'dart:typed_data';
import 'package:image/image.dart' as image;

/// Runs in a compute worker on native platforms. Stored receipts use no EXIF.
Uint8List prepareReceipt(Uint8List bytes) {
  try {
    return _prepare(bytes);
  } on FormatException {
    rethrow;
  } catch (_) {
    throw const FormatException(
        'This receipt is damaged or unsupported. Choose another JPG or PNG.');
  }
}

Uint8List _prepare(Uint8List bytes) {
  if (bytes.length > 12 * 1024 * 1024) {
    throw const FormatException('Choose a receipt under 12 MB.');
  }
  final decoder = image.findDecoderForData(bytes);
  if (decoder == null ||
      !{image.ImageFormat.jpg, image.ImageFormat.png}
          .contains(decoder.format)) {
    throw const FormatException('Choose a valid JPG or PNG receipt.');
  }
  final info = decoder.startDecode(bytes);
  if (info == null ||
      info.width <= 0 ||
      info.height <= 0 ||
      info.width * info.height > 24000000 ||
      info.width > 12000 ||
      info.height > 12000) {
    throw const FormatException(
        'Receipt dimensions are too large. Choose a photo up to 24 megapixels.');
  }
  final decoded = decoder.decodeFrame(0);
  if (decoded == null) {
    throw const FormatException('This receipt could not be opened.');
  }
  var oriented = image.bakeOrientation(decoded);
  if (oriented.width > 1600 || oriented.height > 1600) {
    oriented = image.copyResize(oriented,
        width: oriented.width >= oriented.height ? 1600 : null,
        height: oriented.height > oriented.width ? 1600 : null);
  }
  oriented.exif = image.ExifData();
  for (final quality in [85, 75, 65, 50]) {
    final result = image.encodeJpg(oriented, quality: quality);
    if (result.length <= 512 * 1024) return result;
  }
  throw const FormatException(
      'Receipt is still too detailed. Crop it and try again.');
}
