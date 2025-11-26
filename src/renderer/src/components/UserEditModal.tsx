import React, { useState } from 'react'
import './UserEditModal.css'

interface User {
  id: number
  email: string
  name: string
  role: string
  defaultPercentage?: number | null
  createdAt: Date
  updatedAt: Date
}

interface UserEditModalProps {
  user: User
  onClose: () => void
  onUserUpdated: () => void
}

const UserEditModal: React.FC<UserEditModalProps> = ({ user, onClose, onUserUpdated }) => {
  const [name, setName] = useState<string>(user.name)
  const [newPassword, setNewPassword] = useState<string>('')
  const [role, setRole] = useState<string>(user.role)
  const [defaultPercentage, setDefaultPercentage] = useState<string>(
    user.defaultPercentage?.toString() || '0'
  )
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  // Check if selected role is assistant
  const isAssistantRole = role === 'assistant_1' || role === 'assistant_2'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!name) {
      setError('Le nom est requis')
      return
    }

    if (newPassword && newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setLoading(true)

    try {
      // Call IPC to update user, sending null for newPassword if not changed
      await window.electronAPI?.db.users.update({
        id: user.id,
        name,
        email: name.toLowerCase().replace(/\s+/g, ''), // Update email based on name
        newPassword: newPassword || null,
        role,
        defaultPercentage: isAssistantRole ? parseInt(defaultPercentage, 10) : null,
      })

      // Notify parent that user was updated
      onUserUpdated()
    } catch (err: any) {
      console.error('Failed to update user:', err)
      setError(err.message || 'Échec de la mise à jour de l\'utilisateur')
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Modifier Utilisateur</h3>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="edit-name">Nom</label>
            <input
              type="text"
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom Complet"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-password">Nouveau Mot de Passe (laisser vide pour conserver l'actuel)</label>
            <input
              type="password"
              id="edit-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Au moins 6 caractères"
              disabled={loading}
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-role">Rôle</label>
            <select
              id="edit-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={loading}
              required
            >
              <option value="nurse">Infirmière</option>
              <option value="doctor">Médecin</option>
              <option value="assistant_1">Assistant 1</option>
              <option value="assistant_2">Assistant 2</option>
            </select>
          </div>

          {isAssistantRole && (
            <div className="form-group">
              <label htmlFor="edit-percentage">Pourcentage par Défaut (%)</label>
              <input
                type="number"
                id="edit-percentage"
                value={defaultPercentage}
                onChange={(e) => setDefaultPercentage(e.target.value)}
                placeholder="0-100"
                min="0"
                max="100"
                disabled={loading}
              />
              <small className="form-help">
                Pourcentage utilisé pour calculer la quote-part de l'assistant
              </small>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Annuler
            </button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? 'Enregistrement...' : '💾 Enregistrer les Modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UserEditModal
