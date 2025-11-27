import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ Error Boundary Caught Error:', error)
    console.error('❌ Error Info:', errorInfo)
    
    this.setState({
      error,
      errorInfo
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '40px',
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#F8F9FA',
          color: '#202020'
        }}>
          <div style={{
            maxWidth: '600px',
            width: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              fontSize: '48px',
              textAlign: 'center',
              marginBottom: '20px'
            }}>
              ⚠️
            </div>
            
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#DC3545',
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              Une erreur s'est produite
            </h2>
            
            <p style={{
              fontSize: '16px',
              color: '#666',
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              L'application a rencontré un problème. Veuillez recharger la page.
            </p>

            {this.state.error && (
              <div style={{
                backgroundColor: '#FFF3CD',
                border: '1px solid #FFE69C',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
                fontSize: '14px',
                color: '#664D03',
                fontFamily: 'monospace',
                maxHeight: '200px',
                overflow: 'auto'
              }}>
                <strong>Erreur:</strong> {this.state.error.toString()}
                {this.state.errorInfo && (
                  <details style={{ marginTop: '12px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                      Détails techniques
                    </summary>
                    <pre style={{ 
                      marginTop: '8px', 
                      fontSize: '12px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#FFFFFF',
                  backgroundColor: '#429898',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2A6484'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#429898'}
              >
                🔄 Recharger la page
              </button>
              
              <button
                onClick={this.handleReset}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#666',
                  backgroundColor: '#F1F1F1',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E0E0E0'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F1F1F1'}
              >
                Réessayer
              </button>
            </div>

            <div style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: '#E7F3FF',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#004085'
            }}>
              <strong>💡 Conseil:</strong> Si le problème persiste:
              <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                <li>Vérifiez votre connexion réseau</li>
                <li>Assurez-vous que la base de données est accessible</li>
                <li>Redémarrez l'application</li>
              </ul>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
