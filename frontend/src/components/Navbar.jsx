import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    return (
      <nav className="navbar navbar-public">
        <div className="navbar-left">
          <span className="navbar-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>Hello Doctor</span>
        </div>
        <div className="navbar-actions">
          <button className="btn btn-sm btn-outline" onClick={() => navigate('/register')}>Sign Up</button>
          <button className="btn btn-sm btn-outline" onClick={() => navigate('/admin/login')}>Admin Login</button>
        </div>
      </nav>
    )
  }

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <span className="navbar-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>Hello Doctor</span>
        <button className="navbar-link" onClick={() => navigate('/')}>Prescriptions</button>
        <button className="navbar-link" onClick={() => navigate('/medicines')}>Medicines</button>
      </div>
      <div className="navbar-actions">
        <span>Dr. {user?.name}</span>
        {user?.hospitalName && <span className="navbar-regno">{user.hospitalName}</span>}
        {user?.regNo && <span className="navbar-regno">Reg: {user.regNo}</span>}
        <button onClick={logout}>Logout</button>
      </div>
    </nav>
  )
}
