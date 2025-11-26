import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import './PaymentValidationModal.css'

interface Honoraire {
  id: number
  actePratique: string
  honoraireEncaisser: number
}

interface SelectedAct {
  honoraireId: number
  actePratique: string
  montant: number
  customMontant?: number // Optional custom price for this instance
}

interface PaymentValidationModalProps {
  isOpen: boolean
  onClose: () => void
  onValidate: (selectedActs: SelectedAct[], totalAmount: number) => Promise<void>
  patientId?: string
  patientName?: string
}

const PaymentValidationModal: React.FC<PaymentValidationModalProps> = ({
  isOpen,
  onClose,
  onValidate,
  patientId,
  patientName
}) => {
  const [honoraires, setHonoraires] = useState<Honoraire[]>([])
  const [selectedActs, setSelectedActs] = useState<Map<number, SelectedAct>>(new Map())
  const [loading, setLoading] = useState(false)
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null)
  const [tempPrice, setTempPrice] = useState<string>('')
  const { user } = useAuthStore()

  useEffect(() => {
    if (isOpen) {
      fetchHonoraires()
    }
  }, [isOpen])

  const fetchHonoraires = async () => {
    try {
      const result = await window.electronAPI.db.honoraires.getAll()
      if (result?.success) {
        setHonoraires(result.honoraires || [])
      }
    } catch (err) {
      console.error('Error fetching honoraires:', err)
    }
  }

  const toggleActSelection = (honoraire: Honoraire) => {
    const newSelected = new Map(selectedActs)
    
    if (newSelected.has(honoraire.id)) {
      newSelected.delete(honoraire.id)
    } else {
      newSelected.set(honoraire.id, {
        honoraireId: honoraire.id,
        actePratique: honoraire.actePratique,
        montant: honoraire.honoraireEncaisser
      })
    }
    
    setSelectedActs(newSelected)
  }

  const handlePriceClick = (honoraireId: number, currentPrice: number) => {
    setEditingPriceId(honoraireId)
    setTempPrice(currentPrice.toString())
  }

  const handlePriceChange = (honoraireId: number) => {
    const newPrice = parseFloat(tempPrice)
    if (isNaN(newPrice) || newPrice < 0) {
      setEditingPriceId(null)
      setTempPrice('')
      return
    }

    const newSelected = new Map(selectedActs)
    const act = newSelected.get(honoraireId)
    if (act) {
      act.customMontant = newPrice
      newSelected.set(honoraireId, act)
      setSelectedActs(newSelected)
    }
    
    setEditingPriceId(null)
    setTempPrice('')
  }

  const getTotalAmount = () => {
    let total = 0
    selectedActs.forEach(act => {
      total += act.customMontant || act.montant
    })
    return total
  }

  const handleValidate = async () => {
    if (selectedActs.size === 0) {
      alert('Veuillez sélectionner au moins un acte')
      return
    }

    setLoading(true)
    try {
      const acts = Array.from(selectedActs.values())
      const totalAmount = getTotalAmount()
      
      await onValidate(acts, totalAmount)
      
      // Reset and close
      setSelectedActs(new Map())
      onClose()
    } catch (error) {
      console.error('Error validating payment:', error)
      alert('Erreur lors de la validation du paiement')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setSelectedActs(new Map())
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="payment-modal-overlay" onClick={handleCancel}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="payment-modal-header">
          <h2>💰 Validation du Paiement</h2>
          <button className="payment-close-btn" onClick={handleCancel}>✖</button>
        </div>

        <div className="payment-modal-body">
          {patientName && (
            <div className="payment-patient-info">
              <strong>Patient:</strong> {patientName}
            </div>
          )}

          <p className="payment-instruction">
            Sélectionnez les actes effectués pour ce patient :
          </p>
          
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
            💡 Cliquez sur le montant d'un acte sélectionné pour modifier son prix
          </p>

          <div className="payment-acts-table">
            <table>
              <thead>
                <tr>
                  <th>Sélection</th>
                  <th>Acte Pratiqué</th>
                  <th>Montant (DA)</th>
                </tr>
              </thead>
              <tbody>
                {honoraires.map((honoraire) => (
                  <tr
                    key={honoraire.id}
                    className={selectedActs.has(honoraire.id) ? 'selected' : ''}
                    onClick={() => toggleActSelection(honoraire)}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedActs.has(honoraire.id)}
                        onChange={() => {}}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td>{honoraire.actePratique}</td>
                    <td onClick={() => {
                      if (selectedActs.has(honoraire.id)) {
                        const currentPrice = selectedActs.get(honoraire.id)?.customMontant || honoraire.honoraireEncaisser
                        handlePriceClick(honoraire.id, currentPrice)
                      }
                    }} style={{ cursor: selectedActs.has(honoraire.id) ? 'pointer' : 'default' }}>
                      {editingPriceId === honoraire.id ? (
                        <input
                          type="number"
                          value={tempPrice}
                          onChange={(e) => setTempPrice(e.target.value)}
                          onBlur={() => handlePriceChange(honoraire.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handlePriceChange(honoraire.id)
                            } else if (e.key === 'Escape') {
                              setEditingPriceId(null)
                              setTempPrice('')
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '100px',
                            padding: '2px 4px',
                            border: '1px solid #429898',
                            borderRadius: '4px'
                          }}
                          autoFocus
                        />
                      ) : (
                        <>
                          {selectedActs.has(honoraire.id) && selectedActs.get(honoraire.id)?.customMontant ? (
                            <span style={{ color: '#429898', fontWeight: 'bold' }}>
                              {selectedActs.get(honoraire.id)?.customMontant?.toLocaleString()} DA
                            </span>
                          ) : (
                            `${honoraire.honoraireEncaisser.toLocaleString()} DA`
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="payment-total">
            <strong>Total:</strong> {getTotalAmount().toLocaleString()} DA
          </div>

          <div className="payment-info-box">
            <p>👤 Validé par: <strong>{user?.name || user?.email}</strong></p>
            <p>📅 Date: <strong>{new Date().toLocaleDateString('fr-FR')}</strong></p>
          </div>
        </div>

        <div className="payment-modal-footer">
          <button className="payment-btn-cancel" onClick={handleCancel}>
            Annuler
          </button>
          <button 
            className="payment-btn-validate" 
            onClick={handleValidate}
            disabled={loading || selectedActs.size === 0}
          >
            {loading ? 'Validation...' : '✓ Valider le Paiement'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PaymentValidationModal
