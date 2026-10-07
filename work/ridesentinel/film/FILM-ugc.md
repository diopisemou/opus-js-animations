# RideSentinel, "Drivers, quick one" (EN · FR · AR): UGC treatment and script

**What it is.** A creator-style ad: a person in a parked car at night talks straight into a phone camera, with fast jump cuts, big
word-by-word captions, and the app popping up on screen as he explains it. This is the format that performs best on TikTok and Reels,
because it looks like a post, not an ad.

**How it's made** (ElevenLabs API, Pro plan):
1. **The presenter:** one generated portrait (`/v1/flows/image`): a man in his 40s in the driver's seat of a **parked** car at night,
   phone-selfie framing. One image serves all three languages.
2. **His voice:** **your cloned voices**: "Bachir Avatar" (EN), "Bachir Voice FR", "Bachir AR". Each line is voiced separately.
3. **Lip-sync:** each line goes through **Creatify Aurora** (`/v1/flows/video`, portrait + line audio → talking clip, 720p). One clip
   per line gives natural jump cuts and limits the cost of a bad take.
4. **Everything else is built here,** in the same seek(t) pipeline as the other films:
   - jump cuts, with a slight zoom on alternate lines (as creators do);
   - captions;
   - **app inserts** using the real UI from the other films (offer card with countdown, Rate Dial, PASS/TAKE, on-device lock), shown as a
     green-screen-style split: the phone on top, the presenter on the bottom;
   - a light generated beat, plus pops and whooshes on each insert.

**Honesty, built in.**
- The presenter is AI-generated, so a small **"AI avatar"** tag stays in a corner. TikTok and Meta require a label for realistic AI people.
- The voice is yours, so the script speaks as **the team building it** ("we're building"). No invented driver testimonial and no
  "I made $X more" claims; the app is in development.
- The figures are the same example offer as the other films, and the end card keeps "example offers · not affiliated with Uber".
- Safety: the car is visibly parked, and every insert shows the phone in its mount.

**Look.** A realistic presenter (generated), with the brand world on the inserts and end card (navy, amber, teal, rose, Barlow
Condensed): white captions with a dark outline, the spoken word in amber.

## Script (the picture is timed to the measured voice: EN 32 s, FR 38 s, AR 44 s)

| # | EN line | Picture |
|---|---|---|
| 1 | Drivers, quick one. Stop doing maths at red lights. | **Hook:** a tight face shot; "STOP DOING MATHS" stamps on screen |
| 2 | An offer pops up: eighteen forty, seven minutes away, thirty-one minute trip. You've got fifteen seconds. | Split: the offer card with its countdown ring running |
| 3 | Is that even forty an hour after the drive back? Nobody does that in their head. | Face; the maths bubbles from the POV film float around him |
| 4 | That's why we're building RideSentinel. | Cut wide; the logo pops |
| 5 | It reads the offer and gives you one number: what you really make per hour, pickup and drive back included. | Split: the Rate Dial sweeps |
| 6 | Below your bar? Pass. Above it? Take. | Split: **PASS** (rose) → **TAKE** (teal), on the beat |
| 7 | And it all runs on your phone. Nothing leaves it. | Split: the on-device lock |
| 8 | Early access on Android is open. Link: ridesentinel dot app. | Face, then the end card: logo, URL, small print |

**Français**
1. Les chauffeurs, petite question. Arrêtez de calculer aux feux rouges.
2. Une offre arrive : dix-huit quarante, à sept minutes, trente et une minutes de trajet. Vous avez quinze secondes.
3. Est-ce que ça fait au moins quarante de l'heure, avec le retour ? Personne ne calcule ça de tête.
4. C'est pour ça qu'on construit RideSentinel.
5. L'appli lit l'offre et vous donne un seul chiffre : ce que vous gagnez vraiment de l'heure, approche et retour compris.
6. Sous votre seuil ? Vous passez. Au-dessus ? Vous prenez.
7. Et tout se passe sur votre téléphone. Rien n'en sort.
8. L'accès anticipé sur Android est ouvert. Lien : ridesentinel point app.

**العربية**
1. يا سائقين، سؤال سريع. توقّفوا عن الحساب عند الإشارة الحمراء.
2. يصلك عرض: ثمانية عشر وأربعون، على بعد سبع دقائق، رحلة إحدى وثلاثين دقيقة. أمامك خمس عشرة ثانية.
3. هل هذا أربعون في الساعة على الأقل مع طريق العودة؟ لا أحد يحسب هذا في رأسه.
4. لهذا نبني رايد سنتينل.
5. يقرأ العرض ويعطيك رقمًا واحدًا: ربحك الحقيقي في الساعة، مع الوصول وطريق العودة.
6. أقل من حدّك؟ ارفض. أعلى منه؟ اقبل.
7. وكل شيء يعمل على هاتفك. لا شيء يخرج منه.
8. الوصول المبكر على أندرويد مفتوح. الرابط: رايد سنتينل دوت آب.

## Cost and time (Pro)
- **Voice:** about 1,500 credits for all three languages.
- **Portrait:** one image, plus maybe one or two retries.
- **Lip-sync:** 8 clips × 3 languages = 24 Aurora clips, about 80 s of video in total.
  - ElevenLabs doesn't publish the per-second price for the API. I'll measure it on the first clip and stop to tell you before doing the rest.
- **Rendering here:** about 10 minutes per language.

## Risks
- **Lip-sync quality** on a generated face is usually good at 720p in a phone-selfie look. I'll check every clip and redo bad ones.
- **Accent match:** your FR and AR clones have your accent, so the presenter is styled to match the voice (a man in his 40s).
- **Arabic:** the script is in Modern Standard Arabic; have a native speaker check it. Your "Bachir AR" clone was trained on Tunisian
  Arabic, so a Tunisian-dialect script may sound more natural. Tell me if you prefer that.
