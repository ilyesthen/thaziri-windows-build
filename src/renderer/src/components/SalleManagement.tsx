import React, { useState, useEffect } from 'react'
import './SalleManagement.css'

interface Salle {
  id: number
  name: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const SalleManagement: React.FC = () => {
  const [salles, setSalles] = useState<Salle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingSalle, setEditingSalle] = useState<Salle | null>(null)
  
  // Form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')

  useEffect(() => {
    loadSalles()
  }, [])

  const loadSalles = async () => {
    try {
      setLoading(true)
      const result = await window.electronAPI?.db.salles.getAll()
      
      if (result?.success) {
        setSalles(result.salles || [])
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

  const handleCreateSalle = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formName.trim()) {
      setError('Le nom de la salle est requis')
      return
    }

    try {
      const result = await window.electronAPI?.db.salles.create({
        name: formName.trim(),
        description: formDescription.trim() || undefined
      })

      if (result?.success) {
        await loadSalles()
        setShowCreateForm(false)
        setFormName('')
        setFormDescription('')
        setError('')
      } else {
        setError(result?.error || 'Erreur de création')
      }
    } catch (err) {
      console.error('Failed to create salle:', err)
      setError('Erreur de création de la salle')
    }
  }

  const handleUpdateSalle = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingSalle || !formName.trim()) {
      setError('Le nom de la salle est requis')
      return
    }

    try {
      const result = await window.electronAPI?.db.salles.update(editingSalle.id, {
        name: formName.trim(),
        description: formDescription.trim() || undefined
      })

      if (result?.success) {
        await loadSalles()
        setEditingSalle(null)
        setFormName('')
        setFormDescription('')
        setError('')
      } else {
        setError(result?.error || 'Erreur de mise à jour')
      }
    } catch (err) {
      console.error('Failed to update salle:', err)
      setError('Erreur de mise à jour de la salle')
    }
  }

  const handleToggleActive = async (salle: Salle) => {
    try {
      const result = await window.electronAPI?.db.salles.update(salle.id, {
        isActive: !salle.isActive
      })

      if (result?.success) {
        await loadSalles()
      } else {
        setError(result?.error || 'Erreur de mise à jour')
      }
    } catch (err) {
      console.error('Failed to toggle salle active:', err)
      setError('Erreur de mise à jour de la salle')
    }
  }

  const handleDeleteSalle = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette salle ?')) {
      return
    }

    try {
      const result = await window.electronAPI?.db.salles.delete(id)

      if (result?.success) {
        await loadSalles()
        setError('')
      } else {
        setError(result?.error || 'Erreur de suppression')
      }
    } catch (err) {
      console.error('Failed to delete salle:', err)
      setError('Erreur de suppression de la salle')
    }
  }

  const startEdit = (salle: Salle) => {
    setEditingSalle(salle)
    setFormName(salle.name)
    setFormDescription(salle.description || '')
    setShowCreateForm(false)
  }

  const cancelForm = () => {
    setShowCreateForm(false)
    setEditingSalle(null)
    setFormName('')
    setFormDescription('')
    setError('')
  }

  if (loading) {
    return (
      <div className="salle-management">
        <div className="loading-spinner"></div>
        <p>Chargement des salles...</p>
      </div>
    )
  }

  return (
    <div className="salle-management">
      <div className="salle-management-header">
        <h2>Gestion des Salles</h2>
        <button 
          className="btn-create-salle"
          onClick={() => {
            setShowCreateForm(true)
            setEditingSalle(null)
            setFormName('')
            setFormDescription('')
          }}
        >
          Nouvelle Salle
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {(showCreateForm || editingSalle) && (
        <div className="salle-form-card">
          <h3>{editingSalle ? 'Modifier la Salle' : 'Créer une Nouvelle Salle'}</h3>
          <form onSubmit={editingSalle ? handleUpdateSalle : handleCreateSalle}>
            <div className="form-group">
              <label>Nom de la Salle *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Salle 1, Cabinet A"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Description (optionnel)</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Informations supplémentaires..."
                rows={3}
              />
            </div>

            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={cancelForm}>
                Annuler
              </button>
              <button type="submit" className="btn-submit">
                {editingSalle ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="salles-list">
        {salles.length === 0 ? (
          <div className="empty-state">
            <p>Aucune salle créée. Cliquez sur "Nouvelle Salle" pour commencer.</p>
          </div>
        ) : (
          <div className="salles-grid">
            {salles.map((salle) => (
              <div key={salle.id} className={`salle-card ${!salle.isActive ? 'inactive' : ''}`}>
                <div className="salle-card-header">
                  <div className="salle-card-title">{salle.name}</div>
                  <div className={`salle-status ${salle.isActive ? 'active' : 'inactive'}`}>
                    {salle.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
                
                {salle.description && (
                  <div className="salle-card-description">{salle.description}</div>
                )}

                <div className="salle-card-actions">
                  <button 
                    className="btn-action btn-edit"
                    onClick={() => startEdit(salle)}
                    title="Modifier"
                  >
                    Modifier
                  </button>
                  <button 
                    className="btn-action btn-toggle"
                    onClick={() => handleToggleActive(salle)}
                    title={salle.isActive ? 'Désactiver' : 'Activer'}
                  >
                    {salle.isActive ? 'Désactiver' : 'Activer'}
                  </button>
                  <button 
                    className="btn-action btn-delete"
                    onClick={() => handleDeleteSalle(salle.id)}
                    title="Supprimer"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SalleManagement
