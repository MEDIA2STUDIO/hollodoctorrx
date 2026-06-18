import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPrescriptions } from '../utils/api'
import PrescriptionList from './PrescriptionList'

export default function Dashboard() {
  const [prescriptions, setPrescriptions] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    getPrescriptions().then(setPrescriptions).catch(console.error)
  }, [])

  const handleDelete = (id) => {
    setPrescriptions(prescriptions.filter(p => p.id !== id))
  }

  return (
    <div>
      <div className="dashboard-header">
        <h1>Prescriptions</h1>
        <button className="btn btn-primary" onClick={() => navigate('/prescriptions/new')}>
          + New Prescription
        </button>
      </div>
      <PrescriptionList prescriptions={prescriptions} onDelete={handleDelete} />
    </div>
  )
}
