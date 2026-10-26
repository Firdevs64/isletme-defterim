/* ============================================================
   CustomersPage — Referans Ekran 2, 3, 4, 10
   Tam referans tasarıma uygun:
   - Ekran 2: Cariler Listesi (Filtreler, + Yeni Cari Ekle, Cari Kartları)
   - Ekran 3: Yeni Cari Ekle (Müşteri / Tedarikçi / Diğer, Renk Seçici, Kaydet)
   - Ekran 4: Cari Detay Sayfası (Profil, 2 Özet Kutu, Büyük Kalan Alacak Kartı, İşlemler / Notlar / Bilgiler)
   - Ekran 10: Cari Not Ekle (Cari Adı, Not Başlığı, Not Metni, Hatırlatma, Kaydet)
============================================================ */
import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  formatMoney,
  formatDate,
  normalizeType,
  getTypeLabel,
  isIncome,
  getCustomerTypeLabel,
  getInitials,
} from "../utils/transactionHelpers";

/* Referans tasarımdaki renk paleti */
const AVATAR_COLORS = [
  "#8b5cf6", // Mor (Sezgin Arı Medya)
  "#0ea5e9", // Mavi (İlhan Maruf)
  "#f43f5e", // Kırmızı / Mercan (İnox Ferat)
  "#10b981", // Yeşil (Burak-Aile Kulübü)
  "#3b82f6", // Mavi (Erkan Meriç)
  "#f97316", // Turuncu (Garanti Emine Köse)
  "#007384", // Koyu Teal
  "#ec4899", // Pembe
];

