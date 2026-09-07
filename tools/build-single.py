"""Build a single-file copy of the hub (dist/tubig-butuan.html).

Inlines the CSS, both scripts and all data files into one HTML file so the
site can be previewed or shared as a single page (for example as a Claude
artifact, or attached to a Messenger chat). Deployment to Cloudflare Pages
uses the normal multi-file layout; this is only a convenience build.

Usage:  python tools/build-single.py [--fragment]
  --fragment   omit <!doctype>/<html>/<head>/<body> wrappers (artifact hosts
               add their own); default writes a complete standalone page.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def read(p):
    with open(os.path.join(ROOT, p), encoding="utf-8") as f:
        return f.read()

fragment = "--fragment" in sys.argv
html = read("index.html")
css = read("css/style.css")
js = read("js/map.js") + "\n" + read("js/app.js")
data = {f"data/{n}.json": json.loads(read(f"data/{n}.json")) for n in ("barangays", "status", "stations", "schedule", "hotlines", "landmarks", "population")}

head_extra = '<style>\n' + css + '\n</style>'
html = re.sub(r'<link rel="stylesheet" href="css/style.css">', lambda m: head_extra, html)
html = re.sub(r'\s*<link rel="(manifest|icon|apple-touch-icon)"[^>]*>', '', html)
html = re.sub(r'\s*<a id="editLink"[^>]*>.*?</a>\s*·', '', html)  # no EDITING.md next to a single file
inline = ('<script>window.TB_DATA=' + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ';</script>\n'
          '<script>\n' + js.replace('</script', '<\\/script') + '\n</script>')
html = re.sub(r'<script src="js/map.js" defer></script>\s*<script src="js/app.js" defer></script>', lambda m: inline, html)

if fragment:
    m = re.search(r'<head>(.*?)</head>.*?<body>(.*?)</body>', html, re.S)
    head, body = m.group(1), m.group(2)
    head = re.sub(r'\s*<meta (charset|name="viewport")[^>]*>', '', head)
    # the html tag is dropped in fragment mode; carry its no-translate intent on the body content instead
    body = '<div translate="no" class="notranslate">' + body + '</div>'
    head = re.sub(r'<title>.*?</title>', '<title>Tubig Butuan</title>', head)
    # artifact hosts block third-party stylesheets and map tiles: hide the street-map toggle
    body = body.replace('<script>window.TB_DATA=', '<script>window.TB_NO_TILES=true;window.TB_DATA=', 1)
    html = head.strip() + '\n' + body.strip() + '\n'

os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
out = os.path.join(ROOT, "dist", "tubig-butuan.html")
with open(out, "w", encoding="utf-8") as f:
    f.write(html)
print(f"wrote {out} ({os.path.getsize(out):,} bytes, {'fragment' if fragment else 'standalone'})")
