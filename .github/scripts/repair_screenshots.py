#!/usr/bin/env python3
"""List, delete, and replace version 1.0 screenshots.

Does not create a review submission and does not attach a build.
Reads ASC_KEY_ID, ASC_ISSUER_ID, and ASC_PRIVATE_KEY.
ASC_SCREENSHOT_DIR holds iphone-69, iphone-duo, and ipad-13 folders.
"""

from __future__ import annotations

import json
import os
import pathlib
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from asc_metadata import (  # noqa: E402
    call,
    english,
    ensure_screenshot_set,
    ensure_version,
    png_size,
    upload_screenshot,
)
from asc_status import write_key  # noqa: E402
from asc_upload import token  # noqa: E402

# Sizes Apple documents for each live screenshotDisplayType. APP_IPHONE_69 is
# not in the API enum; 6.9-inch pixels belong on APP_IPHONE_67.
ACCEPTED = {
    "APP_IPHONE_67": {
        (1320, 2868),
        (1290, 2796),
        (1260, 2736),
        (2868, 1320),
        (2796, 1290),
        (2736, 1260),
    },
    "APP_IPHONE_65": {(1284, 2778), (1242, 2688), (2778, 1284), (2688, 1242)},
    "APP_IPHONE_61": {(1179, 2556), (1206, 2622), (2556, 1179), (2622, 1206)},
    "APP_IPHONE_58": {(1125, 2436), (2436, 1125)},
    "APP_IPHONE_55": {(1242, 2208), (2208, 1242)},
    "APP_IPHONE_47": {(750, 1334), (1334, 750)},
    "APP_IPHONE_40": {(640, 1136), (1136, 640)},
    "APP_IPHONE_35": {(640, 960), (960, 640)},
    "APP_IPHONE_DUO": {(1398, 2034), (2007, 2853), (2034, 1398), (2853, 2007)},
    "APP_IPAD_PRO_3GEN_129": {(2048, 2732), (2064, 2752), (2732, 2048), (2752, 2064)},
    "APP_IPAD_PRO_129": {(2048, 2732), (2732, 2048)},
    "APP_IPAD_PRO_3GEN_11": {
        (1668, 2388),
        (1668, 2420),
        (1640, 2360),
        (1488, 2266),
        (2388, 1668),
        (2420, 1668),
        (2360, 1640),
        (2266, 1488),
    },
    "APP_IPAD_105": {(1668, 2224), (2224, 1668)},
    "APP_IPAD_97": {(1536, 2048), (2048, 1536), (768, 1024), (1024, 768)},
}
PORTRAIT = {
    "APP_IPHONE_67": {(1320, 2868), (1290, 2796), (1260, 2736)},
    "APP_IPHONE_DUO": {(1398, 2034), (2007, 2853)},
    "APP_IPAD_PRO_3GEN_129": {(2048, 2732), (2064, 2752)},
}
UPLOADS = (
    ("iphone-69", "APP_IPHONE_67", "iPhone 6.9-inch"),
    ("iphone-duo", "APP_IPHONE_DUO", "iPhone Duo"),
    ("ipad-13", "APP_IPAD_PRO_3GEN_129", "iPad 13-inch"),
)
TERMINAL = {"COMPLETE", "FAILED"}


def size_of(record: dict) -> tuple[int, int] | None:
    width = record.get("width")
    height = record.get("height")
    if not width or not height:
        return None
    return int(width), int(height)


def record_of(item: dict, display_type: str, screenshot_set: str) -> dict:
    attributes = item.get("attributes") or {}
    asset = attributes.get("imageAsset") or {}
    delivery = attributes.get("assetDeliveryState") or {}
    return {
        "id": item.get("id"),
        "setId": screenshot_set,
        "fileName": attributes.get("fileName"),
        "displayType": display_type,
        "width": asset.get("width"),
        "height": asset.get("height"),
        "assetDeliveryState": delivery.get("state"),
        "errors": delivery.get("errors") or [],
        "warnings": delivery.get("warnings") or [],
    }


def matches(record: dict) -> bool:
    found = size_of(record)
    accepted = ACCEPTED.get(record["displayType"])
    if found is None or accepted is None:
        return False
    return found in accepted


def should_delete(record: dict) -> str | None:
    state = record.get("assetDeliveryState")
    if state == "FAILED":
        return "assetDeliveryState FAILED"
    found = size_of(record)
    if found is None:
        return None
    accepted = ACCEPTED.get(record["displayType"])
    if accepted is None:
        return f"{found[0]}x{found[1]} has no known size list for {record['displayType']}"
    if found not in accepted:
        return f"{found[0]}x{found[1]} is not a size for {record['displayType']}"
    return None


