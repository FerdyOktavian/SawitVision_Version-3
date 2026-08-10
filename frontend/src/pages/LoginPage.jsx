import { useState } from "react";
import { loginUser, saveAuthSession } from "../services/api";
import { formatPhoneInput, getPhoneError } from "../utils/phone";

function LoginPage({ onLoginSuccess, onGoToRegister }) {
  const [formData, setFormData] = useState({
    name: "",
    phone_number: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setErrorMessage("");

    setFormData((previousData) => ({
      ...previousData,
      [name]: name === "phone_number" ? formatPhoneInput(value) : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanedName = formData.name.trim();
    const phoneError = getPhoneError(formData.phone_number);

    if (cleanedName.length < 2) {
      setErrorMessage("Nama minimal terdiri dari 2 karakter.");
      return;
    }

    if (phoneError) {
      setErrorMessage(phoneError);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await loginUser({
        name: cleanedName,
        phone_number: formData.phone_number,
      });

      saveAuthSession(response.access_token, response.user);

      onLoginSuccess(response.user);
    } catch (error) {
      setErrorMessage(
        error.message || "Login gagal. Periksa kembali data kamu.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-container">
        <div className="auth-brand">
          <div className="auth-logo">🌴</div>

          <div>
            <p className="auth-eyebrow">SawitVision V3</p>

            <h1>Klasifikasi Kematangan Sawit</h1>

            <p className="auth-description">
              Masuk menggunakan nama dan nomor telepon yang sudah terdaftar.
            </p>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-card-header">
            <span className="auth-badge">Masuk</span>

            <h2>Selamat datang kembali</h2>

            <p>Tidak perlu email dan password.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="login-name">Nama lengkap</label>

              <input
                id="login-name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Contoh: Budi Santoso"
                autoComplete="name"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-phone">Nomor telepon</label>

              <input
                id="login-phone"
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
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
              {isLoading ? "Sedang masuk..." : "Masuk ke SawitVision"}
            </button>
          </form>

          <div className="auth-footer">
            <span>Belum punya akun?</span>

            <button
              type="button"
              className="auth-link-button"
              onClick={onGoToRegister}
              disabled={isLoading}
            >
              Daftar sekarang
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
