import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import RoomBasedSendMessageModal from './RoomBasedSendMessageModal'
import RoomBasedReceiveMessageModal from './RoomBasedReceiveMessageModal'
import GlassesPrescriptionModal from './GlassesPrescriptionModal'
import ContactLensModal from './ContactLensModal'
import './PatientDetailsView.css'

interface Patient {
  id: number
  recordNumber?: number
  departmentCode?: number
  firstName: string
  lastName: string
  fullName: string
  age?: number
  dateOfBirth?: Date
  address?: string
  phone?: string
  code?: string
  gender?: string
  usefulInfo?: string
  photo1?: string
  generalHistory?: string
  ophthalmoHistory?: string
  createdAt: Date
  updatedAt: Date
  originalCreatedDate?: string
}

interface Visit {
  id: number
  date: string
  time: string
  actePratique: string
  medecin: string
  montant: number
  source?: 'honoraire' | 'examination' // Track where the visit comes from
}

const PatientDetailsView: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [visits, setVisits] = useState<Visit[]>([])
  const [selectedVisitDate, setSelectedVisitDate] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showPaymentHistory, setShowPaymentHistory] = useState(false)
  const [paymentHistory, setPaymentHistory] = useState<any[]>([])
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [isReceivedMessagesOpen, setIsReceivedMessagesOpen] = useState(false)
  const [showGlassesPrescription, setShowGlassesPrescription] = useState(false)
  const [showContactLens, setShowContactLens] = useState(false)

  // Eye examination fields
  const [rightEye, setRightEye] = useState({
    sv: '',
    av: '',
    sphere: '',
    cylinder: '',
    axis: '',
    vl: '',
    k1: '',
    k2: '',
    r1: '',
    r2: '',
    r0: '',
    pachy: '',
    toc: ''
  })
  const [leftEye, setLeftEye] = useState({
    sv: '',
    av: '',
    sphere: '',
    cylinder: '',
    axis: '',
    vl: '',
    k1: '',
    k2: '',
    r1: '',
    r2: '',
    r0: '',
    pachy: '',
    toc: ''
  })
  const [addition, setAddition] = useState('')
  const [dip, setDip] = useState('')
  // const [cycloplegie, setCycloplegie] = useState('') // Removed unused variable
  const [leftNotes, setLeftNotes] = useState('')
  const [rightNotes, setRightNotes] = useState('')
  
  // Additional ophthalmological fields
  const [leftGonio, setLeftGonio] = useState('')
  const [leftTO, setLeftTO] = useState('')
  const [leftLAF, setLeftLAF] = useState('')
  const [leftFO, setLeftFO] = useState('')
  const [leftConduite, setLeftConduite] = useState('')
  
  const [rightGonio, setRightGonio] = useState('')
  const [rightTO, setRightTO] = useState('')
  const [rightLAF, setRightLAF] = useState('')
  const [rightFO, setRightFO] = useState('')
  const [rightDiag, setRightDiag] = useState('')

  // Calculate VL (Vision Loin) automatically
  const calculateVL = (sphere: string, cylinder: string, axis: string) => {
    if (!sphere && !cylinder && !axis) return ''
    
    const parts = []
    if (sphere) parts.push(sphere)
    if (cylinder && axis) {
      parts.push(`(${cylinder} à ${axis}°)`)
    } else if (cylinder) {
      parts.push(`(${cylinder})`)
    }
    
    return parts.join(' ')
  }

  // Get current user display name
  const getCurrentUserName = () => {
    if (!user) return ''
    return user.assistantName || user.name || ''
  }

  useEffect(() => {
    if (patientId) {
      loadPatientData(parseInt(patientId))
    }
  }, [patientId])

  // Load payment history when modal opens
  useEffect(() => {
    if (showPaymentHistory && patient?.departmentCode) {
      loadAllPaymentHistory(patient.departmentCode)
    }
  }, [showPaymentHistory, patient?.departmentCode])

  const loadPatientData = async (id: number) => {
    try {
      setLoading(true)
      setError('')

      // Load patient details
      const patientResult = await (window.electronAPI as any)?.db.patients.getById(id)
      if (patientResult?.success && patientResult.patient) {
        setPatient(patientResult.patient)
        
        // Load visits for this patient - use departmentCode which maps to patient_code in DB!
        const visits = await loadVisitHistory(patientResult.patient.departmentCode)
        setVisits(visits)
        
        // Load the most recent visit examination (if exists)
        if (visits.length > 0 && patientResult.patient.departmentCode) {
          const mostRecentVisitDate = visits[0].date
          setSelectedVisitDate(mostRecentVisitDate)
          await loadVisitExamination(patientResult.patient.departmentCode, mostRecentVisitDate)
        }
      } else {
        setError('Patient non trouvé')
        return
      }

    } catch (err: any) {
      console.error('Error loading patient data:', err)
      setError(err.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const loadVisitHistory = async (departmentCode: number) => {
    if (!departmentCode) {
      console.log('No department code provided for visit history')
      return []
    }
    
    try {
      console.log(`Loading visit history for department code: ${departmentCode}`)
      
      // Get examination dates from visit_examinations table ONLY
      // Use departmentCode which maps to patient_code in database
      const examsResult = await (window.electronAPI as any)?.db.visitExaminations.getAllByPatient(departmentCode)
      console.log('Visit examinations result:', examsResult)
      
      const examVisits = examsResult?.success && examsResult.examinations && examsResult.examinations.length > 0 ? 
        examsResult.examinations.map((exam: any) => {
          // Try different date formats
          let formattedDate = exam.visitDate
          if (exam.visitDate && exam.visitDate.includes('/')) {
            const parts = exam.visitDate.split('/')
            if (parts.length === 3) {
              // If M/D/YYYY format (US format)
              if (parts[2].length === 4) {
                const month = parts[0].padStart(2, '0')
                const day = parts[1].padStart(2, '0')
                const year = parts[2]
                formattedDate = `${day}/${month}/${year}`
              } else {
                // Already in DD/MM/YYYY
                formattedDate = exam.visitDate
              }
            }
          }
          
          return {
            id: exam.id,
            date: formattedDate,
            time: '',
            actePratique: exam.motif || 'CONSULTATION',
            medecin: exam.medecin || 'KARKOURI.N',
            montant: 0,
            source: 'examination' as const
          }
        }) : []
      
      console.log(`Found ${examVisits.length} visit(s)`)
      
      // Sort visits: newest first (by date DESC, then by ID DESC for same-day visits)
      const sortedVisits = examVisits.sort((a: Visit, b: Visit) => {
        // Parse dates from DD/MM/YYYY to Date objects
        const dateA = new Date(a.date.split('/').reverse().join('-'))
        const dateB = new Date(b.date.split('/').reverse().join('-'))
        
        // First sort by date (newest first)
        const dateDiff = dateB.getTime() - dateA.getTime()
        if (dateDiff !== 0) return dateDiff
        
        // If same date, sort by ID (higher ID = more recent visit)
        return b.id - a.id
      })
      
      return sortedVisits
    } catch (error) {
      console.error('Error loading visit history:', error)
      return []
    }
  }
  
  const loadVisitExamination = async (departmentCode: number, visitDate: string) => {
    try {
      const result = await (window.electronAPI as any)?.db.visitExaminations.getByDate(departmentCode, visitDate)
      
      if (result?.success && result.examination) {
        const exam = result.examination
        
        // LEFT PANEL = RIGHT EYE (OD)
        setLeftEye({
          sv: exam.svRight || '',           // SCOD
          av: exam.avRight || '',           // AVOD
          sphere: exam.sphereRight || '',   // p1
          cylinder: exam.cylinderRight || '', // p2
          axis: exam.axisRight || '',       // AXD
          vl: exam.vlRight || '',           // VPOD
          k1: exam.k1Right || '',           // K1_D
          k2: exam.k2Right || '',           // K2_D
          r1: exam.r1Right || '',           // R1_d
          r2: exam.r2Right || '',           // R2_d
          r0: exam.r0Right || '',           // RAYOND
          pachy: exam.pachyRight || '',     // pachy1_D
          toc: exam.tocRight || ''          // pachy2_d (TOC)
        })
        
        // RIGHT PANEL = LEFT EYE (OG)
        setRightEye({
          sv: exam.svLeft || '',            // SCOG
          av: exam.avLeft || '',            // AVOG
          sphere: exam.sphereLeft || '',    // p3
          cylinder: exam.cylinderLeft || '', // p5
          axis: exam.axisLeft || '',        // AXG
          vl: exam.vlLeft || '',            // VPOG
          k1: exam.k1Left || '',            // K1_G
          k2: exam.k2Left || '',            // K2_G
          r1: exam.r1Left || '',            // R1_G
          r2: exam.r2Left || '',            // R2_G
          r0: exam.r0Left || '',            // RAYONG
          pachy: exam.pachyLeft || '',      // pachy1_g
          toc: exam.tocLeft || ''           // pachy2_g (TOC)
        })
        
        // Common fields
        setAddition(exam.addition || '')          // RIADG - Addition for left eye
        setDip(exam.dip || '')                    // EP - Distance Inter-Pupillaire
        // setCycloplegie(exam.cycloplegie || '')    // cycloplégie (removed unused)
        
        // LEFT PANEL = RIGHT EYE Notes & Findings
        setLeftNotes(exam.notesRight || '')       // comentaire_D
        setLeftGonio(exam.gonioRight || '')       // ANG (or could be shared)
        setLeftTO(exam.toRight || '')             // TOOD
        setLeftLAF(exam.lafRight || '')           // LAF
        setLeftFO(exam.foRight || '')             // FO
        
        // RIGHT PANEL = LEFT EYE Notes & Findings
        setRightNotes(exam.notesLeft || '')       // commentaire_G
        setRightGonio(exam.gonioLeft || '')       // ANG (or could be shared)
        setRightTO(exam.toLeft || '')             // TOOG
        setRightLAF(exam.lafLeft || '')           // LAF_G
        setRightFO(exam.foLeft || '')             // FO_G
        
        // General fields (bottom section)
        setLeftConduite(exam.conduiteATenir || '') // CAT - Conduite À Tenir
        setRightDiag(exam.diagnostic || '')        // DIAG or DIIAG - Diagnostic
      } else {
        // No data found
      }
    } catch (error) {
      console.error('Error loading visit examination:', error)
    }
  }

  // Load ALL payment history for this patient (all dates)
  const loadAllPaymentHistory = async (departmentCode: number) => {
    try {
      console.log(`Loading ALL payment history for patient: ${departmentCode}`)
      const result = await (window.electronAPI as any)?.payments?.getAllByPatient?.(departmentCode)
      
      if (result?.success && result.payments) {
        setPaymentHistory(result.payments)
        console.log(`Found ${result.payments.length} payment(s) for this patient`)
      } else {
        setPaymentHistory([])
        console.log('No payments found for this patient')
      }
    } catch (error) {
      console.error('Error loading payment history:', error)
      setPaymentHistory([])
    }
  }
  
  const handleVisitClick = (visit: Visit) => {
    if (patient?.departmentCode) {
      setSelectedVisitDate(visit.date)
      loadVisitExamination(patient.departmentCode, visit.date)
    }
  }

  const handleVisitDoubleClick = (visit: any) => {
    console.log('Double-clicked visit for editing:', visit)
    const patientId = patient?.id
    const dateParts = visit.date.split('/')
    const month = dateParts[0]
    const day = dateParts[1] 
    const year = dateParts[2]
    const formattedDate = `${year}-${month}-${day}`
    
    navigate(`/new-visit/${patientId}?date=${formattedDate}&visitId=${visit.id}&edit=true`)
  }

  const navigateToNextVisit = () => {
    if (visits.length === 0) return
    
    const currentIndex = visits.findIndex(v => v.date === selectedVisitDate)
    if (currentIndex === -1) return
    
    const nextIndex = (currentIndex + 1) % visits.length // Wrap around to first
    handleVisitClick(visits[nextIndex])
  }

  const navigateToPreviousVisit = () => {
    if (visits.length === 0) return
    
    const currentIndex = visits.findIndex(v => v.date === selectedVisitDate)
    if (currentIndex === -1) return
    
    const previousIndex = currentIndex === 0 ? visits.length - 1 : currentIndex - 1 // Wrap around to last
    handleVisitClick(visits[previousIndex])
  }

  // Handle delete visit
  const handleDeleteVisit = async (visit: Visit, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    const confirmDelete = window.confirm('Êtes-vous sûr de vouloir supprimer cette visite ?')
    if (!confirmDelete) return
    
    try {
      let result
      
      // Delete from the correct table based on source
      if (visit.source === 'honoraire') {
        result = await (window.electronAPI as any)?.db.honoraires.delete(visit.id)
      } else {
        result = await (window.electronAPI as any)?.db.visitExaminations.delete(visit.id)
      }
      
      if (result?.success) {
        alert('✅ Visite supprimée avec succès!')
        // Reload patient data to refresh the visit list
        if (patientId) {
          loadPatientData(parseInt(patientId))
        }
      } else {
        alert(`❌ Erreur lors de la suppression: ${result?.error || 'Erreur inconnue'}`)
      }
    } catch (error: any) {
      console.error('Error deleting visit:', error)
      alert(`❌ Erreur lors de la suppression: ${error.message || 'Erreur inconnue'}`)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        navigateToNextVisit()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        navigateToPreviousVisit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visits, selectedVisitDate]) // Re-attach when visits or selection changes

  const handleBack = () => {
    navigate('/')
  }

  // Handle create new visit - create visit and navigate to edit it
  const handleCreateNewVisit = async () => {
    if (!patient?.departmentCode) {
      alert('❌ Erreur: Code patient introuvable')
      return
    }

    try {
      // Navigate to new visit page without creating visit first
      const today = new Date()
      const visitDateForRoute = today.toISOString().split('T')[0] // YYYY-MM-DD format for route
      
      console.log('✅ Navigating to new visit page')
      
      // Navigate to the new visit page without creating a visit first
      navigate(`/new-visit/${patient.id}?date=${visitDateForRoute}`)
    } catch (error) {
      console.error('❌ Error navigating to new visit:', error)
      alert('Error navigating to new visit page. Please try again.')
    }
  }

  // Fetch payment history for this patient from Honoraire table (same as Comptabilité du Jour)
  const fetchPaymentHistory = async () => {
    if (!patient?.departmentCode) return
    
    try {
      // Use the correct function to get patient visits from honoraires
      const result = await window.electronAPI.honoraires.getByDate('', '')
      
      if (result?.success && result.honoraires) {
        // Filter honoraires for this specific patient
        const patientHonoraires = result.honoraires.filter((h: any) => h.patientCode === patient.departmentCode)
        setPaymentHistory(patientHonoraires)
      } else {
        setPaymentHistory([])
      }
    } catch (error) {
      console.error('Error fetching payment history:', error)
      setPaymentHistory([])
    }
  }

  if (loading) {
    return (
      <div className="patient-details-loading">
        <div className="spinner"></div>
        <p>Chargement des détails du patient...</p>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="patient-details-error">
        <h2>❌ Erreur</h2>
        <p>{error || 'Patient non trouvé'}</p>
        <button onClick={handleBack} className="btn-back">
          ← Retour
        </button>
      </div>
    )
  }

  return (
    <div className="patient-details-container">
      {/* Top Bar - User & Patient Info */}
      <div className="patient-info-bar">
        <button onClick={handleBack} className="btn-back-icon" title="Retour">
          ← Retour
        </button>
        <div className="top-bar-info">
          <div className="info-item current-user">
            <span className="info-label">Médecin:</span>
            <span className="info-value">{getCurrentUserName()}</span>
          </div>
          <div className="divider"></div>
          <div className="info-item">
            <span className="info-label">Patient:</span>
            <span className="info-value">{patient.lastName} {patient.firstName}</span>
          </div>
          <div className="divider"></div>
          <div className="info-item">
            <span className="info-label">Adresse:</span>
            <span className="info-value">{patient.address || '—'}</span>
          </div>
          <div className="divider"></div>
          <div className="info-item">
            <span className="info-label">Âge:</span>
            <span className="info-value">{patient.age || '—'}</span>
          </div>
        </div>
      </div>

      {/* Main Content - All in horizontal rows */}
      <div className="patient-details-content">
        {/* TOP ROW - Visit History + Actes Tables + Add Button */}
        <div className="top-row">
          {/* Visit Counter + Table */}
          <div className="visit-section">
            <div className="visit-counter-badge">
              <span className="counter-num">{visits.length}</span>
              <span className="counter-txt">visites</span>
            </div>
            <div className="visit-table-container">
              <table className="visit-history-table">
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>DATE</th>
                    <th>MOTIF DE CONSULTATION</th>
                    <th>DOCTEUR</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="no-visits">
                        Aucune visite enregistrée
                      </td>
                    </tr>
                  ) : (
                    visits.map((visit, index) => (
                      <tr 
                        key={visit.id} 
                        onClick={() => handleVisitClick(visit)}
                        onDoubleClick={() => handleVisitDoubleClick(visit)}
                        onContextMenu={(e) => handleDeleteVisit(visit, e)}
                        className={visit.date === selectedVisitDate ? 'selected-visit' : ''}
                        title="Clic simple: voir | Double-clic: modifier | Clic droit: supprimer"
                      >
                        <td className="visit-number">{index + 1}</td>
                        <td>{visit.date}</td>
                        <td>{visit.actePratique}</td>
                        <td>{visit.medecin}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actes Tables */}
          <div className="actes-section-horizontal">
            <div className="actes-table-mini">
              <div className="actes-header-mini">Actes Généraux</div>
              <div className="actes-content-mini">—</div>
            </div>
            <div className="actes-table-mini">
              <div className="actes-header-mini">Actes Ophtalmologiques</div>
              <div className="actes-content-mini">—</div>
            </div>
          </div>

          {/* Button container for vertical alignment */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Add Visit Button */}
            <button 
              className="btn-add-visit-inline" 
              title="Add New Visit"
              onClick={handleCreateNewVisit}
            >
              +
            </button>
            
            {/* Glasses Prescription Button */}
            <button 
              className="btn-add-visit-inline" 
              title="Prescription de Lunettes"
              onClick={() => setShowGlassesPrescription(true)}
              style={{ fontSize: '18px', padding: '6px 10px' }}
            >
              👓
            </button>
            
            {/* Contact Lens Button */}
            <button 
              className="btn-add-visit-inline" 
              title="Lentilles de Contact"
              onClick={() => setShowContactLens(true)}
              style={{ fontSize: '18px', padding: '6px 10px' }}
            >
              👁️
            </button>
          </div>
        </div>

        {/* Eye Examination - NewVisitPage Layout */}
        <div className="content-columns">
          {/* Left Column - Œil Droit (OD) */}
          <div className="left-column">
            <div className="eye-section">
              <h3 className="eye-title">Œil Droit (OD)</h3>
              
              {/* SV, AV */}
              <div className="eye-fields-horizontal">
                <div className="eye-field-group">
                  <label>SV</label>
                  <input
                    type="text"
                    className="eye-input"
                    value={leftEye.sv}
                    onChange={(e) => setLeftEye({ ...leftEye, sv: e.target.value })}
                    placeholder="Sans correction"
                    readOnly
                  />
                </div>
                <div className="eye-field-group">
                  <label>AV</label>
                  <input
                    type="text"
                    className="eye-input"
                    value={leftEye.av}
                    onChange={(e) => setLeftEye({ ...leftEye, av: e.target.value })}
                    placeholder="Avec correction"
                    readOnly
                  />
                </div>
              </div>

              {/* SPHÈRE, CYLINDRE, AXE, VL */}
              <div className="eye-fields-horizontal" style={{ marginTop: '12px' }}>
                <div className="eye-field-group">
                  <label>SPHÈRE</label>
                  <input
                    type="text"
                    className="eye-input"
                    value={leftEye.sphere}
                    onChange={(e) => setLeftEye({ ...leftEye, sphere: e.target.value })}
                    placeholder="+0.75"
                    readOnly
                  />
                </div>
                <div className="eye-field-group">
                  <label>CYLINDRE</label>
                  <input
                    type="text"
                    className="eye-input"
                    value={leftEye.cylinder}
                    onChange={(e) => setLeftEye({ ...leftEye, cylinder: e.target.value })}
                    placeholder="-0.50"
                    readOnly
                  />
                </div>
                <div className="eye-field-group">
                  <label>AXE</label>
                  <input
                    type="text"
                    className="eye-input"
                    value={leftEye.axis}
                    onChange={(e) => setLeftEye({ ...leftEye, axis: e.target.value })}
                    placeholder="90"
                    readOnly
                  />
                </div>
                <div className="eye-field-group">
                  <label>VL</label>
                  <input
                    type="text"
                    className="eye-input"
                    value={leftEye.vl}
                    onChange={(e) => setLeftEye({ ...leftEye, vl: e.target.value })}
                    readOnly
                  />
                </div>
              </div>

              {/* K1, K2 */}
              <div className="eye-fields-horizontal" style={{ marginTop: '12px' }}>
                <div className="eye-field-group">
                  <label>K1</label>
                  <input
                    type="text"
                    className="eye-input field-k1"
                    value={leftEye.k1}
                    onChange={(e) => setLeftEye({ ...leftEye, k1: e.target.value })}
                    readOnly
                  />
                </div>
                <div className="eye-field-group">
                  <label>K2</label>
                  <input
                    type="text"
                    className="eye-input field-k2"
                    value={leftEye.k2}
                    onChange={(e) => setLeftEye({ ...leftEye, k2: e.target.value })}
                    readOnly
                  />
                </div>
              </div>

              {/* R1, R2, R0, PACHY, T.O.C */}
              <div className="eye-fields-horizontal" style={{ marginTop: '12px' }}>
                <div className="eye-field-group">
                  <label>R1</label>
                  <input
                    type="text"
                    className="eye-input field-r1"
                    value={leftEye.r1}
                    onChange={(e) => setLeftEye({ ...leftEye, r1: e.target.value })}
                    readOnly
                  />
                </div>
                <div className="eye-field-group">
                  <label>R2</label>
                  <input
                    type="text"
                    className="eye-input field-r2"
                    value={leftEye.r2}
                    onChange={(e) => setLeftEye({ ...leftEye, r2: e.target.value })}
                    readOnly
                  />
                </div>
                <div className="eye-field-group">
                  <label>R0</label>
                  <input
                    type="text"
                    className="eye-input field-r0"
                    value={leftEye.r0}
                    onChange={(e) => setLeftEye({ ...leftEye, r0: e.target.value })}
                    readOnly
                  />
                </div>
                <div className="eye-field-group">
                  <label>PACHY</label>
                  <input
                    type="text"
                    className="eye-input field-pachy"
                    value={leftEye.pachy}
                    onChange={(e) => setLeftEye({ ...leftEye, pachy: e.target.value })}
                    readOnly
                  />
                </div>
                <div className="eye-field-group">
                  <label>T.O.C</label>
                  <input
                    type="text"
                    className="eye-input field-toc"
                    value={leftEye.toc}
                    onChange={(e) => setLeftEye({ ...leftEye, toc: e.target.value })}
                    readOnly
                  />
                </div>
              </div>

              {/* NOTES */}
              <div style={{ marginTop: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#2A6484', marginBottom: '6px', display: 'block' }}>NOTES</label>
                <textarea
                  className="eye-notes-textarea"
                  value={leftNotes}
                  onChange={(e) => setLeftNotes(e.target.value)}
                  placeholder="Notes..."
                  readOnly
                />
              </div>

              {/* GONIO and T.O */}
              <div className="eye-fields-horizontal" style={{ marginTop: '12px' }}>
                <div className="eye-field-group">
                  <label>GONIO</label>
                  <input
                    type="text"
                    className="eye-input"
                    value={leftGonio}
                    onChange={(e) => setLeftGonio(e.target.value)}
                    readOnly
                  />
                </div>
                <div className="eye-field-group">
                  <label>T.O</label>
                  <input
                    type="text"
                    className="eye-input"
                    value={leftTO}
                    onChange={(e) => setLeftTO(e.target.value)}
                    readOnly
                  />
                </div>
              </div>

              {/* L.A.F */}
              <div style={{ marginTop: '12px' }}>
                <div className="eye-field-group">
                  <label>L.A.F</label>
                  <input
                    type="text"
                    className="eye-input"
                    value={leftLAF}
                    onChange={(e) => setLeftLAF(e.target.value)}
                    readOnly
                  />
                </div>
              </div>

              {/* F.O */}
              <div style={{ marginTop: '12px' }}>
                <div className="eye-field-group">
                  <label>F.O</label>
                  <input
                    type="text"
                    className="eye-input"
                    value={leftFO}
                    onChange={(e) => setLeftFO(e.target.value)}
                    readOnly
                  />
                </div>
              </div>

              {/* CONDUITE À TENIR */}
              <div style={{ marginTop: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#2A6484', marginBottom: '8px', display: 'block' }}>CONDUITE À TENIR</label>
                <textarea
                  className="eye-notes-textarea"
                  value={leftConduite}
                  onChange={(e) => setLeftConduite(e.target.value)}
                  placeholder="Conduite à tenir..."
                  style={{ minHeight: '120px', maxHeight: '180px' }}
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Right Column - Œil Gauche (OG) */}
          <div className="right-column">
            <div className="eye-section">
              <h3 className="eye-title">Œil Gauche (OG)</h3>
              
              {/* SV, AV */}
              <div className="eye-fields-horizontal">
                <div className="eye-field-group">
                  <label>SV</label>
                  <input
                    type="text"
                    className="eye-input"
                    value={rightEye.sv}
                    onChange={(e) => setRightEye({ ...rightEye, sv: e.target.value })}
                    placeholder="Sans correction"
                    readOnly
                  />
                </div>
                <div className="eye-field-group">
                  <label>AV</label>
                  <input
                    type="text"
                    className="eye-input"
                    value={rightEye.av}
                    onChange={(e) => setRightEye({ ...rightEye, av: e.target.value })}
                    placeholder="Avec correction"
                    readOnly
                  />
                </div>
              </div>

              {/* SPHÈRE, CYLINDRE, AXE, VL */}
              <div className="eye-fields-horizontal" style={{ marginTop: '12px' }}>
                <div className="eye-field-group">
                  <label>SPHÈRE</label>
                  <input
                    type="text"
                    className="eye-input"
                    value={rightEye.sphere}
                    onChange={(e) => setRightEye({ ...rightEye, sphere: e.target.value })}
                    placeholder="+0.75"
                    readOnly
                  />
                </div>
                <div className="eye-field-group">
                  <label>CYLINDRE</label>
                  <input
                    type="text"
                    className="eye-input"
                    value={rightEye.cylinder}
                    onChange={(e) => setRightEye({ ...rightEye, cylinder: e.target.value })}
                    placeholder="-0.50"
                    readOnly
                  />
                </div>
                <div className="eye-field-group">
                  <label>AXE</label>
                  <input
                    type="text"
                    className="eye-input"
                    value={rightEye.axis}
                    onChange={(e) => setRightEye({ ...rightEye, axis: e.target.value })}
                    placeholder="90"
                    readOnly
                  />
                </div>
                <div className="eye-field-group">
                  <label>VL</label>
                  <input
                    type="text"
                    className="eye-input"
                    value={rightEye.vl}
                    onChange={(e) => setRightEye({ ...rightEye, vl: e.target.value })}
                    readOnly
                  />
                </div>
              </div>

              {/* K1, K2 */}
              <div className="eye-fields-horizontal" style={{ marginTop: '12px' }}>
                <div className="eye-field-group">
                  <label>K1</label>
                  <input
                    type="text"
                    className="eye-input field-k1"
                    value={rightEye.k1}
                    onChange={(e) => setRightEye({ ...rightEye, k1: e.target.value })}
                    readOnly
                  />
                </div>
                <div className="eye-field-group">
                  <label>K2</label>
                  <input
                    type="text"
                    className="eye-input field-k2"
                    value={rightEye.k2}
                    onChange={(e) => setRightEye({ ...rightEye, k2: e.target.value })}
                    readOnly
                  />
                </div>
              </div>

              {/* R1, R2, R0, PACHY, T.O.C */}
              <div className="eye-fields-horizontal" style={{ marginTop: '12px' }}>
                <div className="eye-field-group">
                  <label>R1</label>
                  <input
                    type="text"
                    className="eye-input field-r1"
                    value={rightEye.r1}
                    onChange={(e) => setRightEye({ ...rightEye, r1: e.target.value })}
                    readOnly
                  />
                </div>
                <div className="eye-field-group">
                  <label>R2</label>
                  <input
                    type="text"
                    className="eye-input field-r2"
                    value={rightEye.r2}
                    onChange={(e) => setRightEye({ ...rightEye, r2: e.target.value })}
                    readOnly
                  />
                </div>
                <div className="eye-field-group">
                  <label>R0</label>
                  <input
                    type="text"
                    className="eye-input field-r0"
                    value={rightEye.r0}
                    onChange={(e) => setRightEye({ ...rightEye, r0: e.target.value })}
                    readOnly
                  />
                </div>
                <div className="eye-field-group">
                  <label>PACHY</label>
                  <input
                    type="text"
                    className="eye-input field-pachy"
                    value={rightEye.pachy}
                    onChange={(e) => setRightEye({ ...rightEye, pachy: e.target.value })}
                    readOnly
                  />
                </div>
                <div className="eye-field-group">
                  <label>T.O.C</label>
                  <input
                    type="text"
                    className="eye-input field-toc"
                    value={rightEye.toc}
                    onChange={(e) => setRightEye({ ...rightEye, toc: e.target.value })}
                    readOnly
                  />
                </div>
              </div>

              {/* NOTES */}
              <div style={{ marginTop: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#2A6484', marginBottom: '6px', display: 'block' }}>NOTES</label>
                <textarea
                  className="eye-notes-textarea"
                  value={rightNotes}
                  onChange={(e) => setRightNotes(e.target.value)}
                  placeholder="Notes..."
                  readOnly
                />
              </div>

              {/* GONIO and T.O */}
              <div className="eye-fields-horizontal" style={{ marginTop: '12px' }}>
                <div className="eye-field-group">
                  <label>GONIO</label>
                  <input
                    type="text"
                    className="eye-input"
                    value={rightGonio}
                    onChange={(e) => setRightGonio(e.target.value)}
                    readOnly
                  />
                </div>
                <div className="eye-field-group">
                  <label>T.O</label>
                  <input
                    type="text"
                    className="eye-input"
                    value={rightTO}
                    onChange={(e) => setRightTO(e.target.value)}
                    readOnly
                  />
                </div>
              </div>

              {/* L.A.F */}
              <div style={{ marginTop: '12px' }}>
                <div className="eye-field-group">
                  <label>L.A.F</label>
                  <input
                    type="text"
                    className="eye-input"
                    value={rightLAF}
                    onChange={(e) => setRightLAF(e.target.value)}
                    readOnly
                  />
                </div>
              </div>

              {/* F.O */}
              <div style={{ marginTop: '12px' }}>
                <div className="eye-field-group">
                  <label>F.O</label>
                  <input
                    type="text"
                    className="eye-input"
                    value={rightFO}
                    onChange={(e) => setRightFO(e.target.value)}
                    readOnly
                  />
                </div>
              </div>

              {/* DIAG */}
              <div style={{ marginTop: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#2A6484', marginBottom: '8px', display: 'block' }}>DIAG</label>
                <textarea
                  className="eye-notes-textarea"
                  value={rightDiag}
                  onChange={(e) => setRightDiag(e.target.value)}
                  placeholder="Diagnostic..."
                  style={{ minHeight: '120px', maxHeight: '180px' }}
                  readOnly
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Message Modals */}
      <RoomBasedSendMessageModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        patientContext={{
          patientName: patient?.fullName,
          patientId: patient?.id?.toString()
        }}
      />

      <RoomBasedReceiveMessageModal
        isOpen={isReceivedMessagesOpen}
        onClose={() => setIsReceivedMessagesOpen(false)}
        patientContext={{
          patientName: `${patient?.lastName || ''} ${patient?.firstName || ''}`.trim(),
          patientId: patient?.id?.toString()
        }}
      />

      {/* Glasses Prescription Modal */}
      {showGlassesPrescription && (
        <GlassesPrescriptionModal
          isOpen={showGlassesPrescription}
          onClose={() => setShowGlassesPrescription(false)}
          patientName={`${patient?.firstName || ''} ${patient?.lastName || ''}`}
          patientAge={patient?.age?.toString() || ''}
          patientCode={patient?.departmentCode?.toString() || patient?.id?.toString() || ''}
          visionData={{
            vl: {
              od: {
                sphere: rightEye.sphere || '',
                cylinder: rightEye.cylinder || '',
                axis: rightEye.axis || ''
              },
              og: {
                sphere: leftEye.sphere || '',
                cylinder: leftEye.cylinder || '',
                axis: leftEye.axis || ''
              },
              addition: addition || ''
            }
          }}
        />
      )}

      {/* Contact Lens Modal */}
      {showContactLens && (
        <ContactLensModal
          isOpen={showContactLens}
          onClose={() => setShowContactLens(false)}
          patient={patient}
          visionData={{
            od: {
              sphere: rightEye.sphere || '',
              cylinder: rightEye.cylinder || '',
              axis: rightEye.axis || '',
              vl: rightEye.vl || ''
            },
            og: {
              sphere: leftEye.sphere || '',
              cylinder: leftEye.cylinder || '',
              axis: leftEye.axis || '',
              vl: leftEye.vl || ''
            },
            addition: addition || ''
          }}
        />
      )}

      {/* Payment History Modal */}
      {showPaymentHistory && (
        <div className="payment-history-modal" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            width: '80%',
            maxWidth: '1000px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0 }}>💰 Historique des Paiements - {patient?.firstName} {patient?.lastName}</h2>
              <button 
                onClick={() => setShowPaymentHistory(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer'
                }}
              >✖</button>
            </div>
            
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {paymentHistory.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#999' }}>Aucun paiement trouvé pour ce patient</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e0e0e0', background: '#f5f5f5' }}>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333' }}>N°</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#333' }}>DATE</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#333' }}>HEURE</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#333' }}>ACTE</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#333' }}>MONTANT</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#333' }}>MEDECIN</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#333' }}>MT ASSISTANT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((record: any, index: number) => (
                      <tr key={record.id || index} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: '500' }}>{index + 1}</td>
                        <td style={{ padding: '12px' }}>{record.date}</td>
                        <td style={{ padding: '12px' }}>{record.time}</td>
                        <td style={{ padding: '12px', color: '#555' }}>{record.actePratique}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#2A6484' }}>
                          {record.montant === 0 ? 'Gratuit' : `${record.montant.toLocaleString()} DA`}
                        </td>
                        <td style={{ padding: '12px', fontWeight: '500', color: '#429898' }}>{record.medecin}</td>
                        <td style={{ padding: '12px', textAlign: 'right', color: '#666' }}>
                          {record.mtAssistant ? `${record.mtAssistant.toLocaleString()} DA` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            {paymentHistory.length > 0 && (
              <div style={{
                padding: '15px 20px',
                borderTop: '2px solid #e0e0e0',
                background: '#f9f9f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <strong>Total des consultations: </strong>
                  <span style={{ fontSize: '18px', color: '#429898', fontWeight: 'bold', marginLeft: '8px' }}>
                    {paymentHistory.length}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '24px' }}>
                  <div>
                    <strong>Total Montant: </strong>
                    <span style={{ fontSize: '18px', color: '#2A6484', fontWeight: 'bold' }}>
                      {paymentHistory.reduce((sum, r) => sum + (r.montant || 0), 0).toLocaleString()} DA
                    </span>
                  </div>
                  <div>
                    <strong>Total Assistant: </strong>
                    <span style={{ fontSize: '18px', color: '#666', fontWeight: 'bold' }}>
                      {paymentHistory.reduce((sum, r) => sum + (r.mtAssistant || 0), 0).toLocaleString()} DA
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Bar with Patient Action Buttons */}
      <div style={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        background: '#2A6484', // Same color as top bar
        padding: '12px',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        gap: '16px',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)'
      }}>
        {/* S Button */}
        <button 
          style={{
            background: '#9c27b0', // Purple
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 20px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            minWidth: '60px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease'
          }}
          title="Dilatation sous Skiacol"
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onClick={async () => {
            if (!patient.departmentCode || !user) {
              alert('❌ Code patient ou utilisateur introuvable')
              return
            }
            
            const payload = {
              patientCode: patient.departmentCode,
              patientName: `${patient.firstName} ${patient.lastName}`.trim(),
              fromUserId: user.id,
              fromUserName: user.name || user.email,
              fromUserRole: user.role,
              actionType: 'S',
              actionLabel: 'Dilatation sous Skiacol'
            }
            
            const result = await window.electronAPI.queue.sendToNurse(payload)
            if (result?.success) {
              alert('✅ Patient envoyé à l\'infirmière pour Dilatation sous Skiacol')
            } else {
              alert(`❌ Erreur: ${result?.error || 'Impossible d\'envoyer le patient'}`)
            }
          }}
        >
          S
        </button>

        {/* D Button */}
        <button 
          style={{
            background: '#2196f3', // Blue
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 20px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            minWidth: '60px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease'
          }}
          title="Dilatation OD"
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onClick={async () => {
            if (!patient.departmentCode || !user) {
              alert('❌ Code patient ou utilisateur introuvable')
              return
            }
            
            const payload = {
              patientCode: patient.departmentCode,
              patientName: `${patient.firstName} ${patient.lastName}`.trim(),
              fromUserId: user.id,
              fromUserName: user.name || user.email,
              fromUserRole: user.role,
              actionType: 'D',
              actionLabel: 'Dilatation OD'
            }
            
            const result = await window.electronAPI.queue.sendToNurse(payload)
            if (result?.success) {
              alert('✅ Patient envoyé à l\'infirmière pour Dilatation OD')
            } else {
              alert(`❌ Erreur: ${result?.error || 'Impossible d\'envoyer le patient'}`)
            }
          }}
        >
          D
        </button>

        {/* G Button */}
        <button 
          style={{
            background: '#ff9800', // Orange
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 20px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            minWidth: '60px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease'
          }}
          title="Dilatation OG"
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onClick={async () => {
            if (!patient.departmentCode || !user) {
              alert('❌ Code patient ou utilisateur introuvable')
              return
            }
            
            const payload = {
              patientCode: patient.departmentCode,
              patientName: `${patient.firstName} ${patient.lastName}`.trim(),
              fromUserId: user.id,
              fromUserName: user.name || user.email,
              fromUserRole: user.role,
              actionType: 'G',
              actionLabel: 'Dilatation OG'
            }
            
            const result = await window.electronAPI.queue.sendToNurse(payload)
            if (result?.success) {
              alert('✅ Patient envoyé à l\'infirmière pour Dilatation OG')
            } else {
              alert(`❌ Erreur: ${result?.error || 'Impossible d\'envoyer le patient'}`)
            }
          }}
        >
          G
        </button>

        {/* ODG Button */}
        <button 
          style={{
            background: '#f44336', // Red
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 20px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            minWidth: '60px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease'
          }}
          title="Dilatation ODG"
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onClick={async () => {
            if (!patient.departmentCode || !user) {
              alert('❌ Code patient ou utilisateur introuvable')
              return
            }
            
            const payload = {
              patientCode: patient.departmentCode,
              patientName: `${patient.firstName} ${patient.lastName}`.trim(),
              fromUserId: user.id,
              fromUserName: user.name || user.email,
              fromUserRole: user.role,
              actionType: 'ODG',
              actionLabel: 'Dilatation ODG'
            }
            
            const result = await window.electronAPI.queue.sendToNurse(payload)
            if (result?.success) {
              alert('✅ Patient envoyé à l\'infirmière pour Dilatation ODG')
            } else {
              alert(`❌ Erreur: ${result?.error || 'Impossible d\'envoyer le patient'}`)
            }
          }}
        >
          ODG
        </button>
        
        {/* Send Message Button */}
        <button 
          style={{
            background: '#4CAF50', // Green
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            minWidth: '140px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease'
          }}
          title="Envoyer un message"
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onClick={() => setIsSendModalOpen(true)}
        >
          📨 Envoyer Message
        </button>
        
        {/* Received Messages Button */}
        <button 
          style={{
            background: '#2196F3', // Blue
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            minWidth: '140px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease'
          }}
          title={`Messages Reçus - ${patient?.firstName || ''} ${patient?.lastName || ''}`}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onClick={() => setIsReceivedMessagesOpen(true)}
        >
          📬 Messages Reçus
        </button>
        
        {/* Payment History Button */}
        <button 
          style={{
            background: '#FF9800', // Orange
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            minWidth: '140px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease'
          }}
          title="Historique des Paiements"
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onClick={() => setShowPaymentHistory(!showPaymentHistory)}
        >
          💰 Historique Paiements
        </button>
        
        {/* Ordonnance Button - NAVIGATES TO PAGE */}
        <button 
          style={{
            background: '#3F51B5', // Blue
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 20px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            minWidth: '60px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease'
          }}
          title="Ordonnance"
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onClick={() => {
            // Navigate TO ordonnance page with patient data
            navigate('/ordonnance', { 
              state: { 
                patient: {
                  ...patient,
                  nom: patient.lastName,
                  prenom: patient.firstName,
                  departmentCode: patient.departmentCode
                }
              } 
            })
          }}
        >
          📝
        </button>
      </div>
    </div>
  )
}

export default PatientDetailsView
