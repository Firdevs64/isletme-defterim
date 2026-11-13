import { useEffect, useState } from "react";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "../firebase";

function PasswordResetPage() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordAgain, setNewPasswordAgain] = useState("");

  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const oobCode = params.get("oobCode");

  useEffect(() => {
    const checkCode = async () => {
      if (mode !== "resetPassword" || !oobCode) {
        setError("Şifre sıfırlama bağlantısı geçersiz.");
        setChecking(false);
        return;
      }

      try {
        const accountEmail = await verifyPasswordResetCode(auth, oobCode);

        setEmail(accountEmail);
      } catch (error) {
        console.error("Şifre sıfırlama bağlantısı hatası:", error);

        setError("Bu şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.");
      } finally {
        setChecking(false);
      }
    };

    checkCode();
  }, [mode, oobCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Yeni şifreniz en az 6 karakter olmalıdır.");
      return;
    }

    if (newPassword !== newPasswordAgain) {
      setError("Girdiğiniz şifreler birbiriyle eşleşmiyor.");
      return;
    }

    try {
      setSaving(true);

      await confirmPasswordReset(auth, oobCode, newPassword);

      setSuccess(true);
      setNewPassword("");
      setNewPasswordAgain("");
    } catch (error) {
      console.error("Şifre değiştirme hatası:", error);

      if (error.code === "auth/weak-password") {
        setError("Lütfen daha güçlü bir şifre belirleyin.");
      } else if (
        error.code === "auth/expired-action-code" ||
        error.code === "auth/invalid-action-code"
      ) {
        setError("Bu şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.");
      } else {
        setError("Şifreniz değiştirilemedi. Lütfen tekrar deneyin.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="password-reset-page">
        <div className="password-reset-card">
          <img
            src="/logo.png"
            alt="İşletme Defteri"
            className="password-reset-logo"
          />

          <p className="password-reset-brand">İşletme Defteri</p>

          <h1>Bağlantı kontrol ediliyor...</h1>

          <p className="password-reset-description">
            Lütfen kısa bir süre bekleyin.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="password-reset-page">
        <div className="password-reset-card">
          <img
            src="/logo.png"
            alt="İşletme Defteri"
            className="password-reset-logo"
          />

          <p className="password-reset-brand">İşletme Defteri</p>

          <div className="password-reset-success-icon">✓</div>

          <h1>Şifreniz Güncellendi</h1>

          <p className="password-reset-description">
            Yeni şifreniz başarıyla kaydedildi. Artık İşletme Defteri'ne yeni
            şifrenizle giriş yapabilirsiniz.
          </p>

          <button
            type="button"
            className="password-reset-button"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Giriş Sayfasına Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="password-reset-page">
      <div className="password-reset-card">
        <img
          src="/logo.png"
          alt="İşletme Defteri"
          className="password-reset-logo"
        />

        <p className="password-reset-brand">İşletme Defteri</p>

        <h1>Yeni Şifrenizi Belirleyin</h1>

        <p className="password-reset-description">
          Hesabınız için yeni bir şifre oluşturun.
        </p>

        {email && <div className="password-reset-email">{email}</div>}

        {error && <div className="password-reset-error">{error}</div>}

        {oobCode && !error && (
          <form className="password-reset-form" onSubmit={handleSubmit}>
            <label>
              Yeni Şifre
              <input
                type="password"
                placeholder="En az 6 karakter"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </label>

            <label>
              Yeni Şifre Tekrar
              <input
                type="password"
                placeholder="Şifrenizi tekrar girin"
                value={newPasswordAgain}
                onChange={(e) => setNewPasswordAgain(e.target.value)}
                autoComplete="new-password"
              />
            </label>

            <button
              type="submit"
              className="password-reset-button"
              disabled={saving}
            >
              {saving ? "Şifre Güncelleniyor..." : "Şifremi Güncelle"}
            </button>
          </form>
        )}

        {error && (
          <button
            type="button"
            className="password-reset-secondary-button"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Giriş Sayfasına Dön
          </button>
        )}
      </div>
    </div>
  );
}

export default PasswordResetPage;
