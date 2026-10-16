# The daily run (what the scheduled session does)

Each day a launcher creates a **fresh session** with this repository checked out (its prompt is `LAUNCH.md`); that
session follows this file (edit it here, not in the Routine). The session knows nothing about earlier days except what is committed on branch `ridesentinel-videos`:
- `state/NOTES.md`: the memory (lessons, incidents, what works). Read it first; update it last.
- `state/history.json`: every video and where it went; `state/stats.json`: views per video and account.
- `topics/pot.yaml`, `tips/<lang>/topics.yaml`: what comes next.

Approved by the owner: publish automatically once QA passes, to the RideSentinel TikTok, Instagram and Facebook
accounts only (the three Postiz ids in `config.yaml`). Nothing else is published, anywhere.

## 0. Set up, sync, remember
```sh
# a fresh container may have no checkout: attach diopisemou/opus-js-animations (add_repo, push access) and clone it
git clone --branch ridesentinel-videos https://github.com/diopisemou/opus-js-animations <home>/opus-js-animations
cd <home>/opus-js-animations   # or, if it exists: git fetch origin ridesentinel-videos && git checkout ridesentinel-videos && git pull --ff-only
git checkout -B ridesentinel-videos HEAD   # a fresh container checks the branch out as a detached HEAD; push needs the branch
cd work/ridesentinel/daily
python3 -c "import yaml" || pip install pyyaml
which postiz || npm install -g postiz
python3 daily.py stats       # refresh views per video (and the real post states) before deciding anything
python3 daily.py requeue     # posts left in ERROR by an account that was down: re-queued once
python3 daily.py next
```
- `next` prints the memory (NOTES.md), what works (top and bottom videos by views), today's series and language, the
  brief, the rules, recent titles, and the template to fill. Let what works shape the hook and the angle.
- `next` prints `STOP: last post ... h ago` when the last recorded post is under 14 hours old (a run that finished
  late). Stop then; say so in one line. Otherwise make today's video, even if a late run already posted on this date.
- ElevenLabs: `python3 daily.py credits` must show at least 5,000 characters left, or stop and report.
- Keys come from the environment (`ELEVENLABS_API_KEY`, `POSTIZ_API_KEY`). Never print them, never write them to a file.

## 1a. Pass or Take? (series `pot`)
1. Take the `NEXT SCENARIO SEED` printed by `next` (if the queue is empty, invent a new, plausible example offer and
   add a few seeds to `topics/pot.yaml`: vary city areas, times, PASS and TAKE, short trips that pay well, surge
   that pays badly, airport runs).
2. Write `work/spec.json` exactly as the template says (`work/spec-001.json` is a finished example, EN).
3. `python3 daily.py calc work/spec.json`, then write the six lines with *its* figures, spelled the way a voice says
   them ("eighteen forty", "dix-huit quarante"). Under 95 words. The verdict line says the verdict word.
4. `python3 daily.py build work/spec.json` (about 10–15 min). It writes `out/<date>-<slug>/`.
5. Look at `out/<dir>/sheet.jpg`, and pull 3 frames around the verdict from `final.mp4` with ffmpeg. Check that
   nothing overlaps, the figures read right, and the PASS/TAKE stamp is visible.
6. QA failed or something looks wrong → fix the spec or the script (`build --revoice` if the words changed) and
   rebuild, at most twice. Still failing → stop, publish nothing, report what failed.
7. `python3 daily.py publish out/<dir>`, then wait 5 minutes and `python3 daily.py status out/<dir>`.
8. `python3 daily.py record out/<dir> --series pot --lang <lang>`.

## 1b. Driver tip (series `tip`)
Needs the shorts-pipeline (branch `shorts-pipeline` of `diopisemou/huashu-art-motion`) and its engine (the same repo):
```sh
# once per container: if <home>/huashu-art-motion is missing, attach the repo (add_repo, read access) and clone it
git clone --branch shorts-pipeline https://github.com/diopisemou/huashu-art-motion <home>/huashu-art-motion
cd <home>/huashu-art-motion/shorts-pipeline
export HUASHU_DIR=<home>/huashu-art-motion   # the engine lives at the repo root (scripts/engine/render.py)
T=<repo root>/work/ridesentinel/daily/tips/<lang>
VOICE=$(python3 <repo root>/work/ridesentinel/daily/daily.py voice <lang>)
env -u YT_TOKEN_JSON ELEVENLABS_VOICE_ID=$VOICE uv run shorts --config $T/config.yaml next
# write plan.json from what `next` prints (format, grammar, styles, schema), then:
env -u YT_TOKEN_JSON ELEVENLABS_VOICE_ID=$VOICE uv run shorts --config $T/config.yaml build --plan plan.json --record
```
- **Always** `env -u YT_TOKEN_JSON` and **never** `shorts publish` or `shorts run`: the YouTube token in the
  environment is the Bidew Builds channel, not RideSentinel.
- `ELEVENLABS_VOICE_ID` must be the RideSentinel voice for that language (the environment holds another one).
- Same rules as `daily.py next` prints: example numbers only, no platform UI, decisions parked.
- `tips/fr/plan-example.json` is a plan that built and passed QA (hook_broll). In on-screen `text`/`sub`, use a straight
  apostrophe (d'accepter): the title card splits words at a curly one (d’ accepter). Narration can keep either.
- If the topic queue (`$T/topics.yaml`) is empty, add 5 new driver-tip topics in that language first.
- Look at the contact sheet and `qa_report.md` in the new `$T/out/<dir>/`. QA failed → fix the plan and rebuild
  (without `--record` the second time if the first already recorded), at most twice, else stop and report.
- Publish and record from `work/ridesentinel/daily`:
  `python3 daily.py publish-tip tips/<lang>/out/<dir> --lang <lang>`, wait 5 minutes, `python3 daily.py status
  tips/<lang>/out/<dir>`, then `python3 daily.py record tips/<lang>/out/<dir> --series tip --lang <lang>`.

## 2. After publishing
- `status` shows each post's state. A post in ERROR: report it; do **not** publish again to the accounts that
  worked (that makes duplicates). Tomorrow's `requeue` retries it once; if it fails again, say in NOTES.md and in
  your reply that the owner must reconnect that account in Postiz.
- Update `state/NOTES.md`: add a dated line for anything the next run must know (an incident, a fix, a scenario or
  hook that did well or badly in `stats`); merge or drop lines that are no longer true; keep it under ~60 lines.
- Commit the state (sources only; videos and audio never go to git):
  ```sh
  git add -f state/history.json state/stats.json state/NOTES.md topics/pot.yaml tips/*/topics.yaml tips/*/state/history.json
  git commit -m "RideSentinel daily: <series> <lang> <title>"   # with the session's attribution lines
  git push -u origin ridesentinel-videos   # rejected? git pull --no-rebase origin ridesentinel-videos, then push
  ```
  Even when the run stops early (STOP, low credits, QA failed), commit what `stats`/`requeue` changed and any note.
- Send the owner `final.mp4` (and the sheet) with one line: title, series, language, QA (length, LUFS, script match),
  and the post states.

## Never
- Publish when QA failed, or to any account other than the three in `config.yaml`.
- Run `shorts publish`, or touch the Bidew Builds channel.
- Put a key, a token, a video or a voice file in git.
- Invent statistics or real earnings; show a platform's logo or screen; suggest touching the phone while driving.
