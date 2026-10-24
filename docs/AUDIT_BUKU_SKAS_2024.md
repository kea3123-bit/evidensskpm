# Audit Buku SK@S 2024 berbanding SPES-SK@S (24 Oktober 2026)

## Skop dan bukti

Sumber utama ialah PDF yang pengguna muat naik: **Buku SK@S Salinan Digital.pdf**, *SKPM Kualiti@Sekolah*, Jemaah Nazir Kementerian Pendidikan Malaysia, cetakan pertama 2024, 125 halaman, jenis imej imbasan. Sumber KPM dalam buku tidak diubah dan tidak dianggap sebagai kelulusan hasil audit.

**Jadual 2 (halaman PDF 24–26)**: **115 subaspek**:
- **Kekuatan Kami**: 39 subaspek; 9 aspek A1–A9 (halaman PDF 31–35).
- **Pengurusan Kami**: Standard 1 = 12, Standard 2 = 9, Standard 3 = 21, Standard 4 = 8, jumlah 50.
- **Pencapaian Kami**: Standard 5 = 26 indikator/subaspek.
- **38 aspek kod** dari Standard 1–5 (3 + 7 + 4 + 7 + 7 + 6 + 4). Bilangan aspek *bukan* bilangan subaspek.

**Bab 2 halaman PDF 21–23** menerangkan struktur **Pernyataan Standard, Kriteria Kritikal, Standard Kualiti, dan Tindakan untuk Mencapai Standard (TuMS)**, skor tahap **0–4**, dokumentasi eviden dan tiga komponen. Oleh itu, huraian bukan sekadar nama folder dan bilangan fail eviden **tidak** boleh dianggap markah instrumen.

## Masalah disahkan pada kod GitHub

| Keutamaan | Masalah | Bukti buku | Risiko |
|---|---|---|---|
| P0 | `importZipStandards()` menyimpan placeholder `Tiada huraian dalam ZIP...` | Hal. PDF 40–103 menyediakan Kriteria Kritikal/Standard Kualiti/TuMS | Baris tidak informatif ketika guru memuat naik eviden |
| P0 | Aspek rasmi tiada dalam ZIP: **1.3 PGB Sebagai Pendorong**, **2.7 Permuafakatan Strategik**, **3.1.3 Masa Instruksional**, **3.1.4 Penilaian Murid**, **4.6 Murid Sebagai Pembelajar Aktif** dan lain-lain | Hal. PDF 24–25, 38–103 | Jurang instrumen sebenar tidak kelihatan pada dashboard |
| P0 | Kod **3.3.5** dalam PDF = **Pengurusan Bantuan Pelajaran Murid**, dalam ZIP = **Kesihatan**; 3.3.1/3.3.3/3.3.4/3.3.6/3.3.7 juga bercanggah | Hal. PDF 25, 64, 84–90 | Isi huraian ikut kod sahaja mengaitkan eviden dengan aspek salah |
| P0 | Standard 4 dalam ZIP diklasifikasikan sebagai Perancangan/Pelaksanaan/Pentaksiran/Pembelajaran/Pencerapan; buku ialah **Guru Perancang, Pengawal, Pembimbing, Pendorong, Penilai, Murid Pembelajar Aktif** | Hal. PDF 25, 92–103 | Rujukan guru PdPc tidak selari |
| P0 | Kod Standard 5: **5.2 Kemenjadian Kokurikulum, 5.3 Kemenjadian Sahsiah, 5.4 Pencapaian Guru dan Sekolah** dalam buku tidak sama dengan label ZIP | Hal. PDF 25–26, 106–108 | Kesilapan kategorisasi data murid/guru/sekolah |
| P1 | Sembilan aspek **Kekuatan Kami A1–A9** tidak direka sebagai modul input berstruktur | Hal. PDF 19–20, 24, 31–35 | 39 subaspek inventori/peratus tidak boleh diukur betul |
| P1 | Analisis sistem berdasarkan coverage eviden, tiada penilaian rubrik sebenar **0–4** untuk subaspek berkaitan | Hal. PDF 21–22, 40–103 | Coverage tidak bersamaan prestasi SK@S |
| P1 | Standard 5 bersifat **indikator angka (PBD, GPS, sahsiah, pencapaian)** dan tidak semestinya folder eviden sahaja | Hal. PDF 23, 25–26, 108 | Dashboard tidak dapat kira indikator sebenar |
| P1 | Tautan dan akses Drive mungkin membocorkan maklumat murid/staf jika `ANYONE_WITH_LINK` digunakan untuk fail sulit | Semakan kod repo; **cadangan keselamatan, bukan arahan buku** | Data pendidikan sensitif terdedah |
| P2 | Tiada pengasingan versi instrumen 2024 dan rekod tahun penilaian 2026 | Hal. PDF 4; semakan kod repo | Sejarah dan audit trail tidak konsisten |

