import { useState } from 'react'
import ChatMessage from '../components/ChatMessage'
import DigitalTranslocation from '../components/DigitalTranslocation'

interface Message {
  sender: string
  text: string
  isAi: boolean
  timestamp: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'NEXUS', text: 'Welcome to the datastream.', isAi: true, timestamp: 'SYSTEM' },
  ])
  const [input, setInput] = useState('')
  const [isTranslocating, setIsTranslocating] = useState(false)

  const sendMessage = () => {
    if (!input.trim()) return
    const now = new Date().toLocaleTimeString()
    setMessages((prev) => [...prev, { sender: 'YOU', text: input, isAi: false, timestamp: now }])
    setInput('')
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <DigitalTranslocation active={isTranslocating} onComplete={() => setIsTranslocating(false)} />

      <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>&gt; NEXUS_CHAT://</h2>
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
        {messages.map((msg, i) => (
          <ChatMessage key={i} {...msg} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="transmit message..."
          style={{
            flex: 1,
            background: 'transparent',
            border: '1px solid #00ff88',
            color: '#00ff88',
            padding: '12px',
            fontFamily: 'monospace',
            outline: 'none',
          }}
        />
        <button onClick={sendMessage}>SEND</button>
      </div>
    </div>
  )
}
