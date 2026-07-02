import { useState } from 'react'
import { Link } from 'react-router-dom'
import { sendOtp, verifyOtp } from '../utils/api'
import { useAuth } from '../context/AuthContext'

export default function OtpLogin() {
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const { loginUser } = useAuth()

  const handleSendOtp = async (e) => {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      await sendOtp(email)
      setStep('otp')
    } catch (err) {
      setError(err.message)
    }
    setSending(false)
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const data = await verifyOtp(email, otp, name)
      loginUser(data.token, data.user)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="auth-container">
      {step === 'email' ? (
        <form className="auth-card" onSubmit={handleSendOtp}>
          <h2>Hello Doctor</h2>
          <p className="subtitle">Sign in with email</p>
          {error && <p className="error">{error}</p>}
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="doctor@hospital.com" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={sending}>
            {sending ? 'Sending OTP...' : 'Send OTP'}
          </button>
          <p className="auth-link">
            <Link to="/login/password">Sign in with password</Link>
          </p>
          <p className="auth-link">
            Don't have an account? <Link to="/register">Register</Link>
          </p>
        </form>
      ) : (
        <form className="auth-card" onSubmit={handleVerify}>
          <h2>Hello Doctor</h2>
          <p className="subtitle">Enter OTP sent to {email}</p>
          {error && <p className="error">{error}</p>}
          <div className="form-group">
            <label>Full Name (for new users)</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Dr. Name" />
          </div>
          <div className="form-group">
            <label>OTP Code</label>
            <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} required placeholder="000000" maxLength={6} style={{ fontSize: '1.5rem', letterSpacing: '8px', textAlign: 'center' }} />
          </div>
          <button type="submit" className="btn btn-primary">Verify & Sign In</button>
          <p className="auth-link">
            <button type="button" className="link-button" onClick={() => setStep('email')}>Change email</button>
          </p>
        </form>
      )}
    </div>
  )
}
