import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { ACCENT, BACKGROUND, MASKABLE_SCALE, renderIcon } from './generate-icons.mjs'

interface DecodedPng {
  width: number
  height: number
  rgba: Buffer
}

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

function crc32(buffer: Buffer): number {
  let c = 0xffffffff
  for (let i = 0; i < buffer.length; i++) {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function decodePng(buffer: Buffer): DecodedPng {
  expect(buffer.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  const idat: Buffer[] = []
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii')
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    expect(crc32(buffer.subarray(offset + 4, offset + 8 + length))).toBe(
      buffer.readUInt32BE(offset + 8 + length),
    )
    offset += 12 + length
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
    } else if (type === 'IDAT') {
      idat.push(Buffer.from(data))
    } else if (type === 'IEND') {
      break
    }
  }
  expect(bitDepth).toBe(8)
  expect(colorType).toBe(6)
  const stride = width * 4
  const raw = inflateSync(Buffer.concat(idat))
  expect(raw.length).toBe(height * (stride + 1))
  const rgba = Buffer.alloc(height * stride)
  let pos = 0
  for (let y = 0; y < height; y++) {
    expect(raw[pos]).toBe(0)
    pos += 1
    raw.copy(rgba, y * stride, pos, pos + stride)
    pos += stride
  }
  return { width, height, rgba }
}

function pixel(decoded: DecodedPng, x: number, y: number): number[] {
  const i = (y * decoded.width + x) * 4
  return [decoded.rgba[i], decoded.rgba[i + 1], decoded.rgba[i + 2], decoded.rgba[i + 3]]
}

function countPixelsNear(decoded: DecodedPng, rgb: number[], tolerance: number): number {
  let count = 0
  for (let y = 0; y < decoded.height; y++) {
    for (let x = 0; x < decoded.width; x++) {
      const [r, g, b] = pixel(decoded, x, y)
      if (
        Math.abs(r - rgb[0]) <= tolerance &&
        Math.abs(g - rgb[1]) <= tolerance &&
        Math.abs(b - rgb[2]) <= tolerance
      ) {
        count++
      }
    }
  }
  return count
}

describe('icon generator', () => {
  it('renders a 192x192 PNG at the requested size', () => {
    const decoded = decodePng(renderIcon(192))
    expect(decoded.width).toBe(192)
    expect(decoded.height).toBe(192)
  })

  it('paints the app background with a blue M', () => {
    const decoded = decodePng(renderIcon(512))
    expect(pixel(decoded, 4, 4)).toEqual([...BACKGROUND, 255])
    const blue = countPixelsNear(decoded, ACCENT, 8)
    expect(blue).toBeGreaterThan(0.1 * decoded.width * decoded.height)
    expect(blue).toBeLessThan(0.35 * decoded.width * decoded.height)
  })

  it('keeps the maskable variant inside the safe zone', () => {
    const decoded = decodePng(renderIcon(512, { scale: MASKABLE_SCALE }))
    const total = decoded.width * decoded.height
    const cx = decoded.width / 2
    const cy = decoded.height / 2
    let glyph = 0
    let maxDist = 0
    for (let y = 0; y < decoded.height; y++) {
      for (let x = 0; x < decoded.width; x++) {
        const [r, g, b] = pixel(decoded, x, y)
        if (r > 50 && g > 80 && b > 100) {
          glyph++
          maxDist = Math.max(maxDist, Math.hypot(x - cx, y - cy))
        }
      }
    }
    expect(glyph).toBeGreaterThan(0.05 * total)
    expect(maxDist).toBeLessThan(0.4 * decoded.width + 2)
  })
})
