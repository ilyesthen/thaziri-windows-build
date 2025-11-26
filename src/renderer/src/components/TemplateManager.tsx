import React, { useState, useEffect, useRef } from 'react'
import './TemplateManager.css'

interface MessageTemplate {
  id: number
  content: string
}

interface TemplateManagerProps {
  onTemplateClick: (content: string) => void
}

const TemplateManager: React.FC<TemplateManagerProps> = ({ onTemplateClick }) => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newContent, setNewContent] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  const clickTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    loadTemplates()
  }, [])

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editingId])

  const loadTemplates = async () => {
    try {
      const result = await window.electronAPI.templates.getAll()
      if (result.success && result.templates) {
        setTemplates(result.templates)
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
  }

  const handleTemplateClick = (template: MessageTemplate) => {
    if (editingId === null) {
      // Prevent double-click from also triggering single-click
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
        clickTimeoutRef.current = undefined
        return
      }

      // Single click: insert into message (with delay to detect double-click)
      clickTimeoutRef.current = setTimeout(() => {
        onTemplateClick(template.content)
        clickTimeoutRef.current = undefined
      }, 200)
    }
  }

  const handleTemplateDoubleClick = (template: MessageTemplate) => {
    if (editingId === null) {
      // Clear single-click timeout
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
        clickTimeoutRef.current = undefined
      }

      // Double-click: start editing
      setEditingId(template.id)
      setEditContent(template.content)
    }
  }

  const handleEditChange = (value: string) => {
    setEditContent(value)

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    if (value.trim() === '') {
      // Don't delete immediately, just clear the timeout
      saveTimeoutRef.current = undefined
    } else {
      saveTimeoutRef.current = setTimeout(async () => {
        if (editingId) {
          await window.electronAPI.templates.update(editingId, value)
          await loadTemplates()
        }
      }, 800)
    }
  }

  const handleNewTemplateChange = (value: string) => {
    setNewContent(value)

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    if (value.trim() !== '') {
      saveTimeoutRef.current = setTimeout(async () => {
        const result = await window.electronAPI.templates.create(value)
        if (result.success) {
          await loadTemplates()
          setIsCreatingNew(false)
          setNewContent('')
        }
      }, 800)
    }
  }

  const handleNewTemplateBlur = async () => {
    // Save new template before closing
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    if (newContent.trim() !== '') {
      const result = await window.electronAPI.templates.create(newContent)
      if (result.success) {
        await loadTemplates()
      }
    }
    
    setIsCreatingNew(false)
    setNewContent('')
  }

  const handleNewTemplateKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // Save new template
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      
      if (newContent.trim() !== '') {
        console.log('Creating new template:', newContent)
        try {
          const result = await window.electronAPI.templates.create(newContent)
          console.log('Create result:', result)
          if (result.success) {
            await loadTemplates()
            setIsCreatingNew(false)
            setNewContent('')
          } else {
            console.error('Failed to create template:', result)
          }
        } catch (error) {
          console.error('Error creating template:', error)
        }
      }
    } else if (e.key === 'Escape') {
      // Cancel without saving
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      
      setIsCreatingNew(false)
      setNewContent('')
    }
  }

  const handleBlur = async () => {
    // Save changes before closing
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    if (editingId) {
      if (editContent.trim() === '') {
        // Delete template if content is empty
        await window.electronAPI.templates.delete(editingId)
        await loadTemplates()
      } else {
        // Update template
        await window.electronAPI.templates.update(editingId, editContent)
        await loadTemplates()
      }
    }
    
    setEditingId(null)
    setEditContent('')
  }

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // Save changes before closing
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      
      if (editingId) {
        if (editContent.trim() === '') {
          // Delete template if content is empty
          console.log('Deleting template:', editingId)
          try {
            await window.electronAPI.templates.delete(editingId)
            await loadTemplates()
          } catch (error) {
            console.error('Error deleting template:', error)
          }
        } else {
          // Update template
          console.log('Updating template:', editingId, editContent)
          try {
            const result = await window.electronAPI.templates.update(editingId, editContent)
            console.log('Update result:', result)
            await loadTemplates()
          } catch (error) {
            console.error('Error updating template:', error)
          }
        }
      }
      
      setEditingId(null)
      setEditContent('')
      setIsCreatingNew(false)
      setNewContent('')
    } else if (e.key === 'Escape') {
      // Cancel without saving
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      
      setEditingId(null)
      setEditContent('')
      setIsCreatingNew(false)
      setNewContent('')
    }
  }

  return (
    <div className="template-manager-simple">
      <h3>📋 Modèles de messages</h3>
      
      <div className="template-list-simple">
        {templates.map((template) => (
          <div key={template.id} className="template-item-simple">
            {editingId === template.id ? (
              <input
                ref={inputRef}
                type="text"
                className="template-input-simple"
                value={editContent}
                onChange={(e) => handleEditChange(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder="Tapez votre modèle..."
              />
            ) : (
              <div
                className="template-text-simple"
                onClick={() => handleTemplateClick(template)}
                onDoubleClick={() => handleTemplateDoubleClick(template)}
              >
                {template.content}
              </div>
            )}
          </div>
        ))}

        {isCreatingNew ? (
          <div className="template-item-simple">
            <input
              ref={inputRef}
              type="text"
              className="template-input-simple"
              value={newContent}
              onChange={(e) => handleNewTemplateChange(e.target.value)}
              onBlur={handleNewTemplateBlur}
              onKeyDown={handleNewTemplateKeyDown}
              placeholder="Nouveau modèle..."
              autoFocus
            />
          </div>
        ) : (
          <button
            className="add-template-btn-simple"
            onClick={() => setIsCreatingNew(true)}
          >
            + Ajouter un modèle
          </button>
        )}
      </div>

      <div className="template-helper-text">
        Cliquez une fois pour insérer, double-cliquez pour modifier
      </div>
    </div>
  )
}

export default TemplateManager
