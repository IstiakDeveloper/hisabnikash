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
  switch (tx['type']) {
    case 'reversal':
      return journalLines({...tx, 'type': tx['originalType']})
          .map((line) => LedgerLine(line.accountId, -line.amount))
          .toList();
    case 'income':
    case 'debt_collection':
      return [
        LedgerLine(account, amount),
        LedgerLine('external:income', -amount)
      ];
    case 'expense':
    case 'debt_payment':
      return [
        LedgerLine(account, -amount),
        LedgerLine('external:expense', amount)
      ];
    case 'transfer':
      final destination = tx['destination'] as String;
      if (destination == account) {
        throw ArgumentError('Choose different accounts');
      }
      return [LedgerLine(account, -amount), LedgerLine(destination, amount)];
    default:
      throw ArgumentError('Unsupported transaction type');
  }
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
      r.text('date').compareTo(dayKey(asOf ?? DateTime.now())) <= 0;
  bool isReversed(Record r) =>
      of('transaction').any((t) => t.text('reversalOf') == r.id && isPosted(t));
  String effectiveType(Record r) =>
      r.text('type') == 'reversal' ? r.text('originalType') : r.text('type');
  int signedAmount(Record r) =>
      (r.text('type') == 'reversal' ? -1 : 1) * r.number('amount');
  bool belongsToSpace(Record r, String space) =>
      space == 'all' ||
      r.text('space') == space ||
      (effectiveType(r) == 'transfer' &&
          find(r.text('destination'))?.text('space') == space);
  int balance(Record account, {DateTime? asOf}) {
    final cutoff = dayKey(asOf ?? DateTime.now());
    final balances = _index.balances.putIfAbsent(cutoff, () {
      final result = {for (final a in of('account')) a.id: a.number('opening')};
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
    final cutoff = dayKey(DateTime.now());
    return transactions(space, month)
        .where((r) =>
            effectiveType(r) == type && r.text('date').compareTo(cutoff) <= 0)
        .fold(0, (sum, r) => sum + signedAmount(r));
  }

  int spent(String space, String month, String category) {
    final cutoff = dayKey(DateTime.now()),
        identity = categoryId(space, 'expense', category);
    return of('transaction')
        .where((r) =>
            r.text('space') == space &&
            effectiveType(r) == 'expense' &&
            r.text('date').compareTo(cutoff) <= 0 &&
            r.text('date').startsWith(month) &&
            categoryIdentity(r) == identity)
        .fold(0, (sum, r) => sum + signedAmount(r));
  }

  int spaceBalance(String space, {DateTime? asOf}) => of('account')
      .where((r) => space == 'all' || r.text('space') == space)
      .fold(0, (sum, r) => sum + balance(r, asOf: asOf));
  int transferTotal(String space, DateTime month, {required bool incoming}) {
    if (space == 'all') return 0;
    final cutoff = dayKey(DateTime.now());
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
      transferTotal(space, month, incoming: true);
  int cashOut(String space, DateTime month) =>
      total(space, month, 'expense') +
      total(space, month, 'debt_payment') +
      transferTotal(space, month, incoming: false);
  int cashFlow(String space, DateTime month) =>
      cashIn(space, month) - cashOut(space, month);
  List<StatementEntry> statement(Record account, {DateTime? asOf}) {
    final cutoff = dayKey(asOf ?? DateTime.now());
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

  bool billPaid(Record bill) =>
      bill.flag('paid') ||
      of('transaction').any((r) => r.text('bill') == bill.id && !isReversed(r));
  int repaid(Record loan) =>
      loan.number('repaid') +
      of('transaction')
          .where((r) => r.text('loan') == loan.id && !isReversed(r))
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
