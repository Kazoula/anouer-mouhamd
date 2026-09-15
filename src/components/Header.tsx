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
  effectiveTheme,
  onToggleTheme,
  cloudSyncStatus = 'synced',
  onOpenCloudSync,
}) => {
  const [soundOn, setSoundOn] = React.useState<boolean>(soundEffects.isEnabled());
  // Calculate low stock items count
  const lowStockCount = products.filter(p => p.stockPieces <= p.minStockAlert).length;

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 dark:bg-black/90 backdrop-blur-2xl border-b border-purple-500/20 dark:border-white/10 text-white px-2.5 sm:px-4 py-2 sm:py-3 shadow-md w-full overflow-hidden">
      <div className="flex items-center justify-between max-w-4xl mx-auto w-full gap-1.5 sm:gap-2">
        {/* Brand & Logo - Crystal Mauve Prism */}
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-purple-700 via-violet-600 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-purple-900/30 border border-white/30 text-white shrink-0">
            <Package className="w-4 h-4 sm:w-5 sm:h-5 text-white drop-shadow-sm" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <h1 className="font-black text-sm sm:text-base tracking-tight text-white truncate">مخزون فريدون</h1>
              <span className="text-[9px] sm:text-[10px] font-black px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-400/35 shrink-0 shadow-sm">
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
                className={`flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-lg border shrink-0 transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                  cloudSyncStatus === 'synced'
                    ? 'bg-purple-950/40 text-purple-300 border-purple-800/40 hover:bg-purple-900/50'
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

        {/* Quick Action Controls - Coordinated Crystal Glass Buttons with Subtle Blur */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Quick Sound Effects Toggle Button - Emerald / Cyan Accent */}
          <button
            id="toggle-sound-btn"
            type="button"
            style={{ backdropFilter: 'blur(3.5px)', WebkitBackdropFilter: 'blur(3.5px)' }}
            onClick={() => {
              const next = soundEffects.toggle();
              setSoundOn(next);
            }}
            className={`p-1.5 sm:p-2 rounded-xl border transition-all flex items-center justify-center active:scale-95 shrink-0 cursor-pointer ${
              soundOn
                ? 'bg-emerald-500/15 dark:bg-emerald-400/15 border-emerald-400/40 text-emerald-600 dark:text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'bg-slate-500/10 border-slate-400/20 text-slate-400 hover:text-slate-200'
            }`}
            title={soundOn ? "المؤثرات الصوتية مفعّلة (انقر للكتم)" : "المؤثرات الصوتية مكتومة (انقر للتفعيل)"}
          >
            {soundOn ? (
              <Volume2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-600 dark:text-emerald-300" />
            ) : (
              <VolumeX className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-400" />
            )}
          </button>

          {/* Quick Light / Dark Mode Toggle Button - Amber Gold for Sun / Deep Violet for Moon */}
          <button
            id="toggle-theme-mode-btn"
            type="button"
            style={{ backdropFilter: 'blur(3.5px)', WebkitBackdropFilter: 'blur(3.5px)' }}
            onClick={onToggleTheme}
            className={`p-1.5 sm:p-2 rounded-xl border transition-all flex items-center justify-center shrink-0 cursor-pointer active:scale-95 ${
              effectiveTheme === 'dark'
                ? 'bg-amber-500/15 border-amber-400/35 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.25)] hover:bg-amber-500/25'
                : 'bg-purple-500/15 border-purple-400/40 text-purple-700 shadow-[0_0_10px_rgba(168,85,247,0.25)] hover:bg-purple-500/25'
            }`}
            title={effectiveTheme === 'dark' ? "التبديل إلى الوضع النهاري (Light Mode)" : "التبديل إلى الوضع الليلي (Dark Mode)"}
          >
            {effectiveTheme === 'dark' ? (
              <Sun className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-400 animate-in spin-in-180 duration-300 drop-shadow-sm" />
            ) : (
              <Moon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-purple-700 animate-in spin-in-180 duration-300 drop-shadow-sm" />
            )}
          </button>

          {/* Low Stock Alert Button - Professional Danger Red */}
          <button
            id="low-stock-alert-btn"
            onClick={onOpenAlerts}
            style={{ backdropFilter: 'blur(3.5px)', WebkitBackdropFilter: 'blur(3.5px)' }}
            className={`relative p-1.5 sm:p-2 rounded-xl border transition-all flex items-center justify-center shrink-0 cursor-pointer active:scale-95 ${
              lowStockCount > 0
                ? 'bg-red-500/15 dark:bg-red-500/20 border-red-500/50 text-red-600 dark:text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                : 'bg-red-500/10 border-red-400/20 text-red-400/70 hover:text-red-500 hover:bg-red-500/15'
            }`}
            title="تنبيهات نقص المخزون"
          >
            <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            {lowStockCount > 0 && (
              <span 
                className="keep-white absolute -top-1 -right-1 px-1.5 min-w-[18px] h-4.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white !text-white text-[9px] sm:text-[10px] font-black flex items-center justify-center shadow-md shadow-red-600/40 animate-pulse border border-white/50 dark:border-black select-none"
                style={{ color: '#ffffff' }}
                dir="ltr"
              >
                {lowStockCount > 99 ? '99+' : lowStockCount}
              </span>
            )}
          </button>

          {/* Toggle Mobile Phone Mockup vs Full Canvas - Sky Blue */}
          <button
            id="toggle-view-mode-btn"
            onClick={() => setIsMobileFrame(!isMobileFrame)}
            style={{ backdropFilter: 'blur(3.5px)', WebkitBackdropFilter: 'blur(3.5px)' }}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-sky-400/25 bg-sky-500/10 text-sky-600 dark:text-sky-300 hover:bg-sky-500/20 hover:border-sky-400/40 text-xs font-bold transition-all shrink-0 cursor-pointer active:scale-95"
            title={isMobileFrame ? "التبديل إلى العرض الكامل" : "التبديل إلى إطار الهاتف الذكي"}
          >
            {isMobileFrame ? (
              <>
                <Monitor className="w-4 h-4 text-sky-500 dark:text-sky-300" />
                <span>شاشة كاملة</span>
              </>
            ) : (
              <>
                <Smartphone className="w-4 h-4 text-sky-500 dark:text-sky-300" />
                <span>إطار هاتفي</span>
              </>
            )}
          </button>

          {/* Settings Menu Button - Mauve / Violet */}
          <button
            id="open-settings-btn"
            onClick={onOpenSettings}
            style={{ backdropFilter: 'blur(3.5px)', WebkitBackdropFilter: 'blur(3.5px)' }}
            className="p-1.5 sm:p-2 rounded-xl border border-purple-400/25 bg-purple-500/10 text-purple-600 dark:text-purple-300 hover:bg-purple-500/20 hover:border-purple-400/40 transition-all active:scale-95 shrink-0 cursor-pointer"
            title="الإعدادات والبيانات"
          >
            <Settings className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
