part of 'repository.dart';

class _BillScheduler {
  _BillScheduler(this.repo);
  final FinanceRepository repo;
  Future<Json> configure(String id, Json data, Record? old,
      FinanceSnapshot state, String scope) async {
    var scheduleId =
        old?.text('scheduleId') ?? data['scheduleId'] as String? ?? '';
    final series =
        old?.text('series', old.id) ?? data['series'] as String? ?? id;
    if (scheduleId.isEmpty && data['frequency'] == 'monthly') {
      scheduleId =
          repo.uuid.v5(Namespace.url.value, 'hisabnikash/schedule/$series');
      final prior = await repo.record(scheduleId);
      if (prior == null) {
        await repo._write(
            scheduleId,
            'schedule',
            {
              'space': data['space'],
              'name': data['name'],
              'amount': data['amount'],
              'series': series,
              'startDate': data['due'],
              'anchorDay': data['anchorDay'] ?? DateTime.parse(data['due']).day,
              'active': true
            },
            0);
      }
    }
    if (scheduleId.isEmpty) return data;
    final due = DateTime.parse(data['due'] as String);
    final anchor = old != null && data['due'] != old.text('due')
        ? due.day
        : (data['anchorDay'] as int? ?? due.day);
    final cycle =
        old?.text('cycle', monthKey(DateTime.parse(old.text('due')))) ??
            monthKey(due);
    data = {
      ...data,
      'scheduleId': scheduleId,
      'series': series,
      'cycle': cycle
    };
    if (old != null && scope == 'future') {
      final schedule = await repo.record(scheduleId);
      if (schedule != null) {
        if (data['frequency'] == 'monthly' && monthKey(due) != cycle) {
          throw const FormatException(
              'For a series edit, choose a due date within the same month. Use this-occurrence-only to move one payment.');
        }
        await repo._write(
            schedule.id,
            'schedule',
            {
              ...schedule.data,
              'name': data['name'],
              'amount': data['amount'],
              'anchorDay': anchor,
              'active': data['frequency'] == 'monthly'
            },
            schedule.revision);
        for (final r in state.of('bill').where((r) =>
            r.id != id &&
            (r.text('scheduleId') == scheduleId ||
                r.text('series', r.id) == series) &&
            r.text('cycle', r.text('due').substring(0, 7)).compareTo(cycle) >=
                0 &&
            !state.billPaid(r) &&
            !state.of('transaction').any((t) => t.text('bill') == r.id))) {
          if (data['frequency'] == 'once') {
            await repo._write(r.id, r.kind, r.data, r.revision, deleted: true);
          } else {
            final month = DateTime.parse(
                '${r.text('cycle', r.text('due').substring(0, 7))}-01');
            final last = DateTime(month.year, month.month + 1, 0).day;
            await repo._write(
                r.id,
                r.kind,
                {
                  ...r.data,
                  'scheduleId': scheduleId,
                  'series': series,
                  'name': data['name'],
                  'amount': data['amount'],
                  'anchorDay': anchor,
                  'due': dayKey(DateTime(
                      month.year, month.month, anchor > last ? last : anchor))
                },
                r.revision);
          }
        }
      }
    }
    return data;
  }

  Future<bool> materialize(DateTime now) async {
    var changed = false;
    var state = await repo.snapshot();
    // Upgrade legacy occurrence-only schedules without removing any old records.
    for (final bill in state.of('bill').where((r) =>
        r.text('frequency') == 'monthly' && r.text('scheduleId').isEmpty)) {
      final data =
          await configure(bill.id, {...bill.data}, null, state, 'occurrence');
      await repo._write(bill.id, bill.kind, data, bill.revision);
      changed = true;
    }
    state = await repo.snapshot();
    final all = await repo.db.customSelect(
        'SELECT id,payload,deleted,kind FROM records WHERE kind=?',
        variables: [Variable.withString('bill')]).get();
    final cycles = <String>{};
    for (final row in all) {
      final data = await repo.cipher.open(row.read<String>('payload')) as Json;
      final series = data['series'] as String? ?? row.read<String>('id');
      final cycle =
          data['cycle'] as String? ?? (data['due'] as String).substring(0, 7);
      cycles.add('$series:$cycle');
    }
    final horizon = DateTime(now.year, now.month + 3, 0);
    for (final schedule
        in state.of('schedule').where((r) => r.flag('active'))) {
      final start = DateTime.parse(schedule.text('startDate'));
      final anchor = schedule.number('anchorDay');
      for (var i = 0; i < 1200; i++) {
        final month = DateTime(start.year, start.month + i);
        if (month.isAfter(horizon)) break;
        final cycle = monthKey(month),
            key = '${schedule.text('series')}:$cycle';
        if (cycles.contains(key)) continue;
        final last = DateTime(month.year, month.month + 1, 0).day;
        final due =
            DateTime(month.year, month.month, anchor > last ? last : anchor);
        final id = '${schedule.text('series')}:${dayKey(due)}';
        await repo._write(
            id,
            'bill',
            {
              'space': schedule.text('space'),
              'name': schedule.text('name'),
              'amount': schedule.number('amount'),
              'due': dayKey(due),
              'frequency': 'monthly',
              'paid': false,
              'anchorDay': anchor,
              'series': schedule.text('series'),
              'scheduleId': schedule.id,
              'cycle': cycle
            },
            0);
        cycles.add(key);
        changed = true;
      }
    }
    return changed;
  }

  Future<void> next(Record bill) async {
    final schedule = bill.text('scheduleId').isEmpty
        ? null
        : await repo.record(bill.text('scheduleId'));
    if (schedule == null || !schedule.flag('active')) return;
    final base = DateTime.parse(
        '${bill.text('cycle', bill.text('due').substring(0, 7))}-01');
    final nextMonth = DateTime(base.year, base.month + 1),
        cycle = monthKey(DateTime(base.year, base.month + 1));
    // Tombstones are explicit skipped occurrences, not missing data.
    for (final row in await repo.db.customSelect(
        'SELECT id,payload FROM records WHERE kind=?',
        variables: [Variable.withString('bill')]).get()) {
      final data = await repo.cipher.open(row.read<String>('payload')) as Json;
      if ((data['series'] ?? row.read<String>('id')) ==
              schedule.text('series') &&
          (data['cycle'] ?? (data['due'] as String).substring(0, 7)) == cycle) {
        return;
      }
    }
    final last = DateTime(nextMonth.year, nextMonth.month + 1, 0).day,
        anchor = schedule.number('anchorDay');
    final due = DateTime(
        nextMonth.year, nextMonth.month, anchor > last ? last : anchor);
    await repo._write(
        '${schedule.text('series')}:${dayKey(due)}',
        'bill',
        {
          'space': schedule.text('space'),
          'name': schedule.text('name'),
          'amount': schedule.number('amount'),
          'due': dayKey(due),
          'frequency': 'monthly',
          'paid': false,
          'series': schedule.text('series'),
          'scheduleId': schedule.id,
          'anchorDay': anchor,
          'cycle': cycle
        },
        0);
  }
}
