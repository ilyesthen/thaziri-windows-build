import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import './ChangeRoomModal.css'

interface Room {
  id: number
  name: string
  activeUserId?: number
  activeUserName?: string
  activeUserRole?: string
}

interface ChangeRoomModalProps {
  isOpen: boolean
  onClose: () => void
  onRoomChanged?: () => void
}

const ChangeRoomModal: React.FC<ChangeRoomModalProps> = ({ isOpen, onClose, onRoomChanged }) => {
  const { user } = useAuthStore()
  const [rooms, setRooms] = useState<Room[]>([])
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && user) {
      loadRooms()
    }
  }, [isOpen, user])

  const loadRooms = async () => {
    try {
      const result = await window.electronAPI.db.salles.getAll()
      if (result?.success && result.salles) {
        setRooms(result.salles)
        
        // Find current room
        const myRoom = result.salles.find((room: Room) => room.activeUserId === user?.id)
        setCurrentRoom(myRoom || null)
      }
    } catch (error) {
      console.error('Error loading rooms:', error)
    }
  }

  const handleChangeRoom = async () => {
    if (!selectedRoom || !user) return

    const selectedRoomData = rooms.find(r => r.id === selectedRoom)
    if (!selectedRoomData) return

    // Check if room is occupied by another user
    if (selectedRoomData.activeUserId && selectedRoomData.activeUserId !== user.id) {
      alert(`❌ Cette salle est déjà occupée par ${selectedRoomData.activeUserName}`)
      return
    }

    setLoading(true)
    try {
      // Unlock current room if any
      if (currentRoom) {
        await window.electronAPI.db.salles.unlock(currentRoom.id)
      }

      // Lock new room
      const lockResult = await window.electronAPI.db.salles.lock(selectedRoomData.id, {
        userId: user.id,
        userName: user.name || user.email,
        userRole: user.role
      })

      if (lockResult?.success) {
        alert(`✅ Vous êtes maintenant dans ${selectedRoomData.name}`)
        onRoomChanged?.()
        onClose()
      } else {
        alert(`❌ Erreur: ${lockResult?.error || 'Impossible de changer de salle'}`)
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
      <div className="change-room-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🚪 Changer de Salle</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {currentRoom && (
            <div className="current-room-info">
              <span className="info-label">Salle actuelle:</span>
              <span className="current-room-name">{currentRoom.name}</span>
            </div>
          )}

          <div className="room-selection">
            <label>Sélectionnez une nouvelle salle:</label>
            <div className="room-list">
              {rooms.length === 0 ? (
                <p className="no-rooms">Aucune salle disponible</p>
              ) : (
                rooms.map(room => {
                  const isCurrentRoom = currentRoom?.id === room.id
                  const isOccupied = room.activeUserId && room.activeUserId !== user?.id
                  
                  return (
                    <div 
                      key={room.id}
                      className={`room-item ${selectedRoom === room.id ? 'selected' : ''} ${isCurrentRoom ? 'current' : ''} ${isOccupied ? 'occupied' : ''}`}
                      onClick={() => !isOccupied && setSelectedRoom(room.id)}
                      style={{ cursor: isOccupied ? 'not-allowed' : 'pointer' }}
                    >
                      <div className="room-name">
                        {room.name}
                        {isCurrentRoom && <span className="current-badge">Actuelle</span>}
                        {isOccupied && <span className="occupied-badge">Occupée</span>}
                      </div>
                      {isOccupied && (
                        <div className="room-user">
                          {room.activeUserName} ({room.activeUserRole === 'doctor' ? 'Médecin' : 'Assistant'})
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Annuler
          </button>
          <button 
            className="btn-change"
            onClick={handleChangeRoom}
            disabled={!selectedRoom || selectedRoom === currentRoom?.id || loading}
          >
            {loading ? 'Changement...' : 'Changer de Salle'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChangeRoomModal
