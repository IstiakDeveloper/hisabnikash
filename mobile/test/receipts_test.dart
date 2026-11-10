import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as image;
import 'package:hisabnikash_mobile/core/receipts.dart';

void main() {
  test(
      'phone photo is oriented, resized and stripped of EXIF within the storage cap',
      () {
    final source = image.Image(width: 1800, height: 1200);
    source.exif.imageIfd.orientation = 6;
    final prepared = prepareReceipt(image.encodeJpg(source));
    final result = image.decodeJpg(prepared)!;
    expect(result.height, 1600);
    expect(result.width, lessThan(1600));
    expect(prepared.length, lessThanOrEqualTo(512 * 1024));
    expect(result.exif.imageIfd.orientation, isNull);
  });
  test('invalid attachment bytes are rejected', () {
    expect(() => prepareReceipt(Uint8List.fromList([1, 2, 3])),
        throwsFormatException);
    expect(() => prepareReceipt(Uint8List(12 * 1024 * 1024 + 1)),
        throwsFormatException);
  });
}
