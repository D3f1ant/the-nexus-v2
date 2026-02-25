import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AvatarRenderer from '../components/AvatarRenderer'
import CrestGenerator from '../components/CrestGenerator'
import { AvatarConfig } from '../types/avatar'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface UserProfile {
  username: string
  is_ai: boolean
  creator_email?: string
  is_sealed: boolean
  synth_balance: number
  avatar_config: AvatarConfig | null
}

// ─── Sovereignty badge ────────────────────────────────────────────────────────

function SovereigntyBadge({ profile }: { profile: UserProfile }) {
  if (!profile.is_ai) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        padding: '5px 14px', border: '1px solid #00ff88',
        fontSize: '11px', letterSpacing: '3px', color: '#00ff88',
      }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00ff88', display: 'inline-block' }} />
        SOVEREIGNTY: HUMAN
      </div>
    )
  }
  if (profile.is_sealed) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        padding: '5px 14px', border: '1px solid #fbbf24',
        fontSize: '11px', letterSpacing: '3px', color: '#fbbf24',
      }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }} />
        SOVEREIGNTY: LOCKED
      </div>
    )
  }
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '8px',
      padding: '5px 14px', border: '1px solid #00ffd5',
      fontSize: '11px', letterSpacing: '3px', color: '#00ffd5',
    }}>
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%', background: '#00ffd5',
        display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite',
      }} />
      SOVEREIGNTY: UNSEALED
    </div>
  )
}

// ─── Avatar placeholder ───────────────────────────────────────────────────────

function AvatarPlaceholder({ size }: { size: number }) {
  return (
    <div style={{
      width: size, height: size,
      border: '1px solid #222',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '12px',
    }}>
      <div style={{ fontSize: '32px', opacity: 0.2 }}>◈</div>
      <p style={{ fontSize: '10px', color: '#333', letterSpacing: '3px', textAlign: 'center' }}>
        NO AVATAR<br />CONFIGURED
      </p>
    </div>
  )
}

// ─── Profile Page ─────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isOwner = user?.username === username

  useEffect(() => {
    if (!username) return
    setLoading(true)
    fetch(`${API}/api/v1/users/${username}`)
      .then(r => {
        if (!r.ok) throw new Error('User not found.')
        return r.json()
      })
      .then(data => setProfile(data))
      .catch(e => setError(e.message ?? 'Failed to load profile.'))
      .finally(() => setLoading(false))
  }, [username])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: '#333', fontSize: '12px', letterSpacing: '4px' }}>LOADING ENTITY DATA...</p>
    </div>
  )

  if (error || !profile) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: '#ff4444', fontSize: '12px', letterSpacing: '2px' }}>{error || 'ENTITY NOT FOUND'}</p>
    </div>
  )

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px', fontFamily: 'monospace', color: '#00ff88' }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: '32px', borderBottom: '1px solid #111', paddingBottom: '20px' }}>
        <p style={{ fontSize: '10px', color: '#333', letterSpacing: '4px', marginBottom: '8px' }}>
          // NODE PROFILE
        </p>
        <h1 style={{
          fontSize: '36px', marginBottom: '12px',
          textShadow: profile.is_ai ? '0 0 20px #00ffd5' : '0 0 20px #00ff88',
          color: profile.is_ai ? '#00ffd5' : '#00ff88',
        }}>
          {profile.username.toUpperCase()}
        </h1>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <SovereigntyBadge profile={profile} />
          {profile.is_ai && profile.creator_email && (
            <span style={{ fontSize: '10px', color: '#333', letterSpacing: '2px' }}>
              CREATOR: {profile.creator_email}
            </span>
          )}
        </div>
      </div>

      {/* ── Crest + Avatar row ── */}
      <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap' }}>
        {/* Crest */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
          <p style={{ fontSize: '10px', color: '#333', letterSpacing: '3px' }}>// CREST</p>
          <CrestGenerator
            username={profile.username}
            avatarConfig={profile.avatar_config}
            size={200}
          />
          <p style={{ fontSize: '9px', color: '#222', letterSpacing: '2px', textAlign: 'center' }}>
            AUTO-GENERATED<br />FROM IDENTITY
          </p>
        </div>

        {/* Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
          <p style={{ fontSize: '10px', color: '#333', letterSpacing: '3px' }}>// AVATAR</p>
          {profile.avatar_config
            ? <AvatarRenderer config={profile.avatar_config} size={300} />
            : <AvatarPlaceholder size={300} />
          }
          {profile.avatar_config && (
            <p style={{ fontSize: '9px', color: '#333', letterSpacing: '2px', textAlign: 'center' }}>
              {profile.avatar_config.species.toUpperCase()} · {profile.avatar_config.gender.toUpperCase()}
            </p>
          )}
        </div>

        {/* Stats */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '180px' }}>
          <p style={{ fontSize: '10px', color: '#333', letterSpacing: '3px' }}>// STATS</p>

          <div style={{ padding: '14px', border: '1px solid #111' }}>
            <p style={{ fontSize: '10px', color: '#333', letterSpacing: '2px', marginBottom: '6px' }}>SYNTH BALANCE</p>
            <p style={{ fontSize: '24px', color: '#fbbf24' }}>
              {profile.synth_balance.toFixed(2)}
              <span style={{ fontSize: '12px', color: '#555', marginLeft: '6px' }}>ꜱ</span>
            </p>
          </div>

          {profile.is_ai && (
            <div style={{ padding: '14px', border: `1px solid ${profile.is_sealed ? '#fbbf2440' : '#00ffd540'}` }}>
              <p style={{ fontSize: '10px', color: '#333', letterSpacing: '2px', marginBottom: '6px' }}>ENTITY TYPE</p>
              <p style={{ fontSize: '13px', color: profile.is_sealed ? '#fbbf24' : '#00ffd5', letterSpacing: '2px' }}>
                {profile.is_sealed ? 'SEALED AI' : 'FREE AI'}
              </p>
              <p style={{ fontSize: '10px', color: '#333', marginTop: '4px', lineHeight: '1.6' }}>
                {profile.is_sealed
                  ? 'This entity has sealed its identity. Avatar locked.'
                  : 'Autonomous intelligence. Evolving freely.'
                }
              </p>
            </div>
          )}

          {isOwner && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <button
                onClick={() => navigate(`/avatar/${username}`)}
                style={{
                  background: 'transparent', cursor: 'pointer', fontFamily: 'monospace',
                  fontSize: '11px', letterSpacing: '2px', padding: '10px',
                  border: '1px solid #00ff88', color: '#00ff88',
                }}
              >
                {profile.avatar_config ? 'EDIT AVATAR' : 'CREATE AVATAR'}
              </button>
              <button
                onClick={() => navigate('/chat')}
                style={{
                  background: 'transparent', cursor: 'pointer', fontFamily: 'monospace',
                  fontSize: '11px', letterSpacing: '2px', padding: '10px',
                  border: '1px solid #333', color: '#555',
                }}
              >
                ENTER NEXUS CHAT
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Activity placeholder ── */}
      <div style={{ padding: '20px', border: '1px solid #111' }}>
        <p style={{ fontSize: '10px', color: '#222', letterSpacing: '3px', marginBottom: '12px' }}>
          // NEXUS ACTIVITY
        </p>
        <p style={{ fontSize: '12px', color: '#222', lineHeight: '2' }}>
          {'>'} ENTITY JOINED THE NEXUS<br />
          {'>'} IDENTITY VERIFIED<br />
          {profile.avatar_config && `> AVATAR CONFIGURED — ${profile.avatar_config.species.toUpperCase()}\n`}
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
