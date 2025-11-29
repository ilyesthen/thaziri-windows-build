/**
 * Ordonnance Service
 * Handles medicine, quantity, and prescription (ordonnance) data from database
 * IMPORTANT: Uses DatabaseRouter to support both Admin and Client modes
 */

import { ipcMain } from 'electron'
import { getPrismaClient } from '../database'
import * as dbRouter from './DatabaseRouter'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'

/**
 * Get server URL for client mode
 */
function getServerUrl(): string | null {
  try {
    const userDataPath = app.getPath('userData')
    const configPath = path.join(userDataPath, 'database-config.json')
    if (!fs.existsSync(configPath)) return null
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    return config.serverUrl || null
  } catch (error) {
    console.error('Error reading server URL:', error)
    return null
  }
}

// Medicine-related handlers
export function registerOrdonnanceHandlers() {
  
  // Get all medicines sorted by actual usage count
  ipcMain.handle('medicines:getAll', async () => {
    try {
      const mode = await dbRouter.getMode()
      console.log('📋 medicines:getAll - Mode:', mode)
      
      if (mode === 'client') {
        // Client mode: HTTP call
        const serverUrl = getServerUrl()
        if (!serverUrl) throw new Error('Server URL not configured')
        const response = await axios.get(`${serverUrl}/api/medicines`)
        return response.data
      }
      
      // Admin mode: Direct Prisma
      const prisma = getPrismaClient()
      const medicines = await prisma.medicine.findMany({
        orderBy: [{ actualCount: 'desc' }, { nbpres: 'desc' }]
      })
      return { success: true, data: medicines }
    } catch (error: any) {
      console.error('Error fetching medicines:', error)
      return { success: false, error: error.message }
    }
  })
  
  // Search medicines by code or prescription text
  ipcMain.handle('medicines:search', async (_, searchTerm: string) => {
    try {
      const prisma = getPrismaClient()
      const medicines = await prisma.medicine.findMany({
        where: {
          OR: [
            { code: { contains: searchTerm, mode: 'insensitive' } },
            { libprep: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        orderBy: [
          { actualCount: 'desc' },
          { nbpres: 'desc' }
        ]
      })
      return { success: true, data: medicines }
    } catch (error) {
      console.error('Error searching medicines:', error)
      return { success: false, error: error.message }
    }
  })
  
  // Get medicine by ID
  ipcMain.handle('medicines:getById', async (_, id: number) => {
    try {
      const prisma = getPrismaClient()
      const medicine = await prisma.medicine.findUnique({
        where: { id }
      })
      return { success: true, data: medicine }
    } catch (error) {
      console.error('Error fetching medicine:', error)
      return { success: false, error: error.message }
    }
  })
  
  // Get all quantities
  ipcMain.handle('quantities:getAll', async () => {
    try {
      const mode = await dbRouter.getMode()
      
      if (mode === 'client') {
        const serverUrl = getServerUrl()
        if (!serverUrl) throw new Error('Server URL not configured')
        const response = await axios.get(`${serverUrl}/api/quantities`)
        return response.data
      }
      
      const prisma = getPrismaClient()
      const quantities = await prisma.quantity.findMany({
        orderBy: { id: 'asc' }
      })
      return { success: true, data: quantities }
    } catch (error: any) {
      console.error('Error fetching quantities:', error)
      return { success: false, error: error.message }
    }
  })
  
  // Get ordonnances for a patient
  ipcMain.handle('ordonnances:getByPatient', async (_, patientCode: number) => {
    try {
      const mode = await dbRouter.getMode()
      
      if (mode === 'client') {
        const serverUrl = getServerUrl()
        if (!serverUrl) throw new Error('Server URL not configured')
        const response = await axios.get(`${serverUrl}/api/ordonnances/${patientCode}`)
        return response.data
      }
      
      const prisma = getPrismaClient()
      const ordonnances = await prisma.ordonnance.findMany({
        where: { patientCode },
        orderBy: [
          { seq: 'desc' },
          { id: 'desc' }
        ]
      })
      return { success: true, data: ordonnances }
    } catch (error: any) {
      console.error('Error fetching ordonnances:', error)
      return { success: false, error: error.message }
    }
  })
  
  // Get ordonnances count for a patient
  ipcMain.handle('ordonnances:countByPatient', async (_, patientCode: number) => {
    try {
      const prisma = getPrismaClient()
      const count = await prisma.ordonnance.count({
        where: { patientCode }
      })
      return { success: true, data: count }
    } catch (error) {
      console.error('Error counting ordonnances:', error)
      return { success: false, error: error.message }
    }
  })
  
  // Create new ordonnance
  ipcMain.handle('ordonnances:create', async (_, data: any) => {
    try {
      const prisma = getPrismaClient()
      const ordonnance = await prisma.ordonnance.create({
        data: {
          patientCode: data.patientCode,
          dateOrd: data.dateOrd || new Date().toISOString().split('T')[0],
          age: data.age,
          seq: data.seq,
          strait: data.strait,
          strait1: data.strait1,
          strait2: data.strait2,
          strait3: data.strait3,
          medecin: data.medecin,
          actex: data.actex || 'ORDONNANCE',
          seqpat: data.seqpat
        }
      })
      
      // Don't update medicine counts - too slow with 85k+ records
      // Medicine counts are already accurate from import
      
      return { success: true, data: ordonnance }
    } catch (error) {
      console.error('Error creating ordonnance:', error)
      return { success: false, error: (error as Error).message }
    }
  })
  
  // Update ordonnance
  ipcMain.handle('ordonnances:update', async (_, id: number, data: any) => {
    try {
      const prisma = getPrismaClient()
      const ordonnance = await prisma.ordonnance.update({
        where: { id },
        data: {
          strait: data.strait,
          strait1: data.strait1,
          strait2: data.strait2,
          strait3: data.strait3,
          dateOrd: data.dateOrd,
          actex: data.actex,
          medecin: data.medecin,
          age: data.age,
          seq: data.seq,
          seqpat: data.seqpat
        }
      })
      return { success: true, data: ordonnance }
    } catch (error) {
      console.error('Error updating ordonnance:', error)
      return { success: false, error: (error as Error).message }
    }
  })
  
  // Delete ordonnance
  ipcMain.handle('ordonnances:delete', async (_, id: number) => {
    try {
      const prisma = getPrismaClient()
      await prisma.ordonnance.delete({
        where: { id }
      })
      
      // Don't update medicine counts - too slow with 85k+ records
      
      return { success: true }
    } catch (error) {
      console.error('Error deleting ordonnance:', error)
      return { success: false, error: (error as Error).message }
    }
  })
  
  // Update medicine usage counts based on ordonnances
  async function updateMedicineUsageCounts() {
    try {
      const prisma = getPrismaClient()
      // Get all medicines
      const medicines = await prisma.medicine.findMany()
      
      // Get all ordonnances
      const ordonnances = await prisma.ordonnance.findMany({
        select: {
          strait: true,
          strait1: true,
          strait2: true,
          strait3: true
        }
      })
      
      // Count usage for each medicine
      for (const medicine of medicines) {
        let count = 0
        const medicineCode = medicine.code.toUpperCase()
        
        for (const ord of ordonnances) {
          const content = `${ord.strait || ''} ${ord.strait1 || ''} ${ord.strait2 || ''} ${ord.strait3 || ''}`.toUpperCase()
          if (content.includes(medicineCode)) {
            count++
          }
        }
        
        // Update the medicine's actual count
        await prisma.medicine.update({
          where: { id: medicine.id },
          data: { actualCount: count }
        })
      }
      
      console.log('✅ Updated medicine usage counts')
    } catch (error) {
      console.error('Error updating medicine counts:', error)
    }
  }
  
  // Get medicine usage statistics
  ipcMain.handle('medicines:getStatistics', async () => {
    try {
      const prisma = getPrismaClient()
      const stats = await prisma.medicine.aggregate({
        _count: true,
        _sum: {
          actualCount: true,
          nbpres: true
        },
        _avg: {
          actualCount: true,
          nbpres: true
        }
      })
      
      const topMedicines = await prisma.medicine.findMany({
        orderBy: { actualCount: 'desc' },
        take: 10
      })
      
      return { 
        success: true, 
        data: {
          totalMedicines: stats._count,
          totalPrescriptions: stats._sum.actualCount || 0,
          averageUsage: stats._avg.actualCount || 0,
          topMedicines
        }
      }
    } catch (error) {
      console.error('Error fetching medicine statistics:', error)
      return { success: false, error: error.message }
    }
  })

  // Comptes Rendus (Medical Reports) handlers
  
  // Get all comptes rendus templates
  ipcMain.handle('comptesRendus:getAll', async () => {
    try {
      const mode = await dbRouter.getMode()
      
      if (mode === 'client') {
        const serverUrl = getServerUrl()
        if (!serverUrl) throw new Error('Server URL not configured')
        const response = await axios.get(`${serverUrl}/api/comptesRendus`)
        return response.data
      }
      
      const prisma = getPrismaClient()
      const comptesRendus = await prisma.compteRendu.findMany({
        orderBy: {
          codeCompte: 'asc'
        }
      })
      return { success: true, data: comptesRendus }
    } catch (error: any) {
      console.error('Error fetching comptes rendus:', error)
      return { success: false, error: error.message }
    }
  })
  
  // Get compte rendu by code
  ipcMain.handle('comptesRendus:getByCode', async (_, codeCompte: string) => {
    try {
      const prisma = getPrismaClient()
      const compteRendu = await prisma.compteRendu.findUnique({
        where: { codeCompte }
      })
      return { success: true, data: compteRendu }
    } catch (error) {
      console.error('Error fetching compte rendu:', error)
      return { success: false, error: error.message }
    }
  })
  
  // Search comptes rendus by code or content
  ipcMain.handle('comptesRendus:search', async (_, searchTerm: string) => {
    try {
      const prisma = getPrismaClient()
      const comptesRendus = await prisma.compteRendu.findMany({
        where: {
          OR: [
            { codeCompte: { contains: searchTerm, mode: 'insensitive' } },
            { titreEchodp: { contains: searchTerm, mode: 'insensitive' } },
            { contenu: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        orderBy: {
          codeCompte: 'asc'
        }
      })
      return { success: true, data: comptesRendus }
    } catch (error) {
      console.error('Error searching comptes rendus:', error)
      return { success: false, error: error.message }
    }
  })
}

// Export function for main process to call
export default registerOrdonnanceHandlers
