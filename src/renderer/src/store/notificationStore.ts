import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NotificationState {
  // Dilatation notifications per room
  dilatationNotifications: { [roomId: number]: number }
  
  // Message notification flag
  hasUnreadMessages: boolean
  
  // Payment notification flag
  hasUnreadPayments: boolean
  
  // Actions
  addDilatationNotification: (roomId: number) => void
  clearDilatationNotification: (roomId: number) => void
  setUnreadMessages: (value: boolean) => void
  setUnreadPayments: (value: boolean) => void
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      dilatationNotifications: {},
      hasUnreadMessages: false,
      hasUnreadPayments: false,
      
      addDilatationNotification: (roomId: number) =>
        set((state) => ({
          dilatationNotifications: {
            ...state.dilatationNotifications,
            [roomId]: (state.dilatationNotifications[roomId] || 0) + 1
          }
        })),
      
      clearDilatationNotification: (roomId: number) =>
        set((state) => ({
          dilatationNotifications: {
            ...state.dilatationNotifications,
            [roomId]: 0
          }
        })),
      
      setUnreadMessages: (value: boolean) =>
        set({ hasUnreadMessages: value }),
      
      setUnreadPayments: (value: boolean) =>
        set({ hasUnreadPayments: value })
    }),
    {
      name: 'notification-storage'
    }
  )
)
