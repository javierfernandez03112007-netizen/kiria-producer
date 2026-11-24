// ---------------------------------------------------------------- RÓTULOS: en este vídeo los nombres van en el frente de cada atril (siglas y apellido); no hay etiquetas del montaje.
function buildHudPlan() { HFONT = 'Inter'; HW = [700, 500]; }
function hudAt(t) { hudBegin(); }
window.labelsAt = function (t) { frame(t); return { p: [], h: [], k: [] }; };
window.whoIs = () => { const r = {}; PEOPLE.forEach((p, i) => { r[i] = { k: p.userData.role.k, vip: p.userData.role.vip }; }); return r; };
