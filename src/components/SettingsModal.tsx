import React from 'react';
import { 
  Settings, 
  RefreshCw, 
  Download, 
  Smartphone, 
  Monitor, 
  X, 
  Coins, 
  Sun, 
  Moon, 
  Laptop,
  Cloud,
  CheckCircle2,
  Database,
  Volume2,
  VolumeX,
  Plus,
  Minus
} from 'lucide-react';
import { ThemeMode } from '../types';
import { soundEffects } from '../utils/soundEffects';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  onChangeCurrency: (curr: string) => void;
  theme: ThemeMode;
  onChangeTheme: (theme: ThemeMode) => void;
  isMobileFrame: boolean;
  setIsMobileFrame: (val: boolean) => void;
  onResetData: () => void;
  onExportBackup: () => void;
  onOpenStoreTab?: () => void;
  cloudSyncStatus?: 'synced' | 'syncing' | 'offline';
  onForceCloudSync?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currency,
  onChangeCurrency,
  theme,
  onChangeTheme,
  isMobileFrame,
  setIsMobileFrame,
  onResetData,
  onExportBackup,
  onOpenStoreTab,
  cloudSyncStatus = 'synced',
  onForceCloudSync,
}) => {
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);
  const [soundOn, setSoundOn] = React.useState<boolean>(soundEffects.isEnabled());

  const handleToggleSound = () => {
    const next = soundEffects.toggle();
    setSoundOn(next);
  };

  if (!isOpen) return null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700/90 rounded-3xl w-full max-w-sm p-4 sm:p-5 shadow-2xl text-slate-100 my-auto max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150"
      >
        {/* Top Drag Indicator */}
        <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-3 shrink-0" />
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">إعدادات التطبيق والمظهر</h3>
              <p className="text-[11px] text-slate-400">تخصيص الثيم، العملة، والبيانات</p>
            </div>
          </div>
          <button
            id="close-settings-modal-top-btn"
            onClick={onClose}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold transition-all active:scale-95"
            title="إغلاق"
          >
            <X className="w-4 h-4 text-slate-400" />
            <span>إغلاق</span>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto space-y-4 text-sm pr-1">
          {/* Theme Mode Selector */}
          <div className="bg-slate-850/80 border border-slate-800 p-3 rounded-2xl">
            <span className="block text-xs font-bold text-slate-300 mb-2">مظهر التطبيق (النهاري والليلي)</span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                id="theme-btn-dark"
                onClick={() => onChangeTheme('dark')}
                className={`py-2 px-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                  theme === 'dark'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span className="text-[11px]">ليلي 🌙</span>
              </button>

              <button
                type="button"
                id="theme-btn-light"
                onClick={() => onChangeTheme('light')}
                className={`py-2 px-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                  theme === 'light'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="text-[11px]">نهاري ☀️</span>
              </button>

              <button
                type="button"
                id="theme-btn-system"
                onClick={() => onChangeTheme('system')}
                className={`py-2 px-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                  theme === 'system'
                    ? 'bg-teal-500/20 border-teal-500 text-teal-300 shadow-sm'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Laptop className="w-4 h-4 text-teal-400" />
                <span className="text-[11px]">تلقائي 💻</span>
              </button>
            </div>
          </div>

          {/* Currency selector */}
          <div className="bg-slate-850/80 border border-slate-800 p-3 rounded-2xl">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-300 mb-2">
              <Coins className="w-4 h-4 text-emerald-400" />
              <span>عملة الحسابات الرئيسية</span>
            </label>
            <select
              value={currency}
              onChange={(e) => onChangeCurrency(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-medium focus:outline-none focus:border-emerald-500 text-xs sm:text-sm"
            >
              <option value="د.ج">دينار جزائري (د.ج / DZD)</option>
              <option value="ر.س">ريال سعودي (ر.س)</option>
              <option value="ج.م">جنيه مصري (ج.م)</option>
              <option value="د.ت">دينار تونسي (د.ت)</option>
              <option value="د.م">درهم مغربي (د.م)</option>
              <option value="د.إ">درهم إماراتي (د.إ)</option>
              <option value="د.ك">دينار كويتي (د.ك)</option>
              <option value="د.أ">دينار أردني (د.أ)</option>
              <option value="ر.ق">ريال قطري (ر.ق)</option>
              <option value="$">دولار أمريكي ($)</option>
              <option value="€">يورو (€)</option>
            </select>
          </div>

          {/* Sound Effects Controls */}
          <div className="bg-slate-850/80 border border-slate-800 p-3 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${soundOn ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                  {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-200">أصوات زيادة ونقصان الكميات</span>
                  <span className="block text-[10px] text-slate-400">مؤثرات صوتية ممتعة عند تعديل الكميات والفواتير</span>
                </div>
              </div>
              <button
                type="button"
                id="toggle-sound-effects-btn"
                onClick={handleToggleSound}
                className={`px-2.5 py-1 rounded-xl text-xs font-extrabold border transition-all ${
                  soundOn
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-750 text-slate-400 border-slate-700'
                }`}
              >
                {soundOn ? 'مفعّلة 🔊' : 'مكتومة 🔇'}
              </button>
            </div>

            {/* Test Sound Buttons */}
            {soundOn && (
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 font-medium">تجربة الصوت:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => soundEffects.playDecrease()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-650 text-slate-300 text-xs font-bold border border-slate-700 transition-all active:scale-95"
                    title="تجربة صوت النقصان"
                  >
                    <Minus className="w-3.5 h-3.5 text-rose-400" />
                    <span>صوت النقصان (-)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => soundEffects.playIncrease()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-600/30 active:bg-emerald-600/40 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition-all active:scale-95"
                    title="تجربة صوت الزيادة"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>صوت الزيادة (+)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* View Mode */}
          <div className="bg-slate-850/80 border border-slate-800 p-3 rounded-2xl">
            <span className="block text-xs font-bold text-slate-300 mb-2">طريقة العرض (لأجهزة الكمبيوتر)</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsMobileFrame(true)}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  isMobileFrame
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>إطار هاتف ذكي</span>
              </button>
              <button
                type="button"
                onClick={() => setIsMobileFrame(false)}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  !isMobileFrame
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>عرض كامل</span>
              </button>
            </div>
          </div>

          {/* Store Integration Shortcut */}
          {onOpenStoreTab && (
            <div className="bg-slate-850/80 border border-emerald-500/30 p-3 rounded-2xl">
              <span className="block text-xs font-bold text-slate-300 mb-1.5">بوابة المتجر والربط الإلكتروني</span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenStoreTab();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
              >
                <span>فتح شاشة ربط المتجر والـ QR</span>
              </button>
            </div>
          )}

          {/* Firebase Cloud Sync Status */}
          <div className="bg-slate-850/90 border border-emerald-500/40 p-3 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-xs font-bold text-white">سحابة Firebase Firestore</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    {cloudSyncStatus === 'synced' ? '● قاعدة البيانات السحابية متصلة ومتزامنة' : cloudSyncStatus === 'syncing' ? '● جاري المزامنة مع السحابة...' : '● وضع محلي'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded-full font-mono">
                Real-time
              </span>
            </div>

            {onForceCloudSync && (
              <button
                type="button"
                onClick={onForceCloudSync}
                className="w-full py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${cloudSyncStatus === 'syncing' ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
                <span>مزامنة يدوية وتأكيد السحابة</span>
              </button>
            )}
          </div>

          {/* Backup & Reset Actions */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => {
                onExportBackup();
                onClose();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center gap-2 text-xs font-bold text-emerald-400 transition-all active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>تصدير نسخة احتياطية (JSON)</span>
            </button>

            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 flex items-center justify-center gap-2 text-xs font-bold text-rose-300 transition-all active:scale-[0.98]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>استعادة البيانات النموذجية</span>
              </button>
            ) : (
              <div className="bg-rose-950/60 border border-rose-600/50 rounded-2xl p-3 space-y-2 animate-in fade-in">
                <p className="text-xs text-rose-200 font-bold text-center">
                  هل أنت متأكد؟ سيتم استعادة البيانات الافتراضية ومسح أي تعديلات غير محفوظة.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => {
                      setShowResetConfirm(false);
                      onResetData();
                      onClose();
                    }}
                    className="py-1.5 px-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-md shadow-rose-950/50"
                  >
                    تأكيد الاستعادة
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Dismiss Button */}
          <div className="pt-2 border-t border-slate-800">
            <button
              id="close-settings-modal-bottom-btn"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs border border-slate-700 transition-all active:scale-[0.98]"
            >
              إغلاق النافذة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
