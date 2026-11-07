import React, { useState, useEffect } from 'react';
import type { Building, CheckStatus, ColivingIssue, EvidenceMedia } from '../../types/hotel';
import { calculateOpeningScore, calculatePreOpeningScore, PHASE_LABEL } from '../../utils/scoring';
import type { PhaseScoreResult } from '../../utils/scoring';
import { countRooms } from '../shared/buildingFactory';
import { getEvidenceByBuilding } from '../../utils/evidenceStorage';

interface Props {
  building: Building;
  issues: ColivingIssue[];
  generatedAt?: string;
  /** Nama petugas yang melakukan visit/inspeksi (mis. user yang sedang login). */
  visitor?: string;
  /** Daftar foto aset opsional (mis. untuk render SSR). */
  assetPhotos?: EvidenceMedia[];
}

/**
 * Dokumen laporan siap cetak (A4).
 *
 * Sengaja memakai tabel HTML biasa + teks status (OK / NEED IMPROVEMENT / RUSAK /
 * BELUM TERSEDIA), bukan badge berwarna, supaya hasil PDF tetap terbaca saat
 * dicetak hitam-putih.
 * Komponen ini dipakai di layar (tab Skor) dan oleh `scripts/report-ssr.tsx`
 * untuk menghasilkan PDF.
 */

const statusText = (status: CheckStatus) =>
  status === 'OK'
    ? 'OK'
    : status === 'NEED_IMPROVE'
      ? 'NEED IMPROVEMENT'
      : status === 'RUSAK'
        ? 'RUSAK'
        : status === 'BELUM_TERSEDIA'
          ? 'BELUM TERSEDIA'
          : 'BELUM DINILAI';

const yesNo = (value: boolean | undefined, yes = 'Ya', no = 'Tidak') => (value ? yes : no);

const PillarTable: React.FC<{ result: PhaseScoreResult }> = ({ result }) => (
  <table className="w-full border-collapse text-[9pt]">
    <thead>
      <tr className="bg-muted/60 text-left">
        <th className="border border-border px-1.5 py-1 font-semibold">Pilar penilaian</th>
        <th className="w-[42px] border border-border px-1.5 py-1 text-right font-semibold">Bobot</th>
        <th className="w-[52px] border border-border px-1.5 py-1 text-right font-semibold">Skor</th>
        <th className="border border-border px-1.5 py-1 font-semibold">Catatan</th>
      </tr>
    </thead>
    <tbody>
      {result.pillars.map((pillar) => (
        <tr key={pillar.key} className="print-avoid-break">
          <td className="border border-border px-1.5 py-1 align-top">{pillar.label}</td>
          <td className="border border-border px-1.5 py-1 text-right align-top font-mono">{pillar.weight}</td>
          <td className="border border-border px-1.5 py-1 text-right align-top font-mono font-bold">{pillar.score}</td>
          <td className="border border-border px-1.5 py-1 align-top text-[8.5pt]">{pillar.note}</td>
        </tr>
      ))}
      <tr>
        <td className="border border-border px-1.5 py-1 font-bold" colSpan={2}>
          Total — Grade {result.grade}
        </td>
        <td className="border border-border px-1.5 py-1 text-right font-mono font-bold">{result.total}</td>
        <td className="border border-border px-1.5 py-1 text-[8.5pt]">{result.verdict}</td>
      </tr>
    </tbody>
  </table>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="mb-1 mt-3 border-b border-border pb-0.5 text-[10pt] font-bold uppercase tracking-wide">
    {children}
  </h2>
);


