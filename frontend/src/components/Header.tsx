import React from 'react';
import { Shield, Cpu, Network, FileText, Wifi, WifiOff, HelpCircle } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  apiConnected: boolean | null;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, apiConnected }) => {
  const navItems = [
    { id: 'subnet', label: 'Subnet Calc', icon: Cpu },
    { id: 'planners', label: 'VLSM / FLSM', icon: Network },
    { id: 'ipv6', label: 'IPv6 Engine', icon: Shield },
    { id: 'cisco', label: 'Cisco Gen', icon: FileText },
    { id: 'quiz', label: 'Subnet Quiz', icon: HelpCircle },
    { id: 'ai', label: 'AI Assistant', icon: Shield }
  ];

  return (
    <header className="w-full glass-panel border-b border-gray-800 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center glow-border">
          <Network className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white m-0 flex items-center gap-2">
            <span className="text-indigo-400 font-medium">NetCalc Pro</span>
          </h1>
          <p className="text-xs text-gray-400 text-left">Advanced Network Planning Suite</p>
        </div>
      </div>

      <nav className="flex flex-wrap items-center gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-2 text-xs">
        {apiConnected === null ? (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse"></span>
            Connecting...
          </span>
        ) : apiConnected ? (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 glow-text-emerald">
            <Wifi className="w-3 h-3" />
            API Connected
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/40 text-amber-400 border border-amber-500/20">
            <WifiOff className="w-3 h-3" />
            Offline Mode
          </span>
        )}
      </div>
    </header>
  );
};
