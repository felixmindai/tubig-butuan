"""Build data/landmarks.json: named places inside Butuan City from OpenStreetMap.

Barangay halls, markets, schools, chapels, subdivisions, puroks and sitios,
each assigned to the barangay polygon that contains it. The site uses this to
pin a tanker stop whose text names a landmark ("Barangay Hall", "Montevista",
"Purok 2"...) instead of falling back to the barangay centre.

Hand-added places (for example halls that OpenStreetMap lacks, located on
Google Maps) live in data/landmarks.extra.json and are merged in unchanged.

Usage:  python tools/build-landmarks.py [--from-cache path.json]
"""
import json, os, sys, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BBOX = "(8.85,125.45,9.06,125.75)"
QUERY = ('[out:json][timeout:60];('
         f'nwr["amenity"="townhall"]{BBOX};nwr["amenity"="marketplace"]{BBOX};nwr["amenity"="community_centre"]{BBOX};'
         f'nwr["landuse"="residential"]["name"]{BBOX};nwr["place"~"neighbourhood|quarter|hamlet|village|suburb"]["name"]{BBOX};'
         f'nwr["amenity"="place_of_worship"]["name"]{BBOX};nwr["amenity"="school"]["name"]{BBOX};nwr["man_made"="bridge"]["name"]{BBOX};'
         ');out center tags;')
MIRRORS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
UA = "tubig-butuan/0.1 (community water info hub, Butuan City)"


def fetch():
    for url in MIRRORS:
        try:
            req = urllib.request.Request(url, data=urllib.parse.urlencode({"data": QUERY}).encode(), headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.load(r)
        except Exception as e:
            print(f"  {url}: {e}")
    raise SystemExit("Overpass unavailable on all mirrors; try later or use --from-cache")


def point_in_ring(x, y, ring):
    inside = False
    for i in range(len(ring)):
        x1, y1 = ring[i]; x2, y2 = ring[i - 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            inside = not inside
    return inside


def main():
    with open(os.path.join(ROOT, "data", "barangays.json"), encoding="utf-8") as f:
        bgys = json.load(f)["features"]
    def barangay_of(lng, lat):
        for b in bgys:
            if any(point_in_ring(lng, lat, poly[0]) for poly in b["polys"]):
                return b["id"]
        return None

    if "--from-cache" in sys.argv:
        with open(sys.argv[sys.argv.index("--from-cache") + 1], encoding="utf-8") as f:
            raw = json.load(f)
    else:
        raw = fetch()

    rows = []
    for e in raw.get("elements", []):
        t = e.get("tags", {})
        lat = e.get("lat") or (e.get("center") or {}).get("lat")
        lng = e.get("lon") or (e.get("center") or {}).get("lon")
        name = t.get("name")
        if not (lat and lng and name):
            continue
        kind = t.get("amenity") or t.get("landuse") or t.get("place") or t.get("man_made")
        b = barangay_of(lng, lat)
        if b:
            rows.append({"bgy": b, "kind": kind, "name": name.replace("�", "ñ"), "lat": round(lat, 5), "lng": round(lng, 5), "src": "osm"})

    extra_path = os.path.join(ROOT, "data", "landmarks.extra.json")
    if os.path.exists(extra_path):
        with open(extra_path, encoding="utf-8") as f:
            rows.extend(json.load(f).get("landmarks", []))

    rows.sort(key=lambda r: (r["bgy"], r["kind"], r["name"]))
    out = {"source": "OpenStreetMap contributors (ODbL) via Overpass; hand-added entries from data/landmarks.extra.json", "count": len(rows), "landmarks": rows}
    path = os.path.join(ROOT, "data", "landmarks.json")
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
    print(f"wrote {os.path.relpath(path, ROOT)}: {len(rows)} landmarks ({os.path.getsize(path):,} bytes)")


if __name__ == "__main__":
    main()
