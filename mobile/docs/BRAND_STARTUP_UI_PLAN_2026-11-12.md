# HisabNikash brand, startup and UI redesign plan

Reviewed: 12 November 2026, Asia/Dhaka. This is a plan, not a claim that the
redesigned screens or new APK/IPA have already been delivered.

## Findings from the actual project and delivered IPA

| Finding | Evidence | Consequence |
| --- | --- | --- |
| iOS splash artwork is still a placeholder | All three `LaunchImage.imageset` PNGs are 1×1 pixels / 68 bytes; `LaunchScreen.storyboard` uses a white background | Startup appears blank, with no designed transition into the app |
| Android legacy launch screen is also a template | `drawable/launch_background.xml` only draws white | No coherent brand experience on older Android versions |
| App loading has no visual identity | `AppGate` displays only `CircularProgressIndicator` while `_ready` is false | Native launch, loading and the first useful screen feel disconnected |
| Existing brand mark is not registered as a Flutter asset | `assets/brand/icon.png` exists, but `pubspec.yaml` only declares font assets | The native launcher asset does not automatically appear inside Flutter screens |
| Custom motion is absent | No custom animation/controller/transition implementation in the reviewed app UI; existing indicators are generic widgets | Navigation, saving and state changes lack deliberate feedback |
| Delivered IPA has icon configuration, but device rendering remains unverified | The actual IPA contains `CFBundlePrimaryIcon`, `AppIcon60x60@2x.png`, an iPad icon and `Assets.car` | Do not assume the user's missing icon is resolved because source PNGs exist; investigate the installed/signed artifact and Home Screen appearance |
| Current visual hierarchy needs revision | The dashboard screenshot has a dominant large balance card, repeated similar cards, truncated filter text and a floating action overlapping the content area | Improve density, amount alignment, component hierarchy and safe-area spacing |

The existing green ledger mark is a starting asset, not an approved final brand.
The available dashboard screenshot is a widget-test artifact, not evidence of
the user's current iPhone screen.

## 1. First deliverable: visible app identity and coherent startup

### Launcher icon

- Develop two vector concepts: a distinctive ledger/H monogram and a compact
  ledger/taka-inspired mark. Use a single clear silhouette, without tiny lettering.
- Start from the existing forest-green direction, with warm ivory and a restrained
  mint accent. Evaluate the actual mark at Home Screen and notification sizes.
- Keep one editable vector master and generate native PNGs reproducibly.
- iOS: opaque 1024px master, complete iPhone/iPad catalog, system corner masking,
  valid `AppIcon` references, and verification of light/dark/tinted appearances.
- Android: adaptive foreground/background, legacy mipmaps and a monochrome themed
  icon. Check circular, rounded-square and other launcher masks.
- Register the in-app brand assets and use the same mark on onboarding, loading,
  app lock and About. Keep decoration restrained on financial screens.
- Inspect the final IPA's compiled catalog, icon images and plist, and the APK's
  manifest/resources. Check the icon again after the IPA is re-signed for install.
- Confirm on an actual iPhone Home Screen/App Library and an Android launcher.
  Asset presence alone is not a pass.

### Native launch and Flutter startup

- Replace the 1px launch assets and white templates with a deliberate layout that
  matches the app's first Flutter frame in color, scale and positioning.
- On iOS, use a static native launch screen. Animate only after Flutter starts.
  Keep any native logo a fixed part of the matching first Flutter screen.
- Configure Android 12+ system splash resources and older Android launch resources;
  avoid adding a second splash Activity.
- Implement a branded `StartupView`: mark, localized app name, and a subtle loading
  treatment only while real initialization is outstanding.
- Allow a short fade/scale or ledger-stroke reveal in Flutter. Do not force a
  2–3-second delay on a fast launch; data readiness controls entry into the app.
- Distinguish opening the local vault from background cloud sync. Startup must
  work offline and must not wait for a server response.
- Review duplicated bill materialization in provider initialization and `AppGate`.
  Run necessary migrations once, keep failure recovery visible, and never show a
  fictional loading percentage.
- Respect reduced-motion settings. App lock/privacy cover must remain effective
  throughout startup, transitions and resume.

## 2. Establish the design system and redesign the key screens

Create the reusable components before spreading new styling across the app.

