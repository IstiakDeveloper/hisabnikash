import 'localization.dart';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:local_auth/local_auth.dart';
import 'package:share_plus/share_plus.dart';
import '../app/providers.dart';
import '../core/models.dart';
import '../core/money.dart';
import '../core/vault.dart';
import '../core/reports.dart';
import '../core/repository.dart';
import 'design.dart';
import 'brand.dart';
import 'editors.dart';
import 'spaces.dart';
import 'statement.dart';
import 'finance_center.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen(this.state, {super.key});
  final FinanceSnapshot state;
  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _busy = false, _lock = false, _reminders = false;
  String? _cloud, _lastSync;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final repository = await ref.read(repositoryProvider.future);
    final cloud = await repository.getSetting('cloudUser');
    final lock = await repository.getSetting('lock') == 'true';
    final lastSync = await repository.getSetting('lastSync');
    final reminders = await repository.getSetting('reminders') == 'true';
    if (mounted) {
      setState(() {
        _cloud = cloud;
        _lock = lock;
        _lastSync = lastSync;
        _reminders = reminders;
      });
    }
  }

  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await action();
      await _load();
    } catch (e) {
      if (mounted) {
        feedbackMessage(
            context,
            e is FormatException
                ? e
                : 'The operation could not finish. Your local data is safe. Check connectivity or try again.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<String?> _password({required bool creating}) async {
    final controller = TextEditingController();
    final form = GlobalKey<FormState>();
    final result = await showDialog<String>(
        context: context,
        builder: (context) => AlertDialog(
                title:
                    LText(creating ? 'Protect your backup' : 'Unlock backup'),
                content: Form(
                    key: form,
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      LText(creating
                          ? 'Use at least 12 characters. Keep this password safe; it cannot be recovered.'
                          : 'Enter the password used when this backup was created.'),
                      const SizedBox(height: 18),
                      TextFormField(
                          controller: controller,
                          obscureText: true,
                          decoration: InputDecoration(
                              labelText: localText(context, 'Backup password')),
                          validator: (v) =>
                              v == null || v.length < (creating ? 12 : 1)
                                  ? localText(context, 'Enter a valid password')
                                  : null),
                    ])),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const LText('Cancel')),
                  FilledButton(
                      onPressed: () {
                        if (form.currentState!.validate()) {
                          Navigator.pop(context, controller.text);
                        }
                      },
                      child: const LText('Continue'))
                ]));
    WidgetsBinding.instance.addPostFrameCallback((_) => controller.dispose());
    return result;
  }

  Future<void> _share(String filename, String content, String type) async {
    await _shareBytes(filename, Uint8List.fromList(utf8.encode(content)), type);
  }

  Future<void> _shareBytes(
      String filename, Uint8List bytes, String type) async {
    if (!mounted) return;
    final box = context.findRenderObject() as RenderBox?;
    await Share.shareXFiles(
        [XFile.fromData(bytes, mimeType: type, name: filename)],
        fileNameOverrides: [filename],
        sharePositionOrigin:
            box == null ? null : box.localToGlobal(Offset.zero) & box.size);
  }

  Future<bool> _backup() async {
    final password = await _password(creating: true);
    if (password == null) return false;
    final repository = await ref.read(repositoryProvider.future);
    final content =
        await BackupCodec.encode(await repository.exportData(), password);
    await _share('hisabnikash-${financeNow().millisecondsSinceEpoch}.hnb',
        content, 'application/octet-stream');
    await repository.setSetting(
        'lastBackupExport', financeNow().toUtc().toIso8601String());
    return true;
  }

  Future<void> _restore() async {
    if (_cloud != null) {
      throw const FormatException('Disconnect sync before restoring a backup.');
    }
    final selection =
        await FilePicker.platform.pickFiles(type: FileType.any, withData: true);
    if (selection == null || !mounted) return;
    final file = selection.files.single;
    if (file.bytes == null) {
      throw const FormatException(
          'This file is unavailable. Save it on your device first.');
    }
    if (file.size > 50 * 1024 * 1024) {
      throw const FormatException('Backup is too large.');
    }
    if (!mounted) return;
    final password = await _password(creating: false);
    if (password == null) return;
    final decoded =
        await BackupCodec.decode(utf8.decode(file.bytes!), password);
    final records = (decoded['records'] as List?)?.length ?? 0;
    if (!mounted ||
        !await confirm(context, 'Replace this device’s data?',
            'This backup contains $records records. Your current vault will be replaced. Export a current backup first if you need to keep it.',
            action: 'Review safety backup')) return;
    // Require a safety copy before replacing existing financial data.
    if (!await _backup()) return;
    if (!mounted ||
        !await confirm(context, 'Safety backup saved?',
            'Confirm that you saved the current backup from the share sheet before replacing this vault.',
            action: 'Replace and restore')) return;
    await (await ref.read(repositoryProvider.future)).restore(decoded);
    ref.read(spaceProvider.notifier).state = 'all';
    if (mounted) feedbackMessage(context, 'Backup restored on this device');
  }

  Future<void> _toggleLock(bool enabled) async {
    final enableReason =
        localText(context, 'Enable protection for your financial records');
    final disableReason =
        localText(context, 'Confirm before disabling app lock');
    if (enabled) {
      final auth = LocalAuthentication();
      if (!await auth.isDeviceSupported() ||
          !await auth.authenticate(localizedReason: enableReason)) {
        return;
      }
    } else {
      final success = await LocalAuthentication()
          .authenticate(localizedReason: disableReason);
      if (!success) return;
    }
    await (await ref.read(repositoryProvider.future))
        .setSetting('lock', '$enabled');
    if (mounted) setState(() => _lock = enabled);
  }

  @override
  Widget build(BuildContext context) =>
      ListView(padding: const EdgeInsets.fromLTRB(24, 8, 24, 32), children: [
        Surface(
            child: Row(children: [
          Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                  color: mint, borderRadius: BorderRadius.circular(18)),
              child: const BrandMark(size: 42)),
          const SizedBox(width: 16),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                LText(
                    tr(ref, 'Your money, your control.',
                        'আপনার টাকা, আপনার নিয়ন্ত্রণ।'),
                    style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 6),
                const LText('Private vault · BDT',
                    style: TextStyle(fontSize: 12)),
              ]))
        ])),
        if (_busy)
          const Padding(
              padding: EdgeInsets.only(top: 16),
              child: LinearProgressIndicator()),
        SectionTitle(tr(ref, 'Accounts & spaces', 'অ্যাকাউন্ট ও প্রোফাইল')),
        Surface(
            padding: 8,
            child: Column(children: [
              ...widget.state.of('account').map((r) => ListTile(
                  leading: const Icon(Icons.account_balance_wallet_outlined),
                  title: Text(r.text('name')),
                  onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) => AccountStatement(r.id))),
                  subtitle: LText(
                      widget.state.find(r.text('space'))?.text('name') ?? ''),
                  trailing: PopupMenuButton<String>(
                      onSelected: (v) async {
                        if (v == 'edit') {
                          await openEditor(context, 'account', record: r);
                        }
                        if (!context.mounted) return;
                        if (v == 'delete' &&
                            await confirm(context, 'Delete account?',
                                'Accounts with transactions are protected.',
                                action: 'Delete')) {
                          await _run(() async =>
                              (await ref.read(repositoryProvider.future))
                                  .remove(r));
                        }
                      },
                      itemBuilder: (_) => [
                            const PopupMenuItem(
                                value: 'edit', child: LText('Edit')),
                            const PopupMenuItem(
                                value: 'delete', child: LText('Delete'))
                          ]))),
              ListTile(
                  leading: const Icon(Icons.add),
                  title: const LText('Add account'),
                  onTap: () => openEditor(context, 'account')),
              const Divider(),
              ListTile(
                  leading: const Icon(Icons.workspaces_outline),
                  title: const LText('Manage spaces'),
                  subtitle: LText(
                      '${widget.state.of('space').length} personal and business spaces'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => openSpaces(context)),
              ...widget.state.of('space').map((r) => ListTile(
                  leading: const Icon(Icons.workspaces_outline),
                  title: Text(r.text('name')),
                  onTap: () => openEditor(context, 'space', record: r))),
              ...widget.state.of('category').map((r) => ListTile(
                  leading: const Icon(Icons.category_outlined),
                  title: Text(r.text('name')),
                  subtitle: LText(
                      '${r.text('type')} · ${widget.state.find(r.text('space'))?.text('name')}'),
                  onTap: () => openEditor(context, 'category', record: r))),
              ListTile(
                  leading: const Icon(Icons.playlist_add),
                  title: const LText('Add custom category'),
                  onTap: () => openEditor(context, 'category')),
              ListTile(
                  leading: const Icon(Icons.add_business_outlined),
                  title: const LText('Add space'),
                  onTap: () => openEditor(context, 'space')),
            ])),
        SectionTitle(tr(ref, 'Make it yours', 'আপনার পছন্দ')),
        Surface(
            padding: 8,
            child: Column(children: [
              SwitchListTile(
                  title: LText(tr(ref, 'Dark appearance', 'ডার্ক থিম')),
                  secondary: const Icon(Icons.dark_mode_outlined),
                  value: ref.watch(darkProvider),
                  onChanged: (value) => _run(() async {
                        ref.read(darkProvider.notifier).state = value;
                        await (await ref.read(repositoryProvider.future))
                            .setSetting('dark', '$value');
                      })),
              SwitchListTile(
                  title: const LText('বাংলা'),
                  subtitle: const LText('Navigation and core labels'),
                  secondary: const Icon(Icons.language),
                  value: ref.watch(languageProvider) == 'bn',
                  onChanged: (value) => _run(() async {
                        ref.read(languageProvider.notifier).state =
                            value ? 'bn' : 'en';
                        await (await ref.read(repositoryProvider.future))
                            .setSetting('language', value ? 'bn' : 'en');
                      })),
              SwitchListTile(
                  title: const LText('Device authentication'),
                  subtitle: const LText(kIsWeb
                      ? 'Available in Android and iOS apps'
                      : 'Lock when the app enters the background'),
                  secondary: const Icon(Icons.fingerprint),
                  value: _lock,
                  onChanged: _busy || kIsWeb
                      ? null
                      : (value) => _run(() => _toggleLock(value))),
              ListTile(
                  leading: const Icon(Icons.notifications_active_outlined),
                  title: LText(tr(ref, 'Smart reminders and finance tools',
                      'স্মার্ট রিমাইন্ডার ও হিসাবের সুবিধা')),
                  subtitle: LText(tr(
                      ref,
                      'Daily review, budgets, bills, business and recovery',
                      'দৈনিক হিসাব, বাজেট, বিল, ব্যবসা ও তথ্য ফেরত')),
                  onTap: () => openFinanceCenter(context, tab: 4)),
              SwitchListTile(
                  title: const LText('Private bill reminders'),
                  subtitle: const LText(kIsWeb
                      ? 'Available in Android and iOS apps'
                      : '3 days, 1 day and due day · 9 AM'),
                  secondary: const Icon(Icons.notifications_outlined),
                  value: _reminders,
                  onChanged: _busy || kIsWeb
                      ? null
                      : (value) => _run(() async {
                            final service = ref.read(remindersProvider);
                            if (value && !await service.requestPermission()) {
                              throw const FormatException(
                                  'Notification permission was not granted. Enable it in device settings.');
                            }
                            await (await ref.read(repositoryProvider.future))
                                .setSetting('reminders', '$value');
                            final repository =
                                await ref.read(repositoryProvider.future);
                            final prefs =
                                await repository.privateData('notifications');
                            await repository.writePrivate(
                                'notifications', {...prefs, 'bills': value});
                            await service.reconcile(repository);
                          })),
            ])),
        SectionTitle(tr(ref, 'Sync & recovery', 'সিঙ্ক ও ব্যাকআপ')),
        Surface(
            padding: 8,
            child: Column(children: [
              ListTile(
                  leading: const Icon(Icons.cloud_sync_outlined),
                  title: LText(_cloud == null
                      ? 'Enable optional cloud sync'
                      : 'Sync connected'),
                  subtitle: LText(_cloud == null
                      ? 'Your app works fully without an account'
                      : '${ref.watch(syncStatusProvider).valueOrNull ?? 'Ready'}\n${widget.state.pending} queued · Last attempt: ${_lastSync ?? 'not yet'}'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: _busy
                      ? null
                      : () => _run(() async {
                            if (_cloud == null) {
                              await Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                      builder: (_) =>
                                          const SyncConnectScreen()));
                            } else {
                              await (await ref.read(syncProvider.future))
                                  .sync();
                              final latest = await (await ref
                                      .read(repositoryProvider.future))
                                  .snapshot();
                              if (context.mounted) {
                                feedbackMessage(
                                    context,
                                    latest.conflicts > 0
                                        ? '${latest.conflicts} conflicts need review.'
                                        : latest.pending > 0
                                            ? '${latest.pending} changes still queued. Sync again to continue.'
                                            : 'All changes synced.');
                              }
                            }
                          })),
              if (_cloud != null)
                ListTile(
                    leading: const Icon(Icons.cloud_off_outlined),
                    title: const LText('Disconnect sync'),
                    subtitle: const LText(
                        'Keeps local data. Offline token revocation retries on next connect.'),
                    onTap: _busy
                        ? null
                        : () => _run(() async {
                              if (await confirm(
                                  context,
                                  'Disconnect this device?',
                                  'Pending changes will remain on this device until you reconnect.')) {
                                await (await ref.read(syncProvider.future))
                                    .disconnect();
                              }
                            })),
              if (widget.state.conflicts > 0)
                ListTile(
                    leading: const Icon(Icons.merge_type, color: rust),
                    title: LText(
                        '${widget.state.conflicts} conflicts need review'),
                    onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const ConflictsScreen()))),
              ListTile(
                  leading: const Icon(Icons.lock_outline),
                  title: const LText('Export encrypted backup'),
                  subtitle: const LText('Password-protected .hnb file'),
                  onTap: _busy ? null : () => _run(_backup)),
              ListTile(
                  leading: const Icon(Icons.restore),
                  title: const LText('Restore backup'),
                  onTap: _busy ? null : () => _run(_restore)),
              ListTile(
                  leading: const Icon(Icons.table_chart_outlined),
                  title: const LText('Export transactions as CSV'),
                  subtitle: const LText(
                      'Readable file: contains private financial information'),
                  onTap: _busy
                      ? null
                      : () => _run(() async {
                            final repository =
                                await ref.read(repositoryProvider.future);
                            await _share(
                                'hisabnikash-transactions.csv',
                                '\uFEFF${repository.csv(widget.state)}',
                                'text/csv');
                          })),
              ListTile(
                  leading: const Icon(Icons.picture_as_pdf_outlined),
                  title: const LText('Export monthly PDF report'),
                  subtitle: const LText('Uses the selected space and month'),
                  onTap: _busy
                      ? null
                      : () => _run(() async {
                            final bytes = await monthlyReport(
                                widget.state,
                                ref.read(spaceProvider),
                                ref.read(monthProvider),
                                language: ref.read(languageProvider));
                            await _shareBytes('hisabnikash-monthly.pdf', bytes,
                                'application/pdf');
                          })),
            ])),
        const SizedBox(height: 28),
        const LText(
            'HISABNIKASH · 0.3.1\nBuilt for a little more peace of mind.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, height: 1.8)),
      ]);
}

