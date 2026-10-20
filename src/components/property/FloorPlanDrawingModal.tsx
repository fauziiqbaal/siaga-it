import React, { useRef, useState, useEffect, useCallback } from 'react';
import { FloorConfig, Building } from '../../types/hotel';
import { 
  X, 
  Download, 
  RotateCcw, 
  RotateCw, 
  Trash2, 
  Grid, 
  Upload, 
  Check, 
  PenTool, 
  Square, 
  Minus, 
  Eraser, 
  Type, 
  Wifi, 
  Video, 
  Lock, 
  Tv, 
  Zap, 
  Sliders, 
  Sparkles,
  MousePointer,
  Copy,
  MoveUpRight,
  Move,
  CheckCircle2,
  AlertCircle,
  Camera
} from 'lucide-react';
import { LiveCameraModal } from '../common/LiveCameraModal';

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

interface FloorPlanDrawingModalProps {
  isOpen: boolean;
  onClose: () => void;
  building: Building;
  floor: FloorConfig;
  onSaveFloorPlan: (floorId: string, sketchDataUrl: string, notes?: string, elementsJson?: string) => void;
  initialBlueprintDataUrl?: string;
}

const COLOR_PALETTE = [
  { name: 'Blueprint Navy', value: '#1e3a8a' },
  { name: 'Slate Dinding', value: '#1e293b' },
  { name: 'Emerald Wi-Fi', value: '#10b981' },
  { name: 'Amber CCTV', value: '#f59e0b' },
  { name: 'Rose Danger/Kabel', value: '#e11d48' },
  { name: 'Purple Smartlock', value: '#7c3aed' },
  { name: 'Cyan TV/Display', value: '#06b6d4' },
  { name: 'Putih', value: '#ffffff' },
];

const BRUSH_SIZES = [
  { label: 'Tipis', size: 2 },
  { label: 'Sedang', size: 5 },
  { label: 'Tebal', size: 10 },
  { label: 'Highlighter', size: 24, isHighlighter: true },
];

// Standard 8 Cardinal Directions for quick rotate
const DIRECTION_PRESETS = [
  { icon: '⬆️', label: 'Atas (Utara)', deg: 270 },
  { icon: '↗️', label: 'Kanan Atas', deg: 315 },
  { icon: '➡️', label: 'Kanan (Timur)', deg: 0 },
  { icon: '↘️', label: 'Kanan Bawah', deg: 45 },
  { icon: '⬇️', label: 'Bawah (Selatan)', deg: 90 },
  { icon: '↙️', label: 'Kiri Bawah', deg: 135 },
  { icon: '⬅️', label: 'Kiri (Barat)', deg: 180 },
  { icon: '↖️', label: 'Kiri Atas', deg: 225 },
];

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

// Canvas Resolution
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;

