Implementation update: see [completed changes, validation and remaining release work](IMPLEMENTATION_2026-11-11.md). Findings below describe the original audited state.

# HisabNikash mobile — audit and implementation plan

Audit date: **11 November 2026, Asia/Dhaka**.

The app has a useful offline foundation, but its current sync, editing, recurrence
and recovery behavior is not ready for a public financial-data release. A better
visual design alone will not close those gaps. The next milestone should be a
trustworthy private beta with explicit, measurable release gates.

This audit adds documentation and isolated reproduction tests. It does not fix
application behavior, migrate the user's database, or deploy a server.

## 1. What was actually checked

| Check | Result / limitation |
| --- | --- |
| Flutter static analysis | Clean baseline |
| Existing Flutter tests | 29 passed |
| Existing Laravel mobile API tests | 8 passed, 29 assertions; in-memory test database |
| New audit reproductions | 8 independently reproduced failures, A01–A08 |
| Performance diagnostic | 2,000 transactions and 20 accounts: snapshot 162 ms, aggregation 348 ms |
| Available ARM64 debug APK | `aapt`: min SDK 23, compile SDK 35, **target SDK 34** |
| ARM64 ELF load-segment alignment in that APK | Flutter/validation libraries 65,536 bytes; SQLite 16,384 bytes — no sub-16-KB alignment found in those inspected libraries |
| ZIP alignment, 16-KB runtime, production AAB | Not verified; ELF alignment alone does not prove complete compatibility |
| Physical Android/iPhone, biometrics, notification delivery | Not verified in this audit |
| Actual iOS build and hosted CI execution | Not verified on this Windows host |
| Latest source versus downloadable APK | The available APK predates the latest UI/accounting source changes; treat it as an older artifact |

The performance numbers are a single Windows debug/JIT diagnostic using memory
storage and no receipts. They are not measured phone or release-mode results.
Screens/layout tests are not a substitute for physical-device lifecycle tests.

Reproductions and run instructions: [audit/README.md](../audit/README.md).

## 2. Confirmed defects and their fixes

Priority definitions: **P0** = data-integrity/lifecycle work required before
external sync beta; **P1** = required before normal beta use; **P2** = usability,
maintainability or scaling work required before public release. These priorities
are product triage, not vulnerability/CVSS ratings.

| ID | Priority | Reproduction and observed problem | Required behavior |
| --- | --- | --- | --- |
| A01 | P0 | Open an expense at ৳10; a newer synced edit changes it to ৳20; saving the old form with only a note edit writes ৳10 again. `save()` uses the latest database revision without checking the form's original version. | Compare the editor's captured local content version atomically. Preserve the draft and show what changed; never silently overwrite the newer amount. |
| A02 | P1 | Generate January–March bills, delete February, then pay January. `payBill()` sees no active February record and rewrites its tombstone as a live record with revision zero. | A deliberate skipped/deleted occurrence stays skipped. Recurrence and payment must inspect tombstones and retain server revisions. |
| A03 | P1 | Change the original recurring bill to `once`; later generation still follows an already-created monthly copy and creates more months. | A first-class series controls recurrence, pause/end and effective dates. Offer “this occurrence” and “this and future” edits explicitly. |
| A04 | P1 | Record ৳10 under “Pet supplies”; rename it “Pet food”; spending for “Pet food” is zero. Transactions/budgets store mutable category names rather than category identity. | Stable category IDs, historical labels for audit, rename-safe grouping and a careful migration of old data. |
| A05 | P0 | Two devices independently create the same space/category/month budget with different UUIDs. Server accepts both; client pull throws duplicate-budget validation. The UI receives no resolvable semantic conflict. | Enforce/resolve logical identity across devices. Preserve both edits and give a usable merge/choice workflow; syncing must remain recoverable. |
| A06 | P0 | `Future.wait([sync.sync(), sync.sync()])` sends two pushes. `_running` is set after asynchronous settings/token reads. | Acquire single-flight ownership before the first await; concurrent callers await the same future/outcome. |
| A07 | P0 | Pause an in-flight push, disconnect, then release it. The old sync still starts a pull after logout and gets 401. There is no cancellation/session generation barrier. | Cancel/invalidate the old session, stop follow-up requests and prevent stale responses applying after disconnect, restore or vault switch. Already-accepted server operations must remain safely replayable. |
| A08 | P1 | Backup validation accepts a repayment whose `loan` ID does not exist. Static validation checks the account but not all financial links. | Validate bill/loan existence, space, direction, payment type and applicable amounts consistently on local writes, import and sync. |

