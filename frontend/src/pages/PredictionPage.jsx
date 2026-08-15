import { useEffect, useMemo, useRef, useState } from "react";
import { predictPalmImage } from "../services/api";

const CLASS_INFO = {
  belum_masak: {
    label: "Belum Masak",
    icon: "🟢",
    description:
      "Buah belum mencapai tingkat kematangan optimal untuk dipanen.",
  },
  masak: {
    label: "Masak",
    icon: "🟠",
    description:
      "Buah berada pada tingkat kematangan yang sesuai untuk dipanen.",
  },
  terlalu_masak: {
    label: "Terlalu Masak",
    icon: "🔴",
    description: "Buah telah melewati tingkat kematangan optimal.",
  },
};

function toPercent(value) {
  const number = Number(value || 0);
  return number <= 1 ? number * 100 : number;
}

function dataUrlToFile(dataUrl, filename) {
  const [header, content] = dataUrl.split(",");
  const mimeType = header.match(/data:(.*?);base64/)?.[1] || "image/jpeg";

  const binary = atob(content);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], filename, {
    type: mimeType,
  });
}

function PredictionPage({ onOpenHistory }) {
  const galleryRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraStreamRef = useRef(null);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [source, setSource] = useState("gallery");

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isOpeningCamera, setIsOpeningCamera] = useState(false);

  const [zoom, setZoom] = useState(1);

  const resultClass = useMemo(() => {
    const value =
      result?.predicted_class ||
      result?.prediction ||
      result?.result?.predicted_class ||
      "";

    return String(value).trim().toLowerCase().replace(/\s+/g, "_");
  }, [result]);

  const confidence = toPercent(
    result?.confidence ||
      result?.confidence_score ||
      result?.result?.confidence,
  );

  const probabilities =
    result?.probabilities || result?.result?.probabilities || {};

  const info = CLASS_INFO[resultClass] || {
    label: resultClass || "Hasil Prediksi",
    icon: "🌴",
    description: "Hasil klasifikasi berhasil diperoleh dari sistem.",
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());

      cameraStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraOpen(false);
    setIsOpeningCamera(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();

      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, []);

  const openCamera = async () => {
    setError("");
    setResult(null);
    setIsOpeningCamera(true);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Browser ini belum mendukung kamera langsung. Gunakan tombol Pilih Galeri.",
      );
      setIsOpeningCamera(false);
      return;
    }

    try {
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "environment",
          },
          width: {
            ideal: 1280,
          },
          height: {
            ideal: 720,
          },
        },
        audio: false,
      });

      cameraStreamRef.current = stream;
      setIsCameraOpen(true);
      setIsOpeningCamera(false);

      window.requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch (cameraError) {
      setIsOpeningCamera(false);
      setIsCameraOpen(false);

      const message =
        cameraError?.name === "NotAllowedError"
          ? "Akses kamera ditolak. Izinkan kamera pada pengaturan browser."
          : "Kamera tidak dapat dibuka. Pastikan perangkat memiliki kamera dan halaman dibuka melalui HTTPS atau localhost.";

      setError(message);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      setError("Kamera belum siap digunakan.");
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      setError("Kamera masih memuat. Tunggu sebentar lalu tekan Ambil Foto.");
      return;
    }

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      setError("Gagal memproses hasil kamera.");
      return;
    }

    context.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

    const capturedFile = dataUrlToFile(dataUrl, `foto-sawit-${Date.now()}.jpg`);

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setFile(capturedFile);
    setPreview(URL.createObjectURL(capturedFile));
    setSource("camera");
    setResult(null);
    setError("");
    setZoom(1);

    stopCamera();
  };

  const chooseFile = (event) => {
    const selected = event.target.files?.[0];

    if (!selected) {
      return;
    }

    if (!selected.type.startsWith("image/")) {
      setError("File yang dipilih harus berupa gambar.");
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setError("Ukuran gambar maksimal 10 MB.");
      return;
    }

    stopCamera();

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setSource("gallery");
    setResult(null);
    setError("");
    setZoom(1);
  };

  const resetImage = () => {
    stopCamera();

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setFile(null);
    setPreview("");
    setResult(null);
    setError("");
    setZoom(1);

    if (galleryRef.current) {
      galleryRef.current.value = "";
    }
  };

  const zoomIn = () => {
    setZoom((currentZoom) =>
      Math.min(Number((currentZoom + 0.25).toFixed(2)), 3),
    );
  };

  const zoomOut = () => {
    setZoom((currentZoom) =>
      Math.max(Number((currentZoom - 0.25).toFixed(2)), 0.5),
    );
  };

  const resetZoom = () => {
    setZoom(1);
  };

  const runPrediction = async () => {
    if (!file) {
      setError("Ambil atau pilih gambar buah sawit terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await predictPalmImage(file, source);

      setResult(response);
    } catch (requestError) {
      setError(
        requestError.message || "Klasifikasi gagal. Silakan coba kembali.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="prediction-page">
      <section className="prediction-hero">
        <div>
          <span>Klasifikasi AI</span>
          <h1>Periksa kematangan buah sawit</h1>
          <p>
            Ambil foto atau pilih gambar. Ikuti petunjuk agar hasil lebih mudah
            dipahami.
          </p>
        </div>

        <div className="prediction-hero-icon">📷</div>
      </section>

      <section className="prediction-guide">
        <header>
          <span>Petunjuk penggunaan</span>
          <h2>Cukup tiga langkah</h2>
        </header>

        <div className="prediction-steps">
          <article>
            <b>1</b>
            <div>
              <h3>Foto buah sawit</h3>
              <p>Pastikan buah terlihat besar, jelas, dan tidak buram.</p>
            </div>
          </article>

          <article>
            <b>2</b>
            <div>
              <h3>Periksa pencahayaan</h3>
              <p>Gunakan tempat terang dan hindari bayangan berlebihan.</p>
            </div>
          </article>

          <article>
            <b>3</b>
            <div>
              <h3>Tekan klasifikasi</h3>
              <p>Tunggu sampai hasil tingkat kematangan muncul.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="prediction-layout">
        <div className="prediction-card">
          <header>
            <span>Masukkan gambar</span>
            <h2>Pilih cara mengambil foto</h2>
          </header>

          <div className="prediction-source-buttons">
            <button
              type="button"
              onClick={openCamera}
              disabled={loading || isOpeningCamera}
            >
              <i>📸</i>
              <strong>
                {isOpeningCamera ? "Membuka kamera..." : "Buka Kamera"}
              </strong>
              <small>Mengutamakan kamera belakang</small>
            </button>

            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              disabled={loading}
            >
              <i>🖼️</i>
              <strong>Pilih Galeri</strong>
              <small>Gunakan gambar yang sudah ada</small>
            </button>
          </div>

          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            hidden
            onChange={chooseFile}
          />

          {isCameraOpen && (
            <section className="prediction-camera-panel">
              <video ref={videoRef} autoPlay playsInline muted />

              <canvas ref={canvasRef} hidden />

              <div className="prediction-camera-actions">
                <button type="button" onClick={stopCamera}>
                  Tutup kamera
                </button>

                <button type="button" onClick={capturePhoto}>
                  📸 Ambil Foto
                </button>
              </div>
            </section>
          )}

          {!isCameraOpen && (
            <div className={`prediction-preview ${preview ? "filled" : ""}`}>
              {preview ? (
                <>
                  <div className="prediction-preview-viewport">
                    <img
                      src={preview}
                      alt="Pratinjau buah kelapa sawit"
                      style={{
                        transform: `scale(${zoom})`,
                      }}
                    />
                  </div>

                  <div className="prediction-preview-toolbar">
                    <div className="prediction-zoom-controls">
                      <button
                        type="button"
                        onClick={zoomOut}
                        disabled={zoom <= 0.5}
                        aria-label="Perkecil gambar"
                        title="Zoom out"
                      >
                        −
                      </button>

                      <span>{Math.round(zoom * 100)}%</span>

                      <button
                        type="button"
                        onClick={zoomIn}
                        disabled={zoom >= 3}
                        aria-label="Perbesar gambar"
                        title="Zoom in"
                      >
                        +
                      </button>

                      <button
                        type="button"
                        onClick={resetZoom}
                        disabled={zoom === 1}
                        className="prediction-zoom-reset"
                      >
                        Reset
                      </button>
                    </div>

                    <button
                      type="button"
                      className="prediction-change-image"
                      onClick={resetImage}
                    >
                      Ganti gambar
                    </button>
                  </div>
                </>
              ) : (
                <div>
                  <span>🌴</span>
                  <strong>Belum ada gambar</strong>
                  <p>Tekan tombol kamera atau galeri di atas.</p>
                </div>
              )}
            </div>
          )}

          {file && !isCameraOpen && (
            <div className="prediction-file-info">
              <span>{file.name}</span>
              <strong>{(file.size / 1024 / 1024).toFixed(2)} MB</strong>
            </div>
          )}

          {error && <div className="prediction-error">⚠️ {error}</div>}

          <button
            type="button"
            className="prediction-submit"
            onClick={runPrediction}
            disabled={!file || loading || isCameraOpen}
          >
            {loading ? "Sedang menganalisis..." : "✨ Klasifikasikan Sekarang"}
          </button>

          {result && (
            <section className="prediction-result">
              <header>
                <div>
                  <span>Hasil klasifikasi</span>
                  <h2>Analisis selesai</h2>
                </div>

                <b>✓</b>
              </header>

              <div className="prediction-result-main">
                <article>
                  <i>{info.icon}</i>

                  <div>
                    <small>Tingkat kematangan</small>
                    <h3>{info.label}</h3>
                    <p>{info.description}</p>
                  </div>
                </article>

                <article className="prediction-confidence">
                  <small>Keyakinan AI</small>
                  <strong>{confidence.toFixed(2)}%</strong>

                  <div>
                    <span
                      style={{
                        width: `${Math.min(Math.max(confidence, 0), 100)}%`,
                      }}
                    />
                  </div>
                </article>
              </div>

              <div className="prediction-probabilities">
                {Object.entries(CLASS_INFO).map(([key, classInfo]) => (
                  <article key={key}>
                    <span>
                      {classInfo.icon} {classInfo.label}
                    </span>

                    <strong>{toPercent(probabilities[key]).toFixed(2)}%</strong>
                  </article>
                ))}
              </div>

              <div className="prediction-actions">
                <button type="button" onClick={resetImage}>
                  Periksa gambar lain
                </button>

                <button type="button" onClick={onOpenHistory}>
                  Lihat riwayat
                </button>
              </div>
            </section>
          )}
        </div>

        <aside className="prediction-tips">
          <article>
            <span>☀️</span>
            <div>
              <h3>Cahaya cukup</h3>
              <p>Foto di tempat terang, tetapi jangan terlalu silau.</p>
            </div>
          </article>

          <article>
            <span>🎯</span>
            <div>
              <h3>Fokus pada buah</h3>
              <p>Usahakan buah memenuhi sebagian besar gambar.</p>
            </div>
          </article>

          <article>
            <span>🧼</span>
            <div>
              <h3>Bersihkan kamera</h3>
              <p>Lensa yang kotor dapat membuat foto terlihat berkabut.</p>
            </div>
          </article>

          <div className="prediction-warning">
            <strong>Perhatian</strong>
            <p>
              Gunakan gambar buah kelapa sawit. Gambar benda lain dapat
              menghasilkan klasifikasi yang tidak sesuai.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default PredictionPage;
