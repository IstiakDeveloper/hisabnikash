import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;
import 'models.dart';
import 'money.dart';
import 'planning.dart';
import 'repository.dart';

class NotificationPreferences {
  const NotificationPreferences(
      {this.daily = false,
      this.bills = false,
      this.hour = 20,
      this.minute = 0,
      this.missingOnly = false,
      this.budget = true,
      this.balance = true,
      this.summary = false,
      this.private = true,
      this.quietStart = 22,
      this.quietEnd = 8,
      this.timezone = 'Asia/Dhaka',
      this.bangla = false});
  final bool daily,
      bills,
      missingOnly,
      budget,
      balance,
      summary,
      private,
      bangla;
  final int hour, minute, quietStart, quietEnd;
  final String timezone;
  factory NotificationPreferences.fromJson(Json j,
          {bool legacyBills = false, bool bangla = false}) =>
      NotificationPreferences(
          daily: j['daily'] == true,
          bills: j['bills'] as bool? ?? legacyBills,
          hour: (j['hour'] as int? ?? 20).clamp(0, 23),
          minute: (j['minute'] as int? ?? 0).clamp(0, 59),
          missingOnly: j['missingOnly'] == true,
          budget: j['budget'] != false,
          balance: j['balance'] != false,
          summary: j['summary'] == true,
          private: j['private'] != false,
          quietStart: (j['quietStart'] as int? ?? 22).clamp(0, 23),
          quietEnd: (j['quietEnd'] as int? ?? 8).clamp(0, 23),
          timezone: j['timezone'] as String? ?? 'Asia/Dhaka',
          bangla: bangla);
  bool quiet(int h) => quietStart == quietEnd
      ? false
      : quietStart < quietEnd
          ? h >= quietStart && h < quietEnd
          : h >= quietStart || h < quietEnd;
}

class ReminderPlan {
  const ReminderPlan(this.key, this.kind, this.time, this.title, this.body,
      {this.recordId = '', this.date = '', this.repeat});
  final String key, kind, title, body, recordId, date;
  final tz.TZDateTime time;
  final DateTimeComponents? repeat;
  String get payload =>
      jsonEncode({'key': key, 'kind': kind, 'record': recordId, 'date': date});
  int get id {
    var value = 17;
    for (final c in key.codeUnits) {
      value = ((value * 31) + c) & 0x3fffffff;
    }
    return value;
  }

  String get signature => jsonEncode({
        'route': jsonDecode(payload),
        'time': time.millisecondsSinceEpoch,
        'title': title,
        'body': body,
        'repeat': repeat?.name
      });
}

