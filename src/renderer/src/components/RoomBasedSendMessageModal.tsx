import React, { useState, useEffect } from 'react'
import './SendMessageModal.css'
import { NetworkUser } from '../../../preload'
import { useAuthStore } from '../store/authStore'
import { useRoomMessageStore } from '../store/roomMessageStore'
import TemplateManager from './TemplateManager'

interface RoomBasedSendMessageModalProps {
  isOpen: boolean
  onClose: () => void
  patientContext?: {
    patientName?: string
    patientId?: string
  }
}

const RoomBasedSendMessageModal: React.FC<RoomBasedSendMessageModalProps> = ({ 
  isOpen, 
  onClose, 
  patientContext 
}) => {
  const { user } = useAuthStore()
  const { 
    selectedRooms, 
    selectedNurse, 
    setSelectedRooms, 
    setSelectedNurse 
  } = useRoomMessageStore()
  
  const [activeUsers, setActiveUsers] = useState<NetworkUser[]>([])
  const [nurses, setNurses] = useState<NetworkUser[]>([])
  
  // For nurses: room selection
  const [room1Selection, setRoom1Selection] = useState<number>(selectedRooms.window1 || 1)
  const [room2Selection, setRoom2Selection] = useState<number>(selectedRooms.window2 || 2)
  const [messageWindow1, setMessageWindow1] = useState('')
  const [messageWindow2, setMessageWindow2] = useState('')
  
  // For doctors/assistants: nurse selection
  const [selectedNurseId, setSelectedNurseId] = useState<string>(selectedNurse || '')
  const [messageContent, setMessageContent] = useState('')
  
  const [isSending, setIsSending] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null)
  const [activeRecordingWindow, setActiveRecordingWindow] = useState<number | null>(null)
  const [lastFocusedWindow, setLastFocusedWindow] = useState<1 | 2>(1)
  const [audioDataWindow1, setAudioDataWindow1] = useState<string | null>(null)
  const [audioDataWindow2, setAudioDataWindow2] = useState<string | null>(null)
  const [audioDataContent, setAudioDataContent] = useState<string | null>(null)

  const isNurse = user?.role === 'nurse'
  const isDoctor = user?.role === 'doctor' 
  const isAssistant = user?.role?.includes('assistant')

  useEffect(() => {
    if (isOpen) {
      loadActiveUsers()
      
      // Load saved selections
      if (isNurse) {
        setRoom1Selection(selectedRooms.window1 || 1)
        setRoom2Selection(selectedRooms.window2 || 2)
      } else {
        setSelectedNurseId(selectedNurse || '')
      }
      
      // Set up listener for network user updates
      const cleanup = window.electronAPI.network.onUsersUpdate((users) => {
        setActiveUsers(users)
        
        // Filter nurses for doctor/assistant view
        const nurseUsers = users.filter(u => u.role === 'nurse')
        setNurses(nurseUsers)
        
        // Auto-select if only one nurse
        if (!isNurse && nurseUsers.length === 1 && !selectedNurseId) {
          const nurseId = nurseUsers[0].userId.toString()
          setSelectedNurseId(nurseId)
          setSelectedNurse(nurseId)
        }
      })

      return () => {
        cleanup()
      }
    } else {
      // Cleanup recording when modal closes
      stopRecording()
    }
  }, [isOpen, user?.id, isNurse, selectedRooms, selectedNurse])

  const loadActiveUsers = async () => {
    try {
      const users = await window.electronAPI.network.getActiveUsers()
      setActiveUsers(users)
      
      // Filter nurses for doctor/assistant view
      const nurseUsers = users.filter(u => u.role === 'nurse')
      setNurses(nurseUsers)
      
      // Auto-select if only one nurse
      if (!isNurse && nurseUsers.length === 1 && !selectedNurseId) {
        const nurseId = nurseUsers[0].userId.toString()
        setSelectedNurseId(nurseId)
        setSelectedNurse(nurseId)
      }
    } catch (error) {
      console.error('Failed to load active users:', error)
    }
  }

  const handleRoomSelectionChange = (window: 1 | 2, roomId: number) => {
    if (window === 1) {
      setRoom1Selection(roomId)
    } else {
      setRoom2Selection(roomId)
    }
    // Save selections
    const newWindow1 = window === 1 ? roomId : room1Selection
    const newWindow2 = window === 2 ? roomId : room2Selection
    setSelectedRooms(newWindow1, newWindow2)
  }

  const handleNurseSelectionChange = (nurseId: string) => {
    setSelectedNurseId(nurseId)
    setSelectedNurse(nurseId)
  }

  const handleTemplateClick = (templateContent: string) => {
    if (isNurse) {
      // Use last focused window
      if (lastFocusedWindow === 1) {
        setMessageWindow1(prev => prev ? `${prev}\n${templateContent}` : templateContent)
      } else {
        setMessageWindow2(prev => prev ? `${prev}\n${templateContent}` : templateContent)
      }
    } else {
      setMessageContent(prev => prev ? `${prev}\n${templateContent}` : templateContent)
    }
  }

  const handleSendForNurse = async (windowNum: 1 | 2) => {
    const roomId = windowNum === 1 ? room1Selection : room2Selection
    const message = windowNum === 1 ? messageWindow1 : messageWindow2
    const audioData = windowNum === 1 ? audioDataWindow1 : audioDataWindow2
    
    if (!message.trim() && !audioData) {
      alert('Veuillez entrer un message ou enregistrer un message vocal')
      return
    }

    setIsSending(true)
    try {
      // Add patient context to message if available
      let fullMessage = message
      if (patientContext?.patientName) {
        fullMessage = `[Patient: ${patientContext.patientName}] ${message}`
      }

      // Save message to database for persistence
      await window.electronAPI.messages.save({
        senderId: user.id,
        senderName: user.name || user.email,
        senderRole: user.role,
        content: fullMessage,
        roomId: roomId,
        patientName: patientContext?.patientName,
        patientId: patientContext?.patientId
      })
      
      // Send room-based message (broadcast to room)
      // Find all active users to send to everyone in the room
      const result = await window.electronAPI.messaging.send({
        content: fullMessage,
        senderId: user.id.toString(),
        senderName: user.name || user.email,
        senderRole: user.role,
        roomId: roomId,
        broadcast: true,
        patientContext: patientContext ? {
          patientName: patientContext.patientName,
          patientId: patientContext.patientId
        } : undefined,
        audioData: audioData || undefined,
        isVoiceMessage: !!audioData
      })

      if (result.success) {
        alert(`Message envoyé à Salle ${roomId}!`)
        if (windowNum === 1) {
          setMessageWindow1('')
          setAudioDataWindow1(null)
        } else {
          setMessageWindow2('')
          setAudioDataWindow2(null)
        }
      } else {
        alert(`Échec de l'envoi: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      alert('Échec de l\'envoi du message')
    } finally {
      setIsSending(false)
    }
  }

  const handleSendForDoctor = async () => {
    if (!selectedNurseId) {
      alert('Veuillez sélectionner un(e) infirmier(ère)')
      return
    }

    if (!messageContent.trim() && !audioDataContent) {
      alert('Veuillez entrer un message ou enregistrer un message vocal')
      return
    }

    const nurse = nurses.find(n => n.userId.toString() === selectedNurseId)
    if (!nurse) {
      alert('Infirmier(ère) non trouvé(e)')
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
        recipientIp: nurse.ipAddress,
        recipientPort: nurse.messagingPort,
        content: fullMessage,
        senderId: user?.id.toString() || '0',
        senderName: user?.name || 'Unknown',
        senderRole: user?.role,
        recipientId: selectedNurseId,
        patientContext,
        audioData: audioDataContent || undefined,
        isVoiceMessage: !!audioDataContent
      })

      if (result.success) {
        alert('Message envoyé avec succès!')
        setMessageContent('')
        setAudioDataContent(null)
        onClose()
      } else {
        alert(`Échec de l'envoi: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      alert('Échec de l\'envoi du message')
    } finally {
      setIsSending(false)
    }
  }

  const startRecording = async (windowNum?: number) => {
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
          
          if (isNurse && windowNum) {
            if (windowNum === 1) {
              setMessageWindow1(`🎤 Message vocal - ${recordingTime}s`)
              setAudioDataWindow1(base64Audio)
            } else {
              setMessageWindow2(`🎤 Message vocal - ${recordingTime}s`)
              setAudioDataWindow2(base64Audio)
            }
          } else {
            setMessageContent(`🎤 Message vocal - ${recordingTime}s`)
            setAudioDataContent(base64Audio)
          }
        }
        reader.readAsDataURL(audioBlob)

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
      setRecordingTime(0)
      if (windowNum) setActiveRecordingWindow(windowNum)

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
      setActiveRecordingWindow(null)
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

  const handleClose = () => {
    setMessageContent('')
    setMessageWindow1('')
    setMessageWindow2('')
    setAudioDataWindow1(null)
    setAudioDataWindow2(null)
    setAudioDataContent(null)
    stopRecording()
    onClose()
  }

  if (!isOpen) return null

  // Render for Nurses: Two-window layout with room selectors
  if (isNurse) {
    return (
      <div className="modal-overlay" onClick={handleClose}>
        <div className="send-message-modal large-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <h2>📨 Envoyer un message - Salles</h2>
            <button className="close-btn" onClick={handleClose}>✖</button>
          </div>

          <div className="modal-body-three-column">
            {/* Window 1 - Room Selection */}
            <div className="message-window" style={{ borderRight: '2px solid #e0e0e0' }}>
              <div className="window-header" style={{ background: '#f3f4f6', padding: '12px' }}>
                <label style={{ fontWeight: 'bold', color: '#4b5563' }}>Fenêtre 1 - Salle</label>
                <select
                  value={room1Selection}
                  onChange={(e) => handleRoomSelectionChange(1, parseInt(e.target.value))}
                  className="form-select"
                  style={{ marginTop: '8px' }}
                >
                  <option value={1}>Salle 1</option>
                  <option value={2}>Salle 2</option>
                  <option value={3}>Salle 3</option>
                </select>
              </div>
              
              <div className="form-section" style={{ padding: '16px' }}>
                <label htmlFor="message1">Message pour Salle {room1Selection}</label>
                <textarea
                  id="message1"
                  value={messageWindow1}
                  onChange={(e) => setMessageWindow1(e.target.value)}
                  onFocus={() => setLastFocusedWindow(1)}
                  className="form-textarea"
                  placeholder="Entrez votre message..."
                  rows={12}
                />
              </div>

              <div className="form-actions" style={{ padding: '0 16px 16px' }}>
                {isRecording && activeRecordingWindow === 1 ? (
                  <button 
                    className="btn-recording" 
                    onClick={stopRecording}
                    style={{ 
                      backgroundColor: '#f44336',
                      animation: 'pulse 1.5s ease-in-out infinite',
                      width: '100%'
                    }}
                  >
                    🛑 Arrêter ({formatTime(recordingTime)})
                  </button>
                ) : (
                  <>
                    <button 
                      className="btn-record" 
                      onClick={() => startRecording(1)}
                      disabled={isSending || isRecording}
                      style={{ marginRight: '8px' }}
                    >
                      🎤 Vocal
                    </button>
                    <button 
                      className="btn-send" 
                      onClick={() => handleSendForNurse(1)}
                      disabled={isSending || !messageWindow1.trim()}
                      style={{ flex: 1 }}
                    >
                      {isSending ? 'Envoi...' : `Envoyer à Salle ${room1Selection}`}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Window 2 - Room Selection */}
            <div className="message-window" style={{ borderRight: '2px solid #e0e0e0' }}>
              <div className="window-header" style={{ background: '#f3f4f6', padding: '12px' }}>
                <label style={{ fontWeight: 'bold', color: '#4b5563' }}>Fenêtre 2 - Salle</label>
                <select
                  value={room2Selection}
                  onChange={(e) => handleRoomSelectionChange(2, parseInt(e.target.value))}
                  className="form-select"
                  style={{ marginTop: '8px' }}
                >
                  <option value={1}>Salle 1</option>
                  <option value={2}>Salle 2</option>
                  <option value={3}>Salle 3</option>
                </select>
              </div>
              
              <div className="form-section" style={{ padding: '16px' }}>
                <label htmlFor="message2">Message pour Salle {room2Selection}</label>
                <textarea
                  id="message2"
                  value={messageWindow2}
                  onChange={(e) => setMessageWindow2(e.target.value)}
                  onFocus={() => setLastFocusedWindow(2)}
                  className="form-textarea"
                  placeholder="Entrez votre message..."
                  rows={12}
                />
              </div>

              <div className="form-actions" style={{ padding: '0 16px 16px' }}>
                {isRecording && activeRecordingWindow === 2 ? (
                  <button 
                    className="btn-recording" 
                    onClick={stopRecording}
                    style={{ 
                      backgroundColor: '#f44336',
                      animation: 'pulse 1.5s ease-in-out infinite',
                      width: '100%'
                    }}
                  >
                    🛑 Arrêter ({formatTime(recordingTime)})
                  </button>
                ) : (
                  <>
                    <button 
                      className="btn-record" 
                      onClick={() => startRecording(2)}
                      disabled={isSending || isRecording}
                      style={{ marginRight: '8px' }}
                    >
                      🎤 Vocal
                    </button>
                    <button 
                      className="btn-send" 
                      onClick={() => handleSendForNurse(2)}
                      disabled={isSending || !messageWindow2.trim()}
                      style={{ flex: 1 }}
                    >
                      {isSending ? 'Envoi...' : `Envoyer à Salle ${room2Selection}`}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Template Manager */}
            <div className="template-panel" style={{ background: '#F1F1F1', flex: '0 0 300px' }}>
              <h3 style={{ 
                padding: '12px 16px', 
                margin: 0, 
                borderBottom: '1px solid #E5E7EB',
                color: '#2A6484',
                fontWeight: 600
              }}>
                📝 Modèles
              </h3>
              <TemplateManager onTemplateClick={handleTemplateClick} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render for Doctors/Assistants: Single window with nurse selector
  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="send-message-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <h2>📨 Envoyer un message</h2>
          <button className="close-btn" onClick={handleClose}>✖</button>
        </div>

        <div className="modal-body-two-column">
          {/* Left Panel: Message Form */}
          <div className="left-panel">
            <div className="form-section">
              <label htmlFor="nurse-select">Infirmier(ère) Destinataire</label>
              {nurses.length === 1 ? (
                <div className="nurse-auto-selected" style={{ 
                  padding: '12px',
                  background: '#f0f9ff',
                  borderRadius: '8px',
                  color: '#0369a1',
                  fontWeight: 'bold'
                }}>
                  👩‍⚕️ {nurses[0].username} (Sélectionné automatiquement)
                </div>
              ) : (
                <select
                  id="nurse-select"
                  value={selectedNurseId}
                  onChange={(e) => handleNurseSelectionChange(e.target.value)}
                  className="form-select"
                  disabled={nurses.length === 0}
                >
                  <option value="">Sélectionner un(e) infirmier(ère)...</option>
                  {nurses.map((nurse) => (
                    <option key={nurse.userId} value={nurse.userId.toString()}>
                      👩‍⚕️ {nurse.username} - {nurse.ipAddress}
                    </option>
                  ))}
                </select>
              )}
              {nurses.length === 0 && (
                <p className="no-users-notice">Aucun(e) infirmier(ère) en ligne</p>
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
                    onClick={() => startRecording()}
                    disabled={isSending || !selectedNurseId}
                    title="Enregistrer un message vocal"
                  >
                    🎤 Vocal
                  </button>
                  <button 
                    className="btn-send" 
                    onClick={handleSendForDoctor}
                    disabled={isSending || !selectedNurseId || !messageContent.trim()}
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

export default RoomBasedSendMessageModal
