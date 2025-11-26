import React from 'react'
import './SenderListView.css'

interface Message {
  senderId: string
  senderName: string
  senderRole?: string
  content: string
  timestamp: number
}

interface SenderListViewProps {
  groupedMessages: Record<string, Message[]>
  onSelectSender: (senderId: string) => void
}

const SenderListView: React.FC<SenderListViewProps> = ({ groupedMessages, onSelectSender }) => {
  const senderIds = Object.keys(groupedMessages)

  return (
    <div className="sender-list-view">
      <h3>Sélectionnez un expéditeur</h3>
      <div className="sender-list">
        {senderIds.map((senderId) => {
          const messages = groupedMessages[senderId]
          const senderName = messages[0].senderName
          const senderRole = messages[0].senderRole
          const messageCount = messages.length

          return (
            <div
              key={senderId}
              className="sender-item"
              onClick={() => onSelectSender(senderId)}
            >
              <div className="sender-info">
                <div className="sender-name">{senderName}</div>
                {senderRole && (
                  <div className="sender-role">{senderRole}</div>
                )}
                <div className="sender-id">ID: {senderId}</div>
              </div>
              <div className="message-count-badge">
                {messageCount} {messageCount === 1 ? 'message' : 'messages'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SenderListView
