/**
 * Database Proxy Layer
 * Routes database operations to either local Prisma (Admin) or HTTP Server (Client)
 */

import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import * as db from '../database'
import { DatabaseClient } from './DatabaseClient'

let databaseClient: DatabaseClient | null = null
let currentMode: 'admin' | 'client' | null = null

/**
 * Initialize the database proxy based on saved configuration
 */
export async function initializeDatabaseProxy(): Promise<void> {
  const userDataPath = app.getPath('userData')
  const configPath = path.join(userDataPath, 'database-config.json')
  
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      
      if (config.mode === 'client' && config.serverUrl) {
        // Client mode - connect to HTTP server
        console.log('🔌 Client mode detected - connecting to server:', config.serverUrl)
        currentMode = 'client'
        databaseClient = new DatabaseClient(config.serverUrl)
        
        // Test connection
        const result = await databaseClient.testConnection()
        if (!result.success) {
          console.error('❌ Failed to connect to server:', result.error)
          throw new Error(`Server connection failed: ${result.error}`)
        }
        
        console.log('✅ Connected to database server:', result.serverInfo)
      } else {
        // Admin mode - use local Prisma
        console.log('💾 Admin mode detected - using local database')
        currentMode = 'admin'
        await db.initializeDatabase()
      }
    } catch (error) {
      console.error('❌ Error reading database config:', error)
      // Fallback to admin mode
      currentMode = 'admin'
      await db.initializeDatabase()
    }
  } else {
    // No config - default to admin mode
    console.log('💾 No config found - defaulting to admin mode')
    currentMode = 'admin'
    await db.initializeDatabase()
  }
}

/**
 * Set the database client for client mode
 */
export function setDatabaseClient(client: DatabaseClient): void {
  databaseClient = client
  currentMode = 'client'
}

/**
 * Set admin mode
 */
export function setAdminMode(): void {
  currentMode = 'admin'
  databaseClient = null
}

/**
 * Get current mode
 */
export function getCurrentMode(): 'admin' | 'client' | null {
  return currentMode
}

/**
 * Execute a Prisma query - routes to HTTP or local based on mode
 */
export async function executeQuery(model: string, method: string, ...args: any[]): Promise<any> {
  if (currentMode === 'client' && databaseClient) {
    // Client mode - use HTTP
    console.log(`📡 HTTP Query: ${model}.${method}`)
    const result = await databaseClient.executeQuery(model, method, args)
    
    if (!result.success) {
      throw new Error(result.error || 'Query failed')
    }
    
    return result.data
  } else {
    // Admin mode - use local Prisma
    console.log(`💾 Local Query: ${model}.${method}`)
    const prisma = db.getPrismaClient()
    return await (prisma as any)[model][method](...args)
  }
}

/**
 * Proxy for database functions - automatically routes based on mode
 */
export const DatabaseProxy = {
  // User operations
  createUser: async (data: any) => {
    if (currentMode === 'client') {
      return executeQuery('user', 'create', { data })
    }
    return db.createUser(data)
  },
  
  getAllUsers: async () => {
    if (currentMode === 'client') {
      return executeQuery('user', 'findMany', { orderBy: { createdAt: 'desc' } })
    }
    return db.getAllUsers()
  },
  
  getUserById: async (id: number) => {
    if (currentMode === 'client') {
      return executeQuery('user', 'findUnique', { where: { id } })
    }
    return db.getUserById(id)
  },
  
  updateUser: async (id: number, data: any) => {
    if (currentMode === 'client') {
      return executeQuery('user', 'update', { where: { id }, data })
    }
    return db.updateUser(id, data)
  },
  
  deleteUser: async (id: number) => {
    if (currentMode === 'client') {
      return executeQuery('user', 'delete', { where: { id } })
    }
    return db.deleteUser(id)
  },
  
  // Patient operations
  getAllPatients: async (limit?: number, offset?: number) => {
    if (currentMode === 'client') {
      return executeQuery('patient', 'findMany', {
        take: limit || 100,
        skip: offset || 0,
        orderBy: { id: 'desc' }
      })
    }
    return db.getAllPatients(limit, offset)
  },
  
  getPatientByCode: async (code: number) => {
    if (currentMode === 'client') {
      return executeQuery('patient', 'findUnique', { where: { departmentCode: code } })
    }
    return db.getPatientByCode(code)
  },
  
  createPatient: async (data: any) => {
    if (currentMode === 'client') {
      return executeQuery('patient', 'create', { data })
    }
    return db.createPatient(data)
  },
  
  updatePatient: async (data: any) => {
    if (currentMode === 'client') {
      // data should contain departmentCode for where clause
      return executeQuery('patient', 'update', { where: { departmentCode: data.departmentCode }, data })
    }
    return db.updatePatient(data)
  },
  
  // For all other operations, use generic proxy
  query: executeQuery
}