def localization_for(bearer: str, version: dict) -> dict | None:
    fetched = call(
        "GET",
        f"/v1/appStoreVersions/{version['id']}/appStoreVersionLocalizations?limit=20",
        bearer,
    )
    return english((fetched[1].get("data") if fetched else None) or [])


def list_sets(bearer: str, localization_id: str) -> list[dict]:
    listed = call(
        "GET",
        f"/v1/appStoreVersionLocalizations/{localization_id}/appScreenshotSets?limit=50",
        bearer,
    )
    sets = []
    for item in (listed[1].get("data") if listed else None) or []:
        display_type = (item.get("attributes") or {}).get("screenshotDisplayType")
        shots = call("GET", f"/v1/appScreenshotSets/{item['id']}/appScreenshots?limit=20", bearer)
        screenshots = [
            record_of(shot, display_type, item["id"])
            for shot in (shots[1].get("data") if shots else None) or []
        ]
        sets.append({"id": item["id"], "displayType": display_type, "screenshots": screenshots})
    return sets


def print_inventory(title: str, sets: list[dict]) -> None:
    print(f"\n{title}")
    if not sets:
        print("No screenshot sets.")
        return
    for item in sets:
        print(f"SET {item['displayType']} id={item['id']} count={len(item['screenshots'])}")
        if not item["screenshots"]:
            print("  (no screenshots)")
        for shot in item["screenshots"]:
            found = size_of(shot)
            dimensions = f"{found[0]}x{found[1]}" if found else "unknown"
            print(
                f"  {shot['id']} {shot['fileName']} {dimensions} "
                f"assetDeliveryState={shot['assetDeliveryState']} "
                f"errors={json.dumps(shot['errors'], ensure_ascii=True)} "
                f"warnings={json.dumps(shot['warnings'], ensure_ascii=True)}"
            )


def delete_screenshot(bearer: str, shot: dict, reason: str, deleted: list[dict]) -> None:
    result = call("DELETE", f"/v1/appScreenshots/{shot['id']}", bearer)
    entry = {
        "id": shot["id"],
        "fileName": shot["fileName"],
        "displayType": shot["displayType"],
        "width": shot["width"],
        "height": shot["height"],
        "assetDeliveryState": shot["assetDeliveryState"],
        "reason": reason,
        "deleted": result is not None,
    }
    deleted.append(entry)
    print(f"DELETED {entry['displayType']} {entry['fileName']} {entry['id']} ({reason})")


def source_images(folder: pathlib.Path, display_type: str) -> list[pathlib.Path]:
    if not folder.is_dir():
        return []
    accepted = PORTRAIT[display_type]
    images = []
    for image in sorted(folder.glob("*.png")):
        size = png_size(image)
        if size in accepted:
            images.append(image)
        else:
            print(f"Skipping {image.name}: {size[0]}x{size[1]} is not a portrait size for {display_type}.")
    return images


def upload_slot(
    bearer: str,
    localization: dict,
    folder: pathlib.Path,
    display_type: str,
    label: str,
    uploaded: list[dict],
) -> None:
    images = source_images(folder, display_type)
    if len(images) < 3:
        print(f"{label}: {len(images)} source files for {display_type}. Nothing uploaded.")
        return
    ready = ensure_screenshot_set(bearer, localization, (display_type,))
    if ready is None:
        print(f"{label}: could not create or find {display_type}.")
        return
    screenshot_set, actual = ready
    if actual != display_type:
        print(f"{label}: set resolved to {actual} instead of {display_type}.")
        return
    existing = call("GET", f"/v1/appScreenshotSets/{screenshot_set}/appScreenshots?limit=20", bearer)
    present = {
        (item.get("attributes") or {}).get("fileName")
        for item in (existing[1].get("data") if existing else None) or []
    }
    for image in images:
        if image.name in present:
            print(f"Keeping existing {display_type} {image.name}.")
            continue
        before = len(uploaded)
        failures: list[str] = []
        upload_screenshot(bearer, screenshot_set, image, failures)
        width, height = png_size(image)
        uploaded.append(
            {
                "fileName": image.name,
                "displayType": display_type,
                "width": width,
                "height": height,
                "uploaded": not failures,
                "error": failures[-1] if failures else "",
            }
        )
        if len(uploaded) == before:
            continue


def complete_portrait(sets: list[dict], display_type: str) -> int:
    accepted = PORTRAIT[display_type]
    count = 0
    for item in sets:
        if item["displayType"] != display_type:
            continue
        for shot in item["screenshots"]:
            found = size_of(shot)
            if shot.get("assetDeliveryState") == "COMPLETE" and found in accepted:
                count += 1
    return count


