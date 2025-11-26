import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import './PatientQueueDisplay.css'

interface QueueItem {
  id: number
  patientCode: number
  patientName: string
  fromUserId: number
  fromUserName: string
  fromUserRole: string
  toUserId?: number
  toUserName?: string
  toUserRole?: string
  roomId?: number
  roomName?: string
  actionType?: string
  actionLabel?: string
  isUrgent: boolean
  visitId?: number
  sentAt: Date
  seenAt?: Date
  completedAt?: Date
  status: string
}

const PatientQueueDisplay: React.FC = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [incomingQueue, setIncomingQueue] = useState<QueueItem[]>([])
  const [sentQueue, setSentQueue] = useState<QueueItem[]>([])
  const [showIncoming, setShowIncoming] = useState(true)

  // Fetch queue items periodically
  useEffect(() => {
    if (!user) return

    const fetchQueue = async () => {
      try {
        // Get incoming queue items (from nurses)
        const incomingResult = await window.electronAPI.queue.getQueue(user.id, user.role)
        if (incomingResult?.success) {
          setIncomingQueue(incomingResult.queue || [])
        }

        // Get sent queue items (to nurses)
        const sentResult = await window.electronAPI.queue.getSentItems(user.id)
        if (sentResult?.success) {
          setSentQueue(sentResult.items || [])
        }
      } catch (error) {
        console.error('Error fetching queue:', error)
      }
    }

    // Initial fetch
    fetchQueue()

    // Poll every 5 seconds
    const interval = setInterval(fetchQueue, 5000)

    return () => clearInterval(interval)
  }, [user])

  // Handle double-click to open patient file
  const handlePatientClick = async (item: QueueItem) => {
    try {
      // Mark as seen
      await window.electronAPI.queue.markSeen(item.id)

      // Navigate to patient file - get the patient details first
      const patientResult = await (window.electronAPI as any).db.patients.getByCode(item.patientCode)
      if (patientResult?.success && patientResult.patient) {
        // Navigate to patient details view
        navigate(`/patient/${patientResult.patient.id}`)
      }
    } catch (error) {
      console.error('Error opening patient file:', error)
    }
  }

  // Handle completing a patient from sent queue
  const handleCompleteSent = async (item: QueueItem) => {
    try {
      await window.electronAPI.queue.markCompleted(item.id)
      // Refresh the queue
      const sentResult = await window.electronAPI.queue.getSentItems(user!.id)
      if (sentResult?.success) {
        setSentQueue(sentResult.items || [])
      }
    } catch (error) {
      console.error('Error completing queue item:', error)
    }
  }

  // Format time ago
  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const sent = new Date(date)
    const diffMs = now.getTime() - sent.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'maintenant'
    if (diffMins === 1) return '1 minute'
    if (diffMins < 60) return `${diffMins} minutes`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours === 1) return '1 heure'
    if (diffHours < 24) return `${diffHours} heures`
    
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return '1 jour'
    return `${diffDays} jours`
  }

  // Don't show for nurses or admin
  if (!user || user.role === 'nurse' || user.role === 'admin') {
    return null
  }

  const hasIncoming = incomingQueue.length > 0
  const hasSent = sentQueue.length > 0

  // If no queue items, don't show anything
  if (!hasIncoming && !hasSent) {
    return null
  }

  return (
    <div className="patient-queue-display">
      <div className="queue-tabs">
        <button 
          className={`queue-tab ${showIncoming ? 'active' : ''}`}
          onClick={() => setShowIncoming(true)}
        >
          📥 Patients Reçus ({incomingQueue.length})
        </button>
        <button 
          className={`queue-tab ${!showIncoming ? 'active' : ''}`}
          onClick={() => setShowIncoming(false)}
        >
          📤 Patients Envoyés ({sentQueue.length})
        </button>
      </div>

      <div className="queue-content">
        {showIncoming ? (
          // Incoming patients from nurses
          <div className="queue-list">
            {incomingQueue.length === 0 ? (
              <div className="empty-queue">Aucun patient en attente</div>
            ) : (
              incomingQueue.map(item => (
                <div 
                  key={item.id}
                  className={`queue-item ${item.isUrgent ? 'urgent' : ''} ${item.status === 'seen' ? 'seen' : ''}`}
                  onDoubleClick={() => handlePatientClick(item)}
                  title="Double-cliquez pour ouvrir le dossier"
                >
                  <div className="queue-item-header">
                    <span className="patient-name">{item.patientName}</span>
                    {item.isUrgent && <span className="urgent-badge">URGENT</span>}
                  </div>
                  <div className="queue-item-info">
                    <span className="sender">De: {item.fromUserName}</span>
                    <span className="time">Il y a {formatTimeAgo(item.sentAt)}</span>
                  </div>
                  {item.status === 'seen' && <span className="seen-indicator">✓ Vu</span>}
                </div>
              ))
            )}
          </div>
        ) : (
          // Sent patients to nurses
          <div className="queue-list">
            {sentQueue.length === 0 ? (
              <div className="empty-queue">Aucun patient envoyé</div>
            ) : (
              sentQueue.map(item => (
                <div 
                  key={item.id}
                  className={`queue-item sent ${item.status === 'completed' ? 'completed' : ''}`}
                >
                  <div className="queue-item-header">
                    <span className="patient-name">{item.patientName}</span>
                    {item.actionLabel && <span className="action-badge">{item.actionLabel}</span>}
                  </div>
                  <div className="queue-item-info">
                    <span className="action">Action: {item.actionType}</span>
                    <span className="time">Il y a {formatTimeAgo(item.sentAt)}</span>
                  </div>
                  {item.status !== 'completed' && (
                    <button 
                      className="complete-btn"
                      onClick={() => handleCompleteSent(item)}
                    >
                      ✓ Terminer
                    </button>
                  )}
                  {item.status === 'completed' && <span className="completed-indicator">✓ Terminé</span>}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default PatientQueueDisplay
