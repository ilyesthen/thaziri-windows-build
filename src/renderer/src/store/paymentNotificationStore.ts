import { create } from 'zustand'

interface PaymentNotification {
  id: number
  patientName: string
  doctorName: string
  totalAmount: number
  timestamp: string
}

interface PaymentNotificationState {
  newPayments: PaymentNotification[]
  lastClearDate: string
  addPayment: (payment: PaymentNotification) => void
  clearPayments: () => void
  removePayment: (id: number) => void
  checkAndClearDaily: () => void
}

const getTodayDate = () => {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

export const usePaymentNotificationStore = create<PaymentNotificationState>((set, get) => ({
  newPayments: [],
  lastClearDate: getTodayDate(),
  
  addPayment: (payment) => {
    // Check if we need to clear for a new day
    const currentDate = getTodayDate()
    const { lastClearDate } = get()
    
    if (currentDate !== lastClearDate) {
      // New day detected, clear old payments
      set({ newPayments: [payment], lastClearDate: currentDate })
    } else {
      // Same day, add to existing payments
      set((state) => ({
        newPayments: [...state.newPayments, payment]
      }))
    }
  },
  
  clearPayments: () =>
    set({ newPayments: [] }),
  
  removePayment: (id) =>
    set((state) => ({
      newPayments: state.newPayments.filter(p => p.id !== id)
    })),
  
  checkAndClearDaily: () => {
    const currentDate = getTodayDate()
    const { lastClearDate } = get()
    
    if (currentDate !== lastClearDate) {
      // New day detected, clear all payments
      set({ newPayments: [], lastClearDate: currentDate })
    }
  }
}))
