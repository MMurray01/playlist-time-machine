#!/usr/bin/env python3
"""Capture App Store screenshots on the macOS runner.

Writes one folder per device class under ASC_SCREENSHOT_DIR (or RUNNER_TEMP/shots).
Does not stretch an iPhone capture onto another device. Each folder comes from
the matching simulator, at that simulator's native pixel size.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
IOS = ROOT / "ios"
OUTPUT = Path(os.environ.get("RUNNER_TEMP") or "/tmp") / "shots"

SLOTS = (
    {
        "folder": "iphone-69",
        "label": "iPhone 6.9-inch",
        "sizes": ("1320x2868", "1290x2796", "1260x2736"),
        "exact": ("iPhone 17 Pro Max", "iPhone 16 Pro Max", "iPhone 15 Pro Max", "iPhone 14 Pro Max"),
        "contains": (),
    },
    {
        "folder": "iphone-duo",
        "label": "iPhone Duo",
        "sizes": ("2007x2853", "1398x2034"),
        "exact": ("iPhone Duo",),
        "contains": ("Duo", "iPhone Air"),
    },
    {
        "folder": "ipad-13",
        "label": "iPad 13-inch",
        "sizes": ("2064x2752", "2048x2732"),
        "exact": (),
        "contains": (
            "iPad Pro 13",
            "iPad Pro (13",
            "iPad Air 13",
            "iPad Air (13",
            "iPad Pro (12.9",
            "iPad Pro 12.9",
        ),
    },
)


def run(command: list[str], cwd: Path | None = None, check: bool = True) -> subprocess.CompletedProcess:
    print("+", " ".join(command), flush=True)
    return subprocess.run(command, cwd=cwd, check=check, text=True)


def png_size(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
    return int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")


def simulators() -> list[dict]:
    raw = subprocess.check_output(["xcrun", "simctl", "list", "devices", "available", "-j"], text=True)
    found = []
    for runtime, entries in json.loads(raw)["devices"].items():
        if "iOS" not in runtime:
            continue
        for device in entries:
            if device.get("isAvailable", True):
                found.append(
                    {
                        "runtime": runtime,
                        "name": device.get("name") or "",
                        "udid": device["udid"],
                    }
                )
    return found


def rank(device: dict, slot: dict) -> tuple:
    name = device["name"]
    exact = slot["exact"]
    if name in exact:
        return (0, exact.index(name))
    lowered = name.lower()
    for index, needle in enumerate(slot["contains"]):
        if needle.lower() in lowered:
            return (1, index)
    return (9, 0)


def candidates(devices: list[dict], slot: dict) -> list[dict]:
    matched = [device for device in devices if rank(device, slot)[0] < 9]
    matched.sort(key=lambda device: device["runtime"], reverse=True)
    matched.sort(key=lambda device: rank(device, slot))
    return matched


def measure(udid: str, probe: Path) -> str:
    subprocess.run(["xcrun", "simctl", "boot", udid], check=False)
    run(["xcrun", "simctl", "bootstatus", udid, "-b"])
    run(["xcrun", "simctl", "io", udid, "screenshot", str(probe)])
    width, height = png_size(probe)
    return f"{width}x{height}"


def shutdown(udid: str) -> None:
    subprocess.run(["xcrun", "simctl", "shutdown", udid], check=False)


def choose(devices: list[dict], slot: dict, probe: Path) -> tuple[dict, str] | None:
    pool = candidates(devices, slot)
    if not pool:
        names = sorted({device["name"] for device in devices})
        print(f"No simulator name matched {slot['label']}. Installed: {', '.join(names)}")
        return None
    accepted = set(slot["sizes"])
    for device in pool:
        print(f"Probing {device['name']} ({device['udid']}) for {slot['label']}")
        try:
            size = measure(device["udid"], probe)
        except subprocess.CalledProcessError as error:
            print(f"{device['name']} could not take a screenshot: {error}")
            shutdown(device["udid"])
            continue
        print(f"{device['name']} screenshot is {size}")
        if size in accepted:
            print(f"Using {device['name']} for {slot['label']}")
            return device, size
        shutdown(device["udid"])
    return None


def capture(device: dict, slot: dict, size: str) -> bool:
    folder = OUTPUT / slot["folder"]
    folder.mkdir(parents=True, exist_ok=True)
    raw = Path("/tmp/ptm-screenshots")
    if raw.exists():
        for child in raw.iterdir():
            child.unlink()
    config = {
        "directory": "/tmp/ptm-screenshots",
        "sizes": [size],
    }
    Path("/tmp/ptm-shot-config.json").write_text(json.dumps(config))
    udid = device["udid"]
    status = subprocess.run(
        [
            "xcrun", "simctl", "status_bar", udid, "override",
            "--time", "9:41",
            "--batteryState", "charged",
            "--batteryLevel", "100",
            "--wifiBars", "3",
            "--cellularMode", "active",
            "--cellularBars", "4",
        ],
        check=False,
    )
    if status.returncode != 0:
        subprocess.run(
            [
                "xcrun", "simctl", "status_bar", udid, "override",
                "--time", "9:41",
                "--batteryState", "charged",
                "--batteryLevel", "100",
            ],
            check=False,
        )
    result = subprocess.run(
        [
            "xcodebuild", "test",
            "-project", "PlaylistTimeMachine.xcodeproj",
            "-scheme", "PlaylistTimeMachine",
            "-destination", f"platform=iOS Simulator,id={udid}",
            "-only-testing:PlaylistTimeMachineUITests/ScreenshotTests/testStoreScreenshots",
            "CODE_SIGNING_ALLOWED=NO",
        ],
        cwd=IOS,
    )
    images = sorted(raw.glob("*.png")) if raw.is_dir() else []
    if result.returncode != 0 or len(images) < 3:
        print(f"{slot['label']} capture failed ({len(images)} files, exit {result.returncode})")
        shutdown(udid)
        return False
    for image in images:
        target = folder / image.name
        target.write_bytes(image.read_bytes())
        width, height = png_size(target)
        print(f"Saved {slot['folder']}/{image.name} {width}x{height}")
    shutdown(udid)
    return True


def maybe_select_newer_xcode(devices: list[dict]) -> list[dict]:
    names = " ".join(device["name"] for device in devices)
    if "Duo" in names:
        return devices
    apps = sorted(Path("/Applications").glob("Xcode_*.app"))
    current = subprocess.check_output(["xcode-select", "-p"], text=True).strip()
    newer = [app for app in apps if str(app) not in current]
    if not newer:
        return devices
    chosen = newer[-1]
    print(f"Current Xcode has no iPhone Duo simulator. Trying {chosen}")
    switched = subprocess.run(["sudo", "xcode-select", "-s", str(chosen)], check=False)
    if switched.returncode != 0:
        return devices
    subprocess.run(["xcodebuild", "-version"], check=False)
    return simulators()


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    devices = maybe_select_newer_xcode(simulators())
    probe = Path(os.environ.get("RUNNER_TEMP") or "/tmp") / "ptm-probe.png"
    failed = []
    for slot in SLOTS:
        chosen = choose(devices, slot, probe)
        if chosen is None or not capture(chosen[0], slot, chosen[1]):
            failed.append(slot["label"])
    if failed:
        print("SCREENSHOT GAPS: " + ", ".join(failed))
        raise SystemExit(1)
    print("Captured every screenshot class.")


if __name__ == "__main__":
    main()
