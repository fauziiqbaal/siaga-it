/**
 * Tulis file backup contoh (format sama dengan tombol "Ekspor backup").
 * Dipakai untuk uji impor & screenshot aplikasi.
 *
 * Jalankan: node --experimental-strip-types scripts/fixtures/emit-backup.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { createFilledProperty } from './sample-property.ts';

const { building, issues } = createFilledProperty();
const outDir = path.join(process.cwd(), 'reports');
fs.mkdirSync(outDir, { recursive: true });

const file = path.join(outDir, 'sample-backup.json');
fs.writeFileSync(
  file,
  JSON.stringify(
    { app: 'siaga-it', version: 2, exportedAt: new Date().toISOString(), buildings: [building], issues },
    null,
    2,
  ),
  'utf8',
);

console.log('Backup contoh:', path.relative(process.cwd(), file));
