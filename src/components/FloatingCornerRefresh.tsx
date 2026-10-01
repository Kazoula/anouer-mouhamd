import React, { useState, useEffect, useRef } from 'react';
import { RotateCw, Zap, RefreshCw, Sparkles, Check, ChevronUp } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

interface FloatingCornerRefreshProps {
  onFastRefresh?: () => void;
  isRefreshing?: boolean;
}

export const FloatingCornerRefresh: React.FC<FloatingCornerRefreshProps> = ({
  onFastRefresh,
  isRefreshing = false
}) => {
  const [localRefreshing, setLocalRefreshing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<string>('الآن');
  const menuRef = useRef<HTMLDivElement>(null);
  const touchTimerRef = useRef<any>(null);

  const activeRefreshing = isRefreshing || localRefreshing;

  // Handle outside click to close dropdown menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const triggerFastRefresh = (fullReload: boolean = false) => {
    soundEffects.playSuccess();
    setLocalRefreshing(true);
    setShowMenu(false);

    if (fullReload) {
      setToastMessage('جاري إعادة تحميل وتحديث التطبيق بالكامل...');
      setTimeout(() => {
        window.location.reload();
      }, 400);
      return;
    }

    if (onFastRefresh) {
      onFastRefresh();
    } else {
      window.dispatchEvent(new CustomEvent('app_fast_refresh'));
    }

    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    setLastRefreshTime(timeStr);

    setToastMessage('⚡ تم تفريغ الذاكرة المؤقتة وتسريع التطبيق بنجاح!');
    
    setTimeout(() => {
      setLocalRefreshing(false);
    }, 700);

    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Long press for touch devices to open options menu
  const handleTouchStart = () => {
    touchTimerRef.current = setTimeout(() => {
      setShowMenu(true);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
    }
  };

  return (
    <>
      {/* Floating Corner Speed & Refresh Widget */}
      <div 
        ref={menuRef}
        className="fixed bottom-15 left-3 sm:bottom-16 sm:left-4 z-40 select-none"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)'
        }}
      >
        <div className="relative group flex items-center">
          {/* Main Floating Button */}
          <button
            id="floating-corner-refresh-button"
            type="button"
            onClick={() => triggerFastRefresh(false)}
            onContextMenu={(e) => {
              e.preventDefault();
              setShowMenu(!showMenu);
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{ 
              backdropFilter: 'blur(8px)', 
              WebkitBackdropFilter: 'blur(8px)' 
            }}
            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-2xl border transition-all duration-300 shadow-xl cursor-pointer active:scale-95 group ${
              activeRefreshing
                ? 'bg-emerald-600/90 border-emerald-400 text-white shadow-emerald-500/40 ring-2 ring-emerald-400/50 scale-105'
                : 'bg-slate-900/90 dark:bg-black/90 hover:bg-slate-850 dark:hover:bg-slate-900 border-teal-500/50 hover:border-teal-400 text-teal-300 shadow-[0_8px_25px_rgba(20,184,166,0.25)]'
            }`}
            title="إنعاش وتسريع التطبيق عند البطء (انقر باليمين أو اضغط مطولاً لخيارات إضافية)"
            aria-label="تحديث وتسريع التطبيق"
          >
            {/* Spinning/pulsing icon */}
            <div className="relative flex items-center justify-center">
              <RotateCw 
                className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-700 ${
                  activeRefreshing ? 'animate-spin text-white' : 'text-teal-400 group-hover:rotate-180'
                }`} 
              />
              <Zap className="w-2 h-2 text-amber-400 absolute fill-amber-400 animate-pulse" />
            </div>

            {/* Micro Badge Text: Instant Speed */}
            <span className="font-extrabold text-[11px] sm:text-xs text-white tracking-tight flex items-center gap-1">
              <span>تسريع</span>
              <span className="text-[9px] text-teal-300 font-bold hidden min-[360px]:inline">⚡</span>
            </span>

            {/* Glowing Active Status Dot */}
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gradient-to-r from-teal-400 to-emerald-400"></span>
            </span>

            {/* Menu Opener Arrow */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="pr-0.5 text-teal-400/80 hover:text-white transition-colors"
              title="خيارات إضافية"
            >
              <ChevronUp className={`w-3.5 h-3.5 transition-transform ${showMenu ? 'rotate-180 text-teal-300' : ''}`} />
            </button>
          </button>

          {/* Quick Context Popup Menu */}
          {showMenu && (
            <div 
              className="absolute left-0 bottom-full mb-2 w-60 bg-slate-900/98 dark:bg-black/98 border border-teal-500/40 rounded-2xl p-2.5 shadow-2xl text-xs backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150 space-y-1.5 z-50 text-right"
              dir="rtl"
            >
              <div className="px-2 py-1 text-[11px] font-bold text-slate-300 border-b border-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-teal-400">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>إنعاش وتسريع التطبيق</span>
                </span>
                <span className="text-[9px] text-slate-400">آخر تحديث: {lastRefreshTime}</span>
              </div>

              {/* Option 1: Fast Memory Boost */}
              <button
                type="button"
                onClick={() => triggerFastRefresh(false)}
                className="w-full text-right p-2 rounded-xl text-teal-200 hover:bg-teal-500/20 flex items-center gap-2 font-bold transition-all cursor-pointer group active:scale-95"
              >
                <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-400/40 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-white text-xs font-bold">إنعاش سريع وتفريغ الذاكرة ⚡</div>
                  <div className="text-[10px] text-slate-400 font-normal">تسريع فوري بدون إعادة تحميل الصفحة</div>
                </div>
              </button>

              {/* Option 2: Full Reload */}
              <button
                type="button"
                onClick={() => triggerFastRefresh(true)}
                className="w-full text-right p-2 rounded-xl text-sky-200 hover:bg-sky-500/20 flex items-center gap-2 font-bold transition-all cursor-pointer group active:scale-95"
              >
                <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <RefreshCw className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <div className="text-white text-xs font-bold">إعادة تحميل وتحديث كلي 🔄</div>
                  <div className="text-[10px] text-slate-400 font-normal">إعادة تشغيل الذاكرة من السحابة والقرص</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Speed Boost / Refresh Toast Notification */}
      {toastMessage && (
        <div 
          className="fixed top-16 left-1/2 -translate-x-1/2 z-[250] bg-slate-900/98 dark:bg-black/98 text-teal-300 border-2 border-teal-500/80 shadow-[0_12px_40px_rgba(0,0,0,0.85)] px-4 py-2.5 rounded-2xl flex items-center gap-2.5 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-200 text-xs sm:text-sm font-black pointer-events-none"
          dir="rtl"
        >
          <div className="w-7 h-7 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center shrink-0 shadow-inner">
            <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
          </div>
          <span className="text-white">{toastMessage}</span>
          <Check className="w-4 h-4 text-teal-400 ml-1 shrink-0" />
        </div>
      )}
    </>
  );
};
