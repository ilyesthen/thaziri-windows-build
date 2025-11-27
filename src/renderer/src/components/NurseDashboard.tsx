import React from 'react'
import PatientManagementLayout from './PatientManagementLayout'
import ErrorBoundary from './ErrorBoundary'

const NurseDashboard: React.FC = () => {
  return (
    <ErrorBoundary>
      <PatientManagementLayout />
    </ErrorBoundary>
  )
}

export default NurseDashboard
