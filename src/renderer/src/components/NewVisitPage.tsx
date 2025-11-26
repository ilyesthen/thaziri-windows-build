import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useMessageStore } from '../store/messageStore'
import PaymentValidationModal from './PaymentValidationModal'
import RoomBasedSendMessageModal from './RoomBasedSendMessageModal'
import RoomBasedReceiveMessageModal from './RoomBasedReceiveMessageModal'
import GlassesPrescriptionModal from './GlassesPrescriptionModal'
import ContactLensModal from './ContactLensModal'
import {
  MOTIF_OPTIONS,
  CYCLOPLEGIE_OPTIONS,
  SV_RIGHT_OPTIONS,
  AV_RIGHT_OPTIONS,
  SV_LEFT_OPTIONS,
  AV_LEFT_OPTIONS,
  SPHERE_OPTIONS,
  CYLINDRE_OPTIONS,
  AXE_OPTIONS,
  GONIO_RIGHT_OPTIONS,
  GONIO_LEFT_OPTIONS,
  LAF_RIGHT_OPTIONS,
  LAF_LEFT_OPTIONS,
  FO_RIGHT_OPTIONS,
  FO_LEFT_OPTIONS,
  DIAG_OPTIONS,
  CONDUITE_SHORTCUTS
} from '../constants/visitExaminationOptions'
import './NewVisitPage.css'
import './FloatingMessagingButtons.css'

interface Patient {
  id: number
  departmentCode?: number
  firstName: string
  lastName: string
  age?: number
}

