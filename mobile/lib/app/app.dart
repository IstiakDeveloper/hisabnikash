import '../ui/localization.dart';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:local_auth/local_auth.dart';
import '../ui/design.dart';
import '../ui/brand.dart';
import '../ui/onboarding.dart';
import '../ui/shell.dart';
import '../ui/recovery.dart';
import '../core/money.dart';
import 'providers.dart';

class HisabNikashApp extends ConsumerWidget {
  const HisabNikashApp({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) => MaterialApp(
      title: 'HisabNikash',
      debugShowCheckedModeBanner: false,
      theme: appTheme(false),
      darkTheme: appTheme(true),
      themeMode: ref.watch(darkProvider) ? ThemeMode.dark : ThemeMode.light,
      locale: Locale(ref.watch(languageProvider)),
      supportedLocales: const [Locale('en'), Locale('bn')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      builder: (context, child) => Consumer(
          builder: (context, ref, _) => Stack(children: [
                if (child != null) child,
                if (ref.watch(vaultShieldProvider))
                  Positioned.fill(
                      child: Material(
                          color: Theme.of(context).scaffoldBackgroundColor,
                          child: SafeArea(
                              child: Center(
                                  child: Column(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                const BrandMark(size: 72),
                                const SizedBox(height: 24),
                                LText(tr(ref, 'Your accounts are locked',
                                    'আপনার হিসাব লক করা আছে')),
                                const SizedBox(height: 20),
                                FilledButton.icon(
                                    onPressed: ref.watch(vaultUnlockProvider),
                                    icon: const Icon(Icons.lock_open),
                                    label: LText(tr(ref, 'Unlock', 'আনলক')))
                              ])))))
              ])),
      home: const AppGate());
}

class AppGate extends ConsumerStatefulWidget {
  const AppGate({super.key});
  @override
  ConsumerState<AppGate> createState() => _AppGateState();
}

class _AppGateState extends ConsumerState<AppGate> with WidgetsBindingObserver {
  bool _ready = false,
      _onboarded = false,
      _locked = false,
      _locking = false,
      _covered = false;
  Object? _error;
  Timer? _syncTimer;
  Timer? _pollTimer;
  Timer? _reminderTimer;
  String _localDay = dayKey(financeNow());
  StreamSubscription<void>? _subscription;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
  }

