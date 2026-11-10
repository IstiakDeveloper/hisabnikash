import 'dart:convert';
import 'dart:async';
import 'package:cryptography/cryptography.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../core/database.dart';
import '../core/models.dart';
import '../core/repository.dart';
import '../core/sync.dart';
import '../core/vault.dart';
import '../core/reminders.dart';

const secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(
        accessibility: KeychainAccessibility.first_unlock_this_device));

final repositoryProvider = FutureProvider<FinanceRepository>((ref) async {
  final filename =
      await secureStorage.read(key: 'activeVault') ?? 'hisabnikash.sqlite';
  if (!RegExp(r'^[a-zA-Z0-9.-]+\.sqlite$').hasMatch(filename)) {
    throw StateError('Invalid vault location.');
  }
  final database = await FinanceDatabase.named(filename);
  final keyName =
      filename == 'hisabnikash.sqlite' ? 'vaultKey' : 'vaultKey:$filename';
  var key = await secureStorage.read(key: keyName);
  if (key == null) {
    final count = (await database
            .customSelect('SELECT COUNT(*) AS n FROM records')
            .getSingle())
        .read<int>('n');
    if (count > 0) {
      await database.close();
      throw StateError(
          'The encryption key is missing. Restore your encrypted backup to recover this vault.');
    }
    key = base64Encode(
        await (await AesGcm.with256bits().newSecretKey()).extractBytes());
    await secureStorage.write(key: keyName, value: key);
  }
  final repository =
      FinanceRepository(database, VaultCipher(SecretKey(base64Decode(key))));
  ref.onDispose(repository.dispose);
  await repository.migrateDomain();
  return repository;
});

final snapshotProvider = StreamProvider<FinanceSnapshot>((ref) async* {
  final repository = await ref.watch(repositoryProvider.future);
  // Subscribe before initial read so no committed updates can be missed.
  final events = StreamController<void>();
  final subscription = repository.changes.stream.listen(events.add);
  ref.onDispose(() {
    subscription.cancel();
    events.close();
  });
  yield await repository.snapshot();
  await for (final _ in events.stream) {
    yield await repository.snapshot();
  }
});
final syncProvider = FutureProvider<SyncService>((ref) async {
  final service =
      SyncService(await ref.watch(repositoryProvider.future), secureStorage);
  ref.onDispose(service.dispose);
  return service;
});
final syncStatusProvider = StreamProvider<String>((ref) async* {
  final service = await ref.watch(syncProvider.future);
  final events = StreamController<String>();
  final subscription = service.status.stream.listen(events.add);
  ref.onDispose(() {
    subscription.cancel();
    events.close();
  });
  yield service.currentStatus;
  yield* events.stream;
});
final spaceProvider = StateProvider<String>((ref) => 'all');
Future<void> selectSpace(WidgetRef ref, String id) async {
  ref.read(spaceProvider.notifier).state = id;
  await (await ref.read(repositoryProvider.future))
      .setSetting('selectedSpace', id);
}

final monthProvider = StateProvider<DateTime>(
    (ref) => DateTime(DateTime.now().year, DateTime.now().month));
final darkProvider = StateProvider<bool>((ref) => false);
final languageProvider = StateProvider<String>((ref) => 'en');
final privacyProvider = StateProvider<bool>((ref) => false);
final navigationProvider = StateProvider<int>((ref) => 0);
final remindersProvider = Provider((ref) => ReminderService());

String tr(WidgetRef ref, String english, String bangla) =>
    ref.watch(languageProvider) == 'bn' ? bangla : english;
