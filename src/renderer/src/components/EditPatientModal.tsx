import React, { useState, useEffect } from 'react'
import './PatientModal.css'

interface Patient {
  id: number
  firstName: string
  lastName: string
  age?: number
  gender?: string
  address?: string
  phone?: string
  generalHistory?: string
}

interface EditPatientModalProps {
  patient: Patient
  isOpen: boolean
  onClose: () => void
  onPatientUpdated: () => void
}

const EditPatientModal: React.FC<EditPatientModalProps> = ({ patient, isOpen, onClose, onPatientUpdated }) => {
  // Pre-filled form state
  const [prenom, setPrenom] = useState<string>(patient.firstName)
  const [nom, setNom] = useState<string>(patient.lastName)
  const [age, setAge] = useState<string>(patient.age?.toString() || '')
  const [adresse, setAdresse] = useState<string>(patient.address || '')
  const [telephone, setTelephone] = useState<string>(patient.phone || '')
  const [autresInfos, setAutresInfos] = useState<string>(patient.generalHistory || '')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [hasChanges, setHasChanges] = useState<boolean>(false)
  const [shouldCloseAfterSave, setShouldCloseAfterSave] = useState<boolean>(false)

  // Update form when patient changes
  useEffect(() => {
    setPrenom(patient.firstName)
    setNom(patient.lastName)
    setAge(patient.age?.toString() || '')
    setAdresse(patient.address || '')
    setTelephone(patient.phone || '')
    setAutresInfos(patient.generalHistory || '')
  }, [patient])

  // Track changes
  React.useEffect(() => {
    const changed = 
      prenom !== patient.firstName ||
      nom !== patient.lastName ||
      age !== (patient.age?.toString() || '') ||
      adresse !== (patient.address || '') ||
      telephone !== (patient.phone || '') ||
      autresInfos !== (patient.generalHistory || '')
    setHasChanges(changed)
  }, [prenom, nom, age, adresse, telephone, autresInfos, patient])

  // Client-side validation
  const isFormValid = prenom.trim() !== '' && nom.trim() !== ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    // Client-side validation
    if (!prenom.trim() || !nom.trim()) {
      setError('Le prénom et le nom sont obligatoires')
      return
    }

    setIsSubmitting(true)

    try {
      // Package form data with patient ID for update
      const updateData = {
        id: patient.id,
        firstName: prenom.trim(),
        lastName: nom.trim(),
        age: age ? parseInt(age, 10) : undefined,
        address: adresse.trim() || undefined,
        phone: telephone.trim() || undefined,
        generalHistory: autresInfos.trim() || undefined,
      }

      // Call IPC API to update patient
      const result = await window.electronAPI?.db.patients.update(updateData)

      if (result?.success) {
        // Show success message and notify parent
        setSuccessMessage('✅ Patient mis à jour avec succès!')
        setHasChanges(false)
        onPatientUpdated()
        
        // If user wanted to close after save, do it now
        if (shouldCloseAfterSave) {
          setTimeout(() => onClose(), 500)
        } else {
          // Clear success message after 3 seconds
          setTimeout(() => setSuccessMessage(''), 3000)
        }
      } else {
        setError(result?.error || 'Erreur lors de la mise à jour du patient')
      }
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour du patient:', err)
      setError(err.message || 'Erreur lors de la mise à jour du patient')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle close with unsaved changes check
  const handleClose = () => {
    if (hasChanges) {
      const confirmClose = window.confirm(
        'Vous avez des modifications non enregistrées. Voulez-vous enregistrer avant de quitter?'
      )
      if (confirmClose) {
        // User wants to save then close
        setShouldCloseAfterSave(true)
        const form = document.querySelector('form')
        if (form) {
          form.requestSubmit()
        }
        // Don't close yet, wait for save to complete
        return
      }
      // User wants to discard changes
      const confirmDiscard = window.confirm(
        'Êtes-vous sûr de vouloir quitter sans enregistrer?'
      )
      if (!confirmDiscard) return
    }
    onClose()
  }

  // Don't render if modal is not open
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✏️ Modifier le Patient</h2>
          <button className="modal-close-btn" onClick={handleClose}>✕</button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            {successMessage && (
              <div style={{ 
                padding: '12px', 
                background: '#d4edda',
                color: '#155724',
                borderRadius: '8px',
                marginBottom: '16px',
                border: '1px solid #c3e6cb'
              }}>
                {successMessage}
              </div>
            )}
            {error && (
              <div style={{ 
                padding: '10px', 
                marginBottom: '15px', 
                backgroundColor: '#fee', 
                border: '1px solid #fcc',
                borderRadius: '4px',
                color: '#c00'
              }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="edit-prenom">
                Prénom <span className="required">*</span>
              </label>
              <input
                id="edit-prenom"
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Saisir le prénom"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-nom">
                Nom <span className="required">*</span>
              </label>
              <input
                id="edit-nom"
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Saisir le nom"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-age">
                Âge
              </label>
              <input
                id="edit-age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Saisir l'âge"
                min="0"
                max="150"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-adresse">
                Adresse
              </label>
              <input
                id="edit-adresse"
                type="text"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                placeholder="Saisir l'adresse"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-telephone">
                Téléphone
              </label>
              <input
                id="edit-telephone"
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="Saisir le numéro de téléphone"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-autresInfos">
                Autres informations
              </label>
              <textarea
                id="edit-autresInfos"
                value={autresInfos}
                onChange={(e) => setAutresInfos(e.target.value)}
                placeholder="Saisir des informations supplémentaires..."
                rows={4}
                disabled={isSubmitting}
              />
            </div>

            <div className="modal-actions">
              <button 
                type="button" 
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Quitter
              </button>
              <button 
                type="submit" 
                className="primary"
                disabled={!isFormValid || isSubmitting}
              >
                {isSubmitting ? 'Mise à jour...' : '💾 Mettre à Jour'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EditPatientModal
