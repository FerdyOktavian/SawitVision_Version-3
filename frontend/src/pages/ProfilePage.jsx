import { useEffect, useMemo, useState } from "react";
import {
  getCurrentUser,
  logoutUser,
  saveStoredUser,
  updateProfile,
  deleteMyAccount,
} from "../services/api";

function normalizePhone(value = "") {
  return String(value).replace(/[^\d+]/g, "");
}

function resolveUser(response) {
  return response?.user || response?.data || response || null;
}

function ProfilePage({ currentUser, onUserUpdated, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      setIsLoading(true);
      setMessage("");

      try {
        const response = await getCurrentUser();

        const user = resolveUser(response);

        if (!mounted) {
          return;
        }

        setProfile(user);
        setFullName(user?.full_name || "");
        setPhoneNumber(user?.phone_number || "");

        if (user) {
          saveStoredUser(user);
          onUserUpdated?.(user);
        }
      } catch (error) {
        if (!mounted) {
          return;
        }

        if (currentUser) {
          setProfile(currentUser);

          setFullName(currentUser?.full_name || "");

          setPhoneNumber(currentUser?.phone_number || "");
        } else {
          setMessageType("error");
          setMessage(error.message || "Profil gagal dimuat.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const initials = useMemo(() => {
    const name = profile?.full_name || fullName || "Pengguna";

    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }, [profile?.full_name, fullName]);

  const hasChanges = useMemo(() => {
    const storedName = profile?.full_name || "";

    const storedPhone = profile?.phone_number || "";

    return (
      fullName.trim() !== storedName.trim() ||
      normalizePhone(phoneNumber) !== normalizePhone(storedPhone)
    );
  }, [fullName, phoneNumber, profile]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");

    const cleanName = fullName.trim();

    const cleanPhone = normalizePhone(phoneNumber);

    if (cleanName.length < 2) {
      setMessageType("error");

      setMessage("Nama minimal terdiri dari 2 karakter.");

      return;
    }

    if (cleanPhone.length < 8) {
      setMessageType("error");

      setMessage("Nomor telepon belum valid.");

      return;
    }

    setIsSaving(true);

    try {
      await updateProfile({
        full_name: cleanName,
        phone_number: cleanPhone,
      });

      // Ambil ulang dari backend agar data yang
      // tampil benar-benar sama dengan database.
      const freshResponse = await getCurrentUser();

      const updatedUser = resolveUser(freshResponse);

      if (!updatedUser) {
        throw new Error("Data pengguna terbaru tidak ditemukan.");
      }

      // Sinkronkan seluruh state profil.
      setProfile(updatedUser);
      setFullName(updatedUser.full_name || cleanName);
      setPhoneNumber(updatedUser.phone_number || cleanPhone);

      // Sinkronkan localStorage.
      saveStoredUser(updatedUser);

      // Sinkronkan currentUser di App.jsx
      // supaya header ikut berubah.
      onUserUpdated?.(updatedUser);

      setMessageType("success");
      setMessage("Profil berhasil diperbarui dan disimpan.");
    } catch (error) {
      setMessageType("error");

      setMessage(error.message || "Profil gagal diperbarui.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    const confirmed = window.confirm("Keluar dari akun SawitVision?");

    if (!confirmed) {
      return;
    }

    try {
      await logoutUser();
    } finally {
      onLogout?.();
    }
  };

  const handleDeleteAccount = async () => {
    const firstConfirmed = window.confirm(
      "Hapus akun SawitVision secara permanen? Seluruh riwayat prediksi dan gambar milik akun ini juga akan dihapus.",
    );

    if (!firstConfirmed) {
      return;
    }

    const finalConfirmed = window.confirm(
      "Konfirmasi terakhir: tindakan ini tidak dapat dibatalkan. Tetap hapus akun?",
    );

    if (!finalConfirmed) {
      return;
    }

    setIsDeleting(true);
    setMessage("");

    try {
      await deleteMyAccount();

      await logoutUser();

      onLogout?.();
    } catch (error) {
      setMessageType("error");
      setMessage(error.message || "Akun gagal dihapus.");
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="profile-page">
        <section className="profile-loading">
          <div className="profile-spinner" />
          <h2>Memuat profil...</h2>
          <p>Tunggu sebentar, data akun sedang disiapkan.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <section className="profile-hero">
        <div className="profile-avatar">{initials}</div>

        <div className="profile-hero-copy">
          <span className="profile-eyebrow">Profil pengguna</span>

          <h1>{profile?.full_name || "Pengguna SawitVision"}</h1>

          <p>
            Kelola nama dan nomor telepon yang digunakan untuk masuk ke
            aplikasi.
          </p>
        </div>

        <div className="profile-status">
          <span />
          Akun aktif
        </div>
      </section>

      <section className="profile-layout">
        <section className="profile-main-card">
          <div className="profile-section-title">
            <span>Informasi akun</span>
            <h2>Data pengguna</h2>
          </div>

          <form className="profile-form" onSubmit={handleSubmit}>
            <label>
              <span>Nama lengkap</span>

              <div className="profile-input-wrap">
                <i>👤</i>

                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Masukkan nama"
                  autoComplete="name"
                />
              </div>

              <small>
                Nama dapat diubah dan perubahan akan disimpan sebagai data akun
                terbaru.
              </small>
            </label>

            <label>
              <span>Nomor telepon</span>

              <div className="profile-input-wrap">
                <i>📱</i>

                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  placeholder="Contoh: 081234567890"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>

              <small>
                Nomor telepon yang baru akan digunakan untuk login berikutnya.
              </small>
            </label>

            {message && (
              <div className={`profile-message ${messageType}`}>
                {messageType === "success" ? "✓" : "⚠️"} {message}
              </div>
            )}

            <button
              type="submit"
              className="profile-save-button"
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? "Menyimpan perubahan..." : "Simpan perubahan"}
            </button>
          </form>
        </section>

        <aside className="profile-side">
          <section className="profile-info-card">
            <div className="profile-card-icon">🔄</div>

            <div>
              <h3>Data selalu tersinkron</h3>
              <p>
                Setelah disimpan, nama dan nomor telepon pada profil akan
                mengikuti data terbaru di database.
              </p>
            </div>
          </section>

          <section className="profile-info-card">
            <div className="profile-card-icon">📲</div>

            <div>
              <h3>Nomor telepon penting</h3>
              <p>
                Nomor yang baru akan menjadi nomor login untuk penggunaan
                berikutnya.
              </p>
            </div>
          </section>

          <section className="profile-account-card">
            <span>Akun saat ini</span>

            <div>
              <small>Nama</small>

              <strong>{profile?.full_name || "-"}</strong>
            </div>

            <div>
              <small>Nomor telepon</small>

              <strong>{profile?.phone_number || "-"}</strong>
            </div>

            <div>
              <small>Peran</small>

              <strong>
                {profile?.role === "admin" ? "Administrator" : "Pengguna"}
              </strong>
            </div>
          </section>

          {profile?.role !== "admin" && (
            <section className="profile-danger-card">
              <div className="profile-danger-copy">
                <strong>Hapus akun</strong>
                <p>
                  Akun, seluruh riwayat klasifikasi, dan gambar prediksi akan
                  dihapus permanen dan tidak dapat dipulihkan.
                </p>
              </div>

              <button
                type="button"
                className="profile-delete-button"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? "Menghapus akun..." : "🗑️ Hapus akun"}
              </button>
            </section>
          )}

          <button
            type="button"
            className="profile-logout-button"
            onClick={handleLogout}
            disabled={isDeleting}
          >
            🚪 Keluar dari akun
          </button>
        </aside>
      </section>
    </main>
  );
}

export default ProfilePage;
