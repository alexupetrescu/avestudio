"""Apply the upstream oscrypto multi-digit OpenSSL version parser fix only.

Original wheels stay hash-locked. This recorded image-only compatibility patch
matches the parser change in wbond/oscrypto (both CFFI and ctypes backends).
https://github.com/wbond/oscrypto/blob/master/oscrypto/_openssl/_libcrypto_ctypes.py
"""

import hashlib
import json
from pathlib import Path
import sys


REPLACEMENTS = (
    (r"\\b(\\d\\.\\d\\.\\d[a-z]*)\\b", r"\\b(\\d+\\.\\d+\\.\\d+[a-z]*)\\b"),
    (r"(?<=LibreSSL )(\\d\\.\\d(\\.\\d)?)\\b", r"(?<=LibreSSL )(\\d+\\.\\d+(\\.\\d+)?)\\b"),
)


def patch_text(content):
    for original, updated in REPLACEMENTS:
        if content.count(original) != 1:
            raise ValueError("Unexpected oscrypto source; review before applying the parser patch")
        content = content.replace(original, updated)
    return content


def main():
    prefix = Path(sys.argv[1])
    packages = prefix / "lib/python3.12/site-packages/oscrypto/_openssl"
    record = {"package": "oscrypto==1.3.0", "patch": "upstream multi-digit OpenSSL/LibreSSL version parsing", "files": {}}
    for name in ("_libcrypto_cffi.py", "_libcrypto_ctypes.py"):
        path = packages / name
        original = path.read_bytes()
        updated = patch_text(original.decode("utf-8")).encode("utf-8")
        path.write_bytes(updated)
        record["files"][name] = {"original_sha256": hashlib.sha256(original).hexdigest(),
                                  "patched_sha256": hashlib.sha256(updated).hexdigest()}
    (prefix / "avestudio-dependency-compatibility.json").write_text(json.dumps(record, indent=2) + "\n")
    print("Applied recorded upstream oscrypto version-parser compatibility fix")


if __name__ == "__main__":
    main()
