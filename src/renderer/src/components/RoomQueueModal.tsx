import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import './RoomQueueModal.css'

interface QueueItem {
  id: number
  patientCode: number
  patientName: string
  fromUserName: string
  motif?: string
  createdAt: string
  status: string
  isUrgent?: boolean
  actionType?: string
  actionLabel?: string
  sentAt?: string
  isChecked?: boolean
}

interface RoomQueueModalProps {
  isOpen: boolean
  onClose: () => void
  roomNumber: number
  queueItems: QueueItem[]
  onRefresh: () => void
  initialFilter?: 'all' | 'regular' | 'urgent' | 'fromDoctor'
}

const RoomQueueModal: React.FC<RoomQueueModalProps> = ({ 
  isOpen, 
  onClose, 
  roomNumber, 
  queueItems,
  onRefresh,
  initialFilter = 'all'
}) => {
  const { user: currentUser } = useAuthStore()
  const navigate = useNavigate()
  const [patientAges, setPatientAges] = React.useState<{[key: number]: string}>({})
  const [timers, setTimers] = React.useState<{[key: number]: string}>({})
  const [selectedFilter, setSelectedFilter] = React.useState<'all' | 'regular' | 'urgent' | 'fromDoctor'>(initialFilter)
  const [hoveredPatient, setHoveredPatient] = React.useState<number | null>(null)

  // Calculate elapsed time for doctor-sent patients
  React.useEffect(() => {
    const interval = setInterval(() => {
      const newTimers: {[key: number]: string} = {}
      queueItems.forEach((item) => {
        if (item.actionType) {
          const sentTime = new Date(item.sentAt || item.createdAt || (item as any).sent_at)
          const now = new Date()
          const diff = Math.floor((now.getTime() - sentTime.getTime()) / 1000)
          const minutes = Math.floor(diff / 60)
          const seconds = diff % 60
          newTimers[item.id] = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        }
      })
      setTimers(newTimers)
    }, 1000)

    return () => clearInterval(interval)
  }, [queueItems])

  const handleOpenPatientFile = async (item: QueueItem) => {
    try {
      // Mark as completed (patient entered consultation)
      await window.electronAPI.queue.markCompleted(item.id)
      
      // Navigate to patient file
      const patientResult = await (window.electronAPI as any).db.patients.getByCode(item.patientCode)
      if (patientResult?.success && patientResult.patient) {
        const patient = patientResult.patient
        // Navigate to patient details page using React Router
        navigate(`/patient/${patient.id}`)
      }
      
      // Refresh the queue
      onRefresh()
      onClose()
    } catch (error) {
      console.error('Error opening patient file:', error)
    }
  }

  const handleDeletePatient = async (item: QueueItem, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${item.patientName} de la file d'attente?`)) {
      return
    }
    
    try {
      // Mark as cancelled in database
      await window.electronAPI.queue.markCompleted(item.id)
      
      // Refresh the queue
      onRefresh()
    } catch (error) {
      console.error('Error deleting patient from queue:', error)
      alert('Erreur lors de la suppression du patient')
    }
  }

  const handleCheckboxChange = async (item: QueueItem) => {
    try {
      const newCheckedState = !item.isChecked
      // Update database immediately
      await window.electronAPI.queue.toggleChecked(item.id, newCheckedState)
      // Refresh the queue to show updated state
      onRefresh()
    } catch (error) {
      console.error('Error toggling checkbox:', error)
      alert('Erreur lors de la mise à jour')
    }
  }

  const getFilteredItems = () => {
    if (selectedFilter === 'all') return queueItems
    if (selectedFilter === 'regular') return queueItems.filter(item => !item.isUrgent && !item.actionType)
    if (selectedFilter === 'urgent') return queueItems.filter(item => item.isUrgent)
    if (selectedFilter === 'fromDoctor') return queueItems.filter(item => item.actionType)
    return queueItems
  }

  const getFilterCounts = () => {
    return {
      all: queueItems.length,
      regular: queueItems.filter(item => !item.isUrgent && !item.actionType).length,
      urgent: queueItems.filter(item => item.isUrgent).length,
      fromDoctor: queueItems.filter(item => item.actionType).length
    }
  }


  const formatTime = (dateString: string) => {
    if (!dateString) return '—'
    
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return '—'
      
      return date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } catch (error) {
      return '—'
    }
  }

  // Fetch ages when queue items change
  React.useEffect(() => {
    console.log('RoomQueueModal: Queue items received:', queueItems)
    if (queueItems.length > 0) {
      console.log('First queue item keys:', Object.keys(queueItems[0]))
      console.log('First queue item:', queueItems[0])
    }
    
    const fetchAges = async () => {
      const newAges: {[key: number]: string} = {}
      
      for (const item of queueItems) {
        console.log('Processing queue item:', item)
        try {
          const patientResult = await (window.electronAPI as any).db.patients.getByCode(item.patientCode)
          if (patientResult?.success && patientResult.patient) {
            console.log('Patient data:', patientResult.patient)
            if (patientResult.patient.dateOfBirth) {
              const birthDate = new Date(patientResult.patient.dateOfBirth)
              const today = new Date()
              const age = today.getFullYear() - birthDate.getFullYear()
              newAges[item.patientCode] = age.toString()
            } else {
              newAges[item.patientCode] = '—'
            }
          } else {
            newAges[item.patientCode] = '—'
          }
        } catch (error) {
          console.error('Error fetching patient:', error)
          newAges[item.patientCode] = '—'
        }
      }
      
      setPatientAges(newAges)
    }
    
    if (queueItems.length > 0) {
      fetchAges()
    }
  }, [queueItems])

  // Update filter when initialFilter changes
  React.useEffect(() => {
    if (isOpen) {
      setSelectedFilter(initialFilter)
    }
  }, [isOpen, initialFilter])

  if (!isOpen) return null

  const filteredItems = getFilteredItems()
  const counts = getFilterCounts()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="room-queue-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🚪 Salle {roomNumber} - Patients en attente</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-filter-tabs">
          <button 
            className={`filter-tab ${selectedFilter === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('all')}
          >
            Tous ({counts.all})
          </button>
          <button 
            className={`filter-tab ${selectedFilter === 'regular' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('regular')}
          >
            📋 En attente ({counts.regular})
          </button>
          <button 
            className={`filter-tab urgent ${selectedFilter === 'urgent' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('urgent')}
          >
            🚨 Urgences ({counts.urgent})
          </button>
          <button 
            className={`filter-tab ${selectedFilter === 'fromDoctor' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('fromDoctor')}
          >
            💊 {currentUser?.role === 'nurse' ? 'Dilatation' : 'Envoyés'} ({counts.fromDoctor})
          </button>
        </div>

        <div className="modal-body">
          {filteredItems.length === 0 ? (
            <div className="no-patients-message">
              <p>Aucun patient dans cette catégorie</p>
            </div>
          ) : (
            <div className="queue-table">
              <table>
                <thead>
                  <tr>
                    <th style={{width: '40px'}}>✓</th>
                    <th>Heure</th>
                    <th>Nom</th>
                    <th>Âge</th>
                    <th>Motif de consultation</th>
                    {(currentUser?.role === 'doctor' || currentUser?.role === 'assistant_1' || currentUser?.role === 'assistant_2') && (
                      <th>Action</th>
                    )}
                    <th style={{width: '60px'}}>🗑️</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr 
                      key={item.id} 
                      className={`${item.isUrgent ? 'urgent-row' : ''} ${hoveredPatient === item.id ? 'hovered-row' : ''} ${item.isChecked ? 'checked-row' : ''}`}
                      onMouseEnter={() => setHoveredPatient(item.id)}
                      onMouseLeave={() => setHoveredPatient(null)}
                    >
                      <td>
                        <input 
                          type="checkbox" 
                          checked={item.isChecked || false}
                          onChange={() => handleCheckboxChange(item)}
                          className="patient-checkbox"
                          title="Marquer comme prochain"
                        />
                      </td>
                      <td>
                        {formatTime(item.createdAt || (item as any).sent_at || (item as any).sentAt)}
                        {item.actionType && timers[item.id] && (
                          <div className="timer-display">⏱️ {timers[item.id]}</div>
                        )}
                      </td>
                      <td className={item.isUrgent ? 'urgent-patient-name' : ''}>
                        {item.isUrgent && '🚨 '}
                        {item.isChecked && '⭐ '}
                        {item.patientName}
                      </td>
                      <td>{patientAges[item.patientCode] || '—'}</td>
                      <td>
                        {item.actionLabel || item.motif || '—'}
                        {item.actionType && (
                          <span className="action-type-badge" style={{
                            marginLeft: '8px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            background: item.actionType === 'S' ? '#9c27b0' :
                                      item.actionType === 'D' ? '#2196f3' :
                                      item.actionType === 'G' ? '#ff9800' : '#f44336',
                            color: 'white'
                          }}>
                            {item.actionType}
                          </span>
                        )}
                      </td>
                      {(currentUser?.role === 'doctor' || currentUser?.role === 'assistant_1' || currentUser?.role === 'assistant_2') && (
                        <td>
                          <button 
                            className="open-file-btn"
                            onClick={() => handleOpenPatientFile(item)}
                          >
                            📂 Ouvrir le dossier
                          </button>
                        </td>
                      )}
                      <td>
                        <button 
                          className="delete-patient-btn"
                          onClick={(e) => handleDeletePatient(item, e)}
                          title="Supprimer de la file d'attente"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-close" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

export default RoomQueueModal
