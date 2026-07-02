import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminNavbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <nav className="navbar navbar-admin">
      <div className="navbar-left">
        <span className="navbar-brand" style={{ cursor: 'pointer' }}>Hello Doctor</span>
        <span className="navbar-badge">Admin</span>
        <button className="navbar-link" onClick={() => navigate('/admin/dashboard')}>Dashboard</button>
      </div>
      <div className="navbar-actions">
        <span>{user?.name}</span>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  )
}
