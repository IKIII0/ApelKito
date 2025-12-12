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
  // Default ke kamera depan (user) terlebih dahulu
  const [cameraFacing, setCameraFacing] = useState('user')

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
      // Matikan stream lama jika ada
      if (videoRef.current && videoRef.current.srcObject) {
        const oldTracks = videoRef.current.srcObject.getTracks()
        oldTracks.forEach((track) => track.stop())
        videoRef.current.srcObject = null
      }

      const constraintsWithFacing = {
        video: {
          facingMode: { ideal: cameraFacing },
        },
      }

      let stream = null
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraintsWithFacing)
      } catch (constraintErr) {
        console.warn('Gagal dengan facingMode, fallback ke default video:', constraintErr)
        // Fallback: tanpa facingMode, biarkan browser memilih kamera yang tersedia
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        // Beberapa browser (terutama mobile/iOS) membutuhkan pemanggilan play() eksplisit
        try {
          await videoRef.current.play()
        } catch (playErr) {
          console.warn('Gagal memulai pemutaran video:', playErr)
        }
        setIsCameraOn(true)
      }
    } catch (err) {
      console.error(err)
      setError('Tidak bisa mengakses kamera. Pastikan izin sudah diberikan dan perangkat mendukung kamera depan/belakang.')
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 text-white flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-5xl">
        <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/40 px-3 py-1 mb-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-medium tracking-wide uppercase text-emerald-200/80">
                ApelKito • Smart Freshness Detection
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Deteksi Kesegaran Apel
            </h1>
            <p className="mt-2 max-w-2xl text-sm md:text-[15px] text-slate-300 leading-relaxed">
              Sistem deteksi kesegaran apel berbasis visi komputer. Unggah foto atau ambil
              langsung dari kamera, kemudian model akan menganalisis tingkat kesegaran
              apel Anda secara otomatis.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/70 border border-slate-700 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Model aktif
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Backend: Flask • Frontend: React + Tailwind
            </span>
          </div>
        </header>

        <main className="grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6">
          <section className="bg-slate-900/70 border border-slate-800/80 rounded-2xl shadow-xl shadow-black/40 p-5 md:p-6 backdrop-blur-xl space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
                  1. Pilih Sumber Gambar
                </h2>

                <div className="space-y-2 text-xs text-slate-300">
                  <label className="block text-[11px] uppercase tracking-wide text-slate-400 font-medium">
                    Upload dari perangkat
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-slate-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-500 file:text-white hover:file:bg-emerald-600 file:cursor-pointer cursor-pointer bg-slate-900/60 border border-slate-700/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
                  />
                  <p className="text-[11px] text-slate-400">
                    Disarankan gambar apel tunggal dengan pencahayaan cukup.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] uppercase tracking-wide text-slate-400 font-medium">
                    Atau gunakan kamera langsung
                  </label>
                  <div className="flex flex-wrap gap-2 items-center">
                    <button
                      type="button"
                      onClick={isCameraOn ? stopCamera : startCamera}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium bg-blue-500 hover:bg-blue-600 transition-colors shadow-sm shadow-blue-900/40"
                    >
                      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-sky-200" />
                      {isCameraOn ? 'Matikan Kamera' : 'Nyalakan Kamera'}
                    </button>
                    <button
                      type="button"
                      onClick={captureFromCamera}
                      disabled={!isCameraOn}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm shadow-amber-900/40"
                    >
                      📸 Ambil Foto
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'))
                        if (isCameraOn) {
                          // restart kamera dengan arah baru
                          startCamera()
                        }
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium border border-slate-600/80 text-slate-200 bg-slate-900/60 hover:bg-slate-800/80 transition-colors"
                    >
                      🔄 Ganti ke {cameraFacing === 'environment' ? 'Kamera Depan' : 'Kamera Belakang'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Pada beberapa perangkat desktop, hanya satu jenis kamera yang tersedia.
                  </p>
                  <div className="mt-3 bg-slate-950/70 rounded-xl overflow-hidden border border-slate-800/80 min-h-[180px] relative flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-contain bg-black/40"
                    />
                    {!isCameraOn && (
                      <div className="absolute inset-0 flex items-center justify-center text-center px-4 py-6 text-[12px] text-slate-400 bg-slate-950/70">
                        Nyalakan kamera untuk melihat tampilan langsung di sini.
                      </div>
                    )}
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
                  2. Pratinjau Gambar
                </h2>
                <div className="relative bg-slate-950/60 rounded-xl min-h-[220px] flex items-center justify-center overflow-hidden border border-slate-800/90">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Pratinjau apel"
                      className="max-h-64 w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-center px-6">
                      <span className="text-lg mb-1">🍎</span>
                      <p className="text-[13px] text-slate-300">
                        Belum ada gambar.
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Silakan upload foto apel atau ambil gambar langsung dari kamera
                        untuk memulai proses deteksi.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1 border-t border-slate-800/70 mt-2">
              <div className="text-[11px] text-slate-400 space-y-1 max-w-md">
                <p>
                  Dengan menekan tombol deteksi, gambar akan dikirim ke server dan
                  dianalisis oleh model deep learning yang telah dilatih.
                </p>
                <p className="text-[10px] text-slate-500">
                  Waktu proses biasanya kurang dari 2 detik tergantung koneksi dan ukuran
                  gambar.
                </p>
              </div>

              <button
                type="button"
                onClick={handlePredict}
                disabled={loading || !selectedFile}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-900/50 transition-all hover:-translate-y-[1px]"
              >
                {loading ? (
                  <>
                    <span className="inline-flex h-3 w-3 border-2 border-emerald-100 border-t-transparent rounded-full animate-spin" />
                    Memproses gambar...
                  </>
                ) : (
                  <>
                    <span className="text-base">▶</span>
                    Deteksi Kesegaran Apel
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="text-xs md:text-sm text-red-300 bg-red-950/40 border border-red-800/80 rounded-lg px-3 py-2 flex items-start gap-2">
                <span className="mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-lg shadow-black/40 min-h-[220px] flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
                    3. Hasil Analisis
                  </h2>
                  {result && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium border ${
                        result.label === 'Segar'
                          ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/60'
                          : 'bg-red-500/10 text-red-200 border-red-500/60'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          result.label === 'Segar' ? 'bg-emerald-300' : 'bg-red-300'
                        }`}
                      />
                      {result.label === 'Segar' ? 'Apel Segar' : 'Apel Kurang Segar'}
                    </span>
                  )}
                </div>

                {!result && (
                  <p className="text-[13px] text-slate-400">
                    Hasil prediksi akan muncul di sini setelah Anda mengunggah gambar dan
                    menekan tombol deteksi.
                  </p>
                )}

                {result && (
                  <div className="space-y-3 mt-1">
                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl px-3 py-3 text-sm">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-slate-400 text-xs">Prediksi model</span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          class #{result.class_index ?? '-'}
                        </span>
                      </div>
                      <div className="text-lg font-semibold">
                        {result.label ?? 'Tidak diketahui'}
                      </div>
                    </div>

                    {typeof result.confidence === 'number' && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>Tingkat kepercayaan</span>
                          <span className="font-mono text-slate-200">
                            {(result.confidence * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              result.label === 'Segar'
                                ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-300'
                                : 'bg-gradient-to-r from-red-400 via-red-500 to-red-300'
                            }`}
                            style={{ width: `${Math.min(result.confidence * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 space-y-1">
                <p>
                  Kategori yang digunakan:
                  <span className="ml-1 font-medium text-slate-300">Busuk</span>
                  <span className="mx-1">/</span>
                  <span className="font-medium text-slate-300">Segar</span>.
                </p>
                <p>
                  Hasil prediksi dapat digunakan sebagai referensi kualitas, namun tidak
                  menggantikan inspeksi manual secara langsung.
                </p>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-900 rounded-2xl px-4 py-3 text-[11px] text-slate-400 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 text-sm">
                  i
                </span>
                <p className="font-medium text-slate-200 text-[12px]">
                  Tips pengambilan gambar yang baik
                </p>
              </div>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Cahaya cukup dan merata, hindari bayangan keras.</li>
                <li>Fokus pada satu buah apel, usahakan memenuhi sebagian besar frame.</li>
                <li>Hindari blur, goyangan, atau jarak yang terlalu jauh.</li>
              </ul>
            </div>
          </aside>
        </main>
      </div>
    </div>
  )
}

export default App
