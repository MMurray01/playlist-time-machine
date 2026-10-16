#!/usr/bin/env python3
"""Fill in App Store version 1.0 for Playlist Time Machine.

Does not create a review submission. Reads ASC_KEY_ID, ASC_ISSUER_ID, and
ASC_PRIVATE_KEY. Optional ASC_SCREENSHOT_DIR is a folder of 6.9-inch PNGs.
Optional ASC_WAIT_SECONDS is how long to wait for a TestFlight build above 26.
"""

import hashlib
import json
import os
import pathlib
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from asc_status import write_key  # noqa: E402
from asc_upload import api, send_chunk, token  # noqa: E402

APP_ID = "6823308079"
VERSION = "1.0"
MIN_BUILD = 26
NAME = "Playlist Time Machine"
SUBTITLE = "Number one hits by year"
COPYRIGHT = "2026 Abeba Co"
MARKETING_URL = "https://www.playlisttimemachine.com"
SUPPORT_URL = "https://www.playlisttimemachine.com/how-it-works"
PRIVACY_URL = "https://www.playlisttimemachine.com/privacy"
KEYWORDS = (
    "graduation,high school,nostalgia,playlist,class reunion,"
    "yearbook,number one,hits,memories,soundtrack"
)
DESCRIPTION = """Playlist Time Machine builds a playlist of number one hits from the years around high school.

Enter the year you graduated. The app gathers every number one hit from five years before that year through five years after, in the order those songs reached the top. Browse the songs as a cover collage or a list. Play a 30 second preview, or open a song in Apple Music.

Save the playlist to your Apple Music library. Save the collage to Photos. Share a link that opens the same playlist for someone else.

A 30 second preview plays inside the app and does not require an Apple Music subscription or a sign-in. Saving a playlist to your library uses Apple Music and asks for your permission.

Playlist Time Machine is a product of Abeba Co."""
REVIEW_NOTES = """No demo account is required.

30 second song previews play inside the app from public iTunes preview URLs. They do not require an Apple Music subscription or a sign-in.

Listen on Apple Music opens the song in the Apple Music app. If this device is already authorized for Apple Music and the Apple ID can play the catalog, the app starts playback and then opens the Apple Music app. Otherwise it opens the song page in Apple Music, and the reviewer taps play there. The app does not show an Apple Music login screen for this button.

Save to Apple Music asks for Apple Music permission and creates a playlist in the library. If permission is denied, the app explains that and offers Open Settings. Declining permission does not block previews.

To review: enter a high school graduation year such as 1995, tap Build my playlist, open a song, tap :30 Preview, then tap Listen on Apple Music. The Save to Apple Music sheet is the Apple Music item in the bar at the bottom of the playlist."""

AGE_RATINGS = {
    "alcoholTobaccoOrDrugUseOrReferences": "NONE",
    "contests": "NONE",
    "gamblingSimulated": "NONE",
    "gunsOrOtherWeapons": "NONE",
    "horrorOrFearThemes": "NONE",
    "matureOrSuggestiveThemes": "NONE",
    "medicalOrTreatmentInformation": "NONE",
    "profanityOrCrudeHumor": "NONE",
    "sexualContentGraphicAndNudity": "NONE",
    "sexualContentOrNudity": "NONE",
    "violenceCartoonOrFantasy": "NONE",
    "violenceRealistic": "NONE",
    "violenceRealisticProlongedGraphicOrSadistic": "NONE",
}
AGE_BOOLEANS = {
    "advertising": False,
    "ageAssurance": False,
    "gambling": False,
    "healthOrWellnessTopics": False,
    "lootBox": False,
    "messagingAndChat": False,
    "parentalControls": False,
    "socialMedia": False,
    "socialMediaAgeRestricted": False,
    "unrestrictedWebAccess": False,
    "userGeneratedContent": False,
}
SCREENSHOT_TYPES = ("APP_IPHONE_69", "APP_IPHONE_67")
ACCEPTED_SIZES = {(1320, 2868), (1290, 2796), (1260, 2736)}


