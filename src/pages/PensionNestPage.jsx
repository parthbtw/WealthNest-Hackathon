import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

export const PensionNestPage = () => {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [vault, setVault] = useState(null)
  const [loading, setLoading] = useState(true)
  const [targetYear, setTargetYear] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [showDepositForm, setShowDepositForm] = useState(false)
  const [depositMethod, setDepositMethod] = useState('')
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [settingYear, setSettingYear] = useState(false)
  const [withdrawalEligible, setWithdrawalEligible] = useState(false)
  const [bonusEligible, setBonusEligible] = useState(false)
  const [bonusAmount, setBonusAmount] = useState(0)
  const [totalWithdrawable, setTotalWithdrawable] = useState(0)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferAmount, setTransferAmount] = useState('')
  const [microSavingsBalance, setMicroSavingsBalance] = useState(0)
  const [transferring, setTransferring] = useState(false)

  useEffect(() => {
    if (user) {
      fetchVault()
    }
  }, [user])

  useEffect(() => {
    if (vault && profile) {
      const eligible = checkWithdrawalEligibility()
      const vestingComplete = checkVestingComplete()
      const targetYearReached = checkTargetYearReached()
      const bonus = calculateBonusAmount()
      const total = parseFloat(vault.balance || 0) + bonus
      
      setWithdrawalEligible(eligible)
      setBonusEligible(vestingComplete && targetYearReached)
      setBonusAmount(bonus)
      setTotalWithdrawable(total)
    }
  }, [vault, profile])

  const fetchVault = async () => {
    try {
      const { data, error } = await supabase
        .from('vaults')
        .select('*')
        .eq('user_id', user.id)
        .eq('vault_type', 'pension')
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

  const validateRetirementYear = (year) => {
    const currentYear = new Date().getFullYear()
    const yearNum = parseInt(year)
    
    if (isNaN(yearNum)) {
      return 'Please enter a valid year'
    }
    
    if (yearNum < currentYear + 10) {
      return `Retirement year must be at least ${currentYear + 10} (minimum 10 years from now)`
    }
    
    if (yearNum > currentYear + 80) {
      return 'Retirement year seems too far in the future'
    }
    
    return null
  }

  const handleSetRetirementYear = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSettingYear(true)

    const validationError = validateRetirementYear(targetYear)
    if (validationError) {
      setError(validationError)
      setSettingYear(false)
      return
    }

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ pension_target_year: parseInt(targetYear) })
        .eq('id', user.id)

      if (updateError) throw updateError

      setSuccess(`Retirement year set to ${targetYear}! You can now start building your pension nest.`)
      
      await refreshProfile()
    } catch (error) {
      console.error('Error setting retirement year:', error.message)
      setError('Failed to set retirement year. Please try again.')
    } finally {
      setSettingYear(false)
    }
  }

  const handleDeposit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setProcessing(true)

    if (profile.pension_target_year === null || profile.pension_target_year === undefined) {
      setError('Please set your retirement target year first')
      setProcessing(false)
      return
    }

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
      const isFirstDeposit = vault.balance === 0 || parseFloat(vault.balance) === 0

      if (isFirstDeposit) {
        const now = new Date()
        const lockedUntil = new Date(now)
        lockedUntil.setFullYear(now.getFullYear() + 1)

        const { error: updateError } = await supabase
          .from('vaults')
          .update({ 
            balance: newBalance,
            vesting_start_date: now.toISOString(),
            locked_until: lockedUntil.toISOString()
          })
          .eq('id', vault.id)
          .eq('user_id', user.id)

        if (updateError) throw updateError
      } else {
        const { error: updateError } = await supabase
          .from('vaults')
          .update({ balance: newBalance })
          .eq('id', vault.id)
          .eq('user_id', user.id)

        if (updateError) throw updateError
      }

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
          description: `Deposit to Pension Nest${methodText}`,
        })

      if (transactionError) throw transactionError

      setSuccess(`Deposit successful! Added $${amount.toFixed(2)} to your Pension Nest.`)
      setDepositAmount('')
      setShowDepositForm(false)
      setDepositMethod('')
      setShowDepositModal(false)
      
      await fetchVault()

      setTimeout(() => setSuccess(''), 5000)
    } catch (error) {
      console.error('Error processing deposit:', error.message)
      setError('Failed to process deposit. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleWithdraw = async () => {
    setError('')
    setSuccess('')
    setWithdrawing(true)
    
    try {
      const currentBalance = parseFloat(vault.balance)
      const bonus = bonusAmount
      
      const { error: updateError } = await supabase
        .from('vaults')
        .update({ 
          balance: 0,
          locked_until: null,
          vesting_start_date: null
        })
        .eq('id', vault.id)
        .eq('user_id', user.id)
      
      if (updateError) throw updateError
      
      const { error: withdrawalError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          vault_id: vault.id,
          amount: -currentBalance,
          description: 'Pension Nest withdrawal'
        })
      
      if (withdrawalError) throw withdrawalError
      
      if (bonus > 0) {
        const { error: bonusError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            vault_id: vault.id,
            amount: -bonus,
            description: 'Pension Nest 10-year vesting bonus (2%)'
          })
        
        if (bonusError) throw bonusError
      }
      
      const bonusText = bonus > 0 ? ` (includes $${bonus.toFixed(2)} bonus)` : ''
      setSuccess(`Successfully withdrew $${(currentBalance + bonus).toFixed(2)}${bonusText} from your Pension Nest!`)
      
      setShowWithdrawModal(false)
      await fetchVault()
      
      setTimeout(() => setSuccess(''), 8000)
    } catch (error) {
      console.error('Error processing withdrawal:', error.message)
      setError('Failed to process withdrawal. Please try again.')
    } finally {
      setWithdrawing(false)
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
      setMicroSavingsBalance(parseFloat(data?.balance || 0))
    } catch (error) {
      console.error('Error fetching Micro-Savings balance:', error.message)
      setMicroSavingsBalance(0)
    }
  }

  const handleOpenTransferModal = async () => {
    await fetchMicroSavingsBalance()
    setShowTransferModal(true)
    setTransferAmount('')
    setError('')
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
      setError(`Insufficient balance. Your Micro-Savings balance is ${formatCurrency(microSavingsBalance)}`)
      setTransferring(false)
      return
    }

    if (profile.pension_target_year === null || profile.pension_target_year === undefined) {
      setError('Please set your retirement target year first')
      setTransferring(false)
      return
    }

    try {
      const { data, error: rpcError } = await supabase
        .rpc('transfer_to_pension_from_microsavings', {
          p_amount: amount
        })

      if (rpcError) throw rpcError

      if (data && data.success) {
        setSuccess(data.message || `Successfully transferred ${formatCurrency(amount)} to your Pension Nest!`)
        setTransferAmount('')
        setShowTransferModal(false)
        
        await fetchVault()
        
        setTimeout(() => setSuccess(''), 5000)
      } else {
        throw new Error('Transfer failed. Please try again.')
      }
    } catch (error) {
      console.error('Error processing transfer:', error.message)
      setError(error.message || 'Failed to process transfer. Please try again.')
    } finally {
      setTransferring(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateString) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const calculateYearsVested = (vestingStartDate) => {
    if (!vestingStartDate) return 0
    const start = new Date(vestingStartDate)
    const now = new Date()
    const diffTime = now - start
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25)
    return diffYears
  }

  const checkWithdrawalEligibility = () => {
    if (!vault || !vault.locked_until) return true
    const now = new Date()
    const lockedUntil = new Date(vault.locked_until)
    return now >= lockedUntil
  }

  const checkVestingComplete = () => {
    if (!vault || !vault.vesting_start_date) return false
    const vestingStart = new Date(vault.vesting_start_date)
    const now = new Date()
    const tenYearsLater = new Date(vestingStart)
    tenYearsLater.setFullYear(vestingStart.getFullYear() + 10)
    return now >= tenYearsLater
  }

  const checkTargetYearReached = () => {
    if (!profile || !profile.pension_target_year) return false
    const currentYear = new Date().getFullYear()
    return currentYear >= profile.pension_target_year
  }

  const calculateBonusAmount = () => {
    if (!vault) return 0
    const vestingComplete = checkVestingComplete()
    const targetYearReached = checkTargetYearReached()
    
    if (vestingComplete && targetYearReached) {
      return parseFloat(vault.balance) * 0.02
    }
    return 0
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-dark via-primary to-primary-dark flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  const hasPensionTargetYear = profile?.pension_target_year !== null && profile?.pension_target_year !== undefined

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-primary to-primary-dark pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gold">WealthNest</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gold hover:text-white transition-colors font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="bg-primary-dark rounded-2xl shadow-2xl p-6 sm:p-8 border-2 border-gold">
          <div className="flex items-center gap-4 mb-6">
            <span className="text-5xl">🏦</span>
            <div>
              <h2 className="text-3xl font-bold text-white">Pension Nest</h2>
              <p className="text-gray-300 mt-1">Locked until retirement for your future security</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-900 bg-opacity-30 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-900 bg-opacity-30 border border-green-500 text-green-200 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          {!hasPensionTargetYear ? (
            <div className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-xl p-8 border-2 border-purple-500">
              <h3 className="text-2xl font-bold text-white mb-4">🎯 Set Your Retirement Target</h3>
              <p className="text-purple-100 mb-6">
                Before you can start building your Pension Nest, please set your target retirement year.
                This helps us lock your funds until you're ready to retire and ensures your long-term financial security.
              </p>

              <form onSubmit={handleSetRetirementYear} className="space-y-4">
                <div>
                  <label htmlFor="targetYear" className="block text-sm font-medium text-purple-100 mb-2">
                    Enter Target Retirement Year
                  </label>
                  <input
                    type="number"
                    id="targetYear"
                    value={targetYear}
                    onChange={(e) => setTargetYear(e.target.value)}
                    placeholder={`e.g., ${new Date().getFullYear() + 30}`}
                    className="w-full px-4 py-3 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg"
                    disabled={settingYear}
                    required
                  />
                  <p className="text-purple-200 text-sm mt-2">
                    Minimum: {new Date().getFullYear() + 10} (at least 10 years from now)
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={settingYear}
                  className="w-full bg-gold text-primary-dark font-bold py-4 px-6 rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                  {settingYear ? 'Setting...' : 'Set Retirement Year'}
                </button>
              </form>
            </div>
          ) : (
            <>
              <div className="mb-6 bg-purple-900 bg-opacity-30 border border-purple-500 rounded-lg p-4">
                <p className="text-purple-200 text-lg">
                  <span className="font-bold">🎯 Your Target Retirement Year:</span> {profile.pension_target_year}
                </p>
              </div>

              {(vault?.locked_until || vault?.vesting_start_date) && (
                <div className="mb-6 bg-purple-900 bg-opacity-30 border border-purple-500 rounded-lg p-4 space-y-2">
                  {vault?.locked_until && new Date(vault.locked_until) > new Date() && (
                    <p className="text-purple-200 text-lg">
                      <span className="font-bold">🔒 Funds locked until:</span> {formatDate(vault.locked_until)}
                    </p>
                  )}
                  {vault?.vesting_start_date && (
                    <p className="text-purple-200 text-lg">
                      <span className="font-bold">📅 Vesting since:</span> {formatDate(vault.vesting_start_date)} ({calculateYearsVested(vault.vesting_start_date).toFixed(2)} years vested)
                    </p>
                  )}
                </div>
              )}

              <div className="bg-gradient-to-br from-green-900 to-green-800 rounded-xl p-8 mb-6 border-2 border-gold">
                <p className="text-gray-300 text-sm mb-2">Total Balance</p>
                <p className="text-5xl font-bold text-gold">{formatCurrency(vault?.balance || 0)}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <button
                  onClick={() => {
                    setShowDepositModal(true)
                    setDepositMethod('')
                  }}
                  className="bg-gold text-primary-dark font-bold py-4 px-6 rounded-lg hover:bg-yellow-500 transition-colors text-lg"
                >
                  💰 Deposit
                </button>
                {!withdrawalEligible ? (
                  <button
                    disabled
                    className="bg-gray-700 text-gray-400 font-bold py-4 px-6 rounded-lg cursor-not-allowed text-lg"
                  >
                    🔒 Locked until {vault?.locked_until ? formatDate(vault.locked_until) : 'retirement'}
                  </button>
                ) : (
                  <button
                    onClick={() => setShowWithdrawModal(true)}
                    className="bg-gold text-primary-dark font-bold py-4 px-6 rounded-lg hover:bg-yellow-500 transition-colors text-lg"
                  >
                    Withdraw Full Amount: {formatCurrency(totalWithdrawable)}
                  </button>
                )}
              </div>

              <div className="mb-6">
                <button
                  onClick={handleOpenTransferModal}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg flex items-center justify-center gap-2"
                >
                  <span>🔄</span>
                  <span>Deposit from Micro-Savings Vault</span>
                </button>
              </div>

              {withdrawalEligible && (
                <div className="mb-6 text-center">
                  {bonusEligible ? (
                    <p className="text-green-300 text-sm">
                      ✨ Includes 2% bonus (10+ years vested & target year reached)
                    </p>
                  ) : (
                    <p className="text-purple-300 text-sm">
                      ⏳ Bonus not applicable: {!checkVestingComplete() ? 'not 10 years vested yet' : 'target year not reached'}
                    </p>
                  )}
                </div>
              )}

              {showDepositModal && (
                <div className="mb-6 bg-primary-dark border-2 border-gold rounded-xl p-6">
                  <h4 className="text-xl font-bold text-gold mb-4">Choose Deposit Method</h4>
                  
                  {!depositMethod ? (
                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          setDepositMethod('exchange_partners')
                          setShowDepositForm(true)
                        }}
                        className="w-full bg-green-700 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-left flex items-center gap-3"
                      >
                        <span className="text-2xl">🏢</span>
                        <div>
                          <div className="font-bold">Money Exchange Partners</div>
                          <div className="text-sm text-green-200">Via Western Union, MoneyGram, etc.</div>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => {
                          setDepositMethod('wallet_topup')
                          setShowDepositForm(true)
                        }}
                        className="w-full bg-blue-700 hover:bg-blue-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-left flex items-center gap-3"
                      >
                        <span className="text-2xl">💳</span>
                        <div>
                          <div className="font-bold">WealthNest Wallet Top Up</div>
                          <div className="text-sm text-blue-200">Use your card or bank account</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setShowDepositModal(false)
                          setDepositMethod('')
                        }}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : showDepositForm && (
                    <form onSubmit={handleDeposit} className="space-y-4">
                      <div>
                        <label htmlFor="depositAmount" className="block text-sm font-medium text-white mb-2">
                          Amount (USD)
                        </label>
                        <input
                          type="number"
                          id="depositAmount"
                          step="0.01"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-4 py-3 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                          disabled={processing}
                          required
                        />
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={processing}
                          className="flex-1 bg-gold text-primary-dark font-bold py-3 px-6 rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processing ? 'Processing...' : 'Confirm Deposit'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowDepositForm(false)
                            setShowDepositModal(false)
                            setDepositMethod('')
                            setDepositAmount('')
                          }}
                          className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                          disabled={processing}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {showWithdrawModal && (
                <div className="mb-6 bg-primary-dark border-2 border-gold rounded-xl p-6">
                  <h4 className="text-xl font-bold text-gold mb-4">Withdraw Pension Nest Funds</h4>
                  
                  <div className="bg-purple-900 bg-opacity-30 border border-purple-500 rounded-lg p-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-purple-200">Base Amount:</span>
                        <span className="text-white font-bold">{formatCurrency(vault?.balance || 0)}</span>
                      </div>
                      {bonusAmount > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-green-300">Bonus (2%):</span>
                          <span className="text-green-300 font-bold">{formatCurrency(bonusAmount)}</span>
                        </div>
                      )}
                      <div className="border-t border-purple-500 pt-2 flex justify-between items-center">
                        <span className="text-gold font-bold text-lg">Total:</span>
                        <span className="text-gold font-bold text-lg">{formatCurrency(totalWithdrawable)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-900 bg-opacity-30 border border-red-500 rounded-lg p-4 mb-4">
                    <p className="text-red-200 text-sm">
                      ⚠️ <strong>Warning:</strong> Withdrawing will reset your pension vault. The 1-year lock and vesting period will restart with your next deposit.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleWithdraw}
                      disabled={withdrawing}
                      className="flex-1 bg-gold text-primary-dark font-bold py-3 px-6 rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {withdrawing ? 'Processing...' : 'Confirm Withdrawal'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowWithdrawModal(false)}
                      className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      disabled={withdrawing}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {showTransferModal && (
                <div className="mb-6 bg-primary-dark border-2 border-gold rounded-xl p-6">
                  <h4 className="text-xl font-bold text-gold mb-4">Transfer from Micro-Savings</h4>
                  
                  <div className="bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg p-4 mb-4">
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

                    <div className="bg-purple-900 bg-opacity-30 border border-purple-500 rounded-lg p-4">
                      <p className="text-purple-200 text-sm">
                        💡 <strong>Note:</strong> {vault?.balance === 0 || parseFloat(vault?.balance) === 0 
                          ? 'This will be your first deposit. Your funds will be locked for 1 year and vesting will begin.'
                          : 'This transfer will be added to your existing Pension Nest balance.'}
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
              )}

              <div className="mt-6 bg-purple-900 bg-opacity-30 border border-purple-500 rounded-lg p-4">
                <p className="text-purple-200 text-sm">
                  ℹ️ This vault is time-locked to ensure your retirement security. Funds can only be withdrawn after reaching retirement age.
                </p>
              </div>

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
                    <p className="text-white text-sm pt-1">Withdrawals available after retirement age ({profile.pension_target_year})</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
