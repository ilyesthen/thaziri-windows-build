// Global type definitions for Electron API

interface NetworkUser {
  userId: number
  username: string
  role: string
  ipAddress: string
  messagingPort: number
  lastSeen: number
}

interface ElectronAPI {
  getVersion: () => Promise<string>
  getPlatform: () => Promise<string>
  isPackaged: () => Promise<boolean>
  openFile: () => Promise<string | null>
  saveFile: () => Promise<string | null>
  ping: () => Promise<string>
  
  auth: {
    verifyCredentials: (email: string, password: string) => Promise<any>
    login: (email: string, password: string) => Promise<any>
    getUsersForLogin: () => Promise<any[]>
    createUserWithPassword: (data: {
      email: string
      name: string
      password: string
      role?: string
    }) => Promise<any>
  }
  
  db: {
    users: {
      create: (data: {
        email: string
        name: string
        password: string
        role: string
        defaultPercentage?: number | null
      }) => Promise<any>
      getAll: () => Promise<any[]>
      getById: (id: number) => Promise<any>
      update: (data: {
        id: number
        name?: string
        email?: string
        newPassword?: string | null
        role?: string
        defaultPercentage?: number | null
      }) => Promise<any>
      delete: (id: number) => Promise<any>
    }
    notes: {
      create: (data: {
        title: string
        content: string
        userId: number
        tagIds?: number[]
      }) => Promise<any>
      getAll: () => Promise<any[]>
      getById: (id: number) => Promise<any>
      update: (
        id: number,
        data: Partial<{ title: string; content: string; tagIds?: number[] }>
      ) => Promise<any>
      delete: (id: number) => Promise<any>
    }
    tasks: {
      create: (data: {
        title: string
        description?: string
        priority?: string
        dueDate?: Date
        userId: number
      }) => Promise<any>
      getAll: () => Promise<any[]>
      getById: (id: number) => Promise<any>
      update: (id: number, data: any) => Promise<any>
      delete: (id: number) => Promise<any>
      toggleCompletion: (id: number) => Promise<any>
    }
    tags: {
      create: (data: { name: string; color?: string }) => Promise<any>
      getAll: () => Promise<any[]>
      getById: (id: number) => Promise<any>
      delete: (id: number) => Promise<any>
    }
    patients: {
      getAll: (limit?: number, offset?: number) => Promise<any>
      getCount: () => Promise<{ success: boolean; count?: number; error?: string }>
      getById: (id: number) => Promise<any>
      search: (searchTerm: string) => Promise<{ success: boolean; patients?: any[]; error?: string }>
      create: (data: {
        firstName: string
        lastName: string
        age?: number
        gender?: string
        address?: string
        phone?: string
        generalHistory?: string
      }) => Promise<any>
      update: (data: {
        id: number
        firstName?: string
        lastName?: string
        age?: number
        gender?: string
        address?: string
        phone?: string
        generalHistory?: string
      }) => Promise<any>
      delete: (id: number) => Promise<any>
    }
    
    honoraires: {
      getAll: () => Promise<{ success: boolean; honoraires?: any[]; error?: string }>
      create: (data: {
        actePratique: string
        honoraireEncaisser: number
        percentageAssistant1?: number
        percentageAssistant2?: number
      }, userId?: number, userRole?: string) => Promise<{ success: boolean; honoraire?: any; error?: string }>
      update: (data: {
        id: number
        actePratique?: string
        honoraireEncaisser?: number
        percentageAssistant1?: number
        percentageAssistant2?: number
      }, userId?: number, userRole?: string) => Promise<{ success: boolean; honoraire?: any; error?: string }>
      delete: (id: number, userId?: number, userRole?: string) => Promise<{ success: boolean; error?: string }>
      // Daily accounting transactions (from 26.xml)
      getByDate: (date: string, medecin?: string) => Promise<{ success: boolean; honoraires?: any[]; error?: string }>
      getWithPatients: (date: string, medecin?: string) => Promise<{ success: boolean; records?: any[]; error?: string }>
      // Patient visit history
      getPatientVisits: (departmentCode: number) => Promise<{ success: boolean; visits?: any[]; error?: string }>
    }
    
    visitExaminations: {
      getAll: (departmentCode: number) => Promise<{ success: boolean; examinations?: any[]; error?: string }>
      getAllByPatient: (patientCode: number) => Promise<{ success: boolean; examinations?: any[]; error?: string }>
      getByDate: (departmentCode: number, visitDate: string) => Promise<{ success: boolean; examination?: any; error?: string }>
      getById: (id: number) => Promise<{ success: boolean; examination?: any; error?: string }>
      create: (data: any) => Promise<{ success: boolean; examination?: any; error?: string }>
      update: (id: number, data: any) => Promise<{ success: boolean; examination?: any; error?: string }>
      delete: (id: number) => Promise<{ success: boolean; error?: string }>
    }
    
    assistantUsers: {
      getOrCreate: (data: {
        fullName: string
        role: string
        percentage: number
      }) => Promise<{ success: boolean; assistantUser?: any; error?: string }>
      findByName: (fullName: string) => Promise<{ success: boolean; assistantUser?: any; error?: string }>
      update: (data: {
        id: number
        updates: any
      }) => Promise<{ success: boolean; assistantUser?: any; error?: string }>
      getAll: () => Promise<{ success: boolean; assistantUsers?: any[]; error?: string }>
    }
    
    assistantSessions: {
      create: (data: {
        userId: number
        assistantName: string
        percentage: number
        assistantUserId?: number
      }) => Promise<{ success: boolean; session?: any; error?: string }>
      close: (sessionId: number) => Promise<{ success: boolean; session?: any; error?: string }>
      getActive: (userId: number) => Promise<{ success: boolean; sessions?: any[]; error?: string }>
      getHistory: (userId?: number) => Promise<{ success: boolean; sessions?: any[]; error?: string }>
    }
    
    salles: {
      getAll: () => Promise<{ success: boolean; salles?: any[]; error?: string }>
      getActive: () => Promise<{ success: boolean; salles?: any[]; error?: string }>
      getById: (id: number) => Promise<{ success: boolean; salle?: any; error?: string }>
      create: (data: {
        name: string
        description?: string
      }) => Promise<{ success: boolean; salle?: any; error?: string }>
      update: (id: number, data: {
        name?: string
        description?: string
        isActive?: boolean
      }) => Promise<{ success: boolean; salle?: any; error?: string }>
      delete: (id: number) => Promise<{ success: boolean; error?: string }>
      updateUserSalle: (userId: number, salleId: number | null) => Promise<{ success: boolean; user?: any; error?: string }>
      updateSessionSalle: (sessionId: number, salleId: number) => Promise<{ success: boolean; session?: any; error?: string }>
      lock: (salleId: number, userData: {
        userId: number
        userName: string
        userRole: string
        sessionName?: string
      }) => Promise<{ success: boolean; salle?: any; error?: string }>
      unlock: (salleId: number) => Promise<{ success: boolean; salle?: any; error?: string }>
      checkLock: (salleId: number) => Promise<{ success: boolean; isLocked?: boolean; activeUser?: any; error?: string }>
      getLockedSalles: () => Promise<{ success: boolean; salles?: any[]; error?: string }>
      unlockUserSalles: (userId: number) => Promise<{ success: boolean; count?: number; error?: string }>
    }
  }
  