def check_copy() -> None:
    banned = ("—", "–", "billboard", "Billboard")
    blob = "\n".join([SUBTITLE, KEYWORDS, DESCRIPTION, REVIEW_NOTES, COPYRIGHT, NAME])
    for word in banned:
        if word.lower() in blob.lower() if word.isalpha() else word in blob:
            raise SystemExit(f"Store copy contains {word!r}.")
    if len(SUBTITLE) > 30:
        raise SystemExit(f"Subtitle is {len(SUBTITLE)} characters. The limit is 30.")
    if len(KEYWORDS) > 100:
        raise SystemExit(f"Keywords are {len(KEYWORDS)} characters. The limit is 100.")
    if len(DESCRIPTION) > 4000:
        raise SystemExit("Description is over 4000 characters.")


def call(method: str, path: str, bearer: str, body=None):
    try:
        return api(method, path, bearer, body)
    except SystemExit as error:
        print(f"FAILED {method} {path}: {error}")
        return None


def english(items):
    usable = [item for item in items if item.get("id")]
    for item in usable:
        if (item.get("attributes") or {}).get("locale") == "en-US":
            return item
    for item in usable:
        if str((item.get("attributes") or {}).get("locale") or "").startswith("en"):
            return item
    return usable[0] if usable else None


def related(resource, name: str) -> str | None:
    relationship = (resource.get("relationships") or {}).get(name) or {}
    data = relationship.get("data")
    if isinstance(data, dict) and data.get("id"):
        kind = data.get("type")
        return f"/v1/{kind}/{data['id']}"
    link = (relationship.get("links") or {}).get("related")
    if isinstance(link, str) and "api.appstoreconnect.apple.com" in link:
        return link.split("api.appstoreconnect.apple.com", 1)[1]
    return None


def ensure_version(bearer: str):
    listed = call(
        "GET",
        f"/v1/apps/{APP_ID}/appStoreVersions?filter[platform]=IOS&filter[versionString]={VERSION}&limit=5",
        bearer,
    )
    versions = (listed[1].get("data") if listed else None) or []
    if versions:
        version = versions[0]
        print(f"Version {VERSION} id {version['id']} state {(version.get('attributes') or {}).get('appStoreState')}")
        return version
    created = call(
        "POST",
        "/v1/appStoreVersions",
        bearer,
        {
            "data": {
                "type": "appStoreVersions",
                "attributes": {
                    "platform": "IOS",
                    "versionString": VERSION,
                    "copyright": COPYRIGHT,
                },
                "relationships": {"app": {"data": {"type": "apps", "id": APP_ID}}},
            }
        },
    )
    if not created:
        return None
    print(f"Created version {VERSION} id {created[1]['data']['id']}.")
    return created[1]["data"]


def set_app_info(bearer: str, failures: list[str]) -> str | None:
    listed = call("GET", f"/v1/apps/{APP_ID}/appInfos?include=appInfoLocalizations&limit=10", bearer)
    if not listed:
        failures.append("app info")
        return None
    infos = listed[1].get("data") or []
    if not infos:
        failures.append("app info missing")
        return None
    info = infos[0]
    info_id = info["id"]
    print(f"App info {info_id} state {(info.get('attributes') or {}).get('appStoreState')}")
    category = call(
        "PATCH",
        f"/v1/appInfos/{info_id}",
        bearer,
        {
            "data": {
                "type": "appInfos",
                "id": info_id,
                "relationships": {
                    "primaryCategory": {"data": {"type": "appCategories", "id": "MUSIC"}}
                },
            }
        },
    )
    if category:
        print("Primary category: Music")
    else:
        failures.append("primary category Music")

    localizations = [
        item
        for item in (listed[1].get("included") or [])
        if item.get("type") == "appInfoLocalizations"
    ]
    if not localizations:
        fetched = call("GET", f"/v1/appInfos/{info_id}/appInfoLocalizations?limit=20", bearer)
        localizations = (fetched[1].get("data") if fetched else None) or []
    localization = english(localizations)
    if localization is None:
        failures.append("app info localization")
        return info_id
    attributes = {
        "name": NAME,
        "subtitle": SUBTITLE,
        "privacyPolicyUrl": PRIVACY_URL,
    }
    patched = call(
        "PATCH",
        f"/v1/appInfoLocalizations/{localization['id']}",
        bearer,
        {"data": {"type": "appInfoLocalizations", "id": localization["id"], "attributes": attributes}},
    )
    if patched is None:
        attributes.pop("name")
        patched = call(
            "PATCH",
            f"/v1/appInfoLocalizations/{localization['id']}",
            bearer,
            {"data": {"type": "appInfoLocalizations", "id": localization["id"], "attributes": attributes}},
        )
    if patched:
        saved = patched[1]["data"].get("attributes") or {}
        print(f"App name: {saved.get('name')}")
        print(f"Subtitle: {saved.get('subtitle')}")
        print(f"Privacy policy URL: {saved.get('privacyPolicyUrl')}")
    else:
        failures.append("name, subtitle, or privacy policy URL")
    return info_id


