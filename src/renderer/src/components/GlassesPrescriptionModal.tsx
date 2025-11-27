import React, { useState, useEffect } from 'react'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import JsBarcode from 'jsbarcode'
import './GlassesPrescriptionModal.css'

interface GlassesPrescriptionModalProps {
  isOpen: boolean
  onClose: () => void
  patientName?: string
  patientAge?: string
  patientCode?: string
  visionData?: {
    vl: {
      od: {
        sphere: string
        cylinder: string
        axis: string
      }
      og: {
        sphere: string
        cylinder: string
        axis: string
      }
      addition: string
    }
  }
}

const GlassesPrescriptionModal: React.FC<GlassesPrescriptionModalProps> = ({
  isOpen,
  onClose,
  patientName = '',
  patientAge = '',
  patientCode = '',
  visionData
}) => {
  const [distanceSphereRight, setDistanceSphereRight] = useState('')
  const [distanceCylindreRight, setDistanceCylindreRight] = useState('')
  const [distanceAxeRight, setDistanceAxeRight] = useState('')
  
  const [distanceSphereLeft, setDistanceSphereLeft] = useState('')
  const [distanceCylindreLeft, setDistanceCylindreLeft] = useState('')
  const [distanceAxeLeft, setDistanceAxeLeft] = useState('')
  
  const [nearSphereRight, setNearSphereRight] = useState('')
  const [nearCylindreRight, setNearCylindreRight] = useState('')
  const [nearAxeRight, setNearAxeRight] = useState('')
  
  const [nearSphereLeft, setNearSphereLeft] = useState('')
  const [nearCylindreLeft, setNearCylindreLeft] = useState('')
  const [nearAxeLeft, setNearAxeLeft] = useState('')
  
  const [verres, setVerres] = useState('')
  const [showVerresDropdown, setShowVerresDropdown] = useState(false)
  
  const verresOptions = [
    'Verres transitions',
    'Cristals aisés',
    'Organiques',
    'Minéraux',
    'Photochromiques PER',
    'Photochromiques PBG',
    'Progressifs blancs',
    'Progressifs photochromiques',
    'Extrafins',
    'verres HMC "Anti-Reflets"'
  ]

  useEffect(() => {
    if (visionData) {
      setDistanceSphereRight(visionData.vl.od.sphere || '')
      setDistanceCylindreRight(visionData.vl.od.cylinder || '')
      setDistanceAxeRight(visionData.vl.od.axis || '')
      
      setDistanceSphereLeft(visionData.vl.og.sphere || '')
      setDistanceCylindreLeft(visionData.vl.og.cylinder || '')
      setDistanceAxeLeft(visionData.vl.og.axis || '')
      
      // Calculate near vision if addition exists
      if (visionData.vl.addition) {
        const additionValue = parseFloat(visionData.vl.addition)
        
        if (visionData.vl.od.sphere) {
          const sphereValue = parseFloat(visionData.vl.od.sphere)
          if (!isNaN(additionValue) && !isNaN(sphereValue)) {
            const nearSphere = (sphereValue + additionValue).toFixed(2)
            setNearSphereRight(nearSphere.startsWith('-') ? nearSphere : `+${nearSphere}`)
          }
        }
        setNearCylindreRight(visionData.vl.od.cylinder || '')
        setNearAxeRight(visionData.vl.od.axis || '')
        
        if (visionData.vl.og.sphere) {
          const sphereValue = parseFloat(visionData.vl.og.sphere)
          if (!isNaN(additionValue) && !isNaN(sphereValue)) {
            const nearSphere = (sphereValue + additionValue).toFixed(2)
            setNearSphereLeft(nearSphere.startsWith('-') ? nearSphere : `+${nearSphere}`)
          }
        }
        setNearCylindreLeft(visionData.vl.og.cylinder || '')
        setNearAxeLeft(visionData.vl.og.axis || '')
      }
    }
  }, [visionData])

  const generatePDF = async (type: 'distance' | 'near' | 'both'): Promise<{ url: string; fileName: string; pdfBytes: Uint8Array } | null> => {
    try {
      const date = new Date().toLocaleDateString('fr-FR')
      const patientCodeValue = patientCode || '000000'
      const [firstName, ...lastNameParts] = patientName.split(' ') || ['', '']
      const lastName = lastNameParts.join(' ')
      const age = patientAge || '0'

      // Generate barcode
      const barcodeCanvas = document.createElement('canvas')
      JsBarcode(barcodeCanvas, patientCodeValue, {
        format: 'CODE128',
        width: 1.5,
        height: 35,
        displayValue: true,
        fontSize: 12,
        margin: 0
      })
      const barcodeDataUrl = barcodeCanvas.toDataURL('image/png')
      const barcodeImageBytes = await fetch(barcodeDataUrl).then(res => res.arrayBuffer())

      // Load the background image
      const imagePath = '/ffad17b0-7b80-424b-99e2-4173d59b7fcb-2.jpg'
      const response = await fetch(imagePath)
      if (!response.ok) {
        throw new Error(`Failed to load image: ${response.status}`)
      }
      const imageBytes = await response.arrayBuffer()

      // Create new PDF document
      const pdfDoc = await PDFDocument.create()
      const image = await pdfDoc.embedJpg(imageBytes)

      // Get image dimensions
      const { width: imgWidth, height: imgHeight } = image.scale(1)
      console.log('📐 Image dimensions:', imgWidth, 'x', imgHeight)
      
      // Create a page with the same dimensions as the image
      const page = pdfDoc.addPage([imgWidth, imgHeight])
      const { width, height } = page.getSize()

      // Draw background image
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: width,
        height: height
      })

      // Embed fonts and barcode
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      const barcodeImage = await pdfDoc.embedPng(barcodeImageBytes)
      const barcodeDims = barcodeImage.scale(0.5)  // Smaller: was 0.7

      // Starting position
      const startX = 350
      const startY = height - 420

      // Date
      page.drawText(`Le: ${date}`, {
        x: startX,
        y: startY,
        size: 16,
        font: helvetica,
        color: rgb(0, 0, 0)
      })

      // Barcode
      page.drawImage(barcodeImage, {
        x: startX + 250,
        y: startY - 20,  // Lower: was -10
        width: barcodeDims.width,
        height: barcodeDims.height
      })

      // Patient info
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

      // Title
      page.drawText('VERRES CORRECTEURS', {
        x: startX + 80,
        y: startY - 95,
        size: 20,
        font: helveticaBold,
        color: rgb(0.165, 0.392, 0.518)
      })

      let currentY = startY - 155  // More space: was -135

      // Draw distance vision if needed
      if (type === 'distance' || type === 'both') {
        // Vision de loin subtitle
        page.drawText('Vision de loin', {
          x: startX + 150,
          y: currentY,
          size: 18,
          font: helveticaBold,
          color: rgb(0.165, 0.392, 0.518)
        })

        currentY -= 45  // More space: was -40

        // Two side-by-side tables for OD and OG
        const leftColX = startX
        const rightColX = startX + 300
        const lineHeight = 32  // More space: was 28

        // Left: Œil Droit (OD)
        page.drawText('Œil Droit (OD)', {
          x: leftColX,
          y: currentY,
          size: 16,
          font: helveticaBold,
          color: rgb(0, 0, 0)
        })

        // Right: Œil Gauche (OG)
        page.drawText('Œil Gauche (OG)', {
          x: rightColX,
          y: currentY,
          size: 16,
          font: helveticaBold,
          color: rgb(0, 0, 0)
        })

        currentY -= lineHeight

        // OD Data
        const odSphere = distanceSphereRight ? `${distanceSphereRight} D` : '-'
        const odCylinder = distanceCylindreRight ? `${distanceCylindreRight} D` : '-'
        const odAxis = distanceAxeRight ? `${distanceAxeRight}°` : '-'

        page.drawText(`SPHÈRE: ${odSphere}`, {
          x: leftColX,
          y: currentY,
          size: 14,
          font: helvetica,
          color: rgb(0, 0, 0)
        })
        page.drawText(`CYLINDRE: ${odCylinder}`, {
          x: leftColX,
          y: currentY - lineHeight,
          size: 14,
          font: helvetica,
          color: rgb(0, 0, 0)
        })
        page.drawText(`AXE: ${odAxis}`, {
          x: leftColX,
          y: currentY - lineHeight * 2,
          size: 14,
          font: helvetica,
          color: rgb(0, 0, 0)
        })

        // OG Data
        const ogSphere = distanceSphereLeft ? `${distanceSphereLeft} D` : '-'
        const ogCylinder = distanceCylindreLeft ? `${distanceCylindreLeft} D` : '-'
        const ogAxis = distanceAxeLeft ? `${distanceAxeLeft}°` : '-'

        page.drawText(`SPHÈRE: ${ogSphere}`, {
          x: rightColX,
          y: currentY,
          size: 14,
          font: helvetica,
          color: rgb(0, 0, 0)
        })
        page.drawText(`CYLINDRE: ${ogCylinder}`, {
          x: rightColX,
          y: currentY - lineHeight,
          size: 14,
          font: helvetica,
          color: rgb(0, 0, 0)
        })
        page.drawText(`AXE: ${ogAxis}`, {
          x: rightColX,
          y: currentY - lineHeight * 2,
          size: 14,
          font: helvetica,
          color: rgb(0, 0, 0)
        })

        currentY -= lineHeight * 3 + 35  // More space: was +25
      }

      // Draw near vision if needed
      if ((type === 'near' || type === 'both') && nearSphereRight) {
        // Vision de près subtitle
        page.drawText('Vision de près', {
          x: startX + 150,
          y: currentY,
          size: 18,
          font: helveticaBold,
          color: rgb(0.165, 0.392, 0.518)
        })

        currentY -= 45  // More space: was -40

        const leftColX = startX
        const rightColX = startX + 300
        const lineHeight = 32  // More space: was 28

        // Left: Œil Droit (OD)
        page.drawText('Œil Droit (OD)', {
          x: leftColX,
          y: currentY,
          size: 16,
          font: helveticaBold,
          color: rgb(0, 0, 0)
        })

        // Right: Œil Gauche (OG)
        page.drawText('Œil Gauche (OG)', {
          x: rightColX,
          y: currentY,
          size: 16,
          font: helveticaBold,
          color: rgb(0, 0, 0)
        })

        currentY -= lineHeight

        // OD Data
        const odNearSphere = nearSphereRight ? `${nearSphereRight} D` : '-'
        const odNearCylinder = nearCylindreRight ? `${nearCylindreRight} D` : '-'
        const odNearAxis = nearAxeRight ? `${nearAxeRight}°` : '-'

        page.drawText(`SPHÈRE: ${odNearSphere}`, {
          x: leftColX,
          y: currentY,
          size: 14,
          font: helvetica,
          color: rgb(0, 0, 0)
        })
        page.drawText(`CYLINDRE: ${odNearCylinder}`, {
          x: leftColX,
          y: currentY - lineHeight,
          size: 14,
          font: helvetica,
          color: rgb(0, 0, 0)
        })
        page.drawText(`AXE: ${odNearAxis}`, {
          x: leftColX,
          y: currentY - lineHeight * 2,
          size: 14,
          font: helvetica,
          color: rgb(0, 0, 0)
        })

        // OG Data
        const ogNearSphere = nearSphereLeft ? `${nearSphereLeft} D` : '-'
        const ogNearCylinder = nearCylindreLeft ? `${nearCylindreLeft} D` : '-'
        const ogNearAxis = nearAxeLeft ? `${nearAxeLeft}°` : '-'

        page.drawText(`SPHÈRE: ${ogNearSphere}`, {
          x: rightColX,
          y: currentY,
          size: 14,
          font: helvetica,
          color: rgb(0, 0, 0)
        })
        page.drawText(`CYLINDRE: ${ogNearCylinder}`, {
          x: rightColX,
          y: currentY - lineHeight,
          size: 14,
          font: helvetica,
          color: rgb(0, 0, 0)
        })
        page.drawText(`AXE: ${ogNearAxis}`, {
          x: rightColX,
          y: currentY - lineHeight * 2,
          size: 14,
          font: helvetica,
          color: rgb(0, 0, 0)
        })

        currentY -= lineHeight * 3 + 35  // More space: was +25
      }

      // Verres type at bottom
      if (verres) {
        page.drawText(`Verres: ${verres}`, {
          x: startX,
          y: currentY - 30,  // More space: was -20
          size: 14,
          font: helvetica,
          color: rgb(0, 0, 0)
        })
      }

      // Save PDF
      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      const typeStr = type === 'distance' ? 'Loin' : type === 'near' ? 'Pres' : 'Complet'
      const fileName = `Prescription_Lunettes_${patientName.replace(/\s+/g, '_')}_${typeStr}_${new Date().getTime()}.pdf`

      return { url, fileName, pdfBytes }
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert(`Erreur lors de la génération du PDF: ${error instanceof Error ? error.message : String(error)}`)
      return null
    }
  }

  const handlePrint = async (type: 'distance' | 'near' | 'both') => {
    const pdfData = await generatePDF(type)
    if (!pdfData) return

    // Print silently with A5 paper size (NO DIALOG!)
    try {
      const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfData.pdfBytes)))
      
      console.log(`🖨️ Printing glasses prescription (${type}) silently with A5...`)
      await window.electronAPI.printPDF(pdfBase64, 'A5')
      console.log('✅ Glasses prescription printed successfully')
    } catch (error) {
      console.error('❌ Print error:', error)
      alert('❌ Erreur d\'impression')
    }
  }

  const handleDownload = async (type: 'distance' | 'near' | 'both') => {
    const pdfData = await generatePDF(type)
    if (!pdfData) return

    const link = document.createElement('a')
    link.href = pdfData.url
    link.download = pdfData.fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setTimeout(() => {
      URL.revokeObjectURL(pdfData.url)
    }, 5000)
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="glasses-modal-content">
        <div className="glasses-modal-header">
          <h2>👓 Prescription Optique</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="glasses-modal-body">
          {/* Distance Vision Section */}
          <div className="vision-section">
            <div className="vision-header">
              <h3>Vision de loin</h3>
            </div>
            
            <div className="prescription-tables">
              <div className="prescription-table">
                <h4>Œil Droit (OD)</h4>
                <table>
                  <tbody>
                    <tr>
                      <td>SPHÈRE</td>
                      <td>
                        <input 
                          type="text" 
                          value={distanceSphereRight} 
                          onChange={(e) => setDistanceSphereRight(e.target.value)}
                          className="table-input"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>CYLINDRE</td>
                      <td>
                        <input 
                          type="text" 
                          value={distanceCylindreRight} 
                          onChange={(e) => setDistanceCylindreRight(e.target.value)}
                          className="table-input"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>AXE</td>
                      <td>
                        <input 
                          type="text" 
                          value={distanceAxeRight} 
                          onChange={(e) => setDistanceAxeRight(e.target.value)}
                          className="table-input"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="prescription-table">
                <h4>Œil Gauche (OG)</h4>
                <table>
                  <tbody>
                    <tr>
                      <td>SPHÈRE</td>
                      <td>
                        <input 
                          type="text" 
                          value={distanceSphereLeft} 
                          onChange={(e) => setDistanceSphereLeft(e.target.value)}
                          className="table-input"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>CYLINDRE</td>
                      <td>
                        <input 
                          type="text" 
                          value={distanceCylindreLeft} 
                          onChange={(e) => setDistanceCylindreLeft(e.target.value)}
                          className="table-input"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>AXE</td>
                      <td>
                        <input 
                          type="text" 
                          value={distanceAxeLeft} 
                          onChange={(e) => setDistanceAxeLeft(e.target.value)}
                          className="table-input"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '15px' }}>
                <button 
                  className="print-button print-distance"
                  onClick={() => handlePrint('distance')}
                  title="Imprimer la vision de loin"
                >
                  🖨️ Imprimer Loin
                </button>
                <button 
                  className="print-button print-distance"
                  onClick={() => handleDownload('distance')}
                  title="Télécharger la vision de loin"
                  style={{ background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' }}
                >
                  💾 Télécharger Loin
                </button>
              </div>
            </div>
          </div>
          
          {/* Near Vision Section - Only show if addition exists */}
          {visionData?.vl.addition && (
            <div className="vision-section near-vision">
              <div className="vision-header">
                <h3>Vision de près</h3>
                <div className="addition-badge">
                  ADDITION: {visionData.vl.addition}
                </div>
              </div>
              
              <div className="prescription-tables">
                <div className="prescription-table">
                  <h4>Œil Droit (OD)</h4>
                  <table>
                    <tbody>
                      <tr>
                        <td>SPHÈRE</td>
                        <td>
                          <input 
                            type="text" 
                            value={nearSphereRight} 
                            onChange={(e) => setNearSphereRight(e.target.value)}
                            className="table-input"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td>CYLINDRE</td>
                        <td>
                          <input 
                            type="text" 
                            value={nearCylindreRight} 
                            onChange={(e) => setNearCylindreRight(e.target.value)}
                            className="table-input"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td>AXE</td>
                        <td>
                          <input 
                            type="text" 
                            value={nearAxeRight} 
                            onChange={(e) => setNearAxeRight(e.target.value)}
                            className="table-input"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div className="prescription-table">
                  <h4>Œil Gauche (OG)</h4>
                  <table>
                    <tbody>
                      <tr>
                        <td>SPHÈRE</td>
                        <td>
                          <input 
                            type="text" 
                            value={nearSphereLeft} 
                            onChange={(e) => setNearSphereLeft(e.target.value)}
                            className="table-input"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td>CYLINDRE</td>
                        <td>
                          <input 
                            type="text" 
                            value={nearCylindreLeft} 
                            onChange={(e) => setNearCylindreLeft(e.target.value)}
                            className="table-input"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td>AXE</td>
                        <td>
                          <input 
                            type="text" 
                            value={nearAxeLeft} 
                            onChange={(e) => setNearAxeLeft(e.target.value)}
                            className="table-input"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '15px' }}>
                  <button 
                    className="print-button print-near"
                    onClick={() => handlePrint('near')}
                    title="Imprimer la vision de près"
                  >
                    🖨️ Imprimer Près
                  </button>
                  <button 
                    className="print-button print-near"
                    onClick={() => handleDownload('near')}
                    title="Télécharger la vision de près"
                    style={{ background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' }}
                  >
                    💾 Télécharger Près
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Verres Section */}
          <div className="verres-section">
            <h3>Type de verres</h3>
            <div className="verres-input-container">
              <input
                type="text"
                value={verres}
                onChange={(e) => {
                  setVerres(e.target.value)
                  setShowVerresDropdown(true)
                }}
                onFocus={() => setShowVerresDropdown(true)}
                onBlur={() => setTimeout(() => setShowVerresDropdown(false), 200)}
                placeholder="Sélectionner ou saisir le type de verres"
                className="verres-input"
              />
              
              {showVerresDropdown && (
                <div className="verres-dropdown">
                  {verresOptions
                    .filter(option => 
                      option.toLowerCase().includes(verres.toLowerCase())
                    )
                    .map((option, index) => (
                      <div
                        key={index}
                        className="verres-option"
                        onClick={() => {
                          setVerres(option)
                          setShowVerresDropdown(false)
                        }}
                      >
                        {option}
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
          
          {/* Central Print Button */}
          <div className="central-print-section" style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
            <button 
              className="print-button print-both"
              onClick={() => handlePrint('both')}
              title="Imprimer la prescription complète"
            >
              🖨️ Imprimer Tout
            </button>
            <button 
              className="print-button print-both"
              onClick={() => handleDownload('both')}
              title="Télécharger la prescription complète"
              style={{ background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' }}
            >
              💾 Télécharger Tout
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GlassesPrescriptionModal
