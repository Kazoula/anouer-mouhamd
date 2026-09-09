import React from 'react';
import { 
  Bell, 
  Smartphone, 
  Monitor, 
  Settings, 
  Package,
  Sun,
  Moon,
  Cloud,
  CloudCheck,
  RefreshCw,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Product, ThemeMode } from '../types';
import { soundEffects } from '../utils/soundEffects';

interface HeaderProps {
  products: Product[];
  onOpenAlerts: () => void;
  onOpenSettings: () => void;
  isMobileFrame: boolean;
  setIsMobileFrame: (val: boolean) => void;
  theme: ThemeMode;
  effectiveTheme: 'dark' | 'light';
  onToggleTheme: () => void;
  cloudSyncStatus?: 'synced' | 'syncing' | 'offline';
  onOpenCloudSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  products,
  onOpenAlerts,
  onOpenSettings,
  isMobileFrame,
  setIsMobileFrame,
  theme,
  effectiveTheme,
  onToggleTheme,
  cloudSyncStatus = 'synced',
  onOpenCloudSync,
}) => {
  const [soundOn, setSoundOn] = React.useState<boolean>(soundEffects.isEnabled());
  // Calculate low stock items count
  const lowStockCount = products.filter(p => p.stockPieces <= p.minStockAlert).length;

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white px-2.5 sm:px-4 py-2 sm:py-3 shadow-md w-full overflow-hidden">
      <div className="flex items-center justify-between max-w-4xl mx-auto w-full gap-1.5 sm:gap-2">
        {/* Brand & Logo - Flexes gracefully without pushing controls */}
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white shrink-0">
            <Package className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white truncate">مخزون فريدون</h1>
              <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                PRO
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate hidden min-[360px]:block max-w-[90px] sm:max-w-none">
                نظام سحابي
              </p>
              <button 
                id="header-cloud-sync-btn"
                type="button"
                onClick={onOpenCloudSync}
                className={`flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                  cloudSyncStatus === 'synced'
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50 hover:bg-emerald-900/60'
                    : cloudSyncStatus === 'syncing'
                    ? 'bg-amber-950/60 text-amber-300 border-amber-800/50 animate-pulse hover:bg-amber-900/60'
                    : 'bg-rose-950/60 text-rose-400 border-rose-800/50 hover:bg-rose-900/60'
                }`}
                title="اضغط هنا لإدارة المزامنة السحابية بين الهاتف والكمبيوتر"
              >
                <Cloud className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span>{cloudSyncStatus === 'synced' ? 'سحابي متزامن' : cloudSyncStatus === 'syncing' ? 'مزامنة...' : 'محلي'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Action Controls - Compact, shrink-proof, guaranteed inside screen borders */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Quick Sound Effects Toggle Button */}
          <button
            id="toggle-sound-btn"
            type="button"
            onClick={() => {
              const next = soundEffects.toggle();
              setSoundOn(next);
            }}
            className={`p-1.5 sm:p-2 rounded-xl border transition-all flex items-center justify-center active:scale-95 shrink-0 ${
              soundOn
                ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-750 text-slate-500 hover:text-slate-400 border-slate-700'
            }`}
            title={soundOn ? "المؤثرات الصوتية مفعّلة (انقر للكتم)" : "المؤثرات الصوتية مكتومة (انقر للتفعيل)"}
          >
            {soundOn ? (
              <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
            )}
          </button>

          {/* Quick Light / Dark Mode Toggle Button */}
          <button
            id="toggle-theme-mode-btn"
            type="button"
            onClick={onToggleTheme}
            className={`p-1.5 sm:p-2 rounded-xl border transition-all flex items-center justify-center shrink-0 ${
              effectiveTheme === 'dark'
                ? 'bg-slate-800 hover:bg-slate-750 text-amber-300 hover:text-amber-200 border-slate-700 shadow-sm'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-600 border-amber-200 shadow-sm'
            }`}
            title={effectiveTheme === 'dark' ? "التبديل إلى الوضع النهاري (Light Mode)" : "التبديل إلى الوضع الليلي (Dark Mode)"}
          >
            {effectiveTheme === 'dark' ? (
              <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 animate-in spin-in-180 duration-300" />
            ) : (
              <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 animate-in spin-in-180 duration-300" />
            )}
          </button>

          {/* Low Stock Alert Button */}
          <button
            id="low-stock-alert-btn"
            onClick={onOpenAlerts}
            className={`relative p-1.5 sm:p-2 rounded-xl transition-all flex items-center justify-center shrink-0 ${
              lowStockCount > 0
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
            }`}
            title="تنبيهات نقص المخزون"
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            {lowStockCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1 min-w-[17px] h-4 rounded-full bg-rose-600 text-white text-[9px] sm:text-[10px] font-black flex items-center justify-center shadow-md animate-pulse">
                {lowStockCount > 99 ? '99+' : lowStockCount}
              </span>
            )}
          </button>

          {/* Toggle Mobile Phone Mockup vs Full Canvas (for desktop testers) */}
          <button
            id="toggle-view-mode-btn"
            onClick={() => setIsMobileFrame(!isMobileFrame)}
            className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-all shrink-0"
            title={isMobileFrame ? "التبديل إلى العرض الكامل" : "التبديل إلى إطار الهاتف الذكي"}
          >
            {isMobileFrame ? (
              <>
                <Monitor className="w-4 h-4 text-teal-400" />
                <span>شاشة كاملة</span>
              </>
            ) : (
              <>
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>إطار هاتفي</span>
              </>
            )}
          </button>

          {/* Settings Menu Button - Clearly inside the frame bounds */}
          <button
            id="open-settings-btn"
            onClick={onOpenSettings}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-650 text-slate-200 hover:text-emerald-400 border border-slate-700 hover:border-emerald-500/40 transition-all shadow-sm active:scale-95 shrink-0"
            title="الإعدادات والبيانات"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-slate-200 hover:text-emerald-400" />
          </button>
        </div>
      </div>
    </header>
  );
};


