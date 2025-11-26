import dgram from 'dgram'
import { EventEmitter } from 'events'
import os from 'os'

export interface NetworkUser {
  userId: number
  username: string
  role: string
  ipAddress: string
  messagingPort: number
  lastSeen: number
}

interface BroadcastPacket {
  userId: number
  username: string
  role: string
  messagingPort: number
  type: 'presence' | 'goodbye'
}

/**
 * NetworkDiscoveryService
 * 
 * Singleton service for discovering active users on the local network.
 * Uses UDP broadcasting to announce presence and listen for other users.
 */
class NetworkDiscoveryService extends EventEmitter {
  private static instance: NetworkDiscoveryService | null = null
  
  private readonly BROADCAST_PORT = 45678
  private readonly BROADCAST_INTERVAL = 5000 // 5 seconds
  private readonly STALE_TIMEOUT = 15000 // 15 seconds
  private readonly CLEANUP_INTERVAL = 3000 // 3 seconds

  private socket: dgram.Socket | null = null
  private broadcastTimer: NodeJS.Timeout | null = null
  private cleanupTimer: NodeJS.Timeout | null = null
  
  private currentUser: { userId: number; username: string; role: string } | null = null
  private activeUsers: Map<number, NetworkUser> = new Map()
  private isRunning = false

  private constructor() {
    super()
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): NetworkDiscoveryService {
    if (!NetworkDiscoveryService.instance) {
      NetworkDiscoveryService.instance = new NetworkDiscoveryService()
    }
    return NetworkDiscoveryService.instance
  }

  /**
   * Initialize the network discovery service
   */
  public async initialize(): Promise<void> {
    if (this.isRunning) {
      console.log('[NetworkDiscovery] Service already running')
      return
    }

    try {
      this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })

      // Set up socket event handlers
      this.socket.on('error', this.handleSocketError.bind(this))
      this.socket.on('message', this.handleIncomingMessage.bind(this))
      this.socket.on('listening', this.handleSocketListening.bind(this))

      // Bind to the broadcast port
      await new Promise<void>((resolve, reject) => {
        this.socket!.once('listening', () => resolve())
        this.socket!.once('error', reject)
        this.socket!.bind(this.BROADCAST_PORT)
      })

      // Enable broadcasting
      this.socket.setBroadcast(true)

      // Start cleanup timer
      this.startCleanupTimer()

