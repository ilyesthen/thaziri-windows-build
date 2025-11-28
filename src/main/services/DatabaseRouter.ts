/**
 * DATABASE ROUTER - Professional 2-Mode System
 * 
 * Routes database calls to the correct backend:
 * - ADMIN MODE: Direct Prisma calls (database.ts)
 * - CLIENT MODE: HTTP calls to admin server (DatabaseClient)
 */

import * as db from '../database'
import { DatabaseClient } from './DatabaseClient'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

// Current database client (only used in client mode)
let databaseClient: DatabaseClient | null = null

// Current mode
type DatabaseMode = 'admin' | 'client' | null
let currentMode: DatabaseMode = null

/**
 * Initialize the database router by detecting the mode
 */
export async function initializeDatabaseRouter(): Promise<void> {
  const mode = await detectMode()
  currentMode = mode
  
  console.log('🔀 Database Router initialized in mode:', mode)
  
  if (mode === 'client') {
    // Load client configuration
    const config = await loadClientConfig()
    if (config && config.serverUrl) {
      databaseClient = new DatabaseClient(config.serverUrl)
      console.log('  → Connected to server:', config.serverUrl)
    } else {
      console.warn('  ⚠️ Client mode but no server URL configured')
    }
  }
}

/**
 * Detect the current mode from setup configuration
 */
async function detectMode(): Promise<DatabaseMode> {
  try {
    const userDataPath = app.getPath('userData')
    const setupCompletePath = path.join(userDataPath, 'setup-complete')
    
    if (!fs.existsSync(setupCompletePath)) {
      return null // Setup not complete
    }
    
    const setupData = JSON.parse(fs.readFileSync(setupCompletePath, 'utf-8'))
    return setupData.mode || 'admin'
  } catch (error) {
    console.error('Error detecting mode:', error)
    return 'admin' // Default to admin
  }
}

/**
 * Load client configuration (server URL)
 */
