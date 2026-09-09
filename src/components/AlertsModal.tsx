import React from 'react';
import { 
  AlertTriangle, 
  X, 
  Truck, 
  Package, 
  CheckCircle2, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { Product } from '../types';
import { formatStockUnits, formatCurrency } from '../utils/calculations';

interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currency: string;
  onReorderProduct: (productId: string) => void;
}

export const AlertsModal: React.FC<AlertsModalProps> = ({
  isOpen,
  onClose,
  products,
  currency,
  onReorderProduct,
}) => {
  if (!isOpen) return null;

  const lowStockProducts = products.filter(p => p.stockPieces <= p.minStockAlert);

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in overflow-y-auto"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-lg p-4 sm:p-5 shadow-2xl text-slate-100 my-auto max-h-[88vh] flex flex-col animate-in zoom-in-95"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-amber-200">تنبيهات نقص المخزون</h3>
              <p className="text-xs text-amber-400/80">أصناف وصلت للحد الأدنى أو شارفت على النفاد</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content List */}
        <div className="overflow-y-auto space-y-3 py-3 flex-1">
          {lowStockProducts.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/30">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-slate-200 text-sm">المخزون ممتاز وفي حالة آمنة!</h4>
              <p className="text-xs text-slate-500">لا توجد أصناف حالياً أقل من حد التنبيه المحدد</p>
            </div>
          ) : (
            lowStockProducts.map((product) => {
              const stockUnits = formatStockUnits(
                product.stockPieces,
                product.piecesPerMajorUnit,
                product.majorUnit,
                product.minorUnit
              );

              return (
                <div
                  key={product.id}
                  className="bg-slate-850 border border-amber-500/30 rounded-2xl p-3.5 shadow-md flex flex-col gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-white">{product.name}</h4>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                        <span className="font-mono text-[11px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-300">
                          {product.barcode}
                        </span>
                        <span>•</span>
                        <span>{product.category}</span>
                      </div>
                    </div>

                    <span className="bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10.5px] font-black px-2 py-0.5 rounded-full shrink-0">
                      متبقي: {product.stockPieces} {product.minorUnit}
                    </span>
                  </div>

                  {/* Stock Level Progress */}
                  <div className="bg-slate-900/80 rounded-xl p-2.5 border border-slate-800 text-xs">
                    <div className="flex justify-between items-center text-[11px] text-slate-300 mb-1">
                      <span>الرصيد الفعلي: <strong className="text-amber-400">{stockUnits.shortText}</strong></span>
                      <span className="text-slate-400">حد التنبيه: {product.minStockAlert} {product.minorUnit}</span>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(10, (product.stockPieces / (product.minStockAlert || 1)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Supplier Info & Quick Reorder Button */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                    <span className="text-slate-400 text-[11px]">
                      المورد: <strong className="text-slate-200">{product.defaultSupplierName || 'غير محدد'}</strong>
                    </span>

                    <button
                      onClick={() => {
                        onClose();
                        onReorderProduct(product.id);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all active:scale-95"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>طلب توريد الصنف</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all"
          >
            إغلاق التنبيهات
          </button>
        </div>
      </div>
    </div>
  );
};
