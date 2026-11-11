# Brand and startup implementation — 12 November 2026

Version 0.2.0 implements the icon/startup/dashboard/form priorities from the
[visual plan](BRAND_STARTUP_UI_PLAN_2026-11-12.md). Existing finance, vault and
sync behavior remains covered by the accounting regression suite.

- New ledger/H mark with forest, ivory and gold. `tool/generate_brand.dart` owns
  the geometry and exports SVG, native PNGs and web icons. The old icon-generator
  entry point delegates to it. Run from `mobile` with `dart run tool/generate_brand.dart`.
- All 19 iOS catalog slots regenerated as opaque RGB; launch images are genuine
  88/176/264px rounded tiles. Native launch uses a light/dark color asset and the
  same center/scale as Flutter's first frame.
- Android has adaptive and themed monochrome icons, legacy launch artwork and
  Android 12+ splash resources. No separate splash Activity was added.
- Flutter startup includes a finite logo pulse and text fade, a real loading
  indicator, readable retry/recovery, and reduced-motion behavior. There is no
  forced startup delay or dependency on online sync. Duplicate initial bill
  materialization was removed; repository initialization still performs migration.
- The brand asset is registered in Flutter and used in startup/onboarding/lock
  and Settings. Native icon packaging is checked separately from Flutter assets.
- Real Noto medium/semibold/bold weights are bundled for Bengali and English.
  Shared surfaces, spacing, headings and amount typography have been refined.
- Dashboard uses a compact balance, fixed-layout quick actions, separate cash
  movement cards, grouped account rows and non-overlapping content. Large text
  uses expanded filters/navigation; dark movement figures retain contrast.
- Transaction and other editor forms have a persistent save footer that moves
  above the keyboard, nearby error feedback, duplicate-submit protection and a
  single save acknowledgement. Search/create selectors and unsaved-input guards
  remain available.
- Record-loading screens use static geometry-matched skeletons. Tab content has
  a finite entrance transition that respects reduced-motion preferences.

## Evidence

Local static analysis is clean. All **53 Flutter tests pass**, including delayed
startup readiness, reduced motion, genuine launch images, narrow screens, Bengali
dark mode at large text size, keyboard-safe saving and existing financial cases.
`python tool/verify_brand_assets.py` checks source assets. CI additionally runs
that verifier against the actual IPA, checking compiled icon declarations/images,
launch storyboard, asset catalog and the exact packaged Flutter brand image.

Widget previews (fixture data only) are saved under `artifacts/`:

- `startup-light.png`, `startup-dark-bn.png`
- `dashboard.png`, `dashboard-desktop.png`, `dashboard-dark-bn-large.png`
- `transaction-form.png`, `search-select.png`
- `onboarding.png`, `account-statement.png`

These are actual widget renders, not photographs of a physical device. Real
iPhone Home Screen/App Library rendering, signing-tool behavior, cold launch,
resume and native animation performance still require device verification.

## Replacement builds

Rebuild signed Android releases using the existing ignored release key; do not
generate a new key. The standard APK paths are under `build/app/outputs/flutter-apk/`.
The iOS workflow produces an unsigned release IPA, with checksums and source
revision. Re-sign using the same Apple ID and established bundle identity to
update an installed copy. Export an encrypted vault backup before any replacement
that may require removing an installed app. Do not clear application data merely
to troubleshoot a cached launcher icon.

The earlier 0.1.0 IPA remains a historical artifact. Use the new 0.2.0 build after
the corresponding native build and packaging checks pass.
