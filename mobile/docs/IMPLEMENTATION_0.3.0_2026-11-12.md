# HisabNikash 0.3.0 — smart reminders and professional finance workflows

Remaining-work update: [0.3.1 localization, report and notification completion](COMPLETION_0.3.1_2026-11-12.md).

Review date: 12 November 2026, Asia/Dhaka. Version: **0.3.0+3**.

The mobile application now includes the requested budget/balance alerts, daily
review reminder and the professional accounting workflows. This implementation
targets the Flutter Android/iOS application and its optional Laravel sync API.
The existing web finance tables remain a separate product/data model.

## Where to find the features

| Location | Delivered behavior |
| --- | --- |
| Home | Today’s entry count, day complete/no transactions, current month’s funding requirement, reserved savings, shortage/surplus and discretionary daily limit |
| Bell → Notifications | Private encrypted inbox, unread/read, active/resolved status, action destinations, budget 80/90/100% alerts, shortage, account minimum, overdue bills, installments, expected income and invoices |
| Bell → Cash flow | 7/30-day dated forecast, optional expected income, overdue obligations, weekly recorded income/expense, selected-month budget versus actual |
| Bell → Tools | Reconciliation, month review/close/reopen, monthly PDF, backup export health, deleted transaction recovery, recurring income expectations, installment schedules, funded savings and transaction templates |
| Bell → Business | Customer/supplier contacts and per-contact invoices, receivables/payables, invoice items/quantities/unit prices, due dates, partial payments, payment history and PDF invoices |
| Bell → Reminders | Daily enable/time/mode, bills, budget/balance alerts, weekly/monthly reviews, quiet hours, preferred timezone, lock-screen privacy and account minimums |
| Activity → transaction | Copy, save template, remember account/category defaults, partial refund, auditable reversal and history |
| Transaction editor | Fees, split allocations, balance impact preview, duplicate warning and encrypted draft recovery |
| Plan → Budgets | Existing copy/rollover plus discretionary-budget flag used by the daily spending limit |
| Plan → Bills | Category linkage, partial payments, one-time/monthly/weekly/yearly/custom-day schedules and repeat pause/resume |
| More | Existing encrypted export, safety-copy-first restore, sync and account statements; new finance-center entry |

## Financial rules

- Money remains integer paisa. Transfers and debt principal do not inflate
  income/ordinary expenses. Fees and installment interest are expenses.
- Split amounts must equal their transaction amount. Partial refunds reduce net
  category spending and can be reversed. Refunds cannot exceed the original
  unrefunded expense; reverse refunds before reversing their original expense.
- Reconciliation creates a reasoned adjustment, with history. It changes account
  cash without becoming salary or everyday spending. Opening balances with
  transaction history are changed through reconciliation.
- Remaining monthly funding groups budget remainder and linked bill/invoice
  obligations by category, taking the larger amount. Principal installments are
  separate; installment interest can be covered by a matching interest budget.
  A bill already in its category budget is counted once.
- Actual balances exclude future entries and expected salary/receivables.
  Forecast inclusion is an explicit switch. Recording expected income received
  creates one linked income transaction.
- Savings goals can allocate existing account money. New allocations cannot
  exceed the account’s available funding. Subsequent spending can make that
  allocation underfunded; this produces an alert without breaking backups/sync.
- Loan schedules support interest-free, flat-rate and reducing-balance models,
  up to 600 installments and annual rates up to 100%. The UI accepts annual
  percentage; storage uses basis points. Principal residual is settled exactly
  in the last installment. Interest-bearing receivable schedules are excluded.
  A scheduled loan is repaid through its installments rather than an unallocated
  principal payment.
- Month closing is per space and completed month. It prevents local inserts,
  edits, deletions and transfers affecting that month, including a closed
  receiving space. Reopen before corrections. Later synced historical changes
  are detected by the review fingerprint and need another review.

## Reminder behavior

- Daily reminders are opt-in, default target **20:00**. Choose incomplete-day
  mode or no-entry-only mode. One entry does not automatically complete a day.
- “No transactions” completes the day without creating a zero-value transaction.
  Completion is bound to a canonical SHA-256 fingerprint of that day’s records;
  edits invalidate it. Backdated/future entries do not complete today.
- The device keeps **21 days** of one-shot daily reminders and a renewal prompt.
  Opening/resuming or changing records renews the schedule. An app left unopened
  beyond this window needs renewal; no indefinitely conditional background
  execution is claimed. Repeating daily fallbacks were deliberately avoided:
  iOS calendar repeat matching does not preserve a future first-start date.
