/* ============================================================
   HomePage — Referans Ekran 1: Dashboard
   Tam referans tasarıma uygun:
   - Üst Bölüm: Logo, "İşletme Defterim", "Kolayca Takip Et", Bildirim ve Ayarlar
   - Genel Durum Kartı: Beyaz kart, "Bu Ay ▾", ₺ Tutar ↗, mini bar grafik
   - 4 Özet Kart: Alacaklar, Borçlar, Bu Ay Satış, Bu Ay Gider
   - Hızlı İşlem: 4 kart (Satış, Alış, Tahsilat, Ödeme)
   - Son İşlemler: Liste ve detaylar
============================================================ */
import { useMemo, useState } from "react";
import {
  formatMoney,
  formatDate,
  filterThisMonth,
  normalizeType,
  getTypeLabel,
  isIncome,
} from "../utils/transactionHelpers";

function HomePage({ profile, transactions, onNavigate, onOpenQuickPayment }) {
  const [period, setPeriod] = useState("month"); // month | today | year
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const thisMonth = useMemo(() => filterThisMonth(transactions), [transactions]);
  const now = new Date();

  /* ---- Hesaplamalar ---- */
  const summary = useMemo(() => {
    // Tüm zamanlar toplamı (Genel Alacak & Borç)
    const totalSales = transactions
      .filter((t) => normalizeType(t.type) === "sale")
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalCollections = transactions
      .filter((t) => normalizeType(t.type) === "collection")
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalPurchases = transactions
      .filter((t) => normalizeType(t.type) === "purchase")
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalPayouts = transactions
      .filter((t) => normalizeType(t.type) === "payout")
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    // Alacaklar = Satışlar - Yapılan Tahsilatlar
    const receivables = Math.max(0, totalSales - totalCollections);
    // Borçlar = Alışlar - Yapılan Ödemeler
    const payables = Math.max(0, totalPurchases - totalPayouts);

    // Seçilen döneme göre (Bu Ay, Bugün, Bu Yıl)
    let periodTxns = transactions;
    if (period === "month") {
      periodTxns = thisMonth;
    } else if (period === "today") {
      const todayStr = new Intl.DateTimeFormat("en-CA").format(now);
      periodTxns = transactions.filter((t) => t.date === todayStr);
    } else if (period === "year") {
      const thisYear = now.getFullYear();
      periodTxns = transactions.filter((t) => t.date && t.date.startsWith(String(thisYear)));
    }

    const periodSales = periodTxns
      .filter((t) => normalizeType(t.type) === "sale")
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const periodPurchases = periodTxns
      .filter((t) => normalizeType(t.type) === "purchase")
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const periodCollections = periodTxns
      .filter((t) => normalizeType(t.type) === "collection")
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const periodPayouts = periodTxns
      .filter((t) => normalizeType(t.type) === "payout")
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    // Net Genel Durum = Bu Ay Satış/Tahsilat - Gider/Ödeme
    const netGeneral = (periodSales + periodCollections) - (periodPurchases + periodPayouts);

    return {
      receivables,
      payables,
      netGeneral,
      monthSales: periodSales,
      monthPurchases: periodPurchases,
      periodCollections,
      periodPayouts,
    };
  }, [transactions, thisMonth, period]);

  const recentTransactions = transactions.slice(0, 5);

  const getPeriodLabel = () => {
    if (period === "today") return "Bugün";
    if (period === "year") return "Bu Yıl";
    return "Bu Ay";
  };

  return (
    <div className="page home-page">
      {/* ==================== 1. ÜST HEADER ==================== */}
      <header className="home-top-header">
        <div className="home-brand-group">
          {/* Defter Logo İkonu */}
          <div className="home-notebook-icon">
            <img src="/logo.png" alt="İşletme Defterim" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 8 }} />
          </div>
          <div className="home-title-wrap">
            <h1 className="home-app-title">İşletme Defterim</h1>
            <span className="home-app-subtitle">Kolayca Takip Et</span>
          </div>
        </div>

        {/* Sağ Bildirim ve Ayarlar İkonları */}
        <div className="home-header-buttons">
          <button
            type="button"
            className="home-nav-circle-btn"
            title="Bildirimler"
            onClick={() => alert("Henüz yeni bildiriminiz bulunmuyor.")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="notification-badge-dot" />
          </button>
          <button
            type="button"
            className="home-nav-circle-btn"
            title="Ayarlar"
            onClick={() => onNavigate("menu")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      {/* ==================== 2. ANA İÇERİK ==================== */}
      <main className="home-content">
        {/* ---- GENEL DURUM KARTI ---- */}
        <section className="genel-durum-white-card">
          <div className="genel-durum-header-line">
            <span className="gd-card-title">Genel Durum</span>
            <div className="gd-period-dropdown-wrap">
              <button
                type="button"
                className="gd-period-dropdown-btn"
                onClick={() => setShowPeriodMenu(!showPeriodMenu)}
              >
                <span>{getPeriodLabel()}</span>
                <span className="gd-chevron">▾</span>
              </button>
              {showPeriodMenu && (
                <div className="gd-period-menu">
                  <button type="button" onClick={() => { setPeriod("today"); setShowPeriodMenu(false); }}>Bugün</button>
                  <button type="button" onClick={() => { setPeriod("month"); setShowPeriodMenu(false); }}>Bu Ay</button>
                  <button type="button" onClick={() => { setPeriod("year"); setShowPeriodMenu(false); }}>Bu Yıl</button>
                </div>
              )}
            </div>
          </div>

          <div className="genel-durum-main-row">
            <div className="gd-amount-wrap">
              <strong className="gd-amount-text">
                ₺{formatMoney(summary.netGeneral)}
              </strong>
              <span className={`gd-arrow-badge ${summary.netGeneral >= 0 ? "arrow-up" : "arrow-down"}`}>
                {summary.netGeneral >= 0 ? "↗" : "↘"}
              </span>
            </div>

            {/* Sağ Taraftaki Mini Bar Grafik (Referans Tasarımdaki Açık Mavi/Teal Çubuklar) */}
            <div className="gd-mini-barchart">
              <div className="gd-mini-bar" style={{ height: "45%" }} />
              <div className="gd-mini-bar" style={{ height: "70%" }} />
              <div className="gd-mini-bar" style={{ height: "55%" }} />
              <div className="gd-mini-bar" style={{ height: "90%" }} />
              <div className="gd-mini-bar" style={{ height: "65%" }} />
            </div>
          </div>
        </section>

        {/* ---- 4 ÖZET KART (ALACAKLAR, BORÇLAR, BU AY SATIŞ, BU AY GİDER) ---- */}
        <section className="summary-four-grid">
          {/* 1. Alacaklar */}
          <div className="summary-small-card s-card-receivable">
            <div className="s-icon-box s-icon-receivable">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <circle cx="12" cy="12" r="2.5" />
                <path d="M6 12h.01M18 12h.01" />
              </svg>
            </div>
            <span className="s-card-label">Alacaklar</span>
            <strong className="s-card-value amount-green">₺{formatMoney(summary.receivables)}</strong>
          </div>

          {/* 2. Borçlar */}
          <div className="summary-small-card s-card-payable">
            <div className="s-icon-box s-icon-payable">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <span className="s-card-label">Borçlar</span>
            <strong className="s-card-value amount-red">₺{formatMoney(summary.payables)}</strong>
          </div>

          {/* 3. Bu Ay Satış */}
          <div className="summary-small-card s-card-sales">
            <div className="s-icon-box s-icon-sales">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <span className="s-card-label">{getPeriodLabel()} Satış</span>
            <strong className="s-card-value amount-blue">₺{formatMoney(summary.monthSales)}</strong>
          </div>

          {/* 4. Bu Ay Gider */}
          <div className="summary-small-card s-card-expense">
            <div className="s-icon-box s-icon-expense">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <span className="s-card-label">{getPeriodLabel()} Gider</span>
            <strong className="s-card-value amount-orange">₺{formatMoney(summary.monthPurchases)}</strong>
          </div>
        </section>

        {/* ---- HIZLI İŞLEM BÖLÜMÜ ---- */}
        <section className="hizli-islem-block">
          <div className="block-title-row">
            <h2 className="block-title">Hızlı İşlem</h2>
            <button
              type="button"
              className="block-more-link"
              onClick={() => onNavigate("transactions")}
            >
              Tümü ›
            </button>
          </div>

          <div className="quick-actions-four-grid">
            {/* 1. Satış (İş) */}
            <button
              type="button"
              className="quick-action-card qa-card-sale"
              onClick={() => onNavigate("newTransaction", { type: "sale" })}
            >
              <div className="qa-icon-wrap qa-icon-sale">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
              </div>
              <strong className="qa-title">Satış</strong>
              <span className="qa-subtitle">(İş)</span>
            </button>

            {/* 2. Alış (Gider) */}
            <button
              type="button"
              className="quick-action-card qa-card-purchase"
              onClick={() => onNavigate("newTransaction", { type: "purchase" })}
            >
              <div className="qa-icon-wrap qa-icon-purchase">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>
              <strong className="qa-title">Alış</strong>
              <span className="qa-subtitle">(Gider)</span>
            </button>

            {/* 3. Tahsilat (Para Girişi) */}
            <button
              type="button"
              className="quick-action-card qa-card-collection"
              onClick={() => onOpenQuickPayment("collection")}
            >
              <div className="qa-icon-wrap qa-icon-collection">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <polyline points="19 12 12 19 5 12" />
                </svg>
              </div>
              <strong className="qa-title">Tahsilat</strong>
              <span className="qa-subtitle">(Para Girişi)</span>
            </button>

            {/* 4. Ödeme (Para Çıkışı) */}
            <button
              type="button"
              className="quick-action-card qa-card-payout"
              onClick={() => onOpenQuickPayment("payout")}
            >
              <div className="qa-icon-wrap qa-icon-payout">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </div>
              <strong className="qa-title">Ödeme</strong>
              <span className="qa-subtitle">(Para Çıkışı)</span>
            </button>
          </div>
        </section>

        {/* ---- SON İŞLEMLER BÖLÜMÜ ---- */}
        <section className="son-islemler-block">
          <div className="block-title-row">
            <h2 className="block-title">Son İşlemler</h2>
            <button
              type="button"
              className="block-more-link"
              onClick={() => onNavigate("transactions")}
            >
              Tümü ›
            </button>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="home-empty-card">
              <div className="empty-icon-circle">📋</div>
              <strong>Henüz işlem yok</strong>
              <span>Hızlı işlem butonları veya ortadaki + butonuyla yeni işlem ekleyebilirsiniz.</span>
            </div>
          ) : (
            <div className="home-txn-list-card">
              {recentTransactions.map((item) => (
                <HomeTxnRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

/* ---- Referans Görseldeki Son İşlemler Satırı ---- */
function HomeTxnRow({ item }) {
  const normType = normalizeType(item.type);
  const income = isIncome(item.type);
  const label = getTypeLabel(item.type);

  // İkon ve Renk Seçimi
  const getIconData = () => {
    if (normType === "collection") {
      return {
        bg: "#eafaf1",
        color: "#12b76a",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
        ),
      };
    }
    if (normType === "sale") {
      return {
        bg: "#ebf8ff",
        color: "#0f7bff",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
        ),
      };
    }
    if (normType === "purchase") {
      return {
        bg: "#fef2f2",
        color: "#ef4444",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        ),
      };
    }
    // Payout (Ödeme)
    return {
      bg: "#fff7ed",
      color: "#ea580c",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      ),
    };
  };

  const iconInfo = getIconData();

  const isNegative = normType === "purchase" || normType === "payout";
  const amountColorClass =
    normType === "sale"
      ? "amount-blue"
      : normType === "collection"
      ? "amount-green"
      : "amount-red";

  return (
    <div className="home-txn-row">
      <div className="home-txn-icon-circle" style={{ backgroundColor: iconInfo.bg, color: iconInfo.color }}>
        {iconInfo.icon}
      </div>
      <div className="home-txn-info-col">
        <strong className="home-txn-type-title">{label}</strong>
        <span className="home-txn-customer-name">{item.customer || item.title || "Genel İşlem"}</span>
      </div>
      <div className="home-txn-amount-col">
        <strong className={`home-txn-amount-val ${amountColorClass}`}>
          {isNegative ? "-" : ""}{formatMoney(item.amount)} ₺
        </strong>
        <span className="home-txn-date-val">{formatDate(item.date)}</span>
      </div>
    </div>
  );
}

export default HomePage;
