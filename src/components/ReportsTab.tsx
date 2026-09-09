import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Boxes, 
  Printer, 
  ArrowUpRight, 
  Award, 
  Users, 
  PieChart as PieIcon,
  ChevronDown,
  Download,
  Info
} from 'lucide-react';
import { Product, SaleInvoice, PurchaseInvoice, ReportPeriod, ProfitLossReport } from '../types';
import { calculateProfitLossReport, formatCurrency, formatArabicDateOnly, formatArabicDateTime } from '../utils/calculations';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

interface ReportsTabProps {
  products: Product[];
  sales: SaleInvoice[];
  purchases: PurchaseInvoice[];
  currency: string;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  products,
  sales,
  purchases,
  currency,
}) => {
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [showPrintView, setShowPrintView] = useState(false);

  // Compute report
  const report: ProfitLossReport = useMemo(() => {
    return calculateProfitLossReport(sales, purchases, products, period, customStart, customEnd);
  }, [sales, purchases, products, period, customStart, customEnd]);

  // Chart data for revenue vs cost vs profit
  const financialOverviewData = [
    {
      name: 'المؤشرات المالية',
      المبيعات: report.totalSalesRevenue,
      التكلفة: report.totalCostOfGoodsSold,
      الربح: report.grossProfit,
      المشتريات: report.totalPurchasesCost,
    },
  ];

  // Top products pie chart data
  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];
  const pieData = report.topProfitableProducts.slice(0, 5).map(p => ({
    name: p.productName,
    value: p.profit,
  }));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 pb-20 pt-2 px-3 sm:px-4">
      {/* Period Selector Tabs */}
      <div className="bg-slate-850 p-2.5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>اختر الفترة الدورية للتقرير</span>
          </div>
          <button
            id="print-report-btn"
            onClick={handlePrint}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-700 shadow-sm transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-400" />
            <span>طباعة التقرير</span>
          </button>
        </div>

        {/* Period Chips */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-xs">
          {[
            { id: 'today' as ReportPeriod, label: 'اليوم' },
            { id: 'yesterday' as ReportPeriod, label: 'أمس' },
            { id: 'week' as ReportPeriod, label: 'هذا الأسبوع' },
            { id: 'month' as ReportPeriod, label: 'هذا الشهر' },
            { id: 'year' as ReportPeriod, label: 'هذا العام' },
            { id: 'custom' as ReportPeriod, label: 'فترة مخصصة' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`py-2 px-2 rounded-xl font-bold border transition-all text-center ${
                period === p.id
                  ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 shadow-md'
                  : 'bg-slate-800 border-slate-750 text-slate-400 hover:text-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Date Inputs if 'custom' selected */}
        {period === 'custom' && (
          <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2.5 border-t border-slate-800 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">من تاريخ</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-medium"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">إلى تاريخ</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-medium"
              />
            </div>
          </div>
        )}
      </div>

      {/* Date Range Display */}
      <div className="text-center text-xs text-slate-400">
        فترة التقرير: من <strong className="text-slate-200">{formatArabicDateOnly(report.startDate)}</strong> إلى <strong className="text-slate-200">{formatArabicDateOnly(report.endDate)}</strong>
      </div>

      {/* Printable Area Wrapper */}
      <div className="space-y-4 printable-area">
        {/* Printable Header (Visible only in print / formal layout) */}
        <div className="hidden print:block text-slate-900 mb-6 text-center border-b pb-4">
          <h2 className="text-lg font-bold text-slate-700">مخزون فريدون</h2>
          <h1 className="text-2xl font-black">تقرير الأرباح والخسائر والمخزون الدوري</h1>
          <p className="text-sm text-slate-600 mt-1">
            الفترة من {formatArabicDateOnly(report.startDate)} إلى {formatArabicDateOnly(report.endDate)}
          </p>
          <p className="text-xs text-slate-500">تاريخ الطباعة: {formatArabicDateTime(new Date().toISOString())}</p>
        </div>

        {/* Primary Financial Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Gross Profit */}
          <div className="bg-gradient-to-br from-emerald-950/40 via-slate-850 to-slate-850 p-3.5 rounded-2xl border border-emerald-500/40 shadow-lg col-span-2 sm:col-span-1">
            <span className="text-[11px] text-slate-400 font-semibold block mb-1">صافي الأرباح المحققة</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-400">
              {formatCurrency(report.grossProfit, currency)}
            </div>
            <div className="text-[11px] text-emerald-300/80 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>هامش الربح {report.profitMarginPercentage.toFixed(1)}%</span>
            </div>
          </div>

          {/* Total Sales */}
          <div className="bg-slate-850 p-3.5 rounded-2xl border border-slate-800 shadow-lg">
            <span className="text-[11px] text-slate-400 font-semibold block mb-1">إجمالي المبيعات</span>
            <div className="text-lg sm:text-xl font-black text-white">
              {formatCurrency(report.totalSalesRevenue, currency)}
            </div>
            <span className="text-[10.5px] text-slate-400 mt-1 block">
              {report.salesCount} فواتير بيع
            </span>
          </div>

          {/* COGS (Cost of goods sold) */}
          <div className="bg-slate-850 p-3.5 rounded-2xl border border-slate-800 shadow-lg">
            <span className="text-[11px] text-slate-400 font-semibold block mb-1">تكلفة البضاعة المباعة</span>
            <div className="text-lg sm:text-xl font-bold text-amber-400">
              {formatCurrency(report.totalCostOfGoodsSold, currency)}
            </div>
            <span className="text-[10.5px] text-slate-400 mt-1 block">
              سعر شراء البضاعة المباعة
            </span>
          </div>

          {/* Purchases Total */}
          <div className="bg-slate-850 p-3.5 rounded-2xl border border-slate-800 shadow-lg">
            <span className="text-[11px] text-slate-400 font-semibold block mb-1">إجمالي المشتريات بالفترة</span>
            <div className="text-lg sm:text-xl font-bold text-blue-400">
              {formatCurrency(report.totalPurchasesCost, currency)}
            </div>
            <span className="text-[10.5px] text-slate-400 mt-1 block">
              {report.purchasesCount} فواتير توريد
            </span>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Financial Overview Bar Chart */}
          <div className="bg-slate-850 p-3.5 rounded-2xl border border-slate-800 shadow-md">
            <h3 className="text-xs font-bold text-slate-200 mb-2">مقارنة الإيرادات والتكاليف والأرباح</h3>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialOverviewData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(val: any) => [`${Number(val).toLocaleString('en-US')} ${currency}`]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="المبيعات" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="التكلفة" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="الربح" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="المشتريات" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Inventory Valuation Breakdown */}
          <div className="bg-slate-850 p-3.5 rounded-2xl border border-slate-800 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-2.5">
                <Boxes className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-slate-200">تقييم المخزون الحالي وأرباحه المستقبلية</h3>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400">إجمالي كمية القطع بالمستودع:</span>
                  <span className="font-bold text-white">{report.inventoryValuation.totalPieces.toLocaleString('en-US')} قطعة</span>
                </div>

                <div className="flex justify-between items-center bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400">القيمة الإجمالية بسعر الشراء (رأس المال):</span>
                  <span className="font-bold text-amber-400">{formatCurrency(report.inventoryValuation.totalCostValue, currency)}</span>
                </div>

                <div className="flex justify-between items-center bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400">القيمة المتوقعة بسعر البيع (الإيراد المتوقع):</span>
                  <span className="font-bold text-white">{formatCurrency(report.inventoryValuation.totalRetailValue, currency)}</span>
                </div>

                <div className="flex justify-between items-center bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-500/30">
                  <span className="font-bold text-emerald-300">صافي الأرباح المتوقعة عند بيع المخزون:</span>
                  <span className="font-black text-emerald-400 text-sm">
                    {formatCurrency(report.inventoryValuation.expectedFutureProfit, currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Profitable Products Leaderboard */}
        <div className="bg-slate-850 p-3.5 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-slate-200">الأصناف الأكثر تحقيقاً للأرباح خلال الفترة</h3>
          </div>

          {report.topProfitableProducts.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              لا توجد مبيعات مسجلة في هذه الفترة المختارة
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800 pb-2">
                    <th className="py-2 pr-2 font-semibold">الصنف</th>
                    <th className="py-2 text-center font-semibold">القطع المباعة</th>
                    <th className="py-2 text-center font-semibold">إجمالي المبيعات</th>
                    <th className="py-2 text-center font-semibold">التكلفة</th>
                    <th className="py-2 pl-2 text-left font-semibold">صافي الربح</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {report.topProfitableProducts.map((prod, idx) => (
                    <tr key={prod.productId} className="hover:bg-slate-800/40">
                      <td className="py-2.5 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-white">{prod.productName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-center text-slate-300 font-mono">
                        {prod.quantitySoldPieces} قطعة
                      </td>
                      <td className="py-2.5 text-center text-slate-200">
                        {formatCurrency(prod.revenue, currency)}
                      </td>
                      <td className="py-2.5 text-center text-slate-400">
                        {formatCurrency(prod.cost, currency)}
                      </td>
                      <td className="py-2.5 pl-2 text-left font-black text-emerald-400">
                        +{formatCurrency(prod.profit, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Customers Breakdown */}
        <div className="bg-slate-850 p-3.5 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold text-slate-200">أعلى العملاء شراءً خلال الفترة</h3>
          </div>

          {report.topCustomers.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              لا توجد مبيعات مسجلة في هذه الفترة
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {report.topCustomers.map((cust, idx) => (
                <div key={idx} className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[11px]">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-white">{cust.customerName}</div>
                      <div className="text-[10.5px] text-slate-400">{cust.invoiceCount} فواتير</div>
                    </div>
                  </div>
                  <div className="font-black text-emerald-400">
                    {formatCurrency(cust.totalPurchased, currency)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Print Signatures (Print mode only) */}
        <div className="hidden print:flex justify-between items-center pt-12 text-xs text-slate-900 border-t mt-8">
          <div>
            <p className="font-bold">توقيع المسؤول المالي:</p>
            <p className="mt-8">......................................</p>
          </div>
          <div>
            <p className="font-bold">اعتماد الإدارة:</p>
            <p className="mt-8">......................................</p>
          </div>
        </div>
      </div>
    </div>
  );
};
