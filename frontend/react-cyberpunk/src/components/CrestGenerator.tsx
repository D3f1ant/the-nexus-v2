import { useEffect, useRef } from 'react'
import type { AvatarConfig, Species, ShieldShape, BorderStyle } from '../types/avatar'

interface Props {
  username: string
  avatarConfig: AvatarConfig | null
  size?: number
  style?: React.CSSProperties
}

// ─── Deterministic RNG ────────────────────────────────────────────────────────

function fnv1a(str: string): number {
  let hash = 2166136261
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 16777619) >>> 0
  }
  return hash
}

function makeLcg(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0xFFFFFFFF
  }
}

// ─── Color helpers ────────────────────────────────────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [h / 6, s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const r = Math.round(hue2rgb(p, q, h + 1/3) * 255)
  const g = Math.round(hue2rgb(p, q, h) * 255)
  const bv = Math.round(hue2rgb(p, q, h - 1/3) * 255)
  return '#' + [r, g, bv].map(v => v.toString(16).padStart(2, '0')).join('')
}

function saturate(hex: string, amt: number): string {
  const [h, s, l] = hexToHsl(hex)
  return hslToHex(h, Math.min(1, s + amt), l)
}

function hslFromSeed(rng: () => number): string {
  return hslToHex(rng(), 0.5 + rng() * 0.4, 0.35 + rng() * 0.2)
}

// ─── Shield path builders ─────────────────────────────────────────────────────

function buildShieldPath(ctx: CanvasRenderingContext2D, shape: ShieldShape, cx: number, cy: number, w: number, h: number) {
  ctx.beginPath()
  switch (shape) {
    case 'heater':
      ctx.moveTo(cx, cy - h * 0.5)
      ctx.lineTo(cx + w * 0.5, cy - h * 0.5)
      ctx.lineTo(cx + w * 0.5, cy + h * 0.1)
      ctx.quadraticCurveTo(cx + w * 0.5, cy + h * 0.5, cx, cy + h * 0.5)
      ctx.quadraticCurveTo(cx - w * 0.5, cy + h * 0.5, cx - w * 0.5, cy + h * 0.1)
      ctx.lineTo(cx - w * 0.5, cy - h * 0.5)
      break
    case 'kite':
      ctx.moveTo(cx, cy - h * 0.5)
      ctx.lineTo(cx + w * 0.5, cy - h * 0.1)
      ctx.quadraticCurveTo(cx + w * 0.45, cy + h * 0.25, cx, cy + h * 0.5)
      ctx.quadraticCurveTo(cx - w * 0.45, cy + h * 0.25, cx - w * 0.5, cy - h * 0.1)
      break
    case 'oval':
      ctx.ellipse(cx, cy, w * 0.5, h * 0.5, 0, 0, Math.PI * 2)
      break
    case 'baroque':
      ctx.moveTo(cx, cy - h * 0.5)
      ctx.bezierCurveTo(cx + w * 0.6, cy - h * 0.5, cx + w * 0.55, cy, cx + w * 0.5, cy + h * 0.1)
      ctx.bezierCurveTo(cx + w * 0.5, cy + h * 0.35, cx + w * 0.25, cy + h * 0.5, cx, cy + h * 0.5)
      ctx.bezierCurveTo(cx - w * 0.25, cy + h * 0.5, cx - w * 0.5, cy + h * 0.35, cx - w * 0.5, cy + h * 0.1)
      ctx.bezierCurveTo(cx - w * 0.55, cy, cx - w * 0.6, cy - h * 0.5, cx, cy - h * 0.5)
      break
    case 'cartouche':
      ctx.roundRect(cx - w * 0.5, cy - h * 0.5, w, h, h * 0.2)
      break
  }
  ctx.closePath()
}

// ─── Border decorations ───────────────────────────────────────────────────────

