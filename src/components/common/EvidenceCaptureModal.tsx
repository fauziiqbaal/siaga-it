import React, { useState, useEffect, useRef } from 'react';
import { Building, EvidenceCategory, EvidenceMedia } from '../../types/hotel';
import { 
  Camera, 
  Upload, 
  X, 
  Trash2, 
  Download, 
  Check, 
  Folder, 
  FileText, 
  Video, 
  Sparkles, 
  ExternalLink,
  Eye,
  Layers,
  HardDrive,
  MoveUpRight,
  PenTool,
  Edit3
} from 'lucide-react';
import { 
  generateEvidencePath, 
  fileToBase64, 
  saveEvidenceItem, 
  getEvidenceByEntity, 
  deleteEvidenceItem, 
  downloadEvidenceFile 
} from '../../utils/evidenceStorage';
import { LiveCameraModal } from './LiveCameraModal';
import { ImageAnnotationModal } from './ImageAnnotationModal';

interface EvidenceCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  building: Building;
  entityId: string;
  entityName: string;
  defaultCategory?: EvidenceCategory;
  availableCategories?: { label: string; value: EvidenceCategory }[];
  onEvidenceSaved?: () => void;
}

export const EvidenceCaptureModal: React.FC<EvidenceCaptureModalProps> = ({
  isOpen,
  onClose,
  building,
  entityId,
  entityName,
  defaultCategory = 'WIFI_SPEEDTEST',
  availableCategories = [
    { label: 'Wi-Fi Speedtest', value: 'WIFI_SPEEDTEST' },
    { label: 'Display TV', value: 'TV_CHECK' },
    { label: 'Akses Smartlock', value: 'SMARTLOCK_CHECK' },
    { label: 'Fisik Asset & Label SN', value: 'DEVICE_ASSET' },
    { label: 'Fasilitas Komunal', value: 'FACILITY_CHECK' },
    { label: 'Sudut CCTV', value: 'CCTV_CHECK' },
    { label: 'Bukti Umum', value: 'GENERAL_EVIDENCE' },
  ],
  onEvidenceSaved,
}) => {
  const [category, setCategory] = useState<EvidenceCategory>(defaultCategory);
  const [existingItems, setExistingItems] = useState<EvidenceMedia[]>([]);
  const [loading, setLoading] = useState(false);

  // New capture state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewMediaType, setPreviewMediaType] = useState<'image' | 'video'>('image');
  const [notes, setNotes] = useState('');
  const [previewAutoName, setPreviewAutoName] = useState('');
  const [previewFolderPath, setPreviewFolderPath] = useState('');
  const [viewingItem, setViewingItem] = useState<EvidenceMedia | null>(null);

  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [isAnnotationOpen, setIsAnnotationOpen] = useState(false);
  const [annotatingSavedItem, setAnnotatingSavedItem] = useState<EvidenceMedia | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCategory(defaultCategory);
  }, [defaultCategory]);

  useEffect(() => {
    if (isOpen && entityId) {
      loadExistingEvidence();
      resetForm();
    }
  }, [isOpen, entityId]);

  const loadExistingEvidence = async () => {
    setLoading(true);
    try {
      const items = await getEvidenceByEntity(entityId);
      setExistingItems(items);
    } catch (err) {
      console.error('Failed to load evidence', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPreviewUrl(null);
    setPreviewFile(null);
    setNotes('');
    setPreviewAutoName('');
    setPreviewFolderPath('');
    setViewingItem(null);
  };

  // When a file is chosen via camera or gallery
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>, isVideo: boolean = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const base64 = await fileToBase64(file);
    const ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');

    const { fileName, folderPath } = generateEvidencePath(building, category, entityName, ext);

    setPreviewUrl(base64);
    setPreviewFile(file);
    setPreviewMediaType(isVideo ? 'video' : 'image');
    setPreviewAutoName(fileName);
    setPreviewFolderPath(folderPath);

    // clear inputs
    e.target.value = '';
  };

  // When a photo is captured via live camera modal
  const handleLivePhotoCaptured = (dataUrl: string, file: File) => {
    const ext = 'jpg';
    const { fileName, folderPath } = generateEvidencePath(building, category, entityName, ext);

    setPreviewUrl(dataUrl);
    setPreviewFile(file);
    setPreviewMediaType('image');
    setPreviewAutoName(fileName);
    setPreviewFolderPath(folderPath);
    setIsLiveCameraOpen(false);
  };

  // When annotations (arrow/shapes/labels) are applied from ImageAnnotationModal
  const handleSaveAnnotation = async (annotatedDataUrl: string, file: File) => {
    if (annotatingSavedItem) {
      // Updating an already saved evidence item
      const updated: EvidenceMedia = {
        ...annotatingSavedItem,
        fileUrl: annotatedDataUrl,
        sizeBytes: file.size,
        notes: annotatingSavedItem.notes 
          ? (annotatingSavedItem.notes.includes('Anotasi') || annotatingSavedItem.notes.includes('Panah') 
              ? annotatingSavedItem.notes 
              : `${annotatingSavedItem.notes} (Dengan Panah Anotasi)`)
          : 'Foto bukti dengan panah penunjuk titik',
      };
      await saveEvidenceItem(updated);
      await loadExistingEvidence();
      setAnnotatingSavedItem(null);
      if (onEvidenceSaved) onEvidenceSaved();
    } else {
      // Updating current preview before saving to database
      setPreviewUrl(annotatedDataUrl);
      setPreviewFile(file);
      if (!notes.trim()) {
        setNotes('Foto dokumentasi dengan panah penunjuk titik');
      } else if (!notes.includes('Anotasi') && !notes.includes('Panah')) {
        setNotes(prev => `${prev} (Dengan Panah Penunjuk)`);
      }
    }
  };

  // Save to database
  const handleSaveCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewUrl || !previewFile) return;

    const newEvidence: EvidenceMedia = {
      id: `ev-${Date.now()}`,
      buildingId: building.id,
      buildingSlug: building.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      entityId,
      entityName,
      category,
      mediaType: previewMediaType,
      fileUrl: previewUrl,
      fileName: previewAutoName,
      folderPath: previewFolderPath,
      originalName: previewFile.name,
      sizeBytes: previewFile.size,
      capturedAt: new Date().toISOString(),
      notes: notes.trim(),
    };

    await saveEvidenceItem(newEvidence);
    await loadExistingEvidence();
    resetForm();
    if (onEvidenceSaved) onEvidenceSaved();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus foto/video bukti ini?')) return;
    await deleteEvidenceItem(id);
    await loadExistingEvidence();
    if (viewingItem && viewingItem.id === id) setViewingItem(null);
    if (onEvidenceSaved) onEvidenceSaved();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-2xl bg-card border border-border shadow-2xl p-5 max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-border shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Camera className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground">
                Dokumentasi & Bukti QC: {entityName}
              </h3>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {building.name} • Auto-Rename & Auto-Folder Standard Siaga IT
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-3.5 space-y-4 pr-1">

          {/* Form Capture / Preview Area */}
          {!previewUrl ? (
            <div className="space-y-3">
              {/* Category Selector */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                  Pilih Kategori Bukti:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {availableCategories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        category === cat.value
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'border-border bg-background hover:bg-muted text-foreground'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons: Direct Camera vs Upload */}
              <div className="p-4 rounded-xl border border-dashed border-border bg-muted/15 text-center space-y-3">
                <p className="text-xs text-muted-foreground">
                  Gunakan kamera smartphone langsung atau upload screenshot hasil QC / foto stiker asset
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsLiveCameraOpen(true)}
                    className="p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex flex-col items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <Camera className="w-5 h-5" />
                    <span>Ambil Foto (Kamera)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="p-3 rounded-xl bg-card border border-border hover:bg-muted text-foreground text-xs font-bold flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Upload className="w-5 h-5 text-blue-500" />
                    <span>Upload dari Galeri</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="p-3 rounded-xl bg-card border border-border hover:bg-muted text-foreground text-xs font-bold flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Video className="w-5 h-5 text-purple-500" />
                    <span>Rekam Video Bukti</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Preview Form Before Saving */
            <form onSubmit={handleSaveCapture} className="space-y-3 bg-muted/20 p-3.5 rounded-xl border border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  Pratinjau Berkas & Auto-Naming
                </span>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[11px] text-muted-foreground hover:text-rose-500 flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Batalkan
                </button>
              </div>

              {/* Drawing / Annotation Banner for Images */}
              {previewMediaType === 'image' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-500 shrink-0">
                      <MoveUpRight className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-foreground block text-xs">
                        Beri Panah / Tanda Titik pada Foto
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Tarik panah untuk menunjukkan posisi pasti kamera, kabel, atau kerusakan
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAnnotatingSavedItem(null);
                      setIsAnnotationOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Gambar Panah & Anotasi</span>
                  </button>
                </div>
              )}

              {/* Media Preview Box */}
              <div className="relative rounded-lg overflow-hidden bg-black/90 max-h-56 flex items-center justify-center border border-border group">
                {previewMediaType === 'video' ? (
                  <video src={previewUrl} controls className="max-h-56 w-auto" />
                ) : (
                  <>
                    <img src={previewUrl} alt="Preview" className="max-h-56 w-auto object-contain" />
                    <button
                      type="button"
                      onClick={() => {
                        setAnnotatingSavedItem(null);
                        setIsAnnotationOpen(true);
                      }}
                      className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/75 hover:bg-black/90 text-white text-[11px] font-bold flex items-center gap-1.5 border border-white/20 shadow-md backdrop-blur-sm cursor-pointer transition-all"
                      title="Klik untuk membuka editor panah dan coretan"
                    >
                      <MoveUpRight className="w-3.5 h-3.5 text-amber-400" />
                      <span>Edit / Tambah Panah</span>
                    </button>
                  </>
                )}
              </div>

              {/* Auto-Naming & Folder Path Information Card */}
              <div className="p-2.5 rounded-lg bg-background border border-border space-y-1.5 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-medium">Standard Penataan Nama (Auto-Rename):</span>
                  <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold break-all text-[11px]">
                    📄 {previewAutoName}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-medium">Folder Penyimpanan:</span>
                  <span className="font-mono text-muted-foreground text-[11px] flex items-center gap-1">
                    <Folder className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>/{previewFolderPath}</span>
                  </span>
                </div>
              </div>

              {/* Notes Input */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Catatan Lapangan (Opsional):
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Speedtest tembus 70 Mbps di meja / Stiker SN terbaca jelas"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500"
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted text-xs"
                >
                  Ulangi
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Bukti ke Database</span>
                </button>
              </div>
            </form>
          )}

          {/* List of Existing Evidence */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-blue-500" />
                Berkas Bukti Tersimpan ({existingItems.length}):
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Penyimpanan Lokal / IndexedDB
              </span>
            </div>

            {loading ? (
              <p className="text-xs text-muted-foreground italic py-2">Memuat bukti...</p>
            ) : existingItems.length === 0 ? (
              <div className="p-3 text-center rounded-lg bg-muted/10 border border-dashed border-border text-muted-foreground text-xs">
                Belum ada foto atau video bukti untuk {entityName}. Ambil foto pertama menggunakan kamera di atas.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {existingItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl border border-border bg-card flex flex-col justify-between gap-2 shadow-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Thumbnail with Click to Zoom */}
                      <button
                        type="button"
                        onClick={() => setViewingItem(item)}
                        className="relative w-16 h-16 rounded-lg overflow-hidden bg-black/90 shrink-0 border border-border/80 group"
                        title="Klik untuk melihat resolusi penuh"
                      >
                        {item.mediaType === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-purple-400">
                            <Video className="w-6 h-6" />
                          </div>
                        ) : (
                          <img src={item.fileUrl} alt={item.fileName} className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform" />
                        )}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                      </button>

                      {/* File Details */}
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 inline-block mb-1">
                          {item.category.replace('_', ' ')}
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-foreground block truncate" title={item.fileName}>
                          {item.fileName}
                        </span>
                        <span className="text-[10px] text-muted-foreground block truncate">
                          📁 /{item.folderPath}
                        </span>
                        {item.notes && (
                          <p className="text-[10px] text-muted-foreground italic truncate mt-0.5" title={item.notes}>
                            "{item.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions: Download with auto-name & Delete */}
                    <div className="flex items-center justify-between pt-1 border-t border-border/60 text-[11px]">
                      <span className="text-[10px] text-muted-foreground">
                        {(item.sizeBytes / 1024).toFixed(0)} KB • {new Date(item.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="flex items-center gap-1">
                        {item.mediaType === 'image' && (
                          <button
                            type="button"
                            onClick={() => {
                              setAnnotatingSavedItem(item);
                              setIsAnnotationOpen(true);
                            }}
                            className="px-2 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 border border-blue-500/20 transition-colors"
                            title="Beri panah / tanda titik pada foto bukti ini"
                          >
                            <MoveUpRight className="w-3 h-3 text-amber-500" />
                            <span>Panah</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => downloadEvidenceFile(item)}
                          className="px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground font-semibold flex items-center gap-1"
                          title="Download dengan nama standard"
                        >
                          <Download className="w-3 h-3 text-blue-500" />
                          <span>Unduh</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1 rounded text-muted-foreground hover:text-rose-500"
                          title="Hapus bukti"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="pt-2.5 border-t border-border flex items-center justify-between shrink-0">
          <span className="text-[10px] text-muted-foreground font-mono">
            {existingItems.length} File Tersimpan
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold"
          >
            Tutup
          </button>
        </div>

        {/* Full Image Viewer Zoom Overlay */}
        {viewingItem && (
          <div className="fixed inset-0 z-60 bg-black/90 flex flex-col items-center justify-center p-4">
            <button
              onClick={() => setViewingItem(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800 text-white hover:bg-zinc-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="max-w-2xl w-full text-center space-y-2">
              <div className="rounded-xl overflow-hidden border border-zinc-700 bg-black flex items-center justify-center max-h-[70vh]">
                {viewingItem.mediaType === 'video' ? (
                  <video src={viewingItem.fileUrl} controls autoPlay className="max-h-[70vh] w-auto" />
                ) : (
                  <img src={viewingItem.fileUrl} alt={viewingItem.fileName} className="max-h-[70vh] w-auto object-contain" />
                )}
              </div>

              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-left text-xs space-y-1">
                <span className="font-mono text-cyan-400 font-bold block">{viewingItem.fileName}</span>
                <span className="font-mono text-zinc-400 block">Folder: /{viewingItem.folderPath}</span>
                {viewingItem.notes && <p className="text-zinc-300 italic">Catatan: {viewingItem.notes}</p>}
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    onClick={() => downloadEvidenceFile(viewingItem)}
                    className="px-3 py-1 rounded bg-blue-600 text-white font-bold flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Unduh Berkas
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Camera Viewfinder Modal */}
        <LiveCameraModal
          isOpen={isLiveCameraOpen}
          onClose={() => setIsLiveCameraOpen(false)}
          onCapture={handleLivePhotoCaptured}
          onFallbackToFileInput={() => cameraInputRef.current?.click()}
          title={`Kamera Bukti: ${entityName}`}
          subtitle={`Foto dokumentasi untuk ${entityName} (${category})`}
        />

        {/* Interactive Image Annotation & Arrow Drawing Modal */}
        {isAnnotationOpen && (
          <ImageAnnotationModal
            isOpen={isAnnotationOpen}
            onClose={() => {
              setIsAnnotationOpen(false);
              setAnnotatingSavedItem(null);
            }}
            imageUrl={annotatingSavedItem ? annotatingSavedItem.fileUrl : (previewUrl || '')}
            originalFileName={annotatingSavedItem ? annotatingSavedItem.fileName : (previewAutoName || 'evidence.jpg')}
            title={`Beri Panah & Tanda Titik: ${entityName}`}
            subtitle="Tarik garis panah dari titik pangkal ke arah objek atau titik keamanan yang dimaksud"
            onSave={handleSaveAnnotation}
          />
        )}

        {/* Hidden File Inputs for Direct Camera, Gallery, and Video */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handleFileSelected(e, false)}
          className="hidden"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileSelected(e, false)}
          className="hidden"
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          capture="environment"
          onChange={(e) => handleFileSelected(e, true)}
          className="hidden"
        />

      </div>
    </div>
  );
};
