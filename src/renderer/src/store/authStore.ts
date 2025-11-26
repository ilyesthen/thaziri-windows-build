import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: number
  email: string
  name: string
  role: string
  assistantName?: string // The actual assistant's name (for assistant_1 and assistant_2)
  createdAt: Date
  updatedAt: Date
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  sessionName: string | null // For assistants: the name they entered at login
  lastRecipient: Record<number, string> // userId -> recipientId mapping
  login: (user: User, sessionName?: string) => void
  logout: () => void
  setLastRecipient: (userId: number, recipientId: string) => void
  getLastRecipient: (userId: number) => string | null
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      sessionName: null,
      lastRecipient: {},
      login: (user, sessionName) => set({ user, isAuthenticated: true, sessionName: sessionName || null }),
      logout: () => set({ user: null, isAuthenticated: false, sessionName: null }),
      setLastRecipient: (userId, recipientId) => 
        set((state) => ({
          lastRecipient: { ...state.lastRecipient, [userId]: recipientId }
        })),
      getLastRecipient: (userId) => {
        const state = get()
        return state.lastRecipient[userId] || null
      },
    }),
    {
      name: 'thaziri-auth-storage',
      partialize: (state) => ({ lastRecipient: state.lastRecipient }), // Only persist lastRecipient
    }
  )
)
