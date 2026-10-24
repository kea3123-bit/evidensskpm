# Audit & penambahbaikan SPES-SK@S 2026

**Skop:** Frontend repo `kea3123-bit/evidensskpm` — bukan pengganti aplikasi rasmi idMe KPM.

## Bahan yang dinilai

1. **Buku SK@S Salinan Digital.pdf** (125 halaman; cetakan pertama 2024): instrumen rujukan SKPM Kualiti@Sekolah. Kandungan membezakan komponen Kekuatan Kami, Pengurusan Kami dan Pencapaian Kami, serta menghuraikan Standard 1–5, Standard 3.1–3.3 dan item yang berkaitan. Rujukan untuk taksonomi penilaian.
2. **Buku_Panduan_Pengguna_SPES-SKAS (3).pdf** (39 halaman; September 2026): Bab 4–15 menentukan aliran kerja sistem sokongan, tahun aktif, hak akses, item eviden, PDCA, carian, cetakan, pengguna dan operasi.
3. **SKAS_MASTER_FOLDER_2026.zip:** 12 folder induk, laluan standard serta sokongan. Semua fail arkib ialah placeholder `.keep` bersaiz sifar; **TIADA dokumen eviden sebenar dan TIADA senarai huraian item rasmi dalam ZIP ini**.
4. **Repo Github:** hanya `index.html`. Google Apps Script yang menyediakan `get_bundle`, `save_eviden` dan lain-lain tidak berada di repo.

## Dibina pada branch ini

- Senarai Eviden: **Standard → Item**, fasa PDCA, pemuat naik, carian ID/tajuk/aspek/huraian/catatan, reset, refresh dan kaunter hasil.
- Modal perincian eviden: ID, tahun, standard, item, aspek, huraian, jenis, PDCA, catatan, pemuat naik dan pautan/fail.
- Dashboard liputan item berdasarkan *SENARAI STANDARD* yang diterima daripada backend, serta pecahan mengikut pemuat naik. **Liputan bukan skor pematuhan atau taraf rasmi.**
- Sekatan pemadaman frontend kepada Admin sahaja; dialog pengesahan sebelum padam; semakan respons berjaya/gagal.
- Validasi muat naik: sekurang-kurangnya satu PDCA dan Jenis Eviden, standard/aspek/item sah, tepat satu kaedah (URL **atau** fail), had fail 15 MB dan URL HTTPS.
- Tahun aktif dihantar oleh bundle backend, bukan nilai literal 2026 dalam permintaan frontend; rekod tahun terdahulu tidak dipaparkan dalam analisis aktif.
- Indeks 12 folder induk ZIP dengan carian dan butang salin laluan (bukan operasi mencipta folder Drive).
- Paparan **38 aspek rasmi** daripada Jadual 2 Buku SK@S (PDF fizikal halaman 24–26) serta perbandingan kod dan label folder ZIP yang tiada/tidak sepadan.
- UI telefon: menu sisi responsif serta tetapan cetakan A4.
- Teks daripada Google Sheets dikodkan sebelum paparan di jadual/modal dan penapis pautan bukan HTTPS.
- Ujian `node --test` untuk sintaks, kawalan penting dan penapisan tahun.

## Penemuan ketidakpadanan ZIP asal dengan instrumen rasmi

Buku SK@S Jadual 2 (halaman fizikal PDF 24–26 / bercetak 11–13) menyatakan **115 subaspek keseluruhan**, termasuk komponen Kekuatan Kami. Ia **bukan** sekadar jumlah folder Standard 1–5.

| Bidang | Ketidakpadanan ZIP asal |
|---|---|
| Standard 1 | Tiada **1.3 PGB Sebagai Pendorong**. |
| Standard 2 | Tiada **2.7 Permuafakatan Strategik**. |
| Standard 3.1 | Tiada **3.1.3 Pengurusan Masa Instruksional** dan **3.1.4 Pengurusan Penilaian Murid**. |
| Standard 3.2 | Nombor 3.2.1–3.2.4 berlabel berbeza daripada instrumen; tiada 3.2.5–3.2.7. |
| Standard 3.3 | Beberapa label 3.3.1–3.3.7 berbeza daripada instrumen, termasuk ketetapan HEM dan pentaksiran psikometrik. |
| Standard 4 | Kod/label 4.1–4.5 tidak sepadan dengan peranan Guru; tiada **4.6 Murid Sebagai Pembelajar Aktif**. |
| Standard 5 | 5.1–5.4 sepatutnya akademik, kokurikulum, sahsiah, serta pencapaian guru & sekolah. |
| Kekuatan Kami | Aspek A1–A9 tidak wujud sebagai kategori induk dalam ZIP asal. |

