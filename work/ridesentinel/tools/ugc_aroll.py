#!/usr/bin/env python3
"""The UGC ad's talking-head A-roll, one lip-synced clip per voiced line. Run from work/ridesentinel/film:

  python3 ../tools/ugc_aroll.py en                 cut each line's audio, extract frames of the clips that exist, write aroll-en.js
  python3 ../tools/ugc_aroll.py en --generate      also lip-sync the missing clips (Creatify Aurora, ElevenLabs Pro plan)
  python3 ../tools/ugc_aroll.py en --generate --only 3 5   (re)make only these lines (1-based)
  python3 ../tools/ugc_aroll.py en --generate --max-credits 20000   stop before a clip would pass this many credits spent

Line i's clip covers [t0 - LEAD, t1 + TAIL] of source/ugc-<lang>/voice.wav (the last one holds on for the end card), so frame k of
clip i sits at film time t0 - LEAD + k / fps. The film plays the whole voice track and only reads the frames.
Without a clip the film draws a stand-in for that line.
"""
import argparse, json, subprocess, sys, wave
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

LEAD, TAIL, END_HOLD = .1, .15, 2.4
ap = argparse.ArgumentParser()
ap.add_argument('lang'); ap.add_argument('--generate', action='store_true'); ap.add_argument('--only', type=int, nargs='*')
ap.add_argument('--portrait', default='ugc/presenter.png'); ap.add_argument('--res', default='720p')
ap.add_argument('--max-credits', type=int, default=0)
a = ap.parse_args()
src = Path(f'source/ugc-{a.lang}'); out = Path(f'ugc/{a.lang}'); out.mkdir(parents=True, exist_ok=True)
al = json.load(open(src / 'voice.align.json', encoding='utf-8'))
lines = al['chunks']
with wave.open(str(src / 'voice.wav')) as w: dur = w.getnframes() / w.getframerate()


def sh(*cmd): return subprocess.run(cmd, check=True, capture_output=True, text=True).stdout


spent = 0
for i, l in enumerate(lines):
    n = i + 1
    t0 = max(0, l['t0'] - LEAD); t1 = l['t1'] + (END_HOLD if n == len(lines) else TAIL)
    wav = out / f'line-{n}.wav'
    # the line's audio, padded with silence past the end of the track (the last clip holds for the end card)
    sh('ffmpeg', '-v', 'error', '-y', '-i', str(src / 'voice.wav'), '-ss', f'{t0:.3f}', '-t', f'{t1 - t0:.3f}',
       '-af', f'apad=whole_dur={t1 - t0:.3f}', '-ac', '1', '-ar', '44100', str(wav))
    clip = out / f'clip-{n}.mp4'
    if a.generate and ((n in a.only) if a.only else not clip.exists()):
        if a.max_credits and spent >= a.max_credits: sys.exit(f'stopped: {spent} credits spent (limit {a.max_credits})')
        import el_flows as E
        used0 = E.credits()[0]
        E.generate('video', {'model_id': 'creatify-aurora', 'image': E.inline(a.portrait, 'image'), 'audio': E.inline(str(wav), 'audio'),
                             'resolution': a.res}, str(clip))
        spent += E.credits()[0] - used0
    l['clip'] = dict(start=round(t0, 3), file=str(clip)) if clip.exists() else None

clips = []
for i, l in enumerate(lines):
    c = l['clip']
    if not c: clips.append(None); continue
    d = out / f'a{i + 1}'; d.mkdir(exist_ok=True)
    for f in d.glob('*.jpg'): f.unlink()
    info = json.loads(sh('ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate',
                         '-of', 'json', c['file']))['streams'][0]
    num, den = map(int, info['r_frame_rate'].split('/'))
    sh('ffmpeg', '-v', 'error', '-y', '-i', c['file'], '-q:v', '3', str(d / '%04d.jpg'))
    clips.append(dict(start=c['start'], fps=num / den, n=len(list(d.glob('*.jpg'))), w=info['width'], h=info['height'], dir=str(d)))
Path(f'aroll-{a.lang}.js').write_text('window.UGC_AROLL = ' + json.dumps({'clips': clips}) + ';\n')
have = sum(1 for c in clips if c)
print(f'aroll-{a.lang}.js: {have}/{len(clips)} lines have a lip-synced clip' + (f'; {spent} credits spent' if spent else ''))
