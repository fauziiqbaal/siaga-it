/**
 * Uji CRUD + persistensi end-to-end (tanpa browser).
 *
 * Skenario yang diuji sama dengan yang dilakukan tim opening:
 *   buat gedung baru -> isi hasil uji -> refresh (reload dari storage)
 *   -> edit -> refresh -> hapus -> refresh.
 *
 * Tujuan utama: membuktikan data TIDAK kembali ke kondisi demo/kosong setelah
 * refresh, dan penghapusan benar-benar bertahan.
 */
class MemoryStorage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

const memory = new MemoryStorage();
(globalThis as unknown as { window: unknown }).window = { localStorage: memory, setTimeout, clearTimeout };

const { loadStored, saveStored } = await import('../src/lib/storage.ts');
const { buildBuildingFromDraft, countRooms } = await import('../src/components/shared/buildingFactory.ts');
const { calculateOpeningScore, calculatePreOpeningScore } = await import('../src/utils/scoring.ts');
const { createFilledProperty } = await import('./fixtures/sample-property.ts');

type BuildingList = ReturnType<typeof buildBuildingFromDraft>[];

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(`GAGAL: ${message}`);
};

// ---- 0. Kondisi awal kosong harus tetap kosong (bukan diisi data demo) ----
saveStored<BuildingList>('buildings', []);
assert(loadStored<BuildingList>('buildings', []).length === 0, 'daftar kosong berubah menjadi data lain');

// ---- 1. CREATE: gedung baru dari form (3 lantai x 6 kamar, TV + smartlock) ----
const building = buildBuildingFromDraft({
  name: 'Rukita Kebon Jeruk',
  address: 'Jl. Kebon Jeruk Raya No. 18',
  floors: 3,
  roomsPerFloor: 6,
  openingDate: '20 Nov 2026',
  hasTv: true,
  hasSmartlock: true,
  seedStandard: true,
});
saveStored('buildings', [building]);
saveStored('active_building', building.id);

const reloaded = loadStored<BuildingList>('buildings', []);
assert(reloaded.length === 1, 'gedung baru tidak tersimpan');
assert(reloaded[0].name === 'Rukita Kebon Jeruk', 'nama gedung berubah setelah reload');
assert(countRooms(reloaded[0]) === 18, 'kode kamar otomatis tidak lengkap');
assert(reloaded[0].floors.length === 3, 'struktur lantai salah');
assert(reloaded[0].floors[0].rooms[0].number === '101', 'penomoran kamar harus 101');
assert(reloaded[0].floors[2].rooms[5].number === '306', 'penomoran kamar lantai 3 harus 306');
assert(reloaded[0].cctvPoints.length === 8, 'template CCTV: 4 titik utama + 3 koridor + 1 rooftop = 8');
assert(reloaded[0].devices.length > 0, 'template perangkat tidak terbentuk');
assert(reloaded[0].floors[0].facilities.length > 0, 'area bersama tidak terbentuk');
console.log('CREATE  : 1 gedung, 18 kamar (101-306),', reloaded[0].cctvPoints.length, 'CCTV,', reloaded[0].devices.length, 'perangkat — OK');

// ---- 2. UPDATE: isi uji lapangan lalu "refresh" ----
const edited = {
  ...reloaded[0],
  phase: 'PRE_OPENING' as const,
  floors: reloaded[0].floors.map((floor) => ({
    ...floor,
    rooms: floor.rooms.map((room) =>
      room.number === '204'
        ? { ...room, wifiStatus: 'OK' as const, wifiSpeedMbps: 82, wifiSignalDbm: -55, tvStatus: 'OK' as const, lockStatus: 'OK' as const }
        : room,
    ),
  })),
};
saveStored('buildings', [edited]);

const afterEdit = loadStored<BuildingList>('buildings', [])[0];
const room204 = afterEdit.floors.flatMap((floor) => floor.rooms).find((room) => room.number === '204');
assert(Boolean(room204), 'kamar 204 hilang');
assert(room204!.wifiSpeedMbps === 82, 'kecepatan Wi-Fi kamar 204 tidak tersimpan');
assert(room204!.wifiStatus === 'OK', 'status Wi-Fi kamar 204 tidak tersimpan');
console.log('UPDATE  : kamar 204 =', room204!.wifiSpeedMbps, 'Mbps /', room204!.wifiStatus, '— OK');

// ---- 3. Skor dihitung dari data tersimpan (bukan simulasi) ----
const filled = createFilledProperty();
saveStored('buildings', [filled.building]);
saveStored('issues', filled.issues);
const scored = loadStored<BuildingList>('buildings', [])[0];
const issues = loadStored<typeof filled.issues>('issues', []);
const pre = calculatePreOpeningScore(scored, issues);
const opening = calculateOpeningScore(scored, issues);
console.log(`SCORING : pre-opening ${pre.total} (${pre.grade}) · opening ${opening.total} (${opening.grade})`);
console.log('          blocker pre:', pre.blockers.length, '| blocker opening:', opening.blockers.length);
assert(pre.total > 60 && opening.total > 60, 'skor properti lengkap tidak wajar');
assert(pre.coverage.wifiPercent >= 80, 'coverage Wi-Fi properti lengkap harus tinggi');

// ---- 4. DELETE: hapus gedung, refresh, tidak boleh muncul lagi ----
const remaining = loadStored<BuildingList>('buildings', []).filter((item) => item.id !== scored.id);
saveStored('buildings', remaining);
saveStored('issues', []);
const afterDelete = loadStored<BuildingList>('buildings', []);
assert(afterDelete.length === 0, 'gedung masih ada setelah dihapus + reload');
assert(loadStored<unknown[]>('issues', []).length === 0, 'kendala masih ada setelah dihapus');
console.log('DELETE  : gedung + kendala terhapus permanen setelah reload — OK');

console.log('OK — CRUD & persistensi tervalidasi');
