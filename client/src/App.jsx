import { useEffect, useRef, useState } from 'react'
import './index.css'

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [isCameraOn, setIsCameraOn] = useState(false)

  useEffect(() => {
    return () => {
      // Matikan kamera saat komponen di-unmount
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks()
        tracks.forEach((track) => track.stop())
      }
    }
  }, [])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setResult(null)
    setError('')

    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsCameraOn(true)
      }
    } catch (err) {
      setError('Tidak bisa mengakses kamera. Pastikan izin sudah diberikan.')
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    setIsCameraOn(false)
  }

  const captureFromCamera = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' })
      setSelectedFile(file)
      setResult(null)
      setError('')

      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
    }, 'image/jpeg')
  }

  const handlePredict = async () => {
    if (!selectedFile) {
      setError('Silakan pilih atau ambil foto terlebih dahulu.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const res = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Terjadi kesalahan saat memproses gambar.')
      }

      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-slate-800 rounded-xl shadow-lg p-6 space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Deteksi Kesegaran Apel</h1>
          <p className="text-slate-300 text-sm">
            Upload foto apel atau gunakan kamera untuk memeriksa kesegaran apel
            menggunakan model yang sudah dilatih.
          </p>
        </header>

        <section className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="font-semibold">1. Pilih Gambar</h2>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-200 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-500 file:text-white hover:file:bg-emerald-600"
              />
            </div>

            <div className="space-y-2">
              <h2 className="font-semibold">2. Kamera</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={isCameraOn ? stopCamera : startCamera}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-blue-500 hover:bg-blue-600"
                >
                  {isCameraOn ? 'Matikan Kamera' : 'Nyalakan Kamera'}
                </button>
                <button
                  type="button"
                  onClick={captureFromCamera}
                  disabled={!isCameraOn}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Ambil Foto
                </button>
              </div>
              <div className="mt-2 bg-black/30 rounded-md overflow-hidden aspect-video flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="font-semibold">3. Pratinjau Gambar</h2>
              <div className="bg-black/30 rounded-md min-h-[200px] flex items-center justify-center overflow-hidden">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Pratinjau apel"
                    className="max-h-64 object-contain"
                  />
                ) : (
                  <span className="text-slate-400 text-sm">
                    Belum ada gambar. Silakan upload atau ambil foto dari kamera.
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handlePredict}
                disabled={loading || !selectedFile}
                className="w-full px-4 py-2 rounded-md text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Memproses...' : 'Deteksi Kesegaran Apel'}
              </button>

              {error && (
                <div className="text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              {result && (
                <div className="space-y-1 bg-slate-900/60 border border-slate-700 rounded-md px-3 py-3 text-sm">
                  <div>
                    <span className="text-slate-400">Prediksi:&nbsp;</span>
                    <span className="font-semibold">
                      {result.label ?? 'Tidak diketahui'}
                    </span>
                  </div>
                  {typeof result.confidence === 'number' && (
                    <div>
                      <span className="text-slate-400">Kepercayaan:&nbsp;</span>
                      <span className="font-mono">
                        {(result.confidence * 100).toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default App
