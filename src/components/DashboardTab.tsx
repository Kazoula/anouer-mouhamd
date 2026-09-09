import React from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Boxes, 
  AlertTriangle, 
  PlusCircle, 
  ShoppingCart, 
  Truck, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  CheckCircle2,
  ChevronLeft,
  FileSpreadsheet
} from 'lucide-react';
import { Product, SaleInvoice, PurchaseInvoice, ActiveTab } from '../types';
import { formatCurrency, formatStockUnits, formatArabicDateTime } from '../utils/calculations';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface DashboardTabProps {
  products: Product[];
  sales: SaleInvoice[];
  purchases: PurchaseInvoice[];
  currency: string;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAlerts: () => void;
  onQuickNewSale: () => void;
  onQuickNewPurchase: () => void;
  onQuickNewProduct: () => void;
  onSelectSaleInvoice: (invoice: SaleInvoice) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  products,
  sales,
  purchases,
  currency,
  setActiveTab,
  onOpenAlerts,
  onQuickNewSale,
  onQuickNewPurchase,
  onQuickNewProduct,
  onSelectSaleInvoice,
}) => {
  // Aggregate KPIs
  const totalSalesRevenue = sales.reduce((acc, s) => acc + s.netAmount, 0);
  const totalProfit = sales.reduce((acc, s) => acc + s.totalProfit, 0);
  const totalPurchasesCost = purchases.reduce((acc, p) => acc + p.netAmount, 0);
  
  // Total Inventory Value
  const totalInventoryCost = products.reduce((acc, p) => acc + (p.stockPieces * p.purchasePriceMinor), 0);
  const totalInventoryRetail = products.reduce((acc, p) => acc + (p.stockPieces * p.salePriceMinor), 0);
  const totalStockPieces = products.reduce((acc, p) => acc + p.stockPieces, 0);

  // Low stock products
  const lowStockProducts = products.filter(p => p.stockPieces <= p.minStockAlert);

  // Prepare 7-day mini chart data
  const chartDataMap: Record<string, { date: string; sales: number; profit: number }> = {};
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayLabel = d.toLocaleDateString('ar-SA', { weekday: 'short' });
    chartDataMap[key] = { date: dayLabel, sales: 0, profit: 0 };
  }

  sales.forEach(s => {
    const dateKey = s.date.slice(0, 10);
    if (chartDataMap[dateKey]) {
      chartDataMap[dateKey].sales += s.netAmount;
      chartDataMap[dateKey].profit += s.totalProfit;
    }
  });

  const chartData = Object.values(chartDataMap);

  // Recent 5 sales
  const recentSales = [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4);

  return (
    <div className="pb-24 pt-2.5 px-3 sm:px-5 space-y-3.5 animate-in fade-in duration-200">
      {/* Primary Quick Actions Window (Shown at Top within Phone Boundaries) */}
      <div 
        id="home-quick-actions-window"
        className="bg-slate-850/95 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xl flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs sm:text-sm font-extrabold text-slate-100">إجراءات سريعة</h3>
          <span className="text-[11px] text-slate-400 font-medium">العمليات الأكثر استخداماً</span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <button
            id="quick-sale-btn"
            onClick={onQuickNewSale}
            className="flex flex-col items-center justify-center py-3 px-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 dark:bg-emerald-600/15 dark:hover:bg-emerald-600/25 border border-emerald-500/40 text-emerald-400 font-black text-xs transition-all active:scale-95 group shadow-sm cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="font-extrabold">فاتورة بيع</span>
          </button>

          <button
            id="quick-purchase-btn"
            onClick={onQuickNewPurchase}
            className="flex flex-col items-center justify-center py-3 px-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 dark:bg-blue-600/15 dark:hover:bg-blue-600/25 border border-blue-500/40 text-blue-400 font-black text-xs transition-all active:scale-95 group shadow-sm cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <Truck className="w-5 h-5 text-blue-400" />
            </div>
            <span className="font-extrabold">فاتورة شراء</span>
          </button>

          <button
            id="quick-product-btn"
            onClick={onQuickNewProduct}
            className="flex flex-col items-center justify-center py-3 px-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 dark:bg-purple-600/15 dark:hover:bg-purple-600/25 border border-purple-500/40 text-purple-400 font-black text-xs transition-all active:scale-95 group shadow-sm cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <PlusCircle className="w-5 h-5 text-purple-400" />
            </div>
            <span className="font-extrabold">صنف جديد</span>
          </button>

          <button
            id="quick-store-btn"
            onClick={() => setActiveTab('store')}
            className="col-span-3 flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-emerald-300 font-bold text-xs transition-all hover:border-emerald-400 active:scale-[0.99] group shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                <Boxes className="w-4 h-4" />
              </div>
              <div className="text-right">
                <span className="text-slate-100 font-extrabold block text-xs sm:text-sm">بوابة المتجر والكتالوج الرقمي</span>
                <span className="text-xs text-slate-400 font-medium block mt-0.5">رمز QR، ربط المنصات، واستقبال الطلبيات</span>
              </div>
            </div>
            <ChevronLeft className="w-4 h-4 text-emerald-400 group-hover:-translate-x-1 transition-transform" />
          </button>

          <button
            id="quick-import-sheet-btn"
            onClick={() => setActiveTab('products')}
            className="col-span-3 flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-emerald-500/40 text-slate-300 font-bold text-xs transition-all active:scale-[0.99] group shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/25 shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="text-right">
                <span className="text-slate-100 font-extrabold block text-xs sm:text-sm">استيراد الأصناف من الشيت (Excel / Google Sheets)</span>
                <span className="text-xs text-slate-400 font-medium block mt-0.5">رفع ملف الشيت أو اللصق المباشر ومطابقة الأعمدة فوراً</span>
              </div>
            </div>
            <ChevronLeft className="w-4 h-4 text-emerald-400 group-hover:-translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Low Stock Urgent Bento Banner */}
      {lowStockProducts.length > 0 && (
        <div 
          onClick={onOpenAlerts}
          className="cursor-pointer bg-amber-500/10 dark:bg-slate-900 border border-amber-500/40 rounded-2xl p-4 flex items-center justify-between shadow-md transition-all hover:border-amber-400 group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-amber-800 dark:text-amber-200 text-sm sm:text-base">تنبيه انخفاض المخزون</h3>
                <span className="bg-amber-500 text-slate-950 text-xs px-2.5 py-0.5 rounded-full font-black shadow-sm">
                  {lowStockProducts.length} أصناف
                </span>
              </div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300/80 mt-0.5">
                تجاوزت الحد الأدنى: {lowStockProducts.slice(0, 3).map(p => p.name).join('، ')}{lowStockProducts.length > 3 ? '...' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400">
            <span className="hidden sm:inline">مراجعة النواقص</span>
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>
      )}

      {/* Main Bento Grid */}
      <div className="grid grid-cols-12 gap-3.5">
        {/* Bento Card 1: Total Profit (Hero Metric) */}
        <div className="col-span-12 sm:col-span-6 bg-slate-850/90 border border-emerald-500/30 p-4 sm:p-5 rounded-2xl shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -left-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-300">صافي الأرباح المحققة</span>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              هامش {totalSalesRevenue > 0 ? ((totalProfit / totalSalesRevenue) * 100).toFixed(1) : 0}%
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
              {formatCurrency(totalProfit, currency)}
            </div>
            <div className="text-[11.5px] text-slate-400 mt-1 flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              <span>إجمالي العائد من {sales.length} فواتير بيع مسجلة</span>
            </div>
          </div>
        </div>

        {/* Bento Card 2: Total Sales Revenue */}
        <div className="col-span-6 sm:col-span-3 bg-slate-850/90 border border-slate-800 p-4 rounded-2xl shadow-md flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">إجمالي المبيعات</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
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

        {/* Bento Card 3: Total Stock Pieces */}
        <div className="col-span-6 sm:col-span-3 bg-slate-850/90 border border-slate-800 p-4 rounded-2xl shadow-md flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">رصيد القطع</span>
            <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
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

        {/* Bento Card 4: Inventory Valuation Summary */}
        <div className="col-span-12 sm:col-span-6 bg-slate-850/90 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-md hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
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
              <div className="text-sm sm:text-base font-bold text-emerald-400">
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
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 group"
            >
              <span>التقرير الشامل</span>
              <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          </div>
          <div className="h-44 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                  formatter={(val: any) => [`${Number(val).toLocaleString('en-US')} ${currency}`]}
                />
                <Bar dataKey="sales" name="المبيعات" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="الأرباح" fill="#10b981" radius={[4, 4, 0, 0]} />
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
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 group"
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
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-white group-hover:text-emerald-300 transition-colors">
                            {invoice.customerName}
                          </span>
                          <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded font-mono border border-slate-700">
                            {invoice.invoiceNumber}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{formatArabicDateTime(invoice.date)}</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-semibold">ربح: {formatCurrency(invoice.totalProfit, currency)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-black text-xs text-white">
                        {formatCurrency(invoice.netAmount, currency)}
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold inline-block mt-0.5 ${
                        invoice.paymentStatus === 'paid'
                          ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
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
