#!/bin/sh
# "Drivers, quick one" (UGC ad, EN FR AR): the presenter, his lip-synced lines, then the render.
# Needs an ElevenLabs Pro plan (the image and video endpoints), the key in ELEVENLABS_API_KEY or ~/.config/opus-js-animations/keys.env,
# plus ffmpeg, Node ≥ 22 and Chromium. The voice lines are already made (source/ugc-<lang>/, your cloned voices).
#   ./finish-ugc.sh probe        the portrait (if missing) + the English hook clip only, and what it cost: check before spending more
#   ./finish-ugc.sh all [langs]  every missing clip, then verify, mix and render each language (default: en fr ar)
#   ./finish-ugc.sh render [langs]  re-render from the clips already there
set -e
cd "$(dirname "$0")/film"
T=../tools
export CHROME="${CHROME:-$(cd $T && pwd)/chrome-media}"
MODE="${1:-probe}"; [ $# -gt 0 ] && shift
LANGS="${*:-en fr ar}"
PROMPT="Vertical 9:16 smartphone selfie video frame from the front camera, held at arm's length: a friendly man in his mid-forties \
of North African descent, short dark hair, neatly trimmed beard, sitting in the driver's seat of a parked car at night. His face is \
centred in the upper half of the frame, large and sharp, looking straight into the lens with a relaxed, confident half-smile, lips \
closed. Soft warm light from the phone screen on his face, cool streetlight from the side window, city lights softly blurred through \
the rear window. Dark casual jacket, seatbelt off, both hands out of frame. Authentic creator look, realistic skin texture, natural \
colour. No text, no logos, no brand names, no watermark, no phone visible."

credits() { python3 -I $T/el_flows.py credits; }
python3 strings.py >/dev/null
if [ ! -f ugc/presenter.png ]; then
  mkdir -p ugc
  python3 -I $T/el_flows.py image ugc/presenter.png --model gemini-3.1-flash-image --ar 9:16 --res 1K --prompt "$PROMPT"
fi
case "$MODE" in
  probe)
    credits
    python3 $T/ugc_aroll.py en --generate --only 1
    credits
    echo "Look at ugc/presenter.png and ugc/en/clip-1.mp4, and the credits used above, before running: ./finish-ugc.sh all"
    exit 0 ;;
  all) for l in $LANGS; do python3 $T/ugc_aroll.py $l --generate; done ;;
  render) for l in $LANGS; do python3 $T/ugc_aroll.py $l; done ;;
esac
python3 build-ugc.py
for l in $LANGS; do
  echo "── $l"
  node $T/verify.mjs ugc-$l.html --times 1,5,12,20,28
  node $T/pullwav.mjs ugc-$l.html mix-ugc-$l.wav
  ffmpeg -v error -y -i mix-ugc-$l.wav -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 mix-ugc-$l-norm.wav
  node $T/render.mjs ugc-$l.html --fps 30 --audio mix-ugc-$l-norm.wav --out ridesentinel-ugc-$l-master.mp4 --workers 4 --ss 2
  ffmpeg -v error -y -i ridesentinel-ugc-$l-master.mp4 -c:v libx264 -preset slow -crf 17 -maxrate 20M -bufsize 40M -profile:v high \
    -pix_fmt yuv420p -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -g 60 -c:a copy -movflags +faststart \
    ridesentinel-ugc-$l.mp4
  echo "✓ ridesentinel-ugc-$l.mp4"
done
credits