List<ReminderPlan> buildReminderPlan(
    FinanceSnapshot state, NotificationPreferences p, tz.TZDateTime now) {
  final plans = <ReminderPlan>[], location = now.location;
  String t(String en, String bn) => p.bangla ? bn : en;
  String title(String detail) =>
      p.private ? t('HisabNikash reminder', 'হিসাবনিকাশ রিমাইন্ডার') : detail;
  if (p.daily) {
    for (var n = 0; n < 21; n++) {
      final date = tz.TZDateTime(
          location, now.year, now.month, now.day + n, p.hour, p.minute);
      if (!date.isAfter(now) ||
          state.dailyComplete(date) ||
          (p.missingOnly && state.dailyEntries(date) > 0)) continue;
      plans.add(ReminderPlan(
          'daily:${dayKey(date)}',
          'daily',
          date,
          title(t('Daily review', 'দৈনিক হিসাব')),
          t('Finished recording today’s income and expenses?',
              'আজকের আয়-খরচ লেখা শেষ হয়েছে?'),
          date: dayKey(date)));
    }
    plans.add(ReminderPlan(
        'daily:renew',
        'renew',
        tz.TZDateTime(
            location, now.year, now.month, now.day + 21, p.hour, p.minute),
        title(t('Daily review', 'দৈনিক হিসাব')),
        t('Open the app to renew your daily reminder schedule.',
            'দৈনিক রিমাইন্ডারের সূচি নবায়ন করতে অ্যাপ খুলুন।')));
  }
  if (p.bills) {
    final candidates = <ReminderPlan>[];
    void add(Record record, String kind) {
      final due = DateTime.parse(record.text('due'));
      for (final offset in [3, 1, 0]) {
        final date =
            tz.TZDateTime(location, due.year, due.month, due.day - offset, 9);
        if (date.isAfter(now)) {
          candidates.add(ReminderPlan(
              '$kind:${record.id}:$offset',
              kind,
              date,
              title(t('Payment reminder', 'পরিশোধের রিমাইন্ডার')),
              p.private
                  ? t('Review an upcoming payment in the app.',
                      'আসন্ন পরিশোধ দেখতে অ্যাপ খুলুন।')
                  : '${record.text('name', state.find(record.text('loan'))?.text('name') ?? '')} · ${record.text('due')}',
              recordId: record.id));
        }
      }
    }

    for (final b in state.of('bill').where((b) => !state.billPaid(b))) {
      add(b, 'bill');
    }
    for (final i in state
        .of('installment')
        .where((i) => state.installmentRemaining(i) > 0)) {
      add(i, 'installment');
    }
    for (final i
        in state.of('invoice').where((i) => state.invoiceRemaining(i) > 0)) {
      add(i, 'invoice');
    }
    candidates.sort((a, b) => a.time.compareTo(b.time));
    plans.addAll(candidates.take(35));
  }
  if (p.summary) {
    var weekly = tz.TZDateTime(
        location, now.year, now.month, now.day + (8 - now.weekday) % 7, 9);
    if (!weekly.isAfter(now)) {
      weekly =
          tz.TZDateTime(location, weekly.year, weekly.month, weekly.day + 7, 9);
    }
    plans.add(ReminderPlan(
        'summary:weekly',
        'summary',
        weekly,
        title(t('Weekly review', 'সাপ্তাহিক হিসাব')),
        t('Review this week in the app.', 'অ্যাপে এই সপ্তাহের হিসাব দেখুন।'),
        repeat: DateTimeComponents.dayOfWeekAndTime));
    plans.add(ReminderPlan(
        'summary:monthly',
        'summary',
        tz.TZDateTime(location, now.year, now.month + 1, 1, 9),
        title(t('Monthly review', 'মাসিক হিসাব')),
        t('Review last month and prepare your budget.',
            'গত মাসের হিসাব মিলিয়ে বাজেট তৈরি করুন।'),
        repeat: DateTimeComponents.dayOfMonthAndTime));
  }
  return plans;
}

class ReminderService {
  final plugin = FlutterLocalNotificationsPlugin();
  final responses = StreamController<Json>.broadcast();
  Json? launchResponse;
  bool _initialized = false;
  Future<void>? _initializing;
  Future<void> _tail = Future.value();
  Future<void> initialize() {
    if (_initialized || kIsWeb) return Future<void>.value();
    return _initializing ??=
        _initialize().whenComplete(() => _initializing = null);
  }

  Future<void> _initialize() async {
    tzdata.initializeTimeZones();
    tz.setLocalLocation(tz.getLocation('Asia/Dhaka'));
    await plugin.initialize(
        InitializationSettings(
            android: const AndroidInitializationSettings('ic_notification'),
            iOS: DarwinInitializationSettings(
                requestAlertPermission: false,
                requestBadgePermission: false,
                requestSoundPermission: false,
                notificationCategories: [
                  DarwinNotificationCategory('daily_en', actions: [
                    DarwinNotificationAction.plain('review', 'Review',
                        options: {DarwinNotificationActionOption.foreground}),
                    DarwinNotificationAction.plain('complete', 'Complete day',
                        options: {DarwinNotificationActionOption.foreground}),
                    DarwinNotificationAction.plain('snooze', '30 minutes later',
                        options: {DarwinNotificationActionOption.foreground})
                  ]),
                  DarwinNotificationCategory('daily_bn', actions: [
                    DarwinNotificationAction.plain('review', 'হিসাব দেখুন',
                        options: {DarwinNotificationActionOption.foreground}),
                    DarwinNotificationAction.plain('complete', 'আজ হিসাব শেষ',
                        options: {DarwinNotificationActionOption.foreground}),
                    DarwinNotificationAction.plain('snooze', '৩০ মিনিট পরে',
                        options: {DarwinNotificationActionOption.foreground}),
                  ])
                ])),
        onDidReceiveNotificationResponse: _respond);
    final launch = await plugin.getNotificationAppLaunchDetails();
    if (launch?.didNotificationLaunchApp == true &&
        launch?.notificationResponse != null) {
      _respond(launch!.notificationResponse!);
    }
    _initialized = true;
  }