Primary code areas:

- [Repository](../lib/core/repository.dart): `save`, `_write`, category validation,
  `payBill`, `ensureBillOccurrences`, `validateBackup`, `restore`.
- [Sync client](../lib/core/sync.dart): lifecycle guard, push/ack, merged validation,
  disconnect and conflict resolution.
- [Editor](../lib/ui/editors.dart): captured record/version, dirty fields, draft preservation.
- [Models](../lib/core/models.dart): stable identities and consistent projections.
- [Sync API](../../app/Http/Controllers/Mobile/SyncController.php): logical identity,
  canonical payload types, relationship validation and conflict responses.

The API currently enforces authentication, user scoping, payload shape and
per-record revisions. This audit does not demonstrate a cross-user data leak.
Its validation/semantic-conflict gaps still need contract tests against the real
server, in addition to the existing fake transport tests.

## 3. Additional source-confirmed gaps and unverified risks

These items are separate from the eight executed reproductions.

| Area | Evidence and consequence | Priority / action |
| --- | --- | --- |
| Backup size mismatch | `BackupCodec.encode()` has no output-size limit; decode and import reject files above 50 MiB. An allowed large vault can produce a backup it cannot restore. Roughly 57 maximum-size 512-KiB receipts can exceed the limit after nested base64 overhead. This threshold is an estimate, not a large-file device test. | P0 recovery gate: symmetric limits or a streamed/chunked authenticated backup format; exercise a large round trip. |
| Backup completeness | Exports contain active records only; local audit history, tombstones and settings are omitted. | P1: define snapshot versus full recovery archive; include history/deletion intent where promised, version the format. |
| Restore/cloud semantics | Restore clears local records and cursor but does not implement an authoritative cloud restore. A reconnect can download newer/missing cloud records again. | P0 design decision: separate restore-this-device, import-as-new-space and replace-cloud-vault flows; isolate restore from in-flight sync. |
| Offline disconnect | Server revocation is awaited before removing local credentials. No network or an expired token can prevent disconnect and block restore. | P1: local pause/disconnect immediately; a separate revocation retry state with an honest status. |
| Wrong payment correction | Linked bill/loan payments cannot be edited or removed; no reversal flow exists. A mistaken payment/account can remain uncorrectable from the app. | P1: auditable reversal plus replacement; update balances and bill/loan projections atomically. |
| Large-data reads | Every snapshot decrypts all active records including receipts. Per-account balances rescan transactions; date formatting is repeated inside the scan. | P1/P2: one-pass projections, cached aggregates, lazy lists/media and release-mode profiling. |
| Media sync | Receipts are inline base64 JSON. Pull pages are bounded by record count, not response bytes, and all pages accumulate before apply. | P1 scaling gate: separate authenticated media blobs, bounded downloads, resumable upload and checksums. Do not claim an observed OOM; it was not load-tested. |
| Sync status | Background errors are swallowed, and a one-batch sync can set `lastSync` while more operations/conflicts remain. | P1: typed outcomes and visible local-save/queued/syncing/partial/conflict/reauth states. |
| Conflict UX | Conflict screen displays raw JSON and record IDs. | P1: human-readable amounts, accounts, dates, differences and consequences; preserve both histories. |
| Notification refresh | Changes may trigger `cancelAll()` and rescheduling, including changes caused by sync/settings. No physical delivery/reboot test has run. | P1: differential scheduling, serialized refresh, permission/reboot/timezone/device tests. |
| Reminder scope | Hardcoded Asia/Dhaka, one-day-before 9 AM, up to 50 pending reminders; a reminder time that has passed is skipped. | P2 product limitation: show coverage, allow suitable timing choices, document supported timezone behavior. |
| Receipt capture | Normal phone photos can exceed 512 KiB; there is no automatic compression/crop flow. Header checks do not bound decoded image dimensions. | P1 UX/P2 resilience: capture/resize/compress, orientation handling, pixel limits and metadata stripping. |
| Editing UX | No durable transaction drafts or unsaved-change guard. | P2: encrypted draft recovery, dirty-form confirmation and keyboard-aware save action. |
| Account detail | No account statement with opening amount, dated entries and running balance. | P1 financial trust: account detail/reconciliation screen, dated opening entry and explicit adjustments. |
| Privacy display | The eye control masks some screens but selector/payment amounts and other details are still directly shown. | P2: define its scope and apply it consistently, with an explicit reveal action. |
| Exports | CSV omits space, transfer destination and scheduled status; PDF uses internal transaction type strings. | P2: export scope preview, complete columns, friendly labels and verified Bengali shaping. |
| Localization/accessibility | Bengali is partial; screen-reader, large-text and real keyboard/gesture coverage is incomplete. | P1 public-release gate: full strings, semantics, focus order, contrast and large-text tests. |
| Deployment evidence | Debug builds and an unrun CI configuration do not establish release-device readiness. Existing APK is older than current source. | P1: artifact-to-source version traceability, release builds, real-device beta and signed distribution. |