def set_version_text(bearer: str, version: dict, failures: list[str]) -> dict | None:
    version_id = version["id"]
    copyright_patch = call(
        "PATCH",
        f"/v1/appStoreVersions/{version_id}",
        bearer,
        {
            "data": {
                "type": "appStoreVersions",
                "id": version_id,
                "attributes": {"copyright": COPYRIGHT},
            }
        },
    )
    if copyright_patch:
        print(f"Copyright: {(copyright_patch[1]['data'].get('attributes') or {}).get('copyright')}")
    else:
        failures.append("copyright")

    fetched = call("GET", f"/v1/appStoreVersions/{version_id}/appStoreVersionLocalizations?limit=20", bearer)
    localizations = (fetched[1].get("data") if fetched else None) or []
    localization = english(localizations)
    attributes = {
        "description": DESCRIPTION,
        "keywords": KEYWORDS,
        "marketingUrl": MARKETING_URL,
        "supportUrl": SUPPORT_URL,
    }
    if localization is None:
        created = call(
            "POST",
            "/v1/appStoreVersionLocalizations",
            bearer,
            {
                "data": {
                    "type": "appStoreVersionLocalizations",
                    "attributes": {"locale": "en-US", **attributes},
                    "relationships": {
                        "appStoreVersion": {"data": {"type": "appStoreVersions", "id": version_id}}
                    },
                }
            },
        )
        if not created:
            failures.append("version localization")
            return None
        localization = created[1]["data"]
        print(f"Created en-US version localization {localization['id']}.")
    else:
        patched = call(
            "PATCH",
            f"/v1/appStoreVersionLocalizations/{localization['id']}",
            bearer,
            {
                "data": {
                    "type": "appStoreVersionLocalizations",
                    "id": localization["id"],
                    "attributes": attributes,
                }
            },
        )
        if not patched:
            failures.append("description, keywords, support URL, or marketing URL")
            return localization
        localization = patched[1]["data"]
    saved = localization.get("attributes") or {}
    print(f"Locale: {saved.get('locale')}")
    print(f"Support URL: {saved.get('supportUrl')}")
    print(f"Marketing URL: {saved.get('marketingUrl')}")
    print(f"Keywords: {saved.get('keywords')}")
    print("Description:")
    print(saved.get("description") or DESCRIPTION)
    return localization


def set_age_rating(bearer: str, app_info_id: str | None, failures: list[str]) -> None:
    if not app_info_id:
        failures.append("age rating declaration")
        return
    fetched = call("GET", f"/v1/appInfos/{app_info_id}/ageRatingDeclaration", bearer)
    declaration = fetched[1].get("data") if fetched else None
    if not declaration:
        failures.append("age rating declaration")
        return
    declaration_id = declaration["id"]
    current = declaration.get("attributes") or {}
    known = {**AGE_RATINGS, **AGE_BOOLEANS}
    attributes = {key: known[key] for key in current if key in known}
    if not attributes:
        attributes = dict(known)
    # Send the full questionnaire. Apple ignores nothing we know about; unknown keys are retried one by one.
    patched = call(
        "PATCH",
        f"/v1/ageRatingDeclarations/{declaration_id}",
        bearer,
        {"data": {"type": "ageRatingDeclarations", "id": declaration_id, "attributes": attributes}},
    )
    if patched:
        saved = patched[1]["data"].get("attributes") or {}
        print("Age rating answers:")
        for key in sorted(attributes):
            print(f"  {key}: {saved.get(key, attributes[key])}")
        return
    print("Age rating rejected the full update. Trying one answer at a time.")
    saved_keys = []
    for key, value in attributes.items():
        single = call(
            "PATCH",
            f"/v1/ageRatingDeclarations/{declaration_id}",
            bearer,
            {"data": {"type": "ageRatingDeclarations", "id": declaration_id, "attributes": {key: value}}},
        )
        if single:
            saved_keys.append(key)
        else:
            failures.append(f"age rating {key}")
    print("Age rating answers saved: " + ", ".join(saved_keys))


