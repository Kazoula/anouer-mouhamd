import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  X, 
  Check, 
  Printer, 
  Copy, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Calendar, 
  CreditCard, 
  FileText, 
  Building, 
  User, 
  Receipt,
  Search,
  CheckCircle2,
  RefreshCw,
  Share2,
  Phone,
  Tag
} from 'lucide-react';
import { Customer, Supplier, PartnerPayment } from '../types';
import { formatCurrency, formatArabicDateTime } from '../utils/calculations';

interface PaymentModalProps {
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
  onSavePayment: (payment: PartnerPayment) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  partner: initialPartner = null,
  currency,
  suppliers = [],
  customers = [],
  defaultType = 'supplier',
  onClose,
  onSavePayment,
}) => {
  // Active partner selected inside modal
  const [selectedPartner, setSelectedPartner] = useState<{
    type: 'customer' | 'supplier';
    data: Customer | Supplier;
  } | null>(initialPartner);

  // Search & filter state when no partner is selected yet
  const [partnerSearchQuery, setPartnerSearchQuery] = useState('');
  const [onlyShowDebtPartners, setOnlyShowDebtPartners] = useState(true);

  // Synchronize when initialPartner prop changes
  useEffect(() => {
    setSelectedPartner(initialPartner);
  }, [initialPartner]);

  const activeType = selectedPartner ? selectedPartner.type : defaultType;
  const isCustomer = activeType === 'customer';
  const partnerData = selectedPartner ? selectedPartner.data : null;
  const currentBalance = partnerData ? Number(partnerData.balance) || 0 : 0;

  // Form State
  const [amount, setAmount] = useState<number>(0);
  const [amountRaw, setAmountRaw] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'check'>('cash');
  const [bankName, setBankName] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Success / Receipt View State
  const [savedPayment, setSavedPayment] = useState<PartnerPayment | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Reset form when active partner changes
  useEffect(() => {
    if (selectedPartner && selectedPartner.data) {
      const bal = Number(selectedPartner.data.balance) || 0;
      setAmount(bal > 0 ? bal : 0);
      setAmountRaw(bal > 0 ? String(bal) : '');
      const prefix = selectedPartner.type === 'customer' ? 'REC' : 'PAY';
      const rand = Math.floor(1000 + Math.random() * 9000);
      setReceiptNumber(`${prefix}-${new Date().getFullYear()}-${rand}`);
      setNotes(
        selectedPartner.type === 'customer' 
          ? 'تسديد دفعة من حساب العميل' 
          : 'تسديد دفعة لحساب المورد (سند صرف)'
      );
      setBankName('');
      setReferenceNumber('');
      setSavedPayment(null);
      setErrorMessage('');
    }
  }, [selectedPartner]);

  // Filtered partners list when selecting
  const availablePartnersList = useMemo(() => {
    if (activeType === 'supplier') {
      return suppliers.filter(s => {
        const matchesQuery = partnerSearchQuery === '' || 
          s.name.toLowerCase().includes(partnerSearchQuery.toLowerCase()) ||
          (s.code && s.code.toLowerCase().includes(partnerSearchQuery.toLowerCase())) ||
          (s.phone && s.phone.includes(partnerSearchQuery)) ||
          (s.group && s.group.toLowerCase().includes(partnerSearchQuery.toLowerCase()));
        
        if (!matchesQuery) return false;
        if (onlyShowDebtPartners) return (Number(s.balance) || 0) > 0;
        return true;
      });
    } else {
      return customers.filter(c => {
        const matchesQuery = partnerSearchQuery === '' || 
          c.name.toLowerCase().includes(partnerSearchQuery.toLowerCase()) ||
          (c.phone && c.phone.includes(partnerSearchQuery));
        
        if (!matchesQuery) return false;
        if (onlyShowDebtPartners) return (Number(c.balance) || 0) > 0;
        return true;
      });
    }
  }, [activeType, suppliers, customers, partnerSearchQuery, onlyShowDebtPartners]);

  if (!isOpen) return null;

  const handleAmountChange = (val: string) => {
    setAmountRaw(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0) {
      setAmount(parsed);
      setErrorMessage('');
    } else if (val === '') {
      setAmount(0);
    }
  };

  const addPresetAmount = (increment: number) => {
    const next = amount + increment;
    setAmount(next);
    setAmountRaw(String(next));
    setErrorMessage('');
  };

  const setFullBalance = () => {
    if (currentBalance > 0) {
      setAmount(currentBalance);
      setAmountRaw(String(currentBalance));
      setErrorMessage('');
    }
  };

  const setHalfBalance = () => {
    if (currentBalance > 0) {
      const half = +(currentBalance / 2).toFixed(2);
      setAmount(half);
      setAmountRaw(String(half));
      setErrorMessage('');
    }
  };

  // Expected new balance
  const newBalance = Number((currentBalance - amount).toFixed(2));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner || !selectedPartner.data) {
      setErrorMessage('يرجى اختيار المورد أولاً');
      return;
    }
    if (amount <= 0) {
      setErrorMessage('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    const partnerCode = 'code' in selectedPartner.data ? selectedPartner.data.code : undefined;

    const newPaymentRecord: PartnerPayment = {
      id: 'pay_' + Date.now().toString() + '_' + Math.random().toString(36).substring(2, 6),
      receiptNumber: receiptNumber.trim() || `${isCustomer ? 'REC' : 'PAY'}-${Date.now().toString().slice(-6)}`,
      partnerType: selectedPartner.type,
      partnerId: selectedPartner.data.id,
      partnerName: selectedPartner.data.name,
      partnerPhone: selectedPartner.data.phone,
      partnerCode,
      amount: Number(amount.toFixed(2)),
      date: paymentDate,
      paymentMethod,
      bankName: bankName.trim() || undefined,
      referenceNumber: referenceNumber.trim() || undefined,
      previousBalance: currentBalance,
      newBalance,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    onSavePayment(newPaymentRecord);
    setSavedPayment(newPaymentRecord);
  };

  const handleCopyReceipt = () => {
    if (!savedPayment) return;
    const isSup = savedPayment.partnerType === 'supplier';
    const lines = [
      `=== ${isSup ? 'سند صرف نقدية (تسديد مورد)' : 'سند قبض نقدية (إيصال سداد)'} ===`,
      `رقم السند: ${savedPayment.receiptNumber}`,
      `التاريخ: ${formatArabicDateTime(savedPayment.date)}`,
      `${isSup ? 'المورد' : 'العميل'}: ${savedPayment.partnerName}${savedPayment.partnerCode ? ` (${savedPayment.partnerCode})` : ''}`,
      savedPayment.partnerPhone ? `الهاتف: ${savedPayment.partnerPhone}` : '',
      `المبلغ المسدد: ${formatCurrency(savedPayment.amount, currency)}`,
      `طريقة الدفع: ${
        savedPayment.paymentMethod === 'cash' ? 'نقداً (Cash)' :
        savedPayment.paymentMethod === 'card' ? 'بطاقة بنكية / شبكة' :
        savedPayment.paymentMethod === 'transfer' ? 'تحويل بنكي' : 'شيك بنكي'
      }`,
      savedPayment.bankName ? `البنك: ${savedPayment.bankName}` : '',
      savedPayment.referenceNumber ? `رقم المرجع/الشيك: ${savedPayment.referenceNumber}` : '',
      `الرصيد السابق: ${formatCurrency(savedPayment.previousBalance, currency)}`,
      `الرصيد المتبقي: ${formatCurrency(savedPayment.newBalance, currency)}`,
      savedPayment.notes ? `البيان: ${savedPayment.notes}` : '',
      '----------------------------------------',
      'تم تحرير السند بنجاح عبر النظام المحاسبي.',
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(lines);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRecordAnother = () => {
    setSavedPayment(null);
    setSelectedPartner(null);
    setAmount(0);
    setAmountRaw('');
    setErrorMessage('');
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl p-4 sm:p-6 shadow-2xl text-slate-100 my-auto max-h-[95vh] overflow-y-auto animate-in zoom-in-95"
      >
        {/* ========================================================
            CASE 1: PAYMENT JUST SAVED -> SHOW RECEIPT & PRINT PREVIEW
           ======================================================== */}
        {savedPayment ? (
          <div className="space-y-4">
            <div className="text-center py-2 no-print">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2 border border-emerald-500/30 shadow-lg shadow-emerald-950/40">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h3 className="text-lg font-black text-white">
                {savedPayment.partnerType === 'supplier'
                  ? 'تم تسجيل عملية الدفع وسند الصرف بنجاح!'
                  : 'تم تسجيل سند القبض والتحصيل بنجاح!'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تم خصم المبلغ من رصيد {savedPayment.partnerType === 'supplier' ? 'المورد' : 'العميل'} وتحديث الحساب المالي فوراً
              </p>
            </div>

            {/* Receipt Card (Visible on Screen and formatted for Print) */}
            <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-4 sm:p-6 space-y-3.5 font-sans text-xs printable-area shadow-xl">
              {/* Header inside Voucher */}
              <div className="flex justify-between items-center pb-3 border-b-2 border-slate-750 text-slate-400">
                <div>
                  <span className="text-xs font-bold text-slate-400 block">
                    {savedPayment.partnerType === 'supplier' ? 'سند صرف نقدية / بنكي' : 'سند قبض نقدية'}
                  </span>
                  <span className="text-sm sm:text-base font-black text-white font-mono">
                    {savedPayment.receiptNumber}
                  </span>
                </div>
                <div className="text-left">
                  <span className="text-[11px] text-slate-400 block">التاريخ والوقت</span>
                  <span className="text-xs font-bold text-slate-200">
                    {formatArabicDateTime(savedPayment.date)}
                  </span>
                </div>
              </div>

              {/* Partner and Payment Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {savedPayment.partnerType === 'supplier' ? 'اسم المورد المستفيد:' : 'اسم العميل المسدد:'}
                  </span>
                  <span className="font-extrabold text-white text-sm">
                    {savedPayment.partnerName}
                  </span>
                  {savedPayment.partnerCode && (
                    <span className="block text-blue-400 font-mono text-[10px] font-bold">
                      كود: {savedPayment.partnerCode}
                    </span>
                  )}
                  {savedPayment.partnerPhone && (
                    <span className="block text-slate-400 text-[10px] font-mono mt-0.5">
                      هاتف: {savedPayment.partnerPhone}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">طريقة الدفع:</span>
                  <span className="font-bold text-amber-300 text-xs sm:text-sm">
                    {savedPayment.paymentMethod === 'cash' ? 'نقداً (من الصندوق / الخزينة)' :
                     savedPayment.paymentMethod === 'card' ? 'بطاقة بنكية / شبكة' :
                     savedPayment.paymentMethod === 'transfer' ? 'تحويل بنكي / إلكتروني' : 'شيك بنكي'}
                  </span>
                  {savedPayment.bankName && (
                    <span className="block text-slate-400 text-[10px]">
                      البنك: {savedPayment.bankName}
                    </span>
                  )}
                  {savedPayment.referenceNumber && (
                    <span className="block text-slate-400 text-[10px] font-mono">
                      رقم المرجع/الشيك: {savedPayment.referenceNumber}
                    </span>
                  )}
                </div>
              </div>

              {/* Amount Banner */}
              <div className="p-3.5 bg-emerald-950/40 rounded-xl border border-emerald-800/40 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-emerald-300 font-bold block">المبلغ المدفوع (سند الصرف):</span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                    {formatCurrency(savedPayment.amount, currency)}
                  </span>
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 block">الرصيد المتبقي بعد الدفع:</span>
                  <span className={`text-sm sm:text-base font-bold font-mono ${
                    savedPayment.newBalance === 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {formatCurrency(savedPayment.newBalance, currency)}
                    {savedPayment.newBalance === 0 && (
                      <span className="text-[10px] font-sans mr-1 text-emerald-400">(خالص ✓)</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Financial Balance Recap */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                <div>
                  <span>الرصيد السابق قبل السداد: </span>
                  <b className="text-slate-200 font-mono">{formatCurrency(savedPayment.previousBalance, currency)}</b>
                </div>
                <div className="text-left">
                  <span>الرصيد المتبقي: </span>
                  <b className="text-amber-300 font-mono">{formatCurrency(savedPayment.newBalance, currency)}</b>
                </div>
              </div>

              {savedPayment.notes && (
                <div className="text-slate-400 text-[11px] bg-slate-900/50 p-2 rounded-lg border border-slate-800/60">
                  <span className="font-bold text-slate-300">البيان: </span>
                  <span className="text-slate-200">{savedPayment.notes}</span>
                </div>
              )}

              {/* Signatures section for print */}
              <div className="hidden print:grid grid-cols-3 gap-4 pt-8 text-center text-xs text-slate-900 border-t border-slate-300 mt-6">
                <div>
                  <span className="block font-bold">توقيع المستلم (المورد):</span>
                  <span className="block mt-8 text-slate-400">..............................</span>
                </div>
                <div>
                  <span className="block font-bold">أمين الصندوق / المحاسب:</span>
                  <span className="block mt-8 text-slate-400">..............................</span>
                </div>
                <div>
                  <span className="block font-bold">اعتماد الإدارة:</span>
                  <span className="block mt-8 text-slate-400">..............................</span>
                </div>
              </div>
            </div>

            {/* Receipt Actions Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-1 no-print">
              <button
                type="button"
                onClick={handleCopyReceipt}
                className="flex-1 min-w-[120px] py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition-all active:scale-95"
              >
                {copiedReceipt ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                <span>{copiedReceipt ? 'تم نسخ الإيصال!' : 'نسخ السند (واتساب)'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 min-w-[120px] py-2.5 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Printer className="w-4 h-4 text-blue-400" />
                <span>طباعة السند الرسمي</span>
              </button>

              <button
                type="button"
                onClick={handleRecordAnother}
                className="flex-1 min-w-[120px] py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition-all active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>تسجيل دفعة أخرى</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex-1 min-w-[100px] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
              >
                <span>إتمام</span>
              </button>
            </div>
          </div>
        ) : !selectedPartner ? (
          /* ========================================================
              CASE 2: NO PARTNER SELECTED YET -> SELECT SUPPLIER SCREEN
             ======================================================== */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    تسجيل سند صرف (دفع لمورد)
                  </h3>
                  <p className="text-xs text-slate-400">
                    اختر المورد المراد سداد دفعة نقدية أو بنكية لحسابه
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="close-circle-btn"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search and Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم، الكود، رقم الهاتف أو التصنيف..."
                  value={partnerSearchQuery}
                  onChange={(e) => setPartnerSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-750 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  autoFocus
                />
                {partnerSearchQuery && (
                  <button
                    onClick={() => setPartnerSearchQuery('')}
                    className="absolute left-2.5 top-2.5 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-[11px] select-none">
                  <input
                    type="checkbox"
                    checked={onlyShowDebtPartners}
                    onChange={(e) => setOnlyShowDebtPartners(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 bg-slate-950 border-slate-750"
                  />
                  <span>عرض الموردين أصحاب الذمم والديون فقط (رصيد &gt; 0)</span>
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  {availablePartnersList.length} مورد
                </span>
              </div>
            </div>

            {/* Suppliers List to Pick from */}
            <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1 pl-1">
              {availablePartnersList.length === 0 ? (
                <div className="text-center py-8 bg-slate-950/50 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                  <p className="font-bold text-slate-300">لا يوجد موردين مطابقين للبحث</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {onlyShowDebtPartners ? 'قد لا يكون هناك موردين لديهم ديون مستحقة، أو قم بإلغاء التصفية.' : 'تأكد من كتابة الاسم أو الكود بشكل صحيح.'}
                  </p>
                </div>
              ) : (
                availablePartnersList.map((sup) => {
                  const bal = Number(sup.balance) || 0;
                  const supCode = 'code' in sup ? sup.code : undefined;
                  const supGroup = 'group' in sup ? sup.group : undefined;
                  const supCurrency = ('currency' in sup && sup.currency) ? sup.currency : currency;

                  return (
                    <div
                      key={sup.id}
                      onClick={() => setSelectedPartner({ type: 'supplier', data: sup })}
                      className="bg-slate-950/80 hover:bg-slate-850 hover:border-amber-500/50 border border-slate-800 rounded-2xl p-3 cursor-pointer transition-all flex items-center justify-between gap-2 group shadow-xs active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 group-hover:bg-amber-500/20">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-xs sm:text-sm truncate">
                              {sup.name}
                            </span>
                            {supCode && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] font-mono font-bold">
                                {supCode}
                              </span>
                            )}
                            {supGroup && (
                              <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                                {supGroup}
                              </span>
                            )}
                          </div>
                          {sup.phone && (
                            <span className="text-[11px] text-slate-400 font-mono block mt-0.5" dir="ltr">
                              {sup.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-left shrink-0">
                        <span className="text-[10px] text-slate-400 block">المستحق له:</span>
                        <span className={`text-xs sm:text-sm font-black font-mono ${
                          bal > 0 ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {formatCurrency(bal, supCurrency)}
                        </span>
                        <span className="inline-block mt-1 text-[10px] font-bold text-amber-400 group-hover:underline">
                          تسديد الدفعة ←
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================
              CASE 3: PARTNER SELECTED -> PAYMENT FORM
             ======================================================== */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Header with Switch Partner button */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border ${
                  isCustomer
                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}>
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-1.5">
                    <span>{isCustomer ? 'سند قبض نقدية' : 'سند صرف نقدية / بنكي'}</span>
                    <span className={`text-[11px] font-normal ${isCustomer ? 'text-yellow-400' : 'text-amber-400'}`}>
                      ({isCustomer ? 'قبض من عميل' : 'دفع للمورد'})
                    </span>
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs font-bold text-white">{partnerData.name}</span>
                    {'code' in partnerData && partnerData.code && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold">
                        {partnerData.code}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedPartner(null)}
                      className="text-[11px] text-blue-400 hover:text-blue-300 underline mr-1 cursor-pointer"
                    >
                      ({isCustomer ? 'تغيير العميل' : 'تغيير المورد'})
                    </button>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="close-circle-btn"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Debt & Balance Banner */}
            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <span className="text-slate-400 text-xs block">
                  {isCustomer ? 'الرصيد والذمة الحالية المطلوبة من العميل:' : 'الرصيد المستحق للمورد حالياً (الدين المسجل):'}
                </span>
                <span className={`text-lg sm:text-xl font-black font-mono ${
                  currentBalance > 0 ? 'text-amber-400' : currentBalance < 0 ? 'text-emerald-400' : 'text-slate-300'
                }`}>
                  {formatCurrency(currentBalance, currency)}
                </span>
                {currentBalance > 0 && (
                  <span className="text-[11px] text-amber-300/80 block mt-0.5">
                    {isCustomer ? 'مطلوب تحصيل هذا المبلغ منه' : 'مطلوب سداد هذا المبلغ له لتصفية الحساب'}
                  </span>
                )}
              </div>

              {currentBalance > 0 && (
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={setFullBalance}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95 shadow-xs"
                    title="تسديد الرصيد بالكامل"
                  >
                    <Check className="w-3.5 h-3.5 text-amber-400" />
                    <span>كامل الرصيد</span>
                  </button>
                  <button
                    type="button"
                    onClick={setHalfBalance}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all active:scale-95"
                    title="تسديد 50% من الرصيد"
                  >
                    <span>50%</span>
                  </button>
                </div>
              )}
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                مبلغ السند / الدفعة المسددة <span className="text-red-400">*</span>
              </label>
              <div className="flex items-center rounded-2xl border border-slate-750 bg-slate-950 px-3.5 py-1 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all shadow-inner">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={amountRaw}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 min-w-0 bg-transparent text-amber-400 font-mono text-xl sm:text-2xl font-black py-2 px-1 focus:outline-none text-left"
                  dir="ltr"
                  required
                  autoFocus
                />
                <span className="shrink-0 mr-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 font-mono font-bold text-xs sm:text-sm select-none">
                  {currency}
                </span>
              </div>

              {/* Quick Amount Increment Pills */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap text-xs">
                <span className="text-[11px] text-slate-400 ml-1">إضافة سريعة:</span>
                {[100, 500, 1000, 2000, 5000, 10000].map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => addPresetAmount(inc)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-[11px] font-mono font-bold transition-all active:scale-95"
                  >
                    +{inc.toLocaleString()}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setAmount(0);
                    setAmountRaw('');
                  }}
                  className="px-2 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-800/40 text-[10.5px] transition-all"
                >
                  مسح
                </button>
              </div>

              {errorMessage && (
                <p className="text-xs text-red-400 mt-1.5 font-semibold">{errorMessage}</p>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                طريقة الدفع والصرف
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: 'cash', label: 'نقداً (خزينة)', icon: Wallet },
                  { id: 'transfer', label: 'تحويل بنكي', icon: Building },
                  { id: 'check', label: 'شيك بنكي', icon: Receipt },
                  { id: 'card', label: 'بطاقة / شبكة', icon: CreditCard },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = paymentMethod === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPaymentMethod(item.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                        isSelected 
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md'
                          : 'bg-slate-800/60 border-slate-750 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[11px]">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Bank / Cheque Details when applicable */}
            {(paymentMethod === 'transfer' || paymentMethod === 'check') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800 animate-in fade-in">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold text-[11px]">
                    اسم البنك / الحساب المسحوب منه
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="مثال: مصرف الراجحي / البنك الأهلي"
                    className="w-full bg-slate-900 text-slate-200 px-3 py-2 rounded-xl border border-slate-750 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold text-[11px]">
                    {paymentMethod === 'transfer' ? 'رقم الحوالة البنكية / المرجع' : 'رقم الشيك البنكي'}
                  </label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="رقم العملية أو المرجع"
                    className="w-full bg-slate-900 text-slate-200 font-mono px-3 py-2 rounded-xl border border-slate-750 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            {/* Date and Receipt Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  تاريخ ووقت السداد
                </label>
                <input
                  type="datetime-local"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-750 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  رقم سند الصرف / الإيصال
                </label>
                <input
                  type="text"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="PAY-2026-..."
                  className="w-full bg-slate-950 text-slate-200 font-mono px-3 py-2 rounded-xl border border-slate-750 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Notes / Statement */}
            <div>
              <label className="block text-slate-400 mb-1 font-semibold text-xs">
                البيان / ملاحظات سند الصرف
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: تسديد دفعة من حساب التوريد"
                className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-750 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Realtime Balance Simulation Preview */}
            <div className="p-3.5 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
              <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                <span>{isCustomer ? 'معاينة وتأثير السند على رصيد العميل:' : 'معاينة وتأثير السند على حساب المورد:'}</span>
                <span className="font-mono text-slate-500">حساب فوري</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>{isCustomer ? 'الرصيد السابق المطلوب من العميل:' : 'الرصيد السابق المستحق للمورد:'}</span>
                <span className="font-mono text-slate-300 font-bold">{formatCurrency(currentBalance, currency)}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-400 font-bold">
                <span>{isCustomer ? 'المبلغ المقبوض (سند القبض):' : 'المبلغ المدفوع (سند الصرف):'}</span>
                <span className="font-mono">-{formatCurrency(amount, currency)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800 font-bold">
                <span className="text-white">{isCustomer ? 'الرصيد المتبقي المطلوب من العميل:' : 'الرصيد المتبقي الجديد للمورد:'}</span>
                <span className={`font-mono text-base ${
                  newBalance === 0 ? 'text-emerald-400 font-black' : newBalance > 0 ? (isCustomer ? 'text-yellow-400 font-black' : 'text-amber-400 font-black') : 'text-blue-400'
                }`}>
                  {formatCurrency(newBalance, currency)}
                  {newBalance === 0 && <span className="mr-1.5 text-[11px] text-emerald-400 font-sans font-bold">(خالص الحساب ✓)</span>}
                </span>
              </div>
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition-all active:scale-95"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={amount <= 0}
                className={`flex-2 py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg transition-all ${
                  amount > 0 
                    ? isCustomer
                      ? 'bg-yellow-400 hover:bg-yellow-300 text-slate-950 shadow-yellow-950/50 cursor-pointer active:scale-95 font-black'
                      : 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-amber-950/50 cursor-pointer active:scale-95 font-black' 
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750'
                }`}
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isCustomer ? 'حفظ سند القبض وتأكيد التحصيل' : 'حفظ سند الصرف وتأكيد الدفع'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
