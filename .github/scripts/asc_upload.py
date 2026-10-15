#!/usr/bin/env python3
"""Upload an App Store IPA with the App Store Connect build upload API.

altool's own JWT is rejected for this key. A token signed here is accepted
by https://api.appstoreconnect.apple.com, so the IPA goes through that API.

Environment: KEY_PATH, ASC_KEY_ID, ASC_ISSUER_ID.
  python3 asc_upload.py --check
  python3 asc_upload.py path/to/App.ipa
"""

import base64
import hashlib
import json
import os
import plistlib
import subprocess
import sys
import time
import urllib.error
import urllib.request
import zipfile

API = "https://api.appstoreconnect.apple.com"
BUNDLE_ID = "com.abeba.playlisttimemachine"


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def der_to_raw(der: bytes) -> bytes:
    index = 0

    def read_length(buf, cursor):
        length = buf[cursor]
        cursor += 1
        if length < 0x80:
            return length, cursor
        count = length & 0x7F
        length = int.from_bytes(buf[cursor : cursor + count], "big")
        return length, cursor + count

    if der[index] != 0x30:
        raise SystemExit("OpenSSL returned a signature this workflow could not read.")
    index += 1
    _, index = read_length(der, index)

    def read_int(buf, cursor):
        if buf[cursor] != 0x02:
            raise SystemExit("OpenSSL returned a signature this workflow could not read.")
        cursor += 1
        length, cursor = read_length(buf, cursor)
        value = buf[cursor : cursor + length].lstrip(b"\x00") or b"\x00"
        return value.rjust(32, b"\x00"), cursor + length

    part_r, index = read_int(der, index)
    part_s, _ = read_int(der, index)
    if len(part_r) != 32 or len(part_s) != 32:
        raise SystemExit("The API key is not a P-256 key.")
    return part_r + part_s


def token() -> str:
    key_id = os.environ["ASC_KEY_ID"]
    issuer = os.environ["ASC_ISSUER_ID"]
    now = int(time.time())
    header = b64url(json.dumps({"alg": "ES256", "kid": key_id, "typ": "JWT"}, separators=(",", ":")).encode())
    payload = b64url(
        json.dumps(
            {"iss": issuer, "iat": now - 60, "exp": now + 1140, "aud": "appstoreconnect-v1"},
            separators=(",", ":"),
        ).encode()
    )
    signing_input = f"{header}.{payload}".encode()
    signed = subprocess.run(
        ["openssl", "dgst", "-sha256", "-sign", os.environ["KEY_PATH"], "-binary"],
        input=signing_input,
        capture_output=True,
    )
    if signed.returncode != 0:
        raise SystemExit("Could not sign an App Store Connect token with ASC_PRIVATE_KEY.")
    return signing_input.decode() + "." + b64url(der_to_raw(signed.stdout))