Security should preserve the good existing choices: integer-paisa money, atomic
local write/outbox commits, authenticated payload encryption, platform-backed
key storage, HTTPS and user-scoped API records. App lock, payload encryption,
whole-file encryption and E2EE are different controls; the current sync is not
E2EE. Decide that product promise before expanding cloud use.

## 4. Product scope for a strong first public version

The core remains usable without an account or network. Optional sync must never
block reading, entering transactions, reminders, local reports or backup export.

### Money and accounts

1. Personal/business spaces with remembered context and clear combined reporting.
2. Searchable accounts, archive/reorder, account statement and reconciliation.
3. Fast income/expense/transfer entry, fees, refunds and split categories.
4. Auditable corrections/reversals; undo/trash with a defined retention policy.
5. Distinguish balance today, selected-month cash movement, actual spending,
   scheduled entries, debt principal and net worth.
6. Keep savings earmarks separate from actual account transfers and expenses.

### Planning

1. Stable category budgets, templates and a documented rollover calculation.
2. First-class bill schedules with one-off exceptions, partial payment if in
   scope, pause/end and effective-date edits.
3. Debt timeline, existing versus newly disbursed loans, repayment allocation
   and fees/interest only after the selected calculation models are tested.
4. Goal contributions/withdrawals and an explicit funded/unfunded allocation view.

### Recovery and control

1. Verified encrypted backups, preview, full restore rehearsal and password UX.
2. Optional managed sync sign-in; self-host server configuration in an advanced
   setup rather than the main consumer flow.
3. Device/session management, reconnect/expiry flow, local disconnect, clear
   account/vault deletion scopes and privacy/retention information.
4. Useful sync status and recoverable, human-readable conflict resolution.

Bank imports, OCR, multi-currency, family roles, inventory/accrual accounting and
AI features should be separate later milestones. Cash surplus should not be
presented as full business accounting profit.

## 5. UX delivery plan

