import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

export const VaultDetail = () => {
  const { vaultType } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [vault, setVault] = useState(null)
  const [loading, setLoading] = useState(true)
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawalAmount, setWithdrawalAmount] = useState('')
  const [showDepositForm, setShowDepositForm] = useState(false)
  const [showWithdrawForm, setShowWithdrawForm] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [depositMethod, setDepositMethod] = useState('')
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (user) {
      fetchVault()
    }
  }, [user, vaultType])

  useEffect(() => {
    setDepositMethod('')
  }, [vaultType])

  const fetchVault = async () => {
    try {
      const { data, error } = await supabase
        .from('vaults')
        .select('*')
        .eq('user_id', user.id)
        .eq('vault_type', vaultType)
        .single()

      if (error) throw error
      setVault(data)
    } catch (error) {
      console.error('Error fetching vault:', error.message)
      setError('Unable to load vault details. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeposit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setProcessing(true)

    const amount = parseFloat(depositAmount)

    if (!amount || amount <= 0) {
      setError('Please enter a valid amount greater than $0')
      setProcessing(false)
      return
    }

    if (amount > 1000000) {
      setError('Maximum deposit amount is $1,000,000')
      setProcessing(false)
      return
    }

    try {
      const newBalance = parseFloat(vault.balance) + amount

      const { error: updateError } = await supabase
        .from('vaults')
        .update({ balance: newBalance })
        .eq('id', vault.id)
        .eq('user_id', user.id)

      if (updateError) throw updateError

      const methodText = depositMethod === 'exchange_partners' 
        ? ' via Money Exchange Partners' 
        : depositMethod === 'wallet_topup' 
        ? ' via WealthNest Wallet Top Up' 
        : ''

      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          vault_id: vault.id,
          amount: amount,
          description: `Deposit to ${getVaultInfo(vaultType).name}${methodText}`,
        })

      if (transactionError) throw transactionError

      setSuccess(`Deposit successful! Added ${formatCurrency(amount)} to your vault.`)
      setDepositAmount('')
      setShowDepositForm(false)
      setDepositMethod('')
      
      await fetchVault()

      setTimeout(() => setSuccess(''), 5000)
    } catch (error) {
      console.error('Error processing deposit:', error.message)
      setError('Failed to process deposit. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleWithdraw = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setProcessing(true)

    const amount = parseFloat(withdrawalAmount)

    if (!amount || amount <= 0) {
      setError('Please enter a valid amount greater than $0')
      setProcessing(false)
      return
    }

    const currentBalance = parseFloat(vault.balance)

    if (amount > currentBalance) {
      setError('Insufficient funds. You cannot withdraw more than your current balance.')
      setProcessing(false)
      return
    }

    // Calculate withdrawal fee (0.5%)
    const fee = amount * 0.005
    const totalDeduction = amount + fee

    // Check if total deduction (withdrawal + fee) exceeds balance
    if (totalDeduction > currentBalance) {
      setError(`Insufficient funds including fee. Fee: ${formatCurrency(fee)}. Total needed: ${formatCurrency(totalDeduction)}.`)
      setProcessing(false)
      return
    }

    try {
      const newBalance = currentBalance - totalDeduction

      // Update vault balance
      const { error: updateError } = await supabase
        .from('vaults')
        .update({ balance: newBalance })
        .eq('id', vault.id)
        .eq('user_id', user.id)

      if (updateError) throw updateError

      // Insert withdrawal transaction (negative amount)
      const { error: withdrawalError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          vault_id: vault.id,
          amount: -amount,
          description: `Withdrawal from ${getVaultInfo(vaultType).name}`,
        })

      if (withdrawalError) throw withdrawalError

      // Insert fee transaction (negative amount)
      const { error: feeError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          vault_id: vault.id,
          amount: -fee,
          description: `${getVaultInfo(vaultType).name} withdrawal fee`,
        })

      if (feeError) throw feeError

      setSuccess(`Withdrawal successful. Fee applied: ${formatCurrency(fee)}. You received ${formatCurrency(amount)}.`)
      setWithdrawalAmount('')
      setShowWithdrawForm(false)
      
      await fetchVault()

      setTimeout(() => setSuccess(''), 5000)
    } catch (error) {
      console.error('Error processing withdrawal:', error.message)
      setError('Failed to process withdrawal. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const getVaultInfo = (type) => {
    const info = {
      micro_savings: {
        name: 'Micro-Savings Vault',
        icon: '💰',
        description: 'Build your savings little by little',
        canWithdraw: true,
      },
      emergency: {
        name: 'Emergency Vault',
        icon: '🛡️',
        description: 'Your financial safety net',
        canWithdraw: true,
      },
      pension: {
        name: 'Pension Nest',
        icon: '🏦',
        description: 'Locked until retirement for your future security',
        canWithdraw: false,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-dark flex items-center justify-center">
        <div className="text-gold text-xl">Loading vault...</div>
      </div>
    )
  }

  if (!vault) {
    return (
      <div className="min-h-screen bg-primary-dark flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">Vault not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-gold hover:bg-gold-dark text-primary-dark font-semibold py-2 px-6 rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const info = getVaultInfo(vaultType)

  return (
    <div className="min-h-screen bg-primary-dark">
      {showDepositModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center">
          <div className="bg-primary rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 relative">
            <button
              onClick={() => { setShowDepositModal(false); setDepositMethod('') }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold"
            >
              ×
            </button>
            
            <h3 className="text-2xl font-bold text-gold mb-6 text-center">Choose Deposit Method</h3>
            
            <div className="space-y-4">
              <button
                onClick={() => {
                  setDepositMethod('exchange_partners')
                  setShowDepositModal(false)
                  setShowDepositForm(true)
                }}
                className="w-full bg-gold hover:bg-gold-dark text-primary-dark font-semibold py-6 px-6 rounded-lg transition duration-200 transform hover:scale-105 flex items-center justify-center text-lg"
              >
                <span className="mr-3 text-2xl">💱</span>
                Money Exchange Partners
              </button>
              
              <button
                onClick={() => {
                  setDepositMethod('wallet_topup')
                  setShowDepositModal(false)
                  setShowDepositForm(true)
                }}
                className="w-full bg-gold hover:bg-gold-dark text-primary-dark font-semibold py-6 px-6 rounded-lg transition duration-200 transform hover:scale-105 flex items-center justify-center text-lg"
              >
                <span className="mr-3 text-2xl">💳</span>
                WealthNest Wallet Top Up
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-primary shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gold-light hover:text-gold mr-4"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gold">WealthNest</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-primary rounded-xl shadow-xl p-8 mb-6">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{info.icon}</div>
            <h2 className="text-3xl font-bold text-white mb-2">{info.name}</h2>
            <p className="text-gray-400">{info.description}</p>
          </div>

          <div className="bg-primary-dark rounded-lg p-6 mb-8">
            <p className="text-gray-400 text-sm mb-2">Current Balance</p>
            <p className="text-5xl font-bold text-gold">{formatCurrency(vault.balance)}</p>
          </div>

          {success && (
            <div className="bg-green-900 bg-opacity-50 border border-green-500 text-green-200 px-4 py-3 rounded mb-6">
              ✓ {success}
            </div>
          )}

          {error && (
            <div className="bg-red-900 bg-opacity-50 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {showDepositForm ? (
            <form onSubmit={handleDeposit} className="mb-8">
              <div className="bg-primary-dark rounded-lg p-6">
                <label htmlFor="depositAmount" className="block text-gold-light text-sm font-medium mb-3">
                  Deposit Amount
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input
                      id="depositAmount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-primary border border-primary-light rounded-lg text-white text-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                      disabled={processing}
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={processing}
                    className="bg-gold hover:bg-gold-dark text-primary-dark font-semibold py-3 px-8 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? 'Processing...' : 'Confirm'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDepositForm(false)
                      setDepositAmount('')
                      setDepositMethod('')
                      setError('')
                    }}
                    disabled={processing}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-gray-500 text-xs mt-2">
                  Enter the amount you want to deposit (e.g., 10.50)
                </p>
              </div>
            </form>
          ) : showWithdrawForm ? (
            <form onSubmit={handleWithdraw} className="mb-8">
              <div className="bg-primary-dark rounded-lg p-6">
                <label htmlFor="withdrawalAmount" className="block text-gold-light text-sm font-medium mb-3">
                  Withdrawal Amount
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input
                      id="withdrawalAmount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={withdrawalAmount}
                      onChange={(e) => setWithdrawalAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-primary border border-primary-light rounded-lg text-white text-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                      disabled={processing}
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={processing}
                    className="bg-gold hover:bg-gold-dark text-primary-dark font-semibold py-3 px-8 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? 'Processing...' : 'Confirm'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowWithdrawForm(false)
                      setWithdrawalAmount('')
                      setError('')
                    }}
                    disabled={processing}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-gray-500 text-xs mt-2">
                  Enter the amount you want to withdraw. A 0.5% fee will be applied.
                </p>
                {withdrawalAmount && parseFloat(withdrawalAmount) > 0 && (
                  <div className="mt-3 p-3 bg-yellow-900 bg-opacity-30 border border-yellow-500 rounded">
                    <p className="text-yellow-200 text-sm">
                      💡 Withdrawal fee (0.5%): {formatCurrency(parseFloat(withdrawalAmount) * 0.005)}
                    </p>
                    <p className="text-yellow-200 text-sm mt-1">
                      Total deduction: {formatCurrency(parseFloat(withdrawalAmount) * 1.005)}
                    </p>
                  </div>
                )}
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => vaultType === 'micro_savings' ? setShowDepositModal(true) : setShowDepositForm(true)}
                className="bg-gold hover:bg-gold-dark text-primary-dark font-semibold py-4 px-6 rounded-lg transition duration-200 transform hover:scale-105"
              >
                💸 Deposit
              </button>
              
              {info.canWithdraw ? (
                <button 
                  onClick={() => setShowWithdrawForm(true)}
                  className="bg-primary-light hover:bg-primary text-white font-semibold py-4 px-6 rounded-lg border-2 border-gold transition duration-200 transform hover:scale-105"
                >
                  💵 Withdraw
                </button>
              ) : (
                <div className="bg-gray-700 text-gray-400 font-semibold py-4 px-6 rounded-lg text-center cursor-not-allowed">
                  🔒 Locked until retirement
                </div>
              )}
            </div>
          )}

          {vaultType === 'pension' && (
            <div className="mt-6 bg-purple-900 bg-opacity-30 border border-purple-500 rounded-lg p-4">
              <p className="text-purple-200 text-sm">
                ℹ️ This vault is time-locked to ensure your retirement security. Funds can only be withdrawn after reaching retirement age.
              </p>
            </div>
          )}

          {vaultType === 'pension' && (
            <div className="mt-6 bg-primary-dark border-2 border-gold rounded-xl p-6">
              <h4 className="text-xl font-bold text-gold mb-4">Key Features</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💼</span>
                  <p className="text-white text-sm pt-1">Long-term retirement savings</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🔒</span>
                  <p className="text-white text-sm pt-1">Time-locked for growth (Minimum 1 year)</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📈</span>
                  <p className="text-white text-sm pt-1">Potential 2% yield boost after 10 years</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🎯</span>
                  <p className="text-white text-sm pt-1">Withdrawals available after retirement age</p>
                </div>
              </div>
            </div>
          )}

          {vaultType === 'emergency' && (
            <div className="mt-6 bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg p-4">
              <p className="text-blue-200 text-sm">
                ℹ️ Emergency vault withdrawals incur a 0.5% fee to encourage saving for true emergencies.
              </p>
            </div>
          )}
        </div>

        <div className="bg-primary rounded-xl shadow-xl p-8">
          <h3 className="text-xl font-bold text-white mb-4">Recent Transactions</h3>
          <div className="text-center py-8">
            <p className="text-gray-400">No transactions yet</p>
          </div>
        </div>
      </main>
    </div>
  )
}
