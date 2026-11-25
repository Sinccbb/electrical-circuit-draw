# ⚡ CircuitLab Web

<p align="center">
  <b>Editor Skema Rangkaian Listrik Interaktif & Analisis Hukum Kirchhoff Berbasis Web</b><br>
  <i>Dilengkapi Rendering LaTeX Matematis Asli, Navigasi Pan & Zoom, dan Salin 1-Klik ke Microsoft Word / Google Docs</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/HTML5-Canvas%202D-E34F26?logo=html5&logoColor=white" alt="HTML5 Canvas">
  <img src="https://img.shields.io/badge/LaTeX-Native%20Engine-008080?logo=latex&logoColor=white" alt="LaTeX Native">
  <img src="https://img.shields.io/badge/Zero-Dependencies-brightgreen" alt="Zero Dependencies">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License MIT">
</p>

---

## 📌 Tentang Proyek

**CircuitLab Web** adalah aplikasi web ringan (*zero-dependency*) yang dirancang khusus untuk mahasiswa, dosen, dan pelajar teknik elektro maupun fisika. Aplikasi ini mempermudah penggambaran skema rangkaian listrik, perumusan asumsi arah arus cabang ($I_1, I_2, \dots$), lintasan loop KVL (*Kirchhoff's Voltage Law*), penandaan simpul KCL (*Kirchhoff's Current Law*), serta penyusunan persamaan matematis.

Dengan fitur **1-Klik Salin ke Clipboard**, diagram rangkaian beresolusi tinggi (2x crisp retina) dapat langsung ditempelkan (**`Ctrl + V`**) ke **Microsoft Word**, **Google Docs**, **PowerPoint**, **Overleaf (LaTeX)**, maupun laporan praktikum tanpa perlu repot ekspor-impor berkas.

---

## ✨ Fitur Utama

### 1. 🔤 Rendering Rumus Matematika LaTeX 100% Native
- Mendukung format penulisan LaTeX `$ ... $` pada nama komponen, nilai komponen, maupun label simpul dan teks keterangan bebas:
  - Subskrip & Superskrip: `$R_1$`, `$C_{eq}$`, `$V_{th}$`, `$i_L(0^-)$`, `$v_C(0^+)$`
  - Satuan & Simbol Yunani: `$10\ \Omega$`, `$100\ \mu\text{F}$`, `$2.5\ \text{mH}$`, `$12\ \text{V}$`
  - Persamaan Matematika: `$v(t) = 100\cos(120\pi t + 45^\circ)\ \text{V}$`
- **Tanpa CDN Eksternal**: Menggunakan engine tata letak vektor 2D langsung di HTML5 Canvas sehingga perenderan instan (0 ms), bebas jeda (*flicker-free*), dan tidak pernah hilang saat diekspor.

### 2. 🎯 Alat Analisis Rangkaian Lengkap (Hukum Kirchhoff)
- **Panah Asumsi Arah Arus ($I_1, I_2, \dots$)**: Tempatkan di cabang kawat mana pun dengan 4 arah (Kanan, Bawah, Kiri, Atas).
- **Loop KVL ($\circlearrowright$ / $\circlearrowleft$)**: Tentukan arah lintasan mesh loop searah maupun berlawanan arah jarum jam.
- **Simpul KCL ($V_A, V_B, \dots$)**: Titik acuan potensial simpul untuk analisis tegangan simpul (*Nodal Analysis*).
- **Polaritas (+ / -)**: Tanda polaritas jatuh tegangan pada komponen pasif.
- **Kawat Lengkung Fleksibel (Curved Wire / Jumper)**:
  - Hubungkan dua simpul secara melengkung untuk menyederhanakan visualisasi simpul sepotensial (*equipotential node*).
  - **Lengkung Fleksibel ke Atas & Bawah**: Klik dan geser titik bulat biru di tengah kawat langsung di kanvas, gunakan tombol inspector `↶ Atas` / `↷ Bawah`, atau tekan tombol **`R`** untuk membalik arah lengkungan.
- **Teks Bebas (LaTeX)**: Tambahkan catatan kuliah, rumus ekivalen Thevenin/Norton, atau kondisi awal rangkaian.

