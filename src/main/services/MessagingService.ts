import net from 'net'
import { BrowserWindow } from 'electron'
import * as db from '../database'
import NetworkDiscoveryService from './NetworkDiscoveryService'

interface Message {
  senderId: string
  senderName: string
  senderRole?: string
  content: string
  timestamp: number
  audioData?: string // Base64 encoded audio
  isVoiceMessage?: boolean
  roomId?: number // For room-based messages
  recipientId?: string // For direct messages to specific user
  patientContext?: { // Patient context when sent from patient pages
    patientName?: string
    patientId?: string
  }
}

interface SendMessageParams {
  recipientIp?: string // Optional for broadcast messages
  recipientPort?: number // Optional for broadcast messages
  content: string
  senderId: string
  senderName: string
  senderRole?: string
  audioData?: string
  isVoiceMessage?: boolean
  roomId?: number // For room-based messages
  recipientId?: string // For direct messages
  broadcast?: boolean // For room broadcasts
  patientContext?: { // Patient context
    patientName?: string
    patientId?: string
  }
}

/**
 * MessagingService - Centralized TCP messaging service
 * Handles all direct peer-to-peer messaging between users on the network
 */
class MessagingService {
  private static instance: MessagingService | null = null
  private server: net.Server | null = null
  private port: number = process.env.MESSAGING_PORT ? parseInt(process.env.MESSAGING_PORT) : 45679 // Different from network discovery port
  private mainWindow: BrowserWindow | null = null
  private messageBuffer: Map<net.Socket, Buffer> = new Map()

  private constructor() {
    // Private constructor for singleton
    console.log(`[MessagingService] Will use port: ${this.port}`)
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): MessagingService {
    if (!MessagingService.instance) {
      MessagingService.instance = new MessagingService()
    }
    return MessagingService.instance
  }

  /**
   * Set the main window reference for sending messages to renderer
   */
  public setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  /**
   * Get the messaging port this service is using
   */
  public getPort(): number {
    return this.port
  }

