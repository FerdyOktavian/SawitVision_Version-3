function getInitials(name = "") {
  const cleanName = String(name).trim();

  if (!cleanName) {
    return "SV";
  }

  return cleanName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function AppHeader({ currentUser, onNavigate }) {
  const userName = currentUser?.full_name || currentUser?.name || "Pengguna";

  const initials = getInitials(userName);

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <button
          type="button"
          className="app-header-brand"
          onClick={() => onNavigate?.("home")}
          aria-label="Buka beranda SawitVision"
        >
          <div className="app-header-logo">
            <span className="app-header-logo-main">🌴</span>

            <span className="app-header-logo-ai">AI</span>
          </div>

          <div className="app-header-brand-copy">
            <div className="app-header-brand-row">
              <h1 className="app-header-title">SawitVision</h1>

              <span className="app-header-version">V3</span>
            </div>

            <span className="app-header-subtitle">
              Klasifikasi kematangan kelapa sawit
            </span>
          </div>
        </button>

        <button
          type="button"
          className="app-header-user"
          onClick={() => onNavigate?.("profile")}
          aria-label="Buka profil pengguna"
        >
          <div className="app-header-user-text">
            <span>Selamat datang</span>

            <strong>{userName}</strong>
          </div>

          <div className="app-header-avatar">
            <span>{initials}</span>

            <i className="app-header-online-dot" aria-hidden="true" />
          </div>

          <span className="app-header-chevron" aria-hidden="true">
            ›
          </span>
        </button>
      </div>
    </header>
  );
}

export default AppHeader;
