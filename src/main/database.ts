import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import path from 'path'
import { app } from 'electron'
import fs from 'fs'

// Constants for password hashing
const SALT_ROUNDS = 10

// Singleton instance of Prisma Client
let prisma: PrismaClient | null = null

/**
 * Determine if running in production (packaged) or development
 */
function isProduction(): boolean {
  return app.isPackaged
}

/**
 * Get the correct path for resources based on environment
 */
function getResourcePath(...paths: string[]): string {
  if (isProduction()) {
    // In production, use app.getAppPath() which points to app.asar
    // For unpacked resources, use process.resourcesPath
    return path.join(process.resourcesPath, 'app.asar.unpacked', ...paths)
  } else {
    // In development, use process.cwd()
    return path.join(process.cwd(), ...paths)
  }
}

/**
 * Get the database path
 */
function getDatabasePath(): string {
  if (isProduction()) {
    // In production, store database in user data directory
    const userDataPath = app.getPath('userData')
    const dbPath = path.join(userDataPath, 'thaziri-database.db')
    
    // Create directory if it doesn't exist
    const dbDir = path.dirname(dbPath)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }
    
    return dbPath
  } else {
    // In development, use local prisma directory
    return path.join(process.cwd(), 'prisma', 'dev.db')
  }
}

/**
 * Get or create the Prisma Client instance
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    const databasePath = getDatabasePath()
    const databaseUrl = `file:${databasePath}`
    
    // Get the path to the query engine
    const queryEnginePath = isProduction()
      ? getResourcePath('node_modules', '.prisma', 'client')
      : undefined
    
    const config: any = {
      datasources: {
        db: {
          url: databaseUrl
        }
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    }
    
    // Set the query engine library path for production
    if (queryEnginePath) {
      config.__internal = {
        engine: {
          cwd: queryEnginePath
        }
      }
    }
    
    prisma = new PrismaClient(config)
  }
  return prisma
}

/**
 * Initialize the database connection
 */
export async function initializeDatabase(): Promise<void> {
  const client = getPrismaClient()
  try {
    // Log the database configuration
    console.log('🔍 Database configuration:')
    console.log('   - process.cwd():', process.cwd())
    console.log('   - __dirname:', __dirname)
    console.log('   - Prisma datasource:', (client as any)._engineConfig?.datasources?.db?.url || 'not available')
    
    await client.$connect()
    console.log('✅ Database connected successfully')
    
    // Ensure hardcoded admin user exists
    await ensureAdminUserExists()
    
    // Seed default message templates
    await seedDefaultTemplates()
  } catch (error) {
    console.error('❌ Failed to connect to database:', error)
    throw error
  }
}

/**
 * Ensure the hardcoded admin user exists
 * Username: fares
 * Password: 1234
 */
async function ensureAdminUserExists(): Promise<void> {
  const client = getPrismaClient()
  
  try {
    // Check if admin user already exists
    const existingAdmin = await client.user.findUnique({
      where: { email: 'fares' }
    })
    
    if (!existingAdmin) {
      // Create the hardcoded admin user
      const hashedPassword = await bcrypt.hash('1234', SALT_ROUNDS)
      await client.user.create({
        data: {
          email: 'fares',
          name: 'Fares (Admin)',
          password: hashedPassword,
          role: 'admin'
        }
      })
      console.log('✅ Admin user created: fares / 1234')
    } else {
      console.log('✅ Admin user already exists')
    }
  } catch (error) {
    console.error('❌ Failed to ensure admin user exists:', error)
  }
}

/**
 * Seed default message templates on first setup
 * Templates: 15 default French medical messages
 */
async function seedDefaultTemplates(): Promise<void> {
  const client = getPrismaClient()
  
  const defaultTemplates = [
    'Dilatation OG',
    'Dilatation OD',
    'Dilatation ODG',
    'RDV 01 année',
    'Faites entrer le malade',
    'On Termine',
    'RDV 06 mois',
    'Pansement',
    'Stop Patients',
    'Faite le une carte de suivi',
    'Viens stp',
    'Desinfection',
    'RDV laser ARGON',
    'Faites entrer post op',
    'Numero de telephone'
  ]
  
  try {
    // Check if templates already exist
    const existingCount = await client.messageTemplate.count()
    
    if (existingCount > 0) {
      console.log(`✅ Found ${existingCount} existing message templates`)
      return
    }
    
    // Insert default templates
    console.log(`📝 Seeding ${defaultTemplates.length} default message templates...`)
    
    for (const content of defaultTemplates) {
      await client.messageTemplate.create({
        data: { content }
      })
    }
    
    console.log(`✅ Successfully seeded ${defaultTemplates.length} message templates!`)
  } catch (error) {
    console.error('❌ Failed to seed default templates:', error)
  }
}

/**
 * Disconnect from the database
 */
export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
    console.log('Database disconnected')
  }
}

// ==================== USER OPERATIONS ====================

export interface CreateUserInput {
  email: string
  name: string
  password?: string
  role?: string
  defaultPercentage?: number | null
}

export async function createUser(data: CreateUserInput): Promise<any> {
  const client = getPrismaClient()
  // For backward compatibility, if no password is provided, use a default
  const userData = {
    email: data.email,
    name: data.name,
    password: data.password || 'defaultPassword',
    role: data.role || 'nurse',
    defaultPercentage: data.defaultPercentage,
  }
  return client.user.create({
    data: userData,
  })
}

export async function getAllUsers(): Promise<any[]> {
  const client = getPrismaClient()
  return client.user.findMany({
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get all users for management (excluding admins, no passwords)
 * Returns doctors, nurses, and assistants for the admin dashboard
 */
export async function getAllUsersForManagement(): Promise<any[]> {
  const client = getPrismaClient()
  const users = await client.user.findMany({
    where: {
      role: {
        in: ['doctor', 'nurse', 'assistant_1', 'assistant_2']
      }
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      defaultPercentage: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  return users
}

export async function getUserById(id: number): Promise<any | null> {
  const client = getPrismaClient()
  return client.user.findUnique({
    where: { id },
    include: {
      notes: true,
      tasks: true,
    },
  })
}

export async function updateUser(id: number, data: Partial<CreateUserInput>): Promise<any> {
  const client = getPrismaClient()
  return client.user.update({
    where: { id },
    data,
  })
}

/**
 * Update user with optional password change
 * If newPassword is provided, it will be hashed before updating
 */
export async function updateUserWithPassword(data: { 
  id: number
  name?: string
  email?: string
  newPassword?: string | null
  role?: string
  defaultPercentage?: number | null
}): Promise<any> {
  const client = getPrismaClient()
  
  const updateData: any = {}
  
  if (data.name !== undefined) updateData.name = data.name
  if (data.email !== undefined) updateData.email = data.email
  if (data.role !== undefined) updateData.role = data.role
  if (data.defaultPercentage !== undefined) updateData.defaultPercentage = data.defaultPercentage
  
  // Only hash and update password if newPassword is provided and not null
  if (data.newPassword) {
    updateData.password = await hashPassword(data.newPassword)
  }
  
  const user = await client.user.update({
    where: { id: data.id },
    data: updateData,
  })
  
  // Return user without password
  const { password: _, ...userWithoutPassword } = user
  return userWithoutPassword
}

export async function deleteUser(id: number): Promise<any> {
  const client = getPrismaClient()
  return client.user.delete({
    where: { id },
  })
}

// ==================== NOTE OPERATIONS ====================

export interface CreateNoteInput {
  title: string
  content: string
  userId: number
  tagIds?: number[]
}

export async function createNote(data: CreateNoteInput): Promise<any> {
  const client = getPrismaClient()
  const { tagIds, ...noteData } = data
  
  return client.note.create({
    data: {
      ...noteData,
      tags: tagIds ? {
        connect: tagIds.map(id => ({ id }))
      } : undefined,
    },
    include: {
      tags: true,
      user: true,
    },
  })
}

export async function getAllNotes(): Promise<any[]> {
  const client = getPrismaClient()
  return client.note.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      tags: true,
      user: true,
    },
  })
}

export async function getNoteById(id: number): Promise<any | null> {
  const client = getPrismaClient()
  return client.note.findUnique({
    where: { id },
    include: {
      tags: true,
      user: true,
    },
  })
}

export async function updateNote(id: number, data: Partial<CreateNoteInput>): Promise<any> {
  const client = getPrismaClient()
  const { tagIds, ...noteData } = data
  
  return client.note.update({
    where: { id },
    data: {
      ...noteData,
      tags: tagIds ? {
        set: tagIds.map(id => ({ id }))
      } : undefined,
    },
    include: {
      tags: true,
      user: true,
    },
  })
}

export async function deleteNote(id: number): Promise<any> {
  const client = getPrismaClient()
  return client.note.delete({
    where: { id },
  })
}

// ==================== TASK OPERATIONS ====================

export interface CreateTaskInput {
  title: string
  description?: string
  priority?: string
  dueDate?: Date
  userId: number
}

export async function createTask(data: CreateTaskInput): Promise<any> {
  const client = getPrismaClient()
  return client.task.create({
    data,
    include: {
      user: true,
    },
  })
}

export async function getAllTasks(): Promise<any[]> {
  const client = getPrismaClient()
  return client.task.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: true,
    },
  })
}

