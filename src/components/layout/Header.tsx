import React from 'react';
import { Building, SimpleUser } from '../../types/hotel';
import { 
  Building2, 
  Menu, 
  Sun, 
  Moon, 
  ChevronDown, 
  Server, 
  CheckSquare, 
  Video, 
  AlertCircle, 
  Search, 
  Camera, 
  Award, 
  Calendar, 
  LayoutDashboard,
  Layers,
  ChevronRight,
  ShieldCheck,
  PanelLeft
} from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentBuilding: Building;
  onOpenSearchBuilding: () => void;
  onOpenEvidenceExplorer?: () => void;
  currentUser: SimpleUser;
  onOpenAuth: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  issuesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  currentTab,
  onSelectTab,
  currentBuilding,
  onOpenSearchBuilding,
  onOpenEvidenceExplorer,
  currentUser,
  onOpenAuth,
  isDark,
  onToggleTheme,
  issuesCount,
}) => {
  const isPortfolioTab = ['dashboard', 'calendar', 'user_management'].includes(currentTab);
  const totalRooms = currentBuilding.floors.reduce((acc, f) => acc + f.rooms.length, 0);
  const totalDevices = currentBuilding.devices?.length || 0;
  const cctvCount = currentBuilding.cctvPoints?.length || 0;

  // Filter property workspace sub-tabs by user permissions (6-step lifecycle)
  const userPermissions = currentUser.permissions || [];
  const propertySubTabs = [
    { id: 'property', label: '1. Gedung & Template', icon: Building2 },
    { id: 'devices', label: `2. Perangkat (${totalDevices})`, icon: Server },
    { id: 'cctv', label: `3. CCTV (${cctvCount})`, icon: Video },
    { id: 'evaluation', label: '4. Penilaian QC', icon: CheckSquare },
    { id: 'issues', label: '5. Kendala', icon: AlertCircle, badge: issuesCount },
    { id: 'readiness', label: '6. Laporan', icon: Award },
  ];
  const visiblePropertySubTabs = propertySubTabs.filter(tab => userPermissions.includes(tab.id as any));

  return (
    <header className="sticky top-0 z-30 w-full bg-card/95 backdrop-blur-md border-b border-border shadow-2xs print:hidden">
      <div className="w-full px-3 sm:px-6">
        
        {/* Top Header Row */}
        <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
          
          {/* Left: Sidebar Toggle + Breadcrumb or Property Context */}
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Sidebar Toggle Hamburger */}
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-xl border border-border bg-background hover:bg-muted text-foreground transition-colors shrink-0 shadow-2xs"
              title="Buka / Tutup Menu Navigasi Samping"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Dynamic Context Breadcrumb */}
            {isPortfolioTab ? (
              // PORTFOLIO VIEW CONTEXT (DASHBOARD, CALENDAR, OR PROPERTY MASTER)
              <div className="flex items-center gap-1.5 text-xs truncate">
                <span className="font-semibold text-muted-foreground hidden sm:inline">
                  Portofolio Multi-Gedung
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 hidden sm:inline shrink-0" />
                <span className="font-bold text-foreground text-xs sm:text-sm truncate">
                  {currentTab === 'dashboard'
                    ? 'Dashboard Live (Pipeline 30 Hari)'
                    : currentTab === 'calendar'
                    ? 'Kalender Jadwal Live & Visit QC'
                    : currentTab === 'user_management'
                    ? 'Manajemen Pengguna & Hak Akses'
                    : 'Kelola Semua Properti & Tata Ruang'}
                </span>
              </div>
            ) : (
              // PROPERTY WORKSPACE CONTEXT (ACTIVE BUILDING SELECTOR)
              <div className="flex items-center gap-2 truncate">
                <button
                  onClick={onOpenSearchBuilding}
                  className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted text-foreground transition-all max-w-[200px] sm:max-w-xs md:max-w-sm group text-left shadow-2xs"
                  title="Ganti Properti Aktif (Ctrl+K)"
                >
                  <div className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>

                  <span className="font-bold text-xs sm:text-sm truncate block group-hover:text-blue-500 transition-colors">
                    {currentBuilding.name}
                  </span>

                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-background border border-border text-muted-foreground shrink-0 hidden md:inline">
                    {totalRooms} Kmr
                  </span>

                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 group-hover:text-foreground" />
                </button>
              </div>
            )}
          </div>

          {/* Right Line: Quick Property Search + Explorer + Theme + User Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Search Shortcut */}
            <button
              onClick={onOpenSearchBuilding}
              className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground text-xs transition-colors shadow-2xs"
              title="Cari properti (Shortcut Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-blue-500" />
              <span>Cari Properti</span>
              <kbd className="px-1.5 py-0.2 text-[10px] font-mono bg-muted border border-border rounded text-muted-foreground">
                Ctrl K
              </kbd>
            </button>

            {/* Dark / Light Toggle */}
            <button
              onClick={onToggleTheme}
              aria-label="Toggle Theme"
              className="p-2 rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-2xs"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* User Profile */}
            <button
              id="header-user-profile-button"
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-left transition-colors text-xs shadow-2xs"
            >
              <div className={`w-6 h-6 rounded-lg ${currentUser.avatarColor || (currentUser.role === 'ADMIN' ? 'bg-indigo-600' : currentUser.role === 'BACKOFFICE' ? 'bg-blue-600' : 'bg-emerald-600')} text-white font-bold flex items-center justify-center text-xs shadow-2xs`}>
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden md:flex items-center gap-1.5 min-w-0">
                <span className="font-semibold text-foreground truncate max-w-[110px]">
                  {currentUser.name}
                </span>
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                  currentUser.role === 'ADMIN'
                    ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                    : currentUser.role === 'BACKOFFICE' 
                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20' 
                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                }`}>
                  {currentUser.role}
                </span>
              </div>
            </button>
          </div>

        </div>

        {/* Bottom Line: Property Sub-Tabs (ONLY visible when in a Property-Specific Tab!) */}
        {!isPortfolioTab && (
          <div className="flex items-center gap-1 overflow-x-auto pb-2 pt-0.5 scrollbar-none text-xs border-t border-border/40">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1 hidden md:inline shrink-0">
              QC Gedung:
            </span>

            {visiblePropertySubTabs.map((tab) => {
              const Icon = tab.icon;
              const active = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
                    active
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      active ? 'bg-white text-blue-600' : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

      </div>
    </header>
  );
};
