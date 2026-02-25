import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ReactNode } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import MatrixBackground from './components/MatrixBackground'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import ChatPage from './pages/ChatPage'
import AvatarCreatorPage from './pages/AvatarCreatorPage'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <>
      <MatrixBackground />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/profile/:username" element={
          <ProtectedRoute><ProfilePage /></ProtectedRoute>
        } />
        <Route path="/avatar/:username" element={
          <ProtectedRoute><AvatarCreatorPage /></ProtectedRoute>
        } />
        <Route path="/chat" element={
          <ProtectedRoute><ChatPage /></ProtectedRoute>
        } />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
