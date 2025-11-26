// Notification sound utility
export const playNotificationSound = () => {
  try {
    
    // Create new audio element with a beep sound (data URI)
    // This is a simple notification beep sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 800 // Frequency in Hz
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
    
  } catch (error) {
    console.error('Failed to play notification sound:', error)
  }
}

export const playLoopingSound = () => {
  try {
    // Stop any currently playing sound
    stopLoopingSound()
    
    const playBeep = () => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 900
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    }
    
    // Play immediately
    playBeep()
    
    // Set up interval to repeat
    const interval = setInterval(playBeep, 2000) // Every 2 seconds
    
    // Store interval ID for cleanup
    ;(window as any).__notificationInterval = interval
    
  } catch (error) {
    console.error('Failed to play looping sound:', error)
  }
}

export const stopLoopingSound = () => {
  if ((window as any).__notificationInterval) {
    clearInterval((window as any).__notificationInterval)
    ;(window as any).__notificationInterval = null
  }
}
