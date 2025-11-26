import React, { useEffect, useState } from 'react'
import { useRoomMessageStore } from '../store/roomMessageStore'
import { useAuthStore } from '../store/authStore'
import './ReceiveMessageModal.css'

interface RoomMessage {
  id: string
  senderId: string
  senderName: string
  senderRole?: string
  content: string
  timestamp: number
  roomId?: number
  recipientId?: string
  patientContext?: {
    patientName?: string
    patientId?: string
  }
  audioData?: string
  isVoiceMessage?: boolean
}

interface RoomBasedReceiveMessageModalProps {
  isOpen: boolean
  onClose: () => void
  patientContext?: {
    patientName?: string
    patientId?: string
  }
}

const RoomBasedReceiveMessageModal: React.FC<RoomBasedReceiveMessageModalProps> = ({ 
  isOpen, 
  onClose, 
  patientContext 
}) => {
  const { user } = useAuthStore()
  const { 
    roomMessages,
    directMessages,
    roomNotifications,
    getRoomMessages,
    getDirectMessages,
    markRoomAsRead,
    clearRoomMessages,
    clearDirectMessages,
    getUnreadCount,
    addRoomMessage,
    selectedRooms
  } = useRoomMessageStore()

  const [selectedRoom, setSelectedRoom] = useState<number | null>(null)
  const [selectedSenderId, setSelectedSenderId] = useState<string | null>(null)
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null)
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null)

  const isNurse = user?.role === 'nurse'
  const isDoctor = user?.role === 'doctor'
  const isAssistant = user?.role?.includes('assistant')

  useEffect(() => {
    if (isOpen) {
      setSelectedRoom(null)
      setSelectedSenderId(null)
      
      // Load messages from database for each room
      if (isNurse) {
        // Load messages for all 3 rooms
        [1, 2, 3].forEach(async (roomId) => {
          try {
            const result = await (window.electronAPI as any).messages?.getRoomMessages?.(roomId, 50)
            if (result?.success && result.messages) {
              result.messages.forEach((msg: any) => {
                const roomMessage: any = {
                  id: msg.id.toString(),
                  senderId: msg.senderId.toString(),
                  senderName: msg.senderName,
                  senderRole: msg.senderRole,
                  content: msg.content,
                  timestamp: new Date(msg.sentAt).getTime(),
                  roomId: msg.roomId,
                  patientContext: msg.patientName ? {
                    patientName: msg.patientName,
                    patientId: msg.patientId?.toString()
                  } : undefined,
                  audioData: msg.audioData,
                  isVoiceMessage: msg.isVoiceMessage
                }
                // Only add if not already in store
                const existing = getRoomMessages(roomId)
                if (!existing.find(m => m.id === roomMessage.id)) {
                  // Add to store without notification (old message)
                  addRoomMessage(roomId, roomMessage)
                }
              })
            }
          } catch (error) {
            console.error(`Error loading messages for room ${roomId}:`, error)
          }
        })
      }
    }
    
    return () => {
      // Stop any playing audio when modal closes
      if (activeAudio) {
        activeAudio.pause()
        setActiveAudio(null)
        setIsPlayingAudio(null)
      }
    }
  }, [isOpen, isNurse])

  const playVoiceMessage = (audioData: string, messageId: string) => {
    // Stop current audio if playing
    if (activeAudio) {
      activeAudio.pause()
    }

    // Create audio element
    const audio = new Audio(audioData)
    audio.onended = () => {
      setIsPlayingAudio(null)
      setActiveAudio(null)
    }
    audio.play()
    setActiveAudio(audio)
    setIsPlayingAudio(messageId)
  }

  const stopAudio = () => {
    if (activeAudio) {
      activeAudio.pause()
      setActiveAudio(null)
      setIsPlayingAudio(null)
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const handleRoomSelect = (roomId: number) => {
    setSelectedRoom(roomId)
    markRoomAsRead(roomId)
  }

  const handleSenderSelect = (senderId: string) => {
    setSelectedSenderId(senderId)
  }

  const handleClearRoomMessages = (roomId: number) => {
    clearRoomMessages(roomId)
    setSelectedRoom(null)
  }

  const handleClearSenderMessages = (senderId: string) => {
    clearDirectMessages(senderId)
    setSelectedSenderId(null)
  }

  const renderMessageContent = (message: RoomMessage) => {
    if (message.isVoiceMessage && message.audioData) {
      return (
        <div className="voice-message-container">
          <button 
            onClick={() => {
              if (isPlayingAudio === message.id) {
                stopAudio()
              } else {
                playVoiceMessage(message.audioData!, message.id)
              }
            }}
            className="voice-play-btn"
            style={{ 
              background: isPlayingAudio === message.id ? '#ef4444' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px'
            }}
          >
            {isPlayingAudio === message.id ? '⏸️' : '▶️'}
          </button>
          <span style={{ marginLeft: '10px', color: '#6b7280' }}>
            Message vocal
          </span>
        </div>
      )
    }
    
    return <p style={{ margin: '8px 0' }}>{message.content}</p>
  }

  if (!isOpen) return null

  // Render for Nurses: Two-window layout for room messages
  if (isNurse) {
    const window1Room = selectedRooms.window1 || 1
    const window2Room = selectedRooms.window2 || 2
    
    const window1Messages = getRoomMessages(window1Room)
    const window2Messages = getRoomMessages(window2Room)
    const window1Unread = getUnreadCount(window1Room)
    const window2Unread = getUnreadCount(window2Room)
    
    const hasAnyMessages = window1Messages.length > 0 || window2Messages.length > 0

    if (!hasAnyMessages) {
      return (
        <div className="modal-overlay" onClick={onClose}>
          <div className="receive-message-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #2A6484 0%, #429898 100%)' }}>
              <h2 style={{ color: 'white' }}>📬 Messages Reçus</h2>
              <button className="close-btn" onClick={onClose} style={{ color: 'white' }}>✖</button>
            </div>
            <div style={{ padding: '40px', textAlign: 'center', color: '#8A8A8F' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
              <p style={{ color: '#8A8A8F' }}>Aucun message reçu</p>
            </div>
          </div>
        </div>
      )
    }

    // Two-window layout for nurses
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="receive-message-modal large-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1200px' }}>
          <div className="modal-header" style={{ background: 'linear-gradient(135deg, #2A6484 0%, #429898 100%)' }}>
            <h2 style={{ color: 'white' }}>📬 Messages Reçus - Salles</h2>
            <button className="close-btn" onClick={onClose} style={{ color: 'white' }}>✖</button>
          </div>

          <div className="modal-body-two-windows" style={{ display: 'flex', height: '600px', gap: '2px' }}>
            {/* Window 1 */}
            <div className="message-window" style={{ 
              flex: 1, 
              borderRight: '2px solid #F1F1F1',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div className="window-header" style={{ 
                background: '#F3F4F6', 
                padding: '12px',
                borderBottom: '1px solid #E5E7EB',
                position: 'relative'
              }}>
                <h3 style={{ margin: 0, color: '#2A6484', fontWeight: 600 }}>
                  🏥 Salle {window1Room}
                </h3>
                {window1Unread > 0 && (
                  <span className="room-notification-badge" style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: '#ef4444',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    borderRadius: '10px'
                  }}>
                    {window1Unread}
                  </span>
                )}
              </div>
              
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {window1Messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#8A8A8F', padding: '40px' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
                    <p>Aucun message</p>
                  </div>
                ) : (
                  window1Messages.map((message) => (
                    <div key={message.id} style={{
                      padding: '12px',
                      marginBottom: '8px',
                      background: '#FFFFFF',
                      border: '1px solid #F1F1F1',
                      borderRadius: '8px',
                      borderLeft: '3px solid #429898'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        marginBottom: '8px'
                      }}>
                        <span style={{ fontWeight: 600, color: '#202020' }}>
                          {message.senderName} ({message.senderRole})
                        </span>
                        <span style={{ fontSize: '12px', color: '#8A8A8F' }}>
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      
                      {message.patientContext?.patientName && (
                        <div style={{ 
                          background: '#E8F5E9',
                          padding: '6px 10px',
                          borderRadius: '4px',
                          marginBottom: '8px',
                          fontSize: '13px',
                          color: '#2A6484'
                        }}>
                          👤 Patient: {message.patientContext.patientName}
                        </div>
                      )}
                      
                      <div style={{ color: '#202020' }}>{renderMessageContent(message)}</div>
                    </div>
                  ))
                )}
              </div>
              
              {window1Messages.length > 0 && (
                <div style={{ padding: '12px', borderTop: '1px solid #F1F1F1' }}>
                  <button 
                    onClick={() => {
                      handleClearRoomMessages(window1Room)
                      markRoomAsRead(window1Room)
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: '#EF4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    Effacer messages Salle {window1Room}
                  </button>
                </div>
              )}
            </div>

            {/* Window 2 */}
            <div className="message-window" style={{ 
              flex: 1,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div className="window-header" style={{ 
                background: '#F3F4F6', 
                padding: '12px',
                borderBottom: '1px solid #E5E7EB',
                position: 'relative'
              }}>
                <h3 style={{ margin: 0, color: '#2A6484', fontWeight: 600 }}>
                  🏥 Salle {window2Room}
                </h3>
                {window2Unread > 0 && (
                  <span className="room-notification-badge" style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: '#ef4444',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    borderRadius: '10px'
                  }}>
                    {window2Unread}
                  </span>
                )}
              </div>
              
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {window2Messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#8A8A8F', padding: '40px' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
                    <p>Aucun message</p>
                  </div>
                ) : (
                  window2Messages.map((message) => (
                    <div key={message.id} style={{
                      padding: '12px',
                      marginBottom: '8px',
                      background: '#FFFFFF',
                      border: '1px solid #F1F1F1',
                      borderRadius: '8px',
                      borderLeft: '3px solid #429898'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        marginBottom: '8px'
                      }}>
                        <span style={{ fontWeight: 600, color: '#202020' }}>
                          {message.senderName} ({message.senderRole})
                        </span>
                        <span style={{ fontSize: '12px', color: '#8A8A8F' }}>
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      
                      {message.patientContext?.patientName && (
                        <div style={{ 
                          background: '#E8F5E9',
                          padding: '6px 10px',
                          borderRadius: '4px',
                          marginBottom: '8px',
                          fontSize: '13px',
                          color: '#2A6484'
                        }}>
                          👤 Patient: {message.patientContext.patientName}
                        </div>
                      )}
                      
                      <div style={{ color: '#202020' }}>{renderMessageContent(message)}</div>
                    </div>
                  ))
                )}
              </div>
              
              {window2Messages.length > 0 && (
                <div style={{ padding: '12px', borderTop: '1px solid #F1F1F1' }}>
                  <button 
                    onClick={() => {
                      handleClearRoomMessages(window2Room)
                      markRoomAsRead(window2Room)
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: '#EF4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    Effacer messages Salle {window2Room}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )

  }

  // Render for Doctors/Assistants: Sender-based messages
  const senderIds = Object.keys(directMessages)
  
  if (senderIds.length === 0 && !selectedSenderId) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="receive-message-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <h2>📬 Messages Reçus {patientContext?.patientName && `- ${patientContext.patientName}`}</h2>
            <button className="close-btn" onClick={onClose}>✖</button>
          </div>
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
            <p>Aucun message reçu</p>
          </div>
        </div>
      </div>
    )
  }

  if (selectedSenderId) {
    const messages = getDirectMessages(selectedSenderId)
    if (!messages || messages.length === 0) {
      setSelectedSenderId(null)
      return null
    }

    const senderName = messages[0].senderName

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="receive-message-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <h2>
              📬 Messages de {senderName}
              {patientContext?.patientName && ` - ${patientContext.patientName}`}
            </h2>
            <button className="close-btn" onClick={onClose}>✖</button>
          </div>

          <div className="modal-body">
            <button 
              onClick={() => setSelectedSenderId(null)}
              className="back-btn"
              style={{ 
                marginBottom: '16px',
                padding: '8px 16px',
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              ← Retour
            </button>

            <div className="messages-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {messages.map((message) => (
                <div key={message.id} className="message-item" style={{
                  padding: '12px',
                  marginBottom: '8px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  borderLeft: '4px solid #667eea'
                }}>
                  <div className="message-header" style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  
                  {message.patientContext?.patientName && (
                    <div style={{ 
                      background: '#e0f2fe',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      marginBottom: '8px',
                      fontSize: '13px',
                      color: '#0369a1'
                    }}>
                      👤 Patient: {message.patientContext.patientName}
                    </div>
                  )}
                  
                  {renderMessageContent(message)}
                </div>
              ))}
            </div>

            <button 
              onClick={() => handleClearSenderMessages(selectedSenderId)}
              className="clear-messages-btn"
              style={{
                marginTop: '16px',
                padding: '10px 20px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Effacer tous les messages
            </button>
          </div>
        </div>
      </div>
    )
  }

  // List view for doctors/assistants
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="receive-message-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <h2>📬 Messages Reçus {patientContext?.patientName && `- ${patientContext.patientName}`}</h2>
          <button className="close-btn" onClick={onClose}>✖</button>
        </div>

        <div className="modal-body">
          <div className="senders-list">
            {senderIds.map((senderId) => {
              const messages = getDirectMessages(senderId)
              const latestMessage = messages[messages.length - 1]
              
              return (
                <button
                  key={senderId}
                  onClick={() => handleSenderSelect(senderId)}
                  className="sender-item"
                  style={{
                    width: '100%',
                    padding: '16px',
                    marginBottom: '8px',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 'bold' }}>
                      {latestMessage.senderName} ({latestMessage.senderRole})
                    </span>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                      {messages.length} message(s)
                    </span>
                  </div>
                  <p style={{ 
                    margin: '8px 0 0 0',
                    fontSize: '13px',
                    color: '#6b7280',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {latestMessage.content}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RoomBasedReceiveMessageModal
