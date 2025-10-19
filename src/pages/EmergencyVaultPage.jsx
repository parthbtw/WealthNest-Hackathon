import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

export const EmergencyVaultPage = () => {
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
  const [microInsuranceEnabled, setMicroInsuranceEnabled] = useState(false)
  const [applyingIncentive, setApplyingIncentive] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferAmount, setTransferAmount] = useState('')
  const [microSavingsBalance, setMicroSavingsBalance] = useState(0)
  const [transferring, setTransferring] = useState(false)

  useEffect(() => {
    if (user) {
      fetchVault()
    }
  }, [user])

  const fetchVault = async () => {
    try {
      const { data, error } = await supabase
        .from('vaults')
        .select('*')
        .eq('user_id', user.id)
        .eq('vault_type', 'emergency')
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
          description: `Deposit to Emergency Vault${methodText}`,
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
          description: 'Withdrawal from Emergency Vault',
        })

      if (withdrawalError) throw withdrawalError

      // Insert fee transaction (negative amount)
      const { error: feeError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          vault_id: vault.id,
          amount: -fee,
          description: 'Emergency Vault withdrawal fee',
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

  const handleApplyIncentive = async () => {
    setError('')
    setSuccess('')
    setApplyingIncentive(true)

    try {
      // Call the atomic RPC function to apply parking incentive
      const { data, error: rpcError } = await supabase
        .rpc('apply_parking_incentive', { p_vault_type: 'emergency' })

      if (rpcError) throw rpcError

      setSuccess(`🎉 ${data.message} You earned ${formatCurrency(data.incentive_amount)}.`)
      
      await fetchVault()

      setTimeout(() => setSuccess(''), 5000)
    } catch (error) {
      console.error('Error applying incentive:', error.message)
      setError(error.message || 'Failed to apply incentive. Please try again.')
    } finally {
      setApplyingIncentive(false)
    }
  }

  const fetchMicroSavingsBalance = async () => {
    try {
      const { data, error } = await supabase
        .from('vaults')
        .select('balance')
        .eq('user_id', user.id)
        .eq('vault_type', 'micro_savings')
        .single()

      if (error) throw error
      setMicroSavingsBalance(parseFloat(data.balance) || 0)
    } catch (error) {
      console.error('Error fetching Micro-Savings balance:', error.message)
      setError('Unable to load Micro-Savings balance. Please try again.')
    }
  }

  const handleOpenTransferModal = async () => {
    setError('')
    setSuccess('')
    await fetchMicroSavingsBalance()
    setShowTransferModal(true)
  }

  const handleTransferFromMicroSavings = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setTransferring(true)

    const amount = parseFloat(transferAmount)

    if (!amount || amount <= 0) {
      setError('Please enter a valid amount greater than $0')
      setTransferring(false)
      return
    }

    if (amount > microSavingsBalance) {
      setError('Insufficient funds in Micro-Savings vault. Please check your balance.')
      setTransferring(false)
      return
    }

    try {
      // Call the atomic RPC function to transfer from Micro-Savings to Emergency
      const { data, error: rpcError } = await supabase
        .rpc('transfer_to_emergency_from_microsavings', { p_amount: amount })

      if (rpcError) throw rpcError

      setSuccess(`✓ Transfer successful! ${formatCurrency(amount)} has been added to your Emergency Vault.`)
      setTransferAmount('')
      setShowTransferModal(false)
      
      await fetchVault()

      setTimeout(() => setSuccess(''), 5000)
    } catch (error) {
      console.error('Error transferring from Micro-Savings:', error.message)
      setError(error.message || 'Failed to transfer. Please try again.')
    } finally {
      setTransferring(false)
    }
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

      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center">
          <div className="bg-primary rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 relative">
            <button
              onClick={() => {
                setShowTransferModal(false)
                setTransferAmount('')
                setError('')
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold"
            >
              ×
            </button>
            
            <h3 className="text-2xl font-bold text-gold mb-6 text-center">Transfer from Micro-Savings</h3>
            
            <div className="bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-blue-200">Micro-Savings Balance:</span>
                <span className="text-white font-bold text-lg">{formatCurrency(microSavingsBalance)}</span>
              </div>
            </div>

            {microSavingsBalance === 0 && (
              <div className="bg-yellow-900 bg-opacity-30 border border-yellow-500 rounded-lg p-4 mb-4">
                <p className="text-yellow-200 text-sm">
                  ⚠️ Your Micro-Savings vault has no funds. Please deposit to Micro-Savings first.
                </p>
              </div>
            )}

            <form onSubmit={handleTransferFromMicroSavings} className="space-y-4">
              <div>
                <label htmlFor="transferAmount" className="block text-sm font-medium text-white mb-2">
                  Amount to Transfer (USD)
                </label>
                <input
                  type="number"
                  id="transferAmount"
                  step="0.01"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                  disabled={transferring || microSavingsBalance === 0}
                  required
                />
                <p className="text-gray-400 text-xs mt-1">
                  Maximum: {formatCurrency(microSavingsBalance)}
                </p>
              </div>

              <div className="bg-orange-900 bg-opacity-30 border border-orange-500 rounded-lg p-4">
                <p className="text-orange-200 text-sm">
                  💡 <strong>Note:</strong> This transfer will move funds directly from your Micro-Savings vault to your Emergency vault.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={transferring || microSavingsBalance === 0}
                  className="flex-1 bg-gold text-primary-dark font-bold py-3 px-6 rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {transferring ? 'Processing...' : 'Confirm Transfer'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTransferModal(false)
                    setTransferAmount('')
                    setError('')
                  }}
                  className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  disabled={transferring}
                >
                  Cancel
                </button>
              </div>
            </form>
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
            <div className="text-6xl mb-4">🛡️</div>
            <h2 className="text-3xl font-bold text-white mb-2">Emergency Vault</h2>
            <p className="text-gray-400">Your financial safety net</p>
          </div>

          <div className="bg-primary-dark rounded-lg p-6 mb-8">
            <p className="text-gray-400 text-sm mb-2">Current Balance</p>
            <p className="text-5xl font-bold text-gold">{formatCurrency(vault.balance)}</p>
          </div>

          {/* Micro-Insurance Toggle */}
          <div className="bg-primary-dark rounded-lg p-6 mb-8 border-2 border-gold-dark">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                  <span className="text-2xl">🏥</span>
                  Enable Micro-Insurance Coverage
                </h4>
                <p className="text-gray-400 text-sm">
                  Optional protection for unexpected medical emergencies
                </p>
              </div>
              
              {/* Toggle Switch */}
              <button
                onClick={() => setMicroInsuranceEnabled(!microInsuranceEnabled)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-primary-dark ${
                  microInsuranceEnabled ? 'bg-gold' : 'bg-gray-600'
                }`}
                role="switch"
                aria-checked={microInsuranceEnabled}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-200 ${
                    microInsuranceEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            {microInsuranceEnabled && (
              <div className="mt-4 p-3 bg-gold bg-opacity-10 border border-gold rounded-lg">
                <p className="text-gold-light text-sm">
                  ✓ Micro-Insurance is now enabled (Demo Mode - No backend logic)
                </p>
              </div>
            )}
          </div>

          {/* Parking Incentive Button */}
          <div className="bg-primary-dark rounded-lg p-6 mb-8 border-2 border-green-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                  <span className="text-2xl">🎁</span>
                  Annual Parking Incentive
                </h4>
                <p className="text-gray-400 text-sm">
                  Earn 0.25% bonus on your current balance for keeping funds in your emergency vault
                </p>
              </div>
            </div>
            <button
              onClick={handleApplyIncentive}
              disabled={applyingIncentive || parseFloat(vault.balance) <= 0}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {applyingIncentive ? (
                'Applying Incentive...'
              ) : (
                <>
                  <span className="text-xl">🎁</span>
                  Apply Annual Parking Incentive (Demo)
                </>
              )}
            </button>
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
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <button
                  onClick={() => setShowDepositModal(true)}
                  className="bg-gold hover:bg-gold-dark text-primary-dark font-semibold py-4 px-6 rounded-lg transition duration-200 transform hover:scale-105"
                >
                  💸 Deposit
                </button>
                
                <button 
                  onClick={() => setShowWithdrawForm(true)}
                  className="bg-primary-light hover:bg-primary text-white font-semibold py-4 px-6 rounded-lg border-2 border-gold transition duration-200 transform hover:scale-105"
                >
                  💵 Withdraw
                </button>
              </div>

              <button
                onClick={handleOpenTransferModal}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 transform hover:scale-105 flex items-center justify-center gap-2 mb-8"
              >
                <span className="text-xl">🔄</span>
                Deposit from Micro-Savings Vault
              </button>
            </>
          )}

          <div className="mt-6 bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg p-4">
            <p className="text-blue-200 text-sm">
              ℹ️ Emergency vault withdrawals incur a 0.5% fee to encourage saving for true emergencies.
            </p>
          </div>
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
