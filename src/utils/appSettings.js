/* ============================================================
   appSettings.js — Uygulama Ayarları Yardımcısı
   Yerel depolama (localStorage) üzerinden ayarların yönetimi.
============================================================ */

export const DEFAULT_SETTINGS = {
  currency: "₺",
  currencyName: "Türk Lirası (₺)",
  defaultDueDateDays: 30,
  defaultTxnType: "sale", // sale, purchase, collection, payout
  dueReminders: true,
  endOfDayReminder: false,
  quickAmountChips: true,
  invoiceHeader: "",
  soundFeedback: true,
};

const STORAGE_KEY = "app_settings";

export function getAppSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveAppSettings(newSettings) {
  try {
    const merged = { ...getAppSettings(), ...newSettings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return newSettings;
  }
}
