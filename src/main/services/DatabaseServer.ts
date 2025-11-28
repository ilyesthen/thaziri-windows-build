/**
 * Professional Database Server for LAN Access
 * Admin PC runs this server, Client PCs connect automatically
 */

import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import { Server } from 'http'
import os from 'os'

export class DatabaseServer {
  private app: express.Application
  private server: Server | null = null
  private prisma: PrismaClient
  private port: number = 3456 // Fixed port for discovery
  private isRunning: boolean = false

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.app = express()
    
    // Enable CORS for all client PCs
    this.app.use(cors())
    this.app.use(express.json({ limit: '50mb' }))
    
    this.setupRoutes()
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        message: 'Thaziri Database Server',
        version: '1.0.0',
        computerName: os.hostname()
      })
    })

    // Get server info
    this.app.get('/info', (req, res) => {
      const networkInterfaces = os.networkInterfaces()
      const addresses: string[] = []
      
      Object.values(networkInterfaces).forEach(netInterface => {
        netInterface?.forEach(addr => {
          if (addr.family === 'IPv4' && !addr.internal) {
            addresses.push(addr.address)
          }
        })
      })
      
      res.json({
        computerName: os.hostname(),
        ipAddresses: addresses,
        port: this.port,
        platform: os.platform(),
        uptime: process.uptime()
      })
    })

    // Generic query execution endpoint
    this.app.post('/query', async (req, res) => {
      try {
        const { model, method, args } = req.body
        
        if (!model || !method) {
          return res.status(400).json({ error: 'Missing model or method' })
        }

        // Execute Prisma query
        const result = await (this.prisma as any)[model][method](...(args || []))
        
        res.json({ success: true, data: result })
      } catch (error: any) {
        console.error('Query error:', error)
        res.status(500).json({ 
          success: false, 
          error: error.message,
          details: error.toString()
        })
      }
    })

    // Specific optimized endpoints for common operations
    
    // Patients
    this.app.get('/patients', async (req, res) => {
      try {
        const patients = await this.prisma.patient.findMany({
          orderBy: { id: 'desc' },
          take: 100
        })
        res.json({ success: true, data: patients })
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message })
      }
    })

    this.app.get('/patients/search/:term', async (req, res) => {
      try {
        const { term } = req.params
        const patients = await this.prisma.patient.findMany({
          where: {
            OR: [
              { firstName: { contains: term } },
              { lastName: { contains: term } },
              { departmentCode: { equals: parseInt(term) || 0 } }
            ]
          },
          take: 50
        })
        res.json({ success: true, data: patients })
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message })
      }
    })

    // ====================  COMPREHENSIVE API ENDPOINTS ====================
    // These proxy calls to the database functions
    
    // Execute any database function by name
    this.app.post('/db/execute', async (req, res) => {
      try {
        const { functionName, args } = req.body
        
        console.log(`📡 SERVER RECEIVED: /db/execute`)
        console.log(`   Function: ${functionName}`)
        console.log(`   Args:`, args)
        
        if (!functionName) {
          console.error(`❌ Missing functionName`)
          return res.status(400).json({ error: 'Missing functionName' })
        }
        
        // Import database module and call the function
        const db = require('../database')
        const func = db[functionName]
        
        if (!func || typeof func !== 'function') {
          console.error(`❌ Function ${functionName} not found in database module`)
          return res.status(400).json({ error: `Function ${functionName} not found` })
        }
        
        console.log(`   ✅ Function found, calling with ${args?.length || 0} arguments...`)
        
        // Call the function with arguments
        const result = await func(...(args || []))
        
        console.log(`   ✅ Function executed successfully`)
        console.log(`   Result type: ${typeof result}, is array: ${Array.isArray(result)}`)
        if (Array.isArray(result)) {
          console.log(`   Result length: ${result.length}`)
        }
        
        const response = { success: true, data: result }
        console.log(`   📤 Sending response:`, { success: true, dataType: typeof result })
        res.json(response)
      } catch (error: any) {
        console.error('❌ DB Execute error:', error)
        console.error('   Stack:', error.stack)
        res.status(500).json({ 
          success: false, 
          error: error.message,
          details: error.toString()
        })
      }
    })
  }

  async start(): Promise<{ success: boolean; port?: number; ip?: string; error?: string }> {
    if (this.isRunning) {
      return { success: false, error: 'Server already running' }
    }

    return new Promise((resolve) => {
      try {
        this.server = this.app.listen(this.port, '0.0.0.0', () => {
          this.isRunning = true
          
          // Get local IP
          const networkInterfaces = os.networkInterfaces()
          let localIP = 'localhost'
          
          for (const netInterface of Object.values(networkInterfaces)) {
            for (const addr of netInterface || []) {
              if (addr.family === 'IPv4' && !addr.internal) {
                localIP = addr.address
                break
              }
            }
            if (localIP !== 'localhost') break
          }
          
          console.log('✅ Database Server started successfully')
          console.log(`   IP: ${localIP}`)
          console.log(`   Port: ${this.port}`)
          console.log(`   URL: http://${localIP}:${this.port}`)
          
          resolve({ success: true, port: this.port, ip: localIP })
        })

        this.server.on('error', (error: any) => {
          console.error('❌ Server error:', error)
          this.isRunning = false
          resolve({ success: false, error: error.message })
        })
      } catch (error: any) {
        console.error('❌ Failed to start server:', error)
        resolve({ success: false, error: error.message })
      }
    })
  }

  async stop(): Promise<void> {
    if (this.server && this.isRunning) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          this.isRunning = false
          console.log('🛑 Database Server stopped')
          resolve()
        })
      })
    }
  }

  getStatus(): { running: boolean; port: number } {
    return {
      running: this.isRunning,
      port: this.port
    }
  }
}
