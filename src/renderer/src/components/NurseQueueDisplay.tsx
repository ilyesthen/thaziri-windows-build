import React, { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import './NurseQueueDisplay.css'

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

interface NurseQueueDisplayProps {
  isOpen: boolean
  onClose: () => void
}

const NurseQueueDisplay: React.FC<NurseQueueDisplayProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [queueItems, setQueueItems] = useState<QueueItem[]>([])
  const [hasNewItems, setHasNewItems] = useState(false)
  const [sentPatientsCount, setSentPatientsCount] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch queue items periodically
  useEffect(() => {
    if (!user || user.role !== 'nurse') return

    const fetchQueue = async () => {
      try {
        // Get items sent FROM doctors TO nurses (with actionType: S, D, G, ODG)
        const result = await window.electronAPI.queue.getQueue(user.id, user.role)
        if (result?.success) {
          const newItems = result.queue || []
          console.log('Nurse queue items from doctors:', newItems)
          
          // Check if there are new unseen items from doctors
          const unseenItems = newItems.filter((item: QueueItem) => 
            item.status === 'pending' && item.actionType // Only items with actionType are from doctors
          )
          
          if (unseenItems.length > 0 && !isOpen) {
            setHasNewItems(true)
            // Play sound notification continuously until opened
            if (audioRef.current) {
              audioRef.current.loop = true
              audioRef.current.play().catch(e => console.log('Could not play sound:', e))
            }
          }
          
          setQueueItems(newItems)
        }
        
        // Fetch count of patients sent BY this nurse TO doctors
        const sentResult = await window.electronAPI.queue.getSentItems(user.id)
        if (sentResult?.success) {
          // Only count items without actionType (nurse->doctor sends)
          const nurseToDoctor = (sentResult.items || []).filter((item: any) => !item.actionType)
          setSentPatientsCount(nurseToDoctor.length)
        }
      } catch (error) {
        console.error('Error fetching nurse queue:', error)
      }
    }

    // Initial fetch
    fetchQueue()

    // Poll every 3 seconds
    intervalRef.current = setInterval(fetchQueue, 3000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [user, isOpen])

  // Stop sound when modal is opened
  useEffect(() => {
    if (isOpen && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setHasNewItems(false)
      
      // Mark all items as seen
      queueItems.forEach(async (item) => {
        if (item.status === 'pending') {
          await window.electronAPI.queue.markSeen(item.id)
        }
      })
    }
  }, [isOpen, queueItems])

  // Handle clicking on a patient to navigate to their file
  const handlePatientClick = async (item: QueueItem) => {
    try {
      // Mark as completed
      await window.electronAPI.queue.markCompleted(item.id)
      
      // Navigate to patient file
      const patientResult = await (window.electronAPI as any).db.patients.getByCode(item.patientCode)
      if (patientResult?.success && patientResult.patient) {
        onClose()
        navigate(`/patient/${patientResult.patient.id}`)
      }
    } catch (error) {
      console.error('Error opening patient file:', error)
    }
  }

  // Timer component for each queue item
  const Timer: React.FC<{ sentAt: Date }> = ({ sentAt }) => {
    const [time, setTime] = useState('')
    
    useEffect(() => {
      const updateTime = () => {
        const now = new Date()
        const sent = new Date(sentAt)
        const diffMs = now.getTime() - sent.getTime()
        
        const hours = Math.floor(diffMs / 3600000)
        const minutes = Math.floor((diffMs % 3600000) / 60000)
        const seconds = Math.floor((diffMs % 60000) / 1000)
        
        if (hours > 0) {
          setTime(`${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`)
        } else if (minutes > 0) {
          setTime(`${minutes}m ${seconds.toString().padStart(2, '0')}s`)
        } else {
          setTime(`${seconds}s`)
        }
      }
      
      updateTime()
      const timer = setInterval(updateTime, 1000)
      return () => clearInterval(timer)
    }, [sentAt])
    
    return <span className="timer">{time}</span>
  }

  if (!user || user.role !== 'nurse') {
    return null
  }

  const pendingItems = queueItems.filter(item => item.status === 'pending' || item.status === 'seen')
  const completedItems = queueItems.filter(item => item.status === 'completed')

  if (!isOpen) {
    // Show notification badge when there are new items
    if (hasNewItems && pendingItems.length > 0) {
      return (
        <>
          <div className="nurse-queue-notification" onClick={() => onClose()}>
            <span className="notification-icon">🔔</span>
            <span className="notification-count">{pendingItems.length}</span>
            <span className="notification-text">Patients en attente</span>
          </div>
          <audio ref={audioRef} loop>
            <source src="/notification-sound.mp3" type="audio/mpeg" />
            <source src="/notification-sound.wav" type="audio/wav" />
          </audio>
        </>
      )
    }
    return null
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="nurse-queue-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🏥 Patients Envoyés par les Médecins</h2>
          <div className="header-controls">
            <div className="sent-counter">
              <span className="counter-label">Patients envoyés aux médecins:</span>
              <span className="counter-value">{sentPatientsCount}</span>
            </div>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="modal-body">
          {pendingItems.length === 0 ? (
            <div className="empty-queue">
              <p>Aucun patient en attente</p>
            </div>
          ) : (
            <div className="queue-list">
              <h3>Patients en Attente ({pendingItems.length})</h3>
              {pendingItems.map(item => (
                <div 
                  key={item.id}
                  className={`queue-item ${item.status === 'seen' ? 'seen' : ''}`}
                  onClick={() => handlePatientClick(item)}
                  title="Cliquez pour ouvrir le dossier patient"
                >
                  <div className="patient-info">
                    <span className="patient-name">{item.patientName}</span>
                    <span className="patient-code">Code: {item.patientCode}</span>
                  </div>
                  <div className="action-info">
                    <span className="action-type">{item.actionLabel || item.actionType}</span>
                    <span className="from-doctor">De: Dr. {item.fromUserName} - {item.roomName || 'Salle ?'}</span>
                  </div>
                  <div className="queue-item-timer">
                    <Timer sentAt={item.sentAt} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {completedItems.length > 0 && (
            <div className="completed-section">
              <h3>Récemment Traités ({completedItems.length})</h3>
              <div className="queue-list completed">
                {completedItems.slice(0, 5).map(item => (
                  <div key={item.id} className="queue-item completed">
                    <div className="patient-info">
                      <span className="patient-name">{item.patientName}</span>
                      <span className="patient-code">Code: {item.patientCode}</span>
                    </div>
                    <div className="action-info">
                      <span className="action-type">{item.actionLabel || item.actionType}</span>
                      <span className="completed-badge">✓ Traité</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <audio ref={audioRef} loop>
        <source src="/notification-sound.mp3" type="audio/mpeg" />
        <source src="/notification-sound.wav" type="audio/wav" />
      </audio>
    </div>
  )
}

export default NurseQueueDisplay
