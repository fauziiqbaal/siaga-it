import React from 'react';
import { Building, SimpleUser } from '../../types/hotel';
import { 
  LayoutDashboard, 
  Calendar, 
  Building2, 
  CheckSquare, 
  Video, 
  Server, 
  AlertCircle, 
  Award, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  X, 
  Moon, 
  Sun, 
  Camera, 
  PanelLeftClose, 
  PanelLeftOpen, 
  ShieldCheck, 
  Plus, 
  MapPin, 
  Sparkles,
  Layers,
  ArrowRight,
  UserCog
} from 'lucide-react';
import { getBuildingDueDateInfo } from '../../utils/dateUtils';

interface SidebarNavProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentTab: string;
  onSelectTab: (tab: string) => void;
  buildings: Building[];
  currentBuilding: Building;
  onSelectBuilding: (building: Building) => void;
  onOpenSearchBuilding: () => void;
  onOpenNewBuilding: () => void;
  onOpenEvidenceExplorer?: () => void;
  currentUser: SimpleUser;
  onOpenAuth: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  issuesCount: number;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse,
  currentTab,
  onSelectTab,
  buildings,
  currentBuilding,
  onSelectBuilding,
  onOpenSearchBuilding,
  onOpenNewBuilding,
  onOpenEvidenceExplorer,
  currentUser,
  onOpenAuth,
  isDark,
  onToggleTheme,
  issuesCount,
}) => {
  const totalRooms = currentBuilding.floors.reduce((acc, f) => acc + f.rooms.length, 0);
  const totalDevices = currentBuilding.devices?.length || 0;
  const cctvCount = currentBuilding.cctvPoints?.length || 0;
  const dueInfo = getBuildingDueDateInfo(currentBuilding);

  // Group 1: Independent Portfolio Navigation (Cross-Property)
  const portfolioNavItems = [
    {
      id: 'dashboard',
      label: 'Dashboard Live (30 Hari)',
      shortLabel: 'Dashboard',
      icon: LayoutDashboard,
      desc: 'Pipeline kesiapan gedung tgl 1 & 15',
    },
    {
      id: 'calendar',
      label: 'Kalender Live & Visit',
      shortLabel: 'Kalender',
      icon: Calendar,
      desc: 'Jadwal visit QC & target live properti',
    },
    {
      id: 'user_management',
      label: 'Manajemen Pengguna',
      shortLabel: 'Pengguna',
      icon: UserCog,
      desc: 'Hak akses & peran Backoffice / Teknisi',
    },
  ];

  // Group 2: Property-Specific Workspace (Urutan Siklus Kunjungan Teknisi Lapangan)
  const propertyWorkspaceItems = [
    {
      id: 'property',
      label: '1. Gedung & Template',
      shortLabel: 'Gedung',
      icon: Building2,
      desc: 'Master data gedung, template kamar/fasilitas & ISP',
    },
    {
      id: 'devices',
      label: '2. Perangkat IT',
      shortLabel: 'Perangkat',
      icon: Server,
      countBadge: totalDevices,
      desc: 'AP, Switch PoE, Router, Smartlock Gateway',
    },
    {
      id: 'cctv',
      label: '3. Titik CCTV',
      shortLabel: 'CCTV',
      icon: Video,
      countBadge: cctvCount,
      desc: 'Retensi 30 hari NVR & sudut kamera',
    },
    {
      id: 'evaluation',
      label: '4. Penilaian QC',
      shortLabel: 'QC Ops',
      icon: CheckSquare,
      desc: 'Inspeksi murni (Template terkunci): Wi-Fi, TV, Lock',
    },
    {
      id: 'issues',
      label: '5. Catatan Kendala',
      shortLabel: 'Kendala',
      icon: AlertCircle,
      badgeCount: issuesCount,
      desc: 'Temuan defect & status eskalasi vendor',
    },
    {
      id: 'readiness',
      label: '6. Laporan Kesiapan',
      shortLabel: 'Laporan',
      icon: Award,
      desc: 'Berita acara resmi & print PDF (Role Backoffice)',
    },
  ];

  // Filter items by user's active permissions ("centang-centang")
  const userPermissions = currentUser.permissions || [];
  const visiblePortfolioNavItems = portfolioNavItems.filter(item => {
    if (item.id === 'user_management') {
      return currentUser.role === 'ADMIN' || (currentUser.role === 'BACKOFFICE' && userPermissions.includes('user_management'));
    }
    return userPermissions.includes(item.id as any);
  });

  const visiblePropertyWorkspaceItems = propertyWorkspaceItems.filter(item =>
    userPermissions.includes(item.id as any)
  );

  const isPropertyTab = ['property', 'evaluation', 'cctv', 'devices', 'issues', 'readiness'].includes(currentTab);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 bottom-0 left-0 z-40 bg-card border-r border-border h-screen flex flex-col transition-all duration-200 ease-in-out shadow-xl lg:shadow-none print:hidden shrink-0 ${
          // Mobile slide in/out
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          // Desktop collapsed vs expanded width
          isCollapsed ? 'lg:w-[72px]' : 'lg:w-72'
        } w-72`}
      >
        
        {/* ======================================================== */}
        {/* 1. APP BRAND HEADER                                      */}
        {/* ======================================================== */}
        {isCollapsed ? (
          <div className="h-14 sm:h-16 flex items-center justify-center border-b border-border shrink-0 px-2">
            <button
              onClick={onToggleCollapse}
              className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs transition-all hover:scale-105 group relative cursor-pointer"
              title="Perluas Menu Sidebar (Buka)"
            >
              <ShieldCheck className="w-5 h-5 group-hover:hidden transition-transform" />
              <PanelLeftOpen className="w-5 h-5 hidden group-hover:block transition-transform" />
              
              {/* Tooltip for collapsed mode */}
              <div className="absolute left-full ml-3 px-2.5 py-1 bg-zinc-900 text-white text-xs font-medium rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                Perluas Menu Sidebar
              </div>
            </button>
          </div>
        ) : (
          <div className="h-14 sm:h-16 px-3.5 border-b border-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>

              <div className="truncate">
                <div>
                  <h1 className="font-extrabold text-sm tracking-tight text-foreground">
                    SIAGA IT
                  </h1>
                  <p className="text-[10px] text-muted-foreground truncate">
                    Pre-Opening System
                  </p>
                </div>
              </div>
            </div>

            {/* Desktop Collapse Toggle / Mobile Close Button */}
            <div className="flex items-center gap-1">
              <button
                onClick={onToggleCollapse}
                className="hidden lg:flex p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Ciutkan Menu Sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>

              <button
                onClick={onClose}
                className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Tutup Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. SCROLLABLE SIDEBAR MENU ITEMS                         */}
        {/* ======================================================== */}
        <div className={`flex-1 overflow-y-auto py-3 space-y-4 scrollbar-thin ${isCollapsed ? 'px-2' : 'px-2.5'}`}>
          
          {/* SECTION A: INDEPENDENT PORTFOLIO MENUS (GLOBAL) */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-2 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <span>Menu Utama Portofolio</span>
              </div>
            )}

            {visiblePortfolioNavItems.map(item => {
              const Icon = item.icon;
              const active = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  title={isCollapsed ? item.label : item.desc}
                  className={`transition-all group relative cursor-pointer ${
                    isCollapsed
                      ? 'w-10 h-10 mx-auto flex items-center justify-center rounded-xl'
                      : 'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-left'
                  } ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-transform ${active ? 'scale-110 text-white' : 'text-blue-500 group-hover:scale-110'}`} />

                  {!isCollapsed && (
                    <div className="flex-1 truncate">
                      <span className="truncate block">{item.label}</span>
                    </div>
                  )}

                  {/* Tooltip for collapsed mode */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1 bg-zinc-900 text-white text-xs font-medium rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* SECTION B: ACTIVE PROPERTY CONTEXT CARD & SWITCHER */}
          <div className="pt-2 border-t border-border">
            {!isCollapsed ? (
              <div className="space-y-2">
                <div className="px-2 flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <span>Properti Aktif</span>
                  <button
                    onClick={onOpenSearchBuilding}
                    className="text-blue-500 hover:underline flex items-center gap-0.5 lowercase text-[10px] font-medium cursor-pointer"
                    title="Cari & ganti properti (Ctrl+K)"
                  >
                    <span>ganti</span>
                    <Search className="w-2.5 h-2.5" />
                  </button>
                </div>

                {/* Active Property Card */}
                <div 
                  onClick={onOpenSearchBuilding}
                  className="p-2.5 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer group space-y-1.5 text-left shadow-2xs"
                  title="Klik untuk memilih properti lain (Ctrl+K)"
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <div className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                        <Building2 className="w-3 h-3" />
                      </div>
                      <span className="font-bold text-xs text-foreground truncate group-hover:text-blue-500 transition-colors">
                        {currentBuilding.name}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 group-hover:text-foreground" />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                    <span>{totalRooms} Kamar</span>
                    <span className={dueInfo.isOverdue ? 'text-rose-500 font-bold' : 'text-foreground'}>
                      Due: {dueInfo.itDueDateStr}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              // Collapsed Property Icon Trigger
              <div className="flex justify-center">
                <button
                  onClick={onOpenSearchBuilding}
                  className="w-10 h-10 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 flex items-center justify-center transition-colors relative group cursor-pointer"
                  title={`Properti Aktif: ${currentBuilding.name} (Klik untuk ganti)`}
                >
                  <Building2 className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                  
                  <div className="absolute left-full ml-3 px-2.5 py-1 bg-zinc-900 text-white text-xs font-medium rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                    {currentBuilding.name} ({totalRooms} Kmr)
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* SECTION C: PROPERTY-SPECIFIC WORKSPACE TOOLS */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-2 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <span>Ruang Kerja QC Gedung</span>
              </div>
            )}

            {visiblePropertyWorkspaceItems.map(item => {
              const Icon = item.icon;
              const active = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  title={isCollapsed ? `${item.label}${item.badgeCount ? ` (${item.badgeCount} defect)` : ''}` : item.desc}
                  className={`transition-all group relative cursor-pointer ${
                    isCollapsed
                      ? 'w-10 h-10 mx-auto flex items-center justify-center rounded-xl'
                      : 'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-left'
                  } ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isPropertyTab
                      ? 'text-foreground hover:bg-muted/80'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-transform ${active ? 'scale-110 text-white' : 'text-muted-foreground group-hover:text-blue-500 group-hover:scale-110'}`} />

                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{item.label}</span>

                        {/* Unified Numeric Indicator (CCTV / Devices / Kendala) */}
                        {item.badgeCount !== undefined && item.badgeCount > 0 ? (
                          <span
                            className={`min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 transition-colors ${
                              active
                                ? 'bg-white text-rose-600 shadow-2xs'
                                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {item.badgeCount}
                          </span>
                        ) : item.countBadge !== undefined && item.countBadge > 0 ? (
                          <span
                            className={`min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-mono font-semibold shrink-0 transition-colors ${
                              active
                                ? 'bg-white/20 text-white'
                                : 'bg-muted/70 text-muted-foreground border border-border/60'
                            }`}
                          >
                            {item.countBadge}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {/* Defect Badge on Collapsed Mode */}
                  {isCollapsed && item.badgeCount !== undefined && item.badgeCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-card shadow-xs">
                      {item.badgeCount}
                    </span>
                  )}

                  {/* Tooltip for collapsed mode */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1 bg-zinc-900 text-white text-xs font-medium rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                      {item.label} {item.badgeCount ? `(${item.badgeCount} Defect)` : ''}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

        </div>

        {/* ======================================================== */}
        {/* 3. SIDEBAR FOOTER (USER, THEME, EVIDENCE EXPLORER)       */}
        {/* ======================================================== */}
        <div className={`border-t border-border bg-muted/20 shrink-0 ${
          isCollapsed ? 'p-2 flex flex-col items-center gap-2' : 'p-2.5 space-y-2'
        }`}>
          
          {isCollapsed ? (
            <>
              {/* User Avatar Account Button */}
              <button
                id="sidebar-user-profile-button"
                onClick={onOpenAuth}
                className="w-10 h-10 rounded-xl hover:bg-muted/70 flex items-center justify-center transition-colors relative group cursor-pointer"
                title={`Akun: ${currentUser.name} (${currentUser.role}) - Klik untuk ganti akun`}
              >
                <div className={`w-8 h-8 rounded-lg ${currentUser.avatarColor || (currentUser.role === 'ADMIN' ? 'bg-indigo-600' : currentUser.role === 'BACKOFFICE' ? 'bg-blue-600' : 'bg-emerald-600')} text-white font-bold text-xs flex items-center justify-center shadow-xs`}>
                  {currentUser.name.charAt(0)}
                </div>
                <div className="absolute left-full ml-3 px-2.5 py-1 bg-zinc-900 text-white text-xs font-medium rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                  {currentUser.name} ({currentUser.role})
                </div>
              </button>

              {/* Dark / Light Mode Switch */}
              <button
                onClick={onToggleTheme}
                className="w-10 h-10 rounded-xl border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors relative group shadow-2xs cursor-pointer"
                title={isDark ? 'Ganti ke Mode Terang (Light)' : 'Ganti ke Mode Gelap (Dark)'}
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700 dark:text-slate-300" />}
                <div className="absolute left-full ml-3 px-2.5 py-1 bg-zinc-900 text-white text-xs font-medium rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                  Mode {isDark ? 'Terang' : 'Gelap'}
                </div>
              </button>
            </>
          ) : (
            <>
              {/* Theme & User Account Row */}
              <div className="flex items-center justify-between gap-1.5 pt-0.5">
                
                {/* User Profile Info */}
                <button
                  id="sidebar-user-profile-button"
                  onClick={onOpenAuth}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-muted/60 text-left transition-colors flex-1 min-w-0 cursor-pointer"
                  title={`Akun: ${currentUser.name} (${currentUser.role}) - Klik untuk ganti akun`}
                >
                  <div className={`w-7 h-7 rounded-lg ${currentUser.avatarColor || (currentUser.role === 'ADMIN' ? 'bg-indigo-600' : currentUser.role === 'BACKOFFICE' ? 'bg-blue-600' : 'bg-emerald-600')} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs`}>
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1 truncate">
                    <span className="font-semibold text-xs text-foreground block truncate">
                      {currentUser.name}
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        currentUser.role === 'ADMIN'
                          ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                          : currentUser.role === 'BACKOFFICE' 
                          ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20' 
                          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {currentUser.role}
                      </span>
                      {currentUser.roleTitle && (
                        <span className="text-[10px] text-muted-foreground truncate">
                          • {currentUser.roleTitle}
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Dark / Light Mode Switch */}
                <button
                  onClick={onToggleTheme}
                  className="p-2 rounded-xl border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0 shadow-2xs cursor-pointer"
                  title={isDark ? 'Ganti ke Mode Terang (Light)' : 'Ganti ke Mode Gelap (Dark)'}
                >
                  {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />}
                </button>
              </div>
            </>
          )}

        </div>

      </aside>
    </>
  );
};
