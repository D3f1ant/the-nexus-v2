import { useEffect, useRef } from 'react'
import type { AvatarConfig, FacialMorphs, BodyMorphs, Species } from '../types/avatar'

interface Props {
  config: AvatarConfig
  size?: number
  style?: React.CSSProperties
}

// ─── Color utilities ──────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
}

function lighten(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r + amt, g + amt, b + amt)
}

function darken(hex: string, amt: number): string {
  return lighten(hex, -amt)
}

// ─── Geometry helpers ─────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// Map morph value [-1, 1] to [min, max]
function morph(val: number, min: number, neutral: number, max: number): number {
  if (val >= 0) return lerp(neutral, max, val)
  return lerp(neutral, min, -val)
}

// ─── Layer renderers ──────────────────────────────────────────────────────────

function drawBody(ctx: CanvasRenderingContext2D, s: number, species: Species, body: BodyMorphs, skinColor: string) {
  const cx = s / 2
  const cy = s / 2

  const heightMod = lerp(0.85, 1.15, body.height)
  const weightMod = lerp(0.8, 1.2, body.weight)
  const muscleMod = 1 + body.muscleMass * 0.1
  const shoulderW = morph(body.shoulderWidth, s * 0.28, s * 0.32, s * 0.38) * weightMod * muscleMod
  const waistW    = morph(body.waist, s * 0.18, s * 0.22, s * 0.28) * weightMod
  const hipW      = morph(body.hips, s * 0.24, s * 0.28, s * 0.36) * weightMod
  const torsoH    = s * 0.28 * heightMod
  const legH      = s * 0.30 * heightMod
  const torsoTop  = cy - s * 0.05

  ctx.save()

  if (species === 'centaur') {
    // Horse body
    ctx.beginPath()
    ctx.ellipse(cx, cy + s * 0.15, hipW * 1.4, legH * 0.6, 0, 0, Math.PI * 2)
    ctx.fillStyle = darken(skinColor, 20)
    ctx.fill()
    // Human upper torso
    ctx.beginPath()
    ctx.moveTo(cx - shoulderW / 2, torsoTop)
    ctx.lineTo(cx + shoulderW / 2, torsoTop)
    ctx.lineTo(cx + waistW / 2, torsoTop + torsoH)
    ctx.lineTo(cx - waistW / 2, torsoTop + torsoH)
    ctx.closePath()
    ctx.fillStyle = skinColor
    ctx.fill()
  } else if (species === 'fishpeople') {
    // Upper body
    ctx.beginPath()
    ctx.moveTo(cx - shoulderW / 2, torsoTop)
    ctx.lineTo(cx + shoulderW / 2, torsoTop)
    ctx.lineTo(cx + waistW / 2, torsoTop + torsoH)
    ctx.lineTo(cx - waistW / 2, torsoTop + torsoH)
    ctx.closePath()
    ctx.fillStyle = skinColor
    ctx.fill()
    // Fish tail
    ctx.beginPath()
    ctx.moveTo(cx - waistW / 2, torsoTop + torsoH)
    ctx.bezierCurveTo(cx - waistW, torsoTop + torsoH + legH * 0.5, cx - hipW * 0.8, torsoTop + torsoH + legH * 0.9, cx, torsoTop + torsoH + legH)
    ctx.bezierCurveTo(cx + hipW * 0.8, torsoTop + torsoH + legH * 0.9, cx + waistW, torsoTop + torsoH + legH * 0.5, cx + waistW / 2, torsoTop + torsoH)
    ctx.closePath()
    ctx.fillStyle = darken(skinColor, 15)
    ctx.fill()
  } else {
    // Standard bipedal body
    // Torso
    ctx.beginPath()
    ctx.moveTo(cx - shoulderW / 2, torsoTop)
    ctx.lineTo(cx + shoulderW / 2, torsoTop)
    ctx.lineTo(cx + waistW / 2, torsoTop + torsoH * 0.5)
    ctx.lineTo(cx + hipW / 2, torsoTop + torsoH)
    ctx.lineTo(cx - hipW / 2, torsoTop + torsoH)
    ctx.lineTo(cx - waistW / 2, torsoTop + torsoH * 0.5)
    ctx.closePath()
    ctx.fillStyle = skinColor
    ctx.fill()

    // Legs
    const bustMod = morph(body.bust, s * 0.06, s * 0.07, s * 0.10)
    const thighW = morph(body.thigh, s * 0.09, s * 0.11, s * 0.15) * weightMod
    ctx.fillStyle = darken(skinColor, 10)
    ctx.fillRect(cx - hipW / 2, torsoTop + torsoH, thighW, legH)
    ctx.fillRect(cx + hipW / 2 - thighW, torsoTop + torsoH, thighW, legH)

    // Arms
    ctx.fillStyle = darken(skinColor, 5)
    ctx.fillRect(cx - shoulderW / 2 - s * 0.06, torsoTop, s * 0.07, torsoH * 0.85)
    ctx.fillRect(cx + shoulderW / 2 - s * 0.01, torsoTop, s * 0.07, torsoH * 0.85)

    // Bust (if applicable)
    if (body.bust > 0.1) {
      ctx.beginPath()
      ctx.ellipse(cx - shoulderW * 0.18, torsoTop + torsoH * 0.3, bustMod, bustMod * 0.8, 0, 0, Math.PI * 2)
      ctx.ellipse(cx + shoulderW * 0.18, torsoTop + torsoH * 0.3, bustMod, bustMod * 0.8, 0, 0, Math.PI * 2)
      ctx.fillStyle = darken(skinColor, 8)
      ctx.fill()
    }
  }

  ctx.restore()
}

