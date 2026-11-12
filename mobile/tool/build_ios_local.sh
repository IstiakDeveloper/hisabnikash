#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo 'An iOS binary requires macOS with Xcode. No source is uploaded by this script.' >&2
  exit 1
fi
command -v flutter >/dev/null
xcode-select -p >/dev/null
if [[ -z "${DEVELOPER_DIR:-}" && -d /Applications/Xcode_16.4.app/Contents/Developer ]]; then
  export DEVELOPER_DIR=/Applications/Xcode_16.4.app/Contents/Developer
fi
cd "$project_dir"
flutter pub get
flutter analyze
flutter test
flutter build ios --release --no-codesign

mkdir -p build/ios artifacts/ios
stage="$(mktemp -d "$project_dir/build/ios/unsigned.XXXXXX")"
output="$(mktemp -d "$project_dir/artifacts/ios/local.XXXXXX")"
mkdir -p "$stage/Payload"
ditto build/ios/iphoneos/Runner.app "$stage/Payload/Runner.app"
(
  cd "$stage"
  /usr/bin/zip -qry "$output/HisabNikash-unsigned.ipa" Payload
)
shasum -a 256 "$output/HisabNikash-unsigned.ipa" > "$output/SHA256SUMS.txt"
find lib -type f -name '*.dart' -exec shasum -a 256 {} \; > "$output/SOURCE-SHA256SUMS.txt"
shasum -a 256 pubspec.yaml pubspec.lock ios/Runner/Info.plist ios/Runner.xcodeproj/project.pbxproj >> "$output/SOURCE-SHA256SUMS.txt"
printf '%s\n' 'UNSIGNED: Apple signing and an appropriate provisioning profile are required before installation on an iPhone.' > "$output/UNSIGNED.txt"
printf 'Local unsigned IPA: %s\n' "$output/HisabNikash-unsigned.ipa"
