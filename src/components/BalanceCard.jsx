import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

export const BalanceCard = () => {
  const { user, loading: authLoading } = useAuth()
  const [totalBalance, setTotalBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchTotalBalance()
    } else if (!authLoading) {
      setLoading(false)
      setTotalBalance(0)
    }
  }, [user, authLoading])

  const fetchTotalBalance = async () => {
    try {
      const { data, error } = await supabase
        .from('vaults')
        .select('balance')
        .eq('user_id', user.id)

      if (error) throw error

      const total = data.reduce((sum, vault) => sum + (vault.balance || 0), 0)
      setTotalBalance(total)
    } catch (error) {
      console.error('Error fetching total balance:', error.message)
      setTotalBalance(0)
    } finally {
      setLoading(false)
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
      <div className="bg-gradient-to-br from-primary to-primary-dark p-6 rounded-2xl shadow-2xl mb-8">
        <div className="text-gold-light text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-primary to-primary-dark p-6 rounded-2xl shadow-2xl mb-8 border border-gold border-opacity-20">
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center">
          <div className="text-2xl mr-3">💳</div>
          <p className="text-gold-light text-sm font-medium">Your Total Balance</p>
        </div>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-gold-light opacity-60"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-gold-light opacity-60"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-gold-light opacity-60"></div>
        </div>
      </div>

      <div className="mb-8">
        <p className="text-5xl md:text-6xl font-bold text-gold tracking-tight">
          {formatCurrency(totalBalance)}
        </p>
      </div>

      <div className="flex justify-between items-end">
        <div className="flex items-center gap-2">
          <div className="bg-gold bg-opacity-20 px-3 py-1.5 rounded-md">
            <svg className="w-8 h-6 text-gold" fill="currentColor" viewBox="0 0 48 32">
              <rect x="0" y="8" width="20" height="16" rx="2" />
              <rect x="24" y="8" width="20" height="16" rx="2" />
              <rect x="0" y="0" width="48" height="4" rx="2" />
              <rect x="0" y="28" width="48" height="4" rx="2" />
            </svg>
          </div>
          <span className="text-gold-light text-xs font-medium">WealthNest</span>
        </div>
        <div className="text-right">
          <p className="text-gold-light text-xs mb-1 font-mono">Account</p>
          <p className="text-gold text-sm font-mono tracking-wider">**** **** **** 1234</p>
        </div>
      </div>
    </div>
  )
}
