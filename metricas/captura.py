#!/usr/bin/env python3
"""Convierte una captura de Metricool (reels de Instagram) en filas para el «Historial de métricas» de Notion.

Uso:
  python3 metricas/captura.py filas.json videos.json [anteriores.json] [--ahora 2026-11-05T19:10:00+01:00]

  filas.json      {"rows": [...]} tal cual lo devuelve getAnalyticsDataByMetrics con estas métricas, en este orden:
                  IGRE04 IGRE02 IGRE23 IGRE11 IGRE10 IGRE07 IGRE12 IGRE21 IGRE09 IGRE08 IGRE24 IGRE28
                  (id, fecha, visitas, alcance, me gusta, comentarios, guardados, compartidos, interacciones,
                   engagement %, tiempo medio visto s, vistas de más de 3 s %)
  videos.json     resultado (lista «results») de la consulta SQL a «Métricas por vídeo»:
                  SELECT "userDefined:ID" AS id, url AS pagina, "Vídeo" AS titulo, "Sección" AS seccion, "Cuenta" AS cuenta
                  (también vale un dict {"<id>": {"pagina", "titulo", "seccion", "cuenta"}})
  anteriores.json resultado (lista «results») de la consulta SQL al historial (última captura de cada vídeo):
                  SELECT "Vídeo" AS video, "Visitas" AS visitas, MAX("date:Capturado:start") AS capturado ... GROUP BY "Vídeo"
                  (opcional; sin él, «Visitas nuevas» va vacío)

Escribe en stdout el JSON de «pages» para notion-create-pages (data source del historial) y avisa por stderr de los
reels que aún no tienen fila en «Métricas por vídeo» (hay que crearla antes y volver a ejecutar).
"""
import json
import re
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

MADRID = ZoneInfo("Europe/Madrid")


def num(x, decimales=None):
    if x in (None, ""):
        return None
    v = float(x)
    if decimales is None:
        return int(round(v))
    return round(v, decimales)


def pid(url):
    """Id de página de Notion (32 hex) a partir de una URL o id con guiones."""
    m = re.findall(r"[0-9a-f]{32}", url.replace("-", ""))
    return m[-1] if m else url


def resultados(ruta):
    d = json.load(open(ruta))
    return d["results"] if isinstance(d, dict) and "results" in d else d


def cargar(ruta):
    d = resultados(ruta)
    if isinstance(d, dict):
        return d
    return {r["id"]: r for r in d if r.get("id")}


def main():
    args = [a for a in sys.argv[1:]]
    ahora = datetime.now(MADRID)
    if "--ahora" in args:
        i = args.index("--ahora")
        ahora = datetime.fromisoformat(args[i + 1]).astimezone(MADRID)
        del args[i:i + 2]
    filas = json.load(open(args[0]))["rows"]
    videos = cargar(args[1])
    pagina_a_id = {pid(v["pagina"]): rid for rid, v in videos.items()}
    anteriores = {}
    if len(args) > 2:
        for r in resultados(args[2]):
            for url in json.loads(r["video"]) if isinstance(r["video"], str) else r["video"]:
                if pid(url) in pagina_a_id and r.get("visitas") is not None:
                    anteriores[pagina_a_id[pid(url)]] = r["visitas"]

    paginas, faltan = [], []
    for f in filas:
        rid, fecha = f[0], f[1]
        if rid not in videos:
            faltan.append((rid, fecha))
            continue
        v = videos[rid]
        pub = datetime.strptime(fecha, "%Y%m%d%H%M%S").replace(tzinfo=MADRID)
        horas = round((ahora - pub).total_seconds() / 3600, 1)
        visitas = num(f[2])
        props = {
            "Captura": f"{v['titulo']} · {ahora:%d/%m %H:%M}",
            "Vídeo": [pid(v["pagina"])],
            "date:Capturado:start": ahora.isoformat(timespec="seconds"),
            "date:Capturado:is_datetime": 1,
            "Sección": v.get("seccion") or "kiria.ai",
            "Cuenta": v.get("cuenta") or "@kiria.ai",
            "Red": "Instagram",
            "Horas desde publicación": horas,
            "Visitas": visitas,
            "Alcance": num(f[3]),
            "Me gusta": num(f[4]),
            "Comentarios": num(f[5]),
            "Guardados": num(f[6]),
            "Compartidos": num(f[7]),
            "Interacciones": num(f[8]),
            "Engagement (%)": num(f[9], 2),
            "Tiempo medio visto (s)": num(f[10], 1),
            "Vistas de más de 3 s (%)": num(f[11], 1),
        }
        if rid in anteriores and visitas is not None:
            props["Visitas nuevas"] = visitas - int(anteriores[rid])
        paginas.append({"properties": {k: val for k, val in props.items() if val is not None}})

    for rid, fecha in faltan:
        print(f"FALTA FILA en «Métricas por vídeo»: reel {rid} publicado {fecha}", file=sys.stderr)
    json.dump(paginas, sys.stdout, ensure_ascii=False)
    print()


if __name__ == "__main__":
    main()
