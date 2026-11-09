"""
Siaga IT — static server + JSON state API (tanpa dependency).

Aplikasi menyimpan data di localStorage (per browser). Supaya tim bisa membuka
dari HP/laptop lain di jaringan kantor tanpa database, serve.py menambahkan:

  GET  /api/health          -> status server + ringkasan jumlah gedung
  GET  /api/state           -> snapshot terakhir (204 kalau belum ada)
  PUT  /api/state           -> gabung snapshot per id gedung (tidak menghapus apa pun)
  PUT  /api/buildings/{id}  -> simpan SATU gedung + kendala gedung itu (409 kalau revisi basi)
  DELETE /api/buildings/{id} -> hapus satu gedung + kendala gedung itu

Setiap gedung menyimpan `rev` yang dinaikkan server pada tiap simpan. Klien
mengirim `baseRev` (revisi yang terakhir ia lihat). Kalau server sudah punya
revisi lebih baru, server menjawab 409 beserta versi terbarunya, sehingga
perubahan teknisi lain di gedung yang sama tidak tertimpa diam-diam — dan
perubahan pada properti lain tidak pernah tersentuh.

Jalankan:
  python serve.py                  # static + API di port 5173
  PORT=8080 python serve.py        # ganti port
  API_PORT=8790 python serve.py    # API tambahan untuk `npm run dev` (proxy Vite)

Catatan keamanan: ini alat internal LAN, tanpa login. Jangan expose ke internet.
"""

import json
import os
import subprocess
import sys
import tempfile
import threading
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(BASE_DIR, "dist")
DATA_DIR = os.environ.get("DATA_DIR", os.path.join(BASE_DIR, "data"))
DATA_FILE = os.path.join(DATA_DIR, "siaga-it.json")
UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)
PORT = int(os.environ.get("PORT", 5173))
API_PORT = int(os.environ.get("API_PORT", 8790))
MAX_BODY = 15 * 1024 * 1024  # 15 MB, cukup untuk upload foto resolusi tinggi
SYNC_VERSION = 3  # v3: gedung punya `rev` + endpoint simpan/hapus per gedung
_STATE_LOCK = threading.Lock()  # read-modify-write harus serial antar request


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def read_state():
    if not os.path.exists(DATA_FILE):
        return None
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as handle:
            data = json.load(handle)
        if not isinstance(data, dict) or not isinstance(data.get("buildings"), list):
            return None
        return data
    except (OSError, ValueError) as error:
        print(f"[api] gagal membaca {DATA_FILE}: {error}")
        return None


def write_state(payload: dict):
    os.makedirs(DATA_DIR, exist_ok=True)
    state = read_state() or {}
    users = payload.get("users")
    if users is None:
        users = state.get("users") or []
    evidence = payload.get("evidence")
    if evidence is None:
        evidence = state.get("evidence") or []

    snapshot = {
        "app": "siaga-it",
        "version": SYNC_VERSION,
        "savedAt": now_iso(),
        "buildings": payload.get("buildings") or [],
        "issues": payload.get("issues") or [],
        "users": users,
        "evidence": evidence,
    }
    handle, temp_path = tempfile.mkstemp(dir=DATA_DIR, suffix=".tmp")
    with os.fdopen(handle, "w", encoding="utf-8") as temp:
        json.dump(snapshot, temp, ensure_ascii=False)
        temp.flush()
        os.fsync(temp.fileno())

    # Simpan versi sebelumnya sebagai .bak (undo manual satu langkah).
    if os.path.exists(DATA_FILE):
        try:
            os.replace(DATA_FILE, DATA_FILE + ".bak")
        except OSError:
            pass
    os.replace(temp_path, DATA_FILE)
    return snapshot


