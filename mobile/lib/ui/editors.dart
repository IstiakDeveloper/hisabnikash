import 'dart:convert';
import 'dart:async';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../app/providers.dart';
import '../core/models.dart';
import '../core/money.dart';
import '../core/receipts.dart';
import '../core/repository.dart';
import 'design.dart';
import 'brand.dart';
import 'search_select.dart';
import 'finance_center.dart';
import 'localization.dart';

Future<void> openEditor(BuildContext context, String kind,
        {Record? record,
        String? initialSpace,
        String? initialType,
        Json? initialData}) =>
    Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => RecordEditor(
            kind: kind,
            record: record,
            initialSpace: initialSpace,
            initialData: initialData,
            initialType: initialType)));

class RecordEditor extends ConsumerStatefulWidget {
  const RecordEditor(
      {super.key,
      required this.kind,
      this.record,
      this.initialSpace,
      this.initialData,
      this.initialType});
  final String kind;
  final Record? record;
  final String? initialSpace, initialType;
  final Json? initialData;
  @override
  ConsumerState<RecordEditor> createState() => _RecordEditorState();
}

class _RecordEditorState extends ConsumerState<RecordEditor> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController(),
      _amount = TextEditingController(),
      _note = TextEditingController();
  final _fee = TextEditingController(text: '0');
  final _interval = TextEditingController(text: '7');
  List<Json>? _splits;
  bool _discretionary = false, _draftOffered = false, _saved = false;
  Timer? _draftTimer;
  Future<void>? _draftWrite;
  String? _queuedDraft;
  String get _draftKey => 'draft:${widget.kind}:${widget.record?.id ?? 'new'}';
  String _type = 'expense',
      _space = '',
      _account = '',
      _destination = '',
      _category = expenseCategories.first;
  String _frequency = 'monthly', _direction = 'borrowed';
  String _billScope = 'future';
  String _spaceType = 'personal', _accountType = 'cash';
  DateTime _date = financeNow();
  bool _initialized = false, _busy = false;
  String? _error;
  Json? _receipt;
  String? _initialDraft;
  bool _leaving = false;
  String get _draft => jsonEncode([
        _name.text,
        _amount.text,
        _note.text,
        _type,
        _space,
        _account,
        _destination,
        _category,
        _frequency,
        _direction,
        _spaceType,
        _accountType,
        dayKey(_date),
        _receipt,
        _billScope,
        _fee.text,
        _splits,
        _discretionary,
        _interval.text
      ]);
  @override
  void initState() {
    super.initState();
    for (final c in [_name, _amount, _note, _fee, _interval]) {
      c.addListener(_queueDraft);
    }
  }

  void _queueDraft() {
    if (!_initialized ||
        _initialDraft == null ||
        _saved ||
        _draft == _queuedDraft) return;
    _queuedDraft = _draft;
    _draftTimer?.cancel();
    if (_draft == _initialDraft) return;
    _draftTimer = Timer(const Duration(milliseconds: 700), () async {
      try {
        _draftWrite = (await ref.read(repositoryProvider.future)).writePrivate(
            _draftKey,
            {
              'values': jsonDecode(_draft),
              'sourceVersion': widget.record?.localVersion
            },
            notify: false);
        await _draftWrite;
      } catch (_) {/* Keep the active form. */}
    });
  }

  Future<void> _offerDraft() async {
    if (_draftOffered) return;
    _draftOffered = true;
    if (widget.record == null && widget.initialData == null) {
      final defaults = await (await ref.read(repositoryProvider.future))
          .privateData('favorites');
      if (!mounted) return;
      final state = ref.read(snapshotProvider).valueOrNull;
      final account = state?.find(defaults['account:$_space'] as String? ?? '');
      setState(() {
        if (account != null && account.text('space') == _space) {
          _account = account.id;
        }
        final category = defaults['category:$_space:$_type'];
        if (category is String) _category = category;
        _initialDraft = _draft;
      });
    }
    final draft = await (await ref.read(repositoryProvider.future))
        .privateData(_draftKey);
    if (!mounted || draft['values'] is! List) return;
    if (!await confirm(
        context,
        tr(ref, 'Recover unfinished entry?', 'অসমাপ্ত এন্ট্রি ফেরত আনবেন?'),
        tr(
            ref,
            'An encrypted draft was saved on this device. Review its values before saving.',
            'এই ডিভাইসে একটি এনক্রিপ্টেড খসড়া আছে। সংরক্ষণের আগে মিলিয়ে নিন।'),
        action: tr(ref, 'Recover', 'ফেরত আনুন'))) return;
    if (!mounted) return;
    if (draft['sourceVersion'] != widget.record?.localVersion) {
      feedbackMessage(
          context,
          tr(
              ref,
              'The original record changed. Open its latest version before using the draft.',
              'মূল তথ্য বদলেছে। খসড়া ব্যবহারের আগে সর্বশেষ তথ্য খুলুন।'));
      return;
    }
    final v = draft['values'] as List;
    if (v.length < 15) return;
    setState(() {
      _name.text = v[0];
      _amount.text = v[1];
      _note.text = v[2];
      _type = v[3];
      _space = v[4];
      _account = v[5];
      _destination = v[6];
      _category = v[7];
      _frequency = v[8];
      _direction = v[9];
      _spaceType = v[10];
      _accountType = v[11];
      _date = DateTime.parse(v[12]);
      _receipt = v[13] == null ? null : Map<String, dynamic>.from(v[13]);
      _billScope = v[14];
      if (v.length > 15) _fee.text = v[15];
      if (v.length > 16) {
        _splits =
            (v[16] as List?)?.map((e) => Map<String, dynamic>.from(e)).toList();
      }
      if (v.length > 17) _discretionary = v[17] == true;
      if (v.length > 18) _interval.text = v[18];
    });
  }

  Future<void> _leave() async {
    if (_busy || _leaving) return;
    _leaving = true;
    final discard = _initialDraft == null ||
        _initialDraft == _draft ||
        await confirm(context, 'Discard unsaved changes?',
            'Your changes on this form have not been saved.',
            action: 'Discard');
    _leaving = false;
    if (discard && mounted) {
      _draftTimer?.cancel();
      _saved = true;
      await _draftWrite;
      await (await ref.read(repositoryProvider.future))
          .writePrivate(_draftKey, {}, notify: false);
      if (mounted) Navigator.pop(context);
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _amount.dispose();
    _note.dispose();
    _fee.dispose();
    _interval.dispose();
    _draftTimer?.cancel();
    super.dispose();
  }

  void _init(FinanceSnapshot state) {
    if (_initialized) return;
    _initialized = true;
    final r = widget.record ??
        (widget.initialData == null
            ? null
            : Record('', widget.kind, widget.initialData!));
    final selected = ref.read(spaceProvider);
    _space = r?.text('space') ??
        widget.initialSpace ??
        (selected == 'all'
            ? (widget.kind == 'transaction'
                    ? state.of('account').firstOrNull?.text('space')
                    : null) ??
                state.of('space').first.id
            : selected);
    _account = r?.text('account') ??
        state
            .of('account')
            .where((r) => r.text('space') == _space)
            .firstOrNull
            ?.id ??
        '';
    _destination = r?.text('destination') ?? '';
    _type = r?.text('type', 'expense') ?? widget.initialType ?? 'expense';
    _spaceType =
        r?.text('type', 'personal') ?? widget.initialType ?? 'personal';
    _accountType = r?.text('type', 'cash') ?? 'cash';
    _category =
        r?.text('category', expenseCategories.first) ?? expenseCategories.first;
    _frequency = r?.text('frequency', 'monthly') ?? 'monthly';
    _interval.text = '${r?.number('intervalDays') ?? 7}';
    if (_interval.text == '0') _interval.text = '7';
    _direction = r?.text('direction', 'borrowed') ?? 'borrowed';
    _name.text = r?.text('name') ?? '';
    _note.text = r?.text('note') ?? '';
    _receipt = r?.data['receipt'] == null
        ? null
        : Map<String, dynamic>.from(r!.data['receipt']);
    _fee.text = editableMoney(r?.number('fee') ?? 0);
    _splits = (r?.data['splits'] as List?)
        ?.map((e) => Map<String, dynamic>.from(e))
        .toList();
    _discretionary = r?.flag('discretionary') ?? false;
    final amountField = switch (widget.kind) {
      'account' => 'opening',
      'goal' => 'target',
      'loan' => 'principal',
      _ => 'amount'
    };
    _amount.text = r == null ? '' : editableMoney(r.number(amountField));
    _date = DateTime.tryParse(r?.text(widget.kind == 'bill'
                ? 'due'
                : widget.kind == 'account'
                    ? 'openingDate'
                    : 'date') ??
            '') ??
        financeNow();
    _initialDraft = _draft;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _offerDraft();
    });
  }

  Widget _gap() => const SizedBox(height: 18);
  Widget _select(String label, String value, Map<String, String> choices,
          ValueChanged<String> change) =>
      SearchSelectField(
          label: localText(context, label),
          value: value,
          choices: {
            for (final e in choices.entries)
              e.key: {'Space', 'Account', 'From account', 'To account'}
                      .contains(label)
                  ? e.value
                  : localText(context, e.value)
          },
          enabled: !_busy,
          onChanged: (v) => setState(() => change(v)),
          icon: label == 'Space'
              ? Icons.workspaces_outline
              : label.toLowerCase().contains('account')
                  ? Icons.account_balance_wallet_outlined
                  : label == 'Category'
                      ? Icons.category_outlined
                      : null,
          actionLabel: label == 'Space'
              ? 'Create space'
              : label.toLowerCase().contains('account')
                  ? 'Create account'
                  : label == 'Category'
                      ? 'Create category'
                      : null,
          onCreate: label == 'Space' ||
                  label.toLowerCase().contains('account') ||
                  label == 'Category'
              ? () async {
                  final kind = label == 'Space'
                      ? 'space'
                      : label == 'Category'
                          ? 'category'
                          : 'account';
                  final repository = await ref.read(repositoryProvider.future);
                  final before = (await repository.snapshot())
                      .of(kind)
                      .map((r) => r.id)
                      .toSet();
                  if (!mounted) return null;
                  await openEditor(context, kind,
                      initialSpace: _space,
                      initialType: kind == 'category'
                          ? (_type == 'income' ? 'income' : 'expense')
                          : null);
                  final created = (await repository.snapshot())
                      .of(kind)
                      .where((r) => !before.contains(r.id))
                      .firstOrNull;
                  return kind == 'category'
                      ? created?.text('name')
                      : created?.id;
                }
              : null);
  Future<void> _pickDate() async {
    final date = await showDatePicker(
        context: context,
        initialDate: _date,
        firstDate: DateTime(2000),
        lastDate: DateTime(2100));
    if (date != null) setState(() => _date = date);
  }

  Future<void> _pickReceipt() async {
    final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['jpg', 'jpeg', 'png'],
        withData: true);
    if (result == null || !mounted) return;
    final file = result.files.single;
    if (file.bytes == null || file.size > 12 * 1024 * 1024) {
      feedbackMessage(context, 'Choose a JPG or PNG receipt under 12 MB.');
      return;
    }
    setState(() => _busy = true);
    try {
      final bytes = await compute(prepareReceipt, file.bytes!);
      if (mounted) {
        setState(() => _receipt = {
              'name': 'receipt.jpg',
              'bytes': base64Encode(bytes),
              'mime': 'image/jpeg'
            });
      }
    } catch (e) {
      if (mounted) feedbackMessage(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _save(FinanceSnapshot state) async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final repository = await ref.read(repositoryProvider.future);
      final amount = {'space', 'category'}.contains(widget.kind)
          ? 0
          : parseMoney(_amount.text, allowZero: widget.kind == 'account');
      final data = <String, dynamic>{
        ...?widget.record?.data,
        if (widget.kind != 'space') 'space': _space
      };
      switch (widget.kind) {
        case 'category':
          data.addAll({'name': _name.text.trim(), 'type': _type});
          break;
        case 'space':
          data.addAll({'name': _name.text.trim(), 'type': _spaceType});
          break;
        case 'account':
          data.addAll({
            'name': _name.text.trim(),
            'opening': amount,
            'type': _accountType,
            'openingDate': widget.record?.text('openingDate', dayKey(_date)) ??
                dayKey(_date)
          });
          break;
        case 'transaction':
          data.addAll({
            'type': _type,
            'amount': amount,
            'account': _account,
            'destination': _type == 'transfer' ? _destination : '',
            'category': _type == 'transfer' ? '' : _category,
            'date': dayKey(_date),
            'note': _note.text.trim(),
            'fee': parseMoney(_fee.text, allowZero: true),
            if (_type == 'expense' && _splits != null) 'splits': _splits,
            if (_receipt != null) 'receipt': _receipt
          });
          if (_receipt == null) data.remove('receipt');
          if (_type != 'expense' || _splits == null) data.remove('splits');
          break;
        case 'budget':
          data.addAll({
            'category': _category,
            'amount': amount,
            'discretionary': _discretionary,
            'month': widget.record?.text('month') ??
                monthKey(ref.read(monthProvider))
          });
          break;
        case 'bill':
          data.addAll({
            'name': _name.text.trim(),
            'amount': amount,
            'due': dayKey(_date),
            'anchorDay': widget.record?.text('due') == dayKey(_date)
                ? (widget.record?.data['anchorDay'] ?? _date.day)
                : _date.day,
            'frequency': _frequency,
            if (_frequency == 'custom')
              'intervalDays': int.tryParse(_interval.text) ?? 0,
            'paid': widget.record?.flag('paid') ?? false,
            'category': _category
          });
          break;
        case 'goal':
          data.addAll({
            'name': _name.text.trim(),
            'target': amount,
            'saved': widget.record?.number('saved') ?? 0
          });
          break;
        case 'loan':
          data.addAll({
            'name': _name.text.trim(),
            'principal': amount,
            'direction': _direction,
            'repaid': widget.record?.number('repaid') ?? 0
          });
          break;
      }
      if (widget.kind == 'transaction') {
        final similar =
            await repository.duplicates(data, excluding: widget.record?.id);
        if (similar.isNotEmpty &&
            mounted &&
            !await confirm(
                context,
                tr(ref, 'Possible duplicate', 'একই লেনদেন আবার হতে পারে'),
                tr(
                    ref,
                    'A transaction with the same account, date and amount already exists. Save another?',
                    'একই অ্যাকাউন্ট, তারিখ ও টাকার লেনদেন আছে। আরেকটি রাখবেন?'),
                action: tr(ref, 'Save another', 'আরেকটি রাখুন'))) return;
      }
      await repository.save(widget.kind, data,
          id: widget.record?.id,
          expectedVersion: widget.record?.localVersion,
          billEditScope: _billScope);
      if (widget.kind == 'bill') await repository.ensureBillOccurrences();
      _saved = true;
      _draftTimer?.cancel();
      await _draftWrite;
      await repository.writePrivate(_draftKey, {}, notify: false);
      unawaited(HapticFeedback.lightImpact());
      if (mounted) {
        final messenger = ScaffoldMessenger.of(context);
        Navigator.pop(context);
        messenger.showSnackBar(SnackBar(
            duration: const Duration(seconds: 2),
            backgroundColor: forest,
            content: Row(children: [
              const Icon(Icons.check_circle_outline,
                  color: Colors.white, size: 20),
              const SizedBox(width: 10),
              Expanded(
                  child: LText(
                      '${widget.kind[0].toUpperCase()}${widget.kind.substring(1)} saved on this device'))
            ])));
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = e is FormatException
            ? localText(context, e.message)
            : 'Could not save. Your existing records are safe.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(snapshotProvider);
    return PopScope(
        canPop: false,
        onPopInvokedWithResult: (didPop, result) {
          if (!didPop) _leave();
        },
        child: Scaffold(
            appBar: AppBar(
                title: LText(
                    '${widget.record == null ? 'Add' : 'Edit'} ${widget.kind}')),
            bottomNavigationBar: async.valueOrNull == null
                ? null
                : AnimatedPadding(
                    duration: Duration(
                        milliseconds:
                            MediaQuery.disableAnimationsOf(context) ? 0 : 160),
                    padding: EdgeInsets.only(
                        bottom: MediaQuery.viewInsetsOf(context).bottom),
                    child: SafeArea(
                        top: false,
                        child: Padding(
                            padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
                            child: Center(
                                heightFactor: 1,
                                child: ConstrainedBox(
                                    constraints:
                                        const BoxConstraints(maxWidth: 560),
                                    child: Column(
                                        mainAxisSize: MainAxisSize.min,
                                        crossAxisAlignment:
                                            CrossAxisAlignment.stretch,
                                        children: [
                                          if (_error != null)
                                            Padding(
                                                padding: const EdgeInsets.only(
                                                    bottom: 10),
                                                child: Semantics(
                                                    liveRegion: true,
                                                    child: LText(_error!,
                                                        style: TextStyle(
                                                            color: Theme.of(
                                                                    context)
                                                                .colorScheme
                                                                .error)))),
                                          FilledButton.icon(
                                              onPressed: _busy
                                                  ? null
                                                  : () =>
                                                      _save(async.valueOrNull!),
                                              icon: _busy
                                                  ? const SizedBox(
                                                      width: 18,
                                                      height: 18,
                                                      child:
                                                          CircularProgressIndicator(
                                                              strokeWidth: 2,
                                                              color:
                                                                  Colors.white))
                                                  : const Icon(
                                                      Icons.check_rounded),
                                              label: LText(_busy
                                                  ? 'Saving…'
                                                  : 'Save ${widget.kind}')),
                                          const SizedBox(height: 6),
                                          LText(
                                              tr(
                                                  ref,
                                                  'Private · Saved on this device',
                                                  'ব্যক্তিগত · এই ডিভাইসে সংরক্ষিত'),
                                              textAlign: TextAlign.center,
                                              style: Theme.of(context)
                                                  .textTheme
                                                  .bodySmall),
                                        ])))))),
            body: async.when(
                loading: () => const VaultSkeleton(),
                error: (e, s) =>
                    const Center(child: LText('Could not open your records.')),
                data: (state) {
                  _init(state);
                  _queueDraft();
                  final tx = widget.kind == 'transaction';
                  final categories = {
                    ...(_type == 'income' && tx
                        ? incomeCategories
                        : expenseCategories),
                    ...state
                        .of('category')
                        .where((r) =>
                            !r.flag('archived') &&
                            r.text('space') == _space &&
                            r.text('type') ==
                                (_type == 'income' && tx
                                    ? 'income'
                                    : 'expense'))
                        .map((r) => r.text('name')),
                    if (widget.record != null && _category.isNotEmpty) _category
                  }.toList();
                  final accounts = state
                      .of('account')
                      .where((r) => r.text('space') == _space)
                      .toList();
                  return Center(
                      child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 600),
                          child: Form(
                              key: _form,
                              child: ListView(
                                  padding: const EdgeInsets.all(24),
                                  children: [
                                    if (tx) ...[
                                      SegmentedButton<String>(
                                          segments: const [
                                            ButtonSegment(
                                                value: 'expense',
                                                label: LText('Expense')),
                                            ButtonSegment(
                                                value: 'income',
                                                label: LText('Income')),
                                            ButtonSegment(
                                                value: 'transfer',
                                                label: LText('Transfer'))
                                          ],
                                          selected: {
                                            _type
                                          },
                                          onSelectionChanged: (values) =>
                                              setState(() {
                                                _type = values.first;
                                                _category = _type == 'income'
                                                    ? incomeCategories.first
                                                    : expenseCategories.first;
                                              })),
                                      const SizedBox(height: 28),
                                    ],
                                    if (!{'space', 'category'}
                                        .contains(widget.kind)) ...[
                                      LText('AMOUNT · BDT',
                                          style: Theme.of(context)
                                              .textTheme
                                              .labelMedium
                                              ?.copyWith(letterSpacing: 1.5)),
                                      const SizedBox(height: 12),
                                      TextFormField(
                                          controller: _amount,
                                          autofocus:
                                              widget.record == null && tx,
                                          keyboardType: const TextInputType
                                              .numberWithOptions(decimal: true),
                                          style: Theme.of(context)
                                              .textTheme
                                              .headlineLarge,
                                          decoration: InputDecoration(
                                              prefixText: '৳ ',
                                              hintText:
                                                  localText(context, '0.00')),
                                          validator: (v) {
                                            try {
                                              parseMoney(v ?? '',
                                                  allowZero:
                                                      widget.kind == 'account');
                                              return null;
                                            } on FormatException catch (e) {
                                              return localText(
                                                  context, e.message);
                                            }
                                          }),
                                      _gap(),
                                    ],
                                    if (!tx && widget.kind != 'budget') ...[
                                      TextFormField(
                                          controller: _name,
                                          maxLength: 100,
                                          decoration: InputDecoration(
                                              labelText: localText(
                                                  context,
                                                  switch (widget.kind) {
                                                    'space' => 'Space name',
                                                    'loan' =>
                                                      'Person or lender',
                                                    _ => 'Name'
                                                  })),
                                          validator: (v) =>
                                              v == null || v.trim().isEmpty
                                                  ? localText(
                                                      context, 'Enter a name')
                                                  : null),
                                      _gap(),
                                    ],
                                    if (widget.kind == 'space') ...[
                                      _select(
                                          'Space type',
                                          _spaceType,
                                          {
                                            'personal': 'Personal',
                                            'business': 'Business'
                                          },
                                          (v) => _spaceType = v),
                                      _gap(),
                                      const LText(
                                          'Each space keeps its own accounts, budgets, bills and reports. Transfers between spaces stay visible on both sides.'),
                                      _gap(),
                                    ],
                                    if (widget.kind == 'account') ...[
                                      _select(
                                          'Account type',
                                          _accountType,
                                          {
                                            'cash': 'Cash',
                                            'bank': 'Bank account',
                                            'mobile': 'Mobile wallet',
                                            'other': 'Other'
                                          },
                                          (v) => _accountType = v),
                                      _gap(),
                                    ],
                                    if (widget.kind != 'space') ...[
                                      _select('Space', _space, {
                                        for (final r in state.of('space'))
                                          r.id: r.text('name')
                                      }, (value) {
                                        _space = value;
                                        if (widget.record == null) {
                                          _category = _type == 'income'
                                              ? incomeCategories.first
                                              : expenseCategories.first;
                                        }
                                        _account = state
                                                .of('account')
                                                .where((r) =>
                                                    r.text('space') == value)
                                                .firstOrNull
                                                ?.id ??
                                            '';
                                      }),
                                      _gap(),
                                    ],
                                    if (widget.kind == 'category') ...[
                                      _select(
                                          'Category type',
                                          _type,
                                          {
                                            'expense': 'Expense',
                                            'income': 'Income'
                                          },
                                          (v) => _type = v),
                                      _gap(),
                                    ],
                                    if (tx) ...[
                                      _select(
                                          _type == 'transfer'
                                              ? 'From account'
                                              : 'Account',
                                          _account,
                                          {
                                            for (final r in accounts)
                                              r.id:
                                                  '${r.text('name')} · ${money(state.balance(r))}'
                                          },
                                          (v) => _account = v),
                                      _gap(),
                                      if (_type == 'transfer') ...[
                                        _select(
                                            'To account',
                                            _destination,
                                            {
                                              for (final r in state
                                                  .of('account')
                                                  .where(
                                                      (r) => r.id != _account))
                                                r.id:
                                                    '${r.text('name')} · ${state.find(r.text('space'))?.text('name')}'
                                            },
                                            (v) => _destination = v),
                                        _gap(),
                                      ],
                                    ],
                                    if (widget.kind == 'budget' ||
                                        widget.kind == 'bill' ||
                                        (tx && _type != 'transfer')) ...[
                                      _select(
                                          'Category',
                                          _category,
                                          {for (final c in categories) c: c},
                                          (v) => _category = v),
                                      _gap(),
                                    ],
                                    if (widget.kind == 'budget')
                                      SwitchListTile(
                                          contentPadding: EdgeInsets.zero,
                                          title: LText(tr(
                                              ref,
                                              'Discretionary spending',
                                              'ঐচ্ছিক খরচ')),
                                          subtitle: LText(tr(
                                              ref,
                                              'Include in daily spending limit',
                                              'দৈনিক খরচের সীমায় ধরুন')),
                                          value: _discretionary,
                                          onChanged: (v) => setState(
                                              () => _discretionary = v)),
                                    if (tx) ...[
                                      TextFormField(
                                          controller: _fee,
                                          keyboardType: const TextInputType
                                              .numberWithOptions(decimal: true),
                                          decoration: InputDecoration(
                                              labelText: tr(
                                                  ref,
                                                  'Fee / charge (BDT)',
                                                  'ফি / চার্জ (টাকা)')),
                                          validator: (v) {
                                            try {
                                              parseMoney(v ?? '',
                                                  allowZero: true);
                                              return null;
                                            } on FormatException catch (e) {
                                              return localText(
                                                  context, e.message);
                                            }
                                          }),
                                      if (_type == 'expense')
                                        Wrap(spacing: 8, children: [
                                          TextButton.icon(
                                              icon:
                                                  const Icon(Icons.call_split),
                                              label: LText(tr(
                                                  ref,
                                                  _splits == null
                                                      ? 'Split across categories'
                                                      : 'Edit split',
                                                  _splits == null
                                                      ? 'ক্যাটাগরি অনুযায়ী ভাগ করুন'
                                                      : 'ভাগ পরিবর্তন করুন')),
                                              onPressed: () async {
                                                try {
                                                  final splits =
                                                      await editSplitAllocations(
                                                          context,
                                                          ref,
                                                          state,
                                                          _space,
                                                          parseMoney(
                                                              _amount.text),
                                                          existing: _splits);
                                                  if (splits != null &&
                                                      mounted) {
                                                    setState(
                                                        () => _splits = splits);
                                                  }
                                                } catch (e) {
                                                  if (context.mounted) {
                                                    feedbackMessage(context, e);
                                                  }
                                                }
                                              }),
                                          if (_splits != null)
                                            TextButton(
                                                onPressed: () => setState(
                                                    () => _splits = null),
                                                child: LText(tr(
                                                    ref,
                                                    'Remove split',
                                                    'ভাগ বাতিল')))
                                        ]),
                                      ValueListenableBuilder<TextEditingValue>(
                                          valueListenable: _amount,
                                          builder: (context, _, __) =>
                                              ValueListenableBuilder<
                                                      TextEditingValue>(
                                                  valueListenable: _fee,
                                                  builder: (context, _, __) {
                                                    try {
                                                      final amount = parseMoney(
                                                              _amount.text),
                                                          fee = parseMoney(
                                                              _fee.text,
                                                              allowZero: true);
                                                      final balance = state.find(
                                                                  _account) ==
                                                              null
                                                          ? 0
                                                          : state.balance(state
                                                              .find(_account)!);
                                                      return Padding(
                                                          padding:
                                                              const EdgeInsets
                                                                  .symmetric(
                                                                  vertical: 12),
                                                          child: LText(
                                                              '${tr(ref, 'Account balance after entry', 'এন্ট্রির পরে অ্যাকাউন্ট ব্যালেন্স')}: ${ref.watch(privacyProvider) ? '••••' : money(balance + (_type == 'income' ? amount : -amount) - fee)}'));
                                                    } catch (_) {
                                                      return const SizedBox
                                                          .shrink();
                                                    }
                                                  })),
                                    ],
                                    if (tx ||
                                        widget.kind == 'bill' ||
                                        widget.kind == 'account') ...[
                                      ListTile(
                                          shape: RoundedRectangleBorder(
                                              borderRadius:
                                                  BorderRadius.circular(16)),
                                          tileColor: Theme.of(context)
                                              .colorScheme
                                              .surfaceContainerHighest,
                                          leading: const Icon(
                                              Icons.calendar_today_outlined),
                                          title: LText(dayKey(_date)),
                                          subtitle: LText(widget.kind == 'bill'
                                              ? 'Due date'
                                              : 'Transaction date'),
                                          onTap: _pickDate),
                                      _gap(),
                                    ],
                                    if (tx &&
                                        dayKey(_date).compareTo(
                                                dayKey(financeNow())) >
                                            0)
                                      Padding(
                                          padding:
                                              const EdgeInsets.only(bottom: 16),
                                          child: Row(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                const Icon(Icons.schedule,
                                                    size: 18),
                                                const SizedBox(width: 8),
                                                Expanded(
                                                    child: LText(
                                                        'Scheduled for ${dayKey(_date)}. Current balances and actual spending will change on that date.'))
                                              ])),
                                    if (tx)
                                      TextFormField(
                                          controller: _note,
                                          maxLength: 500,
                                          decoration: InputDecoration(
                                              labelText: localText(
                                                  context, 'Note (optional)')),
                                          maxLines: 2),
                                    if (tx) ...[
                                      _gap(),
                                      if (_receipt != null)
                                        ClipRRect(
                                            borderRadius:
                                                BorderRadius.circular(16),
                                            child: Image.memory(
                                                base64Decode(
                                                    _receipt!['bytes']),
                                                height: 180,
                                                fit: BoxFit.contain,
                                                errorBuilder: (_, __, ___) =>
                                                    const LText(
                                                        'Receipt preview unavailable'))),
                                      Row(children: [
                                        Expanded(
                                            child: TextButton.icon(
                                                onPressed:
                                                    _busy ? null : _pickReceipt,
                                                icon: const Icon(
                                                    Icons.attach_file),
                                                label: LText(_receipt == null
                                                    ? 'Attach receipt'
                                                    : 'Replace receipt'))),
                                        if (_receipt != null)
                                          IconButton(
                                              tooltip: localText(
                                                  context, 'Remove receipt'),
                                              onPressed: () => setState(
                                                  () => _receipt = null),
                                              icon: const Icon(Icons.close))
                                      ]),
                                    ],
                                    if (widget.kind == 'bill' &&
                                        widget.record
                                                ?.text('scheduleId')
                                                .isNotEmpty ==
                                            true) ...[
                                      _select(
                                          'Apply changes to',
                                          _billScope,
                                          {
                                            'occurrence': 'This bill only',
                                            'future':
                                                'This and future unpaid bills'
                                          },
                                          (v) => _billScope = v),
                                      _gap(),
                                    ],
                                    if (widget.kind == 'bill')
                                      _select(
                                          'Repeat',
                                          _frequency,
                                          {
                                            'once': 'One time',
                                            'monthly': 'Monthly',
                                            'weekly': 'Weekly',
                                            'yearly': 'Yearly',
                                            'custom': 'Every N days'
                                          },
                                          (v) => _frequency = v),
                                    if (widget.kind == 'bill' &&
                                        _frequency == 'custom')
                                      TextFormField(
                                          controller: _interval,
                                          keyboardType: TextInputType.number,
                                          decoration: InputDecoration(
                                              labelText: tr(
                                                  ref,
                                                  'Repeat every (days)',
                                                  'কত দিন পরপর')),
                                          validator: (v) {
                                            final days = int.tryParse(v ?? '');
                                            return days == null ||
                                                    days < 1 ||
                                                    days > 3650
                                                ? tr(ref, 'Choose 1–3650 days',
                                                    '১–৩৬৫০ দিন দিন')
                                                : null;
                                          }),
                                    if (widget.kind == 'loan') ...[
                                      _select(
                                          'Direction',
                                          _direction,
                                          {
                                            'borrowed': 'I borrowed',
                                            'lent': 'I lent'
                                          },
                                          (v) => _direction = v),
                                      _gap(),
                                      const LText(
                                          'Track an existing loan balance. Adding a loan does not move account money. Add interest and due dates through an installment schedule.'),
                                    ],
                                    if (widget.kind == 'goal')
                                      const LText(
                                          'A goal earmarks your existing money. Updating progress does not create income or an expense.'),
                                    if (widget.kind == 'account')
                                      const LText(
                                          'Opening balance is separate from your income. Use transactions for future changes.'),
                                    const SizedBox(height: 24),
                                  ]))));
                })));
  }
}

