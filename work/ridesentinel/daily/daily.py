#!/usr/bin/env python3
"""RideSentinel daily content: one short a day, alternating two series and two languages, published to the RideSentinel
TikTok, Instagram and Facebook accounts through Postiz.

  python3 daily.py next                       what today's video is (series + language) and how to make it
  python3 daily.py calc   <spec.json>         Pass-or-Take: the figures the episode must use (computed, never typed)
  python3 daily.py build  <spec.json>         Pass-or-Take: voice, timing, film, render, QA  -> out/<date>-<slug>/
  python3 daily.py publish <out dir>          post final.mp4 to the RideSentinel accounts (refuses when QA failed)
  python3 daily.py publish-tip <shorts out dir> --lang en|fr   post a driver tip built by shorts-pipeline
  python3 daily.py status <out dir>           the state of each post (QUEUE, PUBLISHED, ERROR) and its link
  python3 daily.py record <out dir> --series pot|tip --lang en|fr   add the run to state/history.json
  python3 daily.py credits                    ElevenLabs characters left this period
  python3 daily.py voice en|fr                the RideSentinel voice id for a language (for shorts-pipeline)

Run from work/ridesentinel/daily. Keys come from the environment (ELEVENLABS_API_KEY, POSTIZ_API_KEY), never from files here.
"""
import argparse, datetime as dt, difflib, json, math, os, re, shutil, subprocess, sys, unicodedata
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
FILM = HERE.parent / 'film'
TOOLS = HERE.parent / 'tools'
SKILL = HERE.parent.parent.parent / 'skills' / 'opus-js-animations' / 'scripts'
CFG = yaml.safe_load((HERE / 'config.yaml').read_text())
HIST = HERE / 'state' / 'history.json'
CYCLE = [('pot', 'en'), ('tip', 'fr'), ('pot', 'fr'), ('tip', 'en')]


def sh(*cmd, cwd=None, check=True, env=None):
    r = subprocess.run([str(c) for c in cmd], cwd=cwd, capture_output=True, text=True, env=env)
    if check and r.returncode != 0:
        sys.exit(f'{cmd[0]} {cmd[1] if len(cmd) > 1 else ""} failed:\n{(r.stderr or r.stdout)[-1500:]}')
    return r


def history():
    return json.loads(HIST.read_text()) if HIST.exists() else []


# ─── next ────────────────────────────────────────────────────────────────
def cmd_next(a):
    h = history()
    series, lang = CYCLE[len(h) % len(CYCLE)]
    if a.series: series = a.series
    if a.lang: lang = a.lang
    print(f'TODAY: series={series} lang={lang}   (history: {len(h)} published; cycle {CYCLE})\n')
    print('BRIEF:', CFG['brief'].strip(), '\n')
    print('RULES:\n' + '\n'.join(f'- {r}' for r in CFG['rules']), '\n')
    recent = [e.get('title', '') for e in h[-20:]]
    print('RECENT TITLES (do not repeat the angle):\n' + '\n'.join(f'- {t}' for t in recent) if recent else 'RECENT TITLES: none yet', '\n')
    if series == 'pot':
        q = yaml.safe_load((HERE / 'topics' / 'pot.yaml').read_text()) or []
        print('NEXT SCENARIO SEED:', q[0] if q else '(queue empty: invent one that fits the brief)')
        print(f'''
WRITE spec.json (in this folder or anywhere) with exactly these keys:
{{
  "lang": "{lang}",
  "slug": "short-kebab-case",
  "setting": {{"time": "2:04 AM", "place": "Downtown"}},          // on-screen chip, in {lang}
  "offer": {{"fare": 18.40, "pickup_min": 7, "pickup_km": 2.9, "trip_min": 31, "trip_km": 22.4,
            "drop_label": "Far suburbs", "back_min": 25, "back_km": 20}}, // back_* = the empty drive back (0 if none)
  "bar": {CFG["default_bar"]},                                            // the driver's minimum $/h
  "lines": ["hook", "offer", "math", "verdict", "lesson", "cta"],      // 6 spoken lines, in {lang}
  "lesson_text": "≤ 8 words shown big on screen",
  "title": "≤ 70 chars", "caption": "1–2 sentences", "hashtags": ["rideshare", "..."]
}}
Then run `python3 daily.py calc spec.json` and write the six lines with ITS figures (rounded as printed):
 1 hook: the setting + "would you take it?" ({'PASS or TAKE?' if lang == 'en' else 'PASSER ou PRENDRE ?'} is stamped on screen)
 2 offer: fare, pickup time, trip time, where it drops you
 3 math: add the pickup and the drive back; say the total minutes
 4 verdict: the real $/h vs the bar, and the verdict word ({'"pass" or "take"' if lang == 'en' else '« passez » ou « prenez »'})
 5 lesson: one sentence a driver can reuse
 6 cta: {CFG["cta"][lang]}
Keep the whole script under {CFG["max_words"]} words. Then `python3 daily.py build spec.json`.''')
    else:
        print(f'''DRIVER TIP via shorts-pipeline (config: {HERE / "tips" / lang / "config.yaml"}):
  (clone: git clone --branch shorts-pipeline https://github.com/diopisemou/huashu-art-motion <home>/huashu-art-motion)
  export HUASHU_DIR=<home>/huashu-art-motion     # the engine is the repo root
  cd $HUASHU_DIR/shorts-pipeline && env -u YT_TOKEN_JSON ELEVENLABS_VOICE_ID={CFG["voices"][lang]["id"]} uv run shorts --config {HERE / "tips" / lang / "config.yaml"} next
  write plan.json from its output, then:
  env -u YT_TOKEN_JSON ELEVENLABS_VOICE_ID={CFG["voices"][lang]["id"]} uv run shorts --config {HERE / "tips" / lang / "config.yaml"} build --plan plan.json --record
  look at the sheet and qa_report.md, then: python3 daily.py publish-tip {HERE / "tips" / lang / "out"}/<dir> --lang {lang}
  (the full procedure: ROUTINE.md)
NEVER run `shorts publish` for RideSentinel: it uploads to the Bidew Builds YouTube channel.''')


