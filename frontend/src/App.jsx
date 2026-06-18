import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './components/Login'
import Register from './components/Register'
import Dashboard from './components/Dashboard'
import Navbar from './components/Navbar'
import PrescriptionForm from './components/PrescriptionForm'
import PrintPrescription from './components/PrintPrescription'
import Medicines from './components/Medicines'
import './App.css'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">Loading...</div>
  return user ? children : <Navigate to="/login" />
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <div className="loading">Loading...</div>

  return (
    <div className="app">
      {user && <Navbar />}
      <main className={user ? 'main-content' : ''}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/prescriptions/new" element={<ProtectedRoute><PrescriptionForm /></ProtectedRoute>} />
          <Route path="/prescriptions/edit/:id" element={<ProtectedRoute><PrescriptionForm /></ProtectedRoute>} />
          <Route path="/prescriptions/print/:id" element={<ProtectedRoute><PrintPrescription /></ProtectedRoute>} />
          <Route path="/medicines" element={<ProtectedRoute><Medicines /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  )
}
