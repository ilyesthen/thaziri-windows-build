import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'

interface Honoraire {
  id: number
  actePratique: string
  honoraireEncaisser: number
  percentageAssistant1: number
  percentageAssistant2: number
}

interface HonorairesFormProps {
  honoraire: Honoraire | null
  onClose: () => void
  onSuccess: () => void
}

const HonorairesForm: React.FC<HonorairesFormProps> = ({ honoraire, onClose, onSuccess }) => {
  const [actePratique, setActePratique] = useState<string>('')
  const [honoraireEncaisser, setHonoraireEncaisser] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  const { user: currentUser } = useAuthStore()

  useEffect(() => {
    if (honoraire) {
      setActePratique(honoraire.actePratique)
      setHonoraireEncaisser(honoraire.honoraireEncaisser.toString())
    }
  }, [honoraire])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!actePratique.trim()) {
      setError('Le nom de l\'acte est obligatoire')
      return
    }

    if (!honoraireEncaisser.trim()) {
      setError('Le montant de l\'honoraire est obligatoire')
      return
    }

    setIsSubmitting(true)

    try {
      const data = {
        actePratique: actePratique.trim(),
        honoraireEncaisser: parseInt(honoraireEncaisser, 10),
        // Keep existing percentages if updating, use 0 for new entries
        percentageAssistant1: honoraire ? honoraire.percentageAssistant1 : 0,
        percentageAssistant2: honoraire ? honoraire.percentageAssistant2 : 0,
      }

      let result

      if (honoraire) {
        // Update existing
        result = await window.electronAPI.db.honoraires.update(
          { id: honoraire.id, ...data },
          currentUser?.id,
          currentUser?.role
        )
      } else {
        // Create new
        result = await window.electronAPI.db.honoraires.create(
          data,
          currentUser?.id,
          currentUser?.role
        )
      }

      if (result?.success) {
        onSuccess()
      } else {
        setError(result?.error || 'Échec de l\'opération')
      }
    } catch (err: any) {
      console.error('Error saving honoraire:', err)
      setError(err.message || 'Échec de l\'opération')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="honoraires-form">
      <h3>{honoraire ? 'Modifier l\'Acte' : 'Ajouter un Acte'}</h3>
      
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="actePratique">
            Acte Pratiqué <span className="required">*</span>
          </label>
          <input
            id="actePratique"
            type="text"
            value={actePratique}
            onChange={(e) => setActePratique(e.target.value)}
            placeholder="Ex: CONSULTATION +FO"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="honoraireEncaisser">
            Honoraire à Encaisser (DA) <span className="required">*</span>
          </label>
          <input
            id="honoraireEncaisser"
            type="number"
            value={honoraireEncaisser}
            onChange={(e) => setHonoraireEncaisser(e.target.value)}
            placeholder="Ex: 2000"
            min="0"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            onClick={onClose}
            disabled={isSubmitting}
            className="btn-cancel"
          >
            Annuler
          </button>
          <button 
            type="submit"
            disabled={isSubmitting}
            className="btn-submit"
          >
            {isSubmitting ? 'Enregistrement...' : (honoraire ? 'Mettre à jour' : 'Créer')}
          </button>
        </div>
      </form>
    </div>
  )
}

export default HonorairesForm
