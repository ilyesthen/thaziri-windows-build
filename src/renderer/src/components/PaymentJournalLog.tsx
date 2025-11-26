import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import './PaymentJournalLog.css'

interface PaymentRecord {
  id: number
  patientName: string
  patientCode: number
  visitDate: string
  totalAmount: number
  selectedActs: string // JSON string
  validatedBy: string
  validatedByRole: string
  validatedAt: string
  status: string
  notes?: string
}

interface PaymentLog {
  id: number
  paymentId: number
  actionType: string
  actionBy: string
  actionByRole: string
  actionDetails: string
  timestamp: string
}

interface PaymentJournalLogProps {
  isOpen: boolean
  onClose: () => void
}

const PaymentJournalLog: React.FC<PaymentJournalLogProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore()
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [logs, setLogs] = useState<PaymentLog[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'payments' | 'logs'>('payments')
  
  // Filters
  const [startDate, setStartDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState('all')
  const [searchPatient, setSearchPatient] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'cancelled' | 'deleted'>('all')
  
  // Available doctors for filter
  const [doctors, setDoctors] = useState<string[]>([])

  useEffect(() => {
    if (isOpen && user?.role === 'admin') {
      fetchDoctors()
      fetchPayments() // Also fetch payments when modal opens
    }
  }, [isOpen, user])

  const fetchDoctors = async () => {
    try {
      const users = await window.electronAPI.db.users.getAll()
      const doctorNames = users
        .filter((u: any) => u.role === 'doctor' || u.role.startsWith('assistant'))
        .map((u: any) => u.name)
      setDoctors(doctorNames)
    } catch (error) {
      console.error('Error fetching doctors:', error)
    }
  }

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const filters: any = {}
      if (startDate) filters.startDate = startDate
      if (endDate) filters.endDate = endDate
      if (selectedDoctor !== 'all') filters.validatedBy = selectedDoctor
      
      // Apply status filter
      if (filterStatus === 'completed') {
        filters.status = 'completed'
      } else if (filterStatus === 'cancelled') {
        filters.status = 'cancelled'  
      } else if (filterStatus === 'deleted') {
        filters.status = 'deleted'
      }
      // 'all' means no status filter - include all payments regardless of status
      
      console.log('🔍 Fetching payments with filters:', filters)

      const result = await window.electronAPI.payments.getAll(filters)
      
      console.log('📊 Payment results:', result)
      
      if (result?.success) {
        setPayments(result.payments || [])
        console.log(`✅ Loaded ${result.payments?.length || 0} payments`)
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterClick = () => {
    fetchPayments()
  }

  const fetchPaymentLogs = async (paymentId: number) => {
    try {
      const result = await window.electronAPI.payments.getLogs(paymentId)
      if (result?.success) {
        setLogs(result.logs || [])
      }
    } catch (error) {
      console.error('Error fetching payment logs:', error)
    }
  }

  const handlePaymentClick = (payment: PaymentRecord) => {
    setSelectedPaymentId(payment.id)
    fetchPaymentLogs(payment.id)
    setViewMode('logs')
  }

  const parseActs = (actsJson: string) => {
    try {
      const acts = JSON.parse(actsJson)
      return acts.map((act: any) => `${act.actePratique} (${act.montant} DA)`).join(', ')
    } catch {
      return 'N/A'
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTotalAmount = () => {
    const filtered = getFilteredPayments()
    return filtered.reduce((sum, p) => sum + p.totalAmount, 0)
  }

  const getFilteredPayments = () => {
    return payments.filter(p => {
      if (searchPatient && !p.patientName.toLowerCase().includes(searchPatient.toLowerCase())) {
        return false
      }
      return true
    })
  }

  const handleExport = () => {
    const filtered = getFilteredPayments()
    const csv = [
      ['Date', 'Patient', 'Montant', 'Actes', 'Validé Par', 'Statut'].join(','),
      ...filtered.map(p => [
        formatDate(p.validatedAt),
        p.patientName,
        p.totalAmount,
        parseActs(p.selectedActs),
        p.validatedBy,
        p.status
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `journal_paiements_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (!isOpen || user?.role !== 'admin') return null

  // Check if this is embedded (not a modal) - always show as modal for now
  const isEmbedded = false

  if (!isOpen && !isEmbedded) return null

  const content = (
    <div className="journal-modal" onClick={(e) => e.stopPropagation()}>
      <div className="journal-header">
        <h2>📋 Journal des Paiements</h2>
        <div className="journal-controls">
          <button 
            className={`view-toggle-btn ${viewMode === 'payments' ? 'active' : ''}`}
            onClick={() => setViewMode('payments')}
          >
            Paiements
          </button>
          <button 
            className={`view-toggle-btn ${viewMode === 'logs' ? 'active' : ''}`}
            onClick={() => setViewMode('logs')}
            disabled={!selectedPaymentId}
          >
            Historique
          </button>
          <button className="export-btn" onClick={handleExport}>
            📥 Exporter CSV
          </button>
          <button className="close-btn" onClick={onClose} style={{marginLeft: '10px', padding: '5px 10px', cursor: 'pointer'}}>✖</button>
        </div>
      </div>

        {viewMode === 'payments' ? (
          <>
            <div className="journal-filters">
              <div className="filter-row">
                <div className="filter-group">
                  <label>Date début</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="filter-group">
                  <label>Date fin</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="filter-group">
                  <label>Médecin/Assistant</label>
                  <select
                    value={selectedDoctor}
                    onChange={(e) => setSelectedDoctor(e.target.value)}
                  >
                    <option value="all">Tous</option>
                    {doctors.map(doc => (
                      <option key={doc} value={doc}>{doc}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Statut</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                  >
                    <option value="all">Tous les paiements</option>
                    <option value="completed">Validés seulement</option>
                    <option value="cancelled">Supprimés seulement</option>
                  </select>
                </div>
              </div>
              <div className="filter-row">
                <div className="filter-group" style={{ flex: 1 }}>
                  <label>Rechercher patient</label>
                  <input
                    type="text"
                    placeholder="Nom du patient..."
                    value={searchPatient}
                    onChange={(e) => setSearchPatient(e.target.value)}
                  />
                </div>
                <button 
                  className="filter-btn"
                  onClick={handleFilterClick}
                  disabled={loading}
                >
                  🔍 Filtrer
                </button>
              </div>
            </div>

            <div className="journal-summary">
              <div className="summary-item">
                <strong>Total des paiements:</strong> {getTotalAmount().toLocaleString()} DA
              </div>
              <div className="summary-item">
                <strong>Nombre de transactions:</strong> {getFilteredPayments().length}
              </div>
            </div>

            <div className="journal-body">
              {loading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Chargement...</p>
                </div>
              ) : (
                <table className="journal-table">
                  <thead>
                    <tr>
                      <th>Date/Heure</th>
                      <th>Patient</th>
                      <th>Visite</th>
                      <th>Montant</th>
                      <th>Actes</th>
                      <th>Validé Par</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredPayments().length === 0 ? (
                      <tr>
                        <td colSpan={8} className="no-data">
                          Aucun paiement trouvé
                        </td>
                      </tr>
                    ) : (
                      getFilteredPayments().map(payment => (
                        <tr 
                          key={payment.id}
                          className={payment.status === 'cancelled' ? 'cancelled' : ''}
                        >
                          <td>{formatDate(payment.validatedAt)}</td>
                          <td>{payment.patientName}</td>
                          <td>{payment.visitDate}</td>
                          <td className="amount">{payment.totalAmount.toLocaleString()} DA</td>
                          <td className="acts">{parseActs(payment.selectedActs)}</td>
                          <td>{payment.validatedBy}</td>
                          <td>
                            <span className={`status ${payment.status}`}>
                              {payment.status === 'completed' ? 'Validé' : 
                               payment.status === 'deleted' ? 'Supprimé' : 'Annulé'}
                            </span>
                          </td>
                          <td>
                            {/* Removed 📜 Historique button as requested */}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <div className="logs-view">
            <button 
              className="back-btn"
              onClick={() => setViewMode('payments')}
            >
              ← Retour aux paiements
            </button>
            
            <h3>Historique du Paiement #{selectedPaymentId}</h3>
            
            <div className="logs-list">
              {logs.length === 0 ? (
                <p className="no-data">Aucun historique disponible</p>
              ) : (
                logs.map(log => (
                  <div key={log.id} className={`log-item ${log.actionType}`}>
                    <div className="log-header">
                      <span className="log-action">{log.actionType.toUpperCase()}</span>
                      <span className="log-time">{formatDate(log.timestamp)}</span>
                    </div>
                    <div className="log-body">
                      <p><strong>Par:</strong> {log.actionBy} ({log.actionByRole})</p>
                      <p><strong>Détails:</strong> {log.actionDetails}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
  )
  
  // Return with or without overlay based on whether it's embedded
  return isEmbedded ? content : (
    <div className="journal-modal-overlay" onClick={onClose}>
      {content}
    </div>
  )
}

export default PaymentJournalLog
