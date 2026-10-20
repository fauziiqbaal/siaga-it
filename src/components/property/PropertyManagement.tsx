import React, { useState } from 'react';
import { Building, FacilityType, FloorConfig, FloorFacility, LockType, RoomColiving, TvType, InternetConnection, InternetRole, InternetStatus, BillingTakeoverStatus, CheckStatus, TtlockSupportStatus, TakeoverStatus, SimpleUser } from '../../types/hotel';
import { Building2, Plus, Trash2, Edit2, Check, X, Layers, DoorClosed, Utensils, Wifi, Tv, KeyRound, Sparkles, Search, Car, Sun, Shield, Globe, Zap, Copy, Phone, ExternalLink, Radio, Lock, Mail, CheckCircle2, AlertCircle, PenTool, Eye, ChevronDown, ChevronUp, Camera } from 'lucide-react';
import { FloorPlanDrawingModal } from './FloorPlanDrawingModal';
import { LiveCameraModal } from '../common/LiveCameraModal';

interface PropertyManagementProps {
  buildings: Building[];
  currentBuilding: Building;
  currentUser?: SimpleUser;
  onSelectBuilding: (building: Building) => void;
  onOpenNewBuilding: () => void;
  onUpdateBuilding: (updatedBuilding: Building) => void;
  onOpenSearchBuilding?: () => void;
  onOpenEvidenceExplorer?: () => void;
  onRequestDeleteBuilding?: (building: Building) => void;
}

