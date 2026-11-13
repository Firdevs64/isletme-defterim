import { useEffect, useState } from "react";
import { useAppDialog } from "../components/AppDialog";

function Profile({ profile, onSave, onBack, onLogout, onDeleteAccount }) {
  const { showAlert, showConfirm } = useAppDialog();
  const [form, setForm] = useState({
    fullName: profile?.fullName || "",
    businessName: profile?.businessName || "",
    phone: profile?.phone || "",
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    setForm({
      fullName: profile?.fullName || "",
      businessName: profile?.businessName || "",
      phone: profile?.phone || "",
    });
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.fullName.trim() || !form.businessName.trim()) {
      await showAlert("Ad soyad ve işletme adı alanlarını doldurun.", {
        title: "Eksik Bilgi",
      });
      return;
    }

    await onSave({
      fullName: form.fullName.trim(),
      businessName: form.businessName.trim(),
      phone: form.phone.trim(),
    });
  };

  const handleDelete = async () => {
    if (!deletePassword.trim()) {
      await showAlert("Hesabınızı silmek için şifrenizi girin.", {
        title: "Şifre Gerekli",
      });
      return;
    }

    const confirmed = await showConfirm(
      "Tüm cari ve işlem kayıtlarınız kalıcı olarak silinecektir. Bu işlem geri alınamaz.",
      {
        title: "Hesabınızı Silmek İstiyor musunuz?",
        confirmText: "Hesabı Sil",
        cancelText: "Vazgeç",
        danger: true,
      },
    );

    if (!confirmed) return;

    setDeletingAccount(true);

    try {
      const success = await onDeleteAccount(deletePassword);

      if (!success) {
        setDeletingAccount(false);
      }
    } catch {
      setDeletingAccount(false);
    }
  };

  const initials = getInitials(form.fullName);

  return (
    <main className="profile-page">
      <button type="button" className="profile-back-button" onClick={onBack}>
        ←
      </button>

      <div className="profile-intro">
        <div className="profile-large-avatar">{initials || "?"}</div>

        <p>Profilim</p>
        <h1>{profile?.fullName}</h1>
        <span>{profile?.businessName}</span>
      </div>

      <form className="profile-form" onSubmit={handleSubmit}>
        <label>
          Ad Soyad
          <input
            type="text"
            value={form.fullName}
            onChange={(e) =>
              setForm({
                ...form,
                fullName: e.target.value,
              })
            }
          />
        </label>

        <label>
          İşletme Adı
          <input
            type="text"
            value={form.businessName}
            onChange={(e) =>
              setForm({
                ...form,
                businessName: e.target.value,
              })
            }
          />
        </label>

        <label>
          Telefon
          <span className="optional-text">İsteğe bağlı</span>
          <input
            type="tel"
            placeholder="05xx xxx xx xx"
            value={form.phone}
            onChange={(e) =>
              setForm({
                ...form,
                phone: e.target.value,
              })
            }
          />
        </label>

        <button type="submit" className="profile-save-button">
          Bilgileri Kaydet
        </button>
      </form>

      <button
        type="button"
        className="profile-logout-button"
        onClick={onLogout}
      >
        Çıkış Yap
      </button>

      {!showDeleteConfirm ? (
        <button
          type="button"
          className="profile-delete-account-button"
          onClick={() => setShowDeleteConfirm(true)}
        >
          Hesabımı Sil
        </button>
      ) : (
        <div className="profile-delete-confirm">
          <p>
            Hesabınızı silmek için şifrenizi girin. Tüm cari ve işlem
            kayıtlarınız kalıcı olarak silinecektir.
          </p>

          <input
            type="password"
            placeholder="Şifreniz"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            autoComplete="current-password"
            disabled={deletingAccount}
          />

          <button
            type="button"
            className="profile-delete-account-button"
            onClick={handleDelete}
            disabled={deletingAccount}
          >
            {deletingAccount
              ? "Hesap Siliniyor..."
              : "Hesabı Kalıcı Olarak Sil"}
          </button>

          <button
            type="button"
            className="profile-logout-button"
            onClick={() => {
              setShowDeleteConfirm(false);
              setDeletePassword("");
            }}
            disabled={deletingAccount}
          >
            Vazgeç
          </button>
        </div>
      )}
    </main>
  );
}

function getInitials(name) {
  if (!name) return "";

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0][0]?.toLocaleUpperCase("tr-TR") || "";
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase("tr-TR");
}

export default Profile;
