# Backend Google Apps Script — SPES-SK@S 2026

Kod **`Code.gs`** di folder ini ialah penambahbaikan terus daripada fail backend **`Code.gs.js`** yang dibekalkan oleh pemilik sistem. Nama helaian/struktur asas Google Sheets asal dikekalkan. Tiada pangkalan data baharu diperlukan.

**Status:** kod sudah disediakan dalam GitHub; **belum** menggantikan deployment Google Apps Script sedia ada. Anda perlu membuat versi deployment baharu selepas menyimpan salinan dan mengisi Script Properties.

## 1. Persediaan sebelum deploy

1. Buat **salinan sandaran Google Sheets utama** dan backup penuh fail `Code.gs` asal dalam Apps Script.
2. Buka projek Apps Script yang menyediakan endpoint SPES-SK@S sedia ada (bukan skrip e-Keberadaan).
3. Pada **Project Settings → Script Properties**, tambah nilai berikut:

| Script Property | Nilai |
|---|---|
| `SPES_DB_ID` | Spreadsheet ID **PengurusanEvidensSK@S** asal |
| `EKEBERADAAN_DB_ID` | Spreadsheet ID **e-Keberadaan** asal |
| `EKEBERADAAN_WEB_APP_URL` | Pautan Web App e-Keberadaan berakhir dengan `/exec`, sama dengan yang digunakan di frontend |
| `AUTH_BRIDGE_ORIGIN` | Origin laman frontend (contoh `https://kea3123-bit.github.io`), tanpa path. Opsyen tetapi disyorkan. |

Nilai spreadsheet ID tidak dimasukkan dalam kod di repo awam ini. Rujuk salinan fail asal yang anda muat naik.

4. **Gantikan kandungan fail `Code.gs` asal dengan SEMUA kandungan** `apps-script/Code.gs`. Jangan tampal di hujung fail lama kerana fungsi `doPost`/lain-lain akan bertindih.
5. Jika menggunakan `clasp`, fail `appsscript.json` di sini mempunyai tetapan runtime V8 dan scopes yang diperlukan. Dalam editor Apps Script, manifest asal boleh dikekalkan jika sudah mempunyai kebenaran sesuai.
6. Uji **pengesahan server-to-server e-Keberadaan** pada deployment ujian sebelum menggantikan deployment produksi: `UrlFetchApp.fetch` mestilah boleh mencapai Web App e-Keberadaan, dan endpoint `bridge=1` perlu mengembalikan JSON untuk kaedah `getBootstrapData` apabila token sesi e-Keberadaan yang sah dihantar. Ini menggunakan fungsi sedia ada daripada fail `Bridges.gs` dalam ZIP asal — **jangan edit/deploy semula e-Keberadaan jika ia sudah berfungsi**. Jika muncul HTML login Google atau ralat origin, semak URL/deployment dan `AUTH_BRIDGE_ORIGIN` di projek SK@S dahulu. **Tiada bypass PIN/role yang selamat**.
7. **Deploy → Manage deployments → Edit (pensel) → Version: New version → Deploy.** Semak URL `/exec` kekal sama. Jika URL baharu, kemas kini `SPES_API_URL` dalam `index.html` dan deploy frontend.
8. Uji login sebagai **USER** dan **ADMIN**, baca Senarai Standard, muat naik pautan percubaan, kemas kini eviden sendiri, lihat dashboard, dan pastikan USER tidak boleh memadam melalui permintaan API terus.

## Kenapa perubahan ini dibuat selepas rollback e-Keberadaan

ZIP **apps-script.zip** e-Keberadaan (modular) sudah memiliki fungsi `loginWithPin` dan `getBootstrapData` dalam whitelist `Bridges.gs`. `loginWithPin` mendaftarkan/memperbaharui peranti dipercayai. SK@S tidak sepatutnya memanggilnya lagi apabila pengguna sudah login pada frontend.

**Aliran yang disyorkan:**

1. Frontend SK@S → e-Keberadaan: `loginWithPin(email,PIN)` **sekali** dan menerima token sesi.
2. Frontend SK@S → backend SK@S: `auth_exchange(email,ekeToken)`. PIN tidak dihantar semula.
3. Backend SK@S → e-Keberadaan: `getBootstrapData(ekeToken)` melalui bridge `perf-burst`; menerima identiti sah.
4. Backend SK@S menyemak identiti dengan `PENGGUNA` dalam Google Sheets dan mengeluarkan sesi terhad SK@S.

**Ujian penting:** Jangan log atau cetak token/PIN. Panggilan `getBootstrapData` ialah API read/bootstrap e-Keberadaan, tetapi kod e-Keberadaan mungkin turut menjalankan housekeeping/trigger sendiri. Periksa output dan ujian login sebenar sebelum naik taraf Apps Script SK@S produksi.

## 2. API yang digunakan oleh frontend

