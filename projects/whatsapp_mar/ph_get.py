"""Descarga recursos de Poly Haven (CC0): python3 ph_get.py hdri <id> [res] | model <id> [res]  → web/assets/ph/<id>/"""
import json, os, sys, urllib.request
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web", "assets", "ph")
def get(url, dst):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.exists(dst) and os.path.getsize(dst) > 0: return
    req = urllib.request.Request(url, headers={"User-Agent": "kiria-producer"})
    with urllib.request.urlopen(req, timeout=300) as r, open(dst, "wb") as f: f.write(r.read())
def files(aid):
    req = urllib.request.Request(f"https://api.polyhaven.com/files/{aid}", headers={"User-Agent": "kiria-producer"})
    return json.load(urllib.request.urlopen(req, timeout=60))
kind, aid = sys.argv[1], sys.argv[2]; res = sys.argv[3] if len(sys.argv) > 3 else ("2k" if kind == "hdri" else "1k")
F = files(aid)
if kind == "hdri":
    u = F["hdri"][res]["hdr"]["url"]; get(u, os.path.join(ROOT, aid, f"{aid}_{res}.hdr")); print(aid, res, "ok")
else:
    g = F["gltf"][res]["gltf"]; get(g["url"], os.path.join(ROOT, aid, os.path.basename(g["url"])))
    for rel, inc in g.get("include", {}).items(): get(inc["url"], os.path.join(ROOT, aid, rel))
    print(aid, res, "ok", len(g.get("include", {})), "archivos")
