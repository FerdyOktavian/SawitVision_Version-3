import { useEffect, useMemo, useState } from "react";
import { downloadMyPredictionReport } from "../services/reportApi";
import {
  deletePrediction,
  getPredictionStats,
  getPredictions,
} from "../services/api";

const CLASS_META = {
  belum_masak: {
    label: "Belum Matang",
    icon: "🟢",
  },
  masak: {
    label: "Matang",
    icon: "🟠",
  },
  terlalu_masak: {
    label: "Terlalu Matang",
    icon: "🔴",
  },
};

function normalizeClassName(value = "") {
  return String(value).trim().toLowerCase().replace(/\s+/g, "_");
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatConfidence(value) {
  const numberValue = Number(value || 0);

  if (!Number.isFinite(numberValue)) {
    return "0.00";
  }

  return (numberValue <= 1 ? numberValue * 100 : numberValue).toFixed(2);
}

function getHistoryItems(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  if (Array.isArray(response?.predictions)) {
    return response.predictions;
  }

  return [];
}

function HistoryPage({ onStartPrediction }) {
  const [historyItems, setHistoryItems] = useState([]);
  const [stats, setStats] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("all");

  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadHistory = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [historyResponse, statsResponse] = await Promise.all([
        getPredictions({
          limit: 100,
          offset: 0,
        }),
        getPredictionStats(),
      ]);

      setHistoryItems(getHistoryItems(historyResponse));

      setStats(statsResponse);
    } catch (error) {
      setErrorMessage(error.message || "Riwayat prediksi gagal dimuat.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    Promise.all([
      getPredictions({
        limit: 100,
        offset: 0,
      }),
      getPredictionStats(),
    ])
      .then(([historyResponse, statsResponse]) => {
        if (isCancelled) return;

        setHistoryItems(getHistoryItems(historyResponse));
        setStats(statsResponse);
      })
      .catch((error) => {
        if (isCancelled) return;

        setErrorMessage(error.message || "Riwayat prediksi gagal dimuat.");
      })
      .finally(() => {
        if (isCancelled) return;

        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return historyItems.filter((item) => {
      const className = normalizeClassName(item.predicted_class);

      const matchesClass = classFilter === "all" || className === classFilter;

      const searchableText = [
        CLASS_META[className]?.label || className,
        item.input_source,
        item.created_at,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch || searchableText.includes(normalizedSearch);

      return matchesClass && matchesSearch;
    });
  }, [historyItems, searchTerm, classFilter]);

  const handleDelete = async (recordId) => {
    const isConfirmed = window.confirm("Hapus riwayat prediksi ini?");

    if (!isConfirmed) {
      return;
    }

    setDeletingId(recordId);
    setErrorMessage("");

    try {
      await deletePrediction(recordId);

      setHistoryItems((previousItems) =>
        previousItems.filter((item) => item.id !== recordId),
      );

      const updatedStats = await getPredictionStats();

      setStats(updatedStats);
    } catch (error) {
      setErrorMessage(error.message || "Riwayat gagal dihapus.");
    } finally {
      setDeletingId("");
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setErrorMessage("");

    try {
      await downloadMyPredictionReport();
    } catch (error) {
      setErrorMessage(error.message || "Laporan Excel gagal diunduh.");
    } finally {
      setIsExporting(false);
    }
  };

  const totalPredictions =
    stats?.total_predictions ?? stats?.total ?? historyItems.length;

  const byClass = stats?.by_class ?? {};

  return (
    <main className="history-page">
      <section className="history-hero">
        <div>
          <span className="history-eyebrow">Riwayat pengguna</span>

          <h1>Hasil klasifikasi sebelumnya</h1>

          <p>
            Lihat kembali gambar, tingkat kematangan, dan keyakinan hasil
            prediksi yang pernah dilakukan.
          </p>
        </div>

        <button
          type="button"
          className="history-new-button"
          onClick={onStartPrediction}
        >
          <span>📷</span>
          Klasifikasi baru
        </button>
      </section>

      <section className="history-stats">
        <article>
          <span className="history-stat-icon">📊</span>

          <div>
            <small>Total prediksi</small>
            <strong>{totalPredictions}</strong>
          </div>
        </article>

        {Object.entries(CLASS_META).map(([className, meta]) => (
          <article key={className}>
            <span className="history-stat-icon">{meta.icon}</span>

            <div>
              <small>{meta.label}</small>
              <strong>
                {byClass?.[className]?.total ??
                  historyItems.filter(
                    (item) =>
                      normalizeClassName(item.predicted_class) === className,
                  ).length}
              </strong>
            </div>
          </article>
        ))}
      </section>

      <section className="history-toolbar">
        <div className="history-search">
          <span>🔎</span>

          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Cari hasil klasifikasi..."
          />
        </div>

        <select
          value={classFilter}
          onChange={(event) => setClassFilter(event.target.value)}
          aria-label="Filter kelas prediksi"
        >
          <option value="all">Semua kelas</option>

          <option value="belum_masak">Belum Matang</option>

          <option value="masak">Matang</option>

          <option value="terlalu_masak">Terlalu Matang</option>
        </select>

        <button
          type="button"
          className="history-refresh-button"
          onClick={loadHistory}
          disabled={isLoading}
        >
          ↻ Muat ulang
        </button>

        <button
          type="button"
          className="history-export-button"
          onClick={handleExport}
          disabled={isLoading || isExporting || historyItems.length === 0}
        >
          {isExporting ? "⏳ Membuat laporan..." : "⬇️ Export Laporan Excel"}
        </button>
      </section>

      {errorMessage && <div className="history-alert">⚠️ {errorMessage}</div>}

      {isLoading ? (
        <section className="history-loading">
          <div className="history-spinner" />
          <h2>Memuat riwayat...</h2>
          <p>Tunggu sebentar, data sedang diambil.</p>
        </section>
      ) : filteredItems.length === 0 ? (
        <section className="history-empty">
          <div>🌱</div>
          <h2>Belum ada riwayat</h2>
          <p>
            Mulai klasifikasi buah sawit agar hasilnya tersimpan dan tampil di
            halaman ini.
          </p>

          <button type="button" onClick={onStartPrediction}>
            Mulai klasifikasi
          </button>
        </section>
      ) : (
        <section className="history-grid">
          {filteredItems.map((item) => {
            const className = normalizeClassName(item.predicted_class);

            const meta = CLASS_META[className] || {
              label: item.predicted_class || "Tidak diketahui",
              icon: "🌴",
            };

            const imageUrl =
              item.image_thumbnail_url || item.image_processed_url;

            return (
              <article key={item.id} className="history-card">
                <div className="history-card-image">
                  {imageUrl ? (
                    <img src={imageUrl} alt={`Hasil ${meta.label}`} />
                  ) : (
                    <div className="history-no-image">
                      <span>🌴</span>
                      <small>Gambar tidak tersedia</small>
                    </div>
                  )}

                  <span className="history-card-badge">
                    {meta.icon} {meta.label}
                  </span>
                </div>

                <div className="history-card-body">
                  <div className="history-card-heading">
                    <div>
                      <small>Tingkat kematangan</small>
                      <h3>{meta.label}</h3>
                    </div>

                    <strong>{formatConfidence(item.confidence)}%</strong>
                  </div>

                  <div className="history-confidence-track">
                    <span
                      style={{
                        width: `${Math.min(
                          Math.max(
                            Number(formatConfidence(item.confidence)),
                            0,
                          ),
                          100,
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="history-card-meta">
                    <span>📅 {formatDate(item.created_at)}</span>

                    <span>
                      {item.input_source === "camera"
                        ? "📸 Kamera"
                        : "🖼️ Galeri"}
                    </span>
                  </div>

                  <div className="history-card-actions">
                    <button
                      type="button"
                      className="history-delete-button"
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                    >
                      {deletingId === item.id ? "Menghapus..." : "🗑️ Hapus"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

export default HistoryPage;
