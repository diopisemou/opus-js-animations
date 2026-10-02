# RideSentinel, "Two drivers, one day" (EN + FR): treatment

**Logline.** Two drivers leave at dawn in the same city, in the same car, on the same day. One decides by feel and by mental maths; the
other has RideSentinel. Offer by offer, their days drift apart, and at night their endings are nothing alike.

**The central image.** The screen split in two, one driver above and the other below, each on their own map of the same city. The trails
of their rides draw themselves all day long. Above, long grey empty legs stretch towards the edge of the map; below, the trails stay in
the dense, amber heart of the city.

**Look.** The same 2D night-dashboard universe and palette (navy, amber, teal, rose):
- the map seen from above, as in the phone;
- the light of the day sweeps over both maps: a pink dawn, a pale midday, an orange sunset, a blue night;
- each car is a small arrow, with a comet trail behind it: paid kilometres in ink and empty kilometres in dotted grey;
- above (**without the app**, a rose tag): offers arrive with "?" and maths bubbles, and he hesitates;
- below (**with RideSentinel**, a teal tag): the small Rate Dial answers TAKE or PASS at once;
- a shared clock in the middle runs 6:00 → 22:00;
- each half has two live counters: **earnings** and **empty km**.

**Sound.** A score generated in JavaScript at 120 BPM that follows the day: a sparse dawn, a groove at midday, sunset, and a calm night
for the ending. Each accepted offer gets a small "ding" (lower above, brighter below); each PASS gets a soft click.

**Structure.** About 30 s, one continuous scene (the two maps) whose state changes over the hours.

| Time | Hour | Above: without the app | Below: with RideSentinel | Text |
|---|---|---|---|---|
| 0–2 | 6:00 | a car at dawn, at the start | the same car, the same start | **Same city. Same car. Same day.** |
| 2–8 | 6–11h | an offer with a 14 min pickup: he hesitates ("?"), accepts, and drives a long way to the pickup | the same offer, **PASS** at once; a closer one, **TAKE** | the tags *Without the app* / *With RideSentinel* |
| 8–14 | 11–15h | a trip to the far suburbs: the ride ends at the edge of the map, then a long **empty drive back** (dotted grey; the empty-km counter climbs) | **PASS** "stranding", then short trips in the centre | "The bad offers look like good ones." |
| 14–20 | 15–19h | an offer expires while he calculates; his $/h drops | the dial keeps TAKE/PASS coming in under a second | — |
| 20–24 | 22:00 | night: his car alone at the edge of the map, far from home | his car back home, and the trail makes a dense web in the centre | — |
| 24–30 | end of day | **scorecard**: earnings · empty km · effective $/h, above vs below → **"Same day. Different decisions."** → end card with the small print | | |

**Outcomes (example figures, to confirm).** The same 10 hours for both:
- **Without:** $198 · 71 empty km · $19.80/h effective.
- **With:** $286 · 22 empty km · $28.60/h effective.

These are an **illustrative example**. The small print will say it: *"Illustrative example. Results vary; no earnings are guaranteed."*
That matches your site's FAQ ("We do not guarantee… earnings… example offers, not promised results").

**Formats.** 9:16 at 1080×1920, 30 fps; the English and French versions come from one source (only the text changes).

**Risks.**
- **Earnings claim:** the figures stay modest and labelled as an example (the small print is on the scorecard, not only on the end card).
- **The split screen must read in 1 second:** tags, colours and the shared clock. I'll check it on a contact sheet at thumbnail size.
- **Two maps at once can crowd the frame:** one offer card at a time per half, small and short-lived.

---

## Decisions (approved)

- **Visual:** the split map all day (6:00 → 22:00), then **both drivers at night, seen from behind** (as in the French film):
  - **Sam** (without the app) is stopped on a dark road on the outskirts, head in their hands, **25 km from home**;
  - **Alex** (with RideSentinel) is parked in front of the house, leaning back.
- **Outcome:** example figures on the scorecard, with the small print *Illustrative example. Results vary; no earnings are guaranteed.*
  - Sam: $198 · 71 km empty · $19.80/h. Alex: $286 · 22 km empty · $28.60/h. Both: 10 h online.
  - Every trip shown on the map adds exactly its fare to the counter, and the counters land exactly on these totals.
- **Names:** Sam (above, a rose tag "Without the app") and Alex (below, a teal tag "With RideSentinel"). The names work in English and
  French and imply no gender on screen.
- **Length:** about 35 s: 0–2 opening · 2–22 the day · 22–27 the night · 27–31.5 the scorecard · 31.5–35 the end card.
- **The same offers reach both drivers.** Sam takes the long pickup and the trip to the suburbs (then drives back empty), and lets one
  offer expire while calculating. Alex passes on those (long pickup, stranding) and chains short trips in the centre.

## Build notes

- **Files:**
  - `day-en.html` / `day-fr.html` + `day.js` are the film. `day.js` is assembled from `film.js` (text, end card, score helpers),
    `fr-car.part.js` (interior, driver, rim light), `day-scene.part.js` and `day-audio.part.js`;
  - the text lives in `strings.py` → `strings.js` (`day` block);
  - `mix-day.wav` is the score, shared by both languages;
  - `ridesentinel-two-drivers-{en,fr}.mp4` are the upload copies.
- **Data drives both picture and sound:**
  - `LEGS` (each leg: pickup / trip / empty, times, km or fare) sets the car, the trails and the counters;
  - `OFFERS_DAY` sets the cards (Sam: maths bubbles then ACCEPTED / EXPIRED; Alex: a small dial then TAKE / PASS) and their sounds.
  - Totals: Sam $198 / 71 km empty; Alex $286 / 22 km empty. They match the scorecard.
- **Changes while inspecting:**
  - The clock band no longer shows through the scorecard.
  - The night street lights are a soft glow instead of a blob.
  - The night shots are framed to show head and shoulders, and the house was lowered into view.
  - The night shots no longer show through the scorecard.
- **Verified:** `verify.mjs --ss 2` passes at 11 times; I read contact sheets of EN and FR and frames at half size.
  - Mix: −16.3 LUFS, sample peak −2.9 dBFS, even across the day. Not listened to.
