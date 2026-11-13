function DeleteAccountPage() {
  return (
    <main
      style={{
        maxWidth: "850px",
        margin: "0 auto",
        padding: "40px 24px",
        lineHeight: "1.7",
      }}
    >
      <h1>İşletme Defteri – Hesap Silme</h1>

      <p>
        <strong>Geliştirici:</strong> Firdevs Köse
      </p>

      <p>
        İşletme Defteri kullanıcıları, hesaplarını ve hesaplarıyla ilişkili
        verileri doğrudan uygulama içerisinden kalıcı olarak silebilir.
      </p>

      <h2>Hesabımı nasıl silebilirim?</h2>

      <ol>
        <li>İşletme Defteri uygulamasında hesabınıza giriş yapın.</li>
        <li>Menü bölümünden Profil sayfasını açın.</li>
        <li>Sayfanın altında bulunan “Hesabımı Sil” seçeneğine dokunun.</li>
        <li>Hesap silme işlemini onaylayın.</li>
      </ol>

      <p>
        İşlem onaylandıktan sonra hesabınız ve hesabınıza bağlı veriler kalıcı
        olarak silinir. Bu işlem geri alınamaz.
      </p>

      <h2>Hangi veriler silinir?</h2>

      <p>Hesabınızı sildiğinizde aşağıdaki veriler silinir:</p>

      <ul>
        <li>Firebase Authentication kullanıcı hesabı</li>
        <li>Ad, soyad, işletme adı ve telefon gibi profil bilgileri</li>
        <li>Cari kayıtları ve bu kayıtlara eklenen bilgiler</li>
        <li>Satış ve alış kayıtları</li>
        <li>Tahsilat ve ödeme kayıtları</li>
        <li>Hesaba bağlı diğer işletme kayıtları ve notlar</li>
      </ul>

      <h2>Veri saklama</h2>

      <p>
        Uygulama üzerinden hesap silme işlemi tamamlandığında, İşletme Defteri
        tarafından aktif kullanıcı hesabına bağlı yukarıdaki veriler uygulamanın
        veritabanında tutulmaya devam edilmez.
      </p>

      <p>
        Hesap silme işlemi geri alınamaz. Uygulamayı tekrar kullanmak isteyen
        kullanıcıların yeni bir hesap oluşturması gerekir.
      </p>

      <p>
        <strong>Son güncelleme:</strong> 10 Kasım 2026
      </p>
    </main>
  );
}

export default DeleteAccountPage;