Struktur baharu yang disemak dibuat sebagai ZIP berasingan (placeholder sahaja), tidak mengubah atau memadam arkib pengguna. Rujukan item terperinci masih perlu dipastikan daripada SENARAI STANDARD dan dokumen rasmi.

## Perlu diuji pada backend Google Apps Script (belum termasuk dalam repo)

1. **Keserasian GET BUNDLE:** Endpoint `get_bundle` perlu membaca Tahun Penilaian Aktif dari helaian SETTING jika `tahun` tidak dihantar, dan menghantar `activeYear`, `settings`, `standards`, `eviden`. Jika implementasi memerlukan parameter, naik taraf backend dahulu atau sesuaikan kontrak ini sebelum merge.
2. **Pengesahan keselamatan wajib di server:** API mutasi mesti mengesahkan sesi/identiti yang dipercayai, tidak boleh menerima `pemuatNaik`, `role` atau email semata-mata dari klien. Frontend bukan kawalan keselamatan yang mencukupi.
3. **Pemilikan dan hak akses:** Guru boleh mengemas kini eviden sendiri sahaja; hanya ADMIN/SUPER ADMIN boleh padam dan urus pengguna/standard/PPS/setting. Semak setiap action backend, termasuk `delete_eviden`.
4. **Ciri edit eviden:** Panduan Bab 10 menjelaskan kemas kini eviden, tetapi kontrak `update_eviden` tidak dapat disahkan kerana backend tiada dalam repo. Tiada tindakan edit baharu diaktifkan bagi mengelak panggilan API yang tidak diketahui.
5. **Tahun baharu:** Uji pertukaran SETTING 2026 → 2027 dengan data 2026 dikekalkan; reset penapis dan semak rekod tahun baharu.
6. **Google Drive:** Folder ZIP tidak automatik menjadi folder Drive. Perlu proses import/cipta folder Drive secara berasingan, kemudian set ID root folder kepada SETTING.
7. **Kesahan standard:** Item dan huraian rasmi mesti diterbitkan ke helaian `SENARAI STANDARD`; nama folder ZIP tidak boleh digunakan sebagai pengganti huraian rasmi 115 subaspek.
8. **Cetakan:** Uji A4, orientasi portrait, saringan, dan pautan dokumen dengan akaun pemantau selain pemilik.

## Perbezaan yang tidak boleh disalah anggap

- **SPES-SK@S ialah indeks & repositori dalaman**. Pengisian dan penilaian rasmi kekal dalam Aplikasi Institusi idMe (Panduan halaman 2, 4–5).
- **Satu eviden boleh mencatat lebih daripada satu fasa PDCA** (Panduan halaman 10–11, 23), jadi kiraan fasa tidak semestinya menjumlah kepada bilangan rekod.
- **Bilangan eviden bukan ukuran tunggal kualiti**. Semak kualiti/akses serta tindakan CHECK dan ACTION (Panduan halaman 10–11, 31).
- **ZIP ialah templat struktur**, bukan set data skor SK@S dan bukan eviden yang telah dimuat naik.

## Jalankan ujian

```bash
node --test tests/skas-smoke.test.mjs
```

## Kriteria penerimaan sebelum gabung ke main

- Login akaun guru dan akaun Admin benar-benar dapat memuat data daripada kedua-dua Apps Script.
- SENARAI STANDARD dipaparkan lengkap; penapis 1 → 1.1.x, 3.1 → 3.1.x dan sebagainya menggunakan data sebenar.
- Pautan HTTPS, had 15 MB, peringatan URL XOR fail, dan respons simpan diuji.
- Guru tiada butang padam; backend juga menolak cubaan memadam melalui POST manual.
- Penukaran tahun tidak memadam arkib tahun terdahulu.
- Ujian Node lulus dan paparan desktop/telefon/A4 diperiksa.
