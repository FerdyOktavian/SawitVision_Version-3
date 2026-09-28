import { useState } from "react";
import AuthLayout from "../components/auth/AuthLayout";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import FormField from "../components/ui/FormField";
import Icon from "../components/ui/Icon";
import { loginUser, saveAuthSession } from "../services/api";
import { formatPhoneInput, getPhoneError } from "../utils/phone";

function LoginPage({ onLoginSuccess, onGoToRegister, onGoToForgotAccount, recoveredAccount }) {
  const [formData, setFormData] = useState(() => ({
    name: recoveredAccount?.name || "",
    phone_number: formatPhoneInput(recoveredAccount?.phone || ""),
  }));
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (event) => {
    const { name, value } = event.target;
    setErrorMessage("");
    setFieldErrors((errors) => ({ ...errors, [name]: undefined }));
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
      setFieldErrors({ name: "Nama minimal terdiri dari 2 karakter." });
      setErrorMessage("Nama minimal terdiri dari 2 karakter.");
      return;
    }
    if (phoneError) {
      setFieldErrors({ phone_number: phoneError });
      setErrorMessage(phoneError);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setFieldErrors({});
    try {
      const response = await loginUser({
        name: cleanedName,
        phone_number: formData.phone_number,
      });
      saveAuthSession(response.access_token, response.user);
      onLoginSuccess(response.user);
    } catch (error) {
      setErrorMessage(error.message || "Login gagal. Periksa kembali data kamu.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Analisis TBS dalam satu ruang kerja"
      description="Gunakan nama dan nomor telepon yang sudah terdaftar untuk melanjutkan pemeriksaan TBS."
      cardEyebrow="Masuk"
      cardTitle="Masuk ke akun"
      cardDescription="Masukkan identitas akun SawitVision Anda."
      footer={(
        <>
          <span>Belum punya akun?</span>
          <Button type="button" variant="ghost" size="sm" onClick={onGoToRegister} disabled={isLoading}>
            Daftar sekarang
          </Button>
        </>
      )}
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <FormField
          id="login-name"
          label="Nama lengkap"
          error={fieldErrors.name}
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Contoh: Budi Santoso"
          autoComplete="name"
          disabled={isLoading}
          required
        />
        <FormField
          id="login-phone"
          label="Nomor telepon"
          hint="Gunakan nomor yang terdaftar, misalnya 081234567890."
          error={fieldErrors.phone_number}
          type="tel"
          name="phone_number"
          value={formData.phone_number}
          onChange={handleChange}
          placeholder="081234567890"
          autoComplete="tel"
          inputMode="tel"
          disabled={isLoading}
          required
        />

        <div className="auth-form-assistance">
          <Button type="button" variant="ghost" size="sm" onClick={onGoToForgotAccount} disabled={isLoading}>
            Lupa akun?
          </Button>
        </div>

        {errorMessage && <Alert tone="error" role="alert">{errorMessage}</Alert>}

        <Button type="submit" block disabled={isLoading}>
          <Icon name="login" size={19} />
          {isLoading ? "Sedang masuk..." : "Masuk ke SawitVision"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default LoginPage;
