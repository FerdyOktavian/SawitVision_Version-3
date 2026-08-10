import { useMemo } from "react";

const MATURITY_CLASSES = [
  {
    key: "belum_masak",
    icon: "🟢",
    title: "Belum Masak",
    description:
      "Buah masih belum mencapai tingkat kematangan optimal untuk dipanen.",
    hint:
      "Warna buah cenderung lebih muda dan ciri kematangan belum terlihat maksimal.",
  },
  {
    key: "masak",
    icon: "🟠",
    title: "Masak",
    description:
      "Buah berada pada tingkat kematangan yang sesuai untuk dipanen.",
    hint:
      "Warna buah terlihat lebih matang dan karakteristik buah sudah lebih jelas.",
  },
  {
    key: "terlalu_masak",
    icon: "🔴",
    title: "Terlalu Masak",
    description:
      "Buah telah melewati tingkat kematangan optimal.",
    hint:
      "Warna buah cenderung lebih tua dan beberapa bagian dapat terlihat semakin matang.",
  },
];

const HOW_TO_USE = [
  {
    number: "01",
    icon: "📸",
    title: "Ambil foto buah",
    text:
      "Gunakan kamera atau pilih gambar dari galeri. Pastikan buah kelapa sawit terlihat jelas.",
  },
  {
    number: "02",
    icon: "☀️",
    title: "Pastikan foto terang",
    text:
      "Hindari foto terlalu gelap, terlalu silau, atau buram agar ciri buah dapat terlihat dengan baik.",
  },
  {
    number: "03",
    icon: "✨",
    title: "Mulai klasifikasi",
    text:
      "Tekan tombol klasifikasi dan tunggu beberapa saat sampai sistem selesai menganalisis gambar.",
  },
  {
    number: "04",
    icon: "📊",
    title: "Baca hasil",
    text:
      "Lihat kelas kematangan dan persentase keyakinan AI yang ditampilkan oleh sistem.",
  },
];

