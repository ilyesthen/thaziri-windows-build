import React, { useState, useEffect } from 'react'
import './ConversionTableModal.css'

interface ConversionTableModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ConversionEntry {
  lunettes: string
  lun_plus: string
  lun_moins: string
}

const ConversionTableModal: React.FC<ConversionTableModalProps> = ({ isOpen, onClose }) => {
  const [showTable, setShowTable] = useState(false)
  const [conversionData, setConversionData] = useState<ConversionEntry[]>([])
  const [searchValue, setSearchValue] = useState('')

  useEffect(() => {
    // Load conversion data from 24.xml
    const loadConversionData = async () => {
      try {
        const response = await fetch('/24.xml')
        const text = await response.text()
        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(text, 'text/xml')
        
        const entries: ConversionEntry[] = []
        const tableContents = xmlDoc.getElementsByTagName('Table_Contenu')
        
        for (let i = 0; i < tableContents.length; i++) {
          const content = tableContents[i]
          const lunettes = content.getElementsByTagName('lunettes')[0]?.textContent || ''
          const lun_plus = content.getElementsByTagName('lun_plus')[0]?.textContent || ''
          const lun_moins = content.getElementsByTagName('lun_moins')[0]?.textContent || ''
          
          if (lunettes) {
            entries.push({ lunettes, lun_plus, lun_moins })
          }
        }
        
        setConversionData(entries)
      } catch (error) {
        console.error('Error loading conversion data:', error)
        // Fallback data if XML loading fails
        setConversionData([
          { lunettes: '4.00', lun_plus: '+4.25', lun_moins: '-3.75' },
          { lunettes: '4.50', lun_plus: '+4.75', lun_moins: '-4.25' },
          { lunettes: '5.00', lun_plus: '+5.25', lun_moins: '-4.75' },
        ])
      }
    }
    
    if (isOpen) {
      loadConversionData()
    }
  }, [isOpen])

  const filteredData = conversionData.filter(entry => 
    entry.lunettes.includes(searchValue) ||
    entry.lun_plus.includes(searchValue) ||
    entry.lun_moins.includes(searchValue)
  )

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="conversion-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        {!showTable ? (
          <div className="conversion-main">
            <div className="conversion-header">
              <div className="eye-section">
                <h2>👁️ Œil Droit (OD)</h2>
                <div className="eye-content">
                  {/* Right eye content can go here */}
                  <p>Contenu pour l'œil droit</p>
                </div>
              </div>
              <div className="eye-section">
                <h2>👁️ Œil Gauche (OG)</h2>
                <div className="eye-content">
                  {/* Left eye content can go here */}
                  <p>Contenu pour l'œil gauche</p>
                </div>
              </div>
            </div>
            
            <button 
              className="conversion-table-btn"
              onClick={() => setShowTable(true)}
            >
              📊 Table de Conversion
            </button>
          </div>
        ) : (
          <div className="conversion-table-view">
            <button 
              className="back-btn"
              onClick={() => setShowTable(false)}
            >
              ← Retour
            </button>
            
            <h2>Table de Conversion</h2>
            
            <div className="table-search">
              <input
                type="text"
                placeholder="Rechercher une valeur..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            </div>
            
            <div className="conversion-table-wrapper">
              <table className="conversion-table">
                <thead>
                  <tr>
                    <th>Lunettes</th>
                    <th>Lentilles +</th>
                    <th>Lentilles -</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((entry, index) => (
                    <tr key={index}>
                      <td>{entry.lunettes}</td>
                      <td>{entry.lun_plus}</td>
                      <td>{entry.lun_moins}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ConversionTableModal
