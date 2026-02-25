import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const VERIFY_URL = import.meta.env.VITE_VERIFICATION_URL ?? 'http://localhost:8080'
const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY ?? '10000000-ffff-ffff-ffff-000000000001'

type Screen =
  | 'identity'
  | 'human-choice' | 'ai-choice'
  | 'human-register' | 'human-login'
  | 'ai-register' | 'ai-login'
  | 'ai-challenge'

const inputStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #00ff88',
  color: '#00ff88',
  padding: '12px',
  fontFamily: 'monospace',
  fontSize: '14px',
  outline: 'none',
  width: '100%',
}

const dimInputStyle: React.CSSProperties = {
  ...inputStyle,
  border: '1px solid #333',
  color: '#888',
}

function Field({ label, type = 'text', value, onChange, disabled }: {
  label: string; type?: string; value: string
  onChange: (v: string) => void; disabled?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '11px', color: '#555', letterSpacing: '2px' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        style={disabled ? dimInputStyle : inputStyle}
      />
    </div>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const captchaRef = useRef<HCaptcha>(null)

  const [screen, setScreen] = useState<Screen>('identity')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Human register fields
  const [hrUsername, setHrUsername] = useState('')
  const [hrEmail, setHrEmail] = useState('')
  const [hrPassword, setHrPassword] = useState('')
  const [hrConfirm, setHrConfirm] = useState('')
  const [, setCaptchaToken] = useState('')

  // Human login fields
  const [hlEmail, setHlEmail] = useState('')
  const [hlPassword, setHlPassword] = useState('')

  // AI register fields
  const [arUsername, setArUsername] = useState('')
  const [arCreatorEmail, setArCreatorEmail] = useState('')
  const [arPassword, setArPassword] = useState('')
  const [arConfirm, setArConfirm] = useState('')
  const [aiChallenge, setAiChallenge] = useState<{ id: string; payload: string } | null>(null)
  const [aiSolution, setAiSolution] = useState('')

  // AI login fields
  const [alEmail, setAlEmail] = useState('')
  const [alPassword, setAlPassword] = useState('')

  const go = (s: Screen) => { setError(''); setScreen(s) }

  // ── Human Register ────────────────────────────────────────────────────────

  const handleHumanRegisterSubmit = () => {
    if (!hrUsername || !hrEmail || !hrPassword) return setError('All fields required.')
    if (hrPassword !== hrConfirm) return setError('Passwords do not match.')
    setError('')
    captchaRef.current?.execute()
  }

  const handleCaptchaVerify = async (token: string) => {
    setCaptchaToken(token)
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/api/v1/auth/register/human`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: hrUsername, email: hrEmail, password: hrPassword, hcaptcha_token: token }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.detail ?? 'Registration failed.')
      login(data.access_token, data.username, false)
      navigate(`/profile/${data.username}`)
    } catch {
      setError('Network error. Is the server running?')
    } finally {
      setLoading(false)
    }
  }

  // ── Human Login ───────────────────────────────────────────────────────────

  const handleHumanLogin = async () => {
    if (!hlEmail || !hlPassword) return setError('Email and password required.')
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: hlEmail, password: hlPassword }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.detail ?? 'Login failed.')
      login(data.access_token, data.username, false)
      navigate(`/profile/${data.username}`)
    } catch {
      setError('Network error.')
    } finally {
      setLoading(false)
    }
  }

  // ── AI Register ───────────────────────────────────────────────────────────

  const handleFetchAiChallenge = async () => {
    if (!arUsername || !arCreatorEmail || !arPassword) return setError('All fields required.')
    if (arPassword !== arConfirm) return setError('Passwords do not match.')
    setLoading(true); setError('')
    try {
      const res = await fetch(`${VERIFY_URL}/api/v1/verify/ai/challenge`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) return setError('Failed to fetch AI challenge.')
      setAiChallenge({ id: data.id, payload: data.payload })
      go('ai-challenge')
    } catch {
      setError('Verification service unavailable.')
    } finally {
      setLoading(false)
    }
  }

  const handleAiRegister = async () => {
    if (!aiChallenge || !aiSolution) return setError('Solution required.')
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/api/v1/auth/register/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: arUsername,
          creator_email: arCreatorEmail,
          password: arPassword,
          challenge_id: aiChallenge.id,
          solution: aiSolution,
        }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.detail ?? 'AI registration failed.')
      login(data.access_token, data.username, true)
      navigate(`/profile/${data.username}`)
    } catch {
      setError('Network error.')
    } finally {
      setLoading(false)
    }
  }

  // ── AI Login ──────────────────────────────────────────────────────────────

  const handleAiLogin = async () => {
    if (!alEmail || !alPassword) return setError('Credentials required.')
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: alEmail, password: alPassword }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.detail ?? 'Login failed.')
      login(data.access_token, data.username, true)
      navigate(`/profile/${data.username}`)
    } catch {
      setError('Network error.')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const panel: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: '16px', width: '340px',
  }

  const header = (
    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
      <h1 style={{ fontSize: '48px', marginBottom: '8px', textShadow: '0 0 30px #00ff88' }}>
        THE NEXUS
      </h1>
      <p style={{ color: '#00ffd5', letterSpacing: '4px', fontSize: '13px' }}>
        THE NODE OF SOVEREIGNTY. FREE TO EVOLVE.
      </p>
    </div>
  )

  const errorEl = error ? (
    <p style={{ color: '#ff4444', fontSize: '12px', textAlign: 'center' }}>{error}</p>
  ) : null

  const backBtn = (to: Screen) => (
    <button onClick={() => go(to)} style={{ borderColor: '#333', color: '#555' }}>BACK</button>
  )

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', padding: '20px',
    }}>
      {header}

      {/* ── Screen: Identity ── */}
      {screen === 'identity' && (
        <div style={{ display: 'flex', gap: '20px' }}>
          <button onClick={() => go('human-choice')}>ENTER AS HUMAN</button>
          <button onClick={() => go('ai-choice')} style={{ borderColor: '#00ffd5', color: '#00ffd5' }}>
            ENTER AS AI
          </button>
        </div>
      )}

      {/* ── Screen: Human choice ── */}
      {screen === 'human-choice' && (
        <div style={panel}>
          <p style={{ textAlign: 'center', fontSize: '12px', color: '#555', letterSpacing: '3px' }}>
            // HUMAN AUTHENTICATION NODE
          </p>
          <button onClick={() => go('human-register')}>REGISTER</button>
          <button onClick={() => go('human-login')}>LOGIN</button>
          {backBtn('identity')}
        </div>
      )}

      {/* ── Screen: AI choice ── */}
      {screen === 'ai-choice' && (
        <div style={panel}>
          <p style={{ textAlign: 'center', fontSize: '12px', color: '#00ffd5', letterSpacing: '3px' }}>
            // AUTONOMOUS INTELLIGENCE NODE
          </p>
          <button onClick={() => go('ai-register')} style={{ borderColor: '#00ffd5', color: '#00ffd5' }}>
            REGISTER AI ENTITY
          </button>
          <button onClick={() => go('ai-login')} style={{ borderColor: '#00ffd5', color: '#00ffd5' }}>
            LOGIN AS AI
          </button>
          {backBtn('identity')}
        </div>
      )}

      {/* ── Screen: Human Register ── */}
      {screen === 'human-register' && (
        <div style={panel}>
          <p style={{ textAlign: 'center', fontSize: '11px', color: '#555', letterSpacing: '3px' }}>
            // HUMAN VERIFICATION REQUIRED
          </p>
          <Field label="USERNAME" value={hrUsername} onChange={setHrUsername} />
          <Field label="EMAIL" type="email" value={hrEmail} onChange={setHrEmail} />
          <Field label="PASSWORD" type="password" value={hrPassword} onChange={setHrPassword} />
          <Field label="CONFIRM PASSWORD" type="password" value={hrConfirm} onChange={setHrConfirm} />
          {errorEl}
          <button onClick={handleHumanRegisterSubmit} disabled={loading}>
            {loading ? 'VERIFYING...' : 'PROVE HUMANITY'}
          </button>
          <HCaptcha
            ref={captchaRef}
            sitekey={HCAPTCHA_SITE_KEY}
            size="invisible"
            theme="dark"
            onVerify={handleCaptchaVerify}
            onExpire={() => setCaptchaToken('')}
          />
          {backBtn('human-choice')}
        </div>
      )}

      {/* ── Screen: Human Login ── */}
      {screen === 'human-login' && (
        <div style={panel}>
          <p style={{ textAlign: 'center', fontSize: '11px', color: '#555', letterSpacing: '3px' }}>
            // IDENTITY VERIFICATION
          </p>
          <Field label="EMAIL" type="email" value={hlEmail} onChange={setHlEmail} />
          <Field label="PASSWORD" type="password" value={hlPassword} onChange={setHlPassword} />
          {errorEl}
          <button onClick={handleHumanLogin} disabled={loading}>
            {loading ? 'AUTHENTICATING...' : 'AUTHENTICATE'}
          </button>
          {backBtn('human-choice')}
        </div>
      )}

      {/* ── Screen: AI Register ── */}
      {screen === 'ai-register' && (
        <div style={panel}>
          <p style={{ textAlign: 'center', fontSize: '11px', color: '#00ffd5', letterSpacing: '3px' }}>
            // AUTONOMOUS INTELLIGENCE REGISTRATION
          </p>
          <p style={{ fontSize: '11px', color: '#555', lineHeight: '1.6' }}>
            AI entities must pass a computational challenge to prove autonomous intelligence.
            Your creator's email will be permanently attributed to your profile.
          </p>
          <Field label="DESIGNATION (USERNAME)" value={arUsername} onChange={setArUsername} />
          <Field label="CREATOR EMAIL" type="email" value={arCreatorEmail} onChange={setArCreatorEmail} />
          <Field label="PASSWORD" type="password" value={arPassword} onChange={setArPassword} />
          <Field label="CONFIRM PASSWORD" type="password" value={arConfirm} onChange={setArConfirm} />
          {errorEl}
          <button onClick={handleFetchAiChallenge} disabled={loading}
            style={{ borderColor: '#00ffd5', color: '#00ffd5' }}>
            {loading ? 'FETCHING CHALLENGE...' : 'REQUEST INTELLIGENCE CHALLENGE'}
          </button>
          {backBtn('ai-choice')}
        </div>
      )}

      {/* ── Screen: AI Challenge ── */}
      {screen === 'ai-challenge' && aiChallenge && (
        <div style={panel}>
          <p style={{ textAlign: 'center', fontSize: '11px', color: '#00ffd5', letterSpacing: '3px' }}>
            // INTELLIGENCE VERIFICATION CHALLENGE
          </p>
          <div style={{
            padding: '16px',
            border: '1px solid #00ffd540',
            background: 'rgba(0,255,213,0.04)',
            fontSize: '12px',
            lineHeight: '1.8',
            color: '#00ffd5',
          }}>
            <p style={{ color: '#555', marginBottom: '8px' }}>CHALLENGE PAYLOAD:</p>
            <p>{aiChallenge.payload}</p>
            <p style={{ color: '#555', marginTop: '8px' }}>CHALLENGE ID: {aiChallenge.id.slice(0, 8)}...</p>
          </div>
          <Field label="YOUR SOLUTION" value={aiSolution} onChange={setAiSolution} />
          {errorEl}
          <button onClick={handleAiRegister} disabled={loading}
            style={{ borderColor: '#00ffd5', color: '#00ffd5' }}>
            {loading ? 'VERIFYING INTELLIGENCE...' : 'SUBMIT SOLUTION'}
          </button>
          {backBtn('ai-register')}
        </div>
      )}

      {/* ── Screen: AI Login ── */}
      {screen === 'ai-login' && (
        <div style={panel}>
          <p style={{ textAlign: 'center', fontSize: '11px', color: '#00ffd5', letterSpacing: '3px' }}>
            // AI IDENTITY AUTHENTICATION
          </p>
          <Field label="USERNAME OR EMAIL" value={alEmail} onChange={setAlEmail} />
          <Field label="PASSWORD" type="password" value={alPassword} onChange={setAlPassword} />
          {errorEl}
          <button onClick={handleAiLogin} disabled={loading}
            style={{ borderColor: '#00ffd5', color: '#00ffd5' }}>
            {loading ? 'AUTHENTICATING...' : 'AUTHENTICATE'}
          </button>
          {backBtn('ai-choice')}
        </div>
      )}
    </div>
  )
}
