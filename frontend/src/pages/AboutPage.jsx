import { useState } from "react";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Icon from "../components/ui/Icon";
import PageHeader from "../components/ui/PageHeader";
import MaturityBadge from "../components/MaturityBadge";
import SocialLinks from "../components/SocialLinks";

const creatorImageModules = import.meta.glob(
  "../assets/muhammad-ferdy-oktavian.jpeg",
  { eager: true, query: "?url", import: "default" },
);
const CREATOR_IMAGE_URL =
  creatorImageModules["../assets/muhammad-ferdy-oktavian.jpeg"] || "";

const WORKFLOW = [
  {
    title: "Siapkan foto",
    description: "Ambil foto baru atau pilih gambar TBS dari galeri perangkat.",
  },
  {
    title: "Deteksi TBS",
    description: "Sistem mencari dan memisahkan setiap TBS yang terlihat pada foto.",
  },
  {
    title: "Klasifikasi kematangan",
    description: "Setiap TBS yang terdeteksi dianalisis ke salah satu dari tiga kelas.",
  },
  {
    title: "Tinjau hasil",
    description: "Hasil, gambar, dan lokasi yang tersedia disimpan dalam riwayat.",
  },
];

const MATURITY_CLASSES = [
  {
    key: "belum_masak",
    description: "TBS diklasifikasikan belum mencapai tingkat kematangan untuk diprioritaskan saat panen.",
  },
  {
    key: "masak",
    description: "TBS diklasifikasikan berada pada tingkat kematangan yang sesuai untuk dipertimbangkan saat panen.",
  },
  {
    key: "terlalu_masak",
    description: "TBS diklasifikasikan telah melewati tingkat kematangan optimal.",
  },
];

const CAPABILITIES = [
  { icon: "scan", label: "Deteksi beberapa TBS dalam satu foto" },
  { icon: "leaf", label: "Klasifikasi tiga kelas kematangan" },
  { icon: "history", label: "Penyimpanan hasil dan riwayat analisis" },
  { icon: "location", label: "Pencatatan lokasi pengambilan bila tersedia" },
];