| Action | Hak akses / tujuan |
|---|---|
| `auth_exchange` | Pertukaran token sesi e-Keberadaan yang telah disahkan; panggil `getBootstrapData` melalui bridge server-to-server tanpa PIN atau pendaftaran peranti baharu; padankan PENGGUNA aktif; pulangkan `authToken` SK@S 4 jam |
| `auth_login` | Tidak digunakan, dipulangkan `USE_AUTH_EXCHANGE`; elakkan login PIN dua kali yang mengganggu peranti e-Keberadaan |
| `auth_logout` | Padam cache token |
| `get_bundle` | Semua pengguna sah; tahun aktif daripada SETTING, bukan disekat pada 2026 |
| `save_eviden` | Semua pengguna sah; server pilih nama/email/tahun sebenar, validasi Standard–Aspek–Item dan PDCA |
| `update_eviden` | Pemilik eviden atau Admin; kemas kini metadata/pautan, bukan muat naik fail gantian |
| `delete_eviden` | Admin sahaja; padam rekod Sheet, **tidak padam fail Drive** |
| `update_settings` | Admin sahaja |
| `save/update/delete_{jawatankuasa,standard,pps,checklist}` | Admin sahaja |

Frontend semasa menyokong kedua-dua backend: pada versi lama, login melalui e-Keberadaan diteruskan seperti sebelumnya; selepas anda deploy backend baharu, frontend akan melakukan pertukaran token secara automatik. **Pengesahan keselamatan yang kukuh hanya bermula setelah backend baharu dideploy.**

## 3. Perlindungan dan data sedia ada

- Dilarang panggilan HTTP `init_system` dan `populate_master`. Kod lama boleh `clear()` data penting dan hanya menyenaraikan 52 item dalam fungsi populasi; ia tidak patut dijadikan instrumen lengkap tanpa semakan.
- Struktur nama `SETTING`, `SENARAI STANDARD`, `SENARAI PPS`, `SENARAI SEMAK`, `JAWATANKUASA SK@S`, `EVIDEN` dan `PENGGUNA` kekal.
- 13 lajur pertama `EVIDEN` kekal. Sistem menambah **lajur ke-14 `Pemuat Email`** bagi rekod baharu sahaja untuk pemilikan yang lebih tepat. Rekod lama masih menggunakan padanan nama pemuat naik (perlu disemak jika ada nama guru sama).
- File eviden baharu dimasukkan ke folder Drive daripada tetapan dan **tidak** dikongsi secara automatik kepada `ANYONE_WITH_LINK`. Pentadbir perlu mengurus kebenaran guru/pemantau sendiri.
- Fail lebih 15 MB ditolak. Dokumen yang menggunakan pautan mesti `https://`.
- Sesi disimpan sementara di `CacheService` selama 14,400 saat (4 jam); tamat tempoh memerlukan login semula. Jangan menyimpan PIN di Script Properties, GitHub, atau log.
- ID rekod baharu `EVD-TAHUN-<random>` untuk mengelakkan ID berulang selepas operasi padam.
- Peranan pentadbir dirujuk dari lajur `Pentadbir` dan status dari `Aktif` dalam PENGGUNA untuk setiap permintaan authenticated.
- `get_bundle` tidak membekalkan direktori penuh e-mel pengguna kepada peranan USER.
- Frontend boleh mengemas kini tajuk, catatan, PDCA, jenis dan pautan eviden dengan backend v3.

## 4. Had yang masih perlu disemak

- **Keserasian e-Keberadaan server-to-server belum dapat diuji secara live** tanpa akaun sebenar. ZIP e-Keberadaan yang diterima mengandungi `Bridges.gs` dengan laluan `getBootstrapData`, `perf-burst` dan whitelist origin yang diperlukan. Jangan edit kod e-Keberadaan; pastikan deployment lamanya masih mengandungi fungsi ini. Jika gagal, batalkan deployment SK@S terbaharu dan periksa output ralat sebelum membuat perubahan lanjut.
- **Elakkan pendaftaran peranti kedua:** SK@S dahulu memanggil `loginWithPin` dua kali (frontend dan backend), yang boleh menambah peranti baharu lalu menggantikan peranti dipercayai sedia ada. Versi ini menukar token login asal, bukan login semula.
- Apps Script Web App perlu dipasang oleh akaun yang mempunyai akses ke **kedua-dua spreadsheet** dan folder Drive eviden. `Script Properties` adalah **per projek**, bukan sebahagian daripada fail GitHub.
- Backend menerima standard daripada helaian `SENARAI STANDARD`. **Kod ini tidak mencipta automatik semua 115 subaspek rasmi** dan tidak menggantikan instrumen Buku SK@S.
- Muat naik binari 15 MB melalui JSON base64 tertakluk pada had Apps Script sebenar; uji fail besar.
- Kawalan edit bagi rekod lama yang tiada emel pemuat naik menggunakan padanan nama; admin boleh mengurus konflik nama secara manual.
- Fail Drive asal tidak dipadam jika rekod eviden dibuang; ini disengajakan untuk mengurangkan kehilangan data tidak sengaja.

## 5. Ujian repo

```bash
node --test tests/skas-smoke.test.mjs apps-script/backend.test.mjs
```

Rujukan audit asal: [SKAS_2026_AUDIT.md](../docs/SKAS_2026_AUDIT.md).

