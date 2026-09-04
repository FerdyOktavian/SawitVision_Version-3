import { useEffect, useMemo, useRef, useState } from "react";
import { predictPalmImage } from "../services/api";

const MAX_ZOOM = 5;
const MIN_ZOOM = 1;
const ZOOM_STEP = 0.2;

const CLASS_INFO = {
  belum_masak: {
    label: "Belum Matang",
    icon: "🟢",
    status: "Belum siap dipanen",
    description:
      "Buah belum mencapai tingkat kematangan optimal untuk dipanen.",
    recommendation:
      "Lakukan pemeriksaan kembali setelah buah menunjukkan perubahan warna dan ciri kematangan yang lebih jelas.",
  },
  masak: {
    label: "Matang",
    icon: "🟠",
    status: "Siap dipanen",
    description:
      "Buah berada pada tingkat kematangan yang sesuai untuk dipanen.",
    recommendation:
      "Buah dapat diprioritaskan untuk proses panen sesuai kondisi lapangan.",
  },
  terlalu_masak: {
    label: "Terlalu Matang",
    icon: "🔴",
    status: "Melewati kematangan optimal",
    description: "Buah telah melewati tingkat kematangan optimal.",
    recommendation:
      "Buah sebaiknya segera ditangani agar keterlambatan panen tidak semakin bertambah.",
  },
};

function toPercent(value) {
  const number = Number(value || 0);
  return number <= 1 ? number * 100 : number;
}