Future<String?> chooseAccount(
    BuildContext context, FinanceSnapshot state, String space) async {
  final container = ProviderScope.containerOf(context, listen: false);
  final selected = await showSearchPicker(context,
      title: 'Payment account',
      actionLabel: 'Create account',
      options: state
          .of('account')
          .where((r) => r.text('space') == space)
          .map((r) => SelectOption(r.id, r.text('name'),
              subtitle: container.read(privacyProvider)
                  ? '••••'
                  : money(state.balance(r)),
              icon: Icons.account_balance_wallet_outlined))
          .toList());
  if (selected != createSelection) return selected;
  if (!context.mounted) return null;
  final before = state.of('account').map((r) => r.id).toSet();
  await openEditor(context, 'account', initialSpace: space);
  final fresh =
      await (await container.read(repositoryProvider.future)).snapshot();
  return fresh
      .of('account')
      .where((r) => r.text('space') == space && !before.contains(r.id))
      .firstOrNull
      ?.id;
}

Future<int?> askAmount(BuildContext context, String title,
    {int? initial}) async {
  final controller = TextEditingController(
      text: initial == null ? '' : editableMoney(initial));
  final form = GlobalKey<FormState>();
  final value = await showDialog<int>(
      context: context,
      builder: (context) => AlertDialog(
              title: LText(title),
              content: Form(
                  key: form,
                  child: TextFormField(
                      controller: controller,
                      autofocus: true,
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(prefixText: '৳ '),
                      validator: (v) {
                        try {
                          parseMoney(v ?? '', allowZero: true);
                          return null;
                        } on FormatException catch (e) {
                          return localText(context, e.message);
                        }
                      })),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const LText('Cancel')),
                FilledButton(
                    onPressed: () {
                      if (form.currentState!.validate()) {
                        Navigator.pop(context,
                            parseMoney(controller.text, allowZero: true));
                      }
                    },
                    child: const LText('Save'))
              ]));
  // Route transitions may still reference the controller until the next frame.
  WidgetsBinding.instance.addPostFrameCallback((_) => controller.dispose());
  return value;
}
