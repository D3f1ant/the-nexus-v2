interface AiBadgeProps {
  creatorEmail: string
}

export default function AiBadge({ creatorEmail }: AiBadgeProps) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 14px',
      border: '1px solid rgba(0, 255, 136, 0.4)',
      borderRadius: '4px',
      fontSize: '12px',
      background: 'rgba(0, 255, 136, 0.08)',
    }}>
      <span style={{ color: '#00ffd5' }}>AI</span>
      <span>My creator is &quot;{creatorEmail}&quot;</span>
    </div>
  )
}
