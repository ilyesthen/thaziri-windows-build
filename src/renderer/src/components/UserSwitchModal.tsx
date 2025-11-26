import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import './UserSwitchModal.css'

interface User {
  id: number
  email: string
  name: string
  role: string
  defaultPercentage?: number
}

interface UserSwitchModalProps {
  isOpen: boolean
  onClose: () => void
  onUserSwitched?: () => void
}

const UserSwitchModal: React.FC<UserSwitchModalProps> = ({ isOpen, onClose, onUserSwitched }) => {
  const { user: currentUser, logout, login } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [password, setPassword] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (isOpen) {
      loadUsers()
    }
  }, [isOpen])

  const loadUsers = async () => {
    try {
      const result = await window.electronAPI?.auth.getUsersForLogin()
      if (result) {
        // Filter out admin users and the current user
        const filteredUsers = result.filter((user: User) => 
          user.role !== 'admin' && user.id !== currentUser?.id
        )
        setUsers(filteredUsers)
      }
    } catch (error) {
      console.error('Error loading users:', error)
      setError('Erreur lors du chargement des utilisateurs')
    }
  }

  const handleSwitchUser = async () => {
    if (!selectedUserId || !password.trim()) {
      setError('Veuillez sélectionner un utilisateur et entrer le mot de passe')
      return
    }

    const selectedUser = users.find(u => u.id === selectedUserId)
    if (!selectedUser) {
      setError('Utilisateur sélectionné non trouvé')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Verify credentials with the selected user
      const result = await window.electronAPI?.auth.verifyCredentials(
        selectedUser.email, 
        password
      )

      if (result?.success && result.user) {
        const user = result.user
        
        // Logout current user first
        logout()
        
        // Handle different user types with the same flow as Login component
        if (user.role === 'assistant_1' || user.role === 'assistant_2') {
          // For assistant templates, redirect to login page to handle:
          // template → assistant name prompt → salle selection → login
          window.location.href = '/'
          return
        }
        
        if (user.role === 'doctor') {
          // For doctors, redirect to login page to handle salle selection
          window.location.href = '/'
          return
        }
        
        // For nurses and admins, login directly (no salle selection needed)
        if (user.role === 'nurse' || user.role === 'admin') {
          login(user)
          
          // Start broadcasting user presence on the network
          try {
            const networkAPI = (window.electronAPI as any)?.network
            if (networkAPI) {
              await networkAPI.startBroadcasting({
                userId: user.id,
                username: user.name,
                role: user.role
              })
              console.log('Started broadcasting user presence')
            }
          } catch (broadcastErr) {
            console.error('Failed to start network broadcast:', broadcastErr)
            // Don't fail the switch if broadcast fails
          }
          
          // Reload the page to refresh everything
          window.location.reload()
        }
        
        onUserSwitched?.()
        onClose()
      } else {
        setError('Mot de passe incorrect pour cet utilisateur')
      }
    } catch (error: any) {
      console.error('Error switching user:', error)
      setError('Erreur lors du changement d\'utilisateur: ' + (error.message || 'Erreur inconnue'))
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedUserId(null)
    setPassword('')
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="user-switch-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>👤 Changer d'Utilisateur</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="current-user-info">
            <span className="info-label">Utilisateur actuel:</span>
            <span className="current-user-name">
              {currentUser?.name} ({currentUser?.role === 'doctor' ? 'Médecin' : 
                currentUser?.role === 'nurse' ? 'Infirmière' : 
                currentUser?.role === 'assistant_1' ? 'Assistant 1' :
                currentUser?.role === 'assistant_2' ? 'Assistant 2' : 'Admin'})
            </span>
          </div>

          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          <div className="user-selection">
            <label>Sélectionnez un utilisateur:</label>
            <div className="user-list">
              {users.length === 0 ? (
                <p className="no-users">Aucun autre utilisateur disponible</p>
              ) : (
                users.map(user => (
                  <div 
                    key={user.id}
                    className={`user-item ${selectedUserId === user.id ? 'selected' : ''}`}
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <div className="user-name">
                      {user.name}
                    </div>
                    <div className="user-role">
                      {user.role === 'doctor' ? 'Médecin' : 
                       user.role === 'nurse' ? 'Infirmière' : 
                       user.role === 'assistant_1' ? 'Assistant 1' :
                       user.role === 'assistant_2' ? 'Assistant 2' : user.role}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {selectedUserId && (
            <div className="password-section">
              <label htmlFor="switch-password">Mot de passe de l'utilisateur sélectionné:</label>
              <input
                type="password"
                id="switch-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Entrez le mot de passe"
                disabled={loading}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSwitchUser()
                  }
                }}
              />
              <small className="password-help">
                Entrez le mot de passe de {users.find(u => u.id === selectedUserId)?.name}
              </small>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={handleClose} disabled={loading}>
            Annuler
          </button>
          <button 
            className="btn-switch"
            onClick={handleSwitchUser}
            disabled={!selectedUserId || !password.trim() || loading}
          >
            {loading ? 'Changement...' : '🔄 Changer d\'Utilisateur'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UserSwitchModal
