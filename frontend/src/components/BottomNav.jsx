import Icon from "./ui/Icon";

const NAV_ITEMS = [
  { id: "home", label: "Beranda", icon: "home" },
  { id: "prediction", label: "Prediksi", icon: "scan" },
  { id: "history", label: "Riwayat", icon: "history" },
  { id: "profile", label: "Profil", icon: "profile" },
  { id: "about", label: "Tentang", icon: "info" },
];

function BottomNav({ activePage, onNavigate }) {
  return (
    <nav className="bottom-navigation" aria-label="Navigasi utama">
      <div className="bottom-navigation-inner">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`bottom-navigation-item ${activePage === item.id ? "active" : ""}`}
            onClick={() => onNavigate(item.id)}
            aria-current={activePage === item.id ? "page" : undefined}
          >
            <span className="bottom-navigation-icon" aria-hidden="true">
              <Icon name={item.icon} size={21} />
            </span>
            <span className="bottom-navigation-label">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

export default BottomNav;
