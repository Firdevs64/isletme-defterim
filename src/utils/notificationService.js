/* ============================================================
   notificationService.js — Bildirim & Hatırlatıcı Servisi
   - Android/iOS: Capacitor Local Notifications
   - Web/PWA: Web Notification API
   - Vade hatırlatıcıları
============================================================ */

import {
  getToday,
  normalizeType,
  formatMoney,
} from "./transactionHelpers";

import { getAppSettings } from "./appSettings";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

/* ============================================================
   BİLDİRİM İZNİ
============================================================ */

export async function requestNotificationPermission() {
  if (Capacitor.isNativePlatform()) {
    try {
      let permission = await LocalNotifications.checkPermissions();

      if (permission.display !== "granted") {
        permission = await LocalNotifications.requestPermissions();
      }

      return {
        supported: true,
        permission: permission.display,
        message:
          permission.display === "granted"
            ? "Bildirim izni verildi."
            : "Bildirim izni verilmedi.",
      };
    } catch (error) {
      console.error("Bildirim izin hatası:", error);

      return {
        supported: true,
        permission: "denied",
        message: "Bildirim izni alınırken bir hata oluştu.",
      };
    }
  }

  if (!("Notification" in window)) {
    return {
      supported: false,
      permission: "unsupported",
      message: "Bu tarayıcı bildirimleri desteklemiyor.",
    };
  }

  if (Notification.permission === "granted") {
    return {
      supported: true,
      permission: "granted",
    };
  }

  if (Notification.permission === "denied") {
    return {
      supported: true,
      permission: "denied",
      message: "Tarayıcı ayarlarından bildirim iznini açabilirsiniz.",
    };
  }

  const permission = await Notification.requestPermission();

  return {
    supported: true,
    permission,
  };
}

/* ============================================================
   BİLDİRİM GÖNDER
============================================================ */

export async function sendNotification(title, body, options = {}) {
  if (Capacitor.isNativePlatform()) {
    try {
      const permission = await LocalNotifications.checkPermissions();

      if (permission.display !== "granted") {
        return false;
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: options.id || Math.floor(Date.now() % 2147483647),
            schedule: {
              at: options.at || new Date(Date.now() + 1000),
            },
            extra: options.extra || {},
          },
        ],
      });

      return true;
    } catch (error) {
      console.error("Native bildirim hatası:", error);
      return false;
    }
  }

  if (
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return false;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      tag: options.tag || `isletme-defteri-${Date.now()}`,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return true;
  } catch (error) {
    console.error("Web bildirim hatası:", error);
    return false;
  }
}

/* ============================================================
   VADELERİ HESAPLA
============================================================ */

export function getDueNotifications(transactions = []) {
  const today = getToday();
  const notifications = [];

  transactions.forEach((transaction) => {
    if (!transaction.dueDate) return;

    const type = normalizeType(transaction.type);

    const isReceivable = type === "sale";
    const isPayable = type === "purchase";

    if (!isReceivable && !isPayable) return;

    const dueDate = new Date(`${transaction.dueDate}T00:00:00`);
    const todayDate = new Date(`${today}T00:00:00`);

    const diffDays = Math.round(
      (dueDate - todayDate) / (1000 * 60 * 60 * 24)
    );

    let status = null;
    let badgeText = "";
    let severity = "info";

    if (diffDays < 0) {
      status = "overdue";
      badgeText = `${Math.abs(diffDays)} gün gecikti`;
      severity = "danger";
    } else if (diffDays === 0) {
      status = "today";
      badgeText = "Vadesi bugün!";
      severity = "warning";
    } else if (diffDays <= 3) {
      status = "upcoming";
      badgeText = `${diffDays} gün kaldı`;
    }

    if (!status) return;

    notifications.push({
      id: transaction.id,
      customer: transaction.customer || "Belirtilmemiş Cari",
      amount: Number(transaction.amount) || 0,
      type,
      typeLabel: isReceivable
        ? "Alacak (Satış)"
        : "Borç (Alış)",
      dueDate: transaction.dueDate,
      status,
      badgeText,
      severity,
      diffDays,
      note: transaction.note || transaction.description || "",
    });
  });

  notifications.sort((a, b) => a.diffDays - b.diffDays);

  return notifications;
}

/* ============================================================
   BİLDİRİM ID OLUŞTUR
============================================================ */

function createNotificationId(transactionId) {
  let hash = 0;

  for (let i = 0; i < transactionId.length; i++) {
    hash =
      (hash * 31 + transactionId.charCodeAt(i)) |
      0;
  }

  return Math.abs(hash) || 1;
}

/* ============================================================
   TEK BİR VADE BİLDİRİMİNİ İPTAL ET
============================================================ */

export async function cancelDueNotification(transactionId) {
  if (!Capacitor.isNativePlatform() || !transactionId) return;

  const notificationId = createNotificationId(transactionId);

  try {
    await LocalNotifications.cancel({
      notifications: [
        {
          id: notificationId,
        },
      ],
    });
  } catch (error) {
    console.error("Vade bildirimi iptal edilemedi:", error);
  }
}

/* ============================================================
   TÜM VADE BİLDİRİMLERİNİ İPTAL ET
============================================================ */