def api(method: str, path: str, bearer: str, body=None):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Authorization": f"Bearer {bearer}"}
    if data is not None:
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(API + path, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            raw = response.read()
            return response.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")[:2000]
        raise SystemExit(f"App Store Connect {method} {path} failed (HTTP {error.code}). Apple said: {detail}")


def app_id(bearer: str) -> str:
    status, payload = api(
        "GET",
        f"/v1/apps?filter[bundleId]={BUNDLE_ID}&limit=1",
        bearer,
    )
    apps = payload.get("data", [])
    print(f"App Store Connect accepted the API key (HTTP {status}, apps with this bundle id: {len(apps)}).")
    if len(apps) != 1:
        raise SystemExit(f"App Store Connect has no app with bundle id {BUNDLE_ID}.")
    return apps[0]["id"]


def ipa_versions(path: str):
    with zipfile.ZipFile(path) as archive:
        name = next(
            item
            for item in archive.namelist()
            if item.startswith("Payload/") and item.endswith(".app/Info.plist")
        )
        info = plistlib.loads(archive.read(name))
    short = str(info["CFBundleShortVersionString"])
    build = str(info["CFBundleVersion"])
    return short, build


def state_of(attributes):
    state = attributes.get("state")
    if isinstance(state, dict):
        return state.get("state"), state
    return state, None


def upload(ipa: str, bearer: str) -> None:
    short, build = ipa_versions(ipa)
    size = os.path.getsize(ipa)
    digest = hashlib.md5()
    with open(ipa, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    print(f"Uploading {os.path.basename(ipa)} version {short} build {build} ({size} bytes).")

    _, created = api(
        "POST",
        "/v1/buildUploads",
        bearer,
        {
            "data": {
                "type": "buildUploads",
                "attributes": {
                    "cfBundleShortVersionString": short,
                    "cfBundleVersion": build,
                    "platform": "IOS",
                },
                "relationships": {"app": {"data": {"type": "apps", "id": app_id(bearer)}}},
            }
        },
    )
    upload_id = created["data"]["id"]
    print(f"Created build upload {upload_id}.")

    try:
        _, reserved = api(
            "POST",
            "/v1/buildUploadFiles",
            bearer,
            {
                "data": {
                    "type": "buildUploadFiles",
                    "attributes": {
                        "fileName": os.path.basename(ipa),
                        "fileSize": size,
                        "uti": "com.apple.ipa",
                        "assetType": "ASSET",
                    },
                    "relationships": {
                        "buildUpload": {"data": {"type": "buildUploads", "id": upload_id}}
                    },
                }
            },
        )
        file_id = reserved["data"]["id"]
        operations = reserved["data"]["attributes"].get("uploadOperations") or []
        if not operations:
            raise SystemExit("App Store Connect reserved the file but returned no upload instructions.")
        with open(ipa, "rb") as handle:
            for index, operation in enumerate(operations, start=1):
                offset = int(operation["offset"])
                length = int(operation["length"])
                handle.seek(offset)
                chunk = handle.read(length)
                if len(chunk) != length:
                    raise SystemExit(f"Upload chunk {index} asked for {length} bytes at {offset}, read {len(chunk)}.")
                headers = {item["name"]: item["value"] for item in operation.get("requestHeaders") or []}
                send_chunk(operation["method"], operation["url"], headers, chunk, index, len(operations))
        commit = {
            "data": {
                "type": "buildUploadFiles",
                "id": file_id,
                "attributes": {
                    "uploaded": True,
                    "sourceFileChecksums": {"file": {"hash": digest.hexdigest(), "algorithm": "MD5"}},
                },
            }
        }
        try:
            api("PATCH", f"/v1/buildUploadFiles/{file_id}", bearer, commit)
        except SystemExit as error:
            if "sourceFileChecksums" not in str(error):
                raise
            print(error)
            print("Checksum was rejected. Committing the upload without it.")
            api(
                "PATCH",
                f"/v1/buildUploadFiles/{file_id}",
                bearer,
                {
                    "data": {
                        "type": "buildUploadFiles",
                        "id": file_id,
                        "attributes": {"uploaded": True},
                    }
                },
            )
        print(f"Committed build upload file {file_id}.")
        watch(upload_id, bearer, build, short)
    except SystemExit:
        try:
            api("DELETE", f"/v1/buildUploads/{upload_id}", bearer)
            print(f"Removed incomplete build upload {upload_id}.")
        except SystemExit as cleanup_error:
            print(cleanup_error)
        raise


def send_chunk(method: str, url: str, headers: dict, chunk: bytes, index: int, total: int) -> None:
    last_error = ""
    for attempt in range(1, 4):
        request = urllib.request.Request(url, data=chunk, headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                print(f"Uploaded chunk {index}/{total} (HTTP {response.status}).")
                return
        except urllib.error.HTTPError as error:
            last_error = error.read().decode(errors="replace")[:500]
            print(f"Chunk {index}/{total} attempt {attempt} failed (HTTP {error.code}).")
        except urllib.error.URLError as error:
            last_error = str(error.reason)
            print(f"Chunk {index}/{total} attempt {attempt} failed ({last_error}).")
        time.sleep(2)
    raise SystemExit(f"Chunk {index}/{total} did not upload. {last_error}")


def watch(upload_id: str, bearer: str, build: str, short: str) -> None:
    for _ in range(12):
        _, payload = api("GET", f"/v1/buildUploads/{upload_id}", bearer)
        name, detail = state_of(payload["data"]["attributes"])
        print(f"Build upload state: {name}.")
        if name in {"COMPLETE", "PROCESSING"}:
            print(f"Uploaded build {build} (version {short}) to App Store Connect.")
            return
        if name == "FAILED":
            raise SystemExit(f"App Store Connect rejected build {build}. {json.dumps(detail)[:2000]}")
        time.sleep(10)
    raise SystemExit(f"Build {build} did not start processing. Last state was {name}.")


def main() -> None:
    if len(sys.argv) == 2 and sys.argv[1] == "--check":
        app_id(token())
        return
    if len(sys.argv) != 2:
        raise SystemExit("usage: asc_upload.py --check | asc_upload.py App.ipa")
    upload(sys.argv[1], token())


if __name__ == "__main__":
    main()
