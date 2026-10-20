import React from 'react';
import { CheckSquare, Video, AlertCircle, Building2, Server, Award, Calendar, LayoutDashboard } from 'lucide-react';

interface MobileNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  openIssuesCount: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  onSelectTab,
  openIssuesCount,
}) => {
  const tabs = [
    { id: 'property', label: '1.Gedung', icon: Building2 },
    { id: 'devices', label: '2.Perangkat', icon: Server },
    { id: 'cctv', label: '3.CCTV', icon: Video },
    { id: 'evaluation', label: '4.QC Ops', icon: CheckSquare },
    { id: 'issues', label: '5.Kendala', icon: AlertCircle, badge: openIssuesCount },
    { id: 'readiness', label: '6.Laporan', icon: Award },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border px-1.5 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-lg print:hidden">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl text-xs transition-all active:scale-95 touch-manipulation min-h-[46px] ${
                active 
                  ? 'text-blue-500 font-bold bg-blue-500/10' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${active ? 'scale-110' : ''}`} />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${active ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
