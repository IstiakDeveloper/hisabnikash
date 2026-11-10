# Audit implementation — 11 November 2026

The earlier audit is a historical baseline. Its eight reproduced failures are now
regular regression tests in `test/audit_regression_test.dart`.

## Implemented

- SQLite v1 → v2 migration preserves encrypted records, settings, audit and queue.
  Every content change increments a local version. Editors pass the version they
  opened; stale saves, deletes and payment confirmations are rejected.
- Categories have stable identities and rename aliases. Existing transaction and
  budget references migrate without discarding history. Archiving retains identity.
- New budgets use deterministic space/category/month IDs across devices. Older
  duplicate IDs become a reviewable conflict; choosing an amount preserves history
  and synchronizes deletion of the extra record.
- Recurring bills have separate schedule controllers and stable cycle identity.
  A skipped occurrence stays skipped, including after paying the previous bill.
  Editors distinguish this occurrence from this and future unpaid occurrences.
  Stopping a series keeps paid history. Month-end anchors survive amount-only edits.
- Concurrent sync requests share one future. Disconnect/restore invalidates the
  session and cancels requests; stale responses cannot apply or start another pull.
  Local credentials clear even when token revocation fails. Failed revocation is
  retained in secure storage and retried on the next connect.
- Sync reports queued, partial, conflict, paused and reauthentication states.
  Conflict review shows names, dates, accounts and amounts instead of raw JSON.
- Account cards and Settings open statements with opening balance, posted entries,
  each movement and running balance. Same-day entries have a stable ID tie-breaker.
- Corrections add an opposite journal entry and preserve the original. Reversing
  a bill payment reopens the bill; reversing a loan repayment restores outstanding
  principal. Transfer corrections restore both account balances. Repeat reversal,
  mutation or removal of correction history is protected.
- Backup data schema v2 includes active records, tombstones, audit history and
  portable appearance/language/space preferences. Schema v1 remains importable.
  The encrypted envelope remains version 1. Encode/decode share a 50 MiB limit.
  Restore is transactional, invalidates old editors, and requires explicit review
  before merging restored data with cloud. Auth tokens and biometric settings are
  deliberately device-local. Restore does not replace the server's entire vault.
- Unsaved form exits require discard confirmation; failed stale saves keep input.
- JPG/PNG receipts up to 12 MiB/24 megapixels are oriented, resized to 1600 pixels,
  stripped of EXIF, and compressed under the existing 512 KiB storage cap. Native
  processing uses `compute`; browser compute runs on the browser event loop.
- Reminder refresh is serialized and compares stable IDs/payloads. Unchanged
  notifications stay scheduled; removed or paid bill reminders are cancelled.
- Snapshots cache decrypted payloads and index records. Balances aggregate journal
  movements once per cutoff date rather than once per account.

## Verification

Local results: `flutter analyze` clean; **49 Flutter tests passed**;
**9 API tests / 34 assertions passed**. Android debug APK builds successfully.
The widget suite covers narrow screens, searchable selection, unsaved-form exits,
account statements and fully reversed expense charts.

```powershell
cd mobile
flutter analyze
flutter test
flutter test audit/performance_probe_test.dart
flutter build apk --debug
```

From repository root:

```powershell
php vendor/bin/pest tests/Feature/MobileSyncTest.php --configuration mobile/backend-tests.xml
```

The performance probe uses Windows debug, in-memory SQLite, 20 accounts and 2,000
transactions without receipts. After this change, cold snapshot was 173 ms and
balance aggregation 10 ms, versus the earlier 162 ms / 348 ms. This measures the
aggregation improvement; it is not release-device performance evidence.

## Still required for public release

- Upgrade and verify the native release toolchain and store SDK targets; current
  installed Flutter 3.24.4 remains the local development toolchain.
- Build and run on macOS/Xcode and actual iOS/Android devices; verify notification
  permission, delivery, reboot, timezone, secure storage and biometric behavior.
- Signed release artifacts, store credentials, beta distribution and release
  provenance. Debug APK success does not establish store readiness.
- Separate resumable media transport and bounded large-cloud downloads. Receipt
  payloads still sync inline; backups are bounded in-memory archives, not streaming.
- Durable form drafts, complete Bengali localization, keyboard/screen-reader and
  large-text review, and broader visual design review on actual phones.
- Distinct import-as-new-space and authoritative replace-cloud restore workflows;
  the delivered flow restores this device and explicitly reviews a later merge.

No live user database was reset and no store deployment was performed.
