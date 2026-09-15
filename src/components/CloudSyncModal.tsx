import React, { useState } from 'react';
import { 
  Cloud, 
  CloudUpload, 
  CloudDownload, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Smartphone, 
  Monitor, 
  Database, 
  X, 
  ArrowRight, 
  ShieldCheck,
  Package,
  Layers,
  Receipt
} from 'lucide-react';
import { Product, Supplier, Customer, SaleInvoice, PurchaseInvoice, StockMovement, StoreConfig, OnlineStoreOrder } from '../types';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  cloudSyncStatus: 'synced' | 'syncing' | 'offline';
  localProductsCount: number;
  localSalesCount: number;
  localSuppliersCount: number;
  localCustomersCount: number;
  onForcePushToCloud: (onProgress: (step: string, percent: number) => void) => Promise<{ success: boolean; error?: string }>;
  onForcePullFromCloud: () => Promise<{ success: boolean; error?: string }>;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  cloudSyncStatus,
  localProductsCount,
  localSalesCount,
  localSuppliersCount,
  localCustomersCount,
  onForcePushToCloud,
  onForcePullFromCloud,
}) => {
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [actionResult, setActionResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handlePush = async () => {
    setIsPushing(true);
    setActionResult(null);
    setProgressPercent(5);
    setProgressMsg('بدء تجهيز البيانات للرفع...');

    try {
      const res = await onForcePushToCloud((step, pct) => {
        setProgressMsg(step);
        setProgressPercent(pct);
      });

      if (res.success) {
        setActionResult({
          type: 'success',
          message: `تم رفع ومزامنة جميع البيانات (${localProductsCount} صنف و ${localSalesCount} فاتورة) إلى السحابة بنجاح! ستظهر فوراً على هاتفك.`
        });
      } else {
        setActionResult({
          type: 'error',
          message: res.error || 'حدث خطأ أثناء رفع البيانات إلى السحابة'
        });
      }
    } catch (e: any) {
      setActionResult({
        type: 'error',
        message: e?.message || 'تعذر الاتصال بالسحابة'
      });
    } finally {
      setIsPushing(false);
    }
  };

  const handlePull = async () => {
    setIsPulling(true);
    setActionResult(null);
    try {
      const res = await onForcePullFromCloud();
      if (res.success) {
        setActionResult({
          type: 'success',
          message: 'تم جلب وتحديث كامل البيانات من السحابة بنجاح! تم مزامنة هذا الجهاز مع السحابة بالكامل.'
        });
      } else {
        setActionResult({
          type: 'error',
          message: res.error || 'حدث خطأ أثناء جلب البيانات من السحابة'
        });
      }
    } catch (e: any) {
      setActionResult({
        type: 'error',
        message: e?.message || 'تعذر سحب البيانات من السحابة'
      });
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <div 
      id="cloud-sync-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div 
        id="cloud-sync-modal-card"
        className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-800 bg-slate-850/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                المزامنة السحابية بين الأجهزة
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Firebase Cloud
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                مزامنة لحظية وتطابق تام للبيانات بين هاتفك وجهاز الكمبيوتر
              </p>
            </div>
          </div>
          <button
            id="close-cloud-sync-modal-btn"
            type="button"
            onClick={onClose}
            className="close-circle-btn"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Connection Status Banner */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
            cloudSyncStatus === 'synced'
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
              : cloudSyncStatus === 'syncing'
              ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
              : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
          }`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <Cloud className="w-5 h-5" />
                <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${
                  cloudSyncStatus === 'synced' ? 'bg-emerald-400 animate-pulse' : cloudSyncStatus === 'syncing' ? 'bg-amber-400 animate-ping' : 'bg-rose-500'
                }`} />
              </div>
              <div className="min-w-0">
                <span className="block text-xs sm:text-sm font-bold truncate">
                  {cloudSyncStatus === 'synced' 
                    ? 'قاعدة البيانات السحابية متصلة ومتزامنة لحظياً' 
                    : cloudSyncStatus === 'syncing' 
                    ? 'جاري فحص وتحديث المزامنة مع السحابة...' 
                    : 'الوضع المحلي نشط (تعذر الاتصال بالسحابة)'}
                </span>
                <span className="text-[11px] opacity-80 block truncate">
                  Firebase Firestore Real-time Sync
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-lg bg-black/20 text-[11px] font-mono font-bold">
              <Smartphone className="w-3.5 h-3.5 text-sky-400" />
              <span>↔</span>
              <Monitor className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>

          {/* Current Local Stats Grid */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 block">
              البيانات المحفوظة على هذا الجهاز حالياً:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-center">
                <span className="block text-[10px] text-slate-400 font-medium">الأصناف</span>
                <span className="text-base font-black text-emerald-400">{localProductsCount}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-center">
                <span className="block text-[10px] text-slate-400 font-medium">الفواتير</span>
                <span className="text-base font-black text-sky-400">{localSalesCount}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-center">
                <span className="block text-[10px] text-slate-400 font-medium">الموردون</span>
                <span className="text-base font-black text-amber-400">{localSuppliersCount}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-center">
                <span className="block text-[10px] text-slate-400 font-medium">العملاء</span>
                <span className="text-base font-black text-purple-400">{localCustomersCount}</span>
              </div>
            </div>
          </div>

          {/* Action Result Notification */}
          {actionResult && (
            <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 animate-in fade-in ${
              actionResult.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-600/80 text-emerald-200'
                : 'bg-rose-950/70 border-rose-600/80 text-rose-200'
            }`}>
              {actionResult.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="text-xs font-medium leading-relaxed flex-1">
                {actionResult.message}
              </div>
            </div>
          )}

          {/* Progress Bar (during Push) */}
          {isPushing && (
            <div className="p-3.5 bg-slate-800/90 border border-emerald-500/40 rounded-xl space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  {progressMsg}
                </span>
                <span className="font-mono text-emerald-300">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Main Action Buttons */}
          <div className="space-y-3 pt-1">
            {/* Push to Cloud Button */}
            <button
              id="push-to-cloud-btn"
              type="button"
              disabled={isPushing || isPulling}
              onClick={handlePush}
              className="w-full p-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold flex items-start gap-3.5 transition-all shadow-lg shadow-emerald-950/40 border border-emerald-500/30 active:scale-[0.99] disabled:opacity-50 text-right group"
            >
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <CloudUpload className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black">
                    رفع بيانات هذا الجهاز إلى السحابة فوراً (Cloud Push)
                  </span>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">
                    الكمبيوتر ➔ السحابة
                  </span>
                </div>
                <p className="text-xs text-emerald-100/80 mt-1 leading-relaxed">
                  استخدم هذا الخيار إذا أضفت أو استوردت أصنافاً أو فواتير على هذا الجهاز وتريد نقلها وظهورها على هاتفك الذكي وباقي الأجهزة فوراً.
                </p>
              </div>
            </button>

            {/* Pull from Cloud Button */}
            <button
              id="pull-from-cloud-btn"
              type="button"
              disabled={isPushing || isPulling}
              onClick={handlePull}
              className="w-full p-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold flex items-start gap-3.5 transition-all border border-slate-700/80 active:scale-[0.99] disabled:opacity-50 text-right group"
            >
              <div className="w-10 h-10 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <CloudDownload className="w-5 h-5 text-sky-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black">
                    جلب وتحديث البيانات من السحابة (Cloud Pull)
                  </span>
                  <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full font-mono">
                    السحابة ➔ الهاتف
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  استخدم هذا الخيار عند فتح الموقع على الهاتف لجلب وتحديث كل الأصناف والأسعار والفواتير المسجلة بالسحابة بضغطة زر واحدة.
                </p>
              </div>
            </button>
          </div>

          {/* Sync Guarantee Box */}
          <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 flex items-start gap-2.5 text-slate-400 text-xs leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-300 block mb-0.5">مزامنة سحابية مؤمنة ومجانية:</span>
              جميع العمليات (البيع، الشراء، تعديل الأسعار، تغيير مهلة الكتابة) تتزامن في نفس اللحظة عبر السحابة، ويمكنك فتح النظام من أي متصفح هاتف أو حاسوب دون فقدان أي بيانات.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-800 bg-slate-850/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
