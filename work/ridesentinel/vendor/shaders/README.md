# shaders (vendored bridge)

`film/gpu-layer.js` is an esbuild bundle of `gpu-layer.src.js` and the effects it imports from
[shaders](https://github.com/shader-effects-inc/shaders) v4.0.0 (MIT, © Shader Effects Inc. — see `LICENSE`).

The bridge builds a preset's node tree on the library's core WebGPU renderer and drives its clock with
`renderSyntheticFrame`, so a shader layer at time t is identical however the film got there (frame-exact export).

Rebuild (add an effect by adding its import and its name to `DEFS`):
```bash
npm install shaders@4.0.0 esbuild
npx esbuild gpu-layer.src.js --bundle --format=iife --global-name=GpuLayer --minify --target=chrome120 --outfile=../../film/gpu-layer.js
```
Rendering needs WebGPU in headless Chromium; on a machine without a GPU, `tools/chrome-gpu` enables SwiftShader's WebGPU and a
window large enough for a 1080×1920 layer (the library caps its buffer to the window size).
