"""Import BCWD's "Water Tankers Hourly Monitoring" Google Sheet into data/schedule.json.

BCWD publishes one sheet tab per tanker per day (linked from the Butuan City
PIO's daily rationing post). Each tab lists the tanker, its capacity, the
refilling station, and every stop with scheduled and ACTUAL arrival/departure,
tanker balance, cubic metres delivered, the delivery point's static tank size,
and remarks. This script turns those tabs into schedule stops with the extra
fields, replacing whatever the schedule file held for the same date.

Usage:
  python tools/import-bcwd-monitoring.py             # import the last 3 days of tabs
  python tools/import-bcwd-monitoring.py --days 14   # look further back
  python tools/import-bcwd-monitoring.py --dry-run   # report only

Config lives in data/monitoring-source.json (published sheet id). A cache of
tab -> (tanker, date) is kept in data/monitoring-index.json so repeated runs only
re-download recent tabs. No dependencies beyond Python 3.
"""
import csv, io, json, os, re, sys, time, urllib.request
from datetime import date, datetime, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG_PATH = os.path.join(ROOT, "data", "monitoring-source.json")
INDEX_PATH = os.path.join(ROOT, "data", "monitoring-index.json")
SCHEDULE_PATH = os.path.join(ROOT, "data", "schedule.json")
UA = "tubig-butuan/0.1 (community water info hub, Butuan City)"
DRY = "--dry-run" in sys.argv
DAYS = int(sys.argv[sys.argv.index("--days") + 1]) if "--days" in sys.argv else 3


def get(url, timeout=60):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")


def load(path, default):
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return default


def save(path, data):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


# ---------- parsing one tab ----------
def parse_time(s):
    """'10:35:00 AM' -> '10:35'. Returns None when blank or unparseable."""
    s = (s or "").strip()
    if not s:
        return None
    m = re.match(r"^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AP]M)?$", s, re.I)
    if not m:
        m2 = re.match(r"^(\d{1,2}):(\d{2})$", s)
        if not m2:
            return None
        return f"{int(m2.group(1)):02d}:{m2.group(2)}"
    h, mm, ap = int(m.group(1)), m.group(2), (m.group(3) or "").upper()
    if ap == "PM" and h != 12:
        h += 12
    if ap == "AM" and h == 12:
        h = 0
    return f"{h:02d}:{mm}"


def daytime(t):
    """Rationing runs by day. Encoders sometimes flip AM/PM ('11:29 PM' for 11:29 AM);
    pull anything outside 05:00-20:59 back by 12 hours so the stop sorts where it belongs."""
    if not t:
        return t
    h, m = map(int, t.split(":"))
    if h >= 21 or h < 5:
        h = (h + 12) % 24
    return f"{h:02d}:{m:02d}"


