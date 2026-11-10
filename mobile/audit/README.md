Implementation update: the original failures are fixed and promoted to `test/audit_regression_test.dart`. The old command below now runs the passing regression suite. Historical reproduction notes follow.

# Mobile audit reproductions — 11 November 2026

These files reproduce problems found during the requested audit. They do not
modify application code, the user's vault, or a deployed server. Databases are
isolated in memory and network calls use a fake transport.

The normal `flutter test` command still discovers the `test/` directory only.
The following audit command deliberately asserts the desired corrected behavior:

```powershell
flutter test audit/review_probes_test.dart --reporter expanded
```

**Original audit result: 8 failed / 8 executed.** All eight invariants are now
fixed and run in the regular suite, along with related safety cases. The wrapper
command above invokes that passing suite. The table preserves the original
observations for context; see the implementation report for current status.

| ID | Observed result |
| --- | --- |
| A01 | A stale form save succeeds instead of reporting a concurrent edit. |
| A02 | A deleted February bill returns when January is paid. |
| A03 | Changing the original bill to one-time still generates three more monthly occurrences. |
| A04 | Renaming a category leaves spending under the old label; new-label total is zero. |
| A05 | Same-category/month budgets created on two devices cause a pull validation exception rather than a resolvable conflict. |
| A06 | Two overlapping calls to the same sync service issue two pushes. |
| A07 | An in-flight sync starts a pull after logout; the simulated server correctly rejects it with 401. |
| A08 | Backup validation accepts a repayment referencing a nonexistent loan. |

Performance diagnostic:

```powershell
flutter test audit/performance_probe_test.dart --reporter expanded
```

Measured once on this Windows machine, debug/JIT, in-memory SQLite, no receipts:
2,000 transactions / 20 accounts; encrypted snapshot **162 ms**; balance
aggregation **348 ms**. This is a diagnostic, not an Android/iOS release-mode
benchmark or a guaranteed latency figure. The aggregation itself is synchronous.

Baseline verification: `flutter analyze` clean; regular Flutter suite 29 passed;
Laravel mobile API suite 8 passed / 29 assertions. See the dated audit plan for
scope, limitations, source references, implementation order, and acceptance gates.
