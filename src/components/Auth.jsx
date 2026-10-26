import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

function Auth() {
  const [mode, setMode] = useState("login");

  const [form, setForm] = useState({
    fullName: "",
    businessName: "",
    email: "",
    password: "",
    passwordAgain: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });

    setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.email.trim() || !form.password) {
      setError("E-posta ve şifre alanlarını doldurun.");
      return;
    }

    try {
      setLoading(true);

      await signInWithEmailAndPassword(
        auth,
        form.email.trim(),
        form.password
      );
    } catch (error) {
      console.error(error);

      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        setError("E-posta veya şifre hatalı.");
      } else if (error.code === "auth/invalid-email") {
        setError("Geçerli bir e-posta adresi girin.");
      } else {
        setError("Giriş yapılırken bir hata oluştu.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !form.fullName.trim() ||
      !form.businessName.trim() ||
      !form.email.trim() ||
      !form.password ||
      !form.passwordAgain
    ) {
      setError("Lütfen tüm alanları doldurun.");
      return;
    }

    if (form.password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    if (form.password !== form.passwordAgain) {
      setError("Şifreler birbiriyle eşleşmiyor.");
      return;
    }

    try {
      setLoading(true);

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          form.email.trim(),
          form.password
        );

      const user = userCredential.user;

      await updateProfile(user, {
        displayName: form.fullName.trim(),
      });

      await setDoc(doc(db, "users", user.uid), {
        fullName: form.fullName.trim(),
        businessName: form.businessName.trim(),
        email: form.email.trim().toLowerCase(),
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(error);

      if (error.code === "auth/email-already-in-use") {
        setError("Bu e-posta adresi zaten kullanılıyor.");
      } else if (error.code === "auth/invalid-email") {
        setError("Geçerli bir e-posta adresi girin.");
      } else if (error.code === "auth/weak-password") {
        setError("Daha güçlü bir şifre belirleyin.");
      } else {
        setError("Hesap oluşturulurken bir hata oluştu.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/logo.png" alt="İşletme Defterim" />
        </div>

        <div className="auth-heading">
          <p>İşletme Defterim</p>

          <h1>
            {mode === "login"
              ? "Tekrar hoş geldiniz"
              : "Hesabınızı oluşturun"}
          </h1>

          <span>
            {mode === "login"
              ? "Defterinize erişmek için giriş yapın."
              : "İşletme defterinizi oluşturarak başlayın."}
          </span>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Giriş Yap
          </button>

          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            Kayıt Ol
          </button>
        </div>

        <form
          className="auth-form"
          onSubmit={
            mode === "login"
              ? handleLogin
              : handleRegister
          }
        >
          {mode === "register" && (
            <>
              <label>
                Ad Soyad
                <input
                  type="text"
                  name="fullName"
                  placeholder="Adınız Soyadınız"
                  value={form.fullName}
                  onChange={handleChange}
                />
              </label>

              <label>
                İşletme Adı
                <input
                  type="text"
                  name="businessName"
                  placeholder="Örn. Yılmaz Ticaret"
                  value={form.businessName}
                  onChange={handleChange}
                />
              </label>
            </>
          )}

          <label>
            E-posta
            <input
              type="email"
              name="email"
              placeholder="ornek@email.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </label>

          <label>
            Şifre
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              autoComplete={
                mode === "login"
                  ? "current-password"
                  : "new-password"
              }
            />
          </label>

          {mode === "register" && (
            <label>
              Şifre Tekrar
              <input
                type="password"
                name="passwordAgain"
                placeholder="••••••••"
                value={form.passwordAgain}
                onChange={handleChange}
                autoComplete="new-password"
              />
            </label>
          )}

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "Lütfen bekleyin..."
              : mode === "login"
                ? "Giriş Yap"
                : "Hesap Oluştur"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Auth;