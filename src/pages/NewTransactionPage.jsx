/* ============================================================
   NewTransactionPage — Referans Ekran 5: Yeni İşlem (Satış / Alış / Tahsilat / Ödeme)
   Tam referans tasarıma uygun:
   - Üst Bar: ← Yeni İşlem
   - 4 İşlem Türü Butonu (Satış (İş), Alış (Gider), Tahsilat, Ödeme)
   - Cari * (Arama ikonu ile)
   - Tarih * (Takvim ikonu ile)
   - İş Adı * (Satış için) / Gider Adı * (Alış için)
   - Hesaplama Tipi: [Adet] [m²] (Satış için)
   - Adet & Birim Fiyat (₺) Yan Yana
   - Toplam Tutar Kutusu (Yeşil Büyük Rakam)
   - Açıklama
   - Fotoğraf Ekle (Opsiyonel) Butonu
   - Kaydet Butonu (Teal)
============================================================ */
import { useMemo, useRef, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import {
  formatMoney,
  getToday,
} from "../utils/transactionHelpers";

const TYPES = [
  {
    key: "sale",
    label: "Satış (İş)",
    shortLabel: "Satış (İş)",
    color: "#16a34a",
    bg: "#ecfdf5",
    activeBg: "#16a34a",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
  },
  {
    key: "purchase",
    label: "Alış (Gider)",
    shortLabel: "Alış (Gider)",
    color: "#e11d48",
    bg: "#fff1f2",
    activeBg: "#e11d48",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    key: "collection",
    label: "Tahsilat",
    shortLabel: "Tahsilat",
    color: "#0284c7",
    bg: "#eff6ff",
    activeBg: "#0284c7",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <polyline points="19 12 12 19 5 12" />
      </svg>
    ),
  },
  {
    key: "payout",
    label: "Ödeme",
    shortLabel: "Ödeme",
    color: "#ea580c",
    bg: "#fff7ed",
    activeBg: "#ea580c",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="19" x2="12" y2="5" />
        <polyline points="5 12 12 5 19 12" />
      </svg>
    ),
  },
];