const NewVisitPage: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { newMessages } = useMessageStore()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastSaveTime, setLastSaveTime] = useState(0)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false) // Additional flag to prevent duplicate saves
  
  // Get params from URL
  const dateParam = searchParams.get('date')
  const visitIdParam = searchParams.get('visitId')
  const editParam = searchParams.get('edit')
  const [isEditMode, setIsEditMode] = useState(editParam === 'true')
  const [originalVisitId, setOriginalVisitId] = useState<number | null>(visitIdParam ? parseInt(visitIdParam) : null)
  
  const [dataLoaded, setDataLoaded] = useState(false)
  const [originalData, setOriginalData] = useState<any>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [existingPaymentId, setExistingPaymentId] = useState<number | null>(null)
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [isReceivedMessagesOpen, setIsReceivedMessagesOpen] = useState(false)
  const [showSendMessageModal, setShowSendMessageModal] = useState(false)
  const [showReceiveMessageModal, setShowReceiveMessageModal] = useState(false)
  
  // State for glasses prescription modal
  const [showGlassesPrescriptionModal, setShowGlassesPrescriptionModal] = useState(false)
  const [showContactLensModal, setShowContactLensModal] = useState(false)
  const [hasSavedOnce, setHasSavedOnce] = useState(false)
  const [wantsToNavigate, setWantsToNavigate] = useState(false)
  
  // Payment reminder tracking
  const [sessionPaymentValidated, setSessionPaymentValidated] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  
  // Form fields - all editable
  const [visitDate, setVisitDate] = useState<string>(
    dateParam || new Date().toISOString().split('T')[0]
  )
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [age, setAge] = useState('')
  
  // Motif field state
  const [motif, setMotif] = useState('')
  const [showMotifDropdown, setShowMotifDropdown] = useState(false)
  
  // Cycloplégie field state
  const [cycloplegie, setCycloplegie] = useState('')
  const [showCycloplegieDropdown, setShowCycloplegieDropdown] = useState(false)
  
  // Right Eye (OD) fields
  const [svRight, setSvRight] = useState('')
  const [showSvRightDropdown, setShowSvRightDropdown] = useState(false)
  const [avRight, setAvRight] = useState('')
  const [showAvRightDropdown, setShowAvRightDropdown] = useState(false)
  
  // Left Eye (OG) fields
  const [svLeft, setSvLeft] = useState('')
  const [showSvLeftDropdown, setShowSvLeftDropdown] = useState(false)
  const [avLeft, setAvLeft] = useState('')
  const [showAvLeftDropdown, setShowAvLeftDropdown] = useState(false)
  
  // Right Eye Refraction fields
  const [sphereRight, setSphereRight] = useState('')
  const [showSphereRightDropdown, setShowSphereRightDropdown] = useState(false)
  const [filteredSphereRightOptions, setFilteredSphereRightOptions] = useState<string[]>([])
  
  const [cylindreRight, setCylindreRight] = useState('')
  const [showCylindreRightDropdown, setShowCylindreRightDropdown] = useState(false)
  const [filteredCylindreRightOptions, setFilteredCylindreRightOptions] = useState<string[]>([])
  
  const [axeRight, setAxeRight] = useState('')
  const [showAxeRightDropdown, setShowAxeRightDropdown] = useState(false)
  const [filteredAxeRightOptions, setFilteredAxeRightOptions] = useState<string[]>([])
  
  const [vlRight, setVlRight] = useState('')
  
  // Left Eye Refraction fields
  const [sphereLeft, setSphereLeft] = useState('')
  const [showSphereLeftDropdown, setShowSphereLeftDropdown] = useState(false)
  const [filteredSphereLeftOptions, setFilteredSphereLeftOptions] = useState<string[]>([])
  
  const [cylindreLeft, setCylindreLeft] = useState('')
  const [showCylindreLeftDropdown, setShowCylindreLeftDropdown] = useState(false)
  const [filteredCylindreLeftOptions, setFilteredCylindreLeftOptions] = useState<string[]>([])
  
  const [axeLeft, setAxeLeft] = useState('')
  const [showAxeLeftDropdown, setShowAxeLeftDropdown] = useState(false)
  const [filteredAxeLeftOptions, setFilteredAxeLeftOptions] = useState<string[]>([])
  
  const [vlLeft, setVlLeft] = useState('')
  
  // K1, K2 fields for both eyes
  const [k1Right, setK1Right] = useState('')
  const [k2Right, setK2Right] = useState('')
  const [k1Left, setK1Left] = useState('')
  const [k2Left, setK2Left] = useState('')
  
  // ADDITION field
  const [addition, setAddition] = useState('')
  
  // R1, R2, R0, PACHY, T.O.C fields for both eyes
  const [r1Right, setR1Right] = useState('')
  const [r2Right, setR2Right] = useState('')
  const [r0Right, setR0Right] = useState('')
  const [pachyRight, setPachyRight] = useState('')
  const [tocRight, setTocRight] = useState('')
  
  const [r1Left, setR1Left] = useState('')
  const [r2Left, setR2Left] = useState('')
  const [r0Left, setR0Left] = useState('')
  const [pachyLeft, setPachyLeft] = useState('')
  const [tocLeft, setTocLeft] = useState('')
  
  // D.I.P field (only for left eye side)
  const [dip, setDip] = useState('')
  
  // Notes fields for both eyes
  const [notesRight, setNotesRight] = useState('')
  const [notesLeft, setNotesLeft] = useState('')
  
  // GONIO and T.O fields for both eyes
  const [gonioRight, setGonioRight] = useState('')
  const [showGonioRightDropdown, setShowGonioRightDropdown] = useState(false)
  const [filteredGonioRightOptions, setFilteredGonioRightOptions] = useState<string[]>([])
  
  const [toRight, setToRight] = useState('')
  const [gonioLeft, setGonioLeft] = useState('')
  const [showGonioLeftDropdown, setShowGonioLeftDropdown] = useState(false)
  const [filteredGonioLeftOptions, setFilteredGonioLeftOptions] = useState<string[]>([])
  
  const [toLeft, setToLeft] = useState('')
  
  // L.A.F and F.O fields for both eyes
  const [lafRight, setLafRight] = useState('')
  const [showLafRightDropdown, setShowLafRightDropdown] = useState(false)
  const [filteredLafRightOptions, setFilteredLafRightOptions] = useState<string[]>([])
  
  const [foRight, setFoRight] = useState('')
  const [showFoRightDropdown, setShowFoRightDropdown] = useState(false)
  const [filteredFoRightOptions, setFilteredFoRightOptions] = useState<string[]>([])
  
  const [lafLeft, setLafLeft] = useState('')
  const [showLafLeftDropdown, setShowLafLeftDropdown] = useState(false)
  const [filteredLafLeftOptions, setFilteredLafLeftOptions] = useState<string[]>([])
  
  const [foLeft, setFoLeft] = useState('')
  const [showFoLeftDropdown, setShowFoLeftDropdown] = useState(false)
  const [filteredFoLeftOptions, setFilteredFoLeftOptions] = useState<string[]>([])

  // CONDUITE À TENIR (Right Eye) and DIAG (Left Eye)
  const [conduiteATenir, setConduiteATenir] = useState('')
  const [diag, setDiag] = useState('')
  const [showDiagDropdown, setShowDiagDropdown] = useState(false)
  const [filteredDiagOptions, setFilteredDiagOptions] = useState<string[]>([])

  // Actes Généraux field state
  const [actesGeneraux, setActesGeneraux] = useState('')
  const [showActesGenerauxDropdown, setShowActesGenerauxDropdown] = useState(false)
  
  // Actes Ophtalmologiques field state
  const [actesOphtalmologiques, setActesOphtalmologiques] = useState('')
  const [showActesOphtalmologiquesDropdown, setShowActesOphtalmologiquesDropdown] = useState(false)
  
  // Dropdown options from constants - no more hardcoded arrays!
  const [filteredMotifOptions, setFilteredMotifOptions] = useState(MOTIF_OPTIONS)
  const [filteredCycloplegieOptions, setFilteredCycloplegieOptions] = useState(CYCLOPLEGIE_OPTIONS)
  const [filteredSvRightOptions, setFilteredSvRightOptions] = useState(SV_RIGHT_OPTIONS)
  const [filteredAvRightOptions, setFilteredAvRightOptions] = useState(AV_RIGHT_OPTIONS)
  const [filteredSvLeftOptions, setFilteredSvLeftOptions] = useState(SV_LEFT_OPTIONS)
  const [filteredAvLeftOptions, setFilteredAvLeftOptions] = useState(AV_LEFT_OPTIONS)
  
  const [actesGenerauxOptions, setActesGenerauxOptions] = useState<string[]>([])
  const [filteredActesGenerauxOptions, setFilteredActesGenerauxOptions] = useState<string[]>([])
  
  const [actesOphtalmologiquesOptions, setActesOphtalmologiquesOptions] = useState<string[]>([])
  const [filteredActesOphtalmologiquesOptions, setFilteredActesOphtalmologiquesOptions] = useState<string[]>([])

  // Auto-calculate VL for Right Eye
  useEffect(() => {
    if (sphereRight || cylindreRight || axeRight) {
      let formula = sphereRight
      if (cylindreRight && axeRight) {
        formula += ` (${cylindreRight} à ${axeRight}°)`
      } else if (cylindreRight) {
        formula += ` (${cylindreRight})`
      } else if (axeRight) {
        formula += ` (à ${axeRight}°)`
      }
      setVlRight(formula.trim())
    } else {
      setVlRight('')
    }
  }, [sphereRight, cylindreRight, axeRight])
  
    // Auto-calculate VL for Left Eye
  useEffect(() => {
    if (sphereLeft || cylindreLeft || axeLeft) {
      let formula = sphereLeft
      if (cylindreLeft && axeLeft) {
        formula += ` (${cylindreLeft} à ${axeLeft}°)`
      } else if (cylindreLeft) {
        formula += ` (${cylindreLeft})`
      } else if (axeLeft) {
        formula += ` (à ${axeLeft}°)`
      }
      setVlLeft(formula.trim())
    } else {
      setVlLeft('')
    }
  }, [sphereLeft, cylindreLeft, axeLeft])

  // Auto-calculate R1 from K1 for Right Eye
  useEffect(() => {
    if (k1Right) {
      const k1Value = parseFloat(k1Right)
      if (!isNaN(k1Value) && k1Value !== 0) {
        const r1Value = 337.5 / k1Value
        setR1Right(r1Value.toFixed(2))
      } else {
        setR1Right('')
      }
    } else {
      setR1Right('')
    }
  }, [k1Right])

  // Auto-calculate R2 from K2 for Right Eye
  useEffect(() => {
    if (k2Right) {
      const k2Value = parseFloat(k2Right)
      if (!isNaN(k2Value) && k2Value !== 0) {
        const r2Value = 337.5 / k2Value
        setR2Right(r2Value.toFixed(2))
      } else {
        setR2Right('')
      }
    } else {
      setR2Right('')
    }
  }, [k2Right])

  // Auto-calculate R0 from R1 and R2 for Right Eye
  useEffect(() => {
    if (r1Right && r2Right) {
      const r1Value = parseFloat(r1Right)
      const r2Value = parseFloat(r2Right)
      if (!isNaN(r1Value) && !isNaN(r2Value)) {
        const r0Value = (r1Value + r2Value) / 2 + 0.8
        setR0Right(r0Value.toFixed(2))
      } else {
        setR0Right('')
      }
    } else {
      setR0Right('')
    }
  }, [r1Right, r2Right])

  // Auto-calculate T.O.C from PACHY for Right Eye
  useEffect(() => {
    if (pachyRight) {
      const pachyValue = parseFloat(pachyRight)
      if (!isNaN(pachyValue)) {
        const tocValue = (545 - pachyValue) * 0.071
        setTocRight(tocValue.toFixed(2))
      } else {
        setTocRight('')
      }
    } else {
      setTocRight('')
    }
  }, [pachyRight])

  // Auto-calculate R1 from K1 for Left Eye
  useEffect(() => {
    if (k1Left) {
      const k1Value = parseFloat(k1Left)
      if (!isNaN(k1Value) && k1Value !== 0) {
        const r1Value = 337.5 / k1Value
        setR1Left(r1Value.toFixed(2))
      } else {
        setR1Left('')
      }
    } else {
      setR1Left('')
    }
  }, [k1Left])

  // Auto-calculate R2 from K2 for Left Eye
  useEffect(() => {
    if (k2Left) {
      const k2Value = parseFloat(k2Left)
      if (!isNaN(k2Value) && k2Value !== 0) {
        const r2Value = 337.5 / k2Value
        setR2Left(r2Value.toFixed(2))
      } else {
        setR2Left('')
      }
    } else {
      setR2Left('')
    }
  }, [k2Left])

  // Auto-calculate R0 from R1 and R2 for Left Eye
  useEffect(() => {
    if (r1Left && r2Left) {
      const r1Value = parseFloat(r1Left)
      const r2Value = parseFloat(r2Left)
      if (!isNaN(r1Value) && !isNaN(r2Value)) {
        const r0Value = (r1Value + r2Value) / 2 + 0.8
        setR0Left(r0Value.toFixed(2))
      } else {
        setR0Left('')
      }
    } else {
      setR0Left('')
    }
  }, [r1Left, r2Left])

  // Auto-calculate T.O.C from PACHY for Left Eye
  useEffect(() => {
    if (pachyLeft) {
      const pachyValue = parseFloat(pachyLeft)
      if (!isNaN(pachyValue)) {
        const tocValue = (545 - pachyValue) * 0.071
        setTocLeft(tocValue.toFixed(2))
      } else {
        setTocLeft('')
      }
    } else {
      setTocLeft('')
    }
  }, [pachyLeft])

  // Get current user name (Praticien)
  const getPractitionerName = () => {
    if (!user) return 'Docteur'
    return user.name || user.email || 'Docteur'
  }

  // Load patient data
  useEffect(() => {
    const loadPatient = async () => {
      if (!patientId) {
        setLoading(false)
        return
      }

      try {
        const result = await (window.electronAPI as any)?.db.patients.getById(
          parseInt(patientId)
        )

        if (result?.success && result.patient) {
          setPatient(result.patient)
          // Initialize editable fields with patient data
          setLastName(result.patient.lastName || '')
          setFirstName(result.patient.firstName || '')
          setAge(result.patient.age?.toString() || '')
        }
      } catch (error) {
        console.error('Error loading patient:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPatient()
  }, [patientId])


  // Load existing visit data in edit mode
  useEffect(() => {
    const loadVisitData = async () => {
      if (!visitIdParam || !patient?.departmentCode) return
      
      try {
        console.log('Loading visit data for ID:', visitIdParam, 'Date:', dateParam, 'Patient:', patient.departmentCode)
        
        // Convert date format if needed
        const visitDateFormatted = dateParam ? (() => {
          const [year, month, day] = dateParam.split('-')
          return `${parseInt(month)}/${parseInt(day)}/${year}`
        })() : visitDate
        
        console.log('Formatted date for loading:', visitDateFormatted)
        
        // Load the visit examination data
        const result = await (window.electronAPI as any)?.db.visitExaminations.getByDate(
          patient.departmentCode,
          visitDateFormatted
        )
        
        console.log('API Result:', result)
        
        if (result?.success && result.examination) {
          const exam = result.examination
          console.log('Loaded examination data:', exam)
          
          // Set all form fields with the loaded data
          // Patient info comes from patient, not exam
          setLastName(patient.lastName || '')
          setFirstName(patient.firstName || '')
          setAge(patient.age?.toString() || '')
          setMotif(exam.motif || '')
          setCycloplegie(exam.cycloplegie || '')
          
          // Right eye - Prisma returns camelCase field names
          setSvRight(exam.svRight || '')
          setAvRight(exam.avRight || '')
          setSphereRight(exam.sphereRight || '')
          setCylindreRight(exam.cylinderRight || '')
          setAxeRight(exam.axisRight || '')
          setVlRight(exam.vlRight || '')
          
          // Left eye - Prisma returns camelCase field names
          setSvLeft(exam.svLeft || '')
          setAvLeft(exam.avLeft || '')
          setSphereLeft(exam.sphereLeft || '')
          setCylindreLeft(exam.cylinderLeft || '')
          setAxeLeft(exam.axisLeft || '')
          setVlLeft(exam.vlLeft || '')
          
          // Other fields - Prisma returns camelCase field names
          setK1Right(exam.k1Right || '')
          setK2Right(exam.k2Right || '')
          setR1Right(exam.r1Right || '')
          setR2Right(exam.r2Right || '')
          setR0Right(exam.r0Right || '')
          setPachyRight(exam.pachyRight || '')
          setTocRight(exam.tocRight || '')
          setToRight(exam.toRight || '')
          setGonioRight(exam.gonioRight || '')
          setLafRight(exam.lafRight || '')
          setFoRight(exam.foRight || '')
          setNotesRight(exam.notesRight || '')
          
          setK1Left(exam.k1Left || '')
          setK2Left(exam.k2Left || '')
          setR1Left(exam.r1Left || '')
          setR2Left(exam.r2Left || '')
          setR0Left(exam.r0Left || '')
          setPachyLeft(exam.pachyLeft || '')
          setTocLeft(exam.tocLeft || '')
          setToLeft(exam.toLeft || '')
          setGonioLeft(exam.gonioLeft || '')
          setLafLeft(exam.lafLeft || '')
          setFoLeft(exam.foLeft || '')
          setNotesLeft(exam.notesLeft || '')
          
          setAddition(exam.addition || '')
          setDip(exam.dip || '')
          setConduiteATenir(exam.conduiteATenir || '')
          setDiag(exam.diagnostic || '')
          setActesGeneraux(exam.actesGeneraux || '')
          setActesOphtalmologiques(exam.actesOphtalmologiques || '')
          
          // Set the visit date if we have it
          if (dateParam) {
            setVisitDate(dateParam)
          }
          
          // Store original data for comparison - normalize field names to match state variables
          setOriginalData({
            firstName: patient.firstName || '',
            lastName: patient.lastName || '',
            age: patient.age?.toString() || '',
            motif: exam.motif || '',
            cycloplegie: exam.cycloplegie || '',
            svRight: exam.svRight || '',
            avRight: exam.avRight || '',
            sphereRight: exam.sphereRight || '',
            cylindreRight: exam.cylinderRight || '',
            axeRight: exam.axisRight || '',
            vlRight: exam.vlRight || '',
            svLeft: exam.svLeft || '',
            avLeft: exam.avLeft || '',
            sphereLeft: exam.sphereLeft || '',
            cylindreLeft: exam.cylinderLeft || '',
            axeLeft: exam.axisLeft || '',
            vlLeft: exam.vlLeft || '',
            k1Right: exam.k1Right || '',
            k2Right: exam.k2Right || '',
            r1Right: exam.r1Right || '',
            r2Right: exam.r2Right || '',
            r0Right: exam.r0Right || '',
            pachyRight: exam.pachyRight || '',
            tocRight: exam.tocRight || '',
            toRight: exam.toRight || '',
            gonioRight: exam.gonioRight || '',
            lafRight: exam.lafRight || '',
            foRight: exam.foRight || '',
            notesRight: exam.notesRight || '',
            k1Left: exam.k1Left || '',
            k2Left: exam.k2Left || '',
            r1Left: exam.r1Left || '',
            r2Left: exam.r2Left || '',
            r0Left: exam.r0Left || '',
            pachyLeft: exam.pachyLeft || '',
            tocLeft: exam.tocLeft || '',
            toLeft: exam.toLeft || '',
            gonioLeft: exam.gonioLeft || '',
            lafLeft: exam.lafLeft || '',
            foLeft: exam.foLeft || '',
            notesLeft: exam.notesLeft || '',
            addition: exam.addition || '',
            dip: exam.dip || '',
            conduiteATenir: exam.conduiteATenir || '',
            diag: exam.diagnostic || '',
            actesGeneraux: exam.actesGeneraux || '',
            actesOphtalmologiques: exam.actesOphtalmologiques || ''
          })
          setOriginalVisitId(parseInt(visitIdParam))
          setIsEditMode(true)
          setDataLoaded(true)
        } else {
          console.log('No examination found, starting fresh')
          setIsEditMode(false)
          setDataLoaded(true)
        }
      } catch (error) {
        console.error('Error loading visit data:', error)
        setIsEditMode(false)
        setDataLoaded(true)
      }
    }
    
    if (!visitIdParam) {
      // New visit mode - just show the form
      setIsEditMode(false)
      setDataLoaded(true)
    } else {
      // Edit mode - load the data
      loadVisitData()
    }
  }, [visitIdParam, dateParam, patient?.departmentCode])

  // Delete payment
  // Handle eye examination button click - now opens contact lens modal
  const handleEyeExaminationClick = () => {
    setShowContactLensModal(true)
  }

  // Handle prescription button click - show glasses prescription modal
  const checkPaymentValidation = async () => {
    try {
      // Check if payment exists for this patient and date
      const paymentCheck = await (window.electronAPI as any)?.payments?.checkValidation?.(
        patient?.departmentCode || '',
        visitDate
      )
      return paymentCheck?.validated || false
    } catch (error) {
      console.error('Error checking payment validation:', error)
      // If the API doesn't exist, assume no payment
      return false
    }
  }

  // Wrapper function for actions that need payment reminder
  const executeWithPaymentReminder = async (action: () => void) => {
    // If payment was already validated this session, just execute the action
    if (sessionPaymentValidated) {
      action()
      return
    }
    
    // Check if payment exists for today
    const hasPayment = await checkPaymentValidation()
    
    if (!hasPayment) {
      // Store the pending action and show payment modal
      setPendingAction(() => action)
      setShowPaymentModal(true)
    } else {
      // Payment already exists, mark as validated and execute action
      setSessionPaymentValidated(true)
      action()
    }
  }

  const handlePrescriptionClick = async () => {
    await executeWithPaymentReminder(() => {
      setShowGlassesPrescriptionModal(true)
    })
  }

  // Handle validate payment button click - user explicitly wants to validate payment
  const handleValidatePaymentClick = async () => {
    // If visit isn't saved yet, save it first
    if (!hasSavedOnce && !originalVisitId) {
      const result = await actualSaveVisit()
      if (result?.success) {
        setHasUnsavedChanges(false)
        setHasSavedOnce(true)
        // Update originalVisitId if visit was just created
        if (result.createdVisitId) {
          setOriginalVisitId(result.createdVisitId)
        }
      } else {
        alert('❌ Erreur lors de la sauvegarde de la visite')
        return
      }
    }
    
    // Visit already saved, just show the payment modal
    // Don't use wrapper since user explicitly clicked payment button
    setShowPaymentModal(true)
  }


  // Handle received messages button click
  const handleReceivedMessagesClick = () => {
    // No payment validation check for messaging - user can check messages anytime
    setIsReceivedMessagesOpen(true)
  }

  // Handle send message button click
  const handleSendMessageClick = () => {
    setIsSendModalOpen(true)
  }

  // Handle sending patient to nurse with action
  const handleSendPatientToNurse = async (actionType: string, actionLabel: string) => {
    if (!patient || !user) return

    try {
      // First save the visit if there are unsaved changes
      if (hasUnsavedChanges && !isEditMode) {
        const visitResult = await actualSaveVisit()
        if (!visitResult?.success) {
          alert('❌ Veuillez enregistrer la visite avant d\'envoyer le patient')
          return
        }
        setHasUnsavedChanges(false)
        // Update originalVisitId if visit was just created
        if (visitResult.createdVisitId) {
          setOriginalVisitId(visitResult.createdVisitId)
          setHasSavedOnce(true)
        }
      }

      const result = await window.electronAPI.queue.sendToNurse({
        patientCode: patient.departmentCode || 0,
        patientName: `${patient.firstName} ${patient.lastName}`.trim(),
        fromUserId: user.id,
        fromUserName: user.name || user.email,
        fromUserRole: user.role,
        actionType,
        actionLabel,
        visitId: originalVisitId || undefined
      })

      if (result?.success) {
        alert(`✅ Patient envoyé à l'infirmière pour: ${actionLabel}`)
      } else {
        alert(`❌ Erreur: ${result?.error || 'Impossible d\'envoyer le patient'}`)
      }
    } catch (error: any) {
      alert(`❌ Erreur: ${error.message || 'Erreur inconnue'}`)
    }
  }

  const handleDeletePayment = async () => {
    if (!patient?.departmentCode) {
      alert('❌ Erreur: Code patient introuvable')
      return
    }

    if (!window.confirm('⚠️ Êtes-vous sûr de vouloir supprimer TOUS les paiements de ce patient pour cette date ?\n\nCette action supprimera tous les paiements validés pour ce patient le ' + visitDate)) {
      return
    }

    const reason = window.prompt('Raison de la suppression de tous les paiements:')
    if (!reason) return

    try {
      // Use the same date format as when creating payments (YYYY-MM-DD)
      // visitDate is already in the correct format
      
      // TODO: Fix type issue with deleteAllForPatientDate
      // @ts-ignore - method exists but TypeScript doesn't recognize it
      const result = await window.electronAPI.payments.deleteAllForPatientDate(
        patient.departmentCode,
        visitDate,  // Use visitDate directly without conversion
        user?.name || 'Inconnu',
        user?.id || 0,
        user?.role || 'unknown',
        reason
      )

      if (result?.success) {
        setExistingPaymentId(null)
        alert(`✅ ${result.deletedCount} paiement(s) supprimé(s) avec succès.\nL'administrateur a été notifié.`)
        // After deletion, prompt to validate a new payment
        setShowPaymentModal(true)
      } else {
        alert(`❌ Erreur: ${result?.error || 'Erreur inconnue'}`)
      }
    } catch (error: any) {
      alert(`❌ Erreur: ${error.message || 'Erreur inconnue'}`)
    }
  }

  // Track if any field has been modified (only after initial load in edit mode)
  useEffect(() => {
    if (!dataLoaded) return // Don't check until data is loaded
    
    if (isEditMode && originalData) {
      // In edit mode, compare with original data
      console.log('Checking for changes in edit mode...')
      const hasChanges = 
        firstName !== originalData.firstName ||
        lastName !== originalData.lastName ||
        age !== originalData.age ||
        motif !== originalData.motif ||
        cycloplegie !== originalData.cycloplegie ||
        actesGeneraux !== originalData.actesGeneraux ||
        actesOphtalmologiques !== originalData.actesOphtalmologiques ||
        svRight !== originalData.svRight ||
        avRight !== originalData.avRight ||
        sphereRight !== originalData.sphereRight ||
        cylindreRight !== originalData.cylindreRight ||
        axeRight !== originalData.axeRight ||
        vlRight !== originalData.vlRight ||
        k1Right !== originalData.k1Right ||
        k2Right !== originalData.k2Right ||
        r1Right !== originalData.r1Right ||
        r2Right !== originalData.r2Right ||
        r0Right !== originalData.r0Right ||
        pachyRight !== originalData.pachyRight ||
        tocRight !== originalData.tocRight ||
        toRight !== originalData.toRight ||
        gonioRight !== originalData.gonioRight ||
        lafRight !== originalData.lafRight ||
        foRight !== originalData.foRight ||
        notesRight !== originalData.notesRight ||
        svLeft !== originalData.svLeft ||
        avLeft !== originalData.avLeft ||
        sphereLeft !== originalData.sphereLeft ||
        cylindreLeft !== originalData.cylindreLeft ||
        axeLeft !== originalData.axeLeft ||
        vlLeft !== originalData.vlLeft ||
        k1Left !== originalData.k1Left ||
        k2Left !== originalData.k2Left ||
        r1Left !== originalData.r1Left ||
        r2Left !== originalData.r2Left ||
        r0Left !== originalData.r0Left ||
        pachyLeft !== originalData.pachyLeft ||
        tocLeft !== originalData.tocLeft ||
        toLeft !== originalData.toLeft ||
        gonioLeft !== originalData.gonioLeft ||
        lafLeft !== originalData.lafLeft ||
        foLeft !== originalData.foLeft ||
        notesLeft !== originalData.notesLeft ||
        addition !== originalData.addition ||
        dip !== originalData.dip ||
        conduiteATenir !== originalData.conduiteATenir ||
        diag !== originalData.diag
      
      console.log('Has changes in edit mode:', hasChanges)
      setHasUnsavedChanges(hasChanges)
    } else {
      // In create mode, any data means unsaved changes (including patient info fields)
      const hasData = Boolean(
        lastName || firstName || age ||
        motif || cycloplegie ||
        svRight || avRight || sphereRight || cylindreRight || axeRight || vlRight ||
        svLeft || avLeft || sphereLeft || cylindreLeft || axeLeft || vlLeft ||
        k1Right || k2Right || r1Right || r2Right || r0Right || pachyRight || tocRight || toRight || gonioRight || lafRight || foRight || notesRight ||
        k1Left || k2Left || r1Left || r2Left || r0Left || pachyLeft || tocLeft || toLeft || gonioLeft || lafLeft || foLeft || notesLeft ||
        addition || dip || conduiteATenir || diag ||
        actesGeneraux || actesOphtalmologiques
      )
      
      setHasUnsavedChanges(hasData)
    }
  }, [isEditMode, dataLoaded, originalData, lastName, firstName, age, motif, cycloplegie, 
      svRight, avRight, sphereRight, cylindreRight, axeRight, vlRight,
      svLeft, avLeft, sphereLeft, cylindreLeft, axeLeft, vlLeft,
      k1Right, k2Right, r1Right, r2Right, r0Right, pachyRight, tocRight, toRight, gonioRight, lafRight, foRight, notesRight,
      k1Left, k2Left, r1Left, r2Left, r0Left, pachyLeft, tocLeft, toLeft, gonioLeft, lafLeft, foLeft, notesLeft,
      addition, dip, conduiteATenir, diag, actesGeneraux, actesOphtalmologiques])

  // Warn before closing browser window if unsaved changes - removed to allow users to close the app
  // Users can still use the back button which has the save prompt

  const handleBack = async () => {
    // Check for unsaved changes first
    if (hasUnsavedChanges) {
      const userWantsToSave = window.confirm('Vous avez des modifications non enregistrées. Voulez-vous les enregistrer ?')
      
      if (userWantsToSave) {
        // Save the visit
        const result = await actualSaveVisit()
        if (result?.success) {
          setHasUnsavedChanges(false) // Mark as saved
          // Update originalVisitId if visit was just created
          if (result.createdVisitId) {
            setOriginalVisitId(result.createdVisitId)
            setHasSavedOnce(true)
          }
        }
      }
    }
    
    // Use payment reminder wrapper for navigation
    await executeWithPaymentReminder(() => {
      navigate(`/patient/${patientId}`)
    })
  }

  // Handle motif input change
  const handleMotifChange = (value: string) => {
    setMotif(value)
    setShowMotifDropdown(true)
    
    // Filter options based on input
    const filtered = MOTIF_OPTIONS.filter(option =>
      option.toLowerCase().includes(value.toLowerCase())
    )
    setFilteredMotifOptions(filtered)
  }

  // Handle motif option selection
  const handleMotifSelect = (option: string) => {
    setMotif(option)
    setShowMotifDropdown(false)
  }

  // Handle motif option double-click to delete
  const handleMotifDoubleClick = () => {
    setMotif('')
    setShowMotifDropdown(true)
    setFilteredMotifOptions(MOTIF_OPTIONS)
  }

  // Handle Cycloplégie input change
  const handleCycloplegieChange = (value: string) => {
    setCycloplegie(value)
    setShowCycloplegieDropdown(true)
    
    const filtered = CYCLOPLEGIE_OPTIONS.filter(option =>
      option.toLowerCase().includes(value.toLowerCase())
    )
    setFilteredCycloplegieOptions(filtered)
  }

  // Handle Cycloplégie option selection
  const handleCycloplegieSelect = (option: string) => {
    setCycloplegie(option)
    setShowCycloplegieDropdown(false)
  }

  // Handle Cycloplégie double-click to delete
  const handleCycloplegieDoubleClick = () => {
    setCycloplegie('')
    setShowCycloplegieDropdown(true)
    setFilteredCycloplegieOptions(CYCLOPLEGIE_OPTIONS)
  }

  // Handle SV Right Eye
  const handleSvRightChange = (value: string) => {
    setSvRight(value)
    setShowSvRightDropdown(true)
    const filtered = SV_RIGHT_OPTIONS.filter(option =>
      option.toLowerCase().includes(value.toLowerCase())
    )
    setFilteredSvRightOptions(filtered)
  }

  const handleSvRightSelect = (option: string) => {
    setSvRight(option)
    setShowSvRightDropdown(false)
  }

  const handleSvRightDoubleClick = () => {
    setSvRight('')
    setShowSvRightDropdown(true)
    setFilteredSvRightOptions(SV_RIGHT_OPTIONS)
  }

  // Handle AV Right Eye
  const handleAvRightChange = (value: string) => {
    setAvRight(value)
    setShowAvRightDropdown(true)
    const filtered = AV_RIGHT_OPTIONS.filter(option =>
      option.toLowerCase().includes(value.toLowerCase())
    )
    setFilteredAvRightOptions(filtered)
  }

  const handleAvRightSelect = (option: string) => {
    setAvRight(option)
    setShowAvRightDropdown(false)
  }

  const handleAvRightDoubleClick = () => {
    setAvRight('')
    setShowAvRightDropdown(true)
    setFilteredAvRightOptions(AV_RIGHT_OPTIONS)
  }

  // Handle SV Left Eye
  const handleSvLeftChange = (value: string) => {
    setSvLeft(value)
    setShowSvLeftDropdown(true)
    const filtered = SV_LEFT_OPTIONS.filter(option =>
      option.toLowerCase().includes(value.toLowerCase())
    )
    setFilteredSvLeftOptions(filtered)
  }

  const handleSvLeftSelect = (option: string) => {
    setSvLeft(option)
    setShowSvLeftDropdown(false)
  }

  const handleSvLeftDoubleClick = () => {
    setSvLeft('')
    setShowSvLeftDropdown(true)
    setFilteredSvLeftOptions(SV_LEFT_OPTIONS)
  }

  // Handle AV Left Eye
  const handleAvLeftChange = (value: string) => {
    setAvLeft(value)
    setShowAvLeftDropdown(true)
    const filtered = AV_LEFT_OPTIONS.filter(option =>
      option.toLowerCase().includes(value.toLowerCase())
    )
    setFilteredAvLeftOptions(filtered)
  }

  const handleAvLeftSelect = (option: string) => {
    setAvLeft(option)
    setShowAvLeftDropdown(false)
  }

  const handleAvLeftDoubleClick = () => {
    setAvLeft('')
    setShowAvLeftDropdown(true)
    setFilteredAvLeftOptions(AV_LEFT_OPTIONS)
  }

  // Handle SPHÈRE Right Eye
  const handleSphereRightChange = (value: string) => {
    setSphereRight(value)
    setShowSphereRightDropdown(true)
    const filtered = SPHERE_OPTIONS.filter(option =>
      option.toLowerCase().includes(value.toLowerCase())
    )
    setFilteredSphereRightOptions(filtered)
  }

  const handleSphereRightSelect = (option: string) => {
    setSphereRight(option)
    setShowSphereRightDropdown(false)
  }

  const handleSphereRightDoubleClick = () => {
    setSphereRight('')
    setShowSphereRightDropdown(true)
    setFilteredSphereRightOptions(SPHERE_OPTIONS)
  }

  // Handle CYLINDRE Right Eye
  const handleCylindreRightChange = (value: string) => {
    setCylindreRight(value)
    setShowCylindreRightDropdown(true)
    const filtered = CYLINDRE_OPTIONS.filter(option =>
      option.toLowerCase().includes(value.toLowerCase())
    )
    setFilteredCylindreRightOptions(filtered)
  }

  const handleCylindreRightSelect = (option: string) => {
    setCylindreRight(option)
    setShowCylindreRightDropdown(false)
  }

  const handleCylindreRightDoubleClick = () => {
    setCylindreRight('')
    setShowCylindreRightDropdown(true)
    setFilteredCylindreRightOptions(CYLINDRE_OPTIONS)
  }

  // Handle AXE Right Eye
  const handleAxeRightChange = (value: string) => {
    setAxeRight(value)
    setShowAxeRightDropdown(true)
    const filtered = AXE_OPTIONS.filter(option =>
      option.toLowerCase().includes(value.toLowerCase())
    )
    setFilteredAxeRightOptions(filtered)
  }

  const handleAxeRightSelect = (option: string) => {
    setAxeRight(option)
    setShowAxeRightDropdown(false)
  }

  const handleAxeRightDoubleClick = () => {
    setAxeRight('')
    setShowAxeRightDropdown(true)
    setFilteredAxeRightOptions(AXE_OPTIONS)
  }

  // Handle SPHÈRE Left Eye
  const handleSphereLeftChange = (value: string) => {
    setSphereLeft(value)
    setShowSphereLeftDropdown(true)
    const filtered = SPHERE_OPTIONS.filter(option =>
      option.toLowerCase().includes(value.toLowerCase())
    )
    setFilteredSphereLeftOptions(filtered)
  }

  const handleSphereLeftSelect = (option: string) => {
    setSphereLeft(option)
    setShowSphereLeftDropdown(false)
  }

  const handleSphereLeftDoubleClick = () => {
    setSphereLeft('')
    setShowSphereLeftDropdown(true)
    setFilteredSphereLeftOptions(SPHERE_OPTIONS)
  }

  // Handle CYLINDRE Left Eye
  const handleCylindreLeftChange = (value: string) => {
    setCylindreLeft(value)
    setShowCylindreLeftDropdown(true)
    const filtered = CYLINDRE_OPTIONS.filter(option =>
      option.toLowerCase().includes(value.toLowerCase())
    )
    setFilteredCylindreLeftOptions(filtered)
  }

  const handleCylindreLeftSelect = (option: string) => {
    setCylindreLeft(option)
    setShowCylindreLeftDropdown(false)
  }

  const handleCylindreLeftDoubleClick = () => {
    setCylindreLeft('')
    setShowCylindreLeftDropdown(true)
    setFilteredCylindreLeftOptions(CYLINDRE_OPTIONS)
  }

  // Handle AXE Left Eye
  const handleAxeLeftChange = (value: string) => {
    setAxeLeft(value)
    setShowAxeLeftDropdown(true)
    const filtered = AXE_OPTIONS.filter(option =>
      option.toLowerCase().includes(value.toLowerCase())
    )
    setFilteredAxeLeftOptions(filtered)
  }

  const handleAxeLeftSelect = (option: string) => {
    setAxeLeft(option)
    setShowAxeLeftDropdown(false)
  }

  const handleAxeLeftDoubleClick = () => {
    setAxeLeft('')
    setShowAxeLeftDropdown(true)
    setFilteredAxeLeftOptions(AXE_OPTIONS)
  }

  // Handle ADDITION field - auto-add + prefix
  const handleAdditionChange = (value: string) => {
    // Remove any existing + signs first
    let cleanValue = value.replace(/\+/g, '').trim()
    
    // If there's a value, add + prefix
    if (cleanValue) {
      setAddition(`+${cleanValue}`)
    } else {
      setAddition('')
    }
  }

  // Handle GONIO Right Eye
  const handleGonioRightChange = (value: string) => {
    setGonioRight(value)
    setShowGonioRightDropdown(true)
    const filtered = GONIO_RIGHT_OPTIONS.filter(option =>
      option.toLowerCase().includes(value.toLowerCase())
    )
    setFilteredGonioRightOptions(filtered)
  }

  const handleGonioRightSelect = (option: string) => {
    setGonioRight(option)
    setShowGonioRightDropdown(false)
  }

  const handleGonioRightDoubleClick = () => {
    setGonioRight('')
    setShowGonioRightDropdown(true)
    setFilteredGonioRightOptions(GONIO_RIGHT_OPTIONS)
  }

  // Handle GONIO Left Eye
  const handleGonioLeftChange = (value: string) => {
    setGonioLeft(value)
    setShowGonioLeftDropdown(true)
    const filtered = GONIO_LEFT_OPTIONS.filter(option =>
      option.toLowerCase().includes(value.toLowerCase())
    )
    setFilteredGonioLeftOptions(filtered)
  }

  const handleGonioLeftSelect = (option: string) => {
    setGonioLeft(option)
    setShowGonioLeftDropdown(false)
  }

  const handleGonioLeftDoubleClick = () => {
    setGonioLeft('')
    setShowGonioLeftDropdown(true)
    setFilteredGonioLeftOptions(GONIO_LEFT_OPTIONS)
  }

  // Handle LAF Right Eye
  const handleLafRightChange = (value: string) => {
    setLafRight(value)
    setShowLafRightDropdown(true)
    const filtered = LAF_RIGHT_OPTIONS.filter(option =>
      option.toLowerCase().includes(value.toLowerCase())
    )
    setFilteredLafRightOptions(filtered)
  }

  const handleLafRightSelect = (option: string) => {
    setLafRight(option)
    setShowLafRightDropdown(false)
  }

  const handleLafRightDoubleClick = () => {
    setLafRight('')
    setShowLafRightDropdown(true)
    setFilteredLafRightOptions(LAF_RIGHT_OPTIONS)
  }

  // Handle LAF Left Eye
  const handleLafLeftChange = (value: string) => {
    setLafLeft(value)
    setShowLafLeftDropdown(true)
    const filtered = LAF_LEFT_OPTIONS.filter(option =>
      option.toLowerCase().includes(value.toLowerCase())
    )
    setFilteredLafLeftOptions(filtered)
  }

  const handleLafLeftSelect = (option: string) => {
    setLafLeft(option)
    setShowLafLeftDropdown(false)
  }

  const handleLafLeftDoubleClick = () => {
    setLafLeft('')
    setShowLafLeftDropdown(true)
    setFilteredLafLeftOptions(LAF_LEFT_OPTIONS)
  }

  // Handle FO Right Eye
  const handleFoRightChange = (value: string) => {
    setFoRight(value)
    setShowFoRightDropdown(true)
    const filtered = FO_RIGHT_OPTIONS.filter(option =>
      option.toLowerCase().includes(value.toLowerCase())
    )
    setFilteredFoRightOptions(filtered)
  }

  const handleFoRightSelect = (option: string) => {
    setFoRight(option)
    setShowFoRightDropdown(false)
  }

  const handleFoRightDoubleClick = () => {
    setFoRight('')
    setShowFoRightDropdown(true)
    setFilteredFoRightOptions(FO_RIGHT_OPTIONS)
  }

  // Handle FO Left Eye
  const handleFoLeftChange = (value: string) => {
    setFoLeft(value)
    setShowFoLeftDropdown(true)
    const filtered = FO_LEFT_OPTIONS.filter(option =>
      option.toLowerCase().includes(value.toLowerCase())
    )
    setFilteredFoLeftOptions(filtered)
  }

  const handleFoLeftSelect = (option: string) => {
    setFoLeft(option)
    setShowFoLeftDropdown(false)
  }

  const handleFoLeftDoubleClick = () => {
    setFoLeft('')
    setShowFoLeftDropdown(true)
    setFilteredFoLeftOptions(FO_LEFT_OPTIONS)
  }

  // Handle DIAG dropdown
  const handleDiagChange = (value: string) => {
    setDiag(value)
    setShowDiagDropdown(true)
    const filtered = DIAG_OPTIONS.filter(option =>
      option.toLowerCase().includes(value.toLowerCase())
    )
    setFilteredDiagOptions(filtered)
  }

  const handleDiagSelect = (option: string) => {
    setDiag(option)
    setShowDiagDropdown(false)
  }

  const handleDiagDoubleClick = () => {
    setDiag('')
    setShowDiagDropdown(true)
    setFilteredDiagOptions(DIAG_OPTIONS)
  }

  // Handle CONDUITE À TENIR shortcuts
  const handleConduiteShortcut = (label: string) => {
    // Add to existing text with a comma if not empty
    if (conduiteATenir) {
      setConduiteATenir(conduiteATenir + ', ' + label)
    } else {
      setConduiteATenir(label)
    }
  }

  // Handle Actes Généraux input change
  const handleActesGenerauxChange = (value: string) => {
    setActesGeneraux(value)
    setShowActesGenerauxDropdown(true)
    
    const filtered = actesGenerauxOptions.filter(option =>
      option.toLowerCase().includes(value.toLowerCase())
    )
    setFilteredActesGenerauxOptions(filtered)
  }

  // Handle Actes Généraux option selection
  const handleActesGenerauxSelect = (option: string) => {
    setActesGeneraux(option)
    setShowActesGenerauxDropdown(false)
  }

  // Handle Actes Généraux double-click to delete
  const handleActesGenerauxDoubleClick = () => {
    setActesGeneraux('')
    setShowActesGenerauxDropdown(true)
    setFilteredActesGenerauxOptions(actesGenerauxOptions)
  }

  // Add new Actes Généraux option
  const handleAddActesGeneraux = () => {
    const newOption = prompt('Entrez le nouvel acte général:')
    if (newOption && newOption.trim()) {
      const trimmedOption = newOption.trim()
      if (!actesGenerauxOptions.includes(trimmedOption)) {
        const updatedOptions = [...actesGenerauxOptions, trimmedOption].sort()
        setActesGenerauxOptions(updatedOptions)
        setFilteredActesGenerauxOptions(updatedOptions)
        alert(`"${trimmedOption}" a été ajouté à la liste des Actes Généraux`)
      } else {
        alert(`"${trimmedOption}" existe déjà dans la liste`)
      }
    }
  }

  // Handle Actes Ophtalmologiques input change
  const handleActesOphtalmologiquesChange = (value: string) => {
    setActesOphtalmologiques(value)
    setShowActesOphtalmologiquesDropdown(true)
    
    const filtered = actesOphtalmologiquesOptions.filter(option =>
      option.toLowerCase().includes(value.toLowerCase())
    )
    setFilteredActesOphtalmologiquesOptions(filtered)
  }

  // Handle Actes Ophtalmologiques option selection
  const handleActesOphtalmologiquesSelect = (option: string) => {
    setActesOphtalmologiques(option)
    setShowActesOphtalmologiquesDropdown(false)
  }

  // Handle Actes Ophtalmologiques double-click to delete
  const handleActesOphtalmologiquesDoubleClick = () => {
    setActesOphtalmologiques('')
    setShowActesOphtalmologiquesDropdown(true)
    setFilteredActesOphtalmologiquesOptions(actesOphtalmologiquesOptions)
  }

  // Add new Actes Ophtalmologiques option
  const handleAddActesOphtalmologiques = () => {
    const newOption = prompt('Entrez le nouvel acte ophtalmologique:')
    if (newOption && newOption.trim()) {
      const trimmedOption = newOption.trim()
      if (!actesOphtalmologiquesOptions.includes(trimmedOption)) {
        const updatedOptions = [...actesOphtalmologiquesOptions, trimmedOption].sort()
        setActesOphtalmologiquesOptions(updatedOptions)
        setFilteredActesOphtalmologiquesOptions(updatedOptions)
        alert(`"${trimmedOption}" a été ajouté à la liste des Actes Ophtalmologiques`)
      } else {
        alert(`"${trimmedOption}" existe déjà dans la liste`)
      }
    }
  }

  // Save visit data (visit already exists, just update it)
  const handleSaveVisit = async () => {
    if (!patient?.departmentCode) {
      alert('❌ Erreur: Code patient introuvable')
      return
    }
    
    // Save the visit first - ONLY ONCE
    const result = await actualSaveVisit()
    
    if (result?.success) {
      setHasUnsavedChanges(false)
      
      // CRITICAL: If a visit was just created, immediately update originalVisitId
      // This ensures any subsequent operations see the visit ID
      if (result.createdVisitId || (result.visitExamination?.id && !originalVisitId)) {
        const visitId = result.createdVisitId || result.visitExamination.id
        setOriginalVisitId(visitId)
        setHasSavedOnce(true)
        console.log(`✅ Visit created with ID: ${visitId}`)
      } else {
        console.log('✅ Visit updated successfully')
      }
      
      // Check if payment exists for this patient on this date
      // If not, show payment reminder (but don't block or trigger another save)
      if (!sessionPaymentValidated) {
        const hasPayment = await checkPaymentValidation()
        if (!hasPayment) {
          setShowPaymentModal(true)
        }
      }
    }
    
    return result
  }

  // Handle payment validation
  const handlePaymentValidation = async (selectedActs: any[], totalAmount: number) => {
    if (!patient?.departmentCode) {
      alert('❌ Erreur: Code patient introuvable')
      return
    }

    try {
      setLoading(true)

      // IMPORTANT: Payment is SEPARATE from visit
      // Don't link to visitId - only use patient code + date
      // This way payments survive even if visit is deleted

      // Create payment validation with honoraires
      const paymentResult = await window.electronAPI.payments.create({
        patientCode: patient.departmentCode,
        patientName: `${patient.firstName} ${patient.lastName}`.trim(),
        visitDate: visitDate,
        visitId: undefined, // Don't link to visit - keep payments independent
        totalAmount,
        selectedActs,
        validatedBy: user?.name || user?.email || 'Inconnu',
        validatedByUserId: user?.id || 0,
        validatedByRole: user?.role || 'unknown',
      })

      if (paymentResult?.success) {
        setExistingPaymentId(paymentResult.payment?.id)
        // Mark payment as validated for this session
        setSessionPaymentValidated(true)
        // Simple confirmation without blocking alert
        console.log(`✅ Paiement validé: ${totalAmount} DA`)
      } else {
        console.error('Payment validation failed:', paymentResult?.error)
      }
      
      // Close modal and reset state
      setLoading(false)
      setShowPaymentModal(false)
      
      // Execute any pending action (for back button navigation, etc.)
      // NOTE: This should NOT trigger save - pendingAction is only for navigation
      if (pendingAction) {
        pendingAction()
        setPendingAction(null)
      }
      
      // If we were trying to navigate (from back button), do it now
      if (wantsToNavigate) {
        setWantsToNavigate(false)
        navigate(`/patient/${patientId}`)
      }
      
    } catch (error: any) {
      console.error('Error in payment validation flow:', error)
      alert(`❌ Erreur: ${error.message || 'Erreur inconnue'}`)
      setLoading(false)
      setShowPaymentModal(false)
    }
  }

  // Actual save visit function (extracted from handleSaveVisit)
  const actualSaveVisit = async () => {
    if (!patient?.departmentCode) {
      return { success: false, error: 'Code patient introuvable' }
    }

    // Prevent duplicate submissions with isSaving flag
    if (isSaving) {
      console.log('Save already in progress, ignoring duplicate call')
      return { success: false, error: 'Sauvegarde déjà en cours...' }
    }

    // Additional check with timestamp
    const now = Date.now()
    if (now - lastSaveTime < 2000) { // Prevent saves within 2 seconds
      console.log('Save too recent, ignoring duplicate call')
      return { success: false, error: 'Veuillez patienter avant de sauvegarder à nouveau' }
    }

    try {
      setIsSaving(true)
      setLoading(true)

      console.log(`💾 Saving visit: patient ${patient.departmentCode}, date ${visitDate}, isEdit: ${isEditMode}, originalId: ${originalVisitId}`)
      console.log(`🔍 Current state: hasSavedOnce=${hasSavedOnce}, originalVisitId=${originalVisitId}`)
      
      // Remove duplicate checking for now - let users create multiple visits per day as needed

      // Convert date from YYYY-MM-DD to M/D/YYYY format (same as imported data)
      const dateParts = visitDate.split('-')
      const month = parseInt(dateParts[1], 10)
      const day = parseInt(dateParts[2], 10)
      const year = dateParts[0]
      const formattedDate = `${month}/${day}/${year}`

      // Prepare visit data matching the imported structure
      // If we have a visitId, we're updating - use all current form values
      // If no visitId, we're creating - only include non-empty values
      const visitIdToUse = originalVisitId
      const visitData = {
        patientCode: patient.departmentCode,
        visitDate: formattedDate,
        medecin: getPractitionerName(), // Doctor or assistant name
        motif: visitIdToUse ? motif : (motif || undefined),
        
        // Right Eye (OD) - Refraction
        svRight: visitIdToUse ? svRight : (svRight || undefined),
        avRight: visitIdToUse ? avRight : (avRight || undefined),
        sphereRight: visitIdToUse ? sphereRight : (sphereRight || undefined),
        cylinderRight: visitIdToUse ? cylindreRight : (cylindreRight || undefined),
        axisRight: visitIdToUse ? axeRight : (axeRight || undefined),
        vlRight: visitIdToUse ? vlRight : (vlRight || undefined),
        
        // Right Eye (OD) - Keratometry & Biometry
        k1Right: visitIdToUse ? k1Right : (k1Right || undefined),
        k2Right: visitIdToUse ? k2Right : (k2Right || undefined),
        r1Right: visitIdToUse ? r1Right : (r1Right || undefined),
        r2Right: visitIdToUse ? r2Right : (r2Right || undefined),
        r0Right: visitIdToUse ? r0Right : (r0Right || undefined),
        pachyRight: visitIdToUse ? pachyRight : (pachyRight || undefined),
        tocRight: visitIdToUse ? tocRight : (tocRight || undefined),
        
        // Right Eye (OD) - Examination
        toRight: visitIdToUse ? toRight : (toRight || undefined),
        gonioRight: visitIdToUse ? gonioRight : (gonioRight || undefined),
        lafRight: visitIdToUse ? lafRight : (lafRight || undefined),
        foRight: visitIdToUse ? foRight : (foRight || undefined),
        notesRight: visitIdToUse ? notesRight : (notesRight || undefined),
        
        // Left Eye (OG) - Refraction
        svLeft: visitIdToUse ? svLeft : (svLeft || undefined),
        avLeft: visitIdToUse ? avLeft : (avLeft || undefined),
        sphereLeft: visitIdToUse ? sphereLeft : (sphereLeft || undefined),
        cylinderLeft: visitIdToUse ? cylindreLeft : (cylindreLeft || undefined),
        axisLeft: visitIdToUse ? axeLeft : (axeLeft || undefined),
        vlLeft: visitIdToUse ? vlLeft : (vlLeft || undefined),
        
        // Left Eye (OG) - Keratometry & Biometry
        k1Left: visitIdToUse ? k1Left : (k1Left || undefined),
        k2Left: visitIdToUse ? k2Left : (k2Left || undefined),
        r1Left: visitIdToUse ? r1Left : (r1Left || undefined),
        r2Left: visitIdToUse ? r2Left : (r2Left || undefined),
        r0Left: visitIdToUse ? r0Left : (r0Left || undefined),
        pachyLeft: visitIdToUse ? pachyLeft : (pachyLeft || undefined),
        tocLeft: visitIdToUse ? tocLeft : (tocLeft || undefined),
        
        // Left Eye (OG) - Examination
        toLeft: visitIdToUse ? toLeft : (toLeft || undefined),
        gonioLeft: visitIdToUse ? gonioLeft : (gonioLeft || undefined),
        lafLeft: visitIdToUse ? lafLeft : (lafLeft || undefined),
        foLeft: visitIdToUse ? foLeft : (foLeft || undefined),
        notesLeft: visitIdToUse ? notesLeft : (notesLeft || undefined),
        
        // Additional Fields
        addition: visitIdToUse ? addition : (addition || undefined),
        dip: visitIdToUse ? dip : (dip || undefined),
        cycloplegie: visitIdToUse ? cycloplegie : (cycloplegie || undefined),
        conduiteATenir: visitIdToUse ? conduiteATenir : (conduiteATenir || undefined),
        diagnostic: visitIdToUse ? diag : (diag || undefined),
        
        // Actes (if needed)
        actesGeneraux: visitIdToUse ? actesGeneraux : (actesGeneraux || undefined),
        actesOphtalmologiques: visitIdToUse ? actesOphtalmologiques : (actesOphtalmologiques || undefined),
      }

      let result
      if (visitIdToUse) {
        // Update existing visit (we have an ID, so update regardless of isEditMode)
        console.log(`📝 UPDATING existing visit ${visitIdToUse}`)
        console.log(`📄 Visit data being sent:`, visitData)
        result = await (window.electronAPI as any)?.db.visitExaminations.update(visitIdToUse, visitData)
        console.log(`✅ Update result:`, result)
      } else {
        // Create new visit (no ID, so create)
        console.log(`🆕 CREATING new visit for patient ${patient.departmentCode}`)
        console.log(`📄 Visit data being sent:`, visitData)
        result = await (window.electronAPI as any)?.db.visitExaminations.create(visitData)
        console.log(`✅ Create result:`, result)
        
        // IMPORTANT: If this is the first save (creation), update state immediately
        // This prevents duplicate creation if save is called again before state updates
        if (result?.success && result.visitExamination?.id) {
          const newVisitId = result.visitExamination.id
          console.log(`🔄 Setting originalVisitId to ${newVisitId} for future updates`)
          setOriginalVisitId(newVisitId)
          setHasSavedOnce(true)
          
          // CRITICAL: Also update visitIdToUse for this execution context
          // so if actualSaveVisit is called again in the same batch, it will see the ID
          result.createdVisitId = newVisitId
        }
      }

      // Payment linking disabled for now to prevent errors
      // if (result?.success && result.visitExamination?.id) {
      //   try {
      //     await window.electronAPI.payments.linkToVisit(
      //       patient.departmentCode,
      //       visitDate,
      //       result.visitExamination.id
      //     )
      //   } catch (linkError) {
      //     console.warn('Could not link existing payments to visit:', linkError)
      //   }
      // }

      return result
    } catch (error: any) {
      console.error('Error saving visit:', error)
      return { success: false, error: error.message || 'Erreur inconnue' }
    } finally {
      setIsSaving(false)
      setLoading(false)
      setLastSaveTime(Date.now())
    }
  }

  // Always show the form - remove problematic loading/patient checks for now
  if (!dataLoaded) {
    return (
      <div className="new-visit-loading">
        <div className="spinner"></div>
        <p>Chargement...</p>
      </div>
    )
  }

  return (
    <div className="new-visit-container">
      {/* Top Bar */}
      <div className="new-visit-top-bar">
        <button onClick={handleBack} className="btn-back-icon" title="Retour">
          ← Retour
        </button>

        <div className="top-bar-fields">
          {/* Praticien */}
          <div className="field-group">
            <label>Praticien</label>
            <input
              type="text"
              value={getPractitionerName()}
              readOnly
              className="field-readonly"
            />
          </div>

          {/* Date */}
          <div className="field-group">
            <label>Date</label>
            <input
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              className="field-editable"
            />
          </div>

          {/* Nom */}
          <div className="field-group">
            <label>Nom</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="field-editable"
              placeholder="Nom du patient"
            />
          </div>

          {/* Prénom */}
          <div className="field-group">
            <label>Prénom</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="field-editable"
              placeholder="Prénom du patient"
            />
          </div>

          {/* Âge */}
          <div className="field-group">
            <label>Âge</label>
            <input
              type="text"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="field-editable age-field"
              placeholder="Âge"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="new-visit-content">
        <div className="content-columns">
          {/* Left Column - Motif + Cycloplégie + Œil Droit */}
          <div className="left-column">
            {/* Motif de consultation */}
            <div className="motif-field-container">
              <label>Motif de consultation</label>
              <div className="motif-input-wrapper">
                <input
                  type="text"
                  className="motif-input"
                  value={motif}
                  onChange={(e) => handleMotifChange(e.target.value)}
                  onDoubleClick={handleMotifDoubleClick}
                  onFocus={() => setShowMotifDropdown(true)}
                  onBlur={() => setTimeout(() => setShowMotifDropdown(false), 200)}
                  placeholder="Sélectionnez ou tapez le motif..."
                />
                {showMotifDropdown && filteredMotifOptions.length > 0 && (
                  <div className="motif-dropdown">
                    {filteredMotifOptions.map((option, index) => (
                      <div
                        key={index}
                        className="motif-option"
                        onClick={() => handleMotifSelect(option)}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cycloplégie */}
            <div className="cycloplegie-field-container">
              <label>Cycloplégie</label>
              <div className="cycloplegie-input-wrapper">
                <input
                  type="text"
                  className="cycloplegie-input"
                  value={cycloplegie}
                  onChange={(e) => handleCycloplegieChange(e.target.value)}
                  onDoubleClick={handleCycloplegieDoubleClick}
                  onFocus={() => setShowCycloplegieDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCycloplegieDropdown(false), 200)}
                  placeholder="Sélectionnez ou tapez..."
                />
                {showCycloplegieDropdown && filteredCycloplegieOptions.length > 0 && (
                  <div className="cycloplegie-dropdown">
                    {filteredCycloplegieOptions.map((option, index) => (
                      <div
                        key={index}
                        className="cycloplegie-option"
                        onClick={() => handleCycloplegieSelect(option)}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Œil Droit (OD) */}
            <div className="eye-section">
              <h3 className="eye-title">Œil Droit (OD)</h3>
              
              <div className="eye-fields-horizontal">
                {/* SV Right */}
                <div className="eye-field-group">
                  <label>SV</label>
                  <div className="eye-input-wrapper">
                    <input
                      type="text"
                      className="eye-input"
                      value={svRight}
                      onChange={(e) => handleSvRightChange(e.target.value)}
                      onDoubleClick={handleSvRightDoubleClick}
                      onFocus={() => setShowSvRightDropdown(true)}
                      onBlur={() => setTimeout(() => setShowSvRightDropdown(false), 200)}
                    />
                    {showSvRightDropdown && filteredSvRightOptions.length > 0 && (
                      <div className="eye-dropdown">
                        {filteredSvRightOptions.map((option, index) => (
                          <div
                            key={index}
                            className="eye-option"
                            onClick={() => handleSvRightSelect(option)}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* AV Right */}
                <div className="eye-field-group">
                  <label>AV</label>
                  <div className="eye-input-wrapper">
                    <input
                      type="text"
                      className="eye-input"
                      value={avRight}
                      onChange={(e) => handleAvRightChange(e.target.value)}
                      onDoubleClick={handleAvRightDoubleClick}
                      onFocus={() => setShowAvRightDropdown(true)}
                      onBlur={() => setTimeout(() => setShowAvRightDropdown(false), 200)}
                    />
                    {showAvRightDropdown && filteredAvRightOptions.length > 0 && (
                      <div className="eye-dropdown">
                        {filteredAvRightOptions.map((option, index) => (
                          <div
                            key={index}
                            className="eye-option"
                            onClick={() => handleAvRightSelect(option)}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Refraction Fields - Right Eye */}
              <div className="eye-fields-horizontal" style={{ marginTop: '12px' }}>
                {/* SPHÈRE Right */}
                <div className="eye-field-group">
                  <label>SPHÈRE</label>
                  <div className="eye-input-wrapper">
                    <input
                      type="text"
                      className="eye-input"
                      value={sphereRight}
                      onChange={(e) => handleSphereRightChange(e.target.value)}
                      onDoubleClick={handleSphereRightDoubleClick}
                      onFocus={() => setShowSphereRightDropdown(true)}
                      onBlur={() => setTimeout(() => setShowSphereRightDropdown(false), 200)}
                    />
                    {showSphereRightDropdown && filteredSphereRightOptions.length > 0 && (
                      <div className="eye-dropdown">
                        {filteredSphereRightOptions.map((option, index) => (
                          <div
                            key={index}
                            className="eye-option"
                            onClick={() => handleSphereRightSelect(option)}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* CYLINDRE Right */}
                <div className="eye-field-group">
                  <label>CYLINDRE</label>
                  <div className="eye-input-wrapper">
                    <input
                      type="text"
                      className="eye-input"
                      value={cylindreRight}
                      onChange={(e) => handleCylindreRightChange(e.target.value)}
                      onDoubleClick={handleCylindreRightDoubleClick}
                      onFocus={() => setShowCylindreRightDropdown(true)}
                      onBlur={() => setTimeout(() => setShowCylindreRightDropdown(false), 200)}
                    />
                    {showCylindreRightDropdown && filteredCylindreRightOptions.length > 0 && (
                      <div className="eye-dropdown">
                        {filteredCylindreRightOptions.map((option, index) => (
                          <div
                            key={index}
                            className="eye-option"
                            onClick={() => handleCylindreRightSelect(option)}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* AXE Right */}
                <div className="eye-field-group">
                  <label>AXE</label>
                  <div className="eye-input-wrapper">
                    <input
                      type="text"
                      className="eye-input"
                      value={axeRight}
                      onChange={(e) => handleAxeRightChange(e.target.value)}
                      onDoubleClick={handleAxeRightDoubleClick}
                      onFocus={() => setShowAxeRightDropdown(true)}
                      onBlur={() => setTimeout(() => setShowAxeRightDropdown(false), 200)}
                    />
                    {showAxeRightDropdown && filteredAxeRightOptions.length > 0 && (
                      <div className="eye-dropdown">
                        {filteredAxeRightOptions.map((option, index) => (
                          <div
                            key={index}
                            className="eye-option"
                            onClick={() => handleAxeRightSelect(option)}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* VL Right - Editable */}
                <div className="eye-field-group">
                  <label>VL</label>
                  <input
                    type="text"
                    className="eye-input"
                    value={vlRight}
                    onChange={(e) => setVlRight(e.target.value)}
                  />
                </div>
              </div>

              {/* K1, K2 Fields - Right Eye */}
              <div className="eye-fields-horizontal" style={{ marginTop: '12px' }}>
                {/* K1 Right */}
                <div className="eye-field-group">
                  <label>K1</label>
                  <input
                    type="text"
                    className="eye-input field-k1"
                    value={k1Right}
                    onChange={(e) => setK1Right(e.target.value)}
                  />
                </div>

                {/* K2 Right */}
                <div className="eye-field-group">
                  <label>K2</label>
                  <input
                    type="text"
                    className="eye-input field-k2"
                    value={k2Right}
                    onChange={(e) => setK2Right(e.target.value)}
                  />
                </div>
              </div>

              {/* R1, R2, R0, PACHY, T.O.C Fields - Right Eye */}
              <div className="eye-fields-horizontal" style={{ marginTop: '12px' }}>
                {/* R1 Right */}
                <div className="eye-field-group">
                  <label>R1</label>
                  <input
                    type="text"
                    className="eye-input field-r1"
                    value={r1Right}
                    onChange={(e) => setR1Right(e.target.value)}
                  />
                </div>

                {/* R2 Right */}
                <div className="eye-field-group">
                  <label>R2</label>
                  <input
                    type="text"
                    className="eye-input field-r2"
                    value={r2Right}
                    onChange={(e) => setR2Right(e.target.value)}
                  />
                </div>

                {/* R0 Right */}
                <div className="eye-field-group">
                  <label>R0</label>
                  <input
                    type="text"
                    className="eye-input field-r0"
                    value={r0Right}
                    onChange={(e) => setR0Right(e.target.value)}
                  />
                </div>

                {/* PACHY Right */}
                <div className="eye-field-group">
                  <label>PACHY</label>
                  <input
                    type="text"
                    className="eye-input field-pachy"
                    value={pachyRight}
                    onChange={(e) => setPachyRight(e.target.value)}
                  />
                </div>

                {/* T.O.C Right */}
                <div className="eye-field-group">
                  <label>T.O.C</label>
                  <input
                    type="text"
                    className="eye-input field-toc"
                    value={tocRight}
                    onChange={(e) => setTocRight(e.target.value)}
                  />
                </div>
              </div>

              {/* Notes Right Eye */}
              <div style={{ marginTop: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#2A6484', marginBottom: '6px', display: 'block' }}>NOTES</label>
                <textarea
                  className="eye-notes-textarea"
                  value={notesRight}
                  onChange={(e) => setNotesRight(e.target.value)}
                  placeholder="Notes..."
                />
              </div>

              {/* GONIO and T.O Fields - Right Eye */}
              <div className="eye-fields-horizontal" style={{ marginTop: '12px' }}>
                {/* GONIO Right */}
                <div className="eye-field-group">
                  <label>GONIO</label>
                  <div className="eye-input-wrapper">
                    <input
                      type="text"
                      className="eye-input"
                      value={gonioRight}
                      onChange={(e) => handleGonioRightChange(e.target.value)}
                      onDoubleClick={handleGonioRightDoubleClick}
                      onFocus={() => setShowGonioRightDropdown(true)}
                      onBlur={() => setTimeout(() => setShowGonioRightDropdown(false), 200)}
                    />
                    {showGonioRightDropdown && filteredGonioRightOptions.length > 0 && (
                      <div className="eye-dropdown">
                        {filteredGonioRightOptions.map((option, index) => (
                          <div
                            key={index}
                            className="eye-option"
                            onClick={() => handleGonioRightSelect(option)}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* T.O Right */}
                <div className="eye-field-group">
                  <label>T.O</label>
                  <input
                    type="text"
                    className="eye-input"
                    value={toRight}
                    onChange={(e) => setToRight(e.target.value)}
                  />
                </div>
              </div>

              {/* L.A.F Right Eye */}
              <div style={{ marginTop: '12px' }}>
                <div className="eye-field-group">
                  <label>L.A.F</label>
                  <div className="eye-input-wrapper">
                    <input
                      type="text"
                      className="eye-input"
                      value={lafRight}
                      onChange={(e) => handleLafRightChange(e.target.value)}
                      onDoubleClick={handleLafRightDoubleClick}
                      onFocus={() => setShowLafRightDropdown(true)}
                      onBlur={() => setTimeout(() => setShowLafRightDropdown(false), 200)}
                    />
                    {showLafRightDropdown && filteredLafRightOptions.length > 0 && (
                      <div className="eye-dropdown">
                        {filteredLafRightOptions.map((option, index) => (
                          <div
                            key={index}
                            className="eye-option"
                            onClick={() => handleLafRightSelect(option)}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* F.O Right Eye */}
              <div style={{ marginTop: '12px' }}>
                <div className="eye-field-group">
                  <label>F.O</label>
                  <div className="eye-input-wrapper">
                    <input
                      type="text"
                      className="eye-input"
                      value={foRight}
                      onChange={(e) => handleFoRightChange(e.target.value)}
                      onDoubleClick={handleFoRightDoubleClick}
                      onFocus={() => setShowFoRightDropdown(true)}
                      onBlur={() => setTimeout(() => setShowFoRightDropdown(false), 200)}
                    />
                    {showFoRightDropdown && filteredFoRightOptions.length > 0 && (
                      <div className="eye-dropdown">
                        {filteredFoRightOptions.map((option, index) => (
                          <div
                            key={index}
                            className="eye-option"
                            onClick={() => handleFoRightSelect(option)}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CONDUITE À TENIR - Right Eye */}
              <div style={{ marginTop: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#2A6484', marginBottom: '8px', display: 'block' }}>CONDUITE À TENIR</label>
                
                {/* Shortcut Buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                  {CONDUITE_SHORTCUTS.map((shortcut, index) => (
                    <button
                      key={index}
                      onClick={() => handleConduiteShortcut(shortcut.label)}
                      style={{
                        padding: '8px 14px',
                        fontSize: '13px',
                        fontWeight: 600,
                        border: '1px solid #E8E9EB',
                        borderRadius: '6px',
                        background: 'white',
                        color: '#2A6484',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#2A6484'
                        e.currentTarget.style.color = 'white'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white'
                        e.currentTarget.style.color = '#2A6484'
                      }}
                      title={shortcut.label}
                    >
                      {shortcut.code}
                    </button>
                  ))}
                </div>

                {/* Text Box */}
                <textarea
                  className="eye-notes-textarea"
                  value={conduiteATenir}
                  onChange={(e) => setConduiteATenir(e.target.value)}
                  placeholder="Conduite à tenir..."
                  style={{ minHeight: '120px', maxHeight: '180px' }}
                />
              </div>
            </div>
          </div>

          {/* Right Column - Actes + Œil Gauche */}
          <div className="right-column">
            {/* Actes Fields - Side by Side */}
            <div className="actes-row">
              {/* Actes Généraux - Simple textarea */}
              <div className="simple-field-container">
                <label>Actes Généraux</label>
                <textarea
                  className="simple-textarea"
                  value={actesGeneraux}
                  onChange={(e) => setActesGeneraux(e.target.value)}
                  placeholder="Tapez..."
                  rows={3}
                />
              </div>

              {/* Actes Ophtalmologiques - Simple textarea */}
              <div className="simple-field-container">
                <label>Actes Ophtalmologiques</label>
                <textarea
                  className="simple-textarea"
                  value={actesOphtalmologiques}
                  onChange={(e) => setActesOphtalmologiques(e.target.value)}
                  placeholder="Tapez..."
                  rows={3}
                />
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="action-buttons-row">
              <button 
                className="action-button eye-button" 
                title="Eye Examination"
                onClick={handleEyeExaminationClick}
              >
                👁️
              </button>
              <button 
                className="action-button glasses-button" 
                title="Prescription"
                onClick={handlePrescriptionClick}
              >
                👓
              </button>
            </div>

            {/* Œil Gauche (OG) */}
            <div className="eye-section">
              <h3 className="eye-title">Œil Gauche (OG)</h3>
              
              <div className="eye-fields-horizontal">
                {/* SV Left */}
                <div className="eye-field-group">
                  <label>SV</label>
                  <div className="eye-input-wrapper">
                    <input
                      type="text"
                      className="eye-input"
                      value={svLeft}
                      onChange={(e) => handleSvLeftChange(e.target.value)}
                      onDoubleClick={handleSvLeftDoubleClick}
                      onFocus={() => setShowSvLeftDropdown(true)}
                      onBlur={() => setTimeout(() => setShowSvLeftDropdown(false), 200)}
                    />
                    {showSvLeftDropdown && filteredSvLeftOptions.length > 0 && (
                      <div className="eye-dropdown">
                        {filteredSvLeftOptions.map((option, index) => (
                          <div
                            key={index}
                            className="eye-option"
                            onClick={() => handleSvLeftSelect(option)}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* AV Left */}
                <div className="eye-field-group">
                  <label>AV</label>
                  <div className="eye-input-wrapper">
                    <input
                      type="text"
                      className="eye-input"
                      value={avLeft}
                      onChange={(e) => handleAvLeftChange(e.target.value)}
                      onDoubleClick={handleAvLeftDoubleClick}
                      onFocus={() => setShowAvLeftDropdown(true)}
                      onBlur={() => setTimeout(() => setShowAvLeftDropdown(false), 200)}
                    />
                    {showAvLeftDropdown && filteredAvLeftOptions.length > 0 && (
                      <div className="eye-dropdown">
                        {filteredAvLeftOptions.map((option, index) => (
                          <div
                            key={index}
                            className="eye-option"
                            onClick={() => handleAvLeftSelect(option)}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Refraction Fields - Left Eye */}
              <div className="eye-fields-horizontal" style={{ marginTop: '12px' }}>
                {/* SPHÈRE Left */}
                <div className="eye-field-group">
                  <label>SPHÈRE</label>
                  <div className="eye-input-wrapper">
                    <input
                      type="text"
                      className="eye-input"
                      value={sphereLeft}
                      onChange={(e) => handleSphereLeftChange(e.target.value)}
                      onDoubleClick={handleSphereLeftDoubleClick}
                      onFocus={() => setShowSphereLeftDropdown(true)}
                      onBlur={() => setTimeout(() => setShowSphereLeftDropdown(false), 200)}
                    />
                    {showSphereLeftDropdown && filteredSphereLeftOptions.length > 0 && (
                      <div className="eye-dropdown">
                        {filteredSphereLeftOptions.map((option, index) => (
                          <div
                            key={index}
                            className="eye-option"
                            onClick={() => handleSphereLeftSelect(option)}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* CYLINDRE Left */}
                <div className="eye-field-group">
                  <label>CYLINDRE</label>
                  <div className="eye-input-wrapper">
                    <input
                      type="text"
                      className="eye-input"
                      value={cylindreLeft}
                      onChange={(e) => handleCylindreLeftChange(e.target.value)}
                      onDoubleClick={handleCylindreLeftDoubleClick}
                      onFocus={() => setShowCylindreLeftDropdown(true)}
                      onBlur={() => setTimeout(() => setShowCylindreLeftDropdown(false), 200)}
                    />
                    {showCylindreLeftDropdown && filteredCylindreLeftOptions.length > 0 && (
                      <div className="eye-dropdown">
                        {filteredCylindreLeftOptions.map((option, index) => (
                          <div
                            key={index}
                            className="eye-option"
                            onClick={() => handleCylindreLeftSelect(option)}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* AXE Left */}
                <div className="eye-field-group">
                  <label>AXE</label>
                  <div className="eye-input-wrapper">
                    <input
                      type="text"
                      className="eye-input"
                      value={axeLeft}
                      onChange={(e) => handleAxeLeftChange(e.target.value)}
                      onDoubleClick={handleAxeLeftDoubleClick}
                      onFocus={() => setShowAxeLeftDropdown(true)}
                      onBlur={() => setTimeout(() => setShowAxeLeftDropdown(false), 200)}
                    />
                    {showAxeLeftDropdown && filteredAxeLeftOptions.length > 0 && (
                      <div className="eye-dropdown">
                        {filteredAxeLeftOptions.map((option, index) => (
                          <div
                            key={index}
                            className="eye-option"
                            onClick={() => handleAxeLeftSelect(option)}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* VL Left - Editable */}
                <div className="eye-field-group">
                  <label>VL</label>
                  <input
                    type="text"
                    className="eye-input"
                    value={vlLeft}
                    onChange={(e) => setVlLeft(e.target.value)}
                  />
                </div>
              </div>

              {/* K1, K2, ADDITION Fields - Left Eye */}
              <div className="eye-fields-horizontal" style={{ marginTop: '12px' }}>
                {/* K1 Left */}
                <div className="eye-field-group">
                  <label>K1</label>
                  <input
                    type="text"
                    className="eye-input field-k1"
                    value={k1Left}
                    onChange={(e) => setK1Left(e.target.value)}
                  />
                </div>

                {/* K2 Left */}
                <div className="eye-field-group">
                  <label>K2</label>
                  <input
                    type="text"
                    className="eye-input field-k2"
                    value={k2Left}
                    onChange={(e) => setK2Left(e.target.value)}
                  />
                </div>

                {/* ADDITION */}
                <div className="eye-field-group">
                  <label>ADDITION</label>
                  <input
                    type="text"
                    className="eye-input"
                    value={addition}
                    onChange={(e) => handleAdditionChange(e.target.value)}
                  />
                </div>
              </div>

              {/* R1, R2, R0, PACHY, T.O.C, D.I.P Fields - Left Eye */}
              <div className="eye-fields-horizontal" style={{ marginTop: '12px' }}>
                {/* R1 Left */}
                <div className="eye-field-group">
                  <label>R1</label>
                  <input
                    type="text"
                    className="eye-input field-r1"
                    value={r1Left}
                    onChange={(e) => setR1Left(e.target.value)}
                  />
                </div>

                {/* R2 Left */}
                <div className="eye-field-group">
                  <label>R2</label>
                  <input
                    type="text"
                    className="eye-input field-r2"
                    value={r2Left}
                    onChange={(e) => setR2Left(e.target.value)}
                  />
                </div>

                {/* R0 Left */}
                <div className="eye-field-group">
                  <label>R0</label>
                  <input
                    type="text"
                    className="eye-input field-r0"
                    value={r0Left}
                    onChange={(e) => setR0Left(e.target.value)}
                  />
                </div>

                {/* PACHY Left */}
                <div className="eye-field-group">
                  <label>PACHY</label>
                  <input
                    type="text"
                    className="eye-input field-pachy"
                    value={pachyLeft}
                    onChange={(e) => setPachyLeft(e.target.value)}
                  />
                </div>

                {/* T.O.C Left */}
                <div className="eye-field-group">
                  <label>T.O.C</label>
                  <input
                    type="text"
                    className="eye-input field-toc"
                    value={tocLeft}
                    onChange={(e) => setTocLeft(e.target.value)}
                  />
                </div>

                {/* D.I.P */}
                <div className="eye-field-group">
                  <label>D.I.P</label>
                  <input
                    type="text"
                    className="eye-input field-dip"
                    value={dip}
                    onChange={(e) => setDip(e.target.value)}
                  />
                </div>
              </div>

              {/* Notes Left Eye */}
              <div style={{ marginTop: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#2A6484', marginBottom: '6px', display: 'block' }}>NOTES</label>
                <textarea
                  className="eye-notes-textarea"
                  value={notesLeft}
                  onChange={(e) => setNotesLeft(e.target.value)}
                  placeholder="Notes..."
                />
              </div>

              {/* GONIO and T.O Fields - Left Eye */}
              <div className="eye-fields-horizontal" style={{ marginTop: '12px' }}>
                {/* GONIO Left */}
                <div className="eye-field-group">
                  <label>GONIO</label>
                  <div className="eye-input-wrapper">
                    <input
                      type="text"
                      className="eye-input"
                      value={gonioLeft}
                      onChange={(e) => handleGonioLeftChange(e.target.value)}
                      onDoubleClick={handleGonioLeftDoubleClick}
                      onFocus={() => setShowGonioLeftDropdown(true)}
                      onBlur={() => setTimeout(() => setShowGonioLeftDropdown(false), 200)}
                    />
                    {showGonioLeftDropdown && filteredGonioLeftOptions.length > 0 && (
                      <div className="eye-dropdown">
                        {filteredGonioLeftOptions.map((option, index) => (
                          <div
                            key={index}
                            className="eye-option"
                            onClick={() => handleGonioLeftSelect(option)}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* T.O Left */}
                <div className="eye-field-group">
                  <label>T.O</label>
                  <input
                    type="text"
                    className="eye-input"
                    value={toLeft}
                    onChange={(e) => setToLeft(e.target.value)}
                    placeholder="T.O..."
                  />
                </div>
              </div>

              {/* L.A.F Left Eye */}
              <div style={{ marginTop: '12px' }}>
                <div className="eye-field-group">
                  <label>L.A.F</label>
                  <div className="eye-input-wrapper">
                    <input
                      type="text"
                      className="eye-input"
                      value={lafLeft}
                      onChange={(e) => handleLafLeftChange(e.target.value)}
                      onDoubleClick={handleLafLeftDoubleClick}
                      onFocus={() => setShowLafLeftDropdown(true)}
                      onBlur={() => setTimeout(() => setShowLafLeftDropdown(false), 200)}
                      placeholder="L.A.F..."
                    />
                    {showLafLeftDropdown && filteredLafLeftOptions.length > 0 && (
                      <div className="eye-dropdown">
                        {filteredLafLeftOptions.map((option, index) => (
                          <div
                            key={index}
                            className="eye-option"
                            onClick={() => handleLafLeftSelect(option)}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* F.O Left Eye */}
              <div style={{ marginTop: '12px' }}>
                <div className="eye-field-group">
                  <label>F.O</label>
                  <div className="eye-input-wrapper">
                    <input
                      type="text"
                      className="eye-input"
                      value={foLeft}
                      onChange={(e) => handleFoLeftChange(e.target.value)}
                      onDoubleClick={handleFoLeftDoubleClick}
                      onFocus={() => setShowFoLeftDropdown(true)}
                      onBlur={() => setTimeout(() => setShowFoLeftDropdown(false), 200)}
                      placeholder="F.O..."
                    />
                    {showFoLeftDropdown && filteredFoLeftOptions.length > 0 && (
                      <div className="eye-dropdown">
                        {filteredFoLeftOptions.map((option, index) => (
                          <div
                            key={index}
                            className="eye-option"
                            onClick={() => handleFoLeftSelect(option)}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* DIAG - Left Eye */}
              <div style={{ marginTop: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#2A6484', marginBottom: '6px', display: 'block' }}>DIAG</label>
                <div className="eye-input-wrapper">
                  <textarea
                    className="eye-notes-textarea"
                    value={diag}
                    onChange={(e) => handleDiagChange(e.target.value)}
                    onDoubleClick={handleDiagDoubleClick}
                    onFocus={() => setShowDiagDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDiagDropdown(false), 200)}
                    placeholder="Diagnostic..."
                    style={{ minHeight: '120px', maxHeight: '180px' }}
                  />
                  {showDiagDropdown && filteredDiagOptions.length > 0 && (
                    <div className="eye-dropdown">
                      {filteredDiagOptions.map((option, index) => (
                        <div
                          key={index}
                          className="eye-option"
                          onClick={() => handleDiagSelect(option)}
                        >
                          {option}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar with Save and Messaging Buttons */}
      <div className="messaging-bottom-bar">
        <div className="bottom-bar-container">
          {/* Save Visit Button */}
          <button 
            className="bottom-bar-btn save-btn"
            onClick={handleSaveVisit}
            title={isEditMode ? 'Modifier la Visite' : 'Enregistrer la Visite'}
          >
            <span className="btn-icon">{isEditMode ? '✏️' : '💾'}</span>
            <span className="btn-text">
              {isEditMode ? 'Modifier la Visite' : 'Enregistrer la Visite'}
            </span>
          </button>

          {/* Validate Payment Button - Always show for doctors/assistants */}
          {(user?.role === 'doctor' || user?.role === 'assistant_1' || user?.role === 'assistant_2') && (
            <button 
              className="bottom-bar-btn validate-payment-btn"
              onClick={handleValidatePaymentClick}
              title="Valider un paiement"
              style={{ background: '#4caf50' }}
            >
              <span className="btn-icon">💳</span>
              <span className="btn-text">Valider Paiement</span>
            </button>
          )}

          {/* Delete Payment Button - Always show for doctors/assistants */}
          {(user?.role === 'doctor' || user?.role === 'assistant_1' || user?.role === 'assistant_2') && (
            <button 
              className="bottom-bar-btn delete-payment-btn"
              onClick={handleDeletePayment}
              title="Supprimer le paiement validé"
              style={{ background: '#ff4444' }}
            >
              <span className="btn-icon">🗑️</span>
              <span className="btn-text">Supprimer Paiement</span>
            </button>
          )}

          {/* Ordonnance Button - For doctors/assistants only */}
          {(user?.role === 'doctor' || user?.role === 'assistant_1' || user?.role === 'assistant_2') && patient && (
            <button 
              className="bottom-bar-btn ordonnance-btn"
              onClick={() => executeWithPaymentReminder(() => {
                navigate('/ordonnance', { 
                  state: { 
                    patient: {
                      nom: patient.lastName,
                      prenom: patient.firstName,
                      age: patient.age,
                      id: patient.id,
                      departmentCode: patient.departmentCode
                    }
                  }
                })
              })}
              title="Créer une ordonnance"
              style={{ background: '#673ab7' }}
            >
              <span className="btn-icon">📝</span>
              <span className="btn-text">Ordonnance</span>
            </button>
          )}

          {/* Send Message Button */}
          <button 
            className="bottom-bar-btn send-btn"
            onClick={handleSendMessageClick}
            title="Envoyer un message"
          >
            <span className="btn-icon">📨</span>
            <span className="btn-text">Envoyer un message</span>
          </button>

          {/* Received Messages Button */}
          <button 
            className="bottom-bar-btn received-btn"
            onClick={handleReceivedMessagesClick}
            title="Messages reçus"
          >
            <span className="btn-icon">📬</span>
            <span className="btn-text">Messages Reçus</span>
            {newMessages.length > 0 && (
              <span className="bottom-bar-badge">{newMessages.length}</span>
            )}
          </button>

          {/* Patient Action Buttons for Doctors/Assistants */}
          {(user?.role === 'doctor' || user?.role === 'assistant_1' || user?.role === 'assistant_2') && patient && (
            <>
              <div className="bottom-bar-divider" />
              <button 
                className="bottom-bar-btn action-btn"
                onClick={() => handleSendPatientToNurse('S', 'Dilatation sous Skiacol')}
                title="Dilatation sous Skiacol"
                style={{ background: '#9c27b0' }}
              >
                <span className="btn-text">S</span>
              </button>
              <button 
                className="bottom-bar-btn action-btn"
                onClick={() => handleSendPatientToNurse('D', 'Dilatation OD')}
                title="Dilatation OD (Œil Droit)"
                style={{ background: '#2196f3' }}
              >
                <span className="btn-text">D</span>
              </button>
              <button 
                className="bottom-bar-btn action-btn"
                onClick={() => handleSendPatientToNurse('G', 'Dilatation OG')}
                title="Dilatation OG (Œil Gauche)"
                style={{ background: '#ff9800' }}
              >
                <span className="btn-text">G</span>
              </button>
              <button 
                className="bottom-bar-btn action-btn"
                onClick={() => handleSendPatientToNurse('ODG', 'Dilatation ODG')}
                title="Dilatation ODG (Les Deux Yeux)"
                style={{ background: '#f44336' }}
              >
                <span className="btn-text">ODG</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Payment Validation Modal */}
      <PaymentValidationModal
        isOpen={showPaymentModal}
        patientName={patient ? `${patient.firstName} ${patient.lastName}`.trim() : undefined}
        patientId={patient?.departmentCode?.toString()}
        onClose={() => {
          setShowPaymentModal(false)
          
          // Execute pending action when modal closes (user ignored the reminder)
          if (pendingAction) {
            pendingAction()
            setPendingAction(null)
          }
          
          // If we were trying to navigate (from back button), do it now
          if (wantsToNavigate) {
            setWantsToNavigate(false)
            navigate(`/patient/${patientId}`)
          }
          // Otherwise user can continue working on the page
        }}
        onValidate={handlePaymentValidation}
      />

      {/* Messaging Modals */}
      <RoomBasedSendMessageModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        patientContext={{
          patientName: patient?.fullName,
          patientId: patient?.id?.toString()
        }}
      />

      <RoomBasedReceiveMessageModal
        isOpen={isReceivedMessagesOpen}
        onClose={() => setIsReceivedMessagesOpen(false)}
      />

      {/* Glasses Prescription Modal */}
      <GlassesPrescriptionModal
        isOpen={showGlassesPrescriptionModal}
        onClose={() => setShowGlassesPrescriptionModal(false)}
        patientName={`${firstName} ${lastName}`.trim()}
        patientAge={age}
        patientCode={patient?.departmentCode?.toString() || patientId}
        visionData={{
          vl: {
            od: {
              sphere: sphereRight || '',
              cylinder: cylindreRight || '',
              axis: axeRight || ''
            },
            og: {
              sphere: sphereLeft || '',
              cylinder: cylindreLeft || '',
              axis: axeLeft || ''
            },
            addition: addition || ''
          }
        }}
      />
      
      {/* Contact Lens Modal */}
      <ContactLensModal
        isOpen={showContactLensModal}
        onClose={() => setShowContactLensModal(false)}
        patient={patient}
        visionData={{
          od: {
            sphere: sphereRight || '',
            cylinder: cylindreRight || '',
            axis: axeRight || '',
            vl: vlRight || ''
          },
          og: {
            sphere: sphereLeft || '',
            cylinder: cylindreLeft || '',
            axis: axeLeft || '',
            vl: vlLeft || ''
          },
          addition: addition || ''
        }}
      />
    </div>
  )
}

export default NewVisitPage
