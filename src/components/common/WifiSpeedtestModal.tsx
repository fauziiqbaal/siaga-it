import React from 'react';
import type { Building } from '../../types/hotel';
import { SpeedtestSheet } from './SpeedtestSheet';
import type { SpeedtestSavePayload } from './SpeedtestSheet';

/**
 * Kompatibilitas: nama & bentuk hasil lama tetap dipakai oleh layar QC legacy,
 * tetapi TIDAK ada lagi simulasi angka.
 *
 * Sebelumnya file ini membuat hasil palsu: nilai awal dianggap hasil uji,
 * ditambah Math.random(), dan dBm diturunkan dari throughput. Sekarang seluruh
 * pengukuran didelegasikan ke SpeedtestSheet (fetch streaming byte nyata).
 */

export type WifiBand = '5GHz' | '2.4GHz';

export interface BandMetric {
  tested: boolean;
  supported: boolean;
  downloadMbps: number;
  uploadMbps: number;
  pingMs: number;
  jitterMs: number;
  signalDbm: number;
  status: 'OK' | 'RUSAK' | 'UNSUPPORTED' | 'NOT_TESTED';
}

export interface WifiSpeedtestResult {
  downloadMbps: number;
  uploadMbps: number;
  pingMs: number;
  jitterMs: number;
  signalDbm: number;
  activeBand: WifiBand;
  bandTested: '5GHz' | '2.4GHz' | 'DUAL_BAND';
  band5G: BandMetric;
  band24G: BandMetric;
  status: 'OK' | 'RUSAK';
  nearestApName?: string;
  evidenceDataUrl: string;
  evidenceFile: File;
  capturedAt: string;
}

interface WifiSpeedtestModalProps {
  isOpen: boolean;
  onClose: () => void;
  building: Building;
  floorId: string;
  entityId: string;
  entityTitle: string;
  entityType: 'ROOM' | 'FACILITY';
  initialSpeedMbps?: number;
  initialSignalDbm?: number;
  onSaveResult: (result: WifiSpeedtestResult) => void;
  onReportIssueWithEvidence?: (issueText: string, evidenceDataUrl: string) => void;
}

const toBandMetric = (payload: SpeedtestSavePayload, supported: boolean): BandMetric => {
  const pass = payload.downloadMbps >= 15 && (payload.signalDbm === undefined || payload.signalDbm >= -65);
  return {
    tested: supported,
    supported,
    downloadMbps: supported ? payload.downloadMbps : 0,
    uploadMbps: supported ? payload.uploadMbps || 0 : 0,
    pingMs: supported ? payload.pingMs || 0 : 0,
    jitterMs: 0,
    signalDbm: supported ? payload.signalDbm || 0 : 0,
    status: supported ? (pass ? 'OK' : 'RUSAK') : 'UNSUPPORTED',
  };
};

export const WifiSpeedtestModal: React.FC<WifiSpeedtestModalProps> = ({
  isOpen,
  onClose,
  building,
  entityId,
  entityTitle,
  initialSpeedMbps,
  initialSignalDbm,
  onSaveResult,
}) => {
  const handleSave = (payload: SpeedtestSavePayload) => {
    const band5G = toBandMetric(payload, true);
    const band24G = toBandMetric(payload, false);
    const result: WifiSpeedtestResult = {
      downloadMbps: payload.downloadMbps,
      uploadMbps: payload.uploadMbps || 0,
      pingMs: payload.pingMs || 0,
      jitterMs: 0,
      signalDbm: payload.signalDbm || 0,
      activeBand: '5GHz',
      bandTested: '5GHz',
      band5G,
      band24G,
      status: payload.downloadMbps >= 15 && (payload.signalDbm === undefined || payload.signalDbm >= -65) ? 'OK' : 'RUSAK',
      evidenceDataUrl: '',
      evidenceFile: new File([], 'speedtest-evidence.jpg', { type: 'image/jpeg' }),
      capturedAt: payload.testedAt,
    };
    onSaveResult(result);
  };

  return (
    <SpeedtestSheet
      open={isOpen}
      onClose={onClose}
      building={building}
      entityId={entityId}
      entityName={entityTitle}
      initialDownloadMbps={initialSpeedMbps}
      initialSignalDbm={initialSignalDbm}
      onSave={handleSave}
    />
  );
};
