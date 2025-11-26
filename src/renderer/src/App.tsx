import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import './App.css'
import Login from './Login'
import AdminDashboard from './components/AdminDashboard'
import DoctorDashboard from './components/DoctorDashboard'
import NurseDashboard from './components/NurseDashboard'
import PatientDetailsView from './components/PatientDetailsView'
import NewVisitPage from './components/NewVisitPage'
import OrdonnancePage from './components/OrdonnancePage'
// import HiIlyesPage from './components/HiIlyesPage' // Kept for reference but not used
import FloatingAIChat from './components/FloatingAIChat'
import MessageListener from './components/MessageListener'
// import FloatingMessagingButtons from './components/FloatingMessagingButtons' // Removed floating messaging buttons
import { useAuthStore } from './store/authStore'

function App() {
  // Get authentication state from Zustand store
  const { user, isAuthenticated } = useAuthStore()
  
  // Add hydration state to prevent flash
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Wait for Zustand to hydrate from localStorage
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      setIsHydrated(true)
    })
    
    // If already hydrated, set immediately
    if (useAuthStore.persist.hasHydrated()) {
      setIsHydrated(true)
    }
    
    return unsubscribe
  }, [])

  // Show loading screen while hydrating to prevent flash
  if (!isHydrated) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#FFFFFF',
        color: '#2A6484',
        fontSize: '18px',
        fontWeight: 600
      }}>
        <div>
          <div style={{ marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: 'bold',
              marginBottom: '8px',
              color: '#2A6484'
            }}>
              Thaziri
            </div>
          </div>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #F1F1F1',
            borderTop: '4px solid #429898',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    )
  }

  // Protected route wrapper component
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />
    }
    return <>{children}</>
  }

  // Role-based dashboard component
  const Dashboard = () => {
    if (!user) return <Navigate to="/login" replace />

    // Conditionally render dashboard based on user role
    switch (user.role) {
      case 'admin':
        return <AdminDashboard />
      case 'doctor':
      case 'assistant_1':
      case 'assistant_2':
        return <DoctorDashboard />
      case 'nurse':
        return <NurseDashboard />
      default:
        return <NurseDashboard />
    }
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <Router>
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      </Router>
    )
  }
  
  // Main authenticated app
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/patient/:patientId" 
          element={
            <ProtectedRoute>
              <PatientDetailsView />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/new-visit/:patientId" 
          element={
            <ProtectedRoute>
              <NewVisitPage />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/ordonnance" 
          element={
            <ProtectedRoute>
              <OrdonnancePage />
            </ProtectedRoute>
          }
        />
      </Routes>
      {/* Message Listener for room-based messaging */}
      <MessageListener />
      {/* Floating AI Chat for doctors and assistants */}
      <FloatingAIChat />
      {/* Floating Messaging Buttons removed */}
    </Router>
  )
}

export default App