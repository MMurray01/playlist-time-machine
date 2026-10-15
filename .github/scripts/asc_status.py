#!/usr/bin/env python3
"""Read an App Store Connect build and attach it to the internal beta group when it is valid.

Uses ASC_KEY_ID, ASC_ISSUER_ID, and ASC_PRIVATE_KEY. ASC_BUILD is the build number.
ASC_WAIT_SECONDS keeps checking until the build is VALID, FAILED, or INVALID.
Does not print secret values.
"""

import atexit
import os
import pathlib
import re
import sys
import tempfile
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from asc_upload import api, app_id, token  # noqa: E402


def write_key() -> None:
    if os.environ.get("KEY_PATH"):
        return
    text = (
        os.environ.get("ASC_PRIVATE_KEY", "")
        .replace("\\n", "\n")
        .replace("\r\n", "\n")
        .replace("\r", "\n")
        .strip()
        .strip('"')
        .strip("'")
    )
    match = re.search(
        r"-----BEGIN ([A-Z0-9 ]*)PRIVATE KEY-----(.*?)-----END \1PRIVATE KEY-----",
        text,
        re.S,
    )
    if not match:
        raise SystemExit("ASC_PRIVATE_KEY is not a PEM private key.")
    body = re.sub(r"\s+", "", match.group(2))
    wrapped = "\n".join(body[i : i + 64] for i in range(0, len(body), 64))
    label = match.group(1)
    pem = f"-----BEGIN {label}PRIVATE KEY-----\n{wrapped}\n-----END {label}PRIVATE KEY-----\n"
    handle = tempfile.NamedTemporaryFile(prefix="AuthKey_", suffix=".p8", delete=False)
    path = pathlib.Path(handle.name)
    handle.close()
    path.write_text(pem)
    path.chmod(0o600)
    os.environ["KEY_PATH"] = str(path)
    os.environ["ASC_KEY_ID"] = "".join(os.environ.get("ASC_KEY_ID", "").split())
    os.environ["ASC_ISSUER_ID"] = "".join(os.environ.get("ASC_ISSUER_ID", "").split())

    def cleanup() -> None:
        path.unlink(missing_ok=True)

    atexit.register(cleanup)


def try_api(method: str, path: str, bearer: str, body=None):
    try:
        return api(method, path, bearer, body)
    except SystemExit as error:
        print(error)
        return None


def messages(state) -> list[str]:
    if not isinstance(state, dict):
        return []
    lines = []
    for kind in ("errors", "warnings", "infos"):
        for item in state.get(kind) or []:
            if isinstance(item, dict):
                lines.append(f"{kind}: {item.get('code') or ''} {item.get('description') or ''}".strip())
            else:
                lines.append(f"{kind}: {item}")
    return lines


