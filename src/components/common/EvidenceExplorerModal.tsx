import React, { useState, useEffect } from 'react';
import { Building, EvidenceCategory, EvidenceMedia } from '../../types/hotel';
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  Download, 
  X, 
  Camera, 
  Eye, 
  Trash2, 
  HardDrive, 
  Search, 
  Layers, 
  Sparkles,
  ExternalLink,
  Video
} from 'lucide-react';
import { 
  getEvidenceByBuilding, 
  deleteEvidenceItem, 
  downloadEvidenceFile, 
  exportEvidenceManifest,
  getBuildingSlug 
} from '../../utils/evidenceStorage';

interface EvidenceExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  building: Building;
}

export const EvidenceExplorerModal: React.FC<EvidenceExplorerModalProps> = ({
  isOpen,
  onClose,
  building,
}) => {
  const [items, setItems] = useState<EvidenceMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingItem, setViewingItem] = useState<EvidenceMedia | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadBuildingEvidence();
    }
  }, [isOpen, building.id]);

  const loadBuildingEvidence = async () => {
    setLoading(true);
    try {
      const data = await getEvidenceByBuilding(building.id);
      setItems(data);
    } catch (err) {
      console.error('Error loading building evidence', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus file bukti ini?')) return;
    await deleteEvidenceItem(id);
    await loadBuildingEvidence();
    if (viewingItem && viewingItem.id === id) setViewingItem(null);
  };

  if (!isOpen) return null;

  const buildingSlug = getBuildingSlug(building.name);

  // Group items by folder category
  const folders = [
    { key: 'ALL', label: `Semua Bukti (${items.length})`, path: `evidence/${buildingSlug}/` },
    { key: 'kamar', label: `Kamar (${items.filter(i => i.folderPath.includes('kamar')).length})`, path: `evidence/${buildingSlug}/kamar/` },
    { key: 'perangkat-asset', label: `Perangkat IT Asset (${items.filter(i => i.folderPath.includes('perangkat-asset')).length})`, path: `evidence/${buildingSlug}/perangkat-asset/` },
    { key: 'fasilitas-bersama', label: `Fasilitas Bersama (${items.filter(i => i.folderPath.includes('fasilitas-bersama')).length})`, path: `evidence/${buildingSlug}/fasilitas-bersama/` },
    { key: 'cctv', label: `CCTV (${items.filter(i => i.folderPath.includes('cctv')).length})`, path: `evidence/${buildingSlug}/cctv/` },
  ];

  const filteredItems = items.filter(item => {
    if (selectedFolder !== 'ALL' && !item.folderPath.includes(selectedFolder)) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.fileName.toLowerCase().includes(q) ||
        item.entityName.toLowerCase().includes(q) ||
        (item.notes && item.notes.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalBytes = items.reduce((acc, i) => acc + i.sizeBytes, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl rounded-2xl bg-card border border-border shadow-2xl p-5 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-foreground">
                  Explorer Penyimpanan Bukti & Dokumentasi Siaga IT
                </h3>
                <span className="text-[11px] text-muted-foreground block">
                  {building.name} • Total {items.length} Berkas ({(totalBytes / (1024 * 1024)).toFixed(2)} MB)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportEvidenceManifest(building)}
              className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Unduh rekap struktur folder dan nama file JSON"
            >
              <Download className="w-3.5 h-3.5 text-blue-500" />
              <span>Ekspor Manifest JSON</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Folder Nav Tabs */}
        <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0 border-b border-border">
          {/* Folders */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {folders.map(f => (
              <button
                key={f.key}
                onClick={() => setSelectedFolder(f.key)}
                className={`px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                  selectedFolder === f.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-muted/40 hover:bg-muted border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                <span>{f.label}</span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari file / kamar / SN..."
              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Directory Folder Breadcrumb Simulation */}
        <div className="py-2 px-3 rounded-lg bg-muted/20 border border-border/80 text-[11px] font-mono text-muted-foreground flex items-center gap-1 shrink-0 overflow-x-auto">
          <HardDrive className="w-3 h-3 text-blue-500" />
          <span>root / evidence / {buildingSlug} /</span>
          <span className="text-foreground font-bold">{selectedFolder === 'ALL' ? '*' : selectedFolder}/</span>
        </div>

        {/* File Grid */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
          {loading ? (
            <p className="text-xs text-muted-foreground italic text-center py-8">Memuat berkas bukti...</p>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground space-y-2">
              <Camera className="w-8 h-8 mx-auto text-muted-foreground/50" />
              <p className="text-xs">Tidak ada file bukti pada folder ini.</p>
              <p className="text-[11px] text-muted-foreground/80">
                Ambil foto pada saat melakukan inspeksi kamar, CCTV, atau perangkat IT.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border border-border bg-card hover:border-blue-500/50 transition-all flex flex-col justify-between gap-2 shadow-xs group"
                >
                  <div>
                    {/* Media Thumbnail */}
                    <div
                      onClick={() => setViewingItem(item)}
                      className="relative w-full h-32 rounded-lg overflow-hidden bg-black/90 cursor-pointer border border-border flex items-center justify-center mb-2"
                    >
                      {item.mediaType === 'video' ? (
                        <div className="text-center text-purple-400">
                          <Video className="w-8 h-8 mx-auto" />
                          <span className="text-[10px] font-mono block mt-1">Video Recording</span>
                        </div>
                      ) : (
                        <img src={item.fileUrl} alt={item.fileName} className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform" />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Eye className="w-5 h-5 text-white" />
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {item.category.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] font-semibold text-foreground truncate">
                          {item.entityName}
                        </span>
                      </div>

                      <span className="font-mono text-[11px] font-bold text-foreground block truncate" title={item.fileName}>
                        {item.fileName}
                      </span>

                      <span className="font-mono text-[10px] text-muted-foreground block truncate" title={item.folderPath}>
                        📁 /{item.folderPath}
                      </span>

                      {item.notes && (
                        <p className="text-[10px] text-muted-foreground italic truncate" title={item.notes}>
                          "{item.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-border text-[11px]">
                    <span className="text-[10px] text-muted-foreground">
                      {(item.sizeBytes / 1024).toFixed(0)} KB
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => downloadEvidenceFile(item)}
                        className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground font-semibold flex items-center gap-1"
                        title="Unduh dengan nama standard auto-rename"
                      >
                        <Download className="w-3 h-3 text-blue-500" />
                        <span>Unduh</span>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 rounded text-muted-foreground hover:text-rose-500"
                        title="Hapus file"
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

        {/* Footer */}
        <div className="pt-3 border-t border-border flex items-center justify-between shrink-0 text-xs text-muted-foreground">
          <span>Menampilkan {filteredItems.length} dari {items.length} file bukti</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            Selesai
          </button>
        </div>

        {/* Lightbox / Zoom View */}
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

      </div>
    </div>
  );
};
