# Daily memory (read by every run; keep it under ~60 lines)

Each day a fresh session makes one video and remembers nothing from earlier days except what is committed here and
in `history.json`, `stats.json` and the topic queues. Add a dated line when something happens that the next run must
know (an account down, a fix, a format that did well or badly). Merge or delete lines that are no longer true.

## Standing facts
- Accounts: RideSentinel TikTok (@ridesentinel), Instagram (RideSentinel App), Facebook (RideSentinel), via Postiz.
- Competitor: Ride IQ (@ride_iq on TikTok), a French VTC app with the same pitch. Never copy or repost their videos.
  What gets views for them (Oct 2026): a concrete offer plus "would you take it?", the small fare that takes a long
  time ("€9 for 30 min", 44k), "an offer drops, seconds to decide" (34k), "the ride at €3/km" (20k),
  "which of the two?" (12k). Use the angles in our own words and numbers only.
- The French tip "Les 3 chiffres…" did best so far (463 views, mostly TikTok). See `daily.py stats`.

## Incidents and fixes
- 2026-10-09..16: Instagram rejected every post after the first (Postiz showed ERROR, no message); the owner
  reconnected it on Oct 16 and `daily.py requeue` (posts:status → schedule) published the two missed videos.
  If Instagram fails again: run `daily.py requeue` once; if it fails again, tell the owner to reconnect it in Postiz.
- 2026-10-14: a run that finished late blocked the next day's run (the old "already published today, UTC" check).
  Now `next` prints STOP only when the last post is under 14 h old.
- 2026-10-16: runs took 10–19 h in one long-lived session; from Oct 17 each day starts a fresh session instead.
- 2026-10-16: test launch of the fresh-session setup: `next` printed STOP (pot fr #2 posted 0.5 h earlier); nothing built.
  A fresh container lacks the `postiz` CLI: the `npm install -g postiz` step in setup is needed (worked).
  The checkout starts on a detached HEAD with a stale local `ridesentinel-videos`: before committing run
  `git checkout -B ridesentinel-videos HEAD` (HEAD is the pulled tip), or the push sends the old ref and is rejected.
- 2026-10-16 20:54 UTC: another launch hit STOP (pot fr #2 posted 5 h earlier); stats refreshed, nothing built. Next is tip en.
- 2026-10-17: tip en not built: the auto-mode permission classifier blocked running the freshly cloned huashu-art-motion
  shorts-pipeline ("code from external"). Owner: add a Bash allow rule for `uv run shorts` in that clone (or pre-install it in the
  environment). Stats refreshed, nothing published. Next run is still tip en.
  Fixed the same day: `python3 daily.py tip <lang> next|build ...` (allowlisted) runs shorts-pipeline; use only that.
- 2026-10-17 23:10 UTC: retry worked via `daily.py tip en ...`: tip en #4 "Three dollars a km can still pay badly" (hook_broll,
  two example offers from `calc`: $3/km→$24/h vs 72¢/km→$36/h), QA OK 32.0 s, -14.0 LUFS, match 0.95; build ~6 min.
  `sleep` before `status` must run as a background Bash command (a foreground sleep is blocked).
- 2026-10-18 21:04 UTC: pot en #3 "Seconds to decide: $21 for 18 minutes?" (first TAKE; skipped the per-km seed since
  tip en #4 just used that angle; reordered pot.yaml so `record` popped the used seed). QA OK 31.95 s, -14.7 LUFS, match 0.93.
  TikTok posts:create got a Postiz 502 ("Application failed to respond") = NOT CREATED; IG+FB fine. Checked posts:list
  (no TikTok post existed), then `publish --only tiktok` worked. `record` had already run: patched history.json by hand
  rather than re-recording (re-record duplicates the entry and pops another seed). Run `record` only after all posts exist.

## Craft
- Pass or Take: hold the PASS/TAKE stamp ≥ 1.5 s; pull frames around the verdict from final.mp4 (the sheet misses it).
- Tips: straight apostrophes in on-screen text (a curly one splits the title card: "d’ accepter").
- Scribe's script match varies (0.8–0.9 on the same audio); QA passes at ≥ 0.6.