export async function getTaskById(id: number): Promise<any | null> {
  const client = getPrismaClient()
  return client.task.findUnique({
    where: { id },
    include: {
      user: true,
    },
  })
}

export async function updateTask(id: number, data: Partial<CreateTaskInput & { completed: boolean }>): Promise<any> {
  const client = getPrismaClient()
  return client.task.update({
    where: { id },
    data,
    include: {
      user: true,
    },
  })
}

export async function deleteTask(id: number): Promise<any> {
  const client = getPrismaClient()
  return client.task.delete({
    where: { id },
  })
}

export async function toggleTaskCompletion(id: number): Promise<any> {
  const client = getPrismaClient()
  const task = await client.task.findUnique({ where: { id } })
  if (!task) {
    throw new Error('Task not found')
  }
  
  return client.task.update({
    where: { id },
    data: { completed: !task.completed },
    include: {
      user: true,
    },
  })
}

// ==================== TAG OPERATIONS ====================

export interface CreateTagInput {
  name: string
  color?: string
}

export async function createTag(data: CreateTagInput): Promise<any> {
  const client = getPrismaClient()
  return client.tag.create({
    data,
  })
}

export async function getAllTags(): Promise<any[]> {
  const client = getPrismaClient()
  return client.tag.findMany({
    orderBy: { name: 'asc' },
  })
}

export async function getTagById(id: number): Promise<any | null> {
  const client = getPrismaClient()
  return client.tag.findUnique({
    where: { id },
    include: {
      notes: true,
    },
  })
}

export async function deleteTag(id: number): Promise<any> {
  const client = getPrismaClient()
  return client.tag.delete({
    where: { id },
  })
}

// ==================== AUTHENTICATION OPERATIONS ====================

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Create a user with hashed password
 */
export async function createUserWithPassword(data: CreateUserInput & { password: string; role?: string; defaultPercentage?: number | null }): Promise<any> {
  const client = getPrismaClient()
  const hashedPassword = await hashPassword(data.password)
  
  return client.user.create({
    data: {
      email: data.email,
      name: data.name,
      password: hashedPassword,
      role: data.role || 'nurse',
      defaultPercentage: data.defaultPercentage,
    },
  })
}

/**
 * Verify user credentials
 * Returns a consistent JSON object:
 * - On success: { success: true, user: { ...userData, role: '...' } }
 * - On failure: { success: false, error: 'Invalid credentials' }
 */
export async function verifyUserCredentials(email: string, password: string): Promise<{ 
  success: boolean
  user?: {
    id: number
    email: string
    name: string
    role: string
    defaultPercentage?: number | null
    createdAt: Date
    updatedAt: Date
  }
  error?: string
}> {
  const client = getPrismaClient()
  
  try {
    // Query the database for the user by email
    const user = await client.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        defaultPercentage: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // User not found
    if (!user) {
      return {
        success: false,
        error: 'Invalid credentials',
      }
    }

    // Use bcrypt to securely compare the password hash
    const isValid = await verifyPassword(password, user.password)

    // Invalid password
    if (!isValid) {
      return {
        success: false,
        error: 'Invalid credentials',
      }
    }

    // Success - return user without password
    const { password: _, ...userWithoutPassword } = user

    return {
      success: true,
      user: userWithoutPassword,
    }
  } catch (error) {
    console.error('Error verifying credentials:', error)
    return {
      success: false,
      error: 'Invalid credentials',
    }
  }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<any | null> {
  const client = getPrismaClient()
  const user = await client.user.findUnique({
    where: { email },
  })
  
  if (user) {
    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword
  }
  
  return null
}

/**
 * Get all users without passwords
 */
export async function getUsersForSelection(): Promise<any[]> {
  const client = getPrismaClient()
  const users = await client.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { name: 'asc' },
  })
  
  // Filter: Show templates (Assistant 1, Assistant 2) and non-assistant users
  // Hide individual assistant users (those with @assistant.local emails but not the templates)
  const templateNames = ['Assistant 1', 'Assistant 2']
  const usersForLogin = users.filter(user => {
    // If it's a template, show it
    if (templateNames.includes(user.name)) {
      return true
    }
    // If it's an assistant role but NOT a template, hide it
    if ((user.role === 'assistant_1' || user.role === 'assistant_2') && !templateNames.includes(user.name)) {
      return false
    }
    // Show all other users (doctors, nurses, admin)
    return true
  })
  
  return usersForLogin
}

// ==================== PATIENT OPERATIONS ====================

/**
 * Get all patients
 */
export async function getAllPatients(limit: number = 100, offset: number = 0): Promise<any[]> {
  const client = getPrismaClient()
  const patients = await client.patient.findMany({
    take: limit,
    skip: offset,
    orderBy: [
      { recordNumber: 'asc' },
      { id: 'asc' }
    ]
  })
  
  return patients
}

/**
 * Get total count of patients
 */
export async function getPatientsCount(): Promise<number> {
  const client = getPrismaClient()
  const count = await client.patient.count()
  return count
}

/**
 * Get a single patient by department code
 */
export async function getPatientByCode(code: number): Promise<any | null> {
  const client = getPrismaClient()
  const patient = await client.patient.findFirst({
    where: { departmentCode: code }
  })
  return patient
}

/**
 * Get a single patient by ID
 */
export async function getPatientById(id: number): Promise<any | null> {
  const client = getPrismaClient()
  const patient = await client.patient.findUnique({
    where: { id }
  })
  
  return patient
}

/**
 * Search patients by name, code, or phone - Optimized for large datasets
 * Handles: "firstname", "lastname", "firstname lastname", "code", "phone"
 * Returns ALL matching results (no limit) for instant table display
 */
export async function searchPatients(searchTerm: string): Promise<any[]> {
  const client = getPrismaClient()
  
  if (!searchTerm || searchTerm.trim().length === 0) {
    return []
  }
  
  const trimmedSearch = searchTerm.trim()
  
  try {
    // Check if search contains space (firstname lastname search)
    if (trimmedSearch.includes(' ')) {
      const parts = trimmedSearch.split(/\s+/)
      const firstName = parts[0]
      const lastName = parts.slice(1).join(' ')
      
      // Search for firstname AND lastname combination
      const patients = await client.$queryRaw`
        SELECT * FROM Patient 
        WHERE 
          (firstName LIKE ${'%' + firstName + '%'} COLLATE NOCASE AND lastName LIKE ${'%' + lastName + '%'} COLLATE NOCASE) OR
          (lastName LIKE ${'%' + firstName + '%'} COLLATE NOCASE AND firstName LIKE ${'%' + lastName + '%'} COLLATE NOCASE) OR
          fullName LIKE ${'%' + trimmedSearch + '%'} COLLATE NOCASE
        ORDER BY lastName ASC, firstName ASC
      `
      
      return patients as any[]
    } else {
      // Single word search - check all fields
      const pattern = `%${trimmedSearch}%`
      
      const patients = await client.$queryRaw`
        SELECT * FROM Patient 
        WHERE 
          firstName LIKE ${pattern} COLLATE NOCASE OR
          lastName LIKE ${pattern} COLLATE NOCASE OR
          fullName LIKE ${pattern} COLLATE NOCASE OR
          code LIKE ${pattern} COLLATE NOCASE OR
          phone LIKE ${pattern} COLLATE NOCASE
        ORDER BY lastName ASC, firstName ASC
      `
      
      return patients as any[]
    }
  } catch (error) {
    console.error('Error searching patients:', error)
    return []
  }
}

export interface CreatePatientInput {
  firstName: string
  lastName: string
  age?: number
  gender?: string
  address?: string
  phone?: string
  generalHistory?: string  // Maps to "Autres informations"
}

/**
 * Create a new patient with server-side validation
 */
