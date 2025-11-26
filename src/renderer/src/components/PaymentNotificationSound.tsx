import React, { useEffect, useRef } from 'react'
import { usePaymentNotificationStore } from '../store/paymentNotificationStore'

const PaymentNotificationSound: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const newPayments = usePaymentNotificationStore((state) => state.newPayments)

  useEffect(() => {
    if (!audioRef.current) return

    if (newPayments.length > 0) {
      // Play notification sound in loop
      audioRef.current.loop = true
      audioRef.current.play().catch((error) => {
        console.error('Failed to play payment notification sound:', error)
      })
    } else {
      // Stop notification sound
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [newPayments.length])

  // Simple beep sound using Web Audio API fallback
  const beepSound = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZWBAJT6vm7KtcFQxDpN/yxG8iCDN+zPLaizsGHnHD8N+UQwoUZLnq66xaFQxIqOHyvmwhBTGH0fPTgjMGHm7A7+OZWBAJT6vm7KtcFQxDpN/yxG8iCDN+zPLaizsGHnHD8N+UQwoUZLnq66xaFQxIqOHyvmwhBTGH0fPTgjMGHm7A7+OZWBAJT6vm7KtcFQxDpN/yxG8iCDN+zPLaizsGHnHD8N+UQwoUZLnq66xaFQxIqOHyvmwhBTGH0fPTgjMGHm7A7+OZWBAJT6vm7KtcFQxDpN/yxG8iCDN+zPLaizsGHnHD8N+UQwoUZLnq66xaFQxIqOHyvmwhBTGH0fPTgjMGHm7A7+OZWBAJT6vm7KtcFQxDpN/yxG8iCDN+zPLaizsGHnHD8N+UQwoUZLnq66xaFQxIqOHyvmwhBTGH0fPTgjMGHm7A7+OZWBAJT6vm7KtcFQxDpN/yxG8iCDN+zPLaizsGHnHD8N+UQwoUZLnq66xaFQxIqOHyvmwhBTGH0fPTgjMGHm7A7+OZWBAJT6vm7KtcFQxDpN/yxG8iCDN+zPLaizsGHnHD8N+UQwoUZLnq66xaFQxIqOHy'

  return (
    <audio
      ref={audioRef}
      src={beepSound}
      preload="auto"
    />
  )
}

export default PaymentNotificationSound