**Nota audit:** Kod dan ZIP GitHub boleh diperiksa, tetapi **data sebenar** dalam Google Sheets sekolah belum disahkan per baris. Bilangan rekod sebenar yang kosong/konflik belum boleh dinyatakan. Jangan menganggap semua baris sekolah sama seperti ZIP.

## Pembetulan selamat yang telah dilaksanakan pada GitHub

- `data/skas-book-reference-2024.json` menyimpan **38 aspek** dan **9 kategori Kekuatan Kami**, dengan bilangan subaspek, huraian ringkas **berasaskan Kriteria Kritikal aras aspek**, dan rujukan **halaman PDF**.
- **Pentadbiran → Standard → Rujukan Buku SK@S 2024 dan Audit Padanan** memaparkan data rujukan dalam sistem dan membandingkannya dengan `SYSTEM_BUNDLE.standards`: *SEPADAN / TIADA DALAM SENARAI / KOD SAMA, ASPEK BERCANGGAH*.
- Borang tambah/kemas kini Standard menyediakan butang **Cadang Huraian Buku 2024**. Ia mengisi cadangan ke **borang sahaja** selepas **kod serta nama aspek sepadan**. Ia **tidak** menghantar permintaan update ke Sheets tanpa tindakan Save oleh pentadbir.
- Huraian baharu mempunyai label jelas: `Ringkasan Kriteria Kritikal aras aspek (Buku SK@S 2024, halaman PDF N): ...`. **Bukan** teks lengkap Standard Kualiti / TuMS untuk setiap subaspek.
- Kod yang sama tetapi namanya berbeza (seperti `3.3.5 Kesihatan`) **tidak** diberi huraian daripada aspek lain. Edit asal, eviden, folder Google Drive dan e-Keberadaan kekal.

## Susulan yang masih perlu dibuat

1. **P0** Audit per-baris Google Sheets dengan pengguna admin: eksport `SENARAI STANDARD` serta `EVIDEN` tanpa PIN/token. Sediakan preview padanan dan sandaran sebelum migrasi; **jangan ubah kod melalui prefix semata-mata**.
2. **P0** Transkripsi/semakan menyeluruh semua **115 subaspek** berserta kod individu, teks Standard Kualiti, TuMS, rubrik 0–4 dan halaman sumber daripada dokumen imbasan. Rujukan kini hanya **aras aspek**, bukan entri subaspek penuh.
3. **P1** Re-design model data: `InstrumentVersion → Komponen → Standard → Aspek → Subaspek → Kriteria / TuMS → Eviden → Skor → Semakan`, dengan alias kod lama dan ID stabil.
4. **P1** Bentuk Kekuatan Kami A1–A9 dengan nilai kuantitatif, pembilang/penyebut & peratus; Standard 5 dengan indikator khusus mengikut tahun.
5. **P1** Tambah aliran semakan PPS/Admin, sokongan akses eviden terhad, dan *history* perubahan bagi setiap rekod.
6. **P2** Paparkan berasingan metrik liputan eviden, bilangan item dinilai, skor rubrik dan nilai pencapaian sebenar.

Sumber JSON bukan salinan transkrip penuh PDF kerana dokumen berbentuk imej. Semak teks lengkap pada halaman yang dirujuk sebelum menganggap ringkasan sebagai ayat tepat buku.
