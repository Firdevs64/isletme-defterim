/* ============================================================
   MenuPage — Menü, Ayarlar, Veri Yönetimi ve Tema
   - Referans Ekran 9 & Yeni Alt Ekranlar:
     1. Profil Bilgileri
     2. Şifre Değiştir
     3. Uygulama Ayarları (Play Store Öncesi Tam Donanımlı)
     4. Yedek / Geri Yükle (Bulut & JSON Geri Yükleme)
     5. Veri İçer / Dışa Aktar (Excel/CSV & Tam Yedek)
     6. Tema (Açık / Koyu iOS Switch - Anında Geçiş)
     7. Hakkında
     8. Çıkış Yap
============================================================ */
import { useState, useRef } from "react";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { auth } from "../firebase";
import { getAppSettings, saveAppSettings } from "../utils/appSettings";
import {
  exportTransactionsToCSV,
  exportCustomersToCSV,
  exportFullBackupJSON,
  parseJSONBackupFile,
  parseCustomersCSVFile,
} from "../utils/exportImportHelpers";
import { formatDateTime } from "../utils/transactionHelpers";
import { sendTestNotification } from "../utils/notificationService";

function MenuPage({
  profile,
  user,
  transactions = [],
  customerRecords = [],
  customers = [],
  theme = "light",
  toggleTheme,
  onImportBackup,
  onNavigate,
  onLogout,
}) {
  // Alt ekran state'leri
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showAppSettings, setShowAppSettings] = useState(false);
  const [showDataExportImport, setShowDataExportImport] = useState(false);
  const [dataTab, setDataTab] = useState("export"); // "export" | "import"

  // Şifre Değiştir Form State
  const [pwForm, setPwForm] = useState({ current: "", next: "", next2: "" });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  // Uygulama Ayarları State
  const [settings, setSettings] = useState(() => getAppSettings());
  const [settingsSaved, setSettingsSaved] = useState(false);

  // İçe Aktarma State
  const [backupFile, setBackupFile] = useState(null);
  const [backupPreview, setBackupPreview] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState("");

  const jsonInputRef = useRef(null);
  const csvInputRef = useRef(null);

  /* ---- Şifre Değiştirme Fonksiyonu ---- */
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);

    if (!pwForm.current || !pwForm.next) {
      setPwError("Lütfen tüm alanları doldurun.");
      return;
    }
    if (pwForm.next.length < 6) {
      setPwError("Yeni şifre en az 6 karakter olmalıdır.");
      return;
    }
    if (pwForm.next !== pwForm.next2) {
      setPwError("Yeni şifreler birbiriyle eşleşmiyor.");
      return;
    }

    setPwLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, pwForm.current);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, pwForm.next);
      setPwSuccess(true);
      setPwForm({ current: "", next: "", next2: "" });
      setTimeout(() => setShowChangePassword(false), 1800);
    } catch (err) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setPwError("Mevcut şifrenizi yanlış girdiniz.");
      } else {
        setPwError("Şifre güncellenirken bir hata oluştu.");
      }
    } finally {
      setPwLoading(false);
    }
  };

  /* ---- Ayarları Kaydet ---- */
  const handleSaveSettings = (e) => {
    e.preventDefault();
    saveAppSettings(settings);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2200);
  };

  /* ---- JSON Dosyası Seçildiğinde ---- */
  const handleSelectJSON = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");
    setImportResult(null);
    try {
      const parsed = await parseJSONBackupFile(file);
      setBackupFile(file);
      setBackupPreview(parsed);
    } catch (err) {
      setImportError(err.message);
      setBackupFile(null);
      setBackupPreview(null);
    }
  };

  /* ---- JSON Yedeğini Geri Yükle / Onayla ---- */
  const handleExecuteImport = async () => {
    if (!backupPreview || !onImportBackup) return;
    setImportLoading(true);
    setImportError("");
    try {
      const res = await onImportBackup({
        transactions: backupPreview.transactions,
        customers: backupPreview.customers,
      });
      if (res.success) {
        setImportResult(res);
        setBackupPreview(null);
        setBackupFile(null);
        if (jsonInputRef.current) jsonInputRef.current.value = "";
      } else {
        setImportError(res.error || "İçe aktarılırken bir hata oluştu.");
      }
    } catch (err) {
      setImportError(err.message || "İçe aktarma başarısız.");
    } finally {
      setImportLoading(false);
    }
  };

  /* ---- CSV Cari Yükleme ---- */
  const handleSelectCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !onImportBackup) return;
    setImportError("");
    setImportResult(null);
    setImportLoading(true);
    try {
      const parsed = await parseCustomersCSVFile(file);
      if (parsed.customers.length === 0) {
        setImportError("CSV dosyasında geçerli cari bulunamadı.");
        return;
      }
      const res = await onImportBackup({
        transactions: [],
        customers: parsed.customers,
      });
      if (res.success) {
        setImportResult(res);
      } else {
        setImportError(res.error || "Cariler eklenirken bir hata oluştu.");
      }
    } catch (err) {
      setImportError(err.message);
    } finally {
      setImportLoading(false);
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  };

  /* ============================================================
     ALT EKRAN 1: ŞİFRE DEĞİŞTİR
  ============================================================ */
  if (showChangePassword) {
    return (
      <div className="page sub-page menu-sub-page">
        <div className="custom-sub-header">
          <button type="button" className="sub-header-back-btn" onClick={() => setShowChangePassword(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 className="sub-header-title">Şifre Değiştir</h1>
        </div>

        <div className="screen-form-container">
          <form onSubmit={handleChangePassword} className="standard-app-form">
            <div className="field-group">
              <label className="field-label">Mevcut Şifre</label>
              <input
                type="password"
                className="field-text-input"
                placeholder="••••••••"
                value={pwForm.current}
                onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                required
              />
            </div>

            <div className="field-group">
              <label className="field-label">Yeni Şifre</label>
              <input
                type="password"
                className="field-text-input"
                placeholder="En az 6 karakter"
                value={pwForm.next}
                onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
                required
              />
            </div>

            <div className="field-group">
              <label className="field-label">Yeni Şifre Tekrar</label>
              <input
                type="password"
                className="field-text-input"
                placeholder="••••••••"
                value={pwForm.next2}
                onChange={(e) => setPwForm({ ...pwForm, next2: e.target.value })}
                required
              />
            </div>

            {pwError && <div className="form-error-banner">{pwError}</div>}
            {pwSuccess && <div className="form-success-banner">✓ Şifreniz başarıyla değiştirildi!</div>}

            <button type="submit" className="primary-teal-btn" disabled={pwLoading}>
              {pwLoading ? "Güncelleniyor..." : "Şifreyi Güncelle"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ============================================================
     ALT EKRAN 2: UYGULAMA AYARLARI
  ============================================================ */
  if (showAppSettings) {
    return (
      <div className="page sub-page menu-sub-page">
        <div className="custom-sub-header">
          <button type="button" className="sub-header-back-btn" onClick={() => setShowAppSettings(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 className="sub-header-title">Uygulama Ayarları</h1>
        </div>

        <div className="screen-form-container">
          <form onSubmit={handleSaveSettings} className="standard-app-form">
            
            {/* Kart 1: Finans ve Para Birimi */}
            <div className="settings-section-card">
              <h2 className="settings-section-title">Para Birimi & Finans</h2>
              
              <div className="field-group">
                <label className="field-label">Varsayılan Para Birimi</label>
                <select
                  className="field-text-input"
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                >
                  <option value="₺">Türk Lirası (₺)</option>
                  <option value="$">Amerikan Doları ($)</option>
                  <option value="€">Euro (€)</option>
                  <option value="£">İngiliz Sterlini (£)</option>
                </select>
              </div>

              <div className="field-group">
                <label className="field-label">Varsayılan Vade Süresi (Gün)</label>
                <select
                  className="field-text-input"
                  value={settings.defaultDueDateDays}
                  onChange={(e) => setSettings({ ...settings, defaultDueDateDays: Number(e.target.value) })}
                >
                  <option value={7}>7 Gün (1 Hafta)</option>
                  <option value={15}>15 Gün</option>
                  <option value={30}>30 Gün (1 Ay)</option>
                  <option value={45}>45 Gün</option>
                  <option value={60}>60 Gün (2 Ay)</option>
                  <option value={90}>90 Gün (3 Ay)</option>
                </select>
              </div>
            </div>

            {/* Kart 2: İşlem ve Arayüz Tercihleri */}
            <div className="settings-section-card">
              <h2 className="settings-section-title">İşlem ve Arayüz Tercihleri</h2>

              <div className="field-group">
                <label className="field-label">Yeni İşlemde Varsayılan Tür</label>
                <select
                  className="field-text-input"
                  value={settings.defaultTxnType}
                  onChange={(e) => setSettings({ ...settings, defaultTxnType: e.target.value })}
                >
                  <option value="sale">Satış (Alacak Kaydı)</option>
                  <option value="purchase">Alış (Borç Kaydı)</option>
                  <option value="collection">Tahsilat (Kasa Girişi)</option>
                  <option value="payout">Ödeme (Kasa Çıkışı)</option>
                </select>
              </div>

              <div className="settings-switch-row">
                <div className="settings-switch-info">
                  <strong>Hızlı Tutar Butonları</strong>
                  <span>Hızlı ödemede 50₺, 100₺, 500₺ vb. hazır tuşları göster</span>
                </div>
                <button
                  type="button"
                  className={`ios-toggle-switch ${settings.quickAmountChips ? "checked" : ""}`}
                  onClick={() => setSettings({ ...settings, quickAmountChips: !settings.quickAmountChips })}
                >
                  <span className="ios-toggle-thumb" />
                </button>
              </div>
            </div>

            {/* Kart 3: Bildirimler & Hatırlatıcılar */}
            <div className="settings-section-card">
              <h2 className="settings-section-title">Bildirimler & Hatırlatmalar</h2>

              <div className="settings-switch-row">
                <div className="settings-switch-info">
                  <strong>Vade Hatırlatıcısı</strong>
                  <span>Günü yaklaşan veya geçen alacak/borçlar için uyarı ver</span>
                </div>
                <button
                  type="button"
                  className={`ios-toggle-switch ${settings.dueReminders ? "checked" : ""}`}
                  onClick={() => setSettings({ ...settings, dueReminders: !settings.dueReminders })}
                >
                  <span className="ios-toggle-thumb" />
                </button>
                <button type="button" className="primary-teal-btn" style={{ marginTop: 8 }} onClick={async () => { const success = await sendTestNotification(); if (!success) alert('Bildirim gönderilemedi'); }}>
                  Test Bildirimi
                </button>
              </div>

              <div className="settings-switch-row">
                <div className="settings-switch-info">
                  <strong>Gün Sonu Özeti</strong>
                  <span>Akşam saatlerinde günün kasa ve işlem özetini hatırla</span>
                </div>
                <button
                  type="button"
                  className={`ios-toggle-switch ${settings.endOfDayReminder ? "checked" : ""}`}
                  onClick={() => setSettings({ ...settings, endOfDayReminder: !settings.endOfDayReminder })}
                >
                  <span className="ios-toggle-thumb" />
                </button>
              </div>
            </div>

            {/* Kart 4: Sistem ve Güvenlik Bilgisi */}
            <div className="settings-section-card">
              <h2 className="settings-section-title">Sistem & Senkronizasyon</h2>
              
              <div className="settings-status-box">
                <div className="status-indicator-dot online" />
                <div>
                  <strong>Bulut Senkronizasyonu Aktif</strong>
                  <p>Verileriniz anında Google Cloud Firestore ile şifreli senkronize edilir.</p>
                </div>
              </div>

              <div className="settings-meta-row">
                <span>PWA Çevrimdışı Çalışma</span>
                <strong style={{ color: "var(--green)" }}>Hazır & Aktif</strong>
              </div>
              <div className="settings-meta-row">
                <span>Play Store Sürüm Durumu</span>
                <strong style={{ color: "var(--primary)" }}>v1.0.0 (Yayıma Hazır)</strong>
              </div>
            </div>

            {settingsSaved && (
              <div className="form-success-banner">
                ✓ Ayarlarınız başarıyla kaydedildi!
              </div>
            )}

            <button type="submit" className="primary-teal-btn" style={{ marginTop: 8 }}>
              Ayarları Kaydet
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ============================================================
     ALT EKRAN 3: VERİ İÇER / DIŞA AKTAR & YEDEKLEME
  ============================================================ */
  if (showDataExportImport) {
    return (
      <div className="page sub-page menu-sub-page">
        <div className="custom-sub-header">
          <button type="button" className="sub-header-back-btn" onClick={() => setShowDataExportImport(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 className="sub-header-title">Veri Yönetimi & Yedek</h1>
        </div>

        {/* Tab Seçici: Dışa Aktar / İçeri Aktar */}
        <div className="data-tabs-container">
          <button
            type="button"
            className={`data-tab-btn ${dataTab === "export" ? "active" : ""}`}
            onClick={() => setDataTab("export")}
          >
            Dışa Aktar (Excel/CSV)
          </button>
          <button
            type="button"
            className={`data-tab-btn ${dataTab === "import" ? "active" : ""}`}
            onClick={() => setDataTab("import")}
          >
            İçeri Aktar & Yedek Yükle
          </button>
        </div>

        <div className="screen-form-container">
          {/* ---- DIŞA AKTARMA TABI ---- */}
          {dataTab === "export" && (
            <div className="data-export-cards-stack">
              
              {/* Kart 1: İşlemleri Excel/CSV İndir */}
              <div className="data-action-card">
                <div className="data-card-header">
                  <div className="data-icon-wrap" style={{ background: "#eafaf1", color: "#10b981" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <div className="data-card-info">
                    <strong>İşlemleri İndir (Excel / CSV)</strong>
                    <span>Tüm satış, alış, tahsilat ve ödeme hareketleri tablo formatında.</span>
                  </div>
                  <span className="data-badge">{transactions.length} İşlem</span>
                </div>
                <button
                  type="button"
                  className="data-export-btn"
                  onClick={() => exportTransactionsToCSV(transactions)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  İşlemler Excel/CSV Dosyasını İndir
                </button>
              </div>

              {/* Kart 2: Carileri Excel/CSV İndir */}
              <div className="data-action-card">
                <div className="data-card-header">
                  <div className="data-icon-wrap" style={{ background: "#eff6ff", color: "#0284c7" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <div className="data-card-info">
                    <strong>Cari Listesini İndir (Excel / CSV)</strong>
                    <span>Müşteri ve tedarikçilerinizin iletişim bilgileri ve bakiyeleri.</span>
                  </div>
                  <span className="data-badge">{customerRecords.length || customers.length} Cari</span>
                </div>
                <button
                  type="button"
                  className="data-export-btn"
                  onClick={() => exportCustomersToCSV(customerRecords, transactions)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Cari Listesi Excel/CSV İndir
                </button>
              </div>

              {/* Kart 3: Tam Sistem Yedeği (JSON) */}
              <div className="data-action-card">
                <div className="data-card-header">
                  <div className="data-icon-wrap" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
                      <line x1="8" y1="16" x2="12" y2="20" />
                      <line x1="16" y1="16" x2="12" y2="20" />
                      <line x1="12" y1="12" x2="12" y2="20" />
                    </svg>
                  </div>
                  <div className="data-card-info">
                    <strong>Tam Sistem Yedeği (.json)</strong>
                    <span>Tüm veritabanınızı tek bir dosya olarak arşivleyin ve saklayın.</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="data-export-btn full-backup"
                  onClick={() => exportFullBackupJSON(transactions, customerRecords, profile)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Tam Yedek Dosyasını İndir (.json)
                </button>
              </div>

              <div className="data-info-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>İndirilen CSV dosyaları UTF-8 BOM formatındadır; Microsoft Excel'de açıldığında Türkçe karakterler (ç, ğ, ı, ö, ş, ü) bozulmadan görüntülenir.</span>
              </div>
            </div>
          )}

          {/* ---- İÇERİ AKTARMA TABI ---- */}
          {dataTab === "import" && (
            <div className="data-import-cards-stack">
              
              {/* Kart 1: JSON Dosyasından Geri Yükle */}
              <div className="data-action-card">
                <div className="data-card-header">
                  <div className="data-icon-wrap" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                  </div>
                  <div className="data-card-info">
                    <strong>JSON Yedek Dosyası Geri Yükle</strong>
                    <span>Daha önce indirdiğiniz .json formatındaki yedeği içeri aktarın.</span>
                  </div>
                </div>

                <input
                  type="file"
                  accept=".json,application/json"
                  ref={jsonInputRef}
                  style={{ display: "none" }}
                  onChange={handleSelectJSON}
                />

                <button
                  type="button"
                  className="data-file-select-btn"
                  onClick={() => jsonInputRef.current?.click()}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {backupFile ? backupFile.name : "Yedek Dosyası Seç (.json)"}
                </button>

                {/* Önizleme Kutusu */}
                {backupPreview && (
                  <div className="import-preview-box">
                    <strong>Yedek Dosyası Doğrulandı:</strong>
                    <div className="preview-stat-grid">
                      <div className="preview-stat-item">
                        <span>İşlem Sayısı</span>
                        <strong>{backupPreview.transactions.length}</strong>
                      </div>
                      <div className="preview-stat-item">
                        <span>Cari Sayısı</span>
                        <strong>{backupPreview.customers.length}</strong>
                      </div>
                    </div>
                    {backupPreview.exportedAt && (
                      <span className="preview-date-text">
                        Yedekleme Tarihi: {formatDateTime(backupPreview.exportedAt)}
                      </span>
                    )}

                    <button
                      type="button"
                      className="primary-teal-btn"
                      disabled={importLoading}
                      onClick={handleExecuteImport}
                      style={{ marginTop: 10 }}
                    >
                      {importLoading ? "Veriler Aktarılıyor..." : "Verileri Sisteme Geri Yükle"}
                    </button>
                  </div>
                )}
              </div>

              {/* Kart 2: CSV Cari Listesi Yükle */}
              <div className="data-action-card">
                <div className="data-card-header">
                  <div className="data-icon-wrap" style={{ background: "#eff6ff", color: "#0284c7" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="data-card-info">
                    <strong>CSV'den Toplu Cari Ekle</strong>
                    <span>Excel'den kaydettiğiniz müşteri listenizi doğrudan yükleyin.</span>
                  </div>
                </div>

                <input
                  type="file"
                  accept=".csv,text/csv"
                  ref={csvInputRef}
                  style={{ display: "none" }}
                  onChange={handleSelectCSV}
                />

                <button
                  type="button"
                  className="data-file-select-btn"
                  disabled={importLoading}
                  onClick={() => csvInputRef.current?.click()}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Cari CSV Dosyası Yükle (.csv)
                </button>
              </div>

              {importError && <div className="form-error-banner">{importError}</div>}
              {importResult && (
                <div className="form-success-banner">
                  ✓ Veriler başarıyla aktarıldı! ({importResult.cCount} Cari, {importResult.tCount} İşlem eklendi).
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ============================================================
     ALT EKRAN 4: HAKKINDA
  ============================================================ */
  if (showAbout) {
    return (
      <div className="page sub-page menu-sub-page">
        <div className="custom-sub-header">
          <button type="button" className="sub-header-back-btn" onClick={() => setShowAbout(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 className="sub-header-title">Hakkında</h1>
        </div>

        <div className="screen-form-container" style={{ textAlign: "center", paddingTop: 30 }}>
          <div className="about-logo-circle">
            <svg viewBox="0 0 38 38" fill="none" style={{ width: 50, height: 50 }}>
              <rect x="6" y="4" width="26" height="30" rx="4" fill="#007384" />
              <line x1="12" y1="4" x2="12" y2="34" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.35" />
              <line x1="16" y1="12" x2="27" y2="12" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
              <line x1="16" y1="18" x2="25" y2="18" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
              <line x1="16" y1="24" x2="22" y2="24" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
              <rect x="18" y="2" width="3" height="4" rx="1" fill="#f59e0b" />
              <rect x="23" y="2" width="3" height="4" rx="1" fill="#10b981" />
            </svg>
          </div>
          <h2 style={{ fontSize: 20, margin: "14px 0 4px", color: "var(--text-main)" }}>İşletme Defterim</h2>
          <span style={{ fontSize: 13, color: "var(--text-sub)" }}>Sürüm 1.0.0 (Google Play Store Ready)</span>

          <p style={{ marginTop: 24, fontSize: 13, color: "var(--text-sub)", lineHeight: 1.6, textAlign: "left" }}>
            İşletme Defterim, küçük işletmeler ve esnaflar için geliştirilmiş modern, kolay ve profesyonel bir cari ve gelir-gider takip uygulamasıdır.
          </p>

          <div style={{ marginTop: 30, padding: 14, background: "var(--card-subtle)", borderRadius: 12, border: "1px solid var(--border)", fontSize: 12, color: "var(--text-sub)" }}>
            Google Firebase Cloud Firestore güvencesiyle verileriniz anında ve güvenle senkronize olur.
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
     ANA MENÜ LİSTESİ (Referans Ekran 9)
  ============================================================ */
  const isDark = theme === "dark";

  return (
    <div className="page menu-page">
      {/* Header: Menü */}
      <div className="menu-top-header">
        <h1 className="menu-title">Menü</h1>
      </div>

      <div className="menu-items-card-wrap">
        <div className="menu-items-single-card">
          {/* 1. Profil Bilgileri */}
          <button type="button" className="menu-single-row-item" onClick={() => onNavigate("profile")}>
            <div className="menu-item-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <span className="menu-item-text">Profil Bilgileri</span>
            <span className="menu-item-chevron">›</span>
          </button>

          {/* 2. Şifre Değiştir */}
          <button type="button" className="menu-single-row-item" onClick={() => setShowChangePassword(true)}>
            <div className="menu-item-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <span className="menu-item-text">Şifre Değiştir</span>
            <span className="menu-item-chevron">›</span>
          </button>

          {/* 3. Uygulama Ayarları */}
          <button type="button" className="menu-single-row-item" onClick={() => setShowAppSettings(true)}>
            <div className="menu-item-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <span className="menu-item-text">Uygulama Ayarları</span>
            <span className="menu-item-chevron">›</span>
          </button>

          {/* 4. Yedek / Geri Yükle */}
          <button
            type="button"
            className="menu-single-row-item"
            onClick={() => {
              setDataTab("import");
              setShowDataExportImport(true);
            }}
          >
            <div className="menu-item-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            </div>
            <span className="menu-item-text">Yedek / Geri Yükle</span>
            <span className="menu-item-chevron">›</span>
          </button>

          {/* 5. Veri İçer / Dışa Aktar */}
          <button
            type="button"
            className="menu-single-row-item"
            onClick={() => {
              setDataTab("export");
              setShowDataExportImport(true);
            }}
          >
            <div className="menu-item-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <span className="menu-item-text">Veri İçer / Dışa Aktar</span>
            <span className="menu-item-chevron">›</span>
          </button>

          {/* 6. Tema (Açık / Koyu Switch) */}
          <div className="menu-single-row-item">
            <div className="menu-item-icon-wrap">
              {isDark ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              )}
            </div>
            <span className="menu-item-text">Karanlık Tema</span>
            <div className="menu-theme-right-wrap">
              <span className="theme-name-label">{isDark ? "Koyu" : "Açık"}</span>
              <button
                type="button"
                className={`ios-toggle-switch ${isDark ? "checked" : ""}`}
                onClick={toggleTheme}
                aria-label="Karanlık Modu Değiştir"
              >
                <span className="ios-toggle-thumb" />
              </button>
            </div>
          </div>

          {/* 7. Hakkında */}
          <button type="button" className="menu-single-row-item" onClick={() => setShowAbout(true)}>
            <div className="menu-item-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <span className="menu-item-text">Hakkında</span>
            <span className="menu-item-chevron">›</span>
          </button>
        </div>

        {/* 8. Çıkış Yap (Açık Kırmızı Kart) */}
        <div className="menu-logout-card-wrap">
          <button type="button" className="menu-logout-card-btn" onClick={onLogout}>
            <div className="menu-logout-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <span className="menu-logout-text">Çıkış Yap</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default MenuPage;
