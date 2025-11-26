import React, { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../store/authStore'

interface DoctorPatientNotificationSoundProps {
  onSoundPlayed?: () => void
}

const DoctorPatientNotificationSound: React.FC<DoctorPatientNotificationSoundProps> = ({ onSoundPlayed }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { user } = useAuthStore()
  const [isPlaying, setIsPlaying] = useState(false)
  const [activePatients, setActivePatients] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Only play sound for nurses
    if (user?.role !== 'nurse') return

    const checkForNewDoctorPatients = async () => {
      try {
        const result = await window.electronAPI.queue.getQueue(user.id, user.role)
        if (result?.success && result.queue) {
          // Filter for patients sent by doctors (with actionType)
          const fromDoctorPatients = result.queue.filter((item: any) => 
            item.actionType && item.status === 'pending'
          )
          
          // Track new patients
          const currentPatientKeys = new Set(
            fromDoctorPatients.map((item: any) => `${item.patientCode}-${item.id}`)
          )
          
          // Check if there are new patients
          const hasNewPatients = fromDoctorPatients.some((item: any) => {
            const key = `${item.patientCode}-${item.id}`
            return !activePatients.has(key)
          })
          
          if (hasNewPatients && !isPlaying) {
            // Play notification sound
            playNotificationSound()
            setActivePatients(currentPatientKeys)
          } else if (fromDoctorPatients.length === 0) {
            // Stop sound if no pending patients from doctors
            stopNotificationSound()
            setActivePatients(new Set())
          }
        }
      } catch (error) {
        console.error('Error checking for doctor patients:', error)
      }
    }

    // Check immediately and then every 3 seconds
    checkForNewDoctorPatients()
    const interval = setInterval(checkForNewDoctorPatients, 3000)

    return () => {
      clearInterval(interval)
      stopNotificationSound()
    }
  }, [user, activePatients, isPlaying])

  const playNotificationSound = () => {
    if (!audioRef.current) {
      // Create audio element with a notification sound
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBCuBzvLZijYGHGS57OScTgwOUKzj8LZiHAU7k9Xx0H4wBCR/zPPaizsIFmm56OihUBELTKXh8LtrIQUoj9Hz1Yo3CRxiu+7mp0sKDla07OihUg0MW6rn8LJfGwU0ktnzzXkxByN+ze/gkz4GE2K58OWmVRAKTanfysRrIAUqgsjy3Y48BxRlve/rnEYKDVus5OurWBcGPJbe88p2KgUjhMzy2Io3Chhqvu3op1MRDVWq3+yxYCEMVa7W3aJJHh0+eMXS0G4TEW+/5/XNgBwHNZnb78t0KAUuhc/s15.2CBBU1ZPJ57JYGAUyidXzzocxBCmFz/PaizsIF2G58+WfUhEKS6Ti8L1pIweJzvbUjjkGFWK66OukWB0KUIzh8L9uIAUml83w3Yo4Ch5dturmlkwKDlOv5vCuWxwGPJHb8s58LAUihM3u45MwCBRlve3onEwJDVOu4e63YSEFLofP89yROwcVZ7/o76hVFgxNo93rsGEfCDyY3/PGdScEJIXQ8tyOOwcWaLzv5ZVHCA1cqOnr0VA0JUanX8L1rIAcHSaY1/HMdSYGK4fQ8tiJOAkZbFho=')
      audioRef.current.loop = true
      audioRef.current.volume = 0.5
    }
    
    audioRef.current.play().catch((error) => {
      console.error('Error playing notification sound:', error)
    })
    
    setIsPlaying(true)
    onSoundPlayed?.()
  }

  const stopNotificationSound = () => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  // Also stop sound when patient is clicked/viewed
  useEffect(() => {
    const handlePatientViewed = (event: CustomEvent) => {
      const { patientCode } = event.detail
      setActivePatients((prev) => {
        const newSet = new Set(prev)
        // Remove all entries for this patient
        Array.from(newSet).forEach(key => {
          if (key.startsWith(`${patientCode}-`)) {
            newSet.delete(key)
          }
        })
        
        // Stop sound if no more active patients
        if (newSet.size === 0) {
          stopNotificationSound()
        }
        
        return newSet
      })
    }

    window.addEventListener('patientViewed' as any, handlePatientViewed as any)
    return () => {
      window.removeEventListener('patientViewed' as any, handlePatientViewed as any)
    }
  }, [])

  return null
}

export default DoctorPatientNotificationSound
