import Button from "../ui/Button";
import Card from "../ui/Card";
import Icon from "../ui/Icon";

function AdminReports({ filter, onFilterChange, onDownload, isDownloading }) {
  return (
    <section className="admin-section" aria-labelledby="admin-reports-title">
      <header className="admin-section-header">
        <div>
          <p>Laporan Excel</p>
          <h2 id="admin-reports-title">Unduh laporan prediksi</h2>
        </div>
      </header>

      <Card className="admin-report-card">
        <div className="admin-report-intro">
          <span aria-hidden="true"><Icon name="download" size={23} /></span>
          <div>
            <h3>Laporan global SawitVision</h3>
            <p>Gunakan filter yang tersedia, lalu unduh data prediksi dalam format Excel.</p>
          </div>
        </div>

        <div className="admin-report-form">
          <label>
            <span>Tanggal awal</span>
            <input
              type="date"
              value={filter.start_date}
              onChange={(event) => onFilterChange("start_date", event.target.value)}
              disabled={isDownloading}
            />
          </label>
          <label>
            <span>Tanggal akhir</span>
            <input
              type="date"
              value={filter.end_date}
              onChange={(event) => onFilterChange("end_date", event.target.value)}
              disabled={isDownloading}
            />
          </label>
          <label>
            <span>Kelas ringkasan</span>
            <select
              value={filter.predicted_class}
              onChange={(event) => onFilterChange("predicted_class", event.target.value)}
              disabled={isDownloading}
            >
              <option value="">Semua kelas</option>
              <option value="belum_masak">Belum Matang</option>
              <option value="masak">Matang</option>
              <option value="terlalu_masak">Terlalu Matang</option>
            </select>
          </label>
        </div>

        <div className="admin-report-actions">
          <Button type="button" onClick={onDownload} disabled={isDownloading}>
            <Icon name="download" size={18} />
            {isDownloading ? "Menyiapkan laporan..." : "Unduh laporan Excel"}
          </Button>
        </div>
      </Card>
    </section>
  );
}

export default AdminReports;
