/* ============================================================
   exportImportHelpers.js — Veri Dışa / İçe Aktar Yardımcıları
   - Excel / CSV formatında İşlemler ve Cariler
   - Tam JSON Yedekleme & Geri Yükleme
   - UTF-8 BOM desteği ile Türkçe karakterler bozulmadan açılır
============================================================ */

import { getTypeLabel, getCustomerTypeLabel, getToday } from "./transactionHelpers";

/**
 * Dosya indirme tetikleyici
 */
export function downloadFile(content, fileName, mimeType = "text/csv;charset=utf-8;") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * CSV hücresi için güvenli metin kaçışı (escape)
 */
function escapeCSV(val) {
  if (val === null || val === undefined) return "";
  const str = String(val).replace(/"/g, '""');
  if (str.includes(";") || str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str}"`;
  }
  return str;
}

/**
 * 1. İşlemleri Excel / CSV Olarak Dışa Aktar
 */
export function exportTransactionsToCSV(transactions = []) {
  if (!transactions.length) {
    alert("Dışa aktarılacak işlem bulunamadı.");
    return false;
  }

  // UTF-8 BOM (\uFEFF) Excel'in Türkçe karakterleri tanıması için gereklidir
  const BOM = "\uFEFF";
  const headers = [
    "Tarih",
    "Cari / Müşteri",
    "İşlem Türü",
    "Tutar (TL)",
    "Ödeme Yöntemi",
    "Vade Tarihi",
    "Açıklama / Not",
  ];

  const rows = transactions.map((t) => [
    escapeCSV(t.date || ""),
    escapeCSV(t.customer || "-"),
    escapeCSV(getTypeLabel(t.type)),
    escapeCSV(Number(t.amount || 0).toFixed(2)),
    escapeCSV(t.paymentMethod || "Nakit"),
    escapeCSV(t.dueDate || "-"),
    escapeCSV(t.note || t.description || ""),
  ]);

  const csvContent = BOM + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
  const fileName = `IsletmeDefterim_Islemler_${getToday()}.csv`;
  downloadFile(csvContent, fileName, "text/csv;charset=utf-8;");
  return true;
}

/**
 * 2. Carileri Excel / CSV Olarak Dışa Aktar
 */
export function exportCustomersToCSV(customerRecords = [], transactions = []) {
  if (!customerRecords.length && !transactions.length) {
    alert("Dışa aktarılacak cari bulunamadı.");
    return false;
  }

  // Cari isimlerini topla
  const customerMap = new Map();

  customerRecords.forEach((c) => {
    customerMap.set(c.name, {
      name: c.name,
      type: getCustomerTypeLabel(c.type),
      phone: c.phone || "",
      email: c.email || "",
      note: c.note || "",
      sales: 0,
      collections: 0,
      purchases: 0,
      payouts: 0,
    });
  });

  // İşlemlerden bakiyeleri hesapla
  transactions.forEach((t) => {
    const cName = t.customer;
    if (!cName) return;
    if (!customerMap.has(cName)) {
      customerMap.set(cName, {
        name: cName,
        type: "Müşteri",
        phone: "",
        email: "",
        note: "",
        sales: 0,
        collections: 0,
        purchases: 0,
        payouts: 0,
      });
    }
    const item = customerMap.get(cName);
    const amt = Number(t.amount) || 0;
    if (t.type === "sale" || t.type === "job") item.sales += amt;
    else if (t.type === "collection" || t.type === "payment") item.collections += amt;
    else if (t.type === "purchase" || t.type === "expense") item.purchases += amt;
    else if (t.type === "payout") item.payouts += amt;
  });

  const BOM = "\uFEFF";
  const headers = [
    "Cari Adı / Firma",
    "Tür",
    "Telefon",
    "E-posta",
    "Toplam Satış (TL)",
    "Toplam Tahsilat (TL)",
    "Kalan Alacak / Bakiye (TL)",
    "Not",
  ];

  const rows = Array.from(customerMap.values()).map((c) => {
    const balance = c.sales - c.collections;
    return [
      escapeCSV(c.name),
      escapeCSV(c.type),
      escapeCSV(c.phone),
      escapeCSV(c.email),
      escapeCSV(c.sales.toFixed(2)),
      escapeCSV(c.collections.toFixed(2)),
      escapeCSV(balance.toFixed(2)),
      escapeCSV(c.note),
    ];
  });

  const csvContent = BOM + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
  const fileName = `IsletmeDefterim_Cariler_${getToday()}.csv`;
  downloadFile(csvContent, fileName, "text/csv;charset=utf-8;");
  return true;
}

/**
 * 3. Tam Sistem Yedeği (JSON)
 */
export function exportFullBackupJSON(transactions = [], customerRecords = [], profile = {}) {
  const backupData = {
    appName: "İşletme Defterim",
    appVersion: "1.0.0",
    exportedAt: new Date().toISOString(),
    profile: {
      businessName: profile?.businessName || "",
      fullName: profile?.fullName || "",
      phone: profile?.phone || "",
    },
    counts: {
      transactions: transactions.length,
      customers: customerRecords.length,
    },
    transactions,
    customers: customerRecords,
  };

  const jsonString = JSON.stringify(backupData, null, 2);
  const fileName = `IsletmeDefterim_Yedek_${getToday()}.json`;
  downloadFile(jsonString, fileName, "application/json;charset=utf-8;");
  return true;
}

/**
 * 4. JSON Yedek Dosyasını Okuma & Doğrulama
 */
export function parseJSONBackupFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("Lütfen bir yedek dosyası seçin."));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const data = JSON.parse(text);

        if (!data || typeof data !== "object") {
          throw new Error("Geçersiz yedek dosyası formatı.");
        }

        const transactions = Array.isArray(data.transactions) ? data.transactions : [];
        const customers = Array.isArray(data.customers) ? data.customers : [];

        resolve({
          success: true,
          exportedAt: data.exportedAt || null,
          appName: data.appName || "Bilinmeyen",
          transactions,
          customers,
          profile: data.profile || null,
        });
      } catch (err) {
        reject(new Error("Dosya okunamadı veya formatı geçersiz: " + err.message));
      }
    };
    reader.onerror = () => reject(new Error("Dosya okunurken bir hata oluştu."));
    reader.readAsText(file, "UTF-8");
  });
}

/**
 * 5. CSV Cari Dosyası Ayrıştırma
 */
export function parseCustomersCSVFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("Lütfen bir CSV dosyası seçin."));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let text = e.target.result;
        // Strip BOM
        if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          throw new Error("CSV dosyasında veri bulunamadı.");
        }

        // Determine delimiter: semicolon or comma
        const firstLine = lines[0];
        const delimiter = firstLine.includes(";") ? ";" : ",";

        const headers = firstLine.split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ""));
        const customers = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""));
          const name = cols[0];
          if (!name) continue;

          customers.push({
            name,
            type: cols[1]?.toLowerCase().includes("tedarik") ? "supplier" : "customer",
            phone: cols[2] || "",
            email: cols[3] || "",
            note: cols[7] || cols[4] || "",
          });
        }

        resolve({ success: true, customers });
      } catch (err) {
        reject(new Error("CSV ayrıştırılamadı: " + err.message));
      }
    };
    reader.onerror = () => reject(new Error("Dosya okunurken bir hata oluştu."));
    reader.readAsText(file, "UTF-8");
  });
}
