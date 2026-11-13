/* ============================================================
   App.jsx — İşletme Defteri
   Firebase Auth + Firestore entegrasyonu
   Mevcut veriler (job/payment/expense) backward-compatible korundu
============================================================ */
import { useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signOut,
  updateProfile,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import "./App.css";
import { auth, db } from "./firebase";
import {
  checkAndTriggerDueReminders,
  cancelDueNotification,
} from "./utils/notificationService";
import { getToday, getInitials } from "./utils/transactionHelpers";
import { getAppSettings } from "./utils/appSettings";
// Sayfalar
import HomePage from "./pages/HomePage";
import CustomersPage from "./pages/Customers";
import TransactionsPage from "./pages/TransactionsPage";
import NewTransactionPage from "./pages/NewTransactionPage";
import QuickPaymentPage from "./pages/QuickPaymentPage";
import ReportsPage from "./pages/ReportsPage";
import MenuPage from "./pages/MenuPage";
import PasswordResetPage from "./pages/PasswordResetPage";
import Profile from "./pages/Profile";
import Auth from "./components/Auth";
import BottomNav from "./components/BottomNav";
import Sidebar from "./components/Sidebar";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import DeleteAccountPage from "./pages/DeleteAccountPage";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { useAppDialog } from "./components/AppDialog";

if (Capacitor.isNativePlatform() && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
    });
  });
}

