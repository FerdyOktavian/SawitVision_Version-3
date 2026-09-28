import Alert from "../ui/Alert";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Icon from "../ui/Icon";
import LoadingState from "../ui/LoadingState";
import StatCard from "../ui/StatCard";

function AdminStorage({ storageStats, percentage, statusLabel, isLoading, isCleaning, onCleanup }) {
  return (
    <section className="admin-section" aria-labelledby="admin-storage-title">
      <header className="admin-section-header">
        <div>
          <p>Penyimpanan gambar</p>
          <h2 id="admin-storage-title">Storage SawitVision</h2>
        </div>
        <Button type="button" variant="danger" onClick={onCleanup} disabled={isCleaning || isLoading}>
          <Icon name="trash" size={18} />
          {isCleaning ? "Membersihkan..." : "Bersihkan gambar lama"}
        </Button>
      </header>

      {isLoading ? (
        <Card className="admin-panel"><LoadingState title="Memuat storage..." /></Card>
      ) : (
        <>
          <Card className="admin-storage-summary">
            <header>
              <div>
                <p>Status storage</p>
                <h3>{statusLabel}</h3>
                <span>{storageStats?.message || "Belum ada informasi storage."}</span>
              </div>
              <strong>{percentage.toFixed(2)}%</strong>
            </header>
            <div
              className="admin-storage-progress"
              role="progressbar"
              aria-label="Penggunaan storage"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={Math.min(Math.max(percentage, 0), 100)}
            >
              <span style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }} />
            </div>
          </Card>

          <div className="admin-stat-grid admin-stat-grid--storage">
            <StatCard icon="gallery" label="Estimasi terpakai" value={storageStats?.usage?.estimated_mb || 0} suffix=" MB" />
            <StatCard icon="gallery" label="Estimasi tersisa" value={storageStats?.remaining?.mb || 0} suffix=" MB" />
            <StatCard icon="info" label="Batas konfigurasi" value={storageStats?.limit?.gb || 0} suffix=" GB" />
            <StatCard icon="gallery" label="Objek storage" value={storageStats?.files?.total_storage_objects || 0} />
          </div>

          <Alert tone="warning">
            Cleanup hanya menghapus file gambar lama sesuai perilaku backend saat ini. Record prediksi tetap disimpan di database.
          </Alert>
        </>
      )}
    </section>
  );
}

export default AdminStorage;
