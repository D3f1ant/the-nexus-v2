import { useEffect, useRef } from 'react'

const RUNES    = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ'
const HEX      = '0123456789ABCDEF'
const MATH     = '∞∑∏∂∇⊕⊗⊙⟨⟩≈≠≡∴∵∃∀'
const OGHAM    = 'ᚁᚂᚃᚄᚅᚆᚇᚈᚉᚊᚋᚌᚍᚎᚏᚐᚑ'
const SIGILS   = '꩜⌘⚕✦✧⚡⚔☿♄⚖⚜✴⋆⟁⌖'
const ALCHEMIC = '🜀🜁🜂🜃🜄🜅🜆🜇🜈'
const BASE_CHARS = RUNES + HEX + MATH + OGHAM + SIGILS

function pickChar(rng: number): string {
  if (rng < 0.05) return ALCHEMIC[Math.floor(rng * 20) % ALCHEMIC.length]
  return BASE_CHARS[Math.floor(rng * BASE_CHARS.length) % BASE_CHARS.length]
}

function pickColor(roll: number): string {
  if (roll < 0.001) return '#ffffff'
  if (roll < 0.005) return '#c084fc'
  if (roll < 0.012) return '#fbbf24'
  if (roll < 0.025) return '#00ffd5'
  return '#00ff88'
}

interface ColState {
  y: number
  speed: number
  glitchTimer: number
  frozen: number
  lingerChar: string
  lingerY: number
  lingerBrightness: number
}

interface LayerConfig {
  fontSize: number
  colWidth: number
  interval: number
  fadeFill: string
  zIndex: number
}

const LAYERS: LayerConfig[] = [
  { fontSize: 10, colWidth: 10, interval: 33,  fadeFill: 'rgba(10,10,10,0.04)', zIndex: -3 },
  { fontSize: 14, colWidth: 14, interval: 50,  fadeFill: 'rgba(10,10,10,0.05)', zIndex: -2 },
  { fontSize: 20, colWidth: 20, interval: 80,  fadeFill: 'rgba(10,10,10,0.06)', zIndex: -1 },
]

function initCols(width: number, colWidth: number, height: number): ColState[] {
  const count = Math.floor(width / colWidth)
  return Array.from({ length: count }, () => ({
    y: Math.random() * height,
    speed: 0.5 + Math.random() * 2,
    glitchTimer: Math.floor(Math.random() * 300 + 80),
    frozen: 0,
    lingerChar: '',
    lingerY: 0,
    lingerBrightness: 0,
  }))
}

function RainLayer({ cfg }: { cfg: LayerConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = window.innerWidth
    let h = window.innerHeight
    canvas.width = w
    canvas.height = h

    let cols = initCols(w, cfg.colWidth, h)

    const tick = () => {
      ctx.fillStyle = cfg.fadeFill
      ctx.fillRect(0, 0, w, h)
      ctx.font = `${cfg.fontSize}px monospace`

      for (let i = 0; i < cols.length; i++) {
        const col = cols[i]
        const x = i * cfg.colWidth

        col.glitchTimer--
        if (col.glitchTimer <= 0) {
          const type = Math.random()
          if (type < 0.33) {
            col.frozen = 15
          } else if (type < 0.66) {
            col.frozen = -3  // flash-white sentinel
          } else {
            col.y = Math.random() * h
          }
          col.glitchTimer = Math.floor(Math.random() * 300 + 80)
        }

        if (col.frozen > 0) {
          col.frozen--
          if (col.lingerBrightness > 0) {
            ctx.fillStyle = `rgba(0,255,136,${col.lingerBrightness})`
            ctx.fillText(col.lingerChar, x, col.lingerY)
            col.lingerBrightness = Math.max(0, col.lingerBrightness - 0.05)
          }
          continue
        }

        if (col.frozen < 0) {
          ctx.fillStyle = '#ffffff'
          ctx.fillText(pickChar(Math.random()), x, col.y)
          col.frozen++
          col.y += cfg.colWidth * col.speed
          if (col.y > h) col.y = 0
          continue
        }

        const ch = pickChar(Math.random())
        ctx.fillStyle = pickColor(Math.random())
        ctx.fillText(ch, x, col.y)

        if (Math.random() < 0.08) {
          col.lingerChar = ch
          col.lingerY = col.y
          col.lingerBrightness = 1.0
        }

        if (col.lingerBrightness > 0) {
          ctx.fillStyle = `rgba(0,255,136,${col.lingerBrightness})`
          ctx.fillText(col.lingerChar, x, col.lingerY)
          col.lingerBrightness = Math.max(0, col.lingerBrightness - 0.04)
        }

        col.y += cfg.colWidth * col.speed
        if (col.y > h && Math.random() > 0.975) {
          col.y = 0
          col.speed = 0.5 + Math.random() * 2
        }
      }
    }

    const id = setInterval(tick, cfg.interval)
    const onResize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w
      canvas.height = h
      cols = initCols(w, cfg.colWidth, h)
    }
    window.addEventListener('resize', onResize)
    return () => {
      clearInterval(id)
      window.removeEventListener('resize', onResize)
    }
  }, [cfg])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: cfg.zIndex,
        pointerEvents: 'none',
      }}
    />
  )
}

export default function MatrixBackground() {
  return (
    <>
      {LAYERS.map((cfg) => (
        <RainLayer key={cfg.zIndex} cfg={cfg} />
      ))}
    </>
  )
}
