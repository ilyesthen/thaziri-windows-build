/**
 * Auto-Discovery Service
 * Finds Thaziri Database Servers on the local network
 */

import dgram from 'dgram'
import { EventEmitter } from 'events'

const DISCOVERY_PORT = 3457
const DISCOVERY_MESSAGE = 'THAZIRI_DISCOVER'
const DISCOVERY_RESPONSE = 'THAZIRI_SERVER'

export class ServerDiscovery extends EventEmitter {
  private socket: dgram.Socket | null = null
  private discoveredServers: Map<string, any> = new Map()
  private isListening: boolean = false

  // For Admin PC: Respond to discovery requests
  async startBroadcastResponder(serverPort: number, computerName: string): Promise<void> {
    if (this.isListening) return

    this.socket = dgram.createSocket('udp4')

    this.socket.on('message', (msg, rinfo) => {
      const message = msg.toString()
      
      if (message === DISCOVERY_MESSAGE) {
        console.log(`📡 Discovery request from ${rinfo.address}`)
        
        // Respond with server info
        const response = JSON.stringify({
          type: DISCOVERY_RESPONSE,
          computerName,
          ip: this.getLocalIP(),
          port: serverPort,
          timestamp: Date.now()
        })
        
        this.socket!.send(response, rinfo.port, rinfo.address, (err) => {
          if (err) {
            console.error('Error sending discovery response:', err)
          } else {
            console.log(`✅ Sent discovery response to ${rinfo.address}`)
          }
        })
      }
    })

    this.socket.on('error', (err) => {
      console.error('Discovery socket error:', err)
    })

    return new Promise((resolve, reject) => {
      this.socket!.bind(DISCOVERY_PORT, () => {
        this.isListening = true
        console.log(`📡 Discovery responder listening on port ${DISCOVERY_PORT}`)
        resolve()
      })
    })
  }

  // For Client PC: Find servers on network
  async discoverServers(timeoutMs: number = 3000): Promise<Array<{ ip: string; port: number; computerName: string }>> {
    this.discoveredServers.clear()

    return new Promise((resolve, reject) => {
      const socket = dgram.createSocket('udp4')
      let timeoutHandle: NodeJS.Timeout

      socket.on('message', (msg, rinfo) => {
        try {
          const data = JSON.parse(msg.toString())
          
          if (data.type === DISCOVERY_RESPONSE) {
            console.log(`✅ Found server: ${data.computerName} at ${data.ip}:${data.port}`)
            
            this.discoveredServers.set(data.ip, {
              ip: data.ip,
              port: data.port,
              computerName: data.computerName,
              timestamp: data.timestamp
            })
            
            this.emit('serverFound', this.discoveredServers.get(data.ip))
          }
        } catch (err) {
          console.error('Error parsing discovery response:', err)
        }
      })

      socket.on('error', (err) => {
        console.error('Discovery error:', err)
        socket.close()
        reject(err)
      })

      socket.bind(() => {
        socket.setBroadcast(true)
        
        console.log('📡 Broadcasting discovery request...')
        
        // Send broadcast message
        const message = Buffer.from(DISCOVERY_MESSAGE)
        socket.send(message, DISCOVERY_PORT, '255.255.255.255', (err) => {
          if (err) {
            console.error('Error broadcasting:', err)
          }
        })

        // Set timeout
        timeoutHandle = setTimeout(() => {
          socket.close()
          const servers = Array.from(this.discoveredServers.values())
          console.log(`📡 Discovery complete. Found ${servers.length} server(s)`)
          resolve(servers)
        }, timeoutMs)
      })
    })
  }

  private getLocalIP(): string {
    const { networkInterfaces } = require('os')
    const nets = networkInterfaces()
    
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        // Skip internal and non-IPv4 addresses
        if (net.family === 'IPv4' && !net.internal) {
          return net.address
        }
      }
    }
    
    return 'localhost'
  }

  stop(): void {
    if (this.socket) {
      this.socket.close()
      this.socket = null
      this.isListening = false
      console.log('🛑 Discovery service stopped')
    }
  }
}
