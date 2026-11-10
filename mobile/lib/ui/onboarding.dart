import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../app/providers.dart';
import '../core/money.dart';
import 'design.dart';

class Onboarding extends ConsumerStatefulWidget {
  const Onboarding({super.key, required this.onComplete});
  final VoidCallback onComplete;
  @override
  ConsumerState<Onboarding> createState() => _OnboardingState();
}

class _OnboardingState extends ConsumerState<Onboarding> {
  final _name = TextEditingController(text: 'Cash');
  final _balance = TextEditingController(text: '0');
  bool _busy = false;
  String? _error;
  @override
  void dispose() {
    _name.dispose();
    _balance.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final opening = parseMoney(_balance.text, allowZero: true);
      final repository = await ref.read(repositoryProvider.future);
      await repository.db.transaction(() async {
        final space = await repository
            .save('space', {'name': 'Personal', 'type': 'personal'});
        await repository.save('account', {
          'name': _name.text.trim(),
          'type': 'cash',
          'opening': opening,
          'space': space
        });
        await repository.setSetting('onboarded', 'true');
        await repository.setSetting('language', ref.read(languageProvider));
      });
      if (mounted) widget.onComplete();
    } catch (e) {
      if (mounted) {
        setState(() => _error = e is FormatException
            ? e.message
            : 'Could not create your vault. Please try again.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      body: SafeArea(
          child: Center(
              child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 520),
                  child: ListView(padding: const EdgeInsets.all(28), children: [
                    Row(children: [
                      const Icon(Icons.spa_outlined, color: forest, size: 30),
                      const SizedBox(width: 10),
                      const Expanded(
                          child: Text('HISABNIKASH',
                              style: TextStyle(
                                  letterSpacing: 2,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13))),
                      TextButton(
                          onPressed: () => ref
                                  .read(languageProvider.notifier)
                                  .state =
                              ref.read(languageProvider) == 'en' ? 'bn' : 'en',
                          child: Text(ref.watch(languageProvider) == 'en'
                              ? 'বাংলা'
                              : 'English'))
                    ]),
                    const SizedBox(height: 58),
                    Align(
                        alignment: Alignment.centerLeft,
                        child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 8),
                            decoration: BoxDecoration(
                                color: mint,
                                borderRadius: BorderRadius.circular(30)),
                            child: const Text('PRIVATE BY DESIGN',
                                style: TextStyle(
                                    color: forest,
                                    fontSize: 11,
                                    letterSpacing: 1.5,
                                    fontWeight: FontWeight.w700)))),
                    const SizedBox(height: 24),
                    Text(
                        tr(ref, 'A little clarity.\nA lot more calm.',
                            'হিসাব পরিষ্কার।\nজীবন আরও সহজ।'),
                        style: Theme.of(context)
                            .textTheme
                            .headlineLarge
                            ?.copyWith(fontSize: 42, height: 1.15)),
                    const SizedBox(height: 20),
                    Text(
                        tr(
                            ref,
                            'Make room for what matters. Keep your everyday money in order, even without internet.',
                            'ইন্টারনেট ছাড়াই আয়, খরচ ও সঞ্চয়ের হিসাব রাখুন।'),
                        style: Theme.of(context).textTheme.bodyLarge),
                    const SizedBox(height: 36),
                    Surface(
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                          Text(
                              tr(ref, 'Start with your first account',
                                  'প্রথম অ্যাকাউন্ট তৈরি করুন'),
                              style: Theme.of(context).textTheme.titleMedium),
                          const SizedBox(height: 20),
                          TextField(
                              controller: _name,
                              maxLength: 60,
                              decoration: InputDecoration(
                                  labelText: tr(
                                      ref, 'Account name', 'অ্যাকাউন্টের নাম'),
                                  counterText: '')),
                          const SizedBox(height: 14),
                          TextField(
                              controller: _balance,
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                      decimal: true),
                              decoration: InputDecoration(
                                  labelText: tr(ref, 'Opening balance',
                                      'প্রারম্ভিক ব্যালেন্স'),
                                  prefixText: '৳ ')),
                          const SizedBox(height: 12),
                          const Text(
                              'BDT · Opening balance is not counted as income.',
                              style: TextStyle(fontSize: 12)),
                        ])),
                    if (_error != null)
                      Padding(
                          padding: const EdgeInsets.only(top: 16),
                          child: Text(_error!,
                              style: TextStyle(
                                  color: Theme.of(context).colorScheme.error))),
                    const SizedBox(height: 24),
                    FilledButton(
                        onPressed: _busy ? null : _start,
                        child: Text(_busy
                            ? 'Creating your vault…'
                            : tr(ref, 'Start my money journey', 'শুরু করুন'))),
                    const SizedBox(height: 18),
                    Text(
                        tr(
                            ref,
                            'No signup. No internet needed. Optional sync later.',
                            'সাইনআপ প্রয়োজন নেই। চাইলে পরে sync চালু করুন।'),
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodySmall),
                  ])))));
}
