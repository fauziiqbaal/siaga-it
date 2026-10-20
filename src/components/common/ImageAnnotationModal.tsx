import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Check, 
  RotateCcw, 
  Trash2, 
  MoveUpRight, 
  Circle, 
  Square, 
  PenTool, 
  Type, 
  Sliders, 
  Sparkles,
  HelpCircle,
  Tag
} from 'lucide-react';

export type AnnotationTool = 'arrow' | 'circle' | 'rect' | 'pen' | 'text';

export interface AnnotationItem {
  id: string;
  type: AnnotationTool;
  color: string;
  lineWidth: number;
  // Start & End in percentage of image dimensions (0.0 to 1.0) so it is resolution-independent
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  // For freehand pen
  points?: { x: number; y: number }[];
  // For text label
  text?: string;
}

interface ImageAnnotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  originalFileName?: string;
  onSave: (annotatedDataUrl: string, file: File) => void;
  title?: string;
  subtitle?: string;
}

const COLOR_OPTIONS = [
  { name: 'Merah Terang (Fokus Utama)', value: '#ef4444', border: '#b91c1c' },
  { name: 'Kuning Amber (Perhatian)', value: '#f59e0b', border: '#b45309' },
  { name: 'Hijau Emerald (Normal/OK)', value: '#10b981', border: '#047857' },
  { name: 'Cyan Sky (Informatif)', value: '#06b6d4', border: '#0e7490' },
  { name: 'Putih Bersih (Kontras Gelap)', value: '#ffffff', border: '#64748b' },
];

const STROKE_OPTIONS = [
  { label: 'Standar', value: 5 },
  { label: 'Tebal', value: 8 },
  { label: 'Ekstra', value: 12 },
];

const PRESET_LABELS = [
  'Titik CCTV',
  'Perlu Reposisi',
  'AP Wi-Fi',
  'Kabel / Port',
  'Smartlock',
  'Perlu Cek',
];

