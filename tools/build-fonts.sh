#!/bin/sh
# Bygger självhostade, subsettade WOFF2-typsnitt från källfilerna i tools/fonts.
# Kräver python3 + fonttools + brotli (PYTHONPATH till brotli-modulen om den inte är installerad).
set -e
cd "$(dirname "$0")/.."
UNI="U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+2013-2014,U+2018-201E,U+2022,U+2026,U+2032-2033,U+20AC,U+2122,U+2190-2193,U+2197,U+2212,U+00D7"
python3 - <<'PY'
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
f = TTFont('tools/fonts/Archivo-VF.ttf')
instantiateVariableFont(f, {'wght': (400, 850), 'wdth': (100, 125)}, inplace=True)
f.save('/tmp/archivo-limited.ttf')
m = TTFont('tools/fonts/JetBrainsMono-VF.ttf')
instantiateVariableFont(m, {'wght': (400, 700)}, inplace=True)
m.save('/tmp/jbmono-limited.ttf')
PY
pyftsubset /tmp/archivo-limited.ttf --unicodes="$UNI" --layout-features='kern,liga,calt,tnum,lnum,case,ss01' --flavor=woff2 --output-file=public/assets/fonts/archivo-var.woff2
pyftsubset /tmp/jbmono-limited.ttf --unicodes="U+0020-007E,U+00A0-00FF,U+2013-2014,U+2026,U+2190-2193,U+00D7" --layout-features='kern,tnum,zero' --flavor=woff2 --output-file=public/assets/fonts/jetbrains-mono-var.woff2
