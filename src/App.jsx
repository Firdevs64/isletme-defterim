/* ============================================================
   App.jsx — İşletme Defterim
   Firebase Auth + Firestore entegrasyonu
   Mevcut veriler (job/payment/expense) backward-compatible korundu
============================================================ */
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, updateProfile } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import "./App.css";
import { auth, db } from "./firebase";
import { checkAndTriggerDueReminders } from "./utils/notificationService";
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
import Profile from "./pages/Profile";
import Auth from "./components/Auth";
import BottomNav from "./components/BottomNav";

function App() {
  /* ---- Auth State ---- */
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  /* ---- Sayfa yönetimi ---- */
  const [currentPage, setCurrentPage] = useState("home");
  const [pageParams, setPageParams] = useState({});

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

  /* ========== FIREBASE AUTH ========== */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const profileRef = doc(db, "users", firebaseUser.uid);
          const snap = await getDoc(profileRef);
          setProfile(snap.exists() ? snap.data() : null);
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setProfileLoading(false);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  /* ========== TRANSACTIONS LISTENER ========== */
  useEffect(() => {
    if (!user) { setTransactions([]); setTransactionsLoading(false); return; }
    setTransactionsLoading(true);
    const q = query(
      collection(db, "users", user.uid, "transactions"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setTransactionsLoading(false);
      },
      () => { setTransactions([]); setTransactionsLoading(false); }
    );
    return unsub;
  }, [user]);
   /* ========== DUE REMINDER CHECK ========== */
   useEffect(() => {
     // Trigger due reminder check when transactions change
     checkAndTriggerDueReminders(transactions);
   }, [transactions]);


  /* ========== CUSTOMERS LISTENER ========== */
  useEffect(() => {
    if (!user) { setCustomerRecords([]); return; }
    const q = query(
      collection(db, "users", user.uid, "customers"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => setCustomerRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setCustomerRecords([])
    );
    return unsub;
  }, [user]);

  /* ========== CARİ LİSTESİ (dropdown için) ========== */
  const customers = useMemo(() => {
    const savedNames = customerRecords.map((c) => c.name).filter(Boolean);
    const oldNames = transactions.filter((t) => t.customer).map((t) => t.customer);
    return [...new Set([...savedNames, ...oldNames])];
  }, [customerRecords, transactions]);

  /* ========== YENİ CARİ KAYDET ========== */
  const handleAddCustomer = async (data) => {
    if (!user) return false;
    const name = data.name?.trim();
    if (!name) { alert("Ad Soyad / Firma Adı alanını doldurun."); return false; }
    const exists = customers.some(
      (c) => c.toLocaleLowerCase("tr-TR") === name.toLocaleLowerCase("tr-TR")
    );
    if (exists) { alert("Bu cari zaten kayıtlı."); return false; }
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
      alert("Cari kaydedilemedi."); return false;
    }
  };

  /* ========== İŞLEM SİL ========== */
  const deleteTransaction = async (id) => {
    if (!window.confirm("Bu işlemi silmek istediğinize emin misiniz?")) return;
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "transactions", id));
    } catch {
      alert("İşlem silinemedi.");
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
      alert("Profil kaydedilemedi.");
    }
  };

  /* ========== YEDEK İÇE AKTAR ========== */
  const handleImportBackup = async ({ transactions: importedTxns, customers: importedCusts }) => {
    if (!user) return { success: false, error: "Kullanıcı oturumu bulunamadı." };
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

  /* ========== NAVİGASYON ========== */
  const navigate = (page, params = {}) => {
    setCurrentPage(page);
    setPageParams(params);
  };

  /* ========== LOADING ========== */
  if (authLoading || profileLoading) {
    return (
      <div className="splash-screen">
        <div className="splash-logo">
          <img src="/logo.png" alt="İşletme Defterim" />
        </div>
        <h1 className="splash-title">İşletme Defterim</h1>
        <span className="splash-slogan">KOLAYCA TAKİP ET</span>
        <div className="splash-loader" />
      </div>
    );
  }

  if (!user) return <Auth />;

  if (!profile) {
    return (
      <div className="splash-screen">
        <span>İşletme Defterim</span>
        <strong>Profil yüklenemedi. Sayfayı yenileyin.</strong>
      </div>
    );
  }

  /* ========== RENDER ========== */
  const showNav = !["newTransaction", "quickPayment", "profile"].includes(currentPage);

  return (
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
          onOpenNewTransaction={(params) => navigate("newTransaction", params)}
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
        />
      )}

      {/* ---- ALT NAVİGASYON ---- */}
      {showNav && (
        <BottomNav currentPage={currentPage} onNavigate={navigate} />
      )}
    </div>
  );
}

export default App;
