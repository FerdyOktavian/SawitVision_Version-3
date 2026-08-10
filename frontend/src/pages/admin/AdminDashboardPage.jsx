import { useEffect, useMemo, useState } from "react";
import {
  cleanupActivityLogs,
  cleanupStorage,
  downloadAdminPredictionReport,
  getAdminActivityLogs,
  getAdminStats,
  getAdminStorageStats,
  getAdminUsers,
  updateAdminUserStatus,
} from "../../services/api";

const CLASS_META = {
  belum_masak: {
    label: "Belum Masak",
    icon: "🟢",
  },
  masak: {
    label: "Masak",
    icon: "🟠",
  },
  terlalu_masak: {
    label: "Terlalu Masak",
    icon: "🔴",
  },
};

const MENU = [
  {
    id: "overview",
    icon: "🧭",
    label: "Ringkasan",
  },
  {
    id: "users",
    icon: "👥",
    label: "Pengguna",
  },
  {
    id: "predictions",
    icon: "📊",
    label: "Prediksi",
  },
  {
    id: "activity",
    icon: "🧾",
    label: "Aktivitas",
  },
  {
    id: "storage",
    icon: "🗂️",
    label: "Storage",
  },
  {
    id: "reports",
    icon: "📄",
    label: "Laporan",
  },
];

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatConfidence(value) {
  const number = Number(value || 0);
  const percentage = number <= 1 ? number * 100 : number;
  return `${percentage.toFixed(2)}%`;
}

