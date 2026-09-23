import React, { useState, useMemo } from 'react';
import { 
  X, 
  Receipt, 
  Search, 
  Printer, 
  Copy, 
  Trash2, 
  Plus, 
  Wallet, 
  Calendar, 
  Building, 
  CreditCard, 
  User, 
  Clock, 
  Check, 
  AlertTriangle 
} from 'lucide-react';
import { PartnerPayment, Supplier } from '../types';
import { formatCurrency, formatArabicDateTime } from '../utils/calculations';

interface SupplierPaymentsLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  payments: PartnerPayment[];
  suppliers: Supplier[];
  currency: string;
  onOpenNewPayment: () => void;
  onDeletePayment?: (paymentId: string) => void;
}

export const SupplierPaymentsLedgerModal: React.FC<SupplierPaymentsLedgerModalProps> = ({
  isOpen,
  onClose,
  payments,
  suppliers,
  currency,
  onOpenNewPayment,
  onDeletePayment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState<PartnerPayment | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<PartnerPayment | null>(null);

  // Filter only supplier payments
  const supplierPayments = useMemo(() => {
    return payments
      .filter((p) => p.partnerType === 'supplier')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments]);

  // Filtered by query and payment method
  const filteredPayments = useMemo(() => {
    return supplierPayments.filter((p) => {
      const matchesMethod = methodFilter === 'all' || p.paymentMethod === methodFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = 
        q === '' ||
        p.partnerName.toLowerCase().includes(q) ||
        p.receiptNumber.toLowerCase().includes(q) ||
        (p.partnerCode && p.partnerCode.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q)) ||
        (p.referenceNumber && p.referenceNumber.toLowerCase().includes(q));
      return matchesMethod && matchesQuery;
    });
  }, [supplierPayments, searchQuery, methodFilter]);

  // Financial Stats
  const totalPaid = useMemo(() => {
    return supplierPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  }, [supplierPayments]);

  if (!isOpen) return null;

  const handleCopyPayment = (payment: PartnerPayment) => {
    const lines = [
      `=== سند صرف نقدية (تسديد مورد) ===`,
      `رقم السند: ${payment.receiptNumber}`,
      `التاريخ: ${formatArabicDateTime(payment.date)}`,
      `المورد: ${payment.partnerName}${payment.partnerCode ? ` (${payment.partnerCode})` : ''}`,
      payment.partnerPhone ? `الهاتف: ${payment.partnerPhone}` : '',
      `المبلغ المسدد: ${formatCurrency(payment.amount, currency)}`,
      `طريقة الدفع: ${
        payment.paymentMethod === 'cash' ? 'نقداً (Cash)' :
        payment.paymentMethod === 'card' ? 'بطاقة بنكية / شبكة' :
        payment.paymentMethod === 'transfer' ? 'تحويل بنكي' : 'شيك بنكي'
      }`,
      payment.bankName ? `البنك: ${payment.bankName}` : '',
      payment.referenceNumber ? `رقم المرجع/الشيك: ${payment.referenceNumber}` : '',
      `الرصيد السابق: ${formatCurrency(payment.previousBalance, currency)}`,
      `الرصيد المتبقي: ${formatCurrency(payment.newBalance, currency)}`,
      payment.notes ? `البيان: ${payment.notes}` : '',
      '----------------------------------------',
      'تم تحرير السند بنجاح عبر النظام المحاسبي.',
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(lines);
    setCopiedId(payment.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePrintVoucher = (payment: PartnerPayment) => {
    setSelectedVoucherForPrint(payment);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl p-4 sm:p-6 shadow-2xl text-slate-100 my-auto max-h-[94vh] flex flex-col animate-in zoom-in-95"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
                <span>سجل سندات الصرف والمدفوعات للموردين</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {supplierPayments.length} سند
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                إدارة ومتابعة وطباعة جميع الدفعات وسندات الصرف النقدية والبنكية المسددة للموردين
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onOpenNewPayment();
              }}
              className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>سند صرف جديد</span>
            </button>

            <button
              onClick={onClose}
              className="close-circle-btn"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-3 shrink-0">
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-slate-400 text-xs block">إجمالي المبالغ المصروفة للموردين:</span>
            <span className="text-base sm:text-lg font-black text-amber-400 font-mono">
              {formatCurrency(totalPaid, currency)}
            </span>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-slate-400 text-xs block">عدد سندات الصرف المحررة:</span>
            <span className="text-base sm:text-lg font-black text-white font-mono">
              {supplierPayments.length} سند
            </span>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-slate-400 text-xs block">آخر عملية صرف مسجلة:</span>
            <span className="text-xs sm:text-sm font-bold text-blue-400 font-mono truncate block mt-0.5">
              {supplierPayments[0] ? formatArabicDateTime(supplierPayments[0].date) : 'لا يوجد'}
            </span>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث برقم السند، اسم المورد، الكود، رقم المرجع، أو البيان..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-750 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Payment Method Filter */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-medium shrink-0 overflow-x-auto">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'cash', label: 'نقداً' },
              { id: 'transfer', label: 'تحويل' },
              { id: 'check', label: 'شيك' },
              { id: 'card', label: 'بطاقة' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMethodFilter(m.id)}
                className={`px-3 py-1 rounded-lg transition-all whitespace-nowrap ${
                  methodFilter === m.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table / List of Payments */}
        <div className="flex-1 overflow-y-auto min-h-0 border border-slate-800 rounded-2xl bg-slate-950/60">
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <Receipt className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
              <p className="font-bold text-slate-300">لا توجد سندات صرف مطابقة</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {searchQuery || methodFilter !== 'all' 
                  ? 'جرب تغيير شروط البحث أو الفلترة' 
                  : 'يمكنك البدء بتسجيل أول سند صرف للمورد بالضغط على زر "سند صرف جديد" أعلاه.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">رقم السند</th>
                    <th className="py-2.5 px-3">المورد</th>
                    <th className="py-2.5 px-3 text-center">التاريخ والوقت</th>
                    <th className="py-2.5 px-3 text-center">طريقة الدفع</th>
                    <th className="py-2.5 px-3 text-left">المبلغ المصروف</th>
                    <th className="py-2.5 px-3 text-left">الرصيد المتبقي</th>
                    <th className="py-2.5 px-3">البيان / ملاحظات</th>
                    <th className="py-2.5 px-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredPayments.map((payment) => (
                    <tr 
                      key={payment.id} 
                      className="hover:bg-slate-900/60 transition-colors group"
                    >
                      {/* 1. Receipt No */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-200 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px]">
                          {payment.receiptNumber}
                        </span>
                      </td>

                      {/* 2. Supplier */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-bold text-white text-xs">{payment.partnerName}</div>
                        {payment.partnerCode && (
                          <span className="text-[10px] text-blue-400 font-mono font-bold">
                            كود: {payment.partnerCode}
                          </span>
                        )}
                        {payment.partnerPhone && (
                          <span className="text-[10px] text-slate-500 font-mono block" dir="ltr">
                            {payment.partnerPhone}
                          </span>
                        )}
                      </td>

                      {/* 3. Date */}
                      <td className="py-3 px-3 text-center text-[11px] text-slate-400 font-mono whitespace-nowrap">
                        {formatArabicDateTime(payment.date)}
                      </td>

                      {/* 4. Method */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold inline-flex items-center gap-1 ${
                          payment.paymentMethod === 'cash' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                          payment.paymentMethod === 'transfer' ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' :
                          payment.paymentMethod === 'check' ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30' :
                          'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        }`}>
                          {payment.paymentMethod === 'cash' ? 'نقداً' :
                           payment.paymentMethod === 'transfer' ? 'تحويل بنكي' :
                           payment.paymentMethod === 'check' ? 'شيك بنكي' : 'بطاقة / شبكة'}
                        </span>
                        {payment.referenceNumber && (
                          <span className="block text-[9.5px] text-slate-500 font-mono mt-0.5">
                            مرجع: {payment.referenceNumber}
                          </span>
                        )}
                      </td>

                      {/* 5. Amount */}
                      <td className="py-3 px-3 text-left whitespace-nowrap">
                        <span className="font-black text-amber-400 font-mono text-sm">
                          {formatCurrency(payment.amount, currency)}
                        </span>
                      </td>

                      {/* 6. Remaining Balance */}
                      <td className="py-3 px-3 text-left whitespace-nowrap font-mono text-xs">
                        <span className={payment.newBalance === 0 ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                          {formatCurrency(payment.newBalance, currency)}
                        </span>
                        {payment.newBalance === 0 && (
                          <span className="block text-[9.5px] text-emerald-400 font-sans">خالص ✓</span>
                        )}
                      </td>

                      {/* 7. Notes */}
                      <td className="py-3 px-3 text-slate-400 text-[11px] max-w-xs truncate">
                        {payment.notes || '—'}
                      </td>

                      {/* 8. Actions */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handlePrintVoucher(payment)}
                            className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-all active:scale-95"
                            title="طباعة السند الرسمي"
                          >
                            <Printer className="w-3.5 h-3.5 text-blue-400" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyPayment(payment)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all active:scale-95"
                            title="نسخ السند لمشاركته واتساب"
                          >
                            {copiedId === payment.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </button>

                          {onDeletePayment && (
                            <button
                              type="button"
                              onClick={() => setPaymentToDelete(payment)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all active:scale-95"
                              title="حذف السند واسترجاع الرصيد"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>يتم عكس أثر السندات على أرصدة الموردين تلقائياً.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all"
          >
            إغلاق
          </button>
        </div>

        {/* Delete Confirmation Modal */}
        {paymentToDelete && (
          <div 
            onClick={() => setPaymentToDelete(null)}
            className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-rose-500/40 rounded-3xl w-full max-w-md p-5 shadow-2xl text-slate-100 animate-in zoom-in-95 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">تأكيد حذف سند الصرف</h4>
                  <p className="text-xs text-slate-400">سند رقم: {paymentToDelete.receiptNumber}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">المورد:</span>
                  <span className="font-bold text-white">{paymentToDelete.partnerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">المبلغ المسدد:</span>
                  <span className="font-bold text-amber-400 font-mono">{formatCurrency(paymentToDelete.amount, currency)}</span>
                </div>
                <p className="text-[11px] text-amber-300/90 pt-1 border-t border-slate-800">
                  تنبيه: سيتم إعادة إضافة هذا المبلغ ({formatCurrency(paymentToDelete.amount, currency)}) إلى رصيد المورد ليعود كدين مستحق عليه.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDeletePayment) {
                      onDeletePayment(paymentToDelete.id);
                    }
                    setPaymentToDelete(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-950/40"
                >
                  تأكيد الحذف واسترجاع الرصيد
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden Printable Voucher for window.print() */}
        {selectedVoucherForPrint && (
          <div className="hidden print:block printable-area text-slate-900 font-sans p-6">
            <div className="text-center pb-4 border-b-2 border-slate-900 mb-4">
              <h2 className="text-xl font-black">سند صرف نقدية / بنكي</h2>
              <div className="flex justify-between items-center text-xs mt-2">
                <span>رقم السند: <b className="font-mono">{selectedVoucherForPrint.receiptNumber}</b></span>
                <span>التاريخ: {formatArabicDateTime(selectedVoucherForPrint.date)}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs mb-6">
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-600">المورد المستفيد:</span>
                <span className="font-bold text-sm">{selectedVoucherForPrint.partnerName} {selectedVoucherForPrint.partnerCode ? `(${selectedVoucherForPrint.partnerCode})` : ''}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-600">المبلغ المدفوع:</span>
                <span className="font-black text-base">{formatCurrency(selectedVoucherForPrint.amount, currency)}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-600">طريقة الدفع:</span>
                <span className="font-bold">
                  {selectedVoucherForPrint.paymentMethod === 'cash' ? 'نقداً' :
                   selectedVoucherForPrint.paymentMethod === 'transfer' ? 'تحويل بنكي' :
                   selectedVoucherForPrint.paymentMethod === 'check' ? 'شيك بنكي' : 'بطاقة'}
                  {selectedVoucherForPrint.bankName ? ` - ${selectedVoucherForPrint.bankName}` : ''}
                  {selectedVoucherForPrint.referenceNumber ? ` (مرجع: ${selectedVoucherForPrint.referenceNumber})` : ''}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-600">الرصيد المتبقي بعد الصرف:</span>
                <span className="font-bold">{formatCurrency(selectedVoucherForPrint.newBalance, currency)}</span>
              </div>
              {selectedVoucherForPrint.notes && (
                <div className="border-b pb-1">
                  <span className="text-slate-600">البيان: </span>
                  <span>{selectedVoucherForPrint.notes}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 pt-10 text-center text-xs border-t border-slate-400 mt-8">
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
        )}
      </div>
    </div>
  );
};