export const PropertyManagement: React.FC<PropertyManagementProps> = ({
  buildings,
  currentBuilding,
  currentUser,
  onSelectBuilding,
  onOpenNewBuilding,
  onUpdateBuilding,
  onOpenSearchBuilding,
  onOpenEvidenceExplorer,
  onRequestDeleteBuilding,
}) => {
  // Add room modal
  const [addingRoomFloorId, setAddingRoomFloorId] = useState<string | null>(null);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomHasTv, setNewRoomHasTv] = useState(false);
  const [newRoomHasSmartlock, setNewRoomHasSmartlock] = useState(false);

  // Add facility modal
  const [addingFacilityFloorId, setAddingFacilityFloorId] = useState<string | null>(null);
  const [newFacilityName, setNewFacilityName] = useState('Dapur Bersama');
  const [newFacilityType, setNewFacilityType] = useState<FacilityType>('DAPUR');
  const [facHasWifi, setFacHasWifi] = useState(true);
  const [facHasTv, setFacHasTv] = useState(false);
  const [facHasLock, setFacHasLock] = useState(false);

  // Edit room modal state
  const [editingRoomFloorId, setEditingRoomFloorId] = useState<string | null>(null);
  const [editingRoom, setEditingRoom] = useState<RoomColiving | null>(null);
  const [editRoomNumber, setEditRoomNumber] = useState('');
  const [editRoomHasTv, setEditRoomHasTv] = useState(false);
  const [editRoomTvType, setEditRoomTvType] = useState<TvType>('ANDROID_GOOGLE_TV');
  const [editRoomHasSmartlock, setEditRoomHasSmartlock] = useState(false);
  const [editRoomLockType, setEditRoomLockType] = useState<LockType>('SMARTLOCK_HANDLE');
  const [editRoomTtlockSupport, setEditRoomTtlockSupport] = useState<TtlockSupportStatus>('SUPPORT_TTLOCK');
  const [editRoomTtlockTakeover, setEditRoomTtlockTakeover] = useState<TakeoverStatus>('SUDAH_TAKEOVER');

  // Edit facility modal state
  const [editingFacilityFloorId, setEditingFacilityFloorId] = useState<string | null>(null);
  const [editingFacility, setEditingFacility] = useState<FloorFacility | null>(null);
  const [editFacilityName, setEditFacilityName] = useState('');
  const [editFacilityType, setEditFacilityType] = useState<FacilityType>('DAPUR');
  const [editFacHasTv, setEditFacHasTv] = useState(false);
  const [editFacHasLock, setEditFacHasLock] = useState(false);
  const [editFacLockType, setEditFacLockType] = useState<LockType>('SMARTLOCK_HANDLE');
  const [editFacTtlockSupport, setEditFacTtlockSupport] = useState<TtlockSupportStatus>('SUPPORT_TTLOCK');
  const [editFacTtlockTakeover, setEditFacTtlockTakeover] = useState<TakeoverStatus>('SUDAH_TAKEOVER');

  // Floor Plan Touch & Draw State
  const [drawingFloor, setDrawingFloor] = useState<FloorConfig | null>(null);
  const [cameraFloorTarget, setCameraFloorTarget] = useState<FloorConfig | null>(null);
  const [initialBlueprintForDrawing, setInitialBlueprintForDrawing] = useState<string | undefined>(undefined);

  const handleSaveFloorPlan = (floorId: string, sketchDataUrl: string, notes?: string, elementsJson?: string) => {
    const updatedFloors = currentBuilding.floors.map(f => {
      if (f.id === floorId) {
        return {
          ...f,
          floorPlanSketch: sketchDataUrl,
          floorPlanUpdatedAt: new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          floorPlanNotes: notes,
          floorPlanElements: elementsJson,
        };
      }
      return f;
    });

    onUpdateBuilding({
      ...currentBuilding,
      floors: updatedFloors,
    });
  };

  const handleDeleteFloorPlan = (floorId: string) => {
    if (!window.confirm('Hapus sketsa denah lantai ini?')) return;
    const updatedFloors = currentBuilding.floors.map(f => {
      if (f.id === floorId) {
        return {
          ...f,
          floorPlanSketch: undefined,
          floorPlanUpdatedAt: undefined,
          floorPlanNotes: undefined,
        };
      }
      return f;
    });
    onUpdateBuilding({
      ...currentBuilding,
      floors: updatedFloors,
    });
  };

  // Internet Multi-WAN / Multi-ISP State
  const [isInternetModalOpen, setIsInternetModalOpen] = useState(false);
  const [editingInternetId, setEditingInternetId] = useState<string | null>(null);
  const [netIspName, setNetIspName] = useState('Biznet');
  const [netPackageName, setNetPackageName] = useState('Biznet Metronet Dedicated 2B');
  const [netRole, setNetRole] = useState<InternetRole>('PRIMARY');
  const [netSpeedMbps, setNetSpeedMbps] = useState(150);
  const [netCustomerNumber, setNetCustomerNumber] = useState('');
  const [netAccountHolder, setNetAccountHolder] = useState('PT Rukita Bhineka Nusantara');
  const [netIsBillingTakeover, setNetIsBillingTakeover] = useState(true);
  const [netBillingTakeoverStatus, setNetBillingTakeoverStatus] = useState<BillingTakeoverStatus>('SUDAH_TAKEOVER');
  const [netBillingEmail, setNetBillingEmail] = useState('it.billing@rukita.co');
  const [netBillingTakeoverDate, setNetBillingTakeoverDate] = useState('19 Okt 2026');
  const [netIpPublic, setNetIpPublic] = useState('');
  const [netModemWanPort, setNetModemWanPort] = useState('MikroTik ether1-WAN1');
  const [netNocContact, setNetNocContact] = useState('1500988');
  const [netMonthlyCost, setNetMonthlyCost] = useState('');
  const [netStatus, setNetStatus] = useState<InternetStatus>('AKTIF');
  const [netNotes, setNetNotes] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedNetIds, setExpandedNetIds] = useState<Record<string, boolean>>({});

  const toggleExpandNet = (id: string) => {
    setExpandedNetIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  const handleAddFloor = () => {
    const nextNum = currentBuilding.floors.length + 1;
    const newFloor: FloorConfig = {
      id: `fl-${Date.now()}`,
      floorNumber: nextNum,
      name: `Lantai ${nextNum}`,
      rooms: [],
      facilities: [],
    };
    onUpdateBuilding({
      ...currentBuilding,
      floors: [...currentBuilding.floors, newFloor],
    });
  };

  // Add room to specific floor (Pure IT Marking: TV Available & Smartlock)
  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingRoomFloorId || !newRoomNumber.trim()) return;

    const targetFloor = currentBuilding.floors.find(f => f.id === addingRoomFloorId);
    if (!targetFloor) return;

    const newRoom: RoomColiving = {
      id: `rm-${Date.now()}`,
      number: newRoomNumber.trim(),
      floor: targetFloor.floorNumber,
      hasTv: newRoomHasTv,
      tvStatus: newRoomHasTv ? 'PENDING' : 'NA',
      tvType: newRoomHasTv ? 'ANDROID_GOOGLE_TV' : 'NONE',
      hasSmartlock: newRoomHasSmartlock,
      lockType: newRoomHasSmartlock ? 'SMARTLOCK_HANDLE' : 'KUNCI_BIASA',
      lockStatus: 'PENDING',
      wifiStatus: 'PENDING',
      wifiSpeedMbps: 50,
    };

    const updatedFloors = currentBuilding.floors.map(f => {
      if (f.id === addingRoomFloorId) {
        return {
          ...f,
          rooms: [...f.rooms, newRoom],
        };
      }
      return f;
    });

    onUpdateBuilding({
      ...currentBuilding,
      floors: updatedFloors,
    });

    setNewRoomNumber('');
    setNewRoomHasTv(false);
    setNewRoomHasSmartlock(false);
    setAddingRoomFloorId(null);
  };

  // Toggle existing room TV
  const handleToggleRoomTv = (floorId: string, room: RoomColiving) => {
    const nextHasTv = !room.hasTv;
    onUpdateBuilding({
      ...currentBuilding,
      floors: currentBuilding.floors.map(f => {
        if (f.id === floorId) {
          return {
            ...f,
            rooms: f.rooms.map(r => r.id === room.id ? {
              ...r,
              hasTv: nextHasTv,
              tvStatus: nextHasTv ? (r.tvStatus === 'NA' ? 'PENDING' : r.tvStatus) : 'NA',
              tvType: nextHasTv ? 'ANDROID_GOOGLE_TV' : 'NONE',
            } : r),
          };
        }
        return f;
      }),
    });
  };

  // Toggle existing room Smartlock
  const handleToggleRoomSmartlock = (floorId: string, room: RoomColiving) => {
    const nextHasSmartlock = !room.hasSmartlock;
    onUpdateBuilding({
      ...currentBuilding,
      floors: currentBuilding.floors.map(f => {
        if (f.id === floorId) {
          return {
            ...f,
            rooms: f.rooms.map(r => r.id === room.id ? {
              ...r,
              hasSmartlock: nextHasSmartlock,
              lockType: nextHasSmartlock ? 'SMARTLOCK_HANDLE' : 'KUNCI_BIASA',
            } : r),
          };
        }
        return f;
      }),
    });
  };

  // Add facility to specific floor (dapur, balcony, rooftop, etc.)
  const handleSaveFacility = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingFacilityFloorId || !newFacilityName.trim()) return;

    const targetFloor = currentBuilding.floors.find(f => f.id === addingFacilityFloorId);
    if (!targetFloor) return;

    const newFacility: FloorFacility = {
      id: `fac-${Date.now()}`,
      name: newFacilityName.trim(),
      type: newFacilityType,
      floor: targetFloor.floorNumber,
      hasWifi: facHasWifi,
      wifiStatus: facHasWifi ? 'PENDING' : 'NA',
      wifiSpeedMbps: 50,
      hasTv: facHasTv,
      tvStatus: facHasTv ? 'PENDING' : 'NA',
      hasLock: facHasLock,
      lockType: facHasLock ? 'SMARTLOCK_HANDLE' : 'NONE',
      lockStatus: facHasLock ? 'PENDING' : 'NA',
    };

    const updatedFloors = currentBuilding.floors.map(f => {
      if (f.id === addingFacilityFloorId) {
        return {
          ...f,
          facilities: [...f.facilities, newFacility],
        };
      }
      return f;
    });

    onUpdateBuilding({
      ...currentBuilding,
      floors: updatedFloors,
    });

    setAddingFacilityFloorId(null);
  };

  // Edit Room Handlers
  const handleOpenEditRoom = (floorId: string, room: RoomColiving) => {
    setEditingRoomFloorId(floorId);
    setEditingRoom(room);
    setEditRoomNumber(room.number);
    setEditRoomHasTv(room.hasTv);
    setEditRoomTvType(room.tvType || 'ANDROID_GOOGLE_TV');
    setEditRoomHasSmartlock(room.hasSmartlock);
    setEditRoomLockType(room.lockType || 'SMARTLOCK_HANDLE');
    setEditRoomTtlockSupport(room.ttlockSupport || 'SUPPORT_TTLOCK');
    setEditRoomTtlockTakeover(room.ttlockTakeoverStatus || 'SUDAH_TAKEOVER');
  };

  const handleSaveEditRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoomFloorId || !editingRoom || !editRoomNumber.trim()) return;

    const updatedFloors = currentBuilding.floors.map(f => {
      if (f.id === editingRoomFloorId) {
        return {
          ...f,
          rooms: f.rooms.map(r => {
            if (r.id === editingRoom.id) {
              const tvChanged = r.hasTv !== editRoomHasTv;
              const lockChanged = r.hasSmartlock !== editRoomHasSmartlock;
              return {
                ...r,
                number: editRoomNumber.trim(),
                hasTv: editRoomHasTv,
                tvType: editRoomHasTv ? editRoomTvType : 'NONE',
                tvStatus: (editRoomHasTv
                  ? (tvChanged ? 'PENDING' : r.tvStatus === 'NA' ? 'PENDING' : r.tvStatus)
                  : 'NA') as CheckStatus,
                hasSmartlock: editRoomHasSmartlock,
                lockType: editRoomHasSmartlock ? editRoomLockType : 'KUNCI_BIASA',
                ttlockSupport: editRoomHasSmartlock ? editRoomTtlockSupport : undefined,
                ttlockTakeoverStatus: editRoomHasSmartlock && editRoomTtlockSupport === 'SUPPORT_TTLOCK' ? editRoomTtlockTakeover : undefined,
                lockStatus: (editRoomHasSmartlock
                  ? (lockChanged ? 'PENDING' : r.lockStatus === 'NA' ? 'PENDING' : r.lockStatus)
                  : 'NA') as CheckStatus,
              };
            }
            return r;
          }),
        };
      }
      return f;
    });

    onUpdateBuilding({
      ...currentBuilding,
      floors: updatedFloors,
    });

    setEditingRoom(null);
    setEditingRoomFloorId(null);
  };

  const handleDeleteRoomFromModal = () => {
    if (!editingRoomFloorId || !editingRoom) return;
    if (!window.confirm(`Hapus data Kamar ${editRoomNumber}?`)) return;

    handleRemoveRoom(editingRoomFloorId, editingRoom.id);
    setEditingRoom(null);
    setEditingRoomFloorId(null);
  };

  // Edit Facility Handlers
  const handleOpenEditFacility = (floorId: string, facility: FloorFacility) => {
    setEditingFacilityFloorId(floorId);
    setEditingFacility(facility);
    setEditFacilityName(facility.name);
    setEditFacilityType(facility.type);
    setEditFacHasTv(facility.hasTv);
    setEditFacHasLock(facility.hasLock);
    setEditFacLockType(facility.lockType || 'SMARTLOCK_HANDLE');
    setEditFacTtlockSupport(facility.ttlockSupport || 'SUPPORT_TTLOCK');
    setEditFacTtlockTakeover(facility.ttlockTakeoverStatus || 'SUDAH_TAKEOVER');
  };

  const handleSaveEditFacility = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFacilityFloorId || !editingFacility || !editFacilityName.trim()) return;

    const updatedFloors = currentBuilding.floors.map(f => {
      if (f.id === editingFacilityFloorId) {
        return {
          ...f,
          facilities: f.facilities.map(fac => {
            if (fac.id === editingFacility.id) {
              return {
                ...fac,
                name: editFacilityName.trim(),
                type: editFacilityType,
                hasTv: editFacHasTv,
                tvStatus: (editFacHasTv ? (fac.tvStatus === 'NA' ? 'PENDING' : fac.tvStatus) : 'NA') as CheckStatus,
                hasLock: editFacHasLock,
                lockType: editFacHasLock ? editFacLockType : 'NONE',
                ttlockSupport: editFacHasLock ? editFacTtlockSupport : undefined,
                ttlockTakeoverStatus: editFacHasLock && editFacTtlockSupport === 'SUPPORT_TTLOCK' ? editFacTtlockTakeover : undefined,
                lockStatus: (editFacHasLock ? (fac.lockStatus === 'NA' ? 'PENDING' : fac.lockStatus) : 'NA') as CheckStatus,
              };
            }
            return fac;
          }),
        };
      }
      return f;
    });

    onUpdateBuilding({
      ...currentBuilding,
      floors: updatedFloors,
    });

    setEditingFacility(null);
    setEditingFacilityFloorId(null);
  };

  const handleDeleteFacilityFromModal = () => {
    if (!editingFacilityFloorId || !editingFacility) return;
    if (!window.confirm(`Hapus fasilitas "${editFacilityName}"?`)) return;

    handleRemoveFacility(editingFacilityFloorId, editingFacility.id);
    setEditingFacility(null);
    setEditingFacilityFloorId(null);
  };

  // Remove room
  const handleRemoveRoom = (floorId: string, roomId: string) => {
    const updatedFloors = currentBuilding.floors.map(f => {
      if (f.id === floorId) {
        return {
          ...f,
          rooms: f.rooms.filter(r => r.id !== roomId),
        };
      }
      return f;
    });
    onUpdateBuilding({ ...currentBuilding, floors: updatedFloors });
  };

  // Remove facility
  const handleRemoveFacility = (floorId: string, facId: string) => {
    const updatedFloors = currentBuilding.floors.map(f => {
      if (f.id === floorId) {
        return {
          ...f,
          facilities: f.facilities.filter(fac => fac.id !== facId),
        };
      }
      return f;
    });
    onUpdateBuilding({ ...currentBuilding, floors: updatedFloors });
  };

  // Ensure internetConnections list is always valid
  const currentInternetList: InternetConnection[] = currentBuilding.internetConnections !== undefined
    ? currentBuilding.internetConnections
    : (currentBuilding.ispProvider && currentBuilding.ispProvider !== 'Belum dikonfigurasi')
    ? [
        {
          id: `net-init-1`,
          ispName: currentBuilding.ispProvider,
          role: 'PRIMARY',
          speedMbps: 150,
          customerNumber: 'CID-AUTO',
          ipPublic: 'Static IP',
          modemWanPort: 'MikroTik ether1-WAN1',
          status: 'AKTIF',
          notes: 'Jalur utama gedung',
        }
      ]
    : [];

  const totalSpeed = currentInternetList.reduce((acc, n) => acc + (n.status === 'AKTIF' ? n.speedMbps : 0), 0);

  const handleOpenAddInternet = () => {
    setEditingInternetId(null);
    setNetIspName('Biznet');
    setNetPackageName('Biznet Metronet Dedicated 2B');
    setNetRole(currentInternetList.length === 0 ? 'PRIMARY' : 'BACKUP');
    setNetSpeedMbps(150);
    setNetCustomerNumber('');
    setNetAccountHolder('PT Rukita Bhineka Nusantara');
    setNetIsBillingTakeover(true);
    setNetBillingTakeoverStatus('SUDAH_TAKEOVER');
    setNetBillingEmail('it.billing@rukita.co');
    setNetBillingTakeoverDate('19 Okt 2026');
    setNetIpPublic('');
    setNetModemWanPort(`MikroTik ether${currentInternetList.length + 1}-WAN${currentInternetList.length + 1}`);
    setNetNocContact('1500988');
    setNetMonthlyCost('');
    setNetStatus('AKTIF');
    setNetNotes('');
    setIsInternetModalOpen(true);
  };

  const handleOpenEditInternet = (net: InternetConnection) => {
    setEditingInternetId(net.id);
    setNetIspName(net.ispName);
    setNetPackageName(net.packageName || '');
    setNetRole(net.role);
    setNetSpeedMbps(net.speedMbps);
    setNetCustomerNumber(net.customerNumber || '');
    setNetAccountHolder(net.accountHolder || 'PT Rukita Bhineka Nusantara');
    setNetIsBillingTakeover(net.isBillingTakeover !== false);
    setNetBillingTakeoverStatus(net.billingTakeoverStatus || (net.isBillingTakeover !== false ? 'SUDAH_TAKEOVER' : 'BELUM_TAKEOVER'));
    setNetBillingEmail(net.billingEmail || 'it.billing@rukita.co');
    setNetBillingTakeoverDate(net.billingTakeoverDate || '');
    setNetIpPublic(net.ipPublic || '');
    setNetModemWanPort(net.modemWanPort || '');
    setNetNocContact(net.nocContact || '');
    setNetMonthlyCost(net.monthlyCost || '');
    setNetStatus(net.status);
    setNetNotes(net.notes || '');
    setIsInternetModalOpen(true);
  };

  const handleSaveInternet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!netIspName.trim()) return;

    let updatedList: InternetConnection[];

    if (editingInternetId) {
      updatedList = currentInternetList.map(net => {
        if (net.id === editingInternetId) {
          return {
            ...net,
            ispName: netIspName.trim(),
            packageName: netPackageName.trim(),
            role: netRole,
            speedMbps: Number(netSpeedMbps) || 100,
            customerNumber: netCustomerNumber.trim(),
            accountHolder: netAccountHolder.trim() || 'PT Rukita Bhineka Nusantara',
            isBillingTakeover: netIsBillingTakeover,
            billingTakeoverStatus: netIsBillingTakeover ? 'SUDAH_TAKEOVER' : 'BELUM_TAKEOVER',
            billingEmail: 'it.billing@rukita.co',
            billingTakeoverDate: netIsBillingTakeover ? (netBillingTakeoverDate || '19 Okt 2026') : undefined,
            ipPublic: netIpPublic.trim(),
            modemWanPort: netModemWanPort.trim(),
            nocContact: netNocContact.trim(),
            monthlyCost: netMonthlyCost.trim(),
            status: netStatus,
            notes: netNotes.trim(),
          };
        }
        if (netRole === 'PRIMARY' && net.role === 'PRIMARY') {
          return { ...net, role: 'BACKUP' as InternetRole };
        }
        return net;
      });
    } else {
      const newNet: InternetConnection = {
        id: `net-${Date.now()}`,
        ispName: netIspName.trim(),
        packageName: netPackageName.trim(),
        role: netRole,
        speedMbps: Number(netSpeedMbps) || 100,
        customerNumber: netCustomerNumber.trim() || `CID-${Math.floor(100000 + Math.random() * 900000)}`,
        accountHolder: netAccountHolder.trim() || 'PT Rukita Bhineka Nusantara',
        isBillingTakeover: netIsBillingTakeover,
        billingTakeoverStatus: netIsBillingTakeover ? 'SUDAH_TAKEOVER' : 'BELUM_TAKEOVER',
        billingEmail: 'it.billing@rukita.co',
        billingTakeoverDate: netIsBillingTakeover ? (netBillingTakeoverDate || '19 Okt 2026') : undefined,
        ipPublic: netIpPublic.trim(),
        modemWanPort: netModemWanPort.trim(),
        nocContact: netNocContact.trim(),
        monthlyCost: netMonthlyCost.trim(),
        status: netStatus,
        notes: netNotes.trim(),
      };

      if (netRole === 'PRIMARY') {
        updatedList = [
          newNet,
          ...currentInternetList.map(n => n.role === 'PRIMARY' ? { ...n, role: 'BACKUP' as InternetRole } : n)
        ];
      } else {
        updatedList = [...currentInternetList, newNet];
      }
    }

    const primaryNet = updatedList.find(n => n.role === 'PRIMARY') || updatedList[0];
    const otherNets = updatedList.filter(n => n.id !== primaryNet?.id);
    const summaryStr = primaryNet
      ? `${primaryNet.ispName} ${primaryNet.speedMbps} Mbps${otherNets.length > 0 ? ` + ${otherNets.map(o => `${o.ispName} ${o.speedMbps}M`).join(' + ')}` : ''}`
      : currentBuilding.ispProvider;

    onUpdateBuilding({
      ...currentBuilding,
      ispProvider: summaryStr,
      internetConnections: updatedList,
    });

    setIsInternetModalOpen(false);
  };

  const handleDeleteInternet = (id: string) => {
    if (!window.confirm('Yakin ingin menghapus jalur koneksi internet ini?')) {
      return;
    }
    const updatedList = currentInternetList.filter(n => n.id !== id);
    if (!updatedList.some(n => n.role === 'PRIMARY') && updatedList.length > 0) {
      updatedList[0].role = 'PRIMARY';
    }

    const primaryNet = updatedList.find(n => n.role === 'PRIMARY') || updatedList[0];
    const otherNets = updatedList.filter(n => n.id !== primaryNet?.id);
    const summaryStr = primaryNet
      ? `${primaryNet.ispName} ${primaryNet.speedMbps} Mbps${otherNets.length > 0 ? ` + ${otherNets.map(o => `${o.ispName} ${o.speedMbps}M`).join(' + ')}` : ''}`
      : 'Belum dikonfigurasi';

    onUpdateBuilding({
      ...currentBuilding,
      ispProvider: summaryStr,
      internetConnections: updatedList,
    });

    setIsInternetModalOpen(false);
  };

  const handleSetPrimary = (id: string) => {
    const updatedList = currentInternetList.map(n => ({
      ...n,
      role: (n.id === id ? 'PRIMARY' : n.role === 'PRIMARY' ? 'BACKUP' : n.role) as InternetRole,
    }));

    const primaryNet = updatedList.find(n => n.id === id);
    const otherNets = updatedList.filter(n => n.id !== id);
    const summaryStr = primaryNet
      ? `${primaryNet.ispName} ${primaryNet.speedMbps} Mbps${otherNets.length > 0 ? ` + ${otherNets.map(o => `${o.ispName} ${o.speedMbps}M`).join(' + ')}` : ''}`
      : currentBuilding.ispProvider;

    onUpdateBuilding({
      ...currentBuilding,
      ispProvider: summaryStr,
      internetConnections: updatedList,
    });
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalRooms = currentBuilding.floors.reduce((acc, f) => acc + f.rooms.length, 0);
  const totalFacilities = currentBuilding.floors.reduce((acc, f) => acc + f.facilities.length, 0);

  return (
    <div className="space-y-5">
      
      {/* Top Header: Property Info & Actions (Step 1: Gedung & Base Template) */}
      <div className="p-4 rounded-xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                1. Gedung & Master Base Template Properti
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Konfigurasi struktur lantai, spesifikasi kamar & fasilitas bersama, serta jalur koneksi internet ISP yang menempel di gedung ini
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {onOpenEvidenceExplorer && (
            <button
              onClick={onOpenEvidenceExplorer}
              className="px-3.5 py-2 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs active:scale-95"
              title={`Buka galeri berkas bukti foto & video QC untuk ${currentBuilding.name}`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Explorer Bukti QC</span>
            </button>
          )}

          {onOpenSearchBuilding && (
            <button
              onClick={onOpenSearchBuilding}
              className="px-3.5 py-2 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs active:scale-95"
              title="Cari properti (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Cari Properti</span>
            </button>
          )}

          <button
            onClick={onOpenNewBuilding}
            className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Properti</span>
          </button>

          {onRequestDeleteBuilding && (currentUser?.role === 'ADMIN' || currentUser?.role === 'BACKOFFICE') && (
            <button
              type="button"
              onClick={() => onRequestDeleteBuilding(currentBuilding)}
              className="px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs active:scale-95"
              title={`Hapus properti ${currentBuilding.name} (Khusus Role Admin / Backoffice)`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Properti</span>
            </button>
          )}
        </div>
      </div>

      {/* Building Info Summary Bar */}
      <div className="p-3.5 rounded-xl bg-muted/20 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-foreground">{currentBuilding.name}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-semibold">
              Properti Terpilih
            </span>
          </div>
          <span className="text-muted-foreground text-[11px] block mt-0.5">
            {currentBuilding.address} • ISP: {currentBuilding.ispProvider}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <span>{currentBuilding.floors.length} Lantai</span>
            <span>•</span>
            <span className="font-bold text-foreground">{totalRooms} Kamar Terdaftar</span>
            <span>•</span>
            <span>{totalFacilities} Fasilitas Bersama</span>
          </div>

          {onOpenEvidenceExplorer && (
            <button
              type="button"
              onClick={onOpenEvidenceExplorer}
              className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground font-semibold text-xs flex items-center gap-1.5 transition-colors active:scale-95 shadow-2xs shrink-0"
              title={`Buka Galeri Bukti Foto & Video QC untuk ${currentBuilding.name}`}
            >
              <Camera className="w-3.5 h-3.5 text-blue-500" />
              <span>Lihat Bukti QC</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION: Koneksi Internet & Multi-WAN (ISP) */}
      <div className="p-4 rounded-xl bg-card border border-border shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  Koneksi Internet & Provider (Multi-WAN / ISP)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                  {currentInternetList.length} Jalur Terpasang
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Kelola provider internet gedung coliving (bisa lebih dari 1 provider untuk Primary, Failover Backup, & Dedicated CCTV)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
              ⚡ Total: {totalSpeed} Mbps
            </span>
            <button
              onClick={handleOpenAddInternet}
              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tambah Jalur Internet</span>
            </button>
          </div>
        </div>

        {/* Grid of Internet Connections */}
        {currentInternetList.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-border bg-muted/15 text-center space-y-2.5">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">
                Belum Ada Jalur Internet Terdaftar
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 max-w-md mx-auto">
                Silakan input data koneksi internet ISP yang menempel di gedung ini (Biznet, IndiHome, Telkom, dsb.) beserta nomor CID pelanggan dan modem WAN.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddInternet}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Jalur Internet</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentInternetList.map((net) => {
            const isPrimary = net.role === 'PRIMARY';
            const isBackup = net.role === 'BACKUP';
            const isCctv = net.role === 'DEDICATED_CCTV';

            return (
              <div
                key={net.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                  isPrimary
                    ? 'border-blue-500/40 bg-blue-500/[0.03] shadow-xs'
                    : 'border-border bg-muted/20'
                }`}
              >
                <div>
                  {/* Top line: Role badge, Status badge & Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                          isPrimary
                            ? 'bg-blue-600 text-white'
                            : isBackup
                            ? 'bg-amber-600 text-white'
                            : isCctv
                            ? 'bg-purple-600 text-white'
                            : 'bg-zinc-700 text-white'
                        }`}
                      >
                        {isPrimary ? 'Jalur Utama (Primary)' : isBackup ? 'Jalur Cadangan (Failover)' : isCctv ? 'Khusus CCTV & IoT' : 'Operasional'}
                      </span>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-medium flex items-center gap-1 ${
                          net.status === 'AKTIF'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                            : net.status === 'TESTING'
                            ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30'
                            : net.status === 'PENDING_INSTALL'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${net.status === 'AKTIF' ? 'bg-emerald-500' : net.status === 'TESTING' ? 'bg-blue-500' : net.status === 'PENDING_INSTALL' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                        {net.status === 'AKTIF' ? 'Aktif' : net.status === 'TESTING' ? 'Testing' : net.status === 'PENDING_INSTALL' ? 'Pending' : 'Gangguan'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {!isPrimary && (
                        <button
                          onClick={() => handleSetPrimary(net.id)}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 border border-blue-500/30 transition-colors"
                          title="Jadikan Jalur Utama"
                        >
                          Set Primary
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEditInternet(net)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Edit jalur internet"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteInternet(net.id)}
                        className="p-1 rounded text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Hapus jalur internet"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* ISP Name, Package, & Bandwidth */}
                  <div className="flex items-start justify-between gap-2 mt-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-bold text-foreground">
                          {net.ispName}
                        </h4>
                        {net.packageName && (
                          <span className="text-[11px] font-medium text-muted-foreground px-1.5 py-0.2 rounded bg-muted border border-border">
                            {net.packageName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-base text-foreground flex items-center justify-end gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        {net.speedMbps} <span className="text-xs text-muted-foreground font-normal">Mbps</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono block">Bandwidth</span>
                    </div>
                  </div>

                  {/* Status Takeover Tagihan ke it.billing@rukita.co (Read-only, edit lewat tombol Edit) */}
                  <div className={`mt-2.5 p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    net.isBillingTakeover
                      ? 'bg-emerald-500/[0.06] border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                      : 'bg-amber-500/[0.08] border-amber-500/30 text-amber-800 dark:text-amber-300'
                  }`}>
                    <div className="flex items-start sm:items-center gap-2.5">
                      {net.isBillingTakeover ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5 sm:mt-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
                      )}
                      <div>
                        <span className="font-bold text-xs text-foreground block">
                          {net.isBillingTakeover ? 'Sudah Di-Take Over ke it.billing@rukita.co' : 'Belum Di-Take Over (Masih Nama Owner)'}
                        </span>
                        <span className="text-[10px] text-muted-foreground block font-mono mt-0.5">
                          Email Billing: <strong className="text-foreground">it.billing@rukita.co</strong> {net.billingTakeoverDate ? `• Sejak ${net.billingTakeoverDate}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 self-start sm:self-auto">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold font-mono border ${
                        net.isBillingTakeover
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300'
                      }`}>
                        {net.isBillingTakeover ? '✓ Terverifikasi' : '⚠️ Belum Takeover'}
                      </span>
                    </div>
                  </div>

                  {/* Technical Specs Grid (2 Clean Columns) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2.5 text-xs bg-background/60 p-2.5 rounded-lg border border-border/70">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">ID Pelanggan / CID:</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="font-mono font-medium text-foreground text-[11px] truncate">
                          {net.customerNumber || '-'}
                        </span>
                        {net.customerNumber && (
                          <button
                            onClick={() => handleCopyText(net.customerNumber, `cid-${net.id}`)}
                            className="text-muted-foreground hover:text-foreground p-0.5"
                            title="Salin No. Pelanggan"
                          >
                            {copiedId === `cid-${net.id}` ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-muted-foreground block">Biaya Langganan:</span>
                      <span className="font-mono text-foreground text-[11px] block mt-0.5 truncate">
                        {net.monthlyCost || 'Corporate Billing'}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Button for Details (Atas Nama & Catatan) */}
                  <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => toggleExpandNet(net.id)}
                      className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors py-0.5 group"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-500/80 group-hover:text-blue-500" />
                      <span className="underline-offset-2 hover:underline">
                        {expandedNetIds[net.id] ? 'Sembunyikan Detail' : 'Lihat Detail & Atas Nama'}
                      </span>
                      {expandedNetIds[net.id] ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Expanded Detail Box (Atas Nama, Email Billing, Catatan) */}
                  {expandedNetIds[net.id] && (
                    <div className="mt-2 p-2.5 rounded-lg bg-muted/40 border border-border/80 text-xs space-y-1.5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Atas Nama Kontrak:</span>
                        <span className="font-semibold text-foreground">{net.accountHolder || '-'}</span>
                      </div>
                      {net.billingEmail && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Email Billing:</span>
                          <span className="font-mono text-foreground">{net.billingEmail} {net.billingTakeoverDate ? `• Sejak ${net.billingTakeoverDate}` : ''}</span>
                        </div>
                      )}
                      {net.notes && (
                        <div className="pt-1.5 border-t border-border/60 text-[11px]">
                          <span className="text-muted-foreground block text-[10px] font-medium">Catatan Khusus:</span>
                          <p className="text-foreground italic mt-0.5">{net.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>



      {/* Floor by Floor Setup (Custom Rooms & Facilities) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Pengaturan Lantai & Fasilitas ({currentBuilding.floors.length} Lantai)
          </h3>
          <button
            onClick={handleAddFloor}
            className="px-2.5 py-1 rounded-md border border-border hover:bg-muted text-xs text-blue-500 font-semibold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            + Tambah Lantai Baru
          </button>
        </div>

        {currentBuilding.floors.map((floor) => (
          <div key={floor.id} className="p-4 rounded-xl border border-border bg-card space-y-3.5">
            
            {/* Floor Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-500" />
                <span className="font-bold text-sm text-foreground">{floor.name}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  ({floor.rooms.length} Kamar, {floor.facilities.length} Fasilitas)
                </span>
              </div>

              {/* Action buttons for this floor */}
              <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                {/* Quick Camera Snap Floor Plan */}
                <button
                  onClick={() => setCameraFloorTarget(floor)}
                  className="px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 transition-colors shadow-2xs active:scale-95"
                  title="Foto kertas blueprint/denah fisik lantai ini dengan kamera"
                >
                  <Camera className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Foto Denah</span>
                </button>

                {/* Touch & Draw Floor Plan Button */}
                <button
                  onClick={() => {
                    setInitialBlueprintForDrawing(undefined);
                    setDrawingFloor(floor);
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-colors border shadow-2xs active:scale-95 ${
                    floor.floorPlanSketch
                      ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border-indigo-500/30'
                  }`}
                  title="Buka Kanvas Gambar Denah Touch & Draw"
                >
                  <PenTool className="w-3 h-3" />
                  <span>{floor.floorPlanSketch ? 'Edit Denah (Tersedia)' : '📐 Gambar Denah (Touch & Draw)'}</span>
                </button>

                <button
                  onClick={() => {
                    setAddingFacilityFloorId(floor.id);
                    setNewFacilityName('Dapur Bersama');
                    setNewFacilityType('DAPUR');
                  }}
                  className="px-2.5 py-1 rounded text-[11px] font-semibold border border-blue-500/30 text-blue-700 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 flex items-center gap-1 active:scale-95"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Fasilitas<span className="hidden sm:inline"> (Parkir/Rooftop/Dapur)</span></span>
                </button>

                <button
                  onClick={() => {
                    setAddingRoomFloorId(floor.id);
                    setNewRoomNumber(`${floor.floorNumber}${floor.rooms.length + 1 < 10 ? '0' + (floor.rooms.length + 1) : floor.rooms.length + 1}`);
                  }}
                  className="px-2.5 py-1 rounded text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 active:scale-95"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Tambah Kamar</span>
                </button>
              </div>
            </div>

            {/* DENAH SKETSA LANTAI (TOUCH & DRAW PREVIEW) */}
            {floor.floorPlanSketch ? (
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.03] flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div 
                    onClick={() => {
                      setInitialBlueprintForDrawing(undefined);
                      setDrawingFloor(floor);
                    }}
                    className="w-24 h-16 rounded-lg border border-border bg-white overflow-hidden shadow-xs shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all relative group"
                    title="Klik untuk membuka & memperbesar studio gambar denah"
                  >
                    <img 
                      src={floor.floorPlanSketch} 
                      alt={`Denah ${floor.name}`} 
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">
                      <Eye className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-foreground flex items-center gap-1">
                        <span>📐 Denah Sketsa IT Ops {floor.name}</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-mono">
                        ✓ TERSEDIA
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Diupdate: {floor.floorPlanUpdatedAt || 'Tersimpan'}
                      {floor.floorPlanNotes && ` • Catatan: "${floor.floorPlanNotes}"`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                  <button
                    onClick={() => setCameraFloorTarget(floor)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 shadow-2xs"
                    title="Foto ulang denah fisik lantai ini dengan kamera"
                  >
                    <Camera className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Foto Ulang</span>
                  </button>
                  <button
                    onClick={() => {
                      setInitialBlueprintForDrawing(undefined);
                      setDrawingFloor(floor);
                    }}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-background border border-border hover:bg-muted text-foreground flex items-center gap-1 shadow-2xs"
                  >
                    <PenTool className="w-3 h-3 text-blue-500" />
                    <span>Buka Studio Gambar</span>
                  </button>
                  <button
                    onClick={() => handleDeleteFloorPlan(floor.id)}
                    className="p-1 rounded text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                    title="Hapus sketsa denah ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl border border-dashed border-border bg-muted/15 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <PenTool className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="text-[11px]">
                    Belum ada gambar denah untuk <strong>{floor.name}</strong>. Teknisi dapat memfoto denah fisik atau menggambar langsung denah kamar & menempatkan stempel AP Wi-Fi, CCTV, dan Smartlock.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setCameraFloorTarget(floor)}
                    className="px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shrink-0 shadow-2xs active:scale-95"
                    title="Foto gambar arsitektur fisik di lokasi menggunakan kamera"
                  >
                    <Camera className="w-3 h-3" />
                    <span>Foto Denah</span>
                  </button>
                  <button
                    onClick={() => {
                      setInitialBlueprintForDrawing(undefined);
                      setDrawingFloor(floor);
                    }}
                    className="px-2.5 py-1 rounded text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 shrink-0 shadow-2xs active:scale-95"
                  >
                    <PenTool className="w-3 h-3" />
                    <span>+ Gambar Denah</span>
                  </button>
                </div>
              </div>
            )}

            {/* 1. Fasilitas di Lantai Ini */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-blue-500 uppercase tracking-wider block">
                Fasilitas Bersama di {floor.name} ({floor.facilities.length}):
              </span>

              {floor.facilities.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {floor.facilities.map((fac) => (
                    <div
                      key={fac.id}
                      className="p-2.5 rounded-lg border border-border bg-muted/20 flex items-center justify-between gap-2 hover:border-border/80 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 rounded bg-background border border-border shrink-0">
                          {fac.type === 'PARKIRAN' && <Car className="w-3.5 h-3.5 text-emerald-500" />}
                          {fac.type === 'ROOFTOP' && <Sun className="w-3.5 h-3.5 text-amber-500" />}
                          {fac.type === 'DAPUR' && <Utensils className="w-3.5 h-3.5 text-orange-500" />}
                          {fac.type === 'PAGAR_GERBANG' && <Shield className="w-3.5 h-3.5 text-indigo-500" />}
                          {fac.type === 'COMMUNAL_LOUNGE' && <Tv className="w-3.5 h-3.5 text-purple-500" />}
                          {!['PARKIRAN', 'ROOFTOP', 'DAPUR', 'PAGAR_GERBANG', 'COMMUNAL_LOUNGE'].includes(fac.type) && (
                            <Building2 className="w-3.5 h-3.5 text-blue-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-foreground block truncate">{fac.name}</span>
                          {/* Hanya tampilkan highlight jika ada TV atau Akses Pintu (Wi-Fi tidak perlu ditampilkan) */}
                          {(fac.hasTv || fac.hasLock) && (
                            <div className="flex items-center gap-1.5 text-[10px] mt-1 flex-wrap">
                              {fac.hasTv && (
                                <span className="px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-medium">
                                  📺 Ada TV
                                </span>
                              )}
                              {fac.hasLock && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-medium">
                                  🔑 Akses Pintu
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tombol Edit di Luar (Bukan Delete) */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditFacility(floor.id, fac)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-background border border-transparent hover:border-border transition-colors shrink-0"
                        title="Edit fasilitas"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground italic">
                  Belum ada fasilitas bersama di lantai ini (misal Dapur, Balcony, atau Rooftop).
                </p>
              )}
            </div>

            {/* 2. Kamar di Lantai Ini */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Kamar Tidur di {floor.name} ({floor.rooms.length} Kamar):
              </span>

              {floor.rooms.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
                  {floor.rooms.map((room) => {
                    const hasHighlights = room.hasTv || room.hasSmartlock;
                    return (
                      <div
                        key={room.id}
                        className="p-2.5 rounded-lg border border-border bg-background flex flex-col justify-between gap-2 hover:border-border/80 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-foreground text-xs">
                            Kamar {room.number}
                          </span>
                          {/* Tombol Edit di Luar (Bukan Delete) */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditRoom(floor.id, room)}
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Edit data kamar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Hanya tampilkan badge jika ada TV atau ada Smartlock (Kunci biasa & Tanpa TV tidak ditampilkan) */}
                        {hasHighlights && (
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                            {room.hasTv && (
                              <span
                                className="px-1.5 py-0.5 rounded font-medium bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30"
                                title={room.tvType === 'CABLE_TV' ? 'TV Kabel' : 'Android / Google TV'}
                              >
                                📺 Ada TV
                              </span>
                            )}
                            {room.hasSmartlock && (
                              <span
                                className={`px-1.5 py-0.5 rounded font-medium border flex items-center gap-1 ${
                                  room.ttlockSupport === 'SUPPORT_TTLOCK'
                                    ? (room.ttlockTakeoverStatus === 'SUDAH_TAKEOVER'
                                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                        : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30')
                                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                }`}
                                title={
                                  room.ttlockSupport === 'SUPPORT_TTLOCK'
                                    ? (room.ttlockTakeoverStatus === 'SUDAH_TAKEOVER'
                                        ? 'Smartlock TTLock: Sudah Takeover ke Master Akun IT'
                                        : 'Smartlock TTLock: ⚠️ Belum Takeover dari Owner Lama')
                                    : (room.lockType === 'SMARTLOCK_GATE_ACCESS' ? 'Akses Pintu Digital (Non-TTLock)' : 'Smartlock Non-TTLock')
                                }
                              >
                                {room.ttlockSupport === 'SUPPORT_TTLOCK' ? (
                                  room.ttlockTakeoverStatus === 'SUDAH_TAKEOVER' ? '✓ TTLock Taken' : '⚠️ TTLock Blm Takeover'
                                ) : (
                                  '🔑 Smartlock'
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground italic">
                  Belum ada kamar di lantai ini. Klik tombol "+ Tambah Kamar" di atas.
                </p>
              )}
            </div>

          </div>
        ))}
      </div>

      {/* Modal Tambah Kamar di Lantai Tertentu */}
      {addingRoomFloorId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-xl bg-card border border-border shadow-lg p-5">
            <div className="flex items-center justify-between pb-2 border-b border-border mb-3">
              <h4 className="text-sm font-bold text-foreground">
                Tambah Kamar di Lantai
              </h4>
              <button
                type="button"
                onClick={() => setAddingRoomFloorId(null)}
                className="p-1 rounded text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1">Nomor Kamar</label>
                <input
                  type="text"
                  value={newRoomNumber}
                  onChange={(e) => setNewRoomNumber(e.target.value)}
                  placeholder="Contoh: 104 / 205"
                  className="w-full px-2.5 py-1.5 rounded border border-border bg-background text-xs font-mono font-bold outline-none focus:border-blue-500"
                  required
                  autoFocus
                />
              </div>

              {/* Ketersediaan TV */}
              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Ketersediaan TV</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRoomHasTv(true)}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      newRoomHasTv
                        ? 'bg-purple-500/15 border-purple-500/50 text-purple-700 dark:text-purple-400'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span>📺 Ada TV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRoomHasTv(false)}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      !newRoomHasTv
                        ? 'bg-muted border-border text-foreground font-bold'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span>🚫 Tanpa TV (N/A)</span>
                  </button>
                </div>
              </div>

              {/* Jenis Kunci */}
              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Jenis Kunci Pintu</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRoomHasSmartlock(true)}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      newRoomHasSmartlock
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-400'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span>🔑 Smartlock</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRoomHasSmartlock(false)}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      !newRoomHasSmartlock
                        ? 'bg-muted border-border text-foreground font-bold'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span>🗝️ Kunci Biasa</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddingRoomFloorId(null)}
                  className="px-3 py-1.5 rounded border border-border text-muted-foreground"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 text-white font-semibold"
                >
                  Simpan Kamar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Fasilitas di Lantai Tertentu (Dapur / Balcony / Rooftop / Lounge) */}
      {addingFacilityFloorId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-xl bg-card border border-border shadow-lg p-5">
            <div className="flex items-center justify-between pb-2 border-b border-border mb-3">
              <h4 className="text-sm font-bold text-foreground">
                Tambah Fasilitas Bersama di Lantai
              </h4>
              <button
                type="button"
                onClick={() => setAddingFacilityFloorId(null)}
                className="p-1 rounded text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFacility} className="space-y-3 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                  Preset Cepat Fasilitas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setNewFacilityType('PARKIRAN');
                      setNewFacilityName('Area Parkir Motor & Mobil');
                      setFacHasWifi(true);
                      setFacHasTv(false);
                      setFacHasLock(false);
                    }}
                    className={`px-2 py-1 rounded text-[11px] border flex items-center gap-1 transition-colors ${
                      newFacilityType === 'PARKIRAN'
                        ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                        : 'border-border bg-background hover:bg-muted text-foreground'
                    }`}
                  >
                    <Car className="w-3 h-3" /> Area Parkir
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewFacilityType('ROOFTOP');
                      setNewFacilityName('Rooftop Communal & Area Santai');
                      setFacHasWifi(true);
                      setFacHasTv(false);
                      setFacHasLock(true);
                    }}
                    className={`px-2 py-1 rounded text-[11px] border flex items-center gap-1 transition-colors ${
                      newFacilityType === 'ROOFTOP'
                        ? 'bg-amber-600 text-white border-amber-600 font-bold'
                        : 'border-border bg-background hover:bg-muted text-foreground'
                    }`}
                  >
                    <Sun className="w-3 h-3" /> Rooftop Communal
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewFacilityType('DAPUR');
                      setNewFacilityName('Dapur Bersama');
                      setFacHasWifi(true);
                      setFacHasTv(false);
                      setFacHasLock(false);
                    }}
                    className={`px-2 py-1 rounded text-[11px] border flex items-center gap-1 transition-colors ${
                      newFacilityType === 'DAPUR'
                        ? 'bg-blue-600 text-white border-blue-600 font-bold'
                        : 'border-border bg-background hover:bg-muted text-foreground'
                    }`}
                  >
                    <Utensils className="w-3 h-3" /> Dapur
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewFacilityType('COMMUNAL_LOUNGE');
                      setNewFacilityName('Communal Lounge');
                      setFacHasWifi(true);
                      setFacHasTv(true);
                      setFacHasLock(false);
                    }}
                    className={`px-2 py-1 rounded text-[11px] border flex items-center gap-1 transition-colors ${
                      newFacilityType === 'COMMUNAL_LOUNGE'
                        ? 'bg-purple-600 text-white border-purple-600 font-bold'
                        : 'border-border bg-background hover:bg-muted text-foreground'
                    }`}
                  >
                    <Tv className="w-3 h-3" /> Lounge
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewFacilityType('PAGAR_GERBANG');
                      setNewFacilityName('Pagar & Gerbang Utama');
                      setFacHasWifi(false);
                      setFacHasTv(false);
                      setFacHasLock(true);
                    }}
                    className={`px-2 py-1 rounded text-[11px] border flex items-center gap-1 transition-colors ${
                      newFacilityType === 'PAGAR_GERBANG'
                        ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                        : 'border-border bg-background hover:bg-muted text-foreground'
                    }`}
                  >
                    <Shield className="w-3 h-3" /> Gerbang Pagar
                  </button>
                </div>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1">Tipe Fasilitas</label>
                <select
                  value={newFacilityType}
                  onChange={(e) => {
                    const t = e.target.value as FacilityType;
                    setNewFacilityType(t);
                    if (t === 'DAPUR') setNewFacilityName('Dapur Bersama');
                    else if (t === 'BALCONY') setNewFacilityName('Balcony Santai');
                    else if (t === 'COMMUNAL_LOUNGE') { setNewFacilityName('Communal Lounge'); setFacHasTv(true); }
                    else if (t === 'ROOFTOP') { setNewFacilityName('Rooftop & Area Jemur'); setFacHasLock(true); }
                    else if (t === 'PAGAR_GERBANG') { setNewFacilityName('Pagar & Gerbang Utama'); setFacHasLock(true); }
                    else if (t === 'PARKIRAN') setNewFacilityName('Area Parkir');
                    else if (t === 'LAUNDRY') setNewFacilityName('Area Mesin Cuci');
                  }}
                  className="w-full px-2 py-1.5 rounded border border-border bg-background text-xs outline-none"
                >
                  <option value="DAPUR">Dapur Bersama</option>
                  <option value="BALCONY">Balcony</option>
                  <option value="COMMUNAL_LOUNGE">Communal Lounge / Ruang Tamu</option>
                  <option value="ROOFTOP">Rooftop</option>
                  <option value="PAGAR_GERBANG">Pagar & Gerbang Luar</option>
                  <option value="PARKIRAN">Area Parkir</option>
                  <option value="LAUNDRY">Laundry Bersama</option>
                  <option value="LAINNYA">Fasilitas Lainnya</option>
                </select>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1">Nama Fasilitas</label>
                <input
                  type="text"
                  value={newFacilityName}
                  onChange={(e) => setNewFacilityName(e.target.value)}
                  placeholder="Contoh: Dapur Bersama Lt 1 / Balcony Depan"
                  className="w-full px-2.5 py-1.5 rounded border border-border bg-background text-xs outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-muted-foreground block">Yang Perlu Diperiksa di Area Ini:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={facHasWifi}
                    onChange={(e) => setFacHasWifi(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Koneksi Wi-Fi Tenant</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={facHasTv}
                    onChange={(e) => setFacHasTv(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Smart / Android TV Bersama</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={facHasLock}
                    onChange={(e) => setFacHasLock(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Akses Pintu Smartlock / Magnetic PIN</span>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddingFacilityFloorId(null)}
                  className="px-3 py-1.5 rounded border border-border text-muted-foreground"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 text-white font-semibold"
                >
                  Simpan Fasilitas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Kamar (Dengan Tombol Delete di dalam pop-out) */}
      {editingRoom && editingRoomFloorId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-xl bg-card border border-border shadow-xl p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-border mb-3">
              <div className="flex items-center gap-2">
                <DoorClosed className="w-4 h-4 text-blue-500" />
                <h4 className="text-sm font-bold text-foreground">
                  Edit Data Kamar {editRoomNumber}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingRoom(null);
                  setEditingRoomFloorId(null);
                }}
                className="p-1 rounded text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRoom} className="space-y-3.5 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Nomor Kamar</label>
                <input
                  type="text"
                  value={editRoomNumber}
                  onChange={(e) => setEditRoomNumber(e.target.value)}
                  placeholder="Contoh: 101 / 205"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-mono font-bold outline-none focus:border-blue-500"
                  required
                  autoFocus
                />
              </div>

              {/* Ketersediaan TV */}
              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Ketersediaan TV</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditRoomHasTv(true)}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      editRoomHasTv
                        ? 'bg-purple-500/15 border-purple-500/50 text-purple-700 dark:text-purple-300 shadow-2xs'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span>📺 Ada TV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditRoomHasTv(false)}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      !editRoomHasTv
                        ? 'bg-muted border-border text-foreground font-bold shadow-2xs'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span>🚫 Tanpa TV (N/A)</span>
                  </button>
                </div>

                {editRoomHasTv && (
                  <div className="mt-2 p-2 rounded-lg bg-muted/40 border border-border">
                    <label className="text-[11px] text-muted-foreground block mb-1 font-medium">Tipe TV:</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditRoomTvType('ANDROID_GOOGLE_TV')}
                        className={`px-2 py-1 rounded text-[11px] border font-medium transition-colors ${
                          editRoomTvType === 'ANDROID_GOOGLE_TV'
                            ? 'bg-purple-600 text-white border-purple-600 font-bold'
                            : 'bg-background border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        Android / Google TV
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditRoomTvType('CABLE_TV')}
                        className={`px-2 py-1 rounded text-[11px] border font-medium transition-colors ${
                          editRoomTvType === 'CABLE_TV'
                            ? 'bg-purple-600 text-white border-purple-600 font-bold'
                            : 'bg-background border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        TV Kabel / STB
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Jenis Kunci */}
              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Akses Pintu & Kunci</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditRoomHasSmartlock(true)}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      editRoomHasSmartlock
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300 shadow-2xs'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span>🔑 Smartlock</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditRoomHasSmartlock(false)}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      !editRoomHasSmartlock
                        ? 'bg-muted border-border text-foreground font-bold shadow-2xs'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span>🗝️ Kunci Biasa</span>
                  </button>
                </div>

                {editRoomHasSmartlock && (
                  <div className="mt-2 p-2.5 rounded-lg bg-muted/40 border border-border space-y-2">
                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1 font-medium">Tipe Smartlock:</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditRoomLockType('SMARTLOCK_HANDLE')}
                          className={`px-2 py-1 rounded text-[11px] border font-medium transition-colors ${
                            editRoomLockType === 'SMARTLOCK_HANDLE'
                              ? 'bg-amber-600 text-white border-amber-600 font-bold'
                              : 'bg-background border-border text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          Smartlock Handle
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditRoomLockType('SMARTLOCK_GATE_ACCESS')}
                          className={`px-2 py-1 rounded text-[11px] border font-medium transition-colors ${
                            editRoomLockType === 'SMARTLOCK_GATE_ACCESS'
                              ? 'bg-amber-600 text-white border-amber-600 font-bold'
                              : 'bg-background border-border text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          Access Door RFID
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/60">
                      <label className="text-[11px] text-muted-foreground block mb-1 font-medium">Dukungan Platform TTLock:</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditRoomTtlockSupport('SUPPORT_TTLOCK')}
                          className={`px-2 py-1 rounded text-[11px] border font-medium transition-colors ${
                            editRoomTtlockSupport === 'SUPPORT_TTLOCK'
                              ? 'bg-rose-600 text-white border-rose-600 font-bold'
                              : 'bg-background border-border text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          ✓ Support TTLock
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditRoomTtlockSupport('NON_TTLOCK')}
                          className={`px-2 py-1 rounded text-[11px] border font-medium transition-colors ${
                            editRoomTtlockSupport === 'NON_TTLOCK'
                              ? 'bg-zinc-700 text-white border-zinc-700 font-bold'
                              : 'bg-background border-border text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          Non-TTLock
                        </button>
                      </div>
                    </div>

                    {editRoomTtlockSupport === 'SUPPORT_TTLOCK' && (
                      <div className="pt-2 border-t border-border/60">
                        <label className="text-[11px] text-muted-foreground block mb-1 font-medium">Status Takeover dari Owner Lama:</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditRoomTtlockTakeover('SUDAH_TAKEOVER')}
                            className={`px-2 py-1 rounded text-[11px] border font-medium transition-colors ${
                              editRoomTtlockTakeover === 'SUDAH_TAKEOVER'
                                ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                                : 'bg-background border-border text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            ✓ Sudah Takeover
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditRoomTtlockTakeover('BELUM_TAKEOVER')}
                            className={`px-2 py-1 rounded text-[11px] border font-medium transition-colors ${
                              editRoomTtlockTakeover === 'BELUM_TAKEOVER'
                                ? 'bg-rose-600 text-white border-rose-600 font-bold'
                                : 'bg-background border-border text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            ⚠️ Belum Takeover
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Actions Footer: Delete Button on left, Cancel & Save on right */}
              <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleDeleteRoomFromModal}
                  className="px-2.5 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold text-xs flex items-center gap-1.5 transition-colors active:scale-95"
                  title="Hapus kamar ini"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRoom(null);
                      setEditingRoomFloorId(null);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted text-xs transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs active:scale-95 transition-colors"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Fasilitas Bersama (Dengan Tombol Delete di dalam pop-out) */}
      {editingFacility && editingFacilityFloorId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-xl bg-card border border-border shadow-xl p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-border mb-3">
              <h4 className="text-sm font-bold text-foreground">
                Edit Fasilitas Bersama
              </h4>
              <button
                type="button"
                onClick={() => {
                  setEditingFacility(null);
                  setEditingFacilityFloorId(null);
                }}
                className="p-1 rounded text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditFacility} className="space-y-3.5 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Nama Fasilitas</label>
                <input
                  type="text"
                  value={editFacilityName}
                  onChange={(e) => setEditFacilityName(e.target.value)}
                  placeholder="Contoh: Dapur Bersama / Pagar Depan"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-medium outline-none focus:border-blue-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                  Tipe Fasilitas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditFacilityType('PARKIRAN')}
                    className={`px-2 py-1 rounded text-[11px] border flex items-center gap-1 transition-colors ${
                      editFacilityType === 'PARKIRAN'
                        ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                        : 'border-border bg-background hover:bg-muted text-foreground'
                    }`}
                  >
                    <Car className="w-3 h-3" /> Area Parkir
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditFacilityType('ROOFTOP')}
                    className={`px-2 py-1 rounded text-[11px] border flex items-center gap-1 transition-colors ${
                      editFacilityType === 'ROOFTOP'
                        ? 'bg-amber-600 text-white border-amber-600 font-bold'
                        : 'border-border bg-background hover:bg-muted text-foreground'
                    }`}
                  >
                    <Sun className="w-3 h-3" /> Rooftop
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditFacilityType('DAPUR')}
                    className={`px-2 py-1 rounded text-[11px] border flex items-center gap-1 transition-colors ${
                      editFacilityType === 'DAPUR'
                        ? 'bg-blue-600 text-white border-blue-600 font-bold'
                        : 'border-border bg-background hover:bg-muted text-foreground'
                    }`}
                  >
                    <Utensils className="w-3 h-3" /> Dapur
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditFacilityType('COMMUNAL_LOUNGE')}
                    className={`px-2 py-1 rounded text-[11px] border flex items-center gap-1 transition-colors ${
                      editFacilityType === 'COMMUNAL_LOUNGE'
                        ? 'bg-purple-600 text-white border-purple-600 font-bold'
                        : 'border-border bg-background hover:bg-muted text-foreground'
                    }`}
                  >
                    <Tv className="w-3 h-3" /> Lounge
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditFacilityType('PAGAR_GERBANG')}
                    className={`px-2 py-1 rounded text-[11px] border flex items-center gap-1 transition-colors ${
                      editFacilityType === 'PAGAR_GERBANG'
                        ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                        : 'border-border bg-background hover:bg-muted text-foreground'
                    }`}
                  >
                    <Shield className="w-3 h-3" /> Pagar & Gerbang
                  </button>
                </div>
              </div>

              {/* Fitur TV & Smartlock */}
              <div className="space-y-2 pt-1 border-t border-border">
                <div className="flex items-center justify-between p-2 rounded-lg bg-background border border-border">
                  <div className="flex items-center gap-2">
                    <Tv className="w-3.5 h-3.5 text-purple-500" />
                    <div>
                      <span className="font-semibold text-foreground block">Televisi (TV)</span>
                      <span className="text-[10px] text-muted-foreground">Smart TV / TV Kabel di fasilitas</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditFacHasTv(!editFacHasTv)}
                    className={`px-2.5 py-1 rounded font-semibold text-[11px] border transition-colors ${
                      editFacHasTv
                        ? 'bg-purple-600 text-white border-purple-600 font-bold'
                        : 'bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    {editFacHasTv ? '✓ Ada TV' : 'Tanpa TV'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-background border border-border">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    <div>
                      <span className="font-semibold text-foreground block">Akses Pintu / Smartlock</span>
                      <span className="text-[10px] text-muted-foreground">RFID Card Reader / PIN Gate</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditFacHasLock(!editFacHasLock)}
                    className={`px-2.5 py-1 rounded font-semibold text-[11px] border transition-colors ${
                      editFacHasLock
                        ? 'bg-amber-600 text-white border-amber-600 font-bold'
                        : 'bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    {editFacHasLock ? '✓ Akses Pintu' : 'Tanpa Kunci'}
                  </button>
                </div>

                {editFacHasLock && (
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border space-y-2">
                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1 font-medium">Dukungan Platform TTLock:</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditFacTtlockSupport('SUPPORT_TTLOCK')}
                          className={`px-2 py-1 rounded text-[11px] border font-medium transition-colors ${
                            editFacTtlockSupport === 'SUPPORT_TTLOCK'
                              ? 'bg-rose-600 text-white border-rose-600 font-bold'
                              : 'bg-background border-border text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          ✓ Support TTLock
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditFacTtlockSupport('NON_TTLOCK')}
                          className={`px-2 py-1 rounded text-[11px] border font-medium transition-colors ${
                            editFacTtlockSupport === 'NON_TTLOCK'
                              ? 'bg-zinc-700 text-white border-zinc-700 font-bold'
                              : 'bg-background border-border text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          Non-TTLock
                        </button>
                      </div>
                    </div>

                    {editFacTtlockSupport === 'SUPPORT_TTLOCK' && (
                      <div className="pt-2 border-t border-border/60">
                        <label className="text-[11px] text-muted-foreground block mb-1 font-medium">Status Takeover dari Owner Lama:</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditFacTtlockTakeover('SUDAH_TAKEOVER')}
                            className={`px-2 py-1 rounded text-[11px] border font-medium transition-colors ${
                              editFacTtlockTakeover === 'SUDAH_TAKEOVER'
                                ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                                : 'bg-background border-border text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            ✓ Sudah Takeover
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditFacTtlockTakeover('BELUM_TAKEOVER')}
                            className={`px-2 py-1 rounded text-[11px] border font-medium transition-colors ${
                              editFacTtlockTakeover === 'BELUM_TAKEOVER'
                                ? 'bg-rose-600 text-white border-rose-600 font-bold'
                                : 'bg-background border-border text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            ⚠️ Belum Takeover
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Actions Footer: Delete Button on left, Cancel & Save on right */}
              <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleDeleteFacilityFromModal}
                  className="px-2.5 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold text-xs flex items-center gap-1.5 transition-colors active:scale-95"
                  title="Hapus fasilitas ini"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFacility(null);
                      setEditingFacilityFloorId(null);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted text-xs transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs active:scale-95 transition-colors"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Jalur Internet (Multi-WAN) */}
      {isInternetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl bg-card border border-border shadow-xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2.5 border-b border-border mb-3.5">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <h4 className="text-sm font-bold text-foreground">
                  {editingInternetId ? 'Edit Jalur Internet (ISP)' : 'Tambah Jalur Internet Baru (Multi-WAN)'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsInternetModalOpen(false)}
                className="p-1 rounded text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveInternet} className="space-y-3.5 text-xs">
              {/* Presets Provider */}
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                  Preset Cepat Provider:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { isp: 'Biznet', pkg: 'Metronet Dedicated 2B', speed: 150, noc: '1500988' },
                    { isp: 'IndiHome', pkg: 'IndiHome Bisnis Pro 100M', speed: 100, noc: '147' },
                    { isp: 'MyRepublic', pkg: 'Business Pro 150M', speed: 150, noc: '1500818' },
                    { isp: 'Oxygen', pkg: 'Dedicated Highspeed 200M', speed: 200, noc: '021-30008888' },
                    { isp: 'CBN Fiber', pkg: 'Direct Fiber Dedicated 100M', speed: 100, noc: '1500780' },
                    { isp: 'Telkomsel Orbit', pkg: 'Orbit Pro 5G Unlimited', speed: 80, noc: '188' },
                  ].map((p) => (
                    <button
                      key={p.pkg}
                      type="button"
                      onClick={() => {
                        setNetIspName(p.isp);
                        setNetPackageName(p.pkg);
                        setNetSpeedMbps(p.speed);
                        setNetNocContact(p.noc);
                        setNetAccountHolder('PT Rukita Bhineka Nusantara');
                        setNetIsBillingTakeover(true);
                      }}
                      className={`px-2 py-1 rounded text-[11px] border transition-colors ${
                        netIspName === p.isp && netPackageName === p.pkg
                          ? 'bg-blue-600 text-white border-blue-600 font-bold'
                          : 'border-border bg-background hover:bg-muted text-foreground'
                      }`}
                    >
                      {p.isp} {p.speed}M
                    </button>
                  ))}
                </div>
              </div>

              {/* Nama ISP & Paket in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">
                    Nama ISP / Provider *
                  </label>
                  <input
                    type="text"
                    value={netIspName}
                    onChange={(e) => setNetIspName(e.target.value)}
                    placeholder="Contoh: Biznet / IndiHome / MyRepublic"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">
                    Paket Internet *
                  </label>
                  <input
                    type="text"
                    value={netPackageName}
                    onChange={(e) => setNetPackageName(e.target.value)}
                    placeholder="Contoh: Metronet Dedicated 2B / Bisnis Pro"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500 font-medium"
                    required
                  />
                </div>
              </div>

              {/* Role & Bandwidth in 2 columns */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Peruntukan Jalur</label>
                  <select
                    value={netRole}
                    onChange={(e) => setNetRole(e.target.value as InternetRole)}
                    className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="PRIMARY">Jalur Utama (Primary WAN)</option>
                    <option value="BACKUP">Jalur Cadangan (Failover)</option>
                    <option value="DEDICATED_CCTV">Khusus CCTV & Smartlock</option>
                    <option value="OPERASIONAL">Operasional Staff / Kantor</option>
                  </select>
                </div>

                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Bandwidth (Mbps) *</label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={netSpeedMbps}
                    onChange={(e) => setNetSpeedMbps(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              {/* ID Pelanggan & Atas Nama in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">ID Pelanggan / No. Internet / CID *</label>
                  <input
                    type="text"
                    value={netCustomerNumber}
                    onChange={(e) => setNetCustomerNumber(e.target.value)}
                    placeholder="Contoh: BIZ-TMG-8821 / 122938102938"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Atas Nama Tagihan *</label>
                  <input
                    type="text"
                    value={netAccountHolder}
                    onChange={(e) => setNetAccountHolder(e.target.value)}
                    placeholder="Contoh: PT Rukita Bhineka Nusantara / Nama Owner"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500 font-medium"
                    required
                  />
                  <div className="flex items-center gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setNetAccountHolder('PT Rukita Bhineka Nusantara');
                        setNetIsBillingTakeover(true);
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground"
                    >
                      PT Rukita
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNetAccountHolder('Nama Owner Properti');
                        setNetIsBillingTakeover(false);
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground"
                    >
                      Nama Owner
                    </button>
                  </div>
                </div>
              </div>

              {/* KOLOM CEK: Sudah Di-Take Over ke it.billing@rukita.co atau belum */}
              <div className={`p-3 rounded-xl border space-y-2 transition-all ${
                netIsBillingTakeover
                  ? 'bg-emerald-500/[0.06] border-emerald-500/30'
                  : 'bg-amber-500/[0.08] border-amber-500/30'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                    <Mail className="w-3.5 h-3.5 text-blue-500" />
                    Status Takeover Billing ke Corporate
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase font-mono ${
                    netIsBillingTakeover ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                  }`}>
                    {netIsBillingTakeover ? '✓ SUDAH TAKEOVER' : '⚠️ BELUM TAKEOVER'}
                  </span>
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={netIsBillingTakeover}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setNetIsBillingTakeover(checked);
                      setNetBillingTakeoverStatus(checked ? 'SUDAH_TAKEOVER' : 'BELUM_TAKEOVER');
                      if (checked && (!netAccountHolder || netAccountHolder.includes('Owner'))) {
                        setNetAccountHolder('PT Rukita Bhineka Nusantara');
                      }
                    }}
                    className="mt-0.5 w-4 h-4 rounded border-border text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-xs text-foreground block">
                      Sudah di-take over ke <strong className="text-blue-600 dark:text-blue-400">it.billing@rukita.co</strong>
                    </span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5 font-mono">
                      {netIsBillingTakeover 
                        ? 'Invoice dikirim otomatis ke it.billing@rukita.co atas nama PT Rukita Bhineka Nusantara'
                        : 'Tagihan masih ditagihkan ke pihak pemilik properti / rekening pribadi'}
                    </span>
                  </div>
                </label>
              </div>

              {/* Status */}
              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Status Koneksi Saat Ini</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(['AKTIF', 'TESTING', 'PENDING_INSTALL', 'GANGGUAN'] as InternetStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNetStatus(st)}
                      className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold text-center transition-colors ${
                        netStatus === st
                          ? st === 'AKTIF'
                            ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                            : st === 'TESTING'
                            ? 'bg-blue-600 text-white border-blue-600 font-bold'
                            : st === 'PENDING_INSTALL'
                            ? 'bg-amber-600 text-white border-amber-600 font-bold'
                            : 'bg-rose-600 text-white border-rose-600 font-bold'
                          : 'border-border bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {st === 'AKTIF' ? 'Aktif Normal' : st === 'TESTING' ? 'Testing/QC' : st === 'PENDING_INSTALL' ? 'Pending' : 'Gangguan'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Biaya Langganan Bulanan */}
              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Biaya Langganan Bulanan</label>
                <input
                  type="text"
                  value={netMonthlyCost}
                  onChange={(e) => setNetMonthlyCost(e.target.value)}
                  placeholder="Contoh: Rp 1.750.000 / bln"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Catatan Jalur</label>
                <input
                  type="text"
                  value={netNotes}
                  onChange={(e) => setNetNotes(e.target.value)}
                  placeholder="Contoh: Failover otomatis jika Biznet drop / Dedicated upload CCTV"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2.5 flex items-center justify-between gap-2 border-t border-border mt-3">
                {editingInternetId ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteInternet(editingInternetId)}
                    className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5 transition-colors active:scale-95 text-xs"
                    title="Hapus jalur internet ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Jalur</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsInternetModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted font-medium text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 text-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{editingInternetId ? 'Simpan Perubahan' : 'Tambah Jalur'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Live Camera Modal for Snapping Floor Blueprint from Property Management */}
      {cameraFloorTarget && (
        <LiveCameraModal
          isOpen={!!cameraFloorTarget}
          onClose={() => setCameraFloorTarget(null)}
          onCapture={(dataUrl) => {
            const target = cameraFloorTarget;
            setCameraFloorTarget(null);
            setInitialBlueprintForDrawing(dataUrl);
            setDrawingFloor(target);
          }}
          title={`Foto Denah Fisik: ${cameraFloorTarget.name}`}
          subtitle="Arahkan kamera ke kertas gambar arsitektur/denah fisik & klik tombol jepret"
        />
      )}

      {/* Modal Studio Touch & Draw Denah Lantai */}
      {drawingFloor && (
        <FloorPlanDrawingModal
          isOpen={!!drawingFloor}
          onClose={() => {
            setDrawingFloor(null);
            setInitialBlueprintForDrawing(undefined);
          }}
          building={currentBuilding}
          floor={drawingFloor}
          initialBlueprintDataUrl={initialBlueprintForDrawing}
          onSaveFloorPlan={handleSaveFloorPlan}
        />
      )}

    </div>
  );
};