      this.isRunning = true
      console.log('[NetworkDiscovery] Service initialized successfully')
    } catch (error) {
      console.error('[NetworkDiscovery] Failed to initialize:', error)
      this.cleanup()
      throw error
    }
  }

  /**
   * Start broadcasting user presence
   */
  public startBroadcasting(user: { userId: number; username: string; role: string; messagingPort: number }): void {
    if (!this.isRunning) {
      console.error('[NetworkDiscovery] Cannot broadcast: service not initialized')
      return
    }

    if (this.broadcastTimer) {
      console.log('[NetworkDiscovery] Already broadcasting, stopping previous broadcast')
      this.stopBroadcasting()
    }

    this.currentUser = user
    console.log(`[NetworkDiscovery] Starting broadcast for user: ${user.username} (${user.role})`)

    // Broadcast immediately
    this.sendBroadcast('presence')

    // Set up periodic broadcasting
    this.broadcastTimer = setInterval(() => {
      this.sendBroadcast('presence')
    }, this.BROADCAST_INTERVAL)
  }

  /**
   * Stop broadcasting user presence
   */
  public stopBroadcasting(): void {
    if (this.broadcastTimer) {
      clearInterval(this.broadcastTimer)
      this.broadcastTimer = null
    }

    // Send goodbye message
    if (this.currentUser && this.isRunning) {
      this.sendBroadcast('goodbye')
    }

    this.currentUser = null
    console.log('[NetworkDiscovery] Stopped broadcasting')
  }

  /**
   * Get the list of active users
   */
  public getActiveUsers(): NetworkUser[] {
    return Array.from(this.activeUsers.values())
  }

  /**
   * Shutdown the service
   */
  public shutdown(): void {
    console.log('[NetworkDiscovery] Shutting down service')

    this.stopBroadcasting()

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }

    if (this.socket) {
      this.socket.close()
      this.socket = null
    }

    this.activeUsers.clear()
    this.isRunning = false
    console.log('[NetworkDiscovery] Service shut down')
  }

  /**
   * Send a broadcast message
   */
  private sendBroadcast(type: 'presence' | 'goodbye'): void {
    if (!this.currentUser || !this.socket) return

    const packet: BroadcastPacket = {
      userId: this.currentUser.userId,
      username: this.currentUser.username,
      role: this.currentUser.role,
      messagingPort: this.currentUser.messagingPort,
      type
    }

    const message = Buffer.from(JSON.stringify(packet))
    const broadcastAddress = this.getBroadcastAddress()

    this.socket.send(message, this.BROADCAST_PORT, broadcastAddress, (err) => {
      if (err) {
        console.error('[NetworkDiscovery] Broadcast error:', err)
      }
    })
  }

  /**
   * Get the broadcast address for the local network
   */
  private getBroadcastAddress(): string {
    const interfaces = os.networkInterfaces()
    
    // Try to find the first active non-internal IPv4 interface
    for (const name of Object.keys(interfaces)) {
      const netInterface = interfaces[name]
      if (!netInterface) continue

      for (const iface of netInterface) {
        if (iface.family === 'IPv4' && !iface.internal) {
          // Calculate broadcast address
          const ip = iface.address.split('.').map(Number)
          const netmask = iface.netmask.split('.').map(Number)
          const broadcast = ip.map((octet, i) => octet | (~netmask[i] & 255))
          return broadcast.join('.')
        }
      }
    }

    // Fallback to generic broadcast
    return '255.255.255.255'
  }

  /**
   * Handle incoming UDP messages
   */
  private handleIncomingMessage(msg: Buffer, rinfo: dgram.RemoteInfo): void {
    try {
      const packet: BroadcastPacket = JSON.parse(msg.toString())

      // Ignore our own broadcasts
      if (this.currentUser && packet.userId === this.currentUser.userId) {
        return
      }

      // Validate packet structure
      if (!packet.userId || !packet.username || !packet.role || !packet.type || !packet.messagingPort) {
        console.warn('[NetworkDiscovery] Invalid packet received:', packet)
        return
      }

      if (packet.type === 'goodbye') {
        // Remove user from active list
        this.removeUser(packet.userId)
      } else if (packet.type === 'presence') {
        // Add or update user
        this.updateUser({
          userId: packet.userId,
          username: packet.username,
          role: packet.role,
          ipAddress: rinfo.address,
          messagingPort: packet.messagingPort,
          lastSeen: Date.now()
        })
      }
    } catch (error) {
      console.error('[NetworkDiscovery] Error parsing message:', error)
    }
  }

  /**
   * Update or add a user to the active list
   */
  private updateUser(user: NetworkUser): void {
    const wasPresent = this.activeUsers.has(user.userId)
    this.activeUsers.set(user.userId, user)

    if (!wasPresent) {
      console.log(`[NetworkDiscovery] New user detected: ${user.username} (${user.role}) - ${user.ipAddress}`)
    }

    // Emit update event
    this.emitUsersUpdate()
  }

  /**
   * Remove a user from the active list
   */
  private removeUser(userId: number): void {
    const user = this.activeUsers.get(userId)
    if (user) {
      this.activeUsers.delete(userId)
      console.log(`[NetworkDiscovery] User disconnected: ${user.username}`)
      this.emitUsersUpdate()
    }
  }

  /**
   * Start the cleanup timer to remove stale users
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.removeStaleUsers()
    }, this.CLEANUP_INTERVAL)
  }

  /**
   * Remove users that haven't been seen recently
   */
  private removeStaleUsers(): void {
    const now = Date.now()
    let removedAny = false

    for (const [userId, user] of this.activeUsers.entries()) {
      if (now - user.lastSeen > this.STALE_TIMEOUT) {
        console.log(`[NetworkDiscovery] Removing stale user: ${user.username} (last seen ${Math.round((now - user.lastSeen) / 1000)}s ago)`)
        this.activeUsers.delete(userId)
        removedAny = true
      }
    }

    if (removedAny) {
      this.emitUsersUpdate()
    }
  }

  /**
   * Emit an event with the updated user list
   */
  private emitUsersUpdate(): void {
    const users = this.getActiveUsers()
    this.emit('users-update', users)
  }

  /**
   * Handle socket errors
   */
  private handleSocketError(error: Error): void {
    console.error('[NetworkDiscovery] Socket error:', error)
  }

  /**
   * Handle socket listening event
   */
  private handleSocketListening(): void {
    const address = this.socket!.address()
    console.log(`[NetworkDiscovery] Listening on ${address.address}:${address.port}`)
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.socket) {
      this.socket.removeAllListeners()
      this.socket.close()
      this.socket = null
    }
    this.isRunning = false
  }
}

export default NetworkDiscoveryService