function AdminDashboardPage({ currentUser }) {
  const [activeTab, setActiveTab] = useState("overview");

  const [stats, setStats] = useState(null);
  const [storageStats, setStorageStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  const [usersSearch, setUsersSearch] = useState("");
  const [activitySearch, setActivitySearch] = useState("");

  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [isLoadingStorage, setIsLoadingStorage] = useState(false);

  const [actionUserId, setActionUserId] = useState("");
  const [isCleaningStorage, setIsCleaningStorage] = useState(false);
  const [isCleaningLogs, setIsCleaningLogs] = useState(false);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [reportFilter, setReportFilter] = useState({
    start_date: "",
    end_date: "",
    predicted_class: "",
  });

  const isAdmin =
    currentUser?.role === "admin";

  const loadStats = async () => {
    setIsLoadingStats(true);
    setErrorMessage("");

    try {
      const response = await getAdminStats();
      setStats(response);
    } catch (error) {
      setErrorMessage(
        error.message ||
          "Statistik admin gagal dimuat."
      );
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    setErrorMessage("");

    try {
      const response = await getAdminUsers({
        limit: 100,
        offset: 0,
        search: usersSearch.trim(),
      });

      setUsers(response?.data || []);
    } catch (error) {
      setErrorMessage(
        error.message ||
          "Daftar pengguna gagal dimuat."
      );
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadActivity = async () => {
    setIsLoadingActivity(true);
    setErrorMessage("");

    try {
      const response = await getAdminActivityLogs({
        page: 1,
        pageSize: 100,
        search: activitySearch.trim(),
      });

      setActivityLogs(response?.data || []);
    } catch (error) {
      setErrorMessage(
        error.message ||
          "Aktivitas sistem gagal dimuat."
      );
    } finally {
      setIsLoadingActivity(false);
    }
  };

  const loadStorage = async () => {
    setIsLoadingStorage(true);
    setErrorMessage("");

    try {
      const response = await getAdminStorageStats();
      setStorageStats(response);
    } catch (error) {
      setErrorMessage(
        error.message ||
          "Informasi storage gagal dimuat."
      );
    } finally {
      setIsLoadingStorage(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    loadStats();
    loadStorage();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    if (activeTab === "users") {
      loadUsers();
    }

    if (activeTab === "activity") {
      loadActivity();
    }

    if (activeTab === "storage") {
      loadStorage();
    }
  }, [activeTab]);

  const predictionByClass =
    stats?.predictions?.by_class || {};

  const recentPredictions =
    stats?.predictions?.recent || [];

  const totalUsers =
    stats?.users?.total || 0;

  const activeUsers =
    stats?.users?.active || 0;

  const totalPredictions =
    stats?.predictions?.total || 0;

  const totalLogs =
    stats?.activity_logs?.total || 0;

  const storagePercentage =
    Number(
      storageStats?.usage?.percentage || 0
    );

  const storageStatusLabel = useMemo(() => {
    if (storageStats?.status === "critical") {
      return "Kritis";
    }

    if (storageStats?.status === "warning") {
      return "Perlu perhatian";
    }

    return "Aman";
  }, [storageStats]);

  const handleUserStatus = async (user) => {
    const nextStatus = !user.is_active;

    const confirmation = window.confirm(
      nextStatus
        ? `Aktifkan akun ${user.name}?`
        : `Nonaktifkan akun ${user.name}?`
    );

    if (!confirmation) return;

    setActionUserId(user.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await updateAdminUserStatus(
        user.id,
        nextStatus
      );

      setUsers((current) =>
        current.map((item) =>
          item.id === user.id
            ? {
                ...item,
                is_active: nextStatus,
              }
            : item
        )
      );

      setSuccessMessage(
        `Status akun ${user.name} berhasil diperbarui.`
      );

      loadStats();
    } catch (error) {
      setErrorMessage(
        error.message ||
          "Status pengguna gagal diperbarui."
      );
    } finally {
      setActionUserId("");
    }
  };

  const handleStorageCleanup = async () => {
    const confirmation = window.confirm(
      "Bersihkan gambar prediksi lama dari storage? Record prediksi tetap disimpan."
    );

    if (!confirmation) return;

    setIsCleaningStorage(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await cleanupStorage(10);

      setSuccessMessage(
        response?.message ||
          "Storage berhasil dibersihkan."
      );

      await Promise.all([
        loadStorage(),
        loadStats(),
      ]);
    } catch (error) {
      setErrorMessage(
        error.message ||
          "Cleanup storage gagal."
      );
    } finally {
      setIsCleaningStorage(false);
    }
  };

  const handleActivityCleanup = async () => {
    const confirmation = window.confirm(
      "Hapus activity log yang lebih lama dari 90 hari?"
    );

    if (!confirmation) return;

    setIsCleaningLogs(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response =
        await cleanupActivityLogs(90);

      setSuccessMessage(
        response?.message ||
          "Activity log lama berhasil dibersihkan."
      );

      await Promise.all([
        loadActivity(),
        loadStats(),
      ]);
    } catch (error) {
      setErrorMessage(
        error.message ||
          "Activity log gagal dibersihkan."
      );
    } finally {
      setIsCleaningLogs(false);
    }
  };

  const handleDownloadReport = async () => {
    setIsDownloadingReport(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await downloadAdminPredictionReport({
        startDate:
          reportFilter.start_date || undefined,
        endDate:
          reportFilter.end_date || undefined,
        predictedClass:
          reportFilter.predicted_class ||
          undefined,
      });

      setSuccessMessage(
        "Laporan Excel berhasil diunduh."
      );
    } catch (error) {
      setErrorMessage(
        error.message ||
          "Laporan gagal diunduh."
      );
    } finally {
      setIsDownloadingReport(false);
    }
  };

  if (!isAdmin) {
    return (
      <main className="admin-page">
        <section className="admin-access-denied">
          <div>🔒</div>
          <h1>Akses admin diperlukan</h1>
          <p>
            Halaman ini hanya dapat dibuka oleh
            akun dengan peran administrator.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <section className="admin-hero">
        <div>
          <span>Panel administrator</span>
          <h1>Dashboard SawitVision</h1>
          <p>
            Pantau pengguna, prediksi, aktivitas,
            storage, dan laporan dari satu tempat.
          </p>
        </div>

        <div className="admin-hero-user">
          <small>Administrator</small>
          <strong>
            {currentUser?.full_name ||
              currentUser?.name ||
              "Admin"}
          </strong>
          <span>● Aktif</span>
        </div>
      </section>

      <nav className="admin-menu">
        {MENU.map((item) => (
          <button
            key={item.id}
            type="button"
            className={
              activeTab === item.id
                ? "active"
                : ""
            }
            onClick={() => {
              setActiveTab(item.id);
              setErrorMessage("");
              setSuccessMessage("");
            }}
          >
            <span>{item.icon}</span>
            <strong>{item.label}</strong>
          </button>
        ))}
      </nav>

      {errorMessage && (
        <div className="admin-message error">
          ⚠️ {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="admin-message success">
          ✓ {successMessage}
        </div>
      )}

      {activeTab === "overview" && (
        <>
          <section className="admin-section-heading">
            <div>
              <span>Ringkasan sistem</span>
              <h2>Kondisi SawitVision saat ini</h2>
            </div>

            <button
              type="button"
              onClick={() => {
                loadStats();
                loadStorage();
              }}
            >
              ↻ Muat ulang
            </button>
          </section>

          <section className="admin-stat-grid">
            <article>
              <i>👥</i>
              <div>
                <small>Total pengguna</small>
                <strong>{totalUsers}</strong>
                <span>
                  {activeUsers} akun aktif
                </span>
              </div>
            </article>

            <article>
              <i>📊</i>
              <div>
                <small>Total prediksi</small>
                <strong>
                  {totalPredictions}
                </strong>
                <span>
                  Seluruh hasil klasifikasi
                </span>
              </div>
            </article>

            <article>
              <i>🧾</i>
              <div>
                <small>Activity log</small>
                <strong>{totalLogs}</strong>
                <span>
                  Aktivitas tercatat
                </span>
              </div>
            </article>

            <article>
              <i>🗂️</i>
              <div>
                <small>Penggunaan storage</small>
                <strong>
                  {storagePercentage.toFixed(1)}%
                </strong>
                <span>
                  Status {storageStatusLabel}
                </span>
              </div>
            </article>
          </section>

          <section className="admin-two-column">
            <article className="admin-panel">
              <div className="admin-panel-title">
                <div>
                  <span>Distribusi prediksi</span>
                  <h3>Hasil berdasarkan kelas</h3>
                </div>
              </div>

              <div className="admin-class-list">
                {Object.entries(CLASS_META).map(
                  ([key, meta]) => {
                    const total =
                      predictionByClass?.[key]
                        ?.total || 0;

                    const avg =
                      predictionByClass?.[key]
                        ?.avg_confidence || 0;

                    return (
                      <div key={key}>
                        <div>
                          <span>{meta.icon}</span>
                          <strong>
                            {meta.label}
                          </strong>
                        </div>

                        <div className="admin-class-value">
                          <strong>
                            {total}
                          </strong>
                          <small>
                            Avg {formatConfidence(avg)}
                          </small>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </article>

            <article className="admin-panel">
              <div className="admin-panel-title">
                <div>
                  <span>Status pengguna</span>
                  <h3>Komposisi akun</h3>
                </div>
              </div>

              <div className="admin-user-summary">
                <div>
                  <span>Aktif</span>
                  <strong>
                    {stats?.users?.active || 0}
                  </strong>
                </div>

                <div>
                  <span>User biasa</span>
                  <strong>
                    {stats?.users?.regular || 0}
                  </strong>
                </div>

                <div>
                  <span>Administrator</span>
                  <strong>
                    {stats?.users?.admin || 0}
                  </strong>
                </div>
              </div>
            </article>
          </section>

          <section className="admin-panel admin-recent">
            <div className="admin-panel-title">
              <div>
                <span>Terbaru</span>
                <h3>Prediksi terakhir</h3>
              </div>
            </div>

            {isLoadingStats ? (
              <div className="admin-loading">
                Memuat data...
              </div>
            ) : recentPredictions.length === 0 ? (
              <div className="admin-empty">
                Belum ada prediksi.
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Pengguna</th>
                      <th>Hasil</th>
                      <th>Confidence</th>
                      <th>Waktu</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentPredictions.map(
                      (item) => {
                        const meta =
                          CLASS_META[
                            item.predicted_class
                          ] || {
                            label:
                              item.predicted_class,
                            icon: "🌴",
                          };

                        return (
                          <tr key={item.id}>
                            <td>
                              <strong>
                                {item.user_name}
                              </strong>
                              <small>
                                {item.user_phone}
                              </small>
                            </td>

                            <td>
                              {meta.icon}{" "}
                              {meta.label}
                            </td>

                            <td>
                              {formatConfidence(
                                item.confidence
                              )}
                            </td>

                            <td>
                              {formatDate(
                                item.created_at
                              )}
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === "users" && (
        <>
          <section className="admin-section-heading">
            <div>
              <span>Manajemen pengguna</span>
              <h2>Kelola akun yang terdaftar</h2>
            </div>
          </section>

          <section className="admin-toolbar">
            <div className="admin-search">
              <span>🔎</span>
              <input
                type="search"
                value={usersSearch}
                onChange={(event) =>
                  setUsersSearch(
                    event.target.value
                  )
                }
                placeholder="Cari nama atau nomor telepon..."
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    loadUsers();
                  }
                }}
              />
            </div>

            <button
              type="button"
              onClick={loadUsers}
              disabled={isLoadingUsers}
            >
              Cari
            </button>
          </section>

          <section className="admin-panel">
            {isLoadingUsers ? (
              <div className="admin-loading">
                Memuat pengguna...
              </div>
            ) : users.length === 0 ? (
              <div className="admin-empty">
                Pengguna tidak ditemukan.
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Pengguna</th>
                      <th>Role</th>
                      <th>Prediksi</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>

                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <strong>
                            {user.name}
                          </strong>
                          <small>
                            {user.phone_number}
                          </small>
                        </td>

                        <td>
                          <span className="admin-role-badge">
                            {user.role === "admin"
                              ? "Admin"
                              : "User"}
                          </span>
                        </td>

                        <td>
                          {user.total_predictions}
                        </td>

                        <td>
                          <span
                            className={`admin-status-badge ${
                              user.is_active
                                ? "active"
                                : "inactive"
                            }`}
                          >
                            {user.is_active
                              ? "Aktif"
                              : "Nonaktif"}
                          </span>
                        </td>

                        <td>
                          {user.role === "admin" ? (
                            <span className="admin-muted">
                              Dilindungi
                            </span>
                          ) : (
                            <button
                              type="button"
                              className={
                                user.is_active
                                  ? "admin-danger-button"
                                  : "admin-success-button"
                              }
                              onClick={() =>
                                handleUserStatus(
                                  user
                                )
                              }
                              disabled={
                                actionUserId ===
                                user.id
                              }
                            >
                              {actionUserId === user.id
                                ? "Memproses..."
                                : user.is_active
                                ? "Nonaktifkan"
                                : "Aktifkan"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === "predictions" && (
        <>
          <section className="admin-section-heading">
            <div>
              <span>Data prediksi</span>
              <h2>Ringkasan hasil klasifikasi</h2>
            </div>
          </section>

          <section className="admin-stat-grid three">
            {Object.entries(CLASS_META).map(
              ([key, meta]) => (
                <article key={key}>
                  <i>{meta.icon}</i>

                  <div>
                    <small>{meta.label}</small>
                    <strong>
                      {predictionByClass?.[key]
                        ?.total || 0}
                    </strong>
                    <span>
                      Rata-rata confidence{" "}
                      {formatConfidence(
                        predictionByClass?.[key]
                          ?.avg_confidence || 0
                      )}
                    </span>
                  </div>
                </article>
              )
            )}
          </section>

          <section className="admin-panel admin-recent">
            <div className="admin-panel-title">
              <div>
                <span>10 data terakhir</span>
                <h3>Prediksi terbaru</h3>
              </div>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Pengguna</th>
                    <th>Kelas</th>
                    <th>Confidence</th>
                    <th>Waktu</th>
                  </tr>
                </thead>

                <tbody>
                  {recentPredictions.map(
                    (item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>
                            {item.user_name}
                          </strong>
                          <small>
                            {item.user_phone}
                          </small>
                        </td>

                        <td>
                          {CLASS_META[
                            item.predicted_class
                          ]?.icon || "🌴"}{" "}
                          {CLASS_META[
                            item.predicted_class
                          ]?.label ||
                            item.predicted_class}
                        </td>

                        <td>
                          {formatConfidence(
                            item.confidence
                          )}
                        </td>

                        <td>
                          {formatDate(
                            item.created_at
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {activeTab === "activity" && (
        <>
          <section className="admin-section-heading">
            <div>
              <span>Catatan sistem</span>
              <h2>Activity log</h2>
            </div>

            <button
              type="button"
              className="admin-clean-button"
              onClick={handleActivityCleanup}
              disabled={isCleaningLogs}
            >
              {isCleaningLogs
                ? "Membersihkan..."
                : "Bersihkan > 90 hari"}
            </button>
          </section>

          <section className="admin-toolbar">
            <div className="admin-search">
              <span>🔎</span>

              <input
                type="search"
                value={activitySearch}
                onChange={(event) =>
                  setActivitySearch(
                    event.target.value
                  )
                }
                placeholder="Cari aktivitas..."
              />
            </div>

            <button
              type="button"
              onClick={loadActivity}
            >
              Cari
            </button>
          </section>

          <section className="admin-panel">
            {isLoadingActivity ? (
              <div className="admin-loading">
                Memuat aktivitas...
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="admin-empty">
                Belum ada activity log.
              </div>
            ) : (
              <div className="admin-log-list">
                {activityLogs.map((log) => (
                  <article key={log.id}>
                    <div className="admin-log-icon">
                      🧾
                    </div>

                    <div className="admin-log-content">
                      <div>
                        <strong>
                          {log.action}
                        </strong>

                        <span>
                          {formatDate(
                            log.created_at
                          )}
                        </span>
                      </div>

                      <p>
                        {log.description ||
                          "Aktivitas sistem"}
                      </p>

                      <small>
                        Pelaku:{" "}
                        {log.actor_user?.name ||
                          "-"}
                        {" • "}
                        Target:{" "}
                        {log.target_user?.name ||
                          "-"}
                      </small>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === "storage" && (
        <>
          <section className="admin-section-heading">
            <div>
              <span>Penyimpanan gambar</span>
              <h2>Storage SawitVision</h2>
            </div>

            <button
              type="button"
              className="admin-clean-button"
              onClick={handleStorageCleanup}
              disabled={isCleaningStorage}
            >
              {isCleaningStorage
                ? "Membersihkan..."
                : "Bersihkan gambar lama"}
            </button>
          </section>

          {isLoadingStorage ? (
            <section className="admin-panel">
              <div className="admin-loading">
                Memuat storage...
              </div>
            </section>
          ) : (
            <>
              <section className="admin-storage-card">
                <div className="admin-storage-top">
                  <div>
                    <span>Status storage</span>
                    <h2>
                      {storageStatusLabel}
                    </h2>
                    <p>
                      {storageStats?.message ||
                        "Belum ada informasi."}
                    </p>
                  </div>

                  <strong>
                    {storagePercentage.toFixed(2)}%
                  </strong>
                </div>

                <div className="admin-storage-track">
                  <span
                    style={{
                      width: `${Math.min(
                        storagePercentage,
                        100
                      )}%`,
                    }}
                  />
                </div>

                <div className="admin-storage-details">
                  <div>
                    <small>Terpakai</small>
                    <strong>
                      {storageStats?.usage
                        ?.estimated_mb || 0}{" "}
                      MB
                    </strong>
                  </div>

                  <div>
                    <small>Sisa</small>
                    <strong>
                      {storageStats?.remaining
                        ?.mb || 0}{" "}
                      MB
                    </strong>
                  </div>

                  <div>
                    <small>Batas</small>
                    <strong>
                      {storageStats?.limit
                        ?.gb || 0}{" "}
                      GB
                    </strong>
                  </div>

                  <div>
                    <small>Objek file</small>
                    <strong>
                      {storageStats?.files
                        ?.total_storage_objects ||
                        0}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="admin-notice">
                💡 Cleanup storage hanya menghapus
                file gambar lama. Record hasil
                prediksi tetap disimpan di database.
              </section>
            </>
          )}
        </>
      )}

      {activeTab === "reports" && (
        <>
          <section className="admin-section-heading">
            <div>
              <span>Laporan Excel</span>
              <h2>Unduh laporan prediksi</h2>
            </div>
          </section>

          <section className="admin-report-card">
            <div className="admin-report-intro">
              <div>📄</div>
              <div>
                <h3>Laporan Global SawitVision</h3>
                <p>
                  Gunakan filter bila diperlukan,
                  lalu unduh seluruh hasil prediksi
                  dalam format Excel.
                </p>
              </div>
            </div>

            <div className="admin-report-form">
              <label>
                <span>Tanggal awal</span>
                <input
                  type="date"
                  value={
                    reportFilter.start_date
                  }
                  onChange={(event) =>
                    setReportFilter(
                      (current) => ({
                        ...current,
                        start_date:
                          event.target.value,
                      })
                    )
                  }
                />
              </label>

              <label>
                <span>Tanggal akhir</span>
                <input
                  type="date"
                  value={reportFilter.end_date}
                  onChange={(event) =>
                    setReportFilter(
                      (current) => ({
                        ...current,
                        end_date:
                          event.target.value,
                      })
                    )
                  }
                />
              </label>

              <label>
                <span>Kelas</span>
                <select
                  value={
                    reportFilter.predicted_class
                  }
                  onChange={(event) =>
                    setReportFilter(
                      (current) => ({
                        ...current,
                        predicted_class:
                          event.target.value,
                      })
                    )
                  }
                >
                  <option value="">
                    Semua kelas
                  </option>
                  <option value="belum_masak">
                    Belum Masak
                  </option>
                  <option value="masak">
                    Masak
                  </option>
                  <option value="terlalu_masak">
                    Terlalu Masak
                  </option>
                </select>
              </label>
            </div>

            <button
              type="button"
              className="admin-download-button"
              onClick={handleDownloadReport}
              disabled={isDownloadingReport}
            >
              {isDownloadingReport
                ? "Menyiapkan laporan..."
                : "⬇️ Unduh laporan Excel"}
            </button>
          </section>
        </>
      )}
    </main>
  );
}

export default AdminDashboardPage;
