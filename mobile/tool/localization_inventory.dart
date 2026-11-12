import 'dart:convert';
import 'dart:io';
import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';

const localizationTechnicalStrings = {
  'HISABNIKASH',
  'HisabNikash',
  'HisabNikash mobile',
  'Authorization',
  'NotoSans',
  'NotoSansBengali',
  'ReportNotoSans',
  'ReportNotoSansBengali',
  'MMM',
  'MMM yyyy',
  'MMMM yyyy'
};
bool isTechnicalString(String key) =>
    localizationTechnicalStrings.contains(key) ||
    RegExp(r'^[A-Za-z]+/[A-Za-z_]+$').hasMatch(key) ||
    key.startsWith('Date,Type,');

class Inventory extends RecursiveAstVisitor<void> {
  Inventory(this.path, this.entries);
  final String path;
  final Map<String, Set<String>> entries;
  @override
  void visitMethodInvocation(MethodInvocation node) {
    if ({'tr', 't'}.contains(node.methodName.name)) return;
    super.visitMethodInvocation(node);
  }

  @override
  void visitSimpleStringLiteral(SimpleStringLiteral node) {
    final value = node.value;
    if (RegExp(r'[A-Za-z]').hasMatch(value) &&
        (value.contains(' ') || RegExp(r'^[A-Z]').hasMatch(value)) &&
        !RegExp(r'^(SELECT|INSERT|CREATE|DELETE|UPDATE|ALTER|PRAGMA|DROP)\b')
            .hasMatch(value) &&
        !value.contains('package:') &&
        !value.contains('https:') &&
        !value.contains('assets/') &&
        value.length > 2) {
      entries.putIfAbsent(value, () => {}).add(path);
    }
    super.visitSimpleStringLiteral(node);
  }
}

class Catalog extends RecursiveAstVisitor<void> {
  final translations = <String, String>{};
  @override
  void visitMapLiteralEntry(MapLiteralEntry node) {
    if (node.key is SimpleStringLiteral && node.value is SimpleStringLiteral) {
      translations[(node.key as SimpleStringLiteral).value] =
          (node.value as SimpleStringLiteral).value;
    }
    super.visitMapLiteralEntry(node);
  }
}

void main() {
  final entries = <String, Set<String>>{};
  for (final file in Directory('lib')
      .listSync(recursive: true)
      .whereType<File>()
      .where((f) =>
          f.path.endsWith('.dart') && !f.path.contains('localization'))) {
    parseString(content: file.readAsStringSync(), path: file.path)
        .unit
        .accept(Inventory(file.path, entries));
  }
  final result = {
    for (final key in entries.keys.toList()..sort())
      key: entries[key]!.toList()..sort()
  };
  Directory('artifacts').createSync(recursive: true);
  File('artifacts/localization-inventory.json')
      .writeAsStringSync(const JsonEncoder.withIndent('  ').convert(result));
  final catalog = Catalog();
  for (final file in Directory('lib')
      .listSync(recursive: true)
      .whereType<File>()
      .where(
          (f) => f.path.contains('localization') && f.path.endsWith('.dart'))) {
    parseString(content: file.readAsStringSync(), path: file.path)
        .unit
        .accept(catalog);
  }
  final missing = {
    for (final key in result.keys)
      if (!catalog.translations.containsKey(key) && !isTechnicalString(key))
        key: result[key]
  };
  File('artifacts/localization-missing.json')
      .writeAsStringSync(const JsonEncoder.withIndent('  ').convert(missing));
  stdout.writeln('${result.length} source strings inventoried.');
  stdout.writeln('${missing.length} strings without a Bengali translation.');
}
