# CircuitLab Web

Editor skema dan simulator analisis rangkaian listrik berbasis web. Dikembangkan secara mandiri untuk menemani proses belajar teori rangkaian listrik, mengerjakan tugas kuliah, membuat diagram laporan praktikum, hingga memverifikasi perhitungan melalui simulasi interaktif yang menyerupai Proteus VSM.

Aplikasi ini berjalan seutuhnya di sisi peramban (client-side) tanpa ketergantungan pustaka server yang rumit, mendukung penulisan formula matematika LaTeX secara alami pada kanvas HTML5, dan menyediakan fitur salin instan diagram beresolusi tinggi ke Microsoft Word maupun Google Docs.

---

## Latar Belakang

Ketika kita mempelajari mata kuliah Rangkaian Listrik—mulai dari hukum dasar Ohm dan Kirchhoff (KCL dan KVL), analisis simpul dan jerat (nodal & mesh analysis), teorema Thevenin dan Norton, rangkaian penguat operasional (Op-Amp), hingga sumber-sumber terkendali—kita sering kali menghadapi dua kebutuhan yang berbeda namun saling berkaitan:

1. **Kebutuhan Menggambar dan Merumuskan Persamaan**: Kita perlu membuat skema yang bersih untuk laporan, menentukan arah panah arus asumsi cabang ($I_1, I_2, \dots$), menandai polaritas jatuh tegangan ($+/-$), menggambar lintasan loop tertutup, serta menuliskan nilai komponen dengan notasi ilmiah yang tepat seperti $\Omega$, $\text{k}\Omega$, $\mu\text{F}$, $\text{mH}$, hingga formula matematika bebas seperti $V_{th} = 12\ \text{V}$.
2. **Kebutuhan Memverifikasi Hasil dengan Instrumen Pengukuran**: Setelah menghitung secara analitis di atas kertas, kita membutuhkan instrumen uji seperti Voltmeter, Ammeter, Wattmeter, atau Multimeter untuk memastikan apakah nilai tegangan simpul dan arus cabang yang kita dapatkan sudah benar.

CircuitLab Web dirancang untuk menjembatani kedua kebutuhan tersebut dalam satu lingkungan kerja yang ringan, teratur, dan mudah digunakan.

---

## Fitur Utama

### 1. Instrumen Virtual Proteus (Virtual Instruments)
Aplikasi menyediakan rangkaian instrumen ukur mandiri yang dimodelkan mendekati karakteristik instrumen Proteus VSM:
- **DC Voltmeter**: Instrumen penunjuk tegangan searah berimpedansi dalam tinggi ($10\text{ M}\Omega$). Dipasang secara paralel antar dua titik simpul untuk membaca beda potensial ($V_+ - V_-$). Dilengkapi label polaritas terminal merah $(+)$ dan hitam $(-)$ serta tampilan digital LCD.
- **DC Ammeter**: Instrumen pengukur arus searah dengan drop tegangan mendekati nol ($0\text{ V}$, dipasang secara seri pada lintasan cabang). Menampilkan besar dan arah arus cabang secara presisi.
- **AC Voltmeter & AC Ammeter**: Instrumen penunjuk nilai efektif (RMS) tegangan dan arus bolak-balik untuk analisis sinyal sinusoidal dan fasor.
- **Wattmeter**: Instrumen daya nyata 4-terminal. Menggabungkan sensor arus seri ($I_+ / I_-$) dan sensor tegangan paralel ($V_+ / V_-$) untuk menghitung daya aktif $P = |V \times I|$ dalam satuan Watt.
- **Digital Multimeter (DMM)**: Multimeter dengan kenop pemilih putar dan layar LED hijau. Mendukung empat mode kerja: Voltmeter DC, Amperemeter DC, Ohmmeter (pengukuran resistansi ekuivalen), dan Voltmeter AC.

### 2. Komponen Khusus Rangkaian Listrik Kuliah
Untuk memenuhi materi kuliah analisis rangkaian listrik tingkat sarjana, aplikasi menyertakan komponen-komponen penting:
- **Penguat Operasional Ideal (Op-Amp LM741)**: Model op-amp 3-terminal dengan terminal inverting $(-)$, non-inverting $(+)$, dan keluaran $(out)$. Memenuhi prinsip hubung singkat virtual (*virtual short* $V_+ = V_-$) dengan resistansi masukan tak terhingga, cocok untuk rangkaian penguat pembalik (*inverting*), tak-pembalik (*non-inverting*), penjumlah (*summing*), dan penyangga (*buffer*).
- **Sumber Terkendali / Dependen (VCVS & VCCS)**: Simbol belah ketupat (*diamond*) khas buku ajar rangkaian listrik untuk sumber tegangan terkendali tegangan (*Voltage-Controlled Voltage Source*) dan sumber arus terkendali tegangan. Faktor penguatan ($\mu$ atau $g_m$) dapat disesuaikan secara bebas melalui panel properti.