class SyncConnectScreen extends ConsumerStatefulWidget {
  const SyncConnectScreen({super.key});
  @override
  ConsumerState<SyncConnectScreen> createState() => _SyncConnectScreenState();
}

class _SyncConnectScreenState extends ConsumerState<SyncConnectScreen> {
  final _url = TextEditingController(),
      _email = TextEditingController(),
      _password = TextEditingController();
  bool _busy = false;
  String? _error;
  @override
  void dispose() {
    _url.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _connect() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final repository = await ref.read(repositoryProvider.future);
      final restored =
          await repository.getSetting('restoreCloudReview') == 'true';
      if (restored) {
        if (!mounted) return;
        if (!await confirm(context, 'Merge restored data with cloud?',
            'Cloud records will be downloaded. Restored records, including deletions, will be uploaded and may require conflict review. Keep your encrypted backup before continuing.',
            action: 'Merge and connect')) return;
      }
      await (await ref.read(syncProvider.future)).connect(
          _url.text, _email.text, _password.text,
          allowRestoredMerge: restored);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        setState(() => _error = e is FormatException
            ? e.message
            : 'Could not connect. Check your server, credentials, and internet connection.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: const LText('Connect sync')),
      body: Center(
          child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 600),
              child: ListView(padding: const EdgeInsets.all(24), children: [
                const Icon(Icons.cloud_sync_outlined, size: 54, color: forest),
                const SizedBox(height: 24),
                LText('Your money, in step.',
                    style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: 12),
                const LText(
                    'Connect to your HisabNikash sync server using an existing account. This device will upload its local records and download your other device changes. Conflicting edits require your review.'),
                const SizedBox(height: 28),
                TextField(
                    controller: _url,
                    keyboardType: TextInputType.url,
                    decoration: InputDecoration(
                        labelText: localText(context, 'HTTPS server'),
                        hintText:
                            localText(context, 'https://sync.example.com'))),
                const SizedBox(height: 16),
                TextField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.username],
                    decoration: InputDecoration(
                        labelText: localText(context, 'Email'))),
                const SizedBox(height: 16),
                TextField(
                    controller: _password,
                    obscureText: true,
                    autofillHints: const [AutofillHints.password],
                    decoration: InputDecoration(
                        labelText: localText(context, 'Password'))),
                if (_error != null)
                  Padding(
                      padding: const EdgeInsets.only(top: 20),
                      child:
                          LText(_error!, style: const TextStyle(color: rust))),
                const SizedBox(height: 24),
                FilledButton(
                    onPressed: _busy ? null : _connect,
                    child: LText(_busy ? 'Connecting…' : 'Connect and sync')),
                const SizedBox(height: 20),
                const LText(
                    'Sync stores encrypted financial payloads on your server. It is not end-to-end encrypted. Keep a separate encrypted backup.',
                    style: TextStyle(fontSize: 12)),
              ]))));
}