- Bills/installments/invoices use three-day-before, day-before and due-day
  reminders at 09:00. The nearest **35 payment reminders** share the platform
  queue with daily and summary reminders. More distant obligations stay in-app
  and are reconsidered at refresh.
- Android uses inexact alarms. Delivery is subject to permission, battery/OS
  settings and device state. The configured time is a target, not a verified
  minute-exact delivery guarantee.
- Daily actions open the app before review/completion/snooze and respect the
  app’s lock. A reminder for yesterday cannot complete today. Snooze is 30 minutes.
- Lock-screen amounts/names are hidden by default. Detailed messages are opt-in.
  Non-daily push notifications have a three-per-day cap and quiet hours default
  to 22:00–08:00. A threshold jump selects the highest threshold, with monthly
  deduplication. Recurring shortage alerts can reappear after resolution.
- Selected timezone is shared by the financial day and reminder calculations.
  Before an explicit timezone is saved, transaction dates follow device local
  time; the existing notification default is Asia/Dhaka. Set the preferred
  timezone in Reminders when traveling.
- Offline phones cannot know another device’s completion until sync. Inbox and
  delivery preferences are device-local; daily completion records can sync.

## Recovery, privacy and compatibility

- Drafts, inbox history, defaults and reminder preferences are encrypted with
  the existing vault key. They are included inside the password-encrypted
  recovery archive’s optional `localData` field; schema 1/2 financial backups
  remain importable. OS permission/authentication tokens are not copied.
- Restoring rebuilds notifications from the restored snapshot. The existing
  safety backup/review flow remains required for replacing a device vault.
- New record kinds use the existing generic encrypted records/outbox/audit
  tables. No new table migration is required. Existing balances/history are
  preserved. No user vault/database was reset while implementing or testing.
- Update the optional sync server’s controller and every participating mobile
  client before syncing the new record kinds. An older server rejects them;
  older clients cannot interpret the new entities. No production server was
  deployed by this change.
- A shield above the navigator covers financial tools and forms when the app
  locks/backgrounds, including routes pushed above the home screen.
- Shared Bengali labels, default categories, primary tool forms and common
  validation messages were expanded. Some legacy dynamic/help/error strings
  and PDF headings remain English; complete localization still needs a final
  language/content review. Existing large-text and keyboard-safe tests pass.

## Verification

- `flutter analyze --no-pub`: clean.
- `flutter test --no-pub`: **81 passed**, including 25 financial/reminder/domain
  tests and two finance-center/split UI tests added in this change.
- Laravel mobile API: **11 passed, 41 assertions**, using isolated in-memory
  SQLite and a test-only application key.
- Laravel Pint check on the changed controller/tests: passed.
- Android release packaging and artifact checks are recorded with the release
  files under `artifacts/releases/0.3.0/`.

Signed Android artifacts:

- [ARM64 APK](../artifacts/releases/0.3.0/hisabnikash-0.3.0-arm64.apk), 26,328,475 bytes.
- [ARMv7 APK](../artifacts/releases/0.3.0/hisabnikash-0.3.0-armv7.apk), 24,524,550 bytes.
- [x64 APK](../artifacts/releases/0.3.0/hisabnikash-0.3.0-x64.apk), 27,474,263 bytes.
- [SHA-256 and source manifest](../artifacts/releases/0.3.0/manifest.json).

All three packages passed APK signature verification, version-name checks and
non-debuggable checks. The ARM64 certificate matches the existing signed 0.2.0
release. Rebuild with `flutter build apk --release --split-per-abi`, then run
`tool/write_release_manifest.ps1` to verify/package fresh artifacts. APKs and
generated manifests remain local ignored artifacts, not committed binaries.

Automated checks cover split/fee journals, partial refunds and reversals, bill
partials, funding double-count prevention, savings funding, canonical daily
completion, notification planning/quota/quiet hours, month close/transfer guards,
reconciliation, invoice payments, interest schedules, expected income, encrypted
draft/backup round trips, trash recovery, custom recurrence and existing regressions.

Actual notification delivery/reboot/force-stop behavior and biometrics still
require physical Android/iPhone checks. This version has not been compiled for
iOS in this turn; prior 0.2.0 IPA files do not contain these features. Optional
web push/server scheduling, mobile/web ledger unification and store publication
remain separate work. APK signing is not evidence of those checks.
