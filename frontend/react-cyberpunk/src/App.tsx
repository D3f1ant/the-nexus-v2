import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MatrixBackground from './components/MatrixBackground'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import ChatPage from './pages/ChatPage'

function App() {
  return (
    <BrowserRouter>
      <MatrixBackground />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/profile/:username" element={<ProfilePage />} />
        <Route path="/chat" element={<ChatPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
