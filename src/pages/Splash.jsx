import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export const Splash = () => {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        if (user) {
          navigate('/dashboard')
        } else {
          navigate('/login')
        }
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [user, loading, navigate])

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-dark to-primary flex flex-col items-center justify-center">
      <div className="text-center">
        <div className="mb-6">
          <svg
            className="w-32 h-32 mx-auto text-gold"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M50 10 L30 30 L20 28 L20 70 L30 68 L40 80 L50 75 L60 80 L70 68 L80 70 L80 28 L70 30 L50 10Z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="2"
            />
            <circle cx="50" cy="50" r="8" fill="#1B4332" />
          </svg>
        </div>
        <h1 className="text-5xl font-bold text-gold mb-2">WealthNest</h1>
        <p className="text-gold-light text-lg">Your Financial Future, Secured</p>
      </div>
    </div>
  )
}
