import React, { useState, useEffect } from 'react'
import PatientTable from './PatientTable'
import CreatePatientModal from './CreatePatientModal'
import EditPatientModal from './EditPatientModal'
import RoomBasedSendMessageModal from './RoomBasedSendMessageModal'
import RoomBasedReceiveMessageModal from './RoomBasedReceiveMessageModal'
import HonorairesModal from './HonorairesModal'
import ComptabiliteDuJour from './ComptabiliteDuJour'
import PaymentJournalLog from './PaymentJournalLog'
import PaymentNotificationModal from './PaymentNotificationModal'
import NotificationSound from './NotificationSound'
import PaymentNotificationSound from './PaymentNotificationSound'
import DoctorPatientNotificationSound from './DoctorPatientNotificationSound'
import LogoutButton from './LogoutButton'
import SendToRoomModal from './SendToRoomModal'
import UrgentSendModal from './UrgentSendModal'
import PatientQueueDisplay from './PatientQueueDisplay'
import NurseQueueDisplay from './NurseQueueDisplay'
import RoomQueueModal from './RoomQueueModal'
import UserSwitchModal from './UserSwitchModal'
import { useMessageStore } from '../store/messageStore'
import { useAuthStore } from '../store/authStore'
import { usePaymentNotificationStore } from '../store/paymentNotificationStore'
import { useNotificationStore } from '../store/notificationStore'
import { playLoopingSound, stopLoopingSound, playNotificationSound } from '../utils/notificationSound'
import './PatientManagementLayout.css'

interface Patient {
  id: number
  recordNumber?: number
  departmentCode?: number
  firstName: string
  lastName: string
  fullName: string
  age?: number
  dateOfBirth?: Date
  address?: string
  phone?: string
  code?: string
  gender?: string
  usefulInfo?: string
  photo1?: string
  generalHistory?: string
  ophthalmoHistory?: string
  createdAt: Date
  updatedAt: Date
  originalCreatedDate?: string
}

