import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { usePaymentNotificationStore } from '../store/paymentNotificationStore'
import './PaymentNotificationModal.css'

interface PaymentNotification {
  id: number
  patientName: string
  patientCode: number
  doctorName: string
  totalAmount: number
  selectedActs: string // JSON string of acts
  timestamp: string
  isRead: boolean
}

interface PaymentNotificationModalProps {
  isOpen: boolean
  onClose: () => void
}

const PaymentNotificationModal: React.FC<PaymentNotificationModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore()
  const { clearPayments } = usePaymentNotificationStore()
  const [notifications, setNotifications] = useState<PaymentNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  
  useEffect(() => {
    if (isOpen && user?.role === 'nurse') {
      fetchNotifications()
      
      // Auto-refresh every 5 seconds when modal is open
      const interval = autoRefresh ? setInterval(fetchNotifications, 5000) : null
      
      return () => {
        if (interval) clearInterval(interval)
      }
    }
  }, [isOpen, user, autoRefresh])
  
  const fetchNotifications = async () => {
    setLoading(true)
    try {
      // Get recent payment validations
      const result = await window.electronAPI.payments.getAll({
        status: 'completed'
      })
      
      if (result?.success) {
        const recentPayments = result.payments || []
        // Sort by most recent first
        const sortedPayments = recentPayments.sort((a: any, b: any) => 
          new Date(b.validatedAt).getTime() - new Date(a.validatedAt).getTime()
        )
        
        // Take only the last 50
        const limitedPayments = sortedPayments.slice(0, 50)
        
        setNotifications(limitedPayments.map((p: any) => ({
          id: p.id,
          patientName: p.patientName,
          patientCode: p.patientCode,
          doctorName: p.validatedBy,
          totalAmount: p.totalAmount,
          selectedActs: p.selectedActs,
          timestamp: p.validatedAt,
          isRead: true // Assume all are read when modal is open
        })))
        
        // When modal is opened, clear payment notifications to stop sound
        if (isOpen) {
          clearPayments()
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'À l\'instant'
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffMins < 1440) return `Il y a ${Math.floor(diffMins / 60)} h`
    return date.toLocaleDateString('fr-FR')
  }
  
  const parseActs = (actsJson: string) => {
    try {
      const acts = JSON.parse(actsJson)
      return acts.map((act: any) => act.actePratique).join(', ')
    } catch {
      return 'N/A'
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="notification-modal-overlay" onClick={onClose}>
      <div className="notification-modal" onClick={(e) => e.stopPropagation()}>
        <div className="notification-header">
          <h2>🔔 Notifications de Paiement</h2>
          <div className="notification-controls">
            <label className="auto-refresh-toggle">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <span>Actualisation automatique</span>
            </label>
            <button className="refresh-btn" onClick={fetchNotifications} disabled={loading}>
              🔄
            </button>
            <button className="close-btn" onClick={onClose}>✖</button>
          </div>
        </div>
        
        <div className="notification-body">
          {loading && notifications.length === 0 ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Chargement des notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="empty-state">
              <p>Aucune notification de paiement</p>
            </div>
          ) : (
            <div className="notifications-list">
              {notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                >
                  <div className="notif-icon">💰</div>
                  <div className="notif-content">
                    <div className="notif-main">
                      <strong>{notif.doctorName}</strong> a validé un paiement de{' '}
                      <span className="amount">{notif.totalAmount.toLocaleString()} DA</span>
                    </div>
                    <div className="notif-details">
                      <span className="patient">Patient: {notif.patientName}</span>
                      <span className="acts">Actes: {parseActs(notif.selectedActs)}</span>
                    </div>
                    <div className="notif-time">{formatTime(notif.timestamp)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PaymentNotificationModal