export async function createPatient(data: CreatePatientInput): Promise<any> {
  // Server-side validation: ensure required fields are not null or empty
  if (!data.firstName || !data.firstName.trim()) {
    throw new Error('Le prénom est obligatoire')
  }
  
  if (!data.lastName || !data.lastName.trim()) {
    throw new Error('Le nom est obligatoire')
  }

  const client = getPrismaClient()
  
  // Execute parameterized INSERT via Prisma
  const patient = await client.patient.create({
    data: {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      fullName: `${data.lastName.trim()}${data.firstName.trim()}`.toUpperCase(),
      age: data.age ?? undefined,
      gender: data.gender?.trim() || undefined,
      address: data.address?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      generalHistory: data.generalHistory?.trim() || undefined,
    }
  })
  
  return patient
}

export interface UpdatePatientInput {
  id: number
  firstName?: string
  lastName?: string
  age?: number
  gender?: string
  address?: string
  phone?: string
  generalHistory?: string
}

/**
 * Update an existing patient with server-side validation
 */
export async function updatePatient(data: UpdatePatientInput): Promise<any> {
  const client = getPrismaClient()
  
  // Build update data object dynamically
  const updateData: any = {}
  
  if (data.firstName !== undefined) {
    if (!data.firstName.trim()) {
      throw new Error('Le prénom ne peut pas être vide')
    }
    updateData.firstName = data.firstName.trim()
  }
  
  if (data.lastName !== undefined) {
    if (!data.lastName.trim()) {
      throw new Error('Le nom ne peut pas être vide')
    }
    updateData.lastName = data.lastName.trim()
  }
  
  if (data.age !== undefined) {
    updateData.age = data.age || null
  }
  
  if (data.gender !== undefined) {
    updateData.gender = data.gender.trim() || null
  }
  
  if (data.address !== undefined) {
    updateData.address = data.address.trim() || null
  }
  
  if (data.phone !== undefined) {
    updateData.phone = data.phone.trim() || null
  }
  
  if (data.generalHistory !== undefined) {
    updateData.generalHistory = data.generalHistory.trim() || null
  }
  
  // Update fullName if firstName or lastName changed
  if (data.firstName !== undefined || data.lastName !== undefined) {
    const currentPatient = await client.patient.findUnique({ where: { id: data.id } })
    if (!currentPatient) {
      throw new Error('Patient non trouvé')
    }
    const firstName = data.firstName?.trim() ?? currentPatient.firstName
    const lastName = data.lastName?.trim() ?? currentPatient.lastName
    updateData.fullName = `${lastName}${firstName}`.toUpperCase()
  }
  
  // Execute parameterized UPDATE via Prisma
  const patient = await client.patient.update({
    where: { id: data.id },
    data: updateData
  })
  
  return patient
}

/**
 * Delete a patient
 */
export async function deletePatient(id: number): Promise<void> {
  const client = getPrismaClient()
  await client.patient.delete({
    where: { id }
  })
}

// ==================== MESSAGE TEMPLATE OPERATIONS ====================

export interface CreateTemplateInput {
  content: string
}

export interface UpdateTemplateInput {
  content: string
}

/**
 * Get all message templates
 */
export async function getAllTemplates(): Promise<any[]> {
  const client = getPrismaClient()
  return client.messageTemplate.findMany({
    orderBy: { id: 'asc' }
  })
}

/**
 * Get a single template by ID
 */
export async function getTemplateById(id: number): Promise<any | null> {
  const client = getPrismaClient()
  return client.messageTemplate.findUnique({
    where: { id }
  })
}

/**
 * Create a new message template
 */
export async function createTemplate(data: CreateTemplateInput): Promise<any> {
  const client = getPrismaClient()
  return client.messageTemplate.create({
    data
  })
}

/**
 * Update an existing message template
 */
export async function updateTemplate(id: number, data: UpdateTemplateInput): Promise<any> {
  const client = getPrismaClient()
  return client.messageTemplate.update({
    where: { id },
    data
  })
}

/**
 * Delete a message template
 */
export async function deleteTemplate(id: number): Promise<void> {
  const client = getPrismaClient()
  await client.messageTemplate.delete({
    where: { id }
  })
}

// ==================== ACTES HONORAIRES OPERATIONS ====================

export interface CreateActeHonoraireInput {
  actePratique: string
  honoraireEncaisser: number
  percentageAssistant1?: number
  percentageAssistant2?: number
}

export interface UpdateActeHonoraireInput {
  id: number
  actePratique?: string
  honoraireEncaisser?: number
  percentageAssistant1?: number
  percentageAssistant2?: number
}

/**
 * Get all actes honoraires
 */
export async function getAllActesHonoraires(): Promise<any[]> {
  const client = getPrismaClient()
  return client.actesHonoraires.findMany({
    orderBy: { id: 'asc' }
  })
}

/**
 * Get a single acte honoraire by ID
 */
export async function getActeHonoraireById(id: number): Promise<any | null> {
  const client = getPrismaClient()
  return client.actesHonoraires.findUnique({
    where: { id }
  })
}

/**
 * Create a new acte honoraire
 */
export async function createActeHonoraire(data: CreateActeHonoraireInput): Promise<any> {
  const client = getPrismaClient()
  
  if (!data.actePratique || !data.actePratique.trim()) {
    throw new Error('Le nom de l\'acte pratique est obligatoire')
  }
  
  return client.actesHonoraires.create({
    data: {
      actePratique: data.actePratique.trim(),
      honoraireEncaisser: data.honoraireEncaisser || 0,
      percentageAssistant1: data.percentageAssistant1 || 0,
      percentageAssistant2: data.percentageAssistant2 || 0,
    }
  })
}

/**
 * Update an existing acte honoraire
 */
export async function updateActeHonoraire(data: UpdateActeHonoraireInput): Promise<any> {
  const client = getPrismaClient()
  
  const updateData: any = {}
  
  if (data.actePratique !== undefined) {
    if (!data.actePratique.trim()) {
      throw new Error('Le nom de l\'acte pratique ne peut pas être vide')
    }
    updateData.actePratique = data.actePratique.trim()
  }
  
  if (data.honoraireEncaisser !== undefined) {
    updateData.honoraireEncaisser = data.honoraireEncaisser
  }
  
  if (data.percentageAssistant1 !== undefined) {
    updateData.percentageAssistant1 = data.percentageAssistant1
  }
  
  if (data.percentageAssistant2 !== undefined) {
    updateData.percentageAssistant2 = data.percentageAssistant2
  }
  
  return client.actesHonoraires.update({
    where: { id: data.id },
    data: updateData
  })
}

/**
 * Delete an acte honoraire
 */
export async function deleteActeHonoraire(id: number): Promise<void> {
  const client = getPrismaClient()
  await client.actesHonoraires.delete({
    where: { id }
  })
}

// ==================== AUDIT LOG OPERATIONS ====================

export interface CreateAuditLogInput {
  userId?: number
  userRole?: string
  sessionName?: string
  actionType: string
  details?: string
}

/**
 * Create a new audit log entry
 */
export async function createAuditLog(data: CreateAuditLogInput): Promise<any> {
  const client = getPrismaClient()
  
  return client.auditLog.create({
    data: {
      userId: data.userId,
      userRole: data.userRole,
      sessionName: data.sessionName,
      actionType: data.actionType,
      details: data.details,
    }
  })
}

/**
 * Get audit logs with optional filters
 */
export async function getAuditLogs(options?: {
  userId?: number
  actionType?: string
  startDate?: Date
  endDate?: Date
  limit?: number
}): Promise<any[]> {
  const client = getPrismaClient()
  
  const where: any = {}
  
  if (options?.userId) {
    where.userId = options.userId
  }
  
  if (options?.actionType) {
    where.actionType = options.actionType
  }
  
  if (options?.startDate || options?.endDate) {
    where.timestamp = {}
    if (options.startDate) {
      where.timestamp.gte = options.startDate
    }
    if (options.endDate) {
      where.timestamp.lte = options.endDate
    }
  }
  
  return client.auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: options?.limit || 100
  })
}

/**
 * Get audit logs for a specific session
 */
export async function getAuditLogsBySession(sessionName: string): Promise<any[]> {
  const client = getPrismaClient()
  
  return client.auditLog.findMany({
    where: { sessionName },
    orderBy: { timestamp: 'asc' }
  })
}

/**
 * Delete old audit logs (for cleanup)
 */
export async function deleteOldAuditLogs(beforeDate: Date): Promise<number> {
  const client = getPrismaClient()
  
  const result = await client.auditLog.deleteMany({
    where: {
      timestamp: {
        lt: beforeDate
      }
    }
  })
  
  return result.count
}

// ==================== ASSISTANT USER OPERATIONS ====================