export const PrintableReport: React.FC<Props> = ({ building, issues, generatedAt, visitor, assetPhotos }) => {
  const preOpening = calculatePreOpeningScore(building, issues);
  const opening = calculateOpeningScore(building, issues);
  const buildingIssues = issues.filter((issue) => issue.buildingId === building.id);
  const rooms = building.floors.flatMap((floor) => floor.rooms.map((room) => ({ floor, room })));
  const facilities = building.floors.flatMap((floor) => floor.facilities);
  const connections = building.internetConnections ?? [];
  const devices = building.devices ?? [];
  const cctvPoints = building.cctvPoints ?? [];
  const stamp = generatedAt ?? new Date().toLocaleString('id-ID');

  const [loadedEvidence, setLoadedEvidence] = useState<EvidenceMedia[]>([]);

  useEffect(() => {
    let active = true;
    if (typeof window !== 'undefined') {
      getEvidenceByBuilding(building.id)
        .then((items) => {
          if (active) setLoadedEvidence(items || []);
        })
        .catch(() => {
          try {
            const raw = localStorage.getItem('siaga_it_evidence');
            if (raw && active) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                setLoadedEvidence(parsed.filter((p: EvidenceMedia) => p.buildingId === building.id));
              }
            }
          } catch {}
        });
    }
    return () => {
      active = false;
    };
  }, [building.id]);

  const allPhotos = assetPhotos && assetPhotos.length > 0 ? assetPhotos : loadedEvidence;

  // Visitor = petugas yang melakukan visit/inspeksi. Prioritas: prop (user login),
  // lalu kunjungan terakhir, lalu penanda tangan serah terima, lalu verifikator SSID.
  const latestVisit = [...(building.inspectionVisits ?? [])].sort((a, b) => (b.visitNumber || 0) - (a.visitNumber || 0))[0];
  const handover = building.handover;
  const visitorLabel =
    visitor ||
    latestVisit?.inspectorName ||
    (handover?.signedBy ? `${handover.signedBy}${handover.role ? ` (${handover.role})` : ''}` : '') ||
    building.wifiStandardProfile?.verifiedBy ||
    'Belum diisi';

  return (
    <article className="report-doc mx-auto w-full max-w-[820px] bg-white px-6 py-5 text-[9pt] leading-snug text-slate-900">
      {/* Catatan: sengaja memakai div, bukan <header>/<nav>, karena CSS cetak
          global menyembunyikan header/nav milik shell aplikasi. */}
      <div className="border-b-2 border-slate-900 pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[8pt] font-bold uppercase tracking-[0.18em] text-slate-500">
              Siaga IT — Laporan Opening Team
            </p>
            <h1 className="mt-0.5 text-[16pt] font-bold leading-tight">{building.name}</h1>
            <p className="text-[9pt] text-slate-600">{building.address || 'Alamat belum diisi'}</p>
          </div>
          <div className="shrink-0 text-right text-[8pt] text-slate-600">
            <p>Dicetak: {stamp}</p>
            <p>Visitor: {visitorLabel}</p>
            <p>Fase: {PHASE_LABEL[building.phase ?? 'SETUP']}</p>
            <p className="font-mono text-[7.5pt]">ID: {building.id}</p>
          </div>
        </div>

        <table className="mt-2 w-full border-collapse text-[8.5pt]">
          <tbody>
            <tr>
              <td className="w-[90px] border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-semibold">Target live</td>
              <td className="border border-slate-300 px-1.5 py-0.5">{building.openingDate || '—'}</td>
              <td className="w-[90px] border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-semibold">Pre-sale</td>
              <td className="border border-slate-300 px-1.5 py-0.5">{building.presaleDate || '—'}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-semibold">Lantai / kamar</td>
              <td className="border border-slate-300 px-1.5 py-0.5">
                {building.floors.length} lantai / {countRooms(building)} kamar
              </td>
              <td className="border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-semibold">Retensi NVR</td>
              <td className="border border-slate-300 px-1.5 py-0.5">{building.cctvRetentionDays ?? 0} hari</td>
            </tr>
            <tr>
              <td className="border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-semibold">ISP</td>
              <td className="border border-slate-300 px-1.5 py-0.5" colSpan={3}>
                {connections.length > 0
                  ? connections
                      .map((item) => `${item.ispName} ${item.speedMbps ? `${item.speedMbps} Mbps` : ''}`.trim())
                      .join(' · ')
                  : building.ispProvider || '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <SectionTitle>Ringkasan penilaian</SectionTitle>
      <table className="w-full border-collapse text-[9pt]">
        <thead>
          <tr className="bg-muted/60 text-left">
            <th className="border border-border px-1.5 py-1 font-semibold">Lembar penilaian</th>
            <th className="w-[86px] border border-border px-1.5 py-1 text-right font-semibold">Skor</th>
            <th className="w-[60px] border border-border px-1.5 py-1 text-center font-semibold">Grade</th>
            <th className="border border-border px-1.5 py-1 font-semibold">Kesimpulan</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-border px-1.5 py-1">Pre-Opening Score</td>
            <td className="border border-border px-1.5 py-1 text-right font-mono font-bold">{preOpening.total}/100</td>
            <td className="border border-border px-1.5 py-1 text-center font-bold">{preOpening.grade}</td>
            <td className="border border-border px-1.5 py-1">{preOpening.verdict}</td>
          </tr>
          <tr>
            <td className="border border-border px-1.5 py-1">Opening Score</td>
            <td className="border border-border px-1.5 py-1 text-right font-mono font-bold">{opening.total}/100</td>
            <td className="border border-border px-1.5 py-1 text-center font-bold">{opening.grade}</td>
            <td className="border border-border px-1.5 py-1">{opening.verdict}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-1 text-[8pt] text-slate-600">
        Coverage uji Wi-Fi {preOpening.coverage.wifiPercent}% ({preOpening.coverage.testedWifi}/
        {preOpening.coverage.totalWifi} titik) · Kendala terbuka {preOpening.coverage.openIssues} · Kendala selesai{' '}
        {preOpening.coverage.resolvedIssues}
      </p>

      <SectionTitle>1. Pre-Opening Score — kualitas data &amp; hasil uji lapangan</SectionTitle>
      <PillarTable result={preOpening} />

      <SectionTitle>2. Opening Score — kesiapan serah terima</SectionTitle>
      <PillarTable result={opening} />

      <SectionTitle>Temuan yang belum selesai (blocker)</SectionTitle>
      <div className="grid grid-cols-2 gap-4 text-[8.5pt]">
        <div>
          <p className="font-bold border-b border-slate-300 pb-0.5 text-slate-900">
            Pre-Opening ({preOpening.blockers.length} temuan)
          </p>
          {preOpening.blockers.length === 0 ? (
            <p className="mt-1 text-slate-600">Tidak ada temuan terbuka.</p>
          ) : (
            <div className="mt-1.5 space-y-2">
              {(preOpening.categorizedBlockers || []).map((grp) => (
                <div key={grp.category} className="print-avoid-break">
                  <p className="font-bold text-[7.5pt] uppercase tracking-wider text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    {grp.category} ({grp.items.length})
                  </p>
                  <ul className="mt-0.5 ml-2.5 space-y-0.5 text-slate-800">
                    {grp.items.map((item, idx) => (
                      <li key={idx} className="flex gap-1.5 items-start leading-snug">
                        <span className="shrink-0 text-slate-400">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="font-bold border-b border-slate-300 pb-0.5 text-slate-900">
            Opening ({opening.blockers.length} temuan)
          </p>
          {opening.blockers.length === 0 ? (
            <p className="mt-1 text-slate-600">Tidak ada temuan terbuka.</p>
          ) : (
            <div className="mt-1.5 space-y-2">
              {(opening.categorizedBlockers || []).map((grp) => (
                <div key={grp.category} className="print-avoid-break">
                  <p className="font-bold text-[7.5pt] uppercase tracking-wider text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    {grp.category} ({grp.items.length})
                  </p>
                  <ul className="mt-0.5 ml-2.5 space-y-0.5 text-slate-800">
                    {grp.items.map((item, idx) => (
                      <li key={idx} className="flex gap-1.5 items-start leading-snug">
                        <span className="shrink-0 text-slate-400">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <SectionTitle>Hasil uji kamar</SectionTitle>
      <p className="mb-1 text-[8pt] text-slate-600">
        Standar: download ≥ 15 Mbps di setiap kamar, TV dapat ditonton, smartlock tap RFID &lt; 1 detik dengan baterai &gt; 80%.
      </p>
      <table className="w-full border-collapse text-[8.5pt]">
        <thead>
          <tr className="bg-muted/60 text-left">
            <th className="w-[52px] border border-border px-1 py-0.5 font-semibold">Kamar</th>
            <th className="w-[62px] border border-border px-1 py-0.5 font-semibold">Wi-Fi</th>
            <th className="w-[92px] border border-border px-1 py-0.5 font-semibold">Down / Up (Mbps)</th>
            <th className="w-[48px] border border-border px-1 py-0.5 font-semibold">dBm</th>
            <th className="w-[52px] border border-border px-1 py-0.5 font-semibold">TV</th>
            <th className="w-[88px] border border-border px-1 py-0.5 font-semibold">Smartlock</th>
            <th className="border border-border px-1 py-0.5 font-semibold">Catatan</th>
          </tr>
        </thead>
        <tbody>
          {rooms.length === 0 && (
            <tr>
              <td className="border border-border px-1 py-1 text-center" colSpan={7}>
                Belum ada kamar.
              </td>
            </tr>
          )}
          {rooms.map(({ room }) => (
            <tr key={room.id} className="print-avoid-break">
              <td className="border border-border px-1 py-0.5 font-mono font-semibold">{room.number}</td>
              <td className="border border-border px-1 py-0.5">{statusText(room.wifiStatus)}</td>
              <td className="border border-border px-1 py-0.5 font-mono">
                {room.wifiSpeedMbps ? room.wifiSpeedMbps : '—'} / {room.wifiUploadMbps ? room.wifiUploadMbps : '—'}
              </td>
              <td className="border border-border px-1 py-0.5 font-mono">{room.wifiSignalDbm ?? '—'}</td>
              <td className="border border-border px-1 py-0.5">{statusText(room.tvStatus)}</td>
              <td className="whitespace-nowrap border border-border px-1 py-0.5">
                {statusText(room.lockStatus)}
                {room.lockBatteryPercent ? ` (${room.lockBatteryPercent}%)` : ''}
                {room.rfidTapMs ? ` · ${room.rfidTapMs} ms` : ''}
              </td>
              <td className="border border-border px-1 py-0.5">{room.notes || room.wifiIssueText || room.lockIssueText || room.tvIssueText || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <SectionTitle>Area bersama</SectionTitle>
      <table className="w-full border-collapse text-[8.5pt]">
        <thead>
          <tr className="bg-muted/60 text-left">
            <th className="border border-border px-1 py-0.5 font-semibold">Area</th>
            <th className="w-[48px] border border-border px-1 py-0.5 font-semibold">Lt</th>
            <th className="w-[62px] border border-border px-1 py-0.5 font-semibold">Wi-Fi</th>
            <th className="w-[70px] border border-border px-1 py-0.5 font-semibold">Mbps</th>
            <th className="w-[52px] border border-border px-1 py-0.5 font-semibold">TV</th>
            <th className="w-[66px] border border-border px-1 py-0.5 font-semibold">Akses</th>
          </tr>
        </thead>
        <tbody>
          {facilities.length === 0 && (
            <tr>
              <td className="border border-border px-1 py-1 text-center" colSpan={6}>
                Belum ada area bersama.
              </td>
            </tr>
          )}
          {facilities.map((facility) => (
            <tr key={facility.id} className="print-avoid-break">
              <td className="border border-border px-1 py-0.5">{facility.name}</td>
              <td className="border border-border px-1 py-0.5 font-mono">{facility.floor}</td>
              <td className="border border-border px-1 py-0.5">{facility.hasWifi ? statusText(facility.wifiStatus) : 'N/A'}</td>
              <td className="border border-border px-1 py-0.5 font-mono">{facility.wifiSpeedMbps ?? '—'}</td>
              <td className="border border-border px-1 py-0.5">{facility.hasTv ? statusText(facility.tvStatus) : 'N/A'}</td>
              <td className="border border-border px-1 py-0.5">{facility.hasLock ? statusText(facility.lockStatus) : 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <SectionTitle>Titik CCTV</SectionTitle>
      <table className="w-full border-collapse text-[8.5pt]">
        <thead>
          <tr className="bg-muted/60 text-left">
            <th className="w-[58px] border border-border px-1 py-0.5 font-semibold">Titik</th>
            <th className="border border-border px-1 py-0.5 font-semibold">Lokasi / coverage</th>
            <th className="w-[44px] border border-border px-1 py-0.5 font-semibold">Lt</th>
            <th className="w-[58px] border border-border px-1 py-0.5 font-semibold">Status</th>
            <th className="w-[58px] border border-border px-1 py-0.5 font-semibold">Rekam</th>
            <th className="w-[70px] border border-border px-1 py-0.5 font-semibold">Takeover</th>
          </tr>
        </thead>
        <tbody>
          {cctvPoints.length === 0 && (
            <tr>
              <td className="border border-border px-1 py-1 text-center" colSpan={6}>
                Belum ada titik CCTV.
              </td>
            </tr>
          )}
          {cctvPoints.map((point) => (
            <tr key={point.id} className="print-avoid-break">
              <td className="border border-border px-1 py-0.5 font-mono">{point.locationName}</td>
              <td className="border border-border px-1 py-0.5">{point.objectCoverage}</td>
              <td className="border border-border px-1 py-0.5 font-mono">{point.floorNumber}</td>
              <td className="border border-border px-1 py-0.5">{statusText(point.status)}</td>
              <td className="border border-border px-1 py-0.5">{yesNo(point.isRecording, 'Ya', 'Tidak')}</td>
              <td className="border border-border px-1 py-0.5">
                {point.isStandalone ? (point.takeoverStatus === 'SUDAH_TAKEOVER' ? 'Sudah' : 'Belum') : 'NVR'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <SectionTitle>Perangkat &amp; status akun cloud</SectionTitle>
      <table className="w-full border-collapse text-[8.5pt]">
        <thead>
          <tr className="bg-muted/60 text-left">
            <th className="border border-border px-1 py-0.5 font-semibold">Perangkat</th>
            <th className="border border-border px-1 py-0.5 font-semibold">Merek / model</th>
            <th className="w-[52px] border border-border px-1 py-0.5 font-semibold">Lt</th>
            <th className="w-[70px] border border-border px-1 py-0.5 font-semibold">Config</th>
            <th className="w-[66px] border border-border px-1 py-0.5 font-semibold">SSID</th>
            <th className="w-[70px] border border-border px-1 py-0.5 font-semibold">Cloud</th>
          </tr>
        </thead>
        <tbody>
          {devices.length === 0 && (
            <tr>
              <td className="border border-border px-1 py-1 text-center" colSpan={6}>
                Belum ada perangkat terdata.
              </td>
            </tr>
          )}
          {devices.map((device) => (
            <tr key={device.id} className="print-avoid-break">
              <td className="border border-border px-1 py-0.5">{device.name}</td>
              <td className="border border-border px-1 py-0.5">{device.brandModel || '—'}</td>
              <td className="border border-border px-1 py-0.5 font-mono">{device.floorNumber}</td>
              <td className="border border-border px-1 py-0.5">{device.configStatus === 'CONFIGURED' ? 'Selesai' : 'Belum'}</td>
              <td className="border border-border px-1 py-0.5">
                {device.category === 'WIRELESS_DEVICE'
                  ? device.ssidStatus === 'SSID_CHANGED'
                    ? 'Standar'
                    : 'Default'
                  : '—'}
              </td>
              <td className="border border-border px-1 py-0.5">
                {device.cloudUnbindStatus === 'UNBOUND'
                  ? 'Unbind'
                  : device.cloudUnbindStatus === 'STILL_BOUND'
                    ? 'Akun lama'
                    : 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <SectionTitle>Billing &amp; koneksi internet</SectionTitle>
      <table className="w-full border-collapse text-[8.5pt]">
        <thead>
          <tr className="bg-muted/60 text-left">
            <th className="w-[62px] border border-border px-1 py-0.5 font-semibold">ISP</th>
            <th className="border border-border px-1 py-0.5 font-semibold">Paket</th>
            <th className="w-[52px] border border-border px-1 py-0.5 font-semibold">Bandwidth</th>
            <th className="w-[72px] border border-border px-1 py-0.5 font-semibold">No. pelanggan</th>
            <th className="border border-border px-1 py-0.5 font-semibold">Atas nama</th>
            <th className="border border-border px-1 py-0.5 font-semibold">Telepon / email terdaftar</th>
            <th className="w-[58px] border border-border px-1 py-0.5 font-semibold">Takeover</th>
          </tr>
        </thead>
        <tbody>
          {connections.length === 0 && (
            <tr>
              <td className="border border-border px-1 py-1 text-center" colSpan={7}>
                Belum ada data billing ISP.
              </td>
            </tr>
          )}
          {connections.map((connection) => (
            <tr key={connection.id} className="print-avoid-break">
              <td className="border border-border px-1 py-0.5">{connection.ispName}</td>
              <td className="border border-border px-1 py-0.5">{connection.packageName || '—'}</td>
              <td className="border border-border px-1 py-0.5 font-mono">{connection.speedMbps || 0} Mbps</td>
              <td className="border border-border px-1 py-0.5 font-mono">{connection.customerNumber || '—'}</td>
              <td className="border border-border px-1 py-0.5">{connection.accountHolder || '—'}</td>
              <td className="border border-border px-1 py-0.5">
                {connection.registeredPhone || '—'}
                {connection.billingEmail ? ` · ${connection.billingEmail}` : ''}
              </td>
              <td className="border border-border px-1 py-0.5">
                {connection.billingTakeoverStatus === 'SUDAH_TAKEOVER' ? 'Sudah' : 'Belum'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <SectionTitle>Kendala &amp; koreksi</SectionTitle>
      <table className="w-full border-collapse text-[8.5pt]">
        <thead>
          <tr className="bg-muted/60 text-left">
            <th className="w-[52px] border border-border px-1 py-0.5 font-semibold">Tanggal</th>
            <th className="w-[62px] border border-border px-1 py-0.5 font-semibold">Kategori</th>
            <th className="w-[92px] border border-border px-1 py-0.5 font-semibold">Lokasi</th>
            <th className="border border-border px-1 py-0.5 font-semibold">Temuan</th>
            <th className="w-[56px] border border-border px-1 py-0.5 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {buildingIssues.length === 0 && (
            <tr>
              <td className="border border-border px-1 py-1 text-center" colSpan={5}>
                Tidak ada kendala tercatat.
              </td>
            </tr>
          )}
          {buildingIssues.map((issue) => (
            <tr key={issue.id} className="print-avoid-break">
              <td className="border border-border px-1 py-0.5">{issue.createdAt}</td>
              <td className="border border-border px-1 py-0.5">{issue.category}</td>
              <td className="border border-border px-1 py-0.5">{issue.location}</td>
              <td className="border border-border px-1 py-0.5">
                {issue.issue}
                {issue.resolutionNote ? ` — Perbaikan: ${issue.resolutionNote}` : ''}
              </td>
              <td className="border border-border px-1 py-0.5">{issue.status === 'OPEN' ? 'OPEN' : 'SELESAI'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <SectionTitle>Lampiran inventaris &amp; foto aset IT</SectionTitle>
      {devices.length === 0 ? (
        <p className="border border-border p-2 text-center text-[8.5pt] text-slate-600">
          Belum ada perangkat IT terdaftar dalam inventaris.
        </p>
      ) : (
        <div className="space-y-2 text-[8.5pt]">
          {devices.map((device, idx) => {
            const devPhotos = allPhotos.filter(
              (p) => p.entityId === device.id || (p.category === 'DEVICE_ASSET' && p.entityName === device.name),
            );
            const photoSrc = devPhotos[0]?.fileUrl || device.photoUrl;

            return (
              <div key={device.id} className="print-avoid-break rounded border border-slate-300 p-2.5 bg-white">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[9pt] font-bold text-slate-900">
                      #{idx + 1} {device.name}
                      <span className="ml-1.5 text-[8pt] font-normal text-slate-500">
                        (Lt {device.floorNumber})
                      </span>
                    </p>

                    <div className="mt-1.5 space-y-1 text-[8pt]">
                      <div className="flex items-baseline">
                        <span className="w-24 text-slate-500 shrink-0">Merek / Model</span>
                        <span className="font-semibold text-slate-900">: {device.brandModel || '—'}</span>
                      </div>
                      <div className="flex items-baseline">
                        <span className="w-24 text-slate-500 shrink-0">Serial Number</span>
                        <span className="font-mono font-semibold text-slate-900">: {device.serialNumber || '—'}</span>
                      </div>
                      <div className="flex items-baseline">
                        <span className="w-24 text-slate-500 shrink-0">Lokasi Pasang</span>
                        <span className="text-slate-800">: {device.locationDetail || `Lantai ${device.floorNumber}`}</span>
                      </div>
                    </div>
                  </div>

                  {photoSrc ? (
                    <div className="shrink-0 text-center">
                      <img
                        src={photoSrc}
                        alt={`Foto ${device.name}`}
                        className="h-20 w-28 rounded border border-slate-300 object-cover bg-slate-50"
                      />
                      <span className="block mt-0.5 text-[6.5pt] font-mono text-slate-500">Foto Aset</span>
                    </div>
                  ) : (
                    <div className="flex h-20 w-28 shrink-0 flex-col items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50/50 text-center text-[7.5pt] text-slate-400">
                      <span>Tidak ada foto</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
};
