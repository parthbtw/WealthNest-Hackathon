import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

export const GoalsPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Allocation modal state
  const [showAllocationModal, setShowAllocationModal] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [microSavingsBalance, setMicroSavingsBalance] = useState(0)
  const [allocationAmount, setAllocationAmount] = useState('')
  const [allocationError, setAllocationError] = useState('')
  const [allocating, setAllocating] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Create goal modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [goalName, setGoalName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)

  // Edit goal modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editGoalId, setEditGoalId] = useState(null)
  const [editGoalName, setEditGoalName] = useState('')
  const [editTargetAmount, setEditTargetAmount] = useState('')
  const [editError, setEditError] = useState('')
  const [editing, setEditing] = useState(false)

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteGoalId, setDeleteGoalId] = useState(null)
  const [deleteGoalName, setDeleteGoalName] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (user) {
      fetchGoals()
    }
  }, [user])

  const fetchGoals = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setGoals(data || [])
    } catch (error) {
      console.error('Error fetching goals:', error.message)
      setError('Unable to load your goals. Please try again.')
    } finally {
      setLoading(false)
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
      setMicroSavingsBalance(data?.balance || 0)
    } catch (error) {
      console.error('Error fetching Micro-Savings balance:', error.message)
      setAllocationError('Unable to load your Micro-Savings balance.')
    }
  }

  const handleAllocateClick = async (goal) => {
    setSelectedGoal(goal)
    setShowAllocationModal(true)
    setAllocationAmount('')
    setAllocationError('')
    await fetchMicroSavingsBalance()
  }

  const handleCloseModal = () => {
    setShowAllocationModal(false)
    setSelectedGoal(null)
    setAllocationAmount('')
    setAllocationError('')
  }

  const handleAllocateSubmit = async (e) => {
    e.preventDefault()
    setAllocationError('')
    
    // Validate amount
    const amount = parseFloat(allocationAmount)
    
    if (!allocationAmount || isNaN(amount)) {
      setAllocationError('Please enter a valid amount.')
      return
    }

    if (amount <= 0) {
      setAllocationError('Amount must be greater than zero.')
      return
    }

    if (amount > microSavingsBalance) {
      setAllocationError(`Insufficient balance. You have ${formatCurrency(microSavingsBalance)} available.`)
      return
    }

    try {
      setAllocating(true)

      // Call the PostgreSQL function via RPC
      const { data, error } = await supabase.rpc('allocate_funds_to_goal', {
        p_goal_id: selectedGoal.id,
        p_amount: amount
      })

      if (error) throw error

      // Show success message (congratulatory message if goal completed)
      const message = data?.message || `Successfully allocated ${formatCurrency(amount)} to ${selectedGoal.goal_name}!`
      const isGoalCompleted = data?.goal_completed || false
      
      // Add celebration emoji if goal completed
      setSuccessMessage(isGoalCompleted ? `🎉 ${message}` : message)
      
      // Close modal
      handleCloseModal()
      
      // Refresh goals to show updated progress
      await fetchGoals()
      
      // Clear success message after 5 seconds (longer for completed goals)
      setTimeout(() => setSuccessMessage(''), isGoalCompleted ? 8000 : 5000)

    } catch (error) {
      console.error('Error allocating funds:', error.message)
      setAllocationError(error.message || 'Failed to allocate funds. Please try again.')
    } finally {
      setAllocating(false)
    }
  }

  const handleCreateGoalClick = () => {
    setShowCreateModal(true)
    setGoalName('')
    setTargetAmount('')
    setCreateError('')
  }

  const handleCloseCreateModal = () => {
    setShowCreateModal(false)
    setGoalName('')
    setTargetAmount('')
    setCreateError('')
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setCreateError('')

    // Validate inputs
    if (!goalName.trim()) {
      setCreateError('Please enter a goal name.')
      return
    }

    const amount = parseFloat(targetAmount)
    if (!targetAmount || isNaN(amount)) {
      setCreateError('Please enter a valid target amount.')
      return
    }

    if (amount <= 0) {
      setCreateError('Target amount must be greater than zero.')
      return
    }

    try {
      setCreating(true)

      // Insert new goal into database
      const { data, error } = await supabase
        .from('goals')
        .insert([
          {
            user_id: user.id,
            goal_name: goalName.trim(),
            target_amount: amount,
            saved_amount: 0,
            status: 'active'
          }
        ])
        .select()

      if (error) throw error

      // Show success message
      setSuccessMessage(`Goal "${goalName}" created successfully!`)
      
      // Close modal
      handleCloseCreateModal()
      
      // Refresh goals list
      await fetchGoals()
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000)

    } catch (error) {
      console.error('Error creating goal:', error.message)
      setCreateError(error.message || 'Failed to create goal. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const handleEditClick = (goal) => {
    setEditGoalId(goal.id)
    setEditGoalName(goal.goal_name)
    setEditTargetAmount(goal.target_amount.toString())
    setShowEditModal(true)
    setEditError('')
  }

  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setEditGoalId(null)
    setEditGoalName('')
    setEditTargetAmount('')
    setEditError('')
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setEditError('')

    // Validate inputs
    if (!editGoalName.trim()) {
      setEditError('Please enter a goal name.')
      return
    }

    const amount = parseFloat(editTargetAmount)
    if (!editTargetAmount || isNaN(amount)) {
      setEditError('Please enter a valid target amount.')
      return
    }

    if (amount <= 0) {
      setEditError('Target amount must be greater than zero.')
      return
    }

    try {
      setEditing(true)

      // Update goal in database
      const { error } = await supabase
        .from('goals')
        .update({
          goal_name: editGoalName.trim(),
          target_amount: amount
        })
        .eq('id', editGoalId)

      if (error) throw error

      // Show success message
      setSuccessMessage(`Goal "${editGoalName}" updated successfully!`)
      
      // Close modal
      handleCloseEditModal()
      
      // Refresh goals list
      await fetchGoals()
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000)

    } catch (error) {
      console.error('Error updating goal:', error.message)
      setEditError(error.message || 'Failed to update goal. Please try again.')
    } finally {
      setEditing(false)
    }
  }

  const handleDeleteClick = (goal) => {
    setDeleteGoalId(goal.id)
    setDeleteGoalName(goal.goal_name)
    setShowDeleteModal(true)
    setDeleteError('')
  }

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false)
    setDeleteGoalId(null)
    setDeleteGoalName('')
    setDeleteError('')
  }

  const handleDeleteSubmit = async () => {
    try {
      setDeleting(true)
      setDeleteError('')

      // Delete goal from database
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', deleteGoalId)

      if (error) throw error

      // Show success message
      setSuccessMessage(`Goal "${deleteGoalName}" deleted successfully.`)
      
      // Close modal
      handleCloseDeleteModal()
      
      // Refresh goals list
      await fetchGoals()
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000)

    } catch (error) {
      console.error('Error deleting goal:', error.message)
      setDeleteError(error.message || 'Failed to delete goal. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0)
  }

  const calculateProgress = (saved, target) => {
    if (target === 0) return 0
    const percentage = (saved / target) * 100
    return Math.min(Math.round(percentage), 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-dark flex items-center justify-center">
        <div className="text-gold text-xl">Loading your goals...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary-dark">
      <header className="bg-primary shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gold hover:text-gold-light mr-4 text-xl"
          >
            ←
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gold">Smart Goals</h1>
            <p className="text-gold-light text-sm">Track your financial goals</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
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

        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Your Goals</h2>
            <p className="text-gray-400">Keep track of your savings progress</p>
          </div>
          {goals.length > 0 && (
            <button
              onClick={handleCreateGoalClick}
              className="bg-gold text-primary-dark px-4 py-2 rounded-lg font-semibold hover:bg-gold-light transition-colors whitespace-nowrap"
            >
              + Create Goal
            </button>
          )}
        </div>

        {goals.length === 0 ? (
          <div className="bg-primary rounded-xl p-12 text-center border border-gold border-opacity-20">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-gold mb-2">No Goals Yet</h3>
            <p className="text-gray-400 mb-6">
              You haven't created any goals yet. Start saving towards something!
            </p>
            <button
              onClick={handleCreateGoalClick}
              className="bg-gold text-primary-dark px-6 py-3 rounded-lg font-semibold hover:bg-gold-light transition-colors"
            >
              Create Your First Goal
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const progress = calculateProgress(goal.saved_amount, goal.target_amount)
              const isCompleted = goal.status === 'completed' || progress >= 100

              return (
                <div
                  key={goal.id}
                  className={`bg-primary rounded-xl p-6 border ${
                    isCompleted
                      ? 'border-gold border-opacity-50'
                      : 'border-gold border-opacity-20'
                  } hover:border-opacity-40 transition-all`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1">
                        {goal.goal_name}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {formatCurrency(goal.saved_amount)} / {formatCurrency(goal.target_amount)}
                      </p>
                    </div>
                    {isCompleted && (
                      <div className="bg-gold bg-opacity-20 text-gold px-3 py-1 rounded-full text-sm font-semibold">
                        ✓ Completed
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 text-sm">Progress</span>
                      <span className="text-gold font-semibold text-sm">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted
                            ? 'bg-gradient-to-r from-gold to-gold-light'
                            : 'bg-gradient-to-r from-green-500 to-green-400'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    {goal.status === 'active' && (
                      <button
                        className="flex-1 bg-primary-dark text-gold border border-gold border-opacity-30 px-4 py-2 rounded-lg text-sm font-medium hover:bg-opacity-80 transition-colors"
                        onClick={() => handleAllocateClick(goal)}
                      >
                        Allocate Funds
                      </button>
                    )}
                    {!isCompleted && (
                      <>
                        <button
                          className="px-4 py-2 text-gray-400 hover:text-gold text-sm font-medium transition-colors"
                          onClick={() => handleEditClick(goal)}
                        >
                          Edit
                        </button>
                        <button
                          className="px-4 py-2 text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                          onClick={() => handleDeleteClick(goal)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Placeholder Sections */}
        <div className="mt-12 space-y-6">
          {/* Community Challenges Section */}
          <div className="bg-primary rounded-xl p-8 border border-gold border-opacity-20 text-center">
            <div className="text-4xl mb-4">🤝</div>
            <h3 className="text-2xl font-bold text-gold mb-3">Community Challenges</h3>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Coming soon: Join community savings challenges and hold each other accountable!
            </p>
          </div>

          {/* Learn & Earn Section */}
          <div className="bg-primary rounded-xl p-8 border border-gold border-opacity-20 text-center">
            <div className="text-4xl mb-4">🎓</div>
            <h3 className="text-2xl font-bold text-gold mb-3">Learn & Earn</h3>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Coming soon: Complete fun financial literacy quizzes to earn points and boost your savings knowledge!
            </p>
          </div>
        </div>
      </main>

      {/* Allocation Modal */}
      {showAllocationModal && selectedGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-primary rounded-xl max-w-md w-full border border-gold border-opacity-30 shadow-2xl">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gold mb-4">Allocate Funds</h2>
              
              <div className="mb-6">
                <div className="mb-4">
                  <label className="text-gray-400 text-sm">Goal</label>
                  <p className="text-white text-lg font-semibold">{selectedGoal.goal_name}</p>
                </div>
                
                <div className="mb-4 bg-primary-dark rounded-lg p-4 border border-gold border-opacity-20">
                  <label className="text-gray-400 text-sm">Micro-Savings Balance</label>
                  <p className="text-gold text-xl font-bold">{formatCurrency(microSavingsBalance)}</p>
                </div>
              </div>

              <form onSubmit={handleAllocateSubmit}>
                <div className="mb-4">
                  <label className="block text-gray-400 text-sm mb-2">
                    Amount to Allocate
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={allocationAmount}
                    onChange={(e) => setAllocationAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-primary-dark text-white px-4 py-3 rounded-lg border border-gold border-opacity-30 focus:border-gold focus:outline-none"
                    disabled={allocating}
                  />
                </div>

                {allocationError && (
                  <div className="mb-4 bg-red-900 bg-opacity-30 border border-red-500 text-red-200 px-3 py-2 rounded text-sm">
                    {allocationError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 bg-gray-700 text-white px-4 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                    disabled={allocating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gold text-primary-dark px-4 py-3 rounded-lg font-semibold hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={allocating}
                  >
                    {allocating ? 'Allocating...' : 'Confirm Allocation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Goal Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-primary rounded-xl max-w-md w-full border border-gold border-opacity-30 shadow-2xl">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gold mb-4">Create New Goal</h2>
              <p className="text-gray-400 text-sm mb-6">
                Set a savings goal and start tracking your progress!
              </p>

              <form onSubmit={handleCreateSubmit}>
                <div className="mb-4">
                  <label className="block text-gray-400 text-sm mb-2">
                    Goal Name
                  </label>
                  <input
                    type="text"
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                    placeholder="e.g., Emergency Fund, New Car, Vacation"
                    maxLength={100}
                    className="w-full bg-primary-dark text-white px-4 py-3 rounded-lg border border-gold border-opacity-30 focus:border-gold focus:outline-none"
                    disabled={creating}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-gray-400 text-sm mb-2">
                    Target Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-primary-dark text-white px-4 py-3 rounded-lg border border-gold border-opacity-30 focus:border-gold focus:outline-none"
                    disabled={creating}
                  />
                </div>

                {createError && (
                  <div className="mb-4 bg-red-900 bg-opacity-30 border border-red-500 text-red-200 px-3 py-2 rounded text-sm">
                    {createError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloseCreateModal}
                    className="flex-1 bg-gray-700 text-white px-4 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                    disabled={creating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gold text-primary-dark px-4 py-3 rounded-lg font-semibold hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={creating}
                  >
                    {creating ? 'Creating...' : 'Create Goal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Goal Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-primary rounded-xl max-w-md w-full border border-gold border-opacity-30 shadow-2xl">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gold mb-4">Edit Goal</h2>
              <p className="text-gray-400 text-sm mb-6">
                Update your goal details below
              </p>

              <form onSubmit={handleEditSubmit}>
                <div className="mb-4">
                  <label className="block text-gray-400 text-sm mb-2">
                    Goal Name
                  </label>
                  <input
                    type="text"
                    value={editGoalName}
                    onChange={(e) => setEditGoalName(e.target.value)}
                    placeholder="e.g., Emergency Fund, New Car, Vacation"
                    maxLength={100}
                    className="w-full bg-primary-dark text-white px-4 py-3 rounded-lg border border-gold border-opacity-30 focus:border-gold focus:outline-none"
                    disabled={editing}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-gray-400 text-sm mb-2">
                    Target Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editTargetAmount}
                    onChange={(e) => setEditTargetAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-primary-dark text-white px-4 py-3 rounded-lg border border-gold border-opacity-30 focus:border-gold focus:outline-none"
                    disabled={editing}
                  />
                </div>

                {editError && (
                  <div className="mb-4 bg-red-900 bg-opacity-30 border border-red-500 text-red-200 px-3 py-2 rounded text-sm">
                    {editError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloseEditModal}
                    className="flex-1 bg-gray-700 text-white px-4 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                    disabled={editing}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gold text-primary-dark px-4 py-3 rounded-lg font-semibold hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={editing}
                  >
                    {editing ? 'Updating...' : 'Update Goal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-primary rounded-xl max-w-md w-full border border-red-500 border-opacity-50 shadow-2xl">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-red-400 mb-4">Delete Goal?</h2>
              <p className="text-gray-300 mb-2">
                Are you sure you want to delete this goal?
              </p>
              <p className="text-white font-semibold text-lg mb-6">
                "{deleteGoalName}"
              </p>
              <div className="bg-red-900 bg-opacity-30 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
                <p className="text-sm">
                  ⚠️ This action cannot be undone. All progress will be permanently lost.
                </p>
              </div>

              {deleteError && (
                <div className="mb-4 bg-red-900 bg-opacity-50 border border-red-600 text-red-200 px-3 py-2 rounded text-sm">
                  {deleteError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseDeleteModal}
                  className="flex-1 bg-gray-700 text-white px-4 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSubmit}
                  className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete Goal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