### 3. Mesin Simulasi Interaktif & Kunci Komponen (Run / Stop Mode)
- **Mode Desain Bebas (Simulasi OFF)**: Saat simulasi dimatikan (`Stop`), kanvas berada dalam mode pengeditan penuh. Kamu bebas menambah komponen, menarik kawat, memindahkan posisi, memutar, maupun menghapus bagian rangkaian.
- **Mode Simulasi Berjalan (Simulasi ON)**: Ketika tombol **Run** (▶) ditekan, sistem Modified Nodal Analysis (MNA) aktif dan rangkaian masuk ke status terkunci. Untuk menjaga integritas perhitungan rangkaian nyata, komponen tidak dapat dipindah, diputar, maupun dihapus secara tidak sengaja.
- **Interaktivitas yang Diizinkan saat Simulasi Aktif**:
  - **Membuka / Menutup Saklar**: Kamu cukup mengklik langsung saklar di kanvas (atau menekan tombol `Space`) untuk memutus atau menyambungkan aliran listrik secara seketika.
  - **Mengubah Mode Multimeter**: Selektor mode pengukuran pada multimeter (DCV, DCA, Ohm, ACV) tetap aktif dan langsung memperbarui angka pengukuran.
  - **Inspeksi Nilai Simpul**: Memilih komponen untuk membaca nilai tegangan simpul dan arus cabang di panel inspeksi tetap dapat dilakukan.
  - **Navigasi Kanvas**: Menggeser (*pan*) dan memperbesar (*zoom*) tampilan tetap leluasa digunakan.
- **Menghentikan Simulasi (Stop)**: Menekan tombol **Stop** (⏹) akan membuka kembali kunci kanvas sehingga kamu bisa kembali memodifikasi diagram.

### 4. Visualisasi Aliran Arus Listrik Bergerak (Gaya Falstad)
- Terinspirasi dari simulator rangkaian Falstad yang intuitif, CircuitLab Web menampilkan partikel-partikel muatan listrik berwarna kuning keemasan yang bergerak mengalir di sepanjang kawat dan menembus komponen.
- **Arah Gerak Sebenarnya**: Partikel bergerak mengikuti arah arus konvensional sebenarnya hasil perhitungan hukum Kirchhoff (dari potensial tinggi menuju potensial rendah). Jika arah arus berbalik, partikel otomatis berbalik arah.
- **Kecepatan Sesuai Besar Arus**: Laju gerak partikel sebanding secara dinamis dengan besar arus listrik cabang ($|I|$). Cabang berarus besar akan menampilkan partikel yang melesat lebih cepat, sedangkan cabang berarus kecil bergerak lebih lambat.
- **Respons Saklar Seketika**: Saat saklar dibuka (OFF), aliran partikel pada cabang tersebut langsung terhenti seketika. Begitu saklar ditutup kembali (ON), partikel kembali mengalir secara mulus.
- **Tombol Kendali Aliran Arus**: Terdapat tombol *Aliran Arus (ON/OFF)* pada bilah kendali transport di bawah kanvas untuk menampilkan atau menyembunyikan partikel sesuai kenyamanan visual.

### 5. Saklar Interaktif (Interactive Switch)
- Saklar memiliki dua kondisi visual yang nyata: terbuka (*Open / OFF*) dengan tuas terangkat miring, dan tertutup (*Closed / ON*) dengan tuas terhubung mendatar.
- Kondisi saklar dapat diubah dengan melakukan klik langsung pada saklar di kanvas saat simulasi berjalan, menekan tombol `Space` saat saklar dipilih, atau melalui tombol inspector.
- Membuka saklar memutus arus pada cabang tersebut ($I = 0\text{ A}$), sementara menutup saklar mengalirkan kembali arus rangkaian.

### 6. Sambungan Kawat Fleksibel (Draw.io Style)
- **Koneksi Magnetik Ujung Terminal**: Kawat otomatis mengunci tepat pada ujung pin terminal komponen (bukan di tengah badan komponen).
- **Kabel Dinamis Mengikuti Komponen**: Kawat yang telah tersambung akan tetap menempel secara kokoh pada kaki komponen. Menggeser resistor atau baterai akan otomatis membuat kawat memanjang atau memendek mengikuti pergeseran tersebut.
- **Kawat Lengkung (Curved Jumper)**: Memudahkan perapian gambar diagram ketika ada kawat yang menghubungkan simpul jauh atau simpul ground bersama tanpa bersilangan kaku dengan komponen lain. Lengkungan dapat diarahkan melengkung ke atas maupun ke bawah melalui slider inspector, tombol `R`, atau menarik titik kontrol biru pada kawat.

