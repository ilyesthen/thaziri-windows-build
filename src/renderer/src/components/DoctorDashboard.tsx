import React from 'react'
import PatientManagementLayout from './PatientManagementLayout'
import './Dashboard.css'

const DoctorDashboard: React.FC = () => {
  return (
    <div className="doctor-dashboard">
      <div className="dashboard-content">
        <PatientManagementLayout />
      </div>
    </div>
  )
}

export default DoctorDashboard
