#!/usr/bin/env python3
"""source/pov-<lang>/voice.align.json + voice.wav → film/align-<lang>.js: the measured line and word times, and a 100 Hz
loudness envelope that drives the driver's mouth. Run from work/ridesentinel/film:  python3 ../tools/make_align.py en
The UGC ad: make_align.py en ugc  → align-ugc-en.js (window.UGC_ALIGN, 8 lines)."""
import array, json, math, sys, wave
lang = sys.argv[1]
film = sys.argv[2] if len(sys.argv) > 2 else 'pov'
d = f'source/{film}-{lang}'
al = json.load(open(f'{d}/voice.align.json', encoding='utf-8'))
w = wave.open(f'{d}/voice.wav'); sr, ch = w.getframerate(), w.getnchannels()
a = array.array('h', w.readframes(w.getnframes()))[0::ch]
hop = sr // 100
env = [math.sqrt(sum(x * x for x in a[i:i + hop]) / max(1, len(a[i:i + hop]))) for i in range(0, len(a), hop)]
ref = sorted(env)[int(len(env) * .97)] or 1
env = [round(min(1, e / ref) ** .7, 3) for e in env]
lines = [{'text': c['text'], 't0': c['t0'], 't1': c['t1'], 'words': c.get('words') or []} for c in al['chunks']]
n, out, var = (10, f'align-{lang}.js', 'POV_ALIGN') if film == 'pov' else (8, f'align-{film}-{lang}.js', film.upper() + '_ALIGN')
if len(lines) != n: sys.exit(f'expected {n} voiced lines, got {len(lines)}')
open(out, 'w', encoding='utf-8').write(f'window.{var} = ' + json.dumps({'lines': lines, 'env': env, 'rate': 100}, ensure_ascii=False) + ';\n')
print(f'{out}: {len(lines)} lines, {al["duration"]:.2f} s')
