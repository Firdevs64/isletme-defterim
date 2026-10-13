# 📒 İşletme Defterim

İşletme Defterim; küçük işletmelerin müşteri hesaplarını, yapılan işleri, tahsilatlarını ve giderlerini kolayca takip edebilmesi için geliştirilmiş web tabanlı bir işletme takip uygulamasıdır.

Uygulama **PWA (Progressive Web App)** olarak geliştirilmiştir. Bu sayede bilgisayardan web üzerinden kullanılabildiği gibi mobil cihazlara uygulama olarak da yüklenebilir.

## 🌐 Canlı Demo

👉 **[İşletme Defterim'i Aç](https://gregarious-blini-58745e.netlify.app/)**

## ✨ Özellikler

- 👤 Kullanıcı kayıt ve giriş sistemi
- ☁️ Firebase ile bulut tabanlı veri saklama
- 🔄 Telefon ve bilgisayar arasında gerçek zamanlı veri senkronizasyonu
- 👥 Müşteri hesaplarının oluşturulması ve takibi
- 🧾 Yapılan işlerin müşterilere kaydedilmesi
- 💰 Tahsilat takibi
- 💸 Gider takibi
- 📊 Toplam iş, tahsilat ve kalan alacak hesaplama
- 🔎 Müşteri arama
- 📅 Tarih bazlı işlem kaydı
- 🗑️ İşlem silme
- 🔢 Adet × birim fiyat otomatik hesaplama
- 📐 m² × birim fiyat otomatik hesaplama
- 📱 PWA desteği ile mobil cihazlara kurulabilme
- 🔐 Kullanıcıya özel veri yapısı

## 🛠️ Kullanılan Teknolojiler

- React
- Vite
- JavaScript
- CSS
- Firebase Authentication
- Cloud Firestore
- Vite PWA
- Netlify

## ☁️ Firebase Yapısı

Uygulamada kullanıcı işlemleri için **Firebase Authentication**, verilerin bulutta saklanması ve cihazlar arasında senkronize edilmesi için **Cloud Firestore** kullanılmaktadır.

Her kullanıcı kendi hesabına ait verilere erişir. Aynı hesap ile farklı cihazlardan giriş yapıldığında veriler senkronize şekilde görüntülenebilir.

## 📱 PWA Desteği

İşletme Defterim bir Progressive Web App olarak çalışır.

Desteklenen cihazlarda uygulama ana ekrana eklenerek normal bir mobil uygulamaya benzer şekilde kullanılabilir.

## 🚀 Kurulum

Projeyi bilgisayarınızda çalıştırmak için:

```bash
git clone https://github.com/Firdevs64/isletme-defterim.git
cd isletme-defterim
npm install
```

Projede Firebase kullanılmaktadır. Proje ana dizininde `.env` dosyası oluşturup `.env.example` dosyasında belirtilen Firebase değişkenlerini kendi Firebase projenize ait bilgilerle doldurun.

Ardından:

```bash
npm run dev
```

Uygulama Vite geliştirme sunucusunda çalışacaktır.

Production sürümü oluşturmak için:

```bash
npm run build
```

## 🔒 Güvenlik

Firebase yapılandırma değerleri `.env` dosyasında tutulmaktadır. `.env` dosyası Git tarafından takip edilmez ve repository içerisinde paylaşılmaz.

Firestore verileri kullanıcı kimliğine göre ayrılmıştır ve güvenlik kurallarıyla kullanıcıların yalnızca kendi verilerine erişmesi amaçlanmıştır.

## 🎯 Projenin Amacı

Bu proje, gerçek bir küçük işletmenin günlük ihtiyaçları doğrultusunda geliştirilmiştir. İlk sürümün ardından gelen kullanıcı geri bildirimlerine göre uygulamaya çoklu cihaz senkronizasyonu ve adet/m² bazlı otomatik fiyat hesaplama özellikleri eklenmiştir.

Amaç, klasik defter kullanımının yerine daha erişilebilir ve farklı cihazlardan kullanılabilen basit bir dijital işletme defteri oluşturmaktır.

## 👩‍💻 Geliştirici

**Firdevs**

GitHub: [@Firdevs64](https://github.com/Firdevs64)