def inspect(bearer: str, application: str, build_number: str) -> tuple[str | None, str]:
    lines = [f"App id: {application}", f"Build number: {build_number}"]

    build_query = (
        f"/v1/builds?filter[app]={application}&filter[version]={build_number}&limit=5"
        "&include=buildBetaDetail,betaGroups,preReleaseVersion"
    )
    listed = try_api("GET", build_query, bearer)
    builds = (listed[1].get("data") if listed else None) or []
    included = (listed[1].get("included") if listed else None) or []
    if not builds:
        latest = try_api(
            "GET",
            f"/v1/builds?filter[app]={application}&limit=10&sort=-uploadedDate",
            bearer,
        )
        recent = (latest[1].get("data") if latest else None) or []
        if recent:
            lines.append(
                "Recent builds: "
                + ", ".join(
                    f"{item.get('attributes', {}).get('version')}={item.get('attributes', {}).get('processingState')}"
                    for item in recent
                )
            )
        else:
            lines.append("No builds are listed for this app.")

    build = next((item for item in builds if str(item.get("attributes", {}).get("version")) == build_number), None)
    if build is None and builds:
        build = builds[0]
    processing = None
    compliance = None
    build_id = None
    if build:
        build_id = build["id"]
        attributes = build.get("attributes") or {}
        processing = attributes.get("processingState")
        compliance = attributes.get("usesNonExemptEncryption")
        lines.append(f"Build {attributes.get('version')} id: {build_id}")
        lines.append(f"processingState: {processing}")
        lines.append(f"uploadedDate: {attributes.get('uploadedDate')}")
        lines.append(f"expired: {attributes.get('expired')}")
        lines.append(f"usesNonExemptEncryption: {compliance}")
        lines.append(f"buildAudienceType: {attributes.get('buildAudienceType')}")

    for item in included:
        attributes = item.get("attributes") or {}
        if item.get("type") == "buildBetaDetails":
            lines.append(f"internalBuildState: {attributes.get('internalBuildState')}")
            lines.append(f"externalBuildState: {attributes.get('externalBuildState')}")
        if item.get("type") == "betaGroups":
            lines.append(
                "Build is in beta group "
                f"{attributes.get('name')} "
                f"(internal={attributes.get('isInternalGroup')}, allBuilds={attributes.get('hasAccessToAllBuilds')})"
            )
        if item.get("type") == "preReleaseVersions":
            lines.append(f"preReleaseVersion: {attributes.get('version')}")

    upload_lines = []
    recent_uploads = try_api("GET", f"/v1/apps/{application}/buildUploads?limit=20", bearer)
    if recent_uploads:
        for item in recent_uploads[1].get("data") or []:
            attributes = item.get("attributes") or {}
            if str(attributes.get("cfBundleVersion")) != build_number:
                continue
            state = attributes.get("state")
            state_name = state.get("state") if isinstance(state, dict) else state
            upload_lines.append(f"Build upload {item.get('id')}: {state_name}")
            upload_lines.extend(messages(state) or ["Build upload errors: none"])
    if not upload_lines:
        upload_lines.append("No build upload record was returned for this build number.")
    lines.extend(upload_lines)

    groups = try_api(
        "GET",
        f"/v1/betaGroups?filter[app]={application}&limit=20",
        bearer,
    )
    internal_groups = []
    if groups:
        for item in groups[1].get("data") or []:
            attributes = item.get("attributes") or {}
            lines.append(
                f"Beta group {attributes.get('name')}: "
                f"internal={attributes.get('isInternalGroup')} "
                f"allBuilds={attributes.get('hasAccessToAllBuilds')} id={item.get('id')}"
            )
            if attributes.get("isInternalGroup"):
                internal_groups.append(item)
    if not internal_groups:
        lines.append("No internal beta group exists.")

    assigned_ids = {
        item.get("id")
        for item in ((build or {}).get("relationships") or {}).get("betaGroups", {}).get("data") or []
    }
    assigned_ids.update(
        item.get("id")
        for item in included
        if item.get("type") == "betaGroups" and (item.get("attributes") or {}).get("isInternalGroup")
    )
    if build_id and processing == "VALID":
        if compliance is None:
            patched = try_api(
                "PATCH",
                f"/v1/builds/{build_id}",
                bearer,
                {
                    "data": {
                        "type": "builds",
                        "id": build_id,
                        "attributes": {"usesNonExemptEncryption": False},
                    }
                },
            )
            if patched:
                lines.append("Set usesNonExemptEncryption to false.")
                compliance = False
        missing = [item for item in internal_groups if item.get("id") not in assigned_ids]
        if not internal_groups:
            created = try_api(
                "POST",
                "/v1/betaGroups",
                bearer,
                {
                    "data": {
                        "type": "betaGroups",
                        "attributes": {
                            "name": "Internal Testers",
                            "isInternalGroup": True,
                            "hasAccessToAllBuilds": True,
                        },
                        "relationships": {"app": {"data": {"type": "apps", "id": application}}},
                    }
                },
            )
            if created:
                missing = [created[1]["data"]]
                lines.append("Created internal beta group Internal Testers.")
        for item in missing:
            added = try_api(
                "POST",
                f"/v1/betaGroups/{item['id']}/relationships/builds",
                bearer,
                {"data": [{"type": "builds", "id": build_id}]},
            )
            name = (item.get("attributes") or {}).get("name") or item.get("id")
            if added is not None:
                lines.append(f"Attached build {build_number} to internal group {name}.")
        if internal_groups and not missing:
            lines.append(f"Build {build_number} is already in the internal beta group.")
    elif build_id:
        lines.append(f"Did not attach build {build_number} because processingState is {processing}.")

    if compliance is None and build_id:
        lines.append("Export compliance is missing.")
    elif build_id:
        lines.append(f"Export compliance answer: usesNonExemptEncryption={compliance}.")

    return processing, "\n".join(lines)


def main() -> None:
    write_key()
    build_number = os.environ.get("ASC_BUILD") or "13"
    wait_seconds = int(os.environ.get("ASC_WAIT_SECONDS") or "0")
    deadline = time.time() + wait_seconds
    bearer = token()
    application = app_id(bearer)
    processing = None
    report = ""
    while True:
        bearer = token()
        processing, report = inspect(bearer, application, build_number)
        print(report)
        if processing in {"VALID", "FAILED", "INVALID"}:
            break
        if time.time() >= deadline:
            break
        print(f"Build {build_number} processingState is {processing or 'not listed yet'}. Checking again in 30 seconds.")
        time.sleep(30)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as handle:
            handle.write("### App Store Connect\n\n```\n" + report + "\n```\n")
    if wait_seconds and processing != "VALID":
        raise SystemExit(f"Build {build_number} processingState is {processing}.")


if __name__ == "__main__":
    main()