def pending(sets: list[dict]) -> bool:
    for item in sets:
        for shot in item["screenshots"]:
            state = shot.get("assetDeliveryState")
            if state not in TERMINAL or (state == "COMPLETE" and size_of(shot) is None):
                return True
    return False


def main() -> None:
    write_key()
    bearer = token()
    version = ensure_version(bearer)
    if version is None:
        raise SystemExit("Version 1.0 was not found.")
    state = (version.get("attributes") or {}).get("appStoreState")
    print(f"Version state: {state}. This script does not submit for review.")
    localization = localization_for(bearer, version)
    if localization is None:
        raise SystemExit("Version 1.0 has no localization.")

    root = pathlib.Path(os.environ.get("ASC_SCREENSHOT_DIR") or "")
    deleted: list[dict] = []
    uploaded: list[dict] = []
    removed_sets: list[dict] = []

    before = list_sets(bearer, localization["id"])
    print_inventory("BEFORE", before)

    for item in before:
        for shot in item["screenshots"]:
            reason = should_delete(shot)
            if reason:
                delete_screenshot(bearer, shot, reason, deleted)

    for folder_name, display_type, label in UPLOADS:
        upload_slot(bearer, localization, root / folder_name, display_type, label, uploaded)

    deadline = time.time() + 12 * 60
    current = list_sets(bearer, localization["id"])
    while pending(current) and time.time() < deadline:
        print("Waiting for screenshot processing.")
        time.sleep(20)
        current = list_sets(bearer, localization["id"])

    for item in current:
        for shot in list(item["screenshots"]):
            reason = should_delete(shot)
            if reason:
                delete_screenshot(bearer, shot, reason, deleted)

    # An empty legacy 12.9-inch set is not the 13-inch slot. Remove it once its
    # screenshots are gone so review does not keep a wrong display type.
    current = list_sets(bearer, localization["id"])
    for item in current:
        if item["displayType"] == "APP_IPAD_PRO_129" and not item["screenshots"]:
            result = call("DELETE", f"/v1/appScreenshotSets/{item['id']}", bearer)
            removed_sets.append(
                {"id": item["id"], "displayType": item["displayType"], "deleted": result is not None}
            )
            print(f"DELETED SET {item['displayType']} {item['id']}")

    final = list_sets(bearer, localization["id"])
    print_inventory("AFTER", final)
    print("\nUPLOADED")
    if not uploaded:
        print("No new files were uploaded.")
    for item in uploaded:
        print(
            f"  {item['displayType']} {item['fileName']} {item['width']}x{item['height']} "
            f"uploaded={item['uploaded']} {item['error']}"
        )

    problems = []
    for item in final:
        for shot in item["screenshots"]:
            if shot.get("assetDeliveryState") != "COMPLETE":
                problems.append(f"{shot['fileName']} on {item['displayType']} is {shot.get('assetDeliveryState')}")
            elif not matches(shot):
                problems.append(f"{shot['fileName']} on {item['displayType']} is the wrong size")
    iphone = complete_portrait(final, "APP_IPHONE_67")
    ipad = complete_portrait(final, "APP_IPAD_PRO_3GEN_129")
    duo = complete_portrait(final, "APP_IPHONE_DUO")
    duo_sources = len(source_images(root / "iphone-duo", "APP_IPHONE_DUO"))
    print(f"COMPLETE portrait counts: iPhone 6.9-inch APP_IPHONE_67={iphone}, iPad APP_IPAD_PRO_3GEN_129={ipad}, Duo APP_IPHONE_DUO={duo}")
    print("APP_IPHONE_DUO is a valid screenshotDisplayType. APP_IPHONE_69 is not.")
    if duo_sources < 3:
        print("No captured Duo screenshots at 1398x2034 or 2007x2853 were available to upload.")
    if iphone < 3:
        problems.append(f"APP_IPHONE_67 has {iphone} complete portrait screenshots")
    if ipad < 3:
        problems.append(f"APP_IPAD_PRO_3GEN_129 has {ipad} complete portrait screenshots")
    if duo_sources >= 3 and duo < 3:
        problems.append(f"APP_IPHONE_DUO has {duo} complete portrait screenshots")

    report = {
        "versionState": state,
        "deleted": deleted,
        "uploaded": uploaded,
        "removedSets": removed_sets,
        "final": final,
        "problems": problems,
        "submitted": False,
    }
    destination = pathlib.Path(os.environ.get("ASC_RESULT_PATH") or "/tmp/screenshot-repair.json")
    destination.write_text(json.dumps(report, indent=2) + "\n")
    print(f"Wrote {destination}")
    if problems:
        print("REPAIR PROBLEMS: " + "; ".join(problems))
        raise SystemExit(1)
    print("Every remaining screenshot is COMPLETE. Did not submit for review.")


if __name__ == "__main__":
    main()
