#!/usr/bin/env python3
"""Assemble ugc.js and the ugc-<lang>.html shells. Run from work/ridesentinel/film: python3 build-ugc.py
ugc.js = pov.js's shared parts (format, text, phone card, dial, bokeh and map, end card, score helpers, seek, player)
         + ugc-scene.part.js + ugc-audio.part.js, with an async seek that loads the A-roll frame before drawing."""
from pathlib import Path

pov = Path('pov.js').read_text()
scene = Path('ugc-scene.part.js').read_text()
audio = Path('ugc-audio.part.js').read_text()


def cut(s, a, b):
    i, j = s.index(a), s.index(b)
    assert i < j, (a, b)
    return s[:i], s[j:]


head, rest = cut(pov, '// ════ SCENE ("POV', '// ─── baked once')
out = head + scene + '\n' + rest
pre, post = cut(out, '  // ── "POV". The voice leads', '  return ac.startRendering();')
out = pre + audio + post
out = out.replace('for (const g of [ctx, CHAR]) {', 'for (const g of [ctx, STAND]) {')
out = out.replace("""window.__film = { duration: DURATION, ready: false, seek, shots: SHOTS, marks: MARKS,""",
"""const seekFrame = seek;
async function seekAsync(t) { t = clamp(t, 0, DURATION); await prepFace(t); seekFrame(t); }
window.__film = { duration: DURATION, ready: false, seek: seekAsync, shots: SHOTS, marks: MARKS,""")
out = out.replace("""  .map(f => document.fonts.load(f, SAMPLE))).then(() => {
    // warm the glyph and blur caches with one pass over the film, so the first draw of a frame matches every later one
    for (let t = 0; t < DURATION; t += .25) seek(t);
    window.__film.ready = true;
  });""", """  .map(f => document.fonts.load(f, SAMPLE))).then(async () => {
    // warm the glyph and blur caches with one pass over the film, so the first draw of a frame matches every later one
    for (let t = 0; t < DURATION; t += .25) await seekAsync(t);
    window.__film.ready = true;
  });""")
# the player: draw only after the frame is loaded, one seek at a time
out = out.replace("""  if (window.__film.ready) seek(Math.max(0, t));
  requestAnimationFrame(frame);""", """  if (window.__film.ready && !BUSY) { BUSY = true; seekAsync(Math.max(0, t)).finally(() => { BUSY = false; }); }
  requestAnimationFrame(frame);""")
out = out.replace('let ac = null, buffer = null, play = null;', 'let ac = null, buffer = null, play = null, BUSY = false;')
for needle in ('await prepFace(t); seekFrame(t)', 'await seekAsync(t);', 'BUSY = true', 'for (const g of [ctx, STAND])', '// ── "Drivers, quick one"'):
    assert needle in out, needle
Path('ugc.js').write_text(out)

shell = Path('pov-en.html').read_text()
for lang in ('en', 'fr', 'ar'):
    h = shell.replace('<title>RideSentinel POV (EN)</title>', f'<title>RideSentinel UGC ({lang.upper()})</title>')
    h = h.replace('"Stop doing maths at the wheel". 20 s', '"Drivers, quick one" (UGC ad), ~30–45 s')
    if lang == 'ar':
        h = h.replace('<html lang="en">', '<html lang="ar" dir="rtl">').replace('<link rel="stylesheet" href="fonts.css">',
                                                                               '<link rel="stylesheet" href="fonts.css">\n<link rel="stylesheet" href="fonts-ar.css">')
    else:
        h = h.replace('<html lang="en">', f'<html lang="{lang}">')
    h = h.replace('<script>window.FILM_LANG = "en";</script>', f'<script>window.FILM_LANG = "{lang}";</script>')
    h = h.replace('<script src="audio-en.js" onerror="window.FILM_AUDIO_B64 = null"></script>',
                  f'<script src="audio-ugc-{lang}.js" onerror="window.FILM_AUDIO_B64 = null"></script>')
    h = h.replace('<script src="align-en.js" onerror="window.POV_ALIGN = null"></script>',
                  f'<script src="align-ugc-{lang}.js" onerror="window.UGC_ALIGN = null"></script>\n'
                  f'<script src="aroll-{lang}.js" onerror="window.UGC_AROLL = null"></script>\n'
                  '<script src="amb-ugc.js" onerror="window.FILM_AMB_B64 = null"></script>')
    h = h.replace('<script src="pov.js"></script>', '<script src="ugc.js"></script>')
    assert f'ugc-{lang}.js' in h and 'ugc.js' in h and f'aroll-{lang}.js' in h
    Path(f'ugc-{lang}.html').write_text(h)
print('ugc.js + ugc-en.html, ugc-fr.html, ugc-ar.html')
