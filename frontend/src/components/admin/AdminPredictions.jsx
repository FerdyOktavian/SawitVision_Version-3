import Card from "../ui/Card";
import LoadingState from "../ui/LoadingState";
import StatCard from "../ui/StatCard";
import AdminPredictionTable from "./AdminPredictionTable";
import { ImageDistributionPanel, TbsDistributionPanel } from "./AdminDistributionPanels";

function AdminPredictions({ data, isLoading }) {
  if (isLoading && !data.hasStats) {
    return <LoadingState title="Memuat statistik prediksi..." />;
  }

  return (
    <section className="admin-section" aria-labelledby="admin-predictions-title">
      <header className="admin-section-header">
        <div>
          <p>Data prediksi</p>
          <h2 id="admin-predictions-title">Statistik foto dan TBS</h2>
        </div>
      </header>

      <div className="admin-stat-grid admin-stat-grid--compact">
        <StatCard icon="gallery" label="Foto tersimpan" value={data.totalImages} />
        <StatCard icon="scan" label="Total TBS" value={data.tbsDetailsUnavailable ? "—" : data.totalTbs} />
      </div>

      <div className="admin-two-column">
        <ImageDistributionPanel imageByClass={data.imageByClass} predictionByClass={data.predictionByClass} />
        <TbsDistributionPanel
          tbsByClass={data.tbsByClass}
          avgDetectorConfidence={data.avgDetectorConfidence}
          detailsUnavailable={data.tbsDetailsUnavailable}
          coverageMessage={data.coverageMessage}
          coverageCaption={data.coverageCaption}
          coverageStatus={data.coverageStatus}
        />
      </div>

      <Card className="admin-panel admin-recent">
        <header className="admin-panel__header">
          <div><p>Data tersedia</p><h3>10 prediksi terbaru</h3></div>
        </header>
        <AdminPredictionTable
          predictions={data.recentPredictions}
          emptyDescription="Endpoint statistik belum mengembalikan prediksi terbaru."
        />
      </Card>
    </section>
  );
}

export default AdminPredictions;
