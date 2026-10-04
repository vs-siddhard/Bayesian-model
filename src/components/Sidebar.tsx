import React from 'react';
import {
  LayoutDashboard,
  UserCheck,
  GitFork,
  Database,
  LineChart,
  FileText,
  Info,
  Activity,
  ShieldCheck,
} from 'lucide-react';

export type NavPage =
  | 'dashboard'
  | 'patient-analysis'
  | 'bayesian-network'
  | 'dataset-explorer'
  | 'model-evaluation'
  | 'reports'
  | 'about-project';

interface SidebarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const navItems: { id: NavPage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'patient-analysis', label: 'Patient Analysis', icon: UserCheck },
    { id: 'bayesian-network', label: 'Bayesian Network', icon: GitFork },
    { id: 'dataset-explorer', label: 'Dataset Explorer', icon: Database },
    { id: 'model-evaluation', label: 'Model Evaluation', icon: LineChart },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'about-project', label: 'About Project', icon: Info },
  ];

  return (
    <aside className="w-60 bg-[#090d16] border-r border-slate-800/60 flex flex-col shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-14 px-5 border-b border-slate-800/60 flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <Activity className="w-4 h-4" />
        </div>
        <div>
          <span className="text-xs font-bold tracking-tight text-slate-100 block">
            BayesMed AI
          </span>
          <span className="text-[10px] text-slate-400 font-mono block">Clinical Network</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all text-left ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
              {isActive && (
                <span className="ml-auto w-1 h-3.5 rounded-full bg-cyan-400"></span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Clean Academic Notice */}
      <div className="p-4 border-t border-slate-800/60">
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Educational Decision Support</span>
        </div>
      </div>
    </aside>
  );
};