def set_review_notes(bearer: str, version: dict, failures: list[str]) -> None:
    path = related(version, "appStoreReviewDetail")
    detail = None
    if path:
        fetched = call("GET", path, bearer)
        detail = fetched[1].get("data") if fetched else None
    if detail is None:
        fetched = call("GET", f"/v1/appStoreVersions/{version['id']}/appStoreReviewDetail", bearer)
        detail = fetched[1].get("data") if fetched else None
    attributes = {"notes": REVIEW_NOTES, "demoAccountRequired": False}
    existing = (detail or {}).get("attributes") or {}
    kept = []
    for key in ("contactFirstName", "contactLastName", "contactEmail", "contactPhone"):
        value = existing.get(key)
        if value:
            attributes[key] = value
            kept.append(key)
    if kept:
        print("Keeping review contact fields: " + ", ".join(kept))
    if detail:
        patched = call(
            "PATCH",
            f"/v1/appStoreReviewDetails/{detail['id']}",
            bearer,
            {"data": {"type": "appStoreReviewDetails", "id": detail["id"], "attributes": attributes}},
        )
        if patched:
            print("Review notes saved. Demo account required: false.")
            print(REVIEW_NOTES)
            return
        failures.append("review notes")
        return
    created = call(
        "POST",
        "/v1/appStoreReviewDetails",
        bearer,
        {
            "data": {
                "type": "appStoreReviewDetails",
                "attributes": attributes,
                "relationships": {
                    "appStoreVersion": {"data": {"type": "appStoreVersions", "id": version["id"]}}
                },
            }
        },
    )
    if created:
        print("Review notes created. Demo account required: false.")
        print(REVIEW_NOTES)
    else:
        failures.append("review notes")


def usage_id(resource, name: str) -> str:
    data = ((resource.get("relationships") or {}).get(name) or {}).get("data") or {}
    return str(data.get("id") or "")


def set_privacy(bearer: str, failures: list[str], manual: list[str]) -> None:
    listed = call(
        "GET",
        f"/v1/apps/{APP_ID}/appDataUsages?include=category,purpose,dataProtection&limit=50",
        bearer,
    )
    if listed is None:
        manual.append(
            "App Privacy. The public App Store Connect API has no nutrition-label resource. "
            "In App Store Connect, declare Other User Content for the graduation year and playlist "
            "name stored when a share link is created. Purpose: App Functionality. "
            "Not linked to identity. Not used for tracking. No other data types."
        )
        return
    existing = listed[1].get("data") or []
    wanted = ("OTHER_USER_CONTENT", "APP_FUNCTIONALITY", "DATA_NOT_LINKED_TO_YOU")
    matches = [
        item
        for item in existing
        if (
            usage_id(item, "category"),
            usage_id(item, "purpose"),
            usage_id(item, "dataProtection"),
        )
        == wanted
    ]
    extras = [item for item in existing if item not in matches]
    for item in extras:
        removed = call("DELETE", f"/v1/appDataUsages/{item['id']}", bearer)
        if removed is None:
            failures.append(f"remove privacy row {item['id']}")
        else:
            print(f"Removed privacy row {item['id']}.")
    if matches:
        print(
            "Privacy already declares Other User Content, app functionality, "
            "not linked to identity."
        )
    else:
        created = call(
            "POST",
            "/v1/appDataUsages",
            bearer,
            {
                "data": {
                    "type": "appDataUsages",
                    "relationships": {
                        "app": {"data": {"type": "apps", "id": APP_ID}},
                        "category": {"data": {"type": "appDataUsageCategories", "id": "OTHER_USER_CONTENT"}},
                        "purpose": {"data": {"type": "appDataUsagePurposes", "id": "APP_FUNCTIONALITY"}},
                        "dataProtection": {
                            "data": {"type": "appDataUsageDataProtections", "id": "DATA_NOT_LINKED_TO_YOU"}
                        },
                    },
                }
            },
        )
        if created:
            print(
                "Privacy: Other User Content (graduation year and playlist name), "
                "purpose App Functionality, not linked to identity, not used for tracking."
            )
        else:
            failures.append("app privacy answers")
            return
    state = call("GET", f"/v1/apps/{APP_ID}/dataUsagePublishState", bearer)
    publish = state[1].get("data") if state else None
    if not publish:
        failures.append("privacy publish state")
        return
    if (publish.get("attributes") or {}).get("published") is True and not extras and matches:
        print("Privacy answers are already published.")
        return
    published = call(
        "PATCH",
        f"/v1/appDataUsagesPublishState/{publish['id']}",
        bearer,
        {
            "data": {
                "type": "appDataUsagesPublishState",
                "id": publish["id"],
                "attributes": {"published": True},
            }
        },
    )
    if published:
        print(f"Privacy published: {(published[1]['data'].get('attributes') or {}).get('published')}")
    else:
        failures.append("publish privacy answers")


