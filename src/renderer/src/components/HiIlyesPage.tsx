import React from 'react'
import { useNavigate } from 'react-router-dom'

const HiIlyesPage: React.FC = () => {
  const navigate = useNavigate()

  const handleBack = () => {
    navigate(-1) // Go back to previous page
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #2A6484 0%, #429898 100%)',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        background: 'white',
        color: '#2A6484',
        padding: '40px 60px',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
        textAlign: 'center',
        maxWidth: '500px',
        margin: '20px'
      }}>
        <h1 style={{
          fontSize: '48px',
          margin: '0 0 20px 0',
          fontWeight: '700'
        }}>
          Hi Ilyes! 👋
        </h1>
        
        <p style={{
          fontSize: '18px',
          margin: '0 0 30px 0',
          color: '#666'
        }}>
          Welcome to your custom page!
        </p>

        <button 
          onClick={handleBack}
          style={{
            background: 'linear-gradient(135deg, #2A6484 0%, #429898 100%)',
            color: 'white',
            border: 'none',
            padding: '15px 30px',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(42, 100, 132, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)'
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(42, 100, 132, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(42, 100, 132, 0.3)'
          }}
        >
          ← Go Back
        </button>
      </div>
    </div>
  )
}

export default HiIlyesPage
