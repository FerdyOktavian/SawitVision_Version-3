import { useState } from "react";
import AuthLayout from "../components/auth/AuthLayout";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import FormField from "../components/ui/FormField";
import Icon from "../components/ui/Icon";
import { findAccountByPhone } from "../services/api";
import { formatPhoneInput, getPhoneError } from "../utils/phone";

function ForgotAccountPage({ onGoToLogin, onAccountRecovered }) {
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [account, setAccount] = useState(null);
  const [phoneErrorMessage, setPhoneErrorMessage] = useState("");

  const handlePhoneChange = (event) => {
    setPhone(formatPhoneInput(event.target.value));
    setErrorMessage("");
    setPhoneErrorMessage("");
    if (account) setAccount(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const phoneError = getPhoneError(phone);
    if (phoneError) {
      setPhoneErrorMessage(phoneError);
      setErrorMessage(phoneError);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setPhoneErrorMessage("");
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

  const handleUseAccount = () => {
    if (!account) return;
    onAccountRecovered({ name: account.name, phone: account.phone });
  };

  const handleSearchAgain = () => {
    setAccount(null);
    setPhone("");
    setErrorMessage("");
    setPhoneErrorMessage("");
  };

  return (
    <AuthLayout
      title="Lupa akun"
      description="Masukkan nomor telepon yang terdaftar untuk melihat nama akun Anda."
      cardEyebrow="Lupa akun"
      cardTitle={account ? "Akun ditemukan" : "Cari berdasarkan nomor telepon"}
      cardDescription={account ? "Periksa data berikut sebelum kembali ke halaman masuk." : "Kami hanya menampilkan akun yang cocok dengan nomor terdaftar."}
      footer={(
        <>
          <span>Sudah ingat akun?</span>
          <Button type="button" variant="ghost" size="sm" onClick={onGoToLogin} disabled={isLoading}>
            Kembali ke login
          </Button>
        </>
      )}
    >
      {!account ? (
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <FormField
            id="forgot-phone"
            label="Nomor telepon"
            hint="Masukkan nomor yang digunakan saat mendaftar."
            error={phoneErrorMessage}
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            placeholder="081234567890"
            autoComplete="tel"
            inputMode="tel"
            disabled={isLoading}
            required
          />
          {errorMessage && <Alert tone="error" role="alert">{errorMessage}</Alert>}
          <Button type="submit" block disabled={isLoading}>
            <Icon name="scan" size={19} />
            {isLoading ? "Sedang mencari..." : "Cari akun"}
          </Button>
        </form>
      ) : (
        <div className="auth-form">
          <Alert tone="success" role="status">Akun berhasil ditemukan.</Alert>
          <dl className="auth-account-result">
            <div><dt>Nama akun</dt><dd>{account.name || "-"}</dd></div>
            <div><dt>Nomor telepon</dt><dd>{account.phone || "-"}</dd></div>
          </dl>
          <Button type="button" block onClick={handleUseAccount}>
            <Icon name="check" size={19} />
            Gunakan akun ini
          </Button>
          <Button type="button" variant="secondary" block onClick={handleSearchAgain}>
            Cari nomor lain
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}

export default ForgotAccountPage;
