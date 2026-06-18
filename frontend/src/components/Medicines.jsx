import { useState, useEffect } from 'react'
import { getMedicines, createMedicine, updateMedicine, deleteMedicine } from '../utils/api'

const emptyForm = { name: '', category: '', manufacturer: '', description: '', sideEffects: '', dosageForm: '' }

export default function Medicines() {
  const [medicines, setMedicines] = useState([])
  const [form, setForm] = useState({ ...emptyForm })
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getMedicines().then(setMedicines).catch(console.error)
  }, [])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const resetForm = () => {
    setForm({ ...emptyForm })
    setEditingId(null)
    setError('')
  }

  const handleEdit = (m) => {
    setForm({
      name: m.name,
      category: m.category || '',
      manufacturer: m.manufacturer || '',
      description: m.description || '',
      sideEffects: m.sideEffects || '',
      dosageForm: m.dosageForm || '',
    })
    setEditingId(m.id)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editingId) {
        const updated = await updateMedicine(editingId, form)
        setMedicines(medicines.map(m => m.id === editingId ? updated : m))
      } else {
        const created = await createMedicine(form)
        setMedicines([created, ...medicines])
      }
      resetForm()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this medicine?')) return
    try {
      await deleteMedicine(id)
      setMedicines(medicines.filter(m => m.id !== id))
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div>
      <div className="dashboard-header">
        <h1>Medicine Database</h1>
      </div>

      <div className="med-grid">
        <div className="card med-form-card">
          <h2 className="med-form-title">{editingId ? 'Edit Medicine' : 'Add Medicine'}</h2>
          {error && <p className="error">{error}</p>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Medicine Name</label>
              <input name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Category</label>
              <input name="category" value={form.category} onChange={handleChange} placeholder="e.g. Antibiotic, Painkiller" />
            </div>
            <div className="form-group">
              <label>Dosage Form</label>
              <input name="dosageForm" value={form.dosageForm} onChange={handleChange} placeholder="e.g. Tablet, Syrup, Injection" />
            </div>
            <div className="form-group">
              <label>Manufacturer</label>
              <input name="manufacturer" value={form.manufacturer} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows="2" />
            </div>
            <div className="form-group">
              <label>Side Effects</label>
              <textarea name="sideEffects" value={form.sideEffects} onChange={handleChange} rows="2" />
            </div>
            <div className="form-actions" style={{ marginTop: '1rem' }}>
              {editingId && <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>}
              <button type="submit" className="btn btn-primary">{editingId ? 'Update' : 'Add'}</button>
            </div>
          </form>
        </div>

        <div className="card med-list-card">
          <h2 className="med-form-title">Medicine List</h2>
          {medicines.length === 0 ? (
            <div className="empty-state"><p>No medicines added yet.</p></div>
          ) : (
            <div className="med-scroll">
              {medicines.map(m => (
                <div key={m.id} className="med-item">
                  <div className="med-item-header">
                    <strong className="med-item-name">{m.name}</strong>
                    <div className="actions" style={{ gap: '0.4rem' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => handleEdit(m)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m.id)}>Del</button>
                    </div>
                  </div>
                  <div className="med-item-details">
                    {m.category && <span className="med-tag">{m.category}</span>}
                    {m.dosageForm && <span className="med-tag med-tag-blue">{m.dosageForm}</span>}
                    {m.manufacturer && <span className="med-tag med-tag-green">{m.manufacturer}</span>}
                  </div>
                  {m.description && <p className="med-item-desc">{m.description}</p>}
                  {m.sideEffects && <p className="med-item-se"><strong>Side effects:</strong> {m.sideEffects}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
