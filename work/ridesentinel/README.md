# RideSentinel promo videos

Films made with the `opus-js-animations` skill. Every frame is `seek(t)`; renders are 9:16, 1080×1920, 30 fps. The MP4 and WAV renders
are not committed.

| Film | Pages | Treatment |
|---|---|---|
| Promo, 20 s (EN, PT, AR, ZH) | `film/index.html`, `pt.html`, `ar.html`, `zh.html` + `film.js` | `film/FILM.md` |
| The driver and the near-miss, 26 s (FR) | `film/fr.html` + `fr.js` | `film/FILM-fr.md` |
| Two drivers, one day, 35 s (EN, FR) | `film/day-en.html`, `day-fr.html` + `day.js` | `film/FILM-day.md` |
| POV: the 2 a.m. offer, 32–41 s, voiced by Liam (EN, FR, PT, AR, ZH) | `film/pov-<lang>.html` + `pov.js` | `film/FILM-pov.md` |
| UGC ad "Drivers, quick one": AI presenter, founder's cloned voices (EN, FR, AR) | `film/ugc-<lang>.html` + `ugc.js` | `film/FILM-ugc.md` |
| The 16-second reel, with WebGPU shader layers (EN) | `film/reel-en.html` + `reel.js` + `gpu-layer.js` | `film/FILM-reel.md` |

All on-screen text and the voiceover scripts live in `film/strings.py` (run `python3 strings.py` after editing).

**Tools** (`tools/`): patched copies of the skill's `render.mjs`, `verify.mjs` and `lib.mjs` that pull frames over DevTools in 1 MB
chunks (one large message stalls in cloud containers); `pullwav.mjs` (a film's generated score as a WAV); `chrome` (a Chromium wrapper
with `--no-sandbox` for root containers); `make_align.py` (voice timings → `align-<lang>.js`).

**Shader layers** (the reel): `film/gpu-layer.js` bundles a frame-exact bridge to [shaders](https://github.com/shader-effects-inc/shaders)
(MIT; source and licence in `vendor/shaders/`). Render those films with `CHROME=$PWD/tools/chrome-gpu` (WebGPU via SwiftShader on CPU-only machines).

**Render a film:** `CHROME=$PWD/tools/chrome node tools/render.mjs film/<page>.html --fps 30 --audio <mix.wav> --out <out.mp4> --workers 4 --ss 2`
(get the mix with `node tools/pullwav.mjs film/<page>.html <mix.wav>`).

**Voiced films:** the ElevenLabs key goes in `ELEVENLABS_API_KEY` or `~/.config/opus-js-animations/keys.env` (chmod 600), never in the repo.
`./finish-pov.sh` voices and renders the POV films. `./finish-ugc.sh probe`, then `./finish-ugc.sh all`, makes the UGC ad's presenter and
lip-synced lines and renders it; those two steps need an ElevenLabs **Pro** plan. `tools/el_flows.py` is the client for ElevenLabs'
image and video generation endpoints, and `tools/stt_check.py` transcribes a voice track to check it against its script.
