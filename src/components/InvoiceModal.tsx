import React, { useState } from 'react';
import { 
  Printer, 
  Share2, 
  X, 
  CheckCircle2, 
  Copy, 
  Check, 
  Package, 
  Calendar, 
  User, 
  QrCode,
  Truck,
  Building,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { SaleInvoice, PurchaseInvoice } from '../types';
import { formatCurrency, formatArabicDateTime } from '../utils/calculations';

interface InvoiceModalProps {
  saleInvoice?: SaleInvoice | null;
  purchaseInvoice?: PurchaseInvoice | null;
  currency: string;
  onDeleteSale?: (saleId: string, revertStock: boolean, revertCustomerBalance: boolean) => void;
  onDeletePurchase?: (purchaseId: string, revertStock: boolean, revertSupplierBalance: boolean) => void;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  saleInvoice,
  purchaseInvoice,
  currency,
  onDeleteSale,
  onDeletePurchase,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [revertStock, setRevertStock] = useState(true);
  const [revertBalance, setRevertBalance] = useState(true);

  const isSale = !!saleInvoice;
  const invoice = saleInvoice || purchaseInvoice;

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const lines = [
      `فاتورة ${isSale ? 'مبيعات' : 'مشتريات'}: ${invoice.invoiceNumber}`,
      `التاريخ: ${formatArabicDateTime(invoice.date)}`,
      `${isSale ? 'العميل' : 'المورد'}: ${isSale ? (saleInvoice?.customerName) : (purchaseInvoice?.supplierName)}`,
      '--------------------------',
      ...invoice.items.map(i => `${i.productName} (${i.quantity} ${i.unitName}) = ${formatCurrency(i.subtotal, currency)}`),
      '--------------------------',
      `الصافي: ${formatCurrency(invoice.netAmount, currency)}`,
      `الحالة: ${invoice.paymentStatus === 'paid' ? 'مسدد' : 'آجل'}`,
      'شكراً لتعاملكم معنا!',
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecuteDelete = () => {
    if (isSale && saleInvoice && onDeleteSale) {
      onDeleteSale(saleInvoice.id, revertStock, revertBalance);
    } else if (!isSale && purchaseInvoice && onDeletePurchase) {
      onDeletePurchase(purchaseInvoice.id, revertStock, revertBalance);
    }
    setShowConfirmDelete(false);
    onClose();
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-4 sm:p-5 shadow-2xl text-slate-100 my-auto max-h-[95vh] flex flex-col animate-in zoom-in-95 relative"
      >
        {/* Top Modal Controls */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0 no-print">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${
              isSale ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'
            }`}>
              {isSale ? 'فاتورة مبيعات' : 'سند مشتريات'}
            </span>
            <span className="font-mono text-xs font-bold text-slate-300">
              {invoice.invoiceNumber}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs flex items-center gap-1 border border-rose-500/30 transition-all"
              title="حذف الفاتورة"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleCopyText}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 border border-slate-700"
              title="نسخ نص الفاتورة"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center gap-1 shadow-md"
              title="طباعة الفاتورة"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Thermal Receipt Card */}
        <div className="overflow-y-auto py-3 flex-1">
          <div className="bg-white text-slate-900 rounded-2xl p-4 sm:p-5 font-['Cairo'] shadow-inner border border-slate-200 printable-area text-xs">
            {/* Store Header */}
            <div className="text-center pb-3 border-b-2 border-dashed border-slate-300 space-y-1">
              <h2 className="text-base font-black text-slate-900">مخزون فريدون</h2>
              <p className="text-[11px] text-slate-600 font-semibold">فاتورة مبيعات ومخزون</p>
              <div className="font-mono text-[10.5px] text-slate-500">
                السجل التجاري والضريبي: 16/00-0987654B20
              </div>
            </div>

            {/* Invoice Meta */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-600 font-semibold">رقم الفاتورة:</span>
                <span className="font-bold font-mono">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-semibold">التاريخ والوقت:</span>
                <span className="font-medium">{formatArabicDateTime(invoice.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-semibold">
                  {isSale ? 'اسم العميل:' : 'اسم المورد:'}
                </span>
                <span className="font-bold text-slate-900">
                  {isSale ? (saleInvoice?.customerName) : (purchaseInvoice?.supplierName)}
                </span>
              </div>
              {((isSale && saleInvoice?.customerPhone) || (!isSale && purchaseInvoice?.supplierPhone)) && (
                <div className="flex justify-between">
                  <span className="text-slate-600 font-semibold">الهاتف:</span>
                  <span className="font-mono">
                    {isSale ? saleInvoice?.customerPhone : purchaseInvoice?.supplierPhone}
                  </span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="py-2.5 border-b-2 border-dashed border-slate-300">
              <table className="w-full text-right text-[11px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-700 font-bold">
                    <th className="pb-1.5 pr-1">الصنف</th>
                    <th className="pb-1.5 text-center">الكمية</th>
                    <th className="pb-1.5 text-center">السعر</th>
                    <th className="pb-1.5 pl-1 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5 pr-1 font-semibold text-slate-900">
                        {item.productName}
                      </td>
                      <td className="py-1.5 text-center text-slate-700 font-mono">
                        {item.quantity} {item.unitName}
                      </td>
                      <td className="py-1.5 text-center text-slate-700">
                        {item.unitPrice.toFixed(2)}
                      </td>
                      <td className="py-1.5 pl-1 text-left font-bold text-slate-900">
                        {item.subtotal.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="py-2.5 border-b-2 border-dashed border-slate-300 space-y-1.5 text-[11px]">
              <div className="flex justify-between text-slate-600 font-semibold">
                <span>المجموع الفرعي:</span>
                <span>{formatCurrency(invoice.subtotal, currency)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-rose-600 font-semibold">
                  <span>الخصم الممنوح:</span>
                  <span>-{formatCurrency(invoice.discount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-black text-sm pt-1 border-t border-slate-200">
                <span>صافي الفاتورة الإجمالي:</span>
                <span>{formatCurrency(invoice.netAmount, currency)}</span>
              </div>

              {invoice.paymentStatus !== 'paid' && (
                <div className="flex justify-between text-amber-700 font-bold pt-1">
                  <span>المبلغ المدفوع: {formatCurrency(invoice.paidAmount, currency)}</span>
                  <span>المتبقي: {formatCurrency(invoice.remainingAmount, currency)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600 font-semibold pt-1">
                <span>طريقة السداد:</span>
                <span>
                  {invoice.paymentMethod === 'cash' ? 'نقداً' : invoice.paymentMethod === 'card' ? 'بطاقة / مدى' : invoice.paymentMethod === 'transfer' ? 'تحويل بنكي' : 'آجل (ذمم)'}
                </span>
              </div>
            </div>

            {/* QR Code & Footer */}
            <div className="pt-3 text-center space-y-2">
              <div className="w-20 h-20 mx-auto bg-slate-100 border border-slate-300 rounded-xl flex items-center justify-center p-1">
                {/* Visual SVG QR mockup */}
                <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900 fill-current">
                  <path d="M0,0 h30 v30 h-30 z M10,10 h10 v10 h-10 z" />
                  <path d="M70,0 h30 v30 h-30 z M80,10 h10 v10 h-10 z" />
                  <path d="M0,70 h30 v30 h-30 z M10,80 h10 v10 h-10 z" />
                  <rect x="40" y="10" width="10" height="20" />
                  <rect x="10" y="40" width="20" height="10" />
                  <rect x="40" y="40" width="20" height="20" />
                  <rect x="70" y="40" width="10" height="20" />
                  <rect x="40" y="70" width="20" height="10" />
                  <rect x="70" y="70" width="20" height="20" />
                </svg>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">شكراً لتعاملكم معنا ونسعد بخدمتكم دائماً</p>
              {invoice.notes && (
                <p className="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                  ملاحظة: {invoice.notes}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-slate-800 flex items-center gap-2 shrink-0 no-print">
          <button
            onClick={() => setShowConfirmDelete(true)}
            className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1 border border-rose-500/30 transition-all"
            title="حذف الفاتورة"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">حذف</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الإيصال الفوري</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
          >
            إغلاق
          </button>
        </div>

        {/* Delete Confirmation Overlay */}
        {showConfirmDelete && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md rounded-3xl p-5 z-20 flex flex-col justify-between animate-in fade-in">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">
                    حذف {isSale ? 'فاتورة المبيعات' : 'سند المشتريات'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    رقم: <span className="font-mono text-slate-200">{invoice.invoiceNumber}</span>
                  </p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2 text-xs mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-400">{isSale ? 'العميل' : 'المورد'}:</span>
                  <span className="font-bold text-white">
                    {isSale ? saleInvoice?.customerName : purchaseInvoice?.supplierName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">المبلغ الصافي:</span>
                  <span className="font-black text-white">
                    {formatCurrency(invoice.netAmount, currency)}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="flex items-start gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={revertStock}
                    onChange={(e) => setRevertStock(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-rose-500 focus:ring-rose-500 bg-slate-950 w-4 h-4"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-white block">
                      {isSale ? 'إعادة الأصناف المباعة إلى رصيد المخزن' : 'خصم الأصناف الموردة من رصيد المخزن'}
                    </span>
                    <span className="text-[10.5px] text-slate-400 block mt-0.5">
                      تحديث تلقائي لرصيد المستودع لتفادي عدم تطابق الجرد.
                    </span>
                  </div>
                </label>

                {invoice.remainingAmount > 0 && (
                  <label className="flex items-start gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={revertBalance}
                      onChange={(e) => setRevertBalance(e.target.checked)}
                      className="mt-0.5 rounded border-slate-700 text-rose-500 focus:ring-rose-500 bg-slate-950 w-4 h-4"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-white block">
                        إلغاء المديونية ({formatCurrency(invoice.remainingAmount, currency)})
                      </span>
                      <span className="text-[10.5px] text-slate-400 block mt-0.5">
                        تعديل رصيد حساب {isSale ? 'العميل' : 'المورد'} وإلغاء المبلغ المستحق.
                      </span>
                    </div>
                  </label>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/30"
              >
                <Trash2 className="w-4 h-4" />
                <span>تأكيد الحذف نهائياً</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
