import { useState } from "react";
import { registerUser } from "../services/api";
import { formatPhoneInput, getPhoneError } from "../utils/phone";

function RegisterPage({ onGoToLogin, onRegisterSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    phone_number: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setErrorMessage("");
    setSuccessMessage("");

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
    setSuccessMessage("");

    try {
      const response = await registerUser({
        name: cleanedName,
        phone_number: formData.phone_number,
      });

      setSuccessMessage(
        response.message || "Pendaftaran berhasil. Silakan masuk.",
      );

      setFormData({
        name: "",
        phone_number: "",
      });

      if (onRegisterSuccess) {
        onRegisterSuccess(response.user);
      }
    } catch (error) {
      setErrorMessage(error.message || "Pendaftaran gagal. Silakan coba lagi.");
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

            <h1>Buat Akun Baru</h1>

            <p className="auth-description">
              Daftar cukup menggunakan nama dan nomor telepon aktif.
            </p>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-card-header">
            <span className="auth-badge">Daftar</span>

            <h2>Mulai gunakan SawitVision</h2>

            <p>Tidak perlu email, password, maupun verifikasi akun.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="register-name">Nama lengkap</label>

              <input
                id="register-name"
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
              <label htmlFor="register-phone">Nomor telepon</label>

              <input
                id="register-phone"
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                placeholder="Contoh: 081234567890"
                autoComplete="tel"
                inputMode="numeric"
                disabled={isLoading}
              />

              <small>
                Nomor telepon digunakan sebagai identitas unik akun.
              </small>
            </div>

            {errorMessage && (
              <div className="auth-alert error">{errorMessage}</div>
            )}

            {successMessage && (
              <div className="auth-alert success">{successMessage}</div>
            )}

            <button
              type="submit"
              className="auth-primary-button"
              disabled={isLoading}
            >
              {isLoading ? "Sedang mendaftar..." : "Daftar akun"}
            </button>
          </form>

          <div className="auth-footer">
            <span>Sudah punya akun?</span>

            <button
              type="button"
              className="auth-link-button"
              onClick={onGoToLogin}
              disabled={isLoading}
            >
              Masuk sekarang
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default RegisterPage;
