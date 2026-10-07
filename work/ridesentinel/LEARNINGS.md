# RideSentinel videos: what this session learned

These are notes from building the RideSentinel films with the `opus-js-animations` skill: 18 videos in 6 formats and 5 languages,
plus an AI-presenter UGC ad made with ElevenLabs. They are written so the next session (or person) doesn't relearn any of it.
Everything is under `work/ridesentinel/`, on the branch `ridesentinel-videos`.

---

## 1. What exists

| Film | Languages | Source | Final file(s) in `film/` |
|---|---|---|---|
| Promo, 20 s, night dashboard | EN, PT, AR, ZH | `film.js` + `index/pt/ar/zh.html` | `ridesentinel-promo-{upload,pt,ar,zh}.mp4` |
| French driver: near-miss, then replay with the app, 26 s | FR | `fr.js` + `fr.html` | `ridesentinel-promo-fr-driver.mp4` |
| Two drivers, one day (with and without the app), 35 s | EN, FR | `day.js` + `day-{en,fr}.html` | `ridesentinel-two-drivers-{en,fr}.mp4` |
| POV skit "the 2 a.m. offer", voiced by Liam, 32–43 s | EN, FR, PT, AR, ZH | `pov.js` + `pov-<lang>.html` | `ridesentinel-pov-<lang>.mp4` |
| 16 s reel with WebGPU shader layers (v2: real ride elements) | EN | `reel.js` + `reel-en.html` | `ridesentinel-reel-en.mp4` (v1 kept: `-v1.mp4`) |
| UGC ad "Drivers, quick one": AI presenter in the founder's cloned voice | EN (FR, AR prepared) | `ugc.js` + `ugc-<lang>.html` | `ridesentinel-ugc-en.mp4` |

The treatments and build notes are in `film/FILM*.md`. Each film is assembled from `*.part.js` pieces plus shared parts of `film.js`
or `pov.js`; `build-ugc.py` is the only scripted assembler.

---

## 2. The rendering contract (it held for every film)

- **A frame is a pure function of time.** Every page exposes `window.__film = { duration, ready, seek(t), shots, marks, wav() }`.
  - `seek(t)` may be async: it awaits the shader layers or video frames, then draws.
  - `verify.mjs` checks purity by drawing the same t twice, then after a cold jump. **Run it after every change.** Purity bugs found:
    - The camera shake uncovered an unpainted strip of the last frame. Fix: start every frame with a full-frame fill.
    - The first draw of large text differed from later draws (glyph cache). Fix: one warm-up pass over the film before `ready = true`.
    - Canvas state leaked between frames. Fix: reset every property at the start of `seek` (an offscreen canvas too).
    - Hiding a WebGPU layer froze its clock, so frames depended on the export path. Fix: one renderer per effect, advanced by exactly
      `t − last t`.
- **Render:** `render.mjs <html> --fps 30 --ss 2 --workers 3-4 --audio mix-norm.wav --out X-master.mp4`, then re-encode the
  upload copy (H.264 high, CRF 17, yuv420p, BT.709 tags, `+faststart`). It also takes `--from/--to` for samples.
- **Inspect:** `stills.mjs --times a,b,c --sheet` (or `--every s`); sheets of the final MP4 via `ffmpeg fps=…,tile=7x2`.
  **Read every sheet before delivering.** It caught several overlaps:
  - the dial label showing through the headline;
  - the verdict and traffic light carrying into the wrong shot;
  - PASS showing for only 0.4 s.
- **Score:** generated in Web Audio inside `renderMix()` with OfflineAudioContext, pulled out by `pullwav.mjs`.
  - Normalise with `loudnorm=I=-14:TP=-1.5:LRA=11` for social media.
  - Meter with `ebur128=peak=sample`. The upload copies landed at −13.4 to −14.8 LUFS.
- **Supersampling:** `supersample(ctx, SS)` scales transforms, shadows and filter pixels, so the same code renders at 1× or 2×.