def png_size(path: pathlib.Path) -> tuple[int, int]:
    data = path.read_bytes()
    return int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")


def upload_screenshot(bearer: str, screenshot_set: str, path: pathlib.Path, failures: list[str]) -> None:
    data = path.read_bytes()
    digest = hashlib.md5(data).hexdigest()
    reserved = call(
        "POST",
        "/v1/appScreenshots",
        bearer,
        {
            "data": {
                "type": "appScreenshots",
                "attributes": {"fileName": path.name, "fileSize": len(data)},
                "relationships": {
                    "appScreenshotSet": {"data": {"type": "appScreenshotSets", "id": screenshot_set}}
                },
            }
        },
    )
    if not reserved:
        failures.append(f"reserve screenshot {path.name}")
        return
    screenshot = reserved[1]["data"]
    operations = (screenshot.get("attributes") or {}).get("uploadOperations") or []
    if not operations:
        failures.append(f"screenshot upload instructions {path.name}")
        return
    for index, operation in enumerate(operations, start=1):
        offset = int(operation["offset"])
        length = int(operation["length"])
        headers = {item["name"]: item["value"] for item in operation.get("requestHeaders") or []}
        try:
            send_chunk(
                operation["method"],
                operation["url"],
                headers,
                data[offset : offset + length],
                index,
                len(operations),
            )
        except SystemExit as error:
            print(error)
            failures.append(f"upload screenshot {path.name}")
            return
    committed = call(
        "PATCH",
        f"/v1/appScreenshots/{screenshot['id']}",
        bearer,
        {
            "data": {
                "type": "appScreenshots",
                "id": screenshot["id"],
                "attributes": {"uploaded": True, "sourceFileChecksum": digest},
            }
        },
    )
    if committed is None:
        committed = call(
            "PATCH",
            f"/v1/appScreenshots/{screenshot['id']}",
            bearer,
            {
                "data": {
                    "type": "appScreenshots",
                    "id": screenshot["id"],
                    "attributes": {"uploaded": True},
                }
            },
        )
    if committed:
        print(f"Uploaded screenshot {path.name}.")
    else:
        failures.append(f"commit screenshot {path.name}")


def set_screenshots(bearer: str, localization: dict | None, failures: list[str]) -> None:
    folder = pathlib.Path(os.environ.get("ASC_SCREENSHOT_DIR") or "")
    images = sorted(folder.glob("*.png")) if folder.is_dir() else []
    if not images:
        failures.append("6.9-inch screenshots were not produced")
        return
    if localization is None:
        failures.append("screenshot localization")
        return
    for image in images:
        width, height = png_size(image)
        if (width, height) not in ACCEPTED_SIZES:
            failures.append(f"{image.name} is {width}x{height}")
            return
    screenshot_set = None
    display_type = None
    for kind in SCREENSHOT_TYPES:
        listed = call(
            "GET",
            f"/v1/appStoreVersionLocalizations/{localization['id']}/appScreenshotSets"
            f"?filter[screenshotDisplayType]={kind}&limit=5",
            bearer,
        )
        found = (listed[1].get("data") if listed else None) or []
        if found:
            screenshot_set = found[0]["id"]
            display_type = kind
            break
        created = call(
            "POST",
            "/v1/appScreenshotSets",
            bearer,
            {
                "data": {
                    "type": "appScreenshotSets",
                    "attributes": {"screenshotDisplayType": kind},
                    "relationships": {
                        "appStoreVersionLocalization": {
                            "data": {"type": "appStoreVersionLocalizations", "id": localization["id"]}
                        }
                    },
                }
            },
        )
        if created:
            screenshot_set = created[1]["data"]["id"]
            display_type = kind
            break
    if not screenshot_set:
        failures.append("screenshot set")
        return
    print(f"Screenshot display type: {display_type}")
    existing = call("GET", f"/v1/appScreenshotSets/{screenshot_set}/appScreenshots?limit=20", bearer)
    for item in (existing[1].get("data") if existing else None) or []:
        call("DELETE", f"/v1/appScreenshots/{item['id']}", bearer)
    for image in images:
        upload_screenshot(bearer, screenshot_set, image, failures)