  void _respond(NotificationResponse response) {
    try {
      var data = Map<String, dynamic>.from(
          jsonDecode(response.payload ?? '{}') as Map);
      if (data['route'] is Map) data = Map<String, dynamic>.from(data['route']);
      data['action'] = response.actionId ?? '';
      launchResponse = data;
      if (!responses.isClosed) responses.add(data);
    } catch (_) {/* Ignore obsolete payloads. */}
  }

  Future<bool> requestPermission() async {
    if (kIsWeb) return false;
    await initialize();
    return await plugin
            .resolvePlatformSpecificImplementation<
                AndroidFlutterLocalNotificationsPlugin>()
            ?.requestNotificationsPermission() ??
        await plugin
            .resolvePlatformSpecificImplementation<
                IOSFlutterLocalNotificationsPlugin>()
            ?.requestPermissions(alert: true, badge: false, sound: true) ??
        false;
  }

  Future<bool?> permissionGranted() async {
    if (kIsWeb) return false;
    await initialize();
    final android = plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    if (android != null) return android.areNotificationsEnabled();
    final ios = await plugin
        .resolvePlatformSpecificImplementation<
            IOSFlutterLocalNotificationsPlugin>()
        ?.checkPermissions();
    return ios?.isEnabled;
  }

  Future<void> _serial(Future<void> Function() action) {
    final operation = _tail.then((_) => action());
    _tail = operation.catchError((Object _) {});
    return operation;
  }

  Future<void> cancel() => _serial(() async {
        if (!kIsWeb) {
          await initialize();
          await plugin.cancelAll();
        }
      });
  Future<Map<String, Object?>> diagnostics() async {
    await initialize();
    final pending = await plugin.pendingNotificationRequests();
    final delivered = await plugin.getActiveNotifications();
    return {
      'permission': await permissionGranted(),
      'pending': pending.length,
      'delivered': delivered.length
    };
  }

  Future<void> testDelivery({bool bangla = false}) => _serial(() async {
        if (!await requestPermission()) {
          throw const FormatException(
              'Enable notification permission in device settings.');
        }
        final title = bangla ? 'রিমাইন্ডার পরীক্ষা' : 'Reminder test';
        final body = bangla
            ? 'এই বার্তা দেখলে তাৎক্ষণিক নোটিফিকেশন কাজ করছে।'
            : 'Seeing this confirms immediate notification delivery.';
        await plugin.show(987653, title, body, _details('test'),
            payload: jsonEncode({'kind': 'test'}));
        await plugin.zonedSchedule(
            987652,
            title,
            bangla
                ? 'নির্ধারিত পরীক্ষার নোটিফিকেশন এসেছে।'
                : 'The scheduled test notification has arrived.',
            tz.TZDateTime.now(tz.local).add(const Duration(minutes: 1)),
            _details('test'),
            androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
            uiLocalNotificationDateInterpretation:
                UILocalNotificationDateInterpretation.absoluteTime,
            payload: jsonEncode({'kind': 'test'}));
      });
  static List<Record> upcoming(FinanceSnapshot state) {
    final date = financeNow();
    final floor = DateTime(date.year, date.month, date.day);
    final rows = state
        .of('bill')
        .where((b) =>
            !state.billPaid(b) && DateTime.parse(b.text('due')).isAfter(floor))
        .toList()
      ..sort((a, b) => a.text('due').compareTo(b.text('due')));
    return rows.take(50).toList();
  }

