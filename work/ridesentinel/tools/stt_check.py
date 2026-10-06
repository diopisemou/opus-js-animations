#!/usr/bin/env python3
"""Transcribe a voice track with ElevenLabs Scribe and print it next to the script, so a mispronounced word shows up
without listening. Usage: stt_check.py film/source/ugc-en  (reads voice.mp3 and script.txt there)."""
import json, sys, uuid, urllib.request
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from el_flows import key, API
d = Path(sys.argv[1]); audio = (d / 'voice.mp3').read_bytes(); b = uuid.uuid4().hex
body = (f'--{b}\r\nContent-Disposition: form-data; name="model_id"\r\n\r\nscribe_v2\r\n'
        f'--{b}\r\nContent-Disposition: form-data; name="file"; filename="voice.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n').encode() + audio + f'\r\n--{b}--\r\n'.encode()
req = urllib.request.Request(API + '/v1/speech-to-text', data=body, method='POST',
                             headers={'xi-api-key': key(), 'Content-Type': f'multipart/form-data; boundary={b}'})
r = json.loads(urllib.request.urlopen(req, timeout=300).read())
print('SCRIPT:', ' '.join((d / 'script.txt').read_text().split()))
print('HEARD: ', r['text'], f"  [{r.get('language_code')}, p={r.get('language_probability', 0):.2f}]")