## 6. Semak sambungan e-Keberadaan tanpa ganggu peranti

**Untuk ZIP `apps-script(1).zip` yang anda berikan:** struktur dan kandungan fail adalah **serupa dengan ZIP `apps-script.zip` sebelumnya** (24 fail `.gs`, semua lulus pemeriksaan sintaks). Versi modul semasa menyokong:

- `loginWithPin(email,pin,clientInfo,deviceCredential)`: frontend SK@S memanggil sekali.
- `getBootstrapData(token)`: backend SK@S mengesahkan token akses sedia ada; ia menggunakan `requireSessionUser_` dan tidak mendaftar peranti baharu.
- `Bridges.gs`: `perf-burst` membalas JSON, membenarkan `getBootstrapData`, dan menerima origin lalai `https://kea3123-bit.github.io`.
- `PENGGUNA`: lajur `Aktif`, `Nama`, `Emel`, `Pentadbir` sepadan dengan kod SK@S.

**Jangan tambah 24 fail e-Keberadaan ke dalam projek SK@S.** Kedua-dua Apps Script adalah projek berasingan.

### Diagnostik tanpa PIN

1. Dalam projek **Apps Script SK@S**, tambah fail baharu bernama `Diagnostics` daripada `apps-script/Diagnostics.gs` (atau gunakan `clasp` jika anda sudah sync repo).
2. Pastikan `SPES_DB_ID`, `EKEBERADAAN_DB_ID`, `EKEBERADAAN_WEB_APP_URL`, `AUTH_BRIDGE_ORIGIN` sudah ditetapkan dalam Script Properties **SK@S**.
3. Dalam editor Apps Script SK@S, pilih fungsi `diagnoseSKASConnection` dan klik **Run**.
4. Buka **Execution log**. Cari `ok:true` dan semua `checks[].ok:true`. Tiada PIN, token, ID folder, atau URL penuh akan muncul dalam log. Skrip memeriksa sambungan bacaan ke helaian dan menghantar `__ping__` ke bridge e-Keberadaan sahaja.
5. Jika `EKE_BRIDGE_PING` gagal kerana origin, semak bahawa tetapan `EK_PAGES_ORIGINS` atau `EK_PAGES_ORIGIN` dalam projek e-Keberadaan yang sedang deploy membenarkan origin `https://kea3123-bit.github.io`. *Jangan ubah e-Keberadaan kecuali benar-benar perlu;* versi ZIP menyertakan origin ini dalam nilai lalai.
6. Selepas diagnostik berjaya, uji login sebenar seorang pengguna di SK@S pada deployment ujian. Diagnostik `__ping__` tidak dapat mengesahkan token pengguna dan **tidak menjamin keseluruhan login berjaya**.

### Nota asal ZIP

`getBootstrapData` menjalankan logik e-Keberadaan termasuk semakan sesi, penyediaan sejarah jadual asas dan semakan trigger perkhidmatan Keberadaan. Ia **bukan** fungsi baca-tanpa-kesan sampingan sepenuhnya. Diagnostik di atas sengaja menggunakan `__ping__` sahaja. Login sebenar SK@S masih menggunakan `getBootstrapData` kerana ia satu-satunya kaedah bootstrap token yang tersedia tanpa mengubah kod e-Keberadaan.

## 7. Ralat “Sesi tidak sah atau tamat” semasa login SK@S

Sekiranya frontend telah diset kepada `auth_exchange` tetapi Apps Script **SK@S** yang sedang deploy masih menggunakan `auth_login` (kod sebelum PR #3), tindakan `auth_exchange` akan jatuh ke `verifySession_` pada backend lama dan memulangkan `AUTH_REQUIRED` / “Sesi tidak sah atau tamat”. Ini **bukan semestinya tanda PIN atau sesi e-Keberadaan gagal**; ia adalah **versi frontend/backend tidak sepadan**.

Semak fail `Code.gs` projek **SK@S** (BUKAN projek e-Keberadaan): ia mesti mengandungi `if (action==="auth_exchange") return authExchange_(params);` dan fungsi `authExchange_(p)`. Salin kod `apps-script/Code.gs` terkini, simpan, kemudian **Deploy > Manage deployments > Edit > New version > Deploy** (atau redeploy endpoint `/exec` yang sedang digunakan oleh frontend). Semak bahawa URL `SPES_API_URL` dalam frontend menuju ke deployment itu, bukan deployment lama.

Dalam versi baharu, semak halaman endpoint SK@S `/exec` melalui pelayar: ia memulangkan JSON dengan `version:"3.1"` dan `authMode:"auth_exchange"`. `get_version` melalui POST juga tersedia tanpa login, tidak mengeluarkan data dalaman dan tidak mengubah Sheets.

**Jangan reset PIN, ubah Apps Script e-Keberadaan, atau jalankan populate_master untuk menyelesaikan masalah versi ini.** Setelah dua versi sepadan, barulah uji `getBootstrapData(ekeToken)` dengan sesi sebenar. Jangan kongsikan token atau PIN dalam tangkap layar/log.