| Flow | Target design | Acceptance test |
| --- | --- | --- |
| Quick entry | Amount first, recent account/category, accessible search/select, sticky keyboard-aware save, optional advanced fields | A returning user can add a routine expense in a timed usability test without hunting for save/context. |
| Accounts | Space grouping, current balance, dated statement, running balance, adjustment/reconcile | User can explain a balance from its opening entry and movements. |
| Spaces | Search/switch, balances, quick account creation, archive and clear active context | No accidental cross-space entries in usability tasks; context persists. |
| Plans | Separate overview and detail flows for budgets, bills, loans and goals | Editing a schedule makes the affected dates and future amounts explicit before save. |
| Transactions | Search plus date/account/category/space filters; friendly transfer/debt/scheduled labels | Incoming transfers are discoverable in the receiving space; no double-counted income. |
| Correction | Select payment, review reversal and replacement, confirm consequences | Wrong account/date/amount can be corrected while preserving audit history. |
| Sync/recovery | Quiet success, actionable exceptions, explicit backup/restore scope | Nontechnical user can resolve one monetary conflict and recover a test vault. |
| Mobile polish | Thumb reach, safe areas, keyboard/insets, platform back gestures, haptics, scrolling, dark mode, complete Bengali | Physical Android/iPhone tasks plus large-text and screen-reader checks pass. |

Review high-fidelity designs and clickable flows for account detail, corrections,
series editing, conflict resolution and restore before implementing those screens.
Keep loading, empty, error, disabled and interrupted states in the component specs.

## 6. Technical implementation sequence

### Sprint 1 — data identity and financial integrity

- Add a local content version independent of the server revision. Editors submit
  their captured version; compare-and-save happens in the database transaction.
- Preserve stale drafts and report changed fields. Consider safe disjoint-field
  merges only after the explicit conflict path works.
- Introduce category IDs and migration aliases. Preserve legacy text/audit values;
  ambiguous old/default/custom labels need review rather than guessed merging.
- Create a schedule/occurrence model with stable IDs, skip tombstones, end dates
  and explicit edit scope. Prevent payment from resurrecting deleted occurrences.
- Centralize a typed financial validator for references, space, direction,
  category, dates, integer types, amount bounds and linked payment consistency.
- Design journal reversals and opening/adjustment entries. Add reconciliation
  properties and tests around decimal limits and cross-platform sums.
- Promote A01–A04/A08 to regular tests and make them pass.

### Sprint 2 — sync and lifecycle correctness

- Implement single-flight synchronization before the first await; return its real
  completion future/outcome to all callers.
- Add cancellation plus session/vault generation checks before applying results.
  Disconnect, restore and recovery must invalidate previous work.
- Define logical keys/conflict responses for budget/category duplicates. Add
  server-side invariants and client recovery rather than rejecting an entire
  merged snapshot indefinitely.
- Maintain idempotent operation acknowledgements and dependency-safe batches.
  Test lost responses, stale edits, offline writes and conflicting deletions.
- Define reconnect after backup restore and a versioned full-resync protocol
  before pruning change logs/tombstones/deduplication receipts.
- Add structured pending/partial/conflict/expired-auth status and local pause.
- Promote A05–A07 to regular tests; exercise the real HTTPS API in staging.

### Sprint 3 — recovery and performance

- Specify a versioned, authenticated, size-consistent backup/archive format;
  include exactly the history/settings promised to users. Make export self-check
  and clean-install restore part of the acceptance flow.
- Restore into a verified new vault and switch its pointer only after success.
  Explain local import versus authoritative cloud restore explicitly.
- Store receipts separately and fetch/render them lazily. Bound both financial
  and media network pages by bytes, with interruption/resume coverage.
- Cache/index one-pass account/month/category projections, compute date cutoffs
  once, paginate lists, move expensive crypto/image work off the UI isolate.
- Prototype the typed/encrypted storage migration and choose indexing/encryption
  tradeoffs deliberately. Benchmark 1k/10k/50k transactions on target phones,
  including attachments, before promising a performance budget.

