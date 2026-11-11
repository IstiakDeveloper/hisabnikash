"""Fail builds with placeholder/missing icons, launch images or packaged branding."""
import argparse
import hashlib
import json
from pathlib import Path
import plistlib
import re
import struct
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def png_size(data):
    assert data[:8] == b'\x89PNG\r\n\x1a\n', 'Expected a PNG image'
    index = data.index(b'IHDR', 8, 128) + 4  # Also supports Apple's CgBI PNGs.
    return struct.unpack('>II', data[index:index + 8])


def verify_sources():
    catalog = ROOT / 'ios/Runner/Assets.xcassets/AppIcon.appiconset'
    entries = json.loads((catalog / 'Contents.json').read_text())['images']
    for entry in entries:
        size = round(float(entry['size'].split('x')[0]) * float(entry['scale'].rstrip('x')))
        data = (catalog / entry['filename']).read_bytes()
        assert png_size(data) == (size, size), entry['filename']
        assert data[25] == 2, f"iOS launcher icon must be opaque RGB: {entry['filename']}"
    launch = ROOT / 'ios/Runner/Assets.xcassets/LaunchImage.imageset'
    for scale in (1, 2, 3):
        suffix = '' if scale == 1 else f'@{scale}x'
        assert png_size((launch / f'LaunchImage{suffix}.png').read_bytes()) == (88 * scale, 88 * scale), 'Placeholder launch image'
    assert png_size((ROOT / 'assets/brand/icon.png').read_bytes()) == (1024, 1024)
    ET.parse(ROOT / 'ios/Runner/Base.lproj/LaunchScreen.storyboard')
    ET.parse(ROOT / 'android/app/src/main/res/mipmap-anydpi-v33/ic_launcher.xml')
    print(f'Brand source checks passed: {len(entries)} iOS slots, 3 launch scales, vector master and Android themed icon.')


def verify_ipa(path):
    with zipfile.ZipFile(path) as archive:
        root = 'Payload/Runner.app/'
        info = plistlib.loads(archive.read(root + 'Info.plist'))
        icon = info['CFBundleIcons']['CFBundlePrimaryIcon']
        assert icon['CFBundleIconName'] == 'AppIcon'
        assert icon['CFBundleIconFiles'], 'Missing iOS icon declarations'
        assert archive.getinfo(root + 'Assets.car').file_size > 1000
        names = archive.namelist()
        icons = [n for n in names if n.startswith(root) and n.endswith('.png') and 'AppIcon' in n]
        assert icons and any(png_size(archive.read(n))[0] >= 120 for n in icons), 'Missing compiled Home Screen icon'
        assert any('/LaunchScreen.storyboardc/' in n for n in names), 'Missing compiled launch storyboard'
        asset = next(n for n in names if n.endswith('/flutter_assets/assets/brand/icon.png'))
        assert hashlib.sha256(archive.read(asset)).digest() == hashlib.sha256((ROOT / 'assets/brand/icon.png').read_bytes()).digest(), 'IPA contains outdated in-app branding'
        expected_version = re.search(r'^version:\s*([^+\s]+)', (ROOT / 'pubspec.yaml').read_text(), re.MULTILINE).group(1)
        assert info['CFBundleShortVersionString'] == expected_version
        print(json.dumps({'ipa': str(path), 'version': info['CFBundleShortVersionString'], 'build': info['CFBundleVersion'], 'compiled_icons': icons, 'launch_storyboard': True, 'packaged_brand_matches_source': True}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--ipa', type=Path)
    args = parser.parse_args()
    verify_sources()
    if args.ipa:
        verify_ipa(args.ipa)
