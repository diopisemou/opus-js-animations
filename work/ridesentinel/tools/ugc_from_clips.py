#!/usr/bin/env python3
"""Build the UGC film's voice track, word timings and A-roll from lip-synced clips made in an ElevenLabs flow (via the MCP).
Run from work/ridesentinel/film:   python3 ../tools/ugc_from_clips.py en

A clip at ugc/flow/<lang>/clip-<n>.mp4 is line n spoken by the presenter (cloned-voice speech made in the flow, lip-synced by
Creatify Aurora), so its own audio becomes line n of the voice track and its frames the A-roll. Its words are timed by forced
alignment against the script. A line without a clip keeps the original take from source/ugc-<lang>/orig/ (the stand-in shows).
Writes source/ugc-<lang>/voice.{wav,mp3,align.json}, then align-ugc-<lang>.js, audio-ugc-<lang>.js and aroll-<lang>.js.
"""
import json, shutil, subprocess, sys, wave
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from force_align import align

LEAD, GAP, TAIL, SR = .15, .3, .5, 44100
lang = sys.argv[1]
src, flow = Path(f'source/ugc-{lang}'), Path(f'ugc/flow/{lang}')
orig = src / 'orig'
if not orig.exists():                                         # keep the cloned-voice takes made before the flow
    orig.mkdir()
    for f in ('voice.wav', 'voice.mp3', 'voice.align.json'): shutil.copy(src / f, orig / f)
script = [l for l in (src / 'script.txt').read_text().splitlines() if l.strip()]
oal = json.load(open(orig / 'voice.align.json', encoding='utf-8'))['chunks']


def sh(*cmd): return subprocess.run(cmd, check=True, capture_output=True, text=True).stdout
def pcm(path, t0=None, dur=None):
    args = ['ffmpeg', '-v', 'error'] + (['-ss', f'{t0:.3f}', '-t', f'{dur:.3f}'] if t0 is not None else []) + \
           ['-i', str(path), '-vn', '-ac', '1', '-ar', str(SR), '-f', 's16le', '-']
    return subprocess.run(args, check=True, capture_output=True).stdout


out, chunks, clips, t = bytearray(int(LEAD * SR) * 2), [], [], LEAD
for n, text in enumerate(script, 1):
    clip = flow / f'clip-{n}.mp4'
    if clip.exists():
        audio = pcm(clip)
        cache = flow / f'clip-{n}.words.json'
        if not cache.exists():
            tmp = flow / f'clip-{n}.wav'
            sh('ffmpeg', '-v', 'error', '-y', '-i', str(clip), '-vn', '-ac', '1', '-ar', str(SR), str(tmp))
            words, loss = align(tmp, text); tmp.unlink()
            cache.write_text(json.dumps({'loss': loss, 'words': words}, ensure_ascii=False))
        words = json.loads(cache.read_text())['words']
        d = sh('ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate,width,height', '-of', 'json', str(clip))
        info = json.loads(d)['streams'][0]; num, den = map(int, info['r_frame_rate'].split('/'))
        frames = flow / f'a{n}'; frames.mkdir(exist_ok=True)
        for f in frames.glob('*.jpg'): f.unlink()
        sh('ffmpeg', '-v', 'error', '-y', '-i', str(clip), '-q:v', '3', str(frames / '%04d.jpg'))
        clips.append(dict(start=round(t, 3), fps=num / den, n=len(list(frames.glob('*.jpg'))), w=info['width'], h=info['height'], dir=str(frames)))
    else:                                                     # the original take of this line
        c = oal[n - 1]
        audio = pcm(orig / 'voice.wav', c['t0'], c['t1'] - c['t0'])
        words = [{'w': w['w'], 't0': round(w['t0'] - c['t0'], 3), 't1': round(w['t1'] - c['t0'], 3)} for w in c['words']]
        clips.append(None)
    dur = len(audio) / 2 / SR
    ws = [{'w': w['w'], 't0': round(t + w['t0'], 3), 't1': round(t + w['t1'], 3)} for w in words]
    chunks.append({'t0': ws[0]['t0'] if ws else round(t, 3), 't1': ws[-1]['t1'] if ws else round(t + dur, 3), 'text': text, 'words': ws})
    out += audio; t += dur
    if n < len(script): out += bytes(int(GAP * SR) * 2); t += GAP
out += bytes(int(TAIL * SR) * 2); t += TAIL

with wave.open(str(src / 'voice.wav'), 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(out))
sh('ffmpeg', '-v', 'error', '-y', '-i', str(src / 'voice.wav'), '-b:a', '160k', str(src / 'voice.mp3'))
(src / 'voice.align.json').write_text(json.dumps({'duration': round(t, 3), 'start': LEAD, 'dips': [], 'chunks': chunks}, ensure_ascii=False, indent=1))
Path(f'aroll-{lang}.js').write_text('window.UGC_AROLL = ' + json.dumps({'clips': clips}) + ';\n')
print(sh('python3', '../tools/make_align.py', lang, 'ugc').strip())
print(sh('python3', '../../../skills/opus-js-animations/scripts/embed_audio.py', str(src / 'voice.mp3'), f'audio-ugc-{lang}.js').strip().splitlines()[-1])
print(f'{lang}: {sum(1 for c in clips if c)}/{len(clips)} lines from flow clips, {t:.2f} s')
