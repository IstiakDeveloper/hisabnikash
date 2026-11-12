import 'package:intl/intl.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

String? _financeTimezone;
bool validFinanceTimezone(Object? value) {
  if (value == null) return true;
  if (value is! String) return false;
  try {
    tzdata.initializeTimeZones();
    tz.getLocation(value);
    return true;
  } catch (_) {
    return false;
  }
}

void configureFinanceClock(String? timezone) {
  if (timezone == _financeTimezone) return;
  if (!validFinanceTimezone(timezone)) {
    throw const FormatException('Choose a valid timezone.');
  }
  _financeTimezone = timezone;
}

DateTime financeNow() => _financeTimezone == null
    ? DateTime.now()
    : tz.TZDateTime.now(tz.getLocation(_financeTimezone!));

/// All persisted money is integer minor units. Never parse through a double.
int parseMoney(String input, {bool allowZero = false}) {
  var normalized = input.trim().replaceAll(',', '');
  const bangla = '০১২৩৪৫৬৭৮৯';
  for (var i = 0; i < 10; i++) {
    normalized = normalized.replaceAll(bangla[i], '$i');
  }
  if (!RegExp(r'^\d{1,12}(\.\d{1,2})?$').hasMatch(normalized)) {
    throw const FormatException(
        'Enter an amount with up to two decimal places.');
  }
  final parts = normalized.split('.');
  final result = int.parse(parts.first) * 100 +
      (parts.length == 2 ? int.parse(parts[1].padRight(2, '0')) : 0);
  if (!allowZero && result == 0) {
    throw const FormatException('Amount must be greater than zero.');
  }
  return result;
}

String money(int paisa, {bool decimals = false}) {
  final negative = paisa < 0;
  final amount = paisa.abs();
  final whole = NumberFormat('#,##,##0', 'en_IN').format(amount ~/ 100);
  final fraction = (amount % 100).toString().padLeft(2, '0');
  return '${negative ? '−' : ''}৳$whole${decimals || amount % 100 != 0 ? '.$fraction' : ''}';
}

String editableMoney(int paisa) =>
    '${paisa < 0 ? '-' : ''}${paisa.abs() ~/ 100}.${(paisa.abs() % 100).toString().padLeft(2, '0')}';
String dayKey(DateTime date) => DateFormat('yyyy-MM-dd').format(date);
String monthKey(DateTime date) => DateFormat('yyyy-MM').format(date);