def _state_parts():
    """Gedung, kendala, user & bukti dari disk (selalu list of dict, aman dari payload rusak)."""
    state = read_state() or {}
    buildings = [b for b in (state.get("buildings") or []) if isinstance(b, dict) and b.get("id")]
    issues = [i for i in (state.get("issues") or []) if isinstance(i, dict)]
    users = [u for u in (state.get("users") or []) if isinstance(u, dict) and u.get("id")]
    evidence = [e for e in (state.get("evidence") or []) if isinstance(e, dict) and e.get("id")]
    return state, buildings, issues, users, evidence


def _rev_of(item) -> int:
    try:
        return int((item or {}).get("rev") or 0)
    except (TypeError, ValueError):
        return 0


def issues_of_building(issues, building_id):
    return [i for i in issues if i.get("buildingId") == building_id]


def upsert_building(building_id, building, issues, base_rev, force=False):
    """
    Simpan SATU gedung (+ kendala gedung itu) tanpa menyentuh gedung lain.

    return (status_http, body). 409 kalau `base_rev` tidak sama dengan revisi
    server — klien lalu memutuskan sendiri (menimpa dengan `force` atau tarik).
    """
    with _STATE_LOCK:
        state, buildings, all_issues, *_ = _state_parts()
        existing = next((b for b in buildings if b.get("id") == building_id), None)
        current_rev = _rev_of(existing)

        if existing is not None and not force and isinstance(base_rev, int) and base_rev != current_rev:
            return 409, {
                "ok": False,
                "conflict": True,
                "rev": current_rev,
                "savedAt": state.get("savedAt"),
                "building": existing,
                "issues": issues_of_building(all_issues, building_id),
            }

        stamped = dict(building)
        stamped["id"] = building_id
        stamped["rev"] = current_rev + 1
        stamped["updatedAt"] = now_iso()

        next_buildings = [b for b in buildings if b.get("id") != building_id]
        next_buildings.append(stamped)

        if issues is None:
            # Klien lama tidak mengirim kendala -> jangan hapus apa pun.
            next_issues = list(all_issues)
        else:
            next_issues = [i for i in all_issues if i.get("buildingId") != building_id]
            next_issues.extend(
                [i for i in issues if isinstance(i, dict) and i.get("buildingId") == building_id]
            )

        snapshot = write_state({"buildings": next_buildings, "issues": next_issues})
        return 200, {
            "ok": True,
            "rev": stamped["rev"],
            "updatedAt": stamped["updatedAt"],
            "savedAt": snapshot["savedAt"],
            "buildings": len(snapshot["buildings"]),
        }


def delete_building(building_id, force=False, base_rev=None):
    """Hapus satu gedung + kendalanya. Gedung lain tidak tersentuh."""
    with _STATE_LOCK:
        state, buildings, all_issues, *_ = _state_parts()
        existing = next((b for b in buildings if b.get("id") == building_id), None)
        if existing is None:
            return 200, {"ok": True, "deleted": False, "savedAt": state.get("savedAt")}

        current_rev = _rev_of(existing)
        if not force and isinstance(base_rev, int) and base_rev != current_rev:
            return 409, {
                "ok": False,
                "conflict": True,
                "rev": current_rev,
                "savedAt": state.get("savedAt"),
                "building": existing,
                "issues": issues_of_building(all_issues, building_id),
            }

        snapshot = write_state(
            {
                "buildings": [b for b in buildings if b.get("id") != building_id],
                "issues": [i for i in all_issues if i.get("buildingId") != building_id],
            }
        )
        return 200, {
            "ok": True,
            "deleted": True,
            "savedAt": snapshot["savedAt"],
            "buildings": len(snapshot["buildings"]),
        }


