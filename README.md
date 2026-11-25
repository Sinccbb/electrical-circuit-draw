# CircuitLab Web

Editor skema rangkaian listrik dan simulasi analisis berbasis web. Dirancang sederhana untuk membantu proses belajar, menggambar laporan tugas, corat-coret skema teori Kirchhoff, hingga simulasi perhitungan rangkaian nyata.

Aplikasi ini berjalan murni di peramban (client-side) tanpa dependensi eksternal yang rumit, mendukung rumus matematika LaTeX secara langsung, dan memungkinkan diagram disalin dalam satu kali klik ke Microsoft Word atau Google Docs.

---

## Latar Belakang

Sering kali saat kita sedang mempelajari analisis rangkaian listrik—seperti hukum Kirchhoff (KCL dan KVL), analisis mesh, atau teorema Thevenin—kita membutuhkan media yang fleksibel. Di satu sisi, kita butuh ruang untuk corat-coret: memberi panah asumsi arah arus, menggambar lintasan loop tertutup, dan menuliskan persamaan dengan simbol-simbol fisika seperti $\Omega$, $\mu\text{F}$, atau indeks subskrip. Di sisi lain, kita juga butuh kepastian apakah hitungan kita sudah benar melalui simulasi nyata.

CircuitLab Web menggabungkan kedua kebutuhan tersebut ke dalam satu kanvas yang interaktif dan mudah dipakai.

---

## Fitur Utama

### 1. Dua Mode Kerja: Corat-Coret Teori dan Simulasi Nyata
Aplikasi ini menyediakan dua cara penggunaan yang bisa disesuaikan dengan kebutuhan:
- **Mode Corat-Coret & Desain Teori**: Kamu bebas meletakkan komponen, menghubungkan kawat, memberi panah arah arus ($I_1, I_2, \dots$), menentukan arah loop KVL (searah atau berlawanan jarum jam), menandai polaritas tegangan ($+/-$), serta menambahkan catatan atau rumus matematika bebas.
- **Mode Simulasi DC Interaktif**: Dengan menekan tombol *Mode Simulasi*, sistem perhitungan Modified Nodal Analysis (MNA) akan aktif. Tegangan tiap simpul dan arus cabang dihitung secara otomatis. Jika ada saklar yang dibuka atau ditutup, nilai-nilai tegangan dan arus langsung diperbarui seketika.

### 2. Saklar Interaktif (Switch ON / OFF)
- Saklar memiliki status visual yang jelas: saat terbuka (OFF), tuas terangkat miring; saat tertutup (ON), tuas terhubung lurus mendatar dengan indikator hijau.
- Kamu bisa mengubah kondisi saklar dengan memilih saklar lalu menekan tombol di panel properti, menekan tombol `Space` di papan ketik, atau cukup melakukan klik ganda pada saklar di kanvas.
- Dalam mode simulasi, membuka atau menutup saklar langsung memutus atau mengalirkan arus listrik pada cabang tersebut.

### 3. Multimeter Digital (DMM)
Tersedia komponen multimeter digital dengan dua terminal probe: probe merah $(+)$ di sebelah kiri dan probe hitam COM $(-)$ di sebelah kanan. Multimeter ini dilengkapi rotary dial dan layar LCD digital yang menampilkan hasil pengukuran:
- **Voltmeter DC**: Mengukur beda potensial antara kedua titik ($V_+ - V_-$).
- **Amperemeter DC**: Mengukur arus yang mengalir melalui cabang saat multimeter dipasang secara seri.
- **Ohmmeter**: Mengukur resistansi ekuivalen antara kedua terminal.
- **Voltmeter AC**: Mengukur nilai tegangan efektif (RMS).

### 4. Pengaturan Posisi dan Rotasi Teks Komponen
- Posisi label maupun nilai komponen tidak kaku. Kamu bisa mengatur posisinya ke arah atas, bawah, kiri, kanan, atau menggunakan penggeser koordinat untuk penyesuaian yang lebih halus.
- Orientasi teks juga bisa diputar ($0^\circ, 90^\circ, 180^\circ, 270^\circ$) agar tetap mudah dibaca saat komponen diputar vertikal.
- Walaupun posisi dan rotasi teks diatur secara bebas, teks tetap terikat secara dinamis pada komponen induknya. Ketika komponen digeser ke bagian kanvas yang lain, teks akan selalu ikut berpindah bersama komponen tersebut.

### 5. Sambungan Kawat Fleksibel (Draw.io Style)
- **Koneksi Magnetik Ujung ke Ujung**: Saat mendekatkan ujung kawat ke komponen, kursor otomatis mengunci tepat pada terminal kaki komponen (bukan di tengah badan komponen).
- **Kabel Mengikuti Komponen**: Begitu kawat tersambung ke terminal, kawat tersebut terikat secara permanen. Jika kamu menggeser resistor atau sumber tegangan, kabel yang terhubung akan otomatis memanjang, memendek, dan mengikuti pergerakan tersebut.
- **Kawat Lengkung yang Fleksibel**: Kamu bisa menggunakan kawat melengkung untuk menghubungkan dua simpul yang sebenarnya sama tanpa memotong jalur kawat lainnya. Lengkungan bisa diarahkan ke atas maupun ke bawah, baik dengan menggeser titik kontrol biru di kanvas, melalui slider inspector, atau dengan menekan tombol `R`.

