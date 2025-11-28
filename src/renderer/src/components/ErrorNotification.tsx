import React, { useEffect, useState } from 'react'

interface ErrorMessage {
  title: string
  message: string
}

export const ErrorNotification: React.FC = () => {
  const [error, setError] = useState<ErrorMessage | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Listen for error messages from main process
    const handleError = (errorData: ErrorMessage) => {
      console.log('❌ Error notification received:', errorData)
      setError(errorData)
      setVisible(true)

      // Auto-hide after 8 seconds
      setTimeout(() => {
        setVisible(false)
        setTimeout(() => setError(null), 300)
      }, 8000)
    }

    window.electronAPI.network.onShowError(handleError)

    return () => {
      // Cleanup if needed
    }
  }, [])

  if (!error) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: visible ? '20px' : '-200px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)',
        color: 'white',
        padding: '20px 30px',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        maxWidth: '600px',
        minWidth: '400px',
        transition: 'top 0.3s ease-out',
        border: '2px solid rgba(255, 255, 255, 0.2)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
        <div style={{ fontSize: '32px', lineHeight: '1' }}>⚠️</div>
        <div style={{ flex: 1 }}>
          <h3
            style={{
              margin: '0 0 10px 0',
              fontSize: '18px',
              fontWeight: 'bold',
            }}
          >
            {error.title}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              lineHeight: '1.6',
              whiteSpace: 'pre-line',
              opacity: 0.95,
            }}
          >
            {error.message}
          </p>
        </div>
        <button
          onClick={() => {
            setVisible(false)
            setTimeout(() => setError(null), 300)
          }}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            color: 'white',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s',
          }}
          onMouseOver={(e) =>
            (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)')
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')
          }
        >
          ×
        </button>
      </div>
    </div>
  )
}
