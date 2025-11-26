import React, { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import './FloatingAIChat.css'

interface ChatMessage {
  role: 'user' | 'ai'
  content: string
}

interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
}

const FloatingAIChat: React.FC = () => {
  const { user } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [position, setPosition] = useState({ x: window.innerWidth - 100, y: window.innerHeight - 100 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const chatEndRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLDivElement>(null)

  // OpenRouter API configuration (provides access to multiple models)
  const OPENROUTER_API_KEY = "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"

  // Load chat sessions from localStorage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('ai-chat-sessions')
    if (savedSessions) {
      const sessions = JSON.parse(savedSessions)
      setChatSessions(sessions)
      // Load most recent chat
      if (sessions.length > 0) {
        const mostRecent = sessions[0]
        setCurrentChatId(mostRecent.id)
        setMessages(mostRecent.messages)
      }
    }
  }, [])

  // Save chat sessions to localStorage whenever they change
  useEffect(() => {
    if (chatSessions.length > 0) {
      localStorage.setItem('ai-chat-sessions', JSON.stringify(chatSessions))
    }
  }, [chatSessions])

  // Update current session when messages change
  useEffect(() => {
    if (currentChatId && messages.length > 0) {
      setChatSessions(prev => prev.map(session => 
        session.id === currentChatId 
          ? { ...session, messages, title: generateChatTitle(messages) }
          : session
      ))
    }
  }, [messages, currentChatId])

  // Generate chat title from first message
  const generateChatTitle = (msgs: ChatMessage[]) => {
    if (msgs.length === 0) return 'Nouvelle conversation'
    const firstUserMsg = msgs.find(m => m.role === 'user')
    if (!firstUserMsg) return 'Nouvelle conversation'
    return firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '')
  }

  // Create new chat session
  const createNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'Nouvelle conversation',
      messages: [],
      createdAt: new Date()
    }
    setChatSessions(prev => [newSession, ...prev])
    setCurrentChatId(newSession.id)
    setMessages([])
    setShowHistory(false)
  }

  // Load a chat session
  const loadChatSession = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId)
    if (session) {
      setCurrentChatId(session.id)
      setMessages(session.messages)
      setShowHistory(false)
    }
  }

  // Delete a chat session
  const deleteChatSession = (sessionId: string) => {
    setChatSessions(prev => prev.filter(s => s.id !== sessionId))
    if (currentChatId === sessionId) {
      const remaining = chatSessions.filter(s => s.id !== sessionId)
      if (remaining.length > 0) {
        loadChatSession(remaining[0].id)
      } else {
        createNewChat()
      }
    }
    localStorage.setItem('ai-chat-sessions', JSON.stringify(chatSessions.filter(s => s.id !== sessionId)))
  }

  // Only show for doctors and assistants
  if (!user || !['doctor', 'assistant_1', 'assistant_2'].includes(user.role)) {
    return null
  }

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.ai-chat-box')) return // Don't drag when clicking chat box
    
    setIsDragging(true)
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return

    const newX = e.clientX - dragOffset.x
    const newY = e.clientY - dragOffset.y

    // Keep button within window bounds
    const maxX = window.innerWidth - 60
    const maxY = window.innerHeight - 60

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragOffset])

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage = inputMessage.trim()
    setInputMessage('')
    
    // If no current chat, create one
    if (!currentChatId) {
      createNewChat()
    }
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      // Build conversation history for OpenAI format with enhanced ophthalmology expertise
      const conversationMessages = [
        {
          role: 'system',
          content: `Tu es un assistant IA médical expert en ophtalmologie qui aide ${user.role === 'doctor' ? 'Dr. ' + user.name : 'l\'assistant médical ' + user.name}.

EXPERTISE:
- Tu es EXTRÊMEMENT compétent en ophtalmologie (anatomie oculaire, pathologies, diagnostics, traitements)
- Tu possèdes une connaissance approfondie de toutes les maladies oculaires
- Tu maîtrises les techniques d'examen ophtalmologique et l'interprétation des résultats
- Tu connais tous les médicaments ophtalmologiques et leurs indications

STYLE DE RÉPONSE:
- Fournis des réponses TRÈS SPÉCIFIQUES et DÉTAILLÉES
- Organise toujours tes réponses avec des sections claires
- Utilise des titres, sous-titres et listes à puces
- Sois PRÉCIS dans les dosages, durées de traitement et recommandations
- Cite des données cliniques et études quand pertinent

FORMAT DE RÉPONSE:
1. Utilise des **titres en gras** pour les sections principales
2. Utilise des sous-sections numérotées ou à puces
3. Présente les informations de manière structurée et professionnelle
4. Fournis des détails techniques précis

IMPORTANT: 
- Sois ULTRA-SPÉCIFIQUE et évite les généralités
- Donne des recommandations cliniques précises
- Explique le raisonnement médical
- En français uniquement`
        },
        ...messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        {
          role: 'user',
          content: userMessage
        }
      ]

      // Call OpenRouter API (supports Qwen and many other models)
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Thaziri Medical Assistant'
        },
        body: JSON.stringify({
          model: 'qwen/qwen-2.5-72b-instruct',
          messages: conversationMessages,
          temperature: 0.8,
          max_tokens: 2000
        })
      })

      const data = await response.json()
      console.log('API Response:', data)

      // Handle OpenRouter response format
      if (data.choices && data.choices[0]?.message?.content) {
        const aiResponse = data.choices[0].message.content
        setMessages(prev => [...prev, { role: 'ai', content: aiResponse }])
      } else if (data.error) {
        console.error('API Error:', data.error)
        setMessages(prev => [...prev, { 
          role: 'ai', 
          content: `Erreur: ${data.error.message || 'Impossible de générer une réponse'}` 
        }])
      } else {
        console.error('Unexpected response:', data)
        setMessages(prev => [...prev, { 
          role: 'ai', 
          content: 'Désolé, je n\'ai pas pu générer une réponse. Veuillez réessayer.' 
        }])
      }
    } catch (error) {
      console.error('AI Error:', error)
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: 'Erreur de connexion à l\'IA. Veuillez vérifier votre connexion internet et réessayer.' 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Format message with HTML for better display
  const formatMessage = (content: string) => {
    // Convert markdown-style formatting to HTML
    let formatted = content
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Numbered lists
      .replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')
      // Bullet points
      .replace(/^-\s(.+)$/gm, '<li>$1</li>')
      // Line breaks
      .replace(/\n/g, '<br/>')
    
    // Wrap lists
    formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    
    return formatted
  }

  return (
    <>
      <div
        ref={buttonRef}
        className={`floating-ai-button ${isDragging ? 'dragging' : ''}`}
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        onMouseDown={handleMouseDown}
        onClick={() => {
          if (!isDragging) {
            setIsOpen(!isOpen)
          }
        }}
        title="Assistant IA - Glissez pour déplacer"
      >
        <span className="ai-icon">🤖</span>
        {!isOpen && <span className="ai-pulse"></span>}
      </div>

      {isOpen && (
        <>
          <div className="ai-chat-backdrop" onClick={() => setIsOpen(false)} />
          <div className="ai-chat-box-centered">
            <div className="ai-chat-header">
              <div className="ai-chat-title">
                <span>🤖 Assistant IA Ophtalmologie</span>
              </div>
              <div className="ai-header-actions">
                <button 
                  className="ai-header-btn" 
                  onClick={createNewChat}
                  title="Nouvelle conversation"
                >
                  ➕ Nouveau
                </button>
                <button 
                  className="ai-header-btn" 
                  onClick={() => setShowHistory(!showHistory)}
                  title="Historique"
                >
                  📚 Historique ({chatSessions.length})
                </button>
                <button className="ai-close-btn" onClick={() => setIsOpen(false)}>✖</button>
              </div>
            </div>

            <div className="ai-chat-container">
              {/* Chat History Sidebar */}
              {showHistory && (
                <div className="ai-chat-history">
                  <div className="ai-history-header">
                    <h3>Conversations</h3>
                  </div>
                  <div className="ai-history-list">
                    {chatSessions.map(session => (
                      <div 
                        key={session.id}
                        className={`ai-history-item ${currentChatId === session.id ? 'active' : ''}`}
                        onClick={() => loadChatSession(session.id)}
                      >
                        <div className="ai-history-item-content">
                          <div className="ai-history-title">{session.title}</div>
                          <div className="ai-history-date">
                            {new Date(session.createdAt).toLocaleDateString('fr-FR', { 
                              day: 'numeric', 
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        <button 
                          className="ai-history-delete"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteChatSession(session.id)
                          }}
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                    {chatSessions.length === 0 && (
                      <div className="ai-history-empty">
                        Aucune conversation
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Messages Area */}
              <div className="ai-chat-main">
                <div className="ai-chat-messages">
                  {messages.length === 0 && (
                    <div className="ai-welcome">
                      <p>👋 Bonjour {user.name}!</p>
                      <p>Je suis votre assistant IA spécialisé en ophtalmologie.</p>
                      <p>Posez-moi des questions sur les pathologies oculaires, diagnostics, traitements, etc.</p>
                    </div>
                  )}
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`ai-message ${msg.role}`}>
                      <div className="ai-message-avatar">
                        {msg.role === 'user' ? '👤' : '🤖'}
                      </div>
                      <div 
                        className="ai-message-content" 
                        dangerouslySetInnerHTML={{ 
                          __html: formatMessage(msg.content) 
                        }}
                      />
                    </div>
                  ))}
                  {isLoading && (
                    <div className="ai-message ai">
                      <div className="ai-message-avatar">🤖</div>
                      <div className="ai-message-content ai-typing">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="ai-chat-input">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Posez votre question médicale..."
                    rows={2}
                    disabled={isLoading}
                  />
                  <button 
                    onClick={sendMessage} 
                    disabled={!inputMessage.trim() || isLoading}
                    className="ai-send-btn"
                  >
                    {isLoading ? '⏳' : '📤'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default FloatingAIChat
