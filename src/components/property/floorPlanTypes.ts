// Tipe & tema status elemen floor plan.
// Dipisah dari FloorPlanDrawingModal (UI) dan dipakai bersama oleh floorPlanDraw.ts.

export type DrawTool = 'select' | 'brush' | 'line' | 'rect' | 'arrow' | 'eraser' | 'text' | 'stamp';
export type AssetStamp = 'AP_WIFI' | 'CCTV' | 'SMARTLOCK' | 'TV' | 'MDF_RACK' | 'LAN_PORT';
export type ElementStatus = 'EXISTING' | 'PLANNING' | 'RELOCATE';

export interface FloorPlanElement {
  id: string;
  type: AssetStamp | 'ARROW' | 'TEXT' | 'RECT';
  status: ElementStatus; // 'EXISTING' | 'PLANNING' | 'RELOCATE'
  x: number;
  y: number;
  rotation: number; // in degrees (0 - 360)
  scale: number; // 0.6 to 2.5 (default 1.0)
  label: string;
  // CCTV props:
  fov?: number; // Sudut sorotan FOV (default 70°)
  range?: number; // Jarak jangkauan beam (default 85px)
  // Wi-Fi props:
  wifiMode?: 'OMNI' | 'DIRECTIONAL';
  // Relocate Arrow props:
  targetX?: number; // Koordinat tujuan relokasi
  targetY?: number;
  arrowLabel?: string;
  // Text / Note props:
  text?: string;
  color?: string;
  // Rect props:
  width?: number;
  height?: number;
}

// Status Theme Definition for Clean Contrast & Differentiation
export const STATUS_THEMES: Record<ElementStatus, {
  name: string;
  badge: string;
  primary: string;
  dark: string;
  fill: string;
  border: string;
  tagColor: string;
}> = {
  EXISTING: {
    name: 'Existing (Terpasang)',
    badge: 'EXISTING',
    primary: '#10b981', // Emerald
    dark: '#065f46',
    fill: 'rgba(16, 185, 129, 0.16)',
    border: '#059669',
    tagColor: '#34d399',
  },
  PLANNING: {
    name: 'Planning (Rencana Tambah)',
    badge: 'PLANNING',
    primary: '#3b82f6', // Electric Blue
    dark: '#1e3a8a',
    fill: 'rgba(59, 130, 246, 0.18)',
    border: '#2563eb',
    tagColor: '#93c5fd',
  },
  RELOCATE: {
    name: 'Relocate (Perlu Pindah)',
    badge: 'RELOCATE',
    primary: '#f97316', // Orange Amber
    dark: '#9a3412',
    fill: 'rgba(249, 115, 22, 0.22)',
    border: '#ea580c',
    tagColor: '#fdba74',
  },
};
