import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import HonorairesForm from './HonorairesForm'
import './HonorairesModal.css'

interface Honoraire {
  id: number
  actePratique: string
  honoraireEncaisser: number
  percentageAssistant1: number
  percentageAssistant2: number
}

interface HonorairesModalProps {
  isOpen: boolean
  onClose: () => void
}

const HonorairesModal: React.FC<HonorairesModalProps> = ({ isOpen, onClose }) => {
  const [honoraires, setHonoraires] = useState<Honoraire[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [showForm, setShowForm] = useState<boolean>(false)
  const [editingHonoraire, setEditingHonoraire] = useState<Honoraire | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [assistant1Percentage, setAssistant1Percentage] = useState<number>(0)
  const [assistant2Percentage, setAssistant2Percentage] = useState<number>(0)
  
  const { user: currentUser } = useAuthStore()

  useEffect(() => {
    if (isOpen) {
      fetchHonoraires()
      fetchAssistantPercentages()
    }
  }, [isOpen])

  const fetchAssistantPercentages = async () => {
    try {
      const users = await window.electronAPI?.db.users.getAll()
      if (users) {
        const assistant1 = users.find((u: any) => u.role === 'assistant_1')
        const assistant2 = users.find((u: any) => u.role === 'assistant_2')
        setAssistant1Percentage(assistant1?.defaultPercentage || 0)
        setAssistant2Percentage(assistant2?.defaultPercentage || 0)
      }
    } catch (err) {
      console.error('Error fetching assistant percentages:', err)
    }
  }

  const fetchHonoraires = async () => {
    setLoading(true)
    setError('')
    
    try {
      const result = await window.electronAPI.db.honoraires.getAll()
      
      if (result?.success) {
        setHonoraires(result.honoraires || [])
      } else {
        setError(result?.error || 'Échec du chargement des honoraires')
      }
    } catch (err: any) {
      console.error('Error fetching honoraires:', err)
      setError(err.message || 'Échec du chargement des honoraires')
    } finally {
      setLoading(false)
    }
  }

  const handleAddNew = () => {
    setEditingHonoraire(null)
    setShowForm(true)
  }

  const handleEdit = () => {
    if (!selectedId) {
      alert('Veuillez sélectionner un acte à modifier')
      return
    }
    const honoraire = honoraires.find(h => h.id === selectedId)
    if (honoraire) {
      setEditingHonoraire(honoraire)
      setShowForm(true)
    }
  }

  const handleDelete = async () => {
    if (!selectedId) {
      alert('Veuillez sélectionner un acte à supprimer')
      return
    }
    
    const honoraire = honoraires.find(h => h.id === selectedId)
    if (!honoraire) return
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'acte "${honoraire.actePratique}" ?`)) {
      return
    }

    try {
      const result = await window.electronAPI.db.honoraires.delete(
        selectedId,
        currentUser?.id,
        currentUser?.role
      )
      
      if (result?.success) {
        setSelectedId(null)
        fetchHonoraires()
      } else {
        alert(`Erreur : ${result?.error || 'Échec de la suppression'}`)
      }
    } catch (err: any) {
      console.error('Error deleting honoraire:', err)
      alert(`Erreur : ${err.message}`)
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingHonoraire(null)
    fetchHonoraires()
  }

  // Check if current user can edit (doctor, assistant_1, assistant_2)
  const canEdit = ['doctor', 'assistant_1', 'assistant_2'].includes(currentUser?.role || '')
  
  // Nurse can only view, not edit
  const isNurse = currentUser?.role === 'nurse'

  // Determine which columns to show based on role
  const isDoctor = currentUser?.role === 'doctor'
  const isAssistant1 = currentUser?.role === 'assistant_1'
  const isAssistant2 = currentUser?.role === 'assistant_2'

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="honoraires-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>💰 Gestion des Honoraires</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {!showForm && (
            <>
              {canEdit && (
                <div className="honoraires-actions">
                  <button 
                    className="btn-add-honoraire"
                    onClick={handleAddNew}
                  >
                    ➕ Ajouter un Acte
                  </button>
                  <button 
                    className="btn-edit-honoraire"
                    onClick={handleEdit}
                    disabled={!selectedId}
                  >
                    ✏️ Modifier
                  </button>
                  <button 
                    className="btn-delete-honoraire"
                    onClick={handleDelete}
                    disabled={!selectedId}
                  >
                    🗑️ Supprimer
                  </button>
                </div>
              )}

              {loading ? (
                <div className="loading-message">Chargement...</div>
              ) : (
                <div className="honoraires-table-container">
                  <table className="honoraires-table">
                    <thead>
                      <tr>
                        {canEdit && <th style={{ width: '40px' }}>Sélection</th>}
                        <th>Acte Pratiqué</th>
                        <th>Honoraire à Encaisser</th>
                        {(isAssistant1 || isNurse) && <th>Quote-part Assistant 1</th>}
                        {(isAssistant2 || isNurse) && <th>Quote-part Assistant 2</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {honoraires.length === 0 ? (
                        <tr>
                          <td colSpan={canEdit ? 5 : 4} style={{ textAlign: 'center', padding: '20px' }}>
                            Aucun acte trouvé
                          </td>
                        </tr>
                      ) : (
                        honoraires.map((honoraire) => {
                          const quotePart1 = Math.round(
                            (honoraire.honoraireEncaisser * assistant1Percentage) / 100
                          )
                          const quotePart2 = Math.round(
                            (honoraire.honoraireEncaisser * assistant2Percentage) / 100
                          )

                          return (
                            <tr 
                              key={honoraire.id}
                              className={selectedId === honoraire.id ? 'selected-row' : ''}
                              onClick={() => canEdit && setSelectedId(honoraire.id)}
                              style={{ cursor: canEdit ? 'pointer' : 'default' }}
                            >
                              {canEdit && (
                                <td className="selection-cell">
                                  <input
                                    type="radio"
                                    name="selectedHonoraire"
                                    checked={selectedId === honoraire.id}
                                    onChange={() => setSelectedId(honoraire.id)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </td>
                              )}
                              <td>{honoraire.actePratique}</td>
                              <td className="amount">{honoraire.honoraireEncaisser.toLocaleString()} DA</td>
                              {(isAssistant1 || isNurse) && (
                                <td className="amount">
                                  {quotePart1.toLocaleString()} DA
                                </td>
                              )}
                              {(isAssistant2 || isNurse) && (
                                <td className="amount">
                                  {quotePart2.toLocaleString()} DA
                                </td>
                              )}
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {showForm && (
            <HonorairesForm
              honoraire={editingHonoraire}
              onClose={handleFormClose}
              onSuccess={handleFormClose}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default HonorairesModal
