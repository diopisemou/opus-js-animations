#!/usr/bin/env python3
"""ElevenLabs generation client: images, video (Veo, Seedance, Creatify Aurora lip-sync), speech and credits.

The key comes from ELEVENLABS_API_KEY or ~/.config/opus-js-animations/keys.env (KEY=value lines, chmod 600).
It is never printed or written.

  el_flows.py credits
  el_flows.py image  <out.png> --model gemini-3.1-flash-image --ar 9:16 --prompt "..." [--ref face.png ...]
  el_flows.py tts    <out.mp3> --voice Liam --text "..." [--stability .4 --style .3]
  el_flows.py lipsync <out.mp4> --image face.png --audio line.mp3 [--res 720p]
  el_flows.py video  <out.mp4> --model veo-3.1-fast-generate-001 --prompt "..." [--start face.png] [--dur 8] [--ar 9:16]
Every generation is logged (model, id, credits used) to el_flows.log.jsonl next to the output.
"""
import argparse, base64, json, mimetypes, os, sys, time, urllib.error, urllib.request
from pathlib import Path

API = 'https://api.elevenlabs.io'


def key():
    k = os.environ.get('ELEVENLABS_API_KEY')
    if k: return k.strip()
    cfg = Path.home() / '.config' / 'opus-js-animations' / 'keys.env'
    if cfg.exists():
        for line in cfg.read_text().splitlines():
            if line.startswith('ELEVENLABS_API_KEY='): return line.split('=', 1)[1].strip()
    sys.exit('No ELEVENLABS_API_KEY in the environment or ~/.config/opus-js-animations/keys.env')


def call(method, path, body=None, raw=False):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method,
                                 headers={'xi-api-key': key(), 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            b = r.read()
            return b if raw else json.loads(b)
    except urllib.error.HTTPError as e:
        sys.exit(f'{method} {path} → HTTP {e.code}: {e.read()[:600].decode("utf8", "replace")}')


def credits():
    s = call('GET', '/v1/user/subscription')
    return s['character_count'], s['character_limit']


def inline(path, kind):
    mime = mimetypes.guess_type(path)[0] or ('image/png' if kind == 'image' else 'audio/mpeg')
    mime = {'audio/x-wav': 'audio/wav', 'audio/wave': 'audio/wav', 'audio/mp3': 'audio/mpeg'}.get(mime, mime)
    return {'type': 'inline_base64', 'mime_type': mime, 'content_base64': base64.b64encode(Path(path).read_bytes()).decode()}


def generate(kind, body, out):
    used0 = credits()[0]
    g = call('POST', f'/v1/flows/{kind}', body)
    gid, t0 = g['id'], time.time()
    print(f'{kind} {body["model_id"]} → {gid}', flush=True)
    while True:
        time.sleep(4)
        r = call('GET', f'/v1/flows/{kind}/{gid}')
        if r['status'] == 'completed': break
        if r['status'] == 'failed': sys.exit(f'failed: {r.get("failure_reason")}: {r.get("error_message")}')
        print(f'  {r["status"]} {time.time() - t0:.0f}s', flush=True)
    with urllib.request.urlopen(r['content_url'], timeout=300) as f: Path(out).write_bytes(f.read())
    time.sleep(2)
    used = credits()[0] - used0
    log(out, kind=kind, model=body['model_id'], id=gid, secs=round(time.time() - t0), credits=used)
    print(f'✓ {out} ({r["content_mime_type"]}, {time.time() - t0:.0f}s, {used} credits)')
    return gid


def log(out, **kw):
    with open(Path(out).parent / 'el_flows.log.jsonl', 'a') as f: f.write(json.dumps({'out': str(out), **kw}) + '\n')


def voice_id(name):
    vs = call('GET', '/v1/voices')['voices']
    for v in vs:
        if v['voice_id'] == name or v['name'].split(' - ')[0].lower() == name.lower(): return v['voice_id']
    sys.exit(f'voice {name!r} not found')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['credits', 'image', 'tts', 'lipsync', 'video'])
    ap.add_argument('out', nargs='?')
    ap.add_argument('--model'); ap.add_argument('--prompt'); ap.add_argument('--negative')
    ap.add_argument('--ar', default='9:16'); ap.add_argument('--res'); ap.add_argument('--dur', type=int)
    ap.add_argument('--ref', nargs='*', default=[]); ap.add_argument('--start'); ap.add_argument('--seed', type=int)
    ap.add_argument('--image'); ap.add_argument('--audio'); ap.add_argument('--no-audio', action='store_true')
    ap.add_argument('--voice', default='Liam'); ap.add_argument('--text'); ap.add_argument('--tts-model', default='eleven_multilingual_v2')
    ap.add_argument('--stability', type=float, default=.4); ap.add_argument('--style', type=float, default=.3)
    a = ap.parse_args()
    if a.cmd == 'credits':
        u, lim = credits(); print(f'{u} / {lim} credits used this period'); return
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    if a.cmd == 'image':
        b = {'model_id': a.model or 'gemini-3.1-flash-image', 'prompt': a.prompt, 'aspect_ratio': a.ar}
        if a.res: b['resolution'] = a.res
        if a.ref: b['images'] = [inline(p, 'image') for p in a.ref]
        generate('image', b, a.out)
    elif a.cmd == 'lipsync':
        b = {'model_id': 'creatify-aurora', 'image': inline(a.image, 'image'), 'audio': inline(a.audio, 'audio'), 'resolution': a.res or '720p'}
        generate('video', b, a.out)
    elif a.cmd == 'video':
        b = {'model_id': a.model or 'veo-3.1-fast-generate-001', 'prompt': a.prompt, 'aspect_ratio': a.ar,
             'generate_audio': not a.no_audio}
        if a.dur: b['duration_secs'] = a.dur
        if a.res: b['resolution'] = a.res
        if a.negative: b['negative_prompt'] = a.negative
        if a.seed is not None: b['seed'] = a.seed
        if a.start: b['start_frame'] = inline(a.start, 'image')
        if a.ref: b['images'] = [{'image': inline(p, 'image'), 'role': 'subject'} if a.model.startswith('veo') else inline(p, 'image') for p in a.ref]
        generate('video', b, a.out)
    elif a.cmd == 'tts':
        used0 = credits()[0]
        body = {'text': a.text, 'model_id': a.tts_model, 'voice_settings': {'stability': a.stability, 'similarity_boost': .8, 'style': a.style}}
        audio = call('POST', f'/v1/text-to-speech/{voice_id(a.voice)}?output_format=mp3_44100_128', body, raw=True)
        Path(a.out).write_bytes(audio)
        time.sleep(1); used = credits()[0] - used0
        log(a.out, kind='tts', model=a.tts_model, voice=a.voice, credits=used)
        print(f'✓ {a.out} ({used} credits)')


if __name__ == '__main__':
    main()