### 6. Dukungan LaTeX Alami (Native Canvas)
- Semua label, nilai komponen, dan teks bebas mendukung format penulisan LaTeX menggunakan tanda `$...$`.
- Penulisan simbol seperti `$R_1$`, `$C_{eq}$`, `$V_{in}$`, `$10\ \Omega$`, `$100\ \mu\text{F}$`, hingga persamaan matematika seperti `$V_{th} = 12\ \text{V}$` dirender langsung menggunakan mesin tipografi vektor pada kanvas. Teks tampil tajam dan tidak akan hilang saat diekspor.

### 7. Navigasi Kanvas yang Leluasa
- **Menggeser Kanvas (Pan)**: Kamu bisa menggeser kanvas dengan klik dan tahan pada area kosong, menahan tombol `Spasi` sambil menggeser mouse, atau menggunakan klik roda tengah mouse.
- **Perbesaran (Zoom)**: Gunakan roda gulir (scroll) mouse atau tombol navigasi di pojok kanan bawah (`+`, `−`, `Fit`, `1:1`) untuk melihat detail komponen atau memuat seluruh rangkaian ke layar.

### 8. Integrasi Cepat ke Dokumen (Word dan Docs)
- **Salin Diagram**: Klik tombol *Salin Diagram ke Word*, lalu tekan `Ctrl + V` di Microsoft Word, Google Docs, atau aplikasi pengolah kata lainnya. Gambar disalin dengan resolusi tinggi (2x crisp retina) dan terpotong rapi sesuai batas rangkaian (*auto-crop*).
- **Salin Analisis**: Teks rangkuman perumusan KCL, KVL, dan status pengukuran sirkuit dapat disalin langsung ke badan tulisan laporan.
- **Unduh PNG**: Kamu juga bisa menyimpan berkas gambar ke penyimpanan lokal komputer kapan saja.

---

## Petunjuk Penggunaan Singkat

| Tombol / Aksi | Fungsi |
|---|---|
| **Klik Kiri** | Memilih komponen, menarik kawat, atau menaruh komponen |
| **Klik Kanan** | Membatalkan penarikan kawat atau kembali ke alat pilih (Select) |
| **Tombol `R`** | Memutar komponen $90^\circ$ sebelum ditaruh atau membalik arah kawat lengkung |
| **Tombol `Space`** | Menahan untuk menggeser kanvas (atau membuka/menutup saklar yang sedang dipilih) |
| **Tombol Panah** | Menggeser posisi komponen yang sedang dipilih secara presisi di atas grid |
| **Scroll Mouse** | Memperbesar atau memperkecil tampilan kanvas (Zoom In / Zoom Out) |
| **Klik Ganda Saklar** | Membuka atau menutup saklar secara langsung |
| **`Ctrl + Z` / `Ctrl + Y`** | Membatalkan (Undo) atau mengulangi (Redo) tindakan terakhir |

---

## Menjalankan secara Mandiri

Karena proyek ini tidak membutuhkan instalasi dependensi yang rumit, kamu bisa menjalankannya dengan sangat mudah:

1. Unduh atau clone repositori ini ke komputer kamu:
   ```bash
   git clone https://github.com/username/electrical-circuit-draw.git
   cd electrical-circuit-draw
   ```
2. Buka berkas `src/index.html` langsung di peramban favoritmu (Chrome, Edge, Firefox, dsb.), atau gunakan server statis sederhana jika ingin mengaksesnya melalui localhost:
   ```bash
   # Menggunakan Node.js
   npx serve src

   # Atau menggunakan Python
   python -m http.server 3000 --directory src
   ```
3. Buka alamat `http://localhost:3000` pada peramban.

---

## Struktur Berkas

```text
electrical-circuit-draw/
├── src/
│   ├── css/
│   │   └── style.css            # Gaya visual antarmuka dan panel
│   ├── js/
│   │   ├── app.js               # Pengendali utama antarmuka pengguna
│   │   ├── circuit-canvas.js    # Mesin kanvas, rendering komponen, dan penanganan interaksi
│   │   ├── circuit-solver.js    # Mesin simulasi rangkaian DC (Modified Nodal Analysis)
│   │   ├── latex-renderer.js    # Mesin rendering formula LaTeX vektor pada HTML5 Canvas
│   │   ├── equation-helper.js   # Generator rangkuman analisis KCL, KVL, dan simulasi
│   │   ├── presets.js           # Contoh rangkaian awal (Divider, Wheatstone, 2-Loop)
│   │   └── clipboard-helper.js  # Utilitas penyalinan diagram dan teks ke papan klip
│   └── index.html               # Halaman utama aplikasi
└── README.md                    # Dokumentasi proyek
```

---

## Lisensi

Proyek ini dirilis di bawah lisensi [MIT](LICENSE). Bebas digunakan, dipelajari, maupun dikembangkan lebih lanjut untuk keperluan akademis maupun personal.
