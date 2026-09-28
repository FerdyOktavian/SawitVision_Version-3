import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Icon from "../components/ui/Icon";
import MaturityBadge from "../components/MaturityBadge";

const MATURITY_GUIDE = [
  {
    key: "belum_masak",
    description: "TBS belum mencapai kondisi panen optimal dan perlu diperiksa kembali.",
  },
  {
    key: "masak",
    description: "TBS berada pada tingkat kematangan yang sesuai untuk diprioritaskan saat panen.",
  },
  {
    key: "terlalu_masak",
    description: "TBS telah melewati kematangan optimal dan sebaiknya segera ditangani.",
  },
];

function QuickAction({ icon, title, description, onClick }) {
  return (
    <button type="button" className="home-quick-card" onClick={onClick}>
      <span className="home-quick-icon" aria-hidden="true"><Icon name={icon} size={22} /></span>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <Icon name="chevron" size={19} />
    </button>
  );
}

function HomePage({ currentUser, onStartPrediction, onOpenHistory, onOpenProfile }) {
  const displayName = currentUser?.full_name || currentUser?.name || "Pengguna";
  const firstName = displayName.trim().split(/\s+/)[0];

  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-hero-content">
          <p className="home-hero-eyebrow">SawitVision · Halo, {firstName}</p>
          <h1>Analisis kematangan TBS untuk pekerjaan lapangan</h1>
          <p>
            SawitVision membantu mendeteksi TBS dari foto, mengklasifikasikan
            kematangan, menyimpan lokasi pengambilan, dan mencatat hasilnya.
          </p>
          <div className="home-hero-actions">
            <Button type="button" onClick={onStartPrediction}>
              <Icon name="camera" />
              Mulai prediksi
            </Button>
            <Button type="button" variant="secondary" onClick={onOpenHistory}>
              <Icon name="history" />
              Lihat riwayat
            </Button>
          </div>
        </div>

        <div className="home-hero-panel" aria-label="Alur kerja SawitVision">
          <span className="home-hero-mark" aria-hidden="true"><Icon name="leaf" size={28} /></span>
          <strong>Alur analisis sederhana</strong>
          <ol>
            <li>Ambil atau pilih foto</li>
            <li>Sistem mendeteksi setiap TBS</li>
            <li>Kematangan diklasifikasikan</li>
            <li>Hasil dan lokasi disimpan</li>
          </ol>
        </div>
      </section>

      <section className="home-section" aria-labelledby="home-actions-title">
        <header className="home-section-heading">
          <p>Akses Cepat</p>
          <h2 id="home-actions-title">Lanjutkan pekerjaan</h2>
        </header>
        <div className="home-quick-section">
          <QuickAction icon="scan" title="Prediksi TBS" description="Gunakan kamera atau foto dari galeri" onClick={onStartPrediction} />
          <QuickAction icon="history" title="Riwayat hasil" description="Tinjau foto, lokasi, dan detail deteksi" onClick={onOpenHistory} />
          <QuickAction icon="profile" title="Profil pengguna" description="Kelola informasi akun Anda" onClick={onOpenProfile} />
        </div>
      </section>

      <section className="home-section" aria-labelledby="home-maturity-title">
        <header className="home-section-heading">
          <p>Panduan Hasil</p>
          <h2 id="home-maturity-title">Kategori kematangan</h2>
        </header>
        <div className="maturity-grid">
          {MATURITY_GUIDE.map((item) => (
            <Card as="article" className="maturity-card" key={item.key}>
              <MaturityBadge value={item.key} />
              <p>{item.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <Card className="home-information-card" variant="subtle">
        <Icon name="info" size={22} />
        <div>
          <h2>Foto yang baik membantu pemeriksaan</h2>
          <p>
            Pastikan TBS terlihat utuh, pencahayaan cukup, dan gambar tidak
            buram sebelum memulai prediksi.
          </p>
        </div>
      </Card>
    </main>
  );
}

export default HomePage;
