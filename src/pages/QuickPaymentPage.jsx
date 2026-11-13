/* ============================================================
   QuickPaymentPage — Referans Ekran 7: Hızlı Tahsilat / Ödeme
   - Header: ← Hızlı Tahsilat / Ödeme
   - Tahsilat / Ödeme Sekmeleri
   - Kayıtlı Cari Seçimi
   - Tarih
   - Tutar
   - Hızlı Tutar Butonları
   - Açıklama
   - Kaydet
============================================================ */

import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { db } from "../firebase";
import { getToday } from "../utils/transactionHelpers";
import { useAppDialog } from "../components/AppDialog";

function QuickPaymentPage({
  user,
  customers,
  initialType = "collection",
  onBack,
}) {
  const { showAlert } = useAppDialog();

  const today = getToday();

  const [type, setType] = useState(initialType);

  const [form, setForm] = useState({
    customer: "",
    date: today,
    amount: "",
    description: "",
  });

  const [saving, setSaving] = useState(false);

  // Hızlı tutar ekleme
  const handleAddAmount = (addVal) => {
    const current = Number(form.amount) || 0;

    setForm({
      ...form,
      amount: String(current + addVal),
    });
  };

  // İşlemi kaydet
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) return;

    if (!form.customer.trim()) {
      await showAlert("Lütfen bir cari seçin.", {
        title: "Eksik Bilgi",
      });
      return;
    }

    const numAmount = Number(form.amount);

    if (!numAmount || numAmount <= 0) {
      await showAlert("Lütfen geçerli bir tutar girin.", {
        title: "Geçersiz Tutar",
      });
      return;
    }

    setSaving(true);

    try {
      await addDoc(collection(db, "users", user.uid, "transactions"), {
        type,
        customer: form.customer.trim(),
        title: type === "collection" ? "Tahsilat" : "Ödeme",
        amount: numAmount,
        date: form.date,
        description: form.description.trim(),
        createdAt: serverTimestamp(),
      });

      onBack();
    } catch (error) {
      console.error("Hızlı ödeme/tahsilat kaydetme hatası:", error);

      await showAlert("İşlem kaydedilemedi. Lütfen tekrar deneyin.", {
        title: "Kayıt Başarısız",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page sub-page quick-payment-page">
      {/* Header */}
      <div className="custom-sub-header">
        <button type="button" className="sub-header-back-btn" onClick={onBack}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />

            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>

        <h1 className="sub-header-title">Hızlı Tahsilat / Ödeme</h1>
      </div>

      <div className="screen-form-container">
        {/* Tahsilat / Ödeme Sekmeleri */}
        <div className="qp-dual-tabs-bar">
          <button
            type="button"
            className={`qp-dual-tab-btn ${
              type === "collection" ? "active-collection" : ""
            }`}
            onClick={() => setType("collection")}
          >
            Tahsilat (Para Girişi)
          </button>

          <button
            type="button"
            className={`qp-dual-tab-btn ${
              type === "payout" ? "active-payout" : ""
            }`}
            onClick={() => setType("payout")}
          >
            Ödeme (Para Çıkışı)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="standard-app-form">
          {/* Cari */}
          <div className="field-group">
            <label className="field-label">Cari *</label>

            <select
              className="field-text-input"
              value={form.customer}
              onChange={(e) =>
                setForm({
                  ...form,
                  customer: e.target.value,
                })
              }
              required
            >
              <option value="">Cari seçin</option>

              {customers.map((customer) => (
                <option key={customer} value={customer}>
                  {customer}
                </option>
              ))}
            </select>
          </div>

          {/* Tarih */}
          <div className="field-group">
            <label className="field-label">Tarih *</label>

            <div className="field-with-icon-right">
              <input
                type="date"
                className="field-text-input"
                value={form.date}
                onChange={(e) =>
                  setForm({
                    ...form,
                    date: e.target.value,
                  })
                }
                required
              />

              <span className="field-right-icon">📅</span>
            </div>
          </div>

          {/* Tutar */}
          <div className="field-group">
            <label className="field-label">Tutar *</label>

            <div className="field-with-icon-right">
              <input
                type="number"
                min="0"
                step="0.01"
                className="field-text-input"
                placeholder="4.500,00 ₺"
                value={form.amount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    amount: e.target.value,
                  })
                }
                required
              />

              <span className="field-right-icon">₺</span>
            </div>

            {/* Hızlı Tutar Butonları */}
            <div className="quick-amount-chips-row">
              <button
                type="button"
                className="quick-chip-btn"
                onClick={() => handleAddAmount(500)}
              >
                +500
              </button>

              <button
                type="button"
                className="quick-chip-btn"
                onClick={() => handleAddAmount(1000)}
              >
                +1.000
              </button>

              <button
                type="button"
                className="quick-chip-btn"
                onClick={() => handleAddAmount(5000)}
              >
                +5.000
              </button>

              <button
                type="button"
                className="quick-chip-btn"
                onClick={() => handleAddAmount(10000)}
              >
                +10.000
              </button>
            </div>
          </div>

          {/* Açıklama */}
          <div className="field-group">
            <label className="field-label">Açıklama</label>

            <textarea
              className="field-textarea-input"
              rows={3}
              placeholder="Açıklama (opsiyonel)"
              value={form.description}
              maxLength={200}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
            />

            <span className="field-char-counter">
              {form.description.length}/200
            </span>
          </div>

          {/* Kaydet */}
          <button type="submit" className="primary-teal-btn" disabled={saving}>
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default QuickPaymentPage;
