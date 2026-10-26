"""Descarga Impact del paquete oficial «Core fonts for the Web» (SourceForge, corefonts) y deja engine/fonts/impact.ttf.
La licencia de Microsoft permite usarla pero no redistribuir el .ttf suelto: por eso no se sube al repo (.gitignore)
y cada máquina la baja de la fuente original.  Requiere cabextract (apt-get install cabextract).

    python3 engine/fonts/get_impact.py"""
import os
import shutil
import subprocess
import tempfile
import urllib.request

URL = "https://downloads.sourceforge.net/corefonts/impact32.exe"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "impact.ttf")


def main():
    with tempfile.TemporaryDirectory() as d:
        exe = os.path.join(d, "impact32.exe")
        urllib.request.urlretrieve(URL, exe)
        subprocess.run(["cabextract", "-q", "-d", d, exe], check=True)      # el .exe es un CAB autoextraíble (LZX)
        ttf = next(os.path.join(d, f) for f in os.listdir(d) if f.lower() == "impact.ttf")
        shutil.copyfile(ttf, OUT)
    print(f"{OUT} ({os.path.getsize(OUT)} bytes)")


if __name__ == "__main__":
    main()
