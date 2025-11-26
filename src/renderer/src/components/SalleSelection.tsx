import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import './SalleSelection.css'

interface Salle {
  id: number
  name: string
  description?: string
  isActive: boolean
  activeUserId?: number | null
  activeUserName?: string | null
  activeUserRole?: string | null
  activeSessionName?: string | null
  lockedAt?: string | null
}

interface SalleSelectionProps {
  onSalleSelected: (salleId: number) => void
  userName: string
  user: {
    id: number
    name: string
    role: string
    email: string
  }
}

const SalleSelection: React.FC<SalleSelectionProps> = ({ onSalleSelected, userName, user: propUser }) => {
  const { sessionName } = useAuthStore()
  const [salles, setSalles] = useState<Salle[]>([])
  const [selectedSalleId, setSelectedSalleId] = useState<number | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const [warningMessage, setWarningMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  
  // Use the prop user instead of store user (since selection happens before login)
  const user = propUser

  useEffect(() => {
    // Initial load
    loadActiveSalles()
    
    // Refresh every 5 seconds to show real-time lock status
    const interval = setInterval(loadActiveSalles, 5000)
    return () => clearInterval(interval)
  }, [])

  // Force refresh when user changes (e.g., new login)
  useEffect(() => {
    if (user) {
      loadActiveSalles()
    }
  }, [user.id])

  const loadActiveSalles = async () => {
    try {
      setLoading(true)
      console.log('🔄 Loading active salles for user:', user?.id, user?.name)
      const result = await window.electronAPI?.db.salles.getActive()
      console.log('📊 Salles loaded:', result)
      
      if (result?.success) {
        setSalles(result.salles || [])
        // Log which salles are locked and by whom
        result.salles?.forEach((salle: Salle) => {
          if (salle.activeUserId) {
            console.log(`🔒 Salle "${salle.name}" is locked by user ${salle.activeUserId} (${salle.activeUserName})`)
          } else {
            console.log(`✅ Salle "${salle.name}" is available`)
          }
        })
        // Auto-select if only one salle
        if (result.salles && result.salles.length === 1) {
          setSelectedSalleId(result.salles[0].id)
        }
      } else {
        setError('Erreur de chargement des salles')
      }
    } catch (err) {
      console.error('Failed to load salles:', err)
      setError('Erreur de chargement des salles')
    } finally {
      setLoading(false)
    }
  }

  const handleSalleClick = (salle: Salle) => {
    setSelectedSalleId(salle.id)
    setError('')
    setShowWarning(false)
    
    // Check if salle is locked by someone else - show warning but allow entry
    if (salle.activeUserId && salle.activeUserId !== user?.id) {
      setShowWarning(true)
      const activeName = salle.activeSessionName || salle.activeUserName || 'Un autre utilisateur'
      setWarningMessage(
        `⚠️ Cette salle est actuellement utilisée par ${activeName}. ` +
        `Vous pouvez quand même y entrer et vous travaillerez tous les deux ensemble sur les mêmes données.`
      )
    } else {
      setShowWarning(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedSalleId) {
      setError('Veuillez sélectionner une salle')
      return
    }

    const selectedSalle = salles.find(s => s.id === selectedSalleId)
    if (!selectedSalle) return

    // Lock the salle (even if already locked by someone else, both can work together)
    try {
      console.log('Attempting to lock salle:', selectedSalleId)
      console.log('User:', user)
      console.log('Session name:', sessionName)
      
      if (!user) {
        setError('Utilisateur non trouvé')
        return
      }
      
      const lockData = {
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        sessionName: sessionName || user.name
      }
      
      console.log('Lock data:', lockData)
      
      const result = await window.electronAPI.db.salles.lock(selectedSalleId, lockData)

      console.log('Lock result:', result)

      if (result.success) {
        onSalleSelected(selectedSalleId)
      } else {
        console.error('Lock failed with error:', result.error)
        setError(`Erreur lors du verrouillage de la salle: ${result.error || 'Erreur inconnue'}`)
      }
    } catch (err) {
      console.error('Failed to lock salle:', err)
      setError(`Erreur lors du verrouillage de la salle: ${err}`)
    }
  }

  const getSalleStatusLabel = (salle: Salle) => {
    if (!salle.activeUserId) {
      return { text: 'Disponible', className: 'status-available' }
    }
    
    if (salle.activeUserId === user?.id) {
      return { text: 'Vous utilisez actuellement', className: 'status-yours' }
    }
    
    return { 
      text: `Utilisée par ${salle.activeSessionName || salle.activeUserName}`, 
      className: 'status-locked' 
    }
  }

  if (loading) {
    return (
      <div className="salle-selection-container">
        <div className="salle-selection-card">
          <div className="loading-spinner"></div>
          <p>Chargement des salles...</p>
        </div>
      </div>
    )
  }

  if (salles.length === 0) {
    return (
      <div className="salle-selection-container">
        <div className="salle-selection-card">
          <h2>Aucune salle disponible</h2>
          <p className="error-message">
            Aucune salle active n'est configurée. Veuillez contacter l'administrateur.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="salle-selection-container">
      <div className="salle-selection-card">
        <h2>Bienvenue, {userName}</h2>
        <p className="salle-subtitle">Sélectionnez votre salle de travail</p>

        {error && <div className="error-message">{error}</div>}

        {showWarning && (
          <div className="warning-message">
            <div className="warning-icon">⚠️</div>
            <div className="warning-content">
              <strong>Mode visualisation uniquement</strong>
              <p>{warningMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="salles-grid">
            {salles.map((salle) => {
              const status = getSalleStatusLabel(salle)
              const isSelected = selectedSalleId === salle.id
              const isLocked = salle.activeUserId && salle.activeUserId !== user?.id
              
              return (
                <button
                  key={salle.id}
                  type="button"
                  className={`salle-option ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
                  onClick={() => handleSalleClick(salle)}
                >
                  <div style={{ flex: 1 }}>
                    <div className="salle-option-name">{salle.name}</div>
                    {salle.description && (
                      <div className="salle-option-description">{salle.description}</div>
                    )}
                    <div className={`salle-option-status ${status.className}`}>
                      {status.text}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="salle-option-checkmark">✓</div>
                  )}
                  {isLocked && (
                    <div className="salle-lock-icon">🔒</div>
                  )}
                </button>
              )
            })}
          </div>

          <button 
            type="submit" 
            className="salle-submit-btn"
            disabled={!selectedSalleId}
          >
            Confirmer la sélection
          </button>
        </form>
      </div>
    </div>
  )
}

export default SalleSelection
