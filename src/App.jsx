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

import Customers from "./pages/Customers";

import CalendarPicker from "./components/CalendarPicker";

import Profile from "./pages/Profile";

import Auth from "./components/Auth";

import { auth, db } from "./firebase";

function getToday() {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const today = getToday();

function App() {
  const [user, setUser] = useState(null);

  const [authLoading, setAuthLoading] = useState(true);

  const [profile, setProfile] = useState(null);

  const [profileLoading, setProfileLoading] = useState(true);

  /* =========================



     FIREBASE OTURUM



  ========================= */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,

      async (firebaseUser) => {
        setUser(firebaseUser);

        if (firebaseUser) {
          try {
            const profileRef = doc(
              db,

              "users",

              firebaseUser.uid,
            );

            const profileSnapshot = await getDoc(profileRef);

            if (profileSnapshot.exists()) {
              setProfile(profileSnapshot.data());
            } else {
              setProfile(null);
            }
          } catch (error) {
            console.error(
              "Profil yüklenirken hata:",

              error,
            );

            setProfile(null);
          }
        } else {
          setProfile(null);
        }

        setProfileLoading(false);

        setAuthLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  /* =========================



     PROFİL



  ========================= */

  const [currentPage, setCurrentPage] = useState("home");

  const [previousPage, setPreviousPage] = useState("home");

  /* =========================



     MENÜ



  ========================= */

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [activeForm, setActiveForm] = useState(null);

  /* =========================



     TAKVİM



  ========================= */

  const [selectedDate, setSelectedDate] = useState(today);

  const [viewMode, setViewMode] = useState("day");

  /* =========================

     İŞLEMLER

  ========================= */

  const [transactions, setTransactions] = useState([]);

  const [transactionsLoading, setTransactionsLoading] = useState(true);

  /* =========================



     FORMLAR



  ========================= */

  const [jobForm, setJobForm] = useState({
    customerMode: "existing",

    customer: "",

    newCustomer: "",

    title: "",

    calculationType: "fixed",

    quantity: "",

    unitPrice: "",

    amount: "",

    date: today,

    description: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    customer: "",

    amount: "",

    date: today,

    description: "",
  });

  const [expenseForm, setExpenseForm] = useState({
    title: "",

    amount: "",

    date: today,

    description: "",
  });

  /* =========================

     FIRESTORE İŞLEMLER

  ========================= */

  useEffect(() => {
    if (!user) {
      setTransactions([]);

      setTransactionsLoading(false);

      return;
    }

    setTransactionsLoading(true);

    const transactionsRef = collection(db, "users", user.uid, "transactions");

    const transactionsQuery = query(
      transactionsRef,
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      transactionsQuery,

      (snapshot) => {
        const firebaseTransactions = snapshot.docs.map((transactionDoc) => ({
          id: transactionDoc.id,

          ...transactionDoc.data(),
        }));

        setTransactions(firebaseTransactions);

        setTransactionsLoading(false);
      },

      (error) => {
        console.error("İşlemler yüklenirken hata:", error);

        setTransactions([]);

        setTransactionsLoading(false);
      },
    );

    return unsubscribe;
  }, [user]);

  /* =========================



     PARA FORMATLAMA



  ========================= */

  const formatMoney = (amount) => {
    return new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  };

  /* =========================



     MÜŞTERİLER



  ========================= */

  const customers = useMemo(() => {
    return [
      ...new Set(
        transactions

          .filter((item) => item.customer)

          .map((item) => item.customer),
      ),
    ];
  }, [transactions]);

  /* =========================



     SEÇİLEN TARİH



  ========================= */

  const selectedParts = useMemo(() => {
    const [year, month, day] = selectedDate

      .split("-")

      .map(Number);

    return {
      year,

      month,

      day,
    };
  }, [selectedDate]);

  /* =========================



     GÖRÜNEN İŞLEMLER



  ========================= */

  const visibleTransactions = useMemo(() => {
    return transactions.filter((item) => {
      if (!item.date) {
        return false;
      }

      const [year, month, day] = item.date

        .split("-")

        .map(Number);

      if (viewMode === "month") {
        return year === selectedParts.year && month === selectedParts.month;
      }

      return (
        year === selectedParts.year &&
        month === selectedParts.month &&
        day === selectedParts.day
      );
    });
  }, [transactions, selectedParts, viewMode]);

  /* =========================



     SEÇİLEN TARİHE KADAR



  ========================= */

  const transactionsUntilSelection = useMemo(() => {
    let endDate;

    if (viewMode === "month") {
      endDate = new Date(
        selectedParts.year,

        selectedParts.month,

        0,

        23,

        59,

        59,
      );
    } else {
      endDate = new Date(
        selectedParts.year,

        selectedParts.month - 1,

        selectedParts.day,

        23,

        59,

        59,
      );
    }

    return transactions.filter((item) => {
      if (!item.date) {
        return false;
      }

      const transactionDate = parseTransactionDate(item.date);

      return transactionDate <= endDate;
    });
  }, [transactions, selectedParts, viewMode]);

  /* =========================



     HESAPLAMALAR



  ========================= */

  const visiblePayments = visibleTransactions

    .filter((item) => item.type === "payment")

    .reduce((sum, item) => sum + Number(item.amount), 0);

  const visibleExpenses = visibleTransactions

    .filter((item) => item.type === "expense")

    .reduce((sum, item) => sum + Number(item.amount), 0);

  const jobsUntilSelection = transactionsUntilSelection

    .filter((item) => item.type === "job")

    .reduce((sum, item) => sum + Number(item.amount), 0);

  const paymentsUntilSelection = transactionsUntilSelection

    .filter((item) => item.type === "payment")

    .reduce((sum, item) => sum + Number(item.amount), 0);

  const expensesUntilSelection = transactionsUntilSelection

    .filter((item) => item.type === "expense")

    .reduce((sum, item) => sum + Number(item.amount), 0);

  const totalReceivable = jobsUntilSelection - paymentsUntilSelection;

  const cash = paymentsUntilSelection - expensesUntilSelection;

  /* =========================



     MENÜ FONKSİYONLARI



  ========================= */

  const closeMenu = () => {
    setIsMenuOpen(false);

    setActiveForm(null);
  };

  const openMenu = () => {
    setIsMenuOpen(true);

    setActiveForm(null);
  };

  /* =========================



     TAKVİM FONKSİYONLARI



  ========================= */

  const handleSelectDate = (date) => {
    setSelectedDate(date);

    setViewMode("day");
  };

  const handleSelectMonth = (year, monthIndex) => {
    const month = String(monthIndex + 1).padStart(2, "0");

    setSelectedDate(`${year}-${month}-01`);

    setViewMode("month");
  };

  /* =========================

     YENİ İŞ

  ========================= */

  const calculatedJobAmount = useMemo(() => {
    if (jobForm.calculationType === "fixed") {
      return Number(jobForm.amount) || 0;
    }

    const quantity = Number(jobForm.quantity) || 0;
    const unitPrice = Number(jobForm.unitPrice) || 0;

    return Math.round((quantity * unitPrice + Number.EPSILON) * 100) / 100;
  }, [
    jobForm.calculationType,
    jobForm.quantity,
    jobForm.unitPrice,
    jobForm.amount,
  ]);

  const handleJobSubmit = async (e) => {
    e.preventDefault();

    if (!user) return;

    const customerName =
      jobForm.customerMode === "existing"
        ? jobForm.customer
        : jobForm.newCustomer.trim();

    if (!customerName) {
      alert("Lütfen müşteri seçin veya yeni müşteri adı girin.");

      return;
    }

    if (!jobForm.title.trim()) {
      alert("Yapılan iş alanını doldurun.");
      return;
    }

    if (
      jobForm.calculationType !== "fixed" &&
      (!jobForm.quantity || !jobForm.unitPrice)
    ) {
      alert("Miktar ve birim fiyat alanlarını doldurun.");
      return;
    }

    if (jobForm.calculationType === "fixed" && !jobForm.amount) {
      alert("Tutar alanını doldurun.");
      return;
    }

    const amount = calculatedJobAmount;

    if (amount <= 0) {
      alert("Geçerli bir tutar girin.");
      return;
    }

    const existingCustomer = customers.find(
      (customer) =>
        customer.toLocaleLowerCase("tr-TR") ===
        customerName.toLocaleLowerCase("tr-TR"),
    );

    const finalCustomerName = existingCustomer || customerName;

    try {
      await addDoc(collection(db, "users", user.uid, "transactions"), {
        type: "job",

        customer: finalCustomerName,

        title: jobForm.title.trim(),

        calculationType: jobForm.calculationType,

        unitType:
          jobForm.calculationType === "quantity"
            ? "adet"
            : jobForm.calculationType === "squareMeter"
              ? "m2"
              : "fixed",

        quantity:
          jobForm.calculationType === "fixed" ? null : Number(jobForm.quantity),

        unitPrice:
          jobForm.calculationType === "fixed"
            ? null
            : Number(jobForm.unitPrice),

        amount,

        date: jobForm.date,

        description: jobForm.description.trim(),

        createdAt: serverTimestamp(),
      });

      setJobForm({
        customerMode: "existing",
        customer: "",
        newCustomer: "",
        title: "",
        calculationType: "fixed",
        quantity: "",
        unitPrice: "",
        amount: "",
        date: today,
        description: "",
      });

      closeMenu();
    } catch (error) {
      console.error("İş kaydedilirken hata:", error);

      alert("İş kaydedilemedi.");
    }
  };

  /* =========================

     TAHSİLAT

  ========================= */

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    if (!user) return;

    if (!paymentForm.customer || !paymentForm.amount) {
      alert("Müşteri ve tutar alanlarını doldurun.");

      return;
    }

    const amount = Number(paymentForm.amount);

    if (amount <= 0) {
      alert("Geçerli bir tutar girin.");

      return;
    }

    try {
      await addDoc(collection(db, "users", user.uid, "transactions"), {
        type: "payment",
        customer: paymentForm.customer,
        title: "Tahsilat",
        amount,

        date: paymentForm.date,
        description: paymentForm.description.trim(),

        createdAt: serverTimestamp(),
      });

      setPaymentForm({
        customer: "",
        amount: "",
        date: today,
        description: "",
      });

      closeMenu();
    } catch (error) {
      console.error("Tahsilat kaydedilirken hata:", error);

      alert("Tahsilat kaydedilemedi.");
    }
  };

  /* =========================

     GİDER

  ========================= */

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();

    if (!user) return;

    if (!expenseForm.title.trim() || !expenseForm.amount) {
      alert("Gider adı ve tutar alanlarını doldurun.");

      return;
    }

    const amount = Number(expenseForm.amount);

    if (amount <= 0) {
      alert("Geçerli bir tutar girin.");

      return;
    }

    try {
      await addDoc(collection(db, "users", user.uid, "transactions"), {
        type: "expense",
        customer: "",
        title: expenseForm.title.trim(),
        amount,

        date: expenseForm.date,
        description: expenseForm.description.trim(),

        createdAt: serverTimestamp(),
      });

      setExpenseForm({ title: "", amount: "", date: today, description: "" });

      closeMenu();
    } catch (error) {
      console.error("Gider kaydedilirken hata:", error);

      alert("Gider kaydedilemedi.");
    }
  };

  /* =========================

     İŞLEM SİL

  ========================= */

  const deleteTransaction = async (id) => {
    const confirmed = window.confirm(
      "Bu işlemi silmek istediğinize emin misiniz?",
    );

    if (!confirmed || !user) return;

    try {
      await deleteDoc(doc(db, "users", user.uid, "transactions", id));
    } catch (error) {
      console.error("İşlem silinirken hata:", error);

      alert("İşlem silinemedi.");
    }
  };

  /* =========================



     PROFİL



  ========================= */

  const handleProfileSave = async (newProfile) => {
    if (!user) return;

    try {
      const profileRef = doc(
        db,

        "users",

        user.uid,
      );

      await updateDoc(profileRef, {
        fullName: newProfile.fullName,

        businessName: newProfile.businessName,

        phone: newProfile.phone,
      });

      await updateProfile(user, {
        displayName: newProfile.fullName,
      });

      setProfile((previous) => ({
        ...previous,

        ...newProfile,
      }));

      setCurrentPage("home");
    } catch (error) {
      console.error(
        "Profil güncellenirken hata:",

        error,
      );

      alert("Profil kaydedilemedi.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);

      setProfile(null);

      setCurrentPage("home");
    } catch (error) {
      console.error(
        "Çıkış yapılırken hata:",

        error,
      );
    }
  };

  const openProfile = () => {
    setPreviousPage(currentPage);

    setCurrentPage("profile");
  };

  const closeProfile = () => {
    setCurrentPage(previousPage);
  };

  /*



   \\* Kullanıcı henüz profil oluşturmadıysa



   \\* uygulama ilk kurulum ekranını gösterir.



   */

  if (authLoading) {
    return (
      <div className="app-loading">
        <span>İşletme Defterim</span>

        <strong>Yükleniyor...</strong>
      </div>
    );
  }

  if (authLoading || profileLoading || (user && transactionsLoading)) {
    return (
      <div className="app-loading">
        <span>İşletme Defterim</span>

        <strong>Yükleniyor...</strong>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (!profile) {
    return (
      <div className="app-loading">
        <span>İşletme Defterim</span>

        <strong>Profil yüklenemedi.</strong>
      </div>
    );
  }

  return (
    <div className="app">
      {/* =========================



          ANA SAYFA



      ========================= */}

      {currentPage === "home" && (
        <>
          <header className="header">
            <div>
              <p className="welcome">
                Hoş geldin, {getFirstName(profile.fullName)} 👋
              </p>

              <h1>{profile.businessName}</h1>
            </div>

            <button
              type="button"
              className="profile-button"
              onClick={openProfile}
            >
              {getInitials(profile.fullName)}
            </button>
          </header>

          <main>
            <CalendarPicker
              selectedDate={selectedDate}
              viewMode={viewMode}
              onSelectDate={handleSelectDate}
              onSelectMonth={handleSelectMonth}
            />

            <section className="summary-grid">
              <div className="summary-card">
                <span>Toplam Alacak</span>

                <strong>{formatMoney(totalReceivable)} ₺</strong>
              </div>

              <div className="summary-card">
                <span>
                  {viewMode === "month" ? "Bu Ay Tahsilat" : "Bugünkü Tahsilat"}
                </span>

                <strong className="income">
                  {formatMoney(visiblePayments)} ₺
                </strong>
              </div>

              <div className="summary-card">
                <span>
                  {viewMode === "month" ? "Bu Ay Gider" : "Bugünkü Gider"}
                </span>

                <strong className="expense">
                  {formatMoney(visibleExpenses)} ₺
                </strong>
              </div>

              <div className="summary-card">
                <span>Kasa</span>

                <strong>{formatMoney(cash)} ₺</strong>
              </div>
            </section>

            <section className="section-title">
              <h2>
                {viewMode === "month" ? "Ayın İşlemleri" : "Günün İşlemleri"}
              </h2>

              <button
                type="button"
                onClick={() => setCurrentPage("transactions")}
              >
                Tümünü Gör
              </button>
            </section>

            {visibleTransactions.length === 0 ? (
              <div className="empty-customers">
                {viewMode === "month"
                  ? "Bu ay için işlem bulunmuyor."
                  : "Bu gün için işlem bulunmuyor."}
              </div>
            ) : (
              <section className="transactions">
                {visibleTransactions

                  .slice(0, 5)

                  .map((item) => (
                    <TransactionRow
                      key={item.id}
                      item={item}
                      formatMoney={formatMoney}
                    />
                  ))}
              </section>
            )}
          </main>
        </>
      )}

      {/* =========================



          MÜŞTERİLER



      ========================= */}

      {currentPage === "customers" && (
        <main>
          <Customers
            transactions={transactions}
            formatMoney={formatMoney}
            deleteTransaction={deleteTransaction}
          />
        </main>
      )}

      {/* =========================



          İŞLEMLER



      ========================= */}

      {currentPage === "transactions" && (
        <main className="customers-page">
          <div className="customers-header">
            <div>
              <p>Tüm hareketler</p>

              <h1>İşlemler</h1>
            </div>

            <div className="customer-count">{transactions.length}</div>
          </div>

          {transactions.length === 0 ? (
            <div className="empty-customers">Henüz işlem bulunmuyor.</div>
          ) : (
            <section className="transactions">
              {transactions.map((item) => (
                <TransactionRow
                  key={item.id}
                  item={item}
                  formatMoney={formatMoney}
                  showDelete
                  onDelete={deleteTransaction}
                />
              ))}
            </section>
          )}
        </main>
      )}

      {/* =========================



          PROFİL



      ========================= */}

      {currentPage === "profile" && (
        <Profile
          profile={profile}
          onSave={handleProfileSave}
          onBack={closeProfile}
          onLogout={handleLogout}
        />
      )}

      {/* =========================



          AYARLAR



      ========================= */}

      {currentPage === "settings" && (
        <main className="customers-page">
          <div className="customers-header">
            <div>
              <p>Uygulama tercihleri</p>

              <h1>Ayarlar</h1>
            </div>
          </div>

          <div
            className="customer-card"
            onClick={openProfile}
            style={{ cursor: "pointer" }}
          >
            <div className="customer-top">
              <div className="customer-avatar">
                {getInitials(profile.fullName)}
              </div>

              <div className="customer-name">
                <strong>{profile.fullName}</strong>

                <span>{profile.businessName}</span>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* =========================



          YENİ İŞLEM MENÜSÜ



      ========================= */}

      {isMenuOpen && (
        <div className="overlay" onClick={closeMenu}>
          <div className="action-menu" onClick={(e) => e.stopPropagation()}>
            {activeForm === null && (
              <>
                <div className="action-header">
                  <div>
                    <h2>Yeni İşlem</h2>

                    <p>Eklemek istediğiniz işlem türünü seçin</p>
                  </div>

                  <button type="button" onClick={closeMenu}>
                    ×
                  </button>
                </div>

                <button
                  type="button"
                  className="action-item"
                  onClick={() => setActiveForm("job")}
                >
                  <div className="action-icon job">🧾</div>

                  <div>
                    <strong>Yeni İş</strong>

                    <span>Müşteriye yapılan işi kaydet</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="action-item"
                  onClick={() => setActiveForm("payment")}
                >
                  <div className="action-icon payment">₺</div>

                  <div>
                    <strong>Tahsilat</strong>

                    <span>Müşteriden alınan ödemeyi kaydet</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="action-item"
                  onClick={() => setActiveForm("expense")}
                >
                  <div className="action-icon expense-icon">↓</div>

                  <div>
                    <strong>Gider</strong>

                    <span>İşletme gideri ekle</span>
                  </div>
                </button>
              </>
            )}

            {/* YENİ İŞ FORMU */}

            {activeForm === "job" && (
              <>
                <FormHeader
                  title="Yeni İş Ekle"
                  description="Müşteriye yapılan işi kaydedin"
                  goBack={() => setActiveForm(null)}
                />

                <form className="job-form" onSubmit={handleJobSubmit}>
                  <label>
                    Müşteri Türü
                    <select
                      value={jobForm.customerMode}
                      onChange={(e) =>
                        setJobForm({
                          ...jobForm,

                          customerMode: e.target.value,

                          customer: "",

                          newCustomer: "",
                        })
                      }
                    >
                      <option value="existing">Mevcut Müşteri</option>

                      <option value="new">Yeni Müşteri</option>
                    </select>
                  </label>

                  {jobForm.customerMode === "existing" ? (
                    <label>
                      Müşteri
                      <select
                        value={jobForm.customer}
                        onChange={(e) =>
                          setJobForm({
                            ...jobForm,

                            customer: e.target.value,
                          })
                        }
                      >
                        <option value="">Müşteri seçin</option>

                        {customers.map((customer) => (
                          <option key={customer} value={customer}>
                            {customer}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label>
                      Yeni Müşteri Adı
                      <input
                        type="text"
                        placeholder="Örn. Karataş İnşaat"
                        value={jobForm.newCustomer}
                        onChange={(e) =>
                          setJobForm({
                            ...jobForm,

                            newCustomer: e.target.value,
                          })
                        }
                      />
                    </label>
                  )}

                  <label>
                    Yapılan İş
                    <input
                      type="text"
                      placeholder="Örn. Işıklı tabela"
                      value={jobForm.title}
                      onChange={(e) =>
                        setJobForm({
                          ...jobForm,

                          title: e.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Hesaplama Şekli
                    <select
                      value={jobForm.calculationType}
                      onChange={(e) =>
                        setJobForm({
                          ...jobForm,
                          calculationType: e.target.value,
                          quantity: "",
                          unitPrice: "",
                          amount: "",
                        })
                      }
                    >
                      <option value="fixed">Sabit Tutar</option>
                      <option value="quantity">Adet × Birim Fiyat</option>
                      <option value="squareMeter">m² × Birim Fiyat</option>
                    </select>
                  </label>

                  {jobForm.calculationType === "fixed" ? (
                    <MoneyInput
                      value={jobForm.amount}
                      setValue={(value) =>
                        setJobForm({
                          ...jobForm,
                          amount: value,
                        })
                      }
                    />
                  ) : (
                    <>
                      <label>
                        {jobForm.calculationType === "quantity"
                          ? "Adet"
                          : "Metrekare (m²)"}

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder={
                            jobForm.calculationType === "quantity"
                              ? "Örn. 10"
                              : "Örn. 12.5"
                          }
                          value={jobForm.quantity}
                          onChange={(e) =>
                            setJobForm({
                              ...jobForm,
                              quantity: e.target.value,
                            })
                          }
                        />
                      </label>

                      <MoneyInput
                        label="Birim Fiyat"
                        value={jobForm.unitPrice}
                        setValue={(value) =>
                          setJobForm({
                            ...jobForm,
                            unitPrice: value,
                          })
                        }
                      />

                      <div className="job-total-preview">
                        <span>Toplam Tutar</span>
                        <strong>{formatMoney(calculatedJobAmount)} ₺</strong>
                      </div>
                    </>
                  )}

                  <DateInput
                    value={jobForm.date}
                    setValue={(value) =>
                      setJobForm({
                        ...jobForm,

                        date: value,
                      })
                    }
                  />

                  <Description
                    value={jobForm.description}
                    setValue={(value) =>
                      setJobForm({
                        ...jobForm,

                        description: value,
                      })
                    }
                  />

                  <button className="save-button" type="submit">
                    İşi Kaydet
                  </button>
                </form>
              </>
            )}

            {/* TAHSİLAT FORMU */}

            {activeForm === "payment" && (
              <>
                <FormHeader
                  title="Tahsilat Ekle"
                  description="Müşteriden alınan ödemeyi kaydedin"
                  goBack={() => setActiveForm(null)}
                />

                <form className="job-form" onSubmit={handlePaymentSubmit}>
                  <label>
                    Müşteri
                    <select
                      value={paymentForm.customer}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,

                          customer: e.target.value,
                        })
                      }
                    >
                      <option value="">Müşteri seçin</option>

                      {customers.map((customer) => (
                        <option key={customer} value={customer}>
                          {customer}
                        </option>
                      ))}
                    </select>
                  </label>

                  <MoneyInput
                    value={paymentForm.amount}
                    setValue={(value) =>
                      setPaymentForm({
                        ...paymentForm,

                        amount: value,
                      })
                    }
                  />

                  <DateInput
                    value={paymentForm.date}
                    setValue={(value) =>
                      setPaymentForm({
                        ...paymentForm,

                        date: value,
                      })
                    }
                  />

                  <Description
                    value={paymentForm.description}
                    setValue={(value) =>
                      setPaymentForm({
                        ...paymentForm,

                        description: value,
                      })
                    }
                  />

                  <button className="save-button" type="submit">
                    Tahsilatı Kaydet
                  </button>
                </form>
              </>
            )}

            {/* GİDER FORMU */}

            {activeForm === "expense" && (
              <>
                <FormHeader
                  title="Gider Ekle"
                  description="İşletme giderini kaydedin"
                  goBack={() => setActiveForm(null)}
                />

                <form className="job-form" onSubmit={handleExpenseSubmit}>
                  <label>
                    Gider
                    <input
                      type="text"
                      placeholder="Örn. Folyo alımı"
                      value={expenseForm.title}
                      onChange={(e) =>
                        setExpenseForm({
                          ...expenseForm,

                          title: e.target.value,
                        })
                      }
                    />
                  </label>

                  <MoneyInput
                    value={expenseForm.amount}
                    setValue={(value) =>
                      setExpenseForm({
                        ...expenseForm,

                        amount: value,
                      })
                    }
                  />

                  <DateInput
                    value={expenseForm.date}
                    setValue={(value) =>
                      setExpenseForm({
                        ...expenseForm,

                        date: value,
                      })
                    }
                  />

                  <Description
                    value={expenseForm.description}
                    setValue={(value) =>
                      setExpenseForm({
                        ...expenseForm,

                        description: value,
                      })
                    }
                  />

                  <button className="save-button" type="submit">
                    Gideri Kaydet
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* =========================



          + BUTONU



      ========================= */}

      {!activeForm && currentPage !== "profile" && (
        <button
          type="button"
          className={`add-button ${isMenuOpen ? "open" : ""}`}
          onClick={() => {
            if (isMenuOpen) {
              closeMenu();
            } else {
              openMenu();
            }
          }}
        >
          {isMenuOpen ? "×" : "+"}
        </button>
      )}

      {/* =========================



          ALT MENÜ



      ========================= */}

      {currentPage !== "profile" && (
        <nav className="bottom-nav">
          <button
            type="button"
            className={currentPage === "home" ? "active" : ""}
            onClick={() => setCurrentPage("home")}
          >
            <span>⌂</span>
            Ana Sayfa
          </button>

          <button
            type="button"
            className={currentPage === "customers" ? "active" : ""}
            onClick={() => setCurrentPage("customers")}
          >
            <span>♙</span>
            Müşteriler
          </button>

          <button
            type="button"
            className={currentPage === "transactions" ? "active" : ""}
            onClick={() => setCurrentPage("transactions")}
          >
            <span>▤</span>
            İşlemler
          </button>

          <button
            type="button"
            className={currentPage === "settings" ? "active" : ""}
            onClick={() => setCurrentPage("settings")}
          >
            <span>⚙</span>
            Ayarlar
          </button>
        </nav>
      )}
    </div>
  );
}

/* =========================



   İŞLEM SATIRI



\\========================= */

function TransactionRow({
  item,

  formatMoney,

  showDelete = false,

  onDelete,
}) {
  return (
    <div className="transaction">
      <div className="transaction-icon">
        {item.type === "job" && "🧾"}

        {item.type === "payment" && "💰"}

        {item.type === "expense" && "📦"}
      </div>

      <div className="transaction-info">
        <strong>{item.customer || item.title}</strong>

        <span>{item.customer ? item.title : "İşletme gideri"}</span>
      </div>

      <strong className={item.type === "expense" ? "expense" : "income"}>
        {item.type === "expense" ? "-" : "+"}
        {formatMoney(item.amount)} ₺
      </strong>

      {showDelete && (
        <button
          type="button"
          className="delete-transaction-button"
          onClick={() => onDelete(item.id)}
        >
          ×
        </button>
      )}
    </div>
  );
}

/* =========================



   FORM BAŞLIĞI



\\========================= */

function FormHeader({
  title,

  description,

  goBack,
}) {
  return (
    <div className="action-header">
      <div>
        <h2>{title}</h2>

        <p>{description}</p>
      </div>

      <button type="button" onClick={goBack}>
        ←
      </button>
    </div>
  );
}

/* =========================



   PARA INPUT



\\========================= */

function MoneyInput({ value, setValue, label = "Tutar" }) {
  return (
    <label>
      {label}

      <div className="money-input">
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />

        <span>₺</span>
      </div>
    </label>
  );
}

/* =========================



   TARİH INPUT



\\========================= */

function DateInput({
  value,

  setValue,
}) {
  return (
    <label>
      Tarih
      <input
        type="date"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </label>
  );
}

/* =========================



   AÇIKLAMA



\\========================= */

function Description({
  value,

  setValue,
}) {
  return (
    <label>
      Açıklama
      <textarea
        rows="3"
        placeholder="İsterseniz bir not ekleyebilirsiniz..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </label>
  );
}

/* =========================



   TARİH YARDIMCISI



\\========================= */

function parseTransactionDate(dateString) {
  const [year, month, day] = dateString

    .split("-")

    .map(Number);

  return new Date(
    year,

    month - 1,

    day,
  );
}

/* =========================



   PROFİL YARDIMCILARI



\\========================= */

function getInitials(name) {
  if (!name) {
    return "?";
  }

  const parts = name

    .trim()

    .split(/\s+/)

    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0][0].toLocaleUpperCase("tr-TR");
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase("tr-TR");
}

function getFirstName(name) {
  if (!name) {
    return "";
  }
  return name.trim().split(/\s+/)[0];
}
export default App;