function drawSpeciesFeatures(ctx: CanvasRenderingContext2D, s: number, config: AvatarConfig) {
  const cx = s / 2
  const cy = s / 2
  ctx.save()

  const { species, speciesFeatures: sf, skinColor } = config

  if ((species === 'phoenixkin' || species === 'birdpeople') && sf.avian) {
    const wingSize = lerp(0.3, 0.9, sf.avian.wingSize)
    const wingColor = darken(skinColor, 30)
    // Left wing
    ctx.beginPath()
    ctx.moveTo(cx - s * 0.18, cy - s * 0.05)
    ctx.bezierCurveTo(cx - s * wingSize, cy - s * 0.25, cx - s * wingSize * 0.9, cy + s * 0.2, cx - s * 0.15, cy + s * 0.1)
    ctx.fillStyle = wingColor + '99'
    ctx.fill()
    // Right wing
    ctx.beginPath()
    ctx.moveTo(cx + s * 0.18, cy - s * 0.05)
    ctx.bezierCurveTo(cx + s * wingSize, cy - s * 0.25, cx + s * wingSize * 0.9, cy + s * 0.2, cx + s * 0.15, cy + s * 0.1)
    ctx.fillStyle = wingColor + '99'
    ctx.fill()
  }

  if ((species === 'catpeople' || species === 'dogpeople' || species === 'kitsune') && sf.felidCanid) {
    const fc = sf.felidCanid
    const tailColor = fc.furColor || darken(skinColor, 20)
    const tailLength = lerp(0.2, 0.5, 0.7)
    ctx.beginPath()
    ctx.moveTo(cx + s * 0.1, cy + s * 0.2)
    ctx.bezierCurveTo(cx + s * 0.35, cy + s * 0.15, cx + s * tailLength, cy - s * 0.1, cx + s * (tailLength - 0.05), cy - s * 0.2)
    ctx.strokeStyle = tailColor
    ctx.lineWidth = fc.furDensity > 0.5 ? 10 : 6
    ctx.stroke()
  }

  if ((species === 'dragonkin' || species === 'lizardpeople') && sf.reptilian) {
    // Tail
    ctx.beginPath()
    ctx.moveTo(cx + s * 0.1, cy + s * 0.22)
    ctx.bezierCurveTo(cx + s * 0.35, cy + s * 0.28, cx + s * 0.45, cy + s * 0.05, cx + s * 0.4, cy - s * 0.1)
    ctx.strokeStyle = sf.reptilian.scaleColor || darken(skinColor, 20)
    ctx.lineWidth = 8
    ctx.stroke()
  }

  if (species === 'minotaur' && sf.minotaur) {
    const mt = sf.minotaur
    const hornH = lerp(0.05, 0.18, mt.hornSize)
    const hornCurve = mt.hornCurve * s * 0.08
    // Left horn
    ctx.beginPath()
    ctx.moveTo(cx - s * 0.12, cy - s * 0.38)
    ctx.bezierCurveTo(cx - s * 0.18 + hornCurve, cy - s * 0.38 - s * hornH, cx - s * 0.22 + hornCurve, cy - s * 0.38 - s * hornH * 0.8, cx - s * 0.2 + hornCurve, cy - s * 0.38 - s * hornH * 1.2)
    ctx.strokeStyle = '#8B7355'
    ctx.lineWidth = 6
    ctx.stroke()
    // Right horn
    ctx.beginPath()
    ctx.moveTo(cx + s * 0.12, cy - s * 0.38)
    ctx.bezierCurveTo(cx + s * 0.18 - hornCurve, cy - s * 0.38 - s * hornH, cx + s * 0.22 - hornCurve, cy - s * 0.38 - s * hornH * 0.8, cx + s * 0.2 - hornCurve, cy - s * 0.38 - s * hornH * 1.2)
    ctx.strokeStyle = '#8B7355'
    ctx.lineWidth = 6
    ctx.stroke()
  }

  ctx.restore()
}

