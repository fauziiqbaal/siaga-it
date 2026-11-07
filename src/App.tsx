import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Building, CCTVPoint, ColivingIssue, FloorFacility, ITDevice, RoomColiving, SimpleUser, AppModuleId, UserRole, migrateCheckStatus, migrateTvStreaming, migrateTvType } from './types/hotel';
import { APP_USERS, APP_MODULES, getDefaultPermissionsForRole, INITIAL_BUILDINGS, INITIAL_ISSUES } from './data/mockData';
import { AppNav } from './components/layout/AppNav';
import { BuildingSetupView } from './components/setup/BuildingSetupView';
import { OnboardingView } from './components/setup/OnboardingView';
import { PreOpeningView } from './components/preopening/PreOpeningView';
import { OpeningView } from './components/opening/OpeningView';
import { ScoreReportView } from './components/reports/ScoreReportView';
import { FieldEvaluationView } from './components/evaluation/FieldEvaluationView';
import { FloorDeviceInventory } from './components/devices/FloorDeviceInventory';
import { PropertyManagement } from './components/property/PropertyManagement';
import { CCTVChecklist } from './components/cctv/CCTVChecklist';
import { SimpleIssueTracker } from './components/issues/SimpleIssueTracker';
import { NewBuildingModal } from './components/building/NewBuildingModal';
import { BuildingSearchModal } from './components/building/BuildingSearchModal';
import { DeleteBuildingModal } from './components/building/DeleteBuildingModal';
import { SimpleAuthModal } from './components/auth/SimpleAuthModal';
import { EvidenceExplorerModal } from './components/common/EvidenceExplorerModal';
import { LiveReadinessReport } from './components/readiness/LiveReadinessReport';
import { OpeningCalendarView } from './components/calendar/OpeningCalendarView';
import { LiveDashboardView } from './components/dashboard/LiveDashboardView';
import { UserManagementView } from './components/users/UserManagementView';
import { getBuildingDueDateInfo } from './utils/dateUtils';
import { usePersistentState } from './hooks/usePersistentState';
import type { SaveStatus } from './hooks/usePersistentState';
import { useBackNavigation } from './hooks/useBackNavigation';
import { useServerSync } from './hooks/useServerSync';
import type { SyncSnapshot } from './lib/serverSync';
import { checkStorage, downloadJson, getStorageUsage, readJsonFile } from './lib/storage';
import { suggestPhase } from './utils/scoring';
import { MapPin, Wifi, Calendar } from 'lucide-react';


/**
 * Data QC lama dinormalisasi saat data tersimpan dimuat: status uji
 * (PASS/FAIL/NA → OK / Need Improvement / Rusak / Belum Tersedia) dan jenis TV
 * (Android/Google TV → Android TV, Cable TV → TV Digital).
 */
const migrateBuildingData = (list: Building[]): Building[] =>
  list.map((item) => ({
    ...item,
    floors: (item.floors || []).map((floor) => ({
      ...floor,
      rooms: floor.rooms.map((room) => ({
        ...room,
        wifiStatus: migrateCheckStatus(room.wifiStatus),
        tvStatus: migrateCheckStatus(room.tvStatus),
        lockStatus: migrateCheckStatus(room.lockStatus),
        tvType: migrateTvType(room.tvType),
        netflixSupport: migrateTvStreaming(room.netflixSupport),
      })),
      facilities: floor.facilities.map((facility) => ({
        ...facility,
        wifiStatus: migrateCheckStatus(facility.wifiStatus),
        tvStatus: migrateCheckStatus(facility.tvStatus),
        lockStatus: migrateCheckStatus(facility.lockStatus),
        tvType: migrateTvType(facility.tvType),
        netflixSupport: migrateTvStreaming(facility.netflixSupport),
      })),
    })),
    cctvPoints: (item.cctvPoints || []).map((point) => ({
      ...point,
      status: migrateCheckStatus(point.status),
    })),
  }));


const normalizeUsersList = (list: any[]): SimpleUser[] => {
  if (!Array.isArray(list) || list.length === 0) return APP_USERS;
  const hasAdmin = list.some((u: any) => u.username === 'admin');
  const fullList = hasAdmin ? list : [APP_USERS[0], ...list];

  return fullList.map((u: any, idx: number) => {
    if (u.username === 'admin') {
      return {
        ...u,
        id: 'u-admin',
        username: 'admin',
        name: u.name || 'Administrator IT',
        role: 'ADMIN' as UserRole,
        roleTitle: 'Super Administrator',
        pin: '4569',
        isActive: true,
        isBlocked: false,
        avatarColor: 'bg-indigo-600',
        permissions: APP_MODULES.map((m) => m.id),
        failedAttempts: 0,
        lockedUntil: null,
      };
    }
    const defaultUser = APP_USERS.find((au) => au.id === u.id || au.username === u.username);
    const fallbackUsername =
      defaultUser?.username ||
      (u.name ? u.name.toLowerCase().replace(/[^a-z0-9]+/g, '.') : `user.${idx + 1}`);
    const basePerms: AppModuleId[] =
      u.permissions || defaultUser?.permissions || getDefaultPermissionsForRole(u.role || 'TEKNISI');
    const updatedPerms: AppModuleId[] = !basePerms.includes('property') ? ['property', ...basePerms] : basePerms;
    return {
      ...u,
      permissions: updatedPerms,
      username: u.username || fallbackUsername,
      role: u.role === 'ADMIN' ? (u.username === 'admin' ? 'ADMIN' : 'BACKOFFICE') : (u.role || 'TEKNISI'),
      failedAttempts: typeof u.failedAttempts === 'number' ? u.failedAttempts : 0,
      lockedUntil: u.lockedUntil || null,
      isBlocked: Boolean(u.isBlocked),
    };
  });
};