  network: {
    startBroadcasting: (user: {
      userId: number
      username: string
      role: string
    }) => Promise<{ success: boolean; error?: string }>
    stopBroadcasting: () => Promise<{ success: boolean; error?: string }>
    getActiveUsers: () => Promise<NetworkUser[]>
    onUsersUpdate: (callback: (users: NetworkUser[]) => void) => () => void
  }
  
  messaging: {
    send: (params: {
      recipientIp?: string // Optional for room broadcasts
      recipientPort?: number // Optional for room broadcasts
      content: string
      senderId: string
      senderName: string
      senderRole?: string
      audioData?: string // Base64 encoded audio
      isVoiceMessage?: boolean
      roomId?: number // For room-based messages
      recipientId?: string // For direct messages
      broadcast?: boolean // For room broadcasts
      patientContext?: { // Patient context
        patientName?: string
        patientId?: string
      }
    }) => Promise<{ success: boolean; error?: string }>
    onNewMessage: (callback: (message: {
      senderId: string
      senderName: string
      senderRole?: string
      content: string
      timestamp: number
      audioData?: string
      isVoiceMessage?: boolean
      roomId?: number
      recipientId?: string
      patientContext?: {
        patientName?: string
        patientId?: string
      }
    }) => void) => () => void
  }
  
  templates: {
    getAll: () => Promise<{ success: boolean; templates?: any[]; error?: string }>
    create: (content: string) => Promise<{ success: boolean; template?: any; error?: string }>
    update: (id: number, content: string) => Promise<{ success: boolean; template?: any; error?: string }>
    delete: (id: number) => Promise<{ success: boolean; error?: string }>
  }

