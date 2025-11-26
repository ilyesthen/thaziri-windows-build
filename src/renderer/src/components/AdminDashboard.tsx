import React, { useState } from 'react'
import LogoutButton from './LogoutButton'
import UserManagement from './UserManagement'
import SalleManagement from './SalleManagement'
import PaymentJournalLog from './PaymentJournalLog'
import './Dashboard.css'

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'salles' | 'journal'>('users')
  
  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagement />
      case 'salles':
        return <SalleManagement />
      case 'journal':
        return <PaymentJournalLog isOpen={true} onClose={() => {}} />
      default:
        return <UserManagement />
    }
  }
  
  return (
    <div className="dashboard" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div className="admin-tabs">
        <button 
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Gestion des Utilisateurs
        </button>
        <button 
          className={`admin-tab ${activeTab === 'salles' ? 'active' : ''}`}
          onClick={() => setActiveTab('salles')}
        >
          🏥 Gestion des Salles
        </button>
        <button 
          className={`admin-tab ${activeTab === 'journal' ? 'active' : ''}`}
          onClick={() => setActiveTab('journal')}
        >
          📋 Journal des Paiements
        </button>
      </div>
      
      <div className="admin-content">
        {renderContent()}
      </div>
      
      <div style={{ padding: '20px', textAlign: 'center', background: '#FFFFFF', borderTop: '1px solid #F1F1F1' }}>
        <LogoutButton />
      </div>
    </div>
  )
}

export default AdminDashboard
