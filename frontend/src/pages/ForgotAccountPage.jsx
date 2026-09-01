import { useState } from "react";

import { findAccountByPhone } from "../services/api";

import { formatPhoneInput, getPhoneError } from "../utils/phone";

function ForgotAccountPage({ onGoToLogin, onAccountRecovered }) {
  const [phone, setPhone] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [account, setAccount] = useState(null);

  // =====================================================
  // HANDLE INPUT NOMOR TELEPON
  // =====================================================
  const handlePhoneChange = (event) => {
    const formattedPhone = formatPhoneInput(event.target.value);

    setPhone(formattedPhone);

    setErrorMessage("");

    // Kalau user mengubah nomor setelah akun ditemukan,
    // reset hasil pencarian.
    if (account) {
      setAccount(null);
    }
  };

  // =====================================================
  // CARI AKUN BERDASARKAN NOMOR TELEPON
  // =====================================================
  const handleSubmit = async (event) => {
    event.preventDefault();

    const phoneError = getPhoneError(phone);

    if (phoneError) {
      setErrorMessage(phoneError);

      return;
    }

    setIsLoading(true);

    setErrorMessage("");

    setAccount(null);

    try {
      const response = await findAccountByPhone(phone);

      if (!response?.found) {
        setErrorMessage(response?.message || "Nomor telepon belum terdaftar.");

        return;
      }

      setAccount(response);
    } catch (error) {
      setErrorMessage(error.message || "Terjadi kesalahan saat mencari akun.");
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================================
  // GUNAKAN AKUN YANG DITEMUKAN
  // =====================================================
  const handleUseAccount = () => {
    if (!account) {
      return;
    }

    onAccountRecovered({
      name: account.name,
      phone: account.phone,
    });
  };

  // =====================================================
  // CARI NOMOR LAIN
  // =====================================================
  const handleSearchAgain = () => {
    setAccount(null);

    setPhone("");

    setErrorMessage("");
  };

  return (
    <main className="auth-page">
      <section className="auth-container">
        {/* =================================================
            BRAND
        ================================================= */}
        <div className="auth-brand">
          <div className="auth-logo">🌴</div>

          <div>
            <p className="auth-eyebrow">SawitVision V3</p>

            <h1>Klasifikasi Kematangan Sawit</h1>

            <p className="auth-description">
              Temukan kembali akun kamu menggunakan nomor telepon yang pernah
              didaftarkan.
            </p>
          </div>
        </div>

        {/* =================================================
            CARD LUPA AKUN
        ================================================= */}
        <div className="auth-card">
          <div className="auth-card-header">
            <span className="auth-badge">Lupa Akun</span>

            <h2>Temukan akun kamu</h2>

            <p>Masukkan nomor telepon yang pernah digunakan saat mendaftar.</p>
          </div>

          {/* ===============================================
              BELUM MENEMUKAN AKUN
          =============================================== */}
          {!account ? (
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="forgot-phone">Nomor telepon</label>

                <input
                  id="forgot-phone"
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="Contoh: 081234567890"
                  autoComplete="tel"
                  inputMode="numeric"
                  disabled={isLoading}
                />

                <small>Bisa ditulis dengan format 08 atau +62.</small>
              </div>

              {errorMessage && (
                <div className="auth-alert error">{errorMessage}</div>
              )}

              <button
                type="submit"
                className="auth-primary-button"
                disabled={isLoading}
              >
                {isLoading ? "Sedang mencari..." : "Cari Akun"}
              </button>
            </form>
          ) : (
            /* =============================================
                AKUN DITEMUKAN
            ============================================= */
            <div className="auth-form">
              <div className="auth-alert success">Akun berhasil ditemukan.</div>

              <div className="form-group">
                <label>Nama akun</label>

                <input type="text" value={account.name || ""} disabled />
              </div>

              <div className="form-group">
                <label>Nomor telepon</label>

                <input type="text" value={account.phone || ""} disabled />
              </div>

              <button
                type="button"
                className="auth-primary-button"
                onClick={handleUseAccount}
              >
                Gunakan Akun Ini
              </button>

              <button
                type="button"
                className="auth-link-button"
                onClick={handleSearchAgain}
              >
                Cari nomor lain
              </button>
            </div>
          )}

          {/* ===============================================
              FOOTER
          =============================================== */}
          <div className="auth-footer">
            <span>Sudah ingat akun kamu?</span>

            <button
              type="button"
              className="auth-link-button"
              onClick={onGoToLogin}
              disabled={isLoading}
            >
              Kembali ke login
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ForgotAccountPage;
