#!/bin/bash
# Une los módulos de web/src en web/scene.js (en orden)
cd "$(dirname "$0")" && cat src/*.js > scene.js
