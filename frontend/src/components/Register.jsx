import { useState } from 'react'
import { Link } from 'react-router-dom'
import { register } from '../utils/api'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', specialization: '', regNo: '', hospitalName: '' })
  const [error, setError] = useState('')
  const { loginUser } = useAuth()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const data = await register(form.name, form.email, form.password, form.specialization, form.regNo, form.hospitalName)
      loginUser(data.token, data.user)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Hello Doctor</h2>
        <p className="subtitle">Create your doctor account</p>
        {error && <p className="error">{error}</p>}
        <div className="form-group">
          <label>Full Name</label>
          <input name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" name="email" value={form.email} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={6} />
        </div>
        <div className="form-group">
          <label>Hospital / Clinic Name</label>
          <input name="hospitalName" value={form.hospitalName} onChange={handleChange} placeholder="e.g. City Hospital" />
        </div>
        <div className="form-group">
          <label>Specialization</label>
          <input name="specialization" value={form.specialization} onChange={handleChange} placeholder="e.g. Cardiologist" />
        </div>
        <div className="form-group">
          <label>Registration No.</label>
          <input name="regNo" value={form.regNo} onChange={handleChange} placeholder="e.g. MCI-12345" />
        </div>
        <button type="submit" className="btn btn-primary">Register</button>
        <p className="auth-link">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </form>
    </div>
  )
}
