# Build an iOS IPA from Windows using GitHub Actions

The new **0.3.1** unsigned build succeeded in
[run 43267612022](https://github.com/IstiakDeveloper/hisabnikash/actions/runs/43267612022).
See [the completion report](COMPLETION_0.3.1_2026-11-12.md) for its source revision,
verification and delivery status. The **0.2.0** details below are historical.

Local delivery: [HisabNikash-0.3.1-unsigned.ipa](../artifacts/releases/0.3.1/HisabNikash-0.3.1-unsigned.ipa),
version **0.3.1 (5)**, 12,890,186 bytes. ZIP integrity, ARM64 binaries, source
revision, bundle metadata, native Bengali localization and CI checksum passed.
[Verification manifest](../artifacts/releases/0.3.1/ios-manifest.json).
SHA-256: `70448afecb047def0d5de77fab8eb5686142788c3f0c6dd81010e77aa4eb1abc`.
The application is unsigned; signing/provisioning is required for installation.

Previous release: **0.2.0**, built and verified in
[run 43079501245](https://github.com/IstiakDeveloper/hisabnikash/actions/runs/43079501245).
The local review/install package is `artifacts/releases/0.2.0/`, including
`HisabNikash-0.2.0-unsigned.ipa`. It includes the new icon, native splash and UI;
the earlier 0.1.0 build below is historical evidence.

The workflow is `.github/workflows/ios-ipa.yml`. It builds on a macOS runner;
Windows does not run Xcode. The first unsigned ARM64 release build succeeded on
GitHub with Flutter 3.24.4 and Xcode 16.4 (source commit `8c46cbb`).
[Successful IPA build](https://github.com/IstiakDeveloper/hisabnikash/actions/runs/42885663778).
The companion Android/API/iOS simulator quality workflow also passed.

The downloaded file is `artifacts/ios/run-42885663778/HisabNikash-unsigned.ipa`
(11,260,870 bytes). Its SHA-256 is
`37cd1c2343a19fa8e04f0bca685dcd03dc5117601efeab63e87e007945ab4820`.
Local verification checked ZIP integrity, the ARM64 executable, Flutter/App
frameworks, bundle ID and checksum. This does not establish physical-device runtime
behavior or App Store readiness; the app has no application signature.

## Unsigned file, without Apple signing credentials

1. Push the project and workflow to your GitHub repository. The workflow must be
   on the default branch before it appears under Actions.
2. Open **Actions → Build iOS IPA → Run workflow**.
3. Select `unsigned`, then run the workflow.
4. Download the `HisabNikash-ios-unsigned-<run number>` artifact after success.

Pushing the isolated `codex/ios-ipa-build` branch also starts an unsigned build
automatically, so it can be tested before merging the workflow into `main`.

It contains `HisabNikash-unsigned.ipa`, checksums and source commit information.
This file is explicitly unsigned. It cannot install directly on an iPhone; it
still needs a valid Apple signing identity and provisioning profile. It is not a
TestFlight/App Store submission.

## Signed IPA for registered test iPhones

This mode uses an Apple Developer Program Ad Hoc distribution profile. Register
each test iPhone's UDID and include it in that profile. Register this exact App ID:

`com.hisabnikash.hisabnikashMobile`

Export the matching **Apple Distribution** certificate and its private key as a
password-protected `.p12` using Keychain Access on a Mac. Download the matching
Ad Hoc `.mobileprovision` profile from Apple Developer Certificates, Identifiers
& Profiles. If you already have these two files, your own Mac is not needed to
run the GitHub build.

Under **GitHub repository → Settings → Secrets and variables → Actions**, add:

| Secret | Value |
| --- | --- |
| `IOS_CERTIFICATE_P12_BASE64` | Base64 of the complete `.p12` file |
| `IOS_CERTIFICATE_PASSWORD` | Password used when exporting the `.p12` |
| `IOS_PROFILE_BASE64` | Base64 of the complete `.mobileprovision` file |

On Windows, copy each encoded file to the clipboard without printing it:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\path\distribution.p12')) | Set-Clipboard
[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\path\HisabNikash.mobileprovision')) | Set-Clipboard
```

Paste each value into its corresponding GitHub secret separately. Do not commit
these files, paste their contents in chat, or put Apple ID passwords in source.
The workflow extracts the Team ID and profile UUID automatically and checks the
profile's expiry, bundle ID and Ad Hoc device registration before building.

Run **Build iOS IPA** with `signed-ad-hoc`. Download the signed IPA artifact on
success. Install using Apple Configurator/Xcode or your existing Ad Hoc delivery
service, on an iPhone included in the profile. Merely copying the file to Files
on an iPhone does not install it. This workflow does not publish to any service.

The runner imports signing material into a temporary keychain and removes it
after the build. Build artifacts expire after seven days. The source revision
and IPA SHA-256 checksums are included in the artifact.

## Build directly on your Mac

```sh
cd mobile
flutter pub get
open ios/Runner.xcworkspace
```

In Xcode select **Runner → Signing & Capabilities**, select your Apple team and
configure a matching bundle ID/profile. Build/archive and export an Ad Hoc IPA.
After the first export, reuse Xcode's generated export-options plist:

```sh
flutter build ipa --release --export-options-plist=/path/to/ExportOptions.plist
```

The output is under `mobile/build/ios/ipa/`. The installed local project uses
Flutter 3.24.4; the CI workflow deliberately uses the same version. Compatibility
with the runner's Xcode and actual iPhones must be established by running it.
App Store/TestFlight delivery needs a separate validation of current SDK/store
requirements and distribution signing; Ad Hoc success does not establish that.

## References

- [Flutter: build and release an iOS app](https://docs.flutter.dev/deployment/ios)
- [Apple: export an iOS app](https://help.apple.com/xcode/mac/current/en.lproj/dev23ea8b877.html)
- [GitHub: supported macOS runner images](https://github.com/actions/runner-images)
