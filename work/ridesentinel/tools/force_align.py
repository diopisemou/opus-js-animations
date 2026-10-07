#!/usr/bin/env python3
"""Word timings for a known script in an audio file (ElevenLabs forced alignment), so captions show the script's own words.
  force_align.py <audio> "<text>"   → prints JSON [{"w": word, "t0": s, "t1": s}, ...]"""
import json, sys, uuid, urllib.request, urllib.error
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from el_flows import key, API


def align(audio, text):
    b = uuid.uuid4().hex; audio = Path(audio)
    body = (f'--{b}\r\nContent-Disposition: form-data; name="text"\r\n\r\n{text}\r\n'
            f'--{b}\r\nContent-Disposition: form-data; name="file"; filename="{audio.name}"\r\nContent-Type: application/octet-stream\r\n\r\n').encode() \
        + audio.read_bytes() + f'\r\n--{b}--\r\n'.encode()
    req = urllib.request.Request(API + '/v1/forced-alignment', data=body, method='POST',
                                 headers={'xi-api-key': key(), 'Content-Type': f'multipart/form-data; boundary={b}'})
    try:
        r = json.loads(urllib.request.urlopen(req, timeout=300).read())
    except urllib.error.HTTPError as e:
        sys.exit(f'forced-alignment → HTTP {e.code}: {e.read()[:400].decode("utf8", "replace")}')
    return [{'w': w['text'], 't0': round(w['start'], 3), 't1': round(w['end'], 3)} for w in r['words'] if w['text'].strip()], r.get('loss')


if __name__ == '__main__':
    words, loss = align(sys.argv[1], sys.argv[2])
    print(json.dumps({'loss': loss, 'words': words}, ensure_ascii=False))