  NotificationDetails _details(String kind, {bool bangla = false}) =>
      NotificationDetails(
          android: AndroidNotificationDetails('hisab_$kind',
              kind == 'daily' ? 'Daily account review' : 'Financial reminders',
              importance: Importance.defaultImportance,
              priority: Priority.defaultPriority,
              visibility: NotificationVisibility.private,
              actions: kind == 'daily'
                  ? [
                      AndroidNotificationAction(
                          'review', bangla ? 'হিসাব দেখুন' : 'Review',
                          showsUserInterface: true),
                      AndroidNotificationAction(
                          'complete', bangla ? 'হিসাব শেষ' : 'Complete',
                          showsUserInterface: true),
                      AndroidNotificationAction(
                          'snooze', bangla ? '৩০ মিনিট পরে' : 'Snooze 30m',
                          showsUserInterface: true)
                    ]
                  : null),
          iOS: DarwinNotificationDetails(
              categoryIdentifier:
                  kind == 'daily' ? (bangla ? 'daily_bn' : 'daily_en') : null,
              presentAlert: true,
              presentSound: true));
  Future<void> refresh(FinanceSnapshot state,
          {NotificationPreferences preferences =
              const NotificationPreferences(bills: true)}) =>
      _serial(() => _refresh(state, preferences));
  Future<void> _refresh(
      FinanceSnapshot state, NotificationPreferences p) async {
    if (kIsWeb) return;
    await initialize();
    try {
      tz.setLocalLocation(tz.getLocation(p.timezone));
    } catch (_) {
      tz.setLocalLocation(tz.getLocation('Asia/Dhaka'));
    }
    final plans = buildReminderPlan(state, p, tz.TZDateTime.now(tz.local));
    final pending = {
      for (final n in await plugin.pendingNotificationRequests())
        n.id: n.payload
    };
    final desired = <int>{};
    for (final plan in plans) {
      desired.add(plan.id);
      if (pending[plan.id] == plan.signature) continue;
      await plugin.zonedSchedule(plan.id, plan.title, plan.body, plan.time,
          _details(plan.kind, bangla: p.bangla),
          androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
          uiLocalNotificationDateInterpretation:
              UILocalNotificationDateInterpretation.absoluteTime,
          matchDateTimeComponents: plan.repeat,
          payload: plan.signature);
    }
    for (final id in pending.keys.where((id) =>
        !desired.contains(id) &&
        id != 987650 &&
        id != 987651 &&
        id != 987652)) {
      await plugin.cancel(id);
    }
    if (state.dailyComplete(financeNow()) || !p.daily) {
      await plugin.cancel(987651);
      await plugin.cancel(ReminderPlan('daily:${dayKey(financeNow())}', 'daily',
              tz.TZDateTime.now(tz.local), '', '')
          .id);
    }
  }

  Future<void> snooze(String date, {bool bangla = false}) async {
    if (date != dayKey(financeNow()) || kIsWeb) return;
    await initialize();
    await plugin.zonedSchedule(
        987651,
        'HisabNikash',
        bangla
            ? 'আজকের আয়-খরচ মিলিয়ে নিন।'
            : 'Review today’s income and expenses.',
        tz.TZDateTime.now(tz.local).add(const Duration(minutes: 30)),
        _details('daily', bangla: bangla),
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        uiLocalNotificationDateInterpretation:
            UILocalNotificationDateInterpretation.absoluteTime,
        payload: jsonEncode({'kind': 'daily', 'date': date}));
  }

