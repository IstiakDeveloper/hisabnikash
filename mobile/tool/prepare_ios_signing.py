"""Prepare ephemeral GitHub runner signing files; never print certificate data."""
import base64
import datetime
import os
from pathlib import Path
import plistlib
import re
import secrets
import shutil
import sys

BUNDLE_ID = 'com.hisabnikash.hisabnikashMobile'


def validate_profile(profile, now=None):
    now = now or datetime.datetime.now(datetime.timezone.utc)
    expiration = profile.get('ExpirationDate')
    if not isinstance(expiration, datetime.datetime):
        raise ValueError('The provisioning profile has no valid expiration date.')
    if expiration.tzinfo is None:
        expiration = expiration.replace(tzinfo=datetime.timezone.utc)
    if expiration <= now:
        raise ValueError('The provisioning profile has expired.')
    teams = profile.get('TeamIdentifier', [])
    if not teams or not re.fullmatch(r'[A-Z0-9]{10}', teams[0]):
        raise ValueError('The provisioning profile has no valid Apple Team ID.')
    team = teams[0]
    entitlements = profile.get('Entitlements', {})
    if entitlements.get('application-identifier') != f'{team}.{BUNDLE_ID}':
        raise ValueError(f'The profile must belong to bundle ID {BUNDLE_ID}.')
    if entitlements.get('get-task-allow', False):
        raise ValueError('Use an Ad Hoc distribution profile, not a development profile.')
    if not profile.get('ProvisionedDevices') or profile.get('ProvisionsAllDevices'):
        raise ValueError('Use an Ad Hoc profile containing the test iPhone UDIDs.')
    profile_uuid = profile.get('UUID', '')
    if not re.fullmatch(r'[A-Fa-f0-9-]{36}', profile_uuid):
        raise ValueError('The provisioning profile has an invalid UUID.')
    return team, profile_uuid


def emit_environment(values):
    with open(os.environ['GITHUB_ENV'], 'a', encoding='utf-8') as output:
        for key, value in values.items():
            if '\n' in value or '\r' in value:
                raise ValueError('Invalid signing environment value.')
            output.write(f'{key}={value}\n')


def main():
    temp = Path(os.environ['RUNNER_TEMP']) / 'hisab-ios'
    if '--profile' in sys.argv:
        with (temp / 'profile.plist').open('rb') as source:
            profile = plistlib.load(source)
        team, profile_uuid = validate_profile(profile)
        destination = Path.home() / 'Library/MobileDevice/Provisioning Profiles'
        destination.mkdir(parents=True, exist_ok=True)
        installed = destination / f'{profile_uuid}.mobileprovision'
        shutil.copyfile(temp / 'profile.mobileprovision', installed)
        installed.chmod(0o600)
        options = {
            'method': 'ad-hoc', 'teamID': team, 'signingStyle': 'manual',
            'signingCertificate': 'Apple Distribution',
            'provisioningProfiles': {BUNDLE_ID: profile_uuid},
            'stripSwiftSymbols': True, 'thinning': '<none>',
        }
        with Path('ios/ExportOptions.generated.plist').open('wb') as output:
            plistlib.dump(options, output)
        emit_environment({'IOS_TEAM_ID': team, 'IOS_PROFILE_UUID': profile_uuid})
        print('Validated Ad Hoc profile for HisabNikash. Export configuration ready.')
        return

    # Validate presence before creating any credentials on disk.
    inputs = {}
    for key, filename in [('IOS_CERTIFICATE_P12_BASE64', 'certificate.p12'),
                          ('IOS_PROFILE_BASE64', 'profile.mobileprovision')]:
        raw = os.environ.get(key, '').strip()
        if not raw:
            raise ValueError(f'Missing GitHub repository secret: {key}')
        try:
            inputs[filename] = base64.b64decode(''.join(raw.split()), validate=True)
        except ValueError as error:
            raise ValueError(f'{key} must contain base64 encoded file bytes.') from error
        if not inputs[filename]:
            raise ValueError(f'{key} contains an empty file.')
    temp.mkdir(parents=True, exist_ok=True, mode=0o700)
    for filename, content in inputs.items():
        path = temp / filename
        path.write_bytes(content)
        path.chmod(0o600)
    password = secrets.token_hex(32)
    print(f'::add-mask::{password}')
    emit_environment({'KEYCHAIN_PASSWORD': password, 'KEYCHAIN_PATH': str(temp / 'build.keychain-db')})
    print('Signing inputs prepared in the temporary runner directory.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, OSError) as error:
        sys.exit(str(error))