export async function cancelAllDueNotifications() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const pendingResult = await LocalNotifications.getPending();

    const dueNotifications = pendingResult.notifications.filter(
      (notification) =>
        notification.extra?.type === "due-reminder"
    );

    if (dueNotifications.length === 0) return;

    await LocalNotifications.cancel({
      notifications: dueNotifications.map((notification) => ({
        id: notification.id,
      })),
    });
  } catch (error) {
    console.error("Vade bildirimleri iptal edilemedi:", error);
  }
}

/* ============================================================
   VADE BİLDİRİMLERİNİ KONTROL ET / PLANLA
============================================================ */

export async function checkAndTriggerDueReminders(transactions = []) {
  const settings = getAppSettings();

  /*
   * Kullanıcı vade hatırlatıcılarını kapattıysa
   * Android'de önceden planlanmış vade bildirimlerini de kaldır.
   */
  if (!settings.dueReminders) {
    await cancelAllDueNotifications();
    return;
  }

  const permission = await requestNotificationPermission();

  if (permission.permission !== "granted") return;

  /* ============================================================
     WEB / PWA
  ============================================================ */

  if (!Capacitor.isNativePlatform()) {
    const dueList = getDueNotifications(transactions);

    const urgent = dueList.filter(
      (item) =>
        item.status === "today" ||
        item.status === "overdue"
    );

    if (urgent.length === 0) return;

    if (urgent.length === 1) {
      const item = urgent[0];

      const statusMessage =
        item.status === "today"
          ? "vadesi bugün!"
          : `${Math.abs(item.diffDays)} gün gecikti.`;

      await sendNotification(
        "İşletme Defteri — Vade Hatırlatıcısı",
        `${item.customer} carisine ait ${formatMoney(
          item.amount
        )} ₺ ${item.typeLabel.toLowerCase()} işleminin ${statusMessage}`,
        {
          tag: `due-${item.id}`,
        }
      );
    }

    return;
  }

  /* ============================================================
     ANDROID / iOS
  ============================================================ */

  /*
   * Android'de şu anda gerçekten bekleyen
   * Local Notification kayıtlarını al.
   */
  const pendingResult =
    await LocalNotifications.getPending();

  const pendingDueNotifications =
    pendingResult.notifications.filter(
      (notification) =>
        notification.extra?.type === "due-reminder"
    );

  /*
   * Yalnızca vade bildirimi oluşturulabilecek
   * geçerli işlemleri belirle.
   */
  const validTransactions = transactions.filter(
    (transaction) => {
      if (!transaction.id || !transaction.dueDate) {
        return false;
      }

      const type = normalizeType(transaction.type);

      return type === "sale" || type === "purchase";
    }
  );

  /*
   * Firestore'da hâlâ var olan işlemlerin
   * notification ID'lerini oluştur.
   */
  const validNotificationIds = new Set(
    validTransactions.map((transaction) =>
      createNotificationId(transaction.id)
    )
  );

  /*
   * Android'de alarm var ama Firestore'da karşılık gelen
   * işlem artık yoksa yalnızca o eski alarmı temizle.
   *
   * ÖNEMLİ:
   * Mevcut/geçerli alarmları burada silmiyoruz.
   */
  const obsoleteNotifications =
    pendingDueNotifications.filter(
      (notification) =>
        !validNotificationIds.has(notification.id)
    );

  if (obsoleteNotifications.length > 0) {
    await LocalNotifications.cancel({
      notifications: obsoleteNotifications.map(
        (notification) => ({
          id: notification.id,
        })
      ),
    });
  }

  /*
   * Android'de zaten planlanmış olan
   * bildirim ID'lerini kaydet.
   */
  const pendingIds = new Set(
    pendingDueNotifications.map(
      (notification) => notification.id
    )
  );

  const now = new Date();

  /*
   * Her geçerli satış/alış işlemini kontrol et.
   */
  for (const transaction of validTransactions) {
    const notificationId =
      createNotificationId(transaction.id);

    /*
     * Bu işlem için Android'de zaten bir alarm varsa
     * tekrar oluşturma ve mevcut alarmı bozma.
     */
    if (pendingIds.has(notificationId)) {
      continue;
    }

    /*
     * Bildirim vade günü saat 09:00'da gösterilecek.
     */
const dueAt = new Date(
  `${transaction.dueDate}T09:00:00`
);

    /*
     * Geçmiş zamana yeni alarm oluşturma.
     */
    if (dueAt <= now) {
      continue;
    }

    const type = normalizeType(transaction.type);

    const typeLabel =
      type === "sale"
        ? "alacak (satış)"
        : "borç (alış)";

    const customer =
      transaction.customer || "Belirtilmemiş Cari";

    const amount =
      Number(transaction.amount) || 0;

    /*
     * Android'e gelecekte çalışacak gerçek
     * Local Notification alarmını bırak.
     */
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId,

          title:
            "İşletme Defteri — Vade Hatırlatıcısı",

          body: `${customer} carisine ait ${formatMoney(
            amount
          )} ₺ ${typeLabel} işleminin vadesi bugün!`,

schedule: {
  at: dueAt,
  allowWhileIdle: true,
},

          extra: {
            type: "due-reminder",
            transactionId: transaction.id,
          },
        },
      ],
    });

    /*
     * Aynı fonksiyon çalışması sırasında aynı işlemin
     * tekrar planlanmasını engelle.
     */
    pendingIds.add(notificationId);
  }
}