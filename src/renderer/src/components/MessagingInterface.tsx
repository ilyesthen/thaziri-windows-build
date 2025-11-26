import React, { useState, useEffect } from 'react'
import './MessagingInterface.css'
import { NetworkUser, Message } from '../../../preload'
import ComposeMessageModal from './ComposeMessageModal'

const MessagingInterface: React.FC = () => {
  const [activeUsers, setActiveUsers] = useState<NetworkUser[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false)

  useEffect(() => {
    // Load active users
    loadActiveUsers()

    // Set up listener for network user updates
    const cleanup = window.electronAPI.network.onUsersUpdate((users) => {
      setActiveUsers(users)
    })

    // Set up listener for new messages
    const cleanupMessages = window.electronAPI.messaging.onNewMessage((message) => {
      setMessages(prev => [...prev, message])
    })

    return () => {
      cleanup()
      cleanupMessages()
    }
  }, [])

  const loadActiveUsers = async () => {
    try {
      const users = await window.electronAPI.network.getActiveUsers()
      setActiveUsers(users)
    } catch (error) {
      console.error('Failed to load active users:', error)
    }
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

  return (
    <div className="messaging-interface">
      <div className="messaging-header">
        <h1>Messagerie</h1>
        <button
          className="btn-new-message"
          onClick={() => setIsComposeModalOpen(true)}
        >
          + Nouveau Message
        </button>
      </div>

      <div className="messaging-content">
        {/* Active Users Panel */}
        <div className="active-users-panel">
          <h2>Utilisateurs en ligne ({activeUsers.length})</h2>
          <div className="users-list">
            {activeUsers.length === 0 ? (
              <p className="no-users">Aucun utilisateur en ligne</p>
            ) : (
              activeUsers.map((user) => (
                <div key={user.userId} className="user-item">
                  <div className="user-status-indicator"></div>
                  <div className="user-info">
                    <div className="user-name">{user.username}</div>
                    <div className="user-role">{user.role}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Message History Panel */}
        <div className="message-history-panel">
          <h2>Historique des messages</h2>
          <div className="messages-list">
            {messages.length === 0 ? (
              <div className="no-messages">
                <p>Aucun message pour le moment</p>
                <p className="hint">Cliquez sur "Nouveau Message" pour commencer</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={index} className="message-item">
                  <div className="message-header">
                    <span className="message-sender">{message.senderName}</span>
                    <span className="message-time">{formatTimestamp(message.timestamp)}</span>
                  </div>
                  <div className="message-content">
                    {message.isVoiceMessage && message.audioData ? (
                      <div className="voice-message">
                        <span className="voice-message-icon">🎤</span>
                        <audio controls src={message.audioData} />
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Compose Message Modal */}
      <ComposeMessageModal
        isOpen={isComposeModalOpen}
        onClose={() => setIsComposeModalOpen(false)}
        activeUsers={activeUsers}
      />
    </div>
  )
}

export default MessagingInterface
