import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './components/Login'
import OtpLogin from './components/OtpLogin'
import Register from './components/Register'
import Dashboard from './components/Dashboard'
import Navbar from './components/Navbar'
import AdminNavbar from './components/AdminNavbar'
import PrescriptionForm from './components/PrescriptionForm'
import PrintPrescription from './components/PrintPrescription'
import Medicines from './components/Medicines'
import AdminLogin from './components/AdminLogin'
import AdminDashboard from './components/AdminDashboard'
import './App.css'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">Loading...</div>
  return user ? children : <Navigate to="/login" />
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">Loading...</div>
  if (!user) return <Navigate to="/admin/login" />
  if (user.role !== 'admin') return <Navigate to="/" />
  return children
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <div className="loading">Loading...</div>

  const isAdmin = user?.role === 'admin'

  return (
    <div className="app">
      {user && !isAdmin && <Navbar />}
      {user && isAdmin && <AdminNavbar />}
      {!user && <Navbar />}
      <main className={(user && !isAdmin) ? 'main-content' : isAdmin ? 'admin-content' : ''}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <OtpLogin />} />
          <Route path="/login/password" element={user ? <Navigate to="/" /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/prescriptions/new" element={<ProtectedRoute><PrescriptionForm /></ProtectedRoute>} />
          <Route path="/prescriptions/edit/:id" element={<ProtectedRoute><PrescriptionForm /></ProtectedRoute>} />
          <Route path="/prescriptions/print/:id" element={<ProtectedRoute><PrintPrescription /></ProtectedRoute>} />
          <Route path="/medicines" element={<ProtectedRoute><Medicines /></ProtectedRoute>} />
          <Route path="/admin/login" element={user && isAdmin ? <Navigate to="/admin/dashboard" /> : <AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        </Routes>
      </main>
    </div>
  )
}
