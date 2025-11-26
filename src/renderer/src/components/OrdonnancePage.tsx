import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './OrdonnancePage.css';
import { useAuthStore } from '../store/authStore';
import RoomBasedSendMessageModal from './RoomBasedSendMessageModal';
import RoomBasedReceiveMessageModal from './RoomBasedReceiveMessageModal';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import JsBarcode from 'jsbarcode';

// Template texts for special buttons
const TEMPLATES = {
  'Rep.C': `Chere consoeur

Permettez moi de vous adresser le /la patient(e) sus nommé(e)

qui presente :

Pour : Avis et eventuel adjustement thérapeutique.`,
  
  'A.V': `Je soussigne certifie que le (a) sus nomme age

Acuite visuelle sans correction :
OD :
OG :

Acuite visuelle avec correction :
OD :
OG :`,
  
  'C.R': `Je soussignee certifie avoir examine le patient sus nomme

L'examen ophtalmologique objective :

- Fond d'oeil :`,

  'ART (scol)': (doctorName: string, days: string) => {
    const numberWord = numberToFrench(parseInt(days) || 0);
    return `Je soussigné, ${doctorName}, certifie avoir examiné, ce jour, le sus-nommé

dont l'état de santé nécessite une éviction scolaire de :

${numberWord} (${days}) jours à compter d'aujourd'hui.


Sauf complications.




                                                      Dont certificat.`;
  },

  'ART (W)': (doctorName: string, days: string) => {
    const numberWord = numberToFrench(parseInt(days) || 0);
    return `Je soussigné, ${doctorName}, certifie avoir examiné, ce jour, le sus-nommé

dont l'état de santé nécessite un arrêt de travail de :

${numberWord} (${days}) jours à compter d'aujourd'hui.


Sauf complications.




                                                      Dont certificat.`;
  }
};

// Convert number to French words
function numberToFrench(num: number): string {
  const ones = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 
                'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
  
  if (num < 20) return ones[num];
  if (num < 100) {
    const ten = Math.floor(num / 10);
    const one = num % 10;
    if (one === 0) return tens[ten];
    if (ten === 7 || ten === 9) return tens[ten - 1] + '-' + ones[10 + one];
    return tens[ten] + '-' + ones[one];
  }
  return num.toString(); // For larger numbers, just return the number
}

interface Medicine {
  id: number;
  code: string;
  libprep: string;
  nbpres: number;
  nature: string;
  actualCount?: number;
}

interface Acte {
  id: number;
  libacte: string;
}

interface Quantity {
  id: number;
  qtite: string;
}

interface Ordonnance {
  id: number;
  date: string;
  patientCode: string;
  acte: string;
  content: string;
}

const ACTES_DATA: Acte[] = [
  { id: 1, libacte: "ORDONNANCE" },
  { id: 2, libacte: "DEMANDE DE BILAN" },
  { id: 3, libacte: "CERTIFICAT MEDICAL" },
  { id: 4, libacte: "CERTIFICAT D'ARRÊT DE TRAVAIL" },
  { id: 5, libacte: "CERTIFICAT D'ARRÊT DE SCOLARITE" },
  { id: 6, libacte: "ORIENTATION" },
  { id: 7, libacte: "REPONSE" },
  { id: 8, libacte: "LENTILLES DE CONTACT" },
  { id: 9, libacte: "CORRECTION OPTIQUE" },
  { id: 10, libacte: "PROTOCOLE OPERATOIRE" },
  { id: 11, libacte: "COMPTE RENDU MEDICAL" },
  { id: 12, libacte: "COMPTE RENDU" },
  { id: 13, libacte: "Certificat de séjour" },
  { id: 14, libacte: "CERTIFICAT MEDICAL DESCRIPTIF" },
  { id: 15, libacte: "FACTURE" },
  { id: 16, libacte: "Demande d'avis" }
];

const OrdonnancePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  
  // Get current logged-in user from auth store
  const currentUser = useAuthStore((state) => state.user);
  const sessionName = useAuthStore((state) => state.sessionName);
  
  // Convert date from M/D/YYYY or DD/MM/YYYY to YYYY-MM-DD for HTML date input
  const convertToISODate = useCallback((dateStr: string): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    // If already in ISO format (YYYY-MM-DD), return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Try to parse M/D/YYYY or DD/MM/YYYY format
    try {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        // Check if it's M/D/YYYY (month first) or DD/MM/YYYY (day first)
        // If first part > 12, it's DD/MM/YYYY
        const isMonthFirst = parseInt(parts[0]) <= 12 && parseInt(parts[1]) > 12;
        
        if (isMonthFirst || parseInt(parts[0]) < 12) {
          // M/D/YYYY format
          const month = parts[0].padStart(2, '0');
          const day = parts[1].padStart(2, '0');
          const year = parts[2];
          return `${year}-${month}-${day}`;
        } else {
          // DD/MM/YYYY format
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          return `${year}-${month}-${day}`;
        }
      }
    } catch (error) {
      console.error('Error converting date:', error);
    }
    
    return new Date().toISOString().split('T')[0];
  }, []);
  
  // Get patient data from navigation state
  const { patient } = location.state || {};
  
  const [activeTab, setActiveTab] = useState<'prescriptions' | 'bilan' | 'comptes'>('prescriptions');
  const [selectedActe, setSelectedActe] = useState<string>('ORDONNANCE');
  const [prescriptionText, setPrescriptionText] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [quantities, setQuantities] = useState<Quantity[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Patient info state
  const [patientName, setPatientName] = useState(patient?.nom || '');
  const [patientPrenom, setPatientPrenom] = useState(patient?.prenom || '');
  const [patientAge, setPatientAge] = useState(patient?.age || '');
  
  // Print with another person fields
  const [printWithName, setPrintWithName] = useState('');
  const [printWithPrenom, setPrintWithPrenom] = useState('');
  const [printWithAge, setPrintWithAge] = useState('');
  
  // Get doctor name from localStorage
  const [doctorName, setDoctorName] = useState('');
  
  // Ordonnance navigation
  const [ordonnances, setOrdonnances] = useState<Ordonnance[]>([]);
  const [currentOrdonnanceIndex, setCurrentOrdonnanceIndex] = useState(0);
  
  // Bilan acts (all except ORDONNANCE and COMPTE RENDU)
  const [bilanActs, setBilanActs] = useState<Ordonnance[]>([]);
  const [currentBilanIndex, setCurrentBilanIndex] = useState(0);
  const [bilanText, setBilanText] = useState('');
  const [jourValue, setJourValue] = useState('');
  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [newMedicineCode, setNewMedicineCode] = useState('');
  const [newMedicineLibprep, setNewMedicineLibprep] = useState('');
  const [editingMedicineId, setEditingMedicineId] = useState<number | null>(null);
  const [editingCount, setEditingCount] = useState('');
  
  // Comptes Rendus state
  const [comptesRendusTemplates, setComptesRendusTemplates] = useState<any[]>([]); // Templates from hi.xml
  const [comptesRendusActs, setComptesRendusActs] = useState<Ordonnance[]>([]); // Actual saved comptes rendus
  const [currentComptesRendusIndex, setCurrentComptesRendusIndex] = useState(0);
  const [comptesRendusText, setComptesRendusText] = useState('');
  const [comptesRendusSearchTerm, setComptesRendusSearchTerm] = useState('');
  const comptesEditorRef = useRef<HTMLDivElement>(null);
  
  // Unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Message modals
  const [showSendMessage, setShowSendMessage] = useState(false);
  const [showReceivedMessages, setShowReceivedMessages] = useState(false);
  
  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(() => {
    console.log('🔍 Getting current user from auth store...');
    console.log('👤 Current user:', currentUser);
    console.log('📝 Session name:', sessionName);
    
    if (currentUser) {
      // For assistants, use sessionName (the name they entered at login)
      // Otherwise use the user's name from the database
      const name = sessionName || currentUser.assistantName || currentUser.name || 'Docteur';
      
      setDoctorName(name);
      console.log('✅ Doctor name set to:', name);
    } else {
      console.warn('⚠️ No user logged in');
      setDoctorName('Docteur');
    }
    
    // Set patient info if available
    const patientData = patient || location.state?.patient;
    if (patientData) {
      const name = patientData.lastName || patientData.nom || '';
      const prenom = patientData.firstName || patientData.prenom || '';
      const age = patientData.age?.toString() || '';
      
      setPatientName(name);
      setPatientPrenom(prenom);
      setPatientAge(age);
      console.log('✅ Patient loaded:', { name, prenom, age, departmentCode: patientData.departmentCode });
    }
    
    // Load all data from database
    loadDataFromDatabase();
  }, [patient, location.state, currentUser, sessionName]);
  
  // Update prescription content when navigating ordonnances
  useEffect(() => {
    if (ordonnances.length > 0 && currentOrdonnanceIndex >= 0 && currentOrdonnanceIndex < ordonnances.length) {
      const currentOrd = ordonnances[currentOrdonnanceIndex];
      setPrescriptionText(currentOrd.content || '');
      setSelectedActe(currentOrd.acte || 'ORDONNANCE');
      
      // Update the date field with the ordonnance's date (convert to ISO format)
      if (currentOrd.date) {
        const isoDate = convertToISODate(currentOrd.date);
        setSelectedDate(isoDate);
        console.log(`📅 Updated date from ${currentOrd.date} to ISO: ${isoDate}`);
      }
      
      console.log(`📄 Loaded ordonnance ${currentOrdonnanceIndex + 1}/${ordonnances.length}:`, {
        acte: currentOrd.acte,
        date: currentOrd.date,
        contentLength: currentOrd.content?.length || 0,
        contentPreview: currentOrd.content?.substring(0, 100)
      });
    }
  }, [currentOrdonnanceIndex, ordonnances, convertToISODate]);
  
  // Update bilan content when navigating bilan acts
  useEffect(() => {
    if (bilanActs.length > 0 && currentBilanIndex >= 0 && currentBilanIndex < bilanActs.length) {
      const currentAct = bilanActs[currentBilanIndex];
      setBilanText(currentAct.content || '');
      if (currentAct.acte) {
        setSelectedActe(currentAct.acte);
      }
      
      // Update the date field with the act's date
      if (currentAct.date) {
        const isoDate = convertToISODate(currentAct.date);
        setSelectedDate(isoDate);
        console.log(`📅 Updated bilan date from ${currentAct.date} to ISO: ${isoDate}`);
      }
      
      console.log(`📋 Loaded bilan act ${currentBilanIndex + 1}/${bilanActs.length}:`, {
        acte: currentAct.acte,
        date: currentAct.date,
        contentLength: currentAct.content?.length || 0
      });
    }
  }, [currentBilanIndex, bilanActs, convertToISODate]);
  
  // Update comptes rendus content when navigating acts
  useEffect(() => {
    if (comptesRendusActs.length > 0 && currentComptesRendusIndex >= 0 && currentComptesRendusIndex < comptesRendusActs.length) {
      const currentAct = comptesRendusActs[currentComptesRendusIndex];
      setComptesRendusText(currentAct.content || '');
      
      // Update contentEditable div
      if (comptesEditorRef.current) {
        comptesEditorRef.current.innerHTML = currentAct.content || '';
      }
      
      if (currentAct.acte) {
        setSelectedActe(currentAct.acte);
      }
      
      // Update the date field with the act's date
      if (currentAct.date) {
        const isoDate = convertToISODate(currentAct.date);
        setSelectedDate(isoDate);
        console.log(`📅 Updated comptes rendus date from ${currentAct.date} to ISO: ${isoDate}`);
      }
      
      console.log(`📄 Loaded comptes rendus ${currentComptesRendusIndex + 1}/${comptesRendusActs.length}:`, {
        acte: currentAct.acte,
        date: currentAct.date,
        contentLength: currentAct.content?.length || 0
      });
    }
  }, [currentComptesRendusIndex, comptesRendusActs, convertToISODate]);
  
  // Track unsaved changes
  useEffect(() => {
    // Mark as changed when text is modified
    setHasUnsavedChanges(true);
  }, [prescriptionText, bilanText, comptesRendusText]);
  
  // Handle back navigation with unsaved changes warning
  const handleBack = async () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        '⚠️ Vous avez des modifications non sauvegardées!\n\nVoulez-vous sauvegarder avant de quitter?'
      );
      if (confirmed) {
        // User wants to save - save all tabs
        const patientData = patient || location.state?.patient;
        if (!patientData?.departmentCode) {
          alert('❌ Pas de patient sélectionné');
          navigate(-1);
          return;
        }
        
        try {
          const savePromises = [];
          
          // Save Prescriptions if there's content
          if (prescriptionText && prescriptionText.trim() !== '') {
            console.log('💾 Saving Prescriptions...');
            savePromises.push(
              window.electronAPI.ordonnances.create({
                patientCode: patientData.departmentCode,
                dateOrd: selectedDate,
                strait: prescriptionText,
                medecin: doctorName,
                actex: 'ORDONNANCE'
              })
            );
          }
          
          // Save Bilan if there's content
          if (bilanText && bilanText.trim() !== '') {
            console.log('💾 Saving Bilan...');
            savePromises.push(
              window.electronAPI.ordonnances.create({
                patientCode: patientData.departmentCode,
                dateOrd: selectedDate,
                strait: bilanText,
                medecin: doctorName,
                actex: selectedActe || 'BILAN'
              })
            );
          }
          
          // Save Comptes Rendus if there's content
          if (comptesRendusText && comptesRendusText.trim() !== '') {
            console.log('💾 Saving Comptes Rendus...');
            savePromises.push(
              window.electronAPI.ordonnances.create({
                patientCode: patientData.departmentCode,
                dateOrd: selectedDate,
                strait: comptesRendusText,
                medecin: doctorName,
                actex: 'COMPTE RENDU MEDICAL'
              })
            );
          }
          
          // Wait for all saves to complete
          if (savePromises.length > 0) {
            await Promise.all(savePromises);
            console.log('✅ All content saved successfully!');
            alert('✅ Toutes les modifications ont été sauvegardées!');
          }
          
        } catch (error) {
          console.error('Error saving:', error);
          alert('❌ Erreur lors de la sauvegarde');
        }
      }
    }
    // Navigate back regardless of save choice
    navigate(-1);
  };
  
  const loadDataFromDatabase = async () => {
    await loadMedicines();
    await loadQuantities();
    await loadComptesRendusTemplates();
    
    // Get patient data from either prop or location.state
    const patientData = patient || location.state?.patient;
    const departmentCode = patientData?.departmentCode;
    
    if (departmentCode) {
      console.log(`🔍 Loading data for patient with departmentCode: ${departmentCode}`);
      await loadOrdonnances(departmentCode);
      await loadBilanActs(departmentCode);
      await loadComptesRendusActs(departmentCode);
    } else {
      console.warn('⚠️ No departmentCode available - cannot load data');
      console.log('Patient data:', patientData);
    }
  };
  
  // Load medicines from database
  const loadMedicines = async () => {
    try {
      console.log('💊 Loading medicines from database...');
      
      // Check if API exists
      if (!window.electronAPI?.medicines?.getAll) {
        console.error('❌ Medicines API not available!');
        console.log('Available APIs:', Object.keys(window.electronAPI || {}));
        return;
      }
      
      const result = await window.electronAPI.medicines.getAll();
      console.log('Raw result from API:', result);
      
      if (result?.success && result?.data && Array.isArray(result.data)) {
        console.log(`📊 Received ${result.data.length} medicines from database`);
        console.log('First 5 medicines:', result.data.slice(0, 5));
        
        // Sort by actualCount descending
        const sortedMedicines = [...result.data].sort((a, b) => 
          (b.actualCount || 0) - (a.actualCount || 0)
        );
        
        setMedicines(sortedMedicines);
        console.log(`✅ Set ${sortedMedicines.length} medicines in state`);
        
        // Log top medicines with counts
        const topMeds = sortedMedicines.slice(0, 5);
        topMeds.forEach(m => {
          console.log(`  - ${m.code}: ${m.actualCount} uses`);
        });
      } else {
        console.error('❌ Failed to load medicines:', result?.error || 'Invalid response');
        console.error('Full result:', result);
      }
    } catch (error) {
      console.error('❌ Error loading medicines:', error);
      console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    }
  };
  
  // Load quantities from database
  const loadQuantities = async () => {
    try {
      console.log('📦 Loading quantities from database...');
      
      const result = await window.electronAPI.quantities.getAll();
      
      if (result.success && result.data) {
        setQuantities(result.data);
        console.log(`✅ Loaded ${result.data.length} quantities`);
      } else {
        // Default quantities if database is empty
        const defaultQuantities: Quantity[] = [
          { id: 1, qtite: "1 Flc" },
          { id: 2, qtite: "2 Flcs" },
          { id: 3, qtite: "3 Flcs" },
          { id: 11, qtite: "1 Bte" },
          { id: 12, qtite: "2 Btes" },
          { id: 8, qtite: "Qsp 3 mois" },
          { id: 10, qtite: "Qsp 7 jours" },
          { id: 18, qtite: "1 Tbe" }
        ];
        setQuantities(defaultQuantities);
      }
    } catch (error) {
      console.error('Error loading quantities:', error);
    }
  };
  
  // Load Comptes Rendus templates from database
  const loadComptesRendusTemplates = async () => {
    try {
      console.log('📄 Loading comptes rendus templates from database...');
      
      if (!window.electronAPI?.comptesRendus?.getAll) {
        console.error('❌ Comptes Rendus API not available!');
        return;
      }
      
      const result = await window.electronAPI.comptesRendus.getAll();
      
      if (result?.success && result?.data && Array.isArray(result.data)) {
        console.log(`✅ Loaded ${result.data.length} comptes rendus templates`);
        setComptesRendusTemplates(result.data);
      } else {
        console.warn('⚠️ No comptes rendus data returned from database');
        setComptesRendusTemplates([]);
      }
    } catch (error) {
      console.error('Error loading comptes rendus:', error);
      setComptesRendusTemplates([]);
    }
  };
  
  // Load Comptes Rendus acts from database (patient-specific)
  const loadComptesRendusActs = async (patientCode: number) => {
    try {
      console.log(`📄 Loading Comptes Rendus acts for patient ${patientCode}...`);
      
      if (!window.electronAPI?.ordonnances?.getByPatient) {
        console.error('❌ Ordonnance API not available');
        return;
      }
      
      const result = await window.electronAPI.ordonnances.getByPatient(patientCode);
      
      if (result.success && result.data && Array.isArray(result.data)) {
        // Filter to only include COMPTE RENDU acts and map fields
        const filteredData = result.data
          .filter((ord: any) => {
            const actex = ord.actex || '';
            const actexUpper = actex.toUpperCase().trim();
            return actexUpper === 'COMPTE RENDU' || actexUpper === 'COMPTE RENDU MEDICAL';
          })
          .map((ord: any) => ({
            id: ord.id,
            date: ord.dateOrd || new Date().toISOString().split('T')[0],
            patientCode: ord.patientCode,
            acte: ord.actex || '',
            content: ord.strait || ord.strait1 || ord.strait2 || ''
          }));
        
        console.log(`✅ Found ${filteredData.length} Comptes Rendus acts`);
        if (filteredData.length > 0) {
          console.log('📄 First Compte Rendu content:', {
            id: filteredData[0].id,
            date: filteredData[0].date,
            contentLength: filteredData[0].content?.length || 0,
            contentPreview: (filteredData[0].content || '').substring(0, 100)
          });
        }
        
        setComptesRendusActs(filteredData);
        
        // If we have acts, load the first one
        if (filteredData.length > 0) {
          setCurrentComptesRendusIndex(0);
        }
      } else {
        setComptesRendusActs([]);
      }
    } catch (error) {
      console.error('Error loading comptes rendus acts:', error);
      setComptesRendusActs([]);
    }
  };
  
  // Load Bilan acts from database (all except ORDONNANCE and COMPTE RENDU)
  const loadBilanActs = async (patientCode: number) => {
    try {
      console.log(`📋 Loading Bilan acts for patient ${patientCode}...`);
      
      if (!window.electronAPI?.ordonnances?.getByPatient) {
        console.error('❌ Ordonnance API not available');
        return;
      }
      
      const result = await window.electronAPI.ordonnances.getByPatient(patientCode);
      console.log('📦 Raw result from API:', result);
      
      if (result.success && result.data && Array.isArray(result.data)) {
        console.log(`📚 Total records from DB: ${result.data.length}`);
        console.log('🔍 Sample actex values:', result.data.slice(0, 5).map((d: any) => d.actex));
        
        // Filter to exclude ONLY: ORDONNANCE and COMPTE RENDU (exact matches)
        const filteredData = result.data.filter((ord: any) => {
          const actex = ord.actex || '';
          const actexUpper = actex.toUpperCase().trim();
          
          // ONLY exclude these 2 specific types
          const exclude = actexUpper === 'ORDONNANCE' || 
                         actexUpper === 'COMPTE RENDU' ||
                         actexUpper === 'COMPTE RENDU MEDICAL';
          
          if (!exclude) {
            console.log(`✅ Including: ${actex}`);
          } else {
            console.log(`❌ Excluding: ${actex}`);
          }
          return !exclude;
        });
        
        console.log(`📊 Filtered: ${filteredData.length} Bilan acts out of ${result.data.length} total`);
        console.log('📋 Filtered act types:', filteredData.slice(0, 10).map((d: any) => d.actex));
        
        const bilanArray: Ordonnance[] = filteredData.map((ord: any) => ({
          id: ord.id,
          date: ord.dateOrd || new Date().toISOString().split('T')[0],
          patientCode: ord.patientCode,
          acte: ord.actex || '',
          content: ord.strait || ord.strait1 || ord.strait2 || ''
        }));
        
        setBilanActs(bilanArray);
        console.log(`✅ Set ${bilanArray.length} Bilan acts in state`);
        
        if (bilanArray.length > 0) {
          setCurrentBilanIndex(bilanArray.length - 1);
          console.log(`📍 Set current index to: ${bilanArray.length - 1}`);
        }
      } else {
        console.warn('⚠️ No data or unsuccessful result:', result);
      }
    } catch (error) {
      console.error('❌ Error loading Bilan acts:', error);
      setBilanActs([]);
    }
  };
  
  // Load ordonnances from database for current patient
  const loadOrdonnances = async (patientCode: number) => {
    try {
      console.log(`📄 Loading ordonnances for patient ${patientCode}...`);
      
      // Check if API exists
      if (!window.electronAPI?.ordonnances?.getByPatient) {
        console.error('❌ Ordonnance API not available');
        return;
      }
      
      const result = await window.electronAPI.ordonnances.getByPatient(patientCode);
      console.log('📦 Raw ordonnances result:', result);
      
      if (result.success && result.data && Array.isArray(result.data)) {
        // Filter to only show records with actex = 'ORDONNANCE' in Prescriptions Médicales tab
        const filteredData = result.data.filter((ord: any) => ord.actex === 'ORDONNANCE');
        
        console.log(`📊 Filtered: ${filteredData.length} ORDONNANCE records out of ${result.data.length} total`);
        
        // Convert database ordonnances to frontend format
        const ordonnancesArray: Ordonnance[] = filteredData.map((ord: any) => {
          const mappedOrd = {
            id: ord.id,
            date: ord.dateOrd || new Date().toISOString().split('T')[0],
            patientCode: ord.patientCode,
            acte: ord.actex || 'ORDONNANCE',
            content: ord.strait || ''
          };
          
          // Log each ordonnance for debugging
          console.log(`  📋 Ordonnance ${ord.id}:`, {
            date: mappedOrd.date,
            acte: mappedOrd.acte,
            contentLength: mappedOrd.content.length,
            hasContent: !!mappedOrd.content,
            contentStart: mappedOrd.content.substring(0, 50)
          });
          
          return mappedOrd;
        });
        
        setOrdonnances(ordonnancesArray);
        console.log(`✅ Successfully loaded ${ordonnancesArray.length} ordonnances for patient ${patientCode}`);
        
        // Set current index to last ordonnance (most recent)
        if (ordonnancesArray.length > 0) {
          const lastIndex = ordonnancesArray.length - 1;
          setCurrentOrdonnanceIndex(lastIndex);
          console.log(`🎯 Set current index to ${lastIndex} (last ordonnance)`);
        }
      } else {
        console.warn('⚠️ No ordonnances found or invalid response:', {
          success: result?.success,
          hasData: !!result?.data,
          isArray: Array.isArray(result?.data),
          error: result?.error
        });
        setOrdonnances([]);
      }
    } catch (error) {
      console.error('❌ Error loading ordonnances:', error);
      console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
      setOrdonnances([]);
    }
  };
  
  const navigateOrdonnance = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentOrdonnanceIndex > 0) {
      setCurrentOrdonnanceIndex(currentOrdonnanceIndex - 1);
    } else if (direction === 'next' && currentOrdonnanceIndex < ordonnances.length - 1) {
      setCurrentOrdonnanceIndex(currentOrdonnanceIndex + 1);
    }
  };
  
  const handleNewOrdonnance = async () => {
    if (isSaving) return;
    
    const patientData = patient || location.state?.patient;
    if (!patientData?.departmentCode) {
      alert('❌ Pas de patient sélectionné');
      return;
    }
    
    // INSTANT UI UPDATE - optimistic
    const tempId = Date.now();
    const newOrd: Ordonnance = {
      id: tempId,
      date: new Date().toISOString().split('T')[0],
      patientCode: patientData.departmentCode.toString(),
      acte: 'ORDONNANCE',
      content: ''
    };
    
    // Add to list immediately
    setOrdonnances(prev => [...prev, newOrd]);
    setCurrentOrdonnanceIndex(ordonnances.length);
    setPrescriptionText('');
    setSelectedActe('ORDONNANCE');
    setSelectedDate(new Date().toISOString().split('T')[0]);
    
    // Save to DB in background
    setIsSaving(true);
    try {
      const result = await window.electronAPI.ordonnances.create({
        patientCode: patientData.departmentCode,
        dateOrd: newOrd.date,
        strait: '',
        medecin: doctorName,
        actex: 'ORDONNANCE'
      });
      
      if (result.success && result.data) {
        // Update with real ID from DB
        setOrdonnances(prev => prev.map(o => o.id === tempId ? { ...o, id: result.data.id } : o));
        setHasUnsavedChanges(false); // Clear unsaved changes flag
      }
    } catch (error) {
      console.error('Error creating ordonnance:', error);
      // Rollback on error
      setOrdonnances(prev => prev.filter(o => o.id !== tempId));
      alert('❌ Erreur lors de la création');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSaveOrdonnance = async () => {
    if (isSaving) return;
    
    const patientData = patient || location.state?.patient;
    if (!patientData?.departmentCode) {
      alert('❌ Pas de patient sélectionné');
      return;
    }
    
    // INSTANT UI UPDATE - add to list immediately
    const tempId = Date.now();
    const newOrd: Ordonnance = {
      id: tempId,
      date: selectedDate,
      patientCode: patientData.departmentCode.toString(),
      acte: selectedActe,
      content: prescriptionText || ''
    };
    
    setOrdonnances(prev => [...prev, newOrd]);
    setCurrentOrdonnanceIndex(ordonnances.length);
    setPrescriptionText('');
    setSelectedDate(new Date().toISOString().split('T')[0]);
    
    // Save to DB in background
    setIsSaving(true);
    try {
      const result = await window.electronAPI.ordonnances.create({
        patientCode: patientData.departmentCode,
        dateOrd: newOrd.date,
        strait: newOrd.content,
        medecin: doctorName,
        actex: selectedActe
      });
      
      if (result.success && result.data) {
        // Update with real ID
        setOrdonnances(prev => prev.map(o => o.id === tempId ? { ...o, id: result.data.id } : o));
        setHasUnsavedChanges(false); // Clear unsaved changes flag
      }
    } catch (error) {
      console.error('Error saving ordonnance:', error);
      // Rollback
      setOrdonnances(prev => prev.filter(o => o.id !== tempId));
      alert('❌ Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteOrdonnance = async () => {
    if (isDeleting) return;
    
    const patientData = patient || location.state?.patient;
    if (!patientData?.departmentCode || ordonnances.length === 0) {
      alert('❌ Aucune ordonnance à supprimer');
      return;
    }
    
    const currentOrd = ordonnances[currentOrdonnanceIndex];
    if (!currentOrd) return;
    
    if (!confirm(`Voulez-vous vraiment supprimer cette ordonnance?`)) {
      return;
    }
    
    // INSTANT UI UPDATE - remove immediately
    const deletedId = currentOrd.id;
    const newIndex = currentOrdonnanceIndex > 0 ? currentOrdonnanceIndex - 1 : 0;
    
    setOrdonnances(prev => prev.filter(o => o.id !== deletedId));
    setCurrentOrdonnanceIndex(newIndex);
    setPrescriptionText('');
    
    // Delete from DB in background
    setIsDeleting(true);
    try {
      await window.electronAPI.ordonnances.delete(deletedId);
    } catch (error) {
      console.error('Error deleting ordonnance:', error);
      // Rollback - restore the deleted item
      setOrdonnances(prev => {
        const restored = [...prev];
        restored.splice(currentOrdonnanceIndex, 0, currentOrd);
        return restored;
      });
      alert('❌ Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleDeleteBilanAct = async () => {
    if (isDeleting) return;
    
    const patientData = patient || location.state?.patient;
    if (!patientData?.departmentCode || bilanActs.length === 0) {
      alert('❌ Aucun acte à supprimer');
      return;
    }
    
    const currentAct = bilanActs[currentBilanIndex];
    if (!currentAct) return;
    
    if (!confirm(`Voulez-vous vraiment supprimer cet acte?`)) {
      return;
    }
    
    // INSTANT UI UPDATE - remove immediately
    const deletedId = currentAct.id;
    const newIndex = currentBilanIndex > 0 ? currentBilanIndex - 1 : 0;
    
    setBilanActs(prev => prev.filter(a => a.id !== deletedId));
    setCurrentBilanIndex(newIndex);
    setBilanText('');
    
    // Delete from DB in background
    setIsDeleting(true);
    try {
      await window.electronAPI.ordonnances.delete(deletedId);
    } catch (error) {
      console.error('Error deleting bilan act:', error);
      // Rollback
      setBilanActs(prev => {
        const restored = [...prev];
        restored.splice(currentBilanIndex, 0, currentAct);
        return restored;
      });
      alert('❌ Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleNewBilanAct = async () => {
    if (isSaving) return;
    
    const patientData = patient || location.state?.patient;
    if (!patientData?.departmentCode) {
      alert('❌ Pas de patient sélectionné');
      return;
    }
    
    // INSTANT UI UPDATE
    const tempId = Date.now();
    const newAct: Ordonnance = {
      id: tempId,
      date: new Date().toISOString().split('T')[0],
      patientCode: patientData.departmentCode.toString(),
      acte: selectedActe,
      content: ''
    };
    
    setBilanActs(prev => [...prev, newAct]);
    setCurrentBilanIndex(bilanActs.length);
    setBilanText('');
    setJourValue('');
    
    // Save to DB in background
    setIsSaving(true);
    try {
      const result = await window.electronAPI.ordonnances.create({
        patientCode: patientData.departmentCode,
        dateOrd: newAct.date,
        strait: '',
        medecin: doctorName,
        actex: selectedActe
      });
      
      if (result.success && result.data) {
        setBilanActs(prev => prev.map(a => a.id === tempId ? { ...a, id: result.data.id } : a));
      }
    } catch (error) {
      console.error('Error creating bilan act:', error);
      setBilanActs(prev => prev.filter(a => a.id !== tempId));
      alert('❌ Erreur lors de la création');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSaveBilanAct = async () => {
    if (isSaving) return;
    
    const patientData = patient || location.state?.patient;
    if (!patientData?.departmentCode) {
      alert('❌ Pas de patient sélectionné');
      return;
    }
    
    // INSTANT UI UPDATE
    const tempId = Date.now();
    const newAct: Ordonnance = {
      id: tempId,
      date: selectedDate,
      patientCode: patientData.departmentCode.toString(),
      acte: selectedActe,
      content: bilanText || ''
    };
    
    setBilanActs(prev => [...prev, newAct]);
    setCurrentBilanIndex(bilanActs.length);
    setBilanText('');
    setJourValue('');
    
    // Save to DB in background
    setIsSaving(true);
    try {
      const result = await window.electronAPI.ordonnances.create({
        patientCode: patientData.departmentCode,
        dateOrd: newAct.date,
        strait: newAct.content,
        medecin: doctorName,
        actex: selectedActe
      });
      
      if (result.success && result.data) {
        setBilanActs(prev => prev.map(a => a.id === tempId ? { ...a, id: result.data.id } : a));
        setHasUnsavedChanges(false); // Clear unsaved changes flag
      }
    } catch (error) {
      console.error('Error saving act:', error);
      setBilanActs(prev => prev.filter(a => a.id !== tempId));
      alert('❌ Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };
  
  // ==================== COMPTES RENDUS HANDLERS ====================
  
  const createNewComptesRendu = async () => {
    if (isSaving) return;
    
    const patientData = patient || location.state?.patient;
    if (!patientData?.departmentCode) {
      alert('❌ Pas de patient sélectionné');
      return;
    }
    
    // INSTANT UI UPDATE
    const tempId = Date.now();
    const newCR: Ordonnance = {
      id: tempId,
      date: new Date().toISOString().split('T')[0],
      patientCode: patientData.departmentCode.toString(),
      acte: 'COMPTE RENDU MEDICAL',
      content: ''
    };
    
    setComptesRendusActs(prev => [...prev, newCR]);
    setCurrentComptesRendusIndex(comptesRendusActs.length);
    setComptesRendusText('');
    if (comptesEditorRef.current) {
      comptesEditorRef.current.innerHTML = '';
    }
    setSelectedActe('COMPTE RENDU MEDICAL');
    setSelectedDate(newCR.date);
    
    // Save to DB in background
    setIsSaving(true);
    try {
      const result = await window.electronAPI.ordonnances.create({
        patientCode: patientData.departmentCode,
        dateOrd: newCR.date,
        strait: '',
        medecin: doctorName,
        actex: 'COMPTE RENDU MEDICAL'
      });
      
      if (result.success && result.data) {
        setComptesRendusActs(prev => prev.map(cr => cr.id === tempId ? { ...cr, id: result.data.id } : cr));
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Error creating compte rendu:', error);
      setComptesRendusActs(prev => prev.filter(cr => cr.id !== tempId));
      alert('❌ Erreur lors de la création');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSaveComptesRendu = async () => {
    if (isSaving) return;
    
    const patientData = patient || location.state?.patient;
    if (!patientData?.departmentCode) {
      alert('❌ Pas de patient sélectionné');
      return;
    }
    
    // INSTANT UI UPDATE
    const tempId = Date.now();
    const newCR: Ordonnance = {
      id: tempId,
      date: selectedDate,
      patientCode: patientData.departmentCode.toString(),
      acte: 'COMPTE RENDU MEDICAL',
      content: comptesRendusText || ''
    };
    
    setComptesRendusActs(prev => [...prev, newCR]);
    setCurrentComptesRendusIndex(comptesRendusActs.length);
    setComptesRendusText('');
    if (comptesEditorRef.current) {
      comptesEditorRef.current.innerHTML = '';
    }
    setSelectedDate(new Date().toISOString().split('T')[0]);
    
    // Save to DB in background
    setIsSaving(true);
    try {
      const result = await window.electronAPI.ordonnances.create({
        patientCode: patientData.departmentCode,
        dateOrd: newCR.date,
        strait: newCR.content,
        medecin: doctorName,
        actex: 'COMPTE RENDU MEDICAL'
      });
      
      if (result.success && result.data) {
        setComptesRendusActs(prev => prev.map(cr => cr.id === tempId ? { ...cr, id: result.data.id } : cr));
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Error saving compte rendu:', error);
      setComptesRendusActs(prev => prev.filter(cr => cr.id !== tempId));
      alert('❌ Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteComptesRendu = async () => {
    if (isDeleting) return;
    
    const patientData = patient || location.state?.patient;
    if (!patientData?.departmentCode || comptesRendusActs.length === 0) {
      alert('❌ Aucun compte rendu à supprimer');
      return;
    }
    
    const currentCR = comptesRendusActs[currentComptesRendusIndex];
    if (!currentCR) return;
    
    if (!confirm(`Voulez-vous vraiment supprimer ce compte rendu?`)) {
      return;
    }
    
    // INSTANT UI UPDATE
    const deletedId = currentCR.id;
    const newIndex = currentComptesRendusIndex > 0 ? currentComptesRendusIndex - 1 : 0;
    
    setComptesRendusActs(prev => prev.filter(cr => cr.id !== deletedId));
    setCurrentComptesRendusIndex(newIndex);
    setComptesRendusText('');
    if (comptesEditorRef.current) {
      comptesEditorRef.current.innerHTML = '';
    }
    
    // Delete from DB in background
    setIsDeleting(true);
    try {
      await window.electronAPI.ordonnances.delete(deletedId);
    } catch (error) {
      console.error('Error deleting compte rendu:', error);
      // Rollback
      setComptesRendusActs(prev => {
        const restored = [...prev];
        restored.splice(currentComptesRendusIndex, 0, currentCR);
        return restored;
      });
      alert('❌ Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };
  
  const generateComptesRenduPDF = async () => {
    try {
      const patientData = patient || location.state?.patient;

      // Generate barcode
      const canvas = document.createElement('canvas');
      const patientCode = patientData?.departmentCode?.toString() || patientData?.code || '000000';
      JsBarcode(canvas, patientCode, {
        format: 'CODE128',
        width: 2,
        height: 60,
        displayValue: true
      });
      const barcodeDataUrl = canvas.toDataURL('image/png');

      // Load background image
      const imagePath = '/ffad17b0-7b80-424b-99e2-4173d59b7fcb-2.jpg';
      const response = await fetch(imagePath);
      if (!response.ok) {
        throw new Error(`Failed to load image: ${response.status}`);
      }
      const imageBytes = await response.arrayBuffer();

      // Create new PDF document
      const pdfDoc = await PDFDocument.create();
      const image = await pdfDoc.embedJpg(imageBytes);

      // Get image dimensions
      const { width: imgWidth, height: imgHeight } = image.scale(1);
      
      // Create a page with the same dimensions as the image
      const page = pdfDoc.addPage([imgWidth, imgHeight]);
      const { width, height } = page.getSize();

      // Draw background image
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: width,
        height: height
      });

      // Embed fonts and barcode
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const barcodeImage = await pdfDoc.embedPng(barcodeDataUrl);
      const barcodeDims = barcodeImage.scale(0.5);  // Smaller: was 0.7

      // Starting position
      const startX = 350;
      const startY = height - 420;

      // Date
      page.drawText(`Le: ${selectedDate}`, {
        x: startX,
        y: startY,
        size: 16,
        font: helvetica,
        color: rgb(0, 0, 0)
      });

      // Barcode
      page.drawImage(barcodeImage, {
        x: startX + 250,
        y: startY - 20,  // Lower: was -10
        width: barcodeDims.width,
        height: barcodeDims.height
      });

      // Patient info
      const lastName = patientData?.lastName || patientData?.nom || '';
      const firstName = patientData?.firstName || patientData?.prenom || '';
      const age = patientData?.age?.toString() || '';

      page.drawText(`Nom: ${lastName}`, {
        x: startX,
        y: startY - 50,
        size: 14,
        font: helvetica,
        color: rgb(0, 0, 0)
      });
      page.drawText(`Prénom: ${firstName}`, {
        x: startX + 180,
        y: startY - 50,
        size: 14,
        font: helvetica,
        color: rgb(0, 0, 0)
      });
      page.drawText(`Age: ${age} ans`, {
        x: startX + 390,
        y: startY - 50,
        size: 14,
        font: helvetica,
        color: rgb(0, 0, 0)
      });

      // Title
      page.drawText('COMPTE RENDU', {
        x: startX + 100,
        y: startY - 95,
        size: 20,
        font: helveticaBold,
        color: rgb(0.165, 0.392, 0.518)
      });

      // Content - split into lines and draw each line
      let currentY = startY - 155;
      const lines = comptesRendusText.split('\n');
      const lineHeight = 18;
      
      for (const line of lines) {
        if (currentY < 100) break; // Stop if we run out of space
        
        page.drawText(line, {
          x: startX,
          y: currentY,
          size: 14,
          font: helvetica,
          color: rgb(0, 0, 0)
        });
        
        currentY -= lineHeight;
      }

      // Save PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const fileName = `CompteRendu_${lastName}_${new Date().getTime()}.pdf`;

      return { url, fileName };
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Erreur lors de la génération du PDF: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  };

  const handlePrintComptesRendu = async () => {
    const pdfData = await generateComptesRenduPDF();
    if (!pdfData) return;

    // Create a hidden iframe for direct printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';

    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();

          setTimeout(() => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(pdfData.url);
          }, 1000);
        } catch (error) {
          console.error('Print error:', error);
          window.print();
          document.body.removeChild(iframe);
          URL.revokeObjectURL(pdfData.url);
        }
      }, 500);
    };

    iframe.src = pdfData.url;
  };

  const handleDownloadComptesRendu = async () => {
    const pdfData = await generateComptesRenduPDF();
    if (!pdfData) return;

    const link = document.createElement('a');
    link.href = pdfData.url;
    link.download = pdfData.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(pdfData.url);
    }, 5000);
  };

  // Old HTML print function for Comptes Rendus
  const handlePrintComptesRenduOLD = () => {
    const patientData = patient || location.state?.patient;
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      alert('❌ Impossible d\'ouvrir la fenêtre d\'impression');
      return;
    }
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Compte Rendu - ${patientData?.lastName || ''} ${patientData?.firstName || ''}</title>
          <style>
            @page { size: A4; margin: 20mm; }
            body { 
              font-family: Arial, sans-serif;
              font-size: 12pt;
              line-height: 1.6;
              color: #000;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #2A6484;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .doctor-name {
              font-size: 16pt;
              font-weight: bold;
              color: #2A6484;
            }
            .patient-info {
              margin: 20px 0;
              padding: 10px;
              background: #F8F9FA;
              border-radius: 4px;
            }
            .title {
              font-size: 14pt;
              font-weight: 600;
              color: #2A6484;
              text-align: center;
              margin: 20px 0;
              text-transform: uppercase;
            }
            .content {
              margin: 30px 0;
              white-space: pre-wrap;
              line-height: 1.8;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="doctor-name">Dr. ${doctorName}</div>
            <div>Date: ${selectedDate}</div>
          </div>
          
          <div class="patient-info">
            <strong>Patient:</strong> ${patientData?.lastName || ''} ${patientData?.firstName || ''}<br>
            <strong>Âge:</strong> ${patientData?.age || 'N/A'} ans
          </div>
          
          <div class="title">📄 Compte Rendu Médical</div>
          
          <div class="content">
            ${comptesRendusText || ''}
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
  
  // const createNewOrdonnance = async () => {
  //   // Save current ordonnance if there's content
  //   if (prescriptionText && patient?.departmentCode) {
  //     try {
  //       const newOrdonnance = {
  //         patientCode: patient.departmentCode,
  //         dateOrd: selectedDate,
  //         strait: prescriptionText,
  //         medecin: doctorName,
  //         actex: selectedActe
  //       };
        
  //       const result = await window.electronAPI.ordonnances.create(newOrdonnance);
  //       if (result.success) {
  //         console.log('✅ Ordonnance saved to database');
  //       }
  //     } catch (error) {
  //       console.error('Error saving ordonnance:', error);
  //     }
  //   }
    
  //   // Create new empty ordonnance
  //   const newOrdonnance: Ordonnance = {
  //     id: Date.now(),
  //     date: new Date().toISOString().split('T')[0],
  //     patientCode: patient?.departmentCode || 0,
  //     acte: 'ORDONNANCE',
  //     content: ''
  //   };
    
  //   setOrdonnances([...ordonnances, newOrdonnance]);
  //   setCurrentOrdonnanceIndex(ordonnances.length);
  //   setPrescriptionText('');
  //   setSelectedActe('ORDONNANCE');
  // };
  
  const handleMedicineCountEdit = (medicineId: number, currentCount: number) => {
    setEditingMedicineId(medicineId);
    setEditingCount(currentCount.toString());
  };
  
  const saveEditedCount = (medicineId: number) => {
    const newCount = parseInt(editingCount) || 0;
    setMedicines(medicines.map(m => 
      m.id === medicineId ? { ...m, actualCount: newCount } : m
    ));
    setEditingMedicineId(null);
    setEditingCount('');
    
    // TODO: Save to database
    console.log(`Updated medicine ${medicineId} count to ${newCount}`);
  };
  
  const handleMedicineClick = (medicine: Medicine) => {
    const cursorPosition = textAreaRef.current?.selectionStart || prescriptionText.length;
    const textBefore = prescriptionText.slice(0, cursorPosition);
    const textAfter = prescriptionText.slice(cursorPosition);
    
    // Use the prescription text as-is (formatting is already preserved from database)
    // Just handle legacy \par if present
    const formattedPrescription = medicine.libprep.replace(/\\par/g, '\n');
    
    setPrescriptionText(textBefore + formattedPrescription + '\n\n' + textAfter);
    
    // Focus back on textarea and set cursor position
    setTimeout(() => {
      if (textAreaRef.current) {
        textAreaRef.current.focus();
        const newPosition = cursorPosition + formattedPrescription.length + 2;
        textAreaRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };
  
  const handleEyeShortcut = (type: 'opere' | 'deux' | 'od' | 'og') => {
    const cursorPosition = textAreaRef.current?.selectionStart || prescriptionText.length;
    const textBefore = prescriptionText.slice(0, cursorPosition);
    const textAfter = prescriptionText.slice(cursorPosition);
    
    let insertText = '';
    switch(type) {
      case 'opere':
        insertText = 'Mettre uniquement dans l\'œil opéré';
        break;
      case 'deux':
        insertText = 'Mettre dans les deux yeux';
        break;
      case 'od':
        insertText = 'Mettre uniquement dans l\'œil droit';
        break;
      case 'og':
        insertText = 'Mettre uniquement dans l\'œil gauche';
        break;
    }
    
    setPrescriptionText(textBefore + insertText + '\n' + textAfter);
    
    // Focus back on textarea
    setTimeout(() => {
      if (textAreaRef.current) {
        textAreaRef.current.focus();
        const newPosition = cursorPosition + insertText.length + 1;
        textAreaRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };
  
  const generatePrescriptionPDF = async () => {
    try {
      // Use override name if provided, otherwise use patient name
      const nameToUse = printWithName || patientName;
      const prenomToUse = printWithPrenom || patientPrenom;
      const ageToUse = printWithAge || patientAge;

      // Generate barcode
      const canvas = document.createElement('canvas');
      const patientCode = patient?.departmentCode?.toString() || patient?.code || '000000';
      JsBarcode(canvas, patientCode, {
        format: 'CODE128',
        width: 2,
        height: 60,
        displayValue: true
      });
      const barcodeDataUrl = canvas.toDataURL('image/png');

      // Load background image
      const imagePath = '/ffad17b0-7b80-424b-99e2-4173d59b7fcb-2.jpg';
      const response = await fetch(imagePath);
      if (!response.ok) {
        throw new Error(`Failed to load image: ${response.status}`);
      }
      const imageBytes = await response.arrayBuffer();

      // Create new PDF document
      const pdfDoc = await PDFDocument.create();
      const image = await pdfDoc.embedJpg(imageBytes);

      // Get image dimensions
      const { width: imgWidth, height: imgHeight } = image.scale(1);
      
      // Create a page with the same dimensions as the image
      const page = pdfDoc.addPage([imgWidth, imgHeight]);
      const { width, height } = page.getSize();

      // Draw background image
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: width,
        height: height
      });

      // Embed fonts and barcode
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const barcodeImage = await pdfDoc.embedPng(barcodeDataUrl);
      const barcodeDims = barcodeImage.scale(0.5);  // Smaller: was 0.7

      // Starting position
      const startX = 350;
      const startY = height - 420;

      // Date
      page.drawText(`Le: ${selectedDate}`, {
        x: startX,
        y: startY,
        size: 16,
        font: helvetica,
        color: rgb(0, 0, 0)
      });

      // Barcode
      page.drawImage(barcodeImage, {
        x: startX + 250,
        y: startY - 20,  // Lower: was -10
        width: barcodeDims.width,
        height: barcodeDims.height
      });

      // Patient info
      // Add book emoji indicator if printing with another person's name
      const isPrintingWithAnotherPerson = printWithName || printWithPrenom || printWithAge;
      
      if (isPrintingWithAnotherPerson) {
        // Create emoji as image
        const emojiCanvas = document.createElement('canvas');
        emojiCanvas.width = 40;
        emojiCanvas.height = 40;
        const emojiCtx = emojiCanvas.getContext('2d');
        if (emojiCtx) {
          emojiCtx.font = '32px Arial';
          emojiCtx.textAlign = 'center';
          emojiCtx.textBaseline = 'middle';
          emojiCtx.fillText('📚', 20, 20);
        }
        const emojiDataUrl = emojiCanvas.toDataURL('image/png');
        const bookEmojiImage = await pdfDoc.embedPng(emojiDataUrl);
        
        // Draw the book emoji before the name
        page.drawImage(bookEmojiImage, {
          x: startX - 20,
          y: startY - 54,
          width: 14,
          height: 14,
        });
      }
      
      page.drawText(`Nom: ${nameToUse}`, {
        x: startX,
        y: startY - 50,
        size: 14,
        font: helvetica,
        color: rgb(0, 0, 0)
      });
      page.drawText(`Prénom: ${prenomToUse}`, {
        x: startX + 180,
        y: startY - 50,
        size: 14,
        font: helvetica,
        color: rgb(0, 0, 0)
      });
      page.drawText(`Age: ${ageToUse} ans`, {
        x: startX + 390,
        y: startY - 50,
        size: 14,
        font: helvetica,
        color: rgb(0, 0, 0)
      });

      // Title
      page.drawText('ORDONNANCE', {
        x: startX + 120,
        y: startY - 95,
        size: 20,
        font: helveticaBold,
        color: rgb(0.165, 0.392, 0.518)
      });

      // Content - split into lines and draw each line
      let currentY = startY - 155;
      const lines = prescriptionText.split('\n');
      const lineHeight = 18;
      
      for (const line of lines) {
        if (currentY < 100) break; // Stop if we run out of space
        
        page.drawText(line, {
          x: startX,
          y: currentY,
          size: 14,
          font: helvetica,
          color: rgb(0, 0, 0)
        });
        
        currentY -= lineHeight;
      }

      // Save PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const fileName = `Ordonnance_${nameToUse}_${new Date().getTime()}.pdf`;

      return { url, fileName };
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Erreur lors de la génération du PDF: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  };

  const handlePrint = async () => {
    const pdfData = await generatePrescriptionPDF();
    if (!pdfData) return;

    // Create a hidden iframe for direct printing with A5 page size
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';

    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        try {
          // Add A5 page size CSS to iframe
          const iframeDoc = iframe.contentWindow?.document;
          if (iframeDoc) {
            const style = iframeDoc.createElement('style');
            style.textContent = `
              @page {
                size: A5;
                margin: 0;
              }
              @media print {
                body, html {
                  width: 148mm;
                  height: 210mm;
                }
              }
            `;
            iframeDoc.head.appendChild(style);
          }
          
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();

          setTimeout(() => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(pdfData.url);
          }, 1000);
        } catch (error) {
          console.error('Print error:', error);
          window.print();
          document.body.removeChild(iframe);
          URL.revokeObjectURL(pdfData.url);
        }
      }, 500);
    };

    iframe.src = pdfData.url;
  };

  const handleDownloadPrescription = async () => {
    const pdfData = await generatePrescriptionPDF();
    if (!pdfData) return;

    const link = document.createElement('a');
    link.href = pdfData.url;
    link.download = pdfData.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(pdfData.url);
    }, 5000);
  };

  // Old HTML print function removed
  const handlePrintOLD = () => {
    // Use override name if provided, otherwise use patient name
    const nameToUse = printWithName || patientName;
    const prenomToUse = printWithPrenom || patientPrenom;
    const ageToUse = printWithAge || patientAge;
    
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;
    
    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ordonnance</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            line-height: 1.6;
            color: #202020;
          }
          .header {
            border-bottom: 2px solid #2A6484;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .doctor-name {
            font-size: 18px;
            font-weight: bold;
            color: #2A6484;
          }
          .date {
            float: right;
            color: #8A8A8F;
          }
          .patient-info {
            margin: 20px 0;
            padding: 10px;
            background: #F1F1F1;
            border-radius: 8px;
          }
          .acte-type {
            font-size: 16px;
            font-weight: 600;
            color: #2A6484;
            margin: 20px 0;
            text-align: center;
            text-transform: uppercase;
          }
          .prescription-content {
            margin: 30px 0;
            white-space: pre-wrap;
            font-family: monospace;
            font-size: 14px;
            line-height: 1.8;
          }
          .signature {
            margin-top: 60px;
            text-align: right;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <span class="doctor-name">${doctorName}</span>
          <span class="date">${selectedDate}</span>
        </div>
        <div class="patient-info">
          <strong>Patient:</strong> ${nameToUse} ${prenomToUse}<br>
          <strong>Age:</strong> ${ageToUse} ans
        </div>
        <div class="acte-type">${selectedActe}</div>
        <div class="prescription-content">${prescriptionText}</div>
        ${printWithName ? `
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px dashed #ccc;">
            <div class="patient-info">
              <strong>Pour:</strong> ${printWithName} ${printWithPrenom}<br>
              <strong>Age:</strong> ${printWithAge} ans
            </div>
          </div>
        ` : ''}
        <div class="signature">
          <p>Signature</p>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };
  
  const generateBilanPDF = async () => {
    try {
      const patientData = patient || location.state?.patient;
      const currentBilanAct = bilanActs[currentBilanIndex];
      const bilanActe = currentBilanAct?.acte || 'BILAN';

      // Generate barcode
      const canvas = document.createElement('canvas');
      const patientCode = patientData?.departmentCode?.toString() || patientData?.code || '000000';
      JsBarcode(canvas, patientCode, {
        format: 'CODE128',
        width: 2,
        height: 60,
        displayValue: true
      });
      const barcodeDataUrl = canvas.toDataURL('image/png');

      // Load background image
      const imagePath = '/ffad17b0-7b80-424b-99e2-4173d59b7fcb-2.jpg';
      const response = await fetch(imagePath);
      if (!response.ok) {
        throw new Error(`Failed to load image: ${response.status}`);
      }
      const imageBytes = await response.arrayBuffer();

      // Create new PDF document
      const pdfDoc = await PDFDocument.create();
      const image = await pdfDoc.embedJpg(imageBytes);

      // Get image dimensions
      const { width: imgWidth, height: imgHeight } = image.scale(1);
      
      // Create a page with the same dimensions as the image
      const page = pdfDoc.addPage([imgWidth, imgHeight]);
      const { width, height } = page.getSize();

      // Draw background image
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: width,
        height: height
      });

      // Embed fonts and barcode
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const barcodeImage = await pdfDoc.embedPng(barcodeDataUrl);
      const barcodeDims = barcodeImage.scale(0.5);  // Smaller: was 0.7

      // Starting position
      const startX = 350;
      const startY = height - 420;

      // Date
      page.drawText(`Le: ${selectedDate}`, {
        x: startX,
        y: startY,
        size: 16,
        font: helvetica,
        color: rgb(0, 0, 0)
      });

      // Barcode
      page.drawImage(barcodeImage, {
        x: startX + 250,
        y: startY - 20,  // Lower: was -10
        width: barcodeDims.width,
        height: barcodeDims.height
      });

      // Patient info
      const lastName = patientData?.lastName || patientData?.nom || '';
      const firstName = patientData?.firstName || patientData?.prenom || '';
      const age = patientData?.age?.toString() || '';

      page.drawText(`Nom: ${lastName}`, {
        x: startX,
        y: startY - 50,
        size: 14,
        font: helvetica,
        color: rgb(0, 0, 0)
      });
      page.drawText(`Prénom: ${firstName}`, {
        x: startX + 180,
        y: startY - 50,
        size: 14,
        font: helvetica,
        color: rgb(0, 0, 0)
      });
      page.drawText(`Age: ${age} ans`, {
        x: startX + 390,
        y: startY - 50,
        size: 14,
        font: helvetica,
        color: rgb(0, 0, 0)
      });

      // Title (use acte name)
      page.drawText(bilanActe, {
        x: startX + 120,
        y: startY - 95,
        size: 20,
        font: helveticaBold,
        color: rgb(0.165, 0.392, 0.518)
      });

      // Content - split into lines and draw each line
      let currentY = startY - 155;
      const lines = bilanText.split('\n');
      const lineHeight = 18;
      
      for (const line of lines) {
        if (currentY < 100) break; // Stop if we run out of space
        
        page.drawText(line, {
          x: startX,
          y: currentY,
          size: 14,
          font: helvetica,
          color: rgb(0, 0, 0)
        });
        
        currentY -= lineHeight;
      }

      // Save PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const fileName = `Bilan_${lastName}_${bilanActe}_${new Date().getTime()}.pdf`;

      return { url, fileName };
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Erreur lors de la génération du PDF: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  };

  const handlePrintBilan = async () => {
    const pdfData = await generateBilanPDF();
    if (!pdfData) return;

    // Create a hidden iframe for direct printing with A5 page size
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';

    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        try {
          // Add A5 page size CSS to iframe
          const iframeDoc = iframe.contentWindow?.document;
          if (iframeDoc) {
            const style = iframeDoc.createElement('style');
            style.textContent = `
              @page {
                size: A5;
                margin: 0;
              }
              @media print {
                body, html {
                  width: 148mm;
                  height: 210mm;
                }
              }
            `;
            iframeDoc.head.appendChild(style);
          }
          
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();

          setTimeout(() => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(pdfData.url);
          }, 1000);
        } catch (error) {
          console.error('Print error:', error);
          window.print();
          document.body.removeChild(iframe);
          URL.revokeObjectURL(pdfData.url);
        }
      }, 500);
    };

    iframe.src = pdfData.url;
  };

  const handleDownloadBilan = async () => {
    const pdfData = await generateBilanPDF();
    if (!pdfData) return;

    const link = document.createElement('a');
    link.href = pdfData.url;
    link.download = pdfData.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(pdfData.url);
    }, 5000);
  };

  const filteredMedicines = medicines.filter(m => {
    const search = searchTerm.toLowerCase().trim();
    if (!search) return true;
    
    // Search in code and libprep
    return m.code.toLowerCase().includes(search) ||
           m.libprep.toLowerCase().includes(search);
  });
  
  return (
    <div className="ordonnance-page">
      <div className="ordonnance-header">
        <button className="back-button" onClick={handleBack}>
          ←
        </button>
        <div className="header-info">
          <div className="info-item">
            <span className="info-label">Médecin:</span>
            <span className="info-value">{doctorName}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Date:</span>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-input"
            />
          </div>
          <div className="info-item">
            <span className="info-label">Patient:</span>
            <input 
              type="text"
              placeholder="Nom"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="patient-input"
            />
            <input 
              type="text"
              placeholder="Prénom"
              value={patientPrenom}
              onChange={(e) => setPatientPrenom(e.target.value)}
              className="patient-input"
            />
            <input 
              type="number"
              placeholder="Age"
              value={patientAge}
              onChange={(e) => setPatientAge(e.target.value)}
              className="patient-input age-input"
            />
          </div>
        </div>
      </div>
      
      <div className="tabs-container">
        <button 
          className={`tab ${activeTab === 'prescriptions' ? 'active' : ''}`}
          onClick={() => setActiveTab('prescriptions')}
        >
          📝 Prescriptions Médicales
        </button>
        <button 
          className={`tab ${activeTab === 'bilan' ? 'active' : ''}`}
          onClick={() => setActiveTab('bilan')}
        >
          🧪 Bilan
        </button>
        <button 
          className={`tab ${activeTab === 'comptes' ? 'active' : ''}`}
          onClick={() => setActiveTab('comptes')}
        >
          📄 Comptes Rendus
        </button>
      </div>
      
      <div className="ordonnance-content">
        {activeTab === 'prescriptions' && (
          <div className="prescriptions-tab">
            <div className="prescriptions-left">
              {/* Ordonnance Navigation */}
              <div className="ordonnance-navigation">
                <button 
                  className="nav-arrow"
                  onClick={() => navigateOrdonnance('prev')}
                  disabled={currentOrdonnanceIndex === 0 || ordonnances.length === 0}
                >
                  ←
                </button>
                <span className="nav-counter">
                  {ordonnances.length > 0 
                    ? `${currentOrdonnanceIndex + 1} / ${ordonnances.length}`
                    : '0 / 0'
                  }
                </span>
                <button 
                  className="nav-arrow"
                  onClick={() => navigateOrdonnance('next')}
                  disabled={currentOrdonnanceIndex >= ordonnances.length - 1 || ordonnances.length === 0}
                >
                  →
                </button>
              </div>
              
              <div className="acte-selector">
                <label>Acte:</label>
                <span style={{ 
                  padding: '8px 16px',
                  background: '#2A6484',
                  color: 'white',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '14px'
                }}>
                  ORDONNANCE
                </span>
                
                <div className="eye-shortcuts" style={{ marginLeft: '16px' }}>
                  <button 
                    className="shortcut-btn"
                    onClick={() => handleEyeShortcut('opere')}
                    title="Œil opéré"
                  >
                    👁️ Opéré
                  </button>
                  <button 
                    className="shortcut-btn"
                    onClick={() => handleEyeShortcut('deux')}
                    title="Deux yeux"
                  >
                    👁️👁️ 2 yeux
                  </button>
                  <button 
                    className="shortcut-btn"
                    onClick={() => handleEyeShortcut('od')}
                    title="Œil droit"
                  >
                    OD
                  </button>
                  <button 
                    className="shortcut-btn"
                    onClick={() => handleEyeShortcut('og')}
                    title="Œil gauche"
                  >
                    OG
                  </button>
                </div>
              </div>
              
              <textarea 
                ref={textAreaRef}
                className="prescription-editor"
                placeholder="Écrivez votre ordonnance ici..."
                value={prescriptionText}
                onChange={(e) => setPrescriptionText(e.target.value)}
              />
              
              <div className="print-section">
                <h3>Imprimer avec une autre personne:</h3>
                <div className="print-section-content">
                  <input
                    type="text"
                    value={printWithName}
                    onChange={(e) => setPrintWithName(e.target.value)}
                    placeholder="Nom"
                    className="print-input"
                  />
                  <input
                    type="text"
                    value={printWithPrenom}
                    onChange={(e) => setPrintWithPrenom(e.target.value)}
                    placeholder="Prénom"
                    className="print-input"
                  />
                  <input
                    type="text"
                    value={printWithAge}
                    onChange={(e) => setPrintWithAge(e.target.value)}
                    placeholder="Age"
                    className="print-input"
                    style={{ width: '60px' }}
                  />
                  <button 
                    onClick={handleNewOrdonnance} 
                    className="new-button"
                    disabled={isSaving || isDeleting}
                  >
                    {isSaving ? '⏳ Création...' : '➕ Nouveau'}
                  </button>
                  <button 
                    onClick={handleSaveOrdonnance} 
                    className="save-button"
                    disabled={isSaving || isDeleting}
                  >
                    {isSaving ? '⏳ Sauvegarde...' : '💾 Sauvegarder'}
                  </button>
                  <button 
                    onClick={handleDeleteOrdonnance} 
                    className="delete-button"
                    style={{
                      padding: '8px 16px',
                      backgroundColor: isDeleting ? '#999' : '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: (ordonnances.length === 0 || isDeleting || isSaving) ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                      fontSize: '14px',
                      opacity: (ordonnances.length === 0 || isDeleting || isSaving) ? 0.6 : 1
                    }}
                    disabled={ordonnances.length === 0 || isDeleting || isSaving}
                  >
                    {isDeleting ? '⏳ Suppression...' : '🗑️ Supprimer'}
                  </button>
                  <button onClick={handlePrint} className="print-button">
                    🖨️ Imprimer
                  </button>
                  <button 
                    onClick={handleDownloadPrescription} 
                    className="print-button"
                    style={{ background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)', marginLeft: '10px' }}
                  >
                    💾 Télécharger
                  </button>
                </div>
              </div>
            </div>
            
            <div className="prescriptions-right">
              <div className="medicines-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0 }}>Médicaments</h3>
                  <button 
                    className="add-medicine-btn"
                    onClick={() => setShowAddMedicine(true)}
                    style={{
                      backgroundColor: '#429898',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    + Ajouter
                  </button>
                </div>
                <div className="search-container">
                  <input 
                    type="text"
                    placeholder="🔍 Rechercher un médicament..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  {searchTerm && (
                    <button 
                      className="clear-search"
                      onClick={() => setSearchTerm('')}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="medicine-stats">
                  {filteredMedicines.length} / {medicines.length} médicaments
                </div>
              </div>
              
              <div className="medicines-list">
                {filteredMedicines.length > 0 ? (
                  filteredMedicines.map(medicine => (
                    <div 
                      key={medicine.id}
                      className="medicine-item"
                      onClick={() => handleMedicineClick(medicine)}
                      title={`${medicine.code}\nUtilisé ${medicine.actualCount || medicine.nbpres} fois`}
                    >
                      <div className="medicine-code">
                        {medicine.code}
                      </div>
                      {editingMedicineId === medicine.id ? (
                        <input
                          type="number"
                          value={editingCount}
                          onChange={(e) => setEditingCount(e.target.value)}
                          onBlur={() => saveEditedCount(medicine.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              saveEditedCount(medicine.id);
                            } else if (e.key === 'Escape') {
                              setEditingMedicineId(null);
                              setEditingCount('');
                            }
                          }}
                          className="medicine-count-edit"
                          autoFocus
                          style={{
                            width: '40px',
                            height: '24px',
                            border: '1px solid #429898',
                            borderRadius: '4px',
                            textAlign: 'center',
                            fontSize: '12px'
                          }}
                        />
                      ) : (
                        <div 
                          className="medicine-count" 
                          style={{
                            backgroundColor: (medicine.actualCount || 0) > 0 ? '#429898' : '#8A8A8F',
                            cursor: 'pointer'
                          }}
                          onDoubleClick={() => handleMedicineCountEdit(medicine.id, medicine.actualCount || 0)}
                          title="Double-cliquez pour modifier"
                        >
                          {medicine.actualCount || 0}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="no-results">
                    {searchTerm ? `Aucun médicament trouvé pour "${searchTerm}"` : 'Chargement des médicaments...'}
                  </div>
                )}
              </div>
              
              {/* Quantities section */}
              <div className="quantities-section">
                <h4>Quantités rapides</h4>
                <div className="quantities-grid">
                  {quantities.slice(0, 8).map(qty => (
                    <button
                      key={qty.id}
                      className="quantity-btn"
                      onClick={() => {
                        const cursorPosition = textAreaRef.current?.selectionStart || prescriptionText.length;
                        const textBefore = prescriptionText.slice(0, cursorPosition);
                        const textAfter = prescriptionText.slice(cursorPosition);
                        setPrescriptionText(textBefore + qty.qtite + ' ' + textAfter);
                        textAreaRef.current?.focus();
                      }}
                      title={`Insérer ${qty.qtite}`}
                    >
                      {qty.qtite}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Add Medicine Modal */}
        {showAddMedicine && (
          <div className="modal-overlay" onClick={() => setShowAddMedicine(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%'
            }}>
              <h2 style={{ marginBottom: '20px', color: '#2A6484' }}>Ajouter un nouveau médicament</h2>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Code du médicament</label>
                <input
                  type="text"
                  value={newMedicineCode}
                  onChange={(e) => setNewMedicineCode(e.target.value)}
                  placeholder="Ex: DOLIPRANE 500 MG"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #F1F1F1',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Prescription</label>
                <textarea
                  value={newMedicineLibprep}
                  onChange={(e) => setNewMedicineLibprep(e.target.value)}
                  placeholder="Ex: DOLIPRANE 500 mg cp\n1 cp 3 fois par jour"
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #F1F1F1',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowAddMedicine(false);
                    setNewMedicineCode('');
                    setNewMedicineLibprep('');
                  }}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #F1F1F1',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={async () => {
                    if (newMedicineCode && newMedicineLibprep) {
                      // Add to medicines list immediately
                      const newMedicine: Medicine = {
                        id: Date.now(),
                        code: newMedicineCode,
                        libprep: newMedicineLibprep,
                        nbpres: 0,
                        nature: 'O',
                        actualCount: 0
                      };
                      setMedicines(prev => [newMedicine, ...prev]);
                      
                      // TODO: Save to database
                      console.log('New medicine added:', newMedicine);
                      
                      setShowAddMedicine(false);
                      setNewMedicineCode('');
                      setNewMedicineLibprep('');
                    }
                  }}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#429898',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                  disabled={!newMedicineCode || !newMedicineLibprep}
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'bilan' && (
          <div className="bilan-tab">
            <div className="bilan-left">
              {/* Navigation */}
              <div className="ordonnance-navigation">
                <button 
                  className="nav-arrow"
                  onClick={() => {
                    if (currentBilanIndex > 0) {
                      setCurrentBilanIndex(currentBilanIndex - 1);
                    }
                  }}
                  disabled={currentBilanIndex === 0 || bilanActs.length === 0}
                >
                  ←
                </button>
                <span className="nav-counter">
                  {bilanActs.length > 0 
                    ? `${currentBilanIndex + 1} / ${bilanActs.length}`
                    : '0 / 0'
                  }
                </span>
                <button 
                  className="nav-arrow"
                  onClick={() => {
                    if (currentBilanIndex < bilanActs.length - 1) {
                      setCurrentBilanIndex(currentBilanIndex + 1);
                    }
                  }}
                  disabled={currentBilanIndex >= bilanActs.length - 1 || bilanActs.length === 0}
                >
                  →
                </button>
              </div>
              
              {/* Act Selector and Jour field */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px', alignItems: 'center' }}>
                <div className="acte-selector" style={{ flex: 1 }}>
                  <label>Acte:</label>
                  <select 
                    value={selectedActe}
                    onChange={(e) => setSelectedActe(e.target.value)}
                    className="acte-dropdown"
                  >
                    {ACTES_DATA.filter(a => a.libacte !== 'ORDONNANCE' && a.libacte !== 'COMPTE RENDU' && a.libacte !== 'COMPTE RENDU MEDICAL').map(acte => (
                      <option key={acte.id} value={acte.libacte}>
                        {acte.libacte}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Jour:</label>
                  <input 
                    type="number"
                    value={jourValue}
                    onChange={(e) => setJourValue(e.target.value)}
                    className="jour-input"
                    placeholder="0"
                    style={{
                      width: '60px',
                      padding: '6px',
                      border: '1px solid #E0E0E0',
                      borderRadius: '6px',
                      fontSize: '13px',
                      textAlign: 'center'
                    }}
                  />
                </div>
                
                <button 
                  className="art-button art-w"
                  onClick={() => {
                    const template = TEMPLATES['ART (W)'];
                    if (typeof template === 'function') {
                      // Get the current jour value at click time
                      const currentJour = jourValue.trim() || '0';
                      const text = template(doctorName, currentJour);
                      
                      // Insert at cursor position or append
                      const textarea = document.querySelector('.bilan-editor') as HTMLTextAreaElement;
                      if (textarea) {
                        const cursorPosition = textarea.selectionStart || bilanText.length;
                        const textBefore = bilanText.slice(0, cursorPosition);
                        const textAfter = bilanText.slice(cursorPosition);
                        setBilanText(textBefore + '\n' + text + '\n' + textAfter);
                        textarea.focus();
                      } else {
                        setBilanText(bilanText + '\n' + text);
                      }
                    }
                  }}
                >
                  ART (W)
                </button>
                <button 
                  className="art-button art-scol"
                  onClick={() => {
                    const template = TEMPLATES['ART (scol)'];
                    if (typeof template === 'function') {
                      // Get the current jour value at click time
                      const currentJour = jourValue.trim() || '0';
                      const text = template(doctorName, currentJour);
                      
                      // Insert at cursor position or append
                      const textarea = document.querySelector('.bilan-editor') as HTMLTextAreaElement;
                      if (textarea) {
                        const cursorPosition = textarea.selectionStart || bilanText.length;
                        const textBefore = bilanText.slice(0, cursorPosition);
                        const textAfter = bilanText.slice(cursorPosition);
                        setBilanText(textBefore + '\n' + text + '\n' + textAfter);
                        textarea.focus();
                      } else {
                        setBilanText(bilanText + '\n' + text);
                      }
                    }
                  }}
                >
                  ART (scol)
                </button>
              </div>
              
              {/* Rich Text Toolbar */}
              <div className="text-toolbar">
                <button className="toolbar-btn" title="Gras">
                  <strong>B</strong>
                </button>
                <button className="toolbar-btn" title="Italique">
                  <em>I</em>
                </button>
                <button className="toolbar-btn" title="Souligné">
                  <u>U</u>
                </button>
                <div className="toolbar-divider"></div>
                <button className="toolbar-btn" title="Aligner à gauche">
                  ☰
                </button>
                <button className="toolbar-btn" title="Centrer">
                  ≡
                </button>
                <button className="toolbar-btn" title="Aligner à droite">
                  ☷
                </button>
                <div className="toolbar-divider"></div>
                <select 
                  className="toolbar-select" 
                  defaultValue="#000000"
                >
                  <option value="#000000">Noir</option>
                  <option value="#FF0000">Rouge</option>
                  <option value="#0000FF">Bleu</option>
                  <option value="#00FF00">Vert</option>
                  <option value="#FF00FF">Magenta</option>
                </select>
              </div>
              
              {/* Text Editor */}
              <textarea
                className="bilan-editor"
                value={bilanText}
                onChange={(e) => setBilanText(e.target.value)}
                placeholder="Écrivez votre acte médical ici..."
                style={{
                  flex: 1,
                  padding: '16px',
                  border: '2px solid #F1F1F1',
                  borderRadius: '8px',
                  fontFamily: "'Courier New', monospace",
                  fontSize: '16px',
                  lineHeight: 1.8,
                  background: 'white',
                  color: '#2A6484',
                  fontWeight: 700,
                  minHeight: '400px',
                  resize: 'none',
                  marginTop: '12px'
                }}
              />
              
              {/* Action Buttons */}
              <div className="bilan-actions" style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
                <button 
                  className="new-button" 
                  onClick={handleNewBilanAct}
                  disabled={isSaving || isDeleting}
                >
                  {isSaving ? '⏳ Création...' : '➕ Nouveau'}
                </button>
                <button 
                  className="save-button"
                  onClick={handleSaveBilanAct}
                  disabled={isSaving || isDeleting}
                >
                  {isSaving ? '⏳ Sauvegarde...' : '💾 Sauvegarder'}
                </button>
                <button 
                  onClick={handleDeleteBilanAct} 
                  className="delete-button"
                  style={{
                    padding: '8px 16px',
                    backgroundColor: isDeleting ? '#999' : '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: (bilanActs.length === 0 || isDeleting || isSaving) ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                    opacity: (bilanActs.length === 0 || isDeleting || isSaving) ? 0.6 : 1
                  }}
                  disabled={bilanActs.length === 0 || isDeleting || isSaving}
                >
                  {isDeleting ? '⏳ Suppression...' : '🗑️ Supprimer'}
                </button>
                <button 
                  className="print-button"
                  onClick={handlePrintBilan}
                >
                  🖨️ Imprimer
                </button>
                <button 
                  onClick={handleDownloadBilan} 
                  className="print-button"
                  style={{ background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)', marginLeft: '10px' }}
                >
                  💾 Télécharger
                </button>
              </div>
            </div>
            
            {/* Right Side - EXACT COPY from Prescriptions */}
            <div className="prescriptions-right">
              <div className="medicines-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0 }}>Médicaments</h3>
                  <button 
                    className="add-medicine-btn"
                    onClick={() => setShowAddMedicine(true)}
                    style={{
                      backgroundColor: '#429898',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    + Ajouter
                  </button>
                </div>
                <div className="search-container">
                  <input 
                    type="text"
                    placeholder="🔍 Rechercher un médicament..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  {searchTerm && (
                    <button 
                      className="clear-search"
                      onClick={() => setSearchTerm('')}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="medicine-stats">
                  {filteredMedicines.length} / {medicines.length} médicaments
                </div>
              </div>
              
              <div className="medicines-list">
                {filteredMedicines.length > 0 ? (
                  filteredMedicines.map(medicine => (
                    <div 
                      key={medicine.id}
                      className="medicine-item"
                      onDoubleClick={() => {
                        const insertion = medicine.libprep;
                        const textarea = document.querySelector('.bilan-editor') as HTMLTextAreaElement;
                        if (textarea) {
                          const cursorPosition = textarea.selectionStart || bilanText.length;
                          const textBefore = bilanText.slice(0, cursorPosition);
                          const textAfter = bilanText.slice(cursorPosition);
                          setBilanText(textBefore + insertion + '\n' + textAfter);
                          textarea.focus();
                        } else {
                          setBilanText(bilanText + insertion + '\n');
                        }
                      }}
                      title={`Double-cliquez pour insérer\n${medicine.libprep}`}
                    >
                      <div className="medicine-code">
                        {medicine.code}
                      </div>
                      <div 
                        className="medicine-count" 
                        style={{
                          backgroundColor: (medicine.actualCount || 0) > 0 ? '#429898' : '#8A8A8F'
                        }}
                      >
                        {medicine.actualCount || 0}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-results">
                    {searchTerm ? `Aucun médicament trouvé pour "${searchTerm}"` : 'Chargement des médicaments...'}
                  </div>
                )}
              </div>
              
              <div className="quantities-section">
                <h4>Quantités rapides</h4>
                <div className="quantities-grid">
                  {quantities.slice(0, 8).map(qty => (
                    <button
                      key={qty.id}
                      className="quantity-btn"
                      onClick={() => {
                        const textarea = document.querySelector('.bilan-editor') as HTMLTextAreaElement;
                        if (textarea) {
                          const cursorPosition = textarea.selectionStart || bilanText.length;
                          const textBefore = bilanText.slice(0, cursorPosition);
                          const textAfter = bilanText.slice(cursorPosition);
                          setBilanText(textBefore + qty.qtite + ' ' + textAfter);
                          textarea.focus();
                        } else {
                          setBilanText(bilanText + qty.qtite + ' ');
                        }
                      }}
                      title={`Insérer ${qty.qtite}`}
                    >
                      {qty.qtite}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'comptes' && (
          <div className="comptes-tab">
            {/* Editor Section - Left Side (70%) */}
            <div className="comptes-editor-section">
              {/* Action buttons */}
              <div style={{display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap'}}>
                <div className="ordonnance-navigation">
                  <button 
                    className="nav-arrow"
                    onClick={() => {
                      if (currentComptesRendusIndex > 0) {
                        setCurrentComptesRendusIndex(currentComptesRendusIndex - 1);
                      }
                    }}
                    disabled={currentComptesRendusIndex === 0 || comptesRendusActs.length === 0}
                  >
                    ←
                  </button>
                  <span className="nav-counter">
                    {comptesRendusActs.length > 0 
                      ? `${currentComptesRendusIndex + 1} / ${comptesRendusActs.length}`
                      : '0 / 0'
                    }
                  </span>
                  <button 
                    className="nav-arrow"
                    onClick={() => {
                      if (currentComptesRendusIndex < comptesRendusActs.length - 1) {
                        setCurrentComptesRendusIndex(currentComptesRendusIndex + 1);
                      }
                    }}
                    disabled={currentComptesRendusIndex >= comptesRendusActs.length - 1 || comptesRendusActs.length === 0}
                  >
                    →
                  </button>
                </div>
                
                <button 
                  onClick={createNewComptesRendu} 
                  className="create-button"
                  disabled={isSaving || isDeleting}
                  style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #9B59B6, #8E44AD)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}
                >
                  {isSaving ? '⏳ Création...' : '➕ Nouveau'}
                </button>
                <button 
                  onClick={handleSaveComptesRendu} 
                  className="save-button"
                  disabled={isSaving || isDeleting}
                  style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #27AE60, #229954)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}
                >
                  {isSaving ? '⏳ Sauvegarde...' : '💾 Sauvegarder'}
                </button>
                <button 
                  onClick={handleDeleteComptesRendu} 
                  className="delete-button"
                  disabled={isSaving || isDeleting || comptesRendusActs.length === 0}
                  style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #E74C3C, #C0392B)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}
                >
                  {isDeleting ? '⏳ Suppression...' : '🗑️ Supprimer'}
                </button>
                <button 
                  onClick={handlePrintComptesRendu} 
                  className="print-button"
                  disabled={isSaving || isDeleting || !comptesRendusText}
                  style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #3498DB, #2980B9)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}
                >
                  🖨️ Imprimer
                </button>
                <button 
                  onClick={handleDownloadComptesRendu} 
                  className="print-button"
                  disabled={isSaving || isDeleting || !comptesRendusText}
                  style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px',
                    marginLeft: '10px'
                  }}
                >
                  💾 Télécharger
                </button>
              </div>
              
              <div className="comptes-toolbar">
                <button onClick={() => document.execCommand('bold')} title="Gras (Ctrl+B)">
                  <strong>B</strong>
                </button>
                <button onClick={() => document.execCommand('italic')} title="Italique (Ctrl+I)">
                  <em>I</em>
                </button>
                <button onClick={() => document.execCommand('underline')} title="Souligné (Ctrl+U)">
                  <u>U</u>
                </button>
                <span className="toolbar-separator">|</span>
                <select 
                  onChange={(e) => {
                    document.execCommand('fontName', false, e.target.value);
                  }}
                  defaultValue="Arial"
                >
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                </select>
                <select 
                  onChange={(e) => {
                    document.execCommand('fontSize', false, e.target.value);
                  }}
                  defaultValue="3"
                >
                  <option value="1">8pt</option>
                  <option value="2">10pt</option>
                  <option value="3">12pt</option>
                  <option value="4">14pt</option>
                  <option value="5">18pt</option>
                  <option value="6">24pt</option>
                  <option value="7">36pt</option>
                </select>
                <span className="toolbar-separator">|</span>
                <button onClick={() => document.execCommand('justifyLeft')} title="Aligner à gauche">⬅️</button>
                <button onClick={() => document.execCommand('justifyCenter')} title="Centrer">↔️</button>
                <button onClick={() => document.execCommand('justifyRight')} title="Aligner à droite">➡️</button>
                <button onClick={() => document.execCommand('justifyFull')} title="Justifier">↔</button>
                <span className="toolbar-separator">|</span>
                <button onClick={() => document.execCommand('insertUnorderedList')} title="Liste à puces">• Liste</button>
                <button onClick={() => document.execCommand('insertOrderedList')} title="Liste numérotée">1. Liste</button>
                <span className="toolbar-separator">|</span>
                <button onClick={() => document.execCommand('foreColor', false, '#FF0000')} title="Couleur rouge" style={{color: '#FF0000'}}>A</button>
                <button onClick={() => document.execCommand('foreColor', false, '#0000FF')} title="Couleur bleue" style={{color: '#0000FF'}}>A</button>
                <button onClick={() => document.execCommand('foreColor', false, '#000000')} title="Couleur noire">A</button>
                <span className="toolbar-separator">|</span>
                <button onClick={() => document.execCommand('removeFormat')} title="Supprimer formatage">🧹</button>
              </div>
              <div 
                ref={comptesEditorRef}
                className="comptes-editor"
                contentEditable={true}
                suppressContentEditableWarning={true}
                onInput={(e) => setComptesRendusText(e.currentTarget.innerHTML)}
                style={{
                  padding: '20px',
                  border: '1px solid #E8E9EB',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'Arial, sans-serif'
                }}
                dangerouslySetInnerHTML={{ __html: comptesRendusText }}
              />
            </div>

            {/* Templates Section - Right Side (30%) */}
            <div className="comptes-templates-section">
              <div className="templates-header">
                <h3>Templates</h3>
                <input
                  type="text"
                  placeholder="🔍 Rechercher..."
                  value={comptesRendusSearchTerm}
                  onChange={(e) => setComptesRendusSearchTerm(e.target.value)}
                  className="templates-search"
                />
              </div>
              <div className="templates-list">
                {comptesRendusTemplates.length === 0 ? (
                  <div className="templates-empty">
                    <p>Aucun template trouvé</p>
                    <small>Vérifiez que les données sont importées</small>
                  </div>
                ) : (
                  comptesRendusTemplates
                    .filter((cr: any) => 
                      comptesRendusSearchTerm === '' ||
                      cr.codeCompte.toLowerCase().includes(comptesRendusSearchTerm.toLowerCase()) ||
                      cr.titreEchodp.toLowerCase().includes(comptesRendusSearchTerm.toLowerCase())
                    )
                    .map((cr: any) => (
                      <div
                        key={cr.id}
                        className="template-item"
                        onClick={() => {
                          // Convert XML content to HTML preserving all formatting
                          let htmlContent = cr.contenu;
                          
                          // Replace &#13; with <br> for line breaks
                          htmlContent = htmlContent.replace(/&#13;/g, '<br>');
                          
                          // Preserve multiple spaces by converting to &nbsp;
                          htmlContent = htmlContent.replace(/  /g, '&nbsp;&nbsp;');
                          
                          // Preserve tabs/indentation
                          htmlContent = htmlContent.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
                          
                          // Replace special bullets · with HTML entity
                          htmlContent = htmlContent.replace(/·/g, '&middot;');
                          
                          // Replace > and < symbols
                          htmlContent = htmlContent.replace(/&gt;/g, '>');
                          htmlContent = htmlContent.replace(/&lt;/g, '<');
                          
                          // Set the HTML content
                          setComptesRendusText(htmlContent);
                          
                          // Update contentEditable div directly
                          if (comptesEditorRef.current) {
                            comptesEditorRef.current.innerHTML = htmlContent;
                          }
                        }}
                        title={cr.titreEchodp}
                      >
                        <div className="template-code">{cr.codeCompte}</div>
                        <div className="template-title">{cr.titreEchodp}</div>
                      </div>
                    ))
                )}
              </div>
              <div className="templates-count">
                {comptesRendusTemplates.length} template(s)
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Bottom Bar with Message Buttons */}
      <div className="ordonnance-bottom-bar" style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '16px',
        padding: '16px',
        background: 'linear-gradient(135deg, #2A6484 0%, #429898 100%)',
        borderTop: '2px solid #F1F1F1',
        marginTop: 'auto'
      }}>
        <button
          className="message-btn send-btn"
          onClick={() => setShowSendMessage(true)}
          style={{
            padding: '10px 24px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          📨 Envoyer Message
        </button>
        <button
          className="message-btn receive-btn"
          onClick={() => setShowReceivedMessages(true)}
          style={{
            padding: '10px 24px',
            background: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          📬 Messages Reçus
        </button>
      </div>
      
      {/* Message Modals */}
      <RoomBasedSendMessageModal
        isOpen={showSendMessage}
        onClose={() => setShowSendMessage(false)}
        patientContext={{
          patientName: `${patient?.name || ''} ${patient?.surname || ''}`.trim() || 'Patient',
          patientId: patient?.departmentCode || 0
        }}
      />
      
      <RoomBasedReceiveMessageModal
        isOpen={showReceivedMessages}
        onClose={() => setShowReceivedMessages(false)}
        patientContext={{
          patientName: `${patient?.name || ''} ${patient?.surname || ''}`.trim() || 'Patient',
          patientId: patient?.departmentCode || 0
        }}
      />
    </div>
  );
};

export default OrdonnancePage;
