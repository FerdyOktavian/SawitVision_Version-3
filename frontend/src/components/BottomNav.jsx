function BottomNav({ activePage, onNavigate, currentUser }) {
  const navItems = [
    {
      id: "home",
      label: "Beranda",
      icon: "🏠",
    },
    {
      id: "prediction",
      label: "Prediksi",
      icon: "📷",
    },
    {
      id: "history",
      label: "Riwayat",
      icon: "🕘",
    },
    {
      id: "profile",
      label: "Profil",
      icon: "👤",
    },
    {
      id: "about",
      label: "Tentang",
      icon: "ℹ️",
    },
  ];

  if (currentUser?.role === "admin") {
    navItems.push({
      id: "admin",
      label: "Admin",
      icon: "🛡️",
    });
  }

  return (
    <nav className="bottom-navigation">
      <div className="bottom-navigation-inner">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`bottom-navigation-item ${
              activePage === item.id ? "active" : ""
            }`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="bottom-navigation-icon">{item.icon}</span>

            <span className="bottom-navigation-label">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

export default BottomNav;