const PatientManagementLayout: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null)
  const [error, setError] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [isSearching, setIsSearching] = useState<boolean>(false)
  const [autocompleteSuggestion, setAutocompleteSuggestion] = useState<string>('')
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [totalPatients, setTotalPatients] = useState<number>(0)
  const ITEMS_PER_PAGE = 100 // Server-side page size
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false)
  const [showEditModal, setShowEditModal] = useState<boolean>(false)
  const [isSendModalOpen, setIsSendModalOpen] = useState<boolean>(false)
  const [isReceivedMessagesOpen, setIsReceivedMessagesOpen] = useState<boolean>(false)
  const [isHonorairesModalOpen, setIsHonorairesModalOpen] = useState<boolean>(false)
  const [isComptabiliteOpen, setIsComptabiliteOpen] = useState<boolean>(false)
  const [isPaymentJournalOpen, setIsPaymentJournalOpen] = useState<boolean>(false)
  const [isPaymentNotificationOpen, setIsPaymentNotificationOpen] = useState<boolean>(false)
  const [isSendToRoomOpen, setIsSendToRoomOpen] = useState<boolean>(false)
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null)
  const [roomQueues, setRoomQueues] = useState<{[key: number]: { regular: any[], urgent: any[], fromDoctor: any[] }}>({
    1: { regular: [], urgent: [], fromDoctor: [] },
    2: { regular: [], urgent: [], fromDoctor: [] },
    3: { regular: [], urgent: [], fromDoctor: [] }
  })
  const [selectedRoomQueue, setSelectedRoomQueue] = useState<number | null>(null)
  const [isRoomQueueModalOpen, setIsRoomQueueModalOpen] = useState(false)
  const [selectedListFilter, setSelectedListFilter] = useState<'all' | 'regular' | 'urgent' | 'fromDoctor'>('all')
  const [isNurseQueueOpen, setIsNurseQueueOpen] = useState<boolean>(false)
  const [isUserSwitchOpen, setIsUserSwitchOpen] = useState<boolean>(false)
  const [isUrgentModalOpen, setIsUrgentModalOpen] = useState<boolean>(false)

  // Message store and auth
  const { newMessages, addMessage } = useMessageStore()
  const { user: currentUser } = useAuthStore()
  const { addPayment, checkAndClearDaily, newPayments } = usePaymentNotificationStore()
  const [lastPaymentCheck, setLastPaymentCheck] = useState<Date>(new Date())
  
  // Notification store
  const { 
    dilatationNotifications, 
    hasUnreadMessages,
    hasUnreadPayments,
    clearDilatationNotification,
    setUnreadMessages,
    setUnreadPayments
  } = useNotificationStore()
  
  // Check and clear payment notifications daily
  useEffect(() => {
    // Clear any persisted payment data from localStorage (old data cleanup)
    try {
      localStorage.removeItem('payment-notifications-storage')
    } catch (e) {
      console.error('Failed to clear old payment storage:', e)
    }
    
    checkAndClearDaily()
  }, [])
  
  // F5 keyboard shortcut for nurse to open Comptabilité
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'F5' && currentUser?.role === 'nurse') {
        e.preventDefault()
        setIsComptabiliteOpen(true)
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentUser])
  
  // Play sound when ANY of the 3 nurse conditions are true OR 1 doctor condition
  useEffect(() => {
    const shouldPlaySound = () => {
      if (currentUser?.role === 'nurse') {
        // Nurse: 3 conditions
        const hasAnyDilatation = Object.values(dilatationNotifications).some(count => count > 0)
        return hasUnreadMessages || hasAnyDilatation || hasUnreadPayments
      } else if (currentUser?.role === 'doctor' || currentUser?.role === 'assistant_1' || currentUser?.role === 'assistant_2') {
        // Doctor/Assistant: 1 condition only (messages from nurse)
        return hasUnreadMessages
      }
      return false
    }
    
    if (shouldPlaySound()) {
      playLoopingSound()
    } else {
      stopLoopingSound()
    }
    
    return () => stopLoopingSound()
  }, [hasUnreadMessages, dilatationNotifications, hasUnreadPayments, currentUser])
  
  // Track new messages for notification
  useEffect(() => {
    if (newMessages.length > 0) {
      setUnreadMessages(true)
    }
  }, [newMessages])
  
  // Track new payments for notification  
  useEffect(() => {
    if (newPayments.length > 0 && currentUser?.role === 'nurse') {
      setUnreadPayments(true)
    }
  }, [newPayments, currentUser])
  
  // Track new dilatation patients and update notification counts
  const [prevDilatationCounts, setPrevDilatationCounts] = useState<{[key: number]: number}>({ 1: 0, 2: 0, 3: 0 })
  
  useEffect(() => {
    if (currentUser?.role === 'nurse') {
      // Check each room for new dilatation patients
      [1, 2, 3].forEach((roomId) => {
        const currentCount = roomQueues[roomId]?.fromDoctor?.length || 0
        const prevCount = prevDilatationCounts[roomId] || 0
        
        if (currentCount > prevCount) {
          // New dilatation patient(s) detected
          const newPatients = currentCount - prevCount
          for (let i = 0; i < newPatients; i++) {
            playNotificationSound()
          }
          // Add to notification badge
          useNotificationStore.getState().addDilatationNotification(roomId)
        }
      })
      
      // Update previous counts
      setPrevDilatationCounts({
        1: roomQueues[1]?.fromDoctor?.length || 0,
        2: roomQueues[2]?.fromDoctor?.length || 0,
        3: roomQueues[3]?.fromDoctor?.length || 0
      })
    }
  }, [roomQueues, currentUser])

  // Function to fetch room queue data for nurses and doctors
  const fetchRoomQueues = async () => {
    if (currentUser?.role === 'nurse' || currentUser?.role === 'doctor' || currentUser?.role === 'assistant_1' || currentUser?.role === 'assistant_2') {
      try {
        let allQueueItems: any[] = []
        
        if (currentUser.role === 'nurse') {
          // Nurses see TWO types of queue items:
          // 1. Items they sent to rooms (nurse->doctor)
          const sentResult = await window.electronAPI.queue.getSentItems(currentUser.id)
          if (sentResult?.success) {
            // Filter out completed items - only show active ones
            const sentItems = (sentResult.items || []).filter((item: any) => 
              item.status === 'pending' || item.status === 'seen'
            )
            allQueueItems = [...allQueueItems, ...sentItems]
          }
          
          // 2. Items sent by doctors to nurses (doctor->nurse with S, D, G, ODG)
          const nurseQueueResult = await window.electronAPI.queue.getQueue(currentUser.id, currentUser.role)
          if (nurseQueueResult?.success) {
            const fromDoctorItems = (nurseQueueResult.queue || [])
            console.log('Items from doctors:', fromDoctorItems)
            allQueueItems = [...allQueueItems, ...fromDoctorItems]
          }
        } else {
          // Doctors/assistants see items sent to them
          const result = await window.electronAPI.queue.getQueue(currentUser.id, currentUser.role)
          if (result?.success) {
            allQueueItems = result.queue || []
          }
        }
        
        // Group by roomId and categorize by type
        const newRoomQueues: {[key: number]: { regular: any[], urgent: any[], fromDoctor: any[] }} = { 
          1: { regular: [], urgent: [], fromDoctor: [] },
          2: { regular: [], urgent: [], fromDoctor: [] },
          3: { regular: [], urgent: [], fromDoctor: [] }
        }
        const seenItems = new Set<string>()
        
        allQueueItems.forEach((item: any) => {
          // Create unique key to avoid duplicates
          const uniqueKey = `${item.patientCode}-${item.roomId}-${item.id}`
          
          // For items from doctors to nurses (actionType exists), ensure roomId is valid
          const roomId = item.roomId && item.roomId > 0 ? item.roomId : 
                        (item.actionType ? 1 : item.roomId) // Default to room 1 for doctor->nurse items without room
          
          if (roomId && newRoomQueues[roomId] && 
              (item.status === 'pending' || item.status === 'seen') &&
              !seenItems.has(uniqueKey)) {
            seenItems.add(uniqueKey)
            
            // Categorize based on type
            if (item.actionType) {
              // This is from doctor to nurse (S, D, G, ODG)
              console.log(`Adding doctor->nurse item to room ${roomId}:`, item)
              newRoomQueues[roomId].fromDoctor.push(item)
            } else if (item.isUrgent) {
              // This is an urgent patient
              newRoomQueues[roomId].urgent.push(item)
            } else {
              // Regular patient
              newRoomQueues[roomId].regular.push(item)
            }
          } else if (item.actionType && currentUser.role === 'nurse') {
            // For nurse, show all doctor->nurse items even without valid roomId
            console.log('Doctor->nurse item without valid room, adding to room 1:', item)
            const defaultRoom = 1
            if (!seenItems.has(uniqueKey)) {
              seenItems.add(uniqueKey)
              newRoomQueues[defaultRoom].fromDoctor.push(item)
            }
          }
        })
        
        console.log('Final room queues:', newRoomQueues)
        setRoomQueues(newRoomQueues)
      } catch (error) {
        console.error('Error fetching room queues:', error)
      }
    }
  }

  // Setup message listener with role-based pop-up logic
  useEffect(() => {
    const processedTimestamps = new Set<number>()
    
    const cleanup = window.electronAPI.messaging.onNewMessage((message) => {
      // Prevent duplicate messages by checking timestamp
      if (processedTimestamps.has(message.timestamp)) {
        console.log('Duplicate message detected, skipping:', message.timestamp)
        return
      }
      
      processedTimestamps.add(message.timestamp)
      
      // Add message to store
      addMessage(message)

      // Role-based auto pop-up: If doctor sends to nurse, force modal open
      if (message.senderRole === 'doctor' && currentUser?.role === 'nurse') {
        setIsReceivedMessagesOpen(true)
      }
      // For all other cases, do nothing (manual click required)
    })

    return () => {
      cleanup()
    }
  }, [addMessage, currentUser])

  // Setup payment notification polling for nurses
  useEffect(() => {
    if (currentUser?.role !== 'nurse') return

    const checkForNewPayments = async () => {
      try {
        const result = await window.electronAPI.payments.getAll({
          status: 'completed'
        })
        
        if (result?.success) {
          const recentPayments = result.payments || []
          // Find payments validated after our last check
          const newPayments = recentPayments.filter((p: any) => 
            new Date(p.validatedAt) > lastPaymentCheck
          )
          
          // Add new payments to store to trigger sound
          newPayments.forEach((p: any) => {
            addPayment({
              id: p.id,
              patientName: p.patientName,
              doctorName: p.validatedBy,
              totalAmount: p.totalAmount,
              timestamp: p.validatedAt
            })
          })
          
          // Update last check time
          setLastPaymentCheck(new Date())
        }
      } catch (error) {
        console.error('Error checking for new payments:', error)
      }
    }

    // Check every 10 seconds
    const interval = setInterval(checkForNewPayments, 10000)
    
    // Initial check
    checkForNewPayments()

    return () => clearInterval(interval)
  }, [currentUser, lastPaymentCheck, addPayment])

  // Load first page of patients and total count on mount
  useEffect(() => {
    fetchTotalCount()
    fetchPatients()
  }, [])
  
  // Fetch patients when page changes (if not searching)
  useEffect(() => {
    if (!searchTerm.trim()) {
      fetchPatients()
    }
  }, [currentPage])
  
  // Fast search - show ALL results in table as you type
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        searchPatients(searchTerm)
      } else {
        // Reset to page 1 and fetch fresh data
        setAutocompleteSuggestion('')
        if (currentPage !== 1) {
          setCurrentPage(1)
        } else {
          fetchPatients()
        }
      }
    }, 150) // 150ms for instant feel
    
    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  // Fetch room queues for nurses and doctors - poll every 5 seconds
  useEffect(() => {
    if (currentUser?.role === 'nurse' || currentUser?.role === 'doctor' || currentUser?.role === 'assistant_1' || currentUser?.role === 'assistant_2') {
      fetchRoomQueues() // Initial fetch
      const interval = setInterval(() => {
        fetchRoomQueues()
      }, 5000) // Poll every 5 seconds
      return () => clearInterval(interval)
    }
  }, [currentUser])
  
  const searchPatients = async (term: string) => {
    setIsSearching(true)
    setError('')
    
    try {
      const result = await (window.electronAPI as any)?.db.patients.search(term)
      if (result?.success) {
        const matchedPatients = result.patients || []
        
        // Show ALL results in the table
        setPatients(matchedPatients)
        setCurrentPage(1)
        
        // Generate inline autocomplete suggestion
        if (matchedPatients.length > 0) {
          const topMatch = matchedPatients[0]
          const fullName = `${topMatch.firstName} ${topMatch.lastName}`.toLowerCase()
          const searchLower = term.toLowerCase().trim()
          
          // If search term matches the beginning of the full name
          if (fullName.startsWith(searchLower)) {
            // Suggest the rest of the name
            setAutocompleteSuggestion(fullName)
          } 
          // If searching only first name, suggest adding last name
          else if (topMatch.firstName.toLowerCase().startsWith(searchLower)) {
            setAutocompleteSuggestion(`${topMatch.firstName} ${topMatch.lastName}`.toLowerCase())
          }
          // If searching only last name, suggest adding first name
          else if (topMatch.lastName.toLowerCase().startsWith(searchLower)) {
            setAutocompleteSuggestion(`${topMatch.firstName} ${topMatch.lastName}`.toLowerCase())
          }
          else {
            setAutocompleteSuggestion('')
          }
        } else {
          setAutocompleteSuggestion('')
        }
      } else {
        setError(result?.error || 'Échec de la recherche')
        setPatients([])
        setAutocompleteSuggestion('')
      }
    } catch (err: any) {
      console.error('Error searching patients:', err)
      setError(err.message || 'Échec de la recherche')
      setPatients([])
      setAutocompleteSuggestion('')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Accept suggestion with Tab or Right Arrow
    if ((e.key === 'Tab' || e.key === 'ArrowRight') && autocompleteSuggestion) {
      e.preventDefault()
      setSearchTerm(autocompleteSuggestion)
      setAutocompleteSuggestion('')
    }
  }


  
  // Pagination calculations
  const DISPLAY_PER_PAGE = 100 // Display 100 rows per page for better performance
  const totalPages = searchTerm.trim() 
    ? Math.ceil(patients.length / DISPLAY_PER_PAGE) 
    : Math.ceil(totalPatients / ITEMS_PER_PAGE)
  
  const displayedPatients = searchTerm.trim()
    ? patients.slice((currentPage - 1) * DISPLAY_PER_PAGE, currentPage * DISPLAY_PER_PAGE)
    : patients
  
  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
    
    // Scroll to top of table
    const tableArea = document.querySelector('.table-area')
    if (tableArea) {
      tableArea.scrollTop = 0
    }
  }
  
  const fetchTotalCount = async () => {
    try {
      const result = await (window.electronAPI as any)?.db.patients.getCount()
      if (result?.success) {
        setTotalPatients(result.count || 0)
      }
    } catch (err: any) {
      console.error('Error fetching patient count:', err)
    }
  }
  
  const fetchPatients = async () => {
    setError('')
    setIsSearching(true)
    
    try {
      const offset = (currentPage - 1) * ITEMS_PER_PAGE
      const result = await (window.electronAPI as any)?.db.patients.getAll(ITEMS_PER_PAGE, offset)
      
      if (result?.success) {
        setPatients(result.patients || [])
      } else {
        setError(result?.error || 'Échec du chargement des patients')
        setPatients([])
      }
    } catch (err: any) {
      console.error('Error fetching patients:', err)
      setError(err.message || 'Échec du chargement des patients')
      setPatients([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleCreatePatient = () => {
    setShowCreateModal(true)
  }

  const handleEditPatient = () => {
    if (selectedPatientId) {
      setShowEditModal(true)
    }
  }

  const handleDelete = async () => {
    if (!selectedPatientId) return

    const patient = patients.find(p => p.id === selectedPatientId)
    const confirmMessage = `Êtes-vous sûr de vouloir supprimer le patient :\n\n${patient?.firstName} ${patient?.lastName} ?\n\nCette action est irréversible.`
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const result = await (window.electronAPI as any)?.db.patients.delete(selectedPatientId)
      
      if (result?.success) {
        setSelectedPatientId(null)
        fetchPatients()
        alert('Patient supprimé avec succès')
      } else {
        alert(`Erreur : ${result?.error || 'Échec de la suppression'}`)
      }
    } catch (err: any) {
      console.error('Error deleting patient:', err)
      alert(`Erreur : ${err.message}`)
    }
  }

  const handlePatientCreated = () => {
    setShowCreateModal(false)
    fetchPatients()
  }

  const handlePatientUpdated = () => {
    setShowEditModal(false)
    setSelectedPatientId(null)
    fetchPatients()
  }

  const selectedPatient = patients.find(p => p.id === selectedPatientId)

  return (
    <div className="patient-management-layout">
      {/* Sidebar */}
      <aside className="patient-sidebar">
        <div className="sidebar-header">
          <img src="/thaziri logo" alt="Thaziri Logo" className="sidebar-logo" />
          {currentUser && (
            <div style={{ 
              marginTop: '10px', 
              padding: '8px', 
              backgroundColor: '#F1F1F1', 
              borderRadius: '8px',
              fontSize: '13px',
              color: '#202020'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>👤 Utilisateur:</div>
              <div style={{ color: '#429898' }}>
                {currentUser.assistantName || currentUser.name}
              </div>
            </div>
          )}
        </div>
        
        <div className="sidebar-actions">
          <button 
            className="action-btn-compact create-btn"
            onClick={handleCreatePatient}
            title="Créer un nouveau patient"
          >
            ➕ Nouveau
          </button>

          <button 
            className="action-btn-compact edit-btn"
            onClick={handleEditPatient}
            disabled={selectedPatientId === null}
            title="Modifier le patient sélectionné"
          >
            ✏️ Modifier
          </button>

          {currentUser?.role === 'nurse' && (
            <>
              <button 
                className="action-btn-compact room-btn"
                onClick={() => { setSelectedRoom(1); setIsSendToRoomOpen(true) }}
                disabled={selectedPatientId === null}
                title="Envoyer le patient vers la salle 1"
                style={{ background: '#429898' }}
              >
                🚪 Envoyer en Salle 1
              </button>
              
              <button 
                className="action-btn-compact room-btn"
                onClick={() => { setSelectedRoom(2); setIsSendToRoomOpen(true) }}
                disabled={selectedPatientId === null}
                title="Envoyer le patient vers la salle 2"
                style={{ background: '#429898' }}
              >
                🚪 Envoyer en Salle 2
              </button>
              
              <button 
                className="action-btn-compact room-btn"
                onClick={() => { setSelectedRoom(3); setIsSendToRoomOpen(true) }}
                disabled={selectedPatientId === null}
                title="Envoyer le patient vers la salle 3"
                style={{ background: '#429898' }}
              >
                🚪 Envoyer en Salle 3
              </button>
              
              <button 
                className="action-btn-compact urgent-btn"
                onClick={() => setIsUrgentModalOpen(true)}
                disabled={selectedPatientId === null}
                title="Envoyer le patient en urgence"
                style={{ 
                  background: '#DC3545',
                  color: 'white',
                  fontWeight: 'bold' 
                }}
              >
                🚨 Urgence
              </button>
            </>
          )}


          <button 
            className="action-btn-compact delete-btn"
            disabled={selectedPatientId === null}
            onClick={handleDelete}
            title="Supprimer le patient sélectionné"
          >
            🗑️ Supprimer
          </button>

          {currentUser?.role !== 'admin' && (
            <button 
              className="action-btn-compact send-btn"
              onClick={() => setIsSendModalOpen(true)}
              title="Envoyer un message"
            >
              📨 Envoyer un message
            </button>
          )}

          <button 
            className="action-btn-compact received-btn"
            onClick={() => {
              setIsReceivedMessagesOpen(true)
              setUnreadMessages(false)
            }}
            title="Messages reçus"
            style={{ position: 'relative' }}
          >
            <span>📬 Messages Reçus</span>
            {newMessages.length > 0 && (
              <span className="message-badge">{newMessages.length}</span>
            )}
            {hasUnreadMessages && (
              <span style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                background: '#DC3545',
                color: 'white',
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
                animation: 'pulse 1s infinite'
              }}>
                !
              </span>
            )}
          </button>

          <button 
            className="action-btn-compact honoraires-btn"
            onClick={() => setIsHonorairesModalOpen(true)}
            title="Gestion des honoraires"
          >
            💰 Honoraires
          </button>

          <button 
            className="action-btn-compact comptabilite-btn"
            onClick={() => setIsComptabiliteOpen(true)}
            title="Comptabilité du jour"
          >
            📊 Comptabilité du Jour
          </button>

          {currentUser?.role === 'admin' && (
            <button 
              className="action-btn-compact journal-btn"
              onClick={() => setIsPaymentJournalOpen(true)}
              title="Journal des paiements"
              style={{ background: '#ff9800' }}
            >
              📋 Journal Paiements
            </button>
          )}

          {currentUser?.role === 'nurse' && (
            <button 
              className="action-btn-compact notification-btn"
              onClick={() => {
                setIsPaymentNotificationOpen(true)
                setUnreadPayments(false)
              }}
              title="Notifications de paiement"
              style={{ background: '#429898', position: 'relative' }}
            >
              🔔 Notifications
              {hasUnreadPayments && (
                <span style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  background: '#DC3545',
                  color: 'white',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  animation: 'pulse 1s infinite'
                }}>
                  !
                </span>
              )}
            </button>
          )}

          {currentUser?.role !== 'admin' && (
            <button 
              className="action-btn-compact"
              onClick={() => setIsUserSwitchOpen(true)}
              title="Changer d'utilisateur"
              style={{ background: '#429898', color: 'white' }}
            >
              🔄 Changer d'Utilisateur
            </button>
          )}
          
          <div className="logout-section">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="patient-main-content">
        {/* Room Overview for Nurses - Above everything */}
        {currentUser && currentUser.role === 'nurse' && (
          <div className="nurse-rooms-overview">
            <div className="room-section">
              <h3 style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <div>
                  🚪 Salle 1 
                  <span style={{fontSize: '14px', fontWeight: 'normal', marginLeft: '10px'}}>
                    (Total: {(roomQueues[1]?.regular?.length || 0) + (roomQueues[1]?.urgent?.length || 0) + (roomQueues[1]?.fromDoctor?.length || 0)} | 
                    Normal: {roomQueues[1]?.regular?.length || 0} | 
                    Urgent: {roomQueues[1]?.urgent?.length || 0} | 
                    Dilatation: {roomQueues[1]?.fromDoctor?.length || 0})
                  </span>
                </div>
                <div style={{fontSize: '32px', fontWeight: 'bold', color: '#2A6484', marginRight: '20px'}}>
                  {(roomQueues[1]?.regular?.length || 0) + (roomQueues[1]?.urgent?.length || 0)}
                  <span style={{fontSize: '12px', fontWeight: 'normal', display: 'block', textAlign: 'center'}}>En Attente</span>
                </div>
              </h3>
              <div className="room-content">
                <div className="patient-list-section" onClick={() => {
                  if (roomQueues[1].regular.length > 0) {
                    setSelectedRoomQueue(1)
                    setSelectedListFilter('regular')
                    setIsRoomQueueModalOpen(true)
                  }
                }}>
                  <div className="patient-list-header">
                    📋 En attente consultation
                    <span style={{fontSize: '11px', color: '#666'}}>{roomQueues[1].regular.length}</span>
                  </div>
                  <div 
                    className={`patient-preview ${roomQueues[1].regular.length === 0 ? 'empty' : 'clickable'}`}
                  >
                    {roomQueues[1].regular.length === 0 ? (
                      <span className="no-patients">Aucun patient</span>
                    ) : (
                      <>
                        <span className="patient-name">{roomQueues[1].regular[0].patientName}</span>
                        {roomQueues[1].regular.length > 1 && (
                          <span className="patient-count">(+{roomQueues[1].regular.length - 1} autres)</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="patient-list-section" onClick={() => {
                  if (roomQueues[1].fromDoctor.length > 0) {
                    clearDilatationNotification(1)
                    setSelectedRoomQueue(1)
                    setSelectedListFilter('fromDoctor')
                    setIsRoomQueueModalOpen(true)
                  }
                }} style={{ position: 'relative' }}>
                  <div className="patient-list-header">
                    💊 Dilatation
                    <span style={{fontSize: '11px', color: '#666'}}>{roomQueues[1].fromDoctor.length}</span>
                    {dilatationNotifications[1] > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: '#DC3545',
                        color: 'white',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        animation: 'pulse 1s infinite'
                      }}>
                        {dilatationNotifications[1]}
                      </span>
                    )}
                  </div>
                  <div 
                    className={`patient-preview ${roomQueues[1].fromDoctor.length === 0 ? 'empty' : 'clickable'}`}
                  >
                    {roomQueues[1].fromDoctor.length === 0 ? (
                      <span className="no-patients">Aucun patient</span>
                    ) : (
                      <>
                        <span className="patient-name">{roomQueues[1].fromDoctor[0].patientName}</span>
                        {roomQueues[1].fromDoctor.length > 1 && (
                          <span className="patient-count">(+{roomQueues[1].fromDoctor.length - 1} autres)</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="patient-list-section" onClick={() => {
                  if (roomQueues[1].urgent.length > 0) {
                    setSelectedRoomQueue(1)
                    setSelectedListFilter('urgent')
                    setIsRoomQueueModalOpen(true)
                  }
                }}>
                  <div className="patient-list-header urgent-header">
                    🚨 Urgences
                    <span style={{fontSize: '11px', color: '#DC3545'}}>{roomQueues[1].urgent.length}</span>
                  </div>
                  <div 
                    className={`patient-preview urgent ${roomQueues[1].urgent.length === 0 ? 'empty' : 'clickable'}`}
                  >
                    {roomQueues[1].urgent.length === 0 ? (
                      <span className="no-patients">Aucun patient urgent</span>
                    ) : (
                      <>
                        <span className="patient-name urgent-name">{roomQueues[1].urgent[0].patientName}</span>
                        {roomQueues[1].urgent.length > 1 && (
                          <span className="patient-count">(+{roomQueues[1].urgent.length - 1} urgents)</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="room-section">
              <h3 style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <div>
                  🚪 Salle 2 
                  <span style={{fontSize: '14px', fontWeight: 'normal', marginLeft: '10px'}}>
                    (Total: {(roomQueues[2]?.regular?.length || 0) + (roomQueues[2]?.urgent?.length || 0) + (roomQueues[2]?.fromDoctor?.length || 0)} | 
                    Normal: {roomQueues[2]?.regular?.length || 0} | 
                    Urgent: {roomQueues[2]?.urgent?.length || 0} | 
                    Dilatation: {roomQueues[2]?.fromDoctor?.length || 0})
                  </span>
                </div>
                <div style={{fontSize: '32px', fontWeight: 'bold', color: '#2A6484', marginRight: '20px'}}>
                  {(roomQueues[2]?.regular?.length || 0) + (roomQueues[2]?.urgent?.length || 0)}
                  <span style={{fontSize: '12px', fontWeight: 'normal', display: 'block', textAlign: 'center'}}>En Attente</span>
                </div>
              </h3>
              <div className="room-content">
                <div className="patient-list-section" onClick={() => {
                  if (roomQueues[2].regular.length > 0) {
                    setSelectedRoomQueue(2)
                    setSelectedListFilter('regular')
                    setIsRoomQueueModalOpen(true)
                  }
                }}>
                  <div className="patient-list-header">
                    📋 En attente consultation
                    <span style={{fontSize: '11px', color: '#666'}}>{roomQueues[2].regular.length}</span>
                  </div>
                  <div 
                    className={`patient-preview ${roomQueues[2].regular.length === 0 ? 'empty' : 'clickable'}`}
                  >
                    {roomQueues[2].regular.length === 0 ? (
                      <span className="no-patients">Aucun patient</span>
                    ) : (
                      <>
                        <span className="patient-name">{roomQueues[2].regular[0].patientName}</span>
                        {roomQueues[2].regular.length > 1 && (
                          <span className="patient-count">(+{roomQueues[2].regular.length - 1} autres)</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="patient-list-section" onClick={() => {
                  if (roomQueues[2].fromDoctor.length > 0) {
                    clearDilatationNotification(2)
                    setSelectedRoomQueue(2)
                    setSelectedListFilter('fromDoctor')
                    setIsRoomQueueModalOpen(true)
                  }
                }} style={{ position: 'relative' }}>
                  <div className="patient-list-header">
                    💊 Dilatation
                    <span style={{fontSize: '11px', color: '#666'}}>{roomQueues[2].fromDoctor.length}</span>
                    {dilatationNotifications[2] > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: '#DC3545',
                        color: 'white',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        animation: 'pulse 1s infinite'
                      }}>
                        {dilatationNotifications[2]}
                      </span>
                    )}
                  </div>
                  <div 
                    className={`patient-preview ${roomQueues[2].fromDoctor.length === 0 ? 'empty' : 'clickable'}`}
                  >
                    {roomQueues[2].fromDoctor.length === 0 ? (
                      <span className="no-patients">Aucun patient</span>
                    ) : (
                      <>
                        <span className="patient-name">{roomQueues[2].fromDoctor[0].patientName}</span>
                        {roomQueues[2].fromDoctor.length > 1 && (
                          <span className="patient-count">(+{roomQueues[2].fromDoctor.length - 1} autres)</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="patient-list-section" onClick={() => {
                  if (roomQueues[2].urgent.length > 0) {
                    setSelectedRoomQueue(2)
                    setSelectedListFilter('urgent')
                    setIsRoomQueueModalOpen(true)
                  }
                }}>
                  <div className="patient-list-header urgent-header">
                    🚨 Urgences
                    <span style={{fontSize: '11px', color: '#DC3545'}}>{roomQueues[2].urgent.length}</span>
                  </div>
                  <div 
                    className={`patient-preview urgent ${roomQueues[2].urgent.length === 0 ? 'empty' : 'clickable'}`}
                  >
                    {roomQueues[2].urgent.length === 0 ? (
                      <span className="no-patients">Aucun patient urgent</span>
                    ) : (
                      <>
                        <span className="patient-name urgent-name">{roomQueues[2].urgent[0].patientName}</span>
                        {roomQueues[2].urgent.length > 1 && (
                          <span className="patient-count">(+{roomQueues[2].urgent.length - 1} urgents)</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="room-section">
              <h3 style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <div>
                  🚪 Salle 3 
                  <span style={{fontSize: '14px', fontWeight: 'normal', marginLeft: '10px'}}>
                    (Total: {(roomQueues[3]?.regular?.length || 0) + (roomQueues[3]?.urgent?.length || 0) + (roomQueues[3]?.fromDoctor?.length || 0)} | 
                    Normal: {roomQueues[3]?.regular?.length || 0} | 
                    Urgent: {roomQueues[3]?.urgent?.length || 0} | 
                    Dilatation: {roomQueues[3]?.fromDoctor?.length || 0})
                  </span>
                </div>
                <div style={{fontSize: '32px', fontWeight: 'bold', color: '#2A6484', marginRight: '20px'}}>
                  {(roomQueues[3]?.regular?.length || 0) + (roomQueues[3]?.urgent?.length || 0)}
                  <span style={{fontSize: '12px', fontWeight: 'normal', display: 'block', textAlign: 'center'}}>En Attente</span>
                </div>
              </h3>
              <div className="room-content">
                <div className="patient-list-section" onClick={() => {
                  if (roomQueues[3].regular.length > 0) {
                    setSelectedRoomQueue(3)
                    setSelectedListFilter('regular')
                    setIsRoomQueueModalOpen(true)
                  }
                }}>
                  <div className="patient-list-header">
                    📋 En attente consultation
                    <span style={{fontSize: '11px', color: '#666'}}>{roomQueues[3].regular.length}</span>
                  </div>
                  <div 
                    className={`patient-preview ${roomQueues[3].regular.length === 0 ? 'empty' : 'clickable'}`}
                  >
                    {roomQueues[3].regular.length === 0 ? (
                      <span className="no-patients">Aucun patient</span>
                    ) : (
                      <>
                        <span className="patient-name">{roomQueues[3].regular[0].patientName}</span>
                        {roomQueues[3].regular.length > 1 && (
                          <span className="patient-count">(+{roomQueues[3].regular.length - 1} autres)</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="patient-list-section" onClick={() => {
                  if (roomQueues[3].fromDoctor.length > 0) {
                    clearDilatationNotification(3)
                    setSelectedRoomQueue(3)
                    setSelectedListFilter('fromDoctor')
                    setIsRoomQueueModalOpen(true)
                  }
                }} style={{ position: 'relative' }}>
                  <div className="patient-list-header">
                    💊 Dilatation
                    <span style={{fontSize: '11px', color: '#666'}}>{roomQueues[3].fromDoctor.length}</span>
                    {dilatationNotifications[3] > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: '#DC3545',
                        color: 'white',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        animation: 'pulse 1s infinite'
                      }}>
                        {dilatationNotifications[3]}
                      </span>
                    )}
                  </div>
                  <div 
                    className={`patient-preview ${roomQueues[3].fromDoctor.length === 0 ? 'empty' : 'clickable'}`}
                  >
                    {roomQueues[3].fromDoctor.length === 0 ? (
                      <span className="no-patients">Aucun patient</span>
                    ) : (
                      <>
                        <span className="patient-name">{roomQueues[3].fromDoctor[0].patientName}</span>
                        {roomQueues[3].fromDoctor.length > 1 && (
                          <span className="patient-count">(+{roomQueues[3].fromDoctor.length - 1} autres)</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="patient-list-section" onClick={() => {
                  if (roomQueues[3].urgent.length > 0) {
                    setSelectedRoomQueue(3)
                    setSelectedListFilter('urgent')
                    setIsRoomQueueModalOpen(true)
                  }
                }}>
                  <div className="patient-list-header urgent-header">
                    🚨 Urgences
                    <span style={{fontSize: '11px', color: '#DC3545'}}>{roomQueues[3].urgent.length}</span>
                  </div>
                  <div 
                    className={`patient-preview urgent ${roomQueues[3].urgent.length === 0 ? 'empty' : 'clickable'}`}
                  >
                    {roomQueues[3].urgent.length === 0 ? (
                      <span className="no-patients">Aucun patient urgent</span>
                    ) : (
                      <>
                        <span className="patient-name urgent-name">{roomQueues[3].urgent[0].patientName}</span>
                        {roomQueues[3].urgent.length > 1 && (
                          <span className="patient-count">(+{roomQueues[3].urgent.length - 1} urgents)</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Room Overview for Doctors/Assistants - Single room full width */}
        {currentUser && (currentUser.role === 'doctor' || currentUser.role === 'assistant_1' || currentUser.role === 'assistant_2') && (
          <div className="doctor-room-overview">
            <div className="doctor-room-section">
              <h3 style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <div>
                  🚪 Salle {(currentUser as any).currentSalleId || (currentUser as any).salleId || '?'} - Patients en attente
                  <span style={{fontSize: '14px', fontWeight: 'normal', marginLeft: '10px'}}>
                    {(() => {
                      const doctorRoom = (currentUser as any).currentSalleId || (currentUser as any).salleId || (currentUser as any).salle || (currentUser as any).roomId || 1
                      const roomQueue = roomQueues[doctorRoom] || { regular: [], urgent: [], fromDoctor: [] }
                      const total = (roomQueue.regular?.length || 0) + (roomQueue.urgent?.length || 0) + (roomQueue.fromDoctor?.length || 0)
                      return `(Total: ${total} | Normal: ${roomQueue.regular?.length || 0} | Urgent: ${roomQueue.urgent?.length || 0} | Envoyés: ${roomQueue.fromDoctor?.length || 0})`
                    })()}
                  </span>
                </div>
                <div style={{fontSize: '32px', fontWeight: 'bold', color: '#2A6484', marginRight: '20px'}}>
                  {(() => {
                    const doctorRoom = (currentUser as any).currentSalleId || (currentUser as any).salleId || (currentUser as any).salle || (currentUser as any).roomId || 1
                    const roomQueue = roomQueues[doctorRoom] || { regular: [], urgent: [], fromDoctor: [] }
                    return (roomQueue.regular?.length || 0) + (roomQueue.urgent?.length || 0)
                  })()}
                  <span style={{fontSize: '12px', fontWeight: 'normal', display: 'block', textAlign: 'center'}}>En Attente</span>
                </div>
              </h3>
              <div className="doctor-room-content">
                {/* Show the doctor's room queues - all 3 lists */}
                {(() => {
                  // Get doctor's room from their user data (try different possible properties)
                  const doctorRoom = (currentUser as any).currentSalleId || (currentUser as any).salleId || (currentUser as any).salle || (currentUser as any).roomId || 1
                  const roomQueue = roomQueues[doctorRoom] || { regular: [], urgent: [], fromDoctor: [] }
                  
                  return (
                    <div className="doctor-queue-lists">
                      {/* Regular queue */}
                      <div className="patient-list-section" onClick={() => {
                        if (roomQueue.regular.length > 0) {
                          setSelectedRoomQueue(doctorRoom)
                          setSelectedListFilter('regular')
                          setIsRoomQueueModalOpen(true)
                        }
                      }}>
                        <div className="patient-list-header">
                          📋 En attente consultation
                          <span style={{fontSize: '11px', color: '#666'}}>{roomQueue.regular.length}</span>
                        </div>
                        <div 
                          className={`patient-preview ${roomQueue.regular.length === 0 ? 'empty' : 'clickable'}`}
                        >
                          {roomQueue.regular.length === 0 ? (
                            <span className="no-patients">Aucun patient</span>
                          ) : (
                            <>
                              <span className="patient-name">{roomQueue.regular[0].patientName}</span>
                              {roomQueue.regular.length > 1 && (
                                <span className="patient-count">(+{roomQueue.regular.length - 1} autres)</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Urgent queue */}
                      <div className="patient-list-section" onClick={() => {
                        if (roomQueue.urgent.length > 0) {
                          setSelectedRoomQueue(doctorRoom)
                          setSelectedListFilter('urgent')
                          setIsRoomQueueModalOpen(true)
                        }
                      }}>
                        <div className="patient-list-header urgent-header">
                          🚨 Urgences
                          <span style={{fontSize: '11px', color: '#DC3545'}}>{roomQueue.urgent.length}</span>
                        </div>
                        <div 
                          className={`patient-preview urgent ${roomQueue.urgent.length === 0 ? 'empty' : 'clickable'}`}
                        >
                          {roomQueue.urgent.length === 0 ? (
                            <span className="no-patients">Aucun patient urgent</span>
                          ) : (
                            <>
                              <span className="patient-name urgent-name">{roomQueue.urgent[0].patientName}</span>
                              {roomQueue.urgent.length > 1 && (
                                <span className="patient-count">(+{roomQueue.urgent.length - 1} urgents)</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* From Doctor queue - for doctors to see what they sent to nurse */}
                      <div className="patient-list-section" onClick={() => {
                        if (roomQueue.fromDoctor.length > 0) {
                          setSelectedRoomQueue(doctorRoom)
                          setSelectedListFilter('fromDoctor')
                          setIsRoomQueueModalOpen(true)
                        }
                      }}>
                        <div className="patient-list-header">
                          💊 Envoyés à l'infirmière
                          <span style={{fontSize: '11px', color: '#666'}}>{roomQueue.fromDoctor.length}</span>
                        </div>
                        <div 
                          className={`patient-preview ${roomQueue.fromDoctor.length === 0 ? 'empty' : 'clickable'}`}
                        >
                          {roomQueue.fromDoctor.length === 0 ? (
                            <span className="no-patients">Aucun patient</span>
                          ) : (
                            <>
                              <span className="patient-name">{roomQueue.fromDoctor[0].patientName}</span>
                              {roomQueue.fromDoctor.length > 1 && (
                                <span className="patient-count">(+{roomQueue.fromDoctor.length - 1} autres)</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Top white space - 40% */}
        <div className="top-space">
          {/* Patient Queue Display for Doctors/Assistants - DISABLED, using room display instead */}
          {currentUser && (currentUser.role === 'doctor' || currentUser.role === 'assistant_1' || currentUser.role === 'assistant_2') && false && (
            <PatientQueueDisplay />
          )}
          
          {/* Original Nurse Queue Display - Hidden for now */}
          {currentUser && currentUser.role === 'nurse' && false && (
            <NurseQueueDisplay 
              isOpen={isNurseQueueOpen}
              onClose={() => setIsNurseQueueOpen(!isNurseQueueOpen)}
            />
          )}
          
          {/* Search Bar with Inline Autocomplete */}
          <div className="search-container-simple">
            <div className="search-input-wrapper">
              {/* Autocomplete suggestion (gray text) */}
              {autocompleteSuggestion && (
                <div className="autocomplete-suggestion">
                  <span className="invisible-text">{searchTerm}</span>
                  <span className="suggestion-text">
                    {autocompleteSuggestion.substring(searchTerm.length)}
                  </span>
                </div>
              )}
              
              {/* Actual input */}
              <input
                type="text"
                className="search-input-simple"
                placeholder="🔍 Rechercher un patient (prénom, nom, code)..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  if (!e.target.value.trim()) {
                    setAutocompleteSuggestion('')
                  }
                }}
                onKeyDown={handleSearchKeyDown}
                autoComplete="off"
              />
            </div>
            
            {isSearching && (
              <div className="search-loading">
                <span className="spinner">⏳</span>
              </div>
            )}
            {searchTerm && (
              <button 
                className="clear-search-btn"
                onClick={() => {
                  setSearchTerm('')
                  setAutocompleteSuggestion('')
                }}
                title="Effacer la recherche"
              >
                ✕
              </button>
            )}
          </div>
          
          {/* Results Info */}
          <div className="results-info">
            {searchTerm.trim() ? (
              <span>
                {patients.length} résultat{patients.length !== 1 ? 's' : ''} trouvé{patients.length !== 1 ? 's' : ''}
              </span>
            ) : (
              <span>
                {totalPatients.toLocaleString('fr-FR')} patient{totalPatients !== 1 ? 's' : ''} au total
                {totalPages > 1 && ` • Page ${currentPage} sur ${totalPages}`}
              </span>
            )}
          </div>
        </div>

        {/* Table Area - 60% */}
        <div className="table-area">
          {error ? (
            <div className="error-state">
              <p>❌ {error}</p>
              <button onClick={() => setError('')}>OK</button>
            </div>
          ) : patients.length === 0 && searchTerm.trim() && !isSearching ? (
            <div className="empty-state">
              <p>😕 Aucun patient trouvé pour "{searchTerm}"</p>
            </div>
          ) : patients.length === 0 && !searchTerm.trim() && !isSearching ? (
            <div className="empty-state">
              <p>Aucun patient dans la base de données</p>
            </div>
          ) : (
            <>
              <PatientTable
                patients={displayedPatients}
                selectedPatientId={selectedPatientId}
                onPatientSelect={setSelectedPatientId}
              />
              
              {/* Enhanced Pagination Controls */}
              {totalPages > 1 && (
                <div className="pagination-controls">
                  <button 
                    className="pagination-btn"
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                    title="Première page"
                  >
                    ⏮ Premier
                  </button>
                  
                  <button 
                    className="pagination-btn"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    title="Page précédente"
                  >
                    ◀ Précédent
                  </button>
                  
                  {/* Page number input */}
                  <div className="pagination-info">
                    <span>Page</span>
                    <input
                      type="number"
                      className="page-input"
                      min={1}
                      max={totalPages}
                      value={currentPage}
                      onChange={(e) => {
                        const page = parseInt(e.target.value)
                        if (page >= 1 && page <= totalPages) {
                          goToPage(page)
                        }
                      }}
                    />
                    <span>sur {totalPages.toLocaleString('fr-FR')}</span>
                  </div>
                  
                  <button 
                    className="pagination-btn"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    title="Page suivante"
                  >
                    Suivant ▶
                  </button>
                  
                  <button 
                    className="pagination-btn"
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                    title="Dernière page"
                  >
                    Dernier ⏭
                  </button>
                  
                  {/* Quick jump buttons */}
                  {totalPages > 10 && (
                    <div className="quick-jump">
                      <button 
                        className="pagination-btn-small"
                        onClick={() => goToPage(currentPage - 10)}
                        disabled={currentPage <= 10}
                        title="Reculer de 10 pages"
                      >
                        -10
                      </button>
                      <button 
                        className="pagination-btn-small"
                        onClick={() => goToPage(currentPage + 10)}
                        disabled={currentPage > totalPages - 10}
                        title="Avancer de 10 pages"
                      >
                        +10
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Modals */}
      <CreatePatientModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onPatientCreated={handlePatientCreated}
      />

      <EditPatientModal
        patient={selectedPatient || { id: 0, firstName: '', lastName: '', fullName: '', createdAt: new Date(), updatedAt: new Date() }}
        isOpen={showEditModal && !!selectedPatient}
        onClose={() => setShowEditModal(false)}
        onPatientUpdated={handlePatientUpdated}
      />

      <RoomBasedSendMessageModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
      />

      <RoomBasedReceiveMessageModal
        isOpen={isReceivedMessagesOpen}
        onClose={() => setIsReceivedMessagesOpen(false)}
      />

      <HonorairesModal
        isOpen={isHonorairesModalOpen}
        onClose={() => setIsHonorairesModalOpen(false)}
      />

      <ComptabiliteDuJour
        isOpen={isComptabiliteOpen}
        onClose={() => setIsComptabiliteOpen(false)}
      />

      <PaymentJournalLog
        isOpen={isPaymentJournalOpen}
        onClose={() => setIsPaymentJournalOpen(false)}
      />

      <PaymentNotificationModal
        isOpen={isPaymentNotificationOpen}
        onClose={() => setIsPaymentNotificationOpen(false)}
      />

      {selectedPatient && selectedPatient.departmentCode && (
        <>
          <SendToRoomModal
            isOpen={isSendToRoomOpen}
            onClose={() => setIsSendToRoomOpen(false)}
            patient={{
              id: selectedPatient.id,
              departmentCode: selectedPatient.departmentCode,
              firstName: selectedPatient.firstName,
              lastName: selectedPatient.lastName
            }}
            targetRoom={selectedRoom || undefined}
          />
          
          <UrgentSendModal
            isOpen={isUrgentModalOpen}
            onClose={() => setIsUrgentModalOpen(false)}
            patient={{
              id: selectedPatient.id,
              departmentCode: selectedPatient.departmentCode,
              firstName: selectedPatient.firstName,
              lastName: selectedPatient.lastName
            }}
          />
        </>
      )}

      <RoomQueueModal
        isOpen={isRoomQueueModalOpen}
        onClose={() => setIsRoomQueueModalOpen(false)}
        roomNumber={selectedRoomQueue || 1}
        queueItems={selectedRoomQueue ? [
          ...(roomQueues[selectedRoomQueue]?.regular || []),
          ...(roomQueues[selectedRoomQueue]?.urgent || []),
          ...(roomQueues[selectedRoomQueue]?.fromDoctor || [])
        ] : []}
        onRefresh={fetchRoomQueues}
        initialFilter={selectedListFilter}
      />

      <UserSwitchModal
        isOpen={isUserSwitchOpen}
        onClose={() => setIsUserSwitchOpen(false)}
        onUserSwitched={() => {
          // User switching will reload the page, so no additional action needed
        }}
      />

      {/* Notification Sound */}
      <NotificationSound />
      
      {/* Payment Notification Sound for Nurses */}
      {currentUser?.role === 'nurse' && <PaymentNotificationSound />}
      
      {/* Doctor Patient Notification Sound for Nurses */}
      {currentUser?.role === 'nurse' && <DoctorPatientNotificationSound />}
    </div>
  )
}

export default PatientManagementLayout
