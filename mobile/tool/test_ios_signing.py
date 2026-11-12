import datetime
import unittest
from prepare_ios_signing import BUNDLE_ID, validate_profile


class ProfileValidationTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime.datetime(2026, 11, 11, tzinfo=datetime.timezone.utc)
        self.profile = {
            'ExpirationDate': datetime.datetime(2027, 1, 1),
            'TeamIdentifier': ['ABCDE12345'],
            'UUID': '01234567-89AB-CDEF-0123-456789ABCDEF',
            'ProvisionedDevices': ['test-phone-udid'],
            'Entitlements': {'application-identifier': f'ABCDE12345.{BUNDLE_ID}', 'get-task-allow': False},
        }

    def test_valid_ad_hoc_profile(self):
        self.assertEqual(validate_profile(self.profile, self.now)[0], 'ABCDE12345')

    def test_expired_profile(self):
        self.profile['ExpirationDate'] = datetime.datetime(2026, 1, 1)
        with self.assertRaisesRegex(ValueError, 'expired'):
            validate_profile(self.profile, self.now)

    def test_wrong_app(self):
        self.profile['Entitlements']['application-identifier'] = 'ABCDE12345.other.app'
        with self.assertRaisesRegex(ValueError, 'bundle ID'):
            validate_profile(self.profile, self.now)

    def test_development_profile(self):
        self.profile['Entitlements']['get-task-allow'] = True
        with self.assertRaisesRegex(ValueError, 'development'):
            validate_profile(self.profile, self.now)

    def test_unregistered_phone_profile(self):
        del self.profile['ProvisionedDevices']
        with self.assertRaisesRegex(ValueError, 'UDIDs'):
            validate_profile(self.profile, self.now)

    def test_invalid_uuid_path(self):
        self.profile['UUID'] = '../../file'
        with self.assertRaisesRegex(ValueError, 'UUID'):
            validate_profile(self.profile, self.now)


if __name__ == '__main__':
    unittest.main()
