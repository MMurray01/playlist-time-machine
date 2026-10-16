#!/usr/bin/env python3
"""Free one Apple Development certificate when CI signing has filled the account.

Does not revoke distribution certificates. Prints types and expiration dates only.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from asc_upload import api, token  # noqa: E402

DEVELOPMENT = {"DEVELOPMENT", "IOS_DEVELOPMENT", "MAC_APP_DEVELOPMENT"}
DISTRIBUTION = {"DISTRIBUTION", "IOS_DISTRIBUTION", "MAC_APP_DISTRIBUTION"}


def main() -> None:
    bearer = token()
    try:
        _, payload = api("GET", "/v1/certificates?limit=200", bearer)
    except SystemExit as error:
        print(error)
        print("Could not list certificates. Archive will try the certificates already on the account.")
        return
    rows = []
    for cert in payload.get("data") or []:
        attributes = cert.get("attributes") or {}
        rows.append(
            {
                "id": cert.get("id"),
                "type": attributes.get("certificateType") or "",
                "name": attributes.get("displayName") or attributes.get("name") or "",
                "expires": attributes.get("expirationDate") or "",
            }
        )
    for row in sorted(rows, key=lambda item: (item["type"], item["expires"])):
        print(f"{row['type']} expires {row['expires']} name={row['name']} id={row['id']}")
    development = [row for row in rows if row["type"] in DEVELOPMENT]
    distribution = [row for row in rows if row["type"] in DISTRIBUTION]
    print(f"Development certificates: {len(development)}. Distribution certificates: {len(distribution)}.")
    if len(development) < 2:
        return
    oldest = sorted(development, key=lambda item: item["expires"])[0]
    print(
        f"Revoking the oldest development certificate {oldest['id']} "
        f"({oldest['type']}, expires {oldest['expires']}) so archive can sign."
    )
    try:
        api("DELETE", f"/v1/certificates/{oldest['id']}", bearer)
    except SystemExit as error:
        print(error)
        print("Could not revoke that certificate. Archive will try anyway.")
        return
    print("Revoked the oldest development certificate.")


if __name__ == "__main__":
    main()
