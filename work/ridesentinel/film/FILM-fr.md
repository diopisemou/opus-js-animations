# RideSentinel, French version with a driver: treatment

**Logline.** A driver at night gets an offer and has to do the maths. While he is buried in the numbers, the car ahead brakes, and he
stops a hand's width from its bumper. We replay the same moment with RideSentinel: one glance at the dial, eyes back on the road,
and this time he brakes calmly, with room to spare.

**The central image.** Over his shoulder at night: his silhouette at the wheel, the phone in its mount on the dashboard, and the
brake lights of the car ahead filling the windscreen with red.

**Look.** The same night dashboard in flat 2D and the same palette (navy, amber, teal, rose), now inside a car:
- the windscreen shows the street at night with drifting lights and a car ahead;
- the driver is a faceless silhouette seen from behind and slightly to the side, with an amber rim light from the street. His posture
  tells it all: he leans towards the phone, rubs his forehead, then jerks upright;
- the phone is **mounted** on the dashboard and his hands stay on the wheel (handheld use is illegal in Québec);
- no Uber branding.

Text is in French, taken from the site where it exists ("Arrêtez de calculer au volant.", PRENDRE / PASSER, "votre barre de 40 $").

**Sound.** A score generated in JavaScript (120 BPM), as in the first version:
- act 1: a clock tick that speeds up, blips for the maths, a horn, a tyre screech, then silence and a heartbeat;
- the turn: a rewind;
- act 2: the calm groove, a chime on PRENDRE, and a soft, controlled brake.

**Structure.** About 26 s, in two acts on the same set (the car), with the turn at 10 s.

| Time | Beat | What we see | Text |
|---|---|---|---|
| 0–1 | hook | Night, over the shoulder. An offer lands on the phone ($18,40) with a 15 s countdown | **15 secondes pour décider.** |
| 1–5 | frustration | He leans towards the phone; maths bubbles swarm around his head (`18,40 ÷ 38 min`, `retour à vide ?`, `× 60 = ?`, `essence ?`). He rubs his forehead and shakes his head. Unnoticed, the car ahead is getting closer | **Et en plus, il faut calculer ?** |
| 5–6.5 | danger | The car ahead's brake lights flare. He is still looking down. The red fills the windscreen | — |
| 6.5–8 | near-miss | He jerks upright and slams the brakes: shake, screech, the bubbles shatter forward. The car stops a hand's width from the bumper. **No collision** | — |
| 8–10 | the cost | Silence, a heartbeat, hands gripping the wheel. On the phone: "Offre expirée" | **Aucune offre ne vaut ça.** |
| 10–11.5 | turn | The scene rewinds, and the maths is pulled into the Rate Dial | **Arrêtez de calculer au volant.** |
| 11.5–17 | with RideSentinel | Same road, new offer. The dial answers in under a second: **PRENDRE** (teal). One glance, then his head comes back up. The car ahead brakes; he is watching, so he slows gently and keeps his distance | *52 $/h effectif — dépasse votre barre de 40 $* then **Un coup d'œil. Les yeux sur la route.** |
| 17–20.5 | why | Three cards: **Vos règles** · **Moins d'une milliseconde** · **Rien ne quitte le téléphone** | |
| 20.5–26 | end card | Logo, wordmark, **Arrêtez de calculer au volant.** · **ridesentinel.app** · **Demander un accès anticipé** · *Android · en développement · offres d'exemple / Projet indépendant, non affilié à Uber* | |

**The hook.** The first frame is already in the car at night, with the bright offer on the phone and the silhouette leaning in.

**The ending.** The same end card as the other versions, in French.

**Format.** 9:16 at 1080×1920, 30 fps, with text in the safe zone (y 300–1450).

**Risks and limits.**
- **Safety message:** the film must never suggest that looking at the phone is fine. Act 2 shows *one glance* and his eyes back
  on the road before the braking, and the phone stays mounted with his hands on the wheel.
- **No safety claim:** the film shows a near-miss, but doesn't say the app prevents accidents (your site makes no such claim).
- **The silhouette from behind** has to read "frustrated" without a face. That rests on posture and gestures, and I'll check it on a
  1:1 crop.
- **The braking** must shake without a flash frame (a strip checked frame by frame).

---

## Build notes (approved: story as written, driver from behind, ~26 s)

- **Files:**
  - `fr.html` + `fr.js` are the film. `fr.js` is assembled from `film.js` (the phone, dial, cards, end card and score helpers) and
    `fr-scene.part.js`, `fr-car.part.js` and `fr-audio.part.js`;
  - `strings.py` → `strings.js` holds the French text, taken from the site's own translation where one exists;
  - `mix-fr.wav` is the score;
  - `ridesentinel-promo-fr-driver.mp4` is the upload copy.
- **Camera:** a pinhole at the driver's eyes (horizon y 620, focal 1300 px), so the car ahead, the lane dashes, the buildings and the
  street lamps all project from real distances. Act 1's gap closes 14 m → 10.5 m unnoticed, then fast after the brake lights (5.0 s),
  and stops at 0.35 m (7.35 s). Act 2 keeps 12 m, and he brakes calmly to 6.4 m.
- **The driver:** parts on a skeleton (arms as two segments, torso, neck, head, ears, hair), with an amber rim light from the street
  that turns red as the brake lights flood in (silhouette minus a shifted copy, on an offscreen layer).
  - Gestures: he leans towards the phone, raises a hand to his head (2.3–3.7 s), shakes his head (3.75–4.5 s), jolts upright on the
    brake, then breathes hard.
  - Act 2: one glance (12.0–12.95 s) timed to PRENDRE, then eyes up.
- **Changes while inspecting:**
  - The street was masked out by a path bug (fixed).
  - The brake-light glow was capped up close so the car ahead stays a car.
  - The mix was rebalanced so the screech (−17.7 dB RMS) is the loudest moment of act 1.
- **Verified:** `verify.mjs --ss 2` is pure at 9 times across the film; I read contact sheets of every second, a 0.1 s strip through the
  near-miss (no flash frames), and half-size frames of the gesture and the stop.
  - Mix: −16.3 LUFS, sample peak −2.6 dBFS. Not listened to.
