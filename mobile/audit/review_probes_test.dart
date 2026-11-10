// Backward-compatible entry point; audit invariants now run in regular CI.
import '../test/audit_regression_test.dart' as regression;
void main() => regression.main();
