import { useNavigate } from 'react-router-dom'
import { deletePrescription } from '../utils/api'

export default function PrescriptionList({ prescriptions, onDelete }) {
  const navigate = useNavigate()

  const handleDelete = async (id) => {
    if (!confirm('Delete this prescription?')) return
    try {
      await deletePrescription(id)
      onDelete(id)
    } catch (err) {
      alert(err.message)
    }
  }

  if (prescriptions.length === 0) {
    return (
      <div className="card empty-state">
        <p>No prescriptions yet. Create your first one!</p>
      </div>
    )
  }

  return (
    <div className="card">
      <table className="table">
        <thead>
          <tr>
            <th>Patient</th>
            <th>Age</th>
            <th>Reg No.</th>
            <th>Diagnosis</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {prescriptions.map(p => (
            <tr key={p.id}>
              <td>{p.patientName}</td>
              <td>{p.patientAge}</td>
              <td>{p.patientRegNo || '-'}</td>
              <td>{p.diagnosis}</td>
              <td>{new Date(p.createdAt).toLocaleDateString()}</td>
              <td className="actions">
                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/prescriptions/edit/${p.id}`)}>Edit</button>
                <button className="btn btn-sm" style={{background:'#2ecc71',color:'white'}} onClick={() => navigate(`/prescriptions/print/${p.id}`)}>Print</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