def newest_ready_build(bearer: str):
    listed = call(
        "GET",
        f"/v1/builds?filter[app]={APP_ID}&sort=-uploadedDate&limit=8"
        "&include=buildBetaDetail,betaGroups,preReleaseVersion",
        bearer,
    )
    if not listed:
        return None
    ready = []
    for item in listed[1].get("data") or []:
        attributes = item.get("attributes") or {}
        try:
            number = int(attributes.get("version"))
        except (TypeError, ValueError):
            continue
        if number <= MIN_BUILD:
            continue
        if attributes.get("processingState") != "VALID":
            continue
        if attributes.get("expired"):
            continue
        ready.append(item)
    if not ready:
        recent = []
        for item in listed[1].get("data") or []:
            attributes = item.get("attributes") or {}
            recent.append(f"{attributes.get('version')}={attributes.get('processingState')}")
        if recent:
            print("Recent builds: " + ", ".join(recent))
        return None
    ready.sort(key=lambda item: int(item["attributes"]["version"]), reverse=True)
    build = ready[0]
    included = listed[1].get("included") or []
    attributes = build.get("attributes") or {}
    print(f"Build {attributes.get('version')} id {build['id']} processingState VALID")
    print(f"usesNonExemptEncryption: {attributes.get('usesNonExemptEncryption')}")
    for item in included:
        item_attributes = item.get("attributes") or {}
        if item.get("type") == "buildBetaDetails":
            print(f"internalBuildState: {item_attributes.get('internalBuildState')}")
            print(f"externalBuildState: {item_attributes.get('externalBuildState')}")
        if item.get("type") == "betaGroups":
            print(
                "Build is in beta group "
                f"{item_attributes.get('name')} "
                f"(internal={item_attributes.get('isInternalGroup')}, "
                f"allBuilds={item_attributes.get('hasAccessToAllBuilds')})"
            )
        if item.get("type") == "preReleaseVersions":
            print(f"preReleaseVersion: {item_attributes.get('version')}")
    return build


def attach_build(bearer: str, version: dict, failures: list[str]) -> None:
    wait = int(os.environ.get("ASC_WAIT_SECONDS") or "2700")
    deadline = time.time() + wait
    build = None
    while True:
        build = newest_ready_build(bearer)
        if build or time.time() >= deadline:
            break
        print(f"No VALID build above {MIN_BUILD} yet.")
        time.sleep(30)
    if not build:
        failures.append(f"VALID build above {MIN_BUILD}")
        return
    attached = call(
        "PATCH",
        f"/v1/appStoreVersions/{version['id']}",
        bearer,
        {
            "data": {
                "type": "appStoreVersions",
                "id": version["id"],
                "relationships": {"build": {"data": {"type": "builds", "id": build["id"]}}},
            }
        },
    )
    if attached:
        print(f"Attached build {build['attributes'].get('version')} to version {VERSION}. Did not submit for review.")
    else:
        failures.append("attach build")


def main() -> None:
    check_copy()
    write_key()
    bearer = token()
    failures: list[str] = []
    manual: list[str] = []
    app_info_id = set_app_info(bearer, failures)
    version = ensure_version(bearer)
    localization = None
    if version is None:
        failures.append("version 1.0")
    else:
        localization = set_version_text(bearer, version, failures)
        refreshed = call("GET", f"/v1/appStoreVersions/{version['id']}", bearer)
        if refreshed:
            version = refreshed[1]["data"]
        set_age_rating(bearer, app_info_id, failures)
        set_review_notes(bearer, version, failures)
    set_privacy(bearer, failures, manual)
    set_screenshots(bearer, localization, failures)
    if version is not None:
        attach_build(bearer, version, failures)
    print("METADATA FAILURES: " + (", ".join(failures) if failures else "none"))
    print("NOT AVAILABLE IN THE API: " + (" | ".join(manual) if manual else "none"))
    result = pathlib.Path(os.environ.get("ASC_RESULT_PATH") or "/tmp/asc-metadata-result.json")
    result.write_text(
        json.dumps({"failures": failures, "manual": manual, "subtitle": SUBTITLE, "keywords": KEYWORDS}, indent=2)
    )
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
