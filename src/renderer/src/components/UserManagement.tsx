import React, { useState, useEffect } from 'react'
import CreateUserForm from './CreateUserForm'
import UserEditModal from './UserEditModal'
import './UserManagement.css'

interface User {
  id: number
  email: string
  name: string
  role: string
  defaultPercentage?: number | null
  createdAt: Date
  updatedAt: Date
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [templates, setTemplates] = useState<User[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Fetch all users on component mount
  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError('')
      console.log('Fetching users...')
      const userList = await window.electronAPI?.db.users.getAll()
      console.log('Fetched users:', userList)
      
      // Separate templates from real users
      // Templates are Assistant 1 and Assistant 2 with specific placeholder names
      const templateNames = ['Assistant 1', 'Assistant 2']
      const userTemplates = userList.filter((u: any) => templateNames.includes(u.name))
      const realUsers = userList.filter((u: any) => !templateNames.includes(u.name))
      
      setTemplates(userTemplates)
      setUsers(realUsers)
    } catch (err) {
      console.error('Failed to fetch users:', err)
      setError('Échec de chargement des utilisateurs')
    } finally {
      setLoading(false)
    }
  }

  const handleUserCreated = () => {
    console.log('handleUserCreated called - re-fetching users')
    // Re-fetch users after successful creation
    fetchUsers()
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setIsModalOpen(true)
  }

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      return
    }

    try {
      await window.electronAPI?.db.users.delete(userId)
      // Re-fetch users to update the table
      fetchUsers()
    } catch (err) {
      console.error('Failed to delete user:', err)
      alert('Échec de suppression de l\'utilisateur')
    }
  }

  const handleUserUpdated = () => {
    setIsModalOpen(false)
    setSelectedUser(null)
    // Re-fetch users to ensure table displays updated information
    fetchUsers()
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedUser(null)
  }

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h2>👥 Gestion des Utilisateurs</h2>
        <p>Gérer les médecins et les infirmières</p>
      </div>

      {/* Create User Form */}
      <CreateUserForm onUserCreated={handleUserCreated} />

      {/* Error Message */}
      {error && <div className="error-message">{error}</div>}

      {/* Loading State */}
      {loading ? (
        <div className="loading">Chargement des utilisateurs...</div>
      ) : (
        <>
          {/* Templates Section */}
          {templates.length > 0 && (
            <div className="templates-section" style={{ marginBottom: '40px' }}>
              <h3 style={{ color: '#2A6484', marginBottom: '16px' }}>
                🔑 Modèles de Connexion (Assistants)
              </h3>
              <p style={{ fontSize: '14px', color: '#8A8A8F', marginBottom: '16px' }}>
                Ces comptes permettent aux assistants de se connecter. Le mot de passe et le pourcentage par défaut s'appliquent aux nouveaux utilisateurs.
              </p>
              <div className="users-table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Modèle</th>
                      <th>Rôle</th>
                      <th>Pourcentage par défaut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((template: any) => (
                      <tr key={template.id} style={{ backgroundColor: '#F8F9FA' }}>
                        <td>
                          <strong>{template.name}</strong>
                          <span style={{ marginLeft: '8px', fontSize: '12px', color: '#429898' }}>
                            (Modèle)
                          </span>
                        </td>
                        <td>
                          <span className={`role-badge role-${template.role}`}>
                            {template.role}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: '#2A6484' }}>
                            {template.defaultPercentage || 0}%
                          </strong>
                        </td>
                        <td className="actions-cell">
                          <button
                            className="btn-edit"
                            onClick={() => handleEditUser(template)}
                          >
                            ✏️ Modifier
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Real Users Section */}
          <div className="users-section">
            <h3 style={{ color: '#2A6484', marginBottom: '16px' }}>
              👥 Utilisateurs Réels
            </h3>
            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Rôle</th>
                    <th>Pourcentage</th>
                    <th>Créé le</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="no-users">
                        Aucun utilisateur trouvé. Créez un nouvel utilisateur pour commencer.
                      </td>
                    </tr>
                  ) : (
                    users.map((user: any) => (
                      <tr key={user.id}>
                        <td>{user.name}</td>
                        <td>
                          <span className={`role-badge role-${user.role}`}>
                            {user.role}
                          </span>
                        </td>
                        <td>
                          {(user.role === 'assistant_1' || user.role === 'assistant_2') 
                            ? `${user.defaultPercentage || 0}%` 
                            : '-'}
                        </td>
                        <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                        <td className="actions-cell">
                          <button
                            className="btn-edit"
                            onClick={() => handleEditUser(user)}
                          >
                            ✏️ Modifier
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            🗑️ Supprimer
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Edit User Modal */}
      {isModalOpen && selectedUser && (
        <UserEditModal
          user={selectedUser}
          onClose={handleModalClose}
          onUserUpdated={handleUserUpdated}
        />
      )}
    </div>
  )
}

export default UserManagement