export const ImageAnnotationModal: React.FC<ImageAnnotationModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  originalFileName = 'foto-bukti-annotated.jpg',
  onSave,
  title = 'Beri Tanda & Panah Penunjuk Titik',
  subtitle = 'Tarik kursor / sentuh untuk menambahkan panah penunjuk titik inspeksi pada foto',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeTool, setActiveTool] = useState<AnnotationTool>('arrow');
  const [selectedColor, setSelectedColor] = useState<string>('#ef4444');
  const [lineWidth, setLineWidth] = useState<number>(5);
  const [customText, setCustomText] = useState<string>('Titik CCTV');

  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<AnnotationItem | null>(null);

  // Loaded image info
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({ width: 800, height: 600 });

  // Load the source image
  useEffect(() => {
    if (!isOpen || !imageUrl) return;

    setImageLoaded(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      calculateCanvasSize(img.naturalWidth, img.naturalHeight);
    };

    img.onerror = () => {
      console.error('Failed to load image for annotation');
    };
  }, [isOpen, imageUrl]);

  // Responsive canvas sizing to fit container while preserving aspect ratio
  const calculateCanvasSize = useCallback((imgWidth: number, imgHeight: number) => {
    if (!containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth || 800;
    const containerHeight = containerRef.current.clientHeight || 550;

    const padding = 16;
    const availWidth = Math.max(300, containerWidth - padding);
    const availHeight = Math.max(250, containerHeight - padding);

    const aspect = imgWidth / imgHeight;
    let targetWidth = availWidth;
    let targetHeight = targetWidth / aspect;

    if (targetHeight > availHeight) {
      targetHeight = availHeight;
      targetWidth = targetHeight * aspect;
    }

    setCanvasDimensions({
      width: Math.round(targetWidth),
      height: Math.round(targetHeight),
    });
  }, []);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (imageRef.current) {
        calculateCanvasSize(imageRef.current.naturalWidth, imageRef.current.naturalHeight);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateCanvasSize]);

  // Draw Arrow on canvas context
  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
    width: number
  ) => {
    const headLength = Math.max(16, width * 3.2);
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Black outer contrast stroke (ensures visibility on any background)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.lineWidth = width + 4;

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.stroke();
    ctx.fill();

    // 2. Colored inner arrow
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - (headLength - 1.5) * Math.cos(angle - Math.PI / 6),
      toY - (headLength - 1.5) * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - (headLength - 1.5) * Math.cos(angle + Math.PI / 6),
      toY - (headLength - 1.5) * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    // Tail anchor dot
    ctx.beginPath();
    ctx.arc(fromX, fromY, width * 0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // Draw Circle spot
  const drawCircle = (
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color: string,
    width: number
  ) => {
    const radius = Math.hypot(endX - startX, endY - startY);

    ctx.save();
    // Shadow / outline
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.lineWidth = width + 4;
    ctx.beginPath();
    ctx.arc(startX, startY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner line
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(startX, startY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Small center dot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(startX, startY, width * 0.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // Draw Rectangle box
  const drawRect = (
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color: string,
    width: number
  ) => {
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const w = Math.abs(endX - startX);
    const h = Math.abs(endY - startY);

    ctx.save();
    // Outer black stroke
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.lineWidth = width + 4;
    ctx.strokeRect(x, y, w, h);

    // Inner colored stroke
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  };

  // Draw Freehand Pen line
  const drawPen = (
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number }[],
    color: string,
    width: number,
    canvasW: number,
    canvasH: number
  ) => {
    if (points.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Outer stroke
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.lineWidth = width + 4;
    ctx.beginPath();
    ctx.moveTo(points[0].x * canvasW, points[0].y * canvasH);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * canvasW, points[i].y * canvasH);
    }
    ctx.stroke();

    // Inner stroke
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(points[0].x * canvasW, points[0].y * canvasH);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * canvasW, points[i].y * canvasH);
    }
    ctx.stroke();
    ctx.restore();
  };

  // Draw Text Label Pill
  const drawTextLabel = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    color: string
  ) => {
    ctx.save();
    const fontSize = 14;
    ctx.font = `bold ${fontSize}px sans-serif`;
    const metrics = ctx.measureText(text);
    const paddingX = 8;
    const paddingY = 5;
    const boxW = metrics.width + paddingX * 2;
    const boxH = fontSize + paddingY * 2;
    const cornerRadius = 6;

    const boxX = x - boxW / 2;
    const boxY = y - boxH - 6;

    // Draw dark background pill
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, cornerRadius);
    ctx.fill();
    ctx.stroke();

    // Little triangle pointer under pill
    ctx.beginPath();
    ctx.moveTo(x - 5, boxY + boxH);
    ctx.lineTo(x, boxY + boxH + 6);
    ctx.lineTo(x + 5, boxY + boxH);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // Text inside
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, boxY + boxH / 2);

    ctx.restore();
  };

  // Render everything onto canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Draw source image
    ctx.drawImage(imageRef.current, 0, 0, w, h);

    // 2. Draw saved annotations
    const allItems = [...annotations];
    if (currentAnnotation) {
      allItems.push(currentAnnotation);
    }

    for (const item of allItems) {
      const startX = item.startX * w;
      const startY = item.startY * h;
      const endX = item.endX * w;
      const endY = item.endY * h;

      if (item.type === 'arrow') {
        drawArrow(ctx, startX, startY, endX, endY, item.color, item.lineWidth);
      } else if (item.type === 'circle') {
        drawCircle(ctx, startX, startY, endX, endY, item.color, item.lineWidth);
      } else if (item.type === 'rect') {
        drawRect(ctx, startX, startY, endX, endY, item.color, item.lineWidth);
      } else if (item.type === 'pen' && item.points) {
        drawPen(ctx, item.points, item.color, item.lineWidth, w, h);
      } else if (item.type === 'text' && item.text) {
        drawTextLabel(ctx, endX, endY, item.text, item.color);
      }
    }
  }, [annotations, currentAnnotation]);

  useEffect(() => {
    if (imageLoaded) {
      renderCanvas();
    }
  }, [imageLoaded, renderCanvas, canvasDimensions]);

  // Coordinate normalizer relative to canvas (0.0 to 1.0)
  const getNormCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    const rawX = clientX - rect.left;
    const rawY = clientY - rect.top;

    const normX = Math.max(0, Math.min(1, rawX / rect.width));
    const normY = Math.max(0, Math.min(1, rawY / rect.height));

    return { x: normX, y: normY };
  };

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { x, y } = getNormCoords(e);
    setIsDrawing(true);

    if (activeTool === 'text') {
      // Direct text drop
      const newTextItem: AnnotationItem = {
        id: `ann-${Date.now()}`,
        type: 'text',
        color: selectedColor,
        lineWidth,
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        text: customText.trim() || 'Titik CCTV',
      };
      setAnnotations(prev => [...prev, newTextItem]);
      setIsDrawing(false);
      return;
    }

    const newAnnotation: AnnotationItem = {
      id: `ann-${Date.now()}`,
      type: activeTool,
      color: selectedColor,
      lineWidth,
      startX: x,
      startY: y,
      endX: x,
      endY: y,
      points: activeTool === 'pen' ? [{ x, y }] : undefined,
    };

    setCurrentAnnotation(newAnnotation);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAnnotation) return;
    e.preventDefault();
    const { x, y } = getNormCoords(e);

    if (activeTool === 'pen') {
      const updatedPoints = [...(currentAnnotation.points || []), { x, y }];
      setCurrentAnnotation({
        ...currentAnnotation,
        endX: x,
        endY: y,
        points: updatedPoints,
      });
    } else {
      setCurrentAnnotation({
        ...currentAnnotation,
        endX: x,
        endY: y,
      });
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing || !currentAnnotation) return;
    setIsDrawing(false);

    // Validate minimal length for arrow / shapes so tiny accidental clicks aren't stored as zero-length
    const dist = Math.hypot(
      currentAnnotation.endX - currentAnnotation.startX,
      currentAnnotation.endY - currentAnnotation.startY
    );

    if (currentAnnotation.type === 'pen' || dist > 0.015) {
      setAnnotations(prev => [...prev, currentAnnotation]);
    }
    setCurrentAnnotation(null);
  };

  // Undo last annotation
  const handleUndo = () => {
    setAnnotations(prev => prev.slice(0, -1));
  };

  // Clear all annotations
  const handleClearAll = () => {
    if (annotations.length === 0) return;
    if (window.confirm('Hapus seluruh panah dan coretan pada foto?')) {
      setAnnotations([]);
      setCurrentAnnotation(null);
    }
  };

  // Final Export & Apply to Photo
  const handleApplyAnnotations = () => {
    if (!imageRef.current) return;
    const img = imageRef.current;

    // Create high-resolution export canvas using image's native resolution
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = img.naturalWidth || 1280;
    exportCanvas.height = img.naturalHeight || 720;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    const w = exportCanvas.width;
    const h = exportCanvas.height;

    // Draw full resolution image
    ctx.drawImage(img, 0, 0, w, h);

    // Scale line width proportionally to native resolution
    const scaleFactor = Math.max(1, w / 800);

    // Draw each annotation scaled
    for (const item of annotations) {
      const startX = item.startX * w;
      const startY = item.startY * h;
      const endX = item.endX * w;
      const endY = item.endY * h;
      const scaledWidth = item.lineWidth * scaleFactor;

      if (item.type === 'arrow') {
        drawArrow(ctx, startX, startY, endX, endY, item.color, scaledWidth);
      } else if (item.type === 'circle') {
        drawCircle(ctx, startX, startY, endX, endY, item.color, scaledWidth);
      } else if (item.type === 'rect') {
        drawRect(ctx, startX, startY, endX, endY, item.color, scaledWidth);
      } else if (item.type === 'pen' && item.points) {
        drawPen(ctx, item.points, item.color, scaledWidth, w, h);
      } else if (item.type === 'text' && item.text) {
        drawTextLabel(ctx, endX, endY, item.text, item.color);
      }
    }

    // Convert to dataUrl and File
    const finalDataUrl = exportCanvas.toDataURL('image/jpeg', 0.92);

    exportCanvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], originalFileName, { type: 'image/jpeg' });
        onSave(finalDataUrl, file);
        onClose();
      }
    }, 'image/jpeg', 0.92);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl rounded-2xl bg-card border border-border shadow-2xl flex flex-col h-[94vh] max-h-[850px] overflow-hidden">
        
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-border flex items-center justify-between shrink-0 bg-card">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-500">
              <MoveUpRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                {title}
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/30">
                  {annotations.length} Tanda
                </span>
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Control Toolbar */}
        <div className="p-2 sm:p-2.5 border-b border-border/80 bg-muted/30 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
          
          {/* Tool Selector Buttons */}
          <div className="flex items-center gap-1 bg-background/80 p-1 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setActiveTool('arrow')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTool === 'arrow'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              title="Panah Penunjuk (Klik & Geser dari ekor ke ujung titik)"
            >
              <MoveUpRight className="w-4 h-4" />
              <span>Panah Penunjuk</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('circle')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTool === 'circle'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              title="Lingkaran Penanda Titik"
            >
              <Circle className="w-4 h-4" />
              <span>Lingkaran</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('rect')}
              className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTool === 'rect'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              title="Kotak Area"
            >
              <Square className="w-4 h-4" />
              <span className="hidden sm:inline">Kotak</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('pen')}
              className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTool === 'pen'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              title="Coretan Bebas"
            >
              <PenTool className="w-4 h-4" />
              <span className="hidden sm:inline">Coret</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('text')}
              className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTool === 'text'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              title="Label Teks (Klik pada foto untuk meletakkan teks)"
            >
              <Type className="w-4 h-4" />
              <span className="hidden sm:inline">Label</span>
            </button>
          </div>

          {/* Color Palettes */}
          <div className="flex items-center gap-1.5 bg-background/80 p-1.5 rounded-xl border border-border">
            <span className="text-[10px] text-muted-foreground font-semibold px-1 hidden md:inline">
              Warna:
            </span>
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setSelectedColor(c.value)}
                title={c.name}
                className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                  selectedColor === c.value ? 'scale-115 ring-2 ring-blue-500 ring-offset-1 ring-offset-background' : 'opacity-85 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.value, borderColor: c.border }}
              />
            ))}
          </div>

          {/* Thickness & Actions */}
          <div className="flex items-center gap-1.5">
            {/* Thickness selector */}
            <div className="flex items-center gap-1 bg-background/80 p-1 rounded-xl border border-border">
              {STROKE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLineWidth(opt.value)}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    lineWidth === opt.value
                      ? 'bg-muted text-foreground font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Undo */}
            <button
              type="button"
              onClick={handleUndo}
              disabled={annotations.length === 0}
              className="p-1.5 rounded-xl border border-border bg-background hover:bg-muted disabled:opacity-40 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Batalkan Tanda Terakhir (Undo)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Clear All */}
            <button
              type="button"
              onClick={handleClearAll}
              disabled={annotations.length === 0}
              className="p-1.5 rounded-xl border border-border bg-background hover:bg-rose-500/10 disabled:opacity-40 text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer"
              title="Hapus Semua Anotasi"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Text Input Drawer when Text Tool is active */}
        {activeTool === 'text' && (
          <div className="px-3 py-2 bg-blue-500/[0.06] border-b border-blue-500/20 flex flex-wrap items-center gap-2 text-xs shrink-0">
            <span className="font-semibold text-foreground flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-blue-500" />
              Teks Label:
            </span>
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Ketik teks label..."
              className="px-2.5 py-1 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500 w-44 font-medium"
            />
            <span className="text-[11px] text-muted-foreground">Pilihan Cepat:</span>
            {PRESET_LABELS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => setCustomText(tag)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                  customText === tag
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-background hover:bg-muted border-border text-muted-foreground'
                }`}
              >
                {tag}
              </button>
            ))}
            <span className="text-[10px] text-blue-500/80 italic ml-auto">
              *Klik pada area foto untuk meletakkan label
            </span>
          </div>
        )}

        {/* Canvas Working Viewport */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-hidden bg-slate-950 flex items-center justify-center p-3 relative select-none touch-none"
        >
          {imageLoaded ? (
            <div className="relative shadow-2xl rounded-lg overflow-hidden border border-slate-800">
              <canvas
                ref={canvasRef}
                width={canvasDimensions.width}
                height={canvasDimensions.height}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="cursor-crosshair block touch-none"
                style={{
                  width: `${canvasDimensions.width}px`,
                  height: `${canvasDimensions.height}px`,
                }}
              />

              {/* Floating Helper Tip */}
              {annotations.length === 0 && !isDrawing && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-sm border border-white/20 text-white text-[11px] font-medium flex items-center gap-1.5 shadow-lg animate-pulse">
                  <MoveUpRight className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tarik garis pada foto untuk membuat panah penunjuk</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground space-y-2">
              <Sparkles className="w-6 h-6 animate-spin mx-auto text-blue-500" />
              <p className="text-xs">Memuat foto ke editor...</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <HelpCircle className="w-4 h-4 text-blue-500 shrink-0" />
            <span>
              Panah otomatis diberi outline kontras ganda agar jelas terlihat di semua sudut foto.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-semibold cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleApplyAnnotations}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Terapkan Panah ke Foto</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
