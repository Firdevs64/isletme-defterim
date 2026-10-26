/* ============================================================
   notificationService.js — Bildirim & Hatırlatıcı Servisi
   - Web Notification API entegrasyonu (Windows, Android, Mac)
   - Vadesi gelen ve geçen alacak/borçları filtreleme
   - Test bildirimi ve otomatik kontrol
============================================================ */

import { getToday, normalizeType, formatMoney, getTypeLabel } from "./transactionHelpers";
import { getAppSettings } from "./appSettings";

/**
 * Tarayıcı bildirim izni isteme
 */
export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    console.warn("[Bildirim] Bu tarayıcı Notification API desteklemiyor.");
    return {
      supported: false,
      permission: "unsupported",
      message: "Bu tarayıcı bildirimleri desteklemiyor.",
    };
  }

  if (Notification.permission === "granted") {
    console.log("[Bildirim] İzin zaten verilmiş:", Notification.permission);
    return { supported: true, permission: "granted" };
  }

  if (Notification.permission === "denied") {
    console.warn("[Bildirim] İzin daha önce reddedilmiş.");
    return {
      supported: true,
      permission: "denied",
      message: "Bildirim izni daha önce reddedildi. Tarayıcı adres çubuğundaki kilit simgesinden izin verebilirsiniz.",
    };
  }

  try {
    const permission = await Notification.requestPermission();
    console.log("[Bildirim] İzin sonucu:", permission);
    return {
      supported: true,
      permission,
      message:
        permission === "granted"
          ? "Bildirim izni verildi."
          : "Bildirim izni reddedildi. Tarayıcı adres çubuğundaki kilit simgesinden izin verebilirsiniz.",
    };
  } catch (err) {
    console.error("[Bildirim] İzin isteme hatası:", err);
    return { supported: true, permission: "denied", message: err.message };
  }
}

/**
 * Gerçek cihaz / sistem bildirimi gönderme
 */
export function sendBrowserNotification(title, body, options = {}) {
  if (!("Notification" in window)) {
    console.warn("[Bildirim] Notification API bulunamadı.");
    return false;
  }
  if (Notification.permission !== "granted") {
    console.warn("[Bildirim] İzin durumu:", Notification.permission);
    return false;
  }

  try {
    console.log("[Bildirim] Gönderiliyor:", title, body);
    const notification = new Notification(title, {
      body,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      tag: options.tag || "isletme-defterim-" + Date.now(),
      ...options,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    console.log("[Bildirim] Başarıyla gönderildi!");
    return true;
  } catch (err) {
    console.warn("[Bildirim] Gönderim hatası:", err);
    return false;
  }
}

/**
 * Vadesi gelen / geçen bildirimleri hesaplar
 */
export function getDueNotifications(transactions = []) {
  const today = getToday();
  const notifications = [];

  transactions.forEach((t) => {
    if (!t.dueDate) return;

    const normType = normalizeType(t.type);
    const isReceivable = normType === "sale"; // Alacak
    const isPayable = normType === "purchase"; // Borç

    // Sadece alacak veya borç oluşturan işlemlerin vadesi takip edilir
    if (!isReceivable && !isPayable) return;

    const diffDays = Math.round(
      (new Date(t.dueDate + "T00:00:00") - new Date(today + "T00:00:00")) / (1000 * 60 * 60 * 24)
    );

    let status = null;
    let badgeText = "";
    let severity = "info"; // "danger" | "warning" | "info"

    if (diffDays < 0) {
      status = "overdue";
      const absDays = Math.abs(diffDays);
      badgeText = `${absDays} gün gecikti`;
      severity = "danger";
    } else if (diffDays === 0) {
      status = "today";
      badgeText = "Vadesi bugün!";
      severity = "warning";
    } else if (diffDays <= 3) {
      status = "upcoming";
      badgeText = `${diffDays} gün kaldı`;
      severity = "info";
    }

    if (status) {
      notifications.push({
        id: t.id,
        customer: t.customer || "Belirtilmemiş Cari",
        amount: Number(t.amount) || 0,
        type: normType,
        typeLabel: isReceivable ? "Alacak (Satış)" : "Borç (Alış)",
        dueDate: t.dueDate,
        status,
        badgeText,
        severity,
        diffDays,
        note: t.note || t.description || "",
      });
    }
  });

  // En acil olanları başa sırala (gecikenler, sonra bugün, sonra yaklaşanlar)
  notifications.sort((a, b) => a.diffDays - b.diffDays);
  return notifications;
}

/**
 * Vadesi gelen bildirimleri kontrol et ve cihaz bildirimi tetikle
 */
export function checkAndTriggerDueReminders(transactions = []) {
  const settings = getAppSettings();
  if (!settings.dueReminders) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const dueList = getDueNotifications(transactions);
  const urgent = dueList.filter((n) => n.status === "overdue" || n.status === "today");

  if (urgent.length === 0) return;

  // Aynı gün içinde tekrar tekrar bildirim spam'ı yapmamak için son bildirim tarihini kontrol et
  const lastAlertDate = localStorage.getItem("last_due_notification_date");
  const today = getToday();
  if (lastAlertDate === today) return;

  if (urgent.length === 1) {
    const item = urgent[0];
    const statusMsg = item.status === "today" ? "vadesi bugün!" : `${Math.abs(item.diffDays)} gün gecikti.`;
    sendBrowserNotification(
      "İşletme Defterim — Vade Hatırlatıcısı",
      `${item.customer} carisine ait ${formatMoney(item.amount)} ₺ ${item.typeLabel.toLowerCase()} ödemesinin ${statusMsg}`
    );
  } else {
    sendBrowserNotification(
      "İşletme Defterim — Vade Hatırlatıcısı",
      `Dikkat: ${urgent.length} adet işlemin vadesi geldi veya gecikti. Detayları görmek için dokunun.`
    );
  }

  localStorage.setItem("last_due_notification_date", today);
}

/**
 * Kullanıcıya hemen bir test bildirimi gönderir
 */
export async function sendTestNotification() {
  console.log("[Bildirim] Test bildirimi başlatılıyor...");

  const perm = await requestNotificationPermission();
  console.log("[Bildirim] İzin durumu:", perm);

  if (perm.permission !== "granted") {
    alert(perm.message || "Bildirim izni verilmedi. Lütfen tarayıcı izinlerini kontrol edin.");
    return false;
  }

  // Kısa bir gecikme ekle — bazı tarayıcılar izin verdikten hemen sonra bildirim gönderimini engelleyebilir
  await new Promise((resolve) => setTimeout(resolve, 300));

  const success = sendBrowserNotification(
    "İşletme Defterim 🔔",
    "Harika! Bildirim sistemi başarıyla aktif edildi. Vadesi gelen ödemeleriniz burada hatırlatılacaktır."
  );

  if (!success) {
    console.warn("[Bildirim] Test bildirimi gönderilemedi.");
    alert("Bildirim izni verildi ancak bildirim gönderilemedi. Tarayıcı konsolunu kontrol edin.");
  }

  return success;
}

