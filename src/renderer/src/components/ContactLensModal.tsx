import React, { useState, useEffect } from 'react'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import JsBarcode from 'jsbarcode'
import { loadPDFTemplateImage } from '../utils/pdfImageLoader'

interface ContactLensModalProps {
  isOpen: boolean
  onClose: () => void
  patient: any
  visionData: {
    od: {
      sphere: string
      cylinder: string
      axis: string
      vl: string
    }
    og: {
      sphere: string
      cylinder: string
      axis: string
      vl: string
    }
    addition: string
  }
}

interface ConversionData {
  lunettes: string
  lun_plus: string
  lun_moins: string
}

const ContactLensModal: React.FC<ContactLensModalProps> = ({ isOpen, onClose, patient, visionData }) => {
  const brandOptions = ['Menicon', 'Bausch et Lomb', 'Precilens', 'LCS', 'Comelia']
  const typeOptions = [
    'Souple sphérique à port journalier',
    'Souple à port permanent',
    'Souple torique à port journalier',
    'Rigide perméable au gaz'
  ]

  const [marque, setMarque] = useState('')
  const [type, setType] = useState(typeOptions[0])
  const [showBrandDropdown, setShowBrandDropdown] = useState(false)
  const [activeWindow, setActiveWindow] = useState<'sphere' | 'torique'>('sphere')
  const [conversionTable, setConversionTable] = useState<ConversionData[]>([])
  const [showConversionTable, setShowConversionTable] = useState(false)
  
  const [sphereData, setSphereData] = useState({
    od: { puissance: '', diametre: '', rayon: '' },
    og: { puissance: '', diametre: '', rayon: '' }
  })

  const [toriqueData, setToriqueData] = useState({
    od: { puissance: '', diametre: '', rayon: '' },
    og: { puissance: '', diametre: '', rayon: '' }
  })

  useEffect(() => {
    loadConversionTable()
  }, [])

  // Vertex distance conversion function
  const convertVertexDistance = (glassesValue: string): string => {
    const d = 0.012 // 12mm vertex distance in meters
    const power = parseFloat(glassesValue)
    
    if (isNaN(power) || power === 0) return glassesValue
    
    // If power is low (< 4.00D), use same value
    if (Math.abs(power) < 4.00) {
      return glassesValue
    }
    
    // Apply vertex formula: F_lens = F_glasses / (1 - d × F_glasses)
    const convertedPower = power / (1 - d * power)
    
    // Round to nearest 0.25 (standard lens power increment)
    const rounded = Math.round(convertedPower * 4) / 4
    
    // Format with proper sign
    return rounded > 0 ? `+${rounded.toFixed(2)}` : rounded.toFixed(2)
  }

  useEffect(() => {
    // Convert sphere values using vertex distance formula
    const odSphereConverted = convertVertexDistance(visionData.od.sphere || '')
    const ogSphereConverted = convertVertexDistance(visionData.og.sphere || '')
    
    setSphereData(prev => ({
      ...prev,
      od: { ...prev.od, puissance: odSphereConverted },
      og: { ...prev.og, puissance: ogSphereConverted }
    }))
    
    // For torique: convert both sphere and cylinder
    const odCylinderConverted = convertVertexDistance(visionData.od.cylinder || '')
    const ogCylinderConverted = convertVertexDistance(visionData.og.cylinder || '')
    
    // Build torique power string: sphere (cylinder) × axis
    const odToriquePower = `${odSphereConverted} (${odCylinderConverted}) × ${visionData.od.axis || '0'}°`
    const ogToriquePower = `${ogSphereConverted} (${ogCylinderConverted}) × ${visionData.og.axis || '0'}°`
    
    setToriqueData(prev => ({
      ...prev,
      od: { ...prev.od, puissance: odToriquePower },
      og: { ...prev.og, puissance: ogToriquePower }
    }))
  }, [visionData])

  const loadConversionTable = async () => {
    try {
      const response = await fetch('/24.xml')
      const text = await response.text()
      const parser = new DOMParser()
      const xml = parser.parseFromString(text, 'text/xml')
      const tableItems = xml.querySelectorAll('Table_Contenu')
      
      const data: ConversionData[] = []
      tableItems.forEach(item => {
        const lunettes = item.querySelector('lunettes')?.textContent || ''
        const lun_plus = item.querySelector('lun_plus')?.textContent || ''
        const lun_moins = item.querySelector('lun_moins')?.textContent || ''
        if (lunettes) data.push({ lunettes, lun_plus, lun_moins })
      })
      
      setConversionTable(data)
    } catch (error) {
      // Fallback data
      setConversionTable([
        { lunettes: '4', lun_plus: '+4.25', lun_moins: '-3.75' },
        { lunettes: '4.5', lun_plus: '+4.75', lun_moins: '-4.25' },
        { lunettes: '5', lun_plus: '+5.25', lun_moins: '-4.75' }
      ])
    }
  }

  const generatePDF = async () => {
    const date = new Date().toLocaleDateString('fr-FR')
    const patientCodeValue = patient?.code || patient?.departmentCode || patient?.id || '000000'
    const firstName = patient?.firstName || ''
    const lastName = patient?.lastName || ''
    const age = patient?.age || ''
    
    try {
      // Generate the barcode as a data URL
      const barcodeCanvas = document.createElement('canvas')
      JsBarcode(barcodeCanvas, String(patientCodeValue), {
        format: 'CODE128',
        width: 1.5,
        height: 40,
        displayValue: false,
        margin: 3
      })
      const barcodeDataUrl = barcodeCanvas.toDataURL('image/png')
      
      // Load the image template
      const imageBytes = await loadPDFTemplateImage()
      console.log('✅ Image loaded, size:', imageBytes.byteLength, 'bytes')
      
      // Create new PDF document
      const pdfDoc = await PDFDocument.create()
      
      // Embed the image (template is JPG)
      const image = await pdfDoc.embedJpg(imageBytes)
      
      // Get image dimensions
      const { width: imgWidth, height: imgHeight } = image.scale(1)
      console.log('📐 Image dimensions:', imgWidth, 'x', imgHeight)
      
      // Create a page with the same dimensions as the image
      const page = pdfDoc.addPage([imgWidth, imgHeight])
      const { width, height } = page.getSize()
      
      // Draw the image to fill the entire page
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: width,
        height: height
      })
      
      console.log('✅ Image drawn on PDF page')
      
      // Embed the barcode image
      const barcodeImage = await pdfDoc.embedPng(barcodeDataUrl)
      const barcodeDims = barcodeImage.scale(0.5)  // Smaller: was 0.6
      
      // Embed fonts
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      
      // White writing zone boundaries (adjusted position)
      const startX = 350  // More to the right
      const startY = height - 420  // More down
      
      // Line 1: Date and Barcode on same line
      page.drawText(`Le: ${date}`, {
        x: startX,
        y: startY,
        size: 16,
        font: helvetica,
        color: rgb(0, 0, 0)
      })
      
      // Draw barcode next to date (not far right)
      page.drawImage(barcodeImage, {
        x: startX + 250,
        y: startY - 20,  // Lower: was -10
        width: barcodeDims.width,
        height: barcodeDims.height
      })
      
      // Line 2: Patient info - Name, Last name, Age on same line
      page.drawText(`Nom: ${lastName}`, {
        x: startX,
        y: startY - 50,
        size: 14,
        font: helvetica,
        color: rgb(0, 0, 0)
      })
      
      page.drawText(`Prénom: ${firstName}`, {
        x: startX + 180,
        y: startY - 50,
        size: 14,
        font: helvetica,
        color: rgb(0, 0, 0)
      })
      
      page.drawText(`Age: ${age} ans`, {
        x: startX + 390,
        y: startY - 50,
        size: 14,
        font: helvetica,
        color: rgb(0, 0, 0)
      })
      
      // Big Title in blue - LENTILLES DE CONTACT
      page.drawText('LENTILLES DE CONTACT', {
        x: startX + 80,
        y: startY - 95,
        size: 20,
        font: helveticaBold,
        color: rgb(0.165, 0.392, 0.518)  // #2A6484 - app blue color
      })
      
      // Two-column eye data (more space after title)
      const eyeStartY = startY - 155  // More space: was -135
      const lineHeight = 32  // More space between lines: was 28
      const leftColX = startX
      const rightColX = startX + 300
      
      // Left Column: Œil Droit (OD)
      page.drawText('Œil Droit (OD)', {
        x: leftColX,
        y: eyeStartY,
        size: 16,
        font: helveticaBold,
        color: rgb(0, 0, 0)
      })
      
      // Right Column: Œil Gauche (OG)
      page.drawText('Œil Gauche (OG)', {
        x: rightColX,
        y: eyeStartY,
        size: 16,
        font: helveticaBold,
        color: rgb(0, 0, 0)
      })
      
      // 3 options under each eye (from table)
      if (activeWindow === 'sphere') {
        // OD - 3 options (Sphère Équivalente: add D to PUISSANCE, mm to others)
        const odPuissance = sphereData.od.puissance ? `${sphereData.od.puissance} D` : '-'
        const odRayon = sphereData.od.rayon ? `${sphereData.od.rayon} mm` : '-'
        const odDiametre = sphereData.od.diametre ? `${sphereData.od.diametre} mm` : '-'
        
        page.drawText(`PUISSANCE: ${odPuissance}`, {
          x: leftColX,
          y: eyeStartY - lineHeight,
          size: 14,
          font: helvetica,
          color: rgb(0, 0, 0)
        })
        page.drawText(`RAYON: ${odRayon}`, {
          x: leftColX,
          y: eyeStartY - lineHeight * 2,
          size: 14,
          font: helvetica,
          color: rgb(0, 0, 0)
        })
        page.drawText(`DIAMÈTRE: ${odDiametre}`, {
          x: leftColX,
          y: eyeStartY - lineHeight * 3,
          size: 14,
          font: helvetica,
          color: rgb(0, 0, 0)
        })
        
        // OG - 3 options (Sphère Équivalente: add D to PUISSANCE, mm to others)
        const ogPuissance = sphereData.og.puissance ? `${sphereData.og.puissance} D` : '-'
        const ogRayon = sphereData.og.rayon ? `${sphereData.og.rayon} mm` : '-'
        const ogDiametre = sphereData.og.diametre ? `${sphereData.og.diametre} mm` : '-'
        
        page.drawText(`PUISSANCE: ${ogPuissance}`, {
          x: rightColX,
          y: eyeStartY - lineHeight,
          size: 14,
          font: helvetica,
          color: rgb(0, 0, 0)
        })
        page.drawText(`RAYON: ${ogRayon}`, {
          x: rightColX,
          y: eyeStartY - lineHeight * 2,
          size: 14,
          font: helvetica,
          color: rgb(0, 0, 0)
        })
        page.drawText(`DIAMÈTRE: ${ogDiametre}`, {
          x: rightColX,
          y: eyeStartY - lineHeight * 3,
          size: 14,
          font: helvetica,
          color: rgb(0, 0, 0)
        })
      } else {
        // OD - 3 options for torique (Lentilles Toriques: no D for PUISSANCE, add D to CYLINDRE, ° to AXE)
        const odPuissanceTorique = toriqueData.od.puissance || '-'  // No D for torique
        const odCylindre = visionData.od.cylinder ? `${visionData.od.cylinder} D` : '-'
        const odAxe = visionData.od.axis ? `${visionData.od.axis}°` : '-'
        
        page.drawText(`PUISSANCE: ${odPuissanceTorique}`, {
          x: leftColX,
          y: eyeStartY - lineHeight,
          size: 14,
          font: helvetica,
          color: rgb(0, 0, 0)
        })
        page.drawText(`CYLINDRE: ${odCylindre}`, {
          x: leftColX,
          y: eyeStartY - lineHeight * 2,
          size: 14,
          font: helvetica,
          color: rgb(0, 0, 0)
        })
        page.drawText(`AXE: ${odAxe}`, {
          x: leftColX,
          y: eyeStartY - lineHeight * 3,
          size: 14,
          font: helvetica,
          color: rgb(0, 0, 0)
        })
        
        // OG - 3 options for torique (Lentilles Toriques: no D for PUISSANCE, add D to CYLINDRE, ° to AXE)
        const ogPuissanceTorique = toriqueData.og.puissance || '-'  // No D for torique
        const ogCylindre = visionData.og.cylinder ? `${visionData.og.cylinder} D` : '-'
        const ogAxe = visionData.og.axis ? `${visionData.og.axis}°` : '-'
        
        page.drawText(`PUISSANCE: ${ogPuissanceTorique}`, {
          x: rightColX,
          y: eyeStartY - lineHeight,
          size: 14,
          font: helvetica,
          color: rgb(0, 0, 0)
        })
        page.drawText(`CYLINDRE: ${ogCylindre}`, {
          x: rightColX,
          y: eyeStartY - lineHeight * 2,
          size: 14,
          font: helvetica,
          color: rgb(0, 0, 0)
        })
        page.drawText(`AXE: ${ogAxe}`, {
          x: rightColX,
          y: eyeStartY - lineHeight * 3,
          size: 14,
          font: helvetica,
          color: rgb(0, 0, 0)
        })
      }
      
      // Type under the eye data (more space)
      const bottomY = eyeStartY - lineHeight * 4.5  // More space: was 4
      page.drawText(`Type: ${type || '-'}`, {
        x: startX,
        y: bottomY,
        size: 14,
        font: helvetica,
        color: rgb(0, 0, 0)
      })
      
      // Marque under Type (more space)
      page.drawText(`Marque: ${marque || '-'}`, {
        x: startX,
        y: bottomY - 35,  // More space: was -25
        size: 14,
        font: helvetica,
        color: rgb(0, 0, 0)
      })
      
      // Serialize the PDFDocument to bytes
      const pdfBytes = await pdfDoc.save()
      
      // Create a blob and download the PDF - convert to ArrayBuffer
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      
      return { blob, url, fileName: `lentilles_${lastName}_${firstName}_${date.replace(/\//g, '-')}.pdf`, pdfBytes }
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert(`Erreur lors de la génération du PDF: ${error instanceof Error ? error.message : String(error)}`)
      return null
    }
  }

  const handlePrint = async () => {
    const pdfData = await generatePDF()
    if (!pdfData) return
    
    // Print silently with A5 paper size (NO DIALOG!)
    try {
      const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfData.pdfBytes)))
      
      console.log('🖨️ Printing contact lens prescription silently with A5...')
      await window.electronAPI.printPDF(pdfBase64, 'A5')
      console.log('✅ Contact lens prescription printed successfully')
    } catch (error) {
      console.error('❌ Print error:', error)
      alert('❌ Erreur d\'impression')
    }
  }
  
  const handleDownload = async () => {
    const pdfData = await generatePDF()
    if (!pdfData) return
    
    // Create a download link
    const link = document.createElement('a')
    link.href = pdfData.url
    link.download = pdfData.fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Clean up the URL after a delay
    setTimeout(() => {
      URL.revokeObjectURL(pdfData.url)
    }, 5000)
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '1200px',
        height: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #2A6484 0%, #429898 100%)',
          color: 'white',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0 }}>👁️ Prescription de Lentilles de Contact</h2>
          <button onClick={onClose} style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            color: 'white',
            fontSize: '24px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            cursor: 'pointer'
          }}>×</button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginBottom: '20px' }}>
            <h3 style={{ color: '#2A6484' }}>👁️ Œil Droit (OD)</h3>
            <h3 style={{ color: '#429898' }}>👁️ Œil Gauche (OG)</h3>
          </div>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Marque</label>
              <input
                type="text"
                value={marque}
                onChange={(e) => setMarque(e.target.value)}
                onFocus={() => setShowBrandDropdown(true)}
                onBlur={() => setTimeout(() => setShowBrandDropdown(false), 200)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
                placeholder="Sélectionnez ou saisissez une marque"
              />
              {showBrandDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  zIndex: 10
                }}>
                  {brandOptions.map(brand => (
                    <div
                      key={brand}
                      onClick={() => {
                        setMarque(brand)
                        setShowBrandDropdown(false)
                      }}
                      style={{
                        padding: '10px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f0f0f0'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#f5f5f5'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                    >
                      {brand}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'white'
                }}
              >
                {typeOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => setShowConversionTable(true)}
              style={{
                padding: '12px 24px',
                background: '#429898',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              📊 Table de Conversion
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              onClick={() => setActiveWindow('sphere')}
              style={{
                padding: '10px 20px',
                background: activeWindow === 'sphere' ? '#2A6484' : '#e0e0e0',
                color: activeWindow === 'sphere' ? 'white' : '#333',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Sphère Équivalente
            </button>
            <button
              onClick={() => setActiveWindow('torique')}
              style={{
                padding: '10px 20px',
                background: activeWindow === 'torique' ? '#429898' : '#e0e0e0',
                color: activeWindow === 'torique' ? 'white' : '#333',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Lentilles Toriques
            </button>
          </div>

          <div style={{
            display: 'flex',
            gap: '20px',
            padding: '20px',
            background: '#f9f9f9',
            borderRadius: '8px'
          }}>
            {activeWindow === 'sphere' ? (
              <>
                <div style={{ flex: 1 }}>
                  <h4 style={{ color: '#2A6484', marginTop: 0 }}>Œil Droit (OD)</h4>
                  <table style={{ width: '100%' }}>
                    <tbody>
                      {['puissance', 'diametre', 'rayon'].map((field) => (
                        <tr key={field}>
                          <td style={{ padding: '10px', fontWeight: 'bold' }}>{field.charAt(0).toUpperCase() + field.slice(1)}:</td>
                          <td>
                            <input
                              type="text"
                              value={sphereData.od[field as keyof typeof sphereData.od]}
                              onChange={(e) => setSphereData(prev => ({
                                ...prev,
                                od: { ...prev.od, [field]: e.target.value }
                              }))}
                              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ color: '#429898', marginTop: 0 }}>Œil Gauche (OG)</h4>
                  <table style={{ width: '100%' }}>
                    <tbody>
                      {['puissance', 'diametre', 'rayon'].map((field) => (
                        <tr key={field}>
                          <td style={{ padding: '10px', fontWeight: 'bold' }}>{field.charAt(0).toUpperCase() + field.slice(1)}:</td>
                          <td>
                            <input
                              type="text"
                              value={sphereData.og[field as keyof typeof sphereData.og]}
                              onChange={(e) => setSphereData(prev => ({
                                ...prev,
                                og: { ...prev.og, [field]: e.target.value }
                              }))}
                              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <div style={{ flex: 1 }}>
                  <h4 style={{ color: '#2A6484', marginTop: 0 }}>Œil Droit (OD)</h4>
                  <table style={{ width: '100%' }}>
                    <tbody>
                      {['puissance', 'diametre', 'rayon'].map((field) => (
                        <tr key={field}>
                          <td style={{ padding: '10px', fontWeight: 'bold' }}>{field.charAt(0).toUpperCase() + field.slice(1)}:</td>
                          <td>
                            <input
                              type="text"
                              value={toriqueData.od[field as keyof typeof toriqueData.od]}
                              onChange={(e) => setToriqueData(prev => ({
                                ...prev,
                                od: { ...prev.od, [field]: e.target.value }
                              }))}
                              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ color: '#429898', marginTop: 0 }}>Œil Gauche (OG)</h4>
                  <table style={{ width: '100%' }}>
                    <tbody>
                      {['puissance', 'diametre', 'rayon'].map((field) => (
                        <tr key={field}>
                          <td style={{ padding: '10px', fontWeight: 'bold' }}>{field.charAt(0).toUpperCase() + field.slice(1)}:</td>
                          <td>
                            <input
                              type="text"
                              value={toriqueData.og[field as keyof typeof toriqueData.og]}
                              onChange={(e) => setToriqueData(prev => ({
                                ...prev,
                                og: { ...prev.og, [field]: e.target.value }
                              }))}
                              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{
          padding: '20px',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'center',
          gap: '10px'
        }}>
          <button
            onClick={handlePrint}
            style={{
              padding: '12px 30px',
              background: '#2A6484',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            🖨️ Imprimer
          </button>
          <button
            onClick={handleDownload}
            style={{
              padding: '12px 30px',
              background: '#429898',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            📥 Télécharger PDF
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '12px 30px',
              background: '#e0e0e0',
              color: '#333',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Fermer
          </button>
        </div>
      </div>
      
      {/* Conversion Table Popup */}
      {showConversionTable && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            maxWidth: '600px',
            width: '90%'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: 0, color: '#2A6484' }}>📊 Table de Conversion</h3>
              <button
                onClick={() => setShowConversionTable(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold' }}>Lunettes</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold' }}>Lentille (+)</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold' }}>Lentille (-)</th>
                </tr>
              </thead>
              <tbody>
                {conversionTable.slice(0, 3).map((row, index) => (
                  <tr key={index}>
                    <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{row.lunettes}</td>
                    <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{row.lun_plus}</td>
                    <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{row.lun_moins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default ContactLensModal
