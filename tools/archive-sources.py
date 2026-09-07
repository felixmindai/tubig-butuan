"""Archive every source URL in data/*.json to the Wayback Machine.

For each object that has a `sourceUrl`, and each entry of a `sources` list
that has a `url`, this script makes sure a recent Wayback snapshot exists
(saving one if needed) and writes it back as `archiveUrl` + `archivedAt`.
The site shows that as an "archived copy" link beside the live source, so a
claim can still be checked if the original page moves or goes blank.

Usage:
  python tools/archive-sources.py            # archive what is missing or older than 30 days
  python tools/archive-sources.py --dry-run  # only report
  python tools/archive-sources.py --force    # re-archive everything

No dependencies. Facebook and Google Maps URLs are skipped: the archive only
gets a login wall from them.
"""
import glob, json, os, sys, time, urllib.parse, urllib.request, urllib.error
from datetime import date, datetime, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILES = [p for p in glob.glob(os.path.join(ROOT, "data", "*.json"))
              if os.path.basename(p) not in ("barangays.json", "schedule.example.json")]
SKIP_HOSTS = ("facebook.com", "fb.com", "google.com", "goo.gl")
MAX_AGE_DAYS = 30
UA = "tubig-butuan-archiver/0.1 (community water info hub, Butuan City; +https://github.com/felixmindai/tubig-butuan)"
DRY = "--dry-run" in sys.argv
FORCE = "--force" in sys.argv
PAUSE_BETWEEN_SAVES = 8  # seconds; Save Page Now rate-limits anonymous callers


def http_get(url, timeout=60):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    return urllib.request.urlopen(req, timeout=timeout)


def existing_snapshot(url):
    """Return (archive_url, YYYY-MM-DD) of the newest snapshot, or (None, None)."""
    try:
        with http_get("https://archive.org/wayback/available?url=" + urllib.parse.quote(url, safe="")) as r:
            data = json.load(r)
    except Exception as e:  # network hiccup: treat as no snapshot
        print(f"    availability check failed: {e}")
        return None, None
    snap = (data.get("archived_snapshots") or {}).get("closest")
    if not snap or not snap.get("available"):
        return None, None
    ts = snap.get("timestamp", "")
    when = datetime.strptime(ts[:8], "%Y%m%d").date().isoformat() if len(ts) >= 8 else None
    return snap.get("url", "").replace("http://web.archive.org", "https://web.archive.org"), when


def save_now(url, tries=4):
    """Ask Save Page Now for a fresh snapshot; return its archive URL or None.
    Retries on 429/5xx, which Save Page Now returns when it is busy."""
    loc = final = ""
    for attempt in range(1, tries + 1):
        try:
            with http_get("https://web.archive.org/save/" + url, timeout=180) as r:
                loc = r.headers.get("Content-Location") or ""
                final = r.geturl()
            break
        except urllib.error.HTTPError as e:
            retry = e.code == 429 or e.code >= 500
            print(f"    save attempt {attempt}: HTTP {e.code} ({e.reason})" + (" — retrying" if retry and attempt < tries else ""))
            if not (retry and attempt < tries):
                return None
            time.sleep(20 * attempt)
        except Exception as e:
            print(f"    save attempt {attempt}: {e}" + (" — retrying" if attempt < tries else ""))
            if attempt == tries:
                return None
            time.sleep(20 * attempt)
    if loc.startswith("/web/"):
        return "https://web.archive.org" + loc
    if "/web/" in final:
        return final
    # Some responses carry only a Link header; fall back to re-querying.
    time.sleep(3)
    return existing_snapshot(url)[0]


def fresh(when):
    return bool(when) and date.fromisoformat(when) >= date.today() - timedelta(days=MAX_AGE_DAYS)


cache = {}
def archive(url):
    """Return (archive_url, archived_at) for url, saving a snapshot if needed."""
    if url in cache:
        return cache[url]
    host = urllib.parse.urlparse(url).netloc.lower()
    if any(h in host for h in SKIP_HOSTS):
        print(f"  skip  {url}  (login-walled host)")
        cache[url] = (None, None); return cache[url]
    arch, when = existing_snapshot(url)
    if arch and fresh(when) and not FORCE:
        print(f"  ok    {url}\n        -> {arch} ({when})")
    elif DRY:
        print(f"  would save  {url}" + (f"  (last snapshot {when})" if when else "  (no snapshot yet)"))
    else:
        print(f"  save  {url}" + (f"  (last snapshot {when})" if when else "  (no snapshot yet)"))
        new = save_now(url)
        if new:
            arch, when = new, date.today().isoformat()
            print(f"        -> {arch}")
        elif arch:
            print(f"        keeping older snapshot {arch} ({when})")
        time.sleep(PAUSE_BETWEEN_SAVES)
    cache[url] = (arch, when)
    return cache[url]


def walk(node, changed):
    """Visit every dict; archive sourceUrl and sources[].url; write results back."""
    if isinstance(node, dict):
        targets = []
        if isinstance(node.get("sourceUrl"), str) and node["sourceUrl"].startswith("http"):
            targets.append(node)
        for item in node.get("sources", []) if isinstance(node.get("sources"), list) else []:
            if isinstance(item, dict) and isinstance(item.get("url"), str) and item["url"].startswith("http"):
                targets.append(item)
        for obj in targets:
            url = obj.get("sourceUrl") or obj.get("url")
            if not FORCE and obj.get("archiveUrl") and fresh(obj.get("archivedAt")):
                cache.setdefault(url, (obj["archiveUrl"], obj["archivedAt"]))
                continue
            arch, when = archive(url)
            if arch and not DRY and (obj.get("archiveUrl") != arch or obj.get("archivedAt") != when):
                obj["archiveUrl"], obj["archivedAt"] = arch, when
                changed.append(url)
        for v in node.values():
            walk(v, changed)
    elif isinstance(node, list):
        for v in node:
            walk(v, changed)


def main():
    total_changed = 0
    for path in sorted(DATA_FILES):
        print(os.path.relpath(path, ROOT))
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        changed = []
        walk(data, changed)
        if changed and not DRY:
            with open(path, "w", encoding="utf-8", newline="\n") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
                f.write("\n")
            print(f"  wrote {len(changed)} archive link(s)")
            total_changed += len(changed)
    print("done" + (" (dry run)" if DRY else f": {total_changed} link(s) updated"))


if __name__ == "__main__":
    main()
