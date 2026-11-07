// Drawing primitives canvas floor plan (CCTV, Wi-Fi, smartlock, TV, MDF rack, LAN, arrow, text, rect).
// Dipisah dari FloorPlanDrawingModal agar komponen UI tetap kecil; setiap fungsi menerima (ctx, el).
import { STATUS_THEMES, type FloorPlanElement } from './floorPlanTypes';

// =========================================================================
// DRAWING ASSETS & ELEMENTS ON CANVAS CONTEXT
// =========================================================================

// Draw CCTV element with FOV cone & Status Badge
export const drawCctvElement = (ctx: CanvasRenderingContext2D, el: FloorPlanElement) => {
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
export const drawWifiElement = (ctx: CanvasRenderingContext2D, el: FloorPlanElement) => {
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
export const drawSmartlockElement = (ctx: CanvasRenderingContext2D, el: FloorPlanElement) => {
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
export const drawTvElement = (ctx: CanvasRenderingContext2D, el: FloorPlanElement) => {
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
export const drawMdfRackElement = (ctx: CanvasRenderingContext2D, el: FloorPlanElement) => {
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
export const drawLanPortElement = (ctx: CanvasRenderingContext2D, el: FloorPlanElement) => {
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
export const drawArrowElement = (ctx: CanvasRenderingContext2D, el: FloorPlanElement) => {
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
export const drawTextElement = (ctx: CanvasRenderingContext2D, el: FloorPlanElement) => {
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
export const drawRectElement = (ctx: CanvasRenderingContext2D, el: FloorPlanElement) => {
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
export const drawSelectionBox = (ctx: CanvasRenderingContext2D, el: FloorPlanElement) => {
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
