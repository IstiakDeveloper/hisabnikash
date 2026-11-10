import 'package:drift/drift.dart';
import 'database_native.dart' if (dart.library.html) 'database_web.dart'
    as platform;

class FinanceDatabase extends GeneratedDatabase {
  FinanceDatabase(super.executor);
  factory FinanceDatabase.file(Object file) =>
      FinanceDatabase(platform.fileExecutor(file));
  factory FinanceDatabase.memory() =>
      FinanceDatabase(platform.memoryExecutor());
  static Future<FinanceDatabase> named(String name) async =>
      FinanceDatabase(await platform.openExecutor(name));
  @override
  int get schemaVersion => 2;
  @override
  Iterable<TableInfo<Table, Object?>> get allTables => const [];
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => const [];
  @override
  MigrationStrategy get migration => MigrationStrategy(onCreate: (_) async {
        await customStatement(
            'CREATE TABLE records (id TEXT PRIMARY KEY, kind TEXT NOT NULL, payload TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, deleted INTEGER NOT NULL DEFAULT 0, local_version INTEGER NOT NULL DEFAULT 1)');
        await customStatement(
            'CREATE TABLE outbox (record_id TEXT PRIMARY KEY, operation_id TEXT UNIQUE NOT NULL, base_revision INTEGER NOT NULL, blocked INTEGER NOT NULL DEFAULT 0)');
        await customStatement(
            'CREATE TABLE audit (id INTEGER PRIMARY KEY AUTOINCREMENT, record_id TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL)');
        await customStatement(
            'CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
        await customStatement(
            'CREATE TABLE conflicts (record_id TEXT PRIMARY KEY, remote TEXT NOT NULL)');
        await customStatement(
            'CREATE INDEX records_kind ON records(kind, deleted)');
      }, onUpgrade: (_, from, to) async {
        if (from < 2) {
          await customStatement(
              'ALTER TABLE records ADD COLUMN local_version INTEGER NOT NULL DEFAULT 1');
        }
      });
}
