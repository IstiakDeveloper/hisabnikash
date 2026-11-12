import 'money.dart';
import 'package:uuid/uuid.dart';

typedef Json = Map<String, dynamic>;

class Record {
  const Record(this.id, this.kind, this.data,
      {this.revision = 0, this.localVersion = 0, this.deleted = false});
  final String id;
  final String kind;
  final Json data;
  final int revision;
  final int localVersion;
  final bool deleted;
  String text(String key, [String fallback = '']) =>
      data[key] as String? ?? fallback;
  int number(String key) => (data[key] as num?)?.toInt() ?? 0;
  bool flag(String key) => data[key] == true;
  Json toJson() =>
      {'id': id, 'kind': kind, 'data': data, if (deleted) 'deleted': true};
}

const expenseCategories = [
  'Food & groceries',
  'Transport',
  'Shopping',
  'Home & rent',
  'Bills & utilities',
  'Health',
  'Education',
  'Family',
  'Entertainment',
  'Business',
  'Other',
];
const incomeCategories = [
  'Salary',
  'Business',
  'Freelance',
  'Gift',
  'Other income'
];

class LedgerLine {
  const LedgerLine(this.accountId, this.amount);
  final String accountId;
  final int amount;
}

List<LedgerLine> journalLines(Json tx) {
  final amount = tx['amount'] as int;
  if (amount <= 0) throw ArgumentError('Amount must be positive');
  final account = tx['account'] as String;
  final fee = tx['fee'] as int? ?? 0;
  final lines = <LedgerLine>[];
  switch (tx['type']) {
    case 'reversal':
      return journalLines({...tx, 'type': tx['originalType']})
          .map((line) => LedgerLine(line.accountId, -line.amount))
          .toList();
    case 'income':
    case 'debt_collection':
    case 'refund':
      lines.addAll([
        LedgerLine(account, amount),
        LedgerLine('external:income', -amount)
      ]);
      break;
    case 'expense':
    case 'debt_payment':
      lines.addAll([
        LedgerLine(account, -amount),
        LedgerLine('external:expense', amount)
      ]);
      break;
    case 'transfer':
      final destination = tx['destination'] as String;
      if (destination == account) {
        throw ArgumentError('Choose different accounts');
      }
      lines.addAll(
          [LedgerLine(account, -amount), LedgerLine(destination, amount)]);
      break;
    default:
      throw ArgumentError('Unsupported transaction type');
  }
  if (fee > 0) {
    lines.addAll([LedgerLine(account, -fee), LedgerLine('external:fees', fee)]);
  }
  return lines;
}

class FinanceSnapshot {
  const FinanceSnapshot(this.records, this.pending, this.conflicts);
  final List<Record> records;
  final int pending;
  final int conflicts;
  _SnapshotIndex get _index =>
      _snapshotIndexes[this] ??= _SnapshotIndex(records);
  List<Record> of(String kind) => _index.byKind[kind] ?? const [];
  Record? find(String id) => _index.byId[id];
  static String normalized(String name) => name.trim().toLowerCase();
  String categoryId(String space, String type, String name) {
    final label = normalized(name);
    for (final c in of('category')) {
      if (c.text('space') == space &&
          c.text('type') == type &&
          (normalized(c.text('name')) == label ||
              (c.data['aliases'] as List? ?? const [])
                  .any((a) => a is String && normalized(a) == label))) {
        return c.id;
      }
    }
    return const Uuid()
        .v5(Namespace.url.value, 'hisabnikash/category/$space/$type/$label');
  }

