import React, { useEffect, useState } from 'react'
import './NetworkUserList.css'

interface NetworkUser {
  userId: number
  username: string
  role: string
  ipAddress: string
  messagingPort: number
  lastSeen: number
}

// Type assertion for network API
const getNetworkAPI = () => {
  return (window.electronAPI as any)?.network
}

const NetworkUserList: React.FC = () => {
  const [activeUsers, setActiveUsers] = useState<NetworkUser[]>([])
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const networkAPI = getNetworkAPI()
    if (!networkAPI) return

    // Fetch initial list
    networkAPI.getActiveUsers()
      ?.then((users: NetworkUser[]) => {
        setActiveUsers(users)
      })
      .catch((error: unknown) => {
        console.error('Error fetching active users:', error)
      })

    // Listen for real-time updates
    const cleanup = networkAPI.onUsersUpdate((users: NetworkUser[]) => {
      setActiveUsers(users)
    })

    // Cleanup listener on unmount
    return cleanup
  }, [])

  const getRoleBadgeClass = (role: string): string => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'role-badge role-admin'
      case 'doctor':
        return 'role-badge role-doctor'
      case 'nurse':
        return 'role-badge role-nurse'
      default:
        return 'role-badge'
    }
  }

  const getRoleLabel = (role: string): string => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'Administrateur'
      case 'doctor':
        return 'Docteur'
      case 'nurse':
        return 'Infirmier(ère)'
      default:
        return role
    }
  }

  const getTimeSinceLastSeen = (lastSeen: number): string => {
    const seconds = Math.floor((Date.now() - lastSeen) / 1000)
    
    if (seconds < 10) return 'À l\'instant'
    if (seconds < 60) return `Il y a ${seconds}s`
    
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `Il y a ${minutes}min`
    
    const hours = Math.floor(minutes / 60)
    return `Il y a ${hours}h`
  }

  return (
    <div className="network-user-list">
      <div 
        className="network-header" 
        onClick={() => setIsExpanded(!isExpanded)}
        title="Cliquez pour afficher/masquer"
      >
        <div className="network-header-content">
          <svg 
            className="network-icon" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
            <line x1="12" y1="2" x2="12" y2="9" />
            <line x1="12" y1="15" x2="12" y2="22" />
            <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
            <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
            <line x1="2" y1="12" x2="9" y2="12" />
            <line x1="15" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
            <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
          </svg>
          <span className="network-title">
            Utilisateurs en ligne
          </span>
          <span className="user-count-badge">
            {activeUsers.length}
          </span>
        </div>
        <svg 
          className={`chevron-icon ${isExpanded ? 'expanded' : ''}`}
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {isExpanded && (
        <div className="network-body">
          {activeUsers.length === 0 ? (
            <div className="empty-state">
              <svg 
                width="48" 
                height="48" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor"
                strokeWidth="1.5"
                opacity="0.3"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <p>Aucun autre utilisateur connecté</p>
            </div>
          ) : (
            <ul className="user-list">
              {activeUsers.map((user) => (
                <li key={user.userId} className="user-item">
                  <div className="user-info">
                    <div className="user-avatar">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-details">
                      <div className="user-name">{user.username}</div>
                      <div className="user-meta">
                        <span className={getRoleBadgeClass(user.role)}>
                          {getRoleLabel(user.role)}
                        </span>
                        <span className="user-ip" title="Adresse IP">
                          {user.ipAddress}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="user-status">
                    <span 
                      className="status-indicator active" 
                      title={getTimeSinceLastSeen(user.lastSeen)}
                    />
                    <span className="last-seen">
                      {getTimeSinceLastSeen(user.lastSeen)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default NetworkUserList
