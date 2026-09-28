import Icon from "./ui/Icon";

function getInitials(name = "") {
  const cleanName = String(name).trim();

  if (!cleanName) return "SV";

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
          <span className="app-header-logo" aria-hidden="true">
            <Icon name="leaf" size={24} />
          </span>
          <span className="app-header-brand-copy">
            <span className="app-header-brand-row">
              <span className="app-header-title">SawitVision</span>
            </span>
            <span className="app-header-subtitle">Pemeriksaan kematangan TBS</span>
          </span>
        </button>

        <div className="app-header-actions">
          {currentUser?.role === "admin" && (
            <button
              type="button"
              className="app-header-admin"
              onClick={() => onNavigate?.("admin")}
            >
              <Icon name="admin" size={19} />
              <span>Admin</span>
            </button>
          )}

          <button
            type="button"
            className="app-header-user"
            onClick={() => onNavigate?.("profile")}
            aria-label="Buka profil pengguna"
          >
            <span className="app-header-user-text">
              <span>Pengguna aktif</span>
              <strong>{userName}</strong>
            </span>
            <span className="app-header-avatar" aria-hidden="true">
              <span>{initials}</span>
              <i className="app-header-online-dot" />
            </span>
            <Icon className="app-header-chevron" name="chevron" size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