  honoraires: {
    getByDate: (date: string, medecin?: string) => Promise<{ success: boolean; honoraires?: any[]; error?: string }>
    getWithPatients: (date: string, medecin?: string) => Promise<{ success: boolean; records?: any[]; error?: string }>
  }
  
  payments: {
    create: (data: {
      patientCode: number
      patientName: string
      visitDate: string
      visitId?: number
      totalAmount: number
      selectedActs: Array<{
        honoraireId: number
        actePratique: string
        montant: number
      }>
      validatedBy: string
      validatedByUserId: number
      validatedByRole: string
      notes?: string
    }) => Promise<{ success: boolean; payment?: any; error?: string }>
    getAll: (filters?: {
      patientCode?: number
      validatedByUserId?: number
      startDate?: string
      endDate?: string
      status?: string
    }) => Promise<{ success: boolean; payments?: any[]; error?: string }>
    getByDate: (date: string) => Promise<{ success: boolean; payments?: any[]; error?: string }>
    getTodayByUser: () => Promise<{ success: boolean; paymentsByUser?: any; error?: string }>
    getLogs: (paymentId?: number) => Promise<{ success: boolean; logs?: any[]; error?: string }>
    cancel: (
      paymentId: number,
      cancelledBy: string,
      cancelledByUserId: number,
      cancelledByRole: string,
      reason: string
    ) => Promise<{ success: boolean; payment?: any; error?: string }>
    delete: (
      paymentId: number,
      deletedBy: string,
      deletedByUserId: number,
      deletedByRole: string,
      reason: string
    ) => Promise<{ success: boolean; error?: string }>
  }
  
  store: {
    get: (key: string) => Promise<any>
    set: (key: string, value: any) => Promise<{ success: boolean }>
  }
  
  medicines: {
    getAll: () => Promise<{ success: boolean; data?: any[]; error?: string }>
    search: (searchTerm: string) => Promise<{ success: boolean; data?: any[]; error?: string }>
    getById: (id: number) => Promise<{ success: boolean; data?: any; error?: string }>
    getStatistics: () => Promise<{ success: boolean; data?: any; error?: string }>
  }
  
  quantities: {
    getAll: () => Promise<{ success: boolean; data?: any[]; error?: string }>
  }
  
  ordonnances: {
    getByPatient: (patientCode: number) => Promise<{ success: boolean; data?: any[]; error?: string }>
    countByPatient: (patientCode: number) => Promise<{ success: boolean; data?: number; error?: string }>
    create: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>
    delete: (id: number) => Promise<{ success: boolean; error?: string }>
  }
  
  queue: {
    sendToRoom: (data: {
      patientCode: number
      patientName: string
      fromUserId: number
      fromUserName: string
      fromUserRole: string
      toUserId: number
      toUserName: string
      toUserRole: string
      roomId: number
      roomName: string
      isUrgent: boolean
      visitId?: number
      actionLabel?: string
    }) => Promise<{ success: boolean; queueItem?: any; error?: string }>
    sendToNurse: (data: {
      patientCode: number
      patientName: string
      fromUserId: number
      fromUserName: string
      fromUserRole: string
      actionType: string
      actionLabel: string
      visitId?: number
    }) => Promise<{ success: boolean; queueItem?: any; error?: string }>
    getQueue: (userId: number, userRole: string) => Promise<{ success: boolean; queue?: any[]; error?: string }>
    getSentItems: (userId: number) => Promise<{ success: boolean; items?: any[]; error?: string }>
    markSeen: (queueId: number) => Promise<{ success: boolean; error?: string }>
    markCompleted: (queueId: number) => Promise<{ success: boolean; error?: string }>
    toggleChecked: (queueId: number, isChecked: boolean) => Promise<{ success: boolean; error?: string }>
    getDailySentCountForRoom: (roomId: number, date: string) => Promise<{ success: boolean; count?: number; error?: string }>
  }
  
  messages: {
    save: (data: any) => Promise<{ success: boolean; message?: any; error?: string }>
    getRoomMessages: (roomId: number, limit?: number) => Promise<{ success: boolean; messages?: any[]; error?: string }>
    getUserMessages: (userId: number, limit?: number) => Promise<{ success: boolean; messages?: any[]; error?: string }>
    markAsRead: (messageId: number) => Promise<{ success: boolean; error?: string }>
    getUnreadCount: (userId?: number, roomId?: number) => Promise<{ success: boolean; count?: number; error?: string }>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
