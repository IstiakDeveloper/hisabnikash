import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hisabnikash_mobile/core/models.dart';
import 'package:hisabnikash_mobile/core/money.dart';
import 'package:hisabnikash_mobile/core/planning.dart';
import 'package:hisabnikash_mobile/core/reminders.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const channel = MethodChannel('dexterous.com/flutter/local_notifications');
  late ReminderService service;
  late List<MethodCall> calls;
  late Map<int, Map<String, dynamic>> pending;
  var permission = true;
  setUp(() {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    AndroidFlutterLocalNotificationsPlugin.registerWith();
    configureFinanceClock(null);
    calls = [];
    pending = {};
    permission = true;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
      calls.add(call);
      final args = call.arguments is Map
          ? Map<String, dynamic>.from(call.arguments)
          : <String, dynamic>{};
      switch (call.method) {
        case 'initialize':
          return true;
        case 'getNotificationAppLaunchDetails':
          return {'notificationLaunchedApp': false};
        case 'pendingNotificationRequests':
          return pending.values
              .map((p) => {
                    'id': p['id'],
                    'title': p['title'],
                    'body': p['body'],
                    'payload': p['payload']
                  })
              .toList();
        case 'getActiveNotifications':
          return <Map<String, dynamic>>[];
        case 'areNotificationsEnabled':
          return permission;
        case 'checkPermissions':
          return {
            'isEnabled': permission,
            'isAlertEnabled': permission,
            'isSoundEnabled': permission
          };
        case 'requestPermissions':
        case 'requestNotificationsPermission':
          return permission;
        case 'zonedSchedule':
          pending[args['id'] as int] = args;
          return null;
        case 'cancel':
          pending.remove(args['id']);
          return null;
        default:
          return null;
      }
    });
    service = ReminderService();
  });
  tearDown(() {
    service.dispose();
    debugDefaultTargetPlatformOverride = null;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });
  FinanceSnapshot state() => FinanceSnapshot([
        const Record('personal', 'space', {'name': 'Personal'}),
        const Record('cash', 'account',
            {'space': 'personal', 'name': 'Cash', 'opening': 100000}),
        Record('rent', 'bill', {
          'space': 'personal',
          'name': 'Rent',
          'amount': 1000,
          'due': dayKey(DateTime(
              financeNow().year, financeNow().month, financeNow().day + 5)),
          'frequency': 'once'
        })
      ], 0, 0);
  test('iPhone permission status is read from iOS rather than Android',
      () async {
    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
    IOSFlutterLocalNotificationsPlugin.registerWith();
    expect(await service.permissionGranted(), true);
    permission = false;
    expect(await service.permissionGranted(), false);
    expect(calls.any((c) => c.method == 'checkPermissions'), true);
    expect(calls.any((c) => c.method == 'areNotificationsEnabled'), false);
    expect(
        calls.firstWhere((c) => c.method == 'initialize').arguments.toString(),
        contains('daily_bn'));
  });
  test(
      'unchanged refresh does not duplicate reminders and switching bills off preserves daily review',
      () async {
    final data = state();
    const prefs =
        NotificationPreferences(daily: true, bills: true, bangla: true);
    await service.refresh(data, preferences: prefs);
    final schedules = calls.where((c) => c.method == 'zonedSchedule').length;
    expect(schedules, greaterThan(20));
    expect(pending.length, lessThanOrEqualTo(59));
    expect(
        pending.values
            .where((p) => jsonDecode(p['payload'])['route']['kind'] == 'daily')
            .every((p) => p['matchDateTimeComponents'] == null),
        true);
    await service.refresh(data, preferences: prefs);
    expect(calls.where((c) => c.method == 'zonedSchedule').length, schedules);
    await service.refresh(data,
        preferences: const NotificationPreferences(
            daily: true, bills: false, bangla: true));
    expect(
        pending.values
            .any((p) => jsonDecode(p['payload'])['route']['kind'] == 'bill'),
        false);
    expect(
        pending.values
            .any((p) => jsonDecode(p['payload'])['route']['kind'] == 'daily'),
        true);
  });
  test('completion cancels today without removing future daily reminders',
      () async {
    final data = state(), today = financeNow();
    await service.refresh(data,
        preferences: const NotificationPreferences(daily: true));
    final reviewed = FinanceSnapshot([
      ...data.records,
      Record('review', 'daily_review', {
        'space': 'personal',
        'date': dayKey(today),
        'fingerprint': data.dailyFingerprint(today),
        'noTransactions': true
      })
    ], 0, 0);
    await service.refresh(reviewed,
        preferences: const NotificationPreferences(daily: true));
    expect(
        pending.values.any(
            (p) => jsonDecode(p['payload'])['route']['date'] == dayKey(today)),
        false);
    expect(
        pending.values
            .where((p) => jsonDecode(p['payload'])['route']['kind'] == 'daily')
            .length,
        greaterThanOrEqualTo(19));
  });
  test('native action payload reaches the app with its original day', () async {
    await service.initialize();
    final response = service.responses.stream.first;
    final route = {'kind': 'daily', 'date': '2026-11-11'};
    ServicesBinding.instance.channelBuffers.push(
        channel.name,
        const StandardMethodCodec()
            .encodeMethodCall(MethodCall('didReceiveNotificationResponse', {
          'notificationResponseType': 0,
          'id': 123,
          'actionId': 'complete',
          'payload': jsonEncode({'route': route})
        })),
        (_) {});
    final value = await response;
    expect(value['date'], '2026-11-11');
    expect(value['action'], 'complete');
  });
  test(
      'delivery self-test respects permission and retains its scheduled message through refresh',
      () async {
    permission = false;
    await expectLater(
        service.testDelivery(bangla: true), throwsFormatException);
    expect(calls.any((c) => c.method == 'show'), false);
    permission = true;
    await service.testDelivery(bangla: true);
    expect(calls.lastWhere((c) => c.method == 'show').arguments['body'],
        contains('তাৎক্ষণিক'));
    expect(pending.containsKey(987652), true);
    await service.refresh(state(),
        preferences: const NotificationPreferences(daily: true));
    expect(pending.containsKey(987652), true);
    final diagnostic = await service.diagnostics();
    expect(diagnostic['permission'], true);
    expect(diagnostic['pending'], pending.length);
  });
}
