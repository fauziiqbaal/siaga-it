import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Shell Android untuk membaca RSSI Wi-Fi (dBm) lewat plugin native.
 * Aplikasi web tetap berjalan seperti biasa di browser; dBm manual.
 */
const config: CapacitorConfig = {
  appId: 'co.rukita.siagait',
  appName: 'Siaga IT',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
