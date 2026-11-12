"""Verify the downloaded IPA, its source/checksum metadata and native locales."""
import argparse
import hashlib
import json
from pathlib import Path
import plistlib
import re
import struct
import zipfile


def architectures(binary):
    magic = binary[:4]
    if magic in (b"\xcf\xfa\xed\xfe", b"\xce\xfa\xed\xfe"):
        return [struct.unpack_from("<I", binary, 4)[0]]
    if magic in (b"\xfe\xed\xfa\xcf", b"\xfe\xed\xfa\xce"):
        return [struct.unpack_from(">I", binary, 4)[0]]
    if magic in (b"\xca\xfe\xba\xbe", b"\xca\xfe\xba\xbf"):
        count = struct.unpack_from(">I", binary, 4)[0]
        stride = 32 if magic[-1] == 0xbf else 20
        return [struct.unpack_from(">I", binary, 8 + n * stride)[0] for n in range(count)]
    raise ValueError("Unrecognized Mach-O executable")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("ipa", type=Path)
    parser.add_argument("--expected-version", required=True)
    parser.add_argument("--expected-source")
    args = parser.parse_args()
    digest = hashlib.sha256(args.ipa.read_bytes()).hexdigest()
    checksum = args.ipa.parent / "SHA256SUMS.txt"
    if checksum.exists():
        assert digest == checksum.read_text().split()[0].lower(), "Artifact checksum mismatch"
    source = None
    if args.expected_source:
        build = (args.ipa.parent / "BUILD.txt").read_text()
        source = re.search(r"Source commit:\s*([a-f0-9]{40})", build)[1]
        assert source == args.expected_source, "Artifact source mismatch"
    with zipfile.ZipFile(args.ipa) as archive:
        assert archive.testzip() is None, "IPA ZIP integrity failure"
        roots = [n[:-len("Info.plist")] for n in archive.namelist()
                 if re.fullmatch(r"Payload/[^/]+\.app/Info\.plist", n)]
        assert len(roots) == 1, "Expected one application bundle"
        root = roots[0]
        info = plistlib.loads(archive.read(root + "Info.plist"))
        assert info["CFBundleShortVersionString"] == args.expected_version, "IPA version mismatch"
        assert info["CFBundleIdentifier"] == "com.hisabnikash.hisabnikashMobile", "Bundle ID mismatch"
        assert 0x0100000c in architectures(archive.read(root + info["CFBundleExecutable"])), "ARM64 app missing"
        for framework in ["App", "Flutter"]:
            path = root + f"Frameworks/{framework}.framework/{framework}"
            assert 0x0100000c in architectures(archive.read(path)), f"ARM64 {framework} framework missing"
        assert {"en", "bn"}.issubset(info["CFBundleLocalizations"]), "Bundle locales missing"
        localized = archive.read(root + "bn.lproj/InfoPlist.strings")
        try:
            face_id = plistlib.loads(localized)["NSFaceIDUsageDescription"]
        except plistlib.InvalidFileException:
            face_id = localized.decode("utf-8-sig")
        assert re.search(r"[\u0980-\u09ff]", face_id), "Bengali native permission text missing"
        unsigned = root + "_CodeSignature/CodeResources" not in archive.namelist()
        assert unsigned, "Expected an unsigned application bundle"
    result = {"ipa": str(args.ipa), "version": info["CFBundleShortVersionString"],
              "build": info["CFBundleVersion"], "bundle_id": info["CFBundleIdentifier"],
              "bytes": args.ipa.stat().st_size, "sha256": digest, "source": source,
              "arm64": True, "bengali_native_localization": True, "unsigned": unsigned}
    (args.ipa.parent / "VERIFIED.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result))


if __name__ == "__main__":
    main()
