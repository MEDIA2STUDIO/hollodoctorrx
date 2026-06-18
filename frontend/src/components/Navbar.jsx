import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

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