function NewTransactionPage({
  user,
  customers,
  onBack,
  initialType = "sale",
  initialCustomer = "",
}) {
  const today = getToday();
  const fileInputRef = useRef(null);

  // İşlem Türü (Varsayılan Satış)
  const [selectedType, setSelectedType] = useState(initialType || "sale");

  // Form State
  const [form, setForm] = useState({
    customer: initialCustomer || "",
    date: today,
    title: "",
    calculationType: "quantity", // quantity (Adet) | squareMeter (m²) | fixed (Sabit Tutar)
    quantity: "188",
    unitPrice: "150",
    amount: "28200",
    description: "",
  });

  const [photoName, setPhotoName] = useState("");
  const [saving, setSaving] = useState(false);

  /* ---- Toplam Tutar Hesapla (Adet/m² × Birim Fiyat veya Sabit) ---- */
  const calculatedAmount = useMemo(() => {
    if (selectedType === "collection" || selectedType === "payout" || form.calculationType === "fixed") {
      return Number(form.amount) || 0;
    }
    const q = Number(form.quantity) || 0;
    const p = Number(form.unitPrice) || 0;
    return Math.round((q * p + Number.EPSILON) * 100) / 100;
  }, [selectedType, form.calculationType, form.quantity, form.unitPrice, form.amount]);

  /* ---- Kaydet ---- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    if (!form.customer.trim()) {
      alert("Lütfen Cari alanını doldurun.");
      return;
    }

    if (selectedType === "sale" && !form.title.trim()) {
      alert("Lütfen İş Adı alanını doldurun.");
      return;
    }
    if (selectedType === "purchase" && !form.title.trim()) {
      alert("Lütfen Gider Adı alanını doldurun.");
      return;
    }

    const finalAmount = calculatedAmount;
    if (finalAmount <= 0) {
      alert("Lütfen geçerli bir tutar girin.");
      return;
    }

    setSaving(true);
    try {
      const data = {
        type: selectedType,
        customer: form.customer.trim(),
        title: form.title.trim() || (selectedType === "collection" ? "Tahsilat" : selectedType === "payout" ? "Ödeme" : "İşlem"),
        calculationType: selectedType === "sale" ? form.calculationType : "fixed",
        unitType: selectedType === "sale" ? (form.calculationType === "quantity" ? "adet" : form.calculationType === "squareMeter" ? "m2" : "fixed") : null,
        quantity: selectedType === "sale" && form.calculationType !== "fixed" ? Number(form.quantity) : null,
        unitPrice: selectedType === "sale" && form.calculationType !== "fixed" ? Number(form.unitPrice) : null,
        amount: finalAmount,
        date: form.date,
        description: form.description.trim(),
        photoName: photoName || null,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "users", user.uid, "transactions"), data);
      onBack();
    } catch {
      alert("İşlem kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setPhotoName(e.target.files[0].name);
    }
  };

  return (
    <div className="page sub-page new-transaction-page">
      {/* Header: ← Yeni İşlem */}
      <div className="custom-sub-header">
        <button type="button" className="sub-header-back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="sub-header-title">Yeni İşlem</h1>
      </div>

      <div className="screen-form-container">
        {/* 4 İşlem Türü Butonları (Yatay 4'lü Grid) */}
        <div className="nt-four-type-bar">
          {TYPES.map((t) => {
            const isActive = selectedType === t.key;
            return (
              <button
                key={t.key}
                type="button"
                className={`nt-four-type-btn ${isActive ? "active" : ""}`}
                style={{
                  backgroundColor: isActive ? t.activeBg : t.bg,
                  color: isActive ? "#ffffff" : t.color,
                }}
                onClick={() => setSelectedType(t.key)}
              >
                <div className="nt-four-type-icon">{t.icon}</div>
                <span className="nt-four-type-text">{t.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Ana Form */}
        <form onSubmit={handleSubmit} className="standard-app-form">
          {/* 1. Cari * (Arama İkonu ile) */}
          <div className="field-group">
            <label className="field-label">Cari *</label>
            <div className="field-with-icon-right">
              <input
                type="text"
                className="field-text-input"
                placeholder="Sezgin Arı Medya"
                value={form.customer}
                onChange={(e) => setForm({ ...form, customer: e.target.value })}
                list="nt-customers-datalist"
                required
              />
              <span className="field-right-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
            </div>
            <datalist id="nt-customers-datalist">
              {customers.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          {/* 2. Tarih * (Takvim İkonu ile) */}
          <div className="field-group">
            <label className="field-label">Tarih *</label>
            <div className="field-with-icon-right">
              <input
                type="date"
                className="field-text-input"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
              <span className="field-right-icon">📅</span>
            </div>
          </div>

          {/* 3. İş Adı / Gider Adı (Satış veya Alış ise) */}
          {(selectedType === "sale" || selectedType === "purchase") && (
            <div className="field-group">
              <label className="field-label">
                {selectedType === "sale" ? "İş Adı *" : "Gider Adı *"}
              </label>
              <input
                type="text"
                className="field-text-input"
                placeholder={selectedType === "sale" ? "Tabela çalışması" : "Örn. Malzeme alımı"}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
          )}

          {/* 4. Satış Hesaplama Türü: [Adet] [m²] */}
          {selectedType === "sale" && (
            <>
              <div className="unit-toggle-pills-row">
                <button
                  type="button"
                  className={`unit-pill-btn ${form.calculationType === "quantity" ? "active" : ""}`}
                  onClick={() => setForm({ ...form, calculationType: "quantity" })}
                >
                  Adet
                </button>
                <button
                  type="button"
                  className={`unit-pill-btn ${form.calculationType === "squareMeter" ? "active" : ""}`}
                  onClick={() => setForm({ ...form, calculationType: "squareMeter" })}
                >
                  m²
                </button>
              </div>

              {/* Adet / m² ve Birim Fiyat Yan Yana */}
              <div className="side-by-side-row">
                <div className="field-group" style={{ flex: 1 }}>
                  <label className="field-label">
                    {form.calculationType === "quantity" ? "Adet" : "Metrekare (m²)"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="field-text-input"
                    placeholder="188"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  />
                </div>

                <div className="field-group" style={{ flex: 1 }}>
                  <label className="field-label">Birim Fiyat (₺)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="field-text-input"
                    placeholder="150"
                    value={form.unitPrice}
                    onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                  />
                </div>
              </div>

              {/* Toplam Tutar Kutusu (Yeşil Rakam) */}
              <div className="toplam-tutar-highlight-card">
                <span className="tth-label">Toplam Tutar</span>
                <strong className="tth-amount">
                  {formatMoney(calculatedAmount)} ₺
                </strong>
              </div>
            </>
          )}

          {/* Tahsilat / Ödeme / Sabit Tutarlı Alış İçin Tutar Alanı */}
          {selectedType !== "sale" && (
            <div className="field-group">
              <label className="field-label">Tutar (₺) *</label>
              <div className="field-with-icon-right">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="field-text-input"
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
                <span className="field-right-icon">₺</span>
              </div>
            </div>
          )}

          {/* Açıklama */}
          <div className="field-group">
            <label className="field-label">Açıklama</label>
            <textarea
              className="field-textarea-input"
              rows={2}
              placeholder="Branda"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* Fotoğraf Ekle (Opsiyonel) Butonu */}
          <div className="photo-upload-row">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handlePhotoSelect}
            />
            <button
              type="button"
              className="photo-upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="photo-cam-icon">📷</span>
              <span>{photoName ? `Fotoğraf: ${photoName}` : "Fotoğraf Ekle (Opsiyonel)"}</span>
            </button>
          </div>

          {/* Kaydet Butonu */}
          <button type="submit" className="primary-teal-btn" disabled={saving}>
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default NewTransactionPage;
