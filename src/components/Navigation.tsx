import React from 'react';
import { 
  LayoutDashboard, 
  Boxes, 
  ShoppingCart, 
  Truck, 
  Store,
  BarChart3, 
  Users 
} from 'lucide-react';
import { ActiveTab } from '../types';

interface NavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  lowStockCount: number;
  pendingOrdersCount?: number;
  isMobileFrame?: boolean;
}

interface TabConfig {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  // Distinct colors with subtle blur
  activePod: string;
  inactivePod: string;
  activeIconColor: string;
  inactiveIconColor: string;
  activeLabel: string;
  hoverLabel: string;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  lowStockCount,
  pendingOrdersCount = 0,
  isMobileFrame = false,
}) => {
  const tabs: TabConfig[] = [
    { 
      id: 'dashboard', 
      label: 'الرئيسية', 
      icon: LayoutDashboard,
      activePod: 'bg-sky-500/25 dark:bg-sky-400/20 !border-sky-400/80 !shadow-[0_0_14px_rgba(14,165,233,0.45)] scale-105',
      inactivePod: 'bg-sky-500/10 dark:bg-sky-400/10 border-sky-400/25 group-hover:bg-sky-500/20 group-hover:border-sky-400/40',
      activeIconColor: 'text-sky-600 dark:text-sky-200 scale-110',
      inactiveIconColor: 'text-sky-500 dark:text-sky-400 group-hover:scale-110',
      activeLabel: 'text-sky-600 dark:text-sky-300 font-black',
      hoverLabel: 'group-hover:text-sky-400',
    },
    { 
      id: 'products', 
      label: 'المخزون', 
      icon: Boxes, 
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      activePod: 'bg-purple-500/25 dark:bg-purple-400/20 !border-purple-400/80 !shadow-[0_0_14px_rgba(168,85,247,0.45)] scale-105',
      inactivePod: 'bg-purple-500/10 dark:bg-purple-400/10 border-purple-400/25 group-hover:bg-purple-500/20 group-hover:border-purple-400/40',
      activeIconColor: 'text-purple-600 dark:text-purple-200 scale-110',
      inactiveIconColor: 'text-purple-500 dark:text-purple-400 group-hover:scale-110',
      activeLabel: 'text-purple-600 dark:text-purple-300 font-black',
      hoverLabel: 'group-hover:text-purple-400',
    },
    { 
      id: 'pos', 
      label: 'المبيعات', 
      icon: ShoppingCart,
      activePod: 'bg-emerald-500/25 dark:bg-emerald-400/20 !border-emerald-400/80 !shadow-[0_0_14px_rgba(16,185,129,0.45)] scale-105',
      inactivePod: 'bg-emerald-500/10 dark:bg-emerald-400/10 border-emerald-400/25 group-hover:bg-emerald-500/20 group-hover:border-emerald-400/40',
      activeIconColor: 'text-emerald-600 dark:text-emerald-200 scale-110',
      inactiveIconColor: 'text-emerald-500 dark:text-emerald-400 group-hover:scale-110',
      activeLabel: 'text-emerald-600 dark:text-emerald-300 font-black',
      hoverLabel: 'group-hover:text-emerald-400',
    },
    { 
      id: 'store', 
      label: 'المتجر', 
      icon: Store, 
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
      activePod: 'bg-rose-500/25 dark:bg-rose-400/20 !border-rose-400/80 !shadow-[0_0_14px_rgba(244,63,94,0.45)] scale-105',
      inactivePod: 'bg-rose-500/10 dark:bg-rose-400/10 border-rose-400/25 group-hover:bg-rose-500/20 group-hover:border-rose-400/40',
      activeIconColor: 'text-rose-600 dark:text-rose-200 scale-110',
      inactiveIconColor: 'text-rose-500 dark:text-rose-400 group-hover:scale-110',
      activeLabel: 'text-rose-600 dark:text-rose-300 font-black',
      hoverLabel: 'group-hover:text-rose-400',
    },
    { 
      id: 'purchases', 
      label: 'المشتريات', 
      icon: Truck,
      activePod: 'bg-blue-500/25 dark:bg-blue-400/20 !border-blue-400/80 !shadow-[0_0_14px_rgba(59,130,246,0.45)] scale-105',
      inactivePod: 'bg-blue-500/10 dark:bg-blue-400/10 border-blue-400/25 group-hover:bg-blue-500/20 group-hover:border-blue-400/40',
      activeIconColor: 'text-blue-600 dark:text-blue-200 scale-110',
      inactiveIconColor: 'text-blue-500 dark:text-blue-400 group-hover:scale-110',
      activeLabel: 'text-blue-600 dark:text-blue-300 font-black',
      hoverLabel: 'group-hover:text-blue-400',
    },
    { 
      id: 'reports', 
      label: 'التقارير', 
      icon: BarChart3,
      activePod: 'bg-amber-500/25 dark:bg-amber-400/20 !border-amber-400/80 !shadow-[0_0_14px_rgba(245,158,11,0.45)] scale-105',
      inactivePod: 'bg-amber-500/10 dark:bg-amber-400/10 border-amber-400/25 group-hover:bg-amber-500/20 group-hover:border-amber-400/40',
      activeIconColor: 'text-amber-600 dark:text-amber-200 scale-110',
      inactiveIconColor: 'text-amber-500 dark:text-amber-400 group-hover:scale-110',
      activeLabel: 'text-amber-600 dark:text-amber-300 font-black',
      hoverLabel: 'group-hover:text-amber-400',
    },
    { 
      id: 'partners', 
      label: 'الشركاء', 
      icon: Users,
      activePod: 'bg-teal-500/25 dark:bg-teal-400/20 !border-teal-400/80 !shadow-[0_0_14px_rgba(20,184,166,0.45)] scale-105',
      inactivePod: 'bg-teal-500/10 dark:bg-teal-400/10 border-teal-400/25 group-hover:bg-teal-500/20 group-hover:border-teal-400/40',
      activeIconColor: 'text-teal-600 dark:text-teal-200 scale-110',
      inactiveIconColor: 'text-teal-500 dark:text-teal-400 group-hover:scale-110',
      activeLabel: 'text-teal-600 dark:text-teal-300 font-black',
      hoverLabel: 'group-hover:text-teal-400',
    },
  ];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 dark:bg-black/90 backdrop-blur-2xl border-t border-purple-500/20 dark:border-white/10 text-slate-400 mx-auto shadow-2xl transition-all ${
      isMobileFrame ? 'max-w-md sm:rounded-b-[28px]' : 'max-w-4xl'
    }`}>
      <div className="flex items-center justify-around px-1 py-1.5 sm:py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'dashboard') {
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }
              }}
              className="relative flex flex-col items-center justify-center py-1 px-1 sm:px-1.5 rounded-2xl transition-all duration-200 flex-1 min-w-0 group cursor-pointer"
            >
              {/* Subtle Blur Frosted Glass Icon Pod with Distinct Harmonic Colors */}
              <div 
                style={{ backdropFilter: 'blur(3.5px)', WebkitBackdropFilter: 'blur(3.5px)' }}
                className={`relative w-9 h-8 sm:w-10 sm:h-8.5 rounded-xl border flex items-center justify-center transition-all duration-200 ${
                  isActive ? tab.activePod : tab.inactivePod
                }`}
              >
                <Icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-200 ${
                  isActive ? tab.activeIconColor : tab.inactiveIconColor
                }`} />
                {tab.badge !== undefined && (
                  <span 
                    className="keep-white absolute -top-1.5 -right-2 bg-gradient-to-r from-red-600 to-rose-600 text-white !text-white font-black text-[9px] min-w-[18px] h-4.5 px-1 rounded-full flex items-center justify-center shadow-md shadow-red-600/40 leading-none border border-white/50 dark:border-black animate-pulse select-none"
                    style={{ color: '#ffffff' }}
                    dir="ltr"
                  >
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[9.5px] sm:text-[10px] mt-1 truncate max-w-full tracking-tight transition-colors ${
                isActive 
                  ? tab.activeLabel 
                  : `text-slate-400 dark:text-slate-400 ${tab.hoverLabel} font-medium`
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
