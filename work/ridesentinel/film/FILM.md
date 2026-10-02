# RideSentinel, "Stop doing maths at the wheel": treatment

**Logline.** A ride offer lands with a countdown and a cloud of maths swarms the screen. RideSentinel swallows the maths into one dial and answers
in a word, PASS and then TAKE, before the timer has barely moved.

**The central image.** The Rate Dial, the half-circle gauge from the logo, sitting over an offer card. Its needle swings to the offer's $/hr, a
white tick marks *your* bar, and one huge word (PASS in rose or TAKE in teal) stamps under it.

**Look.** A night dashboard in flat 2D, on brand:
- navy `#0C1220` is the night;
- amber `#F5B041` is the brand and the bar;
- teal `#2ED3B7` is TAKE;
- rose `#FF5C6C` is PASS;
- ink `#EEF1F7` is text;
- slate `#28344E` is the lines and the empty dial.

Behind the phone, soft out-of-focus city lights (amber and red streetlights and tail-lights) drift slowly, as if seen through a windscreen. The
phone is a clean dark mock-up with a generic offer card: no Uber logo or UI. Headlines are set in Barlow Condensed ExtraBold, figures in IBM Plex
Mono and body text in IBM Plex Sans (the site's own fonts). Canvas 2D with no 3D: it keeps the UI crisp and the brand exact.

**Sound.** A 20 s score generated in JavaScript at 120 BPM (a 2 s bar), mixed offline and synced to the picture:
- 0–4 s: a tense low drone and a clock tick on every beat, with small glitchy blips as each maths fragment appears.
- 4 s: a riser into a filtered kick-and-bass groove.
- Needle swings: a whoosh.
- PASS: a low muted thud.
- TAKE: a bright two-note chime.
- The feature chips each get a soft pluck.
- The end card: the groove drops to a pad with one bell on the logo, and a clean tail.

**Structure.** One continuous scene on one set (the phone in the car), with its state changing on each beat. The turn comes at 4.0 s.

| Time | Beat | What we see | What changes | Camera | Light and colour | Text |
|---|---|---|---|---|---|---|
| 0–0.5 | hook | An offer card slams up on the phone: **$18.40 · 7 min away · 31 min trip · 22 km**, with a 15 s countdown ring | the card overshoots and settles | tight on the phone | the card glows; bokeh behind | — |
| 0.5–4.0 | the problem | Maths erupts around the phone: `18.40 ÷ 38 min × 60`, `− drive back?`, `$/km = ?`, `battery 34%…`, `≥ $40/hr??` | fragments pop in on each tick and crowd the frame; the countdown drains | slow push in | cool, slightly desaturated; the countdown turns amber | top: **"15 seconds to decide."** then **"Do the maths?"** |
| 4.0–5.0 | the turn | Every fragment is sucked into the phone and folds into the Rate Dial, which draws itself on | the clutter collapses to one gauge | settle | the amber arc lights | **"Stop doing maths at the wheel."** (big, amber on "maths") |
| 5.0–8.5 | offer 1 | The dial sits over the offer. The white tick marks **your $40 bar** and the needle swings to **$23/hr** | at 6.0 **PASS** stamps in rose; the reason slides up | still | the arc and the glow go rose | *Effective $23/hr after stranding < your $40 bar* |
| 8.5–12.5 | offer 2 | A new card: **$31.20 · 3 min away · 32 min trip** | the needle sweeps past the tick to **$52/hr**; at 10.0 **TAKE** stamps in teal | still | teal floods the dial | *Effective $52/hr — clears your $40 bar* |
| 10.2 | the proof | The countdown ring shows **14 s** still left | "answered in the first second" is shown, not said | — | — | small: **"Answered with 14 s to spare"** |
| 12.5–16.0 | why trust it | The phone slides up and three chips land one by one | a pluck on each | ease back | each chip has an accent colour | **Your rules** ($/hr · $/km · pickup · stranding zones · EV range) · **Under a millisecond** · **Nothing leaves the phone** (a lock icon) |
| 16.0–20.0 | end card | The logo mark draws on (arc, needle, tick), then the wordmark **Ride**Sentinel | the needle ticks into place on a bell | centred | navy, amber glow | **Stop doing maths at the wheel.** / **ridesentinel.app** / **Ask about early access** / small: *Android · in development · independent, not affiliated with Uber* |

**The hook.** Frame 0 already shows a bright card mid-slam with the countdown ring, and within half a second the maths starts swarming.
Stop-scroll comes from the feeling "I know that panic."

**The ending.** The end card holds from 17 s on the logo, the line and the URL, then fades to navy over the last 0.6 s.

**Formats.** 9:16 at 1080×1920, 30 fps. All text sits inside the Reels/TikTok safe zone: nothing important in the top 250 px, the bottom
380 px or the right 140 px (where the UI buttons sit). Headlines are at least 96 px; the smallest body text is 34 px.

**Claims.** Every claim is taken from ridesentinel.app: the demo numbers, the rules, "under a millisecond", "nothing leaves the phone", "in
development", "not affiliated with Uber". No earnings are promised, and the offers are labelled as examples in the fine print.

**Risks.**
- The maths swarm could become unreadable noise. It should read as *overwhelm* at a glance, and a few fragments stay legible. I'll check it on
  a contact sheet.
- PASS and TAKE have to read at thumbnail size, so the words go large and the dial fills most of the phone.
- I can't listen to the mix here. I'll meter the levels (peak, loudness) and say so.

---

## Build notes (approved, then built)

- **Files:**
  - `index.html` is the film (seek(t) contract, with the score generated from the same `TL` timeline);
  - `fonts.css` holds Barlow Condensed and IBM Plex Sans/Mono inlined as data URIs, so the page renders offline from `file://`;
  - `mix.wav` is the rendered score;
  - `ridesentinel-promo-master.mp4` is the master and `ridesentinel-promo-upload.mp4` is the upload copy.
- **Changes from the treatment, made while inspecting:**
  - A generic **Accept** button sits under the offer card, so the lower phone screen isn't empty. It lights teal on TAKE and dims on PASS.
    RideSentinel only advises; it never "taps" in the film.
  - The reason captions went up to 54 px on two lines ("Effective $23/hr after / stranding < your $40 bar").
  - "Decided with 14 s on the clock" is set in mono under the TAKE reason. The card's countdown ring freezes at the verdict and pulses.
  - The first caption ("15 seconds to decide.") is already rising at frame 0, for the hook.
  - The maths is pulled into the dial within about 0.4 s of the turn, so the headline lands on a clean frame.
- **Score:**
  - 120 BPM in A minor (Am–F–C–G–Am–F from 4 s), resolving to C on the end card.
  - The problem section has a drone, a clock tick per beat (doubling in the last second) and one blip per maths fragment; a riser leads
    into the hit at 4.0.
  - PASS is a low thud; TAKE is a C6–G6 chime; each chip gets a pluck; the logo gets a C5–G5 bell.
  - Measured: −15.4 LUFS integrated, about −17 dBFS RMS in every section, sample peak −2.1 dBFS. Not listened to (no speakers here).
- **Verified:** `verify.mjs` passes at 1× and 2×; contact sheets of every second, the turn frame by frame, and PASS/TAKE/end card at
  half size.
- **Environment notes:**
  - Headless Chromium needs `--no-sandbox` as root.
  - Multi-MB CDP messages stall in this container, so the frames and the WAV were pulled in 1 MB chunks (patched copies of lib/render/verify).
