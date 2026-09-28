import Button from "../ui/Button";
import Card from "../ui/Card";
import Icon from "../ui/Icon";
import LoadingState from "../ui/LoadingState";
import StatCard from "../ui/StatCard";
import AdminPredictionTable from "./AdminPredictionTable";
import { ImageDistributionPanel, TbsDistributionPanel } from "./AdminDistributionPanels";

function AdminOverview({ data, isLoading, onRefresh }) {
  if (isLoading && !data.hasStats) {
    return <LoadingState title="Memuat ringkasan..." description="Mengambil statistik admin terbaru." />;
  }

  return (
    <section className="admin-section" aria-labelledby="admin-overview-title">
      <header className="admin-section-header">
        <div>
          <p>Ringkasan sistem</p>
          <h2 id="admin-overview-title">Kondisi SawitVision saat ini</h2>
        </div>
        <Button type="button" variant="secondary" onClick={onRefresh} disabled={isLoading}>
          <Icon name="refresh" size={18} />
          {isLoading ? "Memuat..." : "Muat ulang"}
        </Button>
      </header>

      <div className="admin-stat-grid">
        <StatCard icon="profile" label="Total pengguna" value={data.totalUsers} />
        <StatCard icon="check" label="Pengguna aktif" value={data.activeUsers} />
        <StatCard icon="gallery" label="Foto tersimpan" value={data.totalImages} />
        <StatCard icon="scan" label="Total TBS" value={data.tbsDetailsUnavailable ? "—" : data.totalTbs} />
        <StatCard icon="history" label="Activity log" value={data.totalLogs} />
        <StatCard icon="gallery" label="Penggunaan storage" value={`${data.storagePercentage.toFixed(1)}%`} />
      </div>

      <div className="admin-two-column">
        <ImageDistributionPanel
          imageByClass={data.imageByClass}
          predictionByClass={data.predictionByClass}
        />
        <Card as="article" className="admin-panel">
          <header className="admin-panel__header">
            <div>
              <p>Pengguna</p>
              <h3>Komposisi akun</h3>
            </div>
            <Icon name="profile" size={20} />
          </header>
          <dl className="admin-account-summary">
            <div><dt>Aktif</dt><dd>{data.activeUsers}</dd></div>
            <div><dt>Pengguna</dt><dd>{data.regularUsers}</dd></div>
            <div><dt>Administrator</dt><dd>{data.adminUsers}</dd></div>
          </dl>
        </Card>
      </div>

      <TbsDistributionPanel
        tbsByClass={data.tbsByClass}
        avgDetectorConfidence={data.avgDetectorConfidence}
        detailsUnavailable={data.tbsDetailsUnavailable}
        coverageMessage={data.coverageMessage}
        coverageCaption={data.coverageCaption}
        coverageStatus={data.coverageStatus}
      />

      <Card className="admin-panel admin-recent">
        <header className="admin-panel__header">
          <div>
            <p>Terbaru</p>
            <h3>Prediksi terakhir</h3>
          </div>
        </header>
        <AdminPredictionTable predictions={data.recentPredictions} />
      </Card>
    </section>
  );
}

export default AdminOverview;
