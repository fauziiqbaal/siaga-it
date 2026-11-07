/**
 * Jembatan ke plugin native `WifiSignal` (hanya ada di build Android/Capacitor).
 *
 * Di browser biasa tidak ada API RSSI, jadi semua fungsi di sini mengembalikan
 * "tidak didukung" dan teknisi mengisi dBm manual. Tidak ada angka estimasi.
 */
export interface NativeWifiReading {
  supported: boolean;
  dbm?: number;
  ssid?: string;
  frequencyMhz?: number;
  linkSpeedMbps?: number;
  method?: string;
  reason?: string;
}

interface WifiSignalPlugin {
  getSignal?: () => Promise<NativeWifiReading>;
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: Record<string, WifiSignalPlugin | undefined>;
}

const capacitor = (): CapacitorGlobal | undefined => {
  const globalObject = globalThis as typeof globalThis & { Capacitor?: CapacitorGlobal };
  return globalObject.Capacitor;
};

export function isNativeApp(): boolean {
  const cap = capacitor();
  if (!cap) return false;
  try {
    if (typeof cap.isNativePlatform === 'function') return cap.isNativePlatform();
    return cap.getPlatform?.() === 'android';
  } catch {
    return false;
  }
}

export async function readNativeWifiSignal(): Promise<NativeWifiReading> {
  const plugin = capacitor()?.Plugins?.WifiSignal;

  if (!isNativeApp() || !plugin?.getSignal) {
    return { supported: false, reason: 'Hanya tersedia di aplikasi Android (APK), bukan di browser.' };
  }

  try {
    const reading = await plugin.getSignal();
    if (!reading || reading.supported !== true || typeof reading.dbm !== 'number') {
      return { supported: false, reason: reading?.reason || 'Sensor Wi-Fi HP tidak memberi nilai dBm.' };
    }
    if (reading.dbm >= 0 || reading.dbm <= -120) {
      return { supported: false, reason: `Nilai RSSI tidak wajar (${reading.dbm} dBm).` };
    }
    return reading;
  } catch (error) {
    return { supported: false, reason: error instanceof Error ? error.message : 'Gagal membaca sensor Wi-Fi HP.' };
  }
}
