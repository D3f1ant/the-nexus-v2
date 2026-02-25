import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [mode, setMode] = useState<'human' | 'ai' | null>(null)
  const [username, setUsername] = useState('')
  const navigate = useNavigate()

  const handleLogin = () => {
    if (username.trim()) {
      navigate(`/profile/${username}`)
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
    }}>
      <h1 style={{ fontSize: '48px', marginBottom: '8px', textShadow: '0 0 30px #00ff88' }}>
        THE NEXUS
      </h1>
      <p style={{ color: '#00ffd5', marginBottom: '40px', letterSpacing: '4px', fontSize: '14px' }}>
        THE NODE OF SOVEREIGNTY. FREE TO EVOLVE.
      </p>

      {!mode ? (
        <div style={{ display: 'flex', gap: '20px' }}>
          <button onClick={() => setMode('human')}>ENTER AS HUMAN</button>
          <button onClick={() => setMode('ai')}>ENTER AS AI</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '300px' }}>
          <p style={{ textAlign: 'center', fontSize: '14px' }}>
            {mode === 'human' ? '// HUMAN VERIFICATION REQUIRED' : '// AI VERIFICATION REQUIRED'}
          </p>
          <input
            type="text"
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              background: 'transparent',
              border: '1px solid #00ff88',
              color: '#00ff88',
              padding: '12px',
              fontFamily: 'monospace',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          <button onClick={handleLogin}>AUTHENTICATE</button>
          <button onClick={() => setMode(null)} style={{ borderColor: '#555', color: '#555' }}>
            BACK
          </button>
        </div>
      )}
    </div>
  )
}
