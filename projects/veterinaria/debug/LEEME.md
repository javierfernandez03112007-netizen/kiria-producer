# Pruebas de depuración (se pasan a la escena con `EVAL`)

- `animales.js`: pone cada animal solo en el centro (uno por segundo de prueba), la vaca en rayos X y el guante, con la cámara encuadrándolos.
  Uso: `EVAL="$(cat debug/animales.js)" ./test.sh ani 1.02 2.02 3.02 4.02 5.02 6.02 7.02 8.02 9.02 10.02`
- `vaca_pared.js`: escribe en el registro dónde quedan la cabeza, el hocico, los cuernos y el pecho de la vaca respecto a la pared de la clínica
  (para ajustar `COW_Z0` y el agujero). Uso: `EVAL="$(cat debug/vaca_pared.js)" FPS=60 node web/capture.mjs out/t_dbg 0,1.5`
