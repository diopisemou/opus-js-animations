#!/bin/sh
# Renders the translated cuts (the score is shared: mix.wav), then an upload copy of each.
cd "$(dirname "$0")"
export CHROME="$(cd ../tools && pwd)/chrome"
for l in pt ar zh; do
  node ../tools/render.mjs $l.html --fps 30 --audio mix.wav --out ridesentinel-promo-$l-master.mp4 --workers 4 --ss 2 | tail -3
  ffmpeg -v error -y -i ridesentinel-promo-$l-master.mp4 -c:v libx264 -preset slow -crf 17 -maxrate 20M -bufsize 40M -profile:v high -pix_fmt yuv420p \
    -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -g 60 -c:a copy -movflags +faststart ridesentinel-promo-$l.mp4
  echo "$l done"
done