### 7. Pengaturan Posisi dan Rotasi Label Komponen
- Posisi teks nama ($R_1$) dan nilai ($10\ \Omega$) dapat diposisikan ke arah atas, bawah, kiri, atau kanan komponen sesuai kerapian diagram.
- Teks label juga dapat dirotasi ($0^\circ, 90^\circ, 180^\circ, 270^\circ$) agar tetap tegak terbaca meskipun komponen dipasang dalam posisi vertikal.
- Seluruh teks tetap terikat secara dinamis pada komponen induknya saat komponen dipindahkan.

### 8. Tipografi Formula LaTeX Alami pada Kanvas
- Penulisan label, nilai besaran, maupun anotasi bebas mendukung format LaTeX dengan penanda `$...$`.
- Simbol satuan fisika seperti $\Omega$, $\mu\text{F}$, $\text{mH}$, subskrip $V_{in}$, $I_{total}$, hingga persamaan diferensial awal dirender langsung secara vektor pada kanvas sehingga tampak jernih dan tidak mengalami distorsi saat diekspor.

### 9. Penyalinan Cepat ke Dokumen (Word dan Docs)
- **Salin Diagram**: Tombol *Salin Diagram ke Word* menyalin gambar diagram rangkaian format PNG beresolusi tinggi (2x crisp retina) ke clipboard sistem dalam batas gambar yang terpotong otomatis (*auto-crop*). Cukup tekan `Ctrl + V` pada dokumen tugas Microsoft Word atau Google Docs.
- **Salin Analisis**: Teks rangkuman data komponen, perumusan hukum Kirchhoff I & II, dan pembacaan instrumen ukur dapat disalin langsung ke lembar kerja laporan.
- **Unduh PNG**: Berkas gambar diagram dapat diunduh ke media penyimpanan komputer.

---

## Pintasan Papan Ketik (Keyboard Shortcuts)

| Tombol / Aksi | Fungsi |
|---|---|
| **Klik Kiri** | Memilih komponen, menarik jalur kawat, atau menaruh komponen pada posisi kursor |
| **Klik Kanan** | Membatalkan penarikan kawat atau kembali ke alat penunjuk (Select) |
| **Tombol `R`** | Memutar orientasi komponen $90^\circ$ atau membalik arah kelengkungan kawat |
| **Tombol `Space`** | Menahan tombol untuk menggeser kanvas (atau membuka/menutup saklar yang terpilih) |
| **Tombol Panah** | Menggeser posisi komponen terpilih langkah demi langkah di atas kisi grid |
| **Scroll Mouse** | Memperbesar atau memperkecil tampilan area kerja kanvas (Zoom In / Zoom Out) |
| **Klik Ganda Saklar** | Membuka atau menutup saklar secara langsung |
| **`Ctrl + Z` / `Ctrl + Y`** | Membatalkan (Undo) atau mengulangi (Redo) tindakan pengeditan |

---

## Menjalankan Aplikasi

Aplikasi ini tidak memerlukan instalasi perangkat lunak tambahan maupun runtime khusus:

1. Unduh atau clone repositori ini:
   ```bash
   git clone https://github.com/username/electrical-circuit-draw.git
   cd electrical-circuit-draw
   ```
2. Buka berkas `src/index.html` secara langsung pada peramban web modern (Google Chrome, Microsoft Edge, Mozilla Firefox, Safari, atau Opera).
3. Jika ingin menyajikannya melalui server lokal sederhana:
   ```bash
   # Melalui Node.js
   npx serve src

   # Atau melalui Python
   python -m http.server 3000 --directory src
   ```
4. Akses melalui alamat `http://localhost:3000`.

---

## Struktur Berkas

```text
electrical-circuit-draw/
├── src/
│   ├── css/
│   │   └── style.css            # Desain tata letak, panel kontrol, dan gaya Proteus Transport Bar
│   ├── js/
│   │   ├── app.js               # Pengendali utama antarmuka pengguna dan interaksi tombol
│   │   ├── circuit-canvas.js    # Mesin kanvas, rendering komponen, interaksi kawat, dan visual Proteus
│   │   ├── circuit-solver.js    # Mesin analisis rangkaian MNA linier (Modified Nodal Analysis)
│   │   ├── latex-renderer.js    # Mesin rendering formula tipografi LaTeX vektor
│   │   ├── equation-helper.js   # Penyusun rangkuman analisis Kirchhoff dan hasil pengukuran instrumen
│   │   ├── presets.js           # Contoh rangkaian kuliah (Kirchhoff 2-Loop, Divider, Wheatstone, Proteus Meters, Op-Amp)
│   │   └── clipboard-helper.js  # Utilitas penyalinan diagram dan teks ke papan klip
│   └── index.html               # Halaman utama aplikasi dan panel inspeksi
└── README.md                    # Dokumentasi panduan penggunaan proyek
```

---

## Lisensi

Proyek ini didistribusikan di bawah lisensi [MIT](LICENSE). Terbuka untuk digunakan, dipelajari, dan dikembangkan lebih lanjut guna menunjang kegiatan pembelajaran dan akademis.
