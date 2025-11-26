import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { MOTIF_OPTIONS } from '../constants/visitExaminationOptions'
import './UrgentSendModal.css'

interface UrgentSendModalProps {
  isOpen: boolean
  onClose: () => void
  patient: {
    id: number
    departmentCode: number
    firstName: string
    lastName: string
  }
}

const UrgentSendModal: React.FC<UrgentSendModalProps> = ({ isOpen, onClose, patient }) => {
  const { user } = useAuthStore()
  const [selectedMotif, setSelectedMotif] = useState<string>('')
  const [selectedRoom, setSelectedRoom] = useState<number>(1)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSelectedMotif('')
      setSelectedRoom(1)
    }
  }, [isOpen])

  const handleSendUrgent = async () => {
    if (!selectedRoom || !user || !selectedMotif) return

    setLoading(true)
    try {
      const payload = {
        patientCode: patient.departmentCode,
        patientName: `${patient.firstName} ${patient.lastName}`.trim(),
        fromUserId: user.id,
        fromUserName: user.name || user.email,
        fromUserRole: user.role,
        toUserId: 0,
        toUserName: 'En attente',  
        toUserRole: 'doctor',
        roomId: selectedRoom,
        roomName: `Salle ${selectedRoom}`,
        isUrgent: true, // This is the key difference - marking as urgent
        actionLabel: selectedMotif
      }
      
      console.log('UrgentSendModal: Sending urgent patient with motif:', payload)
      const result = await window.electronAPI.queue.sendToRoom(payload)

      if (result?.success) {
        alert(`🚨 Patient envoyé en URGENCE à Salle ${selectedRoom}`)
        onClose()
      } else {
        alert(`❌ Erreur: ${result?.error || 'Impossible d\'envoyer le patient'}`)
      }
    } catch (error: any) {
      alert(`❌ Erreur: ${error.message || 'Erreur inconnue'}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="urgent-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header urgent-header">
          <h2>🚨 Envoyer Patient en URGENCE</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="patient-info urgent-patient">
            <h3>{patient.firstName} {patient.lastName}</h3>
            <span className="patient-code">Code: {patient.departmentCode}</span>
          </div>

          <div className="room-selection">
            <label>Sélectionner la salle :</label>
            <div className="room-buttons">
              <button 
                className={`room-select-btn ${selectedRoom === 1 ? 'active' : ''}`}
                onClick={() => setSelectedRoom(1)}
              >
                🚪 Salle 1
              </button>
              <button 
                className={`room-select-btn ${selectedRoom === 2 ? 'active' : ''}`}
                onClick={() => setSelectedRoom(2)}
              >
                🚪 Salle 2
              </button>
              <button 
                className={`room-select-btn ${selectedRoom === 3 ? 'active' : ''}`}
                onClick={() => setSelectedRoom(3)}
              >
                🚪 Salle 3
              </button>
            </div>
          </div>

          <div className="motif-selection">
            <label>Motif de consultation urgente:</label>
            <select 
              value={selectedMotif} 
              onChange={(e) => setSelectedMotif(e.target.value)}
              className="motif-select urgent-motif"
            >
              <option value="">Sélectionnez un motif</option>
              {MOTIF_OPTIONS.map((motif, index) => (
                <option key={index} value={motif}>{motif}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Annuler
          </button>
          <button 
            className="btn-send urgent-send"
            onClick={handleSendUrgent}
            disabled={!selectedRoom || !selectedMotif || loading}
          >
            {loading ? 'Envoi...' : '🚨 Envoyer en URGENCE'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UrgentSendModal