def parse_tab(text):
    rows = list(csv.reader(io.StringIO(text)))
    info = {"date": None, "tanker": None, "capacity": None, "refill": None, "contact": None, "total": None}
    stops, in_table = [], False
    for r in rows:
        cells = [c.strip() for c in r] + [""] * 8
        a, b = cells[0], cells[1]
        m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})", a)
        if m and not info["date"]:
            info["date"] = f"{m.group(3)}-{int(m.group(1)):02d}-{int(m.group(2)):02d}"
        if a.upper() == "TANKER":
            info["tanker"] = b
        elif a.upper().startswith("TANKER CAPACITY"):
            info["capacity"] = float(b) if re.match(r"^\d+(\.\d+)?$", b) else b
        elif a.upper() == "REFILLING STATION":
            info["refill"] = b
        elif a.upper() == "TOTAL DELIVERED":
            info["total"] = float(b) if re.match(r"^\d+(\.\d+)?$", b) else b
        elif a.upper() == "CONTACT PERSONNEL":
            info["contact"] = b
        elif a.upper() == "ARRIVAL" and cells[1].upper() == "DEPARTURE":
            in_table = True
            continue
        if not in_table:
            continue
        point = cells[2]
        if not point or point.upper().startswith("[LOADING"):
            continue
        sched_a, sched_d = daytime(parse_time(cells[0])), daytime(parse_time(cells[1]))
        act_a, act_d = daytime(parse_time(cells[3])), daytime(parse_time(cells[4]))
        if not (sched_a or act_a):
            continue
        cap = None
        mc = re.search(r"\[(\d+)\]", point)
        if mc:
            cap = int(mc.group(1))
        clean = re.sub(r"\s*\[[^\]]*\]\s*", " ", point).strip()
        bgy, where = (clean.split("/", 1) + [""])[:2] if "/" in clean else (clean, "")
        stop = {
            "date": info["date"], "barangay": bgy.strip().title().replace("Bit-Os", "Bit-os"),
            "where": re.sub(r"\s+", " ", where.strip()).title().replace("Brgy", "Brgy").replace("Mrf", "MRF").replace("Pres. Res.", "Pres. Res."),
            "start": sched_a or act_a, "end": sched_d or act_d,
            "tanker": None,  # filled after the header is complete
            "actualStart": act_a, "actualEnd": act_d,
            "delivered": float(cells[6]) if re.match(r"^\d+(\.\d+)?$", cells[6]) else None,
            "balance": float(cells[5]) if re.match(r"^\d+(\.\d+)?$", cells[5]) else None,
            "tankCap": cap,
            "remarks": cells[7] or None,
            "lat": None, "lng": None, "src": "bcwd-monitoring"
        }
        stops.append(stop)
    for s in stops:
        s["tanker"] = pretty_tanker(info["tanker"])
        s["tankerCapacity"] = info["capacity"]
        s["refill"] = info["refill"]
        for k in ("actualStart", "actualEnd", "delivered", "balance", "tankCap", "remarks", "refill", "tankerCapacity"):
            if s[k] in (None, ""):
                del s[k]
    return info, stops


# Some tabs use a group of subdivisions as the "barangay" (the VCDU tanker serves
# VCDU's estates across three barangays). Infer the real barangay from the stop text.
GROUP_HINTS = [
    (re.compile(r"princess|princes|horizon", re.I), "San Vicente"),
    (re.compile(r"bridgetown|cinder", re.I), "Villa Kananga"),
    (re.compile(r"eastwood", re.I), "Baan KM 3"),
]


def load_barangay_names():
    with open(os.path.join(ROOT, "data", "barangays.json"), encoding="utf-8") as f:
        return {re.sub(r"[^a-z0-9]", "", b["name"].lower().replace("ñ", "n")) for b in json.load(f)["features"]}


def fix_barangay(stop, known):
    key = re.sub(r"[^a-z0-9]", "", stop["barangay"].lower())
    if key in known or key in ("villakanangga", "baan", "stonino"):
        return True
    for rx, bgy in GROUP_HINTS:
        if rx.search(stop["where"]):
            stop["where"] = (stop["barangay"] + " – " + stop["where"]).replace("Vcdu", "VCDU")
            stop["barangay"] = bgy
            return True
    return False


def pretty_tanker(name):
    n = (name or "").strip()
    fixes = {"CDRRMD": "CDRRMD Tanker", "BCWD": "BCWD Tanker", "PH-CHINESE FPV": "PH-Chinese Tanker", "VCDU": "VCDU Tanker"}
    if n.upper() in fixes:
        return fixes[n.upper()]
    m = re.match(r"^EQUIPARCO\s*(\d+)$", n, re.I)
    return f"EPCC Tanker {m.group(1)}" if m else n


# ---------- discovery ----------
MONTHS = {m: i for i, m in enumerate(["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"], 1)}


def date_in_name(name):
    """'CDRRMD September 7, 2026' -> '2026-09-07' (None if the tab name has no date)."""
    m = re.search(r"([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})", name or "")
    if not m or m.group(1).lower() not in MONTHS:
        return None
    return f"{m.group(3)}-{MONTHS[m.group(1).lower()]:02d}-{int(m.group(2)):02d}"


