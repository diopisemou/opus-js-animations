# RideSentinel daily content

One short a day for rideshare drivers, published to the RideSentinel **TikTok (@ridesentinel), Instagram (@ridesentinel)
and Facebook (RideSentinel)** accounts through Postiz. Two series and two languages rotate:

| day in cycle | series | language |
|---|---|---|
| 1 | **Pass or Take?**: one example offer worked out on screen | EN |
| 2 | **Driver tip**: a 30–50 s explainer (shorts-pipeline grammars) | FR |
| 3 | Pass or Take? | FR |
| 4 | Driver tip | EN |

The cycle is read from `state/history.json` (`daily.py next`). Voices are the founder's ElevenLabs clones
("Bachir Avatar" EN, "Bachir Voice FR"); every video and caption discloses the AI voice and that the offer is an example.

## A run

```sh
cd work/ridesentinel/daily
python3 daily.py next                      # today's series + language, the brief, the rules, the spec template
```

**Pass or Take?** (built with the brand film engine in `../film`: `pot-scene.part.js`, `pot-audio.part.js`)
```sh
python3 daily.py calc work/spec.json       # the figures (total minutes, real $/h, trip-only $/h, verdict), computed
python3 daily.py build work/spec.json      # voice → timing → film → render → QA  →  out/<date>-<slug>/
# look at out/<dir>/sheet.jpg and qa.json (script vs transcript)
python3 daily.py publish out/<dir>         # Postiz: upload once, schedule 3 min out on the three accounts
python3 daily.py status out/<dir>          # a few minutes later: QUEUE / PUBLISHED / ERROR per account
python3 daily.py record out/<dir> --series pot --lang en
```

**Driver tip** (needs the `shorts-pipeline` branch of github.com/diopisemou/huashu-art-motion; the engine is that repo's root)
```sh
export HUASHU_DIR=<clone of huashu-art-motion>; cd $HUASHU_DIR/shorts-pipeline
env -u YT_TOKEN_JSON ELEVENLABS_VOICE_ID=<voice id> uv run shorts --config <daily>/tips/<lang>/config.yaml next
env -u YT_TOKEN_JSON ELEVENLABS_VOICE_ID=<voice id> uv run shorts --config <daily>/tips/<lang>/config.yaml build --plan plan.json --record
python3 daily.py publish-tip tips/<lang>/out/<dir> --lang <lang>
python3 daily.py record tips/<lang>/out/<dir> --series tip --lang <lang>
```
Helpers: `daily.py status <out dir>` (each post's state and link), `daily.py credits` (ElevenLabs characters left),
`daily.py voice en|fr` (the voice id), `daily.py publish <dir> --only tiktok|instagram|facebook` (re-post to one failed
account; a second post to an account that worked is refused).

**The scheduled run** follows [ROUTINE.md](ROUTINE.md): a dedicated session on this branch, woken daily by a Routine.
**Never `shorts publish` with these configs:** the YouTube token in the environment belongs to the Bidew Builds channel.

## What is checked before anything is posted
- Pass or Take: frames pure, 1080×1920, 15–58 s, −17.5…−11 LUFS, audio present, and the voice transcribed with ElevenLabs Scribe
  and compared with the script (`qa.json`, both texts printed). `publish` refuses when QA fails.
- Tips: shorts-pipeline's own QA (length, loudness, STT vs script, contact sheet).
- The session looks at the contact sheet before publishing.

## Rules (also printed by `daily.py next`)
Example offers only; figures from `daily.py calc`; no platform logos or UI; decisions happen parked, never while driving;
no advice that breaks platform rules; RideSentinel is in development (no promised features, prices or dates).

## Files
- `config.yaml`: brief, rules, voices, CTA, link, disclosure, hashtags, the Postiz integration ids.
- `topics/pot.yaml`: Pass-or-Take scenario seeds (popped by `record`).
- `tips/<lang>/config.yaml`, `tips/<lang>/topics.yaml`, `tips/<lang>/state/history.json`: the shorts-pipeline side.
- `state/history.json`: what was published, where, and what failed.
- `out/`, `tips/*/out/`: renders (not committed).
