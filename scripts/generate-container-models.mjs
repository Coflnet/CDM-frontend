/**
 * Procedurally generates the low-poly container models used by the public AR
 * demo (`/ar`). Run manually with `npm run generate:models`; the resulting
 * files in `public/models/` are committed so CI/Docker never runs this script.
 *
 * Design goals: tiny files (<200 KB), recognizable shapes, real-world scale
 * (glTF unit = 1 metre, Y-up, base sitting on y=0 so AR drops it on the floor).
 * No textures and no vertex colours (iOS Quick Look ignores vertex colours) –
 * just a handful of flat MeshStandardMaterials.
 */
import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js'
import { mkdir, writeFile } from 'node:fs/promises'

// GLTFExporter assembles the GLB via Blob + FileReader; Node 20+ has Blob but
// no FileReader. USDZExporter reads image blobs as data URLs. Small shim covers
// both code paths.
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class {
    onloadend = null
    result = null
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf
        this.onloadend?.({ target: this })
      })
    }
    readAsDataURL(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buf).toString('base64')}`
        this.onloadend?.({ target: this })
      })
    }
  }
}

// --- materials (flat, no textures, single-sided) ---------------------------
// USDZ / iOS Quick Look does NOT support double-sided materials, so every mesh
// is a correctly-wound closed solid (box/cylinder) and materials stay FrontSide.
const BODY = new THREE.MeshStandardMaterial({
  color: 0x3a8fd4, // brand --accent-blue
  metalness: 0.3,
  roughness: 0.55,
  flatShading: true,
})
const INNER = new THREE.MeshStandardMaterial({
  color: 0x20262c,
  metalness: 0.1,
  roughness: 0.9,
  flatShading: true,
})
const STEEL = new THREE.MeshStandardMaterial({
  color: 0x8a9199,
  metalness: 0.65,
  roughness: 0.45,
  flatShading: true,
})

// --- geometry helpers ------------------------------------------------------
const box = (x, y, z, mat) => new THREE.Mesh(new THREE.BoxGeometry(x, y, z), mat)

/**
 * Open-top container tub built from closed box primitives: a floor, four solid
 * walls, and a dark inner floor plate. Every face is correctly wound so it
 * renders single-sided on all platforms (glTF and USDZ alike). Origin at the
 * base centre; the opening faces up.
 */
function tub({ L, W, H, t = 0.06 }) {
  const g = new THREE.Group()
  const innerW = W - 2 * t

  const floor = box(L, t, W, BODY)
  floor.position.y = t / 2
  g.add(floor)

  const plate = box(L - 2 * t, 0.02, innerW, INNER) // dark interior floor
  plate.position.y = t + 0.01
  g.add(plate)

  const wallY = t + (H - t) / 2
  for (const s of [-1, 1]) {
    const longWall = box(L, H - t, t, BODY)
    longWall.position.set(0, wallY, s * (W / 2 - t / 2))
    g.add(longWall)

    const endWall = box(t, H - t, innerW, BODY)
    endWall.position.set(s * (L / 2 - t / 2), wallY, 0)
    g.add(endWall)

    // Dark liner panels so the interior reads as an open skip, not a blue box.
    const longLiner = box(L - 2 * t, H - t, 0.015, INNER)
    longLiner.position.set(0, wallY, s * (W / 2 - t - 0.012))
    g.add(longLiner)

    const endLiner = box(0.015, H - t, innerW - 2 * t, INNER)
    endLiner.position.set(s * (L / 2 - t - 0.012), wallY, 0)
    g.add(endLiner)
  }
  return g
}
const cyl = (r, len, mat, seg = 10) =>
  new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat)

/** Recenter on x/z and drop so the lowest point rests on y=0. */
function normalize(obj) {
  const b = new THREE.Box3().setFromObject(obj)
  obj.position.x -= (b.min.x + b.max.x) / 2
  obj.position.z -= (b.min.z + b.max.z) / 2
  obj.position.y -= b.min.y
  const root = new THREE.Group()
  root.add(obj)
  return root
}

// --- container builders ----------------------------------------------------
function buildAbsetz({ L, W, H }) {
  const g = new THREE.Group()
  g.add(tub({ L, W, H, t: 0.05 }))

  // Two skid runners under the floor.
  for (const z of [-W / 4, W / 4]) {
    const skid = box(L * 0.72, 0.09, 0.11, STEEL)
    skid.position.set(0, -0.045, z)
    g.add(skid)
  }
  // Lifting trunnions on both end walls near the top (Absetzkipper grabs here).
  for (const sx of [-1, 1]) {
    const pin = cyl(0.06, 0.18, STEEL, 8)
    pin.rotation.z = Math.PI / 2 // axis along x
    pin.position.set(sx * (L / 2 - 0.06), H * 0.72, 0)
    g.add(pin)
  }
  return normalize(g)
}

function buildAbroll({ L, W, H }) {
  const g = new THREE.Group()
  g.add(tub({ L, W, H, t: 0.06 }))

  // Vertical corrugation ribs on both long sides.
  const ribs = 7
  for (let i = 0; i < ribs; i++) {
    const x = -L / 2 + ((i + 0.5) * L) / ribs
    for (const s of [-1, 1]) {
      const rib = box(0.09, H * 0.9, 0.05, BODY)
      rib.position.set(x, H * 0.48, s * (W / 2 + 0.02))
      g.add(rib)
    }
  }
  // Hook bar at the front (this is what the roll-off truck pulls).
  const hookPost = box(0.12, H * 0.55, 0.12, STEEL)
  hookPost.position.set(-L / 2 - 0.02, H * 0.3, 0)
  g.add(hookPost)
  const hook = cyl(0.05, 0.5, STEEL, 8)
  hook.rotation.x = Math.PI / 2 // axis along z
  hook.position.set(-L / 2 - 0.02, H * 0.58, 0)
  g.add(hook)
  // Two longitudinal under-frame rails + rear rollers.
  for (const z of [-W / 3, W / 3]) {
    const rail = box(L, 0.12, 0.12, STEEL)
    rail.position.set(0, -0.06, z)
    g.add(rail)
  }
  for (const z of [-W / 2 + 0.22, W / 2 - 0.22]) {
    const roller = cyl(0.11, 0.18, STEEL, 10)
    roller.rotation.x = Math.PI / 2
    roller.position.set(L / 2 - 0.18, 0.02, z)
    g.add(roller)
  }
  return normalize(g)
}

// --- export ----------------------------------------------------------------
const MODELS = [
  { name: 'absetz-3', build: () => buildAbsetz({ L: 2.7, W: 1.5, H: 0.9 }) },
  { name: 'absetz-10', build: () => buildAbsetz({ L: 4.0, W: 2.0, H: 1.5 }) },
  { name: 'abroll-36', build: () => buildAbroll({ L: 6.5, W: 2.4, H: 2.5 }) },
]

await mkdir('public/models', { recursive: true })
for (const { name, build } of MODELS) {
  const scene = build()
  const glb = await new GLTFExporter().parseAsync(scene, { binary: true })
  await writeFile(`public/models/${name}.glb`, Buffer.from(glb))
  const usdz = await new USDZExporter().parseAsync(scene)
  await writeFile(`public/models/${name}.usdz`, Buffer.from(usdz))
  const b = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3())
  console.log(
    `${name}: ${b.x.toFixed(2)}×${b.y.toFixed(2)}×${b.z.toFixed(2)} m` +
      `  glb ${(glb.byteLength / 1024).toFixed(1)} KB  usdz ${(usdz.byteLength / 1024).toFixed(1)} KB`,
  )
}