### Sprint 4 — complete the daily-use UX

- Deliver account statement, fee/refund/split flows, payment correction,
  schedule management, draft recovery and consistent selector/empty/error states.
- Complete Bengali localization, export labels, number/date rules and privacy
  masking policy. Verify Bengali PDF rendering visually.
- Improve receipts and contextual planning details; keep financial concepts
  separate in cards and charts.
- Run task-based usability sessions and accessibility checks, not only screenshot
  reviews. Keep changes traceable to observed task failures.

### Sprint 5 — native beta and release

- Upgrade the supported Flutter/Dart/Gradle/Kotlin/plugin/Xcode matrix and build
  current-store-compatible artifacts; preserve database and backup compatibility.
- Test Android process death/reboot/permissions/biometrics/storage loss and iOS
  lifecycle/Keychain/Face ID/notifications/share sheet/TestFlight on real devices.
- Validate API authorization, password/session recovery, token expiry, account
  deletion, privacy and deployment backup/restore.
- Produce signed release artifacts with protected credentials, source version,
  build number and checksums; run internal/closed testing before public rollout.

Rough planning allowance for one experienced developer: **6–9 working weeks**
for this stability-and-release scope, subject to the storage migration, design
reviews, device access and server setup. This is an estimate, not a delivery
commitment. Interest-bearing lending or full business accounting expands scope.

## 7. Platform requirements checked against current primary sources

- The local APK targets API 34. Google Play new apps/updates require API 36 from
  August 31, 2026; the listed extension ends November 1, 2026. This is a confirmed
  submission blocker on the audit date, independently of the compile SDK value.
  [Android target API requirements](https://developer.android.com/google/play/requirements/target-sdk).
- Native 16-KB compatibility needs the complete packaging/runtime checks. The
  inspected debug APK's ELF segments meet that alignment, so this audit does not
  claim that all old Flutter builds necessarily fail. Test the actual release AAB
  and device configuration after upgrading.
  [Android page-size guidance](https://developer.android.com/guide/practices/page-sizes).
- Apple requires iOS/iPadOS 26 SDK or later for submissions from April 2026.
  Deployment minimum iOS 13 and build SDK version are different settings; an
  actual build with a supported Xcode/SDK is still needed.
  [Apple SDK announcement](https://developer.apple.com/news/?id=6lxhtioi).
- If account creation is supported, design in-app initiation of account deletion,
  including appropriate web/cloud and local-vault scopes.
  [Apple account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/).
- Use Flutter accessibility guidelines in tests, then validate physical-device
  screen readers, text scaling, touch targets and focus behavior.
  [Flutter accessibility testing](https://docs.flutter.dev/ui/accessibility/accessibility-testing).

## 8. Release gates

Public release requires all of the following evidence:

1. No open P0/P1 integrity/lifecycle defects; A01–A08 green in regular CI.
2. Reconciled balances through income, expenses, transfers, fees, corrections,
   debt, schedules, import, restore and multi-device edits.
3. Safe save across process kill; usable local data with expired auth/no internet;
   cancel-safe disconnect, restore and vault switching.
4. A large encrypted backup exported by the app restores on a clean installation,
   including the agreed history/media scope; corrupt/wrong-password input is safe.
5. Target-device release-mode performance and memory budgets pass on documented
   datasets; the current desktop diagnostic is replaced by phone measurements.
6. Complete localization/accessibility, notification and authentication tests on
   supported Android and iOS devices.
7. Staging sync integration and cloud restore drills pass with independent users
   and devices; no raw credentials/financial payloads in logs.
8. Current-store-compliant signed artifacts match their tested source and build
   number; TestFlight/closed-beta results and a recovery/rollback path exist.

The next concrete implementation task is Sprint 1 plus the sync single-flight
and lifecycle guard from Sprint 2. Those protect the user's records before the
remaining feature and visual expansion.