function App() {
  const { showAlert, showConfirm } = useAppDialog();
  const urlParams = new URLSearchParams(window.location.search);

  const isPasswordResetPage =
    urlParams.get("mode") === "resetPassword" && urlParams.get("oobCode");
  // Google Play için herkese açık gizlilik politikası sayfası
  if (window.location.pathname === "/privacy") {
    return <PrivacyPolicyPage />;
  }
  if (window.location.pathname === "/delete-account") {
    return <DeleteAccountPage />;
  }
  /* ---- Auth State ---- */
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  /* ---- Sayfa yönetimi ---- */
  const [currentPage, setCurrentPage] = useState("home");
  const [pageParams, setPageParams] = useState({});
  const navigate = (page, params = {}) => {
    setCurrentPage(page);
    setPageParams(params);
  };
  /* ---- Android Fiziksel Geri Tuşu ---- */
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let backButtonListener;

    const setupBackButton = async () => {
      backButtonListener = await CapacitorApp.addListener("backButton", () => {
        if (currentPage === "newTransaction") {
          navigate(pageParams.returnTo || "home");
          return;
        }

        if (currentPage === "profile") {
          navigate("menu");
          return;
        }

        if (
          currentPage === "quickPayment" ||
          currentPage === "transactions" ||
          currentPage === "customers" ||
          currentPage === "reports" ||
          currentPage === "menu"
        ) {
          navigate("home");
          return;
        }

        if (currentPage === "home") {
          CapacitorApp.exitApp();
        }
      });
    };

    setupBackButton();

    return () => {
      backButtonListener?.remove();
    };
  }, [currentPage, pageParams]);

  /* ---- Belge Başlığı (PWA & Tarayıcı) ---- */
  useEffect(() => {
    document.title = "İşletme Defteri";
  }, []);

  /* ---- Tema (Açık / Koyu) ---- */
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("app_theme") || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.classList.toggle("dark-theme", theme === "dark");
    localStorage.setItem("app_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  /* ---- Veri ---- */
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [customerRecords, setCustomerRecords] = useState([]);

  /* ========== FIREBASE AUTH & PROFİL ========== */
  useEffect(() => {
    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);

      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (!firebaseUser) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);

      const profileRef = doc(db, "users", firebaseUser.uid);

      unsubscribeProfile = onSnapshot(
        profileRef,
        (snap) => {
          if (snap.exists()) {
            setProfile(snap.data());
            setProfileLoading(false);
          }
          // Belge henüz oluşmadıysa beklemeye devam ediyoruz.
          // Kayıt sırasında Auth.jsx setDoc ile belgeyi oluşturunca
          // onSnapshot tekrar tetiklenecek.
        },
        (error) => {
          console.error("Profil yükleme hatası:", error);
          setProfile(null);
          setProfileLoading(false);
        },
      );
    });

    return () => {
      unsubscribeAuth();

      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  /* ========== TRANSACTIONS LISTENER ========== */
  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setTransactionsLoading(false);
      return;
    }
    setTransactionsLoading(true);
    const q = query(
      collection(db, "users", user.uid, "transactions"),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setTransactionsLoading(false);
      },
      () => {
        setTransactions([]);
        setTransactionsLoading(false);
      },
    );
    return unsub;
  }, [user]);
  /* ========== DUE REMINDER CHECK ========== */
  useEffect(() => {
    if (transactionsLoading || transactions.length === 0) return;

    checkAndTriggerDueReminders(transactions);
  }, [transactions, transactionsLoading]);

  /* ========== CUSTOMERS LISTENER ========== */
  useEffect(() => {
    if (!user) {
      setCustomerRecords([]);
      return;
    }
    const q = query(
      collection(db, "users", user.uid, "customers"),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) =>
        setCustomerRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setCustomerRecords([]),
    );
    return unsub;
  }, [user]);

  /* ========== CARİ LİSTESİ (dropdown için) ========== */
  const customers = useMemo(() => {
    const savedNames = customerRecords.map((c) => c.name).filter(Boolean);
    const oldNames = transactions
      .filter((t) => t.customer)
      .map((t) => t.customer);
    return [...new Set([...savedNames, ...oldNames])];
  }, [customerRecords, transactions]);

  /* ========== YENİ CARİ KAYDET ========== */
  const handleAddCustomer = async (data) => {
    if (!user) return false;

    const name = data.name?.trim();

    if (!name) {
      await showAlert("Ad Soyad / Firma Adı alanını doldurun.", {
        title: "Eksik Bilgi",
      });
      return false;
    }

    const exists = customers.some(
      (c) => c.toLocaleLowerCase("tr-TR") === name.toLocaleLowerCase("tr-TR"),
    );

    if (exists) {
      await showAlert("Bu cari zaten kayıtlı.", {
        title: "Cari Zaten Kayıtlı",
      });
      return false;
    }

    try {
      await addDoc(collection(db, "users", user.uid, "customers"), {
        name,
        phone: data.phone?.trim() || "",
        email: data.email?.trim() || "",
        note: data.note?.trim() || "",
        type: data.type || "customer",
        color: data.color || "#0f7bff",
        createdAt: serverTimestamp(),
      });

      return true;
    } catch {
      await showAlert("Cari kaydedilemedi.", {
        title: "Kayıt Başarısız",
      });

      return false;
    }
  };

  /* ========== İŞLEM SİL ========== */
  const deleteTransaction = async (id) => {
    if (!user) return;

    const confirmed = await showConfirm(
      "Bu işlemi silmek istediğinize emin misiniz?",
      {
        title: "İşlemi Sil",
        confirmText: "Sil",
        cancelText: "Vazgeç",
        danger: true,
      },
    );

    if (!confirmed) return;

    try {
      await cancelDueNotification(id);

      await deleteDoc(doc(db, "users", user.uid, "transactions", id));
    } catch {
      await showAlert("İşlem silinemedi.", {
        title: "Silme Başarısız",
      });
    }
  };

  /* ========== PROFİL GÜNCELLE ========== */
  const handleProfileSave = async (newProfile) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        fullName: newProfile.fullName,
        businessName: newProfile.businessName,
        phone: newProfile.phone,
      });
      await updateProfile(user, { displayName: newProfile.fullName });
      setProfile((prev) => ({ ...prev, ...newProfile }));
      navigate("menu");
    } catch {
      await showAlert("Profil kaydedilemedi.", {
        title: "Kayıt Başarısız",
      });
    }
  };

  /* ========== YEDEK İÇE AKTAR ========== */
  const handleImportBackup = async ({
    transactions: importedTxns,
    customers: importedCusts,
  }) => {
    if (!user)
      return { success: false, error: "Kullanıcı oturumu bulunamadı." };
    try {
      let tCount = 0;
      let cCount = 0;

      // Carileri içe aktar
      if (Array.isArray(importedCusts)) {
        for (const cust of importedCusts) {
          const name = cust.name?.trim();
          if (name) {
            await addDoc(collection(db, "users", user.uid, "customers"), {
              name,
              phone: cust.phone || "",
              email: cust.email || "",
              note: cust.note || "",
              type: cust.type || "customer",
              color: cust.color || "#0f7bff",
              createdAt: serverTimestamp(),
            });
            cCount++;
          }
        }
      }

      // İşlemleri içe aktar
      if (Array.isArray(importedTxns)) {
        for (const txn of importedTxns) {
          await addDoc(collection(db, "users", user.uid, "transactions"), {
            type: txn.type || "sale",
            customer: txn.customer || "",
            amount: Number(txn.amount) || 0,
            date: txn.date || getToday(),
            dueDate: txn.dueDate || "",
            paymentMethod: txn.paymentMethod || "nakit",
            note: txn.note || "",
            description: txn.description || "",
            items: txn.items || [],
            createdAt: serverTimestamp(),
          });
          tCount++;
        }
      }

      return { success: true, tCount, cCount };
    } catch (err) {
      console.error("Yedek içe aktarma hatası:", err);
      return { success: false, error: err.message };
    }
  };
  /* ========== HESAP SİL ========== */
  const handleDeleteAccount = async (password) => {
    if (!user || !user.email) return false;

    try {
      /*
       * ÖNCE kullanıcının kimliğini yeniden doğrula.
       * Şifre yanlışsa veya doğrulama başarısızsa
       * hiçbir Firestore verisine dokunulmaz.
       */
      const credential = EmailAuthProvider.credential(user.email, password);

      await reauthenticateWithCredential(user, credential);

      /*
       * Yeniden doğrulama başarılı.
       * Artık verileri güvenli şekilde silebiliriz.
       */

      const transactionsSnapshot = await getDocs(
        collection(db, "users", user.uid, "transactions"),
      );

      for (const transactionDoc of transactionsSnapshot.docs) {
        await cancelDueNotification(transactionDoc.id);
        await deleteDoc(transactionDoc.ref);
      }

      const customersSnapshot = await getDocs(
        collection(db, "users", user.uid, "customers"),
      );

      for (const customerDoc of customersSnapshot.docs) {
        await deleteDoc(customerDoc.ref);
      }

      /*
       * Kullanıcı profil belgesini sil.
       */
      await deleteDoc(doc(db, "users", user.uid));

      /*
       * Firestore temizliği tamamlandıktan sonra
       * Firebase Authentication hesabını sil.
       */
      await deleteUser(user);

      setProfile(null);
      setCurrentPage("home");
      await showAlert("Hesabınız ve kayıtlı verileriniz başarıyla silindi.", {
        title: "Hesap Silindi",
      });

      return true;
    } catch (error) {
      console.error("Hesap silme hatası:", error);

      if (
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        await showAlert("Girdiğiniz şifre yanlış.", {
          title: "Şifre Hatalı",
        });
      } else if (error.code === "auth/too-many-requests") {
        await showAlert(
          "Çok fazla başarısız deneme yapıldı. Lütfen daha sonra tekrar deneyin.",
          {
            title: "Çok Fazla Deneme",
          },
        );
      } else if (error.code === "auth/requires-recent-login") {
        await showAlert(
          "Güvenlik nedeniyle yeniden giriş yapılması gerekiyor. Lütfen çıkış yapıp tekrar giriş yaptıktan sonra yeniden deneyin.",
          {
            title: "Yeniden Giriş Gerekli",
          },
        );
      } else {
        await showAlert(
          "Hesap silinirken bir hata oluştu. Lütfen tekrar deneyin.",
          {
            title: "Bir Hata Oluştu",
          },
        );
      }

      return false;
    }
  };

  /* ========== LOGOUT ========== */
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setProfile(null);
      setCurrentPage("home");
    } catch {
      /* ignore */
    }
  };

  /* ========== LOADING ========== */
  if (authLoading || profileLoading) {
    return (
      <div className="splash-screen">
        <div className="splash-logo">
          <img src="/logo.png" alt="İşletme Defteri" />
        </div>
        <h1 className="splash-title">İşletme Defteri</h1>
        <span className="splash-slogan">KOLAYCA TAKİP ET</span>
        <div className="splash-loader" />
      </div>
    );
  }

  if (!user) return <Auth />;

  if (!profile) {
    return (
      <div className="splash-screen">
        <span>İşletme Defteri</span>
        <strong>Profil yüklenemedi. Sayfayı yenileyin.</strong>
      </div>
    );
  }

  /* ========== RENDER ========== */
  const showNav = !["newTransaction", "quickPayment", "profile"].includes(
    currentPage,
  );
  if (isPasswordResetPage) {
    return <PasswordResetPage />;
  }

  return (
    <div className="app-layout">
      {/* ---- MASAÜSTÜ SOL SİDEBAR NAVİGASYONU ---- */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={navigate}
        profile={profile}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <div className="app">
        {/* ---- ANA SAYFA ---- */}
        {currentPage === "home" && (
          <HomePage
            profile={profile}
            transactions={transactions}
            onNavigate={navigate}
            onOpenQuickPayment={(type) => navigate("quickPayment", { type })}
          />
        )}

        {/* ---- CARİLER ---- */}
        {currentPage === "customers" && (
          <CustomersPage
            user={user}
            transactions={transactions}
            customerRecords={customerRecords}
            addCustomer={handleAddCustomer}
            deleteTransaction={deleteTransaction}
            onNavigate={navigate}
            onOpenNewTransaction={(params) =>
              navigate("newTransaction", params)
            }
          />
        )}

        {/* ---- İŞLEMLER ---- */}
        {currentPage === "transactions" && (
          <TransactionsPage
            transactions={transactions}
            deleteTransaction={deleteTransaction}
            onBack={() => navigate("home")}
          />
        )}

        {/* ---- YENİ İŞLEM ---- */}
        {currentPage === "newTransaction" && (
          <NewTransactionPage
            user={user}
            customers={customers}
            onBack={() => navigate(pageParams.returnTo || "home")}
            initialType={pageParams.type || "sale"}
            initialCustomer={pageParams.customer || ""}
          />
        )}

        {/* ---- HIZLI TAHSİLAT / ÖDEME ---- */}
        {currentPage === "quickPayment" && (
          <QuickPaymentPage
            user={user}
            customers={customers}
            initialType={pageParams.type || "collection"}
            onBack={() => navigate("home")}
          />
        )}

        {/* ---- RAPORLAR ---- */}
        {currentPage === "reports" && (
          <ReportsPage transactions={transactions} />
        )}

        {/* ---- MENÜ ---- */}
        {currentPage === "menu" && (
          <MenuPage
            profile={profile}
            user={user}
            transactions={transactions}
            customerRecords={customerRecords}
            customers={customers}
            theme={theme}
            toggleTheme={toggleTheme}
            onImportBackup={handleImportBackup}
            onNavigate={navigate}
            onLogout={handleLogout}
          />
        )}

        {/* ---- PROFİL ---- */}
        {currentPage === "profile" && (
          <Profile
            profile={profile}
            onSave={handleProfileSave}
            onBack={() => navigate("menu")}
            onLogout={handleLogout}
            onDeleteAccount={handleDeleteAccount}
          />
        )}

        {/* ---- MOBİL ALT NAVİGASYON (Sadece mobil/tablet) ---- */}
        {showNav && (
          <BottomNav currentPage={currentPage} onNavigate={navigate} />
        )}
      </div>
    </div>
  );
}

export default App;
