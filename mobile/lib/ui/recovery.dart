import 'localization.dart';
import 'dart:convert';
import 'dart:typed_data';
import 'package:cryptography/cryptography.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../app/providers.dart';
import '../core/database.dart';
import '../core/repository.dart';
import '../core/vault.dart';
import 'design.dart';

/// Recovery switches to a newly verified vault. The unreadable vault is retained.
class RecoveryScreen extends ConsumerStatefulWidget {
  const RecoveryScreen({super.key, required this.onRecovered});
  final VoidCallback onRecovered;
  @override
  ConsumerState<RecoveryScreen> createState() => _RecoveryScreenState();
}

class _RecoveryScreenState extends ConsumerState<RecoveryScreen> {
  final _password = TextEditingController();
  String? _filename, _error;
  Uint8List? _backupBytes;
  bool _busy = false;
  @override
  void dispose() {
    _password.dispose();
    super.dispose();
  }

  Future<void> _restore() async {
    if (_backupBytes == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    FinanceRepository? recovered;
    try {
      if (_backupBytes!.length > 50 * 1024 * 1024) {
        throw const FormatException('Backup is too large.');
      }
      final payload =
          await BackupCodec.decode(utf8.decode(_backupBytes!), _password.text);
      final records = FinanceRepository.validateBackup(payload);
      if (!mounted ||
          !await confirm(context, 'Recover ${records.length} records?',
              'A new private vault will be created from this backup. The previous vault file will be retained. Cloud sync starts disconnected.',
              action: 'Recover')) return;
      final filename = 'hisabnikash-recovered-${const Uuid().v4()}.sqlite';
      final key = await AesGcm.with256bits().newSecretKey();
      recovered = FinanceRepository(
          await FinanceDatabase.named(filename), VaultCipher(key));
      await recovered.restore(payload);
      await recovered.dispose();
      recovered = null;
      // The pointer is changed last. Any earlier failure leaves the previous
      // vault and its key selected, so interrupted recovery is safe to retry.
      await secureStorage.write(
          key: 'vaultKey:$filename',
          value: base64Encode(await key.extractBytes()));
      await secureStorage.write(key: 'activeVault', value: filename);
      if (!mounted) return;
      ref.invalidate(snapshotProvider);
      ref.invalidate(syncProvider);
      ref.invalidate(repositoryProvider);
      Navigator.pop(context);
      widget.onRecovered();
    } catch (e) {
      if (mounted) {
        setState(() => _error = e is FormatException
            ? e.message
            : 'Recovery could not finish. Your previous vault has been retained.');
      }
    } finally {
      if (recovered != null) await recovered.dispose();
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: const LText('Recover your vault')),
      body: Center(
          child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 560),
              child: ListView(padding: const EdgeInsets.all(24), children: [
                const Icon(Icons.lock_reset, size: 56, color: forest),
                const SizedBox(height: 24),
                LText('Start from your safe copy.',
                    style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: 16),
                const LText(
                    'Choose an encrypted .hnb backup and enter its password. Device encryption keys and forgotten backup passwords cannot be reconstructed.'),
                const SizedBox(height: 24),
                OutlinedButton.icon(
                    onPressed: _busy
                        ? null
                        : () async {
                            final result = await FilePicker.platform
                                .pickFiles(withData: true);
                            if (result != null && mounted) {
                              setState(() {
                                _filename = result.files.single.name;
                                _backupBytes = result.files.single.bytes;
                              });
                            }
                          },
                    icon: const Icon(Icons.folder_open),
                    label: LText(_filename ?? 'Choose backup')),
                const SizedBox(height: 16),
                TextField(
                    controller: _password,
                    obscureText: true,
                    decoration: InputDecoration(
                        labelText: localText(context, 'Backup password'))),
                if (_error != null)
                  Padding(
                      padding: const EdgeInsets.only(top: 16),
                      child:
                          LText(_error!, style: const TextStyle(color: rust))),
                const SizedBox(height: 24),
                FilledButton(
                    onPressed: _busy || _backupBytes == null ? null : _restore,
                    child: LText(_busy ? 'Recovering…' : 'Verify and recover')),
              ]))));
}
