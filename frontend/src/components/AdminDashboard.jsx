import { useState, useEffect } from 'react'
import { getDoctors, getActivities, getUserActivities } from '../utils/api'

export default function AdminDashboard() {
  const [doctors, setDoctors] = useState([])
  const [activities, setActivities] = useState([])
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [doctorActivities, setDoctorActivities] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getDoctors(), getActivities()])
      .then(([docs, acts]) => {
        setDoctors(docs)
        setActivities(acts)
      })
      .finally(() => setLoading(false))
  }, [])

  const viewDoctor = async (doc) => {
    setSelectedDoctor(doc)
    try {
      const acts = await getUserActivities(doc.id)
      setDoctorActivities(acts)
    } catch {
      setDoctorActivities([])
    }
  }

  const actionLabels = {
    login: 'Login',
    logout: 'Logout',
    create_prescription: 'Created Prescription',
    edit_prescription: 'Edited Prescription',
    delete_prescription: 'Deleted Prescription',
    create_medicine: 'Added Medicine',
    edit_medicine: 'Edited Medicine',
    delete_medicine: 'Deleted Medicine',
    upload_file: 'Uploaded File',
    delete_file: 'Deleted File',
  }

  if (loading) return <div className="loading">Loading...</div>

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-stats">
          <div className="stat-card">
            <div className="stat-number">{doctors.length}</div>
            <div className="stat-label">Total Doctors</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{activities.length}</div>
            <div className="stat-label">Total Activities</div>
          </div>
        </div>
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Doctors Overview
        </button>
        <button
          className={`admin-tab ${activeTab === 'activities' ? 'active' : ''}`}
          onClick={() => setActiveTab('activities')}
        >
          All Activities
        </button>
        {selectedDoctor && (
          <button
            className={`admin-tab ${activeTab === 'doctor' ? 'active' : ''}`}
            onClick={() => setActiveTab('doctor')}
          >
            {selectedDoctor.name}
          </button>
        )}
      </div>

      {activeTab === 'overview' && (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Specialization</th>
                <th>Hospital</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {doctors.filter(d => d.role === 'doctor').map(doc => (
                <tr key={doc.id}>
                  <td>Dr. {doc.name}</td>
                  <td>{doc.email}</td>
                  <td>{doc.specialization || '-'}</td>
                  <td>{doc.hospitalName || '-'}</td>
                  <td>{new Date(doc.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-sm btn-primary" onClick={() => viewDoctor(doc)} style={{ width: 'auto' }}>
                      View Activity
                    </button>
                  </td>
                </tr>
              ))}
              {doctors.filter(d => d.role === 'doctor').length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-state">No doctors registered yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'activities' && (
        <div className="card">
          <div className="activity-list">
            {activities.map(a => (
              <div key={a.id} className="activity-item">
                <div className="activity-user">{a.userName}</div>
                <div className="activity-action">{actionLabels[a.action] || a.action}</div>
                <div className="activity-details">
                  {a.details?.patientName && `Patient: ${a.details.patientName}`}
                  {a.details?.name && `Medicine: ${a.details.name}`}
                  {a.details?.fileName && `File: ${a.details.fileName}`}
                  {a.details?.email && `Email: ${a.details.email}`}
                </div>
                <div className="activity-time">{new Date(a.createdAt).toLocaleString()}</div>
              </div>
            ))}
            {activities.length === 0 && (
              <div className="empty-state">No activities recorded yet</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'doctor' && selectedDoctor && (
        <div className="card">
          <h3 style={{ padding: '1rem 1.2rem', margin: 0 }}>Activities for Dr. {selectedDoctor.name}</h3>
          <div className="activity-list">
            {doctorActivities.map(a => (
              <div key={a.id} className="activity-item">
                <div className="activity-action">{actionLabels[a.action] || a.action}</div>
                <div className="activity-details">
                  {a.details?.patientName && `Patient: ${a.details.patientName}`}
                  {a.details?.name && `Medicine: ${a.details.name}`}
                  {a.details?.fileName && `File: ${a.details.fileName}`}
                  {a.details?.email && `Email: ${a.details.email}`}
                </div>
                <div className="activity-time">{new Date(a.createdAt).toLocaleString()}</div>
              </div>
            ))}
            {doctorActivities.length === 0 && (
              <div className="empty-state">No activities for this doctor</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
