part of 'repository.dart';

class _FlexibleBillScheduler {
  _FlexibleBillScheduler(this.repo);
  final FinanceRepository repo;
  Future<Json> configure(String id, Json data, Record? old,
      FinanceSnapshot state, String scope) async {
    var series = old?.text('series', old.id) ?? id;
    final scheduleId = old?.text('scheduleId').isNotEmpty == true
        ? old!.text('scheduleId')
        : repo.uuid.v5(Namespace.url.value, 'hisabnikash/schedule/$series');
    final result = <String, dynamic>{
      ...data,
      'series': series,
      'scheduleId': scheduleId,
      'cycle': old?.text('cycle', dayKey(DateTime.parse(old.text('due')))) ??
          data['due']
    };
    final schedule = await repo.record(scheduleId);
    final structural = old != null &&
        scope == 'future' &&
        (data['frequency'] != old.text('frequency') ||
            data['due'] != old.text('due') ||
            data['intervalDays'] != old.data['intervalDays']);
    if (structural) {
      series = '$series:g${(schedule?.number('generation') ?? 0) + 1}';
      result['series'] = series;
    }
    if (data['frequency'] == 'monthly') {
      result['cycle'] = monthKey(DateTime.parse(data['due']));
    }
    if (old == null || scope == 'future') {
      await repo._write(
          scheduleId,
          'schedule',
          {
            'space': data['space'],
            'name': data['name'],
            'amount': data['amount'],
            'category': data['category'] ?? 'Bills & utilities',
            'frequency': data['frequency'],
            'intervalDays': data['intervalDays'] ?? 7,
            'startDate': data['due'],
            'anchorDay': DateTime.parse(data['due']).day,
            'series': series,
            'active': data['frequency'] != 'once',
            'generation':
                (schedule?.number('generation') ?? 0) + (structural ? 1 : 0)
          },
          schedule?.revision ?? 0);
      for (final occurrence in state.of('bill').where((b) =>
          b.id != id &&
          b.text('scheduleId') == scheduleId &&
          b.text('due').compareTo(old?.text('due') ?? data['due']) >= 0 &&
          !state.billPaid(b) &&
          !state.of('transaction').any((t) => t.text('bill') == b.id))) {
        if (structural || data['frequency'] == 'once') {
          await repo._write(
              occurrence.id, 'bill', occurrence.data, occurrence.revision,
              deleted: true);
        } else {
          await repo._write(
              occurrence.id,
              'bill',
              {
                ...occurrence.data,
                'name': data['name'],
                'amount': data['amount'],
                'category': data['category'] ?? 'Bills & utilities'
              },
              occurrence.revision);
        }
      }
    }
    return result;
  }

  Future<bool> materialize(DateTime now) async {
    final state = await repo.snapshot(),
        horizon = DateTime(now.year, now.month + 3, 0);
    var changed = false;
    for (final schedule in state.of('schedule').where((r) =>
        r.flag('active') && r.text('frequency', 'monthly') != 'monthly')) {
      final start = DateTime.parse(schedule.text('startDate')),
          frequency = schedule.text('frequency');
      for (var n = 0; n < 20000; n++) {
        late DateTime due;
        if (frequency == 'yearly') {
          final last = DateTime(start.year + n, start.month + 1, 0).day;
          due = DateTime(
              start.year + n, start.month, start.day > last ? last : start.day);
        } else {
          due = DateTime(
              start.year,
              start.month,
              start.day +
                  n *
                      (frequency == 'weekly'
                          ? 7
                          : schedule.number('intervalDays')));
        }
        if (due.isAfter(horizon)) break;
        final key = dayKey(due), id = '${schedule.text('series')}:$key';
        final existing = await repo.record(id);
        // Any existing cycle, including a deleted one, is deliberately retained.
        if (existing != null ||
            state.of('bill').any((b) =>
                b.text('scheduleId') == schedule.id && b.text('due') == key)) {
          continue;
        }
        final data = <String, dynamic>{
          'space': schedule.text('space'),
          'name': schedule.text('name'),
          'amount': schedule.number('amount'),
          'category': schedule.text('category', 'Bills & utilities'),
          'frequency': frequency,
          'intervalDays': schedule.number('intervalDays'),
          'due': key,
          'paid': false,
          'series': schedule.text('series'),
          'scheduleId': schedule.id,
          'cycle': key
        };
        await repo._write(id, 'bill', data, 0);
        changed = true;
      }
    }
    return changed;
  }
}
