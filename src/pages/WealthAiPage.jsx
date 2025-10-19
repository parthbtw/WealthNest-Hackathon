import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

export const WealthAiPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const chatContainerRef = useRef(null)

  const suggestionChips = [
    "What's my savings balance?",
    "Transfer $5 to Emergency Vault",
    "Set a goal for education",
    "How can I save more money?"
  ]

  const getTimestamp = () => {
    const now = new Date()
    return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const fetchBalance = async () => {
    try {
      const { data } = await supabase
        .from('vaults')
        .select('balance')
        .eq('user_id', user.id)
        .eq('vault_type', 'micro_savings')
        .single()
      return data?.balance || 0
    } catch (error) {
      console.error('Error fetching balance:', error)
      return 0
    }
  }

  const getAiResponse = async (message) => {
    const lowerMessage = message.toLowerCase()
    
    if (lowerMessage.includes('balance') || lowerMessage.includes('savings')) {
      const balance = await fetchBalance()
      return `Checking your balances... Your Micro-Savings Vault has $${balance.toFixed(2)}.`
    } else if (lowerMessage.includes('transfer') || lowerMessage.includes('move')) {
      return "I can help with that soon! Transfer functionality is coming."
    } else if (lowerMessage.includes('goal')) {
      return "Great idea! Goal-setting features will be available shortly."
    } else {
      return "I'm still learning how to help with that, but I'm improving quickly!"
    }
  }

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  const handleSendMessage = async (messageText) => {
    const text = messageText || inputValue.trim()
    if (!text) return

    const userMessage = {
      text,
      sender: 'user',
      timestamp: getTimestamp()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)

    setTimeout(async () => {
      const aiResponseText = await getAiResponse(text)
      const aiMessage = {
        text: aiResponseText,
        sender: 'ai',
        timestamp: getTimestamp()
      }
      setMessages(prev => [...prev, aiMessage])
      setIsTyping(false)
    }, 1500)
  }

  const handleChipClick = (chipText) => {
    setInputValue(chipText)
    handleSendMessage(chipText)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="min-h-screen bg-primary-dark flex flex-col">
      <header className="bg-primary shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gold hover:text-gold-light mr-4 text-xl"
          >
            ←
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gold">WealthAI</h1>
            <p className="text-gold-light text-sm">Your financial assistant</p>
          </div>
        </div>
      </header>

      <div
        ref={chatContainerRef}
        className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 overflow-y-auto"
      >
        {messages.length === 0 && (
          <div className="text-center mt-12">
            <div className="text-6xl mb-4">💬</div>
            <h2 className="text-2xl font-bold text-gold mb-2">Hello! I'm WealthAI</h2>
            <p className="text-gray-400 mb-6">
              Ask me about your balances, transfers, or financial goals.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-gray-700 text-white'
                }`}
              >
                <p className="text-sm md:text-base">{message.text}</p>
                <p className="text-xs text-gray-400 mt-1">{message.timestamp}</p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-lg bg-gray-700 text-white">
                <p className="text-sm">WealthAI is typing...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-primary-dark border-t border-primary p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap gap-2 mb-4">
            {suggestionChips.map((chip, index) => (
              <button
                key={index}
                onClick={() => handleChipClick(chip)}
                className="px-4 py-2 bg-gold text-primary-dark rounded-full text-sm font-medium hover:bg-gold-light transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 bg-primary border-2 border-gold rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gold-light"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim()}
              className="px-6 py-3 bg-gold text-primary-dark rounded-lg font-semibold hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
