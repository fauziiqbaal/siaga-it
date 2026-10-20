import React, { useState } from 'react';
import { Building, DeviceCategory, ITDevice, TakeoverStatus, ASSET_CATEGORIES, NetflixSupportStatus, TtlockSupportStatus } from '../../types/hotel';
import { 
  Wifi, 
  Network, 
  Cpu, 
  Video, 
  KeyRound, 
  Tv, 
  Layers, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  HardDrive,
  ShieldCheck,
  AlertTriangle,
  Radio,
  ExternalLink,
  Camera,
  Server
} from 'lucide-react';
import { EvidenceCaptureModal } from '../common/EvidenceCaptureModal';

interface FloorDeviceInventoryProps {
  building: Building;
  onUpdateDevice: (updatedDevice: ITDevice) => void;
  onAddDevice: (newDevice: ITDevice) => void;
  onDeleteDevice: (deviceId: string) => void;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.FC<{ className?: string }>; color: string }> = {
  WIRELESS_DEVICE: { label: 'Wireless Device', icon: Wifi, color: 'text-cyan-700 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
  SWITCH: { label: 'Switch', icon: Network, color: 'text-blue-700 dark:text-blue-400 bg-blue-500/10 border-blue-500/30' },
  ROUTER_GATEWAY: { label: 'Router Gateway', icon: Cpu, color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  SURVEILLANCE: { label: 'Surveillance', icon: Video, color: 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30' },
  CABLE_TV: { label: 'Cable TV', icon: Tv, color: 'text-purple-700 dark:text-purple-400 bg-purple-500/10 border-purple-500/30' },
  SMART_LOCK: { label: 'Smart Lock', icon: KeyRound, color: 'text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/30' },
  RACK: { label: 'Rack', icon: Server, color: 'text-slate-700 dark:text-slate-400 bg-slate-500/10 border-slate-500/30' },
  LAINNYA: { label: 'Lainnya', icon: HardDrive, color: 'text-zinc-700 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/30' },
  // Backward compatibility aliases
  ACCESS_POINT: { label: 'Wireless Device', icon: Wifi, color: 'text-cyan-700 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
  SWITCH_POE: { label: 'Switch', icon: Network, color: 'text-blue-700 dark:text-blue-400 bg-blue-500/10 border-blue-500/30' },
  ROUTER_MODEM: { label: 'Router Gateway', icon: Cpu, color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  CCTV_NVR: { label: 'Surveillance', icon: Video, color: 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30' },
  SMARTLOCK_GATEWAY: { label: 'Smart Lock', icon: KeyRound, color: 'text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/30' },
  STB_TV: { label: 'Cable TV', icon: Tv, color: 'text-purple-700 dark:text-purple-400 bg-purple-500/10 border-purple-500/30' },
};

function normalizeCategory(cat: string): string {
  switch (cat) {
    case 'ACCESS_POINT': return 'WIRELESS_DEVICE';
    case 'SWITCH_POE': return 'SWITCH';
    case 'ROUTER_MODEM': return 'ROUTER_GATEWAY';
    case 'CCTV_NVR': return 'SURVEILLANCE';
    case 'SMARTLOCK_GATEWAY': return 'SMART_LOCK';
    case 'STB_TV': return 'CABLE_TV';
    default: return cat;
  }
}

export function isWifiCategoryDevice(dev: { category?: string; subCategory?: string; name?: string }): boolean {
  if (!dev || !dev.category) return false;
  const norm = normalizeCategory(dev.category);
  // Router Gateway, Switch, CCTV/Surveillance, Smart Lock, Rack, Cable TV are NEVER Wi-Fi
  if (
    norm === 'ROUTER_GATEWAY' ||
    dev.category === 'ROUTER_MODEM' ||
    dev.subCategory === 'Router' ||
    dev.name?.toLowerCase().includes('router gateway')
  ) {
    return false;
  }
  return (
    norm === 'WIRELESS_DEVICE' ||
    dev.category === 'ACCESS_POINT' ||
    dev.subCategory === 'Access Point' ||
    dev.subCategory === 'Router Wireless Desktop'
  );
}

export const FloorDeviceInventory: React.FC<FloorDeviceInventoryProps> = ({
  building,
  onUpdateDevice,
  onAddDevice,
  onDeleteDevice,
}) => {
  const [selectedFloor, setSelectedFloor] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<ITDevice | null>(null);

  // Evidence Capture Modal State
  const [captureModal, setCaptureModal] = useState<{
    isOpen: boolean;
    entityId: string;
    entityName: string;
  }>({
    isOpen: false,
    entityId: '',
    entityName: '',
  });

  // Form State
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formCategory, setFormCategory] = useState<DeviceCategory>('WIRELESS_DEVICE');
  const [formSubCategory, setFormSubCategory] = useState<string>(ASSET_CATEGORIES.WIRELESS_DEVICE.subCategories[0]);
  const [formFloorId, setFormFloorId] = useState(building.floors[0]?.id || '');
  const [formLocation, setFormLocation] = useState('');
  const [formIp, setFormIp] = useState('');
  const [formMac, setFormMac] = useState('');
  const [formSn, setFormSn] = useState('');
  const [formUser, setFormUser] = useState('admin');
  const [formPassword, setFormPassword] = useState('');
  const [formStatus, setFormStatus] = useState<'CONFIGURED' | 'NEEDS_CONFIG' | 'OFFLINE'>('CONFIGURED');
  const [formSsidStatus, setFormSsidStatus] = useState<'SSID_CHANGED' | 'SSID_DEFAULT'>('SSID_CHANGED');
  const [formSsidName, setFormSsidName] = useState('');
  const [formTakeoverStatus, setFormTakeoverStatus] = useState<TakeoverStatus>('SUDAH_TAKEOVER');
  const [formCloudUnbindStatus, setFormCloudUnbindStatus] = useState<'UNBOUND' | 'STILL_BOUND' | 'NOT_APPLICABLE'>('UNBOUND');
  const [formNetflixSupport, setFormNetflixSupport] = useState<NetflixSupportStatus>('SUPPORT');
  const [formTtlockSupport, setFormTtlockSupport] = useState<TtlockSupportStatus>('SUPPORT_TTLOCK');
  const [formTtlockTakeoverStatus, setFormTtlockTakeoverStatus] = useState<TakeoverStatus>('SUDAH_TAKEOVER');
  const [formTtlockEmail, setFormTtlockEmail] = useState('');
  const [formTakeoverNotes, setFormTakeoverNotes] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const handleCategoryChange = (newCat: DeviceCategory) => {
    setFormCategory(newCat);
    const norm = normalizeCategory(newCat);
    const defaultSub = ASSET_CATEGORIES[norm]?.subCategories[0] || 'Lainnya';
    setFormSubCategory(defaultSub);
    if (norm === 'CABLE_TV' || newCat === 'STB_TV') {
      setFormMac('');
    }
  };

  const handleFilterCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setSelectedSubCategory('ALL');
  };

  const devices = building.devices || [];

  // Metrics
  const totalCount = devices.length;
  const configuredCount = devices.filter(d => d.configStatus === 'CONFIGURED').length;
  const needsConfigCount = devices.filter(d => d.configStatus === 'NEEDS_CONFIG').length;
  const offlineCount = devices.filter(d => d.configStatus === 'OFFLINE').length;
  const wirelessDevices = devices.filter(d => isWifiCategoryDevice(d));
  const wirelessCount = wirelessDevices.length;
  const wirelessSsidChangedCount = wirelessDevices.filter(d => d.ssidStatus === 'SSID_CHANGED').length;

  const apDevices = devices.filter(d => 
    isWifiCategoryDevice(d) && d.subCategory !== 'Router Wireless Desktop'
  );
  const apTakenCount = apDevices.filter(d => d.takeoverStatus === 'SUDAH_TAKEOVER').length;

  const nvrDevices = devices.filter(d => 
    d.category === 'CCTV_NVR' || 
    (normalizeCategory(d.category) === 'SURVEILLANCE' && (d.subCategory === 'NVR' || d.subCategory === 'DVR'))
  );
  const nvrTakenCount = nvrDevices.filter(d => d.takeoverStatus === 'SUDAH_TAKEOVER').length;

  const smartlockDevices = devices.filter(d => 
    normalizeCategory(d.category) === 'SMART_LOCK' || 
    d.category === 'SMARTLOCK_GATEWAY' ||
    d.subCategory?.includes('Smartlock') || 
    d.subCategory?.includes('Access Door')
  );
  const ttlockDevices = smartlockDevices.filter(d => d.ttlockSupport === 'SUPPORT_TTLOCK');
  const ttlockTakenCount = ttlockDevices.filter(d => d.ttlockTakeoverStatus === 'SUDAH_TAKEOVER' || d.takeoverStatus === 'SUDAH_TAKEOVER').length;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 1800);
  };

  const togglePasswordReveal = (deviceId: string) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [deviceId]: !prev[deviceId]
    }));
  };

  const handleOpenAdd = () => {
    setEditingDevice(null);
    setFormName('');
    setFormBrand('');
    setFormCategory('WIRELESS_DEVICE');
    setFormSubCategory(ASSET_CATEGORIES.WIRELESS_DEVICE.subCategories[0]);
    setFormFloorId(building.floors[0]?.id || '');
    setFormLocation('');
    setFormIp('');
    setFormMac('');
    setFormSn('');
    setFormUser('admin');
    setFormPassword('');
    setFormStatus('CONFIGURED');
    setFormSsidStatus('SSID_CHANGED');
    setFormSsidName(`@Rukita ${building.name.replace(/Rukita\s*/i, '').trim()} Community`);
    setFormTakeoverStatus('SUDAH_TAKEOVER');
    setFormCloudUnbindStatus('UNBOUND');
    setFormNetflixSupport('SUPPORT');
    setFormTtlockSupport('SUPPORT_TTLOCK');
    setFormTtlockTakeoverStatus('SUDAH_TAKEOVER');
    setFormTtlockEmail('it.smartlock@rukita.co');
    setFormTakeoverNotes('');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (device: ITDevice) => {
    setEditingDevice(device);
    setFormName(device.name);
    setFormBrand(device.brandModel);
    const norm = (normalizeCategory(device.category) as DeviceCategory) || 'WIRELESS_DEVICE';
    setFormCategory(norm);
    setFormSubCategory(device.subCategory || ASSET_CATEGORIES[norm]?.subCategories[0] || 'Access Point');
    setFormFloorId(device.floorId);
    setFormLocation(device.locationDetail);
    setFormIp(device.ipAddress || '');
    const isCableTvDevice = norm === 'CABLE_TV' || device.category === 'STB_TV';
    setFormMac(isCableTvDevice ? '' : (device.macAddress || ''));
    setFormSn(device.serialNumber);
    setFormUser(device.adminUser);
    setFormPassword(device.adminPassword);
    setFormStatus(device.configStatus);
    setFormSsidStatus(device.ssidStatus || 'SSID_CHANGED');
    setFormSsidName(device.ssidName || '');
    setFormTakeoverStatus(device.takeoverStatus || 'SUDAH_TAKEOVER');
    setFormCloudUnbindStatus(device.cloudUnbindStatus || 'UNBOUND');
    setFormNetflixSupport(device.netflixSupport || 'SUPPORT');
    setFormTtlockSupport(device.ttlockSupport || 'SUPPORT_TTLOCK');
    setFormTtlockTakeoverStatus(device.ttlockTakeoverStatus || device.takeoverStatus || 'SUDAH_TAKEOVER');
    setFormTtlockEmail(device.ttlockAccountEmail || '');
    setFormTakeoverNotes(device.takeoverNotes || '');
    setFormNotes(device.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const floorObj = building.floors.find(f => f.id === formFloorId) || building.floors[0];
    const isWireless = isWifiCategoryDevice({ category: formCategory, subCategory: formSubCategory, name: formName });
    const isNvrOrDvr = (normalizeCategory(formCategory) === 'SURVEILLANCE' && (formSubCategory === 'NVR' || formSubCategory === 'DVR')) || formCategory === 'CCTV_NVR';
    const isCableTv = normalizeCategory(formCategory) === 'CABLE_TV' || formCategory === 'STB_TV';
    const isSmartLock = normalizeCategory(formCategory) === 'SMART_LOCK' || formCategory === 'SMARTLOCK_GATEWAY';

    if (editingDevice) {
      const updated: ITDevice = {
        ...editingDevice,
        name: formName.trim(),
        brandModel: formBrand.trim(),
        category: formCategory,
        subCategory: formSubCategory.trim() || undefined,
        floorId: floorObj.id,
        floorNumber: floorObj.floorNumber,
        locationDetail: formLocation.trim(),
        ipAddress: formIp.trim() || undefined,
        macAddress: isCableTv ? undefined : (formMac.trim() || undefined),
        serialNumber: formSn.trim(),
        adminUser: formUser.trim(),
        adminPassword: formPassword.trim(),
        configStatus: formStatus,
        ssidStatus: isWireless ? formSsidStatus : undefined,
        ssidName: isWireless ? (formSsidName.trim() || undefined) : undefined,
        netflixSupport: isCableTv ? formNetflixSupport : undefined,
        ttlockSupport: isSmartLock ? formTtlockSupport : undefined,
        ttlockTakeoverStatus: isSmartLock && formTtlockSupport === 'SUPPORT_TTLOCK' ? formTtlockTakeoverStatus : undefined,
        ttlockAccountEmail: isSmartLock && formTtlockSupport === 'SUPPORT_TTLOCK' ? (formTtlockEmail.trim() || undefined) : undefined,
        takeoverStatus: isSmartLock && formTtlockSupport === 'SUPPORT_TTLOCK' ? formTtlockTakeoverStatus : formTakeoverStatus,
        cloudUnbindStatus: isNvrOrDvr ? formCloudUnbindStatus : undefined,
        takeoverDate: (formTakeoverStatus === 'SUDAH_TAKEOVER' || (isSmartLock && formTtlockTakeoverStatus === 'SUDAH_TAKEOVER')) ? (editingDevice.takeoverDate || new Date().toISOString().split('T')[0]) : undefined,
        takeoverNotes: formTakeoverNotes.trim() || undefined,
        notes: formNotes.trim() || undefined,
      };
      onUpdateDevice(updated);
    } else {
      const newDev: ITDevice = {
        id: `dev-${Date.now()}`,
        name: formName.trim(),
        brandModel: formBrand.trim() || 'Generic IT Device',
        category: formCategory,
        subCategory: formSubCategory.trim() || undefined,
        floorId: floorObj.id,
        floorNumber: floorObj.floorNumber,
        locationDetail: formLocation.trim() || `Lantai ${floorObj.floorNumber}`,
        ipAddress: formIp.trim() || undefined,
        macAddress: isCableTv ? undefined : (formMac.trim() || undefined),
        serialNumber: formSn.trim() || `SN-${Date.now().toString().slice(-6)}`,
        adminUser: formUser.trim() || 'admin',
        adminPassword: formPassword.trim(),
        configStatus: formStatus,
        ssidStatus: isWireless ? formSsidStatus : undefined,
        ssidName: isWireless ? (formSsidName.trim() || undefined) : undefined,
        netflixSupport: isCableTv ? formNetflixSupport : undefined,
        ttlockSupport: isSmartLock ? formTtlockSupport : undefined,
        ttlockTakeoverStatus: isSmartLock && formTtlockSupport === 'SUPPORT_TTLOCK' ? formTtlockTakeoverStatus : undefined,
        ttlockAccountEmail: isSmartLock && formTtlockSupport === 'SUPPORT_TTLOCK' ? (formTtlockEmail.trim() || undefined) : undefined,
        takeoverStatus: isSmartLock && formTtlockSupport === 'SUPPORT_TTLOCK' ? formTtlockTakeoverStatus : formTakeoverStatus,
        cloudUnbindStatus: isNvrOrDvr ? formCloudUnbindStatus : undefined,
        takeoverDate: (formTakeoverStatus === 'SUDAH_TAKEOVER' || (isSmartLock && formTtlockTakeoverStatus === 'SUDAH_TAKEOVER')) ? new Date().toISOString().split('T')[0] : undefined,
        takeoverNotes: formTakeoverNotes.trim() || undefined,
        notes: formNotes.trim() || undefined,
      };
      onAddDevice(newDev);
    }

    setIsModalOpen(false);
  };

  const handleToggleStatus = (device: ITDevice) => {
    const cycle: Record<ITDevice['configStatus'], ITDevice['configStatus']> = {
      CONFIGURED: 'NEEDS_CONFIG',
      NEEDS_CONFIG: 'OFFLINE',
      OFFLINE: 'CONFIGURED',
    };
    onUpdateDevice({
      ...device,
      configStatus: cycle[device.configStatus],
    });
  };

  const handleToggleSsidStatus = (device: ITDevice) => {
    const nextStatus: 'SSID_CHANGED' | 'SSID_DEFAULT' = 
      device.ssidStatus === 'SSID_CHANGED' ? 'SSID_DEFAULT' : 'SSID_CHANGED';
    onUpdateDevice({
      ...device,
      ssidStatus: nextStatus,
    });
  };

  const handleToggleTakeover = (device: ITDevice) => {
    const nextStatus: TakeoverStatus = device.takeoverStatus === 'SUDAH_TAKEOVER' ? 'BELUM_TAKEOVER' : 'SUDAH_TAKEOVER';
    onUpdateDevice({
      ...device,
      takeoverStatus: nextStatus,
      takeoverDate: nextStatus === 'SUDAH_TAKEOVER' ? new Date().toISOString().split('T')[0] : undefined,
    });
  };

  const handleToggleCloudUnbind = (device: ITDevice) => {
    const nextStatus = device.cloudUnbindStatus === 'UNBOUND' ? 'STILL_BOUND' : 'UNBOUND';
    onUpdateDevice({
      ...device,
      cloudUnbindStatus: nextStatus,
    });
  };

  const handleToggleNetflixSupport = (device: ITDevice) => {
    const cycle: Record<NetflixSupportStatus, NetflixSupportStatus> = {
      SUPPORT: 'NOT_SUPPORT',
      NOT_SUPPORT: 'NOT_TESTED',
      NOT_TESTED: 'SUPPORT',
    };
    const current = device.netflixSupport || 'NOT_TESTED';
    onUpdateDevice({
      ...device,
      netflixSupport: cycle[current],
    });
  };

  const handleToggleTtlockTakeover = (device: ITDevice) => {
    const current = device.ttlockTakeoverStatus || device.takeoverStatus || 'BELUM_TAKEOVER';
    const nextStatus: TakeoverStatus = current === 'SUDAH_TAKEOVER' ? 'BELUM_TAKEOVER' : 'SUDAH_TAKEOVER';
    onUpdateDevice({
      ...device,
      ttlockTakeoverStatus: nextStatus,
      takeoverStatus: nextStatus,
      takeoverDate: nextStatus === 'SUDAH_TAKEOVER' ? (device.takeoverDate || new Date().toISOString().split('T')[0]) : undefined,
    });
  };

  // Filtered devices
  const filteredDevices = devices.filter(d => {
    if (selectedFloor !== 'ALL') {
      const fl = building.floors.find(f => f.id === selectedFloor);
      if (fl && d.floorNumber !== fl.floorNumber) return false;
    }
    const norm = normalizeCategory(d.category);
    if (selectedCategory !== 'ALL' && norm !== selectedCategory && d.category !== selectedCategory) {
      return false;
    }
    if (selectedSubCategory !== 'ALL' && d.subCategory !== selectedSubCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = d.name.toLowerCase().includes(q);
      const matchIp = d.ipAddress ? d.ipAddress.toLowerCase().includes(q) : false;
      const matchSn = d.serialNumber.toLowerCase().includes(q);
      const matchBrand = d.brandModel.toLowerCase().includes(q);
      const matchLoc = d.locationDetail.toLowerCase().includes(q);
      const matchSub = d.subCategory?.toLowerCase().includes(q);
      return matchName || matchIp || matchSn || matchBrand || matchLoc || !!matchSub;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      
      {/* Top Banner & Title */}
      <div className="p-4 rounded-xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-500" />
            <h2 className="text-base font-bold text-foreground">
              2. Inventaris & Konfigurasi Perangkat IT — {building.name}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pendataan router, switch PoE, access point, NVR/DVR, dan smartlock gateway per lantai sebelum pemetaan CCTV & QC
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-1.5 transition-colors text-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Perangkat</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-card border border-border">
          <span className="text-[11px] text-muted-foreground block font-medium">Total Perangkat</span>
          <span className="text-xl font-mono font-bold text-foreground mt-0.5 block">{totalCount} Unit</span>
          <span className="text-[10px] text-muted-foreground">Tersebar di {building.floors.length} Lantai</span>
        </div>

        <div className="p-3 rounded-xl bg-card border border-border">
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Siap Live (Configured)
          </span>
          <span className="text-xl font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 block">{configuredCount} Unit</span>
          <span className="text-[10px] text-muted-foreground">
            {wirelessCount > 0 ? `SSID Diganti: ${wirelessSsidChangedCount}/${wirelessCount} AP` : 'Parameter terpasang'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-card border border-border">
          <span className="text-[11px] text-amber-700 dark:text-amber-400 block font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Perlu Setting
          </span>
          <span className="text-xl font-mono font-bold text-amber-700 dark:text-amber-400 mt-0.5 block">{needsConfigCount} Unit</span>
          <span className="text-[10px] text-muted-foreground">Menunggu konfigurasi di lapangan</span>
        </div>

        <div className="p-3 rounded-xl bg-card border border-border">
          <span className="text-[11px] text-rose-700 dark:text-rose-400 block font-semibold">Offline / Mati</span>
          <span className="text-xl font-mono font-bold text-rose-700 dark:text-rose-400 mt-0.5 block">{offlineCount} Unit</span>
          <span className="text-[10px] text-muted-foreground">Tidak terdeteksi atau mati daya</span>
        </div>
      </div>

      {/* Information Banner: Status Takeover Master Akses Perangkat IT */}
      <div className="p-3.5 sm:p-4 rounded-xl border border-border bg-card shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs sm:text-sm font-bold text-foreground">
              Status Takeover Master Akses Perangkat IT
            </h3>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            SOP Go-Live IT
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
          {/* AP Takeover summary */}
          <div className="p-2.5 rounded-lg border border-border/80 bg-background/60 flex items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-foreground truncate">
                  Access Point & Wi-Fi
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  ({apDevices.length} Unit)
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Ganti SSID & password standarisasi, controller cloud adoption
              </p>
            </div>

            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${
              apTakenCount === apDevices.length && apDevices.length > 0
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
            }`}>
              {apTakenCount}/{apDevices.length} Selesai
            </span>
          </div>

          {/* NVR Takeover summary */}
          <div className="p-2.5 rounded-lg border border-border/80 bg-background/60 flex items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-foreground truncate">
                  DVR / NVR Master Perekam
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  ({nvrDevices.length} Unit)
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Takeover password admin lokal & unbind cloud owner lama (Hik-Connect)
              </p>
            </div>

            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${
              nvrTakenCount === nvrDevices.length && nvrDevices.length > 0
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
            }`}>
              {nvrTakenCount}/{nvrDevices.length} Selesai
            </span>
          </div>

          {/* Smartlock TTLock Takeover summary */}
          <div className="p-2.5 rounded-lg border border-border/80 bg-background/60 flex items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-foreground truncate">
                  Smartlock TTLock & Gate
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  ({ttlockDevices.length} Unit)
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Transfer akun master admin TTLock dari Owner lama & pairing eKey
              </p>
            </div>

            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${
              ttlockTakenCount === ttlockDevices.length && ttlockDevices.length > 0
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
            }`}>
              {ttlockTakenCount}/{ttlockDevices.length} Selesai
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3 rounded-xl bg-card border border-border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        
        {/* Floor Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-muted-foreground text-[11px] font-medium mr-1">Lantai:</span>
          <button
            onClick={() => setSelectedFloor('ALL')}
            className={`px-2.5 py-1 rounded-md transition-colors shrink-0 ${
              selectedFloor === 'ALL' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Semua Lantai ({devices.length})
          </button>
          {building.floors.map(f => {
            const devInFloor = devices.filter(d => d.floorNumber === f.floorNumber).length;
            return (
              <button
                key={f.id}
                onClick={() => setSelectedFloor(f.id)}
                className={`px-2.5 py-1 rounded-md transition-colors shrink-0 ${
                  selectedFloor === f.id ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {f.name.split('(')[0].trim()} ({devInFloor})
              </button>
            );
          })}
        </div>

        {/* Category & Sub-Category Dropdown & Search Input */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Kategori Utama Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => handleFilterCategoryChange(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500 text-foreground font-medium"
          >
            <option value="ALL">Semua Kategori</option>
            {Object.entries(ASSET_CATEGORIES).map(([catKey, catVal]) => (
              <option key={catKey} value={catKey}>
                {catVal.label}
              </option>
            ))}
          </select>

          {/* Sub Kategori Dropdown */}
          <select
            value={selectedSubCategory}
            onChange={(e) => setSelectedSubCategory(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500 text-foreground font-medium"
          >
            <option value="ALL">Semua Sub Kategori</option>
            {selectedCategory !== 'ALL' && ASSET_CATEGORIES[selectedCategory] ? (
              ASSET_CATEGORIES[selectedCategory].subCategories.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))
            ) : (
              Object.entries(ASSET_CATEGORIES).map(([catKey, catVal]) => (
                <optgroup key={catKey} label={catVal.label}>
                  {catVal.subCategories.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </optgroup>
              ))
            )}
          </select>

          <div className="relative w-full sm:w-52">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari perangkat, model, sub-kategori..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500"
            />
          </div>
        </div>

      </div>

      {/* Device List Grid */}
      {filteredDevices.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-border bg-card/40 text-center">
          <HardDrive className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-xs font-semibold text-foreground">Tidak ada perangkat yang cocok dengan filter</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Coba ganti filter lantai atau klik tombol Tambah Perangkat di atas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {filteredDevices.map((device) => {
            const cat = CATEGORY_CONFIG[device.category] || CATEGORY_CONFIG.LAINNYA;
            const CategoryIcon = cat.icon;

            return (
              <div
                key={device.id}
                className="p-3.5 rounded-xl border border-border bg-card hover:border-border/80 transition-all flex flex-col justify-between gap-3 text-xs shadow-xs"
              >
                {/* Header: Name, Category, Floor & Status */}
                <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${cat.color}`}>
                      <CategoryIcon className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-foreground text-xs">{device.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-muted text-muted-foreground border border-border">
                          {device.brandModel}
                        </span>
                        {device.subCategory && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            {device.subCategory}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground block mt-0.5">
                        📍 Lt {device.floorNumber} • {device.locationDetail}
                      </span>

                      {/* Go-Live Preparation: Tag SSID & Takeover Perangkat Wireless (Hanya kategori Wi-Fi, bukan Router Gateway) */}
                      {isWifiCategoryDevice(device) && (
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleToggleTakeover(device)}
                            title="Klik untuk cepat toggle status takeover SSID & Master Password"
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 transition-all shadow-2xs cursor-pointer ${
                              device.takeoverStatus === 'SUDAH_TAKEOVER'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/25'
                            }`}
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>
                              {device.takeoverStatus === 'SUDAH_TAKEOVER'
                                ? '✓ TAKEOVER: SSID & PASSWORD STANDAR'
                                : '⚠️ BELUM TAKEOVER'}
                            </span>
                          </button>
                          {device.ssidName && (
                            <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[200px]" title={device.ssidName}>
                              SSID: <strong className="text-foreground">{device.ssidName}</strong>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Go-Live Preparation: Tag Master Akses & Cloud Unbind DVR / NVR */}
                      {(device.category === 'CCTV_NVR' || (normalizeCategory(device.category) === 'SURVEILLANCE' && (device.subCategory === 'NVR' || device.subCategory === 'DVR'))) && (
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleToggleTakeover(device)}
                            title="Klik untuk cepat toggle status takeover password master NVR"
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 transition-all shadow-2xs cursor-pointer ${
                              device.takeoverStatus === 'SUDAH_TAKEOVER'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/25'
                            }`}
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>
                              {device.takeoverStatus === 'SUDAH_TAKEOVER'
                                ? '✓ TAKEOVER: MASTER AKSES SELESAI'
                                : '⚠️ BELUM TAKEOVER'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleCloudUnbind(device)}
                            title="Klik untuk cepat toggle status Cloud Unbinding NVR"
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 transition-all shadow-2xs cursor-pointer ${
                              device.cloudUnbindStatus === 'UNBOUND'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25'
                                : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/40 hover:bg-rose-500/25'
                            }`}
                          >
                            <span>
                              {device.cloudUnbindStatus === 'UNBOUND'
                                ? '✓ Cloud Unbound (Hik-Connect OK)'
                                : '⚠️ Cloud Masih Bound ke Owner Lama'}
                            </span>
                          </button>
                        </div>
                      )}

                      {/* Go-Live Preparation: Tag Support Netflix pada STB / Smart TV */}
                      {(normalizeCategory(device.category) === 'CABLE_TV' || device.category === 'STB_TV' || device.netflixSupport) && (
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleToggleNetflixSupport(device)}
                            title="Klik untuk cepat toggle status support Netflix (SUPPORT / NOT_SUPPORT / NOT_TESTED)"
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 transition-all shadow-2xs cursor-pointer ${
                              device.netflixSupport === 'SUPPORT'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25'
                                : device.netflixSupport === 'NOT_SUPPORT'
                                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/40 hover:bg-rose-500/25'
                                : 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-500/40 hover:bg-zinc-500/25'
                            }`}
                          >
                            <Tv className="w-3 h-3 text-red-500" />
                            <span>
                              {device.netflixSupport === 'SUPPORT' && '✓ NETFLIX: SUPPORT (WIDEVINE L1)'}
                              {device.netflixSupport === 'NOT_SUPPORT' && '❌ NETFLIX: TIDAK SUPPORT'}
                              {(!device.netflixSupport || device.netflixSupport === 'NOT_TESTED') && '⏳ NETFLIX: BELUM DITEST'}
                            </span>
                          </button>
                        </div>
                      )}

                      {/* Go-Live Preparation: Tag Support TTLock & Status Takeover dari Owner Lama */}
                      {(normalizeCategory(device.category) === 'SMART_LOCK' || device.category === 'SMARTLOCK_GATEWAY' || device.ttlockSupport) && (
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          {device.ttlockSupport === 'SUPPORT_TTLOCK' ? (
                            <button
                              type="button"
                              onClick={() => handleToggleTtlockTakeover(device)}
                              title="Klik untuk toggle status takeover akun master TTLock dari Owner lama"
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 transition-all shadow-2xs cursor-pointer ${
                                device.ttlockTakeoverStatus === 'SUDAH_TAKEOVER' || device.takeoverStatus === 'SUDAH_TAKEOVER'
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25'
                                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/40 hover:bg-rose-500/25'
                              }`}
                            >
                              <KeyRound className="w-3 h-3 text-rose-500" />
                              <span>
                                {device.ttlockTakeoverStatus === 'SUDAH_TAKEOVER' || device.takeoverStatus === 'SUDAH_TAKEOVER'
                                  ? '✓ TTLOCK: SUDAH TAKEOVER (AKUN IT)'
                                  : '⚠️ TTLOCK: BELUM TAKEOVER DARI OWNER'}
                              </span>
                            </button>
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30">
                              Non-TTLock
                            </span>
                          )}
                          {device.ttlockAccountEmail && (
                            <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[200px]" title={device.ttlockAccountEmail}>
                              Akun: <strong className="text-foreground">{device.ttlockAccountEmail}</strong>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Pill (Click to toggle) */}
                  <button
                    onClick={() => handleToggleStatus(device)}
                    title="Klik untuk ubah status konfigurasi"
                    className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 transition-colors flex items-center gap-1 ${
                      device.configStatus === 'CONFIGURED'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40'
                        : device.configStatus === 'NEEDS_CONFIG'
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/40'
                        : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/40'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {device.configStatus === 'CONFIGURED' && 'Siap / Configured'}
                    {device.configStatus === 'NEEDS_CONFIG' && 'Perlu Config'}
                    {device.configStatus === 'OFFLINE' && 'Offline'}
                  </button>
                </div>



                {/* Notes & Actions Strip */}
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                    {device.notes ? `Note: ${device.notes}` : 'Siap operasional'}
                  </p>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setCaptureModal({
                        isOpen: true,
                        entityId: device.id,
                        entityName: `${device.name} (${device.brandModel})`,
                      })}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 flex items-center gap-1 active:scale-95 transition-all"
                      title="Ambil foto fisik perangkat / stiker serial number"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Foto Asset</span>
                    </button>
                    <button
                      onClick={() => handleOpenEdit(device)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                      title="Edit Perangkat"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteDevice(device.id)}
                      className="p-1 rounded text-muted-foreground hover:text-rose-400 hover:bg-muted"
                      title="Hapus Perangkat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tambah / Edit Perangkat */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-xl bg-card border border-border shadow-lg p-5 my-8">
            
            <div className="flex items-start justify-between pb-3 border-b border-border mb-4">
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  {editingDevice ? 'Edit Perangkat IT' : 'Tambah Perangkat IT Baru'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Isi spesifikasi teknis dan lokasi penempatan perangkat asset
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-3 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="col-span-1 sm:col-span-2">
                  <label className="text-muted-foreground block mb-1 font-medium">Nama Perangkat / Peran</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contoh: AP Wi-Fi Koridor Depan Kamar 204"
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Kategori Utama</label>
                  <select
                    value={formCategory}
                    onChange={(e) => handleCategoryChange(e.target.value as DeviceCategory)}
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500 font-medium"
                  >
                    {Object.entries(ASSET_CATEGORIES).map(([catKey, catVal]) => (
                      <option key={catKey} value={catKey}>{catVal.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Sub Kategori</label>
                  <select
                    value={formSubCategory}
                    onChange={(e) => setFormSubCategory(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500 font-medium"
                  >
                    {(ASSET_CATEGORIES[normalizeCategory(formCategory)]?.subCategories || ['Lainnya']).map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className="text-muted-foreground block mb-1 font-medium">Brand & Tipe Model</label>
                  <input
                    type="text"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="Contoh: Ruijie Reyee RG-RAP2200(E) / MikroTik RB4011 / Hikvision"
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Lantai Penempatan</label>
                  <select
                    value={formFloorId}
                    onChange={(e) => setFormFloorId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500"
                  >
                    {building.floors.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Detail Lokasi Fisik</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="Contoh: Plafon depan Kamar 204"
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* MAC Address & Serial Number: Untuk kategori Cable TV, tidak perlu MAC Address */}
              {normalizeCategory(formCategory) === 'CABLE_TV' || formCategory === 'STB_TV' ? (
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Serial Number (SN) (Opsional)</label>
                  <input
                    type="text"
                    value={formSn}
                    onChange={(e) => setFormSn(e.target.value)}
                    placeholder="Contoh: SN-MI-TV50-7711 / ZTE-B860-9921"
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background font-mono text-xs outline-none focus:border-blue-500"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">MAC Address (Opsional)</label>
                    <input
                      type="text"
                      value={formMac}
                      onChange={(e) => setFormMac(e.target.value)}
                      placeholder="D8:0D:17:XX:XX"
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-background font-mono text-xs outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Serial Number (SN) (Opsional)</label>
                    <input
                      type="text"
                      value={formSn}
                      onChange={(e) => setFormSn(e.target.value)}
                      placeholder="RJ-RAP-12345"
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-background font-mono text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Admin User</label>
                  <input
                    type="text"
                    value={formUser}
                    onChange={(e) => setFormUser(e.target.value)}
                    placeholder="admin"
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background font-mono text-xs outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Admin Password</label>
                  <input
                    type="text"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Contoh: Rukita@Reyee2026"
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background font-mono text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Status Konfigurasi</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as 'CONFIGURED' | 'NEEDS_CONFIG' | 'OFFLINE')}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500 font-semibold"
                >
                  <option value="CONFIGURED">Siap Live / Configured</option>
                  <option value="NEEDS_CONFIG">Perlu Setting / Config</option>
                  <option value="OFFLINE">Offline / Mati</option>
                </select>
              </div>

              {/* Go-Live Preparation: Status SSID & Takeover Perangkat Wireless (Hanya kategori Wi-Fi) */}
              {isWifiCategoryDevice({ category: formCategory, subCategory: formSubCategory, name: formName }) && (
                <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/[0.04] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                      <Wifi className="w-3.5 h-3.5 text-blue-500" />
                      Takeover Master Akses & SSID Wi-Fi
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      formTakeoverStatus === 'SUDAH_TAKEOVER'
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30'
                    }`}>
                      {formTakeoverStatus === 'SUDAH_TAKEOVER' ? '✓ Sudah Takeover' : '⚠️ Belum Takeover'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-muted-foreground block mb-1 font-medium text-[11px]">
                        Status Takeover Master Akses AP
                      </label>
                      <select
                        value={formTakeoverStatus}
                        onChange={(e) => setFormTakeoverStatus(e.target.value as TakeoverStatus)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500 font-semibold"
                      >
                        <option value="SUDAH_TAKEOVER">✓ Sudah Takeover (SSID & Password Standar)</option>
                        <option value="BELUM_TAKEOVER">⚠️ Belum Takeover (Masih Default / Belum Diadopsi)</option>
                        <option value="PROSES_TAKEOVER">⏳ Sedang Proses Takeover</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-muted-foreground block mb-1 font-medium text-[11px]">
                        Nama SSID Aktif (Standarisasi)
                      </label>
                      <input
                        type="text"
                        value={formSsidName}
                        onChange={(e) => setFormSsidName(e.target.value)}
                        placeholder="Contoh: @Rukita Tawakal Community"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background font-mono text-xs outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Go-Live Preparation: Takeover Master Akses DVR / NVR & Cloud Unbind */}
              {(formCategory === 'CCTV_NVR' || (normalizeCategory(formCategory) === 'SURVEILLANCE' && (formSubCategory === 'NVR' || formSubCategory === 'DVR'))) && (
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.04] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                      Takeover Master Akses DVR / NVR & Cloud
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      formTakeoverStatus === 'SUDAH_TAKEOVER'
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30'
                    }`}>
                      {formTakeoverStatus === 'SUDAH_TAKEOVER' ? '✓ Sudah Takeover' : '⚠️ Belum Takeover'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-muted-foreground block mb-1 font-medium text-[11px]">
                        Status Master Password NVR
                      </label>
                      <select
                        value={formTakeoverStatus}
                        onChange={(e) => setFormTakeoverStatus(e.target.value as TakeoverStatus)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500 font-semibold"
                      >
                        <option value="SUDAH_TAKEOVER">✓ Master Password Sudah SOP IT</option>
                        <option value="BELUM_TAKEOVER">⚠️ Belum Takeover (Password Pemilik Lama)</option>
                        <option value="PROSES_TAKEOVER">⏳ Proses Reset / Minta Password</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-muted-foreground block mb-1 font-medium text-[11px]">
                        Status Cloud Unbinding P2P
                      </label>
                      <select
                        value={formCloudUnbindStatus}
                        onChange={(e) => setFormCloudUnbindStatus(e.target.value as 'UNBOUND' | 'STILL_BOUND' | 'NOT_APPLICABLE')}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500 font-semibold"
                      >
                        <option value="UNBOUND">✓ Unbound / Dilepas dari Pemilik Lama</option>
                        <option value="STILL_BOUND">⚠️ Masih Bound ke Akun Pemilik Lama</option>
                        <option value="NOT_APPLICABLE">Tidak Menggunakan Cloud</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium text-[11px]">
                      Catatan Akun / Cloud NVR
                    </label>
                    <input
                      type="text"
                      value={formTakeoverNotes}
                      onChange={(e) => setFormTakeoverNotes(e.target.value)}
                      placeholder="Contoh: Hik-Connect unbind selesai, akun IT corporate terikat"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Go-Live Preparation: STB / Smart TV Netflix Support */}
              {(normalizeCategory(formCategory) === 'CABLE_TV' || formCategory === 'STB_TV') && (
                <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/[0.04] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                      <Tv className="w-3.5 h-3.5 text-red-500" />
                      Dukungan Layanan Streaming (Netflix)
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      formNetflixSupport === 'SUPPORT'
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                        : formNetflixSupport === 'NOT_SUPPORT'
                        ? 'bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/30'
                        : 'bg-zinc-500/20 text-zinc-700 dark:text-zinc-400 border-zinc-500/30'
                    }`}>
                      {formNetflixSupport === 'SUPPORT' && '✓ Support Netflix'}
                      {formNetflixSupport === 'NOT_SUPPORT' && '❌ Tidak Support'}
                      {formNetflixSupport === 'NOT_TESTED' && '⏳ Belum Ditest'}
                    </span>
                  </div>

                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium text-[11px]">
                      Status Sertifikasi & Dukungan Netflix
                    </label>
                    <select
                      value={formNetflixSupport}
                      onChange={(e) => setFormNetflixSupport(e.target.value as NetflixSupportStatus)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-red-500 font-semibold"
                    >
                      <option value="SUPPORT">✓ Support Netflix (Certified / Widevine L1 Resmi)</option>
                      <option value="NOT_SUPPORT">❌ Tidak Support Netflix (Uncertified / Sideload / Layar Hitam)</option>
                      <option value="NOT_TESTED">⏳ Belum Ditest (Perlu Diuji Coba di Lapangan)</option>
                    </select>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      *Wajib diuji coba di lapangan. STB Android yang tidak tersertifikasi Widevine L1 tidak dapat streaming konten Netflix.
                    </p>
                  </div>
                </div>
              )}

              {/* Go-Live Preparation: Smartlock TTLock Platform Support & Takeover dari Owner Lama */}
              {(normalizeCategory(formCategory) === 'SMART_LOCK' || formCategory === 'SMARTLOCK_GATEWAY') && (
                <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/[0.04] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-rose-500" />
                      Integrasi Platform Smartlock (TTLock)
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      formTtlockSupport === 'SUPPORT_TTLOCK'
                        ? (formTtlockTakeoverStatus === 'SUDAH_TAKEOVER'
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/30')
                        : 'bg-zinc-500/20 text-zinc-700 dark:text-zinc-400 border-zinc-500/30'
                    }`}>
                      {formTtlockSupport === 'SUPPORT_TTLOCK'
                        ? (formTtlockTakeoverStatus === 'SUDAH_TAKEOVER' ? '✓ TTLock: Sudah Takeover' : '⚠️ TTLock: Belum Takeover')
                        : 'Bukan TTLock'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-muted-foreground block mb-1 font-medium text-[11px]">
                        Apakah Support Platform TTLock?
                      </label>
                      <select
                        value={formTtlockSupport}
                        onChange={(e) => setFormTtlockSupport(e.target.value as TtlockSupportStatus)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-rose-500 font-semibold"
                      >
                        <option value="SUPPORT_TTLOCK">✓ Ya, Support TTLock (BLE / Gateway G2)</option>
                        <option value="NON_TTLOCK">Bukan TTLock (Tuya / Salto / Standalone RFID / Manual)</option>
                      </select>
                    </div>

                    {formTtlockSupport === 'SUPPORT_TTLOCK' && (
                      <div>
                        <label className="text-muted-foreground block mb-1 font-medium text-[11px]">
                          Status Takeover TTLock dari Owner Lama
                        </label>
                        <select
                          value={formTtlockTakeoverStatus}
                          onChange={(e) => setFormTtlockTakeoverStatus(e.target.value as TakeoverStatus)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-rose-500 font-semibold"
                        >
                          <option value="SUDAH_TAKEOVER">✓ Sudah Takeover (Akun Master Ditransfer ke IT)</option>
                          <option value="BELUM_TAKEOVER">⚠️ Belum Takeover (Masih Terikat Akun Owner Lama)</option>
                          <option value="PROSES_TAKEOVER">⏳ Sedang Proses Minta Transfer / Reset</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {formTtlockSupport === 'SUPPORT_TTLOCK' && (
                    <div>
                      <label className="text-muted-foreground block mb-1 font-medium text-[11px]">
                        Catatan Akun / Admin TTLock
                      </label>
                      <input
                        type="text"
                        value={formTtlockEmail}
                        onChange={(e) => setFormTtlockEmail(e.target.value)}
                        placeholder="Contoh: it.smartlock@rukita.co (Gateway G2 Lt 1 terikat, eKey penghuni aktif)"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-rose-500"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        *PENTING: Jika smartlock masih terikat di akun TTLock owner lama, tim IT tidak dapat mendistribusikan eKey akses pintu ke penghuni baru.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Catatan Khusus</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Contoh: SSID Rukita-Tawakal, DHCP pool 192.168.10.x"
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
                >
                  {editingDevice ? 'Simpan Perubahan' : 'Tambahkan Perangkat'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Evidence Capture Modal */}
      <EvidenceCaptureModal
        isOpen={captureModal.isOpen}
        onClose={() => setCaptureModal(prev => ({ ...prev, isOpen: false }))}
        building={building}
        entityId={captureModal.entityId}
        entityName={captureModal.entityName}
        defaultCategory="DEVICE_ASSET"
        availableCategories={[
          { label: 'Fisik Asset & Label SN', value: 'DEVICE_ASSET' },
          { label: 'Port Switch PoE / Uplink', value: 'DEVICE_ASSET' },
          { label: 'Bukti Perangkat Umum', value: 'GENERAL_EVIDENCE' },
        ]}
      />

    </div>
  );
};
