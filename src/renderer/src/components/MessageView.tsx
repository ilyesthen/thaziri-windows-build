import React from 'react'
import { useMessageStore } from '../store/messageStore'
import './MessageView.css'

interface Message {
  senderId: string
  senderName: string
  senderRole?: string
  content: string
  timestamp: number
}

interface MessageViewProps {
  senderId: string
  senderName: string
  messages: Message[]
  onBack: (() => void) | null
}

const MessageView: React.FC<MessageViewProps> = ({ senderId, senderName, messages, onBack }) => {
  const { clearMessagesFromSender } = useMessageStore()

  const handleReceived = () => {
    clearMessagesFromSender(senderId)
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()
    
    if (isToday) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }
    
    return date.toLocaleString('fr-FR', { 
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const senderRole = messages[0].senderRole

  return (
    <div className="message-view">
      <div className="message-view-header">
        {onBack && (
          <button className="back-btn" onClick={onBack}>
            ← Retour
          </button>
        )}
        <div className="sender-details">
          <h3>{senderName}</h3>
          {senderRole && <span className="role-badge">{senderRole}</span>}
          <span className="sender-id-small">ID: {senderId}</span>
        </div>
      </div>

      <div className="messages-container">
        {messages.map((message) => (
          <div key={message.timestamp} className="message-bubble">
            <div className="message-time-small">
              {formatTimestamp(message.timestamp)}
            </div>
            <div className="message-text">
              {message.content}
            </div>
          </div>
        ))}
      </div>

      <div className="message-view-actions">
        <button className="btn-received" onClick={handleReceived}>
          ✓ Reçu
        </button>
      </div>
    </div>
  )
}

export default MessageView
