import React, { useState, useEffect } from 'react';
import { Building, CCTVPoint, ColivingIssue, FloorFacility, ITDevice, RoomColiving, SimpleUser, AppModuleId, UserRole } from './types/hotel';
import { APP_USERS, APP_MODULES, getDefaultPermissionsForRole, INITIAL_BUILDINGS, INITIAL_ISSUES } from './data/mockData';
import { Header } from './components/layout/Header';
import { SidebarNav } from './components/layout/SidebarNav';
import { MobileNav } from './components/layout/MobileNav';
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
import { seedInitialDemoEvidence } from './utils/evidenceStorage';
import { getBuildingDueDateInfo } from './utils/dateUtils';
import { MapPin, Wifi, Calendar, Search } from 'lucide-react';

export function App() {
  const [buildings, setBuildings] = useState<Building[]>(INITIAL_BUILDINGS);
  const [activeBuildingId, setActiveBuildingId] = useState<string>(INITIAL_BUILDINGS[0].id);
  const [issues, setIssues] = useState<ColivingIssue[]>(INITIAL_ISSUES);
  
  // Persistent Users List (Admin, Backoffice & Teknisi with checkboxes)
  const [users, setUsers] = useState<SimpleUser[]>(() => {
    try {
      const saved = localStorage.getItem('siaga_it_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Check if admin is present
          const hasAdmin = parsed.some((u: any) => u.username === 'admin');
          const list = hasAdmin ? parsed : [APP_USERS[0], ...parsed];

          return list.map((u: any, idx: number) => {
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
                permissions: APP_MODULES.map(m => m.id),
                failedAttempts: 0,
                lockedUntil: null,
              };
            }
            const defaultUser = APP_USERS.find(au => au.id === u.id || au.username === u.username);
            const fallbackUsername = defaultUser?.username || (u.name ? u.name.toLowerCase().replace(/[^a-z0-9]+/g, '.') : `user.${idx + 1}`);
            const basePerms: AppModuleId[] = u.permissions || defaultUser?.permissions || getDefaultPermissionsForRole(u.role || 'TEKNISI');
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
        }
      }
    } catch (e) {
      console.error('Error loading users from localStorage:', e);
    }
    return APP_USERS;
  });

  // Current Active User (Default to master admin: pin 4569)
  const [currentUser, setCurrentUser] = useState<SimpleUser>(() => {
    const adminUser = users.find(u => u.username === 'admin') || APP_USERS[0];
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
    return adminUser;
  });

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
      }
    } catch (e) {
      console.error('Error saving current user id to localStorage:', e);
    }
  }, [currentUser]);

  // Tab: 'dashboard' | 'calendar' | 'property' | 'evaluation' | 'readiness' | 'devices' | 'cctv' | 'issues' | 'user_management'
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Modals & Navigation Drawers
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchBuildingOpen, setIsSearchBuildingOpen] = useState(false);
  const [isNewBuildingOpen, setIsNewBuildingOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isEvidenceExplorerOpen, setIsEvidenceExplorerOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Seed initial demo evidence into IndexedDB on first load
  useEffect(() => {
    seedInitialDemoEvidence(buildings);
  }, [buildings]);

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

  const currentBuilding = buildings.find(b => b.id === activeBuildingId) || buildings[0];
  const buildingIssues = issues.filter(i => i.buildingId === currentBuilding.id || i.buildingId === 'current');
  const openIssues = buildingIssues.filter(i => i.status === 'OPEN');

  const [buildingToDelete, setBuildingToDelete] = useState<Building | null>(null);

  // Add new building
  const handleAddBuilding = (newBuilding: Building) => {
    setBuildings([newBuilding, ...buildings]);
    setActiveBuildingId(newBuilding.id);
    setCurrentTab('property'); // Jump to property management to fine-tune rooms/facilities if needed
  };

  // Delete a building (Authorized with Backoffice PIN)
  const handleDeleteBuilding = (buildingId: string) => {
    const target = buildings.find(b => b.id === buildingId);
    const remaining = buildings.filter(b => b.id !== buildingId);
    if (remaining.length === 0) {
      alert('Tidak dapat menghapus properti ini. Sistem membutuhkan minimal 1 properti aktif.');
      return;
    }
    setBuildings(remaining);
    if (activeBuildingId === buildingId) {
      setActiveBuildingId(remaining[0].id);
    }
    setIssues(prev => prev.filter(i => i.buildingId !== buildingId));
    setBuildingToDelete(null);
    alert(`✅ Properti "${target?.name || 'Gedung'}" berhasil dihapus secara permanen dari sistem.`);
  };

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
          resolvedBy: currentUser.name,
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
                  status: 'PASS',
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
                      wifiStatus: 'PASS',
                      wifiSpeedMbps: proofData.recheckSpeedMbps || 75,
                      wifiSignalDbm: proofData.recheckSignalDbm || -55,
                      wifiIssueText: undefined,
                    };
                  }
                  if (targetIssue.category === 'TV') {
                    return {
                      ...rm,
                      tvStatus: 'PASS',
                      tvIssueText: undefined,
                    };
                  }
                  if (targetIssue.category === 'SMARTLOCK') {
                    return {
                      ...rm,
                      lockStatus: 'PASS',
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

  // User Management Handlers
  const handleSelectUser = (user: SimpleUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('siaga_it_current_user_id', user.id);
    } catch (e) {
      console.error('Error saving active user id:', e);
    }
  };

  const handleAddUser = (newUser: SimpleUser) => {
    setUsers(prev => [newUser, ...prev]);
  };

  const handleUpdateUser = (updatedUser: SimpleUser) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const isPropertyTab = ['property', 'devices', 'cctv', 'evaluation', 'issues', 'readiness'].includes(currentTab);

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans transition-colors duration-150">
      
      {/* Sidebar Navigation (Menu Slide di Sisi Kiri) */}
      <SidebarNav
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setIsSidebarOpen(false);
        }}
        buildings={buildings}
        currentBuilding={currentBuilding}
        onSelectBuilding={(b) => {
          setActiveBuildingId(b.id);
        }}
        onOpenSearchBuilding={() => setIsSearchBuildingOpen(true)}
        onOpenNewBuilding={() => setIsNewBuildingOpen(true)}
        onOpenEvidenceExplorer={() => setIsEvidenceExplorerOpen(true)}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        issuesCount={openIssues.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        
        {/* Top Header */}
        <Header
          onToggleSidebar={() => {
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
              setIsSidebarOpen(prev => !prev);
            } else {
              setIsSidebarCollapsed(prev => !prev);
            }
          }}
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          currentBuilding={currentBuilding}
          onOpenSearchBuilding={() => setIsSearchBuildingOpen(true)}
          onOpenEvidenceExplorer={() => setIsEvidenceExplorerOpen(true)}
          currentUser={currentUser}
          onOpenAuth={() => setIsAuthOpen(true)}
          isDark={isDark}
          onToggleTheme={() => setIsDark(!isDark)}
          issuesCount={openIssues.length}
        />

        {/* Main Content View */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-2.5 sm:py-4 pb-24 md:pb-8 space-y-3 sm:space-y-4 print:p-0 print:pb-0 print:m-0 print:max-w-none print:space-y-3">

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

        {/* DASHBOARD KESIAPAN LIVE & PIPELINE 30 HARI (SIKLUS TGL 1 & 15) */}
        {currentTab === 'dashboard' && (
          <LiveDashboardView
            buildings={buildings}
            issues={issues}
            currentUser={currentUser}
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
            currentUser={currentUser}
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
            currentUser={currentUser}
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
            currentUser={currentUser}
            onToggleStatus={handleToggleIssueStatus}
            onResolveIssueWithProof={handleResolveIssueWithProof}
            onAddIssue={handleAddIssue}
          />
        )}

        {/* 6. LAPORAN KESIAPAN LIVE & BERITA ACARA SERAH TERIMA (ROLE BACKOFFICE) */}
        {currentTab === 'readiness' && (
          <LiveReadinessReport
            building={currentBuilding}
            issues={issues}
            currentUser={currentUser}
            onNavigateTab={setCurrentTab}
            onOpenEvidenceExplorer={() => setIsEvidenceExplorerOpen(true)}
            onUpdateBuilding={handleUpdateBuilding}
          />
        )}

        {/* 6. MANAJEMEN PENGGUNA & HAK AKSES SISTEM (ADMIN & BACKOFFICE) */}
        {currentTab === 'user_management' && (
          <UserManagementView
            users={users}
            currentUser={currentUser}
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
        currentUser={currentUser}
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
        currentUser={currentUser}
        users={users}
        totalBuildingsCount={buildings.length}
        onConfirmDelete={handleDeleteBuilding}
      />

      {/* Modal Login & Teknisi */}
      <SimpleAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        users={users}
        onSelectUser={handleSelectUser}
        onUpdateUser={handleUpdateUser}
      />

      {/* Modal Explorer Bukti Foto & Video Siaga IT */}
      <EvidenceExplorerModal
        isOpen={isEvidenceExplorerOpen}
        onClose={() => setIsEvidenceExplorerOpen(false)}
        building={currentBuilding}
      />

        {/* Bottom Nav for Mobile Screen */}
        <MobileNav
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          openIssuesCount={openIssues.length}
        />

      </div>
    </div>
  );
}

export default App;
