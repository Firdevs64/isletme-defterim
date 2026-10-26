/* ==========================================================
   İŞLEM TİPİ YARDIMCILARI
   Eski (job/payment/expense) ve yeni (sale/purchase/collection/payout)
   tipleri arasında backward-compatible eşleme.
========================================================== */

/**
 * Firestore'daki ham tipi normalize edilmiş yeni tipe çevirir.
 * Eski veriler bozulmadan korunur; sadece UI katmanında eşlenir.
 */
export function normalizeType(rawType) {
  switch (rawType) {
    case "job":        return "sale";       // Satış / İş
    case "payment":    return "collection"; // Tahsilat
    case "expense":    return "purchase";   // Alış / Gider
    case "sale":       return "sale";
    case "collection": return "collection";
    case "purchase":   return "purchase";
    case "payout":     return "payout";     // Ödeme (yeni)
    default:           return rawType;
  }
}

/**
 * Kullanıcıya gösterilecek Türkçe etiket.
 */
export function getTypeLabel(rawType) {
  const t = normalizeType(rawType);
  switch (t) {
    case "sale":       return "Satış";
    case "collection": return "Tahsilat";
    case "purchase":   return "Alış";
    case "payout":     return "Ödeme";
    default:           return rawType;
  }
}

/**
 * İşlem türüne göre renk.
 */
export function getTypeColor(rawType) {
  const t = normalizeType(rawType);
  switch (t) {
    case "sale":       return "#1a8a5a"; // yeşil
    case "collection": return "#1a7fc1"; // mavi
    case "purchase":   return "#e05252"; // kırmızı
    case "payout":     return "#e07d20"; // turuncu
    default:           return "#747b82";
  }
}

/**
 * İşlem türüne göre arka plan rengi.
 */
export function getTypeBg(rawType) {
  const t = normalizeType(rawType);
  switch (t) {
    case "sale":       return "#e8f7ef";
    case "collection": return "#e6f2fb";
    case "purchase":   return "#fef0f0";
    case "payout":     return "#fef5e9";
    default:           return "#f0f1f2";
  }
}

/**
 * İşlemin para girişi mi yoksa çıkışı mı olduğunu döner.
 * - Satış (+): İşletme açısından alacak oluşturur
 * - Tahsilat (+): Para giriyor
 * - Alış (-): Para çıkıyor
 * - Ödeme (-): Para çıkıyor
 */
export function isIncome(rawType) {
  const t = normalizeType(rawType);
  return t === "sale" || t === "collection";
}

/**
 * Para birimi formatı (Türkçe)
 */
export function formatMoney(amount) {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

/**
 * Tarih formatı (Türkçe kısa)
 */
export function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${dateStr}T00:00:00`));
  } catch {
    return dateStr;
  }
}

/**
 * Tarih + saat (createdAt timestamp objesi veya string için)
 */
export function formatDateTime(val) {
  if (!val) return "";
  try {
    const date = val.toDate ? val.toDate() : new Date(val);
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "";
  }
}

/**
 * Bugünün tarihi YYYY-MM-DD formatında
 */
export function getToday() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * İsmin baş harflerini döner (profil avatarı için)
 */
export function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0].toLocaleUpperCase("tr-TR");
  return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase("tr-TR");
}

/**
 * İsmin ilk kelimesini döner
 */
export function getFirstName(name) {
  if (!name) return "";
  return name.trim().split(/\s+/)[0];
}

/**
 * Birim etiketi
 */
export function getUnitLabel(unitType) {
  if (unitType === "adet") return "Adet";
  if (unitType === "m2") return "m²";
  return "";
}

/**
 * Miktarı formatlar
 */
export function formatQuantity(quantity) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
  }).format(Number(quantity));
}

/**
 * Cari türü etiketi
 */
export function getCustomerTypeLabel(type) {
  switch (type) {
    case "supplier": return "Tedarikçi";
    case "other":    return "Diğer";
    default:         return "Müşteri";
  }
}

/**
 * Bu ayki işlemleri filtreler
 */
export function filterThisMonth(transactions) {
  const now = new Date();
  return transactions.filter((t) => {
    if (!t.date) return false;
    const [y, m] = t.date.split("-").map(Number);
    return y === now.getFullYear() && m === now.getMonth() + 1;
  });
}
