import React from 'react';
import { 
  TrendingUp, 
  ShoppingCart, 
  Boxes, 
  AlertTriangle, 
  ChevronLeft, 
  PlusCircle, 
  Truck,
  ArrowUpRight,
  DollarSign,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { Product, SaleInvoice, PurchaseInvoice } from '../types';
import { formatCurrency, formatArabicDateTime } from '../utils/calculations';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardTabProps {
  products: Product[];
  sales: SaleInvoice[];
  purchases: PurchaseInvoice[];
  currency: string;
  setActiveTab: (tab: any) => void;
  onOpenAlerts: () => void;
  onQuickNewSale: () => void;
  onQuickNewPurchase: () => void;
  onQuickNewProduct: () => void;
  onSelectSaleInvoice: (invoice: SaleInvoice) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  products,
  sales,
  currency,
  setActiveTab,
  onOpenAlerts,
  onQuickNewSale,
  onQuickNewPurchase,
  onQuickNewProduct,
  onSelectSaleInvoice
}) => {
  // Calculations
  const totalSalesRevenue = sales.reduce((acc, s) => acc + s.netAmount, 0);
  const totalProfit = sales.reduce((acc, s) => acc + (s.totalProfit || 0), 0);
  const totalStockPieces = products.reduce((acc, p) => acc + p.stockPieces, 0);
  
  // Valuation
  const totalInventoryCost = products.reduce((acc, p) => acc + (p.costPrice * p.stockPieces), 0);
  const totalInventoryRetail = products.reduce((acc, p) => acc + (p.sellingPrice * p.stockPieces), 0);

  // Urgent alerts
  const lowStockProducts = products.filter(p => p.stockPieces <= p.minStockAlert);

  // Last 7 days performance data for chart
  const getLast7DaysData = () => {
    const days: { [key: string]: { date: string; sales: number; profit: number } } = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('ar-SA', { weekday: 'short' });
      days[key] = { date: dayName, sales: 0, profit: 0 };
    }

    sales.forEach(sale => {
      const saleDate = sale.date.split('T')[0];
      if (days[saleDate]) {
        days[saleDate].sales += sale.netAmount;
        days[saleDate].profit += (sale.totalProfit || 0);
      }
    });

    return Object.values(days);
  };

  const chartData = getLast7DaysData();
  const recentSales = sales.slice(0, 5);

  return (
    <div className="space-y-3.5 sm:space-y-5 p-3 sm:p-4 pb-24 max-w-4xl mx-auto">
      {/* Primary Quick Actions Window (Shown at Top within Phone Boundaries) */}
      <div 
        id="home-quick-actions-window"
        className="bg-slate-850/95 border border-purple-500/20 dark:border-purple-500/30 p-4 sm:p-5 rounded-2xl shadow-xl flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs sm:text-sm font-extrabold text-slate-100">إجراءات سريعة</h3>
          <span className="text-[11px] text-slate-400 font-medium">العمليات الأكثر استخداماً</span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {/* Quick Sale - Emerald Green */}
          <button
            id="quick-sale-btn"
            onClick={onQuickNewSale}
            className="flex flex-col items-center justify-center py-3 px-2 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 dark:bg-emerald-600/15 dark:hover:bg-emerald-600/25 border border-emerald-400/40 text-emerald-600 dark:text-emerald-300 font-black text-xs transition-all active:scale-95 group shadow-sm cursor-pointer"
          >
            <div 
              style={{ backdropFilter: 'blur(3.5px)', WebkitBackdropFilter: 'blur(3.5px)' }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-emerald-400/40 bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform shadow-[0_0_10px_rgba(16,185,129,0.25)]"
            >
              <ShoppingCart className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
            </div>
            <span className="font-extrabold">فاتورة بيع</span>
          </button>

          {/* Quick Purchase - Royal Blue */}
          <button
            id="quick-purchase-btn"
            onClick={onQuickNewPurchase}
            className="flex flex-col items-center justify-center py-3 px-2 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 dark:bg-blue-600/15 dark:hover:bg-blue-600/25 border border-blue-400/40 text-blue-600 dark:text-blue-300 font-black text-xs transition-all active:scale-95 group shadow-sm cursor-pointer"
          >
            <div 
              style={{ backdropFilter: 'blur(3.5px)', WebkitBackdropFilter: 'blur(3.5px)' }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-blue-400/40 bg-blue-500/20 text-blue-600 dark:text-blue-300 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform shadow-[0_0_10px_rgba(59,130,246,0.25)]"
            >
              <Truck className="w-5 h-5 text-blue-600 dark:text-blue-300" />
            </div>
            <span className="font-extrabold">فاتورة شراء</span>
          </button>

          {/* Quick Product - Mauve Violet */}
          <button
            id="quick-product-btn"
            onClick={onQuickNewProduct}
            className="flex flex-col items-center justify-center py-3 px-2 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 dark:bg-purple-600/15 dark:hover:bg-purple-600/25 border border-purple-400/40 text-purple-600 dark:text-purple-300 font-black text-xs transition-all active:scale-95 group shadow-sm cursor-pointer"
          >
            <div 
              style={{ backdropFilter: 'blur(3.5px)', WebkitBackdropFilter: 'blur(3.5px)' }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-purple-400/40 bg-purple-500/20 text-purple-600 dark:text-purple-300 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform shadow-[0_0_10px_rgba(168,85,247,0.25)]"
            >
              <PlusCircle className="w-5 h-5 text-purple-600 dark:text-purple-300" />
            </div>
            <span className="font-extrabold">صنف جديد</span>
          </button>

          {/* Quick Store - Fuchsia Rose */}
          <button
            id="quick-store-btn"
            onClick={() => setActiveTab('store')}
            className="col-span-3 flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-rose-500/25 hover:border-rose-400/50 text-rose-500 dark:text-rose-300 font-bold text-xs transition-all active:scale-[0.99] group shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div 
                style={{ backdropFilter: 'blur(3.5px)', WebkitBackdropFilter: 'blur(3.5px)' }}
                className="w-8 h-8 rounded-xl border border-rose-400/40 bg-rose-500/20 text-rose-500 dark:text-rose-300 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(244,63,94,0.2)]"
              >
                <Boxes className="w-4 h-4" />
              </div>
              <div className="text-right">
                <span className="text-slate-100 font-extrabold block text-xs sm:text-sm">بوابة المتجر والكتالوج الرقمي</span>
                <span className="text-xs text-slate-400 font-medium block mt-0.5">رمز QR، ربط المنصات، واستقبال الطلبيات</span>
              </div>
            </div>
            <ChevronLeft className="w-4 h-4 text-rose-500 dark:text-rose-400 group-hover:-translate-x-1 transition-transform" />
          </button>

          {/* Quick Sheet Import - Teal / Sky */}
          <button
            id="quick-import-sheet-btn"
            onClick={() => setActiveTab('products')}
            className="col-span-3 flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-teal-500/25 hover:border-teal-400/50 text-teal-500 dark:text-teal-300 font-bold text-xs transition-all active:scale-[0.99] group shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div 
                style={{ backdropFilter: 'blur(3.5px)', WebkitBackdropFilter: 'blur(3.5px)' }}
                className="w-8 h-8 rounded-xl border border-teal-400/40 bg-teal-500/20 text-teal-500 dark:text-teal-300 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(20,184,166,0.2)]"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="text-right">
                <span className="text-slate-100 font-extrabold block text-xs sm:text-sm">استيراد الأصناف من الشيت (Excel / Google Sheets)</span>
                <span className="text-xs text-slate-400 font-medium block mt-0.5">رفع ملف الشيت أو اللصق المباشر ومطابقة الأعمدة فوراً</span>
              </div>
            </div>
            <ChevronLeft className="w-4 h-4 text-teal-500 dark:text-teal-400 group-hover:-translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Low Stock Urgent Bento Banner - Professional Danger Red */}
      {lowStockProducts.length > 0 && (
        <div 
          onClick={onOpenAlerts}
          className="cursor-pointer bg-gradient-to-r from-red-500/10 via-red-500/5 to-rose-500/10 dark:from-red-950/40 dark:via-red-900/20 dark:to-transparent border border-red-500/40 hover:border-red-500 dark:border-red-500/40 dark:hover:border-red-400/70 rounded-2xl p-4 flex items-center justify-between shadow-md shadow-red-500/5 transition-all group active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div 
              style={{ backdropFilter: 'blur(3.5px)', WebkitBackdropFilter: 'blur(3.5px)' }}
              className="w-11 h-11 rounded-2xl bg-red-500/15 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-500/35 shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_12px_rgba(239,68,68,0.25)]"
            >
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="stock-alert-title font-black text-sm sm:text-base">تنبيه انخفاض المخزون</h3>
                <span 
                  className="keep-white bg-gradient-to-r from-red-600 to-rose-600 text-white !text-white text-xs px-2.5 py-0.5 rounded-full font-black shadow-sm shadow-red-500/30 animate-pulse select-none"
                  style={{ color: '#ffffff' }}
                >
                  {lowStockProducts.length} أصناف
                </span>
              </div>
              <p className="stock-alert-desc text-xs font-bold mt-1 truncate">
                تجاوزت الحد الأدنى: {lowStockProducts.slice(0, 3).map(p => p.name).join('، ')}{lowStockProducts.length > 3 ? '...' : ''}
              </p>
            </div>
          </div>
          <div className="stock-alert-action flex items-center gap-1 text-xs font-black shrink-0 mr-2">
            <span className="hidden sm:inline">مراجعة النواقص</span>
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>
      )}

      {/* Main Bento Grid */}
      <div className="grid grid-cols-12 gap-3.5">
        {/* Bento Card 1: Total Profit (Hero Metric in Professional Mauve) */}
        <div className="col-span-12 sm:col-span-6 bg-slate-850/90 border border-purple-500/35 dark:border-purple-500/40 p-4 sm:p-5 rounded-2xl shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -left-6 -top-6 w-28 h-28 bg-purple-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div 
                style={{ backdropFilter: 'blur(3.5px)', WebkitBackdropFilter: 'blur(3.5px)' }}
                className="w-8 h-8 rounded-xl border border-purple-400/40 bg-purple-500/20 text-purple-600 dark:text-purple-300 flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.2)]"
              >
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-300">صافي الأرباح المحققة</span>
            </div>
            <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-400/35">
              هامش {totalSalesRevenue > 0 ? ((totalProfit / totalSalesRevenue) * 100).toFixed(1) : 0}%
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-300 tracking-tight">
              {formatCurrency(totalProfit, currency)}
            </div>
            <div className="text-[11.5px] text-slate-400 mt-1 flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>إجمالي العائد من {sales.length} فواتير بيع مسجلة</span>
            </div>
          </div>
        </div>

        {/* Bento Card 2: Total Sales Revenue - Sky Blue */}
        <div className="col-span-6 sm:col-span-3 bg-slate-850/90 border border-slate-800 p-4 rounded-2xl shadow-md flex flex-col justify-between hover:border-purple-500/30 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">إجمالي المبيعات</span>
            <div 
              style={{ backdropFilter: 'blur(3.5px)', WebkitBackdropFilter: 'blur(3.5px)' }}
              className="w-7 h-7 rounded-xl border border-sky-400/40 bg-sky-500/20 text-sky-500 dark:text-sky-300 flex items-center justify-center shadow-[0_0_8px_rgba(14,165,233,0.2)]"
            >
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black text-white tracking-tight">
              {formatCurrency(totalSalesRevenue, currency)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              <span>{sales.length} فواتير</span>
            </div>
          </div>
        </div>

        {/* Bento Card 3: Total Stock Pieces - Amber Gold */}
        <div className="col-span-6 sm:col-span-3 bg-slate-850/90 border border-slate-800 p-4 rounded-2xl shadow-md flex flex-col justify-between hover:border-purple-500/30 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">رصيد القطع</span>
            <div 
              style={{ backdropFilter: 'blur(3.5px)', WebkitBackdropFilter: 'blur(3.5px)' }}
              className="w-7 h-7 rounded-xl border border-amber-400/40 bg-amber-500/20 text-amber-500 dark:text-amber-300 flex items-center justify-center shadow-[0_0_8px_rgba(245,158,11,0.2)]"
            >
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black text-white tracking-tight">
              {totalStockPieces.toLocaleString('en-US')} <span className="text-xs font-normal text-slate-400">قطعة</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              <span>في {products.length} صنف</span>
            </div>
          </div>
        </div>

        {/* Bento Card 4: Inventory Valuation Summary - Teal / Cyan */}
        <div className="col-span-12 sm:col-span-6 bg-slate-850/90 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-md hover:border-purple-500/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div 
                style={{ backdropFilter: 'blur(3.5px)', WebkitBackdropFilter: 'blur(3.5px)' }}
                className="w-8 h-8 rounded-xl border border-teal-400/40 bg-teal-500/20 text-teal-500 dark:text-teal-300 flex items-center justify-center shadow-[0_0_8px_rgba(20,184,166,0.2)]"
              >
                <Boxes className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-200">تقييم المخزون المتاح</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">تكلفة مقابل بيع</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-0.5">القيمة بسعر الشراء (التكلفة)</span>
              <div className="text-sm sm:text-base font-bold text-amber-400">
                {formatCurrency(totalInventoryCost, currency)}
              </div>
            </div>

            <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-0.5">القيمة بسعر البيع (المتوقع)</span>
              <div className="text-sm sm:text-base font-bold text-purple-600 dark:text-purple-300">
                {formatCurrency(totalInventoryRetail, currency)}
              </div>
            </div>
          </div>
        </div>

        {/* Bento Card 6: Performance Chart */}
        <div className="col-span-12 sm:col-span-7 bg-slate-850/90 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-200">حركة المبيعات والأرباح اليومية</h3>
              <p className="text-[11px] text-slate-400">آخر 7 أيام من النشاط</p>
            </div>
            <button
              onClick={() => setActiveTab('reports')}
              className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-500 flex items-center gap-0.5 group cursor-pointer"
            >
              <span>التقرير الشامل</span>
              <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          </div>
          <div className="h-44 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#181230', borderColor: '#4c1d95', borderRadius: '12px', fontSize: '12px' }}
                  labelStyle={{ color: '#d8b4fe', fontWeight: 'bold' }}
                  formatter={(val: any) => [`${Number(val).toLocaleString('en-US')} ${currency}`]}
                />
                <Bar dataKey="sales" name="المبيعات" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="الأرباح" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bento Card 7: Recent Sales Feed */}
        <div className="col-span-12 sm:col-span-5 bg-slate-850/90 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-200">آخر فواتير المبيعات</h3>
              <button
                onClick={() => setActiveTab('pos')}
                className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-500 flex items-center gap-0.5 group cursor-pointer"
              >
                <span>الكل</span>
                <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              </button>
            </div>

            {recentSales.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                لا توجد فواتير مبيعات مسجلة حتى الآن
              </div>
            ) : (
              <div className="space-y-2">
                {recentSales.map(invoice => (
                  <div
                    key={invoice.id}
                    onClick={() => onSelectSaleInvoice(invoice)}
                    className="bg-slate-900/80 hover:bg-slate-800 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg crystal-icon text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-white group-hover:text-purple-300 transition-colors">
                            {invoice.customerName}
                          </span>
                          <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded font-mono border border-slate-700">
                            {invoice.invoiceNumber}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{formatArabicDateTime(invoice.date)}</span>
                          <span>•</span>
                          <span className="text-purple-600 dark:text-purple-400 font-semibold">ربح: {formatCurrency(invoice.totalProfit, currency)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-black text-xs text-white">
                        {formatCurrency(invoice.netAmount, currency)}
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold inline-block mt-0.5 ${
                        invoice.paymentStatus === 'paid'
                          ? 'text-purple-600 dark:text-purple-300 bg-purple-500/10 border border-purple-500/20'
                          : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                      }`}>
                        {invoice.paymentStatus === 'paid' ? 'مسدد' : 'آجل'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
