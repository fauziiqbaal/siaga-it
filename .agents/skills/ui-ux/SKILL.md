---
name: ui-ux
description: Panduan UI/UX aplikasi Siaga IT untuk teknisi lapangan (HP, tablet, desktop) dan laporan cetak A4. Dipakai saat mendesain layar baru, tombol QC cepat, sheet, tabel, atau laporan PDF.
---

# UI/UX — Siaga IT (alat kerja lapangan, bukan landing page)

Prinsip: **cepat dipakai sambil berdiri di koridor gedung**. Satu tangan memegang
HP, satu tangan memegang tangga. Tidak ada animasi dekoratif, tidak ada glow,
tidak ada ikon hiasan di alur utama.

---

## 1. Token visual

- Tema default **gelap** (`zinc-950`), aksen tunggal **biru** (`bg-blue-600`) untuk
  aksi utama. Status memakai warna semantik: hijau (lulus), rose (gagal), amber
  (belum), abu (N/A).
- Permukaan: `bg-card` + `border-border`, radius `rounded-xl` (kartu) dan
  `rounded-lg` (tombol/input). Tanpa shadow tebal.
- Tipografi kecil tapi tegas: judul `text-sm font-semibold`, isi `text-[11px]`,
  metadata `text-[10px] text-muted-foreground`. Angka memakai `font-mono`.
- Kontras: teks sekunder minimal `--muted-foreground` (bukan abu transparan).

---

## 2. Ukuran & interaksi

- Target sentuh minimal **38px** (`min-h-[38px]`), tombol QC minimal 32–36px.
- Satu layar = satu tugas. Navigasi utama hanya 5 tab: Gedung, Pre-Opening,
  Opening, Skor, Lain.
- Toggle uji wajib 1 ketuk: `Lulus | Gagal | Belum | N/A` (Segmented, bukan dropdown).
- Input angka: `inputMode="numeric"`, tanpa spinner.
- Form panjang memakai `Sheet` (bottom sheet di HP, dialog di desktop); tombol
  simpan menempel di footer sheet.
- Tombol back HP menutup sheet / kembali ke tab sebelumnya, **tidak** keluar aplikasi.

---

## 3. Pola layar per fase

1. **Onboarding (belum ada properti)** — satu kartu: nama, alamat, lantai, kamar
   per lantai, target live, TV/smartlock, template QC. Ditutup dengan satu tombol
   besar "Buat gedung & mulai QC" + info penyimpanan.
2. **Setup Gedung** — kartu ringkas (lantai/kamar/skor), daftar gedung, identitas
   & jadwal, lantai + chip kamar (`101`, `102`, …), billing ISP.
3. **Pre-Opening** — skor besar di atas, lalu tab seksi: Wi-Fi, CCTV, TV, Lock,
   Aset, Billing, Kendala. Daftar endpoint (kamar/area) dengan baris status.
4. **Opening** — SSID standar, perangkat, akun/takeover, billing, serah terima.
5. **Skor** — ringkasan dua lembar penilaian, lalu **pratinjau dokumen A4**.

---

## 4. Laporan cetak (A4)

- Dokumen memakai tabel HTML biasa, bukan grid kartu.
- Status ditulis **LULUS/GAGAL/BELUM/N/A**, jangan hanya warna (harus terbaca
  saat dicetak hitam-putih).
- Penanda fasilitas memakai huruf yang sama di kamar dan area bersama:
  `W` Wi-Fi, `T` TV, `L` Smartlock/akses, `–` tidak ada. Selalu tampilkan
  `FacilityLegend` di dekat daftar kamar/area supaya teknisi baru paham.
- `@page { size: A4 portrait; margin: 8mm }`; header dokumen jangan memakai tag
  `<header>` karena CSS cetak global menyembunyikan `header/nav/aside`.
- `thead` diulang tiap halaman (`display: table-header-group`), baris tidak boleh
  terpotong (`break-inside: avoid`).
- Bagian dokumen: identitas → ringkasan skor → tabel pilar → blocker → hasil uji
  kamar → area bersama → CCTV → perangkat → billing → kendala. (Tanpa blok tanda
  tangan: berita acara serah terima ditandatangani terpisah.)
- Tombol "Cetak / PDF" memakai `window.print()`; semua elemen interaktif diberi
  `print:hidden`.

---

## 5. Copywriting

- Bahasa Indonesia, kalimat perintah, tanpa emoji di alur fase.
- Sebut angka nyata: "23/23 titik lulus", bukan "semua baik".
- Jika data belum ada, tulis apa adanya: "Belum ada kamar", "Belum diuji".
- Jangan menyebut fitur yang tidak ada. Lebih baik kalimat pendek dan jujur.

---

## 6. Checklist review UI

- [ ] Bisa dipakai di 375px tanpa scroll horizontal.
- [ ] Semua tombol ≥ 38px dan punya label teks (bukan ikon saja).
- [ ] Refresh tidak menghilangkan isian; status "tersimpan" terlihat.
- [ ] Kondisi kosong punya ajakan aksi yang jelas.
- [ ] Warna status konsisten di semua fase dan di PDF.
- [ ] `npm run shots:app` menghasilkan tangkapan layar yang enak dibaca.
