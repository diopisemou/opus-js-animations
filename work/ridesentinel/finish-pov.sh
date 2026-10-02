#!/bin/sh
# Voice, time and render "POV: the 2 a.m. offer" (EN FR PT AR ZH).
# Needs ELEVENLABS_API_KEY (environment) or ~/.config/opus-js-animations/keys.env, plus ffmpeg, Node ≥ 22 and Chromium.
#   ./finish-pov.sh                 all five languages with the voice "Liam"
#   ./finish-pov.sh "Liam" en fr    a voice name or id, then the languages
# Each language: voice lines 1–6 expressive, re-voice 7–10 steadier, measure, embed, verify, mix, render, upload copy.
set -e
cd "$(dirname "$0")/film"
SKILL=../../../skills/opus-js-animations/scripts
T=../tools
export CHROME="${CHROME:-$(cd $T && pwd)/chrome}"
VOICE="${1:-Liam}"; [ $# -gt 0 ] && shift
LANGS="${*:-en fr pt ar zh}"
python3 strings.py
for l in $LANGS; do
  echo "── $l"
  common="--provider elevenlabs --voice $VOICE --gap .18 --para .5 --lead .2 --tail .4 --out source/pov-$l"
  python3 $SKILL/voiceover.py source/pov-$l/script.txt $common --stability .32 --style .45
  python3 $SKILL/voiceover.py source/pov-$l/script.txt $common --stability .55 --style .2 --only 7 8 9 10
  python3 $T/make_align.py $l
  python3 $SKILL/embed_audio.py source/pov-$l/voice.mp3 audio-$l.js
  node $T/verify.mjs pov-$l.html --times 1,8,16,22
  node $T/pullwav.mjs pov-$l.html mix-pov-$l.wav
  ffmpeg -v error -y -i mix-pov-$l.wav -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 mix-pov-$l-norm.wav   # social-media loudness
  node $T/render.mjs pov-$l.html --fps 30 --audio mix-pov-$l-norm.wav --out ridesentinel-pov-$l-master.mp4 --workers 4 --ss 2
  ffmpeg -v error -y -i ridesentinel-pov-$l-master.mp4 -c:v libx264 -preset slow -crf 17 -maxrate 20M -bufsize 40M -profile:v high \
    -pix_fmt yuv420p -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -g 60 -c:a copy -movflags +faststart \
    ridesentinel-pov-$l.mp4
  echo "✓ ridesentinel-pov-$l.mp4"
done