/**
 * Parse full name into first name and last name
 * Handles both "FirstName LastName" and "LastName FirstName" formats
 */
function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/)
  
  if (parts.length === 1) {
    // Single name - use as both
    return { firstName: parts[0], lastName: parts[0] }
  }
  
  if (parts.length === 2) {
    // Two parts - could be either order
    return { firstName: parts[0], lastName: parts[1] }
  }
  
  // More than 2 parts - first part is firstName, rest is lastName
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  }
}

/**
 * Find assistant by name with flexible matching
 * Matches both "FirstName LastName" and "LastName FirstName" formats
 */
export async function findAssistantByName(fullName: string): Promise<any | null> {
  const client = getPrismaClient()
  const { firstName, lastName } = parseName(fullName)
  
  // For SQLite, we need to do case-insensitive search differently
  // Get all assistant users and filter in JavaScript
  const allAssistants = await client.assistantUser.findMany()
  
  const fullNameLower = fullName.toLowerCase()
  const firstNameLower = firstName.toLowerCase()
  const lastNameLower = lastName.toLowerCase()
  
  // Try exact full name match first (case-insensitive)
  const exactMatch = allAssistants.find(
    a => a.fullName.toLowerCase() === fullNameLower
  )
  
  if (exactMatch) return exactMatch
  
  // Try both name orders: "First Last" and "Last First"
  const nameMatch = allAssistants.find(a => {
    const aFirstLower = a.firstName.toLowerCase()
    const aLastLower = a.lastName.toLowerCase()
    
    // Match: firstName=First AND lastName=Last
    const forwardMatch = aFirstLower === firstNameLower && aLastLower === lastNameLower
    
    // Match: firstName=Last AND lastName=First (reversed)
    const reverseMatch = aFirstLower === lastNameLower && aLastLower === firstNameLower
    
    return forwardMatch || reverseMatch
  })
  
  return nameMatch || null
}

/**
 * Create new assistant user
 */
export async function createAssistantUser(data: {
  fullName: string
  firstName?: string
  lastName?: string
  percentage?: number
  role?: string
}): Promise<any> {
  const client = getPrismaClient()
  const { firstName, lastName } = data.firstName && data.lastName 
    ? { firstName: data.firstName, lastName: data.lastName }
    : parseName(data.fullName)
  
  return client.assistantUser.create({
    data: {
      fullName: data.fullName,
      firstName,
      lastName,
      percentage: data.percentage ?? 0,
      role: data.role ?? 'assistant'
    }
  })
}

/**
 * Get or create assistant user - smart lookup with flexible name matching
 * This is the main function to use when an assistant logs in
 */
export async function getOrCreateAssistant(
  fullName: string,
  role: string = 'assistant',
  percentage: number = 0
): Promise<any> {
  // Try to find existing assistant
  const existing = await findAssistantByName(fullName)
  
  if (existing) {
    // Update percentage if it has changed
    if (existing.percentage !== percentage) {
      return updateAssistantUser(existing.id, { percentage })
    }
    return existing
  }
  
  // Create new assistant user
  return createAssistantUser({ fullName, percentage, role })
}

/**
 * Update assistant user
 */
export async function updateAssistantUser(
  id: number,
  data: {
    fullName?: string
    percentage?: number
    role?: string
  }
): Promise<any> {
  const client = getPrismaClient()
  
  const updateData: any = {
    updatedAt: new Date()
  }
  
  if (data.fullName !== undefined) {
    const { firstName, lastName } = parseName(data.fullName)
    updateData.fullName = data.fullName
    updateData.firstName = firstName
    updateData.lastName = lastName
  }
  
  if (data.percentage !== undefined) {
    updateData.percentage = data.percentage
  }
  
  if (data.role !== undefined) {
    updateData.role = data.role
  }
  
  return client.assistantUser.update({
    where: { id },
    data: updateData
  })
}

/**
 * Get all assistant users
 */
export async function getAllAssistantUsers(): Promise<any[]> {
  const client = getPrismaClient()
  
  return client.assistantUser.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  })
}

// ==================== ASSISTANT SESSION OPERATIONS ====================

/**
 * Create assistant session
 * Now links to AssistantUser for persistent tracking
 */
export async function createAssistantSession(data: {
  userId: number
  assistantName: string
  percentage: number
  assistantUserId?: number
}): Promise<any> {
  const client = getPrismaClient()
  
  return client.assistantSession.create({
    data: {
      userId: data.userId,
      assistantName: data.assistantName,
      percentage: data.percentage,
      assistantUserId: data.assistantUserId,
    }
  })
}

/**
 * Get active assistant sessions
 */
export async function getActiveAssistantSessions(userId: number): Promise<any[]> {
  const client = getPrismaClient()
  
  return client.assistantSession.findMany({
    where: {
      userId,
      logoutTimestamp: null
    },
    orderBy: {
      loginTimestamp: 'desc'
    }
  })
}

/**
 * Close assistant session (logout)
 */
export async function closeAssistantSession(sessionId: number): Promise<any> {
  const client = getPrismaClient()
  
  return client.assistantSession.update({
    where: { id: sessionId },
    data: {
      logoutTimestamp: new Date()
    }
  })
}

/**
 * Get all assistant session history
 */
export async function getAssistantSessionHistory(userId?: number): Promise<any[]> {
  const client = getPrismaClient()
  
  return client.assistantSession.findMany({
    where: userId ? { userId } : undefined,
    orderBy: {
      loginTimestamp: 'desc'
    }
  })
}

/**
 * Get honoraires (transactions) by date
 * Optionally filter by doctor (medecin) name
 */
export async function getHonorairesByDate(
  date: string,
  medecin?: string
): Promise<any[]> {
  const client = getPrismaClient()
  
  return client.honoraire.findMany({
    where: {
      date,
      ...(medecin ? { medecin } : {})
    },
    orderBy: {
      time: 'asc'
    }
  })
}

/**
 * Get honoraires with patient details for Comptabilité du Jour
 */
export async function getHonorairesWithPatients(
  date: string,
  medecin?: string
): Promise<any[]> {
  const client = getPrismaClient()
  
  // Get honoraires for the date
  const honoraires = await client.honoraire.findMany({
    where: {
      ...(date ? { date } : {}),
      ...(medecin ? { medecin } : {})
    },
    orderBy: {
      time: 'asc'
    }
  })

  // Get unique patient codes
  const patientCodes = [...new Set(honoraires.map(h => h.patientCode))]
  
  // Get all patients by departmentCode (CDEP)
  const patients = await client.patient.findMany({
    where: {
      departmentCode: {
        in: patientCodes
      }
    },
    select: {
      departmentCode: true,
      firstName: true,
      lastName: true
    }
  })

  // Create a map for quick lookup
  const patientMap = new Map(
    patients.map(p => [p.departmentCode, p])
  )

  // Join honoraires with patient data
  return honoraires.map(h => ({
    id: h.id,
    date: h.date,
    time: h.time,
    patientCode: h.patientCode,
    patientFirstName: patientMap.get(h.patientCode)?.firstName || '',
    patientLastName: patientMap.get(h.patientCode)?.lastName || '',
    actePratique: h.actePratique,
    montant: h.montant,
    medecin: h.medecin,
    mtAssistant: h.mtAssistant
  }))
}

/**
 * Get visit history (honoraires) for a specific patient by departmentCode
 */
export async function getPatientVisitHistory(
  departmentCode: number
): Promise<any[]> {
  const client = getPrismaClient()
  
  const visits = await client.honoraire.findMany({
    where: {
      patientCode: departmentCode
    },
    orderBy: [
      { date: 'desc' },
      { time: 'desc' }
    ]
  })

  return visits.map(v => ({
    id: v.id,
    date: v.date,
    time: v.time,
    actePratique: v.actePratique,
    medecin: v.medecin,
    montant: v.montant,
    mtAssistant: v.mtAssistant
  }))
}

/**
 * Delete an honoraire (visit) by ID
 */
export async function deleteHonoraire(id: number): Promise<void> {
  const client = getPrismaClient()
  
  await client.honoraire.delete({
    where: { id }
  })
}

/**
 * Get all visit examinations for a patient
 */
export async function getPatientVisitExaminations(
  departmentCode: number
): Promise<any[]> {
  const client = getPrismaClient()
  
  const examinations = await client.visitExamination.findMany({
    where: {
      patientCode: departmentCode
    },
    orderBy: [
      { visitDate: 'desc' }
    ]
  })

  return examinations
}

/**
 * Get a specific visit examination by date
 */
