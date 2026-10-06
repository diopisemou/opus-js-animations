// A frame-exact bridge from the `shaders` library (WebGPU, MIT) to a seek(t) film.
// Builds a preset's node tree on the core renderer (as createRendererFromJSON does) but drives its
// clock with renderSyntheticFrame, so the layer at time t is the same however we got there.
import { shaderRendererGPU, createGpuUniformsMap, rootPassthrough, setShadersDebug } from 'shaders/core'
import { componentDefinition as Aurora } from 'shaders/core/Aurora'
import { componentDefinition as Godrays } from 'shaders/core/Godrays'
import { componentDefinition as MeshGradient } from 'shaders/core/MeshGradient'
import { componentDefinition as LiquidMetal } from 'shaders/core/LiquidMetal'
import { componentDefinition as SunBurst } from 'shaders/core/SunBurst'
import { componentDefinition as LensFlare } from 'shaders/core/LensFlare'

const DEFS = new Map([MeshGradient, Aurora, Godrays, LiquidMetal, SunBurst, LensFlare].map(d => [d.name, d]))
export const available = [...DEFS.keys()]

export async function createGpuLayer(canvas, preset, { gpu, width = canvas.width, height = canvas.height } = {}) {
  if (globalThis.SHADERS_DEBUG) setShadersDebug(true)
  const core = shaderRendererGPU()
  core.setOnUnavailable((r, e) => console.error('unavailable', r, e && (e.stack || e.message || e)))
  const ready = new Promise(r => core.setOnReady(r))
  await core.initialize({ canvas, gpu, enablePerformanceTracking: false, forceFullFrameRate: true })
  core.stopAnimation()
  core.resize(width, height)
  const ids = []
  core.registerNode('root', rootPassthrough.fragment, null, null, {}, rootPassthrough)
  const add = (c, parent, order) => {
    const def = DEFS.get(c.type); if (!def) throw new Error('unknown shader ' + c.type)
    const id = c.id || `${c.type}_${ids.length}`; ids.push(id)
    const props = Object.fromEntries(Object.entries(def.props).map(([k, p]) => [k, c.props?.[k] !== undefined ? c.props[k] : p.default]))
    const meta = { blendMode: c.props?.blendMode || 'normal', opacity: c.props?.opacity, visible: c.props?.visible, renderOrder: order, id,
      mask: c.props?.maskSource ? { source: c.props.maskSource, type: c.props.maskType || 'alpha' } : undefined }
    core.registerNode(id, def.fragment, parent, meta, createGpuUniformsMap(def, props, id), def)
    ;(c.children || []).forEach((k, i) => add(k, id, i))
  }
  preset.components.forEach((c, i) => add(c, 'root', i))
  core.resize(width, height)
  const frame = () => new Promise(r => requestAnimationFrame(() => r()))
  await frame(); await frame()                                       // the renderer applies a resize on the next frame
  if (canvas.width !== width || canvas.height !== height) throw new Error(`GPU layer is ${canvas.width}×${canvas.height}, not ${width}×${height}: open the page in a window at least that large`)
  await Promise.race([ready, new Promise(r => setTimeout(r, 4000))])
  for (let k = 0; k < 3; k++) await core.renderSyntheticFrame(0)   // compile every pipeline before the first real frame
  let clock = 0
  return {
    failure: () => core.getFailureReason(),
    meta: (id, m) => core.updateNodeMetadata(id, m),
    set: (id, prop, v) => core.updateUniformValue(id, prop, v),
    // advance the clock to t and draw, without reading back (use it to flush prop changes, which apply a frame late)
    async step(t) { await core.renderSyntheticFrame(t - clock); clock = t },
    // draw the layer at time t and hand back its pixels (toBlob synchronises with the GPU queue)
    async at(t) {
      await core.renderSyntheticFrame(t - clock, { waitForGpu: false }); clock = t
      const blob = await new Promise(r => canvas.toBlob(r))
      return createImageBitmap(blob)
    },
  }
}
