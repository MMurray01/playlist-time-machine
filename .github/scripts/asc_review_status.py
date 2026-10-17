#!/usr/bin/env python3
"""Print the App Store version and review submission states.

GET requests only. This does not create, update, or delete anything.
Any HTTP method other than GET is refused.
"""

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from asc_status import write_key  # noqa: E402
from asc_upload import api as connect_api, token  # noqa: E402

APP_ID = "6823308079"
VERSION = "1.0"
SUBMISSION_ID = "be5541d9-e987-4049-a22b-85e1a6032edd"


def api(method: str, path: str, bearer: str, body=None):
    if method != "GET":
        raise SystemExit(
            f"Refusing App Store Connect {method}. This script only sends GET."
        )
    return connect_api(method, path, bearer, body)


def get(path: str, bearer: str):
    return api("GET", path, bearer)


def show(label: str, value) -> str:
    text = "not provided" if value in (None, "") else str(value)
    line = f"{label}: {text}"
    print(line)
    return line


def date_lines(attributes: dict, prefix: str) -> list[str]:
    lines = []
    for key, value in sorted(attributes.items()):
        if "date" in key.lower() or key.lower().endswith("at"):
            lines.append(show(f"{prefix} {key}", value))
    return lines


def main() -> None:
    write_key()
    bearer = token()
    lines = []

    version_path = (
        f"/v1/apps/{APP_ID}/appStoreVersions"
        f"?filter[platform]=IOS&filter[versionString]={VERSION}&limit=5"
    )
    _, version_payload = get(version_path, bearer)
    versions = version_payload.get("data") or []
    version = next(
        (
            item
            for item in versions
            if (item.get("attributes") or {}).get("versionString") == VERSION
        ),
        None,
    )
    if version is None:
        raise SystemExit(f"No iOS app store version {VERSION} was returned.")
    attributes = version.get("attributes") or {}
    lines.append(show("app id", APP_ID))
    lines.append(show("version", attributes.get("versionString")))
    lines.append(show("version id", version.get("id")))
    lines.append(show("appStoreState", attributes.get("appStoreState")))
    lines.append(show("appVersionState", attributes.get("appVersionState")))
    lines.extend(date_lines(attributes, "version"))
    if not any("date" in key.lower() or key.lower().endswith("at") for key in attributes):
        lines.append(show("version state-change timestamp", None))

    _, submission_payload = get(f"/v1/reviewSubmissions/{SUBMISSION_ID}", bearer)
    submission = submission_payload.get("data") or {}
    submission_attributes = submission.get("attributes") or {}
    lines.append(show("reviewSubmission id", submission.get("id") or SUBMISSION_ID))
    lines.append(show("reviewSubmission state", submission_attributes.get("state")))
    lines.extend(date_lines(submission_attributes, "reviewSubmission"))
    if not any(
        "date" in key.lower() or key.lower().endswith("at") for key in submission_attributes
    ):
        lines.append(show("reviewSubmission state-change timestamp", None))

    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as handle:
            handle.write("### App Store review status\n\n```\n")
            handle.write("\n".join(lines))
            handle.write("\n```\n")
    else:
        print(json.dumps({"lines": lines}))


if __name__ == "__main__":
    main()