class ConflictsScreen extends ConsumerWidget {
  const ConflictsScreen({super.key});
  Widget summary(Json? data, FinanceSnapshot? state) {
    if (data == null) return const LText('Deleted');
    final labels = {
      'name': 'Name',
      'category': 'Category',
      'type': 'Type',
      'date': 'Date',
      'due': 'Due date',
      'month': 'Month',
      'frequency': 'Repeat',
      'direction': 'Direction',
      'note': 'Note'
    };
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      for (final field in labels.entries)
        if (data[field.key] is String && (data[field.key] as String).isNotEmpty)
          LText('${field.value}: ${data[field.key]}'),
      for (final field in {
        'amount': 'Amount',
        'opening': 'Opening balance',
        'principal': 'Principal',
        'target': 'Target',
        'saved': 'Saved'
      }.entries)
        if (data[field.key] is int)
          LText('${field.value}: ${money(data[field.key])}'),
      for (final field in {
        'space': 'Space',
        'account': 'Account',
        'destination': 'To account'
      }.entries)
        if (data[field.key] is String)
          LText(
              '${field.value}: ${state?.find(data[field.key])?.text('name') ?? 'Unavailable'}'),
    ]);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final snapshot = ref.watch(snapshotProvider).valueOrNull;
    return Scaffold(
        appBar: AppBar(title: const LText('Review sync conflicts')),
        body: FutureBuilder<List<Json>>(
            future: ref.read(syncProvider.future).then((s) => s.conflicts()),
            builder: (context, async) {
              if (!async.hasData) {
                return const VaultSkeleton();
              }
              final conflicts = async.data!;
              return ListView(padding: const EdgeInsets.all(24), children: [
                if (conflicts.isEmpty)
                  const EmptyState('Everything is in step',
                      'There are no conflicts to review.'),
                ...conflicts.map((conflict) {
                  final remote = conflict['remote'] as Json;
                  final duplicateBudget = remote['semanticTarget'] != null;
                  final local = snapshot?.find(duplicateBudget
                      ? remote['semanticTarget']
                      : conflict['id']);
                  return Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Surface(
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                            LText(
                                local?.text('name',
                                        local.text('category', local.kind)) ??
                                    'Deleted record',
                                style: Theme.of(context).textTheme.titleMedium),
                            const SizedBox(height: 14),
                            LText(duplicateBudget
                                ? 'Current budget'
                                : 'On this device'),
                            summary(local?.data, snapshot),
                            const SizedBox(height: 16),
                            LText('On server · revision ${remote['revision']}'),
                            if (duplicateBudget)
                              const LText(
                                  'Another budget for the same category and month. Choose one amount; both versions remain in history.'),
                            summary(
                                remote['deleted'] == true
                                    ? null
                                    : remote['data'] as Json,
                                snapshot),
                            const SizedBox(height: 16),
                            Wrap(spacing: 12, children: [
                              TextButton(
                                  onPressed: () async {
                                    if (!await confirm(
                                        context,
                                        'Keep this device version?',
                                        'The server version will be replaced after the next sync.')) {
                                      return;
                                    }
                                    try {
                                      await (await ref
                                              .read(syncProvider.future))
                                          .resolve(conflict['id'],
                                              keepLocal: true);
                                    } catch (e) {
                                      if (context.mounted) {
                                        feedbackMessage(context, e);
                                      }
                                    }
                                  },
                                  child: LText(local == null
                                      ? 'Keep deletion'
                                      : 'Keep this device')),
                              FilledButton(
                                  onPressed: () async {
                                    if (!await confirm(
                                        context,
                                        'Use server version?',
                                        'The current local version will remain in change history.')) {
                                      return;
                                    }
                                    try {
                                      await (await ref
                                              .read(syncProvider.future))
                                          .resolve(conflict['id'],
                                              keepLocal: false);
                                    } catch (e) {
                                      if (context.mounted) {
                                        feedbackMessage(context, e);
                                      }
                                    }
                                  },
                                  child: const LText('Use server')),
                            ]),
                          ])));
                }),
              ]);
            }));
  }
}
