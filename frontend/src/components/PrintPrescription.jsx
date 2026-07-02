import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPrescription } from '../utils/api'
import { useAuth } from '../context/AuthContext'

export default function PrintPrescription() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [rx, setRx] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const printRef = useRef()

  useEffect(() => {
    getPrescription(id).then(setRx).catch(() => navigate('/'))
  }, [id])

  useEffect(() => {
    if (rx) setTimeout(() => window.print(), 300)
  }, [rx])

  const getHtml2pdf = async () => {
    if (window.html2pdf) return window.html2pdf
    await new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
      s.onload = resolve; s.onerror = reject
      document.head.appendChild(s)
    })
    return window.html2pdf
  }

  const downloadPdf = async () => {
    setPdfLoading(true)
    try {
      const html2pdf = await getHtml2pdf()
      const element = printRef.current
      const opt = {
        margin: 0.5,
        filename: `prescription-${rx.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
      }
      await html2pdf().set(opt).from(element).save()
    } catch (err) {
      console.error('PDF generation failed:', err)
    } finally {
      setPdfLoading(false)
    }
  }

  if (!rx) return null

  return (
    <div className="print-container" ref={printRef}>
      <div className="print-header">
        <div>
          <h1>Hello Doctor</h1>
          {user?.hospitalName && <p className="print-hospital">{user.hospitalName}</p>}
          <p className="print-doctor">Dr. {user?.name}</p>
          {user?.specialization && <p className="print-spec">{user.specialization}</p>}
          {user?.regNo && <p className="print-spec">Reg No: {user.regNo}</p>}
        </div>
        <div className="print-date">
          <p>Date: {new Date(rx.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p>Rx #: {rx.id}</p>
        </div>
      </div>

      <div className="print-divider"></div>

      <div className="print-patient">
        <div className="print-field">
          <span className="print-label">Patient Name:</span>
          <span className="print-value">{rx.patientName}</span>
        </div>
        <div className="print-field">
          <span className="print-label">Age:</span>
          <span className="print-value">{rx.patientAge}</span>
        </div>
        <div className="print-field">
          <span className="print-label">Reg No.:</span>
          <span className="print-value">{rx.patientRegNo || '-'}</span>
        </div>
      </div>

      <div className="print-field">
        <span className="print-label">Diagnosis:</span>
        <span className="print-value">{rx.diagnosis}</span>
      </div>

      <div className="print-section-title">Prescribed Medicines</div>
      <table className="print-meds-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Medicine</th>
            <th>Morning</th>
            <th>Afternoon</th>
            <th>Night</th>
          </tr>
        </thead>
        <tbody>
          {rx.medicines.map((m, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{m.name}</td>
              {m.times ? (
                <>
                  <td className={m.times.includes('Morning') ? 'time-check' : ''}>{m.times.includes('Morning') ? '✓' : '-'}</td>
                  <td className={m.times.includes('Afternoon') ? 'time-check' : ''}>{m.times.includes('Afternoon') ? '✓' : '-'}</td>
                  <td className={m.times.includes('Night') ? 'time-check' : ''}>{m.times.includes('Night') ? '✓' : '-'}</td>
                </>
              ) : (
                <>
                  <td>{m.dosage || '-'}</td>
                  <td>{m.frequency || '-'}</td>
                  <td>{m.duration || '-'}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {rx.notes && (
        <div className="print-field">
          <span className="print-label">Notes:</span>
          <span className="print-value">{rx.notes}</span>
        </div>
      )}

      {rx.followUpDate && (
        <div className="print-field">
          <span className="print-label">Follow-up Date:</span>
          <span className="print-value">{new Date(rx.followUpDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      )}

      {rx.attachments?.length > 0 && (
        <div className="print-files">
          <div className="print-section-title">Attachments</div>
          {rx.attachments.map(f => (
            <div key={f.id} className="print-file-item">{f.name}</div>
          ))}
        </div>
      )}

      <div className="print-divider"></div>

      <div className="print-signature">
        {rx.signature ? (
          <img src={rx.signature} alt="Doctor's Signature" className="print-signature-img" />
        ) : (
          <>
            <div className="print-signature-line"></div>
            <p>Doctor's Signature</p>
          </>
        )}
      </div>

      <div className="no-print">
        <button className="btn btn-primary" onClick={() => window.print()} style={{ width: 'auto', marginTop: '2rem' }}>
          Print
        </button>
        <button className="btn btn-success" onClick={downloadPdf} disabled={pdfLoading} style={{ width: 'auto', marginTop: '2rem', marginLeft: '1rem' }}>
          {pdfLoading ? 'Generating...' : 'Download PDF'}
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ width: 'auto', marginTop: '2rem', marginLeft: '1rem' }}>
          Back
        </button>
      </div>
    </div>
  )
}
