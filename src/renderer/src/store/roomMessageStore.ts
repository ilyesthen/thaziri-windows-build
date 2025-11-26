import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface RoomMessage {
  id: string
  senderId: string
  senderName: string
  senderRole?: string
  content: string
  timestamp: number
  roomId?: number // For room-based messages
  recipientId?: string // For direct nurse->doctor messages
  patientContext?: {
    patientName?: string
    patientId?: string
  }
  audioData?: string
  isVoiceMessage?: boolean
}

interface RoomMessageState {
  // Messages organized by room (for nurses)
  roomMessages: Record<number, RoomMessage[]> // roomId -> messages
  
  // Messages organized by sender (for doctors/assistants receiving from nurses)
  directMessages: Record<string, RoomMessage[]> // senderId -> messages
  
  // Room notification counts
  roomNotifications: Record<number, number> // roomId -> unread count
  
  // Selected rooms for nurse (persisted)
  selectedRooms: {
    window1: number | null
    window2: number | null
  }
  
  // Selected nurse for doctor/assistant (persisted)
  selectedNurse: string | null
  
  // Add room message (for nurses)
  addRoomMessage: (roomId: number, message: RoomMessage) => void
  
  // Add direct message (for doctors/assistants)
  addDirectMessage: (message: RoomMessage) => void
  
  // Clear messages for a room
  clearRoomMessages: (roomId: number) => void
  
  // Clear direct messages from a sender
  clearDirectMessages: (senderId: string) => void
  
  // Set selected rooms for nurse
  setSelectedRooms: (window1: number | null, window2: number | null) => void
  
  // Set selected nurse for doctor/assistant
  setSelectedNurse: (nurseId: string | null) => void
  
  // Mark room messages as read
  markRoomAsRead: (roomId: number) => void
  
  // Get unread count for a room
  getUnreadCount: (roomId: number) => number
  
  // Get all room messages
  getRoomMessages: (roomId: number) => RoomMessage[]
  
  // Get all direct messages from a sender
  getDirectMessages: (senderId: string) => RoomMessage[]
}

export const useRoomMessageStore = create<RoomMessageState>()(
  persist(
    (set, get) => ({
      roomMessages: {},
      directMessages: {},
      roomNotifications: {},
      selectedRooms: {
        window1: null,
        window2: null
      },
      selectedNurse: null,
      
      addRoomMessage: (roomId, message) => {
        set((state) => {
          const roomMsgs = state.roomMessages[roomId] || []
          const notifications = { ...state.roomNotifications }
          notifications[roomId] = (notifications[roomId] || 0) + 1
          
          return {
            roomMessages: {
              ...state.roomMessages,
              [roomId]: [...roomMsgs, message]
            },
            roomNotifications: notifications
          }
        })
      },
      
      addDirectMessage: (message) => {
        set((state) => {
          const senderId = message.senderId
          const senderMsgs = state.directMessages[senderId] || []
          
          return {
            directMessages: {
              ...state.directMessages,
              [senderId]: [...senderMsgs, message]
            }
          }
        })
      },
      
      clearRoomMessages: (roomId) => {
        set((state) => {
          const newRoomMessages = { ...state.roomMessages }
          delete newRoomMessages[roomId]
          
          const newNotifications = { ...state.roomNotifications }
          delete newNotifications[roomId]
          
          return {
            roomMessages: newRoomMessages,
            roomNotifications: newNotifications
          }
        })
      },
      
      clearDirectMessages: (senderId) => {
        set((state) => {
          const newDirectMessages = { ...state.directMessages }
          delete newDirectMessages[senderId]
          
          return {
            directMessages: newDirectMessages
          }
        })
      },
      
      setSelectedRooms: (window1, window2) => {
        set({ selectedRooms: { window1, window2 } })
      },
      
      setSelectedNurse: (nurseId) => {
        set({ selectedNurse: nurseId })
      },
      
      markRoomAsRead: (roomId) => {
        set((state) => {
          const newNotifications = { ...state.roomNotifications }
          delete newNotifications[roomId]
          
          return {
            roomNotifications: newNotifications
          }
        })
      },
      
      getUnreadCount: (roomId) => {
        const state = get()
        return state.roomNotifications[roomId] || 0
      },
      
      getRoomMessages: (roomId) => {
        const state = get()
        return state.roomMessages[roomId] || []
      },
      
      getDirectMessages: (senderId) => {
        const state = get()
        return state.directMessages[senderId] || []
      }
    }),
    {
      name: 'thaziri-room-messages',
      partialize: (state) => ({
        selectedRooms: state.selectedRooms,
        selectedNurse: state.selectedNurse
      })
    }
  )
)