- **Generated faces can be off** (hands, teeth). The framing keeps the hands out of shot.

---

## Decisions (approved)
- Script approved as written, with a **fictional presenter**. Voices: **Bachir Avatar** (EN), **Bachir Voice FR**, **Bachir AR**.

## Build notes
- **Files:**
  - `ugc-{en,fr,ar}.html` + `ugc.js`, assembled by `build-ugc.py` from `pov.js`'s shared parts + `ugc-scene.part.js` + `ugc-audio.part.js`;
  - the text is in `strings.py` (`UGC`);
  - the voice is in `source/ugc-<lang>/`, with `align-ugc-<lang>.js` and `audio-ugc-<lang>.js`;
  - `aroll-<lang>.js` is the A-roll manifest, from `../tools/ugc_aroll.py`.
- **The voice, checked without listening:** `../tools/stt_check.py source/ugc-<lang>` transcribes the track with ElevenLabs Scribe and
  prints it under the script. That caught one problem: French line 6 ran together ("passez au-dessus"), so it now reads "Vous passez… Vous prenez".
- **Pace:**
  - FR and AR are voiced at speed 1.1, EN at 1.05;
  - Arabic line 5 was shortened;
  - the Arabic voice adds a natural "aaa" before line 3, which suits UGC and was kept.
- **A-roll:**
  - each line's audio, cut from the voice track (−0.1 s/+0.15 s; the last line holds 2.4 s for the end card), is lip-synced on the one
    portrait;
  - the frames are extracted to `ugc/<lang>/a<n>/` and loaded by an async `seek`, so the film stays a pure function of t;
  - lines without a clip draw a stand-in, so the whole film can be timed and checked before the Pro plan.
  - `tools/chrome-media` adds `--allow-file-access-from-files`. Without it a `file://` frame taints the canvas and the export fails.
- **Found while inspecting:**
  1. "Below your bar? Pass. Above it? Take." is under a second apart, so PASS now holds until the word "Take" and the needle climbs past the bar.
  2. The end card was too short and now holds 2.5 s.
  3. The Arabic stamp now matches the spoken verb (توقّفوا).
- **Verified:**
  - `verify.mjs` is pure at 9 times in EN, including with a synthetic A-roll clip (the frame path, then removed);
  - contact sheets for EN and AR (right-to-left captions, the AI tag on the right).

- **Room tone, made with the ElevenLabs MCP:**
  - the connected ElevenLabs MCP (the restricted connector) made a car-cabin room tone at night: Sound Effects v2, 20 s, seamless
    loop, 2 takes for 133 credits;
  - take 2 was kept (−51 LUFS, 2.6 LU range, no spikes); take 1 was near silence;
  - it plays under everything, never ducked, about 21 dB under the voice, as a phone microphone would hear it;
  - it is in `amb-ugc.js`, generated and not committed; the source is `ugc/sfx/cabin-2.mp3`, and the flow is in the ElevenLabs workspace.
- **The restricted MCP has no image or video nodes.** The presenter still needs the image and video endpoints: the API on a Pro plan,
  or the full ElevenLabs connector (`https://api.elevenlabs.io/v1/mcp`, added as a custom connector), whose Flows include Avatars.

## English, made through the ElevenLabs MCP (full connector), on the Creator plan
The REST image, video and asset endpoints need Pro; the full ElevenLabs MCP connector runs the same models on your current plan.
- **Flow:** "RideSentinel UGC: presenter (EN/FR/AR)" in the ElevenLabs workspace.
- **Presenter:** Seedream 5 Pro, 9:16 at 2K, 2 variants (1,636 credits). A was chosen (calmer, lips closed) and pinned as an asset node.
- **Speech:** each line voiced in the flow with "Bachir Avatar" (Multilingual v2), about 50–110 credits per line. The MCP can't take local
  files, so the flow's takes replace the earlier REST takes; those are kept in `source/ugc-en/orig/`.
- **Lip-sync:** Creatify Aurora at 720p, 8 clips, 704×1280 at 25 fps, 32.0 s in all, about 28,000 credits (~$5.10). One 3 s clip
  was priced and checked first (3,393 credits).
  - Compared on the same line: OmniHuman 1.5 (720p) 2,927 credits; HeyGen Avatar 4 (1080p) 2,424 credits.
- **Assembly:** `../tools/ugc_from_clips.py en` turns the clips into:
  - the voice track (each clip's own audio, 0.3 s apart);
  - the word timings: ElevenLabs forced alignment against the script, every word aligned, loss 0.58–0.83;
  - the frames and the A-roll manifest.
  A clip holds its last frame between lines and under the end card (reversed frames would mouth silence).
- **Checked:**
  - a Scribe transcript of the new voice track matches the script;
  - `verify.mjs` is pure at 9 times;
  - contact sheet of the whole ad.
- **FR and AR:** the same steps with "Bachir Voice FR" and "Bachir AR", about 40,000 and 46,000 credits at Aurora's rate. Not made yet.

## To finish (needs ElevenLabs Pro)
1. Upgrade the ElevenLabs account to Pro; the same key keeps working.
2. From `work/ridesentinel`: `./finish-ugc.sh probe` makes the portrait and the English hook clip and prints the credits it used.
   Check `film/ugc/presenter.png` and `film/ugc/en/clip-1.mp4`.
3. `./finish-ugc.sh all` makes the other 23 clips and renders `film/ridesentinel-ugc-{en,fr,ar}.mp4`.
