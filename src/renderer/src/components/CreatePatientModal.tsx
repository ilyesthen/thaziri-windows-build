import React, { useState } from 'react'
import './PatientModal.css'

interface CreatePatientModalProps {
  isOpen: boolean
  onClose: () => void
  onPatientCreated: () => void
}

const CreatePatientModal: React.FC<CreatePatientModalProps> = ({ isOpen, onClose, onPatientCreated }) => {
  // Form state - simplified to required fields only
  const [prenom, setPrenom] = useState('') // firstName
  const [nom, setNom] = useState('') // lastName
  const [age, setAge] = useState('') // age as number
  const [adresse, setAdresse] = useState('') // address
  const [telephone, setTelephone] = useState('') // phone
  const [autresInfos, setAutresInfos] = useState('') // general history / notes
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [duplicateWarning, setDuplicateWarning] = useState<any[]>([])

  // Client-side validation: check if required fields are filled
  const isFormValid = prenom.trim() !== '' && nom.trim() !== '' && age.trim() !== ''

  // Check for duplicates whenever first or last name changes
  React.useEffect(() => {
    const checkDuplicates = async () => {
      if (prenom.trim() && nom.trim()) {
        try {
          const searchQuery = `${prenom.trim()} ${nom.trim()}`
          const searchResults = await window.electronAPI.db.patients.search(searchQuery)
          
          if (searchResults?.success && searchResults.patients && searchResults.patients.length > 0) {
            const exactMatches = searchResults.patients.filter(
              (p: any) => {
                const firstMatch = p.firstName?.toLowerCase() === prenom.trim().toLowerCase()
                const lastMatch = p.lastName?.toLowerCase() === nom.trim().toLowerCase()
                return firstMatch && lastMatch
              }
            )
            
            if (exactMatches.length > 0) {
              setDuplicateWarning(exactMatches)
            } else {
              setDuplicateWarning([])
            }
          } else {
            setDuplicateWarning([])
          }
        } catch (err) {
          console.error('Error checking duplicates:', err)
        }
      } else {
        setDuplicateWarning([])
      }
    }

    // Debounce the duplicate check
    const timer = setTimeout(checkDuplicates, 500)
    return () => clearTimeout(timer)
  }, [prenom, nom])

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Client-side validation
    if (!prenom.trim() || !nom.trim() || !age.trim()) {
      setError('Le prénom, le nom et l\'âge sont obligatoires')
      return
    }

    // If duplicates exist, ask for confirmation
    if (duplicateWarning.length > 0) {
      const confirmed = window.confirm(
        `⚠️ ATTENTION: ${duplicateWarning.length} patient(s) avec le nom "${prenom} ${nom}" existe(s) déjà!\n\n` +
        duplicateWarning.map(p => `• ${p.firstName} ${p.lastName} - ${p.age} ans - Code: ${p.code}`).join('\n') +
        `\n\nVoulez-vous créer ce nouveau patient quand même?`
      )
      
      if (!confirmed) {
        return
      }
    }

    await createPatient()
  }

  const createPatient = async () => {
    setIsSubmitting(true)
    setError('')

    try {
      // Construct the data payload with only the new fields
      const newPatientData = {
        firstName: prenom.trim(),
        lastName: nom.trim(),
        age: age ? parseInt(age, 10) : undefined,
        address: adresse.trim() || undefined,
        phone: telephone.trim() || undefined,
        generalHistory: autresInfos.trim() || undefined,
      }

      // Call IPC API to create patient
      const result = await window.electronAPI.db.patients.create(newPatientData)

      if (result.success) {
        // Reset form
        setPrenom('')
        setNom('')
        setAge('')
        setAdresse('')
        setTelephone('')
        setAutresInfos('')
        setDuplicateWarning([])
        
        // Notify parent component of successful creation
        onPatientCreated()
        
        // Close modal
        onClose()
      } else {
        setError(result.error || 'Erreur lors de la création du patient')
      }
    } catch (err) {
      console.error('Erreur lors de la création du patient:', err)
      setError('Erreur lors de la création du patient')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Don't render if modal is not open
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>➕ Créer un Nouveau Patient</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit}>
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

            {duplicateWarning.length > 0 && (
              <div style={{ 
                padding: '12px', 
                marginBottom: '15px', 
                backgroundColor: '#fff3cd', 
                border: '2px solid #ffc107',
                borderRadius: '6px',
                color: '#856404'
              }}>
                <strong>⚠️ Attention:</strong> {duplicateWarning.length} patient(s) similaire(s) trouvé(s):
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                  {duplicateWarning.map((p: any) => (
                    <li key={p.id}>
                      {p.firstName} {p.lastName} - {p.age} ans - Code: {p.code}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="prenom">
                Prénom <span className="required">*</span>
              </label>
              <input
                id="prenom"
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Saisir le prénom"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="nom">
                Nom <span className="required">*</span>
              </label>
              <input
                id="nom"
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Saisir le nom"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="age">
                Âge <span className="required">*</span>
              </label>
              <input
                id="age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Saisir l'âge"
                min="0"
                max="150"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="adresse">
                Adresse
              </label>
              <input
                id="adresse"
                type="text"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                placeholder="Saisir l'adresse"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="telephone">
                Téléphone
              </label>
              <input
                id="telephone"
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="Saisir le numéro de téléphone"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="autresInfos">
                Autres informations
              </label>
              <textarea
                id="autresInfos"
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
                onClick={onClose}
                disabled={isSubmitting}
              >
                Annuler
              </button>
              <button 
                type="submit" 
                className="primary"
                disabled={!isFormValid || isSubmitting}
              >
                {isSubmitting ? 'Création...' : 'Créer le Patient'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CreatePatientModal
