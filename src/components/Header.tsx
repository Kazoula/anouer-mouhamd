import React, { useState, useRef, useEffect } from 'react';
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
  VolumeX,
  RotateCw,
  Zap,
  RefreshCw,
  Check
} from 'lucide-react';
import { Product, ThemeMode } from '../types';
import { soundEffects } from '../utils/soundEffects';
import { isProductPriceLoss } from '../utils/calculations';

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
  onFastRefresh?: (hard?: boolean) => void;
  isRefreshing?: boolean;
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
  onFastRefresh,
  isRefreshing = false,
}) => {
  const [soundOn, setSoundOn] = useState<boolean>(soundEffects.isEnabled());
  const [showRefreshMenu, setShowRefreshMenu] = useState<boolean>(false);
  const [localRefreshing, setLocalRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const refreshMenuRef = useRef<HTMLDivElement>(null);

  // Close refresh menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (refreshMenuRef.current && !refreshMenuRef.current.contains(e.target as Node)) {
        setShowRefreshMenu(false);
      }
    };
    if (showRefreshMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showRefreshMenu]);

  const activeRefreshing = isRefreshing || localRefreshing;

  const triggerRefresh = (hard = false) => {
    setShowRefreshMenu(false);
    if (activeRefreshing) return;

    setLocalRefreshing(true);
    soundEffects.playIncrease();

    if (hard) {
      setToastMessage('جاري إعادة تحميل الصفحة بالكامل...');
      setTimeout(() => {
        window.location.reload();
      }, 300);
      return;
    }

    if (onFastRefresh) {
      onFastRefresh(false);
    } else {
      window.dispatchEvent(new CustomEvent('app_fast_refresh'));
    }

    setToastMessage('تم إنعاش التطبيق وتفريغ الذاكرة وتسريع الاستجابة ⚡');
    setTimeout(() => {
      setLocalRefreshing(false);
    }, 700);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Calculate urgent alerts across: 1. Price Loss (Purchase > Sale), 2. Low Stock, 3. Expiry
  const priceLossCount = products.filter(p => isProductPriceLoss(p)).length;
  const lowStockCount = products.filter(p => p.stockPieces <= p.minStockAlert).length;
  const expiryCount = products.filter(p => {
    if (!p.expiryDate || !p.expiryDate.trim()) return false;
    const expDate = new Date(p.expiryDate);
    const diffDays = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  }).length;
  const totalAlertsCount = priceLossCount + lowStockCount + expiryCount;

  return (
    <header 
      id="top-main-header"
      className="sticky top-0 z-50 bg-slate-900/95 dark:bg-black/95 backdrop-blur-2xl border-b border-purple-500/20 dark:border-white/10 text-white px-2.5 sm:px-4 py-2.5 sm:py-3.5 shadow-md w-full shrink-0"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.625rem)',
      }}
    >
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

          {/* Inventory & Pricing Alerts Button - Professional Danger Crimson */}
          <button
            id="low-stock-alert-btn"
            onClick={onOpenAlerts}
            style={{ backdropFilter: 'blur(3.5px)', WebkitBackdropFilter: 'blur(3.5px)' }}
            className={`relative p-1.5 sm:p-2 rounded-xl border transition-all flex items-center justify-center shrink-0 cursor-pointer active:scale-95 ${
              totalAlertsCount > 0
                ? 'bg-rose-500/15 dark:bg-rose-500/20 border-rose-500/50 text-rose-600 dark:text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.35)]'
                : 'bg-rose-500/10 border-rose-400/20 text-rose-400/70 hover:text-rose-500 hover:bg-rose-500/15'
            }`}
            title={`مركز التنبيهات الذكية: ${totalAlertsCount} تنبيه (خسارة أسعار: ${priceLossCount} | نقص مخزون: ${lowStockCount} | صلاحية: ${expiryCount})`}
          >
            <Bell className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${priceLossCount > 0 ? 'animate-bounce' : ''}`} />
            {totalAlertsCount > 0 && (
              <span 
                className="keep-white absolute -top-1 -right-1 px-1.5 min-w-[18px] h-4.5 rounded-full bg-gradient-to-r from-rose-600 to-red-600 text-white !text-white text-[9px] sm:text-[10px] font-black flex items-center justify-center shadow-md shadow-rose-600/40 animate-pulse border border-white/50 dark:border-black select-none"
                style={{ color: '#ffffff' }}
                dir="ltr"
              >
                {totalAlertsCount > 99 ? '99+' : totalAlertsCount}
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

          {/* =========================================================
              PROFESSIONAL CORNER REFRESH & SPEED BOOST BUTTON
              ========================================================= */}
          <div className="relative shrink-0" ref={refreshMenuRef}>
            <button
              id="corner-fast-refresh-btn"
              type="button"
              onClick={() => triggerRefresh(false)}
              onContextMenu={(e) => {
                e.preventDefault();
                setShowRefreshMenu(!showRefreshMenu);
              }}
              style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
              className={`relative p-1.5 sm:p-2 rounded-xl border transition-all flex items-center justify-center shrink-0 cursor-pointer active:scale-95 group ${
                activeRefreshing
                  ? 'bg-teal-500/30 border-teal-400 text-teal-300 shadow-[0_0_18px_rgba(20,184,166,0.6)] ring-2 ring-teal-400/40'
                  : 'bg-teal-500/15 dark:bg-teal-500/20 border-teal-400/40 text-teal-600 dark:text-teal-300 hover:bg-teal-500/25 hover:border-teal-300 shadow-[0_0_12px_rgba(20,184,166,0.2)]'
              }`}
              title="تحديث سريع وإنعاش التطبيق وتفريغ الذاكرة (انقر باليمين لخيارات إضافية)"
            >
              <RotateCw 
                className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-500 ${
                  activeRefreshing ? 'animate-spin text-teal-400' : 'group-hover:rotate-180'
                }`} 
              />
              
              {/* High-Tech Glowing Active Pulse Dot */}
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 pointer-events-none">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-80"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gradient-to-r from-teal-400 to-emerald-400 shadow-xs"></span>
              </span>
            </button>

            {/* Quick Context / Dropdown Menu on demand */}
            {showRefreshMenu && (
              <div 
                className="absolute left-0 top-full mt-2 w-56 bg-slate-900/98 border border-teal-500/40 rounded-2xl p-2 shadow-2xl z-50 text-xs backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 space-y-1"
                dir="rtl"
              >
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 border-b border-slate-800 flex items-center justify-between">
                  <span>خيارات إنعاش وتسريع التطبيق</span>
                  <Zap className="w-3 h-3 text-teal-400" />
                </div>
                
                <button
                  type="button"
                  onClick={() => triggerRefresh(false)}
                  className="w-full text-right px-2.5 py-2 rounded-xl text-teal-300 hover:bg-teal-500/20 flex items-center gap-2 font-bold transition-all cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-white text-xs">إنعاش فوري للذاكرة</div>
                    <div className="text-[10px] text-teal-300/80 font-normal">تفريغ الذاكرة المؤقتة وتسريع الأداء</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => triggerRefresh(true)}
                  className="w-full text-right px-2.5 py-2 rounded-xl text-slate-300 hover:bg-slate-800 flex items-center gap-2 font-bold transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-sky-400 shrink-0" />
                  <div>
                    <div className="text-white text-xs">إعادة تحميل كاملة</div>
                    <div className="text-[10px] text-slate-400 font-normal">إعادة تشغيل المتصفح من البداية</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Speed Boost / Refresh Toast Banner */}
      {toastMessage && (
        <div 
          className="fixed top-16 left-1/2 -translate-x-1/2 z-[250] bg-slate-900/95 dark:bg-black/95 text-teal-300 border-2 border-teal-500/70 shadow-[0_12px_40px_rgba(0,0,0,0.85)] px-4 py-2.5 rounded-2xl flex items-center gap-2.5 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-200 text-xs sm:text-sm font-black pointer-events-none"
          dir="rtl"
        >
          <div className="w-6 h-6 rounded-lg bg-teal-500/20 border border-teal-400/40 flex items-center justify-center shrink-0">
            <Zap className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
          </div>
          <span className="text-white">{toastMessage}</span>
          <Check className="w-4 h-4 text-teal-400 ml-1" />
        </div>
      )}
    </header>
  );
};
