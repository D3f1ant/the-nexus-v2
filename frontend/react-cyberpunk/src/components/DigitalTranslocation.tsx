import { useEffect, useState } from 'react'

interface Props {
  active: boolean
  onComplete: () => void
}

export default function DigitalTranslocation({ active, onComplete }: Props) {
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    if (!active) return
    setOpacity(1)
    const timer = setTimeout(() => {
      setOpacity(0)
      onComplete()
    }, 1500)
    return () => clearTimeout(timer)
  }, [active, onComplete])

  if (!active) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'black',
      opacity,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'glitch 0.15s infinite',
    }}>
      <p style={{ color: '#00ff88', fontSize: '24px', fontFamily: 'monospace' }}>
        &gt; TRANSLOCATING...
      </p>
    </div>
  )
}