# ─── Pass-or-Take: figures ─────────────────────────────────────────────────
def calc(spec):
    o, bar = spec['offer'], float(spec['bar'])
    total = o['pickup_min'] + o['trip_min'] + o.get('back_min', 0)
    km = o['pickup_km'] + o['trip_km'] + o.get('back_km', 0)
    c = {'total_min': total, 'total_km': round(km, 1),
         'per_hour': round(o['fare'] / total * 60, 2), 'per_km': round(o['fare'] / km, 2),
         'trip_only_per_hour': round(o['fare'] / o['trip_min'] * 60, 2)}
    c['verdict'] = 'TAKE' if c['per_hour'] >= bar else 'PASS'
    return c


def cmd_calc(a):
    spec = json.loads(Path(a.spec).read_text())
    c = calc(spec)
    print(json.dumps(c, indent=1))
    print(f"\nSay: total {c['total_min']} minutes; real rate about {round(c['per_hour'])} an hour "
          f"(trip-only would look like {round(c['trip_only_per_hour'])}); bar {spec['bar']}; verdict {c['verdict']}.")


# ─── Pass-or-Take: build ───────────────────────────────────────────────────
def norm(s):
    s = unicodedata.normalize('NFKD', s.lower())
    return re.sub(r'[^a-z0-9 ]+', ' ', ''.join(ch for ch in s if not unicodedata.combining(ch))).split()


