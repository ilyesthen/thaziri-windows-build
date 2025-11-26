import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import SendMessageModal from './SendMessageModal'
import ReceiveMessageModal from './ReceiveMessageModal'
import NotificationSound from './NotificationSound'
import { useMessageStore } from '../store/messageStore'
import { useAuthStore } from '../store/authStore'
import './FloatingMessagingButtons.css'

const FloatingMessagingButtons: React.FC = () => {
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [isReceivedMessagesOpen, setIsReceivedMessagesOpen] = useState(false)
  const { newMessages, addMessage } = useMessageStore()
  const { user: currentUser } = useAuthStore()
  const location = useLocation()

  // Setup message listener with role-based pop-up logic (must be before any returns)
  useEffect(() => {
    const cleanup = window.electronAPI.messaging.onNewMessage((message) => {
      // Add message to store
      addMessage(message)

      // Role-based auto pop-up: If doctor sends to nurse, force modal open
      if (message.senderRole === 'doctor' && currentUser?.role === 'nurse') {
        setIsReceivedMessagesOpen(true)
      }
    })

    return () => {
      cleanup()
    }
  }, [addMessage, currentUser])

  // Only show for doctor, nurse, and assistant roles
  if (!currentUser || currentUser.role === 'admin') {
    return (
      <>
        <NotificationSound />
      </>
    )
  }

  // Don't show on dashboard (it already has the buttons in sidebar)
  if (location.pathname === '/') {
    return (
      <>
        <NotificationSound />
      </>
    )
  }

  // Don't show on new-visit, edit-visit, or patient detail pages (they have integrated bottom bar)
  if (location.pathname.includes('/new-visit') || 
      location.pathname.includes('/edit-visit') || 
      location.pathname.includes('/patient/')) {
    return (
      <>
        <NotificationSound />
      </>
    )
  }

  return (
    <>
      <div className="messaging-bottom-bar">
        <div className="bottom-bar-container">
          {/* Send Message Button */}
          <button 
            className="bottom-bar-btn send-btn"
            onClick={() => setIsSendModalOpen(true)}
            title="Envoyer un message"
          >
            <span className="btn-icon">📨</span>
            <span className="btn-text">Envoyer un message</span>
          </button>

          {/* Received Messages Button */}
          <button 
            className="bottom-bar-btn received-btn"
            onClick={() => setIsReceivedMessagesOpen(true)}
            title="Messages reçus"
          >
            <span className="btn-icon">📬</span>
            <span className="btn-text">Messages Reçus</span>
            {newMessages.length > 0 && (
              <span className="bottom-bar-badge">{newMessages.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Modals */}
      <SendMessageModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
      />

      <ReceiveMessageModal
        isOpen={isReceivedMessagesOpen}
        onClose={() => setIsReceivedMessagesOpen(false)}
      />

      {/* Notification Sound for new messages */}
      <NotificationSound />
    </>
  )
}

export default FloatingMessagingButtons
