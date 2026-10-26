/* ============================================================
   BottomNav — Referans Tasarım Alt Menü
   5 Sekme: Ana Sayfa, Cariler, Ortada büyük + (Yeni İşlem), Raporlar, Menü
============================================================ */

function BottomNav({ currentPage, onNavigate }) {
  return (
    <nav className="bottom-nav">
      {/* 1. Ana Sayfa */}
      <button
        type="button"
        className={`bottom-nav-item ${currentPage === "home" ? "active" : ""}`}
        onClick={() => onNavigate("home")}
      >
        <svg viewBox="0 0 24 24" fill={currentPage === "home" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1V9.5z" />
        </svg>
        <span>Ana Sayfa</span>
      </button>

      {/* 2. Cariler */}
      <button
        type="button"
        className={`bottom-nav-item ${currentPage === "customers" ? "active" : ""}`}
        onClick={() => onNavigate("customers")}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span>Cariler</span>
      </button>

      {/* 3. Ortada Büyük Yeni İşlem Butonu */}
      <button
        type="button"
        className="bottom-nav-center-wrap"
        onClick={() => onNavigate("newTransaction")}
      >
        <div className="bottom-nav-center-circle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <span className="bottom-nav-center-label">Yeni İşlem</span>
      </button>

      {/* 4. Raporlar */}
      <button
        type="button"
        className={`bottom-nav-item ${currentPage === "reports" ? "active" : ""}`}
        onClick={() => onNavigate("reports")}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
        <span>Raporlar</span>
      </button>

      {/* 5. Menü */}
      <button
        type="button"
        className={`bottom-nav-item ${currentPage === "menu" ? "active" : ""}`}
        onClick={() => onNavigate("menu")}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="4" rx="1" />
          <rect x="3" y="10" width="18" height="4" rx="1" />
          <rect x="3" y="16" width="18" height="4" rx="1" />
        </svg>
        <span>Menü</span>
      </button>
    </nav>
  );
}

export default BottomNav;