function drawBorder(ctx: CanvasRenderingContext2D, shape: ShieldShape, style: BorderStyle, cx: number, cy: number, w: number, h: number, color: string) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 2

  if (style === 'plain' || style === 'double') {
    buildShieldPath(ctx, shape, cx, cy, w, h)
    ctx.stroke()
    if (style === 'double') {
      buildShieldPath(ctx, shape, cx, cy, w * 0.88, h * 0.88)
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }

  if (style === 'thorned') {
    buildShieldPath(ctx, shape, cx, cy, w, h)
    ctx.stroke()
    // Small spike decorations
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2
      const rx = cx + Math.cos(angle) * w * 0.48
      const ry = cy + Math.sin(angle) * h * 0.44
      ctx.beginPath()
      ctx.moveTo(rx, ry)
      ctx.lineTo(rx + Math.cos(angle) * 6, ry + Math.sin(angle) * 6)
      ctx.stroke()
    }
  }

  if (style === 'circuit') {
    buildShieldPath(ctx, shape, cx, cy, w, h)
    ctx.stroke()
    // Circuit trace lines
    ctx.lineWidth = 0.8
    ctx.globalAlpha = 0.5
    const steps = 8
    for (let i = 0; i < steps; i++) {
      const y = cy - h * 0.4 + (i / steps) * h * 0.8
      ctx.beginPath()
      ctx.moveTo(cx - w * 0.4, y)
      ctx.lineTo(cx - w * 0.25, y)
      ctx.moveTo(cx + w * 0.4, y)
      ctx.lineTo(cx + w * 0.25, y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  ctx.restore()
}

// ─── Sigil generator ──────────────────────────────────────────────────────────

function drawSigil(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, hash: number, color: string) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.shadowColor = color
  ctx.shadowBlur = 8

  const points: [number, number][] = []
  for (let i = 0; i < 8; i++) {
    const nibble = (hash >>> (i * 4)) & 0xF
    const angle = (nibble / 16) * Math.PI * 2
    const r = i % 2 === 0 ? radius * 0.9 : radius * 0.45
    points.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r])
  }

  ctx.beginPath()
  ctx.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1])
  }
  ctx.closePath()
  ctx.stroke()

  // Inner connecting lines
  ctx.globalAlpha = 0.4
  for (let i = 0; i < points.length; i++) {
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(points[i][0], points[i][1])
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0

  ctx.restore()
}

// ─── Species symbol ───────────────────────────────────────────────────────────

