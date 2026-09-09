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

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  lowStockCount,
  pendingOrdersCount = 0,
  isMobileFrame = false,
}) => {
  const tabs = [
    { id: 'dashboard' as ActiveTab, label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'products' as ActiveTab, label: 'المخزون', icon: Boxes, badge: lowStockCount > 0 ? lowStockCount : undefined },
    { id: 'pos' as ActiveTab, label: 'المبيعات', icon: ShoppingCart },
    { id: 'store' as ActiveTab, label: 'المتجر', icon: Store, badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined },
    { id: 'purchases' as ActiveTab, label: 'المشتريات', icon: Truck },
    { id: 'reports' as ActiveTab, label: 'التقارير', icon: BarChart3 },
    { id: 'partners' as ActiveTab, label: 'الشركاء', icon: Users },
  ];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/90 text-slate-400 mx-auto shadow-2xl transition-all ${
      isMobileFrame ? 'max-w-md sm:rounded-b-[28px]' : 'max-w-4xl'
    }`}>
      <div className="flex items-center justify-around px-1.5 py-1.5 sm:py-2">
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
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 sm:px-2 rounded-2xl transition-all duration-200 flex-1 min-w-0 ${
                isActive
                  ? 'text-emerald-400 font-extrabold bg-emerald-500/10 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 text-emerald-400' : ''}`} />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 bg-amber-500 text-slate-950 font-black text-[9px] min-w-[18px] h-4 px-1 rounded-full flex items-center justify-center shadow-md leading-none border border-slate-900">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] sm:text-[10.5px] mt-1 truncate max-w-full tracking-tight font-medium ${isActive ? 'text-emerald-400 font-bold' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
