import React, { useState, useEffect, useMemo } from 'react';
import { 
  Scale, 
  X, 
  Check, 
  Printer, 
  Copy, 
  Calendar, 
  FileText, 
  Building, 
  User, 
  Search, 
  CheckCircle2, 
  Share2, 
  Phone, 
  Tag, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  MinusCircle, 
  PlusCircle, 
  AlertCircle
} from 'lucide-react';
import { Customer, Supplier, PartnerSettlement } from '../types';
import { formatCurrency, formatArabicDateTime } from '../utils/calculations';

interface SettlementModalProps {
  isOpen: boolean;
  partner?: {
    type: 'customer' | 'supplier';
    data: Customer | Supplier;
  } | null;
  currency: string;
  suppliers?: Supplier[];
  customers?: Customer[];
  defaultType?: 'customer' | 'supplier';
  onClose: () => void;
  onSaveSettlement: (settlement: PartnerSettlement) => void;
}

export const SettlementModal: React.FC<SettlementModalProps> = ({
  isOpen,
  partner: initialPartner = null,
  currency,
  suppliers = [],
  customers = [],
  defaultType = 'customer',
  onClose,
  onSaveSettlement,
}) => {
  // Selected Partner state
  const [selectedPartner, setSelectedPartner] = useState<{
    type: 'customer' | 'supplier';
    data: Customer | Supplier;
  } | null>(initialPartner);

  // Search when no partner is fixed
  const [partnerSearchQuery, setPartnerSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'customers' | 'suppliers'>(
    defaultType === 'supplier' ? 'suppliers' : 'customers'
  );

  useEffect(() => {
    setSelectedPartner(initialPartner);
    if (initialPartner) {
      setFilterType(initialPartner.type === 'supplier' ? 'suppliers' : 'customers');
    }
  }, [initialPartner]);

  const activeType = selectedPartner ? selectedPartner.type : (filterType === 'suppliers' ? 'supplier' : 'customer');
  const partnerData = selectedPartner ? selectedPartner.data : null;
  const currentBalance = partnerData ? Number(partnerData.balance) || 0 : 0;
  const partnerCurrency = partnerData?.currency || currency;

  // Settlement Form State
  const [settlementMode, setSettlementMode] = useState<'zero_balance' | 'target_balance' | 'discount' | 'increase_balance'>(
    'zero_balance'
  );
  const [targetBalanceRaw, setTargetBalanceRaw] = useState<string>('0');
  const [adjustmentAmountRaw, setAdjustmentAmountRaw] = useState<string>('');
  
  const [reasonPreset, setReasonPreset] = useState<string>('تصفية وتصفير كامل الرصيد');
  const [customReason, setCustomReason] = useState<string>('');
  const [settlementDate, setSettlementDate] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [settlementNumber, setSettlementNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Result / Voucher view state
  const [savedSettlement, setSavedSettlement] = useState<PartnerSettlement | null>(null);
  const [copiedVoucher, setCopiedVoucher] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Initialize form when partner or mode changes
  useEffect(() => {
    if (selectedPartner && selectedPartner.data) {
      const rand = Math.floor(1000 + Math.random() * 9000);
      setSettlementNumber(`SET-${new Date().getFullYear()}-${rand}`);
      setTargetBalanceRaw('0');
      setAdjustmentAmountRaw('');
      setErrorMessage('');
    }
  }, [selectedPartner]);

  // Update preset reason default on mode change
  useEffect(() => {
    if (settlementMode === 'zero_balance') {
      setReasonPreset('تصفية وتصفير كامل الرصيد');
    } else if (settlementMode === 'target_balance') {
      setReasonPreset('مطابقة رصيد كشف الحساب والجرد الدوري');
    } else if (settlementMode === 'discount') {
      setReasonPreset(activeType === 'customer' ? 'خصم تسوية مسموح به للعميل' : 'خصم تسوية مكتسب من المورد');
    } else if (settlementMode === 'increase_balance') {
      setReasonPreset('تسوية قيد تصحيحي / إضافة فروقات محاسبية');
    }
  }, [settlementMode, activeType]);

  // Calculations: calculate newBalance, adjustmentType, and amount based on selected mode
  const calculationResult = useMemo(() => {
    if (!partnerData) {
      return { newBalance: 0, amount: 0, adjustmentType: 'decrease' as const, isValid: false };
    }

    const curBal = Number(partnerData.balance) || 0;

    if (settlementMode === 'zero_balance') {
      const diff = 0 - curBal;
      const amount = Math.abs(diff);
      const adjustmentType: 'decrease' | 'increase' = curBal >= 0 ? 'decrease' : 'increase';
      return {
        newBalance: 0,
        amount: +amount.toFixed(2),
        adjustmentType,
        isValid: Math.abs(curBal) > 0.0001,
      };
    }

    if (settlementMode === 'target_balance') {
      const target = parseFloat(targetBalanceRaw);
      if (isNaN(target)) {
        return { newBalance: curBal, amount: 0, adjustmentType: 'decrease' as const, isValid: false };
      }
      const diff = target - curBal;
      const amount = Math.abs(diff);
      const adjustmentType: 'decrease' | 'increase' = diff >= 0 ? 'increase' : 'decrease';
      return {
        newBalance: +target.toFixed(2),
        amount: +amount.toFixed(2),
        adjustmentType,
        isValid: amount > 0.0001,
      };
    }

    if (settlementMode === 'discount') {
      const discount = parseFloat(adjustmentAmountRaw);
      if (isNaN(discount) || discount <= 0) {
        return { newBalance: curBal, amount: 0, adjustmentType: 'decrease' as const, isValid: false };
      }
      const newBal = +(curBal - discount).toFixed(2);
      return {
        newBalance: newBal,
        amount: +discount.toFixed(2),
        adjustmentType: 'decrease' as const,
        isValid: true,
      };
    }

    if (settlementMode === 'increase_balance') {
      const add = parseFloat(adjustmentAmountRaw);
      if (isNaN(add) || add <= 0) {
        return { newBalance: curBal, amount: 0, adjustmentType: 'increase' as const, isValid: false };
      }
      const newBal = +(curBal + add).toFixed(2);
      return {
        newBalance: newBal,
        amount: +add.toFixed(2),
        adjustmentType: 'increase' as const,
        isValid: true,
      };
    }

    return { newBalance: curBal, amount: 0, adjustmentType: 'decrease' as const, isValid: false };
  }, [partnerData, settlementMode, targetBalanceRaw, adjustmentAmountRaw]);

  // Filter list when selecting a partner from the modal
  const selectablePartners = useMemo(() => {
    const list: Array<{ type: 'customer' | 'supplier'; data: Customer | Supplier }> = [];
    if (filterType === 'all' || filterType === 'suppliers') {
      suppliers.forEach(s => list.push({ type: 'supplier', data: s }));
    }
    if (filterType === 'all' || filterType === 'customers') {
      customers.forEach(c => list.push({ type: 'customer', data: c }));
    }

    const q = partnerSearchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(item => {
      const name = item.data.name.toLowerCase();
      const phone = (item.data.phone || '').toLowerCase();
      const code = (item.data.code || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || code.includes(q);
    });
  }, [suppliers, customers, filterType, partnerSearchQuery]);

  if (!isOpen) return null;

  // Handle Save
  const handleConfirmSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedPartner || !selectedPartner.data) {
      setErrorMessage('يرجى اختيار العميل أو المورد أولاً');
      return;
    }

    if (!calculationResult.isValid || calculationResult.amount <= 0) {
      if (settlementMode === 'zero_balance') {
        setErrorMessage('رصيد هذا الطرف مساوٍ لصفر بالفعل، لا توجد فروقات للتسوية');
      } else {
        setErrorMessage('يرجى إدخال قيمة تسوية صحيحة أكبر من صفر');
      }
      return;
    }

    const finalReason = customReason.trim() ? customReason.trim() : reasonPreset;

    const newSettlement: PartnerSettlement = {
      id: `settlement_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      settlementNumber: settlementNumber || `SET-${Date.now().toString().slice(-6)}`,
      partnerType: selectedPartner.type,
      partnerId: selectedPartner.data.id,
      partnerName: selectedPartner.data.name,
      partnerPhone: selectedPartner.data.phone,
      partnerCode: selectedPartner.data.code,
      settlementMode: settlementMode === 'increase_balance' ? 'increase_balance' : settlementMode === 'discount' ? 'discount' : settlementMode,
      adjustmentType: calculationResult.adjustmentType,
      amount: calculationResult.amount,
      previousBalance: currentBalance,
      newBalance: calculationResult.newBalance,
      reason: finalReason,
      notes: notes.trim() || undefined,
      date: settlementDate || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    onSaveSettlement(newSettlement);
    setSavedSettlement(newSettlement);
  };

  const handlePrintVoucher = () => {
    window.print();
  };

  const handleCopyVoucherText = () => {
    if (!savedSettlement) return;
    const isCust = savedSettlement.partnerType === 'customer';
    const text = `
📜 *سند تسوية مالية معتمد*
رقم السند: ${savedSettlement.settlementNumber}
التاريخ: ${formatArabicDateTime(savedSettlement.date)}
الطرف: ${savedSettlement.partnerName} (${isCust ? 'عميل' : 'مورد'})
${savedSettlement.partnerPhone ? `الهاتف: ${savedSettlement.partnerPhone}` : ''}
---------------------------------
الرصيد السابق: ${formatCurrency(savedSettlement.previousBalance, partnerCurrency)}
مبلغ التسوية: ${formatCurrency(savedSettlement.amount, partnerCurrency)} (${savedSettlement.adjustmentType === 'decrease' ? 'خصم/تخفيض من الرصيد' : 'إضافة/زيادة على الرصيد'})
الرصيد الجديد بعد التسوية: ${formatCurrency(savedSettlement.newBalance, partnerCurrency)}
سبب التسوية: ${savedSettlement.reason}
${savedSettlement.notes ? `ملاحظات: ${savedSettlement.notes}` : ''}
---------------------------------
تمت التسوية بنجاح بواسطة نظام إدارة الحسابات
    `.trim();

    navigator.clipboard.writeText(text);
    setCopiedVoucher(true);
    setTimeout(() => setCopiedVoucher(false), 2500);
  };

  const handleResetForNew = () => {
    setSavedSettlement(null);
    setSelectedPartner(null);
    setAdjustmentAmountRaw('');
    setTargetBalanceRaw('0');
    setCustomReason('');
    setNotes('');
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={() => {
        if (!savedSettlement) onClose();
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700/90 rounded-3xl w-full max-w-2xl shadow-2xl text-slate-100 my-auto overflow-hidden animate-in zoom-in-95"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white border border-slate-750 flex items-center justify-center shadow-inner">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-black text-base sm:text-lg text-white flex items-center gap-2">
                <span>سند تسوية مالية</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-black text-white border border-slate-700 font-mono font-bold">
                  {selectedPartner ? (selectedPartner.type === 'supplier' ? 'مورد' : 'عميل') : 'عملاء وموردين'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                تصفية الأرصدة، مطابقة كشوف الحسابات، وتسجيل الخصومات والإعفاءات المحاسبية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {savedSettlement ? (
          /* Settlement Completed / Voucher Display */
          <div className="p-5 sm:p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg animate-in zoom-in">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-white">تم اعتماد وحفظ سند التسوية المالية بنجاح!</h3>
              <p className="text-xs text-slate-400">
                تم تحديث رصيد {savedSettlement.partnerType === 'supplier' ? 'المورد' : 'العميل'} في كشف الحساب وقاعدة البيانات فورياً.
              </p>
            </div>

            {/* Printable Voucher Card */}
            <div 
              id="printable-settlement-voucher"
              className="bg-slate-950 border-2 border-slate-700 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl text-xs relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[11px] text-slate-500 block">رقم السند:</span>
                  <span className="font-mono font-black text-white text-sm sm:text-base">
                    {savedSettlement.settlementNumber}
                  </span>
                </div>
                <div className="text-left">
                  <span className="text-[11px] text-slate-500 block">تاريخ التسوية:</span>
                  <span className="font-mono text-slate-300 font-bold">
                    {formatArabicDateTime(savedSettlement.date)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 py-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-slate-400 text-[11px] block">الطرف المعني:</span>
                  <div className="font-bold text-white text-sm mt-0.5 flex items-center gap-1.5">
                    {savedSettlement.partnerType === 'supplier' ? (
                      <Building className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                    <span>{savedSettlement.partnerName}</span>
                  </div>
                  {savedSettlement.partnerPhone && (
                    <span className="text-[10.5px] text-slate-400 font-mono block mt-0.5" dir="ltr">
                      {savedSettlement.partnerPhone}
                    </span>
                  )}
                </div>
                <div className="text-left">
                  <span className="text-slate-400 text-[11px] block">صفة الحساب:</span>
                  <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10.5px] font-bold ${
                    savedSettlement.partnerType === 'supplier' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {savedSettlement.partnerType === 'supplier' ? 'حساب مورد / دائن' : 'حساب عميل / مدين'}
                  </span>
                </div>
              </div>

              {/* Financial Balances Before & After */}
              <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/30">
                <div>
                  <span className="text-slate-400 text-[10.5px] block">الرصيد السابق</span>
                  <span className="font-mono font-bold text-slate-300 text-xs sm:text-sm">
                    {formatCurrency(savedSettlement.previousBalance, partnerCurrency)}
                  </span>
                </div>
                <div className="border-x border-slate-800">
                  <span className="text-indigo-300 text-[10.5px] font-bold block">
                    {savedSettlement.adjustmentType === 'decrease' ? 'مبلغ الخصم / التخفيض' : 'مبلغ الإضافة / الزيادة'}
                  </span>
                  <span className={`font-mono font-black text-sm sm:text-base ${
                    savedSettlement.adjustmentType === 'decrease' ? 'text-amber-400' : 'text-indigo-400'
                  }`}>
                    {savedSettlement.adjustmentType === 'decrease' ? '-' : '+'}{formatCurrency(savedSettlement.amount, partnerCurrency)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10.5px] block">الرصيد الجديد الفعلي</span>
                  <span className={`font-mono font-bold text-xs sm:text-sm ${
                    savedSettlement.newBalance === 0 ? 'text-emerald-400' : 'text-white'
                  }`}>
                    {formatCurrency(savedSettlement.newBalance, partnerCurrency)}
                  </span>
                </div>
              </div>

              {/* Reason / Statement */}
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10.5px] block">البيان وسبب التسوية:</span>
                <span className="text-slate-200 font-bold block mt-0.5">{savedSettlement.reason}</span>
                {savedSettlement.notes && (
                  <span className="text-slate-400 text-[10px] block mt-1 pt-1 border-t border-slate-800">
                    ملاحظات: {savedSettlement.notes}
                  </span>
                )}
              </div>

              {/* Signature lines for printing */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400">
                <div className="text-center">
                  <span className="block mb-6">توقيع المحاسب / المسؤول:</span>
                  <span className="block border-t border-dashed border-slate-700 w-28 mx-auto"></span>
                </div>
                <div className="text-center">
                  <span className="block mb-6">توقيع {savedSettlement.partnerType === 'supplier' ? 'المورد' : 'العميل'}:</span>
                  <span className="block border-t border-dashed border-slate-700 w-28 mx-auto"></span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleResetForNew}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
              >
                تسوية أخرى
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyVoucherText}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition-all active:scale-95"
                >
                  {copiedVoucher ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">تم النسخ!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-400" />
                      <span>نسخ ملخص السند</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePrintVoucher}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة السند</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all active:scale-95"
                >
                  تم الانتهاء
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleConfirmSettlement} className="p-4 sm:p-5 space-y-4 text-xs">
            {errorMessage && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Partner Selection (if not preselected) */}
            {!initialPartner && (
              <div className="space-y-2 bg-slate-850 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <label className="font-bold text-slate-300 text-xs flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    <span>تحديد الطرف المراد تسوية حسابه:</span>
                  </label>

                  {/* Filter Pills */}
                  <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-700/80 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setFilterType('customers')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        filterType === 'customers' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400'
                      }`}
                    >
                      العملاء ({customers.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('suppliers')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        filterType === 'suppliers' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'
                      }`}
                    >
                      الموردين ({suppliers.length})
                    </button>
                  </div>
                </div>

                {/* Partner search input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="ابحث بالاسم أو رقم الهاتف..."
                    value={partnerSearchQuery}
                    onChange={(e) => setPartnerSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Dropdown list */}
                <div className="max-h-36 overflow-y-auto space-y-1 pr-0.5">
                  {selectablePartners.length === 0 ? (
                    <div className="text-center py-3 text-slate-500 text-xs">لا يوجد طرف مطابق للبحث</div>
                  ) : (
                    selectablePartners.map((p) => {
                      const isSelected = selectedPartner?.data.id === p.data.id;
                      const bal = Number(p.data.balance) || 0;
                      return (
                        <div
                          key={`${p.type}_${p.data.id}`}
                          onClick={() => setSelectedPartner(p)}
                          className={`p-2 rounded-xl cursor-pointer flex items-center justify-between transition-all ${
                            isSelected 
                              ? 'bg-indigo-600/30 border border-indigo-500 text-white font-bold' 
                              : 'bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {p.type === 'supplier' ? (
                              <Building className="w-3.5 h-3.5 text-blue-400" />
                            ) : (
                              <User className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                            <div>
                              <span className="font-bold text-xs">{p.data.name}</span>
                              {p.data.phone && <span className="text-[10px] text-slate-400 mr-2">({p.data.phone})</span>}
                            </div>
                          </div>
                          <div className="text-left font-mono">
                            <span className={`text-xs font-bold ${bal > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                              {formatCurrency(bal, p.data.currency || currency)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Selected Partner Status Card */}
            {selectedPartner && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-850 via-slate-850 to-slate-800 border border-slate-750 flex flex-wrap items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm ${
                    selectedPartner.type === 'supplier' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {selectedPartner.type === 'supplier' ? <Building className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm">{selectedPartner.data.name}</h4>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        selectedPartner.type === 'supplier' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {selectedPartner.type === 'supplier' ? 'مورد' : 'عميل'}
                      </span>
                    </div>
                    {selectedPartner.data.phone && (
                      <span className="text-[11px] text-slate-400 font-mono" dir="ltr">
                        {selectedPartner.data.phone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-left">
                  <span className="text-[11px] text-slate-400 block">الرصيد الحالي المقيد:</span>
                  <span className={`font-mono font-black text-sm sm:text-base ${
                    currentBalance > 0 ? 'text-amber-400' : currentBalance < 0 ? 'text-blue-400' : 'text-emerald-400'
                  }`}>
                    {formatCurrency(currentBalance, partnerCurrency)}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {currentBalance > 0 
                      ? (selectedPartner.type === 'supplier' ? 'مستحق له في ذمتنا' : 'مطلوب منه في ذمته')
                      : currentBalance === 0 ? 'خالص الحساب (0.00)' : 'رصيد دائن مسبق'}
                  </span>
                </div>
              </div>
            )}

            {/* Settlement Mode Tabs */}
            <div className="space-y-2">
              <label className="font-bold text-slate-300 text-xs block">طريقة ونوع التسوية المالية:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* 1. Zero Balance */}
                <button
                  type="button"
                  onClick={() => setSettlementMode('zero_balance')}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    settlementMode === 'zero_balance'
                      ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold shadow-md'
                      : 'bg-slate-800/80 hover:bg-slate-800 border-slate-750 text-slate-300'
                  }`}
                >
                  <ArrowDownCircle className="w-4 h-4 mx-auto mb-1 text-indigo-400" />
                  <span className="block text-xs font-bold">تصفير الرصيد</span>
                  <span className="block text-[10px] text-slate-400">تصفية الحساب بالكامل إلى 0</span>
                </button>

                {/* 2. Target Balance */}
                <button
                  type="button"
                  onClick={() => setSettlementMode('target_balance')}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    settlementMode === 'target_balance'
                      ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold shadow-md'
                      : 'bg-slate-800/80 hover:bg-slate-800 border-slate-750 text-slate-300'
                  }`}
                >
                  <Scale className="w-4 h-4 mx-auto mb-1 text-indigo-400" />
                  <span className="block text-xs font-bold">مطابقة رصيد</span>
                  <span className="block text-[10px] text-slate-400">تحديد الرصيد الفعلي الجديد</span>
                </button>

                {/* 3. Discount / Deduct */}
                <button
                  type="button"
                  onClick={() => setSettlementMode('discount')}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    settlementMode === 'discount'
                      ? 'bg-amber-600/30 border-amber-500 text-white font-bold shadow-md'
                      : 'bg-slate-800/80 hover:bg-slate-800 border-slate-750 text-slate-300'
                  }`}
                >
                  <MinusCircle className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                  <span className="block text-xs font-bold">خصم تسوية</span>
                  <span className="block text-[10px] text-slate-400">إنقاص/إعفاء من الرصيد</span>
                </button>

                {/* 4. Increase Balance */}
                <button
                  type="button"
                  onClick={() => setSettlementMode('increase_balance')}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    settlementMode === 'increase_balance'
                      ? 'bg-blue-600/30 border-blue-500 text-white font-bold shadow-md'
                      : 'bg-slate-800/80 hover:bg-slate-800 border-slate-750 text-slate-300'
                  }`}
                >
                  <PlusCircle className="w-4 h-4 mx-auto mb-1 text-blue-400" />
                  <span className="block text-xs font-bold">إضافة للرصيد</span>
                  <span className="block text-[10px] text-slate-400">قيد مدين / إضافة مستحق</span>
                </button>
              </div>
            </div>

            {/* Mode-Specific Value Input */}
            {settlementMode === 'target_balance' && (
              <div className="p-3 bg-slate-850 rounded-2xl border border-slate-800 space-y-2">
                <label className="block text-slate-300 font-bold text-xs">
                  الرصيد الفعلي المراد اعتماده بعد المطابقة والجرد:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={targetBalanceRaw}
                    onChange={(e) => setTargetBalanceRaw(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                    {partnerCurrency}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  سيتم حساب مبلغ التسوية سواء بالخصم أو الإضافة آلياً للوصول لهذا الرقم.
                </p>
              </div>
            )}

            {(settlementMode === 'discount' || settlementMode === 'increase_balance') && (
              <div className="p-3 bg-slate-850 rounded-2xl border border-slate-800 space-y-2">
                <label className="block text-slate-300 font-bold text-xs">
                  {settlementMode === 'discount' ? 'مبلغ الخصم أو التخفيض من الرصيد:' : 'المبلغ المراد إضافته للرصيد:'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={adjustmentAmountRaw}
                    onChange={(e) => setAdjustmentAmountRaw(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                    {partnerCurrency}
                  </span>
                </div>
              </div>
            )}

            {/* Live Impact Preview Bar */}
            <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-slate-400 text-[10.5px] block">الرصيد السابق</span>
                <span className="font-mono font-bold text-slate-300 text-xs sm:text-sm">
                  {formatCurrency(currentBalance, partnerCurrency)}
                </span>
              </div>
              <div className="border-x border-slate-800">
                <span className="text-indigo-300 text-[10.5px] font-bold block">
                  {calculationResult.adjustmentType === 'decrease' ? 'مبلغ التسوية (خصم)' : 'مبلغ التسوية (إضافة)'}
                </span>
                <span className={`font-mono font-black text-sm sm:text-base ${
                  calculationResult.adjustmentType === 'decrease' ? 'text-amber-400' : 'text-blue-400'
                }`}>
                  {calculationResult.adjustmentType === 'decrease' ? '-' : '+'}{formatCurrency(calculationResult.amount, partnerCurrency)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10.5px] block">الرصيد الجديد الفعلي</span>
                <span className={`font-mono font-black text-xs sm:text-sm ${
                  calculationResult.newBalance === 0 ? 'text-emerald-400' : 'text-white'
                }`}>
                  {formatCurrency(calculationResult.newBalance, partnerCurrency)}
                </span>
              </div>
            </div>

            {/* Reason Presets & Custom Reason */}
            <div className="space-y-2">
              <label className="font-bold text-slate-300 text-xs block">بيان وسبب التسوية:</label>
              
              <div className="flex flex-wrap gap-1.5">
                {[
                  'تصفية وتصفير كامل الرصيد',
                  'مطابقة رصيد كشف الحساب والجرد الدوري',
                  activeType === 'customer' ? 'خصم تسوية مسموح به للعميل' : 'خصم تسوية مكتسب من المورد',
                  'إسقاط مديونية معدومة / إعفاء نهائي',
                  'تسوية فروقات تقريب وهلالات',
                  'تسوية رصيد افتتاحي سابق',
                  'تصحيح خطأ قيد في فاتورة سابقة',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setReasonPreset(preset);
                      setCustomReason('');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                      reasonPreset === preset && !customReason
                        ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200 font-bold'
                        : 'bg-slate-800 border-slate-700/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="أو اكتب بياناً مخصصاً للتسوية هنا..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder:text-slate-500 text-xs mt-1"
              />
            </div>

            {/* Date & Voucher Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 text-[11px] font-semibold mb-1">تاريخ ووقت التسوية:</label>
                <input
                  type="datetime-local"
                  required
                  value={settlementDate}
                  onChange={(e) => setSettlementDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] font-semibold mb-1">رقم سند التسوية:</label>
                <input
                  type="text"
                  required
                  value={settlementNumber}
                  onChange={(e) => setSettlementNumber(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-xs"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-slate-400 text-[11px] font-semibold mb-1">ملاحظات إضافية:</label>
              <input
                type="text"
                placeholder="أي تفاصيل أخرى تخص اعتماد التسوية أو رقم المحضر..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
              >
                إلغاء
              </button>

              <button
                type="submit"
                disabled={!selectedPartner || !calculationResult.isValid || calculationResult.amount <= 0}
                className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-lg transition-all ${
                  !selectedPartner || !calculationResult.isValid || calculationResult.amount <= 0
                    ? 'bg-slate-800 opacity-50 cursor-not-allowed text-slate-400'
                    : 'bg-black hover:bg-slate-900 border border-slate-750 active:scale-95 shadow-md'
                }`}
              >
                <Check className="w-4 h-4 text-white" />
                <span className="text-white font-bold">اعتماد وحفظ التسوية</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
