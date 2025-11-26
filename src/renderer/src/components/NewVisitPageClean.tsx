import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface Patient {
  id: number
  departmentCode: number
  firstName?: string
  lastName?: string
  fullName?: string
  age?: number
}

const NewVisitPageClean: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  // State
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(false)
  const [visitId, setVisitId] = useState<number | null>(null)
  
  // Form fields
  const [visitDate, setVisitDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [motif, setMotif] = useState('')
  const [sphereRight, setSphereRight] = useState('')
  const [sphereLeft, setSphereLeft] = useState('')
  const [diagnostic, setDiagnostic] = useState('')

  // Load patient data
  useEffect(() => {
    const loadPatient = async () => {
      if (!patientId) return
      
      try {
        setLoading(true)
        const result = await (window.electronAPI as any)?.db.patients.getById(parseInt(patientId))
        
        if (result?.success && result.patient) {
          setPatient(result.patient)
        }
      } catch (error) {
        console.error('Error loading patient:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPatient()
  }, [patientId])

  // Save visit
  const handleSave = async () => {
    if (!patient?.departmentCode) {
      alert('❌ Erreur: Code patient introuvable')
      return
    }

    try {
      setLoading(true)

      // Convert date format
      const dateParts = visitDate.split('-')
      const month = parseInt(dateParts[1], 10)
      const day = parseInt(dateParts[2], 10)
      const year = dateParts[0]
      const formattedDate = `${month}/${day}/${year}`

      const visitData = {
        patientCode: patient.departmentCode,
        visitDate: formattedDate,
        medecin: user?.name || 'Unknown',
        motif: motif || undefined,
        sphereRight: sphereRight || undefined,
        sphereLeft: sphereLeft || undefined,
        diagnostic: diagnostic || undefined,
      }

      const result = await (window.electronAPI as any)?.db.visitExaminations.create(visitData)
      
      if (result?.success) {
        setVisitId(result.visitExamination?.id || null)
        alert('✅ Visite sauvegardée avec succès')
      } else {
        alert(`❌ Erreur: ${result?.error || 'Erreur inconnue'}`)
      }
    } catch (error) {
      console.error('Error saving visit:', error)
      alert('❌ Erreur lors de la sauvegarde')
    } finally {
      setLoading(false)
    }
  }

  // Go back
  const handleBack = () => {
    navigate(`/patient/${patientId}`)
  }

  if (loading && !patient) {
    return <div style={{ padding: '20px' }}>Chargement...</div>
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Nouvelle Visite</h1>
        <div>
          <button onClick={handleBack} style={{ marginRight: '10px', padding: '8px 16px' }}>
            ← Retour
          </button>
          <button 
            onClick={handleSave} 
            disabled={loading}
            style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            {loading ? 'Sauvegarde...' : '💾 Sauvegarder'}
          </button>
        </div>
      </div>

      {patient && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <h3>Patient: {patient.fullName || `${patient.firstName} ${patient.lastName}`}</h3>
          <p>Code: {patient.departmentCode} | Âge: {patient.age} ans</p>
        </div>
      )}

      <div style={{ display: 'grid', gap: '15px' }}>
        <div>
          <label>Date de visite:</label>
          <input
            type="date"
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div>
          <label>Motif:</label>
          <input
            type="text"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Motif de consultation"
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label>Sphère OD (Droit):</label>
            <input
              type="text"
              value={sphereRight}
              onChange={(e) => setSphereRight(e.target.value)}
              placeholder="+/-"
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>

          <div>
            <label>Sphère OG (Gauche):</label>
            <input
              type="text"
              value={sphereLeft}
              onChange={(e) => setSphereLeft(e.target.value)}
              placeholder="+/-"
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>
        </div>

        <div>
          <label>Diagnostic:</label>
          <textarea
            value={diagnostic}
            onChange={(e) => setDiagnostic(e.target.value)}
            placeholder="Diagnostic et notes"
            rows={4}
            style={{ width: '100%', padding: '8px', marginTop: '5px', resize: 'vertical' }}
          />
        </div>
      </div>

      {visitId && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '4px' }}>
          ✅ Visite sauvegardée (ID: {visitId})
        </div>
      )}
    </div>
  )
}

export default NewVisitPageClean
