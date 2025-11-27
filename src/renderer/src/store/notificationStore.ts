import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NotificationState {
  // Dilatation notifications per room
  dilatationNotifications: { [roomId: number]: number }
  
  // Track viewed/dismissed dilatation counts to prevent re-notifications
  viewedDilatationCounts: { [roomId: number]: number }
  
  // Message notification flag
  hasUnreadMessages: boolean
  
  // Payment notification flag
  hasUnreadPayments: boolean
  
  // Track viewed message and payment counts to prevent re-notifications
  viewedMessageCount: number
  viewedPaymentCount: number
  
  // Actions
  addDilatationNotification: (roomId: number) => void
  clearDilatationNotification: (roomId: number, currentCount: number) => void
  setUnreadMessages: (value: boolean, currentCount?: number) => void
  setUnreadPayments: (value: boolean, currentCount?: number) => void
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      dilatationNotifications: {},
      viewedDilatationCounts: {},
      hasUnreadMessages: false,
      hasUnreadPayments: false,
      viewedMessageCount: 0,
      viewedPaymentCount: 0,
      
      addDilatationNotification: (roomId: number) =>
        set((state) => ({
          dilatationNotifications: {
            ...state.dilatationNotifications,
            [roomId]: (state.dilatationNotifications[roomId] || 0) + 1
          }
        })),
      
      clearDilatationNotification: (roomId: number, currentCount: number) =>
        set((state) => ({
          dilatationNotifications: {
            ...state.dilatationNotifications,
            [roomId]: 0
          },
          viewedDilatationCounts: {
            ...state.viewedDilatationCounts,
            [roomId]: currentCount
          }
        })),
      
      setUnreadMessages: (value: boolean, currentCount?: number) =>
        set((state) => ({
          hasUnreadMessages: value,
          // When dismissing (value=false), save the viewed count
          viewedMessageCount: value === false && currentCount !== undefined 
            ? currentCount 
            : state.viewedMessageCount
        })),
      
      setUnreadPayments: (value: boolean, currentCount?: number) =>
        set((state) => ({
          hasUnreadPayments: value,
          // When dismissing (value=false), save the viewed count
          viewedPaymentCount: value === false && currentCount !== undefined 
            ? currentCount 
            : state.viewedPaymentCount
        }))
    }),
    {
      name: 'notification-storage'
    }
  )
)
