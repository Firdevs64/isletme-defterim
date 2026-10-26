/* ============================================================
   TransactionsPage — Referans Ekran 6: İşlemler Listesi
   Tam referans tasarıma uygun:
   - Header: ← İşlemler  Filtrele ikonu
   - Filtreler: Tümü | Satış | Alış | Tahsilat | Ödeme
   - Tarihe Göre Gruplu Liste (Örn. 18 Ekim 2026 Pazar, 17 Ekim 2026 Cumartesi)
   - İşlem satırı: Tür ikonu, Başlık, Cari Adı, Tutar (₺), Saat
============================================================ */
import { useMemo, useState } from "react";
import {
  formatMoney,
  normalizeType,
  getTypeLabel,
  isIncome,
} from "../utils/transactionHelpers";

const FILTERS = [
  { key: "all", label: "Tümü" },
  { key: "sale", label: "Satış" },
  { key: "purchase", label: "Alış" },
  { key: "collection", label: "Tahsilat" },
  { key: "payout", label: "Ödeme" },
];

function TransactionsPage({ transactions, deleteTransaction, onBack }) {
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    if (filter === "all") return transactions;
    return transactions.filter((t) => normalizeType(t.type) === filter);
  }, [transactions, filter]);

  /* Tarihe göre grupla (En yeni tarih en üstte) */
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((t) => {
      const key = t.date || "Tarihsiz";
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return Object.entries(map).sort(([a], [b]) => (b > a ? 1 : -1));
  }, [filtered]);

  return (
    <div className="page islemler-page">
      {/* Header: ← İşlemler      Filtrele */}
      <div className="islemler-header-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {onBack && (
            <button type="button" className="sub-header-back-btn" onClick={onBack}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
          )}
          <h1 className="islemler-title">İşlemler</h1>
        </div>
        <button
          type="button"
          className="islemler-filter-action-btn"
          title="Filtrele"
          onClick={() => {
            // Döngüsel filtre geçişi
            const idx = FILTERS.findIndex((f) => f.key === filter);
            const nextIdx = (idx + 1) % FILTERS.length;
            setFilter(FILTERS[nextIdx].key);
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span>Filtrele</span>
        </button>
      </div>

      {/* Filtre Butonları (Tümü | Satış | Alış | Tahsilat | Ödeme) */}
      <div className="islemler-filter-pills-row">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`islem-pill-btn ${filter === key ? "active" : ""}`}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tarihe Göre Gruplanmış Liste */}
      {grouped.length === 0 ? (
        <div className="empty-islemler-box">
          <div className="empty-icon-circle">📋</div>
          <strong>İşlem bulunamadı</strong>
          <span>Seçtiğiniz filtreye ait kayıtlı bir işlem yok.</span>
        </div>
      ) : (
        <div className="islemler-date-groups-stack">
          {grouped.map(([dateKey, items]) => (
            <div key={dateKey} className="islemler-date-group-block">
              {/* Grup Başlığı: 18 Ekim 2026 Pazar */}
              <div className="islemler-date-group-title">
                {formatGroupDateTurkish(dateKey)}
              </div>

              {/* Grup İçindeki Kartlar */}
              <div className="islemler-items-card">
                {items.map((item) => {
                  const normType = normalizeType(item.type);
                  const income = isIncome(item.type);
                  const label = getTypeLabel(item.type);

                  return (
                    <div className="islem-row-item" key={item.id}>
                      {/* Sol İkon (Daire) */}
                      <div className={`islem-item-icon islem-icon-${normType}`}>
                        {normType === "collection" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
                          </svg>
                        )}
                        {normType === "sale" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                          </svg>
                        )}
                        {normType === "purchase" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                          </svg>
                        )}
                        {normType === "payout" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
                          </svg>
                        )}
                      </div>

                      {/* Orta Başlık & Cari */}
                      <div className="islem-item-info">
                        <strong className="islem-item-type-name">{label}</strong>
                        <span className="islem-item-customer-name">
                          {item.customer || item.title || "—"}
                        </span>
                      </div>

                      {/* Sağ Tutar & Saat */}
                      <div className="islem-item-values">
                        <strong
                          className={`islem-item-amount ${
                            normType === "sale"
                              ? "amount-blue"
                              : normType === "collection"
                              ? "amount-green"
                              : "amount-red"
                          }`}
                        >
                          {normType === "purchase" || normType === "payout" ? "-" : ""}
                          {formatMoney(item.amount)} ₺
                        </strong>
                        <span className="islem-item-time">
                          {formatItemTime(item.createdAt)}
                        </span>
                      </div>

                      {/* Silme Butonu */}
                      <button
                        type="button"
                        className="islem-delete-btn"
                        title="İşlemi Sil"
                        onClick={() => deleteTransaction(item.id)}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatGroupDateTurkish(dateStr) {
  if (!dateStr || dateStr === "Tarihsiz") return "Tarihsiz";
  try {
    const d = new Date(`${dateStr}T00:00:00`);
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      weekday: "long",
    }).format(d);
  } catch {
    return dateStr;
  }
}

function formatItemTime(createdAt) {
  if (!createdAt) return "12:00";
  try {
    const d = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    return new Intl.DateTimeFormat("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "12:00";
  }
}

export default TransactionsPage;