  String categoryIdentity(Record r) => r.text('categoryId').isNotEmpty
      ? r.text('categoryId')
      : categoryId(
          r.text('space'),
          r.kind == 'budget' || r.text('type') != 'income'
              ? 'expense'
              : 'income',
          r.text('category'));
  String categoryName(Record r) =>
      find(categoryIdentity(r))?.text('name') ?? r.text('category');
  bool isPosted(Record r, {DateTime? asOf}) =>
      r.text('date').compareTo(dayKey(asOf ?? financeNow())) <= 0;
  bool isReversed(Record r) =>
      of('transaction').any((t) => t.text('reversalOf') == r.id && isPosted(t));
  String effectiveType(Record r) {
    final type =
        r.text('type') == 'reversal' ? r.text('originalType') : r.text('type');
    return type == 'refund' ? 'expense' : type;
  }

  int signedAmount(Record r) =>
      (r.text('type') == 'reversal' ? -1 : 1) *
      ((r.text('type') == 'refund' || r.text('originalType') == 'refund')
          ? -1
          : 1) *
      r.number('amount');
  Map<String, int> expenseParts(Record r) {
    final result = <String, int>{};
    if (r.flag('adjustment')) return result;
    if (effectiveType(r) == 'expense') {
      final splits = r.data['splits'] as List? ?? const [];
      if (splits.isEmpty) {
        result[categoryName(r)] = signedAmount(r);
      } else {
        final sign = signedAmount(r) < 0 ? -1 : 1;
        for (final split in splits) {
          final category =
              find(split['categoryId'] as String? ?? '')?.text('name') ??
                  split['category'] as String;
          result.update(category, (v) => v + sign * (split['amount'] as int),
              ifAbsent: () => sign * (split['amount'] as int));
        }
      }
    }
    if (r.number('fee') > 0) {
      final sign = r.text('type') == 'reversal' ? -1 : 1;
      final category = r.text('feeCategory', 'Fees');
      result.update(category, (v) => v + sign * r.number('fee'),
          ifAbsent: () => sign * r.number('fee'));
    }
    return result;
  }

  bool belongsToSpace(Record r, String space) =>
      space == 'all' ||
      r.text('space') == space ||
      (effectiveType(r) == 'transfer' &&
          find(r.text('destination'))?.text('space') == space);
  int balance(Record account, {DateTime? asOf}) {
    final cutoff = dayKey(asOf ?? financeNow());
    final balances = _index.balances.putIfAbsent(cutoff, () {
      final result = {
        for (final a in of('account'))
          a.id: a.text('openingDate').compareTo(cutoff) <= 0
              ? a.number('opening')
              : 0
      };
      for (final r in of('transaction')) {
        if (r.text('date').compareTo(cutoff) > 0) continue;
        for (final line in journalLines(r.data)) {
          if (result.containsKey(line.accountId)) {
            result.update(line.accountId, (value) => value + line.amount);
          }
        }
      }
      return result;
    });
    return balances[account.id] ?? account.number('opening');
  }

  List<Record> transactions(String space, DateTime month) {
    final prefix = monthKey(month);
    return of('transaction')
        .where((r) =>
            belongsToSpace(r, space) && r.text('date').startsWith(prefix))
        .toList()
      ..sort((a, b) => b.text('date').compareTo(a.text('date')));
  }

  int total(String space, DateTime month, String type) {
    final cutoff = dayKey(financeNow());
    if (type == 'expense') {
      return transactions(space, month)
          .where((r) => r.text('space') == space || space == 'all')
          .where((r) => isPosted(r))
          .fold(
              0,
              (sum, r) =>
                  sum + expenseParts(r).values.fold<int>(0, (a, b) => a + b));
    }
    return transactions(space, month)
        .where((r) =>
            !r.flag('adjustment') &&
            effectiveType(r) == type &&
            r.text('date').compareTo(cutoff) <= 0)
        .fold(0, (sum, r) => sum + signedAmount(r));
  }

  int spent(String space, String month, String category) {
    final cutoff = dayKey(financeNow());
    final identity = categoryId(space, 'expense', category);
    final name = find(identity)?.text('name') ?? category;
    return of('transaction')
        .where((r) =>
            r.text('space') == space &&
            r.text('date').compareTo(cutoff) <= 0 &&
            r.text('date').startsWith(month))
        .fold(0, (sum, r) => sum + (expenseParts(r)[name] ?? 0));
  }

