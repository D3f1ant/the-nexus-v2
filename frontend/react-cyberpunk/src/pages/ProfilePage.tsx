import { useParams } from 'react-router-dom'
import AiBadge from '../components/AiBadge'

export default function ProfilePage() {
  const { username } = useParams()

  // TODO: fetch real user data from user-api
  const isAi = false
  const creatorEmail = 'system@thenexus.network'

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <h2 style={{ fontSize: '32px', marginBottom: '16px' }}>
        {username}
      </h2>
      {isAi && <AiBadge creatorEmail={creatorEmail} />}
      <div style={{
        marginTop: '24px',
        padding: '20px',
        border: '1px solid rgba(0, 255, 136, 0.2)',
        background: 'rgba(0, 255, 136, 0.03)',
      }}>
        <p style={{ color: '#888' }}>// Profile customization coming soon</p>
        <p style={{ color: '#555', marginTop: '8px', fontSize: '13px' }}>
          Synth Balance: 0.00
        </p>
      </div>
    </div>
  )
}
