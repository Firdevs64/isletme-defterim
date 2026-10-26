import { useEffect, useState } from "react";

function Profile({
  profile,
  onSave,
  onBack,
  onLogout,
}) {
  const [form, setForm] = useState({
    fullName: profile?.fullName || "",
    businessName: profile?.businessName || "",
    phone: profile?.phone || "",
  });

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
      alert("Ad soyad ve işletme adı alanlarını doldurun.");
      return;
    }

    await onSave({
      fullName: form.fullName.trim(),
      businessName: form.businessName.trim(),
      phone: form.phone.trim(),
    });
  };

  const initials = getInitials(form.fullName);

  return (
    <main className="profile-page">
      <button
        type="button"
        className="profile-back-button"
        onClick={onBack}
      >
        ←
      </button>

      <div className="profile-intro">
        <div className="profile-large-avatar">
          {initials || "?"}
        </div>

        <p>Profilim</p>
        <h1>{profile?.fullName}</h1>
        <span>{profile?.businessName}</span>
      </div>

      <form className="profile-form" onSubmit={handleSubmit}>
        <label>
          Ad Soyad
          <input
            type="text"
            placeholder="Adınız Soyadınız"
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
            placeholder="Örn. Yılmaz Ticaret"
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
          <span className="optional-text">
            İsteğe bağlı
          </span>

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

        <button
          type="submit"
          className="profile-save-button"
        >
          Bilgileri Kaydet
        </button>
      </form>

      <div className="profile-cloud-note">
        <strong>☁️ Hesabınız Firebase ile senkronize ediliyor</strong>
        <span>
          Aynı hesapla farklı cihazlardan giriş yaptığınızda
          profil bilgilerinize erişebilirsiniz.
        </span>
      </div>

      <button
        type="button"
        className="profile-logout-button"
        onClick={onLogout}
      >
        Çıkış Yap
      </button>
    </main>
  );
}

function getInitials(name) {
  if (!name) return "";

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0][0]?.toLocaleUpperCase("tr-TR") || "";
  }

  return (
    parts[0][0] + parts[parts.length - 1][0]
  ).toLocaleUpperCase("tr-TR");
}

export default Profile;