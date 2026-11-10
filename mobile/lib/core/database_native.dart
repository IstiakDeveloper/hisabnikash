import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

QueryExecutor fileExecutor(Object file) =>
    NativeDatabase.createInBackground(file as File);
QueryExecutor memoryExecutor() => NativeDatabase.memory();
Future<QueryExecutor> openExecutor(String name) async {
  final directory = await getApplicationSupportDirectory();
  return fileExecutor(File(p.join(directory.path, name)));
}
