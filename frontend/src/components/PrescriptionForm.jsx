import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createPrescription, updatePrescription, getPrescription, uploadFile, deleteFile, getMedicines } from '../utils/api'
import SignaturePad from './SignaturePad'

const emptyMedicine = { name: '', dosage: '', frequency: '', duration: '' }

export default function PrescriptionForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState({
    patientName: '',
    patientAge: '',
    patientRegNo: '',
    diagnosis: '',
    medicines: [{ ...emptyMedicine }],
    notes: '',
    followUpDate: '',
  })
  const [signature, setSignature] = useState('')
  const [attachments, setAttachments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [medList, setMedList] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    getMedicines().then(setMedList).catch(() => {})
  }, [])

  useEffect(() => {
    if (id) {
      getPrescription(id).then(data => {
        setForm({
          patientName: data.patientName,
          patientAge: String(data.patientAge),
          patientRegNo: data.patientRegNo || '',
          diagnosis: data.diagnosis,
          medicines: data.medicines,
          notes: data.notes || '',
          followUpDate: data.followUpDate || '',
        })
        setSignature(data.signature || '')
        setAttachments(data.attachments || [])
      }).catch(err => {
        setError(err.message)
        navigate('/')
      })
    }
  }, [id])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleMedicineChange = (index, field, value) => {
    const medicines = [...form.medicines]
    medicines[index] = { ...medicines[index], [field]: value }
    if (field === 'name') {
      const match = medList.find(m => m.name.toLowerCase() === value.toLowerCase())
      if (match && match.dosageForm && !medicines[index].dosage) {
        medicines[index].dosage = match.dosageForm
      }
    }
    setForm({ ...form, medicines })
  }

  const addMedicine = () => {
    setForm({ ...form, medicines: [...form.medicines, { ...emptyMedicine }] })
  }

  const removeMedicine = (index) => {
    if (form.medicines.length === 1) return
    setForm({ ...form, medicines: form.medicines.filter((_, i) => i !== index) })
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      let rxId = id
      if (!rxId) {
        const rx = await createPrescription({
          ...form,
          patientAge: Number(form.patientAge),
          medicines: form.medicines.filter(m => m.name.trim()),
          signature,
        })
        rxId = rx.id
        navigate(`/prescriptions/edit/${rxId}`, { replace: true })
      }
      const result = await uploadFile(rxId, file)
      setAttachments(result.attachments)
    } catch (err) {
      setError(err.message)
    }
    setUploading(false)
    e.target.value = ''
  }

  const handleDeleteFile = async (fileId) => {
    try {
      const result = await deleteFile(id, fileId)
      setAttachments(result.attachments)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const data = {
      ...form,
      patientAge: Number(form.patientAge),
      medicines: form.medicines.filter(m => m.name.trim()),
      signature,
    }

    try {
      if (isEdit) {
        await updatePrescription(id, data)
      } else {
        await createPrescription(data)
      }
      navigate('/')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <h2>{isEdit ? 'Edit Prescription' : 'New Prescription'}</h2>
      {error && <p className="error">{error}</p>}

      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <div className="form-group">
          <label>Patient Name</label>
          <input name="patientName" value={form.patientName} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Age</label>
          <input type="number" name="patientAge" value={form.patientAge} onChange={handleChange} required min="0" />
        </div>
        <div className="form-group">
          <label>Patient Reg No.</label>
          <input name="patientRegNo" value={form.patientRegNo} onChange={handleChange} placeholder="e.g. IPD-12345" />
        </div>
      </div>

      <div className="form-group">
        <label>Diagnosis</label>
        <textarea name="diagnosis" value={form.diagnosis} onChange={handleChange} required rows="2" />
      </div>

      <div className="form-group">
        <label>Medicines</label>
        {form.medicines.map((med, i) => (
          <div className="medicine-row" key={i}>
            <input
              placeholder="Medicine name"
              value={med.name}
              onChange={e => handleMedicineChange(i, 'name', e.target.value)}
              list={id ? undefined : 'med-list'}
              required
            />
            {!id && (
              <datalist id="med-list">
                {medList.map(m => (
                  <option key={m.id} value={m.name} label={`${m.dosageForm || ''} ${m.category || ''}`} />
                ))}
              </datalist>
            )}
            <input placeholder="Dosage" value={med.dosage} onChange={e => handleMedicineChange(i, 'dosage', e.target.value)} required />
            <input placeholder="Frequency" value={med.frequency} onChange={e => handleMedicineChange(i, 'frequency', e.target.value)} required />
            <input placeholder="Duration" value={med.duration} onChange={e => handleMedicineChange(i, 'duration', e.target.value)} required />
            <button type="button" className="btn btn-danger btn-sm" onClick={() => removeMedicine(i)} style={{ padding: '0.4rem' }}>X</button>
          </div>
        ))}
        <button type="button" className="add-medicine" onClick={addMedicine}>+ Add Medicine</button>
      </div>

      <div className="form-group">
        <label>Notes</label>
        <textarea name="notes" value={form.notes} onChange={handleChange} rows="2" />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Follow-up Date</label>
          <input type="date" name="followUpDate" value={form.followUpDate} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Signature</label>
          <SignaturePad value={signature} onChange={setSignature} />
          {signature && <img src={signature} alt="Signature" className="sigpad-preview" />}
        </div>
      </div>

      <div className="form-group">
        <label>Attachments</label>
        {attachments.length > 0 && (
          <div className="file-list">
            {attachments.map(f => (
              <div key={f.id} className="file-item">
                <a href={`/uploads/${f.path}`} target="_blank" rel="noreferrer" className="file-name">{f.name}</a>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDeleteFile(f.id)} style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>Remove</button>
              </div>
            ))}
          </div>
        )}
        <div className="file-input-wrapper">
          <input type="file" id="file-upload" onChange={handleFileUpload} disabled={uploading} />
          <label htmlFor="file-upload" className="btn btn-sm" style={{ background: '#3498db', color: 'white', marginTop: '0.5rem', display: 'inline-block' }}>
            {uploading ? 'Uploading...' : '+ Upload File'}
          </label>
          <span className="file-hint">JPG, PNG, PDF, DOC (max 10MB)</span>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>Cancel</button>
        <button type="submit" className="btn btn-primary">{isEdit ? 'Update' : 'Create'}</button>
      </div>
    </form>
  )
}
