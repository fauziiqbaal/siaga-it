---
name: hotel-qc-opening
description: Specialized domain knowledge, architectural guidelines, and workflows for developing Siaga IT (IT Operations & Engineering) Pre-Opening & Live Readiness applications for Multi-Building Coliving / Kost-kostan (Rukita-style, 15-day onboarding cycle). Covers rapid property setup, Wi-Fi speedtests in rooms & communal areas, CCTV potential spots, Android/Cable TV checks, and Smartlock/Access Gate verification.
---

# Siaga IT — Coliving & Kost Pre-Opening Specialist (Rukita Model)

This skill guides the design, workflows, and standards for the **Siaga IT Coliving Opening & QC Checklist** application.

---

## 1. Domain Context: Multi-Building Coliving (Rukita Model)

Unlike single luxury hotels, coliving networks (such as Rukita.co) expand rapidly:
- **Onboarding Velocity**: A new property / building goes live every ~15 days.
- **Property Size**: Typically 15 to 45 rooms across 2 to 4 floors.
- **Spaces**:
  - Private Bedrooms (Marked strictly by Room Number, TV Availability `hasTv`, and Lock Type `hasSmartlock` — avoid marketing room types).
  - Shared Communal Areas (Pagar & Gerbang Utama, Dapur Bersama, Communal Lounge / Co-working, Rooftop / Area Jemur, Area Parkir Motor).

---

## 2. The 4 Operational IT Pillars for Coliving

### 1. Multi-Building Setup & Onboarding
- Rapid generation of new properties (Name, Address, Floors, Rooms per Floor, Communal Spaces).
- Instant checklist provisioning.

### 2. Internet & Wi-Fi Check
- **Bedrooms**: Test download/upload speed (Target >= 15 Mbps in every bedroom corner for tenant WFH stability).
- **Communal Areas**: Test Wi-Fi in Dapur Bersama, Communal Lounge, and Rooftop.
- Fast toggle: `PASS` (OK) or `FAIL` (Drop) with inline Mbps input.

### 3. CCTV at Potential Spots
- Focused on safety & surveillance:
  1. CAM 01 - Pagar Luar & Gerbang Masuk
  2. CAM 02 - Area Parkir Motor / Kendaraan
  3. CAM 03 - Pintu Entrance / Foyer Tamu
  4. CAM 04 - Dapur Bersama
  5. CAM 05/06 - Koridor Kamar Tiap Lantai
  6. CAM 07 - Tangga Akses & Rooftop
- Fast toggle: `ONLINE & REKAM` vs `OFFLINE / MATI`.

### 4. TV (Android TV / Google TV / Cable TV)
- Master rooms and Communal Lounges often have Android TV or Google TV.
- Standard: "Possible untuk ditonton atau tidak" (Aplikasi YouTube/Netflix jalan, remote berfungsi, atau N/A jika kamar tipe biasa tanpa TV).

### 5. Smartlock & Access Gate
- Pagar Depan / Gerbang Masuk: RFID Card + PIN Keypad / Magnetic Lock.
- Rooftop / Area Khusus: Smartlock handle / Access controller.
- Kamar Kost: Regular physical keys ("Kunci Biasa") or Smartlock.
- Fast toggle: `OK` vs `MACET / ERROR`.

---

## 3. General Vendor Tracking
Vendor data is kept simple and general:
- ISP (Biznet / Indihome / MyRepublic)
- Smartlock (Bardi / Tuya / Salto / Teknisi Kunci)
- CCTV (Hikvision / Dahua / Teknisi CCTV)
- Internal IT Field Ops

---

## 4. UI/UX Principles
- **No Bloat, No Generic AI Glow**: Simple, clean, dark/light Zinc theme.
- **Fast 1-Click Operations**: Field IT engineers walk through buildings with phone/tablet and tap once to pass/fail.