export async function getVisitExaminationByDate(
  departmentCode: number,
  visitDate: string
): Promise<any | null> {
  const client = getPrismaClient()
  
  // Convert DD/MM/YYYY (from honoraires) to M/D/YYYY (visit_examinations format)
  // e.g., "07/10/2016" -> "10/7/2016"
  const parts = visitDate.split('/')
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10)
    const year = parts[2]
    const americanFormat = `${month}/${day}/${year}`
    
    const examination = await client.visitExamination.findFirst({
      where: {
        patientCode: departmentCode,
        visitDate: americanFormat
      }
    })

    return examination
  }
  
  return null
}

export async function getAllVisitExaminationsByPatientCode(
  patientCode: number
): Promise<any[]> {
  const client = getPrismaClient()
  
  const examinations = await client.visitExamination.findMany({
    where: {
      patientCode: patientCode
    },
    orderBy: {
      visitDate: 'desc'
    }
  })
  
  return examinations
}

// ==================== SALLE (ROOM) OPERATIONS ====================

/**
 * Get all salles (rooms)
 */
export async function getAllSalles(): Promise<any[]> {
  const client = getPrismaClient()
  
  return client.salle.findMany({
    orderBy: {
      name: 'asc'
    }
  })
}

/**
 * Get active salles only
 */
export async function getActiveSalles(): Promise<any[]> {
  const client = getPrismaClient()
  
  return client.salle.findMany({
    where: {
      isActive: true
    },
    orderBy: {
      name: 'asc'
    }
  })
}

/**
 * Get salle by ID
 */
export async function getSalleById(id: number): Promise<any> {
  const client = getPrismaClient()
  
  return client.salle.findUnique({
    where: { id }
  })
}

/**
 * Create a new salle
 */
export async function createSalle(data: {
  name: string
  description?: string
}): Promise<any> {
  const client = getPrismaClient()
  
  return client.salle.create({
    data: {
      name: data.name,
      description: data.description
    }
  })
}

/**
 * Update salle
 */
export async function updateSalle(id: number, data: {
  name?: string
  description?: string
  isActive?: boolean
}): Promise<any> {
  const client = getPrismaClient()
  
  return client.salle.update({
    where: { id },
    data
  })
}

/**
 * Delete salle
 */
export async function deleteSalle(id: number): Promise<any> {
  const client = getPrismaClient()
  
  return client.salle.delete({
    where: { id }
  })
}

/**
 * Update user's current salle
 */
export async function updateUserCurrentSalle(userId: number, salleId: number | null): Promise<any> {
  const client = getPrismaClient()
  
  return client.user.update({
    where: { id: userId },
    data: {
      currentSalleId: salleId
    }
  })
}

/**
 * Update assistant session salle
 */
export async function updateAssistantSessionSalle(sessionId: number, salleId: number): Promise<any> {
  const client = getPrismaClient()
  
  return client.assistantSession.update({
    where: { id: sessionId },
    data: {
      salleId
    }
  })
}

/**
 * Lock a salle for active use
 */
export async function lockSalle(salleId: number, userData: {
  userId: number
  userName: string
  userRole: string
  sessionName?: string
}): Promise<any> {
  const client = getPrismaClient()
  
  return client.salle.update({
    where: { id: salleId },
    data: {
      activeUserId: userData.userId,
      activeUserName: userData.userName,
      activeUserRole: userData.userRole,
      activeSessionName: userData.sessionName || null,
      lockedAt: new Date()
    }
  })
}

/**
 * Unlock a salle
 */
export async function unlockSalle(salleId: number): Promise<any> {
  const client = getPrismaClient()
  
  return client.salle.update({
    where: { id: salleId },
    data: {
      activeUserId: null,
      activeUserName: null,
      activeUserRole: null,
      activeSessionName: null,
      lockedAt: null
    }
  })
}

/**
 * Check if a salle is locked
 */
export async function isSalleLocked(salleId: number): Promise<{
  isLocked: boolean
  activeUser?: any
}> {
  const client = getPrismaClient()
  
  const salle = await client.salle.findUnique({
    where: { id: salleId }
  })
  
  if (!salle || !salle.activeUserId) {
    return { isLocked: false }
  }
  
  return {
    isLocked: true,
    activeUser: {
      userId: salle.activeUserId,
      userName: salle.activeUserName,
      userRole: salle.activeUserRole,
      sessionName: salle.activeSessionName,
      lockedAt: salle.lockedAt
    }
  }
}

/**
 * Get all locked salles
 */
export async function getLockedSalles(): Promise<any[]> {
  const client = getPrismaClient()
  
  return client.salle.findMany({
    where: {
      activeUserId: {
        not: null
      }
    },
    orderBy: {
      name: 'asc'
    }
  })
}

/**
 * Unlock all salles for a specific user (for cleanup on logout)
 */
export async function unlockUserSalles(userId: number): Promise<number> {
  const client = getPrismaClient()
  
  const result = await client.salle.updateMany({
    where: {
      activeUserId: userId
    },
    data: {
      activeUserId: null,
      activeUserName: null,
      activeUserRole: null,
      activeSessionName: null,
      lockedAt: null
    }
  })
  
  return result.count
}

// ==================== VISIT EXAMINATION OPERATIONS ====================

/**
 * Create a new visit examination
 */
export async function createVisitExamination(data: {
  patientCode: number
  visitDate: string
  medecin?: string
  motif?: string
  actesGeneraux?: string
  actesOphtalmologiques?: string
  // Left Eye
  svLeft?: string
  avLeft?: string
  sphereLeft?: string
  cylinderLeft?: string
  axisLeft?: string
  vlLeft?: string
  k1Left?: string
  k2Left?: string
  r1Left?: string
  r2Left?: string
  r0Left?: string
  pachyLeft?: string
  tocLeft?: string
  notesLeft?: string
  gonioLeft?: string
  toLeft?: string
  lafLeft?: string
  foLeft?: string
  // Right Eye
  svRight?: string
  avRight?: string
  sphereRight?: string
  cylinderRight?: string
  axisRight?: string
  vlRight?: string
  k1Right?: string
  k2Right?: string
  r1Right?: string
  r2Right?: string
  r0Right?: string
  pachyRight?: string
  tocRight?: string
  notesRight?: string
  gonioRight?: string
  toRight?: string
  lafRight?: string
  foRight?: string
  // Common fields
  addition?: string
  dip?: string
  cycloplegie?: string
  conduiteATenir?: string
  diagnostic?: string
}): Promise<any> {
  const client = getPrismaClient()
  
  // Check if a visit already exists for this patient on this date within the last 5 seconds
  // to prevent duplicate creation from double clicks
  const recentCheck = await client.visitExamination.findFirst({
    where: {
      patientCode: data.patientCode,
      visitDate: data.visitDate,
      createdAt: {
        gte: new Date(Date.now() - 5000) // Created within last 5 seconds
      }
    }
  })
  
  if (recentCheck) {
    console.log(`⚠️ Duplicate visit creation prevented for patient ${data.patientCode} on ${data.visitDate}`)
    return recentCheck // Return the existing recent visit instead of creating a new one
  }
  
  const examination = await client.visitExamination.create({
    data: {
      patientCode: data.patientCode,
      visitDate: data.visitDate,
      medecin: data.medecin,
      motif: data.motif,
      actesGeneraux: data.actesGeneraux,
      actesOphtalmologiques: data.actesOphtalmologiques,
      // Left Eye
      svLeft: data.svLeft,
      avLeft: data.avLeft,
      sphereLeft: data.sphereLeft,
      cylinderLeft: data.cylinderLeft,
      axisLeft: data.axisLeft,
      vlLeft: data.vlLeft,
      k1Left: data.k1Left,
      k2Left: data.k2Left,
      r1Left: data.r1Left,
      r2Left: data.r2Left,
      r0Left: data.r0Left,
      pachyLeft: data.pachyLeft,
      tocLeft: data.tocLeft,
      notesLeft: data.notesLeft,
      gonioLeft: data.gonioLeft,
      toLeft: data.toLeft,
      lafLeft: data.lafLeft,
      foLeft: data.foLeft,
      // Right Eye
      svRight: data.svRight,
      avRight: data.avRight,
      sphereRight: data.sphereRight,
      cylinderRight: data.cylinderRight,
      axisRight: data.axisRight,
      vlRight: data.vlRight,
      k1Right: data.k1Right,
      k2Right: data.k2Right,
      r1Right: data.r1Right,
      r2Right: data.r2Right,
      r0Right: data.r0Right,
      pachyRight: data.pachyRight,
      tocRight: data.tocRight,
      notesRight: data.notesRight,
      gonioRight: data.gonioRight,
      toRight: data.toRight,
      lafRight: data.lafRight,
      foRight: data.foRight,
      // Common fields
      addition: data.addition,
      dip: data.dip,
      cycloplegie: data.cycloplegie,
      conduiteATenir: data.conduiteATenir,
      diagnostic: data.diagnostic
    }
  })
  
  return examination
}