function drawSpeciesSymbol(ctx: CanvasRenderingContext2D, species: Species, cx: number, cy: number, r: number, color: string) {
  ctx.save()
  ctx.fillStyle = color
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5

  switch (species) {
    case 'human':
      ctx.beginPath(); ctx.arc(cx, cy - r * 0.2, r * 0.35, 0, Math.PI * 2); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + r * 0.5)
      ctx.moveTo(cx - r * 0.3, cy + r * 0.2); ctx.lineTo(cx + r * 0.3, cy + r * 0.2)
      ctx.stroke()
      break
    case 'minotaur':
      ctx.beginPath()
      ctx.arc(cx - r * 0.25, cy - r * 0.1, r * 0.2, 0, Math.PI * 2)
      ctx.arc(cx + r * 0.25, cy - r * 0.1, r * 0.2, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(cx - r * 0.15, cy - r * 0.3)
      ctx.bezierCurveTo(cx - r * 0.4, cy - r * 0.7, cx - r * 0.55, cy - r * 0.4, cx - r * 0.5, cy - r * 0.1)
      ctx.moveTo(cx + r * 0.15, cy - r * 0.3)
      ctx.bezierCurveTo(cx + r * 0.4, cy - r * 0.7, cx + r * 0.55, cy - r * 0.4, cx + r * 0.5, cy - r * 0.1)
      ctx.stroke()
      break
    case 'phoenixkin':
      ctx.beginPath()
      ctx.moveTo(cx, cy - r * 0.5)
      ctx.bezierCurveTo(cx + r * 0.3, cy - r * 0.2, cx + r * 0.5, cy + r * 0.1, cx, cy + r * 0.5)
      ctx.bezierCurveTo(cx - r * 0.5, cy + r * 0.1, cx - r * 0.3, cy - r * 0.2, cx, cy - r * 0.5)
      ctx.fill()
      break
    case 'kitsune':
      for (let t = 0; t < 3; t++) {
        const a = (-0.3 + t * 0.3) + Math.PI * 1.5
        ctx.beginPath()
        ctx.moveTo(cx, cy + r * 0.2)
        ctx.bezierCurveTo(cx + Math.cos(a - 0.3) * r * 0.6, cy + Math.sin(a - 0.3) * r * 0.6,
          cx + Math.cos(a + 0.3) * r * 0.6, cy + Math.sin(a + 0.3) * r * 0.6, cx, cy + r * 0.2)
        ctx.stroke()
      }
      break
    case 'dragonkin':
      ctx.beginPath()
      ctx.moveTo(cx, cy - r * 0.5)
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2
        const ra = (i + 0.5) / 5 * Math.PI * 2 - Math.PI / 2
        ctx.lineTo(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5)
        ctx.lineTo(cx + Math.cos(ra) * r * 0.22, cy + Math.sin(ra) * r * 0.22)
      }
      ctx.closePath()
      ctx.fill()
      break
    default:
      ctx.beginPath()
      ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2)
      ctx.stroke()
  }

  ctx.restore()
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CrestGenerator({ username, avatarConfig, size = 200, style }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const hash = fnv1a(username)
    const rng = makeLcg(hash)

    // Derived config
    const shapes: ShieldShape[] = ['heater', 'kite', 'oval', 'baroque', 'cartouche']
    const borders: BorderStyle[] = ['double', 'thorned', 'circuit', 'plain']
    const shape = shapes[hash % 5]
    const borderStyle = borders[fnv1a(username + 'border') % 4]
    const species: Species = avatarConfig?.species ?? 'human'

    const primaryColor = avatarConfig
      ? saturate(avatarConfig.skinColor, 0.3)
      : hslFromSeed(rng)
    const secondaryColor = avatarConfig
      ? avatarConfig.hair.color
      : hslFromSeed(rng)

    const cx = size / 2
    const cy = size / 2
    const w = size * 0.78
    const h = size * 0.88

    ctx.clearRect(0, 0, size, size)
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, size, size)

    // Clip to shield shape
    buildShieldPath(ctx, shape, cx, cy, w, h)
    ctx.save()
    ctx.clip()

    // Background fill
    const bgGrad = ctx.createLinearGradient(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2)
    bgGrad.addColorStop(0, primaryColor + '33')
    bgGrad.addColorStop(0.5, '#0a0a1a')
    bgGrad.addColorStop(1, secondaryColor + '22')
    ctx.fillStyle = bgGrad
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h)

    // Inner sigil
    drawSigil(ctx, cx, cy, size * 0.28, hash, primaryColor)

    // Species symbol
    drawSpeciesSymbol(ctx, species, cx, cy - size * 0.06, size * 0.14, secondaryColor)

    ctx.restore()

    // Border
    drawBorder(ctx, shape, borderStyle, cx, cy, w, h, primaryColor)

    // Username text at bottom
    ctx.save()
    ctx.font = `bold ${Math.floor(size * 0.065)}px monospace`
    ctx.fillStyle = primaryColor
    ctx.textAlign = 'center'
    ctx.shadowColor = primaryColor
    ctx.shadowBlur = 6
    ctx.fillText(username.toUpperCase().slice(0, 12), cx, cy + h * 0.42)
    ctx.shadowBlur = 0
    ctx.restore()

  }, [username, avatarConfig, size])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{
        borderRadius: '4px',
        border: '1px solid rgba(0,255,136,0.15)',
        ...style,
      }}
    />
  )
}
