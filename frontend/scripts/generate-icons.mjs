import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buffer) {
  let c = 0xffffffff
  for (let i = 0; i < buffer.length; i++) {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const stride = size * 4
  const raw = Buffer.alloc(size * (stride + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

export const BACKGROUND = [2, 6, 23]
export const ACCENT = [96, 165, 250]
export const MASKABLE_SCALE = 0.9

const M_GLYPH = [
  [0.2, 0.8], [0.2, 0.2], [0.36, 0.2], [0.5, 0.48], [0.64, 0.2], [0.8, 0.2],
  [0.8, 0.8], [0.64, 0.8], [0.64, 0.39], [0.5, 0.66], [0.36, 0.39], [0.36, 0.8],
]

function pointInPolygon(x, y, pts) {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0]
    const yi = pts[i][1]
    const xj = pts[j][0]
    const yj = pts[j][1]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

export function renderIcon(size, { scale = 1, supersample = 4 } = {}) {
  const s = supersample
  const big = size * s
  const pts = M_GLYPH.map(
    ([x, y]) => [(0.5 + (x - 0.5) * scale) * big, (0.5 + (y - 0.5) * scale) * big],
  )
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of pts) {
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  const coverage = new Uint8Array(big * big)
  const x0 = Math.max(0, Math.floor(minX))
  const x1 = Math.min(big - 1, Math.ceil(maxX))
  const y0 = Math.max(0, Math.floor(minY))
  const y1 = Math.min(big - 1, Math.ceil(maxY))
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (pointInPolygon(x + 0.5, y + 0.5, pts)) {
        coverage[y * big + x] = 1
      }
    }
  }
  const rgba = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0
      for (let dy = 0; dy < s; dy++) {
        const row = (y * s + dy) * big + x * s
        for (let dx = 0; dx < s; dx++) {
          sum += coverage[row + dx]
        }
      }
      const alpha = sum / (s * s)
      const i = (y * size + x) * 4
      rgba[i] = Math.round(BACKGROUND[0] + (ACCENT[0] - BACKGROUND[0]) * alpha)
      rgba[i + 1] = Math.round(BACKGROUND[1] + (ACCENT[1] - BACKGROUND[1]) * alpha)
      rgba[i + 2] = Math.round(BACKGROUND[2] + (ACCENT[2] - BACKGROUND[2]) * alpha)
      rgba[i + 3] = 255
    }
  }
  return encodePng(size, rgba)
}

const publicDir = new URL('../public/', import.meta.url)

export function main() {
  mkdirSync(fileURLToPath(publicDir), { recursive: true })
  const targets = [
    ['icon-192.png', renderIcon(192)],
    ['icon-512.png', renderIcon(512)],
    ['icon-maskable-512.png', renderIcon(512, { scale: MASKABLE_SCALE })],
    ['apple-touch-icon.png', renderIcon(180)],
  ]
  for (const [name, png] of targets) {
    writeFileSync(new URL(name, publicDir), png)
    console.log(`wrote public/${name}`)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
