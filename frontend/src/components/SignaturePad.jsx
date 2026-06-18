import { useState, useRef, useEffect } from 'react'

export default function SignaturePad({ value, onChange }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)

  useEffect(() => {
    if (value) {
      const img = new Image()
      img.onload = () => {
        const ctx = canvasRef.current?.getContext('2d')
        if (ctx) ctx.drawImage(img, 0, 0)
      }
      img.src = value
    }
  }, [value])

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const startDraw = (e) => {
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setDrawing(true)
  }

  const draw = (e) => {
    e.preventDefault()
    if (!drawing) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#2c3e50'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  const endDraw = () => {
    setDrawing(false)
  }

  const clear = () => {
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) ctx.clearRect(0, 0, 300, 100)
    onChange('')
  }

  const save = () => {
    const dataUrl = canvasRef.current?.toDataURL('image/png')
    onChange(dataUrl || '')
  }

  return (
    <div className="sigpad-wrapper">
      <canvas
        ref={canvasRef}
        width={300}
        height={100}
        className="sigpad-canvas"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
      <div className="sigpad-actions">
        <button type="button" className="btn btn-sm btn-secondary" onClick={clear}>Clear</button>
        <button type="button" className="btn btn-sm btn-primary" onClick={save} style={{ width: 'auto' }}>Save Signature</button>
      </div>
    </div>
  )
}
