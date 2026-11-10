import 'package:drift/drift.dart';
import 'package:drift/wasm.dart';

QueryExecutor fileExecutor(Object file) =>
    throw UnsupportedError('Use a named browser vault.');
QueryExecutor memoryExecutor() =>
    throw UnsupportedError('Use a named browser vault.');
Future<QueryExecutor> openExecutor(String name) async {
  final result = await WasmDatabase.open(
      databaseName: name,
      sqlite3Uri: Uri.parse('sqlite3.wasm'),
      driftWorkerUri: Uri.parse('drift_worker.js'));
  if (result.chosenImplementation == WasmStorageImplementation.inMemory) {
    await result.resolvedExecutor.close();
    throw StateError(
        'Browser storage is unavailable. Allow local site storage and reopen the app.');
  }
  return result.resolvedExecutor;
}