async function loadClientConfig(): Promise<{ serverUrl?: string } | null> {
  try {
    const userDataPath = app.getPath('userData')
    const configPath = path.join(userDataPath, 'database-config.json')
    
    if (!fs.existsSync(configPath)) {
      return null
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    return config
  } catch (error) {
    console.error('Error loading client config:', error)
    return null
  }
}

/**
 * Set the database client (called after client setup)
 */
export function setDatabaseClient(client: DatabaseClient): void {
  databaseClient = client
  currentMode = 'client'
  console.log('✅ Database client set, mode: client')
}

/**
 * Get current mode
 */
export function getCurrentMode(): DatabaseMode {
  return currentMode
}

// ==================== PATIENT OPERATIONS ====================

export async function getAllPatients(limit?: number, offset?: number): Promise<any[]> {
  if (currentMode === 'client' && databaseClient) {
    const result = await databaseClient.executeQuery('patient', 'findMany', [{
      take: limit || 100,
      skip: offset || 0,
      orderBy: { id: 'desc' }
    }])
    return result.data || []
  }
  
  // Admin mode: Direct Prisma
  return await db.getAllPatients(limit, offset)
}

export async function getPatientsCount(): Promise<number> {
  if (currentMode === 'client' && databaseClient) {
    const result = await databaseClient.executeQuery('patient', 'count', [])
    return result.data || 0
  }
  
  return await db.getPatientsCount()
}

export async function getPatientById(id: number): Promise<any> {
  if (currentMode === 'client' && databaseClient) {
    const result = await databaseClient.executeQuery('patient', 'findUnique', [{
      where: { id }
    }])
    return result.data || null
  }
  
  return await db.getPatientById(id)
}

export async function getPatientByCode(code: number): Promise<any> {
  if (currentMode === 'client' && databaseClient) {
    const result = await databaseClient.executeQuery('patient', 'findUnique', [{
      where: { departmentCode: code },
      include: {
        visits: {
          orderBy: { id: 'desc' },
          take: 10
        }
      }
    }])
    return result.data || null
  }
  
  return await db.getPatientByCode(code)
}

export async function createPatient(data: any): Promise<any> {
  if (currentMode === 'client' && databaseClient) {
    const result = await databaseClient.executeQuery('patient', 'create', [{
      data
    }])
    return result.data
  }
  
  return await db.createPatient(data)
}

export async function updatePatient(data: any): Promise<any> {
  if (currentMode === 'client' && databaseClient) {
    const result = await databaseClient.executeQuery('patient', 'update', [{
      where: { departmentCode: data.departmentCode },
      data
    }])
    return result.data
  }
  
  return await db.updatePatient(data)
}

export async function deletePatient(code: number): Promise<any> {
  if (currentMode === 'client' && databaseClient) {
    const result = await databaseClient.executeQuery('patient', 'delete', [{
      where: { departmentCode: code }
    }])
    return result.data
  }
  
  return await db.deletePatient(code)
}

export async function searchPatients(query: string): Promise<any[]> {
  if (currentMode === 'client' && databaseClient) {
    const result = await databaseClient.executeQuery('patient', 'findMany', [{
      where: {
        OR: [
          { firstName: { contains: query } },
          { lastName: { contains: query } },
          { departmentCode: { equals: parseInt(query) || 0 } }
        ]
      },
      take: 50,
      orderBy: { id: 'desc' }
    }])
    return result.data || []
  }
  
  return await db.searchPatients(query)
}

// ==================== USER OPERATIONS ====================

export async function verifyUserCredentials(email: string, password: string): Promise<any> {
  if (currentMode === 'client' && databaseClient) {
    // For login, we need server-side password validation for security
    // This should be a dedicated endpoint on the server
    // For now, call the local function (will add server endpoint later)
    return await db.verifyUserCredentials(email, password)
  }
  
  return await db.verifyUserCredentials(email, password)
}

export async function getAllUsers(): Promise<any[]> {
  if (currentMode === 'client' && databaseClient) {
    const result = await databaseClient.executeQuery('user', 'findMany', [{
      orderBy: { createdAt: 'desc' }
    }])
    return result.data || []
  }
  
  return await db.getAllUsers()
}

// ==================== VISIT OPERATIONS ====================
// Just proxy to db functions - they'll use executeOperation internally

export const createVisit = (data: any) => executeDbFunction('createVisit', data)
export const getVisitById = (id: number) => executeDbFunction('getVisitById', id)
export const getAllVisitsByPatient = (patientCode: number) => executeDbFunction('getAllVisitsByPatient', patientCode)
export const updateVisit = (id: number, data: any) => executeDbFunction('updateVisit', id, data)
export const deleteVisit = (id: number) => executeDbFunction('deleteVisit', id)
export const getVisitExaminations = (visitId: number) => executeDbFunction('getVisitExaminations', visitId)

// ==================== EXAMINATION OPERATIONS ====================

export const createVisitExamination = (data: any) => executeDbFunction('createVisitExamination', data)
export const updateVisitExamination = (id: number, data: any) => executeDbFunction('updateVisitExamination', id, data)
export const deleteVisitExamination = (id: number) => executeDbFunction('deleteVisitExamination', id)
export const getAllVisitExaminationsByPatientCode = (code: number) => executeDbFunction('getAllVisitExaminationsByPatientCode', code)

// ==================== PAYMENT OPERATIONS ====================

export const createPaymentValidation = (data: any) => executeDbFunction('createPaymentValidation', data)
export const checkPaymentValidation = (patientCode: number, visitDate: string) => executeDbFunction('checkPaymentValidation', patientCode, visitDate)
export const getPaymentValidations = (filter: any) => executeDbFunction('getPaymentValidations', filter)
export const getAllPaymentsByPatient = (patientCode: number) => executeDbFunction('getAllPaymentsByPatient', patientCode)
export const deletePaymentValidation = (id: number, deletedBy: string) => executeDbFunction('deletePaymentValidation', id, deletedBy)

// ==================== SALLE OPERATIONS ====================

export const getAllSalles = () => executeDbFunction('getAllSalles')
export const getSalleById = (id: number) => executeDbFunction('getSalleById', id)
export const createSalle = (data: any) => executeDbFunction('createSalle', data)
export const updateSalle = (id: number, data: any) => executeDbFunction('updateSalle', id, data)
export const deleteSalle = (id: number) => executeDbFunction('deleteSalle', id)
export const lockSalle = (id: number, userId: number) => executeDbFunction('lockSalle', id, userId)
export const unlockSalle = (id: number, userId: number) => executeDbFunction('unlockSalle', id, userId)
export const unlockUserSalles = (userId: number) => executeDbFunction('unlockUserSalles', userId)

// ==================== NURSE QUEUE OPERATIONS ====================

export const getAllNurseQueues = () => executeDbFunction('getAllNurseQueues')
export const getNurseQueueById = (id: number) => executeDbFunction('getNurseQueueById', id)
export const createNurseQueue = (data: any) => executeDbFunction('createNurseQueue', data)
export const updateNurseQueue = (id: number, data: any) => executeDbFunction('updateNurseQueue', id, data)
export const deleteNurseQueue = (id: number) => executeDbFunction('deleteNurseQueue', id)

// ==================== NOTES, TASKS, TAGS ====================

export const createNote = (data: any) => executeDbFunction('createNote', data)
export const getAllNotes = () => executeDbFunction('getAllNotes')
export const getNoteById = (id: number) => executeDbFunction('getNoteById', id)
export const updateNote = (id: number, data: any) => executeDbFunction('updateNote', id, data)
export const deleteNote = (id: number) => executeDbFunction('deleteNote', id)

export const createTask = (data: any) => executeDbFunction('createTask', data)
export const getAllTasks = () => executeDbFunction('getAllTasks')
export const getTaskById = (id: number) => executeDbFunction('getTaskById', id)
export const updateTask = (id: number, data: any) => executeDbFunction('updateTask', id, data)
export const deleteTask = (id: number) => executeDbFunction('deleteTask', id)
export const toggleTaskCompletion = (id: number) => executeDbFunction('toggleTaskCompletion', id)

export const createTag = (data: any) => executeDbFunction('createTag', data)
export const getAllTags = () => executeDbFunction('getAllTags')
export const getTagById = (id: number) => executeDbFunction('getTagById', id)
export const deleteTag = (id: number) => executeDbFunction('deleteTag', id)

// ==================== USER MANAGEMENT ====================

export const createUserWithPassword = (data: any) => executeDbFunction('createUserWithPassword', data)
export const getAllUsersForManagement = () => executeDbFunction('getAllUsersForManagement')
export const getUserById = (id: number) => executeDbFunction('getUserById', id)
export const updateUserWithPassword = (data: any) => executeDbFunction('updateUserWithPassword', data)
export const deleteUser = (id: number) => executeDbFunction('deleteUser', id)
export const getUsersForSelection = () => executeDbFunction('getUsersForSelection')

// ==================== HONORAIRES ====================

export const getHonorairesWithPatients = (date: string, medecin?: string) => executeDbFunction('getHonorairesWithPatients', date, medecin)
export const getPatientVisitHistory = (departmentCode: number) => executeDbFunction('getPatientVisitHistory', departmentCode)
export const getHonorairesForPatient = (patientCode: number) => executeDbFunction('getHonorairesForPatient', patientCode)
export const getAllActesHonoraires = () => executeDbFunction('getAllActesHonoraires')
export const createActeHonoraire = (data: any) => executeDbFunction('createActeHonoraire', data)
export const updateActeHonoraire = (data: any) => executeDbFunction('updateActeHonoraire', data)
export const getActeHonoraireById = (id: number) => executeDbFunction('getActeHonoraireById', id)
export const deleteActeHonoraire = (id: number) => executeDbFunction('deleteActeHonoraire', id)
export const getHonorairesByDate = (date: string, medecin?: string) => executeDbFunction('getHonorairesByDate', date, medecin)
export const deleteHonoraire = (id: number) => executeDbFunction('deleteHonoraire', id)

// ==================== TEMPLATES ====================

export const getAllTemplates = () => executeDbFunction('getAllTemplates')
export const createTemplate = (data: any) => executeDbFunction('createTemplate', data)
export const updateTemplate = (id: number, data: any) => executeDbFunction('updateTemplate', id, data)
export const deleteTemplate = (id: number) => executeDbFunction('deleteTemplate', id)

// ==================== ASSISTANTS ====================

export const getOrCreateAssistant = (fullName: string, role: string, percentage?: number) => executeDbFunction('getOrCreateAssistant', fullName, role, percentage)
export const findAssistantByName = (fullName: string) => executeDbFunction('findAssistantByName', fullName)
export const updateAssistantUser = (id: number, updates: any) => executeDbFunction('updateAssistantUser', id, updates)
export const getAllAssistantUsers = () => executeDbFunction('getAllAssistantUsers')
export const createAssistantSession = (data: any) => executeDbFunction('createAssistantSession', data)
export const closeAssistantSession = (sessionId: number) => executeDbFunction('closeAssistantSession', sessionId)
export const getActiveAssistantSessions = (userId: number) => executeDbFunction('getActiveAssistantSessions', userId)
export const getAssistantSessionHistory = (userId: number) => executeDbFunction('getAssistantSessionHistory', userId)

// ==================== EXAMINATIONS ====================

export const getPatientVisitExaminations = (departmentCode: number) => executeDbFunction('getPatientVisitExaminations', departmentCode)
export const getVisitExaminationByDate = (departmentCode: number, visitDate: string) => executeDbFunction('getVisitExaminationByDate', departmentCode, visitDate)
export const getVisitExaminationById = (id: number) => executeDbFunction('getVisitExaminationById', id)

// ==================== MISC ====================

export const getActiveSalles = () => executeDbFunction('getActiveSalles')
export const createAuditLog = (data: any) => executeDbFunction('createAuditLog', data)

// ==================== SALLE LOCKING ====================

export const updateUserCurrentSalle = (userId: number, salleId: number | null) => executeDbFunction('updateUserCurrentSalle', userId, salleId)
export const updateAssistantSessionSalle = (sessionId: number, salleId: number | null) => executeDbFunction('updateAssistantSessionSalle', sessionId, salleId)
export const isSalleLocked = (salleId: number) => executeDbFunction('isSalleLocked', salleId)
export const getLockedSalles = () => executeDbFunction('getLockedSalles')

// ==================== PAYMENT QUERIES ====================

export const getPaymentsByDate = (date: string) => executeDbFunction('getPaymentsByDate', date)
export const getTodayPaymentsByUser = () => executeDbFunction('getTodayPaymentsByUser')
export const getPaymentLogs = (paymentId: number) => executeDbFunction('getPaymentLogs', paymentId)
export const cancelPaymentValidation = (...args: any[]) => executeDbFunction('cancelPaymentValidation', ...args)
export const linkPaymentsToVisit = (patientCode: number, visitDate: string, visitId: number) => executeDbFunction('linkPaymentsToVisit', patientCode, visitDate, visitId)
export const deleteAllPaymentsForPatientDate = (...args: any[]) => executeDbFunction('deleteAllPaymentsForPatientDate', ...args)

// ==================== PATIENT QUEUE ====================

export const sendPatientToRoom = (data: any) => executeDbFunction('sendPatientToRoom', data)
export const sendPatientToNurse = (data: any) => executeDbFunction('sendPatientToNurse', data)
export const getPatientQueue = (userId: number, userRole: string) => executeDbFunction('getPatientQueue', userId, userRole)
export const getSentQueueItems = (userId: number) => executeDbFunction('getSentQueueItems', userId)
export const markQueueItemSeen = (queueId: number) => executeDbFunction('markQueueItemSeen', queueId)
export const markQueueItemCompleted = (queueId: number) => executeDbFunction('markQueueItemCompleted', queueId)
export const toggleQueueItemChecked = (queueId: number, isChecked: boolean) => executeDbFunction('toggleQueueItemChecked', queueId, isChecked)
export const getDailySentCountForRoom = (roomId: string, date: string) => executeDbFunction('getDailySentCountForRoom', roomId, date)

// ==================== MESSAGING ====================

export const saveMessage = (data: any) => executeDbFunction('saveMessage', data)
export const getRoomMessages = (roomId: string, limit: number) => executeDbFunction('getRoomMessages', roomId, limit)
export const getUserMessages = (userId: number, limit: number) => executeDbFunction('getUserMessages', userId, limit)
export const markMessageAsRead = (messageId: number) => executeDbFunction('markMessageAsRead', messageId)
export const getUnreadMessageCount = (userId: number, roomId?: string) => executeDbFunction('getUnreadMessageCount', userId, roomId)

// ==================== HELPER FUNCTIONS ====================

/**
 * Execute a database function - routes to HTTP client or direct call
 */
async function executeDbFunction(functionName: string, ...args: any[]): Promise<any> {
  if (currentMode === 'client' && databaseClient) {
    // Client mode: Call via HTTP
    try {
      const result = await databaseClient.executeDatabaseFunction(functionName, ...args)
      if (result.success) {
        return result.data
      }
      throw new Error(result.error || 'Database function failed')
    } catch (error: any) {
      console.error(`❌ Client mode error calling ${functionName}:`, error.message)
      throw error
    }
  }
  
  // Admin mode: Direct call
  const func = (db as any)[functionName]
  if (!func) {
    throw new Error(`Function ${functionName} not found in database module`)
  }
  return await func(...args)
}

/**
 * Generic database operation router
 * Use this for any Prisma operation
 */
export async function executeOperation(
  model: string, 
  method: string, 
  args: any[] = []
): Promise<any> {
  if (currentMode === 'client' && databaseClient) {
    const result = await databaseClient.executeQuery(model, method, args)
    if (!result.success) {
      throw new Error(result.error || 'Database operation failed')
    }
    return result.data
  }
  
  // Admin mode: Direct Prisma call
  const prisma = db.getPrismaClient()
  return await (prisma as any)[model][method](...args)
}