def merge_state(payload: dict):
    """
    Gabung snapshot utuh per id gedung (dipakai backup/klien lama & curl).
    """
    force = payload.get("force") is True
    with _STATE_LOCK:
        _, buildings, all_issues, existing_users, existing_evidence = _state_parts()

        by_id = {b.get("id"): b for b in buildings}
        for incoming in payload.get("buildings") or []:
            if not isinstance(incoming, dict) or not incoming.get("id"):
                continue
            building_id = incoming["id"]
            current = by_id.get(building_id)
            current_rev = _rev_of(current)
            incoming_rev = incoming.get("rev")
            take = (
                current is None
                or force
                or not isinstance(incoming_rev, int)
                or incoming_rev > current_rev
            )
            if not take:
                continue
            stamped = dict(incoming)
            stamped["rev"] = current_rev + 1
            stamped["updatedAt"] = now_iso()
            by_id[building_id] = stamped

        issues_by_id = {i.get("id"): i for i in all_issues if i.get("id")}
        for incoming in payload.get("issues") or []:
            if isinstance(incoming, dict) and incoming.get("id"):
                issues_by_id[incoming["id"]] = incoming

        incoming_users = payload.get("users")
        if isinstance(incoming_users, list):
            users_by_id = {u.get("id"): u for u in existing_users if u.get("id")}
            for u in incoming_users:
                if isinstance(u, dict) and u.get("id"):
                    users_by_id[u["id"]] = u
            final_users = list(users_by_id.values())
        else:
            final_users = existing_users

        incoming_evidence = payload.get("evidence")
        if isinstance(incoming_evidence, list):
            evidence_by_id = {e.get("id"): e for e in existing_evidence if e.get("id")}
            for e in incoming_evidence:
                if isinstance(e, dict) and e.get("id"):
                    evidence_by_id[e["id"]] = e
            final_evidence = list(evidence_by_id.values())
        else:
            final_evidence = existing_evidence

        snapshot = write_state(
            {
                "buildings": list(by_id.values()),
                "issues": list(issues_by_id.values()),
                "users": final_users,
                "evidence": final_evidence,
            }
        )
        return {
            "ok": True,
            "merged": True,
            "savedAt": snapshot["savedAt"],
            "buildings": len(snapshot["buildings"]),
            "issues": len(snapshot["issues"]),
            "users": len(snapshot["users"]),
            "evidence": len(snapshot["evidence"]),
        }


def set_users(incoming_users):
    """Simpan daftar user ke disk agar tersinkron ke semua perangkat."""
    with _STATE_LOCK:
        _, buildings, all_issues, _, existing_evidence = _state_parts()
        snapshot = write_state(
            {
                "buildings": buildings,
                "issues": all_issues,
                "users": [u for u in incoming_users if isinstance(u, dict) and u.get("id")],
                "evidence": existing_evidence,
            }
        )
        return 200, {
            "ok": True,
            "users": len(snapshot["users"]),
            "savedAt": snapshot["savedAt"],
        }


def merge_evidence(incoming_evidence):
    """Simpan & gabung metadata bukti foto ke disk agar tersinkron ke semua perangkat."""
    with _STATE_LOCK:
        _, buildings, all_issues, existing_users, existing_evidence = _state_parts()
        by_id = {e.get("id"): e for e in existing_evidence if e.get("id")}
        for e in incoming_evidence:
            if isinstance(e, dict) and e.get("id"):
                by_id[e["id"]] = e
        snapshot = write_state(
            {
                "buildings": buildings,
                "issues": all_issues,
                "users": existing_users,
                "evidence": list(by_id.values()),
            }
        )
        return 200, {
            "ok": True,
            "evidence": len(snapshot["evidence"]),
            "savedAt": snapshot["savedAt"],
        }


def _run(command, timeout=6.0):
    try:
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
        )
        return completed.stdout or ""
    except (OSError, subprocess.SubprocessError):
        return ""


