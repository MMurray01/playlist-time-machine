#!/usr/bin/env python3
"""Read the latest App Store Connect build.

GET requests only. Reports processing state, export compliance, and internal
group membership. Does not create, update, or delete anything. Any HTTP method
other than GET is refused.
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from asc_status import write_key  # noqa: E402
from asc_upload import api as connect_api, token  # noqa: E402

APP_ID = "6823308079"


def api(method: str, path: str, bearer: str, body=None):
    if method != "GET":
        raise SystemExit(
            f"Refusing App Store Connect {method}. This script only sends GET."
        )
    return connect_api(method, path, bearer, body)


def show(label: str, value) -> str:
    text = "not provided" if value in (None, "") else str(value)
    return f"{label}: {text}"


def remember_group(catalog: dict, item: dict) -> None:
    if item.get("type") != "betaGroups" or not item.get("id"):
        return
    current = catalog.get(item["id"])
    if current is None:
        catalog[item["id"]] = item
        return
    current_flag = (current.get("attributes") or {}).get("isInternalGroup")
    new_flag = (item.get("attributes") or {}).get("isInternalGroup")
    if current_flag is None and new_flag is not None:
        catalog[item["id"]] = item


def report(build: dict | None, included: list | None, groups: list | None) -> list[str]:
    if not build:
        return ["No builds are listed for this app."]

    included = included or []
    groups = groups or []
    attributes = build.get("attributes") or {}
    version = attributes.get("version")
    version_text = "not provided" if version in (None, "") else str(version)
    compliance = attributes.get("usesNonExemptEncryption")
    lines = [
        show("build", version),
        show("build id", build.get("id")),
        show("processingState", attributes.get("processingState")),
        show("uploadedDate", attributes.get("uploadedDate")),
        show("usesNonExemptEncryption", compliance),
    ]
    if compliance is None:
        lines.append("Export compliance is missing.")
    else:
        lines.append(f"Export compliance answer: usesNonExemptEncryption={compliance}.")

    catalog: dict = {}
    for item in list(groups) + list(included):
        remember_group(catalog, item)
    internal = {
        item_id: item
        for item_id, item in catalog.items()
        if (item.get("attributes") or {}).get("isInternalGroup")
    }
    assigned = set()
    relationship = ((build.get("relationships") or {}).get("betaGroups") or {}).get("data") or []
    for item in relationship:
        if item.get("id"):
            assigned.add(item["id"])
    for item in included:
        if item.get("type") == "betaGroups" and item.get("id"):
            assigned.add(item["id"])

    members = [internal[item_id] for item_id in internal if item_id in assigned]
    members.sort(
        key=lambda item: (
            (item.get("attributes") or {}).get("name") or "",
            item.get("id") or "",
        )
    )
    if not internal:
        lines.append("No internal beta group exists.")
    if not members:
        lines.append(f"Build {version_text} is not in an internal group.")
    else:
        for item in members:
            name = (item.get("attributes") or {}).get("name") or item.get("id")
            lines.append(f"Build {version_text} is in internal group {name}.")
    return lines


def read_status(bearer: str) -> list[str]:
    _, payload = api(
        "GET",
        (
            f"/v1/builds?filter[app]={APP_ID}"
            "&limit=1&sort=-uploadedDate&include=betaGroups"
        ),
        bearer,
    )
    builds = payload.get("data") or []
    if not builds:
        return report(None, [], [])
    _, groups_payload = api(
        "GET",
        f"/v1/betaGroups?filter[app]={APP_ID}&limit=20",
        bearer,
    )
    return report(builds[0], payload.get("included") or [], groups_payload.get("data") or [])


def main() -> None:
    write_key()
    lines = read_status(token())
    for line in lines:
        print(line)

    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as handle:
            handle.write("### Latest build\n\n```\n")
            handle.write("\n".join(lines))
            handle.write("\n```\n")


if __name__ == "__main__":
    main()
