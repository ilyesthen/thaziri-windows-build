import React, { useState, useMemo } from 'react'
import './PatientList.css'

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

interface PatientListProps {
  patients: Patient[]
  selectedPatientId: number | null
  onPatientSelect: (id: number) => void
}

const PatientList: React.FC<PatientListProps> = ({ 
  patients, 
  selectedPatientId, 
  onPatientSelect 
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Filter patients based on search term
  const filteredPatients = useMemo(() => {
    if (!searchTerm.trim()) return patients

    const search = searchTerm.toLowerCase()
    return patients.filter(patient => 
      patient.firstName.toLowerCase().includes(search) ||
      patient.lastName.toLowerCase().includes(search) ||
      patient.fullName.toLowerCase().includes(search) ||
      patient.code?.toLowerCase().includes(search) ||
      patient.phone?.includes(search) ||
      patient.address?.toLowerCase().includes(search)
    )
  }, [patients, searchTerm])

  const formatDate = (date?: Date | string): string => {
    if (!date) return 'N/A'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('fr-FR')
  }

  return (
    <div className="patient-list-container">
      {/* Search Bar */}
      <div className="patient-search">
        <input
          type="text"
          placeholder="🔍 Search patients by name, code, phone, or address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        {searchTerm && (
          <button 
            className="clear-search"
            onClick={() => setSearchTerm('')}
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Results Count */}
      <div className="results-info">
        {searchTerm ? (
          <span>
            Found {filteredPatients.length} of {patients.length} patients
          </span>
        ) : (
          <span>
            {patients.length} total patients
          </span>
        )}
      </div>

      {/* Patient List */}
      <div className="patient-list-scroll">
        {filteredPatients.length === 0 ? (
          <div className="no-patients">
            {searchTerm ? (
              <p>No patients match your search.</p>
            ) : (
              <p>No patients in the database.</p>
            )}
          </div>
        ) : (
          <table className="patient-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Last Name</th>
                <th>First Name</th>
                <th>Age</th>
                <th>Date of Birth</th>
                <th>Address</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((patient) => (
                <tr
                  key={patient.id}
                  className={selectedPatientId === patient.id ? 'selected' : ''}
                  onClick={() => onPatientSelect(patient.id)}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onPatientSelect(patient.id)
                    }
                  }}
                >
                  <td className="code-cell">{patient.code || '—'}</td>
                  <td className="name-cell">{patient.lastName}</td>
                  <td className="name-cell">{patient.firstName}</td>
                  <td className="age-cell">{patient.age ?? '—'}</td>
                  <td className="date-cell">{formatDate(patient.dateOfBirth)}</td>
                  <td className="address-cell">{patient.address || '—'}</td>
                  <td className="phone-cell">{patient.phone || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default PatientList
