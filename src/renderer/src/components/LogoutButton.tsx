import React from 'react'
import { useAuthStore } from '../store/authStore'
import './LogoutButton.css'

const LogoutButton: React.FC = () => {
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)

  const handleLogout = async () => {
    console.log('🚪 Logout initiated for user:', user)
    
    // Unlock all salles for this user
    if (user) {
      try {
        console.log('🔓 Attempting to unlock salles for user:', user.id)
        const result = await window.electronAPI.db.salles.unlockUserSalles(user.id)
        console.log('✅ Unlock result:', result)
      } catch (error) {
        console.error('❌ Failed to unlock salles:', error)
      }
    }
    
    // Stop broadcasting user presence
    try {
      const networkAPI = (window.electronAPI as any)?.network
      if (networkAPI) {
        await networkAPI.stopBroadcasting()
        console.log('✅ Stopped broadcasting user presence')
      }
    } catch (error) {
      console.error('❌ Failed to stop network broadcast:', error)
    }
    
    // Logout user
    console.log('🚪 Logging out user...')
    logout()
  }

  return (
    <button className="logout-button" onClick={handleLogout}>
      🚪 Déconnexion
    </button>
  )
}

export default LogoutButton
