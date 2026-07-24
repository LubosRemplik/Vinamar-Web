#!/usr/bin/env python3
"""Downloads the trip photos from Wikimedia Commons into public/images/trips/.

    python3 web/scripts/fetch-trip-photos.py

Every file listed here is CC BY / CC BY-SA / CC0. The credit string is what the
site prints under the photo (see the `imageCredit` field of each trip markdown) —
keep the two in sync, and never add a file without checking its licence first.
"""
import os
import subprocess
import sys

DEST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "images", "trips")
UA = "VinamarWeb/1.0 (photo sourcing for a private holiday-let site)"

# slug → (Commons file name, credit line)
# output basename (without .jpg) → (Commons file, credit)
PHOTOS = {
    "solna-jezera": (
        "Lagunas de la Mata y Torrevieja 01a.JPG",
        "L-Bit, CC BY-SA 4.0",
    ),
    "trhy": (
        "At the market in Torrevieja.jpg",
        "Flickr, CC BY 2.0",
    ),
    "tabarca": (
        "Tabarca Island-Alicante (Spain) - 48502403002 (cropped).jpg",
        "Jose A., CC BY 2.0",
    ),
    "elche": (
        "Palmeral, Elche, España, 2014-07-05, DD 23.JPG",
        "Diego Delso, CC BY-SA 4.0",
    ),
    "alicante": (
        "Explanada de España.jpg",
        "Lance and Erin, CC BY 2.0",
    ),
    "alicante-02": (
        "Playa del Postiguet 4.jpg",
        "kallerna, CC BY-SA 4.0",
    ),
    "alicante-03": (
        "Alicante Castillo de Santa Bárbara 01.jpg",
        "H.Helmlechner, CC BY-SA 4.0",
    ),
    "alicante-04": (
        "Pasarela Puerto de Alicante con el castillo Santa Bárbara de fondo.jpg",
        "Laborinquen, CC0",
    ),
    "cartagena": (
        "Teatro romano de Cartagena, España, 2022-07-16, DD 02.jpg",
        "Diego Delso, CC BY-SA 4.0",
    ),
}


def main() -> int:
    os.makedirs(DEST, exist_ok=True)
    failures = []
    for name, (filename, credit) in PHOTOS.items():
        url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + filename.replace(" ", "_")
        out = os.path.join(DEST, f"{name}.jpg")
        result = subprocess.run(
            ["curl", "-sSL", "-A", UA, "--fail", f"{url}?width=1600", "-o", out],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            failures.append(f"{name}: {result.stderr.strip()}")
            continue
        size = os.path.getsize(out)
        if size < 20_000:
            failures.append(f"{name}: suspiciously small download ({size} B)")
            continue
        print(f"{name:<16} {size // 1024:>5} kB   {credit}")

    for f in failures:
        print(f"FAILED {f}", file=sys.stderr)
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