def build_page(out):
    """Assemble pot.js from pov.js's shared parts + the episode scene and score, and the page that loads this episode."""
    pov = (FILM / 'pov.js').read_text()
    i, j = pov.index('// ════ SCENE ("POV'), pov.index('// ─── baked once')
    js = pov[:i] + (FILM / 'pot-scene.part.js').read_text() + '\n' + pov[j:]
    a0, a1 = js.index('  // ── "POV". The voice leads'), js.index('  return ac.startRendering();')
    js = js[:a0] + (FILM / 'pot-audio.part.js').read_text() + js[a1:]
    js = js.replace('for (const g of [ctx, CHAR]) {', 'for (const g of [ctx]) {')
    assert '"Pass or Take?"' in js and 'for (const g of [ctx])' in js
    (FILM / 'pot.js').write_text(js)
    rel = os.path.relpath(out, FILM)
    shell = (FILM / 'pov-en.html').read_text()
    lang = json.loads((out / 'spec.json').read_text())['lang']
    h = shell.replace('<title>RideSentinel POV (EN)</title>', f'<title>RideSentinel Pass or Take ({lang.upper()})</title>')
    h = h.replace('<html lang="en">', f'<html lang="{lang}">').replace('window.FILM_LANG = "en";', f'window.FILM_LANG = "{lang}";')
    h = h.replace('<script src="audio-en.js" onerror="window.FILM_AUDIO_B64 = null"></script>',
                  f'<script src="{rel}/episode.js"></script>\n<script src="{rel}/audio.js" onerror="window.FILM_AUDIO_B64 = null"></script>')
    h = h.replace('<script src="align-en.js" onerror="window.POV_ALIGN = null"></script>', f'<script src="{rel}/align.js" onerror="window.POT_ALIGN = null"></script>')
    h = h.replace('<script src="pov.js"></script>', '<script src="pot.js"></script>')
    page = FILM / f'pot-{out.name}.html'
    page.write_text(h)
    return page


