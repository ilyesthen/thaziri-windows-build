import React, { useEffect } from 'react'
import { useRoomMessageStore } from '../store/roomMessageStore'
import { useMessageStore } from '../store/messageStore'
import { useAuthStore } from '../store/authStore'

const MessageListener: React.FC = () => {
  const { user } = useAuthStore()
  const { addRoomMessage, addDirectMessage } = useRoomMessageStore()
  const { addMessage } = useMessageStore() // Legacy store for backward compatibility
  
  useEffect(() => {
    if (!user) return

    const cleanup = window.electronAPI.messaging.onNewMessage((message) => {
      // Generate a unique ID for the message
      const messageId = `${message.senderId}-${message.timestamp}-${Math.random()}`
      const enrichedMessage = {
        ...message,
        id: messageId
      }

      // Play notification sound
      const audio = new Audio('/notification.mp3')
      audio.play().catch(e => console.log('Could not play notification sound:', e))

      // Route message based on user role and message type
      const isNurse = user.role === 'nurse'
      const isDoctor = user.role === 'doctor'
      const isAssistant = user.role?.includes('assistant')
      
      // Don't show the sender their own messages
      if (message.senderId === user.id.toString()) {
        console.log('Skipping own message')
        return
      }

      if (message.roomId && (isDoctor || isAssistant)) {
        // Doctor/Assistant receiving room-based message (sent to a room)
        // This means a nurse sent a message to the room they're in
        addDirectMessage(enrichedMessage)
      } else if (message.roomId && isNurse) {
        // Nurse receiving room broadcast message from another user
        addRoomMessage(message.roomId, enrichedMessage)
      } else if (message.recipientId === user.id.toString()) {
        // Direct message to this specific user
        if (isNurse) {
          // Nurse receiving direct message from doctor/assistant
          // Store as direct message
          addDirectMessage(enrichedMessage)
        } else {
          // Doctor/Assistant receiving direct message
          addDirectMessage(enrichedMessage)
        }
      }

      // Also add to legacy store for backward compatibility
      addMessage(message)

      // Show desktop notification
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(`Nouveau message de ${message.senderName}`, {
          body: message.isVoiceMessage ? '🎤 Message vocal' : message.content,
          icon: '/icon.png'
        })

        notification.onclick = () => {
          window.focus()
        }
      }
    })

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return () => {
      cleanup()
    }
  }, [user, addRoomMessage, addDirectMessage, addMessage])

  return null
}

export default MessageListener
