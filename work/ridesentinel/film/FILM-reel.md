# RideSentinel, "the 16-second reel": treatment

**Inspiration.** [Prompt Motion](https://www.prompt-motion.com/) collects the motion pieces people made with Opus 5.5. Its most-shared
prompt is: *"make a dynamic 15-second motion graphics video… like it's your showreel… go all out."* The pieces that land do the same
things:
- one object that keeps **morphing** from state to state (dot → pill → card → dial);
- **8+ distinct states every 4 seconds**;
- **rolling odometer** numbers;
- **huge squash-and-stretch type** with one accent colour;
- **HUD marks** in the corners;
- a lot of negative space.

**New ingredient: real shader effects** from [shaders](https://github.com/shader-effects-inc/shaders) (MIT, 199 WebGPU effects).
- I bundled it into the film and drive its clock frame by frame (`renderSyntheticFrame`), so every frame stays exact and repeatable.
- Effects used: **MeshGradient** and **Aurora** backgrounds in the brand palette, **Godrays**, a **LiquidMetal** sphere (the "melting brain"),
  **LensFlare**, and **SunBurst** on the verdict.
- Text, UI and the dial stay crisp 2D on top.

**Logline.** A single amber dot is pinged by an offer, swells into a panic of numbers, melts into liquid metal, and snaps into
the Rate Dial: PASS, TAKE, in one second. Then the brand.

**Sound.** A JS-generated score at 120 BPM (8 bars = 16 s): a sub pulse, a riser into a drop at 4 s, a hit on every morph, a glitch on PASS,
a chime on TAKE, and a final logo sting. No voice; the type carries it.

| Time | Beat | What we see | Shader layer |
|---|---|---|---|
| 0–1 | hook | Black. One **amber dot** with radar rings; HUD corners (`RS-01 · 02:04 · REC`) | faint god rays |
| 1–2 | ping | The dot stretches into a **pill**: "New offer", with **$18.40** rolling up on an odometer | — |
| 2–3 | panic | Giant kinetic type, one word per beat: **DO / THE / MATHS?** It squashes and stretches, the screen shakes, numbers rain | — |
| 3–4 | melt | The numbers fall into a **liquid-metal sphere** that wobbles | LiquidMetal (amber/navy) |
| 4 | **drop** | The sphere snaps flat into the **Rate Dial**; an iris opens on the brand gradient | MeshGradient (navy/amber/teal) |
| 4.5–6 | PASS | The needle hits $23/h → **PASS** (rose) with an RGB-split glitch | the gradient pulses rose |
| 6–7.5 | TAKE | The needle sweeps to $52/h → **TAKE** (teal) with a sunburst | SunBurst + lens flare |
| 7.5–9 | the claim | **IN ONE / SECOND.** The "1" is huge; the odometer shows 0.8 s | god rays |
| 9–11 | the rules | A ticker of pills: **$/h · $/km · pickup · stranding · EV range**, which then morph into a lock: **ON-DEVICE** | Aurora (amber/teal) |
| 11–13.5 | headline | **Stop doing maths at the wheel.** in squash-and-stretch type | Aurora + god rays |
| 13.5–16 | logo | The dial morphs into the **logo mark**, then **RideSentinel**, the `ridesentinel.app` pill and the small print; the HUD closes | MeshGradient, slow |

**Format.** 9:16 at 1080×1920, 30 fps, 16 s; text in the safe zone. English first; the text is minimal (about 20 words), so French and
the other three languages are cheap re-renders from `strings.py`.

**Risks.**
- **Pace vs legibility:** a state every 1–1.5 s. Each word or number stays at least 0.5 s, and I'll check it on contact sheets.
- **Render cost:** shader layers run on the CPU here (~2.4 s/frame), so about 6–8 minutes per language at 2× supersampling.
- **Shader layers render at 1×** and are scaled into the 2× frame. They're soft by nature (gradients, light, metal), and the type stays 2×.

---

## Build notes (approved as written; English)
- **Files:**
  - `film/reel-en.html` + `film/reel.js` (assembled from `film.js` helpers + `reel-scene.part.js` + `reel-audio.part.js`);
  - `film/gpu-layer.js` is the shader bridge bundle; its source and MIT licence are in `vendor/shaders/`;
  - the text is in `strings.py` (`reel` block).
- **Shader layers:** one small WebGPU renderer per effect (MeshGradient, Aurora, Godrays, SunBurst, LiquidMetal, LensFlare) at 720×1280,
  composited in 2D with their opacity and blend mode under the 2× type.
  - A layer only renders while visible, and its clock always advances by exactly `t − last t` (`renderSyntheticFrame`), so the frame at
    t is identical whatever path the export took.
  - A changed prop (the sphere's scale) lands one frame late in the library, so that layer renders a flush frame first.
- **Found while inspecting:**
  1. Hiding a layer inside one shared renderer freezes its clock, which made frames path-dependent. Fixed with one renderer per effect.
  2. The library caps its buffer to the window size; `tools/chrome-gpu` opens a 1400×2400 window and enables SwiftShader's WebGPU.
  3. The odometer now has fixed, tabular columns and carries like a real one.
  4. The dial's dark disc no longer leaves a hard edge in the gradient.
  5. The logo gets a dark bed so the amber "Sentinel" reads on the gradient.
- **Verified:**
  - `verify.mjs` is pure at 0.5, 3.6, 4.2, 5.1, 6.5, 9.6 and 14.8 s (the melt, the drop, PASS with its glitch, TAKE, the rules, the logo);
  - contact sheet every 0.5 s.
  - Score: −16.1 LUFS before normalising to −14 for the upload, sample peak −1.9 dBFS. Not listened to.
- **Speed:** about 2–3 s per frame on a CPU-only machine (SwiftShader). A machine with a GPU is far faster.

---

## Revision 1: "Replace the orb and static elements with a car or real ride elements that makes more sense"

The same structure, timing and score; every abstract element becomes something from a ride:

| Time | v1 | v2 |
|---|---|---|
| 0–1 | amber dot + radar rings | **a car seen from above** driving up a night avenue, a location pulse under it, the indicator blinking |
| 1–2 | offer pill | a **pickup pin** and a far **drop-off pin** drop on the map, the **route** draws itself, and the offer pill (odometer $18.40, countdown) pops |
| 2–3 | DO / THE / MATHS? on black | the same type **over the map**; the raining numbers are the trip's own figures |
| 3–4 | liquid-metal orb | the camera dives into the car: the numbers fall into the **speedometer**, whose needle thrashes and overheats |
| 4 | the orb snaps into the dial | **the speedometer becomes the Rate Dial** (same gauge, new meaning) |
| 4.5–7.5 | gradient, rose tint, sunburst | through the windscreen: a **red traffic light** on PASS; it turns **green** on TAKE (lens flare) and the car pulls away |
| 7.5–9 | god rays over black | **street lights streaking past**, headlight beams (god rays) |
| 9–11 | text pills + lock on aurora | back above the car: **$/h, $/km, pickup pin, stranding pin with the dashed empty drive back, EV battery**, which gather into the **phone in its mount** with a lock: ON-DEVICE |
| 11–13.5 | headline on aurora | the headline seen **from the driver's seat**, driving at night |
| 13.5–16 | logo on a gradient | the logo over the **map at night**, the car driving on |

The first version is kept as `ridesentinel-reel-en-v1.mp4` for comparison.

### Build notes (v2)
- **Files:**
  - `reel-scene.part.js` is v2; v1's scene is kept as `reel-scene.v1.part.js`;
  - the street seen through the windscreen reuses the French film's street (`fr-car.part.js`).
- **Shader layers:** only **Godrays** (headlight beams on the claim and the headline) and **LensFlare** (the light turning green on TAKE) are left. Both
  are screen-blended over drawn scenes. The gradient, aurora, sunburst and liquid-metal layers are gone with the abstract shapes.
- **One continuous world:**
  - the map scrolls with the car (`150 px/s`);
  - the cockpit's street moves at the car's integrated speed: stopped at the red light, pulling away on green;
  - the speedometer's needle is the same object as the Rate Dial's.
- **Score:** the v1 score plus an engine (idle at the light, revving on TAKE) and indicator ticks.
- **Found while inspecting:**
  1. The traffic light and the verdict word carried into the headline shot. Both now end at 9 s.
  2. The dial's "YOUR $40 BAR" label showed through the headline. It now fades on the headline.
  3. The logo's dark bed had a hard edge. It's now a radial fade.
- **Verified:**
  - `verify.mjs` is pure at 0.6, 1.8, 3.4, 4.2, 5.1, 6.5, 8.2, 10.2, 12.4 and 15 s, and again after the last fixes.
  - Contact sheets every 0.5 s.
  - Score: −15.5 LUFS before normalising to −14, sample peak −2.0 dBFS. Not listened to.