export function App() {
  // ---- Persisted state ----
  // Kondisi awal = kosong. Tidak ada properti demo yang di-seed, jadi tidak ada
  // data "kembali sendiri" setelah refresh seperti versi sebelumnya.
  const buildingsStore = usePersistentState<Building[]>('buildings', INITIAL_BUILDINGS, {
    migrate: migrateBuildingData,
  });
  const issuesStore = usePersistentState<ColivingIssue[]>('issues', INITIAL_ISSUES);
  const buildings = buildingsStore.value;
  const issues = issuesStore.value;
  const setBuildings = buildingsStore.setValue;
  const setIssues = issuesStore.setValue;

  const activeBuildingStore = usePersistentState<string>('active_building', '');
  const activeBuildingId = activeBuildingStore.value;
  const setActiveBuildingId = activeBuildingStore.setValue;

  // Cek nyata apakah browser mengizinkan penyimpanan (bukan asumsi).
  const storageHealth = useMemo(() => checkStorage(), []);
  
  // Persistent Users List (Admin, Backoffice & Teknisi with checkboxes)
  const usersStore = usePersistentState<SimpleUser[]>('users', () => {
    try {
      const saved = localStorage.getItem('siaga_it_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return normalizeUsersList(parsed);
        }
      }
    } catch (e) {
      console.error('Error loading users from legacy storage:', e);
    }
    return APP_USERS;
  }, {
    migrate: normalizeUsersList,
  });
  const users = usersStore.value;
  const setUsers = usersStore.setValue;

  // Current Active User (null jika belum login / belum ada sesi aktif)
  const [currentUser, setCurrentUser] = useState<SimpleUser | null>(() => {
    try {
      const savedId = localStorage.getItem('siaga_it_current_user_id');
      if (savedId) {
        const found = users.find(u => u.id === savedId || u.username === savedId);
        if (found) {
          const perms: AppModuleId[] = !found.permissions.includes('property') ? ['property', ...found.permissions] : found.permissions;
          return { ...found, permissions: perms };
        }
      }
    } catch (e) {
      console.error('Error loading current user from localStorage:', e);
    }
    return null;
  });

  // Fallback user aman untuk komponen yang membutuhkan non-null SimpleUser
  const activeUser: SimpleUser = currentUser || users[0] || APP_USERS[0];

  // User Management & Sesi Handlers
  const handleSelectUser = (user: SimpleUser) => {
    setCurrentUser(user);
    setIsAuthOpen(false);
    try {
      localStorage.setItem('siaga_it_current_user_id', user.id);
    } catch (e) {
      console.error('Error saving active user id:', e);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('siaga_it_current_user_id');
    } catch (e) {
      console.error('Error clearing user session:', e);
    }
    setCurrentUser(null);
    setIsAuthOpen(true);
  };

  const handleAddUser = (newUser: SimpleUser) => {
    setUsers(prev => [newUser, ...prev]);
  };

  const handleUpdateUser = (updatedUser: SimpleUser) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser?.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  // Save users whenever modified
  useEffect(() => {
    try {
      localStorage.setItem('siaga_it_users', JSON.stringify(users));
    } catch (e) {
      console.error('Error saving users to localStorage:', e);
    }
  }, [users]);

  // Keep current user ID in localStorage
  useEffect(() => {
    try {
      if (currentUser?.id) {
        localStorage.setItem('siaga_it_current_user_id', currentUser.id);
      } else {
        localStorage.removeItem('siaga_it_current_user_id');
      }
    } catch (e) {
      console.error('Error saving current user id to localStorage:', e);
    }
  }, [currentUser]);

  // Tab aktif & tema juga dipersist supaya refresh tetap di halaman yang sama.
  const currentTabStore = usePersistentState<string>('active_tab', 'setup');
  const currentTab = currentTabStore.value;
  const setCurrentTab = currentTabStore.setValue;

  // Modals & Navigation Drawers
  const [isSearchBuildingOpen, setIsSearchBuildingOpen] = useState(false);
  const [isNewBuildingOpen, setIsNewBuildingOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isEvidenceExplorerOpen, setIsEvidenceExplorerOpen] = useState(false);
  const themeStore = usePersistentState<boolean>('theme_dark', true);
  const isDark = themeStore.value;
  const setIsDark = themeStore.setValue;

  // Catatan: tidak ada lagi seeding bukti/properti demo saat aplikasi dibuka.

  // Global shortcut (Ctrl+K or Cmd+K) to open building search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchBuildingOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync dark mode class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Gedung aktif. Kalau id tersimpan sudah tidak ada (mis. baru dihapus),
  // pakai gedung pertama; kalau belum ada gedung sama sekali -> undefined
  // (aplikasi menampilkan layar onboarding, bukan data contoh).
  const currentBuilding = buildings.find(b => b.id === activeBuildingId) ?? buildings[0];
  const buildingIssues = currentBuilding
    ? issues.filter(i => i.buildingId === currentBuilding.id || i.buildingId === 'current')
    : [];
  const openIssues = buildingIssues.filter(i => i.status === 'OPEN');

  const [buildingToDelete, setBuildingToDelete] = useState<Building | null>(null);

  // Jaga id gedung aktif tetap valid setelah tambah/hapus gedung.
  useEffect(() => {
    if (buildings.length === 0) {
      if (activeBuildingId !== '') setActiveBuildingId('');
      return;
    }
    if (!buildings.some((b) => b.id === activeBuildingId)) {
      setActiveBuildingId(buildings[0].id);
    }
  }, [buildings, activeBuildingId, setActiveBuildingId]);

  // Normalisasi sekali jalan: data seed lama belum punya `phase`.
  // Disimpan ke storage supaya label fase konsisten setelah refresh.
  const phaseMigratedRef = React.useRef(false);
  useEffect(() => {
    if (phaseMigratedRef.current) return;
    phaseMigratedRef.current = true;
    if (!buildings.some((b) => !b.phase)) return;
    setBuildings((prev) => prev.map((b) => (b.phase ? b : { ...b, phase: suggestPhase(b, issues) })));
  }, [buildings, issues, setBuildings]);

  // ---- Back button HP: jangan keluar situs, cukup kembali ke view sebelumnya ----
  useBackNavigation(
    { tab: currentTab, buildingId: currentBuilding?.id ?? '' },
    (snapshot) => {
      setCurrentTab(snapshot.tab || 'setup');
      if (snapshot.buildingId) setActiveBuildingId(snapshot.buildingId);
    },
  );

  // ---- Indikator simpan & backup data ----
  const saveStatus: SaveStatus =
    buildingsStore.status === 'error' || issuesStore.status === 'error' || usersStore.status === 'error'
      ? 'error'
      : buildingsStore.status === 'saving' || issuesStore.status === 'saving' || usersStore.status === 'saving'
        ? 'saving'
        : 'saved';
  const lastSavedAt = buildingsStore.lastSavedAt || issuesStore.lastSavedAt || usersStore.lastSavedAt;
  const saveError = buildingsStore.error || issuesStore.error || usersStore.error;
  const storageUsage = useMemo(() => getStorageUsage(), [buildings, issues]);

  // ---- Sinkron JSON antar perangkat (aktif hanya kalau `python serve.py` jalan) ----
  // Server mengirim gabungan per gedung; properti yang tidak berubah tidak ditimpa.
  const adoptServerSnapshot = useCallback(
    (snapshot: SyncSnapshot) => {
      setBuildings(migrateBuildingData(snapshot.buildings));
      setIssues(snapshot.issues ?? []);
      setActiveBuildingId((prev) =>
        prev && snapshot.buildings.some((b) => b.id === prev) ? prev : snapshot.buildings[0]?.id ?? '',
      );
    },
    [setActiveBuildingId, setBuildings, setIssues],
  );

  // Server menetapkan nomor revisi per gedung; simpan balik supaya refresh
  // berikutnya masih tahu revisi terakhir yang sudah tersinkron (dasar 409).
  const applyServerRevisions = useCallback(
    (patch: Record<string, { rev: number; updatedAt?: string }>) => {
      setBuildings((prev) => {
        let changed = false;
        const next = prev.map((building) => {
          const info = patch[building.id];
          if (!info) return building;
          if (building.rev === info.rev && building.updatedAt === info.updatedAt) return building;
          changed = true;
          return { ...building, rev: info.rev, updatedAt: info.updatedAt ?? building.updatedAt };
        });
        return changed ? next : prev;
      });
    },
    [setBuildings],
  );

  const serverSync = useServerSync({
    buildings,
    issues,
    onAdopt: adoptServerSnapshot,
    onAck: applyServerRevisions,
  });


  const handleNavigate = (tab: string) => {
    if (tab === 'evidence') {
      setIsEvidenceExplorerOpen(true);
      return;
    }
    setCurrentTab(tab);
  };

  const handleExportBackup = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadJson(`siaga-it-backup-${stamp}.json`, {
      app: 'siaga-it',
      version: 2,
      exportedAt: new Date().toISOString(),
      buildings,
      issues,
      users,
    });
  };

  const handleImportBackup = async (file: File) => {
    try {
      const payload = (await readJsonFile(file)) as {
        buildings?: Building[];
        issues?: ColivingIssue[];
        users?: SimpleUser[];
      };
      if (!payload?.buildings || !Array.isArray(payload.buildings) || payload.buildings.length === 0) {
        alert('File backup tidak dikenali (tidak ada data gedung).');
        return;
      }
      // Impor mengganti daftar lokal: jangan sampai dianggap "hapus properti lain".
      serverSync.resetBaseline();
      setBuildings(migrateBuildingData(payload.buildings));
      if (Array.isArray(payload.issues)) setIssues(payload.issues);
      if (Array.isArray(payload.users) && payload.users.length > 0) {
        setUsers(payload.users);
        try {
          localStorage.setItem('siaga_it_users', JSON.stringify(payload.users));
        } catch (persistError) {
          console.warn('[backup] user list tidak tersimpan', persistError);
        }
      }
      setActiveBuildingId(payload.buildings[0].id);
      setCurrentTab('setup');
      alert(`Backup dimuat: ${payload.buildings.length} gedung, ${payload.issues?.length || 0} kendala.`);
    } catch (error) {
      console.error('[backup] gagal impor', error);
      alert('Gagal membaca file backup. Pastikan file JSON hasil ekspor Siaga IT.');
    }
  };

  const handleResetData = () => {
    // Reset = hanya di perangkat ini; properti di server tidak ikut dihapus.
    serverSync.resetBaseline();
    buildingsStore.reset([]);
    issuesStore.reset([]);
    setActiveBuildingId('');
    setCurrentTab('setup');
  };

  // Add new building (functional update: aman walau ada perubahan lain bersamaan)
  const handleAddBuilding = (newBuilding: Building) => {
    setBuildings(prev => [{ ...newBuilding, phase: newBuilding.phase ?? 'SETUP' }, ...prev]);
    setActiveBuildingId(newBuilding.id);
    setCurrentTab('setup');
  };

  // Delete a building (boleh sampai kosong: user bebas menghapus properti lama)
  const handleDeleteBuilding = (buildingId: string) => {
    const target = buildings.find(b => b.id === buildingId);
    const remaining = buildings.filter(b => b.id !== buildingId);
    setBuildings(remaining);
    setActiveBuildingId(remaining[0]?.id ?? '');
    setIssues(prev => prev.filter(i => i.buildingId !== buildingId));
    setBuildingToDelete(null);
    alert(`Properti "${target?.name || 'Gedung'}" dihapus. Data kendala terkait juga dihapus.`);
  };

  // ---- Belum ada properti: onboarding, bukan data contoh ----
  if (!currentBuilding) {
    return (
      <>
        <OnboardingView
          onCreateBuilding={handleAddBuilding}
          onImportBackup={handleImportBackup}
          saveStatus={buildingsStore.status}
          storage={storageHealth}
        />
        <SimpleAuthModal
          isOpen={isAuthOpen || !currentUser}
          onClose={() => {
            if (currentUser) setIsAuthOpen(false);
          }}
          isMandatory={!currentUser}
          currentUser={currentUser}
          users={users}
          onSelectUser={handleSelectUser}
          onUpdateUser={handleUpdateUser}
          onLogout={handleLogout}
        />
      </>
    );
  }

  // Update building setup
  const handleUpdateBuilding = (updatedBuilding: Building) => {
    setBuildings(prev => prev.map(b => b.id === updatedBuilding.id ? updatedBuilding : b));
  };

  // Update room on a specific floor
  const handleUpdateRoom = (floorId: string, updatedRoom: RoomColiving) => {
    setBuildings(prev => prev.map(b => {
      if (b.id === currentBuilding.id) {
        return {
          ...b,
          floors: b.floors.map(f => {
            if (f.id === floorId) {
              return {
                ...f,
                rooms: f.rooms.map(r => r.id === updatedRoom.id ? updatedRoom : r),
              };
            }
            return f;
          }),
        };
      }
      return b;
    }));
  };

  // Update facility on a specific floor (dapur, balcony, rooftop, etc.)
  const handleUpdateFacility = (floorId: string, updatedFacility: FloorFacility) => {
    setBuildings(prev => prev.map(b => {
      if (b.id === currentBuilding.id) {
        return {
          ...b,
          floors: b.floors.map(f => {
            if (f.id === floorId) {
              return {
                ...f,
                facilities: f.facilities.map(fac => fac.id === updatedFacility.id ? updatedFacility : fac),
              };
            }
            return f;
          }),
        };
      }
      return b;
    }));
  };

  // Update CCTV point
  const handleUpdateCCTV = (updatedPoint: CCTVPoint) => {
    setBuildings(prev => prev.map(b => {
      if (b.id === currentBuilding.id) {
        return {
          ...b,
          cctvPoints: b.cctvPoints.map(p => p.id === updatedPoint.id ? updatedPoint : p),
        };
      }
      return b;
    }));
  };

  // Add CCTV point
  const handleAddCCTV = (newPoint: CCTVPoint) => {
    setBuildings(prev => prev.map(b => {
      if (b.id === currentBuilding.id) {
        return {
          ...b,
          cctvPoints: [...b.cctvPoints, newPoint],
        };
      }
      return b;
    }));
  };

  // Delete CCTV point
  const handleDeleteCCTV = (pointId: string) => {
    setBuildings(prev => prev.map(b => {
      if (b.id === currentBuilding.id) {
        return {
          ...b,
          cctvPoints: b.cctvPoints.filter(p => p.id !== pointId),
        };
      }
      return b;
    }));
  };

  // Update IT Device (IP, MAC, SN, User/Password, Status)
  const handleUpdateDevice = (updatedDevice: ITDevice) => {
    setBuildings(prev => prev.map(b => {
      if (b.id === currentBuilding.id) {
        return {
          ...b,
          devices: (b.devices || []).map(d => d.id === updatedDevice.id ? updatedDevice : d),
        };
      }
      return b;
    }));
  };

  // Add IT Device to building floor
  const handleAddDevice = (newDevice: ITDevice) => {
    setBuildings(prev => prev.map(b => {
      if (b.id === currentBuilding.id) {
        return {
          ...b,
          devices: [newDevice, ...(b.devices || [])],
        };
      }
      return b;
    }));
  };

  // Delete IT Device
  const handleDeleteDevice = (deviceId: string) => {
    setBuildings(prev => prev.map(b => {
      if (b.id === currentBuilding.id) {
        return {
          ...b,
          devices: (b.devices || []).filter(d => d.id !== deviceId),
        };
      }
      return b;
    }));
  };

  // Report issue from evaluation view (with photo evidence support)
  const handleReportIssue = (
    location: string, 
    category: 'INTERNET' | 'CCTV' | 'TV' | 'SMARTLOCK', 
    issueText: string, 
    photoUrl?: string,
    vendorNote?: string
  ) => {
    const newIssue: ColivingIssue = {
      id: `ISS-${Date.now().toString().slice(-4)}`,
      buildingId: currentBuilding.id,
      category,
      location,
      issue: issueText,
      vendorNote: vendorNote || (category === 'INTERNET' ? currentBuilding.ispProvider.split(' ')[0] : 'Teknisi Siaga IT'),
      status: 'OPEN',
      createdAt: 'Hari ini',
      photoUrl,
      photoTimestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };
    setIssues(prev => [newIssue, ...prev]);
  };

  // Resolve issue with resolution note & photo evidence
  const handleResolveIssue = (
    location: string, 
    category: 'INTERNET' | 'CCTV' | 'TV' | 'SMARTLOCK', 
    resolutionNote: string, 
    resolutionPhotoUrl?: string
  ) => {
    setIssues(prev => prev.map(iss => {
      if (iss.buildingId === currentBuilding.id && iss.location === location && iss.category === category && iss.status === 'OPEN') {
        return {
          ...iss,
          status: 'RESOLVED',
          resolutionNote,
          resolutionPhotoUrl,
          resolvedAt: 'Hari ini',
          resolvedBy: activeUser.name,
        };
      }
      return iss;
    }));
  };

  // Resolve issue with Re-QC evidence and proof data
  const handleResolveIssueWithProof = (
    issueId: string, 
    proofData: {
      resolutionNote: string;
      resolutionPhotoUrl?: string;
      resolutionTimestamp?: string;
      resolvedBy: string;
      recheckSpeedMbps?: number;
      recheckSignalDbm?: number;
      recheckNotes?: string;
    }
  ) => {
    const targetIssue = issues.find(i => i.id === issueId);
    if (!targetIssue) return;

    setIssues(prev => prev.map(iss => {
      if (iss.id === issueId) {
        return {
          ...iss,
          status: 'RESOLVED',
          resolutionNote: proofData.resolutionNote,
          resolutionPhotoUrl: proofData.resolutionPhotoUrl,
          resolutionTimestamp: proofData.resolutionTimestamp || new Date().toLocaleString('id-ID'),
          resolvedAt: 'Hari ini',
          resolvedBy: proofData.resolvedBy,
          recheckSpeedMbps: proofData.recheckSpeedMbps,
          recheckSignalDbm: proofData.recheckSignalDbm,
          recheckNotes: proofData.recheckNotes,
        };
      }
      return iss;
    }));

    // Auto-sync building QC state if linked to a room or CCTV point
    // 1. If CCTV:
    if (targetIssue.category === 'CCTV') {
      setBuildings(prev => prev.map(b => {
        if (b.id === targetIssue.buildingId && b.cctvPoints) {
          return {
            ...b,
            cctvPoints: b.cctvPoints.map(cp => {
              if (
                targetIssue.location.toLowerCase().includes(cp.locationName.toLowerCase()) || 
                cp.locationName.toLowerCase().includes(targetIssue.location.toLowerCase()) ||
                targetIssue.issue.toLowerCase().includes(cp.locationName.toLowerCase())
              ) {
                return {
                  ...cp,
                  status: 'OK',
                  isRecording: true,
                  notes: `Re-QC: ${proofData.resolutionNote}`,
                };
              }
              return cp;
            })
          };
        }
        return b;
      }));
    }

    // 2. If Room (e.g. "Kamar 204 (Lantai 2)"):
    const roomMatch = targetIssue.location.match(/Kamar\s*(\d+)/i);
    if (roomMatch) {
      const roomNum = roomMatch[1];
      setBuildings(prev => prev.map(b => {
        if (b.id === targetIssue.buildingId) {
          return {
            ...b,
            floors: b.floors.map(fl => ({
              ...fl,
              rooms: fl.rooms.map(rm => {
                if (rm.number === roomNum) {
                  if (targetIssue.category === 'INTERNET') {
                    return {
                      ...rm,
                      wifiStatus: 'OK',
                      // Hanya pakai angka hasil re-test yang benar-benar diisi;
                      // kalau kosong, nilai lama dipertahankan (jangan dikarang).
                      wifiSpeedMbps: proofData.recheckSpeedMbps ?? rm.wifiSpeedMbps,
                      wifiSignalDbm: proofData.recheckSignalDbm ?? rm.wifiSignalDbm,
                      wifiIssueText: undefined,
                    };
                  }
                  if (targetIssue.category === 'TV') {
                    return {
                      ...rm,
                      tvStatus: 'OK',
                      tvIssueText: undefined,
                    };
                  }
                  if (targetIssue.category === 'SMARTLOCK') {
                    return {
                      ...rm,
                      lockStatus: 'OK',
                      lockIssueText: undefined,
                    };
                  }
                }
                return rm;
              })
            }))
          };
        }
        return b;
      }));
    }
  };

  // Toggle issue status (Open <-> Resolved)
  const handleToggleIssueStatus = (issueId: string) => {
    setIssues(prev => prev.map(i => {
      if (i.id === issueId) {
        return {
          ...i,
          status: i.status === 'OPEN' ? 'RESOLVED' : 'OPEN',
        };
      }
      return i;
    }));
  };

  // Add issue manually
  const handleAddIssue = (newIssueData: Omit<ColivingIssue, 'id' | 'createdAt' | 'status'>) => {
    const newIssue: ColivingIssue = {
      ...newIssueData,
      id: `ISS-${Date.now().toString().slice(-4)}`,
      buildingId: currentBuilding.id,
      status: 'OPEN',
      createdAt: 'Hari ini',
    };
    setIssues(prev => [newIssue, ...prev]);
  };

  // Delete issue (CRUD lengkap: tambah, baca, ubah status, hapus)
  const handleDeleteIssue = (issueId: string) => {
    setIssues(prev => prev.filter(issue => issue.id !== issueId));
  };

  const isPropertyTab = ['property', 'devices', 'cctv', 'evaluation', 'issues', 'readiness'].includes(currentTab);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-150">

      {/* Shell navigasi baru: header tipis + tab fase, tanpa ikon dekoratif */}
      <AppNav
        tab={currentTab}
        onSelectTab={handleNavigate}
        building={currentBuilding}
        buildings={buildings}
        onSelectBuilding={setActiveBuildingId}
        onOpenNewBuilding={() => setIsNewBuildingOpen(true)}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        saveError={saveError}
        currentUser={currentUser}
        users={users}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        openIssuesCount={openIssues.length}
        storageUsage={storageUsage}
        sync={serverSync}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onResetData={handleResetData}
      />
      
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        
        
        {/* Main Content View */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-2.5 sm:py-4 pb-24 md:pb-8 space-y-3 sm:space-y-4 print:p-0 print:pb-0 print:m-0 print:max-w-none print:space-y-3">

          {/* Status penyimpanan: jangan pernah diam kalau data tidak akan bertahan */}
          {(!storageHealth.available || buildingsStore.status === 'error') && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] leading-snug text-rose-800 dark:text-rose-200 print:hidden">
              <p className="font-bold">Data belum aman tersimpan</p>
              <p className="mt-0.5">
                {storageHealth.reason ||
                  buildingsStore.error ||
                  'Browser menolak menyimpan data. Buka aplikasi lewat http://localhost (npm run dev / python serve.py), bukan dengan klik file HTML langsung.'}
              </p>
              <button
                type="button"
                onClick={handleExportBackup}
                className="mt-1.5 rounded-lg border border-rose-500/40 bg-background px-2.5 py-1 text-[10px] font-semibold text-foreground"
              >
                Ekspor backup JSON sekarang
              </button>
            </div>
          )}

          {/* Building Context Strip (ONLY shown when in Property Workspace tabs!) */}
          {isPropertyTab && (
            <div className="px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 text-xs print:hidden animate-in fade-in duration-100">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-foreground text-xs sm:text-sm">{currentBuilding.name}</span>
            <span className="text-muted-foreground hidden sm:inline">•</span>
            <span className="text-muted-foreground flex items-center gap-1 text-[11px] sm:text-xs truncate max-w-[240px] sm:max-w-none">
              <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
              <span className="truncate">{currentBuilding.address}</span>
            </span>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 text-[10px] sm:text-[11px] text-muted-foreground border-t sm:border-t-0 pt-1 sm:pt-0 border-border/50 flex-wrap">
            <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-mono">
              <Wifi className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[140px] sm:max-w-none">{currentBuilding.ispProvider}</span>
            </span>

            {/* Target Live Date */}
            <button
              onClick={() => setCurrentTab('calendar')}
              title="Buka Kalender Jadwal Live & QC"
              className="flex items-center gap-1 text-foreground hover:text-amber-500 font-medium shrink-0 transition-colors cursor-pointer group"
            >
              <Calendar className="w-3 h-3 text-amber-500 group-hover:scale-110 transition-transform shrink-0" />
              <span>Live: <strong>{currentBuilding.openingDate}</strong></span>
            </button>

            {/* Pre-Sale Date if available */}
            {currentBuilding.presaleDate && (
              <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-mono font-medium">
                Pre-Sale: <strong>{currentBuilding.presaleDate}</strong>
              </span>
            )}

            {/* Due Date IT (H-3 Pre-sale / H-3 Live) */}
            {(() => {
              const dueInfo = getBuildingDueDateInfo(currentBuilding);
              return (
                <span 
                  title={dueInfo.hasPresale ? 'Batas akhir IT: H-3 Pre-Sale' : 'Batas akhir IT: H-3 Live Date'}
                  className={`px-2 py-0.5 rounded-md font-mono font-bold flex items-center gap-1 cursor-help ${
                    dueInfo.isOverdue
                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                      : dueInfo.isDueSoon
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                      : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20'
                  }`}
                >
                  <span>Due IT: {dueInfo.itDueDateStr}</span>
                </span>
              );
            })()}
          </div>
        </div>
      )}

        {/* FASE 1 — SETUP GEDUNG (LANTAI, KAMAR, ISP & BILLING) */}
        {currentTab === 'setup' && (
          <BuildingSetupView key={currentBuilding.id}
            buildings={buildings}
            building={currentBuilding}
            issues={issues}
            onSelectBuilding={setActiveBuildingId}
            onUpdateBuilding={handleUpdateBuilding}
            onCreateBuilding={handleAddBuilding}
            onDeleteBuilding={(b) => setBuildingToDelete(b)}
            onGoTab={handleNavigate}
          />
        )}

        {/* FASE 2 — PRE-OPENING: ASET, UJI QC & KOREKSI */}
        {currentTab === 'preopening' && (
          <PreOpeningView key={currentBuilding.id}
            building={currentBuilding}
            issues={issues}
            currentUser={activeUser}
            onUpdateBuilding={handleUpdateBuilding}
            onAddIssue={handleAddIssue}
            onToggleIssueStatus={handleToggleIssueStatus}
            onDeleteIssue={handleDeleteIssue}
            onGoTab={handleNavigate}
          />
        )}

        {/* FASE 3 — OPENING: STANDARDISASI + TAKEOVER AKUN & BILLING */}
        {currentTab === 'opening' && (
          <OpeningView key={currentBuilding.id}
            building={currentBuilding}
            issues={issues}
            currentUser={activeUser}
            onUpdateBuilding={handleUpdateBuilding}
            onGoTab={handleNavigate}
          />
        )}

        {/* LAPORAN: PRE-OPENING SCORE & OPENING SCORE */}
        {currentTab === 'scores' && (
          <ScoreReportView
            key={currentBuilding.id}
            building={currentBuilding}
            issues={issues}
            onGoTab={handleNavigate}
            visitor={currentUser ? `${currentUser.name}${currentUser.roleTitle ? ` (${currentUser.roleTitle})` : ''}` : 'Teknisi IT'}
          />
        )}


        {/* DASHBOARD KESIAPAN LIVE & PIPELINE 30 HARI (SIKLUS TGL 1 & 15) */}
        {currentTab === 'dashboard' && (
          <LiveDashboardView
            buildings={buildings}
            issues={issues}
            currentUser={activeUser}
            onSelectBuilding={(b) => setActiveBuildingId(b.id)}
            onNavigateTab={(tab, buildingId) => {
              if (buildingId) setActiveBuildingId(buildingId);
              setCurrentTab(tab);
            }}
            onUpdateIssue={handleToggleIssueStatus}
          />
        )}

        {/* KALENDER JADWAL GO-LIVE & VISIT QC LAPANGAN */}
        {currentTab === 'calendar' && (
          <OpeningCalendarView
            buildings={buildings}
            currentBuilding={currentBuilding}
            onSelectBuilding={(b) => setActiveBuildingId(b.id)}
            onNavigateTab={(tab, buildingId) => {
              if (buildingId) setActiveBuildingId(buildingId);
              setCurrentTab(tab);
            }}
            onUpdateBuilding={handleUpdateBuilding}
          />
        )}

        {/* 1. GEDUNG & MASTER BASE TEMPLATE (LANTAI, KAMAR, FASILITAS, DATA INTERNET) */}
        {currentTab === 'property' && (
          <PropertyManagement
            buildings={buildings}
            currentBuilding={currentBuilding}
            currentUser={activeUser}
            onSelectBuilding={(b) => setActiveBuildingId(b.id)}
            onOpenNewBuilding={() => setIsNewBuildingOpen(true)}
            onUpdateBuilding={handleUpdateBuilding}
            onOpenSearchBuilding={() => setIsSearchBuildingOpen(true)}
            onOpenEvidenceExplorer={() => setIsEvidenceExplorerOpen(true)}
            onRequestDeleteBuilding={(b) => setBuildingToDelete(b)}
          />
        )}

        {/* 2. INVENTARIS PERANGKAT IT (ROUTER, SWITCH POE, AP, NVR, SMARTLOCK GATEWAY) */}
        {currentTab === 'devices' && (
          <FloorDeviceInventory
            building={currentBuilding}
            onUpdateDevice={handleUpdateDevice}
            onAddDevice={handleAddDevice}
            onDeleteDevice={handleDeleteDevice}
          />
        )}

        {/* 3. TITIK CCTV CHECKLIST & PEMETAAN SUDUT KAMERA */}
        {currentTab === 'cctv' && (
          <CCTVChecklist
            building={currentBuilding}
            cctvPoints={currentBuilding.cctvPoints}
            issues={buildingIssues}
            onUpdatePoint={handleUpdateCCTV}
            onAddPoint={handleAddCCTV}
            onDeletePoint={handleDeleteCCTV}
            onReportIssue={handleReportIssue}
            onNavigateTab={setCurrentTab}
          />
        )}

        {/* 4. PENILAIAN QC FIELD OPS (INSPEKSI WI-FI, TV, LOCK DENGAN TEMPLATE TERKUNCI) */}
        {currentTab === 'evaluation' && (
          <FieldEvaluationView
            building={currentBuilding}
            issues={issues}
            currentUser={activeUser}
            onUpdateRoom={handleUpdateRoom}
            onUpdateFacility={handleUpdateFacility}
            onReportIssue={handleReportIssue}
            onResolveIssue={handleResolveIssue}
            onOpenDevicesTab={() => setCurrentTab('devices')}
            onUpdateDevice={handleUpdateDevice}
            onOpenPropertyTab={() => setCurrentTab('property')}
            onOpenLiveTab={() => setCurrentTab('readiness')}
            onUpdateBuilding={handleUpdateBuilding}
          />
        )}

        {/* 5. CATATAN KENDALA IT & TRACKER ESKALASI VENDOR */}
        {currentTab === 'issues' && (
          <SimpleIssueTracker
            issues={buildingIssues}
            buildingName={currentBuilding.name}
            currentBuilding={currentBuilding}
            currentUser={activeUser}
            onToggleStatus={handleToggleIssueStatus}
            onResolveIssueWithProof={handleResolveIssueWithProof}
            onDeleteIssue={handleDeleteIssue}
            onAddIssue={handleAddIssue}
          />
        )}

        {/* 6. LAPORAN KESIAPAN LIVE & BERITA ACARA SERAH TERIMA (ROLE BACKOFFICE) */}
        {currentTab === 'readiness' && (
          <LiveReadinessReport
            building={currentBuilding}
            issues={issues}
            currentUser={activeUser}
            onNavigateTab={setCurrentTab}
            onOpenEvidenceExplorer={() => setIsEvidenceExplorerOpen(true)}
            onUpdateBuilding={handleUpdateBuilding}
          />
        )}

        {/* 6. MANAJEMEN PENGGUNA & HAK AKSES SISTEM (ADMIN & BACKOFFICE) */}
        {currentTab === 'user_management' && (
          <UserManagementView
            users={users}
            currentUser={activeUser}
            onSelectUser={handleSelectUser}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onNavigateTab={setCurrentTab}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

      </main>

      {/* Modal Cari & Ganti Building (Multi-Property Search) */}
      <BuildingSearchModal
        isOpen={isSearchBuildingOpen}
        onClose={() => setIsSearchBuildingOpen(false)}
        buildings={buildings}
        currentBuildingId={currentBuilding.id}
        currentUser={activeUser}
        onSelectBuilding={(b) => setActiveBuildingId(b.id)}
        onOpenNewBuilding={() => setIsNewBuildingOpen(true)}
        onRequestDeleteBuilding={(b) => setBuildingToDelete(b)}
      />

      {/* Modal Buat Building Baru (Siklus 15 Hari) */}
      <NewBuildingModal
        isOpen={isNewBuildingOpen}
        onClose={() => setIsNewBuildingOpen(false)}
        onAddBuilding={handleAddBuilding}
      />

      {/* Modal Konfirmasi Hapus Properti dengan Otorisasi PIN Backoffice */}
      <DeleteBuildingModal
        isOpen={!!buildingToDelete}
        onClose={() => setBuildingToDelete(null)}
        building={buildingToDelete}
        currentUser={activeUser}
        users={users}
        totalBuildingsCount={buildings.length}
        onConfirmDelete={handleDeleteBuilding}
      />

      {/* Modal Login & Teknisi */}
      <SimpleAuthModal
        isOpen={isAuthOpen || !currentUser}
        onClose={() => {
          if (currentUser) setIsAuthOpen(false);
        }}
        isMandatory={!currentUser}
        currentUser={currentUser}
        users={users}
        onSelectUser={handleSelectUser}
        onUpdateUser={handleUpdateUser}
        onLogout={handleLogout}
      />

      {/* Modal Explorer Bukti Foto & Video Siaga IT */}
      <EvidenceExplorerModal
        isOpen={isEvidenceExplorerOpen}
        onClose={() => setIsEvidenceExplorerOpen(false)}
        building={currentBuilding}
      />
        
      </div>
    </div>
  );
}

export default App;