/**
 * Get a visit examination by ID
 */
export async function getVisitExaminationById(id: number): Promise<any | null> {
  const client = getPrismaClient()
  
  const examination = await client.visitExamination.findUnique({
    where: { id }
  })
  
  return examination
}

/**
 * Update a visit examination
 */
export async function updateVisitExamination(id: number, data: {
  visitDate?: string
  medecin?: string
  motif?: string
  actesGeneraux?: string
  actesOphtalmologiques?: string
  // Left Eye
  svLeft?: string
  avLeft?: string
  sphereLeft?: string
  cylinderLeft?: string
  axisLeft?: string
  vlLeft?: string
  k1Left?: string
  k2Left?: string
  r1Left?: string
  r2Left?: string
  r0Left?: string
  pachyLeft?: string
  tocLeft?: string
  notesLeft?: string
  gonioLeft?: string
  toLeft?: string
  lafLeft?: string
  foLeft?: string
  // Right Eye
  svRight?: string
  avRight?: string
  sphereRight?: string
  cylinderRight?: string
  axisRight?: string
  vlRight?: string
  k1Right?: string
  k2Right?: string
  r1Right?: string
  r2Right?: string
  r0Right?: string
  pachyRight?: string
  tocRight?: string
  notesRight?: string
  gonioRight?: string
  toRight?: string
  lafRight?: string
  foRight?: string
  // Common fields
  addition?: string
  dip?: string
  cycloplegie?: string
  conduiteATenir?: string
  diagnostic?: string
}): Promise<any> {
  const client = getPrismaClient()
  
  const examination = await client.visitExamination.update({
    where: { id },
    data
  })
  
  return examination
}

/**
 * Delete a visit examination by ID
 * IMPORTANT: Does NOT delete payments or honoraires - they are independent
 */
export async function deleteVisitExamination(id: number): Promise<void> {
  const client = getPrismaClient()
  
  // Get visit details before deletion
  const visit = await client.visitExamination.findUnique({
    where: { id }
  })
  
  if (!visit) {
    throw new Error('Visit not found')
  }
  
  console.log(`🗑️ Deleting visit ${id} for patient ${visit.patientCode}`)
  console.log(`⚠️ IMPORTANT: Payments and honoraires will NOT be deleted - they are independent of visits`)
  
  // Just delete the visit - payments stay
  await client.visitExamination.delete({
    where: { id }
  })
  
  console.log(`✅ Visit ${id} deleted successfully`)
  console.log(`✅ Payments and honoraires preserved for patient ${visit.patientCode} on date ${visit.visitDate}`)
}

// ============================================================================
// Payment Validation Functions
// ============================================================================

/**
 * Create a new payment validation with detailed logging
 */
export async function createPaymentValidation(data: {
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
}): Promise<any> {
  const client = getPrismaClient()
  
  // Get current time in HH:MM format
  const now = new Date()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  
  // Convert date format from YYYY-MM-DD to DD/MM/YYYY for Honoraire table
  let honoraireDate = data.visitDate
  if (data.visitDate.includes('-')) {
    const [year, month, day] = data.visitDate.split('-')
    honoraireDate = `${day}/${month}/${year}`
  }
  
  // Create payment validation record
  const payment = await client.paymentValidation.create({
    data: {
      patientCode: data.patientCode,
      patientName: data.patientName,
      visitDate: data.visitDate,
      visitId: data.visitId,
      totalAmount: data.totalAmount,
      selectedActs: JSON.stringify(data.selectedActs),
      validatedBy: data.validatedBy,
      validatedByUserId: data.validatedByUserId,
      validatedByRole: data.validatedByRole,
      notes: data.notes,
      status: 'completed'
    }
  })
  
  // Create honoraire records for each selected act (for Comptabilité du Jour)
  const honorairePromises = data.selectedActs.map(act => 
    client.honoraire.create({
      data: {
        date: honoraireDate, // Use converted date format
        time: currentTime,
        patientCode: data.patientCode,
        actePratique: act.actePratique,
        montant: act.montant,
        medecin: data.validatedBy,
        mtAssistant: null // Can be calculated later based on assistant percentages if needed
      }
    })
  )
  
  await Promise.all(honorairePromises)
  
  // Create payment log entry
  await client.paymentLog.create({
    data: {
      paymentId: payment.id,
      actionType: 'created',
      actionBy: data.validatedBy,
      actionByUserId: data.validatedByUserId,
      actionByRole: data.validatedByRole,
      actionDetails: JSON.stringify({
        totalAmount: data.totalAmount,
        actsCount: data.selectedActs.length,
        acts: data.selectedActs.map(act => act.actePratique),
        honorairesCreated: data.selectedActs.length
      })
    }
  })
  
  return payment
}

/**
 * Get all payment validations with optional filters
 */
export async function getPaymentValidations(filters?: {
  patientCode?: number
  validatedByUserId?: number
  startDate?: string
  endDate?: string
  status?: string
}): Promise<any[]> {
  const client = getPrismaClient()
  
  const where: any = {}
  
  if (filters?.patientCode) {
    where.patientCode = filters.patientCode
  }
  
  if (filters?.validatedByUserId) {
    where.validatedByUserId = filters.validatedByUserId
  }
  
  if (filters?.status) {
    where.status = filters.status
  }
  
  const payments = await client.paymentValidation.findMany({
    where,
    orderBy: { validatedAt: 'desc' }
  })
  
  // Parse selectedActs JSON for each payment
  return payments.map(payment => ({
    ...payment,
    selectedActs: JSON.parse(payment.selectedActs)
  }))
}

/**
 * Get payments for a specific date (for Comptabilité du Jour)
 */
export async function getPaymentsByDate(date: string): Promise<any[]> {
  const client = getPrismaClient()
  
  const payments = await client.paymentValidation.findMany({
    where: {
      visitDate: date,
      status: 'completed'
    },
    orderBy: { validatedAt: 'asc' }
  })
  
  return payments.map(payment => ({
    ...payment,
    selectedActs: JSON.parse(payment.selectedActs)
  }))
}

/**
 * Get payments for today grouped by user (for Comptabilité du Jour)
 */
export async function getTodayPaymentsByUser(): Promise<any> {
  const client = getPrismaClient()
  
  const todayDate = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).split('/').join('/')
  
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  
  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)
  
  const payments = await client.paymentValidation.findMany({
    where: {
      validatedAt: {
        gte: startOfDay,
        lte: endOfDay
      },
      status: 'completed'
    }
  })
  
  // Group by user
  const grouped: Record<string, any> = {}
  
  payments.forEach(payment => {
    const key = `${payment.validatedByUserId}_${payment.validatedBy}`
    
    if (!grouped[key]) {
      grouped[key] = {
        userId: payment.validatedByUserId,
        userName: payment.validatedBy,
        userRole: payment.validatedByRole,
        totalAmount: 0,
        paymentsCount: 0,
        payments: []
      }
    }
    
    grouped[key].totalAmount += payment.totalAmount
    grouped[key].paymentsCount += 1
    grouped[key].payments.push({
      ...payment,
      selectedActs: JSON.parse(payment.selectedActs)
    })
  })
  
  return Object.values(grouped)
}

/**
 * Get payment logs for audit trail
 */
export async function getPaymentLogs(paymentId?: number): Promise<any[]> {
  const client = getPrismaClient()
  
  const where: any = {}
  if (paymentId) {
    where.paymentId = paymentId
  }
  
  const logs = await client.paymentLog.findMany({
    where,
    orderBy: { timestamp: 'desc' }
  })
  
  return logs.map(log => ({
    ...log,
    actionDetails: JSON.parse(log.actionDetails)
  }))
}

/**
 * Cancel a payment validation
 */
export async function cancelPaymentValidation(
  paymentId: number,
  cancelledBy: string,
  cancelledByUserId: number,
  cancelledByRole: string,
  reason: string
): Promise<any> {
  const client = getPrismaClient()
  
  // Update payment status
  const payment = await client.paymentValidation.update({
    where: { id: paymentId },
    data: { status: 'cancelled' }
  })
  
  // Create log entry
  await client.paymentLog.create({
    data: {
      paymentId,
      actionType: 'cancelled',
      actionBy: cancelledBy,
      actionByUserId: cancelledByUserId,
      actionByRole: cancelledByRole,
      actionDetails: JSON.stringify({ reason })
    }
  })
  
  return payment
}

