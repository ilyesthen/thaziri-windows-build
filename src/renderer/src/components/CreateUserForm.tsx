import React, { useState } from 'react'
import './CreateUserForm.css'

interface CreateUserFormProps {
  onUserCreated: () => void
}

const CreateUserForm: React.FC<CreateUserFormProps> = ({ onUserCreated }) => {
  const [name, setName] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [role, setRole] = useState<string>('nurse')
  const [defaultPercentage, setDefaultPercentage] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!name || !password) {
      setError('Tous les champs sont requis')
      return
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    // Validate percentage for assistants
    if ((role === 'assistant_1' || role === 'assistant_2') && (defaultPercentage < 0 || defaultPercentage > 100)) {
      setError('Le pourcentage doit être entre 0 et 100')
      return
    }

    setLoading(true)

    try {
      // Call IPC to create user with hashed password
      // Use name as email (can be updated later if needed)
      const userData = {
        name,
        email: name.toLowerCase().replace(/\s+/g, ''), // Generate email from name
        password,
        role,
        defaultPercentage: (role === 'assistant_1' || role === 'assistant_2') ? defaultPercentage : null,
      }
      
      console.log('Creating user with data:', userData)
      
      const result = await window.electronAPI?.db.users.create(userData)
      
      console.log('User creation result:', result)

      // Reset form
      setName('')
      setPassword('')
      setRole('nurse')
      setDefaultPercentage(0)

      console.log('Calling onUserCreated callback')
      // Notify parent to re-fetch users
      onUserCreated()
      
      console.log('User created successfully!')
    } catch (err: any) {
      console.error('Failed to create user:', err)
      setError(err.message || 'Échec de création de l\'utilisateur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="create-user-form">
      <h3>Créer un Nouvel Utilisateur</h3>
      
      {error && <div className="form-error">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="name">Nom</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom Complet"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de Passe</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Au moins 6 caractères"
              disabled={loading}
              minLength={6}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Rôle</label>
            <select
              id="role"
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

          {(role === 'assistant_1' || role === 'assistant_2') && (
            <div className="form-group">
              <label htmlFor="percentage">Pourcentage par Défaut (%)</label>
              <input
                type="number"
                id="percentage"
                value={defaultPercentage}
                onChange={(e) => setDefaultPercentage(Number(e.target.value))}
                placeholder="0-100"
                min="0"
                max="100"
                disabled={loading}
                required
              />
            </div>
          )}

          <div className="form-group">
            <button type="submit" className="btn-create" disabled={loading}>
              {loading ? 'Création...' : '➕ Créer Utilisateur'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default CreateUserForm
