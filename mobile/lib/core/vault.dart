import 'dart:convert';
import 'dart:typed_data';
import 'package:cryptography/cryptography.dart';
import 'models.dart';

class VaultCipher {
  VaultCipher(this.key);
  final SecretKey key;
  final _algorithm = AesGcm.with256bits();
  Future<String> seal(Object? value) async {
    final box = await _algorithm.encrypt(utf8.encode(jsonEncode(value)),
        secretKey: key);
    return base64Encode(box.concatenation());
  }

  Future<dynamic> open(String value) async {
    final box = SecretBox.fromConcatenation(base64Decode(value),
        nonceLength: 12, macLength: 16);
    return jsonDecode(
        utf8.decode(await _algorithm.decrypt(box, secretKey: key)));
  }
}

class BackupCodec {
  static const maxBytes = 50 * 1024 * 1024;
  static final _kdf =
      Pbkdf2(macAlgorithm: Hmac.sha256(), iterations: 210000, bits: 256);
  static Future<String> encode(Json data, String password) async {
    if (password.length < 12) {
      throw const FormatException(
          'Use at least 12 characters for your backup password.');
    }
    final salt = AesGcm.with256bits().newNonce();
    final key = await _kdf.deriveKey(
        secretKey: SecretKey(utf8.encode(password)), nonce: salt);
    final encoded = jsonEncode({
      'format': 'hisabnikash-backup',
      'version': 1,
      'salt': base64Encode(salt),
      'payload': await VaultCipher(key).seal(data)
    });
    if (utf8.encode(encoded).length > maxBytes) {
      throw const FormatException(
          'Backup exceeds the 50 MiB restore limit. No incomplete backup was saved.');
    }
    return encoded;
  }

  static Future<Json> decode(String raw, String password) async {
    if (utf8.encode(raw).length > maxBytes) {
      throw const FormatException('Backup is too large.');
    }
    final envelope = jsonDecode(raw) as Json;
    if (envelope['format'] != 'hisabnikash-backup' ||
        envelope['version'] != 1) {
      throw const FormatException('Unsupported backup format.');
    }
    final salt = Uint8List.fromList(base64Decode(envelope['salt'] as String));
    final key = await _kdf.deriveKey(
        secretKey: SecretKey(utf8.encode(password)), nonce: salt);
    try {
      return await VaultCipher(key).open(envelope['payload'] as String) as Json;
    } on SecretBoxAuthenticationError {
      throw const FormatException('Incorrect password or damaged backup.');
    }
  }
}
