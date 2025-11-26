import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { MOTIF_OPTIONS } from '../constants/visitExaminationOptions'
import './SendToRoomModal.css'


interface SendToRoomModalProps {
  isOpen: boolean
  onClose: () => void
  patient: {
    id: number
    departmentCode: number
    firstName: string
    lastName: string
  }
  targetRoom?: number
}

const SendToRoomModal: React.FC<SendToRoomModalProps> = ({ isOpen, onClose, patient, targetRoom }) => {
  const { user } = useAuthStore()
  const [selectedMotif, setSelectedMotif] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSelectedMotif('')
    }
  }, [isOpen])

  const handleSendToRoom = async () => {
    if (!targetRoom || !user || !selectedMotif) return

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
        roomId: targetRoom,
        roomName: `Salle ${targetRoom}`,
        isUrgent: false,
        actionLabel: selectedMotif
      }
      
      console.log('SendToRoomModal: Sending payload with motif:', payload)
      const result = await window.electronAPI.queue.sendToRoom(payload)

      if (result?.success) {
        alert(`✅ Patient envoyé à Salle ${targetRoom}`)
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
      <div className="send-room-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Envoyer le Patient</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="patient-info">
            <h3>{patient.firstName} {patient.lastName}</h3>
            <span className="patient-code">Code: {patient.departmentCode}</span>
          </div>

          <div className="room-info">
            <h4>🚪 Destination: Salle {targetRoom}</h4>
          </div>

          <div className="motif-selection">
            <label>Motif de consultation:</label>
            <select 
              value={selectedMotif} 
              onChange={(e) => setSelectedMotif(e.target.value)}
              className="motif-select"
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
            className="btn-send"
            onClick={handleSendToRoom}
            disabled={!targetRoom || !selectedMotif || loading}
          >
            {loading ? 'Envoi...' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SendToRoomModal