  Future<void> _load() async {
    try {
      final repository = await ref.read(repositoryProvider.future);
      final onboarded = await repository.getSetting('onboarded') == 'true';
      final lock = await repository.getSetting('lock') == 'true';
      final dark = await repository.getSetting('dark') == 'true';
      final language = await repository.getSetting('language') ?? 'en';
      final savedSpace = await repository.getSetting('selectedSpace') ?? 'all';
      final state = await repository.snapshot();
      if (!mounted) return;
      ref.read(darkProvider.notifier).state = dark;
      ref.read(languageProvider.notifier).state = language;
      ref.read(spaceProvider.notifier).state = savedSpace == 'all' ||
              state.of('space').any((r) => r.id == savedSpace)
          ? savedSpace
          : 'all';
      setState(() {
        _ready = true;
        _onboarded = onboarded;
        _locked = lock;
      });
      ref.read(vaultUnlockProvider.notifier).state = _unlock;
      ref.read(vaultShieldProvider.notifier).state = lock;
      _subscription = repository.changes.stream.listen((_) async {
        _reminderTimer?.cancel();
        _reminderTimer = Timer(const Duration(milliseconds: 400), () async {
          try {
            await ref.read(remindersProvider).reconcile(repository);
          } catch (_) {/* Inbox can retry. */}
        });
        final queued = await repository.db
            .customSelect('SELECT COUNT(*) AS n FROM outbox WHERE blocked = 0')
            .getSingle();
        if (queued.read<int>('n') == 0) return;
        _syncTimer?.cancel();
        _syncTimer = Timer(const Duration(seconds: 3), _sync);
      });
      // Periodic foreground retry also covers recovery from lost connectivity.
      _sync();
      try {
        await ref.read(remindersProvider).reconcile(repository);
      } catch (_) {/* Retry in settings. */}
      final response = ref.read(remindersProvider).launchResponse;
      if (response != null) {
        ref.read(notificationResponseProvider.notifier).state = response;
      }
      _pollTimer = Timer.periodic(const Duration(seconds: 45), (_) {
        _refreshLocalDate();
        _sync();
      });
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  Future<void> _sync() async {
    if (!mounted || _locked || _covered) return;
    try {
      await (await ref.read(syncProvider.future)).sync();
    } catch (_) {/* Pending data stays local. */}
  }

  Future<void> _refreshLocalDate() async {
    if (!mounted || _locked || _covered) return;
    final today = dayKey(financeNow());
    if (today == _localDay) return;
    try {
      final repository = await ref.read(repositoryProvider.future);
      await repository.ensureBillOccurrences();
      repository.changes.add(null);
      _localDay = today;
    } catch (_) {/* Retry on resume or the next foreground tick. */}
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) async {
    if (_locking) return;
    if (state != AppLifecycleState.resumed) {
      ref.read(vaultShieldProvider.notifier).state = true;
      if (mounted) setState(() => _covered = true);
      if (state == AppLifecycleState.paused) {
        final repository = await ref.read(repositoryProvider.future);
        final lock = await repository.getSetting('lock') == 'true';
        if (mounted) setState(() => _locked = lock);
      }
    } else {
      if (mounted) setState(() => _covered = false);
      ref.read(vaultShieldProvider.notifier).state = _locked;
      _refreshLocalDate();
      _sync();
      try {
        await ref
            .read(remindersProvider)
            .reconcile(await ref.read(repositoryProvider.future));
      } catch (_) {/* Retry later. */}
    }
  }

  Future<void> _unlock() async {
    _locking = true;
    try {
      final success = await LocalAuthentication().authenticate(
          localizedReason: 'Unlock your private financial records',
          options: const AuthenticationOptions(stickyAuth: true));
      if (success && mounted) {
        ref.read(vaultShieldProvider.notifier).state = false;
        setState(() {
          _locked = false;
          _covered = false;
        });
        _refreshLocalDate();
      }
    } catch (_) {
      if (mounted) {
        feedbackMessage(context,
            'Device authentication is unavailable. Check your device security settings.');
      }
    } finally {
      _locking = false;
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _syncTimer?.cancel();
    _pollTimer?.cancel();
    _reminderTimer?.cancel();
    _subscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Scaffold(
          body: Center(
              child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(Icons.lock_outline, size: 48),
                    const SizedBox(height: 24),
                    const LText('Your vault could not be opened'),
                    const SizedBox(height: 12),
                    const LText(
                        'Your saved data has not been changed. Try opening the vault again or recover from an encrypted backup.',
                        textAlign: TextAlign.center),
                    TextButton(
                        onPressed: () {
                          setState(() => _error = null);
                          _load();
                        },
                        child: const LText('Try again')),
                    const SizedBox(height: 24),
                    FilledButton(
                        onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => RecoveryScreen(onRecovered: () {
                                      _subscription?.cancel();
                                      _syncTimer?.cancel();
                                      _pollTimer?.cancel();
                                      setState(() {
                                        _error = null;
                                        _ready = false;
                                      });
                                      _load();
                                    }))),
                        child: const LText('Recover from backup')),
                  ]))));
    }
    if (!_ready) {
      return StartupView(bangla: ref.watch(languageProvider) == 'bn');
    }
    if (_locked || _covered) {
      return Scaffold(
          body: Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
        const BrandMark(size: 72),
        const SizedBox(height: 20),
        LText('HisabNikash', style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: 12),
        const LText('Your money. Your peace of mind.'),
        const SizedBox(height: 28),
        if (_locked)
          FilledButton.icon(
              onPressed: _unlock,
              icon: const Icon(Icons.fingerprint),
              label: const LText('Unlock')),
      ])));
    }
    if (!_onboarded) {
      return Onboarding(onComplete: () => setState(() => _onboarded = true));
    }
    return const AppShell();
  }
}