def read_wifi_signal():
    """
    Baca sinyal Wi-Fi dari perangkat yang menjalankan server ini (agen).

    PENTING: ini mengukur adapter agen, bukan HP yang sedang diuji. Browser
    sendiri TIDAK bisa membaca RSSI (tidak ada API-nya).

    dBm hanya dilaporkan kalau OS benar-benar memberikannya. Kalau yang tersedia
    hanya persen (umum di Windows lewat netsh), `dbm` dibiarkan null dan
    `isEstimate` true — supaya tidak ada angka dBm karangan di laporan QC.
    """
    result = {
        "available": False,
        "source": None,
        "device": os.name,
        "ssid": None,
        "dbm": None,
        "qualityPercent": None,
        "isEstimate": False,
        "note": "",
    }

    if os.name == "nt":
        result["source"] = "windows-netsh"
        output = _run(["netsh", "wlan", "show", "interfaces"])

        for line in output.splitlines():
            if ":" not in line:
                continue
            key, value = line.split(":", 1)
            key = key.strip().lower()
            value = value.strip()
            if key == "ssid" and value and not result["ssid"]:
                result["ssid"] = value
            if value.endswith("%") and ("signal" in key or "sinyal" in key):
                try:
                    result["qualityPercent"] = int(value.rstrip("%"))
                except ValueError:
                    pass

        result["available"] = bool(result["ssid"])
        result["isEstimate"] = result["dbm"] is None
        result["note"] = (
            "Windows (netsh) hanya memberi persen kualitas sinyal. dBm butuh driver "
            "yang mendukung WMI MSNdis_80211_ReceivedSignalStrength; di banyak laptop "
            "kelas ini tidak didukung. Pakai Wi-Fi analyzer di HP untuk dBm."
        )
        return result

    if sys.platform == "darwin":
        airport = (
            "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport"
        )
        result["source"] = "macos-airport"
        if os.path.exists(airport):
            output = _run([airport, "-I"])
            for line in output.splitlines():
                if ":" not in line:
                    continue
                key, value = line.split(":", 1)
                key = key.strip()
                value = value.strip()
                if key == "SSID":
                    result["ssid"] = value
                elif key == "agrCtlRSSI":
                    try:
                        result["dbm"] = int(value)
                    except ValueError:
                        pass
        result["available"] = result["dbm"] is not None
        result["note"] = "macOS airport memberi dBm asli (agrCtlRSSI)."
        return result

    # Linux / Raspberry Pi
    result["source"] = "linux-iw"
    interface = None
    for line in _run(["iw", "dev"]).splitlines():
        line = line.strip()
        if line.startswith("Interface "):
            interface = line.split(" ", 1)[1].strip()
            break
    if interface:
        result["device"] = interface
        for line in _run(["iw", "dev", interface, "link"]).splitlines():
            line = line.strip()
            if line.startswith("SSID:"):
                result["ssid"] = line.split(":", 1)[1].strip()
            if line.startswith("signal:"):
                try:
                    result["dbm"] = int(line.split(":", 1)[1].strip().split(" ")[0])
                except ValueError:
                    pass
    result["available"] = result["dbm"] is not None
    result["note"] = "Linux iw memberi dBm asli."
    return result


