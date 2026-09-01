import { useState } from "react";

const BASE_API_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function ForgotAccountPage({ onGoToLogin, onAccountRecovered }) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [account, setAccount] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanPhone = phone.trim();

    if (!cleanPhone) {
      setError("Masukkan nomor telepon terlebih dahulu.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setAccount(null);

      const response = await fetch(`${BASE_API_URL}/auth/find-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: cleanPhone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.detail || "Gagal mencari akun.");
      }

      if (!data?.found) {
        setError(data?.message || "Nomor telepon belum terdaftar.");
        return;
      }

      setAccount(data);
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat mencari akun.");
    } finally {
      setLoading(false);
    }
  };

  const handleUseAccount = () => {
    if (!account) return;

    onAccountRecovered({
      name: account.name,
      phone: account.phone,
    });
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🌴</div>

        <h1>Lupa Akun?</h1>

        <p>Masukkan nomor telepon yang pernah digunakan saat mendaftar.</p>

        {!account ? (
          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="forgot-phone">Nomor Telepon</label>

              <input
                id="forgot-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                autoComplete="tel"
              />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button
              type="submit"
              className="auth-submit-button"
              disabled={loading}
            >
              {loading ? "Mencari..." : "Cari Akun"}
            </button>
          </form>
        ) : (
          <div className="auth-success">
            <p>✅ Akun ditemukan</p>

            <h2>{account.name}</h2>

            <p>{account.phone}</p>

            <button
              type="button"
              className="auth-submit-button"
              onClick={handleUseAccount}
            >
              Gunakan Akun Ini
            </button>
          </div>
        )}

        <button
          type="button"
          className="auth-link-button"
          onClick={onGoToLogin}
        >
          ← Kembali ke Login
        </button>
      </div>
    </main>
  );
}

export default ForgotAccountPage;