function AboutPage({
  currentUser,
  onStartPrediction,
  onOpenHistory,
}) {
  const userName = useMemo(() => {
    return (
      currentUser?.full_name ||
      currentUser?.name ||
      "Pengguna"
    );
  }, [currentUser]);

  return (
    <main className="about-page">
      <section className="about-hero">
        <div className="about-hero-copy">
          <span className="about-eyebrow">
            Tentang SawitVision
          </span>

          <h1>
            Membantu mengenali tingkat kematangan
            buah kelapa sawit dengan AI
          </h1>

          <p>
            SawitVision dirancang agar proses
            klasifikasi dapat dilakukan dengan
            langkah sederhana melalui foto buah
            kelapa sawit.
          </p>

          <div className="about-hero-actions">
            <button
              type="button"
              className="about-primary-button"
              onClick={onStartPrediction}
            >
              📷 Mulai klasifikasi
            </button>

            <button
              type="button"
              className="about-secondary-button"
              onClick={onOpenHistory}
            >
              🕘 Lihat riwayat
            </button>
          </div>
        </div>

        <div className="about-hero-visual">
          <div className="about-hero-icon">
            🌴
          </div>

          <div className="about-ai-badge">
            <strong>AI</strong>
            <span>EfficientNetV2S</span>
          </div>
        </div>
      </section>

      <section className="about-welcome-card">
        <div className="about-welcome-icon">
          👋
        </div>

        <div>
          <span>Halo, {userName}</span>
          <h2>
            Gunakan SawitVision dengan langkah yang
            sederhana
          </h2>
          <p>
            Tidak perlu memahami istilah teknis AI.
            Cukup siapkan foto buah yang jelas,
            kemudian ikuti petunjuk penggunaan di
            bawah.
          </p>
        </div>
      </section>

      <section className="about-section">
        <header className="about-section-heading">
          <span>Petunjuk penggunaan</span>
          <h2>Cara menggunakan SawitVision</h2>
          <p>
            Empat langkah berikut dapat digunakan
            setiap kali ingin melakukan klasifikasi.
          </p>
        </header>

        <div className="about-steps-grid">
          {HOW_TO_USE.map((step) => (
            <article
              key={step.number}
              className="about-step-card"
            >
              <div className="about-step-top">
                <span className="about-step-number">
                  {step.number}
                </span>

                <span className="about-step-icon">
                  {step.icon}
                </span>
              </div>

              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-photo-guide">
        <div className="about-photo-copy">
          <span className="about-eyebrow dark">
            Foto yang baik
          </span>

          <h2>
            Hasil klasifikasi sangat dipengaruhi
            kualitas gambar
          </h2>

          <p>
            Gunakan gambar yang memperlihatkan buah
            secara jelas agar model dapat membaca
            karakteristik visual dengan lebih baik.
          </p>
        </div>

        <div className="about-photo-tips">
          <article className="good">
            <span>✓</span>
            <div>
              <strong>Disarankan</strong>
              <p>
                Buah terlihat jelas, cukup dekat,
                pencahayaan baik, dan tidak buram.
              </p>
            </div>
          </article>

          <article className="bad">
            <span>×</span>
            <div>
              <strong>Hindari</strong>
              <p>
                Foto terlalu gelap, jauh, tertutup,
                sangat miring, atau tidak fokus.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="about-section">
        <header className="about-section-heading">
          <span>Kelas kematangan</span>
          <h2>Tiga hasil yang dapat muncul</h2>
          <p>
            SawitVision mengelompokkan gambar buah
            kelapa sawit ke dalam tiga kelas.
          </p>
        </header>

        <div className="about-class-grid">
          {MATURITY_CLASSES.map((item) => (
            <article
              key={item.key}
              className={`about-class-card ${item.key}`}
            >
              <div className="about-class-icon">
                {item.icon}
              </div>

              <h3>{item.title}</h3>
              <p>{item.description}</p>

              <div className="about-class-hint">
                <span>Petunjuk visual</span>
                <small>{item.hint}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="about-confidence">
        <div className="about-confidence-icon">
          📈
        </div>

        <div className="about-confidence-copy">
          <span className="about-eyebrow dark">
            Memahami hasil
          </span>

          <h2>Apa arti keyakinan AI?</h2>

          <p>
            Persentase keyakinan menunjukkan seberapa
            kuat model memilih suatu kelas berdasarkan
            gambar yang diberikan. Nilai yang lebih
            tinggi menunjukkan model lebih yakin
            terhadap hasil tersebut.
          </p>
        </div>

        <div className="about-confidence-example">
          <small>Contoh</small>

          <div>
            <span>Masak</span>
            <strong>94%</strong>
          </div>

          <div className="about-confidence-track">
            <span style={{ width: "94%" }} />
          </div>
        </div>
      </section>

      <section className="about-tech-section">
        <div className="about-tech-copy">
          <span className="about-eyebrow">
            Teknologi
          </span>

          <h2>
            Sistem klasifikasi berbasis deep learning
          </h2>

          <p>
            SawitVision menggunakan model CNN dengan
            arsitektur EfficientNetV2S untuk mengenali
            pola visual pada citra buah kelapa sawit.
          </p>

          <div className="about-tech-tags">
            <span>EfficientNetV2S</span>
            <span>3 kelas</span>
            <span>Klasifikasi citra</span>
          </div>
        </div>

        <div className="about-tech-card">
          <span>Model AI</span>
          <strong>EfficientNetV2S</strong>
          <small>
            Digunakan untuk mengklasifikasikan tingkat
            kematangan buah dari gambar yang diberikan.
          </small>
        </div>
      </section>

      <section className="about-notice">
        <div className="about-notice-icon">
          💡
        </div>

        <div>
          <strong>Catatan penggunaan</strong>
          <p>
            Hasil SawitVision merupakan bantuan
            klasifikasi berdasarkan gambar. Kondisi
            lapangan, kualitas foto, dan karakteristik
            buah tetap perlu diperhatikan saat
            melakukan penilaian.
          </p>
        </div>
      </section>
    </main>
  );
}

export default AboutPage;