### Headless Chromium in this cloud container
- It runs as root, so it needs `--no-sandbox` (wrapper: `tools/chrome`).
- **Large CDP messages stall.** Move image and WAV data in roughly 1 MB chunks (done in `lib.mjs`, `pullwav.mjs`, `verify.mjs`, `stills.mjs`).
- **WebGPU on CPU** (`tools/chrome-gpu`):
  - flags: `--enable-unsafe-webgpu --enable-features=Vulkan --use-vulkan=swiftshader --use-webgpu-adapter=swiftshader --use-angle=swiftshader`;
  - plus `--window-size=1400,2400`: the shaders library caps its buffer to the window size.
- **Local images or video frames on a `file://` page taint the canvas**, so `toDataURL` throws a SecurityError. Fix:
  `--allow-file-access-from-files` (wrapper: `tools/chrome-media`).
- Codecs: the Playwright Chromium build may lack H.264. Don't rely on `<video>` seeking; extract JPEG frames with ffmpeg and load
  them with `await img.decode()` inside the async seek. That is deterministic and pure.
- `pkill -f` matched and killed the agent's own shell. Kill by process name only.

### Languages
- All text lives in `film/strings.py`, which writes `strings.js`, the POV and UGC `script.txt` files, and the AR and ZH character
  subsets for Google Fonts `text=`.
- **Arabic** (RTL):
  - mirror the layout (`mxr`);
  - `rich()` segments run right to left;
  - **no letter-spacing** (it breaks letter joining);
  - captions are laid out right to left and the AI tag moves to the right.
- **Chinese:** half letter-spacing; captions split per character inside measured word spans.
- Number and currency formats differ: FR `18,40 $`, AR `$40/ساعة`. Keep the spoken numbers equal to the on-screen numbers.

---

## 3. Shader layers ([shaders](https://github.com/shader-effects-inc/shaders), MIT)

- The bridge `vendor/shaders/gpu-layer.src.js` is bundled with esbuild into `film/gpu-layer.js` (`GpuLayer.createGpuLayer`). It uses:
  - the core `shaderRendererGPU`, `registerNode`, `updateUniformValue`, `updateNodeMetadata` and `renderSyntheticFrame(delta)`;
  - `componentDefinition` from `shaders/core/<Name>` (the registry entries have no `fragment`).
- **Changed props land one frame late.** Call `step(t)` and then `at(t)`.
- Speed: about 25 s per frame at first; 720×1280 layers, and skipping invisible ones, brought it to about 2–3 s per frame on CPU.
- **Creative lesson (reel v2):** abstract shader eye-candy (an orb, gradients) read as "static, meaningless" to the client. Real
  ride elements worked better:
  - a car on a night map, pickup and drop-off pins;
  - a speedometer that becomes the Rate Dial;
  - a traffic light for PASS and TAKE.
  Shaders are best kept for light: god rays as headlight beams, a lens flare on the green light.

---

## 4. ElevenLabs: what works, on which plan, at what cost

### Access matrix (account on the **Creator** plan, 131,000 credits a month)

| Capability | REST API with the key | Restricted MCP connector | Full MCP connector (`https://api.elevenlabs.io/v1/mcp`) |
|---|---|---|---|
| TTS (incl. cloned voices), `with-timestamps` | ✅ | ✅ | ✅ |
| Speech-to-text (Scribe v2) | ✅ | ✅ | ✅ |
| **Forced alignment** (`/v1/forced-alignment`) | ✅ | — | — |
| Sound effects | ✅ | ✅ | ✅ |
| Image / video generation (`/v1/flows/image`, `/v1/flows/video`) | ❌ **402 "requires Pro"** | ❌ refuses image and video nodes | ✅ **works on Creator** |
| Asset upload (`POST /v1/assets`) | ❌ 402 "requires Pro" | `creative_create_asset_upload` appeared late in the session (untested) | no upload tool was exposed |

- **The key lesson:** a REST endpoint that needs Pro may still run through the full MCP connector on a lower plan. Check both before
  asking someone to upgrade.
- REST validates the body **before** checking the plan, so a malformed request returns 422 and hides whether you'd get a 402. Probe
  with a valid minimal body that is guaranteed to fail cheaply.
- Pull the live OpenAPI spec (`https://api.elevenlabs.io/openapi.json`) to find endpoints the docs pages don't list. That's how
  `/v1/flows/*` and `/v1/forced-alignment` were found.