def cmd_build(a):
    spec = json.loads(Path(a.spec).read_text())
    lang = spec['lang']
    for k in ('lines', 'lesson_text', 'title', 'caption', 'offer', 'setting', 'bar'):
        assert k in spec, f'spec is missing {k}'
    assert len(spec['lines']) == 6, 'spec.lines must have 6 lines: hook, offer, math, verdict, lesson, cta'
    words = sum(len(l.split()) for l in spec['lines'])
    if words > CFG['max_words']: sys.exit(f'script is {words} words; keep it under {CFG["max_words"]}')
    date = dt.date.today().isoformat()
    out = HERE / 'out' / f'{date}-{spec["slug"]}'
    out.mkdir(parents=True, exist_ok=True)
    c = calc(spec)
    spec['calc'] = c
    (out / 'spec.json').write_text(json.dumps(spec, ensure_ascii=False, indent=1))
    (out / 'episode.js').write_text('window.EP = ' + json.dumps(spec, ensure_ascii=False) + ';\n')
    # voice: one line per beat, in the founder's cloned voice for this language
    v = CFG['voices'][lang]
    (out / 'script.txt').write_text('\n'.join(spec['lines']) + '\n')
    if not (out / 'voice.align.json').exists() or a.revoice:
        sh('python3', SKILL / 'voiceover.py', out / 'script.txt', '--provider', 'elevenlabs', '--voice', v['name'],
           '--stability', v['stability'], '--style', v['style'], '--speed', v['speed'], '--gap', '.3', '--lead', '.2', '--tail', '.5',
           '--out', out, *(['--redo'] if a.revoice else []))
    al = json.loads((out / 'voice.align.json').read_text())
    lines = [{'text': ch['text'], 't0': ch['t0'], 't1': ch['t1'], 'words': ch.get('words') or []} for ch in al['chunks']]
    (out / 'align.js').write_text('window.POT_ALIGN = ' + json.dumps({'lines': lines, 'env': None, 'rate': 100}, ensure_ascii=False) + ';\n')
    sh('python3', SKILL / 'embed_audio.py', out / 'voice.mp3', out / 'audio.js')
    page = build_page(out)
    env = {**os.environ, 'CHROME': str(TOOLS / 'chrome')}
    qa = {'checks': {}, 'title': spec['title']}
    r = sh('node', TOOLS / 'verify.mjs', page.name, '--times', '1,4,8,12,16', cwd=FILM, env=env, check=False)
    qa['checks']['pure'] = 'pure at every tested time' in r.stdout
    sh('node', TOOLS / 'pullwav.mjs', page.name, out / 'mix.wav', cwd=FILM, env=env)
    sh('ffmpeg', '-v', 'error', '-y', '-i', out / 'mix.wav', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', out / 'mix-norm.wav')
    sh('node', TOOLS / 'render.mjs', page.name, '--fps', '30', '--audio', out / 'mix-norm.wav', '--out', out / 'master.mp4',
       '--workers', str(a.workers), '--ss', '2', cwd=FILM, env=env)
    sh('ffmpeg', '-v', 'error', '-y', '-i', out / 'master.mp4', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-maxrate', '20M',
       '-bufsize', '40M', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709',
       '-color_trc', 'bt709', '-g', '60', '-c:a', 'copy', '-movflags', '+faststart', out / 'final.mp4')
    finalize_qa(out, qa, ' '.join(spec['lines']), lang)


def finalize_qa(out, qa, script, lang):
    """Length, loudness, frame size, a contact sheet, and the voice transcribed and compared with the script."""
    final = out / 'final.mp4'
    pr = json.loads(sh('ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height:format=duration', '-of', 'json', final).stdout)
    dur = float(pr['format']['duration']); vs = [s for s in pr['streams'] if s['codec_type'] == 'video'][0]
    lufs = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', sh('ffmpeg', '-hide_banner', '-nostats', '-i', final, '-af', 'ebur128', '-f', 'null', '-', check=False).stderr)[-1])
    qa['duration'] = round(dur, 2); qa['lufs'] = lufs
    qa['checks']['size'] = (vs['width'], vs['height']) == (1080, 1920)
    qa['checks']['length'] = CFG['min_seconds'] <= dur <= CFG['max_seconds']
    qa['checks']['loudness'] = -17.5 <= lufs <= -11
    qa['checks']['audio'] = any(s['codec_type'] == 'audio' for s in pr['streams'])
    sh('ffmpeg', '-v', 'error', '-y', '-i', final, '-vf', f'fps={12 / dur:.4f},scale=216:-1,tile=6x2', '-frames:v', '1', out / 'sheet.jpg')
    sh('ffmpeg', '-v', 'error', '-y', '-i', final, '-vn', '-ac', '1', '-ar', '44100', '-b:a', '128k', out / 'check.mp3')
    shutil.copy(out / 'check.mp3', out / 'voice-check.mp3')
    tmp = out / 'stt'; tmp.mkdir(exist_ok=True)
    (tmp / 'script.txt').write_text(script); shutil.copy(out / 'check.mp3', tmp / 'voice.mp3')
    heard = sh('python3', '-I', TOOLS / 'stt_check.py', tmp, check=False).stdout
    m = re.search(r'HEARD:\s+(.*?)\s+\[', heard, re.S)
    heard_text = m.group(1) if m else ''
    ratio = difflib.SequenceMatcher(None, norm(script), norm(heard_text)).ratio()
    qa['transcript'] = heard_text; qa['script_match'] = round(ratio, 2)
    qa['checks']['voice_matches_script'] = ratio >= .6     # spoken numbers come back as digits, so not 1.0; read both below
    qa['passed'] = all(qa['checks'].values())
    (out / 'qa.json').write_text(json.dumps(qa, ensure_ascii=False, indent=1))
    print(json.dumps({k: qa[k] for k in ('duration', 'lufs', 'checks', 'script_match', 'passed')}, indent=1))
    print('SCRIPT:', script); print('HEARD: ', heard_text)
    print(f'\nLook at {out / "sheet.jpg"} before publishing.')


# ─── publish ───────────────────────────────────────────────────────────────
PROVIDER_SETTINGS = {   # what makes each post actually publish (from the Bidew pipeline, verified live on TikTok)
    'tiktok': {'content_posting_method': 'DIRECT_POST', 'privacy_level': 'PUBLIC_TO_EVERYONE', 'duet': True, 'stitch': True, 'comment': True,
               'autoAddMusic': 'no', 'brand_content_toggle': False, 'brand_organic_toggle': False, 'video_made_with_ai': True},
    'instagram': {'post_type': 'post'}, 'facebook': {},
}


def postiz(*args, timeout=600):
    r = subprocess.run(['postiz', *args], capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0: raise RuntimeError(f'postiz {args[0]}: {(r.stderr or r.stdout)[-600:]}')
    return r.stdout


def pjson(s):
    starts = [k for k in (s.find('{'), s.find('[')) if k >= 0]
    return json.loads(s[min(starts):]) if starts else None


def caption_for(title, caption, hashtags, lang):
    tags = ' '.join('#' + re.sub(r'[^\w]', '', t, flags=re.U) for t in dict.fromkeys([*CFG['hashtags_base'], *hashtags]) if t)
    return '\n\n'.join(x for x in [title.strip(), caption.strip(), CFG['link_line'][lang], CFG['disclosure'][lang], tags] if x)[:2000]


def post(final, cap, title, out, dry, only=None):
    if not os.environ.get('POSTIZ_API_KEY'): sys.exit('POSTIZ_API_KEY is not set')
    if shutil.which('postiz') is None: sh('npm', 'install', '-g', 'postiz')
    ints = {i['id']: i for i in pjson(postiz('integrations:list')) or []}
    targets = [i for i in CFG['postiz_integrations'] if i in ints and not ints[i].get('disabled')]
    missing = [i for i in CFG['postiz_integrations'] if i not in targets]
    prev = json.loads((out / 'publish.json').read_text()) if out and (out / 'publish.json').exists() else None
    if only:                                    # re-post to one failed account; never to the ones that worked
        targets = [i for i in targets if ints[i]['identifier'].split('-')[0] == only]
        if prev and any(p['provider'] == only and 'error' not in p for p in prev['posted']):
            sys.exit(f'{only} already has a post for this video; not posting it twice')
    elif prev and not dry:
        sys.exit(f'already published (see {out / "publish.json"}); use --only <provider> for a failed account')
    when = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(minutes=CFG['delay_minutes'])).strftime('%Y-%m-%dT%H:%M:%SZ')
    rep = {'caption': cap, 'scheduled_for': when, 'posted': [], 'missing_integrations': missing}
    if dry:
        rep['would_post_to'] = [f"{ints[i]['identifier']} {ints[i]['name']}" for i in targets]; print(json.dumps(rep, indent=1, ensure_ascii=False)); return rep
    media = (pjson(postiz('upload', str(final), timeout=1800)) or {}).get('path')
    if not media: sys.exit('postiz upload returned no path')
    for i in targets:
        prov = ints[i]['identifier'].split('-')[0]
        st = dict(PROVIDER_SETTINGS.get(prov, {}))
        if prov == 'tiktok': st['title'] = title[:90]
        try:
            res = postiz('posts:create', '-c', cap, '-s', when, '-m', media, '-i', i, '--settings', json.dumps(st))
            pid = [x.get('postId') for x in (pjson(res) or []) if isinstance(x, dict)]
            rep['posted'].append({'id': i, 'provider': prov, 'name': ints[i]['name'], 'post_ids': pid, 'result': res[:300]})
        except Exception as e:
            rep['posted'].append({'id': i, 'provider': prov, 'name': ints[i]['name'], 'error': str(e)[:400]})
    if prev and only:
        rep['posted'] = [p for p in prev['posted'] if p['provider'] != only] + rep['posted']
    (out / 'publish.json').write_text(json.dumps(rep, indent=1, ensure_ascii=False))
    print(json.dumps(rep, indent=1, ensure_ascii=False))
    return rep


def cmd_status(a):
    out = Path(a.dir).resolve()
    pub = json.loads((out / 'publish.json').read_text())
    when = dt.datetime.fromisoformat(pub['scheduled_for'].replace('Z', '+00:00'))
    lst = pjson(postiz('posts:list', '--startDate', (when - dt.timedelta(days=1)).strftime('%Y-%m-%dT%H:%M:%SZ'),
                       '--endDate', (when + dt.timedelta(days=1)).strftime('%Y-%m-%dT%H:%M:%SZ'))) or {}
    by_id = {p['id']: p for p in (lst.get('posts', []) if isinstance(lst, dict) else lst)}
    bad = 0
    for p in pub['posted']:
        if 'error' in p: print(f"{p['provider']:10} NOT CREATED  {p['error'][:200]}"); bad += 1; continue
        for pid in p.get('post_ids') or re.findall(r'"postId":\s*"([^"]+)"', p.get('result', '')):
            q = by_id.get(pid, {})
            print(f"{p['provider']:10} {q.get('state', '?'):10} {q.get('releaseURL') or ''} {q.get('error') or ''}".rstrip())
            bad += q.get('state') == 'ERROR'
    sys.exit(1 if bad else 0)


def cmd_credits(a):
    import urllib.request
    r = json.load(urllib.request.urlopen(urllib.request.Request('https://api.elevenlabs.io/v1/user/subscription',
                                                                  headers={'xi-api-key': os.environ['ELEVENLABS_API_KEY']}), timeout=30))
    print(f"{r['character_limit'] - r['character_count']} characters left ({r['character_count']} of {r['character_limit']} used, {r.get('tier')})")


def cmd_publish(a):
    out = Path(a.dir).resolve()
    qa = json.loads((out / 'qa.json').read_text())
    if not qa.get('passed') and not a.force: sys.exit(f'QA failed: {qa["checks"]}. Fix and rebuild; do not publish.')
    spec = json.loads((out / 'spec.json').read_text())
    post(out / 'final.mp4', caption_for(spec['title'], spec['caption'], spec.get('hashtags', []), spec['lang']), spec['title'], out, a.dry_run, a.only)


def cmd_publish_tip(a):
    out = Path(a.dir).resolve()
    qa = json.loads((out / 'qa_report.json').read_text()) if (out / 'qa_report.json').exists() else {}
    if qa and not (qa.get('passed', qa.get('ok', True))) and not a.force: sys.exit(f'shorts QA failed: see {out / "qa_report.md"}')
    plan = json.loads((out / 'plan.json').read_text())
    post(out / 'final.mp4', caption_for(plan['title'], plan.get('description', ''), plan.get('tags', []), a.lang), plan['title'], out, a.dry_run, a.only)


def cmd_record(a):
    out = Path(a.dir).resolve()
    h = history()
    pub = json.loads((out / 'publish.json').read_text()) if (out / 'publish.json').exists() else {}
    title = ''
    for f in ('spec.json', 'plan.json'):
        if (out / f).exists(): title = json.loads((out / f).read_text()).get('title', ''); break
    h.append({'date': dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'), 'series': a.series, 'lang': a.lang, 'title': title,
              'dir': out.name, 'posted': [p.get('provider') for p in pub.get('posted', []) if 'error' not in p],
              'failed': [p.get('provider') for p in pub.get('posted', []) if 'error' in p]})
    HIST.parent.mkdir(exist_ok=True); HIST.write_text(json.dumps(h, indent=1, ensure_ascii=False))
    if a.series == 'pot':
        qf = HERE / 'topics' / 'pot.yaml'; q = yaml.safe_load(qf.read_text()) or []
        if q: q.pop(0); qf.write_text('# Pass-or-Take scenario seeds; daily.py record pops the first.\n' + yaml.safe_dump(q, allow_unicode=True, sort_keys=False, width=200))
    print(f'recorded #{len(h)}: {a.series} {a.lang} {title}')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); sp = ap.add_subparsers(dest='cmd', required=True)
    p = sp.add_parser('next'); p.add_argument('--series', choices=['pot', 'tip']); p.add_argument('--lang', choices=['en', 'fr']); p.set_defaults(f=cmd_next)
    p = sp.add_parser('calc'); p.add_argument('spec'); p.set_defaults(f=cmd_calc)
    p = sp.add_parser('build'); p.add_argument('spec'); p.add_argument('--revoice', action='store_true'); p.add_argument('--workers', type=int, default=4); p.set_defaults(f=cmd_build)
    p = sp.add_parser('publish'); p.add_argument('dir'); p.add_argument('--dry-run', action='store_true'); p.add_argument('--force', action='store_true'); p.add_argument('--only', choices=['tiktok', 'instagram', 'facebook']); p.set_defaults(f=cmd_publish)
    p = sp.add_parser('publish-tip'); p.add_argument('dir'); p.add_argument('--lang', required=True, choices=['en', 'fr']); p.add_argument('--dry-run', action='store_true'); p.add_argument('--force', action='store_true'); p.add_argument('--only', choices=['tiktok', 'instagram', 'facebook']); p.set_defaults(f=cmd_publish_tip)
    p = sp.add_parser('status'); p.add_argument('dir'); p.set_defaults(f=cmd_status)
    p = sp.add_parser('credits'); p.set_defaults(f=cmd_credits)
    p = sp.add_parser('voice'); p.add_argument('lang', choices=['en', 'fr']); p.set_defaults(f=lambda a: print(CFG['voices'][a.lang]['id']))
    p = sp.add_parser('record'); p.add_argument('dir'); p.add_argument('--series', required=True, choices=['pot', 'tip']); p.add_argument('--lang', required=True, choices=['en', 'fr']); p.set_defaults(f=cmd_record)
    a = ap.parse_args(); a.f(a)
