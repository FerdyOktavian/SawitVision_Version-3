function HomePage({ currentUser, onStartPrediction, onOpenHistory }) {
  const firstName = currentUser?.name?.trim().split(" ")[0] || "Pengguna";

  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-hero-content">
          <span className="home-hero-badge">🌿 Sistem klasifikasi sawit</span>

          <h1>Halo, {firstName}!</h1>

          <p>
            Kenali tingkat kematangan buah kelapa sawit menggunakan teknologi
            kecerdasan buatan.
          </p>

          <button
            type="button"
            className="home-primary-button"
            onClick={onStartPrediction}
          >
            <span>📷</span>
            Mulai klasifikasi
          </button>
        </div>

        <div className="home-hero-visual">
          <div className="home-palm-circle">🌴</div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-heading">
          <div>
            <span className="home-section-eyebrow">Tingkat kematangan</span>

            <h2>Kategori hasil klasifikasi</h2>
          </div>
        </div>

        <div className="maturity-grid">
          <article className="maturity-card">
            <div className="maturity-card-icon">🟢</div>

            <div>
              <h3>Belum Matang</h3>
              <p>
                Buah masih dalam tahap awal dan belum mencapai kondisi panen
                optimal.
              </p>
            </div>
          </article>

          <article className="maturity-card">
            <div className="maturity-card-icon">🟠</div>

            <div>
              <h3>Matang</h3>
              <p>
                Buah telah mencapai tingkat kematangan yang sesuai untuk proses
                pemanenan.
              </p>
            </div>
          </article>

          <article className="maturity-card">
            <div className="maturity-card-icon">🔴</div>

            <div>
              <h3>Terlalu Matang</h3>
              <p>
                Buah telah melewati tingkat kematangan optimal dan sebaiknya
                segera ditangani.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="home-quick-section">
        <button
          type="button"
          className="home-quick-card"
          onClick={onStartPrediction}
        >
          <span className="home-quick-icon">📸</span>

          <span>
            <strong>Klasifikasi gambar</strong>
            <small>Ambil foto atau pilih gambar dari galeri</small>
          </span>

          <span className="home-quick-arrow">›</span>
        </button>

        <button
          type="button"
          className="home-quick-card"
          onClick={onOpenHistory}
        >
          <span className="home-quick-icon">📈</span>

          <span>
            <strong>Lihat riwayat</strong>
            <small>Periksa kembali hasil klasifikasi sebelumnya</small>
          </span>

          <span className="home-quick-arrow">›</span>
        </button>
      </section>

      <section className="home-information-card">
        <div className="home-information-icon">💡</div>

        <div>
          <h3>Tips pengambilan gambar</h3>

          <p>
            Gunakan pencahayaan yang cukup, pastikan buah terlihat jelas, dan
            hindari gambar yang terlalu gelap atau buram.
          </p>
        </div>
      </section>
    </main>
  );
}

export default HomePage;