  Future<void> reconcile(FinanceRepository repository) => _serial(() async {
        final generation = repository.lifecycle.generation;
        final state = await repository.snapshot();
        final p = NotificationPreferences.fromJson(
            await repository.privateData('notifications'),
            legacyBills: await repository.getSetting('reminders') == 'true',
            bangla: await repository.getSetting('language') == 'bn');
        final box = await repository.privateData('inbox');
        final rows = (box['rows'] as List? ?? [])
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
        final active = state.smartAlerts(bangla: p.bangla);
        final backup = await repository.getSetting('lastBackupExport');
        if (generation != repository.lifecycle.generation) return;
        if (backup == null ||
            financeNow().difference(DateTime.parse(backup)).inDays >= 7) {
          active.add(SmartAlert(
              'backup:health',
              'backup',
              p.bangla ? 'ব্যাকআপ পর্যালোচনা করুন' : 'Review your backup',
              p.bangla
                  ? 'সাম্প্রতিক এনক্রিপ্টেড ব্যাকআপ রাখুন।'
                  : 'Keep a recent encrypted backup.'));
        }
        final ids = active.map((a) => a.id).toSet();
        final wasActive = {
          for (final row in rows) row['id']: row['active'] == true
        };
        for (final row in rows) {
          row['active'] = ids.contains(row['id']);
        }
        var sent =
            box['date'] == dayKey(financeNow()) ? box['sent'] as int? ?? 0 : 0;
        var deferred = false;
        for (final alert in active) {
          var row = rows.where((r) => r['id'] == alert.id).firstOrNull;
          final fresh = row == null ||
              (alert.kind == 'balance' && wasActive[alert.id] == false);
          if (row == null) {
            row = {
              ...alert.toJson(),
              'read': false,
              'at': financeNow().toUtc().toIso8601String()
            };
            rows.insert(0, row);
          }
          row.addAll({...alert.toJson(), 'active': true});
          final enabled = alert.kind == 'budget'
              ? p.budget
              : alert.kind == 'balance'
                  ? p.balance
                  : alert.kind == 'bill'
                      ? false
                      : p.summary;
          var superseded = false;
          if (alert.id.startsWith('budget:')) {
            final level = int.tryParse(alert.id.split(':').last) ?? 0,
                prefix = alert.id.substring(0, alert.id.lastIndexOf(':') + 1);
            superseded = rows.any((r) =>
                r['id'] != alert.id &&
                (r['id'] as String).startsWith(prefix) &&
                (int.tryParse((r['id'] as String).split(':').last) ?? 0) >=
                    level);
          }
          if (!fresh || !enabled || superseded || kIsWeb || sent >= 3) continue;
          if (p.quiet(financeNow().hour)) {
            deferred = true;
            continue;
          }
          try {
            await initialize();
            await plugin.show(
                ReminderPlan(alert.id, alert.kind, tz.TZDateTime.now(tz.local),
                        '', '')
                    .id,
                p.private
                    ? (p.bangla
                        ? 'হিসাবের একটি আপডেট আছে'
                        : 'An account update is available')
                    : alert.title,
                p.private
                    ? (p.bangla
                        ? 'বিস্তারিত দেখতে অ্যাপ খুলুন।'
                        : 'Open the app to review.')
                    : alert.message,
                _details('alerts'),
                payload:
                    jsonEncode({'kind': 'alert', 'record': alert.recordId}));
            sent++;
          } catch (_) {/* Inbox works without OS delivery. */}
        }
        await repository.writePrivate(
            'inbox',
            {
              'rows': rows.take(1000).toList(),
              'date': dayKey(financeNow()),
              'sent': sent
            },
            notify: false);
        try {
          await _refresh(state, p);
          if (!kIsWeb && active.isEmpty) await plugin.cancel(987650);
          if (deferred && !kIsWeb) {
            final now = tz.TZDateTime.now(tz.local);
            var time = tz.TZDateTime(
                tz.local, now.year, now.month, now.day, p.quietEnd);
            if (!time.isAfter(now)) {
              time = tz.TZDateTime(
                  tz.local, now.year, now.month, now.day + 1, p.quietEnd);
            }
            await plugin.zonedSchedule(
                987650,
                'HisabNikash',
                p.bangla
                    ? 'অ্যাপ খুলে হিসাবের আপডেট দেখুন।'
                    : 'Open the app to review account updates.',
                time,
                _details('alerts'),
                androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
                uiLocalNotificationDateInterpretation:
                    UILocalNotificationDateInterpretation.absoluteTime,
                payload: jsonEncode({'kind': 'alert'}));
          }
        } catch (_) {/* Permission status is available in settings. */}
      });
  void dispose() {
    responses.close();
  }
}