def discover_gids(pub_id):
    """The published index lists its tabs in a script block:
       items.push({name: "CDRRMD September 7, 2026", pageUrl: "...", gid: "1261789131", ...})"""
    html = get(f"https://docs.google.com/spreadsheets/d/e/{pub_id}/pubhtml")
    names = {}
    for m in re.finditer(r'items\.push\(\{name:\s*"((?:[^"\\]|\\.)*)",\s*pageUrl:\s*"[^"]*",\s*gid:\s*"(\d+)"', html):
        names[m.group(2)] = m.group(1).encode("utf-8").decode("unicode_escape")
    gids = list(names) or sorted(set(re.findall(r"gid=(\d+)", html)), key=int)
    return gids, names


def main():
    cfg = load(CFG_PATH, None)
    if not cfg or not cfg.get("pubId"):
        raise SystemExit("data/monitoring-source.json needs {\"pubId\": \"2PACX-...\"}")
    pub_id = cfg["pubId"]
    index = load(INDEX_PATH, {"tabs": {}})
    since = (date.today() - timedelta(days=DAYS)).isoformat()

    print("discovering tabs…")
    gids, names = discover_gids(pub_id)
    print(f"  {len(gids)} tabs published")
    imported = {}   # date -> list of stops
    for gid in gids:
        known = index["tabs"].get(gid)
        if known and known.get("date") and known["date"] < since and not known.get("incomplete"):
            continue   # old tab, already indexed: nothing changes
        named = date_in_name(names.get(gid))
        if named and named < since:
            index["tabs"].setdefault(gid, {"date": named, "name": names.get(gid), "tanker": None, "stops": None, "incomplete": False})
            continue   # the tab name says it is old: skip the download
        try:
            text = get(f"https://docs.google.com/spreadsheets/d/e/{pub_id}/pub?gid={gid}&single=true&output=csv")
        except Exception as e:
            print(f"  gid {gid}: fetch failed ({e})")
            continue
        info, stops = parse_tab(text)
        index["tabs"][gid] = {"date": info["date"], "tanker": pretty_tanker(info["tanker"]), "name": names.get(gid), "stops": len(stops),
                              "incomplete": not any(s.get("actualEnd") for s in stops[-1:]) if stops else True}
        if info["date"] and stops and info["date"] >= since:
            imported.setdefault(info["date"], []).extend(stops)
            print(f"  gid {gid}: {info['date']} {pretty_tanker(info['tanker'])} — {len(stops)} stops, delivered {info['total']} cu.m")
        elif info["date"]:
            print(f"  gid {gid}: {info['date']} {pretty_tanker(info['tanker'])} — skipped (older than {DAYS} days)")
        time.sleep(0.4)

    if DRY:
        print("dry run: nothing written")
        return
    save(INDEX_PATH, index)

    sched = load(SCHEDULE_PATH, {"stops": []})
    kept = [s for s in sched.get("stops", []) if s.get("date") not in imported]
    new = []
    known = load_barangay_names()
    for d in sorted(imported):
        for s in imported[d]:
            if not fix_barangay(s, known):
                print(f"  ! {d}: barangay not recognised: '{s['barangay']}' / '{s['where']}' (stop kept; add a hint in GROUP_HINTS or an alias in the site)")
        stops = sorted(imported[d], key=lambda s: (s.get("actualStart") or s["start"], s["tanker"]))
        new.extend(stops)
        replaced = sum(1 for s in sched.get("stops", []) if s.get("date") == d)
        print(f"{d}: {len(stops)} stops from the monitoring sheet (replaced {replaced} existing)")
    sched["stops"] = kept + new
    if imported:
        latest = max(imported)
        sched["updated"] = date.today().isoformat()
        sched["source"] = f"BCWD Water Tankers Hourly Monitoring sheet (Google Sheets), linked from the Butuan City PIO rationing post; last day imported {latest}"
        sched["sourceUrl"] = f"https://docs.google.com/spreadsheets/d/e/{pub_id}/pubhtml"
        sched["importedAt"] = datetime.now().strftime("%Y-%m-%d %H:%M")
    save(SCHEDULE_PATH, sched)
    print(f"wrote data/schedule.json: {len(sched['stops'])} stops total")


if __name__ == "__main__":
    main()
