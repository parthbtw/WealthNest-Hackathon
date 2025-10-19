import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { BalanceCard } from '../components/BalanceCard'

export const Dashboard = () => {
  const { user, profile, signOut } = useAuth()
  const [vaults, setVaults] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      fetchVaults()
    }
  }, [user])

  const [error, setError] = useState('')
  
  // Transfer modal state
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [recipientId, setRecipientId] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferError, setTransferError] = useState('')
  const [transferring, setTransferring] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const fetchVaults = async () => {
    try {
      const { data, error } = await supabase
        .from('vaults')
        .select('*')
        .eq('user_id', user.id)
        .order('vault_type', { ascending: true })

      if (error) throw error
      setVaults(data || [])
    } catch (error) {
      console.error('Error fetching vaults:', error.message)
      
      if (error.message.includes('Could not find the table') || error.message.includes('schema cache')) {
        setError('Database not set up yet. Please run the SQL schema from supabase_schema.sql in your Supabase SQL Editor. See DATABASE_SETUP.md for instructions.')
      } else if (data && data.length === 0) {
        setError('No vaults found. The automatic vault creation may have failed. Please check the database trigger setup.')
      } else {
        setError('Unable to load your vaults. Please try refreshing the page or check your database connection.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const getVaultInfo = (type) => {
    const info = {
      micro_savings: {
        name: 'Micro-Savings Vault',
        icon: '💰',
        description: 'Daily savings for future goals',
        gradientClass: 'from-green-600 to-green-800',
      },
      emergency: {
        name: 'Emergency Vault',
        icon: '🛡️',
        description: 'Safety net for unexpected events',
        gradientClass: 'from-blue-600 to-blue-800',
      },
      pension: {
        name: 'Pension Nest',
        icon: '🏦',
        description: 'Secured for your retirement',
        gradientClass: 'from-purple-600 to-purple-800',
      },
    }
    return info[type] || {}
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0)
  }

  // Get Micro-Savings vault
  const getMicroSavingsVault = () => {
    return vaults.find(v => v.vault_type === 'micro_savings')
  }

  // Open transfer modal
  const handleOpenTransferModal = () => {
    setShowTransferModal(true)
    setRecipientId('')
    setRecipientEmail('')
    setTransferAmount('')
    setTransferError('')
  }

  // Close transfer modal
  const handleCloseTransferModal = () => {
    setShowTransferModal(false)
    setRecipientId('')
    setRecipientEmail('')
    setTransferAmount('')
    setTransferError('')
  }

  // Handle transfer submission
  const handleTransferSubmit = async (e) => {
    e.preventDefault()
    
    try {
      setTransferring(true)
      setTransferError('')

      // Validate that at least one recipient identifier is provided
      const idValue = recipientId?.trim() || ''
      const emailValue = recipientEmail?.trim() || ''
      const hasId = idValue.length > 0
      const hasEmail = emailValue.length > 0

      if (!hasId && !hasEmail) {
        throw new Error('Please enter either a WealthNest ID or an email address.')
      }

      if (hasId && hasEmail) {
        throw new Error('Please enter either an ID or an Email, not both.')
      }

      // Validate amount
      const amount = parseFloat(transferAmount)
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid transfer amount greater than zero.')
      }

      // Prepare parameters for RPC call
      let rpcParams = { p_amount: amount }

      if (hasId) {
        // Validate WealthNest ID format
        const recipientIdNum = parseInt(idValue)
        if (isNaN(recipientIdNum) || recipientIdNum < 100000 || recipientIdNum > 999999) {
          throw new Error('Invalid WealthNest ID. Please enter a valid 6-digit ID.')
        }
        rpcParams.p_recipient_wealthnest_id = recipientIdNum
      } else if (hasEmail) {
        // Basic email validation
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailPattern.test(emailValue)) {
          throw new Error('Please enter a valid email address.')
        }
        rpcParams.p_recipient_email = emailValue
      } else {
        // Extra safety check
        throw new Error('Please enter either a WealthNest ID or an email address.')
      }

      // Call the atomic transfer RPC function
      const { data, error } = await supabase
        .rpc('transfer_funds_to_user', rpcParams)

      if (error) throw error

      // Only close modal and update state after successful transfer
      if (data && data.success) {
        // Show success message from the RPC response
        setSuccessMessage(data.message || `Transfer of ${formatCurrency(amount)} successful!`)
        
        // Refresh vaults to show updated balance
        await fetchVaults()
        
        // Close modal after successful transfer and vault refresh
        handleCloseTransferModal()
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000)
      } else {
        throw new Error('Transfer failed. Please try again.')
      }

    } catch (error) {
      console.error('Error processing transfer:', error.message)
      setTransferError(error.message || 'Failed to process transfer. Please try again.')
    } finally {
      setTransferring(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-dark flex items-center justify-center">
        <div className="text-gold text-xl">Loading your vaults...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary-dark">
      <header className="bg-primary shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gold">WealthNest</h1>
            <p className="text-gold-light text-sm">Welcome, {profile?.full_name || 'User'}</p>
            {profile?.wealthnest_id && (
              <p className="text-gray-400 text-xs mt-1">
                <span className="font-semibold text-gold-light">WealthNest ID:</span> {profile.wealthnest_id}
              </p>
            )}
            <button
              onClick={handleSignOut}
              className="text-gold-light hover:text-gold text-xs font-medium mt-2 underline"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Reminder Bell Icon Button - Fixed Top Right */}
      <button
        className="fixed top-4 right-4 z-50 bg-gold bg-opacity-20 hover:bg-opacity-30 p-3 rounded-full border border-gold border-opacity-40 hover:border-opacity-60 transition-all cursor-pointer shadow-lg hover:shadow-xl"
        aria-label="Reminders"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-6 h-6 text-gold"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
      </button>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Your Vaults</h2>
          <p className="text-gray-400">Manage your financial future</p>
        </div>

        {error && (
          <div className="bg-red-900 bg-opacity-50 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-900 bg-opacity-50 border border-green-500 text-green-200 px-4 py-3 rounded mb-6">
            {successMessage}
          </div>
        )}

        <BalanceCard />

        {/* Transfer Button */}
        <div className="mt-6 mb-6">
          <button
            onClick={handleOpenTransferModal}
            className="w-full bg-gradient-to-r from-gold to-gold-dark text-primary-dark font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform transition hover:scale-105 flex items-center justify-center gap-3"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={2.5} 
              stroke="currentColor" 
              className="w-6 h-6"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" 
              />
            </svg>
            <span className="text-lg">Transfer Money</span>
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {vaults.map((vault) => {
            const info = getVaultInfo(vault.vault_type)
            return (
              <div
                key={vault.id}
                onClick={() => navigate(`/vault/${vault.vault_type}`)}
                className={`bg-gradient-to-br ${info.gradientClass} p-6 rounded-xl shadow-lg cursor-pointer transform transition hover:scale-105 hover:shadow-2xl`}
              >
                <div className="text-4xl mb-3">{info.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">{info.name}</h3>
                <p className="text-gray-200 text-sm mb-4">{info.description}</p>
                <div className="border-t border-white border-opacity-30 pt-4">
                  <p className="text-gray-300 text-xs mb-1">Current Balance</p>
                  <p className="text-3xl font-bold text-gold">{formatCurrency(vault.balance)}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-8 space-y-4">
          <div
            onClick={() => navigate('/goals')}
            className="bg-gradient-to-br from-primary to-primary-dark p-6 rounded-xl shadow-lg cursor-pointer transform transition hover:scale-105 hover:shadow-2xl border border-gold border-opacity-30"
          >
            <div className="flex items-center">
              <div className="text-4xl mr-4">🎯</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gold mb-2">Smart Goals</h3>
                <p className="text-gray-300 text-sm">Track your savings goals and progress</p>
              </div>
              <div className="text-gold text-2xl">→</div>
            </div>
          </div>

          <div
            onClick={() => navigate('/wealthai')}
            className="bg-gradient-to-br from-gold-dark to-gold p-6 rounded-xl shadow-lg cursor-pointer transform transition hover:scale-105 hover:shadow-2xl"
          >
            <div className="flex items-center">
              <div className="text-4xl mr-4">💬</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-primary-dark mb-2">Chat with WealthAI</h3>
                <p className="text-primary text-sm">Get personalized financial guidance and insights</p>
              </div>
              <div className="text-primary-dark text-2xl">→</div>
            </div>
          </div>
        </div>

        {vaults.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">
              No vaults found. Please check your database setup.
            </p>
          </div>
        )}
      </main>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-primary-dark border border-gold border-opacity-30 rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gold mb-2">Transfer Money</h2>
              <p className="text-gray-400 text-sm">Send money to another WealthNest user</p>
            </div>

            <form onSubmit={handleTransferSubmit}>
              {/* Helper Text */}
              <div className="mb-4 bg-blue-900 bg-opacity-30 border border-blue-600 border-opacity-40 rounded-lg p-3">
                <p className="text-blue-200 text-sm">
                  💡 <span className="font-semibold">Fill in only one:</span> Enter either the recipient's WealthNest ID or their email address
                </p>
              </div>

              {/* Recipient WealthNest ID */}
              <div className="mb-4">
                <label htmlFor="recipientId" className="block text-white font-semibold mb-2">
                  Recipient's WealthNest ID
                </label>
                <input
                  type="number"
                  id="recipientId"
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  disabled={transferring}
                  min="100000"
                  max="999999"
                  className="w-full bg-primary border border-gold border-opacity-30 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-gold disabled:opacity-50"
                  placeholder="123456"
                />
                <p className="text-gray-400 text-xs mt-1">Enter the 6-digit WealthNest ID</p>
              </div>

              {/* OR Divider */}
              <div className="mb-4 flex items-center">
                <div className="flex-1 border-t border-gray-600"></div>
                <span className="px-3 text-gray-400 text-sm font-semibold">OR</span>
                <div className="flex-1 border-t border-gray-600"></div>
              </div>

              {/* Recipient Email */}
              <div className="mb-4">
                <label htmlFor="recipientEmail" className="block text-white font-semibold mb-2">
                  Recipient's Email Address
                </label>
                <input
                  type="email"
                  id="recipientEmail"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  disabled={transferring}
                  className="w-full bg-primary border border-gold border-opacity-30 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-gold disabled:opacity-50"
                  placeholder="recipient@example.com"
                />
                <p className="text-gray-400 text-xs mt-1">Enter the recipient's email address</p>
              </div>

              {/* Amount */}
              <div className="mb-4">
                <label htmlFor="transferAmount" className="block text-white font-semibold mb-2">
                  Amount to Send
                </label>
                <input
                  type="number"
                  id="transferAmount"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  disabled={transferring}
                  step="0.01"
                  min="0.01"
                  className="w-full bg-primary border border-gold border-opacity-30 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-gold disabled:opacity-50"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Source Balance Display */}
              <div className="mb-6 bg-primary bg-opacity-50 border border-gold border-opacity-20 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Source</p>
                <p className="text-white font-semibold">Micro-Savings Vault</p>
                <p className="text-gold text-lg font-bold mt-2">
                  Available: {formatCurrency(getMicroSavingsVault()?.balance || 0)}
                </p>
              </div>

              {/* Error Message */}
              {transferError && (
                <div className="mb-4 bg-red-900 bg-opacity-50 border border-red-600 text-red-200 px-3 py-2 rounded text-sm">
                  {transferError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseTransferModal}
                  disabled={transferring}
                  className="flex-1 bg-gray-700 text-white px-4 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferring}
                  className="flex-1 bg-gold text-primary-dark px-4 py-3 rounded-lg font-bold hover:bg-gold-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {transferring ? 'Sending...' : 'Send Money'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
