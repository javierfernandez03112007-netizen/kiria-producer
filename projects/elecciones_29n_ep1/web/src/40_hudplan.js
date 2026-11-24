// ---------------------------------------------------------------- RÓTULOS: en este vídeo los nombres van en el frente de cada atril (apellido y siglas); no hay etiquetas del montaje.
function buildHudPlan() { HFONT = 'Inter'; HW = [700, 500]; }
function hudAt(t) { hudBegin(); }
window.labelsAt = function (t) { frame(t); return { p: [], h: [], k: [] }; };
