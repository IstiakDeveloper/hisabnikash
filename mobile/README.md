# HisabNikash mobile

Independent Flutter application for Android and iOS. The existing Laravel web
application is an optional sync host, not a dependency for everyday use.

## Latest implementation

Version **0.2.0** implements the [icon, startup and UI refresh](docs/UI_REFRESH_2026-11-12.md):
native launcher icons and splash assets, branded loading/animation, genuine font
weights, a revised dashboard and keyboard-safe save actions. See the report for
preview images, verification and physical-device checks still required.

The eight defects reproduced by the [11 November audit](docs/MOBILE_AUDIT_AND_PLAN_2026-11-11.md)
now have passing regression coverage in the normal test suite. The implementation
adds account statements, payment corrections, bill edit scopes, readable conflicts,
backup history/tombstones, receipt compression and incremental reminders.
See [implementation details and remaining release work](docs/IMPLEMENTATION_2026-11-11.md).

## Run

For iOS `.ipa` generation from Windows, see [the GitHub/macOS build guide](docs/IOS_IPA_BUILD.md).
The manual workflow supports an unsigned archive or a signed Ad Hoc IPA using
repository signing secrets. The [unsigned ARM64 IPA build passed on macOS](https://github.com/IstiakDeveloper/hisabnikash/actions/runs/42885663778)
using Xcode 16.4; the downloaded IPA and checksums are under `artifacts/ios/run-42885663778/`.

The project currently builds against the machine's Flutter **3.24.4 / Dart 3.5.4**.
Dependencies are locked in `pubspec.lock`. Android uses Java 17, compile SDK 35,
and minimum SDK 23. iOS targets 13 or newer and requires macOS/Xcode/CocoaPods.

```powershell
cd C:\2025\hisabnikash\mobile
flutter pub get
flutter run -d <android-device-id>
```

```sh
# On a Mac
cd mobile
flutter pub get
flutter run -d <ios-device-id>
```

There is no production/demo seed data. First launch creates a private local
profile and an account. UI test fixtures are confined to `test/ui_test.dart`.

## Chrome preview

```powershell
cd C:\2025\hisabnikash\mobile
flutter run -d web-server --web-hostname 127.0.0.1 --web-port 53741 --web-renderer html
```

Open `http://127.0.0.1:53741/` in Chrome. The server keeps running independently
of the browser window. Chrome uses a separate persistent browser vault
(SQLite WASM with OPFS/IndexedDB) and browser secure storage. It does not access
the Android/iOS vault. Core finance flows, receipt selection, backups, CSV and
PDF exports work through browser APIs. Device authentication and scheduled native
notifications are disabled in the preview. Data follows the Chrome profile;
clearing site data removes that browser vault. Flutter's launched debug profile
is temporary; use the URL in your usual Chrome profile for longer-lived test data.

### UI and accounting review

- Spaces have a dedicated management screen, personal/business types, per-space
  balances, account creation, and a remembered active selection.
- Space/account/category/type/repeat/direction selectors support search. Creation
  actions stay available when the search returns no matches.
- Desktop uses a navigation rail; narrow screens retain mobile navigation.
- Account balance means the balance **today**. Future-dated records stay visible
  as scheduled activity but do not change current balances or actual spending.
- A cross-space transfer appears in both spaces. It contributes to that space's
  cash movement, never income or expense. Combined cash flow excludes transfers.
- Cash-in/out includes loan collections/repayments. Insights and PDF reports show
  those separately from income/expenses so the totals can be reconciled.
- Personal-space edits preserve the type. Loans with repayments cannot change
  direction/space or reduce principal below repayments.
- Signed exports preserve amounts below one taka, including `-0.50`.

Regression coverage includes a hand-calculated mixed ledger, future dates,
cross-space visibility, selector search/create, space/account scoping, and
320px/430px/1280px layouts. Current full Flutter suite: **54 tests passed**.
Actual-widget previews: `artifacts/search-select.png` and
`artifacts/dashboard-desktop.png`.

`web/sqlite3.wasm` is from the sqlite3.dart 2.9.4 release. Regenerate the matching
Drift worker after upgrading database dependencies:

```powershell
dart compile js -O2 tool/drift_worker.dart -o web/drift_worker.js
```

## Implemented

- Offline onboarding with no account requirement.
- Cash accounts and personal/business spaces, opening balances, transfers.
- Income and expenses, date/category/note, edit, delete, local change history.
- JPG/PNG photos up to 12 MiB/24 megapixels, compressed under 512 KiB and encrypted with their transaction.
- Monthly dashboard, activity search/type filter, account balances.
- Custom income/expense categories, monthly budgets, copy-previous-month templates,
  optional unspent rollover, savings earmarks, one-time/monthly bills.
- Atomic bill payments, month-end recurrence anchors, duplicate-payment guards,
  offline occurrence generation through the next two months.
- Existing interest-free borrowed/lent principal and repayment tracking.
- Spending breakdown, six-month income/expense summaries, monthly PDF, CSV.
- Bundled Noto fonts; English UI with Bengali navigation/core labels and digit input.
- Light/dark themes, balance visibility, optional device authentication.
- Private local bill reminders at 9 AM Asia/Dhaka one day before, up to 50 pending bills.
- Password-encrypted backup/restore with preview and safety-backup flow.
- Startup recovery into a new vault when the previous key/database is unavailable.
- Custom generated Android/iOS launcher icons (`dart run tool/generate_icons.dart`).
- Optional HTTPS sync: persisted outbox, operation deduplication, optimistic
  revisions, pagination, tombstones, conflict review, token revocation, and
  parent-deletion/child-write conflict preservation.

## Data architecture

Flutter widgets -> Riverpod controllers -> repository -> Drift/SQLite.
Screens read the local vault. Every local record write and outbox mutation commit
in the same SQLite transaction. Account balances derive from balanced journal
lines; transfers are one record with two account legs. Money is integer paisa.
Debt principal repayments change account balances without becoming everyday
spending. Bill payment state and loan repayment totals derive from transactions.

Record, audit, and conflict payloads use AES-256-GCM. The random device key lives
in Keychain/Android Keystore-backed secure storage. Record IDs, kinds, revisions,
and sync metadata remain visible in the SQLite file; this is payload encryption,
not whole-file SQLCipher. Android OS backup is disabled to avoid restoring an
encrypted database without its device key.

Backups use independent password-derived keys (PBKDF2-HMAC-SHA256, 210,000
iterations, random salt) and authenticated encryption. The password is not saved.
Encrypted envelope version 1 now carries data schema 2: records including receipts,
audit history, deletion tombstones and portable preferences. Old schema 1 backups
remain importable. Both export and import enforce the same 50 MiB archive limit.

## Optional sync server

New `/api/mobile/v1` routes and three `mobile_sync_*` tables are isolated from web
finance tables. Existing web users can authenticate; the mobile app does not
import their existing web transactions. Account signup uses the web application's
existing registration flow. Mobile login for accounts with enabled 2FA is refused
until the corresponding mobile second-factor flow is implemented.

Deploy the Laravel application behind HTTPS, back up its database and APP_KEY,
then run the normal deployment migration step (`php artisan migrate --force`).
Do not run migrations against an existing production database without reviewing
all pending migrations. This implementation has only migrated isolated in-memory
test databases; it has not changed the user's application database.

In the app choose More -> Enable optional cloud sync and enter the HTTPS origin,
email, and password. Tokens have `mobile:sync` ability and expire after 30 days.
Reconnecting renews authentication. Logging out revokes this device token and
keeps local data. A vault stays bound to its first cloud identity to prevent
accidental cross-account upload. Sync is not end-to-end encrypted: server payloads
are encrypted with Laravel's application key and decrypted for authorized sync.

Foreground writes debounce sync; resume and a 45-second foreground poll retry it.
There is no guaranteed background sync. Cloud hosting is not deployed/configured.

## Verify

### Signed Android release APK

The optimized, signed universal APK is
`build/app/outputs/flutter-apk/app-release.apk`.
Build it again with `flutter build apk --release`. Smaller per-architecture
packages can be built with `flutter build apk --release --split-per-abi`.

Local release signing uses `android/release-signing/hisabnikash-release.jks`
and `android/key.properties`. Both are ignored by Git. Keep a secure backup of
both files: future direct-distribution updates need the same signing key.
Do not share the keystore or `key.properties` with APK recipients.

The release APK passed Android signature verification and its manifest is not
debuggable. This is a signed installable package, not evidence of a physical-device
test or Play Store approval. A debug installation uses a different signing key;
back up its financial data before replacing it with the release installation.

```sh
cd mobile
flutter analyze
flutter test
flutter build apk --debug
```

```sh
# From repository root; forces an in-memory SQLite DB and a test-only APP_KEY.
php vendor/bin/pest tests/Feature/MobileSyncTest.php --configuration mobile/backend-tests.xml
```

The UI tests render the actual app into `artifacts/dashboard.png` using test-only
fixture data. `.runtime` contains disposable local emulator data and is ignored.
GitHub Actions includes Android quality/build, iOS simulator build, and sync API
tests. Those hosted workflows must actually run before claiming CI/iOS success.

## Release status

This is an executable development version, **not an App Store/Play release**.

Verification in this workspace (11 November 2026):

| Check | Result |
| --- | --- |
| Flutter static analysis | Passed, no issues |
| Flutter financial/crypto/sync/UI/PDF tests | 53 passed after branding and startup refresh |
| Laravel mobile sync API tests | 9 passed, 34 assertions |
| Android debug APK | Current source, universal debug APK built |
| Android signed release APK | Built with a dedicated local release key; signature and non-debuggable manifest verified |
| Actual Android device | Not verified; the temporary emulator did not finish booting |
| iOS compilation/device | ARM64 release and simulator build passed on GitHub macOS; physical device unverified |
| Hosted CI and production sync deployment | Android/iOS/API jobs passed; production sync not deployed |

The optimized Android build is `build/app/outputs/flutter-apk/app-release.apk`.
The development build remains `build/app/outputs/flutter-apk/app-debug.apk`.
Source and APK SHA-256 hashes are in `artifacts/android-debug-manifest.json`;
regenerate after building with `powershell -NoProfile -ExecutionPolicy Bypass -File tool/write_build_manifest.ps1`.
The actual widget preview is `artifacts/dashboard.png`; a generated sample report
is `artifacts/monthly-report.pdf`. Rebuild architecture-specific debug packages
with `flutter build apk --debug --split-per-abi`.

Before public distribution:

- Upgrade and revalidate the old installed Flutter toolchain and current store SDK requirements.
- Complete Bengali localization, including validation and all secondary flows.
- Complete interest-bearing EMI schedules, split/refund flows, and cross-device
  conflict UX usability testing.
- Add payment reversal/correction flows for protected loan/bill payments.
- Benchmark large encrypted datasets; current snapshot-based aggregation is aimed
  at a first working version, not a verified 50,000-transaction performance budget.
- Compact/archive the server's retained change log and operation deduplication
  history with a supported long-offline/full-resync policy.
- Test local notifications, biometrics, recovery, interruptions, and both mobile
  platforms on physical devices. PDF Bengali complex-script shaping needs review.
- Configure private production hosting, lifecycle/privacy/retention policies,
  account deletion, authentication recovery, support, signing, store metadata,
  TestFlight/internal testing, and release approval.

There is no bank connection, inventory accounting, multi-currency, family sharing,
OCR, AI financial advice, or E2EE in this version.
