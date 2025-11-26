import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import Calculator from './Calculator'
import './ComptabiliteDuJour.css'

interface DailyRecord {
  id: number
  date: string
  time: string
  patientCode: number
  patientFirstName: string
  patientLastName: string
  actePratique: string
  montant: number
  medecin: string
  mtAssistant?: number
}

interface ActeSummary {
  actePratique: string
  count: number
  total: number
}

type TimePeriod = 'complete' | 'matinee' | 'apres-midi'

interface ComptabiliteDuJourProps {
  isOpen: boolean
  onClose: () => void
}

const ComptabiliteDuJour: React.FC<ComptabiliteDuJourProps> = ({ isOpen, onClose }) => {
  const { user: currentUser } = useAuthStore()
  const [allRecords, setAllRecords] = useState<DailyRecord[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [showCalculator, setShowCalculator] = useState<boolean>(false)
  const [isPrinting, setIsPrinting] = useState<boolean>(false)
  
  // Filters
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date()
    return today.toISOString().split('T')[0] // YYYY-MM-DD format
  })
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('complete')
  
  // For nurse: list of doctors/assistants and selected person
  const [availableDoctors, setAvailableDoctors] = useState<Array<{name: string, role: string}>>([])
  const [selectedDoctor, setSelectedDoctor] = useState<string>('')
  
  const isNurse = currentUser?.role === 'nurse'
  const isAdmin = currentUser?.role === 'admin'
  const canSelectDoctor = isNurse || isAdmin

  // Fetch available doctors for nurse/admin on modal open
  useEffect(() => {
    if (isOpen && canSelectDoctor) {
      fetchAvailableDoctors()
    }
  }, [isOpen, canSelectDoctor])

  // Fetch data when modal opens or date/doctor changes
  useEffect(() => {
    if (isOpen && currentUser) {
      if (canSelectDoctor && !selectedDoctor) {
        // Nurse/Admin needs to select a doctor first
        return
      }
      fetchDailyRecords()
    }
  }, [isOpen, selectedDate, currentUser, selectedDoctor])

  const fetchAvailableDoctors = async () => {
    try {
      // Get all users who are doctors or assistants
      const usersResult = await window.electronAPI.db.users.getAll()
      if (usersResult && Array.isArray(usersResult)) {
        const doctorsAndAssistants = usersResult.filter((u: any) => 
          u.role === 'doctor' || u.role === 'assistant_1' || u.role === 'assistant_2'
        ).map((u: any) => ({ name: u.name, role: u.role }))
        
        setAvailableDoctors(doctorsAndAssistants)
        if (doctorsAndAssistants.length > 0) {
          setSelectedDoctor(doctorsAndAssistants[0].name) // Auto-select first
        }
      }
    } catch (err) {
      console.error('Error fetching doctors:', err)
    }
  }

  const fetchDailyRecords = async () => {
    if (!currentUser) return
    
    setLoading(true)
    setError('')
    
    try {
      // Convert YYYY-MM-DD to DD/MM/YYYY format expected by database
      const [year, month, day] = selectedDate.split('-')
      const formattedDate = `${day}/${month}/${year}`
      
      // For nurse/admin: use selected doctor, for doctor/assistant: use their own name
      const doctorName = canSelectDoctor ? selectedDoctor : currentUser.name
      
      // Fetch records for the doctor/assistant
      const result = await window.electronAPI.honoraires.getWithPatients(
        formattedDate,
        doctorName
      )
      
      if (result?.success) {
        setAllRecords(result.records || [])
      } else {
        setError(result?.error || 'Échec du chargement des données')
        setAllRecords([])
      }
    } catch (err: any) {
      console.error('Error fetching daily records:', err)
      setError(err.message || 'Échec du chargement des données')
      setAllRecords([])
    } finally {
      setLoading(false)
    }
  }

  // Filter records by time period
  const filteredRecords = allRecords.filter(record => {
    if (timePeriod === 'complete') return true
    
    const [hours] = record.time.split(':').map(Number)
    
    if (timePeriod === 'matinee') {
      return hours < 13 // Before 1 PM
    } else if (timePeriod === 'apres-midi') {
      return hours >= 13 // 1 PM and after
    }
    
    return true
  })

  // Determine if viewing assistant's data
  const isAssistant = canSelectDoctor 
    ? availableDoctors.find(d => d.name === selectedDoctor)?.role.startsWith('assistant') || false
    : (currentUser?.role === 'assistant_1' || currentUser?.role === 'assistant_2')  // Calculate summary statistics
  const totalPatients = filteredRecords.length
  const totalAmount = filteredRecords.reduce((sum, r) => sum + r.montant, 0)
  const totalAssistant = filteredRecords.reduce((sum, r) => sum + (r.mtAssistant || 0), 0)

  // Group by acte pratique for recap
  const acteSummaries: ActeSummary[] = Object.values(
    filteredRecords.reduce((acc, record) => {
      if (!acc[record.actePratique]) {
        acc[record.actePratique] = {
          actePratique: record.actePratique,
          count: 0,
          total: 0
        }
      }
      acc[record.actePratique].count += 1
      acc[record.actePratique].total += (isAssistant ? (record.mtAssistant || 0) : record.montant)
      return acc
    }, {} as Record<string, ActeSummary>)
  ).sort((a, b) => b.total - a.total)

  const handlePrint = () => {
    setIsPrinting(true)
    setTimeout(() => {
      window.print()
      setIsPrinting(false)
    }, 100)
  }

  // Format date for display
  const formatDisplayDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  }

  // Get the name of whose data we're viewing
  const viewingName = isNurse ? selectedDoctor : currentUser?.name

  if (!isOpen) return null

  return (
    <div className="modal-overlay-fullscreen" onClick={onClose}>
      <div className="comptabilite-fullscreen-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="comptabilite-header">
          <div className="header-left">
            <button 
              className="calculator-btn"
              onClick={() => setShowCalculator(!showCalculator)}
              title="Calculatrice"
            >
              🧮
            </button>

            <button 
              className="print-btn"
              onClick={handlePrint}
              title="Imprimer"
            >
              🖨️
            </button>
            
            {canSelectDoctor ? (
              <div className="doctor-selector">
                <label htmlFor="doctor-select">Voir:</label>
                <select
                  id="doctor-select"
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="doctor-select"
                >
                  {availableDoctors.map((doc) => (
                    <option key={doc.name} value={doc.name}>
                      {doc.name} {doc.role !== 'doctor' && '(Assistant)'}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <h2 className="doctor-name">{currentUser?.name}</h2>
            )}
            
            <div className="date-selector">
              <label htmlFor="date-input">Date:</label>
              <input
                id="date-input"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="date-input"
              />
            </div>
          </div>

          <div className="header-right">
            <div className="time-period-selector">
              <button
                className={`period-btn ${timePeriod === 'complete' ? 'active' : ''}`}
                onClick={() => setTimePeriod('complete')}
              >
                Journée Complète
              </button>
              <button
                className={`period-btn ${timePeriod === 'matinee' ? 'active' : ''}`}
                onClick={() => setTimePeriod('matinee')}
              >
                Matinée
              </button>
              <button
                className={`period-btn ${timePeriod === 'apres-midi' ? 'active' : ''}`}
                onClick={() => setTimePeriod('apres-midi')}
              >
                Après-midi
              </button>
            </div>
            <button className="close-btn" onClick={onClose} title="Fermer">✕</button>
          </div>
        </div>

        {/* Calculator Popup */}
        {showCalculator && (
          <div className="calculator-popup">
            <Calculator onClose={() => setShowCalculator(false)} />
          </div>
        )}

        {/* Main Content Area */}
        <div className="comptabilite-main">
          {/* Print Header - Only visible when printing */}
          <div className="print-only-header">
            <h1>Comptabilité du Jour</h1>
            <div className="print-info">
              <p><strong>Médecin/Assistant:</strong> {viewingName}</p>
              <p><strong>Date:</strong> {formatDisplayDate(selectedDate)}</p>
              <p><strong>Période:</strong> {
                timePeriod === 'complete' ? 'Journée Complète' :
                timePeriod === 'matinee' ? 'Matinée' : 'Après-midi'
              }</p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-banner">
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Chargement des données...</p>
            </div>
          ) : (
            <div className="tables-container">
              {/* Main Table - Left Side */}
              <div className="main-table-section">
                <table className="daily-records-table">
                  <thead>
                    <tr>
                      <th>Horaire</th>
                      <th>Nom Patient</th>
                      <th>Prénom</th>
                      <th>Acte Pratiqué</th>
                      <th>Montant</th>
                      {isAssistant && <th>MT Assistant</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={isAssistant ? 6 : 5} className="no-data">
                          Aucun enregistrement pour cette période
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((record) => (
                        <tr key={record.id}>
                          <td className="time-cell">{record.time}</td>
                          <td className="name-cell">{record.patientLastName}</td>
                          <td className="name-cell">{record.patientFirstName}</td>
                          <td className="acte-cell">{record.actePratique}</td>
                          <td className="montant-cell">{record.montant.toLocaleString()} DA</td>
                          {isAssistant && (
                            <td className="montant-cell assistant-amount">
                              {(record.mtAssistant || 0).toLocaleString()} DA
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="summary-row">
                      <td colSpan={2} className="summary-label">
                        <strong>Nombre de patients:</strong> {totalPatients}
                      </td>
                      <td colSpan={isAssistant ? 2 : 2} className="summary-label">
                        <strong>Total:</strong>
                      </td>
                      <td className="summary-total">
                        <strong>{totalAmount.toLocaleString()} DA</strong>
                      </td>
                      {isAssistant && (
                        <td className="summary-total assistant-total">
                          <strong>{totalAssistant.toLocaleString()} DA</strong>
                        </td>
                      )}
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Recap Table - Right Side */}
              <div className="recap-table-section">
                <h3 className="recap-title">Récap par Actes Regroupés</h3>
                <table className="recap-table">
                  <thead>
                    <tr>
                      <th>Actes Pratiqués</th>
                      <th>Nombre</th>
                      <th>Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acteSummaries.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="no-data">
                          Aucune donnée
                        </td>
                      </tr>
                    ) : (
                      acteSummaries.map((summary, index) => (
                        <tr key={index}>
                          <td className="acte-cell">{summary.actePratique}</td>
                          <td className="count-cell">{summary.count}</td>
                          <td className="montant-cell">{summary.total.toLocaleString()} DA</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="recap-total-row">
                      <td colSpan={2} className="recap-total-label">
                        <strong>Total:</strong>
                      </td>
                      <td className="recap-total-amount">
                        <strong>{(isAssistant ? totalAssistant : totalAmount).toLocaleString()} DA</strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ComptabiliteDuJour
