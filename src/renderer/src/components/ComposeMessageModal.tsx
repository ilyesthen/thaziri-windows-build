import React, { useState, useEffect } from 'react'
import './ComposeMessageModal.css'
import { NetworkUser } from '../../../preload'
import { useAuthStore } from '../store/authStore'

interface MessageTemplate {
  id: number
  content: string
}

interface ComposeMessageModalProps {
  isOpen: boolean
  onClose: () => void
  activeUsers: NetworkUser[]
}

const ComposeMessageModal: React.FC<ComposeMessageModalProps> = ({ isOpen, onClose, activeUsers }) => {
  const user = useAuthStore((state) => state.user)
  
  const [selectedRecipient, setSelectedRecipient] = useState<string>('')
  const [messageContent, setMessageContent] = useState('')
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)
  const [isSending, setIsSending] = useState(false)
  
  // Voice message state
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [recordingTimer, setRecordingTimer] = useState<NodeJS.Timeout | null>(null)

  // Load templates on mount
  useEffect(() => {
    if (isOpen) {
      loadTemplates()
      loadLastRecipient()
    }
  }, [isOpen])

  const loadTemplates = async () => {
    try {
      const result = await window.electronAPI.templates.getAll()
      if (result.success) {
        setTemplates(result.templates || [])
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
  }

  const loadLastRecipient = async () => {
    try {
      const lastRecipientId = await window.electronAPI.store.get('lastSelectedRecipientId')
      if (lastRecipientId) {
        // Check if the last recipient is still online
        const recipientOnline = activeUsers.some(u => u.userId.toString() === lastRecipientId)
        if (recipientOnline) {
          setSelectedRecipient(lastRecipientId)
        }
      }
    } catch (error) {
      console.error('Failed to load last recipient:', error)
    }
  }

  const handleRecipientChange = async (recipientId: string) => {
    setSelectedRecipient(recipientId)
    // Save to persistent store
    await window.electronAPI.store.set('lastSelectedRecipientId', recipientId)
  }

  const handleTemplateSelect = (templateId: number) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setMessageContent(template.content)
      setSelectedTemplate(templateId)
    }
  }

  const handleCreateTemplate = async () => {
    if (!messageContent.trim()) {
      alert('Veuillez fournir un contenu pour le modèle')
      return
    }

    try {
      const result = await window.electronAPI.templates.create({ title: 'Template', content: messageContent })

      if (result.success) {
        setTemplates([...templates, result.template])
        setIsCreatingTemplate(false)
        alert('Modèle créé avec succès!')
      }
    } catch (error) {
      console.error('Failed to create template:', error)
      alert('Échec de la création du modèle')
    }
  }

  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce modèle?')) {
      return
    }

    try {
      const result = await window.electronAPI.templates.delete(templateId)
      if (result.success) {
        setTemplates(templates.filter(t => t.id !== templateId))
        if (selectedTemplate === templateId) {
          setSelectedTemplate(null)
        }
      }
    } catch (error) {
      console.error('Failed to delete template:', error)
      alert('Échec de la suppression du modèle')
    }
  }

  const handleSend = async () => {
    if (!selectedRecipient) {
      alert('Veuillez sélectionner un destinataire')
      return
    }

    // Allow sending voice message without text content
    if (!messageContent.trim() && !recordedAudio) {
      alert('Veuillez entrer un message ou enregistrer un message vocal')
      return
    }

    const recipient = activeUsers.find(u => u.userId.toString() === selectedRecipient)
    if (!recipient) {
      alert('Destinataire non trouvé')
      return
    }

    setIsSending(true)
    try {
      const result = await window.electronAPI.messaging.send({
        recipientIp: recipient.ipAddress,
        content: messageContent || (recordedAudio ? '🎤 Message vocal' : ''),
        senderId: user?.id.toString() || '0',
        senderName: user?.name || 'Unknown',
        audioData: recordedAudio || undefined,
        isVoiceMessage: !!recordedAudio
      })

      if (result.success) {
        alert('Message envoyé avec succès!')
        setMessageContent('')
        setRecordedAudio(null)
        setRecordingDuration(0)
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

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      const chunks: Blob[] = []
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64Audio = reader.result as string
          setRecordedAudio(base64Audio)
        }
        reader.readAsDataURL(audioBlob)
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }
      
      setMediaRecorder(recorder)
      recorder.start()
      setIsRecording(true)
      
      // Start duration timer
      setRecordingDuration(0)
      const timer = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)
      setRecordingTimer(timer)
      
    } catch (error) {
      console.error('Failed to start recording:', error)
      alert('Impossible d\'accéder au microphone')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
      setIsRecording(false)
      
      if (recordingTimer) {
        clearInterval(recordingTimer)
        setRecordingTimer(null)
      }
    }
  }

  const cancelRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
      setIsRecording(false)
      
      if (recordingTimer) {
        clearInterval(recordingTimer)
        setRecordingTimer(null)
      }
    }
    
    setRecordedAudio(null)
    setRecordingDuration(0)
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="compose-message-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nouveau Message</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Recipient Selection */}
          <div className="form-group">
            <label>Destinataire</label>
            <select
              value={selectedRecipient}
              onChange={(e) => handleRecipientChange(e.target.value)}
              className="form-select"
            >
              <option value="">-- Sélectionner un utilisateur --</option>
              {activeUsers.map((activeUser) => (
                <option key={activeUser.userId} value={activeUser.userId.toString()}>
                  {activeUser.username} ({activeUser.role}) - {activeUser.ipAddress}
                </option>
              ))}
            </select>
          </div>

          {/* Template Panel */}
          <div className="template-panel">
            <div className="template-header">
              <h3>Modèles de messages</h3>
              <button
                className="btn-create-template"
                onClick={() => setIsCreatingTemplate(!isCreatingTemplate)}
              >
                {isCreatingTemplate ? 'Annuler' : '+ Nouveau modèle'}
              </button>
            </div>

            {isCreatingTemplate && (
              <div className="create-template-form">
                <button className="btn-save-template" onClick={handleCreateTemplate}>
                  Enregistrer comme modèle
                </button>
              </div>
            )}

            <div className="template-list">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`template-item ${selectedTemplate === template.id ? 'selected' : ''}`}
                >
                  <div className="template-item-content" onClick={() => handleTemplateSelect(template.id)}>
                    <span className="template-title">{template.content}</span>
                  </div>
                  <button
                    className="btn-delete-template"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Message Content */}
          <div className="form-group">
            <label>Message</label>
            <div className="message-input-container">
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                className="message-textarea"
                rows={8}
                placeholder="Entrez votre message ici..."
                disabled={isRecording}
              />
            </div>
            
            {/* Recording indicator */}
            {isRecording && (
              <div className="recording-indicator">
                <span className="recording-pulse">●</span>
                <span>Enregistrement... {formatDuration(recordingDuration)}</span>
              </div>
            )}
            
            {/* Recorded audio preview */}
            {recordedAudio && !isRecording && (
              <div className="audio-preview">
                <div className="audio-preview-info">
                  <span>🎤 Message vocal enregistré ({formatDuration(recordingDuration)})</span>
                  <audio controls src={recordedAudio} />
                </div>
                <button
                  className="btn-cancel-audio"
                  onClick={cancelRecording}
                  type="button"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button
            className={`btn-voice-record ${isRecording ? 'recording' : ''}`}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            title="Maintenir enfoncé pour enregistrer un message vocal"
            type="button"
          >
            {isRecording ? '🔴 Enregistrement...' : '🎤 Message vocal'}
          </button>
          <button className="btn-cancel" onClick={onClose}>
            Annuler
          </button>
          <button
            className="btn-send"
            onClick={handleSend}
            disabled={isSending || !selectedRecipient || (!messageContent.trim() && !recordedAudio)}
          >
            {isSending ? 'Envoi...' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ComposeMessageModal
