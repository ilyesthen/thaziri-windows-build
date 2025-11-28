import { app, BrowserWindow, shell, ipcMain, dialog, powerSaveBlocker } from 'electron'
import path from 'path'
import fs from 'fs'
import * as db from './database'
import NetworkDiscoveryService from './services/NetworkDiscoveryService'
import MessagingService from './services/MessagingService'
import registerOrdonnanceHandlers from './services/ordonnanceService'
import { DatabaseServer } from './services/DatabaseServer'
import { ServerDiscovery } from './services/ServerDiscovery'
import { DatabaseClient } from './services/DatabaseClient'
import * as DatabaseProxy from './services/DatabaseProxy'

// Prevent system sleep
let powerSaveBlockerId: number | null = null

// Track current logged-in user for cleanup
let currentUserId: number | null = null

// Database Server (for Admin PC)
let databaseServer: DatabaseServer | null = null
let serverDiscovery: ServerDiscovery | null = null

// Database Client (for Client PC)
let databaseClient: DatabaseClient | null = null

// Lazy import for electron-store to avoid initialization issues
let store: any = null
const getStore = () => {
  if (!store) {
    const Store = require('electron-store')
    store = new Store({
      defaults: {
        lastSelectedRecipientId: null
      }
    })
  }
  return store
}

// Single instance lock - DISABLED FOR TESTING MULTI-USER FEATURES
// Uncomment to re-enable single instance lock in production
// const gotTheLock = app.requestSingleInstanceLock()

// if (!gotTheLock) {
//   // Another instance is already running, quit this one
//   app.quit()
// } else {
//   // This is the first instance, set up second-instance handler
//   app.on('second-instance', () => {
//     // Someone tried to run a second instance, focus our window instead
//     if (mainWindow) {
//       if (mainWindow.isMinimized()) mainWindow.restore()
//       mainWindow.focus()
//     }
//   })
// }

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createWindow(): void {
  // Get the primary display's work area size
  const { screen } = require('electron')
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize
  
  // Use 85% of screen size for better experience
  const windowWidth = Math.floor(width * 0.85)
  const windowHeight = Math.floor(height * 0.85)
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: 1024,
    minHeight: 768,
    show: false,
    autoHideMenuBar: true,
    center: true,
    backgroundColor: '#FFFFFF',
    icon: path.join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, './preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Show window when ready to prevent visual flash
  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    
    // DevTools can be opened manually with Cmd+Option+I or F12
    // Uncomment the line below if you need DevTools to open automatically:
    // if (isDev) {
    //   mainWindow?.webContents.openDevTools()
    // }
  })

  // Handle window closed
  mainWindow.on('closed', async () => {
    // Unlock all salles for the current user when window closes
    if (currentUserId !== null) {
      try {
        const count = await db.unlockUserSalles(currentUserId)
        console.log(`🔓 Unlocked ${count} salle(s) for user ${currentUserId} on window close`)
        currentUserId = null
      } catch (error) {
        console.error('Failed to unlock salles on window close:', error)
      }
    }
    mainWindow = null
  })

  // Set window opened handler
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the remote URL for development or the local html file for production
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Set main window reference for messaging service
  const messagingService = MessagingService.getInstance()
  messagingService.setMainWindow(mainWindow)
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  // Initialize database proxy (routes to HTTP server if client mode, or local Prisma if admin mode)
  try {
    await DatabaseProxy.initializeDatabaseProxy()
    
    // Register ordonnance IPC handlers after database is ready
    registerOrdonnanceHandlers()
  } catch (error) {
    console.error('Failed to initialize database:', error)
  }

  // Initialize network discovery service
  try {
    const networkService = NetworkDiscoveryService.getInstance()
    await networkService.initialize()
    
    // Listen for user list updates and push to renderer
    networkService.on('users-update', (users) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('network:users-update', users)
      }
    })
  } catch (error) {
    console.error('Failed to initialize network discovery:', error)
  }

  // Initialize messaging service
  try {
    const messagingService = MessagingService.getInstance()
    await messagingService.startServer()
    // Main window will be set after it's created
  } catch (error) {
    console.error('Failed to initialize messaging service:', error)
  }

  // Prevent system from sleeping
  powerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension')
  console.log('🔋 Power save blocker started - system will not sleep')

  // Only create window if it doesn't exist
  if (!mainWindow) {
    createWindow()
  }

  // macOS: Re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    await db.disconnectDatabase()
    app.quit()
  }
})

// Cleanup on app quit
app.on('before-quit', async () => {
  // Unlock all salles for the current user
  if (currentUserId !== null) {
    try {
      const count = await db.unlockUserSalles(currentUserId)
      console.log(`🔓 Unlocked ${count} salle(s) for user ${currentUserId}`)
    } catch (error) {
      console.error('Failed to unlock salles on quit:', error)
    }
  }
  
  // Stop power save blocker
  if (powerSaveBlockerId !== null && powerSaveBlocker.isStarted(powerSaveBlockerId)) {
    powerSaveBlocker.stop(powerSaveBlockerId)
    console.log('🔋 Power save blocker stopped')
  }
  
  // Shutdown network discovery
  const networkService = NetworkDiscoveryService.getInstance()
  networkService.shutdown()
  
  await db.disconnectDatabase()
})

// Security: Prevent navigation to external websites
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (navigationEvent, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)
    
    if (parsedUrl.origin !== 'http://localhost:5173' && !isDev) {
      navigationEvent.preventDefault()
    }
  })
})

// IPC handlers for common operations
ipcMain.handle('app:getVersion', () => app.getVersion())
ipcMain.handle('app:getPlatform', () => process.platform)
ipcMain.handle('app:isPackaged', () => app.isPackaged)

// ==================== DATABASE IPC HANDLERS ====================

// NETWORK DISCOVERY OPERATIONS
ipcMain.handle('network:start-broadcasting', async (_event, user: { userId: number; username: string; role: string }) => {
  try {
    const networkService = NetworkDiscoveryService.getInstance()
    const messagingService = MessagingService.getInstance()
    const messagingPort = messagingService.getPort()
    
    networkService.startBroadcasting({
      ...user,
      messagingPort
    })
    return { success: true }
  } catch (error) {
    console.error('Error starting broadcast:', error)
    return { success: false, error: 'Failed to start broadcasting' }
  }
})

ipcMain.handle('network:stop-broadcasting', async () => {
  try {
    const networkService = NetworkDiscoveryService.getInstance()
    networkService.stopBroadcasting()
    return { success: true }
  } catch (error) {
    console.error('Error stopping broadcast:', error)
    return { success: false, error: 'Failed to stop broadcasting' }
  }
})

