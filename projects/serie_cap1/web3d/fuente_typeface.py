"""Anton (engine/fonts) → typeface JSON para three.js (solo los caracteres que hacen falta)."""
import json, sys, os
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
HERE = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(HERE, '..', '..', '..', 'engine', 'fonts', 'Anton-Regular.woff')
f = TTFont(src); gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f['head'].unitsPerEm
class P(BasePen):
    def __init__(s, gs): super().__init__(gs); s.o = []
    def _moveTo(s, p): s.o += ['m', p[0], p[1]]
    def _lineTo(s, p): s.o += ['l', p[0], p[1]]
    def _qCurveToOne(s, c, p): s.o += ['q', p[0], p[1], c[0], c[1]]
    def _curveToOne(s, c1, c2, p): s.o += ['b', p[0], p[1], c1[0], c1[1], c2[0], c2[1]]
    def _closePath(s): s.o += ['z']
chars = '0123456789,.M+KkiraLlo '
glyphs = {}
for ch in chars:
    gn = cmap.get(ord(ch));
    if gn is None: continue
    pen = P(gs); gs[gn].draw(pen)
    xs = [v for i, v in enumerate(pen.o) if isinstance(v, (int, float))][0::2] or [0]
    glyphs[ch] = dict(ha=gs[gn].width, x_min=min(xs), x_max=max(xs), o=' '.join(str(round(v, 1)) if not isinstance(v, str) else v for v in pen.o))
hh = f['hhea']; head = f['head']; post = f['post']
out = dict(glyphs=glyphs, familyName='Anton', ascender=hh.ascent, descender=hh.descent, underlinePosition=post.underlinePosition,
           underlineThickness=post.underlineThickness, boundingBox=dict(xMin=head.xMin, yMin=head.yMin, xMax=head.xMax, yMax=head.yMax),
           resolution=upm, original_font_information={'format': 0, 'fontFamily': 'Anton'})
json.dump(out, open(os.path.join(HERE, 'anton.typeface.json'), 'w'))
print('ok', len(glyphs), 'glifos, upm', upm)
