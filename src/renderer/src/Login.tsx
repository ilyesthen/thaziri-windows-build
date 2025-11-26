import React, { useState, useEffect } from 'react'
import './Login.css'
import { useAuthStore } from './store/authStore'
import SalleSelection from './components/SalleSelection'

interface User {
  id: number
  email: string
  name: string
  role: string
  defaultPercentage?: number
}

const Login: React.FC = () => {
  console.log('🔐 Login component rendering')
  
  const login = useAuthStore((state) => state.login)
  
  const [users, setUsers] = useState<User[]>([])
  const [selectedEmail, setSelectedEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  
  // Assistant name prompt
  const [showAssistantNamePrompt, setShowAssistantNamePrompt] = useState<boolean>(false)
  const [assistantName, setAssistantName] = useState<string>('')
  const [pendingUser, setPendingUser] = useState<any>(null)
  const [existingAssistants, setExistingAssistants] = useState<any[]>([])
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>('new')
  
  // Salle selection
  const [showSalleSelection, setShowSalleSelection] = useState<boolean>(false)
  const [pendingUserForSalle, setPendingUserForSalle] = useState<any>(null)

  // Fetch users for login dropdown
  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const userList = await window.electronAPI?.auth.getUsersForLogin()
      setUsers(userList || [])
      if (userList && userList.length > 0) {
        setSelectedEmail(userList[0].email)
      }
    } catch (err) {
      console.error('Failed to load users:', err)
      setError('Failed to load users')
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Call the auth:verify-credentials IPC handler
      const result = await window.electronAPI?.auth.verifyCredentials(selectedEmail, password)
      
      // Check for successful authentication
      if (result && result.success && result.user) {
        const user = result.user
        
        // Check if user is assistant - prompt for name first
        if (user.role === 'assistant_1' || user.role === 'assistant_2') {
          setPendingUser(user)
          
          // Load existing users with this same role (real assistant users)
          const allUsers = await window.electronAPI?.db.users.getAll()
          const roleUsers = allUsers.filter((u: any) => u.role === user.role && u.id !== user.id)
          setExistingAssistants(roleUsers)
          
          setShowAssistantNamePrompt(true)
          setLoading(false)
          return
        }
        
        // For doctors only, show salle selection
        if (user.role === 'doctor') {
          setPendingUserForSalle(user)
          setShowSalleSelection(true)
          setLoading(false)
          return
        }
        
        // For nurses and admins, login directly (no salle selection)
        if (user.role === 'nurse' || user.role === 'admin') {
          login(user)
          
          // Start broadcasting user presence on the network
          try {
            const networkAPI = (window.electronAPI as any)?.network
            if (networkAPI) {
              await networkAPI.startBroadcasting({
                userId: user.id,
                username: user.name,
                role: user.role
              })
              console.log('Started broadcasting user presence')
            }
          } catch (broadcastErr) {
            console.error('Failed to start network broadcast:', broadcastErr)
            // Don't fail login if broadcast fails
          }
        }
      } else {
        // Display error message from server
        setError(result?.error || 'Invalid credentials')
      }
    } catch (err) {
      setError('Login failed. Please try again.')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
      setPassword('')
    }
  }

  const handleAssistantNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    let finalAssistantName = assistantName.trim()
    let existingUser: any = null
    
    // If user selected an existing assistant user
    if (selectedAssistantId !== 'new') {
      existingUser = existingAssistants.find((u: any) => u.id.toString() === selectedAssistantId)
      if (existingUser) {
        finalAssistantName = existingUser.name
      }
    } else {
      // Creating new assistant user - validate name
      if (!finalAssistantName) {
        setError('Veuillez entrer votre nom complet')
        return
      }
      
      // Validate that the name has at least 2 words (first name and last name)
      const nameParts = finalAssistantName.split(/\s+/)
      if (nameParts.length < 2) {
        setError('Veuillez entrer votre prénom et nom de famille (minimum 2 mots)')
        return
      }
      
      // Check if name already exists (check both "First Last" and "Last First")
      const [word1, word2] = nameParts
      const normalName = `${word1} ${word2}`
      const reversedName = `${word2} ${word1}`
      
      const nameExists = existingAssistants.some((u: any) => {
        const uName = u.name.toLowerCase().trim()
        return uName === normalName.toLowerCase() || 
               uName === reversedName.toLowerCase() ||
               uName === finalAssistantName.toLowerCase()
      })
      
      if (nameExists) {
        setError(`Un utilisateur avec ce nom existe déjà. Sélectionnez-le dans la liste ci-dessus.`)
        setLoading(false)
        return
      }
    }
    
    setLoading(true)
    setError('')
    
    try {
      // If not selecting existing user, create new real User
      if (!existingUser) {
        // Generate unique email from name
        const baseEmail = finalAssistantName.toLowerCase().replace(/\s+/g, '.')
        const email = `${baseEmail}@assistant.local`
        
        // Check if email already exists in the users list
        const allUsersList = await window.electronAPI?.db.users.getAll()
        const emailExists = allUsersList.some((u: any) => u.email === email)
        if (emailExists) {
          setError(`Un utilisateur avec ce nom existe déjà. Sélectionnez-le dans la liste ou utilisez un nom différent.`)
          setLoading(false)
          return
        }
        
        // Create real user with the assistant role
        // Use the SAME password that was entered (it's already the template's password)
        const createResult = await window.electronAPI?.db.users.create({
          name: finalAssistantName,
          email: email,
          password: password, // Use the template's password they just entered
          role: pendingUser.role,
          defaultPercentage: pendingUser.defaultPercentage || 0 // Get percentage from template
        })
        
        console.log('Create user result:', createResult)
        
        if (!createResult?.success) {
          setError(`Échec de création de l'utilisateur: ${createResult?.error || 'Erreur inconnue'}`)
          setLoading(false)
          return
        }
        
        // Get the created user with percentage from template
        existingUser = {
          ...createResult.user,
          defaultPercentage: pendingUser.defaultPercentage || 0
        }
      }
      
      // Instead of logging in directly, show salle selection for assistants
      setPendingUserForSalle(existingUser)
      setShowAssistantNamePrompt(false)
      setShowSalleSelection(true)
      
    } catch (err) {
      console.error('Assistant user creation error:', err)
      setError('Échec de création de l\'utilisateur')
    } finally {
      setLoading(false)
    }
  }
  
  const handleSalleSelected = async (salleId: number) => {
    if (!pendingUserForSalle) return
    
    setLoading(true)
    
    try {
      // Update user's current salle
      await window.electronAPI?.db.salles.updateUserSalle(pendingUserForSalle.id, salleId)
      
      // For assistants, use their entered name as sessionName
      const sessionName = pendingUserForSalle.role === 'assistant' 
        ? pendingUserForSalle.name 
        : undefined
      
      // Login the user
      login({
        ...pendingUserForSalle,
        currentSalleId: salleId
      }, sessionName)
        
      // Start broadcasting with user's name
      try {
        const networkAPI = (window.electronAPI as any)?.network
        if (networkAPI) {
          await networkAPI.startBroadcasting({
            userId: pendingUserForSalle.id,
            username: pendingUserForSalle.name,
            role: pendingUserForSalle.role
          })
          console.log('Started broadcasting user presence')
        }
      } catch (broadcastErr) {
        console.error('Failed to start network broadcast:', broadcastErr)
      }
    } catch (err) {
      console.error('Salle selection error:', err)
      setError('Échec de sélection de la salle')
      setShowSalleSelection(false)
    } finally {
      setLoading(false)
    }
  }

  // Show salle selection if needed
  if (showSalleSelection && pendingUserForSalle) {
    return (
      <SalleSelection 
        onSalleSelected={handleSalleSelected}
        userName={pendingUserForSalle.name}
        user={pendingUserForSalle}
      />
    )
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-text">Thaziri</div>
        </div>
        
        {showAssistantNamePrompt ? (
          // Assistant Name Prompt
          <>
            <h1>Bienvenue, Assistant</h1>
            <p className="subtitle">
              {existingAssistants.length > 0 
                ? 'Sélectionnez votre nom ou créez un nouveau profil'
                : 'Veuillez entrer votre nom complet'}
            </p>
            
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={handleAssistantNameSubmit}>
              {existingAssistants.length > 0 && (
                <div className="form-group">
                  <label htmlFor="assistant-select">Sélectionner votre profil</label>
                  <select
                    id="assistant-select"
                    value={selectedAssistantId}
                    onChange={(e) => {
                      setSelectedAssistantId(e.target.value)
                      if (e.target.value !== 'new') {
                        setAssistantName('')
                      }
                    }}
                    disabled={loading}
                  >
                    <option value="new">➕ Créer un nouveau profil</option>
                    {existingAssistants.map((user: any) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedAssistantId === 'new' && (
                <div className="form-group">
                  <label htmlFor="assistant-name">Votre Nom Complet</label>
                  <input
                    type="text"
                    id="assistant-name"
                    value={assistantName}
                    onChange={(e) => setAssistantName(e.target.value)}
                    placeholder="Prénom Nom (minimum 2 mots)"
                    disabled={loading}
                    autoFocus
                    required={selectedAssistantId === 'new'}
                  />
                  <small style={{ fontSize: '12px', color: '#8A8A8F', marginTop: '4px' }}>
                    Exemple: Ilyes Moussaoui
                  </small>
                </div>
              )}

              <div className="button-group">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => {
                    setShowAssistantNamePrompt(false)
                    setPendingUser(null)
                    setAssistantName('')
                    setSelectedAssistantId('new')
                    setExistingAssistants([])
                    setPassword('')
                  }}
                  disabled={loading}
                >
                  Retour
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Connexion...' : 'Continuer'}
                </button>
              </div>
            </form>
          </>
        ) : (
          // Normal Login
          <>
            <h1>Bon Retour</h1>
            <p className="subtitle">Connectez-vous pour continuer</p>
            
            {error && <div className="error-message">{error}</div>}
            
            {users.length === 0 ? (
              <div className="no-users-message">
                <p>Chargement des utilisateurs...</p>
              </div>
            ) : (
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label htmlFor="user-select">Sélectionner un utilisateur</label>
                  <select
                    id="user-select"
                    value={selectedEmail}
                    onChange={(e) => setSelectedEmail(e.target.value)}
                    disabled={loading}
                    required
                  >
                    {users.map((user) => (
                      <option key={user.id} value={user.email}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="password">Mot de passe</label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Entrez votre mot de passe"
                    disabled={loading}
                    required
                  />
                </div>

                <div className="button-group">
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Connexion...' : 'Se connecter'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Login