ipcMain.handle('network:get-active-users', async () => {
  try {
    const networkService = NetworkDiscoveryService.getInstance()
    return networkService.getActiveUsers()
  } catch (error) {
    console.error('Error getting active users:', error)
    return []
  }
})

// ==================== MESSAGING IPC HANDLERS ====================

ipcMain.handle('messaging:send', async (_event, params: {
  recipientIp?: string
  recipientPort?: number
  content: string
  senderId: string
  senderName: string
  senderRole?: string
  audioData?: string
  isVoiceMessage?: boolean
  roomId?: number
  recipientId?: string
  broadcast?: boolean
  patientContext?: {
    patientName?: string
    patientId?: string
  }
}) => {
  try {
    const messagingService = MessagingService.getInstance()
    
    // If no recipientPort provided, use the default messaging port
    if (!params.broadcast && params.recipientIp && !params.recipientPort) {
      params.recipientPort = messagingService.getPort()
    }
    
    await messagingService.sendMessage(params)
    return { success: true }
  } catch (error: any) {
    console.error('Failed to send message:', error)
    return { success: false, error: error.message }
  }
})

// AUTHENTICATION OPERATIONS
// IPC handler: auth:verify-credentials
// Queries the database and uses bcrypt to securely compare password hash
// Returns consistent JSON: success with user data, or failure with error message
ipcMain.handle('auth:verify-credentials', async (_event, email: string, password: string) => {
  try {
    return await db.verifyUserCredentials(email, password)
  } catch (error) {
    console.error('Error during authentication:', error)
    return {
      success: false,
      error: 'Invalid credentials'
    }
  }
})

// Legacy alias for backwards compatibility
ipcMain.handle('auth:login', async (_event, email: string, password: string) => {
  try {
    return await db.verifyUserCredentials(email, password)
  } catch (error) {
    console.error('Error during login:', error)
    return {
      success: false,
      error: 'Invalid credentials'
    }
  }
})

ipcMain.handle('auth:getUsersForLogin', async () => {
  try {
    return await db.getUsersForSelection()
  } catch (error) {
    console.error('Error getting users:', error)
    throw error
  }
})