function normalizeClassName(value = "") {
  return String(value).trim().toLowerCase().replace(/\s+/g, "_");
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

  const [mode, setMode] = useState("camera");
  const [cameraActive, setCameraActive] = useState(false);
  const [isOpeningCamera, setIsOpeningCamera] = useState(false);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [source, setSource] = useState("camera");

  const [zoom, setZoom] = useState(1);

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const resultClass = useMemo(() => {
    const value =
      result?.predicted_class ||
      result?.prediction ||
      result?.result?.predicted_class ||
      "";

    return normalizeClassName(value);
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
    status: "Hasil klasifikasi",
    description: "Hasil klasifikasi berhasil diperoleh dari sistem.",
    recommendation:
      "Gunakan hasil klasifikasi sebagai informasi pendukung pemeriksaan.",
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setIsOpeningCamera(false);
  };

  const clearPreviewUrl = () => {
    if (preview?.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
  };

  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const resetZoom = () => {
    setZoom(1);
  };

  const zoomIn = () => {
    setZoom((previous) =>
      Math.min(Number((previous + ZOOM_STEP).toFixed(1)), MAX_ZOOM),
    );
  };

  const zoomOut = () => {
    setZoom((previous) =>
      Math.max(Number((previous - ZOOM_STEP).toFixed(1)), MIN_ZOOM),
    );
  };

  const switchMode = (selectedMode) => {
    stopCamera();
    clearPreviewUrl();

    setMode(selectedMode);
    setFile(null);
    setPreview("");
    setSource(selectedMode);
    setResult(null);
    setError("");
    setLoading(false);
    resetZoom();

    if (galleryRef.current) {
      galleryRef.current.value = "";
    }
  };

  const openCamera = async () => {
    setError("");
    setResult(null);
    setIsOpeningCamera(true);
    clearPreviewUrl();
    setFile(null);
    setPreview("");
    setSource("camera");
    resetZoom();

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Browser ini belum mendukung kamera langsung. Gunakan mode Galeri.",
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
      setCameraActive(true);
      setIsOpeningCamera(false);

      window.requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch (cameraError) {
      setCameraActive(false);
      setIsOpeningCamera(false);

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

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    if (!videoWidth || !videoHeight) {
      setError("Kamera masih memuat. Tunggu sebentar lalu coba lagi.");
      return;
    }

    canvas.width = videoWidth;
    canvas.height = videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      setError("Gagal memproses hasil kamera.");
      return;
    }

    /*
      Zoom mengikuti perilaku V2:
      video diperbesar secara visual dan hasil capture juga dicrop
      ke bagian tengah sesuai nilai zoom.
    */
    const cropWidth = videoWidth / zoom;
    const cropHeight = videoHeight / zoom;
    const cropX = (videoWidth - cropWidth) / 2;
    const cropY = (videoHeight - cropHeight) / 2;

    context.drawImage(
      video,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      videoWidth,
      videoHeight,
    );

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const capturedFile = dataUrlToFile(dataUrl, `foto-sawit-${Date.now()}.jpg`);

    clearPreviewUrl();

    setFile(capturedFile);
    setPreview(URL.createObjectURL(capturedFile));
    setSource("camera");
    setResult(null);
    setError("");

    stopCamera();
  };

  const retakePhoto = async () => {
    clearPreviewUrl();

    setFile(null);
    setPreview("");
    setResult(null);
    setError("");
    resetZoom();

    if (mode === "camera") {
      await openCamera();
    }
  };

  const chooseFile = (event) => {
    const selected = event.target.files?.[0];

    if (!selected) {
      return;
    }

    if (!selected.type.startsWith("image/")) {
      setError("File yang dipilih harus berupa gambar.");
      event.target.value = "";
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setError("Ukuran gambar maksimal 10 MB.");
      event.target.value = "";
      return;
    }

    stopCamera();
    clearPreviewUrl();

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setSource("gallery");
    setResult(null);
    setError("");
    resetZoom();
  };

  const openGallery = () => {
    galleryRef.current?.click();
  };

  const resetInput = () => {
    stopCamera();
    clearPreviewUrl();

    setFile(null);
    setPreview("");
    setResult(null);
    setError("");
    setLoading(false);
    resetZoom();

    if (galleryRef.current) {
      galleryRef.current.value = "";
    }
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
    <main className="prediction-v2-page">
      <section className="prediction-v2-hero">
        <div className="prediction-v2-brand">
          <span className="prediction-v2-brand-icon">🌴</span>

          <div>
            <p className="prediction-v2-eyebrow">Pemeriksa Kematangan Sawit</p>
            <h1>Cek Kematangan Sawit</h1>
          </div>
        </div>

        <p className="prediction-v2-subtitle">
          Ambil foto atau pilih gambar untuk memeriksa tingkat kematangan buah
          kelapa sawit.
        </p>
      </section>

      <section className="prediction-v2-mode-switch">
        <button
          type="button"
          className={mode === "camera" ? "active" : ""}
          onClick={() => switchMode("camera")}
          disabled={loading}
        >
          Kamera
        </button>

        <button
          type="button"
          className={mode === "gallery" ? "active" : ""}
          onClick={() => switchMode("gallery")}
          disabled={loading}
        >
          Galeri
        </button>
      </section>

      <section className="prediction-v2-tips-card">
        <div className="prediction-v2-tips-icon">💡</div>

        <div>
          <b>Tips foto terbaik</b>
          <p>
            Pastikan buah terlihat jelas, cahaya cukup, dan objek berada di
            tengah kotak panduan.
          </p>
        </div>
      </section>

      <section className="prediction-v2-camera-card">
        <div className="prediction-v2-camera-frame">
          {!preview ? (
            mode === "camera" ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="prediction-v2-camera-media"
                  style={{
                    transform: `scale(${zoom})`,
                  }}
                />

                {!cameraActive && (
                  <div className="prediction-v2-camera-placeholder">
                    <span>📷</span>
                    <p>
                      {isOpeningCamera
                        ? "Membuka kamera..."
                        : "Kamera belum aktif"}
                    </p>
                  </div>
                )}

                <div className="prediction-v2-camera-guide" />

                <div className="prediction-v2-zoom-badge">
                  {zoom.toFixed(1)}x
                </div>
              </>
            ) : (
              <div className="prediction-v2-gallery-placeholder">
                <span>🖼️</span>
                <p>Belum ada foto dipilih</p>
              </div>
            )
          ) : (
            <img
              src={preview}
              alt="Hasil input buah kelapa sawit"
              className="prediction-v2-camera-media"
            />
          )}
        </div>

        {mode === "camera" && !preview && (
          <div className="prediction-v2-zoom-panel">
            <button
              type="button"
              onClick={zoomOut}
              disabled={!cameraActive || zoom <= MIN_ZOOM}
              aria-label="Zoom out"
            >
              −
            </button>

            <div className="prediction-v2-zoom-info">
              <span>Zoom</span>
              <b>{zoom.toFixed(1)}x</b>
            </div>

            <button
              type="button"
              onClick={zoomIn}
              disabled={!cameraActive || zoom >= MAX_ZOOM}
              aria-label="Zoom in"
            >
              +
            </button>

            <button
              type="button"
              className="prediction-v2-reset-zoom"
              onClick={resetZoom}
              disabled={!cameraActive || zoom === 1}
            >
              Reset
            </button>
          </div>
        )}

        {mode === "camera" ? (
          <div className="prediction-v2-button-grid">
            {preview ? (
              <button
                type="button"
                className="prediction-v2-secondary-btn"
                onClick={retakePhoto}
                disabled={loading}
              >
                Foto Ulang
              </button>
            ) : !cameraActive ? (
              <button
                type="button"
                className="prediction-v2-secondary-btn"
                onClick={openCamera}
                disabled={loading || isOpeningCamera}
              >
                {isOpeningCamera ? "Membuka..." : "Buka Kamera"}
              </button>
            ) : (
              <button
                type="button"
                className="prediction-v2-danger-btn"
                onClick={stopCamera}
                disabled={loading}
              >
                Tutup Kamera
              </button>
            )}

            {!preview ? (
              <button
                type="button"
                className="prediction-v2-primary-btn"
                onClick={capturePhoto}
                disabled={!cameraActive || loading}
              >
                Ambil Gambar
              </button>
            ) : (
              <button
                type="button"
                className="prediction-v2-primary-btn"
                onClick={runPrediction}
                disabled={loading}
              >
                {loading ? "Menganalisis..." : "Prediksi"}
              </button>
            )}
          </div>
        ) : (
          <div className="prediction-v2-button-grid">
            <button
              type="button"
              className="prediction-v2-secondary-btn"
              onClick={resetInput}
              disabled={loading}
            >
              Reset
            </button>

            <button
              type="button"
              className="prediction-v2-primary-btn"
              onClick={openGallery}
              disabled={loading}
            >
              {preview ? "Ganti Foto" : "Pilih Foto"}
            </button>
          </div>
        )}

        {mode === "camera" && preview && (
          <button
            type="button"
            className="prediction-v2-secondary-btn prediction-v2-full"
            onClick={resetInput}
            disabled={loading}
          >
            Reset
          </button>
        )}

        {mode === "gallery" && preview && (
          <button
            type="button"
            className="prediction-v2-primary-btn prediction-v2-full"
            onClick={runPrediction}
            disabled={loading}
          >
            {loading ? "Menganalisis..." : "Prediksi Sekarang"}
          </button>
        )}

        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          onChange={chooseFile}
          hidden
        />

        <canvas ref={canvasRef} hidden />

        {file && (
          <div className="prediction-v2-file-info">
            <span>{file.name}</span>
            <b>{(file.size / 1024 / 1024).toFixed(2)} MB</b>
          </div>
        )}

        {error && <div className="prediction-v2-error">⚠️ {error}</div>}
      </section>

      {loading && (
        <section className="prediction-v2-loading-card">
          <div className="prediction-v2-spinner" />
          <h2>Menganalisis Citra</h2>
          <p>Sistem sedang memeriksa tingkat kematangan buah kelapa sawit.</p>
        </section>
      )}

      {result && (
        <section
          className={`prediction-v2-result-card prediction-v2-result-${resultClass}`}
        >
          <div className="prediction-v2-result-top">
            <div className="prediction-v2-result-icon">{info.icon}</div>

            <div>
              <p className="prediction-v2-result-label">Hasil Prediksi</p>
              <h2>{info.label}</h2>
            </div>
          </div>

          <div className="prediction-v2-status-pill">{info.status}</div>

          <div className="prediction-v2-confidence-box">
            <span>Confidence</span>
            <b>{confidence.toFixed(2)}%</b>
            <small>Tingkat keyakinan model terhadap hasil klasifikasi.</small>
          </div>

          <div className="prediction-v2-scan-meta">
            <span>📅 {new Date().toLocaleDateString("id-ID")}</span>
            <span>📷 {source === "camera" ? "Kamera" : "Galeri"}</span>
          </div>

          <div className="prediction-v2-recommendation-box">
            <b>Keterangan</b>
            <p>{info.description}</p>
          </div>

          <div className="prediction-v2-recommendation-box">
            <b>Saran</b>
            <p>{info.recommendation}</p>
          </div>

          <div className="prediction-v2-prob-list">
            {Object.entries(CLASS_INFO).map(([key, classInfo]) => {
              const percent = toPercent(probabilities[key]);

              return (
                <div className="prediction-v2-prob-bar-item" key={key}>
                  <div className="prediction-v2-prob-bar-top">
                    <span>
                      {classInfo.icon} {classInfo.label}
                    </span>
                    <b>{percent.toFixed(2)}%</b>
                  </div>

                  <div className="prediction-v2-prob-track">
                    <div
                      className="prediction-v2-prob-fill"
                      style={{
                        width: `${Math.min(Math.max(percent, 0), 100)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="prediction-v2-result-actions">
            <button type="button" onClick={resetInput}>
              Periksa gambar lain
            </button>

            <button type="button" onClick={onOpenHistory}>
              Lihat riwayat
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

export default PredictionPage;