function CustomersPage({
  user,
  transactions,
  customerRecords,
  deleteTransaction,
  onOpenNewTransaction,
}) {
  const [view, setView] = useState("list"); // list | new | detail | addNote
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | receivable | payable | other
  const [selectedName, setSelectedName] = useState(null);
  const [detailTab, setDetailTab] = useState("transactions"); // transactions | notes | info

  // Notlar alt koleksiyonu state'i
  const [customerNotes, setCustomerNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);

  // Not Ekleme Formu (Ekran 10)
  const [noteForm, setNoteForm] = useState({ title: "", note: "", reminder: "" });
  const [savingNote, setSavingNote] = useState(false);

  // Yeni Cari Formu (Ekran 3)
  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    email: "",
    note: "",
    type: "customer", // customer | supplier | other
    color: AVATAR_COLORS[0],
  });
  const [savingCustomer, setSavingCustomer] = useState(false);

  /* ---- Carileri Hazırla & Birleştir ---- */
  const customers = useMemo(() => {
    const savedNames = customerRecords.map((c) => c.name).filter(Boolean);
    const oldNames = transactions.filter((t) => t.customer).map((t) => t.customer);
    const allNames = [...new Set([...savedNames, ...oldNames])];

    return allNames.map((name) => {
      const saved = customerRecords.find(
        (c) => c.name?.toLocaleLowerCase("tr-TR") === name.toLocaleLowerCase("tr-TR")
      );
      const txns = transactions.filter(
        (t) => t.customer?.toLocaleLowerCase("tr-TR") === name.toLocaleLowerCase("tr-TR")
      );

      const totalSales = txns
        .filter((t) => normalizeType(t.type) === "sale")
        .reduce((s, t) => s + Number(t.amount || 0), 0);

      const totalCollections = txns
        .filter((t) => normalizeType(t.type) === "collection")
        .reduce((s, t) => s + Number(t.amount || 0), 0);

      const totalPurchases = txns
        .filter((t) => normalizeType(t.type) === "purchase")
        .reduce((s, t) => s + Number(t.amount || 0), 0);

      const totalPayouts = txns
        .filter((t) => normalizeType(t.type) === "payout")
        .reduce((s, t) => s + Number(t.amount || 0), 0);

      // Bakiye = (Satışlar - Tahsilatlar) - (Alışlar - Ödemeler)
      // Pozitif ise işletme alacaklıdır. Negatif ise işletme borçludur.
      const balance = (totalSales - totalCollections) - (totalPurchases - totalPayouts);

      return {
        id: saved?.id || name,
        name,
        phone: saved?.phone || "",
        email: saved?.email || "",
        note: saved?.note || "",
        type: saved?.type || "customer",
        color: saved?.color || AVATAR_COLORS[Math.abs(name.charCodeAt(0)) % AVATAR_COLORS.length],
        totalSales,
        totalCollections,
        totalPurchases,
        totalPayouts,
        balance,
        transactions: txns.sort((a, b) => (b.date > a.date ? 1 : -1)),
      };
    });
  }, [customerRecords, transactions]);

  // Filtreleme
  const filteredCustomers = useMemo(() => {
    let list = customers;
    if (search.trim()) {
      list = list.filter((c) =>
        c.name.toLocaleLowerCase("tr-TR").includes(search.trim().toLocaleLowerCase("tr-TR"))
      );
    }
    if (filter === "receivable") list = list.filter((c) => c.balance > 0);
    if (filter === "payable") list = list.filter((c) => c.balance < 0);
    if (filter === "other") list = list.filter((c) => c.type === "other" || c.balance === 0);
    return list;
  }, [customers, search, filter]);

  const selectedCustomer = customers.find((c) => c.name === selectedName);

  // Seçili cari değiştikçe notları dinle
  useEffect(() => {
    if (!user || !selectedCustomer?.id || view !== "detail") return;
    setNotesLoading(true);
    const notesRef = collection(db, "users", user.uid, "customers", selectedCustomer.id, "notes");
    const q = query(notesRef, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCustomerNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setNotesLoading(false);
      },
      () => {
        setCustomerNotes([]);
        setNotesLoading(false);
      }
    );
    return unsub;
  }, [user, selectedCustomer?.id, view]);

  /* ---- Yeni Cari Kaydet (Ekran 3) ---- */
  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!user) return;
    const name = customerForm.name.trim();
    if (!name) {
      alert("Lütfen Cari Adı alanını doldurun.");
      return;
    }
    const alreadyExists = customers.some(
      (c) => c.name.toLocaleLowerCase("tr-TR") === name.toLocaleLowerCase("tr-TR")
    );
    if (alreadyExists) {
      alert("Bu isimde bir cari zaten kayıtlı.");
      return;
    }

    setSavingCustomer(true);
    try {
      await addDoc(collection(db, "users", user.uid, "customers"), {
        name,
        phone: customerForm.phone.trim(),
        email: customerForm.email.trim(),
        note: customerForm.note.trim(),
        type: customerForm.type,
        color: customerForm.color,
        createdAt: serverTimestamp(),
      });
      setCustomerForm({
        name: "",
        phone: "",
        email: "",
        note: "",
        type: "customer",
        color: AVATAR_COLORS[0],
      });
      setView("list");
    } catch {
      alert("Cari kaydedilirken bir hata oluştu.");
    } finally {
      setSavingCustomer(false);
    }
  };

  /* ---- Cari Not Kaydet (Ekran 10) ---- */
  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!user || !selectedCustomer) return;
    if (!noteForm.note.trim()) {
      alert("Lütfen not metnini girin.");
      return;
    }

    setSavingNote(true);
    try {
      await addDoc(
        collection(db, "users", user.uid, "customers", selectedCustomer.id, "notes"),
        {
          title: noteForm.title.trim(),
          note: noteForm.note.trim(),
          reminder: noteForm.reminder || null,
          createdAt: serverTimestamp(),
        }
      );
      setNoteForm({ title: "", note: "", reminder: "" });
      setView("detail");
    } catch {
      alert("Not kaydedilemedi.");
    } finally {
      setSavingNote(false);
    }
  };

  /* ============================================================
     GÖRÜNÜM 10: CARİ NOT EKLE (Referans Ekran 10)
  ============================================================ */
  if (view === "addNote" && selectedCustomer) {
    return (
      <div className="page sub-page">
        {/* Header: ← Not Ekle */}
        <div className="custom-sub-header">
          <button type="button" className="sub-header-back-btn" onClick={() => setView("detail")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 className="sub-header-title">Not Ekle</h1>
        </div>

        <div className="screen-form-container">
          <form onSubmit={handleSaveNote} className="standard-app-form">
            {/* Cari Adı (Statik) */}
            <div className="field-group">
              <label className="field-label">Cari</label>
              <div className="field-static-readonly">{selectedCustomer.name}</div>
            </div>

            {/* Not Başlığı */}
            <div className="field-group">
              <label className="field-label">
                Not Başlığı <span className="field-optional">(isteğe bağlı)</span>
              </label>
              <input
                type="text"
                className="field-text-input"
                placeholder="Örn. Telefon görüşmesi"
                value={noteForm.title}
                onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
              />
            </div>

            {/* Not Metni */}
            <div className="field-group">
              <label className="field-label">Not *</label>
              <textarea
                className="field-textarea-input"
                rows={5}
                placeholder="Tabela için aradı. Önümüzdeki hafta ölçü alınacak. WhatsApp'tan görsel gönderecek."
                value={noteForm.note}
                maxLength={500}
                onChange={(e) => setNoteForm({ ...noteForm, note: e.target.value })}
              />
              <span className="field-char-counter">{noteForm.note.length}/500</span>
            </div>

            {/* Hatırlatma (isteğe bağlı) */}
            <div className="field-group">
              <label className="field-label">
                Hatırlatma <span className="field-optional">(isteğe bağlı)</span>
              </label>
              <div className="field-with-icon-right">
                <input
                  type="date"
                  className="field-text-input"
                  value={noteForm.reminder}
                  onChange={(e) => setNoteForm({ ...noteForm, reminder: e.target.value })}
                />
                <span className="field-right-icon">📅</span>
              </div>
            </div>

            <button type="submit" className="primary-teal-btn" disabled={savingNote}>
              {savingNote ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ============================================================
     GÖRÜNÜM 4: CARİ DETAY SAYFASI (Referans Ekran 4)
  ============================================================ */
  if (view === "detail" && selectedCustomer) {
    const c = selectedCustomer;
    const isAlacakli = c.balance >= 0;

    return (
      <div className="page sub-page">
        {/* Header: ← [Cari Adı / Boş]       Düzenle */}
        <div className="custom-sub-header">
          <button type="button" className="sub-header-back-btn" onClick={() => setView("list")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div className="sub-header-spacer" />
          <button
            type="button"
            className="sub-header-link-btn"
            onClick={() => {
              setCustomerForm({
                name: c.name,
                phone: c.phone,
                email: c.email,
                note: c.note,
                type: c.type,
                color: c.color,
              });
              setView("new");
            }}
          >
            Düzenle
          </button>
        </div>

        <div className="cari-detail-body">
          {/* Üst Profil Bölümü */}
          <div className="cari-detail-profile-card">
            <div className="cari-big-avatar" style={{ backgroundColor: c.color }}>
              {getInitials(c.name)}
            </div>
            <h2 className="cari-profile-name">{c.name}</h2>
            <div className="cari-profile-badge">{getCustomerTypeLabel(c.type)}</div>
            {c.phone && (
              <div className="cari-profile-phone">
                <span>📞 {c.phone}</span>
              </div>
            )}
            {c.note && (
              <p className="cari-profile-note-snippet">{c.note}</p>
            )}
          </div>

          {/* İki Özet Kutu Yan Yana (Toplam İş & Tahsilat) */}
          <div className="cari-two-summary-boxes">
            <div className="cari-summary-box">
              <span className="csb-label">Toplam İş</span>
              <strong className="csb-value">{formatMoney(c.totalSales)} ₺</strong>
            </div>
            <div className="cari-summary-box">
              <span className="csb-label">Tahsilat</span>
              <strong className="csb-value">{formatMoney(c.totalCollections)} ₺</strong>
            </div>
          </div>

          {/* Büyük Kalan Alacak / Borç Kartı */}
          <div className="cari-big-balance-card">
            <span className="cbb-label">{isAlacakli ? "Kalan Alacak" : "Kalan Borç"}</span>
            <strong className={`cbb-amount ${isAlacakli ? "amount-green" : "amount-red"}`}>
              {formatMoney(Math.abs(c.balance))} ₺
            </strong>
          </div>

          {/* Sekmeler: İşlemler | Notlar | Bilgiler */}
          <div className="cari-detail-tabs-bar">
            <button
              type="button"
              className={`cdt-tab ${detailTab === "transactions" ? "active" : ""}`}
              onClick={() => setDetailTab("transactions")}
            >
              İşlemler
            </button>
            <button
              type="button"
              className={`cdt-tab ${detailTab === "notes" ? "active" : ""}`}
              onClick={() => setDetailTab("notes")}
            >
              Notlar
            </button>
            <button
              type="button"
              className={`cdt-tab ${detailTab === "info" ? "active" : ""}`}
              onClick={() => setDetailTab("info")}
            >
              Bilgiler
            </button>
          </div>

          {/* Sekme 1: İşlemler */}
          {detailTab === "transactions" && (
            <div className="cari-tab-pane">
              {c.transactions.length === 0 ? (
                <div className="empty-tab-notice">
                  <span>Bu cariye ait henüz işlem bulunmuyor.</span>
                </div>
              ) : (
                <div className="cari-txns-container">
                  {c.transactions.map((tx) => {
                    const normType = normalizeType(tx.type);
                    const income = isIncome(tx.type);
                    const label = getTypeLabel(tx.type);

                    return (
                      <div className="cari-txn-item-row" key={tx.id}>
                        <div className={`cari-txn-icon-wrap cari-icon-${normType}`}>
                          {normType === "collection" && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
                            </svg>
                          )}
                          {normType === "sale" && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                            </svg>
                          )}
                          {(normType === "purchase" || normType === "payout") && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                            </svg>
                          )}
                        </div>

                        <div className="cari-txn-desc-col">
                          <strong className="cari-txn-type-title">{label}</strong>
                          <span className="cari-txn-date-time">{formatDate(tx.date)}</span>
                        </div>

                        <strong
                          className={`cari-txn-amount-text ${
                            normType === "sale"
                              ? "amount-blue"
                              : normType === "collection"
                              ? "amount-green"
                              : "amount-red"
                          }`}
                        >
                          {normType === "purchase" || normType === "payout" ? "-" : ""}
                          {formatMoney(tx.amount)} ₺
                        </strong>

                        <button
                          type="button"
                          className="cari-txn-delete-btn"
                          title="İşlemi Sil"
                          onClick={() => deleteTransaction(tx.id)}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Alt İki Aksiyon Butonu (+ Yeni İş & Tahsilat / Ödeme) */}
              <div className="cari-bottom-buttons-grid">
                <button
                  type="button"
                  className="cari-action-btn-primary"
                  onClick={() => onOpenNewTransaction({ customer: c.name, type: "sale", returnTo: "customers" })}
                >
                  + Yeni İş
                </button>
                <button
                  type="button"
                  className="cari-action-btn-secondary"
                  onClick={() => onOpenNewTransaction({ customer: c.name, type: "collection", returnTo: "customers" })}
                >
                  Tahsilat / Ödeme
                </button>
              </div>
            </div>
          )}

          {/* Sekme 2: Notlar */}
          {detailTab === "notes" && (
            <div className="cari-tab-pane">
              {notesLoading ? (
                <div className="empty-tab-notice"><span>Notlar yükleniyor...</span></div>
              ) : customerNotes.length === 0 ? (
                <div className="empty-tab-notice">
                  <span>Bu cariye ait henüz not bulunmuyor.</span>
                </div>
              ) : (
                <div className="notes-list-stack">
                  {customerNotes.map((n) => (
                    <div className="note-card-item" key={n.id}>
                      {n.title && <strong className="note-card-title">{n.title}</strong>}
                      <p className="note-card-content">{n.note}</p>
                      {n.reminder && (
                        <div className="note-card-reminder">
                          <span>🔔 Hatırlatma: {formatDate(n.reminder)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="primary-teal-btn"
                style={{ marginTop: 14 }}
                onClick={() => {
                  setNoteForm({ title: "", note: "", reminder: "" });
                  setView("addNote");
                }}
              >
                + Cari Not Ekle
              </button>
            </div>
          )}

          {/* Sekme 3: Bilgiler */}
          {detailTab === "info" && (
            <div className="cari-tab-pane">
              <div className="cari-info-card">
                <div className="cari-info-row">
                  <span>Cari Türü</span>
                  <strong>{getCustomerTypeLabel(c.type)}</strong>
                </div>
                <div className="cari-info-row">
                  <span>Telefon</span>
                  <strong>{c.phone || "—"}</strong>
                </div>
                <div className="cari-info-row">
                  <span>E-posta</span>
                  <strong>{c.email || "—"}</strong>
                </div>
                <div className="cari-info-row full-col">
                  <span>Açıklama / Not</span>
                  <p>{c.note || "Kayıtlı not bulunmuyor."}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ============================================================
     GÖRÜNÜM 3: YENİ CARİ EKLE (Referans Ekran 3)
  ============================================================ */
  if (view === "new") {
    return (
      <div className="page sub-page">
        {/* Header: ← Yeni Cari */}
        <div className="custom-sub-header">
          <button type="button" className="sub-header-back-btn" onClick={() => setView("list")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 className="sub-header-title">Yeni Cari</h1>
        </div>

        <div className="screen-form-container">
          {/* Üst 3 Segment Butonu (Müşteri | Tedarikçi | Diğer) */}
          <div className="segment-three-tabs">
            <button
              type="button"
              className={`segment-tab-btn ${customerForm.type === "customer" ? "active" : ""}`}
              onClick={() => setCustomerForm({ ...customerForm, type: "customer" })}
            >
              Müşteri
            </button>
            <button
              type="button"
              className={`segment-tab-btn ${customerForm.type === "supplier" ? "active" : ""}`}
              onClick={() => setCustomerForm({ ...customerForm, type: "supplier" })}
            >
              Tedarikçi
            </button>
            <button
              type="button"
              className={`segment-tab-btn ${customerForm.type === "other" ? "active" : ""}`}
              onClick={() => setCustomerForm({ ...customerForm, type: "other" })}
            >
              Diğer
            </button>
          </div>

          <form onSubmit={handleSaveCustomer} className="standard-app-form">
            {/* Cari Adı * */}
            <div className="field-group">
              <label className="field-label">Cari Adı *</label>
              <input
                type="text"
                className="field-text-input"
                placeholder="Mehmet Yılmaz"
                value={customerForm.name}
                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                required
              />
            </div>

            {/* Telefon */}
            <div className="field-group">
              <label className="field-label">Telefon</label>
              <input
                type="tel"
                className="field-text-input"
                placeholder="0532 123 45 67"
                value={customerForm.phone}
                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
              />
            </div>

            {/* E-posta (isteğe bağlı) */}
            <div className="field-group">
              <label className="field-label">
                E-posta <span className="field-optional">(isteğe bağlı)</span>
              </label>
              <input
                type="email"
                className="field-text-input"
                placeholder="mehmet@example.com"
                value={customerForm.email}
                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
              />
            </div>

            {/* Açıklama / Not */}
            <div className="field-group">
              <label className="field-label">Açıklama / Not</label>
              <textarea
                className="field-textarea-input"
                rows={3}
                placeholder="Tabela için aradı. Teklif verilecek."
                value={customerForm.note}
                maxLength={500}
                onChange={(e) => setCustomerForm({ ...customerForm, note: e.target.value })}
              />
              <span className="field-char-counter">{customerForm.note.length}/500</span>
            </div>

            {/* Renk / Simge */}
            <div className="field-group">
              <label className="field-label">Renk / Simge</label>
              <div className="color-dots-row">
                {AVATAR_COLORS.map((col) => {
                  const isSelected = customerForm.color === col;
                  return (
                    <button
                      type="button"
                      key={col}
                      className={`color-choice-circle ${isSelected ? "selected" : ""}`}
                      style={{ backgroundColor: col }}
                      onClick={() => setCustomerForm({ ...customerForm, color: col })}
                    >
                      {isSelected && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button type="submit" className="primary-teal-btn" disabled={savingCustomer}>
              {savingCustomer ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ============================================================
     GÖRÜNÜM 2: CARİLER LİSTESİ (Referans Ekran 2)
  ============================================================ */
  return (
    <div className="page cariler-list-page">
      {/* Header: Cariler */}
      <div className="cariler-top-header">
        <h1 className="cariler-page-title">Cariler</h1>
      </div>

      {/* Arama Barı + Filtre İkonu */}
      <div className="cari-search-row">
        <div className="cari-search-input-wrap">
          <svg className="cari-search-lens" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="cari-search-field"
            placeholder="Cari ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="cari-filter-icon-btn"
          title="Filtrele"
          onClick={() => {
            // Döngüsel filtre
            if (filter === "all") setFilter("receivable");
            else if (filter === "receivable") setFilter("payable");
            else setFilter("all");
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
        </button>
      </div>

      {/* Filtre Butonları (Tümü | Alacaklı | Borçlu | Diğer) */}
      <div className="cari-filter-pills-row">
        <button
          type="button"
          className={`cari-filter-pill ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          Tümü
        </button>
        <button
          type="button"
          className={`cari-filter-pill ${filter === "receivable" ? "active" : ""}`}
          onClick={() => setFilter("receivable")}
        >
          Alacaklı
        </button>
        <button
          type="button"
          className={`cari-filter-pill ${filter === "payable" ? "active" : ""}`}
          onClick={() => setFilter("payable")}
        >
          Borçlu
        </button>
        <button
          type="button"
          className={`cari-filter-pill ${filter === "other" ? "active" : ""}`}
          onClick={() => setFilter("other")}
        >
          Diğer
        </button>
      </div>

      {/* + Yeni Cari Ekle Butonu */}
      <div className="cari-add-btn-wrap">
        <button
          type="button"
          className="cari-add-customer-btn"
          onClick={() => setView("new")}
        >
          <span className="plus-sign">+</span> Yeni Cari Ekle
        </button>
      </div>

      {/* Cariler Listesi */}
      <div className="cari-cards-list-wrap">
        {filteredCustomers.length === 0 ? (
          <div className="empty-cariler-card">
            <div className="empty-icon-circle">👥</div>
            <strong>{customers.length === 0 ? "Henüz cari kaydı yok" : "Aranan cari bulunamadı"}</strong>
            <span>
              {customers.length === 0
                ? "Yukarıdaki '+ Yeni Cari Ekle' butonuyla cari oluşturabilirsiniz."
                : "Farklı bir arama terimi deneyin."}
            </span>
          </div>
        ) : (
          filteredCustomers.map((c) => {
            const isAlacakli = c.balance > 0;
            const isBorclu = c.balance < 0;

            return (
              <button
                type="button"
                className="cari-item-card-btn"
                key={c.id}
                onClick={() => {
                  setSelectedName(c.name);
                  setDetailTab("transactions");
                  setView("detail");
                }}
              >
                {/* Sol Avatar (Daire, İsim Baş Harfi) */}
                <div className="cari-item-avatar" style={{ backgroundColor: c.color }}>
                  {getInitials(c.name)}
                </div>

                {/* Orta Bilgi */}
                <div className="cari-item-mid-col">
                  <strong className="cari-item-title">{c.name}</strong>
                  <span className="cari-item-sub-info">
                    {getCustomerTypeLabel(c.type)} · {c.transactions.length} işlem
                  </span>
                </div>

                {/* Sağ Tutar & Bakiye Durumu */}
                <div className="cari-item-right-col">
                  <strong
                    className={`cari-item-amount ${
                      isAlacakli ? "amount-green" : isBorclu ? "amount-red" : "amount-neutral"
                    }`}
                  >
                    {isBorclu ? "-₺" : "₺"}{formatMoney(Math.abs(c.balance))}
                  </strong>
                  <span
                    className={`cari-item-status-tag ${
                      isAlacakli ? "status-alacakli" : isBorclu ? "status-borclu" : ""
                    }`}
                  >
                    {isAlacakli ? "Alacaklı" : isBorclu ? "Borçlu" : "—"}
                  </span>
                </div>

                {/* Sağ Chevron > */}
                <span className="cari-item-chevron">›</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default CustomersPage;