### Measured costs (October 2026)
| Item | Credits | USD |
|---|---|---|
| TTS, cloned voice, one line (2–6 s) | 37–107 | ~1–2¢ |
| Sound effect, 20 s loop | 67 per take | ~1¢ |
| Seedream 5 Pro portrait, 9:16 at 2K | 818 per image | ~15¢ |
| **Creatify Aurora lip-sync, 720p** | **~1,120 per second of speech** (3 s = 3,393) | ~20¢/s |
| OmniHuman 1.5, 720p (same 3 s line) | 2,927 | 53¢ |
| HeyGen Avatar 4, 1080p (same 3 s line) | 2,424 | 44¢ |
| Whole EN UGC ad (portrait, 8 lines, 8 clips) | ~30,000 | ~$5.50 |

- Projected FR ≈ 40,000 credits and AR ≈ 46,000 credits with Aurora.
- **Always run `estimate_only` first, then make one probe clip and check it, before batch spending.** Ask before going past what
  was approved.

### Gotchas
- **Sound effects default to 1 second** when no duration is set. Set `duration_seconds` and `loop: true` on the node
  (`creative_update_node`) before running.
- Image and video nodes default to 16:9. Set `aspect_ratio: "9:16"` explicitly, except for Aurora, which follows the image.
- A node with several generations: pin the chosen one as an asset node (`creative_add_flow_asset_node` with `generation_id`) so every
  downstream clip uses the same face. For a TTS generation the tool returns the original node id instead.
- **Concurrency limit:** with 7 TTS runs at once, 2 queued ("Automatically retrying later") and finished a minute later.
  Aurora took 2–4 minutes per clip.
- Output URLs are **signed and expire after about 2 hours**. Download as soon as a run completes.
- The MCP can't read local files (no upload tool on the full connector), so **audio must be generated inside the flow**. Rebuild the
  film's voice track from the flow's takes (`ugc_from_clips.py`). Keep the earlier REST takes as `orig/`.
- MCP `get_more_tools` returned a malformed result (missing `resultType`). It's harmless; ignore it.
- In the MCP, a `voice_id` must come from `creative_list_voices` (search "Bachir") or from the user.
- Voices in the account:
  - "Bachir Avatar" (EN) `PHt8GGNQuTMNZC35u77q`;
  - "Bachir Voice FR" `gRIFl3AVl3FYtGRWK4Ck`;
  - "Bachir AR" (Tunisian) `EQwszXuoPRTn4YIX5ukv`;
  - "Liam" (stock) for the POV films.

### Voice QA without ears
- I can't listen to audio in this container. Instead, **transcribe the voice track with Scribe and compare it with the script**
  (`tools/stt_check.py`). This caught French "Sous votre seuil ? Passer. Au-dessus ? Prendre." run together as
  "passez au-dessus", which changed the meaning. Rewritten as "Vous passez… Vous prenez." and re-voiced.
- **Forced alignment** (`tools/force_align.py`) gives each script word's timing in any take, so captions show the script's own words
  (not the transcript). Loss on these lines was 0.58–0.83, with every word aligned.
- Pacing: cloned FR and AR voices ran long (40 and 47 s). TTS `speed` 1.05–1.1 and shortening one Arabic line brought them to 38 and 44 s.

### Lip-sync specifics (Creatify Aurora)
- Input: the portrait plus the line audio. Output: 704×1280 at 25 fps, with the clip's own audio, ending right after the last word.
- **Don't ping-pong or loop a clip past its end.** The reversed frames are speech, so the mouth moves in silence. Hold the last frame
  (gaps are 0.15 s; the end card covers the face with a navy wash).
- Good portraits for lip-sync: an arm's-length selfie, face large in the upper half, lips closed, hands out of frame. Seedream 5 Pro
  did this well at the first try.

---

## 5. How the UGC film is built

- **Voice → timing:**
  - `make_align.py <lang> ugc` writes `align-ugc-<lang>.js` (lines, words and a 100 Hz loudness envelope);
  - `embed_audio.py` writes `audio-ugc-<lang>.js`.
