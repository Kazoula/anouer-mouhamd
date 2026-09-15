import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  X, 
  Check, 
  Printer, 
  Share2, 
  Copy, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Calendar, 
  DollarSign, 
  CreditCard, 
  FileText, 
  Building, 
  User, 
  Receipt 
} from 'lucide-react';
import { Customer, Supplier, PartnerPayment } from '../types';
import { formatCurrency, formatArabicDateTime } from '../utils/calculations';

interface PaymentModalProps {
  isOpen: boolean;
  partner: {
    type: 'customer' | 'supplier';
    data: Customer | Supplier;
  } | null;
  currency: string;
  onClose: () => void;
  onSavePayment: (payment: PartnerPayment) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  partner,
  currency,
  onClose,
  onSavePayment,
}) => {
  if (!isOpen || !partner) return null;

  const isCustomer = partner.type === 'customer';
  const partnerData = partner.data;
  const currentBalance = Number(partnerData.balance) || 0;

  // Form State
  const [amount, setAmount] = useState<number>(() => {
    return currentBalance > 0 ? currentBalance : 0;
  });
  const [amountRaw, setAmountRaw] = useState<string>(() => {
    return currentBalance > 0 ? String(currentBalance) : '';
  });
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'check'>('cash');
  const [paymentDate, setPaymentDate] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [receiptNumber, setReceiptNumber] = useState<string>(() => {
    const prefix = isCustomer ? 'REC' : 'PAY';
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${new Date().getFullYear()}-${rand}`;
  });
  const [notes, setNotes] = useState<string>(
    isCustomer ? 'تسديد دفعة من حساب العميل' : 'تسديد دفعة لحساب المورد'
  );

  // Success / Receipt View State
  const [savedPayment, setSavedPayment] = useState<PartnerPayment | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Reset when partner changes
  useEffect(() => {
    if (partner) {
      const bal = Number(partner.data.balance) || 0;
      setAmount(bal > 0 ? bal : 0);
      setAmountRaw(bal > 0 ? String(bal) : '');
      const prefix = partner.type === 'customer' ? 'REC' : 'PAY';
      const rand = Math.floor(1000 + Math.random() * 9000);
      setReceiptNumber(`${prefix}-${new Date().getFullYear()}-${rand}`);
      setNotes(
        partner.type === 'customer' 
          ? 'تسديد دفعة من حساب العميل' 
          : 'تسديد دفعة لحساب المورد'
      );
      setSavedPayment(null);
      setErrorMessage('');
    }
  }, [partner]);

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

  // Expected new balance
  // For customer: balance decreases by payment amount
  // For supplier: balance decreases by payment amount
  const newBalance = Number((currentBalance - amount).toFixed(2));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setErrorMessage('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    const newPaymentRecord: PartnerPayment = {
      id: 'pay_' + Date.now().toString() + '_' + Math.random().toString(36).substring(2, 6),
      receiptNumber: receiptNumber.trim() || `REC-${Date.now().toString().slice(-6)}`,
      partnerType: partner.type,
      partnerId: partnerData.id,
      partnerName: partnerData.name,
      partnerPhone: partnerData.phone,
      amount: Number(amount.toFixed(2)),
      date: paymentDate,
      paymentMethod,
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
    const lines = [
      `=== ${isCustomer ? 'سند قبض نقدية (إيصال سداد)' : 'سند صرف نقدية (تسديد مورد)'} ===`,
      `رقم السند: ${savedPayment.receiptNumber}`,
      `التاريخ: ${formatArabicDateTime(savedPayment.date)}`,
      `${isCustomer ? 'العميل' : 'المورد'}: ${savedPayment.partnerName}`,
      savedPayment.partnerPhone ? `الهاتف: ${savedPayment.partnerPhone}` : '',
      `المبلغ المسدد: ${formatCurrency(savedPayment.amount, currency)}`,
      `طريقة الدفع: ${
        savedPayment.paymentMethod === 'cash' ? 'نقداً (Cash)' :
        savedPayment.paymentMethod === 'card' ? 'بطاقة بنكية' :
        savedPayment.paymentMethod === 'transfer' ? 'تحويل بنكي / CCP' : 'شيك بنكي'
      }`,
      `الرصيد السابق: ${formatCurrency(savedPayment.previousBalance, currency)}`,
      `الرصيد المتبقي: ${formatCurrency(savedPayment.newBalance, currency)}`,
      savedPayment.notes ? `البيان: ${savedPayment.notes}` : '',
      '----------------------------------------',
      'شكراً لتعاملكم معنا!',
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(lines);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-4 sm:p-6 shadow-2xl text-slate-100 my-auto max-h-[95vh] overflow-y-auto animate-in zoom-in-95"
      >
        {/* If payment just saved: show completed receipt preview */}
        {savedPayment ? (
          <div className="space-y-4">
            <div className="text-center py-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2 border border-emerald-500/30">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h3 className="text-lg font-black text-white">
                تم تسجيل عملية الدفع بنجاح!
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تم تحديث رصيد {isCustomer ? 'العميل' : 'المورد'} وحفظ سند {isCustomer ? 'القبض' : 'الصرف'}
              </p>
            </div>

            {/* Receipt Card */}
            <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 space-y-3 font-sans text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800 text-slate-400">
                <span>رقم السند: <b className="text-white font-mono">{savedPayment.receiptNumber}</b></span>
                <span>{formatArabicDateTime(savedPayment.date)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div>
                  <span className="text-slate-400 block text-[11px]">{isCustomer ? 'العميل:' : 'المورد:'}</span>
                  <span className="font-bold text-white text-sm">{savedPayment.partnerName}</span>
                  {savedPayment.partnerPhone && (
                    <span className="block text-slate-400 text-[10px] font-mono">{savedPayment.partnerPhone}</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">طريقة الدفع:</span>
                  <span className="font-bold text-amber-300">
                    {savedPayment.paymentMethod === 'cash' ? 'نقداً (Cash)' :
                     savedPayment.paymentMethod === 'card' ? 'بطاقة بنكية' :
                     savedPayment.paymentMethod === 'transfer' ? 'تحويل بنكي / CCP' : 'شيك بنكي'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-800/40 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-emerald-300 block">المبلغ المسدد (الدفعة):</span>
                  <span className="text-xl font-black text-emerald-400 font-mono">
                    {formatCurrency(savedPayment.amount, currency)}
                  </span>
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 block">الرصيد المتبقي:</span>
                  <span className={`text-sm font-bold font-mono ${savedPayment.newBalance === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {formatCurrency(savedPayment.newBalance, currency)}
                  </span>
                </div>
              </div>

              {savedPayment.notes && (
                <div className="text-slate-400 text-[11px] pt-1">
                  <span>البيان: </span>
                  <span className="text-slate-200">{savedPayment.notes}</span>
                </div>
              )}
            </div>

            {/* Receipt Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyReceipt}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition-all"
              >
                {copiedReceipt ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                <span>{copiedReceipt ? 'تم نسخ الإيصال!' : 'نسخ الإيصال'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition-all"
              >
                <Printer className="w-4 h-4 text-blue-400" />
                <span>طباعة السند</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/40 transition-all"
              >
                <span>إتمام والعودة</span>
              </button>
            </div>
          </div>
        ) : (
          /* Payment Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-1.5">
                    <span>عملية الدفع</span>
                    <span className="text-xs font-normal text-amber-400">
                      ({isCustomer ? 'تسجيل سند قبض' : 'تسجيل سند صرف'})
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isCustomer ? 'قبض دفعة من العميل' : 'صرف دفعة للمورد'}: <b className="text-white">{partnerData.name}</b>
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

            {/* Current Debt & Balance Banner */}
            <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <span className="text-slate-400 text-xs block">
                  {isCustomer ? 'الرصيد والذمة الحالية المطلوبة:' : 'الرصيد المستحق للمورد حالياً:'}
                </span>
                <span className={`text-base sm:text-lg font-black font-mono ${
                  currentBalance > 0 ? 'text-amber-400' : currentBalance < 0 ? 'text-emerald-400' : 'text-slate-300'
                }`}>
                  {formatCurrency(currentBalance, currency)}
                </span>
                {currentBalance > 0 && (
                  <span className="text-[11px] text-amber-300/80 block mt-0.5">
                    {isCustomer ? 'مطلوب منه هذا المبلغ' : 'مطلوب له هذا المبلغ'}
                  </span>
                )}
              </div>

              {currentBalance > 0 && (
                <button
                  type="button"
                  onClick={setFullBalance}
                  className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs shrink-0"
                >
                  <Check className="w-3.5 h-3.5 text-amber-400" />
                  <span>تسديد كامل الرصيد ({formatCurrency(currentBalance, currency)})</span>
                </button>
              )}
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                مبلغ الدفعة المسدد <span className="text-red-400">*</span>
              </label>
              <div className="flex items-center rounded-2xl border border-slate-750 bg-slate-950 px-3.5 py-1 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={amountRaw}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 min-w-0 bg-transparent text-emerald-400 font-mono text-xl sm:text-2xl font-black py-2 px-1 focus:outline-none text-left"
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
                {[1000, 2000, 5000, 10000, 20000].map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => addPresetAmount(inc)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-mono font-bold transition-all active:scale-95"
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
                طريقة الدفع
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: 'cash', label: 'نقداً (Cash)', icon: DollarSign },
                  { id: 'card', label: 'بطاقة بنكية', icon: CreditCard },
                  { id: 'transfer', label: 'تحويل / CCP', icon: Building },
                  { id: 'check', label: 'شيك بنكي', icon: Receipt },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = paymentMethod === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPaymentMethod(item.id as any)}
                      className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                        isSelected 
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
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

            {/* Date and Receipt Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  تاريخ ووقت السداد
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-750 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  رقم السند / الإيصال
                </label>
                <input
                  type="text"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="REC-2026-..."
                  className="w-full bg-slate-950 text-slate-200 font-mono px-3 py-2 rounded-xl border border-slate-750 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-slate-400 mb-1 font-semibold text-xs">
                البيان / ملاحظات الدفعة
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: تسديد دفعة نقدية من الحساب"
                className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-750 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Balance Preview Simulation */}
            <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
              <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <span>معاينة الرصيد بعد السداد:</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>الرصيد السابق:</span>
                <span className="font-mono text-slate-300">{formatCurrency(currentBalance, currency)}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-400 font-semibold">
                <span>المبلغ المسدد (الدفعة):</span>
                <span className="font-mono">-{formatCurrency(amount, currency)}</span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-slate-800 font-bold">
                <span className="text-white">الرصيد المتبقي الجديد:</span>
                <span className={`font-mono text-sm ${
                  newBalance === 0 ? 'text-emerald-400' : newBalance > 0 ? 'text-amber-400' : 'text-blue-400'
                }`}>
                  {formatCurrency(newBalance, currency)}
                  {newBalance === 0 && <span className="mr-1 text-[10px] text-emerald-400 font-sans">(خالص الحساب ✓)</span>}
                </span>
              </div>
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={amount <= 0}
                className={`flex-2 py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg transition-all ${
                  amount > 0 
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50 cursor-pointer active:scale-95' 
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750'
                }`}
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>تأكيد عملية الدفع وحفظ السند</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