| Area | Proposed change |
| --- | --- |
| Typography | Proper bundled regular/medium/semibold/bold weights; coordinated Bengali and English baselines; predictable money formatting and right-aligned/tabular amounts |
| Spacing | 4/8px spacing scale; consistent 16–20px screen gutters; 20–24px section separation; explicit keyboard and bottom-navigation clearance |
| Color and surfaces | Light warm background, restrained forest-green highlights, clear neutral surfaces, readable dark mode; success/error must also have text or icons |
| Dashboard | Compact greeting/date; focused balance summary; distinct income/expense and cash movement labels; accessible quick actions; latest activity and upcoming bills |
| Account cards | Balanced name/space/amount columns, meaningful type icons, clear statement entry point and no avoidable truncation |
| Entry forms | Searchable selectors retained; visible selection; inline creation; consistent field rhythm; persistent save action, adjacent error feedback and keyboard-safe layout |
| Navigation | Clear active state, consistent labels, deliberate route transitions, and an add action that does not cover the last content row |
| Bills/budgets/loans | Shared row structure with status chips, readable progress, due dates and clearly separated primary and overflow actions |
| Statements | Clear opening balance, dated debit/credit entries and running balances with correction links |
| Onboarding | Short introduction, create first space/account, optional preferences; no forced cloud sign-in |

Prepare reviewable previews of these five screens before broad implementation:
startup, onboarding, dashboard, add transaction and account statement. Show both
light/dark variants and Bengali/English examples, using clearly labeled fixture
data. Previews should be in the repository and easy to compare with the running app.

## 3. Loading, empty, error and success states

- Cold startup: branded initialization view; route promptly when ready.
- Already-loaded screens: retain useful content during refresh instead of replacing
  the whole page with a spinner.
- First data load: skeleton rows/cards matching the final geometry. An empty
  offline vault should show a helpful empty state, not an endless skeleton.
- Saving: disable duplicate submission, show progress in the save action, then a
  concise success acknowledgement; keep the draft and show an actionable error
  when saving fails.
- Selectors: distinguish no matches, no available records and a loading/error state.
- Sync: show saved locally / queued / syncing / conflict / reauthentication states
  consistently. Do not make an offline device appear blocked.
- Startup failure: readable explanation, safe retry and existing backup recovery;
  avoid exposing raw exception text to an ordinary user.

## 4. Motion specification

These are proposed product values to validate on-device, not platform requirements.

| Interaction | Motion |
| --- | --- |
| First Flutter frame | Optional 250–400ms logo reveal/fade while initialization is pending |
| Screen content change | Restrained 160–220ms fade/slide, with native-feeling back behavior |
| Save success | Short checkmark/state transition; haptic feedback where supported |
| Cards/buttons | Small press feedback; no persistent decorative movement |
| Skeleton | Subtle loading treatment; disable shimmer/motion when accessibility settings request it |

Do not animate balance figures through invented intermediate amounts. Avoid
replaying an intro every time the app resumes or a tab changes. Financial meaning
and privacy take priority over motion.

## Delivery order

1. Icon concepts, chosen master, full native export and packaging checks.
2. Native launch screens, branded startup, genuine loading/error states and
   reduced-motion behavior.
3. Shared design tokens/components plus dashboard and entry-form redesign.
4. Remaining screens, complete interaction states and motion polish.
5. New signed Android release APK and new unsigned iOS release IPA from the
   validated source. Reuse the existing Android release key. Keep the established
   iOS Apple-account/bundle identity when re-signing updates.

Do not describe the existing APK/IPA as updated until the new artifacts are built.
Do not uninstall the user's installed finance app merely to clear an icon cache;
preserve the local vault and obtain an encrypted backup before replacement actions.

## Acceptance checks

- Real launcher/Home Screen icon visible and recognizable; compiled assets verified.
- No blank white flash across native launch → Flutter initialization → first screen.
- Startup works offline; fast launch has no imposed splash delay; delayed vault
  opening and genuine failures show the intended states.
- First launch, subsequent cold launch, warm resume, app lock and recovery checked.
- Every important action has loading, success, empty and recoverable error behavior.
- No duplicate save caused by repeated taps and no lost input during loading/errors.
- Small/narrow screens, safe areas, keyboard, large text, dark mode and Bengali tested.
- Reduced motion is respected; animations do not reveal financial data while locked.
- Existing accounting/sync regression suite remains green.
- Build numbers, source revision, checksums and actual-device screenshots/video
  accompany the replacement artifacts. Compilation alone is not visual acceptance.

## Platform references

- [Apple: Launching](https://developer.apple.com/design/human-interface-guidelines/launching)
- [Apple: specifying a launch screen](https://developer.apple.com/documentation/xcode/specifying-your-apps-launch-screen)
- [Android: splash screens](https://developer.android.com/develop/ui/views/launch/splash-screen)
- [Android: migrate to the system splash experience](https://developer.android.com/develop/ui/views/launch/splash-screen/migrate)
