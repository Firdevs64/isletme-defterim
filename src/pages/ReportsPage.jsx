/* ============================================================
   ReportsPage — Referans Ekran 8: Raporlar
   Tam referans tasarıma uygun:
   - Header: Raporlar
   - Sekmeler: [Bu Ay] [Bu Yıl] [Tarih Aralığı]
   - 4 Özet Kartı:
     1. Toplam Satış (Yeşil)
     2. Toplam Alış (Kırmızı)
     3. Tahsilat (Mavi)
     4. Ödeme (Turuncu)
   - "Aylık Gelir - Gider" Çift Bar Grafik Kartı (Y Ekseni: 40k, 30k, 20k, 10k, 0 & Legend)
   - "En Çok İşlem Yapılan Cariler" Kartı (İkon, Cari Adı, İşlem Sayısı, Progress Bar, Tutar)
============================================================ */
import { useMemo, useState } from "react";
import {
  formatMoney,
  normalizeType,
} from "../utils/transactionHelpers";

function ReportsPage({ transactions }) {
  const now = new Date();
  const [period, setPeriod] = useState("month"); // month | year | range
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (!t.date) return false;
      if (period === "month") {
        const [y, m] = t.date.split("-").map(Number);
        return y === now.getFullYear() && m === now.getMonth() + 1;
      }
      if (period === "year") {
        const [y] = t.date.split("-").map(Number);
        return y === now.getFullYear();
      }
      if (period === "range" && rangeFrom && rangeTo) {
        return t.date >= rangeFrom && t.date <= rangeTo;
      }
      return true;
    });
  }, [transactions, period, rangeFrom, rangeTo, now]);

  /* 4 Özet Kartı Hesaplama */
  const summary = useMemo(() => {
    const totalSales = filtered
      .filter((t) => normalizeType(t.type) === "sale")
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const totalPurchases = filtered
      .filter((t) => normalizeType(t.type) === "purchase")
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const totalCollections = filtered
      .filter((t) => normalizeType(t.type) === "collection")
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const totalPayouts = filtered
      .filter((t) => normalizeType(t.type) === "payout")
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    return { totalSales, totalPurchases, totalCollections, totalPayouts };
  }, [filtered]);

  /* Aylık Gelir - Gider Verisi (Son 4 Ay - Referans Görseldeki Tem, Ağu, Eyl, Eki) */
  const monthlyChartData = useMemo(() => {
    const result = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const monthLabel = new Intl.DateTimeFormat("tr-TR", { month: "short" }).format(d);

      // Gelir = Satış + Tahsilat
      const income = transactions
        .filter((t) => {
          if (!t.date) return false;
          const [ty, tm] = t.date.split("-").map(Number);
          return ty === y && tm === m && (normalizeType(t.type) === "sale" || normalizeType(t.type) === "collection");
        })
        .reduce((s, t) => s + Number(t.amount || 0), 0);

      // Gider = Alış + Ödeme
      const expense = transactions
        .filter((t) => {
          if (!t.date) return false;
          const [ty, tm] = t.date.split("-").map(Number);
          return ty === y && tm === m && (normalizeType(t.type) === "purchase" || normalizeType(t.type) === "payout");
        })
        .reduce((s, t) => s + Number(t.amount || 0), 0);

      result.push({
        label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1, 3),
        income,
        expense,
      });
    }
    return result;
  }, [transactions, now]);

  // Y ekseni tepe değeri (Varsayılan en az 40.000)
  const maxBarValue = Math.max(
    40000,
    ...monthlyChartData.map((d) => Math.max(d.income, d.expense))
  );

  /* En Çok İşlem Yapılan Cariler */
  const topCustomers = useMemo(() => {
    const map = {};
    filtered.forEach((t) => {
      if (!t.customer) return;
      if (!map[t.customer]) map[t.customer] = { name: t.customer, total: 0, count: 0 };
      map[t.customer].total += Number(t.amount || 0);
      map[t.customer].count += 1;
    });

    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);
  }, [filtered]);

  const maxCustTotal = topCustomers.length > 0 ? topCustomers[0].total || 1 : 1;

  return (
    <div className="page raporlar-page">
      {/* Header: Raporlar */}
      <div className="raporlar-top-header">
        <h1 className="raporlar-title">Raporlar</h1>
      </div>

      {/* Dönem Sekmeleri: [Bu Ay] [Bu Yıl] [Tarih Aralığı] */}
      <div className="raporlar-period-pills-row">
        <button
          type="button"
          className={`raporlar-pill ${period === "month" ? "active" : ""}`}
          onClick={() => setPeriod("month")}
        >
          Bu Ay
        </button>
        <button
          type="button"
          className={`raporlar-pill ${period === "year" ? "active" : ""}`}
          onClick={() => setPeriod("year")}
        >
          Bu Yıl
        </button>
        <button
          type="button"
          className={`raporlar-pill ${period === "range" ? "active" : ""}`}
          onClick={() => setPeriod("range")}
        >
          Tarih Aralığı
        </button>
      </div>

      {/* Tarih Aralığı Seçicisi */}
      {period === "range" && (
        <div className="raporlar-range-inputs-row">
          <input
            type="date"
            className="field-text-input"
            value={rangeFrom}
            onChange={(e) => setRangeFrom(e.target.value)}
          />
          <span className="range-sep">—</span>
          <input
            type="date"
            className="field-text-input"
            value={rangeTo}
            onChange={(e) => setRangeTo(e.target.value)}
          />
        </div>
      )}

      {/* 4 Özet Kart (2x2 Grid) */}
      <div className="raporlar-summary-four-grid">
        {/* 1. Toplam Satış (Yeşil) */}
        <div className="rapor-summary-card rsc-sales">
          <span className="rsc-label">Toplam Satış</span>
          <strong className="rsc-amount amount-green">
            {formatMoney(summary.totalSales)} ₺
          </strong>
        </div>

        {/* 2. Toplam Alış (Kırmızı) */}
        <div className="rapor-summary-card rsc-purchases">
          <span className="rsc-label">Toplam Alış</span>
          <strong className="rsc-amount amount-red">
            {formatMoney(summary.totalPurchases)} ₺
          </strong>
        </div>

        {/* 3. Tahsilat (Mavi) */}
        <div className="rapor-summary-card rsc-collections">
          <span className="rsc-label">Tahsilat</span>
          <strong className="rsc-amount amount-blue">
            {formatMoney(summary.totalCollections)} ₺
          </strong>
        </div>

        {/* 4. Ödeme (Turuncu) */}
        <div className="rapor-summary-card rsc-payouts">
          <span className="rsc-label">Ödeme</span>
          <strong className="rsc-amount amount-orange">
            {formatMoney(summary.totalPayouts)} ₺
          </strong>
        </div>
      </div>

      {/* Aylık Gelir - Gider Bar Grafik Kartı */}
      <div className="rapor-chart-card">
        <div className="rcc-header-line">
          <strong className="rcc-card-title">Aylık Gelir - Gider</strong>
          <div className="rcc-legend-box">
            <span className="rcc-legend-item">
              <span className="legend-square legend-blue" /> Gelir
            </span>
            <span className="rcc-legend-item">
              <span className="legend-square legend-red" /> Gider
            </span>
          </div>
        </div>

        {/* Grafik Alanı (Y-Ekseni + Bar Çiftleri) */}
        <div className="barchart-with-axis">
          {/* Sol Y-Ekseni Etiketleri */}
          <div className="chart-y-axis">
            <span>40k</span>
            <span>30k</span>
            <span>20k</span>
            <span>10k</span>
            <span>0</span>
          </div>

          {/* Barlar */}
          <div className="chart-bars-area">
            {monthlyChartData.map((d, idx) => {
              const incomeHeight = Math.min(100, Math.max(6, (d.income / maxBarValue) * 100));
              const expenseHeight = Math.min(100, Math.max(6, (d.expense / maxBarValue) * 100));

              return (
                <div key={idx} className="chart-bar-group">
                  <div className="chart-bars-pair">
                    <div
                      className="c-bar c-bar-blue"
                      style={{ height: `${incomeHeight}%` }}
                      title={`Gelir: ${formatMoney(d.income)} ₺`}
                    />
                    <div
                      className="c-bar c-bar-red"
                      style={{ height: `${expenseHeight}%` }}
                      title={`Gider: ${formatMoney(d.expense)} ₺`}
                    />
                  </div>
                  <span className="chart-bar-month-label">{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* En Çok İşlem Yapılan Cariler Kartı */}
      <div className="rapor-top-cariler-card">
        <div className="rcc-header-line">
          <strong className="rcc-card-title">En Çok İşlem Yapılan Cariler</strong>
        </div>

        {topCustomers.length === 0 ? (
          <div className="empty-tab-notice" style={{ padding: "20px 0" }}>
            <span>Seçilen dönemde işlem yapılmış cari bulunmuyor.</span>
          </div>
        ) : (
          <div className="top-cariler-list">
            {topCustomers.map((cust, idx) => {
              const percent = Math.round((cust.total / maxCustTotal) * 100);
              const isFirst = idx === 0;

              return (
                <div key={cust.name} className="top-cari-row">
                  {/* İkon */}
                  <div className={`top-cari-icon-circle ${isFirst ? "bg-green-soft" : "bg-blue-soft"}`}>
                    {isFirst ? "🛡️" : "👤"}
                  </div>

                  {/* İsim & İşlem Sayısı & Progress Bar */}
                  <div className="top-cari-mid-wrap">
                    <strong className="top-cari-name">{cust.name}</strong>
                    <span className="top-cari-count">{cust.count} işlem</span>
                    <div className="top-cari-progress-bg">
                      <div className="top-cari-progress-fill" style={{ width: `${percent}%` }} />
                    </div>
                  </div>

                  {/* Tutar */}
                  <strong className="top-cari-amount amount-green">
                    {formatMoney(cust.total)} ₺
                  </strong>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ReportsPage;
