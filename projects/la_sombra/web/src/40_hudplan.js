// ---------------------------------------------------------------- «La sombra»: LA FRASE de arriba (fija desde el primer fotograma, blanca, monoespaciada, en dos líneas).
function buildHudPlan() { HFONT = MONO; HW = [700, 400]; }
const PHRASE = ['DE CERCA, EL MIEDO', 'ES DE TU TAMAÑO.'];
function hudAt(t) { hudBegin(); hg.save(); hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.letterSpacing = '9px'; hfont(44);
  hg.shadowColor = 'rgba(0,0,0,0.85)'; hg.shadowBlur = 16; hg.fillStyle = '#EFEFEF'; hg.fillText(PHRASE[0], W / 2 + 4, 262); hg.fillText(PHRASE[1], W / 2 + 4, 326); hg.restore(); }
window.labelsAt = function (t) { frame(t); return { p: [], h: [], k: [] }; };
