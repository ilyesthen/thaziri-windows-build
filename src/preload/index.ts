import { contextBridge, ipcRenderer } from 'electron'

// Type definitions for database entities
export interface User {
  id: number
  email: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export interface Note {
  id: number
  title: string
  content: string
  userId: number
  createdAt: Date
  updatedAt: Date
  tags?: Tag[]
  user?: User
}

export interface Task {
  id: number
  title: string
  description?: string
  completed: boolean
  priority: string
  dueDate?: Date
  userId: number
  createdAt: Date
  updatedAt: Date
  user?: User
}

export interface Tag {
  id: number
  name: string
  color: string
  createdAt: Date
}

export interface Patient {
  id: number
  recordNumber?: number
  departmentCode?: number
  firstName: string
  lastName: string
  fullName: string
  age?: number
  dateOfBirth?: Date
  address?: string
  phone?: string
  code?: string
  gender?: string
  usefulInfo?: string
  photo1?: string
  generalHistory?: string
  ophthalmoHistory?: string
  createdAt: Date
  updatedAt: Date
  originalCreatedDate?: string
}

export interface NetworkUser {
  userId: number
  username: string
  role: string
  ipAddress: string
  messagingPort: number
  lastSeen: number
}

export interface Message {
  senderId: string
  senderName: string
  senderRole?: string
  content: string
  timestamp: number
  audioData?: string
  isVoiceMessage?: boolean
}

export interface MessageTemplate {
  id: number
  content: string
}

// Custom APIs for renderer
const electronAPI = {
  // App information
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
  isPackaged: () => ipcRenderer.invoke('app:isPackaged'),

  // File operations
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: () => ipcRenderer.invoke('dialog:saveFile'),

  // Authentication API
  auth: {
    // Primary authentication method - verifies credentials with bcrypt
    verifyCredentials: (email: string, password: string) => 
      ipcRenderer.invoke('auth:verify-credentials', email, password),
    // Legacy alias
    login: (email: string, password: string) => 
      ipcRenderer.invoke('auth:verify-credentials', email, password),
    getUsersForLogin: () => 
      ipcRenderer.invoke('auth:getUsersForLogin'),
    createUserWithPassword: (data: { email: string; name: string; password: string; role?: string }) => 
      ipcRenderer.invoke('auth:createUserWithPassword', data),
  },

  // Database API - Users
  db: {
    users: {
      create: (data: { email: string; name: string; password: string; role: string; defaultPercentage?: number | null }) => 
        ipcRenderer.invoke('db:createUser', data),
      getAll: () => 
        ipcRenderer.invoke('db:getAllUsers'),
      getById: (id: number) => 
        ipcRenderer.invoke('db:getUserById', id),
      update: (data: { id: number; name?: string; email?: string; newPassword?: string | null; role?: string }) => 
        ipcRenderer.invoke('db:updateUser', data),
      delete: (id: number) => 
        ipcRenderer.invoke('db:deleteUser', id),
    },

    // Database API - Notes
    notes: {
      create: (data: { title: string; content: string; userId: number; tagIds?: number[] }) => 
        ipcRenderer.invoke('db:createNote', data),
      getAll: () => 
        ipcRenderer.invoke('db:getAllNotes'),
      getById: (id: number) => 
        ipcRenderer.invoke('db:getNoteById', id),
      update: (id: number, data: Partial<{ title: string; content: string; tagIds?: number[] }>) => 
        ipcRenderer.invoke('db:updateNote', id, data),
      delete: (id: number) => 
        ipcRenderer.invoke('db:deleteNote', id),
    },

    // Database API - Tasks
    tasks: {
      create: (data: { title: string; description?: string; priority?: string; dueDate?: Date; userId: number }) => 
        ipcRenderer.invoke('db:createTask', data),
      getAll: () => 
        ipcRenderer.invoke('db:getAllTasks'),
      getById: (id: number) => 
        ipcRenderer.invoke('db:getTaskById', id),
      update: (id: number, data: any) => 
        ipcRenderer.invoke('db:updateTask', id, data),
      delete: (id: number) => 
        ipcRenderer.invoke('db:deleteTask', id),
      toggleCompletion: (id: number) => 
        ipcRenderer.invoke('db:toggleTaskCompletion', id),
    },

    // Database API - Tags
    tags: {
      create: (data: { name: string; color?: string }) => 
        ipcRenderer.invoke('db:createTag', data),
      getAll: () => 
        ipcRenderer.invoke('db:getAllTags'),
      getById: (id: number) => 
        ipcRenderer.invoke('db:getTagById', id),
      delete: (id: number) => 
        ipcRenderer.invoke('db:deleteTag', id),
    },

    // Database API - Patients
    patients: {
      getAll: (limit?: number, offset?: number) => 
        ipcRenderer.invoke('db:get-patients', limit, offset),
      getCount: () => 
        ipcRenderer.invoke('db:get-patients-count'),
      getById: (id: number) => 
        ipcRenderer.invoke('db:get-patient', id),
      getByCode: (code: number) => 
        ipcRenderer.invoke('db:get-patient-by-code', code),
      search: (searchTerm: string): Promise<{ success: boolean; patients?: Patient[]; error?: string }> => 
        ipcRenderer.invoke('db:search-patients', searchTerm),
      create: (data: {
        firstName: string
        lastName: string
        age?: number
        gender?: string
        address?: string
        phone?: string
        generalHistory?: string
      }) => 
        ipcRenderer.invoke('db:create-patient', data),
      update: (data: {
        id: number
        firstName?: string
        lastName?: string
        age?: number
        gender?: string
        address?: string
        phone?: string
        generalHistory?: string
      }) => 
        ipcRenderer.invoke('db:update-patient', data),
      delete: (id: number) => 
        ipcRenderer.invoke('db:delete-patient', id),
    },

    // Honoraires API
    honoraires: {
      getAll: () => 
        ipcRenderer.invoke('honoraires:get-all'),
      create: (data: {
        actePratique: string
        honoraireEncaisser: number
        percentageAssistant1?: number
        percentageAssistant2?: number
      }, userId?: number, userRole?: string) => 
        ipcRenderer.invoke('honoraires:create', data, userId, userRole),
      update: (data: {
        id: number
        actePratique?: string
        honoraireEncaisser?: number
        percentageAssistant1?: number
        percentageAssistant2?: number
      }, userId?: number, userRole?: string) => 
        ipcRenderer.invoke('honoraires:update', data, userId, userRole),
      delete: (id: number, userId?: number, userRole?: string) => 
        userId !== undefined ? ipcRenderer.invoke('honoraires:delete', id, userId, userRole) : ipcRenderer.invoke('db:honoraires:delete', id),
      getByDate: (date: string, medecin?: string) =>
        ipcRenderer.invoke('db:honoraires:get-by-date', date, medecin),
      getWithPatients: (date: string, medecin?: string) =>
        ipcRenderer.invoke('db:honoraires:get-with-patients', date, medecin),
      getPatientVisits: (departmentCode: number) =>
        ipcRenderer.invoke('db:honoraires:get-patient-visits', departmentCode),
    },
    
    // Visit Examinations API
    visitExaminations: {
      getAll: (departmentCode: number) =>
        ipcRenderer.invoke('db:visit-examinations:get-all', departmentCode),
      getAllByPatient: (patientCode: number) =>
        ipcRenderer.invoke('db:visit-examinations:get-all-by-patient', patientCode),
      getByDate: (departmentCode: number, visitDate: string) =>
        ipcRenderer.invoke('db:visit-examinations:get-by-date', departmentCode, visitDate),
      getAssistantTotalByPatient: (patientCode: number, dateFrom: string, dateTo: string, salleId?: number) => 
        ipcRenderer.invoke('payments:getAssistantTotalByPatient', patientCode, dateFrom, dateTo, salleId),
      exportDailyReport: (data: any) => 
        ipcRenderer.invoke('payments:exportDailyReport', data),
      getById: (id: number) =>
        ipcRenderer.invoke('db:visit-examinations:get-by-id', id),
      update: (id: number, data: any) =>
        ipcRenderer.invoke('db:visit-examinations:update', id, data),
      delete: (id: number) =>
        ipcRenderer.invoke('db:visit-examinations:delete', id),
      create: (data: any) =>
        ipcRenderer.invoke('db:visit-examinations:create', data)
    },
    
    // Assistant Users API
    assistantUsers: {
      getOrCreate: (data: { fullName: string; role: string; percentage: number }) =>
        ipcRenderer.invoke('db:assistant-user:get-or-create', data),
      findByName: (fullName: string) =>
        ipcRenderer.invoke('db:assistant-user:find-by-name', fullName),
      update: (data: { id: number; updates: any }) =>
        ipcRenderer.invoke('db:assistant-user:update', data),
      getAll: () =>
        ipcRenderer.invoke('db:assistant-user:get-all'),
    },
    
    // Assistant Sessions API
    assistantSessions: {
      create: (data: { userId: number; assistantName: string; percentage: number; assistantUserId?: number }) =>
        ipcRenderer.invoke('db:assistant-session:create', data),
      close: (sessionId: number) =>
        ipcRenderer.invoke('db:assistant-session:close', sessionId),
      getActive: (userId: number) =>
        ipcRenderer.invoke('db:assistant-session:get-active', userId),
      getHistory: (userId?: number) =>
        ipcRenderer.invoke('db:assistant-session:get-history', userId),
    },
    
    // Salles (Rooms) API
    salles: {
      getAll: () =>
        ipcRenderer.invoke('db:salles:get-all'),
      getActive: () =>
        ipcRenderer.invoke('db:salles:get-active'),
      getById: (id: number) =>
        ipcRenderer.invoke('db:salles:get-by-id', id),
      create: (data: { name: string; description?: string }) =>
        ipcRenderer.invoke('db:salles:create', data),
      update: (id: number, data: { name?: string; description?: string; isActive?: boolean }) =>
        ipcRenderer.invoke('db:salles:update', id, data),
      delete: (id: number) =>
        ipcRenderer.invoke('db:salles:delete', id),
      updateUserSalle: (userId: number, salleId: number | null) =>
        ipcRenderer.invoke('db:users:update-current-salle', userId, salleId),
      updateSessionSalle: (sessionId: number, salleId: number) =>
        ipcRenderer.invoke('db:assistant-sessions:update-salle', sessionId, salleId),
      lock: (salleId: number, userData: {
        userId: number
        userName: string
        userRole: string
        sessionName?: string
      }) =>
        ipcRenderer.invoke('db:salles:lock', salleId, userData),
      unlock: (salleId: number) =>
        ipcRenderer.invoke('db:salles:unlock', salleId),
      checkLock: (salleId: number) =>
        ipcRenderer.invoke('db:salles:check-lock', salleId),
      getLockedSalles: () =>
        ipcRenderer.invoke('db:salles:get-locked'),
      unlockUserSalles: (userId: number) =>
        ipcRenderer.invoke('db:salles:unlock-user-salles', userId),
    },
  },

  // Network Discovery API
  network: {
    startBroadcasting: (user: { userId: number; username: string; role: string }) =>
      ipcRenderer.invoke('network:start-broadcasting', user),
    stopBroadcasting: () =>
      ipcRenderer.invoke('network:stop-broadcasting'),
    getActiveUsers: () =>
      ipcRenderer.invoke('network:get-active-users'),
    onUsersUpdate: (callback: (users: NetworkUser[]) => void) => {
      const subscription = (_event: any, users: NetworkUser[]) => callback(users)
      ipcRenderer.on('network:users-update', subscription)
      // Return cleanup function
      return () => {
        ipcRenderer.removeListener('network:users-update', subscription)
      }
    },
  },

  // Messaging API
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
    }) => ipcRenderer.invoke('messaging:send', params),
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
    }) => void) => {
      const subscription = (_event: any, message: any) => callback(message)
      ipcRenderer.on('messaging:new-message', subscription)
      // Return cleanup function
      return () => {
        ipcRenderer.removeListener('messaging:new-message', subscription)
      }
    },
  },

  // Honoraires (Daily Accounting) API
  honoraires: {
    getByDate: (date: string, medecin?: string) => 
      ipcRenderer.invoke('db:honoraires:get-by-date', date, medecin),
    getWithPatients: (date: string, medecin?: string) => 
      ipcRenderer.invoke('db:honoraires:get-with-patients', date, medecin),
    getPatientVisits: (departmentCode: number) =>
      ipcRenderer.invoke('db:honoraires:get-patient-visits', departmentCode),
  },

  // Payment Validation API
  checkPaymentValidation: (patientCode: string, visitDate: string) =>
    ipcRenderer.invoke('db:check-payment-validation', patientCode, visitDate),
    
  payments: {
    checkValidation: (patientCode: number, visitDate: string) =>
      ipcRenderer.invoke('db:payments:checkValidation', patientCode, visitDate),
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
    }) => ipcRenderer.invoke('db:payments:create', data),
    getAll: (filters?: {
      patientCode?: number
      validatedByUserId?: number
      startDate?: string
      endDate?: string
      status?: string
    }) => ipcRenderer.invoke('db:payments:get-all', filters),
    getByDate: (date: string) => 
      ipcRenderer.invoke('db:payments:get-by-date', date),
    getTodayByUser: () => 
      ipcRenderer.invoke('db:payments:get-today-by-user'),
    getLogs: (paymentId?: number) => 
      ipcRenderer.invoke('db:payments:get-logs', paymentId),
    cancel: (
      paymentId: number,
      cancelledBy: string,
      cancelledByUserId: number,
      cancelledByRole: string,
      reason: string
    ) => ipcRenderer.invoke('db:payments:cancel', paymentId, cancelledBy, cancelledByUserId, cancelledByRole, reason),
    delete: (
      paymentId: number,
      deletedBy: string,
      deletedByUserId: number,
      deletedByRole: string,
      reason: string
    ) => ipcRenderer.invoke('db:payments:delete', paymentId, deletedBy, deletedByUserId, deletedByRole, reason),
    linkToVisit: (
      patientCode: number,
      visitDate: string,
      visitId: number
    ) => ipcRenderer.invoke('db:payments:link-to-visit', patientCode, visitDate, visitId),
    deleteAllForPatientDate: (
      patientCode: number,
      visitDate: string,
      deletedBy: string,
      deletedByUserId: number,
      deletedByRole: string,
      reason: string
    ) => ipcRenderer.invoke('db:payments:delete-all-for-patient-date', patientCode, visitDate, deletedBy, deletedByUserId, deletedByRole, reason),
    getAllByPatient: (patientCode: number) => 
      ipcRenderer.invoke('db:payments:getAllByPatient', patientCode),
  },

  // Message Templates API
  templates: {
    getAll: () => ipcRenderer.invoke('templates:get-all'),
    create: (content: string) => 
      ipcRenderer.invoke('templates:create', content),
    update: (id: number, content: string) => 
      ipcRenderer.invoke('templates:update', { id, content }),
    delete: (id: number) => ipcRenderer.invoke('templates:delete', id),
  },

  // Persistent Store API
  store: {
    get: (key: string) => ipcRenderer.invoke('store:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('store:set', key, value),
  },

  // Patient Queue API
  queue: {
    sendToRoom: (data: any) => ipcRenderer.invoke('db:queue:sendToRoom', data),
    sendToNurse: (data: any) => ipcRenderer.invoke('db:queue:sendToNurse', data),
    getQueue: (userId: number, userRole: string) => ipcRenderer.invoke('db:queue:getQueue', userId, userRole),
    getSentItems: (userId: number) => ipcRenderer.invoke('db:queue:getSentItems', userId),
    markSeen: (queueId: number) => ipcRenderer.invoke('db:queue:markSeen', queueId),
    markCompleted: (queueId: number) => ipcRenderer.invoke('db:queue:markCompleted', queueId),
    toggleChecked: (queueId: number, isChecked: boolean) => ipcRenderer.invoke('db:queue:toggleChecked', queueId, isChecked),
    getDailySentCount: (roomId: number, date: string) => ipcRenderer.invoke('db:queue:getDailySentCount', roomId, date),
    getDailySentCountForRoom: (roomId: number, date: string) => ipcRenderer.invoke('db:queue:getDailySentCount', roomId, date),
  },
  
  messages: {
    save: (data: any) => ipcRenderer.invoke('db:messages:save', data),
    getRoomMessages: (roomId: number, limit?: number) => ipcRenderer.invoke('db:messages:getRoomMessages', roomId, limit),
    getUserMessages: (userId: number, limit?: number) => ipcRenderer.invoke('db:messages:getUserMessages', userId, limit),
    markAsRead: (messageId: number) => ipcRenderer.invoke('db:messages:markAsRead', messageId),
    getUnreadCount: (userId?: number, roomId?: number) => ipcRenderer.invoke('db:messages:getUnreadCount', userId, roomId),
  },
  
  // Medicine API
  medicines: {
    getAll: () => ipcRenderer.invoke('medicines:getAll'),
    search: (searchTerm: string) => ipcRenderer.invoke('medicines:search', searchTerm),
    getById: (id: number) => ipcRenderer.invoke('medicines:getById', id),
    getStatistics: () => ipcRenderer.invoke('medicines:getStatistics')
  },
  
  // Comptes Rendus API
  comptesRendus: {
    getAll: () => ipcRenderer.invoke('comptesRendus:getAll'),
    search: (searchTerm: string) => ipcRenderer.invoke('comptesRendus:search', searchTerm),
    getByCode: (codeCompte: string) => ipcRenderer.invoke('comptesRendus:getByCode', codeCompte)
  },
  
  // Quantities API
  quantities: {
    getAll: () => ipcRenderer.invoke('quantities:getAll')
  },
  
  // Ordonnances API
  ordonnances: {
    getByPatient: (patientCode: number) => ipcRenderer.invoke('ordonnances:getByPatient', patientCode),
    countByPatient: (patientCode: number) => ipcRenderer.invoke('ordonnances:countByPatient', patientCode),
    create: (data: any) => ipcRenderer.invoke('ordonnances:create', data),
    delete: (id: number) => ipcRenderer.invoke('ordonnances:delete', id)
  },

  // Example ping for testing IPC
  ping: () => ipcRenderer.invoke('ping')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electronAPI = electronAPI
}