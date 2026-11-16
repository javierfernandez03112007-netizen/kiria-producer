"""Fotos de referencia de Wikimedia Commons (solo para mirar, no se publican): python3 ref_get.py "<búsqueda>" <prefijo> [n]"""
import json, os, sys, time, urllib.error, urllib.parse, urllib.request
H = {"User-Agent": "KiriaProducerBot/1.0 (video reference images; python-urllib)"}
def fetch(url, tries=6):
    for k in range(tries):
        try: return urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=120).read()
        except urllib.error.HTTPError as e:
            if e.code != 429 or k == tries - 1: raise
            time.sleep(10 * (k + 1))
q, pre, n = sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 4
u = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({"action": "query", "format": "json", "generator": "search", "gsrsearch": "filetype:bitmap " + q,
    "gsrnamespace": 6, "gsrlimit": n, "prop": "imageinfo", "iiprop": "url|extmetadata", "iiurlwidth": 960})
d = json.loads(fetch(u))
os.makedirs("ref", exist_ok=True)
for i, p in enumerate(sorted(d.get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 0))):
    ii = p["imageinfo"][0]; url = ii.get("thumburl") or ii["url"]; lic = ii.get("extmetadata", {}).get("LicenseShortName", {}).get("value", "?")
    dst = f"ref/{pre}_{i}.jpg"
    time.sleep(3); open(dst, "wb").write(fetch(url))
    print(dst, "|", p["title"], "|", lic)
