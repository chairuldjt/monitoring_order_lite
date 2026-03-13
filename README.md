# OrderTrack - SIMRS Monitoring Order

OrderTrack adalah solusi dashboard pengelolaan dan pemantauan order SIMRS yang dirancang untuk efisiensi tinggi, responsivitas mobile, dan analisis data cerdas berbasis AI.

## 🚀 Fitur Utama

- **Real-time Dashboard**: Pantau total order, status pengerjaan, dan performa teknisi secara langsung.
- **Advanced Order Tracking**: Filter data berdasarkan periode, kategori, dan status dengan antarmuka yang dioptimalkan.
- **AI-Driven Analytics**: Analisis penyebab order berulang menggunakan pemrosesan semantik untuk identifikasi akar masalah.
- **Performance Analytics**: Visualisasi performa mingguan/bulanan dengan fitur pengurutan kronologis dan detail order mendalam.
- **Ultra-Responsive Design**: Pengalaman premium di perangkat mobile dengan navigasi swipe-friendly dan layout adaptif.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Styling**: Tailwind CSS & Vanilla CSS (Core Design System)
- **Icons**: Lucide React
- **Charts**: Recharts (Customized Premium Visuals)
- **State Management**: React Hooks (useMemo, useCallback, useState)
- **API**: RESTful API Design

## 📦 Instalasi & Penggunaan

1. **Persyaratan**:
   - Node.js v18.x atau terbaru.
   - Database MySQL (melalui XAMPP/Local Server).

2. **Setup**:
   ```bash
   npm install
   ```

3. **Konfigurasi Environment**:
   Salin `.env.example` menjadi `.env.local` dan sesuaikan kredensial database serta URL SIMRS API.

4. **Inisialisasi Database**:
   Gunakan perintah tunggal untuk migrasi dan inisialisasi:
   ```bash
   npm run db:init
   ```

5. **Menjalankan Development Server**:
   ```bash
   npm run dev
   ```
   Akses di [http://localhost:5015](http://localhost:5015).

## 🛡️ Keamanan & Produksi

- **RESTful API**: Memastikan integritas data dan kemudahan integrasi.
- **Role-Based Access**: Manajemen user untuk akses fitur administratif.
- **Optimized Build**: Jalankan `npm run build` untuk mendapatkan paket produksi yang optimal.

---
© 2026 OrderTrack Team. Powered by Advanced Agentic Coding.