/**
 * Delete a payment validation (admin only, with logging)
 */
export async function deletePaymentValidation(
  paymentId: number,
  deletedBy: string,
  deletedByUserId: number,
  deletedByRole: string,
  reason: string
): Promise<void> {
  const client = getPrismaClient()
  
  // Get payment details before deletion
  const payment = await client.paymentValidation.findUnique({
    where: { id: paymentId }
  })
  
  if (!payment) {
    throw new Error('Payment not found')
  }
  
  // Create log entry before deletion
  await client.paymentLog.create({
    data: {
      paymentId,
      actionType: 'deleted',
      actionBy: deletedBy,
      actionByUserId: deletedByUserId,
      actionByRole: deletedByRole,
      actionDetails: JSON.stringify({
        reason,
        deletedPayment: payment
      })
    }
  })
  
  // Delete associated honoraire records from Comptabilité du Jour
  try {
    const selectedActs = JSON.parse(payment.selectedActs)
    const actNames = selectedActs.map((act: any) => act.actePratique)
    
    // Delete honoraires that match this payment's date, patient code, and acts
    await client.honoraire.deleteMany({
      where: {
        patientCode: payment.patientCode,
        date: payment.visitDate.includes('-') 
          ? (() => {
              const [year, month, day] = payment.visitDate.split('-')
              return `${day}/${month}/${year}`
            })()
          : payment.visitDate,
        actePratique: {
          in: actNames
        },
        medecin: payment.validatedBy
      }
    })
  } catch (error) {
    console.error('Error deleting honoraires:', error)
  }
  
  // Delete payment (logs are kept for audit trail)
  await client.paymentValidation.delete({
    where: { id: paymentId }
  })
}

/**
 * Get ALL payment validations for a specific patient (all dates)
 */
export async function getAllPaymentsByPatient(patientCode: number): Promise<any> {
  const client = getPrismaClient()
  
  try {
    const payments = await client.paymentValidation.findMany({
      where: {
        patientCode: patientCode,
        status: 'completed'
      },
      orderBy: {
        validatedAt: 'desc'  // Most recent first
      }
    })
    
    // Format the payments for display
    const formattedPayments = payments.map(payment => {
      const visitDate = new Date(payment.visitDate)
      const validatedAt = new Date(payment.validatedAt)
      
      return {
        id: payment.id,
        date: visitDate.toLocaleDateString('fr-FR'),  // DD/MM/YYYY
        time: validatedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        actePratique: payment.actes || 'N/A',
        montant: payment.totalAmount || 0,
        medecin: payment.validatedBy || 'N/A',
        mtAssistant: payment.assistantAmount || 0
      }
    })
    
    return { success: true, payments: formattedPayments }
  } catch (error) {
    console.error('Error getting payments by patient:', error)
    return { success: false, error: error.message, payments: [] }
  }
}

/**
 * Patient Queue Operations
 */

/**
 * Send a patient to a room/doctor (nurse -> doctor)
 */
export async function sendPatientToRoom(data: {
  patientCode: number
  patientName: string
  fromUserId: number
  fromUserName: string
  fromUserRole: string
  toUserId: number
  toUserName: string
  toUserRole: string
  roomId: number
  roomName: string
  isUrgent: boolean
  visitId?: number
  actionLabel?: string
  actionType?: string
}): Promise<any> {
  const client = getPrismaClient()
  
  // Cancel any existing pending queue items for this patient
  await client.patientQueue.updateMany({
    where: {
      patientCode: data.patientCode,
      status: 'pending'
    },
    data: {
      status: 'cancelled'
    }
  })
  
  // Create new queue item
  const queueItem = await client.patientQueue.create({
    data: {
      patientCode: data.patientCode,
      patientName: data.patientName,
      fromUserId: data.fromUserId,
      fromUserName: data.fromUserName,
      fromUserRole: data.fromUserRole,
      toUserId: data.toUserId,
      toUserName: data.toUserName,
      toUserRole: data.toUserRole,
      roomId: data.roomId,
      roomName: data.roomName,
      isUrgent: data.isUrgent,
      visitId: data.visitId,
      actionLabel: data.actionLabel,
      actionType: data.actionType,
      status: 'pending'
    }
  })
  
  return queueItem
}

/**
 * Get daily sent count for a specific room (counts nurse->doctor sends only)
 */
export async function getDailySentCountForRoom(roomId: number, date: string): Promise<number> {
  const client = getPrismaClient()
  
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)
  
  const count = await client.patientQueue.count({
    where: {
      roomId: roomId,
      sentAt: {
        gte: startOfDay,
        lte: endOfDay
      },
      fromUserRole: 'nurse',  // Only count items sent BY nurses
      actionType: null        // Exclude doctor->nurse sends (S, D, G, ODG)
    }
  })
  
  return count
}

/**
 * Send a patient back to nurse with an action (doctor -> nurse)
 */
export async function sendPatientToNurse(data: {
  patientCode: number
  patientName: string
  fromUserId: number
  fromUserName: string
  fromUserRole: string
  actionType: string // S, D, G, ODG
  actionLabel: string
  visitId?: number
}): Promise<any> {
  const client = getPrismaClient()
  
  // Get the doctor's current room
  const doctorRoom = await client.salle.findFirst({
    where: {
      activeUserId: data.fromUserId
    }
  })
  
  // Cancel any existing pending queue items for this patient
  await client.patientQueue.updateMany({
    where: {
      patientCode: data.patientCode,
      status: 'pending'
    },
    data: {
      status: 'cancelled'
    }
  })
  
  // Create new queue item with the doctor's room info
  const queueItem = await client.patientQueue.create({
    data: {
      patientCode: data.patientCode,
      patientName: data.patientName,
      fromUserId: data.fromUserId,
      fromUserName: data.fromUserName,
      fromUserRole: data.fromUserRole,
      toUserId: 0, // 0 means broadcast to all nurses
      toUserName: 'Infirmière',
      toUserRole: 'nurse', // Broadcast to all nurses
      roomId: doctorRoom?.id || 0, // Use doctor's room ID if available
      roomName: doctorRoom ? `Salle ${doctorRoom.id}` : 'Infirmière',
      isUrgent: false,
      actionType: data.actionType,
      actionLabel: data.actionLabel,
      visitId: data.visitId,
      status: 'pending'
    }
  })
  
  console.log(`🩺 Doctor ${data.fromUserName} in room ${doctorRoom?.id} sent patient ${data.patientName} to nurse for ${data.actionLabel}`)
  
  return queueItem
}

/**
 * Get the current room for a specific user
 */
export async function getUserCurrentRoom(userId: number): Promise<any | null> {
  const client = getPrismaClient()
  
  const salle = await client.salle.findFirst({
    where: {
      activeUserId: userId
    }
  })
  
  return salle
}

/**
 * Get patient queue for a specific user
 */
export async function getPatientQueue(userId: number, userRole: string): Promise<any[]> {
  const client = getPrismaClient()
  
  let where: any = {
    status: 'pending'
  }
  
  if (userRole === 'nurse') {
    // Nurses see items sent to them (from doctors) and can be for any room
    where.OR = [
      { toUserRole: 'nurse', toUserId: 0 },  // General nurse queue
      { toUserId: userId }  // Specifically to this nurse
    ]
  } else {
    // Doctors/assistants see items sent to them OR to their room
    // First, get the room the user is currently in
    const userRoom = await client.salle.findFirst({
      where: {
        activeUserId: userId
      }
    })
    
    if (userRoom) {
      // See items sent directly to them OR items sent to their room (toUserId = 0)
      where.OR = [
        { toUserId: userId },
        { roomId: userRoom.id, toUserId: 0 }
      ]
    } else {
      // Not in a room, only see items sent directly to them
      where.toUserId = userId
    }
  }
  
  const queueItems = await client.patientQueue.findMany({
    where,
    orderBy: [
      { isUrgent: 'desc' }, // Urgent items first
      { sentAt: 'asc' } // Then by time sent
    ]
  })
  
  return queueItems
}

/**
 * Mark queue item as seen
 */
export async function markQueueItemSeen(queueId: number): Promise<void> {
  const client = getPrismaClient()
  
  await client.patientQueue.update({
    where: { id: queueId },
    data: {
      seenAt: new Date(),
      status: 'seen'
    }
  })
}

/**
 * Mark queue item as completed
 */
export async function markQueueItemCompleted(queueId: number): Promise<void> {
  const client = getPrismaClient()
  
  await client.patientQueue.update({
    where: { id: queueId },
    data: {
      completedAt: new Date(),
      status: 'completed'
    }
  })
}