### 3. 🧲 Terminal Magnet Port & Sambungan Dinamis (Draw.io Style)
- **Magnet Snap Ujung-ke-Ujung**: Saat menarik kawat mendekati ujung komponen (resistor, kapasitor, sumber tegangan, dll.), kursor otomatis mengunci (*snap*) tepat pada ujung kaki/terminal komponen (bukan di leher komponen!). Port terminal yang aktif akan menyala hijau dengan cincin visual.
- **Kabel Otomatis Mengikut (*Dynamic Wire Binding*)**: Komponen yang sudah terhubung dengan kabel dapat digeser bebas atau diposisikan dengan tombol panah keyboard — kabel otomatis memanjang, memendek, dan mengikuti pergerakan komponen persis seperti di Draw.io!
- **Rotasi Dinamis**: Saat komponen diputar dengan tombol **`R`**, kabel yang tersambung akan otomatis ikut berputar mengikuti orientasi terminal baru.

### 4. 🔍 Kanvas Luas dengan Navigasi Pan & Zoom
- **Geser Kanvas (Pan)**: Klik & tahan area kosong, tahan tombol `Spasi`, atau gunakan tombol roda mouse (*Middle Click*).
- **Perbesar / Perkecil (Zoom)**: Putar roda mouse (*scroll*) terpusat pada posisi kursor, atau gunakan panel zoom mengambang (`−`, `100%`, `+`, `Fit`, `1:1`).
- **Auto-Cropping Ekspor**: Gambar yang disalin atau diunduh otomatis di-crop rapi sesuai batas terluar komponen, menjaga diagram tetap berada di tengah tanpa ruang kosong yang berlebih.

### 5. 📋 Integrasi Cepat ke Dokumen (Word / Docs)
- **Tombol Salin Diagram (Ctrl+V)**: Memasukkan gambar berformat PNG transparan/putih tajam langsung ke *clipboard*. Buka Microsoft Word dan langsung tekan **`Ctrl + V`**.
- **Salin Analisis**: Menyalin teks ringkasan perumusan KCL dan KVL dalam format rapi untuk disisipkan ke badan dokumen.
- **Unduh PNG**: Simpan diagram ke komputer dengan satu klik.

---

## 🚀 Panduan Menjalankan

### Cara 1: Buka Langsung (Tanpa Instalasi)
Anda dapat langsung membuka berkas `src/index.html` di browser modern mana pun (Google Chrome, Microsoft Edge, Firefox, Brave).

### Cara 2: Menjalankan Local Server (Direkomendasikan)
Menjalankan local server memastikan fitur Clipboard API berjalan tanpa pembatasan keamanan lokal:

1. Pastikan **Node.js** telah terpasang di komputer Anda.
2. Buka terminal pada folder proyek:
   ```bash
   git clone https://github.com/username/circuitlab-web.git
   cd circuitlab-web
   ```
3. Jalankan server:
   ```bash
   npm start
   ```
   *(Atau di Windows, cukup klik dua kali berkas **`Buka-di-Browser.bat`**)*
4. Buka peramban di: **`http://localhost:3000/index.html`**

---

## ⌨️ Pintasan Keyboard & Mouse (*Shortcuts*)

| Tombol / Aksi | Fungsi |
| :--- | :--- |
| **Klik Kiri** | Memilih komponen / meletakkan alat yang sedang aktif |
| **Klik Kanan** | Membatalkan penarikan kawat atau kembali ke alat **Pilih** |
| **`R`** | Memutar komponen **90°** / memutar arah panah arus / membalik arah loop KVL |
| **`←` `↑` `→` `↓`** | Menggeser posisi komponen/kawat terpilih per 1 unit grid |
| **`Shift` + Panah** | Menggeser posisi mikro dengan presisi tinggi (5 px) |
| **`Delete` / `Backspace`** | Menghapus komponen atau kawat yang sedang dipilih |
| **`Ctrl` + `Z`** | Membatalkan perubahan (*Undo*) |
| **`Ctrl` + `Y`** | Mengulangi perubahan (*Redo*) |
| **Scroll Roda Mouse** | Zoom In / Zoom Out kanvas |
| **Tahan Klik Kiri / Spasi** | Menggeser (*pan*) kanvas |
| **Dobel Klik pada Teks** | Langsung mengedit isi teks/rumus di panel inspektor |

