/**
 * Database Client - Connects to remote Database Server
 * Used by Client PCs to access Admin PC's database
 */

import axios, { AxiosInstance } from 'axios'

export class DatabaseClient {
  private client: AxiosInstance
  private serverUrl: string
  private isConnected: boolean = false

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl
    this.client = axios.create({
      baseURL: serverUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  async testConnection(): Promise<{ success: boolean; serverInfo?: any; error?: string }> {
    try {
      const response = await this.client.get('/health')
      if (response.data.status === 'ok') {
        this.isConnected = true
        return { success: true, serverInfo: response.data }
      }
      return { success: false, error: 'Invalid server response' }
    } catch (error: any) {
      this.isConnected = false
      if (error.code === 'ECONNREFUSED') {
        return { 
          success: false, 
          error: `Impossible de se connecter au serveur.\n\nVérifiez que:\n1. Le PC Admin est allumé\n2. L'application Thaziri est ouverte sur le PC Admin\n3. Les deux PCs sont sur le même réseau` 
        }
      }
      return { 
        success: false, 
        error: error.message || 'Connection failed' 
      }
    }
  }

  async getServerInfo(): Promise<any> {
    const response = await this.client.get('/info')
    return response.data
  }

  // Generic query execution
  async executeQuery(model: string, method: string, args: any[] = []): Promise<any> {
    try {
      const response = await this.client.post('/query', {
        model,
        method,
        args
      })
      return response.data
    } catch (error: any) {
      console.error('Query execution error:', error)
      throw new Error(error.response?.data?.error || error.message)
    }
  }

  // Execute any database function by name
  async executeDatabaseFunction(functionName: string, ...args: any[]): Promise<any> {
    try {
      const response = await this.client.post('/db/execute', {
        functionName,
        args
      })
      return response.data
    } catch (error: any) {
      console.error(`Database function ${functionName} error:`, error)
      throw new Error(error.response?.data?.error || error.message)
    }
  }

  // Optimized endpoints
  async getAllPatients(): Promise<any> {
    const response = await this.client.get('/patients')
    return response.data
  }

  async searchPatients(term: string): Promise<any> {
    const response = await this.client.get(`/patients/search/${encodeURIComponent(term)}`)
    return response.data
  }

  async getPatientVisits(patientCode: number): Promise<any> {
    const response = await this.client.get(`/visits/patient/${patientCode}`)
    return response.data
  }

  async getRoomQueue(roomCode: string): Promise<any> {
    const response = await this.client.get(`/queue/${roomCode}`)
    return response.data
  }

  getConnectionStatus(): boolean {
    return this.isConnected
  }

  getServerUrl(): string {
    return this.serverUrl
  }
}