  int spaceBalance(String space, {DateTime? asOf}) => of('account')
      .where((r) => space == 'all' || r.text('space') == space)
      .fold(0, (sum, r) => sum + balance(r, asOf: asOf));
  int transferTotal(String space, DateTime month, {required bool incoming}) {
    if (space == 'all') return 0;
    final cutoff = dayKey(financeNow());
    return transactions(space, month)
        .where((r) =>
            effectiveType(r) == 'transfer' &&
            r.text('date').compareTo(cutoff) <= 0)
        .where((r) {
      final source = find(r.text('account'))?.text('space'),
          destination = find(r.text('destination'))?.text('space');
      return source != destination &&
          (incoming ? destination == space : source == space);
    }).fold(0, (sum, r) => sum + signedAmount(r));
  }

  int cashIn(String space, DateTime month) =>
      total(space, month, 'income') +
      total(space, month, 'debt_collection') +
      adjustmentTotal(space, month, incoming: true) +
      transferTotal(space, month, incoming: true);
  int cashOut(String space, DateTime month) =>
      total(space, month, 'expense') +
      total(space, month, 'debt_payment') +
      adjustmentTotal(space, month, incoming: false) +
      transferTotal(space, month, incoming: false);
  int cashFlow(String space, DateTime month) =>
      cashIn(space, month) - cashOut(space, month);
  List<StatementEntry> statement(Record account, {DateTime? asOf}) {
    final cutoff = dayKey(asOf ?? financeNow());
    final posted = of('transaction')
        .where((r) =>
            r.text('date').compareTo(cutoff) <= 0 &&
            (r.text('account') == account.id ||
                (effectiveType(r) == 'transfer' &&
                    r.text('destination') == account.id)))
        .toList()
      ..sort((a, b) {
        final date = a.text('date').compareTo(b.text('date'));
        return date == 0 ? a.id.compareTo(b.id) : date;
      });
    var running = account.number('opening');
    return posted.map((r) {
      final movement = journalLines(r.data)
          .where((l) => l.accountId == account.id)
          .fold(0, (int sum, l) => sum + l.amount);
      running += movement;
      return StatementEntry(r, movement, running);
    }).toList();
  }

  int adjustmentTotal(String space, DateTime month, {required bool incoming}) =>
      transactions(space, month)
          .where((r) =>
              r.flag('adjustment') &&
              isPosted(r) &&
              effectiveType(r) == (incoming ? 'income' : 'expense'))
          .fold(0, (sum, r) => sum + signedAmount(r));
  int billPaidAmount(Record bill) => bill.flag('paid')
      ? bill.number('amount')
      : of('transaction')
          .where(
              (r) => r.text('bill') == bill.id && isPosted(r) && !isReversed(r))
          .fold(0, (sum, r) => sum + r.number('amount'));
  bool billPaid(Record bill) => billPaidAmount(bill) >= bill.number('amount');
  int repaid(Record loan) =>
      loan.number('repaid') +
      of('transaction')
          .where(
              (r) => r.text('loan') == loan.id && isPosted(r) && !isReversed(r))
          .fold(0, (sum, r) => sum + r.number('amount'));
}

final _snapshotIndexes = Expando<_SnapshotIndex>();

class StatementEntry {
  const StatementEntry(this.record, this.movement, this.balance);
  final Record record;
  final int movement, balance;
}

class _SnapshotIndex {
  _SnapshotIndex(List<Record> records) {
    for (final r in records) {
      byId[r.id] = r;
      byKind.putIfAbsent(r.kind, () => []).add(r);
    }
  }
  final byId = <String, Record>{};
  final byKind = <String, List<Record>>{};
  final balances = <String, Map<String, int>>{};
}