export const FloorPlanDrawingModal: React.FC<FloorPlanDrawingModalProps> = ({
  isOpen,
  onClose,
  building,
  floor,
  onSaveFloorPlan,
  initialBlueprintDataUrl,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Background sketch canvas (holds walls, blueprints, and brush strokes)
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live Camera Viewfinder State
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState<boolean>(false);

  // Active Tool & Mode
  const [activeTool, setActiveTool] = useState<DrawTool>('select');
  const [activeStatus, setActiveStatus] = useState<ElementStatus>('EXISTING');
  const [selectedColor, setSelectedColor] = useState<string>('#1e293b');
  const [strokeWidth, setStrokeWidth] = useState<number>(5);
  const [isHighlighter, setIsHighlighter] = useState<boolean>(false);
  const [selectedStamp, setSelectedStamp] = useState<AssetStamp>('AP_WIFI');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [gridSize] = useState<number>(30);
  const [customText, setCustomText] = useState<string>('Kamar');
  const [notes, setNotes] = useState<string>(floor.floorPlanNotes || '');
  const [hasSaved, setHasSaved] = useState<boolean>(false);

  // Stamp Creation Defaults
  const [stampAngle, setStampAngle] = useState<number>(0);
  const [customCctvLabel, setCustomCctvLabel] = useState<string>('Titik 1');
  const [cctvCounter, setCctvCounter] = useState<number>(1);
  const [wifiMode, setWifiMode] = useState<'OMNI' | 'DIRECTIONAL'>('OMNI');
  const [customWifiLabel, setCustomWifiLabel] = useState<string>('AP 1');
  const [wifiCounter, setWifiCounter] = useState<number>(1);
  const [cctvFov, setCctvFov] = useState<number>(70);
  const [cctvRange, setCctvRange] = useState<number>(85);

  // Elements State (Interactive Vector Objects Layer)
  const [elements, setElements] = useState<FloorPlanElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Elements Undo/Redo History
  const [elementsHistory, setElementsHistory] = useState<FloorPlanElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Pointer Interaction State
  const [dragMode, setDragMode] = useState<
    'NONE' | 'DRAW_BRUSH' | 'DRAW_LINE' | 'DRAW_RECT' | 'DRAW_ARROW' | 'MOVE_ELEMENT' | 'ROTATE_ELEMENT' | 'RESIZE_ELEMENT' | 'MOVE_TARGET'
  >('NONE');

  const dragStartCoordsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialElementStateRef = useRef<FloorPlanElement | null>(null);
  const isPointerDownRef = useRef<boolean>(false);

  // Temporary arrow & rectangle drawing preview
  const [arrowPreview, setArrowPreview] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const [rectPreview, setRectPreview] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const [customRoomLabel, setCustomRoomLabel] = useState<string>('Kamar 101');
  const [, setRoomCounter] = useState<number>(101);

  // Helper: Save element changes to history
  const pushElementsHistory = useCallback((newElements: FloorPlanElement[]) => {
    setElementsHistory(prev => {
      const slice = prev.slice(0, historyIndex + 1);
      return [...slice, newElements];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  // Selected Element reference
  const selectedElement = elements.find(el => el.id === selectedElementId) || null;

  // Initialize Elements & Background on Open
  useEffect(() => {
    if (!isOpen) return;

    // Create background canvas if not exists
    if (!bgCanvasRef.current) {
      const bgCanvas = document.createElement('canvas');
      bgCanvas.width = CANVAS_WIDTH;
      bgCanvas.height = CANVAS_HEIGHT;
      bgCanvasRef.current = bgCanvas;
    }

    const bgCtx = bgCanvasRef.current?.getContext('2d');
    if (bgCtx) {
      bgCtx.fillStyle = '#ffffff';
      bgCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // If initial blueprint provided (e.g. freshly snapped photo), load and center it
      if (initialBlueprintDataUrl) {
        const img = new Image();
        img.onload = () => {
          const hRatio = CANVAS_WIDTH / img.width;
          const vRatio = CANVAS_HEIGHT / img.height;
          const ratio = Math.min(hRatio, vRatio);
          const centerShiftX = (CANVAS_WIDTH - img.width * ratio) / 2;
          const centerShiftY = (CANVAS_HEIGHT - img.height * ratio) / 2;
          bgCtx.fillStyle = '#ffffff';
          bgCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          bgCtx.drawImage(
            img,
            0,
            0,
            img.width,
            img.height,
            centerShiftX,
            centerShiftY,
            img.width * ratio,
            img.height * ratio
          );
          redraw();
        };
        img.src = initialBlueprintDataUrl;
      } else if (floor.floorPlanSketch) {
        // If existing background image exists, load it
        const img = new Image();
        img.onload = () => {
          bgCtx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          redraw();
        };
        img.src = floor.floorPlanSketch;
      } else {
        // Initial clean template frame & watermark
        bgCtx.strokeStyle = '#e2e8f0';
        bgCtx.lineWidth = 2;
        bgCtx.strokeRect(20, 20, CANVAS_WIDTH - 40, CANVAS_HEIGHT - 40);

        bgCtx.fillStyle = '#94a3b8';
        bgCtx.font = 'bold 16px sans-serif';
        bgCtx.fillText(`DENAH SKETSA IT OPS: ${building.name.toUpperCase()} — ${floor.name.toUpperCase()}`, 35, 45);
        bgCtx.font = '12px sans-serif';
        bgCtx.fillText(`SOP Opening 4 Pilar: Wi-Fi Access Point • CCTV Coverage • Door Access • TV Display`, 35, 65);
      }
    }

    // Load Elements: if saved elementsJson exists, parse it; else load sample demo elements for Lantai 1
    if (floor.floorPlanElements) {
      try {
        const parsed = JSON.parse(floor.floorPlanElements);
        if (Array.isArray(parsed)) {
          setElements(parsed);
          setElementsHistory([parsed]);
          setHistoryIndex(0);
          return;
        }
      } catch (e) {
        console.warn('Failed to parse floorPlanElements:', e);
      }
    }

    // Fallback: If floor 1 has default template, initialize demo elements with all 3 statuses
    if (floor.floorNumber === 1 && (!floor.floorPlanElements || floor.floorPlanElements.trim() === '')) {
      const initialElements: FloorPlanElement[] = [
        {
          id: 'el-room-101',
          type: 'RECT',
          status: 'EXISTING',
          x: 230,
          y: 200,
          width: 180,
          height: 120,
          rotation: 0,
          scale: 1,
          label: 'Kamar 101',
          color: '#1e3a8a',
        },
        {
          id: 'el-room-102',
          type: 'RECT',
          status: 'EXISTING',
          x: 430,
          y: 200,
          width: 180,
          height: 120,
          rotation: 0,
          scale: 1,
          label: 'Kamar 102',
          color: '#1e3a8a',
        },
        {
          id: 'el-ap-1',
          type: 'AP_WIFI',
          status: 'EXISTING',
          x: 540,
          y: 240,
          rotation: 0,
          scale: 1,
          label: 'AP 1 Koridor',
          wifiMode: 'OMNI',
        },
        {
          id: 'el-cctv-1',
          type: 'CCTV',
          status: 'EXISTING',
          x: 1090,
          y: 110,
          rotation: 225,
          scale: 1,
          label: 'Titik 1 Dapur',
          fov: 70,
          range: 90,
        },
        {
          id: 'el-cctv-2',
          type: 'CCTV',
          status: 'EXISTING',
          x: 430,
          y: 110,
          rotation: 315,
          scale: 1,
          label: 'Titik 2 Koridor',
          fov: 70,
          range: 90,
        },
        {
          id: 'el-cctv-3',
          type: 'CCTV',
          status: 'PLANNING',
          x: 880,
          y: 520,
          rotation: 180,
          scale: 1,
          label: 'Titik 3 Parkir (Rencana)',
          fov: 75,
          range: 90,
        },
        {
          id: 'el-ap-2',
          type: 'AP_WIFI',
          status: 'RELOCATE',
          x: 230,
          y: 360,
          rotation: 90,
          scale: 1,
          label: 'AP 2 (Perlu Dipindah)',
          wifiMode: 'OMNI',
          targetX: 230,
          targetY: 530,
        },
        {
          id: 'el-arrow-relocate',
          type: 'ARROW',
          status: 'RELOCATE',
          x: 230,
          y: 360,
          targetX: 230,
          targetY: 530,
          rotation: 90,
          scale: 1,
          label: 'Relokasi AP ke Kamar 103',
        },
        {
          id: 'el-mdf-1',
          type: 'MDF_RACK',
          status: 'EXISTING',
          x: 745,
          y: 385,
          rotation: 0,
          scale: 1,
          label: '⚡ MDF Switch PoE',
        },
        {
          id: 'el-lock-1',
          type: 'SMARTLOCK',
          status: 'EXISTING',
          x: 720,
          y: 520,
          rotation: 0,
          scale: 1,
          label: '🚪 GATE Utama',
        },
      ];
      setElements(initialElements);
      setElementsHistory([initialElements]);
      setHistoryIndex(0);
    } else {
      setElements([]);
      setElementsHistory([[]]);
      setHistoryIndex(0);
    }
  }, [isOpen, floor.id, floor.floorPlanSketch, floor.floorPlanElements, floor.floorNumber]);

  // Convert pointer event to canvas coordinate space
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // =========================================================================
  // DRAWING ASSETS & ELEMENTS ON CANVAS CONTEXT
  // =========================================================================

  // Draw CCTV element with FOV cone & Status Badge
  const drawCctvElement = (ctx: CanvasRenderingContext2D, el: FloorPlanElement) => {
    const theme = STATUS_THEMES[el.status];
    const scale = el.scale || 1;
    const fov = el.fov || 70;
    const range = (el.range || 85) * scale;
    const halfFovRad = ((fov / 2) * Math.PI) / 180;

    ctx.save();
    ctx.translate(el.x, el.y);
    ctx.rotate((el.rotation * Math.PI) / 180);

    // 1. Vision Cone (Field of View / FOV Beam)
    ctx.beginPath();
    ctx.moveTo(12 * scale, 0);
    ctx.arc(0, 0, range, -halfFovRad, halfFovRad, false);
    ctx.lineTo(12 * scale, 0);
    ctx.closePath();

    const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, range);
    grad.addColorStop(0, theme.fill);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.02)');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 2 * scale;
    if (el.status === 'PLANNING') {
      ctx.setLineDash([5 * scale, 4 * scale]);
    } else if (el.status === 'RELOCATE') {
      ctx.setLineDash([4 * scale, 3 * scale]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Range Arc Distance Guide
    ctx.beginPath();
    ctx.arc(0, 0, range * 0.55, -halfFovRad * 0.8, halfFovRad * 0.8, false);
    ctx.strokeStyle = `${theme.primary}55`;
    ctx.lineWidth = 1.2 * scale;
    ctx.stroke();

    // Centerline Direction Aim Ray
    ctx.beginPath();
    ctx.moveTo(14 * scale, 0);
    ctx.lineTo(range - 8 * scale, 0);
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 1.2 * scale;
    ctx.stroke();

    // Directional Arrow Head
    ctx.beginPath();
    ctx.moveTo(range - 2 * scale, 0);
    ctx.lineTo(range - 10 * scale, -5 * scale);
    ctx.lineTo(range - 10 * scale, 5 * scale);
    ctx.closePath();
    ctx.fillStyle = theme.primary;
    ctx.fill();

    // 2. Camera Housing Body
    ctx.beginPath();
    ctx.roundRect(-10 * scale, -9 * scale, 24 * scale, 18 * scale, 4 * scale);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 2.5 * scale;
    ctx.stroke();

    // Status Indicator Lens
    ctx.beginPath();
    ctx.arc(13 * scale, 0, 4.5 * scale, 0, Math.PI * 2);
    ctx.fillStyle = el.status === 'RELOCATE' ? '#f97316' : el.status === 'PLANNING' ? '#3b82f6' : '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1 * scale;
    ctx.stroke();

    // Base Mount
    ctx.beginPath();
    ctx.arc(-10 * scale, 0, 8 * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#475569';
    ctx.fill();

    ctx.restore();

    // 3. Upright Status Label Badge
    ctx.save();
    ctx.translate(el.x, el.y);
    ctx.font = `bold ${Math.max(9, Math.round(10 * scale))}px monospace`;
    const labelText = el.label;
    const textWidth = ctx.measureText(labelText).width;
    const statusText = theme.badge;
    ctx.font = `bold ${Math.max(8, Math.round(8 * scale))}px sans-serif`;
    const badgeWidth = ctx.measureText(statusText).width;

    const totalWidth = Math.max(textWidth, badgeWidth) + 16 * scale;

    // Background badge
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.roundRect(-totalWidth / 2, -38 * scale, totalWidth, 24 * scale, 4 * scale);
    ctx.fill();
    ctx.stroke();

    // Status pill dot
    ctx.fillStyle = theme.primary;
    ctx.beginPath();
    ctx.arc(-totalWidth / 2 + 7 * scale, -26 * scale, 3 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Text Label
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(9, Math.round(9.5 * scale))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, 2 * scale, -30 * scale);

    // Status subtag
    ctx.fillStyle = theme.tagColor;
    ctx.font = `bold ${Math.max(7, Math.round(7.5 * scale))}px sans-serif`;
    ctx.fillText(statusText, 2 * scale, -19 * scale);

    // Degree indicator below
    ctx.fillStyle = '#94a3b8';
    ctx.font = `bold ${Math.max(8, Math.round(8.5 * scale))}px monospace`;
    ctx.fillText(`${el.rotation}°`, 0, 24 * scale);

    ctx.restore();
  };

  // Draw Wi-Fi AP Element with Coverage Waves & Status Badge
  const drawWifiElement = (ctx: CanvasRenderingContext2D, el: FloorPlanElement) => {
    const theme = STATUS_THEMES[el.status];
    const scale = el.scale || 1;
    const isDirectional = el.wifiMode === 'DIRECTIONAL';

    ctx.save();
    ctx.translate(el.x, el.y);

    if (isDirectional) {
      // Directional Wall-Mounted AP
      ctx.rotate((el.rotation * Math.PI) / 180);
      const fovRad = (100 * Math.PI) / 180;

      [35, 60, 85].forEach((r, idx) => {
        ctx.beginPath();
        ctx.arc(0, 0, r * scale, -fovRad / 2, fovRad / 2);
        ctx.strokeStyle = `${theme.primary}${Math.round((0.8 - idx * 0.2) * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 2.5 * scale;
        if (el.status === 'PLANNING') ctx.setLineDash([4 * scale, 3 * scale]);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Fill cone
      ctx.beginPath();
      ctx.moveTo(8 * scale, 0);
      ctx.arc(0, 0, 85 * scale, -fovRad / 2, fovRad / 2);
      ctx.closePath();
      ctx.fillStyle = theme.fill;
      ctx.fill();

      // Wall Mount Box
      ctx.beginPath();
      ctx.roundRect(-14 * scale, -14 * scale, 28 * scale, 28 * scale, 6 * scale);
      ctx.fillStyle = theme.dark;
      ctx.fill();
      ctx.strokeStyle = theme.primary;
      ctx.lineWidth = 2.5 * scale;
      ctx.stroke();

      // Pointer Arrow
      ctx.beginPath();
      ctx.moveTo(10 * scale, 0);
      ctx.lineTo(2 * scale, -6 * scale);
      ctx.lineTo(2 * scale, 6 * scale);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();

    } else {
      // 360° Ceiling AP
      // Outer Coverage Ring
      ctx.beginPath();
      ctx.arc(0, 0, 68 * scale, 0, Math.PI * 2);
      ctx.fillStyle = theme.fill;
      ctx.fill();
      ctx.strokeStyle = `${theme.primary}55`;
      ctx.setLineDash([4 * scale, 4 * scale]);
      ctx.lineWidth = 1.5 * scale;
      ctx.stroke();
      ctx.setLineDash([]);

      // Mid Coverage Ring
      ctx.beginPath();
      ctx.arc(0, 0, 44 * scale, 0, Math.PI * 2);
      ctx.strokeStyle = `${theme.primary}99`;
      ctx.lineWidth = 1.5 * scale;
      ctx.stroke();

      // Core AP Puck Body
      ctx.beginPath();
      ctx.arc(0, 0, 22 * scale, 0, Math.PI * 2);
      ctx.fillStyle = theme.dark;
      ctx.fill();
      ctx.strokeStyle = theme.primary;
      ctx.lineWidth = 2.5 * scale;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(12 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('📶', 0, 0);
    }

    ctx.restore();

    // Upright Label Badge
    ctx.save();
    ctx.translate(el.x, el.y);
    ctx.font = `bold ${Math.max(9, Math.round(9.5 * scale))}px monospace`;
    const labelText = el.label;
    const textWidth = ctx.measureText(labelText).width;
    const statusText = theme.badge;
    ctx.font = `bold ${Math.max(7, Math.round(7.5 * scale))}px sans-serif`;
    const badgeWidth = ctx.measureText(statusText).width;

    const totalWidth = Math.max(textWidth, badgeWidth) + 16 * scale;
    const yOffset = isDirectional ? -38 * scale : -42 * scale;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.roundRect(-totalWidth / 2, yOffset, totalWidth, 24 * scale, 4 * scale);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(9, Math.round(9.5 * scale))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, 0, yOffset + 7 * scale);

    ctx.fillStyle = theme.tagColor;
    ctx.font = `bold ${Math.max(7, Math.round(7.5 * scale))}px sans-serif`;
    ctx.fillText(statusText, 0, yOffset + 18 * scale);

    ctx.restore();
  };

  // Draw Smartlock Element
  const drawSmartlockElement = (ctx: CanvasRenderingContext2D, el: FloorPlanElement) => {
    const theme = STATUS_THEMES[el.status];
    const scale = el.scale || 1;

    ctx.save();
    ctx.translate(el.x, el.y);
    ctx.rotate((el.rotation * Math.PI) / 180);

    ctx.beginPath();
    ctx.roundRect(-24 * scale, -20 * scale, 48 * scale, 40 * scale, 6 * scale);
    ctx.fillStyle = theme.fill;
    ctx.fill();
    ctx.lineWidth = 2.5 * scale;
    ctx.strokeStyle = theme.primary;
    if (el.status === 'PLANNING') ctx.setLineDash([4 * scale, 3 * scale]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = theme.dark;
    ctx.font = `bold ${Math.round(11 * scale)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚪 LOCK', 0, -4 * scale);
    ctx.font = `bold ${Math.round(8 * scale)}px sans-serif`;
    ctx.fillText(theme.badge, 0, 9 * scale);

    ctx.restore();
  };

  // Draw TV Element
  const drawTvElement = (ctx: CanvasRenderingContext2D, el: FloorPlanElement) => {
    const theme = STATUS_THEMES[el.status];
    const scale = el.scale || 1;

    ctx.save();
    ctx.translate(el.x, el.y);
    ctx.rotate((el.rotation * Math.PI) / 180);

    ctx.beginPath();
    ctx.roundRect(-25 * scale, -18 * scale, 50 * scale, 36 * scale, 4 * scale);
    ctx.fillStyle = theme.fill;
    ctx.fill();
    ctx.lineWidth = 2.5 * scale;
    ctx.strokeStyle = theme.primary;
    if (el.status === 'PLANNING') ctx.setLineDash([4 * scale, 3 * scale]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = theme.dark;
    ctx.font = `bold ${Math.round(11 * scale)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📺 TV', 0, -4 * scale);
    ctx.font = `bold ${Math.round(8 * scale)}px sans-serif`;
    ctx.fillText(theme.badge, 0, 9 * scale);

    ctx.restore();
  };

  // Draw MDF Rack Element
  const drawMdfRackElement = (ctx: CanvasRenderingContext2D, el: FloorPlanElement) => {
    const theme = STATUS_THEMES[el.status];
    const scale = el.scale || 1;

    ctx.save();
    ctx.translate(el.x, el.y);
    ctx.rotate((el.rotation * Math.PI) / 180);

    ctx.beginPath();
    ctx.roundRect(-26 * scale, -20 * scale, 52 * scale, 40 * scale, 4 * scale);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.lineWidth = 2.5 * scale;
    ctx.strokeStyle = theme.primary;
    ctx.stroke();

    ctx.fillStyle = theme.primary;
    ctx.font = `bold ${Math.round(10 * scale)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡ RACK', 0, -5 * scale);
    ctx.font = `bold ${Math.round(8 * scale)}px monospace`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('MDF/IDF', 0, 10 * scale);

    ctx.restore();
  };

  // Draw LAN Data Port
  const drawLanPortElement = (ctx: CanvasRenderingContext2D, el: FloorPlanElement) => {
    const theme = STATUS_THEMES[el.status];
    const scale = el.scale || 1;

    ctx.save();
    ctx.translate(el.x, el.y);

    ctx.beginPath();
    ctx.arc(0, 0, 16 * scale, 0, Math.PI * 2);
    ctx.fillStyle = theme.dark;
    ctx.fill();
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 2 * scale;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(9 * scale)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LAN', 0, 0);

    ctx.restore();
  };

  // Draw Arrow / Relocation Path Element
  const drawArrowElement = (ctx: CanvasRenderingContext2D, el: FloorPlanElement) => {
    const theme = STATUS_THEMES[el.status];
    const targetX = el.targetX ?? (el.x + 100);
    const targetY = el.targetY ?? el.y;

    const dx = targetX - el.x;
    const dy = targetY - el.y;
    const angle = Math.atan2(dy, dx);
    const length = Math.hypot(dx, dy);

    ctx.save();

    // 1. Dashed arrow route line
    ctx.beginPath();
    ctx.moveTo(el.x, el.y);
    ctx.lineTo(targetX, targetY);
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 3.5;
    ctx.setLineDash([6, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Arrowhead at target
    const headLen = 14;
    ctx.beginPath();
    ctx.moveTo(targetX, targetY);
    ctx.lineTo(
      targetX - headLen * Math.cos(angle - Math.PI / 6),
      targetY - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      targetX - headLen * Math.cos(angle + Math.PI / 6),
      targetY - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = theme.primary;
    ctx.fill();

    // 3. Start Point origin dot
    ctx.beginPath();
    ctx.arc(el.x, el.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = theme.primary;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 4. Middle Label Badge
    if (el.label) {
      const midX = (el.x + targetX) / 2;
      const midY = (el.y + targetY) / 2;

      ctx.font = 'bold 10px monospace';
      const textWidth = ctx.measureText(el.label).width;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.strokeStyle = theme.primary;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(midX - textWidth / 2 - 8, midY - 11, textWidth + 16, 22, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = theme.tagColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(el.label, midX, midY);
    }

    ctx.restore();
  };

  // Draw Text Element
  const drawTextElement = (ctx: CanvasRenderingContext2D, el: FloorPlanElement) => {
    const scale = el.scale || 1;
    const text = el.label || el.text || 'Label';

    ctx.save();
    ctx.translate(el.x, el.y);
    ctx.rotate((el.rotation * Math.PI) / 180);

    ctx.font = `bold ${Math.round(14 * scale)}px sans-serif`;
    const textWidth = ctx.measureText(text).width;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.strokeStyle = el.color || '#1e293b';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.roundRect(-textWidth / 2 - 8 * scale, -14 * scale, textWidth + 16 * scale, 28 * scale, 4 * scale);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = el.color || '#1e293b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0);

    ctx.restore();
  };

  // Draw Rectangle / Room Box Element (Interactive Vector)
  const drawRectElement = (ctx: CanvasRenderingContext2D, el: FloorPlanElement) => {
    const scale = el.scale || 1;
    const w = Math.max(30, (el.width || 120) * scale);
    const h = Math.max(20, (el.height || 80) * scale);
    const halfW = w / 2;
    const halfH = h / 2;
    const theme = STATUS_THEMES[el.status];
    const strokeClr = el.color || theme.primary;

    ctx.save();
    ctx.translate(el.x, el.y);
    if (el.rotation) {
      ctx.rotate((el.rotation * Math.PI) / 180);
    }

    // 1. Semi-transparent room fill
    ctx.fillStyle = `${strokeClr}18`;
    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, w, h, 6 * scale);
    ctx.fill();

    // 2. Room wall border
    ctx.strokeStyle = strokeClr;
    ctx.lineWidth = 2.5 * scale;
    ctx.stroke();

    // 3. Centered Room Label Badge
    if (el.label) {
      ctx.font = `bold ${Math.max(10, Math.round(12 * scale))}px sans-serif`;
      const textMetrics = ctx.measureText(el.label);
      const badgeW = textMetrics.width + 16 * scale;
      const badgeH = 22 * scale;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
      ctx.strokeStyle = strokeClr;
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      ctx.roundRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH, 4 * scale);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(el.label, 0, 0);
    }

    // 4. Subtle Dimensions tag (only when room is sufficiently large)
    if (w >= 70 && h >= 48) {
      ctx.font = `bold ${Math.max(8, Math.round(9 * scale))}px monospace`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.70)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(w)} × ${Math.round(h)} px`, 0, 16 * scale);
    }

    ctx.restore();
  };

  // Draw Selection Transform Bounding Box & Handles
  const drawSelectionBox = (ctx: CanvasRenderingContext2D, el: FloorPlanElement) => {
    const theme = STATUS_THEMES[el.status];
    const scale = el.scale || 1;

    if (el.type === 'ARROW') {
      // For Arrow: draw start and target handles
      const targetX = el.targetX ?? (el.x + 100);
      const targetY = el.targetY ?? el.y;

      // Start Handle (Blue Ring)
      ctx.beginPath();
      ctx.arc(el.x, el.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Target Handle (Emerald Target Ring)
      ctx.beginPath();
      ctx.arc(targetX, targetY, 11, 0, Math.PI * 2);
      ctx.fillStyle = theme.primary;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎯', targetX, targetY);
      return;
    }

    // Stamp / Rect Bounding Box Dimensions
    const isRect = el.type === 'RECT';
    const boxW = isRect ? Math.max(40, (el.width || 120) * scale) : Math.max(70, Math.round(75 * scale));
    const boxH = isRect ? Math.max(40, (el.height || 80) * scale) : Math.max(70, Math.round(75 * scale));
    const halfW = boxW / 2;
    const halfH = boxH / 2;

    ctx.save();
    ctx.translate(el.x, el.y);
    if (el.rotation) {
      ctx.rotate((el.rotation * Math.PI) / 180);
    }

    // Dashed bounding rectangle
    ctx.beginPath();
    ctx.rect(-halfW, -halfH, boxW, boxH);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4 Corner Resize Handles + 4 Edge Midpoint Handles (for Rect)
    const handleSize = 8;
    const handles = [
      { x: -halfW, y: -halfH },
      { x: halfW, y: -halfH },
      { x: halfW, y: halfH },
      { x: -halfW, y: halfH },
      ...(isRect ? [
        { x: 0, y: -halfH },
        { x: halfW, y: 0 },
        { x: 0, y: halfH },
        { x: -halfW, y: 0 },
      ] : [])
    ];

    handles.forEach(c => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
    });

    // Top Rotation Arm & Knob
    const rotateArmY = -halfH - 24;
    ctx.beginPath();
    ctx.moveTo(0, -halfH);
    ctx.lineTo(0, rotateArmY);
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, rotateArmY, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#3b82f6';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    // If Element has RELOCATE status: also draw associated relocation arrow to target!
    if (el.status === 'RELOCATE' && el.targetX !== undefined && el.targetY !== undefined) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(el.x, el.y);
      ctx.lineTo(el.targetX, el.targetY);
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Target pin dot
      ctx.beginPath();
      ctx.arc(el.targetX, el.targetY, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#ea580c';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('📍', el.targetX, el.targetY);

      // Pill label
      ctx.fillStyle = 'rgba(124, 45, 18, 0.95)';
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(el.targetX - 45, el.targetY + 14, 90, 18, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fed7aa';
      ctx.font = 'bold 8px sans-serif';
      ctx.fillText('Titik Baru (Relokasi)', el.targetX, el.targetY + 23);
      ctx.restore();
    }
  };

  // Full Canvas Re-render (Background + Elements + Selection + Drag Previews)
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Draw Background Canvas
    if (bgCanvasRef.current) {
      ctx.drawImage(bgCanvasRef.current, 0, 0);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // 2. Draw Elements in order
    elements.forEach(el => {
      switch (el.type) {
        case 'CCTV':
          drawCctvElement(ctx, el);
          break;
        case 'AP_WIFI':
          drawWifiElement(ctx, el);
          break;
        case 'SMARTLOCK':
          drawSmartlockElement(ctx, el);
          break;
        case 'TV':
          drawTvElement(ctx, el);
          break;
        case 'MDF_RACK':
          drawMdfRackElement(ctx, el);
          break;
        case 'LAN_PORT':
          drawLanPortElement(ctx, el);
          break;
        case 'ARROW':
          drawArrowElement(ctx, el);
          break;
        case 'TEXT':
          drawTextElement(ctx, el);
          break;
        case 'RECT':
          drawRectElement(ctx, el);
          break;
      }
    });

    // 3. Draw Selection Bounding Box & Handles for Selected Element
    if (selectedElementId) {
      const selected = elements.find(el => el.id === selectedElementId);
      if (selected) {
        drawSelectionBox(ctx, selected);
      }
    }

    // 4. Live Arrow Drawing Preview
    if (arrowPreview) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(arrowPreview.startX, arrowPreview.startY);
      ctx.lineTo(arrowPreview.currentX, arrowPreview.currentY);
      ctx.strokeStyle = STATUS_THEMES[activeStatus].primary;
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(arrowPreview.currentX, arrowPreview.currentY, 6, 0, Math.PI * 2);
      ctx.fillStyle = STATUS_THEMES[activeStatus].primary;
      ctx.fill();
      ctx.restore();
    }

    // 5. Live Rectangle Drawing Preview
    if (rectPreview) {
      const rx = Math.min(rectPreview.startX, rectPreview.currentX);
      const ry = Math.min(rectPreview.startY, rectPreview.currentY);
      const rw = Math.abs(rectPreview.currentX - rectPreview.startX);
      const rh = Math.abs(rectPreview.currentY - rectPreview.startY);

      ctx.save();
      const strokeClr = selectedColor || STATUS_THEMES[activeStatus].primary;
      ctx.strokeStyle = strokeClr;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.fillStyle = `${strokeClr}20`;
      ctx.fillRect(rx, ry, rw, rh);

      // Dimension badge in preview center
      if (rw > 30 && rh > 20) {
        const badgeText = `${Math.round(rw)} × ${Math.round(rh)}`;
        ctx.font = 'bold 10px monospace';
        const bw = ctx.measureText(badgeText).width + 16;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.beginPath();
        ctx.roundRect(rx + rw / 2 - bw / 2, ry + rh / 2 - 10, bw, 20, 4);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, rx + rw / 2, ry + rh / 2);
      }
      ctx.restore();
    }
  }, [elements, selectedElementId, arrowPreview, rectPreview, activeStatus, selectedColor]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // =========================================================================
  // HIT TESTING FOR SELECTING & TRANSFORMING ELEMENTS
  // =========================================================================
  const hitTest = (coords: { x: number; y: number }): {
    element: FloorPlanElement | null;
    mode: 'MOVE_ELEMENT' | 'ROTATE_ELEMENT' | 'RESIZE_ELEMENT' | 'MOVE_TARGET' | 'NONE';
  } => {
    // 1. Check selected element's handles first
    if (selectedElement) {
      const el = selectedElement;
      const scale = el.scale || 1;

      // Check Arrow target handle
      if (el.type === 'ARROW' || (el.status === 'RELOCATE' && el.targetX !== undefined)) {
        const tx = el.targetX ?? (el.x + 100);
        const ty = el.targetY ?? el.y;
        if (Math.hypot(coords.x - tx, coords.y - ty) <= 16) {
          return { element: el, mode: 'MOVE_TARGET' };
        }
      }

      // Check RECT Element handles & body in local rotated space
      if (el.type === 'RECT') {
        const boxW = Math.max(40, (el.width || 120) * scale);
        const boxH = Math.max(40, (el.height || 80) * scale);
        const halfW = boxW / 2;
        const halfH = boxH / 2;

        const rad = -((el.rotation || 0) * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const dx = coords.x - el.x;
        const dy = coords.y - el.y;
        const lx = dx * cos - dy * sin;
        const ly = dx * sin + dy * cos;

        // Check Top Rotation Knob at (0, -halfH - 24)
        if (Math.hypot(lx - 0, ly - (-halfH - 24)) <= 16) {
          return { element: el, mode: 'ROTATE_ELEMENT' };
        }

        // Check 4 Corner & 4 Edge Midpoint Resize Handles
        const handles = [
          { x: -halfW, y: -halfH },
          { x: halfW, y: -halfH },
          { x: halfW, y: halfH },
          { x: -halfW, y: halfH },
          { x: 0, y: -halfH },
          { x: halfW, y: 0 },
          { x: 0, y: halfH },
          { x: -halfW, y: 0 },
        ];
        for (const h of handles) {
          if (Math.hypot(lx - h.x, ly - h.y) <= 15) {
            return { element: el, mode: 'RESIZE_ELEMENT' };
          }
        }

        // Check inside room box interior
        if (Math.abs(lx) <= halfW + 6 && Math.abs(ly) <= halfH + 6) {
          return { element: el, mode: 'MOVE_ELEMENT' };
        }
      } else {
        // Stamp / Arrow / Text
        // Check Rotation Knob (top handle)
        const boxH = Math.max(70, Math.round(75 * scale));
        const rotateKnobX = el.x;
        const rotateKnobY = el.y - boxH / 2 - 24;
        if (Math.hypot(coords.x - rotateKnobX, coords.y - rotateKnobY) <= 16) {
          return { element: el, mode: 'ROTATE_ELEMENT' };
        }

        // Check 4 Corner Resize Handles
        const boxW = Math.max(70, Math.round(75 * scale));
        const halfW = boxW / 2;
        const halfH = boxH / 2;
        const corners = [
          { x: el.x - halfW, y: el.y - halfH },
          { x: el.x + halfW, y: el.y - halfH },
          { x: el.x + halfW, y: el.y + halfH },
          { x: el.x - halfW, y: el.y + halfH },
        ];
        for (const c of corners) {
          if (Math.hypot(coords.x - c.x, coords.y - c.y) <= 14) {
            return { element: el, mode: 'RESIZE_ELEMENT' };
          }
        }

        // Check self body
        if (Math.hypot(coords.x - el.x, coords.y - el.y) <= halfW + 10) {
          return { element: el, mode: 'MOVE_ELEMENT' };
        }
      }
    }

    // 2. Check all elements in reverse order (topmost first)
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      const scale = el.scale || 1;

      if (el.type === 'ARROW') {
        // Distance from point to line segment
        const tx = el.targetX ?? (el.x + 100);
        const ty = el.targetY ?? el.y;
        const distToStart = Math.hypot(coords.x - el.x, coords.y - el.y);
        const distToEnd = Math.hypot(coords.x - tx, coords.y - ty);
        if (distToStart <= 22 || distToEnd <= 22) {
          return { element: el, mode: 'MOVE_ELEMENT' };
        }
      } else if (el.type === 'RECT') {
        const boxW = Math.max(40, (el.width || 120) * scale);
        const boxH = Math.max(40, (el.height || 80) * scale);
        const halfW = boxW / 2;
        const halfH = boxH / 2;

        const rad = -((el.rotation || 0) * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const dx = coords.x - el.x;
        const dy = coords.y - el.y;
        const lx = dx * cos - dy * sin;
        const ly = dx * sin + dy * cos;

        if (Math.abs(lx) <= halfW && Math.abs(ly) <= halfH) {
          return { element: el, mode: 'MOVE_ELEMENT' };
        }
      } else {
        const radius = Math.max(35, 40 * scale);
        if (Math.hypot(coords.x - el.x, coords.y - el.y) <= radius) {
          return { element: el, mode: 'MOVE_ELEMENT' };
        }
      }
    }

    return { element: null, mode: 'NONE' };
  };

  // =========================================================================
  // POINTER INTERACTIONS (DOWN, MOVE, UP)
  // =========================================================================
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isPointerDownRef.current = true;
    const coords = getCanvasCoords(e);
    dragStartCoordsRef.current = coords;

    // 1. SELECT / TRANSFORM TOOL
    if (activeTool === 'select') {
      const hit = hitTest(coords);
      if (hit.element) {
        setSelectedElementId(hit.element.id);
        initialElementStateRef.current = { ...hit.element };
        setDragMode(hit.mode);
      } else {
        setSelectedElementId(null);
        setDragMode('NONE');
      }
      return;
    }

    // 2. STAMP TOOL (Place new interactive asset element)
    if (activeTool === 'stamp') {
      const id = `el-${selectedStamp.toLowerCase()}-${Date.now().toString().slice(-6)}`;
      let initialLabel = selectedStamp === 'CCTV' ? customCctvLabel : selectedStamp === 'AP_WIFI' ? customWifiLabel : selectedStamp;
      
      const newElement: FloorPlanElement = {
        id,
        type: selectedStamp,
        status: activeStatus,
        x: coords.x,
        y: coords.y,
        rotation: stampAngle,
        scale: 1.0,
        label: initialLabel,
        fov: cctvFov,
        range: cctvRange,
        wifiMode: wifiMode,
        targetX: activeStatus === 'RELOCATE' ? coords.x + 90 : undefined,
        targetY: activeStatus === 'RELOCATE' ? coords.y : undefined,
      };

      const updated = [...elements, newElement];
      setElements(updated);
      pushElementsHistory(updated);
      setSelectedElementId(id);

      // Auto increment counter
      if (selectedStamp === 'CCTV') {
        const next = cctvCounter + 1;
        setCctvCounter(next);
        setCustomCctvLabel(`CAM ${next < 10 ? '0' + next : next}`);
      } else if (selectedStamp === 'AP_WIFI') {
        const next = wifiCounter + 1;
        setWifiCounter(next);
        setCustomWifiLabel(`AP ${next}`);
      }

      // Switch to select tool so user can immediately move / rotate / resize
      setActiveTool('select');
      initialElementStateRef.current = { ...newElement };
      setDragMode('MOVE_ELEMENT');
      return;
    }

    // 3. ARROW TOOL (Drag from start to end)
    if (activeTool === 'arrow') {
      setDragMode('DRAW_ARROW');
      setArrowPreview({
        startX: coords.x,
        startY: coords.y,
        currentX: coords.x,
        currentY: coords.y,
      });
      return;
    }

    // 4. TEXT TOOL
    if (activeTool === 'text') {
      const label = window.prompt('Masukkan teks label ruangan / denah:', customText);
      if (label && label.trim()) {
        const id = `el-text-${Date.now().toString().slice(-6)}`;
        const newEl: FloorPlanElement = {
          id,
          type: 'TEXT',
          status: activeStatus,
          x: coords.x,
          y: coords.y,
          rotation: 0,
          scale: 1,
          label: label.trim(),
          color: selectedColor,
        };
        const updated = [...elements, newEl];
        setElements(updated);
        pushElementsHistory(updated);
        setSelectedElementId(id);
        setCustomText(label.trim());
        setActiveTool('select');
      }
      return;
    }

    // 5. RECT TOOL (Room box vector element)
    if (activeTool === 'rect') {
      setDragMode('DRAW_RECT');
      setRectPreview({
        startX: coords.x,
        startY: coords.y,
        currentX: coords.x,
        currentY: coords.y,
      });
      return;
    }

    // 6. BRUSH / LINE / ERASER (Draws directly on background canvas)
    const bgCtx = bgCanvasRef.current?.getContext('2d');
    if (bgCtx) {
      bgCtx.beginPath();
      bgCtx.moveTo(coords.x, coords.y);
      bgCtx.lineCap = 'round';
      bgCtx.lineJoin = 'round';

      if (activeTool === 'eraser') {
        bgCtx.strokeStyle = '#ffffff';
        bgCtx.lineWidth = strokeWidth * 3;
        setDragMode('DRAW_BRUSH');
      } else if (activeTool === 'brush') {
        bgCtx.strokeStyle = isHighlighter ? `${selectedColor}44` : selectedColor;
        bgCtx.lineWidth = strokeWidth;
        setDragMode('DRAW_BRUSH');
      } else if (activeTool === 'line') {
        setDragMode('DRAW_LINE');
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDownRef.current) return;
    const coords = getCanvasCoords(e);
    const startCoords = dragStartCoordsRef.current;
    const dx = coords.x - startCoords.x;
    const dy = coords.y - startCoords.y;

    // 1. TRANSFORM ACTIVE ELEMENT
    if (selectedElement && initialElementStateRef.current) {
      const init = initialElementStateRef.current;

      if (dragMode === 'MOVE_ELEMENT') {
        // Move element position
        setElements(prev => prev.map(el => {
          if (el.id !== init.id) return el;
          const nextTargetX = el.targetX !== undefined && init.targetX !== undefined ? init.targetX + dx : undefined;
          const nextTargetY = el.targetY !== undefined && init.targetY !== undefined ? init.targetY + dy : undefined;
          return {
            ...el,
            x: Math.round(init.x + dx),
            y: Math.round(init.y + dy),
            targetX: nextTargetX,
            targetY: nextTargetY,
          };
        }));
        return;
      }

      if (dragMode === 'ROTATE_ELEMENT') {
        // Calculate dynamic angle aimed towards cursor relative to center
        let deg = Math.round(Math.atan2(coords.y - init.y, coords.x - init.x) * (180 / Math.PI)) + 90;
        deg = (deg + 360) % 360;
        setElements(prev => prev.map(el => el.id === init.id ? { ...el, rotation: deg } : el));
        return;
      }

      if (dragMode === 'RESIZE_ELEMENT') {
        if (init.type === 'RECT') {
          const initialW = init.width || 120;
          const initialH = init.height || 80;
          const initialDist = Math.hypot(startCoords.x - init.x, startCoords.y - init.y) || 40;
          const currentDist = Math.hypot(coords.x - init.x, coords.y - init.y);
          const ratio = currentDist / initialDist;
          const newW = Math.max(30, Math.round(initialW * ratio));
          const newH = Math.max(20, Math.round(initialH * ratio));
          setElements(prev => prev.map(el => el.id === init.id ? { ...el, width: newW, height: newH } : el));
          return;
        }

        // Calculate scale from distance
        const initialDist = Math.hypot(startCoords.x - init.x, startCoords.y - init.y) || 40;
        const currentDist = Math.hypot(coords.x - init.x, coords.y - init.y);
        const ratio = currentDist / initialDist;
        const newScale = Math.min(2.5, Math.max(0.5, Number((init.scale * ratio).toFixed(2))));
        setElements(prev => prev.map(el => el.id === init.id ? { ...el, scale: newScale } : el));
        return;
      }

      if (dragMode === 'MOVE_TARGET') {
        // Move arrow or relocation target point
        setElements(prev => prev.map(el => {
          if (el.id !== init.id) return el;
          return {
            ...el,
            targetX: Math.round(coords.x),
            targetY: Math.round(coords.y),
          };
        }));
        return;
      }
    }

    // 2. ARROW PREVIEW
    if (dragMode === 'DRAW_ARROW') {
      setArrowPreview({
        startX: startCoords.x,
        startY: startCoords.y,
        currentX: coords.x,
        currentY: coords.y,
      });
      return;
    }

    // 2.5. RECT PREVIEW
    if (dragMode === 'DRAW_RECT') {
      setRectPreview({
        startX: startCoords.x,
        startY: startCoords.y,
        currentX: coords.x,
        currentY: coords.y,
      });
      return;
    }

    // 3. BACKGROUND BRUSH / ERASER
    if (dragMode === 'DRAW_BRUSH') {
      const bgCtx = bgCanvasRef.current?.getContext('2d');
      if (bgCtx) {
        bgCtx.lineTo(coords.x, coords.y);
        bgCtx.stroke();
        redraw();
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);

    const coords = getCanvasCoords(e);
    const startCoords = dragStartCoordsRef.current;

    // 1. Commit Arrow creation
    if (dragMode === 'DRAW_ARROW' && arrowPreview) {
      const dist = Math.hypot(coords.x - startCoords.x, coords.y - startCoords.y);
      if (dist > 15) {
        const id = `el-arrow-${Date.now().toString().slice(-6)}`;
        const newArrow: FloorPlanElement = {
          id,
          type: 'ARROW',
          status: activeStatus,
          x: Math.round(startCoords.x),
          y: Math.round(startCoords.y),
          targetX: Math.round(coords.x),
          targetY: Math.round(coords.y),
          rotation: Math.round(Math.atan2(coords.y - startCoords.y, coords.x - startCoords.x) * (180 / Math.PI)),
          scale: 1,
          label: activeStatus === 'RELOCATE' ? 'Relokasi Titik' : 'Jalur / Arah',
        };
        const updated = [...elements, newArrow];
        setElements(updated);
        pushElementsHistory(updated);
        setSelectedElementId(id);
      }
      setArrowPreview(null);
      setDragMode('NONE');
      setActiveTool('select');
      return;
    }

    // 1.5. Commit Rect creation
    if (dragMode === 'DRAW_RECT' && rectPreview) {
      const rw = Math.abs(coords.x - startCoords.x);
      const rh = Math.abs(coords.y - startCoords.y);
      if (rw > 15 && rh > 15) {
        const centerX = Math.min(startCoords.x, coords.x) + rw / 2;
        const centerY = Math.min(startCoords.y, coords.y) + rh / 2;
        const id = `el-rect-${Date.now().toString().slice(-6)}`;
        const label = customRoomLabel.trim() || 'Kamar';

        const newRect: FloorPlanElement = {
          id,
          type: 'RECT',
          status: activeStatus,
          x: Math.round(centerX),
          y: Math.round(centerY),
          width: Math.round(rw),
          height: Math.round(rh),
          rotation: 0,
          scale: 1,
          label,
          color: selectedColor,
        };

        const updated = [...elements, newRect];
        setElements(updated);
        pushElementsHistory(updated);
        setSelectedElementId(id);

        // Auto-increment room number if present
        const numMatch = label.match(/\d+/);
        if (numMatch) {
          const oldNum = parseInt(numMatch[0], 10);
          const nextNum = oldNum + 1;
          const padLen = numMatch[0].length;
          setCustomRoomLabel(label.replace(/\d+/, nextNum.toString().padStart(padLen, '0')));
          setRoomCounter(nextNum);
        }

        setActiveTool('select');
      }
      setRectPreview(null);
      setDragMode('NONE');
      return;
    }

    // 2. Commit Background Shapes
    if (dragMode === 'DRAW_LINE') {
      const bgCtx = bgCanvasRef.current?.getContext('2d');
      if (bgCtx) {
        bgCtx.strokeStyle = selectedColor;
        bgCtx.lineWidth = strokeWidth;
        bgCtx.beginPath();
        bgCtx.moveTo(startCoords.x, startCoords.y);
        bgCtx.lineTo(coords.x, coords.y);
        bgCtx.stroke();
      }
      redraw();
    }

    // 3. Commit Element Move / Rotate / Resize to History
    if (
      dragMode === 'MOVE_ELEMENT' ||
      dragMode === 'ROTATE_ELEMENT' ||
      dragMode === 'RESIZE_ELEMENT' ||
      dragMode === 'MOVE_TARGET'
    ) {
      pushElementsHistory(elements);
    }

    setDragMode('NONE');
    initialElementStateRef.current = null;
  };

  // =========================================================================
  // ACTIONS: DUPLICATE, DELETE, ROTATE, STATUS CHANGE
  // =========================================================================

  // Duplicate Selected Element
  const handleDuplicateSelected = () => {
    if (!selectedElement) return;

    // Auto increment label number if present (e.g. CAM 01 -> CAM 02)
    let newLabel = selectedElement.label;
    const numMatch = newLabel.match(/\d+/);
    if (numMatch) {
      const oldNum = parseInt(numMatch[0], 10);
      const nextNum = oldNum + 1;
      const padLen = numMatch[0].length;
      newLabel = newLabel.replace(/\d+/, nextNum.toString().padStart(padLen, '0'));
    } else {
      newLabel = `${newLabel} (Salin)`;
    }

    const cloned: FloorPlanElement = {
      ...selectedElement,
      id: `el-${selectedElement.type.toLowerCase()}-${Date.now().toString().slice(-6)}`,
      x: selectedElement.x + 35,
      y: selectedElement.y + 35,
      targetX: selectedElement.targetX ? selectedElement.targetX + 35 : undefined,
      targetY: selectedElement.targetY ? selectedElement.targetY + 35 : undefined,
      label: newLabel,
    };

    const updated = [...elements, cloned];
    setElements(updated);
    pushElementsHistory(updated);
    setSelectedElementId(cloned.id);
  };

  // Delete Selected Element
  const handleDeleteSelected = () => {
    if (!selectedElement) return;
    const updated = elements.filter(el => el.id !== selectedElement.id);
    setElements(updated);
    pushElementsHistory(updated);
    setSelectedElementId(null);
  };

  // Rotate Selected Element by degrees delta
  const handleRotateSelected = (delta: number) => {
    if (!selectedElement) return;
    const newRot = (selectedElement.rotation + delta + 360) % 360;
    const updated = elements.map(el => el.id === selectedElement.id ? { ...el, rotation: newRot } : el);
    setElements(updated);
    pushElementsHistory(updated);
  };

  // Scale Selected Element
  const handleScaleSelected = (factor: number) => {
    if (!selectedElement) return;
    const newScale = Math.min(2.5, Math.max(0.5, Number((selectedElement.scale * factor).toFixed(2))));
    const updated = elements.map(el => el.id === selectedElement.id ? { ...el, scale: newScale } : el);
    setElements(updated);
    pushElementsHistory(updated);
  };

  // Change Status of Selected Element
  const handleChangeStatusSelected = (newStatus: ElementStatus) => {
    if (!selectedElement) return;
    const updated = elements.map(el => {
      if (el.id !== selectedElement.id) return el;
      return {
        ...el,
        status: newStatus,
        targetX: newStatus === 'RELOCATE' && el.targetX === undefined ? el.x + 90 : el.targetX,
        targetY: newStatus === 'RELOCATE' && el.targetY === undefined ? el.y : el.targetY,
      };
    });
    setElements(updated);
    pushElementsHistory(updated);
  };

  // Keyboard Shortcuts (Delete, Ctrl+D, Escape, Arrow keys)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) {
          e.preventDefault();
          handleDeleteSelected();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        if (selectedElementId) {
          e.preventDefault();
          handleDuplicateSelected();
        }
      } else if (e.key === 'Escape') {
        setSelectedElementId(null);
        setActiveTool('select');
      } else if (selectedElement && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 2;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;

        setElements(prev => prev.map(el => {
          if (el.id !== selectedElement.id) return el;
          return {
            ...el,
            x: el.x + dx,
            y: el.y + dy,
            targetX: el.targetX !== undefined ? el.targetX + dx : undefined,
            targetY: el.targetY !== undefined ? el.targetY + dy : undefined,
          };
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedElementId, selectedElement]);

  // Undo / Redo Elements
  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const prevIndex = historyIndex - 1;
    setElements(elementsHistory[prevIndex]);
    setHistoryIndex(prevIndex);
    setSelectedElementId(null);
  };

  const handleRedo = () => {
    if (historyIndex >= elementsHistory.length - 1) return;
    const nextIndex = historyIndex + 1;
    setElements(elementsHistory[nextIndex]);
    setHistoryIndex(nextIndex);
    setSelectedElementId(null);
  };

  // Clear Canvas & Elements
  const handleClearAll = () => {
    if (!window.confirm('Kosongkan semua gambar denah dan titik aset di lantai ini?')) return;
    const bgCtx = bgCanvasRef.current?.getContext('2d');
    if (bgCtx) {
      bgCtx.fillStyle = '#ffffff';
      bgCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    setElements([]);
    pushElementsHistory([]);
    setSelectedElementId(null);
    redraw();
  };

  // Shared Blueprint Loader (from Upload or Camera)
  const loadBlueprintImage = useCallback((dataUrl: string) => {
    const img = new Image();
    img.onload = () => {
      const bgCtx = bgCanvasRef.current?.getContext('2d');
      if (!bgCtx) return;

      const hRatio = CANVAS_WIDTH / img.width;
      const vRatio = CANVAS_HEIGHT / img.height;
      const ratio = Math.min(hRatio, vRatio);
      const centerShiftX = (CANVAS_WIDTH - img.width * ratio) / 2;
      const centerShiftY = (CANVAS_HEIGHT - img.height * ratio) / 2;

      bgCtx.fillStyle = '#ffffff';
      bgCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      bgCtx.drawImage(
        img,
        0,
        0,
        img.width,
        img.height,
        centerShiftX,
        centerShiftY,
        img.width * ratio,
        img.height * ratio
      );
      redraw();
    };
    img.src = dataUrl;
  }, [redraw]);

  // Upload Base Blueprint from File / Gallery
  const handleUploadBlueprint = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) loadBlueprintImage(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Capture Blueprint from Native Mobile Camera input
  const handleNativeCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) loadBlueprintImage(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Capture Blueprint from LiveCameraModal Viewfinder
  const handleLiveCameraCapture = (dataUrl: string) => {
    loadBlueprintImage(dataUrl);
    setIsLiveCameraOpen(false);
  };

  // Save to FloorConfig
  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Deselect before exporting snapshot so bounding boxes aren't permanently in image
    setSelectedElementId(null);

    setTimeout(() => {
      redraw();
      const dataUrl = canvas.toDataURL('image/png', 0.95);
      const elementsJson = JSON.stringify(elements);
      onSaveFloorPlan(floor.id, dataUrl, notes.trim(), elementsJson);
      setHasSaved(true);
      setTimeout(() => {
        setHasSaved(false);
        onClose();
      }, 500);
    }, 50);
  };

  // Download PNG file
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prevSelected = selectedElementId;
    setSelectedElementId(null);

    setTimeout(() => {
      redraw();
      const cleanBuildingName = building.name.replace(/[^a-zA-Z0-9]/g, '_');
      const cleanFloorName = floor.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Denah_${cleanBuildingName}_${cleanFloorName}_${Date.now()}.png`;

      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();

      setSelectedElementId(prevSelected);
    }, 50);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 select-none">
      <div 
        ref={containerRef}
        className="bg-card border border-border rounded-2xl w-full max-w-6xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        
        {/* ======================================================== */}
        {/* HEADER BAR                                               */}
        {/* ======================================================== */}
        <div className="p-3 sm:p-4 border-b border-border bg-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-foreground text-sm sm:text-base">
                  Studio Denah & Layout IT: {floor.name}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                  {building.name}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  {elements.length} Titik Aset IT
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Layout Interaktif: Klik titik untuk geser posisi, putar derajat arah sorot, resize, duplikat, atau ubah status (Existing / Planning / Relocate).
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={handleDownload}
              className="px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Download gambar denah (PNG)"
            >
              <Download className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">Export PNG</span>
            </button>

            <button
              onClick={handleSave}
              className={`px-3.5 py-1.5 rounded-lg text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
                hasSaved ? 'bg-emerald-600 scale-95' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{hasSaved ? 'Tersimpan!' : 'Simpan Denah'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ml-1"
              title="Tutup studio denah"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* PRIMARY TOOLBAR: TOOLS, ASSETS, STATUS TOGGLE           */}
        {/* ======================================================== */}
        <div className="p-2 sm:p-2.5 border-b border-border bg-muted/20 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none text-xs shrink-0 flex-wrap">
          
          {/* Tool Modes: Select vs Draw */}
          <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border">
            
            {/* SELECT / EDIT CURSOR TOOL */}
            <button
              onClick={() => setActiveTool('select')}
              className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors ${
                activeTool === 'select' ? 'bg-blue-600 text-white shadow-xs' : 'text-foreground hover:bg-muted'
              }`}
              title="Pilih & Edit Titik: Klik titik untuk geser, putar, resize, atau ubah status"
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span>Pilih / Edit</span>
            </button>

            {/* RELOCATE ARROW TOOL */}
            <button
              onClick={() => setActiveTool('arrow')}
              className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors ${
                activeTool === 'arrow' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-700 dark:text-amber-400 hover:bg-amber-500/10'
              }`}
              title="Tarik panah relokasi untuk menandai titik yang perlu dipindahkan posisinya"
            >
              <MoveUpRight className="w-3.5 h-3.5" />
              <span>Panah Relokasi</span>
            </button>

            {/* Brush Walls / Freehand */}
            <button
              onClick={() => { setActiveTool('brush'); setIsHighlighter(false); }}
              className={`px-2 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
                activeTool === 'brush' && !isHighlighter ? 'bg-zinc-800 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Pena Sketsa Bebas"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Pena</span>
            </button>

            <button
              onClick={() => { setActiveTool('line'); setIsHighlighter(false); }}
              className={`px-2 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
                activeTool === 'line' ? 'bg-zinc-800 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Garis Dinding Ruangan"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>Dinding</span>
            </button>

            <button
              onClick={() => { setActiveTool('rect'); setIsHighlighter(false); }}
              className={`px-2 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
                activeTool === 'rect' ? 'bg-blue-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Kotak Kamar Interaktif (Bisa digeser, diedit ukuran & namanya)"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Kamar</span>
            </button>

            <button
              onClick={() => { setActiveTool('eraser'); setIsHighlighter(false); }}
              className={`px-2 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
                activeTool === 'eraser' ? 'bg-rose-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Penghapus Sketsa Dinding"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Hapus</span>
            </button>

            <button
              onClick={() => { setActiveTool('text'); setIsHighlighter(false); }}
              className={`px-2 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
                activeTool === 'text' ? 'bg-blue-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Label Teks Kamar"
            >
              <Type className="w-3.5 h-3.5" />
              <span>Teks</span>
            </button>
          </div>

          {/* Active Tool Sub-Bar: When RECT Tool is active */}
          {activeTool === 'rect' && (
            <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/30 px-2.5 py-1 rounded-xl text-xs animate-in fade-in duration-100">
              <Square className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-[11px] font-semibold text-blue-900 dark:text-blue-200">
                Gambar Kamar:
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">Nama:</span>
              <input
                type="text"
                value={customRoomLabel}
                onChange={(e) => setCustomRoomLabel(e.target.value)}
                placeholder="Kamar 101"
                className="w-24 px-1.5 py-0.5 rounded bg-background border border-border text-xs font-mono font-bold text-foreground outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                (Drag di kanvas untuk menggambar kotak kamar interaktif)
              </span>
            </div>
          )}

          {/* ASSET STATUS SELECTOR: EXISTING vs PLANNING vs RELOCATE */}
          <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border">
            <span className="text-[10px] font-bold text-muted-foreground px-1 uppercase tracking-wider hidden xl:inline">
              Status Aset:
            </span>

            {/* 🟢 EXISTING */}
            <button
              type="button"
              onClick={() => {
                setActiveStatus('EXISTING');
                if (selectedElement) handleChangeStatusSelected('EXISTING');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                (selectedElement ? selectedElement.status === 'EXISTING' : activeStatus === 'EXISTING')
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10'
              }`}
              title="Titik yang saat ini sudah ada dan terpasang fisik di properti"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Existing</span>
            </button>

            {/* 🔵 PLANNING */}
            <button
              type="button"
              onClick={() => {
                setActiveStatus('PLANNING');
                if (selectedElement) handleChangeStatusSelected('PLANNING');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                (selectedElement ? selectedElement.status === 'PLANNING' : activeStatus === 'PLANNING')
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-700 dark:text-blue-400 hover:bg-blue-500/10'
              }`}
              title="Rencana titik baru yang perlu ditambahkan (planning)"
            >
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>Planning</span>
            </button>

            {/* 🟠 RELOCATE */}
            <button
              type="button"
              onClick={() => {
                setActiveStatus('RELOCATE');
                if (selectedElement) handleChangeStatusSelected('RELOCATE');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                (selectedElement ? selectedElement.status === 'RELOCATE' : activeStatus === 'RELOCATE')
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-700 dark:text-amber-400 hover:bg-amber-500/10'
              }`}
              title="Titik yang perlu dipindahkan posisinya (relocate)"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Relocate</span>
            </button>
          </div>

          {/* IT Asset Stamps */}
          <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border">
            <span className="text-[10px] font-bold text-muted-foreground px-1 uppercase tracking-wider hidden lg:inline">
              Tambah Aset:
            </span>
            
            <button
              onClick={() => { setActiveTool('stamp'); setSelectedStamp('AP_WIFI'); }}
              className={`px-2 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
                activeTool === 'stamp' && selectedStamp === 'AP_WIFI' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-foreground hover:bg-muted'
              }`}
              title="Tambah Titik Access Point Wi-Fi"
            >
              <Wifi className="w-3.5 h-3.5 text-emerald-500" />
              <span>AP Wi-Fi</span>
            </button>

            <button
              onClick={() => { setActiveTool('stamp'); setSelectedStamp('CCTV'); }}
              className={`px-2 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
                activeTool === 'stamp' && selectedStamp === 'CCTV' 
                  ? 'bg-amber-600 text-white shadow-xs' 
                  : 'text-foreground hover:bg-muted'
              }`}
              title="Tambah Titik CCTV (360° Sudut Sorotan)"
            >
              <Video className="w-3.5 h-3.5 text-amber-500" />
              <span>CCTV</span>
            </button>

            <button
              onClick={() => { setActiveTool('stamp'); setSelectedStamp('SMARTLOCK'); }}
              className={`px-2 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
                activeTool === 'stamp' && selectedStamp === 'SMARTLOCK' 
                  ? 'bg-purple-600 text-white shadow-xs' 
                  : 'text-foreground hover:bg-muted'
              }`}
              title="Tambah Pintu Smartlock / Access Gate"
            >
              <Lock className="w-3.5 h-3.5 text-purple-500" />
              <span>Smartlock</span>
            </button>

            <button
              onClick={() => { setActiveTool('stamp'); setSelectedStamp('TV'); }}
              className={`px-2 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
                activeTool === 'stamp' && selectedStamp === 'TV' 
                  ? 'bg-cyan-600 text-white shadow-xs' 
                  : 'text-foreground hover:bg-muted'
              }`}
              title="Tambah Smart TV / Google TV"
            >
              <Tv className="w-3.5 h-3.5 text-cyan-500" />
              <span>TV</span>
            </button>

            <button
              onClick={() => { setActiveTool('stamp'); setSelectedStamp('MDF_RACK'); }}
              className={`px-2 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
                activeTool === 'stamp' && selectedStamp === 'MDF_RACK' 
                  ? 'bg-zinc-800 text-white shadow-xs' 
                  : 'text-foreground hover:bg-muted'
              }`}
              title="Tambah Rack Server / Switch MDF"
            >
              <Zap className="w-3.5 h-3.5 text-sky-400" />
              <span>MDF</span>
            </button>
          </div>

          {/* Undo/Redo & Canvas Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleRedo}
              disabled={historyIndex >= elementsHistory.length - 1}
              className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-1.5 rounded-lg border transition-colors ${
                showGrid ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' : 'bg-background border-border text-muted-foreground hover:text-foreground'
              }`}
              title="Toggle Grid Milimeter"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>

            {/* Blueprint Background Source: Foto Denah Langsung via Kamera & Upload File */}
            <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border">
              {/* Ambil Foto Denah Langsung via Kamera */}
              <button
                type="button"
                onClick={() => setIsLiveCameraOpen(true)}
                className="px-2.5 py-1.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs"
                title="Ambil foto kertas denah fisik/arsitektur di lokasi dengan kamera untuk dijadikan latar kanvas"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold">Foto Denah</span>
              </button>

              {/* Upload File Blueprint dari Perangkat */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2 py-1.5 rounded-md hover:bg-background text-foreground text-[11px] font-semibold flex items-center gap-1 transition-colors"
                title="Upload file gambar denah/blueprint dari galeri atau laptop"
              >
                <Upload className="w-3.5 h-3.5 text-blue-500" />
                <span className="hidden sm:inline">Upload</span>
              </button>
            </div>

            {/* Hidden native camera capture input for direct OS camera fallback */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleNativeCameraCapture}
            />

            {/* Hidden file input for file/gallery upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUploadBlueprint}
            />

            <button
              onClick={handleClearAll}
              className="p-1.5 rounded-lg border border-border bg-background hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors"
              title="Kosongkan Semua Titik & Sketsa"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* ======================================================== */}
        {/* CONTEXTUAL INSPECTOR TOOLBAR: WHEN AN ELEMENT IS SELECTED */}
        {/* ======================================================== */}
        {selectedElement && (
          <div className="p-2 sm:p-2.5 bg-blue-500/10 border-b border-blue-500/25 flex items-center justify-between gap-3 text-xs flex-wrap animate-in fade-in duration-100">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 font-bold text-blue-900 dark:text-blue-300">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span>Edit Titik Terpilih:</span>
              </div>

              {/* Editable Label Input */}
              <div className="flex items-center gap-1 bg-background px-2 py-1 rounded-xl border border-blue-500/30">
                <span className="text-[10px] text-muted-foreground font-mono">Label:</span>
                <input
                  type="text"
                  value={selectedElement.label}
                  onChange={(e) => {
                    const val = e.target.value;
                    setElements(prev => prev.map(el => el.id === selectedElement.id ? { ...el, label: val } : el));
                  }}
                  className="w-28 sm:w-36 px-1.5 py-0.5 rounded bg-muted/40 border border-border text-xs font-mono font-bold text-foreground outline-none focus:border-blue-500"
                />
              </div>

              {/* Status Switcher for Selected Element */}
              <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-blue-500/30">
                {(['EXISTING', 'PLANNING', 'RELOCATE'] as ElementStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleChangeStatusSelected(st)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                      selectedElement.status === st
                        ? selectedElement.status === 'EXISTING'
                          ? 'bg-emerald-600 text-white'
                          : selectedElement.status === 'PLANNING'
                          ? 'bg-blue-600 text-white'
                          : 'bg-amber-600 text-white'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {st === 'EXISTING' ? '🟢 Existing' : st === 'PLANNING' ? '🔵 Planning' : '🟠 Relocate'}
                  </button>
                ))}
              </div>

              {/* Quick Rotation Buttons */}
              <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-blue-500/30">
                <button
                  onClick={() => handleRotateSelected(-45)}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold text-foreground hover:bg-muted"
                  title="Putar -45°"
                >
                  ↺ -45°
                </button>
                <span className="px-1 font-mono font-bold text-blue-600 dark:text-blue-400">
                  {selectedElement.rotation}°
                </span>
                <button
                  onClick={() => handleRotateSelected(45)}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold text-foreground hover:bg-muted"
                  title="Putar +45°"
                >
                  ↻ +45°
                </button>
              </div>

              {/* Scale / Resize Controls */}
              <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-blue-500/30">
                <span className="text-[10px] text-muted-foreground px-1 font-mono">Ukuran:</span>
                <button
                  onClick={() => handleScaleSelected(0.85)}
                  className="px-1.5 py-0.5 rounded text-[11px] font-bold text-foreground hover:bg-muted"
                  title="Kecilkan (0.85x)"
                >
                  -
                </button>
                <span className="px-1 font-mono font-bold text-foreground">
                  {Math.round((selectedElement.scale || 1) * 100)}%
                </span>
                <button
                  onClick={() => handleScaleSelected(1.15)}
                  className="px-1.5 py-0.5 rounded text-[11px] font-bold text-foreground hover:bg-muted"
                  title="Besarkan (1.15x)"
                >
                  +
                </button>
              </div>

              {/* Specific CCTV Controls: FOV & Range */}
              {selectedElement.type === 'CCTV' && (
                <div className="hidden lg:flex items-center gap-2 bg-background px-2.5 py-1 rounded-xl border border-amber-500/30">
                  <span className="text-[10px] text-muted-foreground font-mono">Sudut FOV:</span>
                  <input
                    type="range"
                    min="45"
                    max="120"
                    value={selectedElement.fov || 70}
                    onChange={(e) => {
                      const fov = Number(e.target.value);
                      setElements(prev => prev.map(el => el.id === selectedElement.id ? { ...el, fov } : el));
                    }}
                    className="w-16 accent-amber-500 cursor-pointer"
                  />
                  <span className="font-mono font-bold text-[10px] text-amber-600 dark:text-amber-400">
                    {selectedElement.fov || 70}°
                  </span>
                </div>
              )}

              {/* Specific Wi-Fi Controls: Omni vs Directional */}
              {selectedElement.type === 'AP_WIFI' && (
                <div className="flex items-center gap-1 bg-background p-0.5 rounded-xl border border-emerald-500/30">
                  <button
                    onClick={() => {
                      setElements(prev => prev.map(el => el.id === selectedElement.id ? { ...el, wifiMode: 'OMNI' } : el));
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedElement.wifiMode !== 'DIRECTIONAL' ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Omni 360°
                  </button>
                  <button
                    onClick={() => {
                      setElements(prev => prev.map(el => el.id === selectedElement.id ? { ...el, wifiMode: 'DIRECTIONAL' } : el));
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedElement.wifiMode === 'DIRECTIONAL' ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Dinding (Beam)
                  </button>
                </div>
              )}

              {/* Specific Room Rect Controls: Width, Height, Presets & Color */}
              {selectedElement.type === 'RECT' && (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Dimension inputs */}
                  <div className="flex items-center gap-1.5 bg-background px-2 py-1 rounded-xl border border-blue-500/30">
                    <span className="text-[10px] text-muted-foreground font-mono">P:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newW = Math.max(30, (selectedElement.width || 120) - 10);
                        setElements(prev => prev.map(el => el.id === selectedElement.id ? { ...el, width: newW } : el));
                      }}
                      className="w-4 h-4 rounded bg-muted hover:bg-muted/80 text-[10px] font-bold flex items-center justify-center text-foreground"
                      title="Kurangi panjang 10px"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="30"
                      max="1200"
                      value={selectedElement.width || 120}
                      onChange={(e) => {
                        const val = Math.max(20, Math.min(1200, Number(e.target.value) || 30));
                        setElements(prev => prev.map(el => el.id === selectedElement.id ? { ...el, width: val } : el));
                      }}
                      className="w-12 px-1 py-0.5 rounded bg-muted/40 border border-border text-center text-xs font-mono font-bold text-foreground outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newW = Math.min(1200, (selectedElement.width || 120) + 10);
                        setElements(prev => prev.map(el => el.id === selectedElement.id ? { ...el, width: newW } : el));
                      }}
                      className="w-4 h-4 rounded bg-muted hover:bg-muted/80 text-[10px] font-bold flex items-center justify-center text-foreground"
                      title="Tambah panjang 10px"
                    >
                      +
                    </button>

                    <span className="text-[10px] text-muted-foreground font-mono ml-1">L:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newH = Math.max(20, (selectedElement.height || 80) - 10);
                        setElements(prev => prev.map(el => el.id === selectedElement.id ? { ...el, height: newH } : el));
                      }}
                      className="w-4 h-4 rounded bg-muted hover:bg-muted/80 text-[10px] font-bold flex items-center justify-center text-foreground"
                      title="Kurangi lebar 10px"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="20"
                      max="1200"
                      value={selectedElement.height || 80}
                      onChange={(e) => {
                        const val = Math.max(20, Math.min(1200, Number(e.target.value) || 20));
                        setElements(prev => prev.map(el => el.id === selectedElement.id ? { ...el, height: val } : el));
                      }}
                      className="w-12 px-1 py-0.5 rounded bg-muted/40 border border-border text-center text-xs font-mono font-bold text-foreground outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newH = Math.min(1200, (selectedElement.height || 80) + 10);
                        setElements(prev => prev.map(el => el.id === selectedElement.id ? { ...el, height: newH } : el));
                      }}
                      className="w-4 h-4 rounded bg-muted hover:bg-muted/80 text-[10px] font-bold flex items-center justify-center text-foreground"
                      title="Tambah lebar 10px"
                    >
                      +
                    </button>
                  </div>

                  {/* Room Quick Sizing Presets */}
                  <div className="hidden xl:flex items-center gap-1 bg-background p-1 rounded-xl border border-blue-500/30">
                    <span className="text-[9px] text-muted-foreground font-semibold px-1">Preset:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setElements(prev => prev.map(el => el.id === selectedElement.id ? { ...el, width: 170, height: 110 } : el));
                      }}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-muted/50 hover:bg-muted text-foreground font-semibold"
                    >
                      Standar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setElements(prev => prev.map(el => el.id === selectedElement.id ? { ...el, width: 230, height: 140 } : el));
                      }}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-muted/50 hover:bg-muted text-foreground font-semibold"
                    >
                      Suite
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setElements(prev => prev.map(el => el.id === selectedElement.id ? { ...el, width: 120, height: 80 } : el));
                      }}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-muted/50 hover:bg-muted text-foreground font-semibold"
                    >
                      Pantry
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setElements(prev => prev.map(el => el.id === selectedElement.id ? { ...el, width: 80, height: 80 } : el));
                      }}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-muted/50 hover:bg-muted text-foreground font-semibold"
                    >
                      Toilet
                    </button>
                  </div>

                  {/* Color Swatches for Room */}
                  <div className="flex items-center gap-1 bg-background px-1.5 py-1 rounded-xl border border-blue-500/30">
                    <span className="text-[9px] text-muted-foreground font-semibold">Warna:</span>
                    {COLOR_PALETTE.slice(0, 5).map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          setElements(prev => prev.map(el => el.id === selectedElement.id ? { ...el, color: c.value } : el));
                        }}
                        style={{ backgroundColor: c.value }}
                        className={`w-3.5 h-3.5 rounded-full border transition-transform ${
                          (selectedElement.color || '#1e3a8a') === c.value ? 'scale-125 border-white ring-1 ring-blue-500' : 'border-black/20'
                        }`}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions: Duplicate & Delete */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleDuplicateSelected}
                className="px-2.5 py-1 rounded-lg bg-background hover:bg-muted text-foreground border border-border text-xs font-semibold flex items-center gap-1 transition-colors active:scale-95 shadow-xs"
                title="Duplikat titik ini (Ctrl+D)"
              >
                <Copy className="w-3.5 h-3.5 text-blue-500" />
                <span>Duplikat</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteSelected}
                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1 transition-colors active:scale-95"
                title="Hapus titik ini (Delete)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedElementId(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
                title="Selesai edit"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MAIN CANVAS VIEWPORT (HTML5 Canvas + SVG Grid Overlay)   */}
        {/* ======================================================== */}
        <div className="flex-1 bg-zinc-950/60 p-2 sm:p-4 overflow-auto flex items-center justify-center relative min-h-[400px] sm:min-h-[500px]">
          
          <div 
            className="relative shadow-2xl rounded-lg overflow-hidden border border-border/80 bg-white"
            style={{
              width: '100%',
              maxWidth: '1020px',
              aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
            }}
          >
            {/* Visual Grid Layer */}
            {showGrid && (
              <div 
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, #0284c7 1px, transparent 1px),
                    linear-gradient(to bottom, #0284c7 1px, transparent 1px)
                  `,
                  backgroundSize: `${gridSize}px ${gridSize}px`,
                }}
              />
            )}

            {/* Interactive HTML5 Canvas */}
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className={`w-full h-full block touch-none select-none ${
                activeTool === 'select' ? 'cursor-default' : 'cursor-crosshair'
              }`}
              style={{ touchAction: 'none' }}
            />
          </div>
        </div>

        {/* ======================================================== */}
        {/* BOTTOM NOTES & HELPER LEGEND BAR                         */}
        {/* ======================================================== */}
        <div className="p-3 border-t border-border bg-card shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
            <span className="text-muted-foreground font-semibold whitespace-nowrap">Catatan Teknis:</span>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: AP 2 perlu direlokasi ke lorong depan kmr 103 karena sinyal terhalang tembok shaft pipa..."
              className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground shrink-0 flex-wrap justify-end">
            {/* Status Legend Indicators */}
            <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Existing ({elements.filter(e => e.status === 'EXISTING').length})</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-400">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Planning ({elements.filter(e => e.status === 'PLANNING').length})</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Relocate ({elements.filter(e => e.status === 'RELOCATE').length})</span>
            </span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:inline text-blue-600 dark:text-blue-400 font-medium">
              💡 Klik titik untuk edit & geser • Drag panah untuk arah relokasi
            </span>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* LIVE CAMERA MODAL: AMBIL FOTO DENAH FISIK DENGAN KAMERA  */}
      {/* ======================================================== */}
      {isLiveCameraOpen && (
        <LiveCameraModal
          isOpen={isLiveCameraOpen}
          onClose={() => setIsLiveCameraOpen(false)}
          onCapture={handleLiveCameraCapture}
          onFallbackToFileInput={() => cameraInputRef.current?.click()}
          title={`Foto Denah Fisik: ${floor.name}`}
          subtitle="Arahkan kamera ke kertas gambar arsitektur/denah di lokasi & klik tombol jepret"
        />
      )}
    </div>
  );
};
