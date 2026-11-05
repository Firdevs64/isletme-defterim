/* ============================================================
   Sidebar — Masaüstü Sol Sabit Navigasyon
   - Logo & Marka (İşletme Defteri, Kolayca Takip Et)
   - Ana Navigasyon (Ana Sayfa, Cariler, Yeni İşlem, Raporlar, Menü)
   - Alt Kısım: Tema Değiştirici, Kullanıcı Profili
============================================================ */

function Sidebar({
  currentPage,
  onNavigate,
  profile,
  theme,
  toggleTheme,
}) {
  const getInitials = (name) => {
    if (!name) return "İD";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const displayName = profile?.businessName || profile?.fullName || "İşletme Sahibi";

  return (
    <aside className="desktop-sidebar">
      {/* 1. Üst Logo & Marka Başlığı */}
      <div
        className="desktop-sidebar-brand"
        onClick={() => onNavigate("home")}
        role="button"
        tabIndex={0}
      >
        <div className="desktop-sidebar-logo-box">
          <img src="/logo.png" alt="İşletme Defteri" />
        </div>
        <div className="desktop-sidebar-brand-info">
          <span className="desktop-sidebar-app-name">İşletme Defteri</span>
          <span className="desktop-sidebar-app-tagline">Kolayca Takip Et</span>
        </div>
      </div>

      {/* 2. Ana Navigasyon Butonları */}
      <nav className="desktop-sidebar-nav">
        {/* 1. Ana Sayfa */}
        <button
          type="button"
          className={`desktop-sidebar-item ${currentPage === "home" ? "active" : ""}`}
          onClick={() => onNavigate("home")}
        >
          <div className="sidebar-item-icon">
            <svg
              viewBox="0 0 24 24"
              fill={currentPage === "home" ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1V9.5z" />
            </svg>
          </div>
          <span className="sidebar-item-label">Ana Sayfa</span>
        </button>

        {/* 2. Cariler */}
        <button
          type="button"
          className={`desktop-sidebar-item ${currentPage === "customers" ? "active" : ""}`}
          onClick={() => onNavigate("customers")}
        >
          <div className="sidebar-item-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <span className="sidebar-item-label">Cariler</span>
        </button>

        {/* 3. Yeni İşlem (Öne Çıkarılmış Buton) */}
        <button
          type="button"
          className={`desktop-sidebar-item sidebar-new-txn-item ${
            currentPage === "newTransaction" ? "active" : ""
          }`}
          onClick={() => onNavigate("newTransaction")}
        >
          <div className="sidebar-item-icon sidebar-plus-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span className="sidebar-item-label">Yeni İşlem</span>
        </button>

        {/* 4. Raporlar */}
        <button
          type="button"
          className={`desktop-sidebar-item ${currentPage === "reports" ? "active" : ""}`}
          onClick={() => onNavigate("reports")}
        >
          <div className="sidebar-item-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <span className="sidebar-item-label">Raporlar</span>
        </button>

        {/* 5. Menü */}
        <button
          type="button"
          className={`desktop-sidebar-item ${currentPage === "menu" ? "active" : ""}`}
          onClick={() => onNavigate("menu")}
        >
          <div className="sidebar-item-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="4" rx="1" />
              <rect x="3" y="10" width="18" height="4" rx="1" />
              <rect x="3" y="16" width="18" height="4" rx="1" />
            </svg>
          </div>
          <span className="sidebar-item-label">Menü</span>
        </button>
      </nav>

      {/* 3. Alt Araçlar & Profil */}
      <div className="desktop-sidebar-footer">
        {/* Tema Değiştir Butonu */}
        <button
          type="button"
          className="desktop-sidebar-theme-btn"
          onClick={toggleTheme}
          title={theme === "dark" ? "Açık Temaya Geç" : "Karanlık Temaya Geç"}
        >
          <div className="sidebar-item-icon">
            {theme === "dark" ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </div>
          <span className="sidebar-theme-label">
            {theme === "dark" ? "Açık Tema" : "Karanlık Tema"}
          </span>
        </button>

        {/* Profil Kartı */}
        <div
          className={`desktop-sidebar-profile-card ${currentPage === "profile" ? "active" : ""}`}
          onClick={() => onNavigate("profile")}
          role="button"
          tabIndex={0}
          title="Profil Bilgileri"
        >
          <div className="desktop-sidebar-avatar">
            {getInitials(displayName)}
          </div>
          <div className="desktop-sidebar-user-meta">
            <strong className="desktop-sidebar-user-title">{displayName}</strong>
            <span className="desktop-sidebar-user-desc">Profil & Bilgiler</span>
          </div>
          <span className="desktop-sidebar-chevron">›</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
