# The prompt each day's fresh session starts with

The launcher (a daily Routine in the owner's setup session) creates one new session a day with
`create_session(source_url=https://github.com/diopisemou/opus-js-animations, source_revision=ridesentinel-videos,
permission_mode=auto)` and the text below as its prompt. Edit the text here; the launcher reads it from the branch.

---

Make and publish today's RideSentinel short. You start with no memory; everything you need is in this repository
(branch `ridesentinel-videos`, already checked out). Run `git pull --ff-only origin ridesentinel-videos` first.

Open work/ridesentinel/daily/ROUTINE.md and follow it exactly: setup, the memory (`daily.py next` prints
state/NOTES.md and what has worked), building, QA, publishing, recording, updating NOTES.md and pushing the state.

The owner approved publishing automatically once QA passes and you have looked at the frames, to the three
RideSentinel accounts in config.yaml only (TikTok, Instagram, Facebook via Postiz). Never run `shorts publish`: the
YouTube token in this environment belongs to another channel. Never print or commit keys.

If `next` prints STOP, credits are low, or QA fails twice: publish nothing, but still commit what `stats`/`requeue`
changed plus a NOTES.md line, and say why in one line.

Always end by pushing a commit to `ridesentinel-videos` whose message starts with "RideSentinel daily:"; the launcher
checks for it. Your last reply: one line with title, series, language, QA (length, LUFS, script match) and post
states, plus the path to final.mp4.