  /**
   * Start the TCP server for receiving messages
   */
  public async startServer(): Promise<void> {
    if (this.server) {
      console.log('📬 Messaging server already running')
      return
    }

    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        console.log('📨 New incoming connection:', socket.remoteAddress)
        
        // Initialize buffer for this socket
        this.messageBuffer.set(socket, Buffer.alloc(0))

        socket.on('data', (data) => {
          this.handleIncomingData(socket, data)
        })

        socket.on('error', (error) => {
          console.error('❌ Socket error:', error)
          this.messageBuffer.delete(socket)
        })

        socket.on('close', () => {
          console.log('🔌 Connection closed:', socket.remoteAddress)
          this.messageBuffer.delete(socket)
        })
      })

      this.server.listen(this.port, () => {
        console.log(`📬 Messaging server listening on port ${this.port}`)
        resolve()
      })

      this.server.on('error', (error) => {
        console.error('❌ Server error:', error)
        reject(error)
      })
    })
  }

  /**
   * Handle incoming data with length-prefix framing protocol
   */
  private handleIncomingData(socket: net.Socket, data: Buffer): void {
    // Append new data to existing buffer
    const currentBuffer = this.messageBuffer.get(socket) || Buffer.alloc(0)
    const newBuffer = Buffer.concat([currentBuffer, data])
    this.messageBuffer.set(socket, newBuffer)

    // Try to extract complete messages
    this.processBuffer(socket).catch(err => {
      console.error('Error processing buffer:', err)
    })
  }

  /**
   * Process buffer to extract complete framed messages
   */
  private async processBuffer(socket: net.Socket): Promise<void> {
    const buffer = this.messageBuffer.get(socket)
    if (!buffer || buffer.length < 4) {
      return // Not enough data for length prefix
    }

    // Read 4-byte length prefix
    const messageLength = buffer.readUInt32BE(0)

    // Check if we have the complete message
    if (buffer.length < 4 + messageLength) {
      return // Incomplete message, wait for more data
    }

    // Extract the complete message
    const messageBuffer = buffer.slice(4, 4 + messageLength)
    const messageJson = messageBuffer.toString('utf-8')

    try {
      const message = JSON.parse(messageJson) as Message
      
      // Enrich with server timestamp
      message.timestamp = Date.now()

      // Save message to database for persistence
      if (message.roomId) {
        await db.saveMessage({
          senderId: parseInt(message.senderId),
          senderName: message.senderName,
          senderRole: message.senderRole || 'unknown',
          content: message.content,
          roomId: message.roomId,
          audioData: message.audioData,
          isVoiceMessage: message.isVoiceMessage
        })
      }

      // Push to renderer
      this.pushMessageToRenderer(message)

      console.log('✅ Message received:', message)
    } catch (error) {
      console.error('❌ Failed to parse message:', error)
    }

    // Remove processed message from buffer
    const remainingBuffer = buffer.slice(4 + messageLength)
    this.messageBuffer.set(socket, remainingBuffer)

    // Process any remaining messages in buffer
    if (remainingBuffer.length > 0) {
      this.processBuffer(socket)
    }
  }

  /**
   * Send message to renderer process (React UI)
   */
  private pushMessageToRenderer(message: Message): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('messaging:new-message', message)
    }
  }

  /**
   * Send a message to a recipient using TCP client connection
   */
  public async sendMessage(params: SendMessageParams): Promise<void> {
    const { 
      recipientIp, 
      recipientPort, 
      content, 
      senderId, 
      senderName, 
      senderRole, 
      audioData, 
      isVoiceMessage,
      roomId,
      recipientId,
      broadcast,
      patientContext
    } = params

    // If broadcast mode, send to all active users
    if (broadcast && roomId) {
      return this.broadcastRoomMessage(params)
    }

    // Use the new sendDirectMessage method for direct messages
    return this.sendDirectMessage(params)
  }

  /**
   * Broadcast a message to all users in a room
   */
  private async broadcastRoomMessage(params: SendMessageParams): Promise<void> {
    // Get all active users from NetworkDiscoveryService
    const networkService = NetworkDiscoveryService.getInstance()
    const activeUsers = networkService.getActiveUsers()
    
    const message: Message = {
      senderId: params.senderId,
      senderName: params.senderName,
      senderRole: params.senderRole,
      content: params.content,
      timestamp: Date.now(),
      audioData: params.audioData,
      isVoiceMessage: params.isVoiceMessage,
      roomId: params.roomId,
      patientContext: params.patientContext
    }

    // Send to all active users (they will filter based on room)
    const sendPromises = activeUsers
      .filter(user => user.userId.toString() !== params.senderId) // Don't send to self
      .map(user => {
        return this.sendDirectMessage({
          recipientIp: user.ipAddress,
          recipientPort: user.messagingPort,
          content: params.content,
          senderId: params.senderId,
          senderName: params.senderName,
          senderRole: params.senderRole,
          audioData: params.audioData,
          isVoiceMessage: params.isVoiceMessage,
          roomId: params.roomId,
          patientContext: params.patientContext
        }).catch(err => {
          console.error(`Failed to send to ${user.username}:`, err)
        })
      })

    // Also push locally to show in sender's UI (optional, or we can skip)
    // this.pushMessageToRenderer(message)
    
    await Promise.all(sendPromises)
    console.log(`📢 Broadcasted message to room ${params.roomId} (${sendPromises.length} recipients)`)
  }

  /**
   * Send a direct message to a specific recipient
   */
  private async sendDirectMessage(params: SendMessageParams): Promise<void> {
    const { 
      recipientIp, 
      recipientPort, 
      content, 
      senderId, 
      senderName, 
      senderRole, 
      audioData, 
      isVoiceMessage,
      roomId,
      recipientId,
      patientContext
    } = params

    if (!recipientIp || !recipientPort) {
      throw new Error('Recipient IP and port required for direct messages')
    }

    return new Promise((resolve, reject) => {
      const message: Message = {
        senderId,
        senderName,
        senderRole,
        content,
        timestamp: Date.now(),
        audioData,
        isVoiceMessage,
        roomId,
        recipientId,
        patientContext
      }

      const messageJson = JSON.stringify(message)
      const messageBuffer = Buffer.from(messageJson, 'utf-8')
      const lengthPrefix = Buffer.alloc(4)
      lengthPrefix.writeUInt32BE(messageBuffer.length, 0)

      // Create TCP client socket
      const client = net.createConnection({
        host: recipientIp,
        port: recipientPort,
        timeout: 5000 // 5 second timeout
      }, () => {
        console.log(`📤 Connected to ${recipientIp}:${recipientPort}`)
        
        // Send length-prefixed message
        client.write(lengthPrefix)
        client.write(messageBuffer)
        
        // Close connection after sending
        client.end()
        resolve()
      })

      client.on('error', (error) => {
        console.error(`❌ Failed to send message to ${recipientIp}:`, error)
        reject(error)
      })

      client.on('timeout', () => {
        console.error(`⏱️ Connection timeout to ${recipientIp}`)
        client.destroy()
        reject(new Error('Connection timeout'))
      })
    })
  }

  /**
   * Stop the TCP server
   */
  public async stopServer(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          console.log('📪 Messaging server stopped')
          this.server = null
          this.messageBuffer.clear()
          resolve()
        })
      })
    }
  }
}

export default MessagingService
