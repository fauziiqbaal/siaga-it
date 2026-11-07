import React, { useState } from 'react';
import type { Building, ColivingIssue } from '../../types/hotel';
import { Badge, Bar, Btn, Card, Section } from '../ui/kit';
import { calculateOpeningScore, calculatePreOpeningScore, PHASE_LABEL } from '../../utils/scoring';
import type { PhaseScoreResult } from '../../utils/scoring';
import { downloadJson } from '../../lib/storage';
import { countRooms } from '../shared/buildingFactory';
import { PrintableReport } from './PrintableReport';

interface Props {
  building: Building;
  issues: ColivingIssue[];
  onGoTab: (tab: string) => void;
  visitor?: string;
}

const gradeTone = (grade: PhaseScoreResult['grade']) =>
  grade === 'A' ? 'green' : grade === 'B' ? 'blue' : grade === 'C' ? 'amber' : 'red';

const ScoreBlock: React.FC<{ result: PhaseScoreResult; title: string; subtitle: string }> = ({ result, title, subtitle }) => (
  <Section title={title} subtitle={subtitle} action={<Badge tone={gradeTone(result.grade)}>{result.total}/100 · {result.grade}</Badge>}>
    <div className="mb-2">
      <Bar value={result.total} tone={result.total >= 90 ? 'green' : result.total >= 60 ? 'amber' : 'red'} />
      <p className="mt-1 text-[11px] text-muted-foreground">{result.verdict}</p>
    </div>

    <div className="space-y-2">
      {result.pillars.map((pillar) => (
        <div key={pillar.key}>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[11px] font-semibold text-foreground">{pillar.label}</p>
            <p className="font-mono text-[11px] font-bold text-foreground">{pillar.score}/{pillar.weight}</p>
          </div>
          <div className="mt-0.5">
            <Bar
              value={(pillar.score / pillar.weight) * 100}
              tone={pillar.score / pillar.weight >= 0.9 ? 'green' : pillar.score / pillar.weight >= 0.6 ? 'amber' : 'red'}
            />
          </div>
          <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{pillar.note}</p>
        </div>
      ))}
    </div>

    <div className="mt-3 rounded-lg border border-border bg-muted/30 p-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Temuan belum beres ({result.blockers.length})
        </p>
        <span className="text-[10px] text-muted-foreground font-medium">
          {result.categorizedBlockers?.length || 0} kelompok
        </span>
      </div>
      {result.blockers.length === 0 ? (
        <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">Tidak ada temuan terbuka.</p>
      ) : (
        <div className="mt-2 space-y-2">
          {(result.categorizedBlockers || []).map((grp) => (
            <div key={grp.category} className="rounded-md border border-border/70 bg-card p-2 text-left">
              <div className="flex items-center justify-between border-b border-border/50 pb-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-foreground">{grp.category}</p>
                <span className="rounded bg-muted px-1.5 py-0.2 text-[9px] font-semibold text-muted-foreground">
                  {grp.items.length} issue
                </span>
              </div>
              <ul className="mt-1.5 space-y-1">
                {grp.items.map((item, idx) => (
                  <li key={idx} className="flex gap-1.5 text-[11px] leading-snug text-foreground">
                    <span className="shrink-0 text-rose-500">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  </Section>
);


export const ScoreReportView: React.FC<Props> = ({ building, issues, onGoTab, visitor }) => {
  const [copied, setCopied] = useState(false);
  const preOpening = calculatePreOpeningScore(building, issues);
  const opening = calculateOpeningScore(building, issues);
  const generatedAt = new Date().toLocaleString('id-ID');

  const summary = [
    `LAPORAN IT — ${building.name}`,
    `Alamat: ${building.address || '—'}`,
    `Fase: ${PHASE_LABEL[building.phase ?? 'SETUP']}`,
    `Target live: ${building.openingDate || '—'}${building.presaleDate ? ` · Pre-sale ${building.presaleDate}` : ''}`,
    `Lantai/Kamar: ${building.floors.length} lantai · ${countRooms(building)} kamar`,
    `PRE-OPENING SCORE: ${preOpening.total}/100 (Grade ${preOpening.grade})`,
    ...preOpening.pillars.map((pillar) => `  - ${pillar.label}: ${pillar.score}/${pillar.weight} — ${pillar.note}`),
    `OPENING SCORE: ${opening.total}/100 (Grade ${opening.grade})`,
    ...opening.pillars.map((pillar) => `  - ${pillar.label}: ${pillar.score}/${pillar.weight} — ${pillar.note}`),
    `Kendala terbuka: ${preOpening.coverage.openIssues} · selesai: ${preOpening.coverage.resolvedIssues}`,
    `Dibuat: ${generatedAt}`,
  ].join('\n');

  return (
    <div className="space-y-3">
      {/* Ringkasan interaktif: tidak ikut tercetak */}
      <div className="space-y-3 print:hidden">
      <Card className="p-3.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Lembar penilaian IT</p>
            <h2 className="truncate text-sm font-bold text-foreground">{building.name}</h2>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {building.floors.length} lantai · {countRooms(building)} kamar · target live {building.openingDate || '—'}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Dibuat {generatedAt}</p>
          </div>
          <Badge tone={building.phase === 'LIVE' ? 'green' : 'blue'}>{PHASE_LABEL[building.phase ?? 'SETUP']}</Badge>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Pre-Opening</p>
            <p className="text-xl font-bold leading-tight text-foreground">
              {preOpening.total}
              <span className="text-xs text-muted-foreground">/100</span>
            </p>
            <p className="text-[10px] text-muted-foreground">Grade {preOpening.grade}</p>
          </div>
          <div className="rounded-lg border border-border p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Opening</p>
            <p className="text-xl font-bold leading-tight text-foreground">
              {opening.total}
              <span className="text-xs text-muted-foreground">/100</span>
            </p>
            <p className="text-[10px] text-muted-foreground">Grade {opening.grade}</p>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
          <span>Coverage Wi-Fi <strong className="text-foreground">{preOpening.coverage.wifiPercent}%</strong></span>
          <span>Kendala open <strong className="text-foreground">{preOpening.coverage.openIssues}</strong></span>
          <span>Kendala selesai <strong className="text-foreground">{preOpening.coverage.resolvedIssues}</strong></span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 print:hidden">
          <Btn onClick={() => window.print()}>Cetak / PDF</Btn>
          <Btn
            onClick={() => {
              downloadJson(
                `${building.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-it-report.json`,
                { building, issues: issues.filter((issue) => issue.buildingId === building.id), preOpening, opening, generatedAt },
              );
            }}
          >
            Ekspor JSON
          </Btn>
          <Btn
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(summary);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? 'Ringkasan tersalin' : 'Salin ringkasan'}
          </Btn>
        </div>
      </Card>

      <ScoreBlock
        result={preOpening}
        title="1. Pre-Opening Score"
        subtitle="Kualitas data & hasil uji saat survey: coverage, temuan, kelengkapan aset dan billing."
      />
      <ScoreBlock
        result={opening}
        title="2. Opening Score"
        subtitle="Kesiapan serah terima: konfigurasi perangkat, takeover akun, takeover billing ISP, rekaman CCTV, sign-off."
      />

      <Card className="p-3.5 print:hidden">
        <p className="text-[11px] font-semibold text-foreground">Tindak lanjut</p>
        <div className="mt-1.5 flex gap-1.5">
          <Btn block onClick={() => onGoTab('preopening')}>Perbaiki Pre-Opening</Btn>
          <Btn block variant="primary" onClick={() => onGoTab('opening')}>Lanjut Opening</Btn>
        </div>
        <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
          Laporan dihitung langsung dari data tersimpan di browser. Ekspor JSON setelah visit agar arsip aman.
        </p>
      </Card>
      </div>

      {/* Dokumen A4: inilah yang keluar saat Cetak / Simpan sebagai PDF */}
      <div className="flex items-center justify-between gap-2 print:hidden">
        <p className="text-[11px] font-semibold text-foreground">Pratinjau laporan cetak (A4)</p>
        <Btn onClick={() => window.print()}>Cetak / PDF</Btn>
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <PrintableReport building={building} issues={issues} generatedAt={generatedAt} visitor={visitor} />
      </div>
    </div>
  );
};
