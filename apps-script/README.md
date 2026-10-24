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