- **A-roll:**
  - `aroll-<lang>.js` lists each line's clip: start, fps, frame count and frame directory;
  - frame k of clip i is at `start + k/fps`; the film loads it in `prepFace(t)` (a cache of 160 images);
  - without a clip, a silhouette **stand-in** is drawn, so the whole film can be timed, checked and previewed before spending anything.
- **Two routes to clips:**
  - REST (`tools/ugc_aroll.py`, needs Pro): cuts each line from the voice track (−0.1 s/+0.15 s; the last line +2.4 s) and lip-syncs it;
  - MCP flow (used): `tools/ugc_from_clips.py <lang>` takes `ugc/flow/<lang>/clip-N.mp4` and rebuilds `voice.wav`, the alignment
    (forced alignment), the frames and the manifest.
- **Room tone:** an ElevenLabs Sound Effects car-cabin loop in `amb-ugc.js`. It plays under everything, **never ducked**, about 21 dB
  under the voice (a −51 LUFS take × 2.05 gain). It was measured by rendering the mix with and without the bed and diffing them.
- **Honesty and safety rules for UGC:**
  - a realistic AI person always gets an "AI avatar" tag (TikTok and Meta require one);
  - the founder's voice speaks as "we're building", never as a fake driver testimonial or with made-up earnings;
  - the car is visibly parked;
  - the end card keeps "example offers · not affiliated with Uber".

---

## 6. Creative patterns that worked

- **The director workflow:** questions → treatment (`FILM-*.md`) → "go" → build → inspect sheets → render → deliver. Then
  write build notes, including the bugs found.
- **Time everything to the measured voice.** Cuts, gags, stamps and PASS/TAKE derive from word times (for example PASS is the word
  "Pass"), so all five languages work from one scene.
- **UGC grammar:**
  - a hook stamp ("STOP DOING MATHS") on the first sentence;
  - jump cuts each line, alternating wide and punch-in (1.0/1.14–1.16) with a slow push-in;
  - a split screen (the app on top, the presenter below, amber divider);
  - word-by-word captions in pages of 2 rows, with the spoken word in amber;
  - a light 100 BPM bed ducked hard under the voice.
- **Fast verdicts need hold time.** "Below your bar? Pass. Above it? Take." is under 1 s apart, so PASS is held until "Take", and then
  the needle climbs from $23 past the bar to $52 rather than resetting.
- Prompt Motion style (reel): a new state every 1–1.5 s, odometers (tabular digits, hide leading zeros), squash-and-stretch type, HUD corners.

---

## 7. Process, security and git conventions

- **API keys:**
  - never in a command line, a file in the repo, or a log;
  - store them in `~/.config/opus-js-animations/keys.env` (chmod 600) or the environment;
  - tools read the key themselves (`el_flows.key()`).
  - A key pasted into chat should be rotated afterwards.
- **Git:**
  - `work/` is gitignored, so new files need `git add -f`;
  - commit sources, tools and notes only, **no media**: no MP4, WAV or MP3, no `audio-*.js`, `align-*.js` or `aroll-*.js`, no
    `amb-ugc.js`, no portraits or clips;
  - the AI-generated media lives in the ElevenLabs flows;
  - commit messages end with the Co-Authored-By and Claude-Session lines.
- Before committing, scan for leaked keys: `grep -rIl "sk_[0-9a-f]\{20,\}"`.
- **Long renders:** run them in the background, write the log to the scratchpad, and inspect after. CPU only, 4 cores: about 10–15
  minutes for 30–40 s at `--ss 2`.

---

## 8. Open items

- **UGC FR and AR:** the scripts are voiced and the film is built; the clips are not made (~40k and ~46k credits with Aurora, or ~30%
  less with HeyGen). Repeat the flow steps with "Bachir Voice FR" and "Bachir AR", then run `ugc_from_clips.py fr|ar` and render.
- The restricted connector now lists `creative_create_asset_upload` and `creative_finalize_asset_upload`, which may allow lip-syncing
  the original REST takes. Untested.
- Native-speaker review of the Arabic and Chinese scripts (POV, promo) and the Arabic UGC script (MSA vs Tunisian dialect).
