import React from 'react'
import { useNavigate } from 'react-router-dom'
import './PatientTable.css'

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
  usefulInfo?: string
  photo1?: string
  generalHistory?: string
  ophthalmoHistory?: string
  createdAt: Date
  updatedAt: Date
  originalCreatedDate?: string
}

interface PatientTableProps {
  patients: Patient[]
  selectedPatientId: number | null
  onPatientSelect: (id: number) => void
}

const PatientTable: React.FC<PatientTableProps> = ({ 
  patients, 
  selectedPatientId, 
  onPatientSelect 
}) => {
  const navigate = useNavigate()

  /**
   * Handle double-click to navigate to patient details
   */
  const handleDoubleClick = (patientId: number) => {
    navigate(`/patient/${patientId}`)
  }

  /**
   * Format date to French format (DD/MM/YYYY)
   */
  const formatDate = (date?: Date | string): string => {
    if (!date) return 'N/A'
    
    // If it's already in DD/MM/YYYY format (from XML), return as is
    if (typeof date === 'string' && date.includes('/')) {
      // Validate it's a proper date format
      const parts = date.split('/')
      if (parts.length === 3 && parts[0].length <= 2 && parts[1].length <= 2) {
        return date
      }
    }
    
    // Otherwise, parse and format
    const d = typeof date === 'string' ? new Date(date) : date
    
    // Check if date is valid
    if (isNaN(d.getTime())) {
      return 'N/A'
    }
    
    return d.toLocaleDateString('fr-FR')
  }

  /**
   * Get display value for record number
   */
  const getRecordNumber = (patient: Patient): string => {
    return patient.recordNumber?.toString() || patient.id.toString()
  }

  return (
    <div className="patient-table-container">
      {/* Patient Table */}
      <div className="table-scroll">
        <table className="patient-table">
          <thead>
            <tr>
              <th>N°</th>
              <th>Créé le</th>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Âge</th>
              <th>Adresse</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((patient) => (
                <tr
                  key={patient.id}
                  className={selectedPatientId === patient.id ? 'highlighted' : ''}
                  onClick={() => onPatientSelect(patient.id)}
                  onDoubleClick={() => handleDoubleClick(patient.id)}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onPatientSelect(patient.id)
                    }
                  }}
                >
                  <td className="numero-cell">{getRecordNumber(patient)}</td>
                  <td className="date-cell">{formatDate(patient.originalCreatedDate || patient.createdAt)}</td>
                  <td className="nom-cell">{patient.lastName}</td>
                  <td className="prenom-cell">{patient.firstName}</td>
                  <td className="age-cell">{patient.age ?? '—'}</td>
                  <td className="adresse-cell">{patient.address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>
    </div>
  )
}

export default PatientTable