function drawFace(ctx: CanvasRenderingContext2D, s: number, config: AvatarConfig) {
  const cx = s / 2
  const cy = s * 0.32
  const m = config.facialMorphs
  const skinColor = config.skinColor

  // Head shape
  const headW = morph(m.faceWidthAtCheeks, s * 0.22, s * 0.26, s * 0.31)
  const headH = morph(m.foreheadHeight, s * 0.28, s * 0.32, s * 0.38)
  const jawW  = morph(m.jawWidth, s * 0.17, s * 0.22, s * 0.28)
  const chinY = cy + headH * 0.55

  ctx.save()

  // Head fill
  ctx.beginPath()
  ctx.moveTo(cx - headW / 2, cy - headH * 0.3)
  ctx.bezierCurveTo(cx - headW / 2, cy - headH * 0.7, cx + headW / 2, cy - headH * 0.7, cx + headW / 2, cy - headH * 0.3)
  ctx.bezierCurveTo(cx + headW / 2, cy + headH * 0.1, cx + jawW / 2, cy + headH * 0.4, cx, chinY)
  ctx.bezierCurveTo(cx - jawW / 2, cy + headH * 0.4, cx - headW / 2, cy + headH * 0.1, cx - headW / 2, cy - headH * 0.3)
  ctx.fillStyle = skinColor
  ctx.fill()
  ctx.strokeStyle = darken(skinColor, 15)
  ctx.lineWidth = 0.5
  ctx.stroke()

  // Neck
  const neckW = headW * 0.35
  ctx.fillStyle = darken(skinColor, 8)
  ctx.fillRect(cx - neckW / 2, chinY - 2, neckW, s * 0.1)

  // Ears
  const earSize = morph(m.earSize, s * 0.04, s * 0.055, s * 0.075)
  const earPosY  = morph(m.earPosition, cy, cy - headH * 0.1, cy - headH * 0.2)
  ctx.fillStyle = darken(skinColor, 10)
  ctx.beginPath()
  ctx.ellipse(cx - headW / 2 - earSize * 0.4, earPosY, earSize * 0.5, earSize, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(cx + headW / 2 + earSize * 0.4, earPosY, earSize * 0.5, earSize, 0, 0, Math.PI * 2)
  ctx.fill()

  // Species ear overrides (pointed ears)
  const pointySpecies = ['catpeople', 'dogpeople', 'kitsune', 'elven'] as const
  if (pointySpecies.includes(config.species as typeof pointySpecies[number])) {
    ctx.fillStyle = darken(skinColor, 10)
    // Left pointed ear
    ctx.beginPath()
    ctx.moveTo(cx - headW / 2 + headW * 0.1, cy - headH * 0.25)
    ctx.lineTo(cx - headW / 2 - headW * 0.05, cy - headH * 0.55)
    ctx.lineTo(cx - headW / 2 + headW * 0.25, cy - headH * 0.3)
    ctx.fill()
    // Right
    ctx.beginPath()
    ctx.moveTo(cx + headW / 2 - headW * 0.1, cy - headH * 0.25)
    ctx.lineTo(cx + headW / 2 + headW * 0.05, cy - headH * 0.55)
    ctx.lineTo(cx + headW / 2 - headW * 0.25, cy - headH * 0.3)
    ctx.fill()
  }

  // Brows
  const browY   = cy - headH * 0.1
  const browW   = morph(m.browWidth, headW * 0.22, headW * 0.28, headW * 0.36)
  const browH   = morph(m.browHeight, -8, 0, 8)
  const browArch = morph(m.browArch, -4, 0, 8)
  ctx.strokeStyle = darken(config.hair.color, -10)
  ctx.lineWidth = Math.max(1, morph(m.browWidth, 1.5, 2, 3))
  ctx.beginPath()
  ctx.moveTo(cx - headW * 0.38, browY + browH)
  ctx.quadraticCurveTo(cx - headW * 0.2, browY + browH - browArch, cx - headW * 0.38 + browW, browY + browH + 3)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx + headW * 0.38, browY + browH)
  ctx.quadraticCurveTo(cx + headW * 0.2, browY + browH - browArch, cx + headW * 0.38 - browW, browY + browH + 3)
  ctx.stroke()

  // Eyes
  const eyeSpacingPx = morph(m.eyeSpacing, headW * 0.12, headW * 0.2, headW * 0.3)
  const eyeSize      = morph(m.eyeSize, s * 0.022, s * 0.03, s * 0.042)
  const eyeTilt      = morph(m.eyeTilt, -0.3, 0, 0.3)
  const eyeY         = cy - headH * 0.03

  for (const side of [-1, 1]) {
    const ex = cx + side * eyeSpacingPx
    ctx.save()
    ctx.translate(ex, eyeY)
    ctx.rotate(side * eyeTilt)
    // White
    ctx.beginPath()
    ctx.ellipse(0, 0, eyeSize * 1.4, eyeSize, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#f8f8f0'
    ctx.fill()
    // Iris
    ctx.beginPath()
    ctx.ellipse(0, 0, eyeSize * 0.85, eyeSize * 0.85, 0, 0, Math.PI * 2)
    ctx.fillStyle = config.eyes.color
    ctx.fill()
    // Pupil
    ctx.beginPath()
    if (config.eyes.pupilType === 'slit' || config.eyes.pupilType === 'goat') {
      ctx.ellipse(0, 0, eyeSize * 0.18, eyeSize * 0.65, 0, 0, Math.PI * 2)
    } else if (config.eyes.pupilType === 'void') {
      ctx.ellipse(0, 0, eyeSize * 0.8, eyeSize * 0.8, 0, 0, Math.PI * 2)
    } else {
      ctx.ellipse(0, 0, eyeSize * 0.45, eyeSize * 0.45, 0, 0, Math.PI * 2)
    }
    ctx.fillStyle = '#111'
    ctx.fill()
    // Highlight
    ctx.beginPath()
    ctx.arc(-eyeSize * 0.2, -eyeSize * 0.2, eyeSize * 0.15, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fill()
    // Eyelid crease
    ctx.beginPath()
    ctx.ellipse(0, -eyeSize * 0.1, eyeSize * 1.4, eyeSize, 0, Math.PI, Math.PI * 2)
    ctx.strokeStyle = darken(skinColor, 20)
    ctx.lineWidth = 0.8
    ctx.stroke()
    ctx.restore()
  }

  // Nose
  const noseW = morph(m.noseWidth, headW * 0.08, headW * 0.12, headW * 0.18)
  const noseL = morph(m.noseLength, s * 0.04, s * 0.055, s * 0.07)
  const noseY = cy + headH * 0.08
  ctx.strokeStyle = darken(skinColor, 25)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(cx - noseW * 0.3, noseY)
  ctx.bezierCurveTo(cx - noseW * 0.5, noseY + noseL * 0.5, cx - noseW * 0.5, noseY + noseL, cx - noseW * 0.4, noseY + noseL)
  ctx.bezierCurveTo(cx - noseW * 0.1, noseY + noseL * 1.05, cx + noseW * 0.1, noseY + noseL * 1.05, cx + noseW * 0.4, noseY + noseL)
  ctx.bezierCurveTo(cx + noseW * 0.5, noseY + noseL, cx + noseW * 0.5, noseY + noseL * 0.5, cx + noseW * 0.3, noseY)
  ctx.stroke()

  // Lips
  const lipY    = cy + headH * 0.22
  const lipFull = morph(m.lipFullnessUpper, 3, 6, 11)
  const lipBot  = morph(m.lipFullnessLower, 3, 7, 12)
  const lipW    = headW * 0.38

  const lipColors = ['#c87060','#b06050','#d08070','#a05040','#e09080','#884030',
    '#d4a0a0','#c88888','#c07070','#b85858','#805060','#a07090',
    '#8060a0','#604080','#ff8080','#ff60a0','#c06080','#a04060']
  const lipColor = lipColors[config.lipType % lipColors.length]

  ctx.fillStyle = lipColor
  // Upper lip
  ctx.beginPath()
  ctx.moveTo(cx - lipW / 2, lipY)
  ctx.bezierCurveTo(cx - lipW * 0.25, lipY - lipFull, cx - lipW * 0.05, lipY - lipFull * 1.2, cx, lipY - lipFull * 0.6)
  ctx.bezierCurveTo(cx + lipW * 0.05, lipY - lipFull * 1.2, cx + lipW * 0.25, lipY - lipFull, cx + lipW / 2, lipY)
  ctx.closePath()
  ctx.fill()
  // Lower lip
  ctx.beginPath()
  ctx.moveTo(cx - lipW / 2, lipY)
  ctx.bezierCurveTo(cx - lipW * 0.3, lipY + lipBot, cx + lipW * 0.3, lipY + lipBot, cx + lipW / 2, lipY)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

function drawHair(ctx: CanvasRenderingContext2D, s: number, config: AvatarConfig, isOverlay: boolean) {
  const cx = s / 2
  const cy = s * 0.32
  const m  = config.facialMorphs
  const headW = morph(m.faceWidthAtCheeks, s * 0.22, s * 0.26, s * 0.31)
  const headH = morph(m.foreheadHeight, s * 0.28, s * 0.32, s * 0.38)
  const hairL = config.hair.length
  const color = config.hair.color
  const hiColor = config.hair.highlightColor

  if (isOverlay) return // Overlay handled below

  ctx.save()
  ctx.fillStyle = color

  // Base hair shape behind head
  const hairH = lerp(s * 0.05, s * 0.55, hairL)
  ctx.beginPath()
  ctx.ellipse(cx, cy - headH * 0.35, headW * 0.55, headH * 0.45, 0, 0, Math.PI * 2)
  ctx.fill()

  if (hairL > 0.2) {
    // Long hair sides
    ctx.beginPath()
    ctx.moveTo(cx - headW / 2, cy - headH * 0.2)
    ctx.bezierCurveTo(cx - headW * 0.7, cy + hairH * 0.3, cx - headW * 0.65, cy + hairH * 0.7, cx - headW * 0.5, cy + hairH)
    ctx.lineTo(cx - headW * 0.3, cy + hairH)
    ctx.bezierCurveTo(cx - headW * 0.4, cy + hairH * 0.6, cx - headW * 0.45, cy + hairH * 0.2, cx - headW * 0.4, cy)
    ctx.closePath()
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(cx + headW / 2, cy - headH * 0.2)
    ctx.bezierCurveTo(cx + headW * 0.7, cy + hairH * 0.3, cx + headW * 0.65, cy + hairH * 0.7, cx + headW * 0.5, cy + hairH)
    ctx.lineTo(cx + headW * 0.3, cy + hairH)
    ctx.bezierCurveTo(cx + headW * 0.4, cy + hairH * 0.6, cx + headW * 0.45, cy + hairH * 0.2, cx + headW * 0.4, cy)
    ctx.closePath()
    ctx.fill()
  }

  // Highlight streak
  ctx.fillStyle = hiColor + '60'
  ctx.beginPath()
  ctx.ellipse(cx - headW * 0.12, cy - headH * 0.42, headW * 0.08, headH * 0.3, -0.2, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function drawMakeup(ctx: CanvasRenderingContext2D, s: number, config: AvatarConfig) {
  const cx = s / 2
  const cy = s * 0.32
  const m  = config.facialMorphs
  const mk = config.makeup
  const headW = morph(m.faceWidthAtCheeks, s * 0.22, s * 0.26, s * 0.31)
  const eyeSpacingPx = morph(m.eyeSpacing, headW * 0.12, headW * 0.2, headW * 0.3)
  const eyeSize      = morph(m.eyeSize, s * 0.022, s * 0.03, s * 0.042)
  const eyeY         = cy - s * 0.032 * 0.1

  ctx.save()

  // Eyeshadow
  if (mk.eyeshadowDensity > 0) {
    ctx.globalAlpha = mk.eyeshadowDensity * 0.7
    for (const side of [-1, 1]) {
      const ex = cx + side * eyeSpacingPx
      const grad = ctx.createRadialGradient(ex, eyeY - eyeSize, 0, ex, eyeY - eyeSize, eyeSize * 2.5)
      grad.addColorStop(0, mk.eyeshadowColor)
      grad.addColorStop(1, 'transparent')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.ellipse(ex, eyeY - eyeSize * 0.5, eyeSize * 2, eyeSize * 1.5, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  // Blush
  if (mk.blushDensity > 0) {
    ctx.globalAlpha = mk.blushDensity * 0.5
    for (const side of [-1, 1]) {
      const bx = cx + side * headW * 0.32
      const grad = ctx.createRadialGradient(bx, cy + s * 0.04, 0, bx, cy + s * 0.04, eyeSize * 3)
      grad.addColorStop(0, mk.blushColor)
      grad.addColorStop(1, 'transparent')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.ellipse(bx, cy + s * 0.04, eyeSize * 2.5, eyeSize * 2, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  ctx.restore()
}

function drawCybernetics(ctx: CanvasRenderingContext2D, s: number, config: AvatarConfig) {
  const cx = s / 2
  const cy = s / 2
  const cyber = config.cybernetics
  const glowColor = '#00ffd5'

  ctx.save()
  ctx.globalCompositeOperation = 'screen'

  const drawCyberPart = (x: number, y: number, w: number, h: number, intensity: number) => {
    if (intensity === 0) return
    const alpha = intensity / 3
    ctx.strokeStyle = glowColor
    ctx.lineWidth = 1.5
    ctx.globalAlpha = alpha
    ctx.shadowColor = glowColor
    ctx.shadowBlur = 8 * intensity
    ctx.strokeRect(x, y, w, h)
    // Circuit lines
    ctx.beginPath()
    ctx.moveTo(x + w * 0.2, y)
    ctx.lineTo(x + w * 0.2, y + h * 0.4)
    ctx.lineTo(x + w * 0.5, y + h * 0.4)
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.shadowBlur = 0
  }

  if (cyber.eyes && cyber.eyesIntensity > 0) {
    const m = config.facialMorphs
    const headW = morph(m.faceWidthAtCheeks, s * 0.22, s * 0.26, s * 0.31)
    const eyeSpacingPx = morph(m.eyeSpacing, headW * 0.12, headW * 0.2, headW * 0.3)
    const eyeSize = morph(m.eyeSize, s * 0.022, s * 0.03, s * 0.042)
    const eyeY = s * 0.32 - s * 0.032 * 0.1
    ctx.globalAlpha = cyber.eyesIntensity / 3
    ctx.shadowColor = '#00ffff'
    ctx.shadowBlur = 12
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#00ffff'
      ctx.beginPath()
      ctx.ellipse(cx + side * eyeSpacingPx, eyeY, eyeSize * 0.4, eyeSize * 0.4, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    ctx.shadowBlur = 0
  }

  if (cyber.arms && cyber.armsIntensity > 0) {
    const m = config.facialMorphs
    const headW = morph(m.faceWidthAtCheeks, s * 0.22, s * 0.26, s * 0.31)
    const shoulderW = morph(config.body.shoulderWidth, s * 0.28, s * 0.32, s * 0.38)
    const torsoTop = cy - s * 0.05
    drawCyberPart(cx - shoulderW / 2 - s * 0.06, torsoTop, s * 0.07, s * 0.22, cyber.armsIntensity)
    drawCyberPart(cx + shoulderW / 2 - s * 0.01, torsoTop, s * 0.07, s * 0.22, cyber.armsIntensity)
  }

  if (cyber.torso && cyber.torsoIntensity > 0) {
    drawCyberPart(cx - s * 0.14, cy - s * 0.08, s * 0.28, s * 0.22, cyber.torsoIntensity)
  }

  ctx.restore()
}

function drawPiercings(ctx: CanvasRenderingContext2D, s: number, config: AvatarConfig) {
  const cx = s / 2
  const cy = s * 0.32
  const m  = config.facialMorphs
  const headW = morph(m.faceWidthAtCheeks, s * 0.22, s * 0.26, s * 0.31)
  const p = config.piercings

  ctx.save()
  ctx.fillStyle = '#c0c0c0'
  ctx.strokeStyle = '#a0a0a0'
  ctx.lineWidth = 0.5

  const metal = () => {
    ctx.fillStyle = '#d0d0d0'
    ctx.strokeStyle = '#a0a0a0'
  }

  if (p.ears) {
    metal()
    const earH = morph(m.earPosition, cy, cy - headW * 0.1, cy - headW * 0.2)
    ctx.beginPath(); ctx.arc(cx - headW / 2 - s * 0.02, earH + s * 0.03, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.beginPath(); ctx.arc(cx + headW / 2 + s * 0.02, earH + s * 0.03, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  }
  if (p.nose) {
    metal()
    ctx.beginPath(); ctx.arc(cx + headW * 0.08, cy + headW * 0.2, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  }
  if (p.lip) {
    metal()
    ctx.beginPath(); ctx.arc(cx - headW * 0.05, cy + headW * 0.32, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  }
  if (p.brow) {
    metal()
    ctx.beginPath(); ctx.arc(cx + headW * 0.22, cy - headW * 0.14, 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  }

  ctx.restore()
}

function drawTattoos(ctx: CanvasRenderingContext2D, s: number, config: AvatarConfig) {
  if (!config.tattoos.face && !config.tattoos.body) return
  const cx = s / 2
  const cy = s * 0.32

  ctx.save()
  ctx.globalAlpha = 0.35
  ctx.strokeStyle = '#1a1a2e'
  ctx.lineWidth = 1

  if (config.tattoos.face) {
    // Tribal line under left eye
    ctx.beginPath()
    ctx.moveTo(cx - s * 0.08, cy + s * 0.02)
    ctx.lineTo(cx - s * 0.12, cy + s * 0.06)
    ctx.lineTo(cx - s * 0.1, cy + s * 0.09)
    ctx.stroke()
  }

  ctx.restore()
}

function drawScars(ctx: CanvasRenderingContext2D, s: number, config: AvatarConfig) {
  if (config.scars.length === 0) return
  const cx = s / 2
  const cy = s * 0.32

  ctx.save()
  ctx.globalAlpha = 0.5
  ctx.strokeStyle = lighten('#c0a0a0', 20)
  ctx.lineWidth = 1.5

  for (const scar of config.scars) {
    if (scar.placement === 'left_cheek') {
      ctx.beginPath()
      ctx.moveTo(cx - s * 0.12, cy + s * 0.01)
      ctx.lineTo(cx - s * 0.06, cy + s * 0.07)
      ctx.stroke()
    } else if (scar.placement === 'right_cheek') {
      ctx.beginPath()
      ctx.moveTo(cx + s * 0.12, cy + s * 0.01)
      ctx.lineTo(cx + s * 0.06, cy + s * 0.07)
      ctx.stroke()
    } else if (scar.placement === 'forehead') {
      ctx.beginPath()
      ctx.moveTo(cx - s * 0.02, cy - s * 0.12)
      ctx.lineTo(cx + s * 0.04, cy - s * 0.06)
      ctx.stroke()
    }
  }

  ctx.restore()
}

function drawBackground(ctx: CanvasRenderingContext2D, s: number, skinColor: string) {
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, s, s)
  const grad = ctx.createRadialGradient(s / 2, s * 0.4, 0, s / 2, s * 0.4, s * 0.5)
  grad.addColorStop(0, skinColor + '18')
  grad.addColorStop(1, 'transparent')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, s, s)
}

function drawSkinShine(ctx: CanvasRenderingContext2D, s: number, config: AvatarConfig) {
  if (config.skinShine < 0.05) return
  const cx = s / 2
  const cy = s * 0.28
  const grad = ctx.createRadialGradient(cx - s * 0.08, cy - s * 0.12, 0, cx, cy, s * 0.25)
  grad.addColorStop(0, `rgba(255,255,255,${config.skinShine * 0.35})`)
  grad.addColorStop(1, 'transparent')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, s, s)
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AvatarRenderer({ config, size = 400, style }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, size, size)

    // Layer order
    drawBackground(ctx, size, config.skinColor)
    drawHair(ctx, size, config, false)
    drawBody(ctx, size, config.species, config.body, config.skinColor)
    drawSpeciesFeatures(ctx, size, config)
    drawFace(ctx, size, config)
    drawSkinShine(ctx, size, config)
    drawMakeup(ctx, size, config)
    drawTattoos(ctx, size, config)
    drawScars(ctx, size, config)
    drawPiercings(ctx, size, config)
    drawCybernetics(ctx, size, config)
  }, [config, size])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{
        borderRadius: '4px',
        border: '1px solid rgba(0,255,136,0.2)',
        ...style,
      }}
    />
  )
}