function AboutPage({ onStartPrediction, onOpenHistory }) {
  const [creatorImageFailed, setCreatorImageFailed] = useState(false);
  const showCreatorImage = Boolean(CREATOR_IMAGE_URL && !creatorImageFailed);

  return (
    <main className="about-page">
      <PageHeader
        eyebrow="Tentang"
        title="Tentang SawitVision"
        description="Sistem bantu analisis kematangan tandan buah segar kelapa sawit dari foto."
      />

      <Card className="about-overview">
        <div className="about-overview__mark" aria-hidden="true">
          <Icon name="leaf" size={30} />
        </div>
        <div className="about-overview__content">
          <h2>Informasi pendukung untuk pemeriksaan TBS</h2>
          <p>
            SawitVision membantu petugas lapangan mengenali TBS pada gambar,
            meninjau hasil kematangan per TBS, dan menyimpan catatan analisis
            dalam satu alur kerja.
          </p>
          <div className="about-overview__actions">
            <Button type="button" onClick={onStartPrediction}>
              <Icon name="camera" size={18} />
              Mulai prediksi
            </Button>
            <Button type="button" variant="secondary" onClick={onOpenHistory}>
              <Icon name="history" size={18} />
              Lihat riwayat
            </Button>
          </div>
        </div>
      </Card>

      <section className="about-section" aria-labelledby="about-capabilities-title">
        <header className="about-section__heading">
          <p>Fungsi utama</p>
          <h2 id="about-capabilities-title">Apa yang dilakukan SawitVision</h2>
        </header>
        <Card className="about-capability-list">
          {CAPABILITIES.map((item) => (
            <div className="about-capability" key={item.label}>
              <span aria-hidden="true"><Icon name={item.icon} size={20} /></span>
              <p>{item.label}</p>
            </div>
          ))}
        </Card>
      </section>

      <section className="about-section" aria-labelledby="about-workflow-title">
        <header className="about-section__heading">
          <p>Alur penggunaan</p>
          <h2 id="about-workflow-title">Cara kerja sederhana</h2>
        </header>
        <Card as="ol" className="about-workflow">
          {WORKFLOW.map((step, index) => (
            <li key={step.title}>
              <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </Card>
      </section>

      <section className="about-section" aria-labelledby="about-maturity-title">
        <header className="about-section__heading">
          <p>Hasil analisis</p>
          <h2 id="about-maturity-title">Tiga kelas kematangan</h2>
        </header>
        <div className="about-maturity-grid">
          {MATURITY_CLASSES.map((item) => (
            <Card as="article" className="about-maturity-card" key={item.key}>
              <MaturityBadge value={item.key} />
              <p>{item.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="about-section" aria-labelledby="about-technology-title">
        <header className="about-section__heading">
          <p>Teknologi</p>
          <h2 id="about-technology-title">Dua tahap analisis gambar</h2>
          <span>
            Sistem memisahkan proses pencarian TBS dan penentuan kelas
            kematangan agar hasil dapat ditampilkan per deteksi.
          </span>
        </header>
        <div className="about-technology-grid">
          <Card as="article" className="about-technology-card">
            <span className="about-technology-card__icon" aria-hidden="true">
              <Icon name="scan" size={22} />
            </span>
            <div>
              <p>Tahap deteksi</p>
              <h3>YOLO11n</h3>
              <span>Mendeteksi dan menentukan area setiap TBS yang terlihat pada gambar.</span>
            </div>
          </Card>
          <Card as="article" className="about-technology-card">
            <span className="about-technology-card__icon" aria-hidden="true">
              <Icon name="leaf" size={22} />
            </span>
            <div>
              <p>Tahap klasifikasi</p>
              <h3>DINOv2 ViT-S/14</h3>
              <span>Mengklasifikasikan kematangan pada setiap hasil deteksi TBS.</span>
            </div>
          </Card>
        </div>
      </section>

      <Alert tone="warning" className="about-disclaimer">
        <strong>Catatan penggunaan.</strong> Hasil SawitVision merupakan
        informasi pendukung berdasarkan gambar. Kualitas foto dan kondisi
        lapangan tetap perlu dipertimbangkan saat mengambil keputusan.
      </Alert>

      <section className="about-creator" aria-labelledby="about-creator-title">
        <figure className="about-creator__portrait">
          {showCreatorImage ? (
            <img
              src={CREATOR_IMAGE_URL}
              alt="Muhammad Ferdy Oktavian, pengembang SawitVision"
              onError={() => setCreatorImageFailed(true)}
            />
          ) : (
            <div className="about-creator__portrait-fallback" role="img" aria-label="Foto pengembang belum tersedia">
              <Icon name="profile" size={30} />
              <span>Foto pengembang</span>
            </div>
          )}
        </figure>

        <div className="about-creator__content">
          <header>
            <p>Tentang Pengembang</p>
            <h2 id="about-creator-title">Muhammad Ferdy Oktavian</h2>
            <span>AI &amp; Web Developer</span>
          </header>

          <div className="about-creator__copy">
            <p>
              Saya memiliki latar belakang di bidang Informatika dan antusias
              dalam mengembangkan aplikasi berbasis teknologi, khususnya
              Artificial Intelligence, Computer Vision, Machine Learning, Web
              Development, dan pengembangan perangkat lunak. Saya tertarik
              mempelajari bagaimana teknologi tidak hanya berhenti sebagai
              eksperimen, tetapi dapat diterapkan menjadi solusi yang digunakan
              dalam kebutuhan nyata.
            </p>
            <p>
              SawitVision dikembangkan secara mandiri sebagai salah satu upaya
              saya untuk membangun proyek teknologi yang memiliki penerapan nyata
              dan dapat memberikan manfaat bagi orang lain. Melalui SawitVision,
              saya mencoba menggabungkan pengembangan web dan kecerdasan buatan
              untuk membantu proses analisis serta penilaian kematangan Tandan
              Buah Segar (TBS) kelapa sawit.
            </p>
            <p>
              Proyek ini juga menjadi bagian dari perjalanan saya dalam terus
              belajar, bereksperimen, dan membangun portofolio di bidang
              teknologi. Harapannya, SawitVision dapat terus berkembang menjadi
              aplikasi yang semakin bermanfaat dan memiliki nilai guna dalam
              dunia nyata.
            </p>
          </div>

          <SocialLinks className="about-creator__social" />
        </div>
      </section>
    </main>
  );
}

export default AboutPage;
