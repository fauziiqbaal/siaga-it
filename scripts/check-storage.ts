/**
 * Verifikasi lapisan persistensi tanpa browser:
 * - data yang ditulis harus terbaca lagi (refresh simulation)
 * - payload rusak harus fallback, bukan crash
 * - kuota penuh harus tetap menyimpan data teks (foto besar dibuang)
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
    const total = Array.from(this.store.values()).reduce((sum, item) => sum + item.length, 0);
    if (total + value.length > 5_000_000) {
      const error = new Error('QuotaExceededError');
      error.name = 'QuotaExceededError';
      throw error;
    }
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
(globalThis as unknown as { window: unknown }).window = { localStorage: memory };

const { loadStored, saveStored, storageKey, getStorageUsage } = await import('../src/lib/storage.ts');

const buildings = [{ id: 'b1', name: 'Rukita Test', floors: [{ id: 'f1', rooms: [{ id: 'r1', wifiStatus: 'OK' }] }] }];

saveStored('buildings', buildings);
const reloaded = loadStored('buildings', [] as typeof buildings);
console.log('Saved envelope:', memory.getItem(storageKey('buildings'))?.slice(0, 60));
console.log('Reloaded after "refresh":', JSON.stringify(reloaded) === JSON.stringify(buildings) ? 'MATCH' : 'MISMATCH');
if (JSON.stringify(reloaded) !== JSON.stringify(buildings)) throw new Error('data hilang setelah reload');

// Corrupt payload
memory.setItem(storageKey('issues'), '{not-json');
const fallback = loadStored('issues', [{ id: 'seed' }]);
console.log('Corrupt payload fallback:', fallback[0]?.id === 'seed' ? 'OK' : 'RUSAK');

// Quota exceeded with a large inline photo
const bigPhoto = `data:image/jpeg;base64,${'A'.repeat(5_400_000)}`;
const heavy = [{ id: 'b1', name: 'Heavy', photo: bigPhoto }];
const quotaResult = saveStored('heavy', heavy);
const heavyReloaded = loadStored<Array<{ id: string; name: string; photo: string }>>('heavy', []);
console.log('Quota save:', quotaResult.ok ? 'OK' : 'RUSAK', '| notice:', quotaResult.notice ? 'shown' : 'none');
console.log('Text preserved after quota retry:', heavyReloaded[0]?.name === 'Heavy' ? 'OK' : 'RUSAK');
if (!quotaResult.ok || heavyReloaded[0]?.name !== 'Heavy') throw new Error('data teks harus tetap tersimpan');

console.log('Storage usage:', getStorageUsage());
console.log('OK — persistence layer validated');
