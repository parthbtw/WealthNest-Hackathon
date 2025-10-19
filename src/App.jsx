import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Splash } from './pages/Splash'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Dashboard } from './pages/Dashboard'
import { VaultDetail } from './pages/VaultDetail'
import { PensionNestPage } from './pages/PensionNestPage'
import { EmergencyVaultPage } from './pages/EmergencyVaultPage'
import { WealthAiPage } from './pages/WealthAiPage'
import { GoalsPage } from './pages/GoalsPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vault/pension"
            element={
              <ProtectedRoute>
                <PensionNestPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vault/emergency"
            element={
              <ProtectedRoute>
                <EmergencyVaultPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vault/:vaultType"
            element={
              <ProtectedRoute>
                <VaultDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wealthai"
            element={
              <ProtectedRoute>
                <WealthAiPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/goals"
            element={
              <ProtectedRoute>
                <GoalsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
