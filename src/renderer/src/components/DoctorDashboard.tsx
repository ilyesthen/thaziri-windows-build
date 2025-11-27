import React from 'react'
import PatientManagementLayout from './PatientManagementLayout'
import ErrorBoundary from './ErrorBoundary'
import './Dashboard.css'

const DoctorDashboard: React.FC = () => {
  return (
    <ErrorBoundary>
      <div className="doctor-dashboard">
        <div className="dashboard-content">
          <PatientManagementLayout />
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default DoctorDashboard