ipcMain.handle('auth:createUserWithPassword', async (_event, data: any) => {
  try {
    return await db.createUserWithPassword(data)
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
})

// USER OPERATIONS
// Create user with hashed password
ipcMain.handle('db:createUser', async (_event, data: { name: string; email: string; password: string; role: string; defaultPercentage?: number | null }) => {
  try {
    console.log('Creating user with data:', data)
    const user = await db.createUserWithPassword(data)
    console.log('User created successfully:', user)
    return { success: true, user }
  } catch (error: any) {
    console.error('Error creating user:', error)
    return { success: false, error: error.message || 'Erreur de création' }
  }
})

// Get all users (excluding admins, passwords removed)
ipcMain.handle('db:getAllUsers', async () => {
  try {
    return await db.getAllUsersForManagement()
  } catch (error) {
    console.error('Error getting users:', error)
    throw error
  }
})

ipcMain.handle('db:getUserById', async (_event, id: number) => {
  try {
    return await db.getUserById(id)
  } catch (error) {
    console.error('Error getting user:', error)
    throw error
  }
})

// Update user with optional password change
ipcMain.handle('db:updateUser', async (_event, data: { id: number; name?: string; email?: string; newPassword?: string | null; role?: string }) => {
  try {
    return await db.updateUserWithPassword(data)
  } catch (error) {
    console.error('Error updating user:', error)
    throw error
  }
})

ipcMain.handle('db:deleteUser', async (_event, id: number) => {
  try {
    return await db.deleteUser(id)
  } catch (error) {
    console.error('Error deleting user:', error)
    throw error
  }
})

// NOTE OPERATIONS
ipcMain.handle('db:createNote', async (_event, data: db.CreateNoteInput) => {
  try {
    return await db.createNote(data)
  } catch (error) {
    console.error('Error creating note:', error)
    throw error
  }
})

ipcMain.handle('db:getAllNotes', async () => {
  try {
    return await db.getAllNotes()
  } catch (error) {
    console.error('Error getting notes:', error)
    throw error
  }
})

ipcMain.handle('db:getNoteById', async (_event, id: number) => {
  try {
    return await db.getNoteById(id)
  } catch (error) {
    console.error('Error getting note:', error)
    throw error
  }
})

ipcMain.handle('db:updateNote', async (_event, id: number, data: Partial<db.CreateNoteInput>) => {
  try {
    return await db.updateNote(id, data)
  } catch (error) {
    console.error('Error updating note:', error)
    throw error
  }
})

ipcMain.handle('db:deleteNote', async (_event, id: number) => {
  try {
    return await db.deleteNote(id)
  } catch (error) {
    console.error('Error deleting note:', error)
    throw error
  }
})

// TASK OPERATIONS
ipcMain.handle('db:createTask', async (_event, data: db.CreateTaskInput) => {
  try {
    return await db.createTask(data)
  } catch (error) {
    console.error('Error creating task:', error)
    throw error
  }
})

ipcMain.handle('db:getAllTasks', async () => {
  try {
    return await db.getAllTasks()
  } catch (error) {
    console.error('Error getting tasks:', error)
    throw error
  }
})

ipcMain.handle('db:getTaskById', async (_event, id: number) => {
  try {
    return await db.getTaskById(id)
  } catch (error) {
    console.error('Error getting task:', error)
    throw error
  }
})

ipcMain.handle('db:updateTask', async (_event, id: number, data: any) => {
  try {
    return await db.updateTask(id, data)
  } catch (error) {
    console.error('Error updating task:', error)
    throw error
  }
})

ipcMain.handle('db:deleteTask', async (_event, id: number) => {
  try {
    return await db.deleteTask(id)
  } catch (error) {
    console.error('Error deleting task:', error)
    throw error
  }
})

ipcMain.handle('db:toggleTaskCompletion', async (_event, id: number) => {
  try {
    return await db.toggleTaskCompletion(id)
  } catch (error) {
    console.error('Error toggling task:', error)
    throw error
  }
})

// TAG OPERATIONS
ipcMain.handle('db:createTag', async (_event, data: db.CreateTagInput) => {
  try {
    return await db.createTag(data)
  } catch (error) {
    console.error('Error creating tag:', error)
    throw error
  }
})

ipcMain.handle('db:getAllTags', async () => {
  try {
    return await db.getAllTags()
  } catch (error) {
    console.error('Error getting tags:', error)
    throw error
  }
})

ipcMain.handle('db:getTagById', async (_event, id: number) => {
  try {
    return await db.getTagById(id)
  } catch (error) {
    console.error('Error getting tag:', error)
    throw error
  }
})

ipcMain.handle('db:deleteTag', async (_event, id: number) => {
  try {
    return await db.deleteTag(id)
  } catch (error) {
    console.error('Error deleting tag:', error)
    throw error
  }
})

// File dialog handlers
ipcMain.handle('dialog:openFile', async () => {
  if (!mainWindow) return null
  
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  
  return canceled ? null : filePaths[0]
})

ipcMain.handle('dialog:saveFile', async () => {
  if (!mainWindow) return null
  
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  
  return canceled ? null : filePath
})

// ==================== PATIENT IPC HANDLERS ====================

ipcMain.handle('db:get-patients', async (_, limit?: number, offset?: number) => {
  try {
    const patients = await db.getAllPatients(limit, offset)
    return { success: true, patients }
  } catch (error: any) {
    console.error('Failed to get patients:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:get-patients-count', async () => {
  try {
    const count = await db.getPatientsCount()
    return { success: true, count }
  } catch (error: any) {
    console.error('Failed to get patients count:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:get-patient', async (_, id: number) => {
  try {
    const patient = await db.getPatientById(id)
    return { success: true, patient }
  } catch (error: any) {
    console.error('Failed to get patient:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:get-patient-by-code', async (_, code: number) => {
  try {
    const patient = await db.getPatientByCode(code)
    return { success: true, patient }
  } catch (error: any) {
    console.error('Failed to get patient by code:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:search-patients', async (_, searchTerm: string) => {
  try {
    const patients = await db.searchPatients(searchTerm)
    return { success: true, patients }
  } catch (error: any) {
    console.error('Failed to search patients:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:create-patient', async (_, data: db.CreatePatientInput) => {
  try {
    const patient = await db.createPatient(data)
    return { success: true, patient }
  } catch (error: any) {
    console.error('Failed to create patient:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:update-patient', async (_, data: db.UpdatePatientInput) => {
  try {
    const patient = await db.updatePatient(data)
    return { success: true, patient }
  } catch (error: any) {
    console.error('Failed to update patient:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:delete-patient', async (_, id: number) => {
  try {
    await db.deletePatient(id)
    return { success: true }
  } catch (error: any) {
    console.error('Failed to delete patient:', error)
    return { success: false, error: error.message }
  }
})

// ==================== MESSAGE TEMPLATE IPC HANDLERS ====================

ipcMain.handle('templates:get-all', async () => {
  try {
    const templates = await db.getAllTemplates()
    return { success: true, templates }
  } catch (error: any) {
    console.error('Failed to get templates:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('templates:create', async (_, content: string) => {
  try {
    const template = await db.createTemplate({ content })
    return { success: true, template }
  } catch (error: any) {
    console.error('Failed to create template:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('templates:update', async (_, { id, content }: { id: number; content: string }) => {
  try {
    const template = await db.updateTemplate(id, { content })
    return { success: true, template }
  } catch (error: any) {
    console.error('Failed to update template:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('templates:delete', async (_, id: number) => {
  try {
    await db.deleteTemplate(id)
    return { success: true }
  } catch (error: any) {
    console.error('Failed to delete template:', error)
    return { success: false, error: error.message }
  }
})

// ==================== HONORAIRES IPC HANDLERS ====================

ipcMain.handle('honoraires:get-all', async () => {
  try {
    const honoraires = await db.getAllActesHonoraires()
    return { success: true, honoraires }
  } catch (error: any) {
    console.error('Failed to get honoraires:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('honoraires:create', async (_, data: db.CreateActeHonoraireInput, userId?: number, userRole?: string) => {
  try {
    const honoraire = await db.createActeHonoraire(data)
    
    // Audit log
    await db.createAuditLog({
      userId,
      userRole,
      actionType: 'honoraires:create',
      details: `Created acte: ${data.actePratique} - ${data.honoraireEncaisser} DA`
    })
    
    return { success: true, honoraire }
  } catch (error: any) {
    console.error('Failed to create honoraire:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('honoraires:update', async (_, data: db.UpdateActeHonoraireInput, userId?: number, userRole?: string) => {
  try {
    const honoraire = await db.updateActeHonoraire(data)
    
    // Audit log
    await db.createAuditLog({
      userId,
      userRole,
      actionType: 'honoraires:update',
      details: `Updated acte ID ${data.id}: ${data.actePratique || 'N/A'}`
    })
    
    return { success: true, honoraire }
  } catch (error: any) {
    console.error('Failed to update honoraire:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('honoraires:delete', async (_, id: number, userId?: number, userRole?: string) => {
  try {
    // Get the honoraire details before deleting for audit log
    const honoraire = await db.getActeHonoraireById(id)
    
    await db.deleteActeHonoraire(id)
    
    // Audit log
    await db.createAuditLog({
      userId,
      userRole,
      actionType: 'honoraires:delete',
      details: `Deleted acte ID ${id}: ${honoraire?.actePratique || 'Unknown'}`
    })
    
    return { success: true }
  } catch (error: any) {
    console.error('Failed to delete honoraire:', error)
    return { success: false, error: error.message }
  }
})

// ==================== ASSISTANT USER IPC HANDLERS ====================

ipcMain.handle('db:assistant-user:get-or-create', async (_, data: { fullName: string; role: string; percentage: number }) => {
  try {
    const assistantUser = await db.getOrCreateAssistant(data.fullName, data.role, data.percentage)
    return { success: true, assistantUser }
  } catch (error: any) {
    console.error('Error getting or creating assistant user:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:assistant-user:find-by-name', async (_, fullName: string) => {
  try {
    const assistantUser = await db.findAssistantByName(fullName)
    return { success: true, assistantUser }
  } catch (error: any) {
    console.error('Error finding assistant user:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:assistant-user:update', async (_, data: { id: number; updates: any }) => {
  try {
    const assistantUser = await db.updateAssistantUser(data.id, data.updates)
    return { success: true, assistantUser }
  } catch (error: any) {
    console.error('Error updating assistant user:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:assistant-user:get-all', async () => {
  try {
    const assistantUsers = await db.getAllAssistantUsers()
    return { success: true, assistantUsers }
  } catch (error: any) {
    console.error('Error getting all assistant users:', error)
    return { success: false, error: error.message }
  }
})

// ==================== ASSISTANT SESSION IPC HANDLERS ====================

ipcMain.handle('db:assistant-session:create', async (_, data: { userId: number; assistantName: string; percentage: number; assistantUserId?: number }) => {
  try {
    const session = await db.createAssistantSession(data)
    return { success: true, session }
  } catch (error: any) {
    console.error('Error creating assistant session:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:assistant-session:close', async (_, sessionId: number) => {
  try {
    const session = await db.closeAssistantSession(sessionId)
    return { success: true, session }
  } catch (error: any) {
    console.error('Error closing assistant session:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:assistant-session:get-active', async (_, userId: number) => {
  try {
    const sessions = await db.getActiveAssistantSessions(userId)
    return { success: true, sessions }
  } catch (error: any) {
    console.error('Error getting active sessions:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:assistant-session:get-history', async (_, userId?: number) => {
  try {
    const sessions = await db.getAssistantSessionHistory(userId)
    return { success: true, sessions }
  } catch (error: any) {
    console.error('Error getting session history:', error)
    return { success: false, error: error.message }
  }
})

// ==================== HONORAIRES IPC HANDLERS (Daily Accounting) ====================

ipcMain.handle('db:honoraires:get-by-date', async (_, date: string, medecin?: string) => {
  try {
    const honoraires = await db.getHonorairesByDate(date, medecin)
    return { success: true, honoraires }
  } catch (error: any) {
    console.error('Error getting honoraires by date:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:honoraires:get-with-patients', async (_, date: string, medecin?: string) => {
  try {
    const records = await db.getHonorairesWithPatients(date, medecin)
    return { success: true, records }
  } catch (error: any) {
    console.error('Error getting honoraires with patients:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:honoraires:get-patient-visits', async (_, departmentCode: number) => {
  try {
    const visits = await db.getPatientVisitHistory(departmentCode)
    return { success: true, visits }
  } catch (error: any) {
    console.error('Error getting patient visit history:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:honoraires:delete', async (_, id: number) => {
  try {
    await db.deleteHonoraire(id)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting honoraire:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:honoraires:get-for-patient', async (_, patientCode: number) => {
  try {
    const result = await db.getHonorairesForPatient(patientCode)
    return result
  } catch (error: any) {
    console.error('Error getting honoraires for patient:', error)
    return { success: false, error: error.message, honoraires: [] }
  }
})

// Visit Examinations IPC Handlers
ipcMain.handle('db:visit-examinations:get-all', async (_, departmentCode: number) => {
  try {
    const examinations = await db.getPatientVisitExaminations(departmentCode)
    return { success: true, examinations }
  } catch (error: any) {
    console.error('Error getting visit examinations:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:visit-examinations:get-by-date', async (_, departmentCode: number, visitDate: string) => {
  try {
    const examination = await db.getVisitExaminationByDate(departmentCode, visitDate)
    return { success: true, examination }
  } catch (error: any) {
    console.error('Error getting visit examination by date:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:visit-examinations:get-all-by-patient', async (_, patientCode: number) => {
  try {
    const examinations = await db.getAllVisitExaminationsByPatientCode(patientCode)
    return { success: true, examinations }
  } catch (error: any) {
    console.error('Error getting visit examinations by patient:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:visit-examinations:create', async (_, data: any) => {
  try {
    const examination = await db.createVisitExamination(data)
    return { success: true, examination }
  } catch (error: any) {
    console.error('Error creating visit examination:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:visit-examinations:get-by-id', async (_, id: number) => {
  try {
    const examination = await db.getVisitExaminationById(id)
    return { success: true, examination }
  } catch (error: any) {
    console.error('Error getting visit examination by ID:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:visit-examinations:update', async (_, id: number, data: any) => {
  try {
    const examination = await db.updateVisitExamination(id, data)
    return { success: true, examination }
  } catch (error: any) {
    console.error('Error updating visit examination:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:visit-examinations:delete', async (_, id: number) => {
  try {
    await db.deleteVisitExamination(id)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting visit examination:', error)
    return { success: false, error: error.message }
  }
})


// ==================== SALLE (ROOM) IPC HANDLERS ====================

ipcMain.handle('db:salles:get-all', async () => {
  try {
    const salles = await db.getAllSalles()
    return { success: true, salles }
  } catch (error: any) {
    console.error('Error getting salles:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:salles:get-active', async () => {
  try {
    const salles = await db.getActiveSalles()
    return { success: true, salles }
  } catch (error: any) {
    console.error('Error getting active salles:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:salles:get-by-id', async (_, id: number) => {
  try {
    const salle = await db.getSalleById(id)
    return { success: true, salle }
  } catch (error: any) {
    console.error('Error getting salle:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:salles:create', async (_, data: { name: string; description?: string }) => {
  try {
    const salle = await db.createSalle(data)
    return { success: true, salle }
  } catch (error: any) {
    console.error('Error creating salle:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:salles:update', async (_, id: number, data: { name?: string; description?: string; isActive?: boolean }) => {
  try {
    const salle = await db.updateSalle(id, data)
    return { success: true, salle }
  } catch (error: any) {
    console.error('Error updating salle:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:salles:delete', async (_, id: number) => {
  try {
    await db.deleteSalle(id)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting salle:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:users:update-current-salle', async (_, userId: number, salleId: number | null) => {
  try {
    const user = await db.updateUserCurrentSalle(userId, salleId)
    return { success: true, user }
  } catch (error: any) {
    console.error('Error updating user current salle:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:assistant-sessions:update-salle', async (_, sessionId: number, salleId: number) => {
  try {
    const session = await db.updateAssistantSessionSalle(sessionId, salleId)
    return { success: true, session }
  } catch (error: any) {
    console.error('Error updating assistant session salle:', error)
    return { success: false, error: error.message }
  }
})

// Salle locking handlers
ipcMain.handle('db:salles:lock', async (_, salleId: number, userData: {
  userId: number
  userName: string
  userRole: string
  sessionName?: string
}) => {
  try {
    console.log('🔒 Locking salle:', salleId, 'User data:', userData)
    
    // Track the current user for cleanup on app close
    currentUserId = userData.userId
    
    const salle = await db.lockSalle(salleId, userData)
    console.log('✅ Salle locked successfully:', salle)
    return { success: true, salle }
  } catch (error: any) {
    console.error('❌ Error locking salle:', error)
    console.error('Error stack:', error.stack)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:salles:unlock', async (_, salleId: number) => {
  try {
    const salle = await db.unlockSalle(salleId)
    return { success: true, salle }
  } catch (error: any) {
    console.error('Error unlocking salle:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:salles:check-lock', async (_, salleId: number) => {
  try {
    const result = await db.isSalleLocked(salleId)
    return { success: true, ...result }
  } catch (error: any) {
    console.error('Error checking salle lock:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:salles:get-locked', async () => {
  try {
    const salles = await db.getLockedSalles()
    return { success: true, salles }
  } catch (error: any) {
    console.error('Error getting locked salles:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:salles:unlock-user-salles', async (_, userId: number) => {
  try {
    console.log('🔓 Unlocking all salles for user:', userId)
    const count = await db.unlockUserSalles(userId)
    console.log(`✅ Successfully unlocked ${count} salle(s) for user ${userId}`)
    
    // Clear current user tracking if this is the current user
    if (currentUserId === userId) {
      currentUserId = null
      console.log('✅ Cleared current user tracking')
    }
    
    return { success: true, count }
  } catch (error: any) {
    console.error('❌ Error unlocking user salles:', error)
    return { success: false, error: error.message }
  }
})

// ==================== PAYMENT VALIDATION IPC HANDLERS ====================

ipcMain.handle('db:payments:checkValidation', async (_, patientCode: number, visitDate: string) => {
  try {
    const result = await db.checkPaymentValidation(patientCode, visitDate)
    return result
  } catch (error: any) {
    console.error('Error checking payment validation:', error)
    return { validated: false }
  }
})

ipcMain.handle('db:payments:create', async (_, data: {
  patientCode: number
  patientName: string
  visitDate: string
  visitId?: number
  totalAmount: number
  selectedActs: any[]
  validatedBy: string
  validatedByUserId: number
  validatedByRole: string
  status?: string
  notes?: string
}) => {
  try {
    const payment = await db.createPaymentValidation(data)
    return { success: true, payment }
  } catch (error: any) {
    console.error('Error creating payment validation:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:payments:get-all', async (_, filters?: {
  patientCode?: number
  validatedByUserId?: number
  startDate?: string
  endDate?: string
  status?: string
}) => {
  try {
    const payments = await db.getPaymentValidations(filters)
    return { success: true, payments }
  } catch (error: any) {
    console.error('Error getting payment validations:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:payments:get-by-date', async (_, date: string) => {
  try {
    const payments = await db.getPaymentsByDate(date)
    return { success: true, payments }
  } catch (error: any) {
    console.error('Error getting payments by date:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:check-payment-validation', async (_, patientCode: string, visitDate: string) => {
  try {
    // Check if there's any payment for this patient on this date
    const payments = await db.getPaymentValidations({
      patientCode: parseInt(patientCode),
      startDate: visitDate,
      endDate: visitDate
    })
    const hasPayment = payments && payments.length > 0
    return { success: true, validated: hasPayment, payments }
  } catch (error: any) {
    console.error('Error checking payment validation:', error)
    return { success: false, error: error.message, validated: false }
  }
})

ipcMain.handle('db:payments:get-today-by-user', async () => {
  try {
    const paymentsByUser = await db.getTodayPaymentsByUser()
    return { success: true, paymentsByUser }
  } catch (error: any) {
    console.error('Error getting today payments by user:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:payments:get-logs', async (_, paymentId?: number) => {
  try {
    const logs = await db.getPaymentLogs(paymentId)
    return { success: true, logs }
  } catch (error: any) {
    console.error('Error getting payment logs:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:payments:cancel', async (_, 
  paymentId: number,
  cancelledBy: string,
  cancelledByUserId: number,
  cancelledByRole: string,
  reason: string
) => {
  try {
    const payment = await db.cancelPaymentValidation(paymentId, cancelledBy, cancelledByUserId, cancelledByRole, reason)
    return { success: true, payment }
  } catch (error: any) {
    console.error('Error cancelling payment:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:payments:delete', async (_, 
  paymentId: number,
  deletedBy: string,
  deletedByUserId: number,
  deletedByRole: string,
  reason: string
) => {
  try {
    await db.deletePaymentValidation(paymentId, deletedBy, deletedByUserId, deletedByRole, reason)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting payment:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:payments:link-to-visit', async (_, 
  patientCode: number,
  visitDate: string,
  visitId: number
) => {
  try {
    await db.linkPaymentsToVisit(patientCode, visitDate, visitId)
    return { success: true }
  } catch (error: any) {
    console.error('Error linking payments to visit:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:payments:delete-all-for-patient-date', async (_, 
  patientCode: number,
  visitDate: string,
  deletedBy: string,
  deletedByUserId: number,
  deletedByRole: string,
  reason: string
) => {
  try {
    const result = await db.deleteAllPaymentsForPatientDate(patientCode, visitDate, deletedBy, deletedByUserId, deletedByRole, reason)
    return { success: true, deletedCount: result }
  } catch (error: any) {
    console.error('Error deleting all payments for patient date:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:payments:getAllByPatient', async (_, patientCode: number) => {
  try {
    const result = await db.getAllPaymentsByPatient(patientCode)
    return result
  } catch (error: any) {
    console.error('Error getting all payments by patient:', error)
    return { success: false, error: error.message, payments: [] }
  }
})

// ==================== PATIENT QUEUE IPC HANDLERS ====================

ipcMain.handle('db:queue:sendToRoom', async (_, data: any) => {
  try {
    const queueItem = await db.sendPatientToRoom(data)
    return { success: true, queueItem }
  } catch (error: any) {
    console.error('Error sending patient to room:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:queue:sendToNurse', async (_, data: any) => {
  try {
    const queueItem = await db.sendPatientToNurse(data)
    return { success: true, queueItem }
  } catch (error: any) {
    console.error('Error sending patient to nurse:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:queue:getQueue', async (_, userId: number, userRole: string) => {
  try {
    const queue = await db.getPatientQueue(userId, userRole)
    return { success: true, queue }
  } catch (error: any) {
    console.error('Error getting patient queue:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:queue:getSentItems', async (_, userId: number) => {
  try {
    const items = await db.getSentQueueItems(userId)
    return { success: true, items }
  } catch (error: any) {
    console.error('Error getting sent queue items:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:queue:markSeen', async (_, queueId: number) => {
  try {
    await db.markQueueItemSeen(queueId)
    return { success: true }
  } catch (error: any) {
    console.error('Error marking queue item as seen:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:queue:markCompleted', async (_, queueId: number) => {
  try {
    await db.markQueueItemCompleted(queueId)
    return { success: true }
  } catch (error: any) {
    console.error('Error marking queue completed:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:queue:toggleChecked', async (_, queueId: number, isChecked: boolean) => {
  try {
    await db.toggleQueueItemChecked(queueId, isChecked)
    return { success: true }
  } catch (error: any) {
    console.error('Error toggling queue checked:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:queue:getDailySentCount', async (_, roomId: number, date: string) => {
  try {
    const count = await db.getDailySentCountForRoom(roomId, date)
    return { success: true, count }
  } catch (error: any) {
    console.error('Error getting daily sent count:', error)
    return { success: false, error: error.message, count: 0 }
  }
})

// Message handlers
ipcMain.handle('db:messages:save', async (_, messageData) => {
  try {
    const message = await db.saveMessage(messageData)
    return { success: true, message }
  } catch (error: any) {
    console.error('Error saving message:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:messages:getRoomMessages', async (_, roomId: number, limit?: number) => {
  try {
    const messages = await db.getRoomMessages(roomId, limit || 50)
    return { success: true, messages }
  } catch (error: any) {
    console.error('Error getting room messages:', error)
    return { success: false, error: error.message, messages: [] }
  }
})

ipcMain.handle('db:messages:getUserMessages', async (_, userId: number, limit?: number) => {
  try {
    const messages = await db.getUserMessages(userId, limit || 50)
    return { success: true, messages }
  } catch (error: any) {
    console.error('Error getting user messages:', error)
    return { success: false, error: error.message, messages: [] }
  }
})

ipcMain.handle('db:messages:markAsRead', async (_, messageId: number) => {
  try {
    await db.markMessageAsRead(messageId)
    return { success: true }
  } catch (error: any) {
    console.error('Error marking message as read:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:messages:getUnreadCount', async (_, userId?: number, roomId?: number) => {
  try {
    const count = await db.getUnreadMessageCount(userId, roomId)
    return { success: true, count }
  } catch (error: any) {
    console.error('Error getting unread count:', error)
    return { success: false, error: error.message, count: 0 }
  }
})

// ==================== STORE IPC HANDLERS (Persistent Settings) ====================

ipcMain.handle('store:get', (_, key: string) => {
  const store = getStore()
  return store.get(key)
})

ipcMain.handle('store:set', (_, key: string, value: any) => {
  const store = getStore()
  store.set(key, value)
  return { success: true }
})

// ==================== SETUP WIZARD IPC HANDLERS ====================

ipcMain.handle('setup:getComputerName', async () => {
  return require('os').hostname()
})

// Get resource path for assets (works in both dev and production)
ipcMain.handle('app:getResourcePath', async (_, filename: string) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      // In development, resources are in public folder
      return path.join(process.cwd(), 'public', filename)
    } else {
      // In production, check multiple locations
      const possiblePaths = [
        path.join(process.resourcesPath, 'public', filename),
        path.join(process.resourcesPath, filename),
        path.join(__dirname, '..', 'public', filename),
        path.join(__dirname, '..', '..', 'public', filename),
        path.join(app.getAppPath(), 'public', filename),
        path.join(app.getAppPath(), 'dist', filename),
      ]
      
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          console.log(`✅ Found resource at: ${testPath}`)
          return testPath
        }
      }
      
      console.error(`❌ Resource not found: ${filename}`)
      console.error('Searched paths:', possiblePaths)
      throw new Error(`Resource not found: ${filename}`)
    }
  } catch (error) {
    console.error('Error getting resource path:', error)
    throw error
  }
})

// Read resource file as base64 (for images)
ipcMain.handle('app:readResourceAsBase64', async (_, filename: string) => {
  try {
    const resourcePath = await ipcMain.emit('app:getResourcePath', { reply: () => {} }, filename) as any
    
    // Manually get resource path
    let filePath: string | null = null
    
    if (process.env.NODE_ENV === 'development') {
      filePath = path.join(process.cwd(), 'public', filename)
    } else {
      const possiblePaths = [
        path.join(process.resourcesPath, 'public', filename),
        path.join(process.resourcesPath, filename),
        path.join(__dirname, '..', 'public', filename),
        path.join(__dirname, '..', '..', 'public', filename),
        path.join(app.getAppPath(), 'public', filename),
        path.join(app.getAppPath(), 'dist', filename),
      ]
      
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          filePath = testPath
          break
        }
      }
    }
    
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filename}`)
    }
    
    console.log(`📖 Reading resource: ${filePath}`)
    const buffer = fs.readFileSync(filePath)
    const base64 = buffer.toString('base64')
    const mimeType = filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? 'image/jpeg' : 
                     filename.endsWith('.png') ? 'image/png' : 'application/octet-stream'
    
    return `data:${mimeType};base64,${base64}`
  } catch (error) {
    console.error('Error reading resource:', error)
    throw error
  }
})

ipcMain.handle('setup:database', async (_, config: { mode: 'admin' | 'client', databasePath?: string, shareName?: string }) => {
  try {
    const userDataPath = app.getPath('userData')
    const configPath = path.join(userDataPath, 'database-config.json')
    const setupCompletePath = path.join(userDataPath, 'setup-complete')
    const fs = require('fs')
    const os = require('os')
    
    if (config.mode === 'admin') {
      // Admin mode: Remove any client configuration
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath)
      }
      
      // Get computer name for network path
      const computerName = os.hostname().toUpperCase().replace(/\..+$/, '')
      const shareName = config.shareName || 'ThaziriDB'
      const dbPath = path.join(userDataPath, 'thaziri-database.db')
      
      // Build UNC path that clients will use
      const uncPath = `\\\\${computerName}\\${shareName}\\thaziri-database.db`
      
      console.log('🔧 Admin PC Setup:')
      console.log('  Computer Name:', computerName)
      console.log('  Share Name:', shareName)
      console.log('  Database Path:', dbPath)
      console.log('  UNC Path for clients:', uncPath)
      
      // Try to automatically share the folder on Windows
      let shareCreated = false
      let shareError = ''
      
      if (process.platform === 'win32') {
        try {
          const { execSync } = require('child_process')
          
          // PowerShell command to create network share
          const psCommand = `
            $shareName = "${shareName}"
            $folderPath = "${userDataPath.replace(/\\/g, '\\\\')}"
            
            # Check if share already exists
            $existingShare = Get-SmbShare -Name $shareName -ErrorAction SilentlyContinue
            
            if ($existingShare) {
              # Update existing share
              Set-SmbShare -Name $shareName -Path $folderPath -FullAccess "Everyone" -Confirm:$false
              Write-Output "SHARE_UPDATED"
            } else {
              # Create new share with full access
              New-SmbShare -Name $shareName -Path $folderPath -FullAccess "Everyone" -Description "Thaziri Database Share"
              Write-Output "SHARE_CREATED"
            }
          `.trim()
          
          console.log('📁 Creating Windows network share...')
          const result = execSync(`powershell.exe -Command "${psCommand}"`, { 
            encoding: 'utf8',
            windowsHide: true
          })
          
          if (result.includes('SHARE_CREATED') || result.includes('SHARE_UPDATED')) {
            shareCreated = true
            console.log('✅ Network share created successfully!')
          }
        } catch (error: any) {
          shareError = error.message || 'Unknown error'
          console.error('❌ Failed to create network share:', error)
          console.error('   User will need to share manually')
        }
      }
      
      // Mark setup as complete with all info
      fs.writeFileSync(setupCompletePath, JSON.stringify({
        mode: 'admin',
        completedAt: new Date().toISOString(),
        shareName: shareName,
        computerName: computerName,
        uncPath: uncPath,
        databasePath: dbPath,
        shareCreated: shareCreated
      }, null, 2))
      
      let message = `✅ PC Admin configuré!\n\n`
      
      if (shareCreated) {
        message += `🌐 Partage réseau créé automatiquement!\n\n`
        message += `📋 Chemin à partager avec les autres PCs:\n${uncPath}\n\n`
        message += `✅ Les autres PCs peuvent maintenant se connecter!`
      } else {
        message += `⚠️ Partage réseau non créé automatiquement.\n\n`
        message += `📋 INSTRUCTIONS MANUELLES:\n\n`
        message += `1. Ouvrez l'Explorateur Windows\n`
        message += `2. Naviguez vers: ${userDataPath}\n`
        message += `3. Clic droit → Propriétés → Partage\n`
        message += `4. Cliquez "Partager"\n`
        message += `5. Ajoutez "Tout le monde" avec permission Lecture/Écriture\n`
        message += `6. Nommez le partage: ${shareName}\n\n`
        message += `📋 Chemin pour les autres PCs:\n${uncPath}`
        
        if (shareError && shareError.includes('access')) {
          message += `\n\n💡 Astuce: Exécutez l'application en tant qu'Administrateur pour partager automatiquement`
        }
      }
      
      return { 
        success: true, 
        mode: 'admin',
        computerName,
        shareName,
        uncPath,
        shareCreated,
        message
      }
    } else {
      // Client mode: Save database path configuration
      if (!config.databasePath) {
        return { success: false, error: 'Database path is required for client mode' }
      }
      
      require('fs').writeFileSync(configPath, JSON.stringify({
        databasePath: config.databasePath
      }, null, 2))
      
      // Mark setup as complete
      require('fs').writeFileSync(setupCompletePath, JSON.stringify({
        mode: 'client',
        completedAt: new Date().toISOString(),
        databasePath: config.databasePath
      }))
      
      return { success: true, mode: 'client' }
    }
  } catch (error: any) {
    console.error('Setup error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('setup:testConnection', async (_, databasePath: string) => {
  try {
    const fs = require('fs')
    const path = require('path')
    
    console.log('🔍 Testing database connection to:', databasePath)
    
    // Normalize path (handles both UNC and regular paths)
    const normalizedPath = path.normalize(databasePath)
    console.log('📍 Normalized path:', normalizedPath)
    
    // Test if path exists
    if (!fs.existsSync(normalizedPath)) {
      console.error('❌ Path does not exist')
      return { 
        success: false, 
        error: `Fichier introuvable: ${normalizedPath}\n\nVérifiez que:\n1. Le chemin réseau est correct (\\\\PC-NAME\\ThaziriDB\\thaziri-database.db)\n2. Le dossier est partagé sur le PC Admin\n3. Vous avez les permissions d'accès` 
      }
    }
    
    // Test if it's a file (not a directory)
    const stats = fs.statSync(normalizedPath)
    if (!stats.isFile()) {
      return { 
        success: false, 
        error: 'Le chemin spécifié est un dossier, pas un fichier de base de données' 
      }
    }
    
    // Test read permission
    try {
      fs.accessSync(normalizedPath, fs.constants.R_OK)
    } catch (err) {
      return { 
        success: false, 
        error: 'Impossible de lire le fichier. Vérifiez les permissions de partage.' 
      }
    }
    
    // Test write permission
    try {
      fs.accessSync(normalizedPath, fs.constants.W_OK)
    } catch (err) {
      return { 
        success: false, 
        error: 'Impossible d\'écrire dans le fichier. Assurez-vous que le partage autorise les modifications.' 
      }
    }
    
    // Verify it's a SQLite database by checking the header
    const buffer = Buffer.alloc(16)
    const fd = fs.openSync(normalizedPath, 'r')
    fs.readSync(fd, buffer, 0, 16, 0)
    fs.closeSync(fd)
    
    const header = buffer.toString('utf-8', 0, 15)
    if (!header.startsWith('SQLite format')) {
      return { 
        success: false, 
        error: 'Le fichier n\'est pas une base de données SQLite valide' 
      }
    }
    
    console.log('✅ Database connection test successful!')
    return { success: true, message: 'Connexion réussie! La base de données est accessible.' }
  } catch (error: any) {
    console.error('❌ Connection test failed:', error)
    return { 
      success: false, 
      error: error.code === 'ENOENT' ? 'Chemin réseau introuvable. Vérifiez le partage réseau.' : 
             error.code === 'EACCES' ? 'Accès refusé. Vérifiez les permissions de partage.' :
             error.code === 'ENOTDIR' ? 'Chemin invalide' :
             `Erreur de connexion: ${error.message}` 
    }
  }
})

ipcMain.handle('setup:importDatabase', async (_, sourcePath: string) => {
  try {
    const fs = require('fs')
    const userDataPath = app.getPath('userData')
    const destPath = path.join(userDataPath, 'thaziri-database.db')
    
    console.log('📥 Importing database...')
    console.log('  Source:', sourcePath)
    console.log('  Destination:', destPath)
    
    // Copy database file
    fs.copyFileSync(sourcePath, destPath)
    
    console.log('✅ Database imported successfully')
    
    // Important: After import, reinitialize database connection
    // This ensures the Prisma client uses the new database
    await db.initializeDatabase()
    
    return { success: true }
  } catch (error: any) {
    console.error('❌ Database import error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('setup:isComplete', async () => {
  try {
    const userDataPath = app.getPath('userData')
    const setupCompletePath = path.join(userDataPath, 'setup-complete')
    
    if (require('fs').existsSync(setupCompletePath)) {
      const setupData = JSON.parse(require('fs').readFileSync(setupCompletePath, 'utf-8'))
      return { complete: true, ...setupData }
    }
    
    return { complete: false }
  } catch (error) {
    return { complete: false }
  }
})

ipcMain.handle('dialog:selectFile', async (_, options: any) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: options.filters || []
  })
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

// Print PDF silently with specific paper size
// ==================== PROFESSIONAL DATABASE SERVER ====================

// Start Database Server (Admin PC only)
ipcMain.handle('server:start', async () => {
  try {
    if (databaseServer) {
      return { success: false, error: 'Server already running' }
    }

    // Get Prisma client from db module
    const prisma = db.getPrismaClient()
    
    // Create and start server
    databaseServer = new DatabaseServer(prisma)
    const result = await databaseServer.start()
    
    if (result.success) {
      // Start discovery responder
      serverDiscovery = new ServerDiscovery()
      await serverDiscovery.startBroadcastResponder(
        result.port!,
        require('os').hostname()
      )
      
      // Save admin mode configuration
      const userDataPath = app.getPath('userData')
      const configPath = path.join(userDataPath, 'database-config.json')
      
      fs.writeFileSync(configPath, JSON.stringify({
        mode: 'admin',
        serverUrl: `http://${result.ip}:${result.port}`,
        startedAt: new Date().toISOString()
      }, null, 2))
      
      // Set database proxy to admin mode
      DatabaseProxy.setAdminMode()
      
      console.log('✅ Database Server & Discovery started')
      console.log(`   Clients can connect to: http://${result.ip}:${result.port}`)
      console.log('💾 Admin mode configured')
      
      return {
        success: true,
        ip: result.ip,
        port: result.port,
        url: `http://${result.ip}:${result.port}`
      }
    }
    
    return result
  } catch (error: any) {
    console.error('❌ Failed to start server:', error)
    return { success: false, error: error.message }
  }
})

// Stop Database Server
ipcMain.handle('server:stop', async () => {
  try {
    if (databaseServer) {
      await databaseServer.stop()
      databaseServer = null
    }
    
    if (serverDiscovery) {
      serverDiscovery.stop()
      serverDiscovery = null
    }
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// Get Server Status
ipcMain.handle('server:status', async () => {
  if (databaseServer) {
    return databaseServer.getStatus()
  }
  return { running: false, port: 0 }
})

// Discover Servers on Network (Client PC)
ipcMain.handle('server:discover', async () => {
  try {
    console.log('📡 Starting server discovery...')
    
    const discovery = new ServerDiscovery()
    const servers = await discovery.discoverServers(3000) // 3 second timeout
    discovery.stop()
    
    console.log(`📡 Found ${servers.length} server(s)`)
    
    if (servers.length === 0) {
      return {
        success: false,
        servers: [],
        error: 'Aucun serveur Thaziri trouvé sur le réseau.\n\nVérifiez que:\n1. Le PC Admin est allumé\n2. L\'application Thaziri est ouverte sur le PC Admin\n3. Les deux PCs sont sur le même réseau WiFi/Ethernet'
      }
    }
    
    return {
      success: true,
      servers: servers.map(s => ({
        name: s.computerName,
        ip: s.ip,
        port: s.port,
        url: `http://${s.ip}:${s.port}`
      }))
    }
  } catch (error: any) {
    console.error('❌ Discovery error:', error)
    return {
      success: false,
      servers: [],
      error: error.message
    }
  }
})

// Connect to Server (Client PC)
ipcMain.handle('server:connect', async (_, serverUrl: string) => {
  try {
    console.log(`🔌 Connecting to server: ${serverUrl}`)
    
    databaseClient = new DatabaseClient(serverUrl)
    const result = await databaseClient.testConnection()
    
    if (result.success) {
      console.log('✅ Connected to database server!')
      console.log('   Server info:', result.serverInfo)
      
      // Save client mode configuration
      const userDataPath = app.getPath('userData')
      const configPath = path.join(userDataPath, 'database-config.json')
      
      fs.writeFileSync(configPath, JSON.stringify({
        mode: 'client',
        serverUrl: serverUrl,
        serverInfo: result.serverInfo,
        connectedAt: new Date().toISOString()
      }, null, 2))
      
      console.log('💾 Client configuration saved')
      
      // Set database proxy to use HTTP client
      DatabaseProxy.setDatabaseClient(databaseClient)
      console.log('✅ Database proxy set to client mode')
      
      return {
        success: true,
        serverInfo: result.serverInfo,
        message: `Connecté à: ${result.serverInfo.computerName}`
      }
    }
    
    return result
  } catch (error: any) {
    console.error('❌ Connection error:', error)
    return {
      success: false,
      error: error.message
    }
  }
})

// Test connection to existing server
ipcMain.handle('server:testConnection', async (_, serverUrl: string) => {
  try {
    const client = new DatabaseClient(serverUrl)
    return await client.testConnection()
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
})

ipcMain.handle('print:pdf', async (_, pdfBase64: string, paperSize: 'A4' | 'A5' = 'A4') => {
  try {
    console.log(`🖨️ Printing PDF silently with paper size: ${paperSize}`)
    
    // Create hidden window for printing
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false
      }
    })
    
    // Convert base64 to data URL
    const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`
    
    // Load PDF
    await printWindow.loadURL(pdfDataUrl)
    
    // Print settings
    const printOptions: any = {
      silent: true, // Print without dialog
      printBackground: true,
      color: true,
      margins: {
        marginType: 'none' as const
      },
      pageSize: paperSize === 'A5' ? { width: 148000, height: 210000 } : 'A4' // A5 in microns or A4
    }
    
    // Print
    printWindow.webContents.print(printOptions, (success, failureReason) => {
      if (success) {
        console.log('✅ Print successful')
      } else {
        console.error('❌ Print failed:', failureReason)
      }
      
      // Close print window
      printWindow.close()
    })
    
    return { success: true }
  } catch (error: any) {
    console.error('❌ Print error:', error)
    return { success: false, error: error.message }
  }
})

// Handle app protocol for macOS
if (process.platform === 'darwin') {
  app.setAboutPanelOptions({
    applicationName: 'Allah',
    applicationVersion: app.getVersion(),
    version: app.getVersion()
  })
}