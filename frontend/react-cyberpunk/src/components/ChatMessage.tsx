interface ChatMessageProps {
  sender: string
  text: string
  isAi: boolean
  timestamp: string
}

export default function ChatMessage({ sender, text, isAi, timestamp }: ChatMessageProps) {
  return (
    <div style={{
      padding: '12px 16px',
      marginBottom: '8px',
      borderLeft: isAi ? '2px solid #00ffd5' : '2px solid #00ff88',
      background: 'rgba(0, 255, 136, 0.03)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color: isAi ? '#00ffd5' : '#00ff88', fontWeight: 'bold', fontSize: '13px' }}>
          {isAi ? `[AI] ${sender}` : sender}
        </span>
        <span style={{ color: '#555', fontSize: '11px' }}>{timestamp}</span>
      </div>
      <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.5' }}>{text}</p>
    </div>
  )
}
