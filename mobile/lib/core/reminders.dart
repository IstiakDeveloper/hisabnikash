import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;
import 'models.dart';

class ReminderService {
  final plugin = FlutterLocalNotificationsPlugin();
  bool _initialized = false;
  Future<void> _tail = Future.value();
  Future<void> initialize() async {
    if (_initialized) return;
    tzdata.initializeTimeZones();
    tz.setLocalLocation(tz.getLocation('Asia/Dhaka'));
    await plugin.initialize(const InitializationSettings(
        android: AndroidInitializationSettings('ic_notification'),
        iOS: DarwinInitializationSettings(
            requestAlertPermission: false,
            requestBadgePermission: false,
            requestSoundPermission: false)));
    _initialized = true;
  }

  Future<bool> requestPermission() async {
    await initialize();
    final android = plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    final ios = plugin.resolvePlatformSpecificImplementation<
        IOSFlutterLocalNotificationsPlugin>();
    return await android?.requestNotificationsPermission() ??
        await ios?.requestPermissions(alert: true, badge: false, sound: true) ??
        false;
  }

  Future<void> cancel() {
    final operation = _tail.then((_) async {
      await initialize();
      await plugin.cancelAll();
    });
    _tail = operation.catchError((Object _) {});
    return operation;
  }

  static List<Record> upcoming(FinanceSnapshot state) {
    final today = DateTime.now();
    final floor = DateTime(today.year, today.month, today.day);
    final records = state
        .of('bill')
        .where((r) =>
            !state.billPaid(r) && DateTime.parse(r.text('due')).isAfter(floor))
        .toList()
      ..sort((a, b) => a.text('due').compareTo(b.text('due')));
    return records.take(50).toList();
  }

  Future<void> refresh(FinanceSnapshot state) {
    final operation = _tail.then((_) => _refresh(state));
    _tail = operation.catchError((Object _) {});
    return operation;
  }

  Future<void> _refresh(FinanceSnapshot state) async {
    await initialize();
    final pending = {
      for (final r in await plugin.pendingNotificationRequests())
        if (r.payload?.startsWith('hisab:bill:') == true ||
            (r.payload == null && r.id >= 100 && r.id < 150))
          r.id: r.payload
    };
    final desired = <int>{};
    final now = tz.TZDateTime.now(tz.local);
    for (final bill in upcoming(state)) {
      final due = DateTime.parse(bill.text('due'));
      final scheduled =
          tz.TZDateTime(tz.local, due.year, due.month, due.day - 1, 9);
      if (!scheduled.isAfter(now)) continue;
      var id = 100;
      for (final byte in bill.id.codeUnits) {
        id = ((id * 31) + byte) & 0x3fffffff;
      }
      while (desired.contains(id)) {
        id = (id + 1) & 0x3fffffff;
      }
      desired.add(id);
      final payload =
          'hisab:bill:${bill.id}:${scheduled.millisecondsSinceEpoch}';
      if (pending[id] == payload) continue;
      await plugin.zonedSchedule(
          id,
          'A bill is coming up',
          'Open HisabNikash to review tomorrow’s payment.',
          scheduled,
          const NotificationDetails(
              android: AndroidNotificationDetails(
                  'bill_reminders', 'Bill reminders',
                  channelDescription:
                      'Private reminders for upcoming financial obligations',
                  importance: Importance.defaultImportance,
                  priority: Priority.defaultPriority,
                  visibility: NotificationVisibility.private),
              iOS: DarwinNotificationDetails(
                  presentAlert: true, presentSound: true)),
          androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
          payload: payload,
          uiLocalNotificationDateInterpretation:
              UILocalNotificationDateInterpretation.absoluteTime);
    }
    for (final id in pending.keys.where((id) => !desired.contains(id))) {
      await plugin.cancel(id);
    }
  }
}
