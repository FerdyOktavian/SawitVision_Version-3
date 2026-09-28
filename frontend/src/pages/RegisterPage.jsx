import { useState } from "react";
import AuthLayout from "../components/auth/AuthLayout";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import FormField from "../components/ui/FormField";
import Icon from "../components/ui/Icon";
import { registerUser } from "../services/api";
import { formatPhoneInput, getPhoneError } from "../utils/phone";

function RegisterPage({ onGoToLogin, onRegisterSuccess }) {
  const [formData, setFormData] = useState({ name: "", phone_number: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (event) => {
    const { name, value } = event.target;
    setErrorMessage("");
    setSuccessMessage("");
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
    setSuccessMessage("");
    setFieldErrors({});
    try {
      const response = await registerUser({
        name: cleanedName,
        phone_number: formData.phone_number,
      });
      setSuccessMessage(response.message || "Pendaftaran berhasil. Silakan masuk.");
      setFormData({ name: "", phone_number: "" });
      if (onRegisterSuccess) onRegisterSuccess(response.user);
    } catch (error) {
      setErrorMessage(error.message || "Pendaftaran gagal. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Mulai menggunakan SawitVision"
      description="Buat akun SawitVision dengan nama dan nomor telepon aktif."
      cardEyebrow="Daftar"
      cardTitle="Buat akun baru"
      cardDescription="Nomor telepon digunakan sebagai identitas unik akun."
      footer={(
        <>
          <span>Sudah punya akun?</span>
          <Button type="button" variant="ghost" size="sm" onClick={onGoToLogin} disabled={isLoading}>
            Masuk sekarang
          </Button>
        </>
      )}
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <FormField
          id="register-name"
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
          id="register-phone"
          label="Nomor telepon"
          hint="Gunakan nomor aktif dengan format 08."
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

        {errorMessage && <Alert tone="error" role="alert">{errorMessage}</Alert>}
        {successMessage && <Alert tone="success" role="status">{successMessage}</Alert>}

        <Button type="submit" block disabled={isLoading}>
          <Icon name="profile" size={19} />
          {isLoading ? "Sedang mendaftar..." : "Daftar akun"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default RegisterPage;