class SiagaHandler(SimpleHTTPRequestHandler):
    server_version = "SiagaIT/2.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    # ---------- util ----------
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, status: int, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def _no_content(self, status: int = 204):
        self.send_response(status)
        self._cors()
        self.end_headers()

    def _read_body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY:
            return None
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return None

    # ---------- HTTP ----------
    def do_OPTIONS(self):
        self._no_content()

    def do_GET(self):
        path = urlparse(self.path).path

        if path == "/api/health":
            state = read_state() or {}
            return self._json(
                200,
                {
                    "ok": True,
                    "service": "siaga-it",
                    "storage": "json",
                    "dataFile": os.path.relpath(DATA_FILE, BASE_DIR),
                    "updatedAt": state.get("savedAt"),
                    "buildings": len(state.get("buildings") or []),
                    "issues": len(state.get("issues") or []),
                    "users": len(state.get("users") or []),
                    # Versi protokol sinkron: klien lama/Server lama bisa dideteksi.
                    "syncVersion": SYNC_VERSION,
                },
            )

        if path == "/api/wifi":
            return self._json(200, read_wifi_signal())

        if path.startswith("/api/uploads/"):
            rel_name = unquote(path[len("/api/uploads/"):])
            clean_name = os.path.basename(rel_name)
            file_path = os.path.join(UPLOADS_DIR, clean_name)
            if os.path.exists(file_path) and os.path.isfile(file_path):
                mime = "image/jpeg"
                lower = clean_name.lower()
                if lower.endswith(".png"): mime = "image/png"
                elif lower.endswith(".webp"): mime = "image/webp"
                elif lower.endswith(".svg"): mime = "image/svg+xml"
                elif lower.endswith(".pdf"): mime = "application/pdf"
                with open(file_path, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", mime)
                self.send_header("Content-Length", str(len(content)))
                self.send_header("Cache-Control", "public, max-age=86400")
                self._cors()
                self.end_headers()
                self.wfile.write(content)
                return
            return self._json(404, {"ok": False, "error": "File tidak ditemukan"})

        if path == "/api/evidence":
            _, _, _, _, evidence = _state_parts()
            return self._json(200, {"ok": True, "evidence": evidence})

        if path == "/api/users":
            _, _, _, users, _ = _state_parts()
            return self._json(200, {"ok": True, "users": users})

        if path == "/api/state":
            state = read_state()
            if state is None:
                return self._no_content()
            return self._json(200, state)

        # Static + SPA fallback
        local_path = os.path.normpath(os.path.join(DIST_DIR, path.lstrip("/")))
        if os.path.exists(local_path) and not os.path.isdir(local_path):
            return super().do_GET()
        self.path = "/index.html"
        return super().do_GET()

    def _save_state(self):
        payload = self._read_body()
        if not isinstance(payload, dict) or not isinstance(payload.get("buildings"), list):
            return self._json(400, {"ok": False, "error": "Payload harus { buildings: [] }"})
        return self._json(200, merge_state(payload))

    def _save_users(self):
        payload = self._read_body()
        if not isinstance(payload, dict) or not isinstance(payload.get("users"), list):
            return self._json(400, {"ok": False, "error": "Payload harus { users: [] }"})
        status, body = set_users(payload["users"])
        return self._json(status, body)

    def _save_building(self, building_id: str):
        """PUT /api/buildings/{id} -> tulis satu gedung saja (409 kalau revisi basi)."""
        payload = self._read_body()
        if not isinstance(payload, dict) or not isinstance(payload.get("building"), dict):
            return self._json(400, {"ok": False, "error": "Payload harus { building: {...}, issues: [] }"})

        building = payload["building"]
        if not building.get("id"):
            building = dict(building)
            building["id"] = building_id
        if building.get("id") != building_id:
            return self._json(400, {"ok": False, "error": "id gedung tidak cocok dengan URL"})

        issues = payload.get("issues")
        if issues is not None and not isinstance(issues, list):
            return self._json(400, {"ok": False, "error": "issues harus berupa array"})

        status, body = upsert_building(
            building_id,
            building,
            issues,
            payload.get("baseRev"),
            force=payload.get("force") is True,
        )
        return self._json(status, body)

    def _delete_building(self, building_id: str, force: bool):
        """DELETE /api/buildings/{id}?force=1 -> hapus satu gedung + kendalanya."""
        status, body = delete_building(building_id, force=force, base_rev=None)
        return self._json(status, body)

    def do_PUT(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/state":
            return self._save_state()

        if path == "/api/users":
            return self._save_users()

        if path == "/api/evidence":
            payload = self._read_body()
            if not isinstance(payload, dict) or not isinstance(payload.get("evidence"), list):
                return self._json(400, {"ok": False, "error": "Payload harus { evidence: [] }"})
            status, body = merge_evidence(payload["evidence"])
            return self._json(status, body)

        if path.startswith("/api/buildings/"):
            return self._save_building(unquote(path[len("/api/buildings/"):]))

        return self._json(404, {"ok": False, "error": "Endpoint tidak ada"})

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/buildings/"):
            query = parse_qs(parsed.query)
            force = (query.get("force", ["1"])[0] or "1") != "0"
            return self._delete_building(unquote(path[len("/api/buildings/"):]), force)

        return self._json(404, {"ok": False, "error": "Endpoint tidak ada"})

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/state":
            return self._save_state()
        if path == "/api/users":
            return self._save_users()
        if path == "/api/evidence":
            payload = self._read_body()
            if not isinstance(payload, dict) or not isinstance(payload.get("evidence"), list):
                return self._json(400, {"ok": False, "error": "Payload harus { evidence: [] }"})
            status, body = merge_evidence(payload["evidence"])
            return self._json(status, body)

        if path == "/api/upload":
            payload = self._read_body()
            if not isinstance(payload, dict) or not payload.get("data"):
                return self._json(400, {"ok": False, "error": "Payload harus { data: 'data:image/...;base64,...', fileName: '...' }"})
            raw_data = str(payload.get("data", ""))
            file_name = str(payload.get("fileName") or f"img_{int(datetime.now().timestamp()*1000)}.jpg")
            clean_name = os.path.basename(file_name)
            clean_name = "".join(c for c in clean_name if c.isalnum() or c in "._-")
            if not clean_name:
                clean_name = f"img_{int(datetime.now().timestamp()*1000)}.jpg"
            if "," in raw_data:
                raw_data = raw_data.split(",", 1)[1]
            try:
                import base64
                binary_data = base64.b64decode(raw_data)
            except Exception as e:
                return self._json(400, {"ok": False, "error": f"Gagal decode base64: {str(e)}"})
            prefix, ext = os.path.splitext(clean_name)
            if not ext:
                ext = ".jpg"
            counter = 1
            test_name = clean_name
            while os.path.exists(os.path.join(UPLOADS_DIR, test_name)):
                test_name = f"{prefix}_{int(datetime.now().timestamp()*1000)}_{counter}{ext}"
                counter += 1
            clean_name = test_name
            save_path = os.path.join(UPLOADS_DIR, clean_name)
            try:
                with open(save_path, "wb") as f:
                    f.write(binary_data)
            except Exception as e:
                return self._json(500, {"ok": False, "error": f"Gagal simpan file: {str(e)}"})
            return self._json(200, {
                "ok": True,
                "url": f"/api/uploads/{clean_name}",
                "fileName": clean_name,
                "sizeBytes": len(binary_data)
            })

        return self._json(404, {"ok": False, "error": "Endpoint tidak ada"})


def start_api_thread():
    server = ThreadingHTTPServer(("0.0.0.0", API_PORT), SiagaHandler)
    print(f"API tambahan (untuk npm run dev): http://0.0.0.0:{API_PORT}/api/state")
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


if __name__ == "__main__":
    if not os.path.exists(DIST_DIR):
        print(f"Folder '{DIST_DIR}' tidak ditemukan. Jalankan `npm run build` dulu.")
        sys.exit(1)

    ThreadingHTTPServer.allow_reuse_address = True

    api_server = None
    if API_PORT and API_PORT != PORT:
        try:
            api_server = start_api_thread()
        except OSError as error:
            print(f"API port {API_PORT} tidak bisa dipakai: {error}")

    with ThreadingHTTPServer(("0.0.0.0", PORT), SiagaHandler) as httpd:
        print("=================================================")
        print("Siaga IT — server aktif")
        print(f"Web   : http://localhost:{PORT}")
        print(f"Health: http://localhost:{PORT}/api/health")
        print(f"Data  : {DATA_FILE}")
        print("=================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer dihentikan.")
        finally:
            if api_server:
                api_server.shutdown()