---

## 📐 Contoh Penulisan LaTeX yang Didukung

Aplikasi ini memiliki parser LaTeX mandiri yang mendukung sintaks matematika penting:

| Kategori | Sintaks | Tampilan Hasil |
| :--- | :--- | :--- |
| **Subskrip** | `$R_1$`, `$C_{load}$`, `$V_{th}$` | $R_1$, $C_{load}$, $V_{th}$ |
| **Superskrip** | `$x^2$`, `$e^{-t/\tau}$` | $x^2$, $e^{-t/\tau}$ |
| **Simbol Yunani** | `$\Omega$`, `$\mu$`, `$\pi$`, `$\theta$`, `$\alpha$`, `$\omega$` | $\Omega$, $\mu$, $\pi$, $\theta$, $\alpha$, $\omega$ |
| **Teks Tegak dalam Rumus** | `$\text{V}$`, `$\text{mA}$`, `$\text{mH}$` | $\text{V}$, $\text{mA}$, $\text{mH}$ |
| **Spasi Matematika** | `$10\ \Omega$`, `$5\ \text{V}$` | Memberi jarak visual yang proporsional |
| **Pecahan** | `$\frac{1}{2}$`, `$\frac{V}{R}$` | Menampilkan bentuk pecahan bertumpuk |
| **Fungsi Matematika** | `$\sin$`, `$\cos$`, `$\tan$`, `$\ln$` | Nama fungsi dengan tipografi matematika |

---

## 📁 Struktur Berkas

```
circuitlab-web/
├── src/
│   ├── index.html           # Struktur tampilan antarmuka web
│   ├── css/
│   │   └── style.css        # Tata letak responsif, tema modern & kanvas
│   ├── js/
│   │   ├── app.js              # Controller utama & event listener interaksi
│   │   ├── circuit-canvas.js   # Mesin rendering skema rangkaian & grid
│   │   ├── latex-renderer.js   # Mesin layout & rendering LaTeX native 2D
│   │   ├── equation-helper.js  # Generator perumusan KCL & KVL otomatis
│   │   ├── presets.js          # Contoh template rangkaian (Thevenin, Jembatan Wheatstone, dll.)
│   │   └── clipboard-helper.js # Modul penyalinan gambar PNG & teks ke clipboard
│   └── assets/
│       └── icon.svg         # Ikon aplikasi
├── Buka-di-Browser.bat      # Launcher praktis 1-klik untuk pengguna Windows
├── server.js                # Local HTTP static server (Zero dependencies)
├── package.json             # Konfigurasi proyek npm
├── .gitignore               # Berkas yang diabaikan oleh Git
└── README.md                # Dokumentasi lengkap proyek
```

---

## 🛠️ Teknologi yang Digunakan

- **HTML5 Canvas API (2D Context)**: Perenderan diagram vektor berkecepatan tinggi dengan skalabilitas resolusi (2x supersampling).
- **Vanilla JavaScript (ES6+)**: Arsitektur modular tanpa ketergantungan framework (*Zero framework, zero runtime dependencies*).
- **CSS3 Flexbox & Grid**: Desain antarmuka modern bernuansa *developer tools*.
- **Async Clipboard API**: Integrasi transfer data gambar PNG biner langsung ke clipboard sistem operasi.

---

## 🤝 Kontribusi

Kontribusi selalu terbuka! Jika Anda ingin menambahkan komponen listrik baru (misal: Transistor BJT/MOSFET, Op-Amp, Transformator), silakan lakukan *Fork* repositori ini, buat *branch* fitur Anda, dan kirimkan *Pull Request*.

1. *Fork* repositori ini
2. Buat *feature branch* (`git checkout -b fitur-baru`)
3. *Commit* perubahan Anda (`git commit -m 'Menambahkan komponen Op-Amp'`)
4. *Push* ke *branch* (`git push origin fitur-baru`)
5. Buat *Pull Request* baru

---

## 📄 Lisensi

Didistribusikan di bawah Lisensi **MIT**. Silakan gunakan secara bebas untuk keperluan belajar, mengajar, maupun pengembangan lebih lanjut.
