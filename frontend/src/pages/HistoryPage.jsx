import { useEffect, useMemo, useRef, useState } from "react";
import { downloadMyPredictionReport } from "../services/reportApi";
import {
  deletePrediction,
  getPredictionDetail,
  getPredictionStats,
  getPredictions,
  updatePredictionLocationLabel,
} from "../services/api";

const CLASS_META = {
  belum_masak: {
    label: "Belum Masak",
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

const TBS_CLASS_LABELS = {
  belum_masak: "Belum Matang",
  masak: "Matang",
  terlalu_masak: "Terlalu Matang",
};

function normalizeClassName(value = "") {
  return String(value).trim().toLowerCase().replace(/\s+/g, "_");
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatConfidence(value) {
  const numberValue = Number(value || 0);

  if (!Number.isFinite(numberValue)) {
    return "0.00";
  }

  return (numberValue <= 1 ? numberValue * 100 : numberValue).toFixed(2);
}

function formatClassLabel(value) {
  const normalized = normalizeClassName(value);

  if (CLASS_META[normalized]) {
    return CLASS_META[normalized].label;
  }

  return normalized
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "Tidak diketahui";
}

function formatInputSource(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "camera") return "Kamera";
  if (normalized === "gallery") return "Galeri";
  if (normalized === "web_upload") return "Unggah web";

  return value || "Tidak diketahui";
}

function formatFileSize(value) {
  const bytes = Number(value);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "";
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function getValidCoordinate(value, minimum, maximum) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const coordinate = Number(value);
  return Number.isFinite(coordinate) &&
    coordinate >= minimum &&
    coordinate <= maximum
    ? coordinate
    : null;
}

function toSafeCount(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0
    ? Math.trunc(number)
    : fallback;
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
  const detailRequestRef = useRef(0);
  const [historyItems, setHistoryItems] = useState([]);
  const [stats, setStats] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("all");

  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [predictionDetail, setPredictionDetail] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [failedDetailImages, setFailedDetailImages] = useState({});
  const [isEditingLocationLabel, setIsEditingLocationLabel] = useState(false);
  const [locationLabelDraft, setLocationLabelDraft] = useState("");
  const [isSavingLocationLabel, setIsSavingLocationLabel] = useState(false);
  const [locationLabelError, setLocationLabelError] = useState("");

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

  useEffect(() => {
    if (!selectedHistoryItem) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        detailRequestRef.current += 1;
        setSelectedHistoryItem(null);
        setPredictionDetail(null);
        setDetailError("");
        setIsDetailLoading(false);
        setFailedDetailImages({});
        setIsEditingLocationLabel(false);
        setLocationLabelDraft("");
        setIsSavingLocationLabel(false);
        setLocationLabelError("");
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [selectedHistoryItem]);

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

  const closePredictionDetail = () => {
    detailRequestRef.current += 1;
    setSelectedHistoryItem(null);
    setPredictionDetail(null);
    setDetailError("");
    setIsDetailLoading(false);
    setFailedDetailImages({});
    setIsEditingLocationLabel(false);
    setLocationLabelDraft("");
    setIsSavingLocationLabel(false);
    setLocationLabelError("");
  };

  const openPredictionDetail = async (item) => {
    const recordId = item?.id || item?.record_id;

    if (!recordId || deletingId === recordId) {
      return;
    }

    const requestId = detailRequestRef.current + 1;
    detailRequestRef.current = requestId;
    setSelectedHistoryItem(item);
    setPredictionDetail(null);
    setDetailError("");
    setFailedDetailImages({});
    setIsEditingLocationLabel(false);
    setLocationLabelDraft("");
    setIsSavingLocationLabel(false);
    setLocationLabelError("");
    setIsDetailLoading(true);

    try {
      const response = await getPredictionDetail(recordId);

      if (detailRequestRef.current !== requestId) {
        return;
      }

      const detail = response?.data || response?.prediction || response;
      setPredictionDetail(detail);
    } catch (error) {
      if (detailRequestRef.current !== requestId) {
        return;
      }

      setDetailError(
        error.message || "Detail riwayat prediksi gagal dimuat.",
      );
    } finally {
      if (detailRequestRef.current === requestId) {
        setIsDetailLoading(false);
      }
    }
  };

  const retryPredictionDetail = () => {
    if (selectedHistoryItem) {
      openPredictionDetail(selectedHistoryItem);
    }
  };

  const startEditingLocationLabel = () => {
    setLocationLabelDraft(
      String(predictionDetail?.location?.label || ""),
    );
    setLocationLabelError("");
    setIsEditingLocationLabel(true);
  };

  const cancelEditingLocationLabel = () => {
    setLocationLabelDraft("");
    setLocationLabelError("");
    setIsEditingLocationLabel(false);
  };

  const saveLocationLabel = async (event) => {
    event.preventDefault();

    const recordId = predictionDetail?.id || predictionDetail?.record_id;
    if (!recordId || isSavingLocationLabel) {
      return;
    }

    setIsSavingLocationLabel(true);
    setLocationLabelError("");

    try {
      const response = await updatePredictionLocationLabel(
        recordId,
        locationLabelDraft,
      );
      const updatedLocation = response?.location || {};

      setPredictionDetail((current) => ({
        ...current,
        location: {
          ...(current?.location || {}),
          auto_name:
            updatedLocation.auto_name ??
            current?.location?.auto_name ??
            null,
          label: updatedLocation.label ?? null,
        },
      }));
      setLocationLabelDraft("");
      setIsEditingLocationLabel(false);
    } catch (error) {
      setLocationLabelError(
        error.message || "Nama lokasi gagal disimpan.",
      );
    } finally {
      setIsSavingLocationLabel(false);
    }
  };

  const handleCardKeyDown = (event, item) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPredictionDetail(item);
    }
  };

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

  const totalImages = toSafeCount(
    stats?.image_stats?.total_images,
    toSafeCount(
      stats?.total_predictions ?? stats?.total,
      historyItems.length,
    ),
  );
  const tbsStats = stats?.tbs_stats;
  const totalTbs = toSafeCount(tbsStats?.total_tbs);
  const tbsByClass = tbsStats?.by_class ?? {};
  const coverage = tbsStats?.coverage;
  const imagesWithDetectionDetails = toSafeCount(
    coverage?.images_with_detection_details,
  );
  const areTbsDetailsUnavailable =
    totalImages > 0 && imagesWithDetectionDetails === 0;
  const imagesWithoutDetectionDetails = toSafeCount(
    coverage?.images_without_detection_details,
    Math.max(totalImages - imagesWithDetectionDetails, 0),
  );
  const rawCoveragePercentage = Number(coverage?.coverage_percentage);
  const coveragePercentage = Number.isFinite(rawCoveragePercentage)
    ? Math.min(Math.max(rawCoveragePercentage, 0), 100)
    : totalImages > 0
      ? (imagesWithDetectionDetails / totalImages) * 100
      : 0;
  const formattedCoveragePercentage = new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(coveragePercentage);
  let coverageMessage = "";

  if (totalImages > 0 && (!tbsStats || areTbsDetailsUnavailable)) {
    coverageMessage = "Detail TBS belum tersedia untuk riwayat ini.";
  } else if (
    totalImages > 0 &&
    (imagesWithoutDetectionDetails > 0 || coveragePercentage < 100)
  ) {
    coverageMessage =
      `Detail TBS tersedia untuk ${imagesWithDetectionDetails} dari ` +
      `${totalImages} foto (${formattedCoveragePercentage}%). ` +
      "Statistik TBS dihitung dari hasil yang memiliki detail multi-deteksi.";
  }

  const detailRecord = predictionDetail;
  const detailClassName = normalizeClassName(detailRecord?.predicted_class);
  const detailClassMeta = CLASS_META[detailClassName] || {
    label: formatClassLabel(detailClassName),
    icon: "🌴",
  };
  const detailProbabilities = detailRecord?.probabilities || {};
  const detailDetections = Array.isArray(detailRecord?.detections)
    ? detailRecord.detections
    : [];
  const hasDetectionAvailabilityFlag =
    typeof detailRecord?.detection_details_available === "boolean";
  const hasPersistentDetectionData = hasDetectionAvailabilityFlag
    ? detailRecord.detection_details_available
    : Boolean(detailRecord?.summary || detailDetections.length > 0);
  const detectionCountFallback = detailDetections.reduce(
    (counts, detection) => {
      const className = normalizeClassName(detection?.predicted_class);

      if (Object.hasOwn(counts, className)) {
        counts[className] += 1;
      }

      return counts;
    },
    {
      belum_masak: 0,
      masak: 0,
      terlalu_masak: 0,
    },
  );
  const detailSummary = {
    total: toSafeCount(
      detailRecord?.summary?.total_detections,
      detailDetections.length,
    ),
    byClass: {
      belum_masak: toSafeCount(
        detailRecord?.summary?.by_class?.belum_masak,
        detectionCountFallback.belum_masak,
      ),
      masak: toSafeCount(
        detailRecord?.summary?.by_class?.masak,
        detectionCountFallback.masak,
      ),
      terlalu_masak: toSafeCount(
        detailRecord?.summary?.by_class?.terlalu_masak,
        detectionCountFallback.terlalu_masak,
      ),
    },
  };
  const detailImageCandidates = [
    detailRecord?.image_processed_url,
    detailRecord?.image_thumbnail_url,
    detailRecord?.image_original_url,
    selectedHistoryItem?.image_processed_url,
    selectedHistoryItem?.image_thumbnail_url,
    selectedHistoryItem?.image_original_url,
  ].filter(
    (url, index, values) =>
      url && values.indexOf(url) === index && !failedDetailImages[url],
  );
  const detailImageUrl = detailImageCandidates[0] || "";
  const detailLocation = detailRecord?.location || {};
  const detailLatitude = getValidCoordinate(
    detailLocation.latitude,
    -90,
    90,
  );
  const detailLongitude = getValidCoordinate(
    detailLocation.longitude,
    -180,
    180,
  );
  const hasDetailLocation =
    detailLocation.available === true &&
    detailLatitude !== null &&
    detailLongitude !== null;
  const locationAccuracy = Number(detailLocation.accuracy_meters);
  const hasLocationAccuracy =
    detailLocation.accuracy_meters !== null &&
    detailLocation.accuracy_meters !== undefined &&
    detailLocation.accuracy_meters !== "" &&
    Number.isFinite(locationAccuracy) && locationAccuracy >= 0;
  const detailLocationLabel = String(detailLocation.label || "").trim();
  const detailLocationAutoName = String(
    detailLocation.auto_name || "",
  ).trim();
  const locationAccuracyQuality = !hasLocationAccuracy
    ? null
    : locationAccuracy <= 50
      ? { label: "Akurasi Tinggi", level: "high" }
      : locationAccuracy <= 500
        ? { label: "Akurasi Sedang", level: "medium" }
        : { label: "Akurasi Rendah", level: "low" };
  const locationMapUrl = hasDetailLocation
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${detailLatitude},${detailLongitude}`,
      )}`
    : "";

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

      <section
        className="history-statistics"
        aria-label="Statistik foto dan TBS"
      >
        <div className="history-stats history-stats-overview">
          <article>
            <span className="history-stat-icon" aria-hidden="true">
              📷
            </span>

            <div>
              <small>Foto Tersimpan</small>
              <strong>{totalImages}</strong>
            </div>
          </article>

          <article>
            <span className="history-stat-icon" aria-hidden="true">
              🌴
            </span>

            <div>
              <small>Total TBS</small>
              <strong>{areTbsDetailsUnavailable ? "—" : totalTbs}</strong>
            </div>
          </article>
        </div>

        <div className="history-stats history-stats-maturity">
          {Object.entries(CLASS_META).map(([className, meta]) => (
            <article key={className}>
              <span className="history-stat-icon" aria-hidden="true">
                {meta.icon}
              </span>

              <div>
                <small>{TBS_CLASS_LABELS[className] || meta.label}</small>
                <strong>
                  {areTbsDetailsUnavailable
                    ? "—"
                    : toSafeCount(tbsByClass?.[className]?.total)}
                  {!areTbsDetailsUnavailable && (
                    <span className="history-stat-unit"> TBS</span>
                  )}
                </strong>
              </div>
            </article>
          ))}
        </div>

        {coverageMessage && (
          <p className="history-coverage-note" role="note">
            <span aria-hidden="true">ⓘ</span>
            {coverageMessage}
          </p>
        )}
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
          aria-label="Filter ringkasan foto berdasarkan kelas"
        >
          <option value="all">Semua kelas</option>

          <option value="belum_masak">Belum Masak</option>

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
              <article
                key={item.id}
                className="history-card history-card-clickable"
                role="button"
                tabIndex={0}
                aria-haspopup="dialog"
                aria-label={`Lihat detail prediksi ${meta.label}`}
                onClick={() => openPredictionDetail(item)}
                onKeyDown={(event) => handleCardKeyDown(event, item)}
              >
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
                    <span className="history-view-detail">
                      Lihat detail <span aria-hidden="true">→</span>
                    </span>

                    <button
                      type="button"
                      className="history-delete-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDelete(item.id);
                      }}
                      onKeyDown={(event) => event.stopPropagation()}
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

      {selectedHistoryItem && (
        <div
          className="history-detail-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closePredictionDetail();
            }
          }}
        >
          <section
            className="history-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-detail-title"
          >
            <header className="history-detail-header">
              <div>
                <span className="history-eyebrow">Detail riwayat</span>
                <h2 id="history-detail-title">Hasil Prediksi</h2>
              </div>

              <button
                type="button"
                className="history-detail-close"
                onClick={closePredictionDetail}
                aria-label="Tutup detail riwayat"
              >
                ×
              </button>
            </header>

            <div className="history-detail-content">
              {isDetailLoading && (
                <div className="history-detail-loading" role="status">
                  <div className="history-spinner" />
                  <h3>Memuat detail...</h3>
                  <p>Data riwayat sedang diambil dari server.</p>
                </div>
              )}

              {!isDetailLoading && detailError && (
                <div className="history-detail-error" role="alert">
                  <h3>Detail tidak dapat dibuka</h3>
                  <p>{detailError}</p>
                  <div>
                    <button type="button" onClick={retryPredictionDetail}>
                      Coba lagi
                    </button>
                    <button type="button" onClick={closePredictionDetail}>
                      Tutup
                    </button>
                  </div>
                </div>
              )}

              {!isDetailLoading && !detailError && detailRecord && (
                <>
                  <figure className="history-detail-figure">
                    {detailImageUrl ? (
                      <img
                        src={detailImageUrl}
                        alt={`Gambar hasil ${detailClassMeta.label}`}
                        onError={() =>
                          setFailedDetailImages((current) => ({
                            ...current,
                            [detailImageUrl]: true,
                          }))
                        }
                      />
                    ) : (
                      <div className="history-detail-no-image">
                        <span>🌴</span>
                        <p>Gambar hasil tidak tersedia.</p>
                      </div>
                    )}
                  </figure>

                  <section className="history-detail-overview">
                    <div className="history-detail-class">
                      <span>{detailClassMeta.icon}</span>
                      <div>
                        <small>Ringkasan Kematangan Gambar</small>
                        <h3>{detailClassMeta.label}</h3>
                      </div>
                    </div>

                    <div className="history-detail-confidence">
                      <small>Keyakinan ringkasan</small>
                      <strong>
                        {formatConfidence(detailRecord.confidence)}%
                      </strong>
                    </div>
                  </section>

                  <div className="history-detail-probabilities">
                    {Object.entries(CLASS_META).map(([className, meta]) => (
                      <div key={className}>
                        <span>{meta.label}</span>
                        <strong>
                          {formatConfidence(
                            detailProbabilities[className],
                          )}
                          %
                        </strong>
                      </div>
                    ))}
                  </div>

                  <section className="history-detail-metadata">
                    <div>
                      <small>Tanggal dan waktu</small>
                      <strong>{formatDate(detailRecord.created_at)}</strong>
                    </div>
                    <div>
                      <small>Sumber gambar</small>
                      <strong>
                        {formatInputSource(detailRecord.input_source)}
                      </strong>
                    </div>
                    {detailRecord.image_width && detailRecord.image_height && (
                      <div>
                        <small>Ukuran gambar</small>
                        <strong>
                          {detailRecord.image_width} × {detailRecord.image_height}
                          px
                        </strong>
                      </div>
                    )}
                    {formatFileSize(detailRecord.file_size_bytes) && (
                      <div>
                        <small>Ukuran file</small>
                        <strong>
                          {formatFileSize(detailRecord.file_size_bytes)}
                        </strong>
                      </div>
                    )}
                  </section>

                  <section className="history-detail-location">
                    <div className="history-detail-section-heading">
                      <small>Metadata Lokasi</small>
                      <h3>Lokasi Pengambilan</h3>
                    </div>

                    {hasDetailLocation ? (
                      <>
                        {(detailLocationLabel || detailLocationAutoName) && (
                          <div className="history-detail-location-names">
                            {detailLocationLabel && (
                              <div>
                                <small>Lokasi</small>
                                <strong>{detailLocationLabel}</strong>
                              </div>
                            )}
                            {detailLocationAutoName &&
                              detailLocationAutoName !== detailLocationLabel && (
                                <div>
                                  <small>Perkiraan wilayah</small>
                                  <strong>{detailLocationAutoName}</strong>
                                </div>
                              )}
                          </div>
                        )}

                        <div className="history-detail-location-grid">
                          <div>
                            <small>Latitude</small>
                            <strong>{detailLatitude.toFixed(6)}</strong>
                          </div>
                          <div>
                            <small>Longitude</small>
                            <strong>{detailLongitude.toFixed(6)}</strong>
                          </div>
                          <div>
                            <small>Akurasi</small>
                            <strong>
                              {hasLocationAccuracy
                                ? `±${locationAccuracy.toFixed(1)} m`
                                : "Tidak tersedia"}
                            </strong>
                            {locationAccuracyQuality && (
                              <span
                                className={`history-detail-accuracy-quality is-${locationAccuracyQuality.level}`}
                              >
                                {locationAccuracyQuality.label}
                              </span>
                            )}
                          </div>
                          <div>
                            <small>Waktu capture lokasi</small>
                            <strong>
                              {detailLocation.captured_at
                                ? formatDate(detailLocation.captured_at)
                                : "Tidak tersedia"}
                            </strong>
                          </div>
                        </div>

                        {locationAccuracyQuality?.level === "low" && (
                          <p className="history-detail-location-precision-note">
                            Posisi perangkat kurang presisi. Periksa titik pada
                            peta.
                          </p>
                        )}

                        <a
                          className="history-detail-map-link"
                          href={locationMapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Lihat di Peta
                          <span aria-hidden="true">↗</span>
                        </a>
                      </>
                    ) : detailLocationLabel || detailLocationAutoName ? (
                      <div className="history-detail-location-names">
                        {detailLocationLabel && (
                          <div>
                            <small>Lokasi</small>
                            <strong>{detailLocationLabel}</strong>
                          </div>
                        )}
                        {detailLocationAutoName &&
                          detailLocationAutoName !== detailLocationLabel && (
                            <div>
                              <small>Perkiraan wilayah</small>
                              <strong>{detailLocationAutoName}</strong>
                            </div>
                          )}
                      </div>
                    ) : (
                      <p className="history-detail-location-empty">
                        Lokasi tidak tersedia untuk hasil ini.
                      </p>
                    )}

                    {isEditingLocationLabel ? (
                      <form
                        className="history-detail-location-editor"
                        onSubmit={saveLocationLabel}
                      >
                        <label htmlFor="history-location-label">
                          Nama lokasi
                        </label>
                        <input
                          id="history-location-label"
                          type="text"
                          maxLength={500}
                          value={locationLabelDraft}
                          onChange={(event) =>
                            setLocationLabelDraft(event.target.value)
                          }
                          placeholder={
                            detailLocationAutoName ||
                            "Contoh: Blok 7 Afdeling Timur"
                          }
                          disabled={isSavingLocationLabel}
                          autoFocus
                        />
                        <p>
                          Mengubah nama lokasi tidak mengubah koordinat GPS.
                          Kosongkan field untuk menghapus label manual.
                        </p>
                        {locationLabelError && (
                          <p
                            className="history-detail-location-edit-error"
                            role="alert"
                          >
                            {locationLabelError}
                          </p>
                        )}
                        <div>
                          <button
                            type="submit"
                            disabled={isSavingLocationLabel}
                          >
                            {isSavingLocationLabel
                              ? "Menyimpan..."
                              : "Simpan"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditingLocationLabel}
                            disabled={isSavingLocationLabel}
                          >
                            Batal
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        className="history-detail-location-edit-button"
                        onClick={startEditingLocationLabel}
                      >
                        Edit Nama Lokasi
                      </button>
                    )}
                  </section>

                  {hasPersistentDetectionData ? (
                    <section className="history-detail-summary">
                      <div className="history-detail-section-heading">
                        <small>Ringkasan Deteksi</small>
                        <h3>TBS pada Gambar</h3>
                      </div>

                      <div className="history-detail-total">
                        <span>Total TBS terdeteksi</span>
                        <strong>{detailSummary.total}</strong>
                      </div>

                      <div className="history-detail-count-grid">
                        {Object.entries(CLASS_META).map(
                          ([className, meta]) => (
                            <div key={className}>
                              <span>{meta.label}</span>
                              <strong>
                                {detailSummary.byClass[className]}
                              </strong>
                            </div>
                          ),
                        )}
                      </div>

                      {detailSummary.total === 0 && (
                        <p className="history-detail-zero">
                          Tidak ada TBS yang terdeteksi pada hasil ini.
                        </p>
                      )}
                    </section>
                  ) : (
                    <section className="history-detail-unavailable">
                      <h3>Detail per TBS belum tersedia</h3>
                      <p>
                        Hasil ini hanya menyimpan ringkasan kematangan gambar.
                        Data jumlah dan deteksi setiap TBS belum tersimpan pada
                        riwayat ini.
                      </p>
                    </section>
                  )}

                  {hasPersistentDetectionData &&
                    detailSummary.total > 0 &&
                    detailDetections.length === 0 && (
                      <section className="history-detail-unavailable">
                        <h3>Detail per TBS belum tersedia</h3>
                        <p>
                          Ringkasan jumlah TBS tersedia, tetapi rincian setiap
                          objek belum tersimpan pada riwayat ini.
                        </p>
                      </section>
                    )}

                  {detailDetections.length > 0 && (
                    <section className="history-detail-detections">
                      <div className="history-detail-section-heading">
                        <small>Detail Per Objek</small>
                        <h3>Hasil Setiap TBS</h3>
                      </div>

                      <div className="history-detail-detection-grid">
                        {detailDetections.map((detection, index) => {
                          const className = normalizeClassName(
                            detection?.predicted_class,
                          );
                          const bbox = Array.isArray(detection?.bbox)
                            ? detection.bbox
                            : null;
                          const probabilities = detection?.probabilities;

                          return (
                            <article
                              className={`history-detail-detection history-detail-detection-${className}`}
                              key={`${bbox?.join("-") || "tbs"}-${index}`}
                            >
                              <div className="history-detail-detection-head">
                                <h4>TBS {index + 1}</h4>
                                <span>{formatClassLabel(className)}</span>
                              </div>

                              <dl>
                                <div>
                                  <dt>Keyakinan Kematangan</dt>
                                  <dd>
                                    {formatConfidence(
                                      detection?.maturity_confidence,
                                    )}
                                    %
                                  </dd>
                                </div>
                                <div>
                                  <dt>Keyakinan Deteksi</dt>
                                  <dd>
                                    {formatConfidence(
                                      detection?.detector_confidence,
                                    )}
                                    %
                                  </dd>
                                </div>
                              </dl>

                              {probabilities &&
                                typeof probabilities === "object" && (
                                  <div className="history-detail-detection-probs">
                                    {Object.entries(CLASS_META).map(
                                      ([key, meta]) => (
                                        <div key={key}>
                                          <span>{meta.label}</span>
                                          <strong>
                                            {formatConfidence(
                                              probabilities[key],
                                            )}
                                            %
                                          </strong>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                )}

                              {bbox && (
                                <details>
                                  <summary>Koordinat bounding box</summary>
                                  <code>[{bbox.join(", ")}]</code>
                                </details>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {detailRecord.notes && (
                    <section className="history-detail-notes">
                      <small>Catatan</small>
                      <p>{detailRecord.notes}</p>
                    </section>
                  )}

                  {Array.isArray(detailRecord.warnings) &&
                    detailRecord.warnings.length > 0 && (
                      <section className="history-detail-warnings">
                        <strong>Catatan pemrosesan</strong>
                        <ul>
                          {detailRecord.warnings.map((warning, index) => (
                            <li key={index}>
                              {typeof warning === "string"
                                ? warning
                                : String(
                                    warning?.reason ||
                                      "Sebagian objek tidak dapat diproses",
                                  ).replaceAll("_", " ")}
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                  <p className="history-detail-record-id">
                    ID: {detailRecord.id || detailRecord.record_id || "-"}
                  </p>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default HistoryPage;