/**
 * Toggle queue item checked status
 */
export async function toggleQueueItemChecked(queueId: number, isChecked: boolean): Promise<void> {
  const client = getPrismaClient()
  
  await client.patientQueue.update({
    where: { id: queueId },
    data: {
      isChecked: isChecked
    }
  })
}

/**
 * Get active queue items sent by a user
 */
export async function getSentQueueItems(userId: number): Promise<any[]> {
  const client = getPrismaClient()
  
  const queueItems = await client.patientQueue.findMany({
    where: {
      fromUserId: userId,
      status: { in: ['pending', 'seen'] }
    },
    orderBy: { sentAt: 'desc' }
  })
  
  return queueItems
}

/**
 * Check if a payment validation exists for a patient on a specific date
 */
export async function checkPaymentValidation(
  patientCode: number,
  visitDate: string
): Promise<{ validated: boolean }> {
  const client = getPrismaClient()
  
  const payment = await client.paymentValidation.findFirst({
    where: {
      patientCode: patientCode,
      visitDate: visitDate,
      status: { not: 'deleted' } // Only check non-deleted payments
    }
  })
  
  return { validated: !!payment }
}

/**
 * Link existing payments to a visit when the visit gets saved
 * Updates payments that were created for patientCode + visitDate but had no visitId
 */
export async function linkPaymentsToVisit(
  patientCode: number, 
  visitDate: string, 
  visitId: number
): Promise<void> {
  const client = getPrismaClient()
  
  console.log(`🔗 Linking payments for patient ${patientCode}, date ${visitDate} to visit ${visitId}`)
  
  const updateResult = await client.paymentValidation.updateMany({
    where: {
      patientCode: patientCode,
      visitDate: visitDate,
      visitId: null // Only update payments that don't have a visitId yet
    },
    data: {
      visitId: visitId
    }
  })
  
  console.log(`✅ Linked ${updateResult.count} payments to visit ${visitId}`)
}

/**
 * Delete all payments for a patient on a specific date
 * Marks all payments as deleted for admin visibility
 */
/**
 * Save a message to the database
 */
export async function saveMessage(data: {
  senderId: number
  senderName: string
  senderRole: string
  content: string
  roomId?: number
  recipientId?: number
  recipientName?: string
  recipientRole?: string
  patientName?: string
  patientId?: number
  audioData?: string
  isVoiceMessage?: boolean
}): Promise<any> {
  const client = getPrismaClient()
  
  const message = await client.message.create({
    data: {
      senderId: data.senderId,
      senderName: data.senderName,
      senderRole: data.senderRole,
      content: data.content,
      roomId: data.roomId,
      recipientId: data.recipientId,
      recipientName: data.recipientName,
      recipientRole: data.recipientRole,
      patientName: data.patientName,
      patientId: data.patientId,
      audioData: data.audioData,
      isVoiceMessage: data.isVoiceMessage || false,
      status: 'unread'
    }
  })
  
  return message
}

/**
 * Get messages for a room
 */
export async function getRoomMessages(roomId: number, limit: number = 50): Promise<any[]> {
  const client = getPrismaClient()
  
  const messages = await client.message.findMany({
    where: {
      roomId: roomId
    },
    orderBy: {
      sentAt: 'desc'
    },
    take: limit
  })
  
  return messages.reverse() // Return in chronological order
}

/**
 * Get messages for a user (direct messages)
 */
export async function getUserMessages(userId: number, limit: number = 50): Promise<any[]> {
  const client = getPrismaClient()
  
  const messages = await client.message.findMany({
    where: {
      OR: [
        { recipientId: userId },
        { senderId: userId }
      ]
    },
    orderBy: {
      sentAt: 'desc'
    },
    take: limit
  })
  
  return messages.reverse() // Return in chronological order
}

/**
 * Mark message as read
 */
export async function markMessageAsRead(messageId: number): Promise<void> {
  const client = getPrismaClient()
  
  await client.message.update({
    where: {
      id: messageId
    },
    data: {
      status: 'read',
      readAt: new Date()
    }
  })
}

/**
 * Get unread messages count for a user or room
 */
export async function getUnreadMessageCount(userId?: number, roomId?: number): Promise<number> {
  const client = getPrismaClient()
  
  let where: any = {
    status: 'unread'
  }
  
  if (roomId) {
    where.roomId = roomId
  } else if (userId) {
    where.recipientId = userId
  }
  
  const count = await client.message.count({
    where
  })
  
  return count
}

export async function deleteAllPaymentsForPatientDate(
  patientCode: number,
  visitDate: string,
  deletedBy: string,
  deletedByUserId: number,
  deletedByRole: string,
  reason: string
): Promise<number> {
  const client = getPrismaClient()
  
  console.log(`🗑️ Deleting all payments for patient ${patientCode}, date ${visitDate}`)
  
  // Try multiple date format conversions to match how honoraires might be stored
  const dateFormats: string[] = []
  
  // Convert date format from YYYY-MM-DD to DD/MM/YYYY for Honoraire table
  if (visitDate.includes('-')) {
    const [year, month, day] = visitDate.split('-')
    dateFormats.push(`${day}/${month}/${year}`) // DD/MM/YYYY
    dateFormats.push(`${parseInt(day, 10)}/${parseInt(month, 10)}/${year}`) // D/M/YYYY (without leading zeros)
    dateFormats.push(`${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`) // DD/MM/YYYY (with padding)
  } else {
    dateFormats.push(visitDate) // Use as-is if not in expected format
  }
  
  console.log(`📊 Trying date formats: ${dateFormats.join(', ')} for patient code: ${patientCode}`)
  
  // Try to find honoraires with any of the date formats
  let totalHonorairesDeleted = 0
  
  for (const dateFormat of dateFormats) {
    console.log(`🔍 Looking for honoraires with date: ${dateFormat}`)
    
    // First check what honoraires exist
    const existingHonoraires = await client.honoraire.findMany({
      where: {
        patientCode: patientCode,
        date: dateFormat
      }
    })
    
    if (existingHonoraires.length > 0) {
      console.log(`📊 Found ${existingHonoraires.length} honoraire records with date ${dateFormat}:`)
      existingHonoraires.forEach(h => {
        console.log(`  - ID: ${h.id}, Patient: ${h.patientCode}, Date: ${h.date}, Act: ${h.actePratique}, Amount: ${h.montant}`)
      })
      
      // Delete the honoraires
      const deleteResult = await client.honoraire.deleteMany({
        where: {
          patientCode: patientCode,
          date: dateFormat
        }
      })
      
      console.log(`✅ Deleted ${deleteResult.count} honoraires with date format ${dateFormat}`)
      totalHonorairesDeleted += deleteResult.count
    }
  }
  
  // Also try to find by looking at all honoraires for this patient and checking dates
  const allPatientHonoraires = await client.honoraire.findMany({
    where: {
      patientCode: patientCode
    }
  })
  
  console.log(`📊 Total honoraires for patient ${patientCode}: ${allPatientHonoraires.length}`)
  if (allPatientHonoraires.length > 0) {
    console.log(`  Sample dates: ${allPatientHonoraires.slice(0, 3).map(h => h.date).join(', ')}`)
  }
  
  // Get all payments to be deleted for logging
  const paymentsToDelete = await client.paymentValidation.findMany({
    where: {
      patientCode: patientCode,
      visitDate: visitDate,
      status: { not: 'deleted' } // Only delete non-deleted payments
    }
  })
  
  console.log(`📊 Found ${paymentsToDelete.length} payment validations to mark as deleted`)
  console.log(`✅ Total honoraires deleted from Comptabilité du Jour: ${totalHonorairesDeleted}`)
  
  // Mark all payments as deleted
  const updateResult = await client.paymentValidation.updateMany({
    where: {
      patientCode: patientCode,
      visitDate: visitDate,
      status: { not: 'deleted' }
    },
    data: {
      status: 'deleted'
    }
  })
  
  // Create log entries for each deleted payment
  for (const payment of paymentsToDelete) {
    await client.paymentLog.create({
      data: {
        paymentId: payment.id,
        actionType: 'deleted',
        actionBy: deletedBy,
        actionByUserId: deletedByUserId,
        actionByRole: deletedByRole,
        actionDetails: JSON.stringify({
          reason: reason,
          patientCode: patientCode,
          visitDate: visitDate,
          allPaymentsDeleted: true,
          honorairesDeleted: totalHonorairesDeleted
        })
      }
    })
  }
  
  console.log(`✅ Deleted ${updateResult.count} payments for patient ${patientCode}`)
  
  return updateResult.count
}
