import React, { useState, useEffect } from 'react'
import './SendMessageModal.css'
import { NetworkUser } from '../../../preload'
import { useAuthStore } from '../store/authStore'
import TemplateManager from './TemplateManager'

interface SendMessageModalProps {
  isOpen: boolean
  onClose: () => void
  patientContext?: {
    patientName?: string
    patientId?: string
  }
}

const SendMessageModal: React.FC<SendMessageModalProps> = ({ isOpen, onClose, patientContext }) => {
  const { user, getLastRecipient, setLastRecipient } = useAuthStore()
  
  const [activeUsers, setActiveUsers] = useState<NetworkUser[]>([])
  const [selectedRecipient, setSelectedRecipient] = useState<string>('')
  const [messageContent, setMessageContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadActiveUsers()
      
      // Set up listener for network user updates
      const cleanup = window.electronAPI.network.onUsersUpdate((users) => {
        // Filter out current user
        const otherUsers = users.filter(u => u.userId !== user?.id)
        setActiveUsers(otherUsers)
        
        // Update selected recipient if needed
        updateSelectedRecipient(otherUsers)
      })

      return () => {
        cleanup()
      }
    } else {
      // Cleanup recording when modal closes
      stopRecording()
    }
  }, [isOpen, user?.id])

  const loadActiveUsers = async () => {
    try {
      const users = await window.electronAPI.network.getActiveUsers()
      // Filter out current user
      const otherUsers = users.filter(u => u.userId !== user?.id)
      setActiveUsers(otherUsers)
      
      // Set default recipient based on last used
      updateSelectedRecipient(otherUsers)
    } catch (error) {
      console.error('Failed to load active users:', error)
    }
  }

  const updateSelectedRecipient = (users: NetworkUser[]) => {
    if (!user) return
    
    // Get last recipient for this user
    const lastRecipientId = getLastRecipient(user.id)
    
    if (lastRecipientId) {
      // Check if last recipient is still online
      const isOnline = users.some(u => u.userId.toString() === lastRecipientId)
      if (isOnline) {
        setSelectedRecipient(lastRecipientId)
      } else if (users.length > 0 && !selectedRecipient) {
        // Last recipient offline, select first available if none selected
        setSelectedRecipient(users[0].userId.toString())
      }
    } else if (users.length > 0 && !selectedRecipient) {
      // No last recipient, select first available
      setSelectedRecipient(users[0].userId.toString())
    }
  }

  const handleRecipientChange = (recipientId: string) => {
    setSelectedRecipient(recipientId)
    // Save as last recipient for this user
    if (user) {
      setLastRecipient(user.id, recipientId)
    }
  }

  const handleTemplateClick = (templateContent: string) => {
    // Append template to message content
    setMessageContent(prev => prev ? `${prev}\n${templateContent}` : templateContent)
  }

  const handleSend = async () => {
    if (!selectedRecipient) {
      alert('Veuillez sélectionner un destinataire')
      return
    }

    if (!messageContent.trim()) {
      alert('Veuillez entrer un message')
      return
    }

    const recipient = activeUsers.find(u => u.userId.toString() === selectedRecipient)
    if (!recipient) {
      alert('Destinataire non trouvé')
      return
    }

    setIsSending(true)
    try {
      // Add patient context to message if available
      let fullMessage = messageContent
      if (patientContext?.patientName) {
        fullMessage = `[Patient: ${patientContext.patientName}] ${messageContent}`
      }

      const result = await window.electronAPI.messaging.send({
        recipientIp: recipient.ipAddress,
        recipientPort: recipient.messagingPort,
        content: fullMessage,
        senderId: user?.id.toString() || '0',
        senderName: user?.name || 'Unknown',
        senderRole: user?.role
      })

      if (result.success) {
        alert('Message envoyé avec succès!')
        setMessageContent('')
        onClose()
      } else {
        alert(`Échec de l'envoi du message: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      alert('Échec de l\'envoi du message')
    } finally {
      setIsSending(false)
    }
  }

  const handleClose = () => {
    setMessageContent('')
    setSelectedRecipient('')
    stopRecording()
    onClose()
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' })
        
        // Convert blob to base64 for sending
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64Audio = reader.result as string
          setMessageContent(`[Message vocal - ${recordingTime}s]\n${base64Audio}`)
        }
        reader.readAsDataURL(audioBlob)

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      setRecordingInterval(interval)
    } catch (error) {
      console.error('Failed to start recording:', error)
      alert('Impossible d\'accéder au microphone. Vérifiez les permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
      if (recordingInterval) {
        clearInterval(recordingInterval)
        setRecordingInterval(null)
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="send-message-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📨 Envoyer un message</h2>
          <button className="close-btn" onClick={handleClose}>✖</button>
        </div>

        <div className="modal-body-two-column">
          {/* Left Panel: Message Form */}
          <div className="left-panel">
            <div className="form-section">
              <label htmlFor="recipient">Destinataire</label>
              <select
                id="recipient"
                value={selectedRecipient}
                onChange={(e) => handleRecipientChange(e.target.value)}
                className="form-select"
              >
                <option value="">Sélectionner un destinataire...</option>
                {activeUsers.map((u) => (
                  <option key={u.userId} value={u.userId.toString()}>
                    {u.username} ({u.role}) - {u.ipAddress}
                  </option>
                ))}
              </select>
              {activeUsers.length === 0 && (
                <p className="no-users-notice">Aucun utilisateur en ligne</p>
              )}
            </div>

            <div className="form-section">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                className="form-textarea"
                placeholder="Entrez votre message ici..."
                rows={10}
              />
            </div>

            <div className="form-actions">
              <button 
                className="btn-cancel" 
                onClick={handleClose}
                disabled={isSending}
              >
                Annuler
              </button>
              {isRecording ? (
                <button 
                  className="btn-recording" 
                  onClick={stopRecording}
                  style={{ 
                    backgroundColor: '#f44336',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }}
                >
                  🛑 Arrêter ({formatTime(recordingTime)})
                </button>
              ) : (
                <>
                  <button 
                    className="btn-record" 
                    onClick={startRecording}
                    disabled={isSending || !selectedRecipient}
                    title="Enregistrer un message vocal"
                  >
                    🎤 Vocal
                  </button>
                  <button 
                    className="btn-send" 
                    onClick={handleSend}
                    disabled={isSending || !selectedRecipient || !messageContent.trim()}
                  >
                    {isSending ? 'Envoi...' : 'Envoyer'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Panel: Template Manager */}
          <div className="right-panel" style={{ background: '#e8f5e9' }}>
            <TemplateManager onTemplateClick={handleTemplateClick} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SendMessageModal
