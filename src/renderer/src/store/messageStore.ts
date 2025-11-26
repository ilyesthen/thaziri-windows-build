import { create } from 'zustand'

interface Message {
  senderId: string
  senderName: string
  senderRole?: string
  content: string
  timestamp: number
}

interface MessageState {
  newMessages: Message[]
  addMessage: (message: Message) => void
  clearMessages: () => void
  removeMessage: (timestamp: number) => void
  clearMessagesFromSender: (senderId: string) => void
  getGroupedMessages: () => Record<string, Message[]>
}

export const useMessageStore = create<MessageState>((set, get) => ({
  newMessages: [],
  
  addMessage: (message) =>
    set((state) => ({
      newMessages: [...state.newMessages, message]
    })),
  
  clearMessages: () =>
    set({ newMessages: [] }),
  
  removeMessage: (timestamp) =>
    set((state) => ({
      newMessages: state.newMessages.filter(m => m.timestamp !== timestamp)
    })),
  
  clearMessagesFromSender: (senderId) =>
    set((state) => ({
      newMessages: state.newMessages.filter(m => m.senderId !== senderId)
    })),
  
  getGroupedMessages: () => {
    const messages = get().newMessages
    return messages.reduce((groups, message) => {
      const senderId = message.senderId
      if (!groups[senderId]) {
        groups[senderId] = []
      }
      groups[senderId].push(message)
      return groups
    }, {} as Record<string, Message[]>)
  }
}))
