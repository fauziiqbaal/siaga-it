import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, RotateCcw, AlertCircle, Sparkles, RefreshCw, Upload, Check, Clock, ShieldCheck, Video } from 'lucide-react';

interface LiveCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string, file: File) => void;
  onFallbackToFileInput?: () => void;
  title?: string;
  subtitle?: string;
}

export const LiveCameraModal: React.FC<LiveCameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  onFallbackToFileInput,
  title = 'Kamera Langsung (Live Viewfinder)',
  subtitle = 'Arahkan kamera ke objek bukti pemeriksaan & klik tombol jepret',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // Smart default: If mobile, start with environment (back cam); if laptop/desktop, start with user (front webcam)
  const isMobile = typeof navigator !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && window.innerWidth < 1024)
  );
  
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(isMobile ? 'environment' : 'user');
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFlash, setIsFlash] = useState(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Live real-time clock for viewfinder HUD and watermark
  const [liveTimestamp, setLiveTimestamp] = useState<string>('');
  const [liveDateString, setLiveDateString] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveTimestamp(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB');
      setLiveDateString(now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Stop camera stream tracks
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping track:', e);
        }
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Start Camera Stream
  const startCamera = async (facing: 'environment' | 'user', deviceId?: string) => {
    setIsInitializing(true);
    setErrorMsg(null);

    // Stop existing stream first
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Akses kamera WebRTC tidak didukung pada browser ini.');
      }

      let newStream: MediaStream | null = null;

      // 1. If explicit deviceId is chosen
      if (deviceId) {
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              deviceId: { exact: deviceId },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
          });
        } catch (e) {
          console.warn('Failed with exact deviceId, fallback to ideal deviceId');
          newStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { deviceId },
          });
        }
      }

      // 2. Cascade fallback if no deviceId or deviceId failed
      if (!newStream) {
        try {
          // Attempt 1: FacingMode with high resolution
          newStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: { ideal: facing },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
          });
        } catch (err1) {
          try {
            // Attempt 2: FacingMode without resolution constraints
            newStream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: { facingMode: facing },
            });
          } catch (err2) {
            // Attempt 3: Any video device available (works on all laptops/desktops)
            newStream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: true,
            });
          }
        }
      }

      if (!newStream) {
        throw new Error('Tidak dapat memperoleh stream video dari kamera.');
      }

      setStream(newStream);

      // Enumerate available video devices after camera permission granted
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setAvailableDevices(videoInputs);
        setHasMultipleCameras(videoInputs.length > 1);

        // Track current device id from active stream track
        const activeTrack = newStream.getVideoTracks()[0];
        if (activeTrack) {
          const settings = activeTrack.getSettings();
          if (settings.deviceId) {
            setSelectedDeviceId(settings.deviceId);
          }
          if (settings.facingMode) {
            setFacingMode(settings.facingMode as 'environment' | 'user');
          }
        }
      } catch (e) {
        console.warn('enumerateDevices error:', e);
      }

    } catch (err: any) {
      console.error('Camera initialization error:', err);
      let msg = 'Kamera tidak dapat diakses.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser Anda.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'Kamera tidak terdeteksi pada laptop/perangkat Anda.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Kamera sedang digunakan oleh aplikasi lain (misal Zoom/Meet).';
      }
      setErrorMsg(msg);
    } finally {
      setIsInitializing(false);
    }
  };

  // Crucial: Bind stream to video element whenever stream changes or component mounts
  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play().catch(e => console.warn('Autoplay error:', e));
      };
      video.play().catch(e => console.warn('Video play immediate error:', e));
    }
  }, [stream]);

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode, selectedDeviceId || undefined);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Toggle between Front and Back camera, or next device
  const handleToggleFacingMode = () => {
    if (availableDevices.length > 1) {
      // If multiple devices, cycle to next camera device
      const currentIndex = availableDevices.findIndex(d => d.deviceId === selectedDeviceId);
      const nextIndex = (currentIndex + 1) % availableDevices.length;
      const nextDevice = availableDevices[nextIndex];
      setSelectedDeviceId(nextDevice.deviceId);
      startCamera(facingMode, nextDevice.deviceId);
    } else {
      // Toggle facingMode
      const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
      setFacingMode(nextFacing);
      startCamera(nextFacing);
    }
  };

  // Snap photo & burn professional QC Timestamp Watermark onto image pixels
  const handleSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Trigger visual flash animation
    setIsFlash(true);
    setTimeout(() => setIsFlash(false), 160);

    // If using user-facing camera, mirror the canvas horizontally for natural selfie view
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);

    // Reset transform for drawing watermark right-side up
    if (facingMode === 'user') {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    // =========================================================================
    // PROFESSIONAL SIAGA IT QC TIMESTAMP WATERMARK BANNER (BURNED INTO PHOTO)
    // =========================================================================
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }); // e.g. "19 Okt 2026"
    const timeStr = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + ' WIB'; // e.g. "16:57:09 WIB"

    // 1. Bottom Watermark Banner
    const bannerH = Math.max(76, Math.round(height * 0.12));
    const bannerY = height - bannerH;

    // Translucent dark gradient banner
    const bgGrad = ctx.createLinearGradient(0, bannerY, 0, height);
    bgGrad.addColorStop(0, 'rgba(8, 14, 26, 0.94)');
    bgGrad.addColorStop(1, 'rgba(2, 6, 23, 0.98)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, bannerY, width, bannerH);

    // Accent top border line (Emerald to Cyan to Blue gradient)
    const lineGrad = ctx.createLinearGradient(0, 0, width, 0);
    lineGrad.addColorStop(0, '#10b981');
    lineGrad.addColorStop(0.5, '#06b6d4');
    lineGrad.addColorStop(1, '#3b82f6');
    ctx.fillStyle = lineGrad;
    ctx.fillRect(0, bannerY, width, 3);

    // 2. Measure & Draw Right Side Card (Timestamp & Verification)
    const timeStampLine = `🕒 ${dateStr} • ${timeStr}`;
    const verifyLine = '✓ HARDWARE AUDIT VERIFIED';

    const timeFontSize = Math.max(12, Math.round(bannerH * 0.25));
    const verifyFontSize = Math.max(10, Math.round(bannerH * 0.19));

    ctx.font = `bold ${timeFontSize}px monospace`;
    const timeWidth = ctx.measureText(timeStampLine).width;

    ctx.font = `bold ${verifyFontSize}px sans-serif`;
    const verifyWidth = ctx.measureText(verifyLine).width;

    const rightCardW = Math.max(timeWidth, verifyWidth) + 28;
    const rightCardX = width - rightCardW - 16;
    const rightCardY = bannerY + 10;
    const rightCardH = bannerH - 20;

    // Right card container
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(rightCardX, rightCardY, rightCardW, rightCardH, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Right card text
    ctx.textAlign = 'right';
    ctx.fillStyle = '#38bdf8';
    ctx.font = `bold ${timeFontSize}px monospace`;
    ctx.fillText(timeStampLine, width - 28, bannerY + bannerH * 0.38);

    ctx.fillStyle = '#4ade80';
    ctx.font = `bold ${verifyFontSize}px sans-serif`;
    ctx.fillText(verifyLine, width - 28, bannerY + bannerH * 0.72);

    // 3. Draw Left Side: Badge + Location Title (Strictly bounded so it NEVER collides with right card)
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const leftBoundaryX = rightCardX - 20; // Maximum right bound for left text
    const tagText = 'SIAGA IT QC';
    const tagFontSize = Math.max(10, Math.round(bannerH * 0.19));
    ctx.font = `bold ${tagFontSize}px sans-serif`;
    const tagW = ctx.measureText(tagText).width + 16;
    const tagH = bannerH * 0.26;
    const tagY = bannerY + bannerH * 0.24;

    // Tag badge pill
    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.beginPath();
    ctx.roundRect(20, tagY, tagW, tagH, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#34d399';
    ctx.fillText(tagText, 28, tagY + tagH / 2);

    // Title next to tag
    const titleStartX = 20 + tagW + 10;
    const maxTitleW = Math.max(100, leftBoundaryX - titleStartX);
    let cleanTitle = title.replace(/^Kamera Bukti:\s*/i, '').trim();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(13, Math.round(bannerH * 0.27))}px sans-serif`;

    let displayTitle = cleanTitle;
    while (ctx.measureText(displayTitle).width > maxTitleW && displayTitle.length > 3) {
      displayTitle = displayTitle.slice(0, -1);
    }
    if (displayTitle.length < cleanTitle.length) {
      displayTitle = displayTitle.slice(0, -3) + '...';
    }
    ctx.fillText(displayTitle, titleStartX, bannerY + bannerH * 0.37);

    // Subtitle on row 2
    const maxSubW = Math.max(100, leftBoundaryX - 20);
    let cleanSub = (subtitle || 'Hotel & Coliving Pre-Opening Live Readiness Check').trim();

    ctx.fillStyle = '#94a3b8';
    ctx.font = `500 ${Math.max(10, Math.round(bannerH * 0.20))}px monospace`;

    let displaySub = cleanSub;
    while (ctx.measureText(displaySub).width > maxSubW && displaySub.length > 3) {
      displaySub = displaySub.slice(0, -1);
    }
    if (displaySub.length < cleanSub.length) {
      displaySub = displaySub.slice(0, -3) + '...';
    }
    ctx.fillText(displaySub, 20, bannerY + bannerH * 0.72);

    // (Note: duplicate raw epoch time stamp at top-right has been removed to keep photos clean and prevent timestamp stacking)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.93);

    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], `QC_${Date.now()}.jpg`, { type: 'image/jpeg' });
        stopCamera();
        onCapture(dataUrl, file);
        onClose();
      }
    }, 'image/jpeg', 0.93);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-150">
      <div className="relative bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        
        {/* ======================================================== */}
        {/* TOP HEADER BAR                                           */}
        {/* ======================================================== */}
        <div className="p-3 sm:p-4 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between text-white shrink-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-xs sm:text-sm text-white">{title}</h3>
                <span className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 truncate max-w-[260px] sm:max-w-md">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Switch Camera Button (Front / Back / Multi Webcam) */}
            <button
              type="button"
              onClick={handleToggleFacingMode}
              className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors text-xs font-semibold flex items-center gap-1.5 border border-zinc-700"
              title="Ganti / Putar Kamera (Depan / Belakang / Kamera Lain)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {availableDevices.length > 1 ? 'Ganti Kamera' : facingMode === 'environment' ? 'Kamera Depan' : 'Kamera Belakang'}
              </span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-1.5 rounded-xl bg-zinc-800 hover:bg-rose-600 text-zinc-300 hover:text-white transition-colors"
              title="Tutup Kamera"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* VIDEO VIEWFINDER AREA (ALWAYS IN DOM TO PREVENT BLACK SCREEN) */}
        {/* ======================================================== */}
        <div className="relative bg-black flex-1 min-h-[320px] sm:min-h-[440px] flex items-center justify-center overflow-hidden">
          
          {/* Visual Flash Effect */}
          <div className={`absolute inset-0 bg-white z-30 pointer-events-none transition-opacity duration-150 ${isFlash ? 'opacity-90' : 'opacity-0'}`} />

          {/* Actual Live Video Feed (Always mounted so videoRef.current is never null!) */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />

          {/* REAL-TIME LIVE TIMESTAMP HUD OVERLAY */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 text-white font-mono shadow-xl pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div className="flex items-center gap-1.5 text-xs">
              <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="font-bold text-white tracking-wide">{liveTimestamp}</span>
              <span className="text-[10px] text-zinc-400">({liveDateString})</span>
            </div>
          </div>

          {/* Live Watermark Preview Strip at Bottom of Viewfinder */}
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-4 pb-2.5 px-3 border-t-2 border-emerald-500 pointer-events-none flex items-center justify-between gap-2 text-white">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
                SIAGA IT QC
              </span>
              <span className="text-[11px] font-bold text-white truncate max-w-[180px] sm:max-w-xs">
                {title.replace(/^Kamera Bukti:\s*/i, '')}
              </span>
            </div>
            <div className="px-2 py-0.5 rounded-md bg-white/5 border border-sky-400/30 text-right shrink-0">
              <span className="text-[10px] font-mono font-bold text-sky-400 block">
                🕒 {liveDateString.split(',')[1]?.trim() || liveDateString} • {liveTimestamp}
              </span>
            </div>
          </div>

          {/* Camera Source Mode Badge */}
          <div className="absolute top-3 right-3 z-20 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/15 text-[10px] font-mono text-zinc-300 pointer-events-none">
            {facingMode === 'environment' ? '📷 Belakang (Env)' : '🤳 Depan (Webcam)'}
          </div>

          {/* Viewfinder Tactical Framing Guidelines */}
          <div className="absolute inset-4 sm:inset-8 border border-white/20 rounded-2xl pointer-events-none flex flex-col justify-between p-3 z-10">
            <div className="flex justify-between items-start">
              <div className="w-5 h-5 border-t-2 border-l-2 border-blue-400" />
              <div className="w-5 h-5 border-t-2 border-r-2 border-blue-400" />
            </div>
            <div className="flex justify-between items-end">
              <div className="w-5 h-5 border-b-2 border-l-2 border-blue-400" />
              <div className="w-5 h-5 border-b-2 border-r-2 border-blue-400" />
            </div>
          </div>

          {/* Loading Spinner Overlay when Initializing */}
          {isInitializing && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2.5 text-zinc-300 text-xs z-25">
              <div className="w-9 h-9 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="font-semibold">Menghubungkan ke sensor webcam laptop...</span>
            </div>
          )}

          {/* Error Message Overlay */}
          {errorMsg && (
            <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-6 z-25">
              <div className="p-6 text-center space-y-3 max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">Gagal Mengakses Kamera</h4>
                  <p className="text-xs text-zinc-400">{errorMsg}</p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => startCamera(facingMode)}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Coba Sambungkan Lagi</span>
                  </button>

                  {onFallbackToFileInput && (
                    <button
                      type="button"
                      onClick={() => {
                        stopCamera();
                        onClose();
                        onFallbackToFileInput();
                      }}
                      className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Gunakan File Picker / Galeri</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ======================================================== */}
        {/* BOTTOM ACTION BAR (SHUTTER BUTTON & TIMESTAMP SUMMARY)   */}
        {/* ======================================================== */}
        <div className="p-4 bg-zinc-950/95 border-t border-zinc-900 flex items-center justify-between gap-3 text-white shrink-0">
          <div className="text-[11px] text-zinc-400 font-mono hidden sm:flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Watermark Waktu Otomatis Diterapkan</span>
          </div>

          {/* Prominent Shutter Button */}
          <div className="flex items-center justify-center flex-1 sm:flex-initial">
            <button
              type="button"
              disabled={isInitializing || !!errorMsg}
              onClick={handleSnap}
              className="group relative w-16 h-16 rounded-full bg-white flex items-center justify-center text-zinc-950 active:scale-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:ring-4 hover:ring-blue-500/50"
              title="Ambil Foto Sekarang (Dengan Stempel Waktu QC)"
            >
              <div className="w-13 h-13 rounded-full border-2 border-zinc-950 flex items-center justify-center">
                <Camera className="w-6 h-6 text-zinc-950 group-hover:scale-110 transition-transform" />
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onFallbackToFileInput && (
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onClose();
                  onFallbackToFileInput();
                }}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-zinc-800"
                title="Pilih foto dari file / galeri jika tidak ingin menggunakan live cam"
              >
                <Upload className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Upload Galeri</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
