import React, { useState, useMemo } from 'react';
import { 
  Scale, 
  X, 
  Search, 
  Printer, 
  Copy, 
  Trash2, 
  Check, 
  Building, 
  User, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Filter, 
  Calendar,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { PartnerSettlement, Customer, Supplier } from '../types';
import { formatCurrency, formatArabicDateTime } from '../utils/calculations';

interface SettlementsLedgerModalProps {
  isOpen: boolean;
  settlements: PartnerSettlement[];
  currency: string;
  customers?: Customer[];
  suppliers?: Supplier[];
  initialPartnerType?: 'all' | 'customers' | 'suppliers';
  onClose: () => void;
  onDeleteSettlement: (settlementId: string) => void;
  onOpenNewSettlement?: (type?: 'customer' | 'supplier') => void;
}

export const SettlementsLedgerModal: React.FC<SettlementsLedgerModalProps> = ({
  isOpen,
  settlements = [],
  currency,
  customers = [],
  suppliers = [],
  initialPartnerType = 'all',
  onClose,
  onDeleteSettlement,
  onOpenNewSettlement,
}) => {
  const [partnerTypeFilter, setPartnerTypeFilter] = useState<'all' | 'customers' | 'suppliers'>(initialPartnerType);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [settlementToDelete, setSettlementToDelete] = useState<PartnerSettlement | null>(null);
  const [selectedSettlementForPrint, setSelectedSettlementForPrint] = useState<PartnerSettlement | null>(null);

  // Filtered settlements list
  const filteredSettlements = useMemo(() => {
    return settlements.filter((s) => {
      // Partner Type filter
      if (partnerTypeFilter === 'customers' && s.partnerType !== 'customer') return false;
      if (partnerTypeFilter === 'suppliers' && s.partnerType !== 'supplier') return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const num = (s.settlementNumber || '').toLowerCase();
        const name = (s.partnerName || '').toLowerCase();
        const phone = (s.partnerPhone || '').toLowerCase();
        const reason = (s.reason || '').toLowerCase();
        const notes = (s.notes || '').toLowerCase();
        if (!num.includes(q) && !name.includes(q) && !phone.includes(q) && !reason.includes(q) && !notes.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [settlements, partnerTypeFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    let totalDeductions = 0;
    let totalAdditions = 0;
    let customerSettlementsCount = 0;
    let supplierSettlementsCount = 0;

    settlements.forEach((s) => {
      if (s.adjustmentType === 'decrease') {
        totalDeductions += s.amount || 0;
      } else {
        totalAdditions += s.amount || 0;
      }
      if (s.partnerType === 'customer') {
        customerSettlementsCount++;
      } else {
        supplierSettlementsCount++;
      }
    });

    return {
      totalDeductions: +totalDeductions.toFixed(2),
      totalAdditions: +totalAdditions.toFixed(2),
      totalCount: settlements.length,
      customerSettlementsCount,
      supplierSettlementsCount,
    };
  }, [settlements]);

  if (!isOpen) return null;

  const handleCopySettlement = (s: PartnerSettlement) => {
    const isCust = s.partnerType === 'customer';
    const text = `
📜 *سند تسوية مالية معتمد*
رقم السند: ${s.settlementNumber}
التاريخ: ${formatArabicDateTime(s.date)}
الطرف: ${s.partnerName} (${isCust ? 'عميل' : 'مورد'})
${s.partnerPhone ? `الهاتف: ${s.partnerPhone}` : ''}
---------------------------------
الرصيد السابق: ${formatCurrency(s.previousBalance, currency)}
مبلغ التسوية: ${formatCurrency(s.amount, currency)} (${s.adjustmentType === 'decrease' ? 'خصم/تخفيض من الرصيد' : 'إضافة/زيادة على الرصيد'})
الرصيد الجديد بعد التسوية: ${formatCurrency(s.newBalance, currency)}
سبب التسوية: ${s.reason}
${s.notes ? `ملاحظات: ${s.notes}` : ''}
---------------------------------
نظام إدارة الحسابات المتكامل
    `.trim();

    navigator.clipboard.writeText(text);
    setCopiedId(s.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handlePrintIndividual = (s: PartnerSettlement) => {
    setSelectedSettlementForPrint(s);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700/90 rounded-3xl w-full max-w-4xl shadow-2xl text-slate-100 my-auto overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white border border-slate-750 flex items-center justify-center shadow-inner">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-black text-base sm:text-lg text-white flex items-center gap-2">
                <span>سجل التسويات المالية المعتمدة</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-black text-white border border-slate-700 font-mono font-bold">
                  {filteredSettlements.length} سند
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                أرشيف سندات تسوية أرصدة العملاء والموردين، الخصومات المعتمدة ومطابقات الجرد
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenNewSettlement && (
              <button
                onClick={() => {
                  onClose();
                  onOpenNewSettlement();
                }}
                className="px-3 py-1.5 rounded-xl bg-black hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1 shadow-md transition-all active:scale-95 border border-slate-750"
              >
                <Scale className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline">سند تسوية جديد</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Summary Bar */}
        <div className="px-5 py-3 bg-slate-850 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0 text-xs">
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-750">
            <span className="text-[11px] text-slate-400 block">إجمالي التسويات بالخصم (إعفاء/تخفيض):</span>
            <span className="font-mono font-black text-amber-400 text-sm">
              -{formatCurrency(stats.totalDeductions, currency)}
            </span>
          </div>

          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-750">
            <span className="text-[11px] text-slate-400 block">إجمالي التسويات بالإضافة (قيود مدينة):</span>
            <span className="font-mono font-black text-indigo-400 text-sm">
              +{formatCurrency(stats.totalAdditions, currency)}
            </span>
          </div>

          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-750">
            <span className="text-[11px] text-slate-400 block">تسويات العملاء:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {stats.customerSettlementsCount} عملية
            </span>
          </div>

          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-750">
            <span className="text-[11px] text-slate-400 block">تسويات الموردين:</span>
            <span className="font-mono font-bold text-blue-400 text-sm">
              {stats.supplierSettlementsCount} عملية
            </span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Partner Type Filter Tabs */}
          <div className="flex items-center bg-slate-850 p-1 rounded-xl border border-slate-750 text-xs font-semibold">
            <button
              onClick={() => setPartnerTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                partnerTypeFilter === 'all'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              الكل ({settlements.length})
            </button>
            <button
              onClick={() => setPartnerTypeFilter('customers')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                partnerTypeFilter === 'customers'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>العملاء ({stats.customerSettlementsCount})</span>
            </button>
            <button
              onClick={() => setPartnerTypeFilter('suppliers')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                partnerTypeFilter === 'suppliers'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-blue-400'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>الموردين ({stats.supplierSettlementsCount})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="ابحث برقم السند، اسم الطرف، أو سبب التسوية..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-850 border border-slate-750 rounded-xl pr-9 pl-3 py-2 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Ledger Table / List */}
        <div className="overflow-y-auto flex-1 p-3 sm:p-5">
          {filteredSettlements.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Scale className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="font-bold text-slate-300 text-sm">لا توجد سندات تسوية مالية مسجلة</p>
              <p className="text-xs text-slate-500">
                {searchQuery ? 'لا توجد نتائج مطابقة لبحثك' : 'يمكنك إنشاء سند تسوية مالية جديد في أي وقت لضبط رصيد عميل أو مورد'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSettlements.map((s) => {
                const isCust = s.partnerType === 'customer';
                return (
                  <div
                    key={s.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-slate-850 border border-slate-800 hover:border-slate-700 transition-all space-y-3 shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                          isCust ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {isCust ? <User className="w-4 h-4" /> : <Building className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm">{s.partnerName}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isCust ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                            }`}>
                              {isCust ? 'عميل' : 'مورد'}
                            </span>
                            <span className="font-mono text-xs text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                              {s.settlementNumber}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                            <span className="flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              <span>{formatArabicDateTime(s.date)}</span>
                            </span>
                            {s.partnerPhone && (
                              <span className="font-mono" dir="ltr">
                                {s.partnerPhone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleCopySettlement(s)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700 transition-all active:scale-95"
                          title="نسخ تفاصيل السند"
                        >
                          {copiedId === s.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          onClick={() => handlePrintIndividual(s)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 text-xs border border-slate-700 transition-all active:scale-95"
                          title="طباعة السند"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setSettlementToDelete(s)}
                          className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 text-xs border border-rose-500/30 transition-all active:scale-95"
                          title="إلغاء وحذف التسوية (استرجاع الرصيد السابق)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Financial Data Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-xs">
                      <div>
                        <span className="text-[10.5px] text-slate-400 block">الرصيد السابق:</span>
                        <span className="font-mono font-bold text-slate-300">{formatCurrency(s.previousBalance, currency)}</span>
                      </div>

                      <div>
                        <span className="text-[10.5px] text-slate-400 block">مبلغ التسوية:</span>
                        <span className={`font-mono font-black ${
                          s.adjustmentType === 'decrease' ? 'text-amber-400' : 'text-indigo-400'
                        }`}>
                          {s.adjustmentType === 'decrease' ? '-' : '+'}{formatCurrency(s.amount, currency)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10.5px] text-slate-400 block">الرصيد بعد التسوية:</span>
                        <span className={`font-mono font-bold ${s.newBalance === 0 ? 'text-emerald-400' : 'text-white'}`}>
                          {formatCurrency(s.newBalance, currency)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10.5px] text-slate-400 block">نوع العملية:</span>
                        <span className="text-[11px] font-bold text-indigo-300">
                          {s.settlementMode === 'zero_balance' ? 'تصفير رصيد (0.00)' :
                           s.settlementMode === 'target_balance' ? 'مطابقة رصيد جرد' :
                           s.settlementMode === 'discount' ? 'خصم تسوية مالي' : 'إضافة للرصيد'}
                        </span>
                      </div>
                    </div>

                    {/* Reason Text */}
                    <div className="text-[11.5px] text-slate-300 bg-slate-900/40 px-3 py-1.5 rounded-lg border border-slate-800/60">
                      <span className="text-slate-500 font-semibold ml-1">البيان:</span>
                      <span>{s.reason}</span>
                      {s.notes && <span className="text-slate-400 mr-2 text-[10.5px]">({s.notes})</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {settlementToDelete && (
          <div 
            className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
            onClick={() => setSettlementToDelete(null)}
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl text-xs"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h4 className="font-bold text-sm text-white">تأكيد حذف سند التسوية؟</h4>
                <p className="text-slate-400 text-xs">
                  سيتم حذف السند <span className="font-mono text-indigo-400 font-bold">{settlementToDelete.settlementNumber}</span> واسترجاع رصيد {settlementToDelete.partnerType === 'customer' ? 'العميل' : 'المورد'} تلقائياً كما كان قبل هذه التسوية.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSettlementToDelete(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteSettlement(settlementToDelete.id);
                    setSettlementToDelete(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 shadow-lg shadow-rose-600/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>تأكيد الحذف واسترجاع الرصيد</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden Print Container for Individual Settlement */}
        {selectedSettlementForPrint && (
          <div className="hidden print:block fixed inset-0 bg-white text-black p-8 z-[99999]">
            <div className="text-center border-b pb-4 mb-4">
              <h1 className="text-xl font-black">سند تسوية مالية معتمد</h1>
              <p className="text-sm font-mono mt-1">رقم السند: {selectedSettlementForPrint.settlementNumber}</p>
              <p className="text-xs text-gray-600">التاريخ: {formatArabicDateTime(selectedSettlementForPrint.date)}</p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="font-bold">اسم الطرف:</span>
                <span>{selectedSettlementForPrint.partnerName} ({selectedSettlementForPrint.partnerType === 'customer' ? 'عميل' : 'مورد'})</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-bold">الرصيد السابق:</span>
                <span className="font-mono">{formatCurrency(selectedSettlementForPrint.previousBalance, currency)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-bold">مبلغ التسوية:</span>
                <span className="font-mono font-bold">
                  {selectedSettlementForPrint.adjustmentType === 'decrease' ? 'خصم: ' : 'إضافة: '}
                  {formatCurrency(selectedSettlementForPrint.amount, currency)}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-bold">الرصيد الجديد الفعلي:</span>
                <span className="font-mono font-black">{formatCurrency(selectedSettlementForPrint.newBalance, currency)}</span>
              </div>
              <div className="border-b pb-2">
                <span className="font-bold block mb-1">البيان والسبب:</span>
                <p>{selectedSettlementForPrint.reason}</p>
                {selectedSettlementForPrint.notes && <p className="text-xs text-gray-600 mt-1">ملاحظات: {selectedSettlementForPrint.notes}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-12 mt-8 text-center text-sm">
              <div>
                <span className="block mb-12">توقيع المحاسب المسؤول:</span>
                <span className="border-t border-gray-400 w-36 inline-block"></span>
              </div>
              <div>
                <span className="block mb-12">توقيع {selectedSettlementForPrint.partnerType === 'customer' ? 'العميل' : 'المورد'}:</span>
                <span className="border-t border-gray-400 w-36 inline-block"></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
