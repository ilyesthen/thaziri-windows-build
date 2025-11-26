import React, { useEffect, useState } from 'react'
import { useMessageStore } from '../store/messageStore'
import SenderListView from './SenderListView'
import MessageView from './MessageView'
import './ReceiveMessageModal.css'

interface ReceiveMessageModalProps {
  isOpen: boolean
  onClose: () => void
  patientContext?: {
    patientName?: string
    patientId?: string
  }
}

const ReceiveMessageModal: React.FC<ReceiveMessageModalProps> = ({ isOpen, onClose, patientContext }) => {
  const { getGroupedMessages } = useMessageStore()
  const [selectedSenderId, setSelectedSenderId] = useState<string | null>(null)

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedSenderId(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const groupedMessages = getGroupedMessages()
  const senderIds = Object.keys(groupedMessages)

  // Routing logic
  let content: React.ReactNode

  if (senderIds.length === 0) {
    // No messages - show empty state
    content = (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        color: '#6b7280' 
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
        <p>Aucun message reçu</p>
      </div>
    )
  } else if (senderIds.length === 1 && !selectedSenderId) {
    // Single sender - bypass list and show messages directly
    const onlySenderId = senderIds[0]
    content = (
      <MessageView
        senderId={onlySenderId}
        senderName={groupedMessages[onlySenderId][0].senderName}
        messages={groupedMessages[onlySenderId]}
        onBack={null}
      />
    )
  } else if (selectedSenderId) {
    // Sender selected - show their messages
    const messages = groupedMessages[selectedSenderId]
    if (!messages || messages.length === 0) {
      // Sender's messages were cleared, go back to list
      setSelectedSenderId(null)
      return null
    }
    content = (
      <MessageView
        senderId={selectedSenderId}
        senderName={messages[0].senderName}
        messages={messages}
        onBack={() => setSelectedSenderId(null)}
      />
    )
  } else {
    // Multiple senders - show list
    content = (
      <SenderListView
        groupedMessages={groupedMessages}
        onSelectSender={(senderId) => setSelectedSenderId(senderId)}
      />
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="receive-message-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📬 Messages Reçus {patientContext?.patientName && `- ${patientContext.patientName}`}</h2>
          <button className="close-btn" onClick={onClose}>✖</button>
        </div>

        <div className="modal-body">
          {content}
        </div>
      </div>
    </div>
  )
}

export default ReceiveMessageModal
