import { Product, ReportPeriod, SaleInvoice, PurchaseInvoice, ProfitLossReport } from '../types';

export const formatCurrency = (amount: number, currency: string = 'د.ج'): string => {
  if (isNaN(amount) || amount === null || amount === undefined) return `0.00 ${currency}`;
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
};

export const formatNumber = (num: number): string => {
  if (isNaN(num) || num === null || num === undefined) return '0';
  return num.toLocaleString('en-US');
};

/**
 * Formats pieces into major & minor units representation
 * Example: 50 pieces with 12 pieces/carton -> "4 كرتونة و 2 قطعة"
 */
export const formatStockUnits = (
  totalPieces: number,
  piecesPerMajorUnit: number,
  majorUnit: string = 'كرتونة',
  minorUnit: string = 'قطعة',
  middleUnit?: string,
  piecesPerMiddleUnit?: number
): {
  majorCount: number;
  middleCount?: number;
  minorCount: number;
  displayText: string;
  shortText: string;
} => {
  const isIdentical = majorUnit.trim().toLowerCase() === minorUnit.trim().toLowerCase();
  const effectiveUnit = majorUnit || minorUnit || 'قطعة';

  const hasMid = Boolean(
    middleUnit &&
    piecesPerMiddleUnit &&
    piecesPerMiddleUnit > 1 &&
    piecesPerMajorUnit > piecesPerMiddleUnit &&
    middleUnit.trim().toLowerCase() !== minorUnit.trim().toLowerCase() &&
    middleUnit.trim().toLowerCase() !== majorUnit.trim().toLowerCase()
  );

  if (!piecesPerMajorUnit || piecesPerMajorUnit <= 1 || isIdentical) {
    return {
      majorCount: 0,
      middleCount: 0,
      minorCount: totalPieces,
      displayText: `${totalPieces} ${effectiveUnit}`,
      shortText: `${totalPieces} ${effectiveUnit}`,
    };
  }

  const isNegative = totalPieces < 0;
  const absPieces = Math.abs(totalPieces);

  if (hasMid && piecesPerMiddleUnit) {
    const majorCount = Math.floor(absPieces / piecesPerMajorUnit);
    const remMajor = absPieces % piecesPerMajorUnit;
    const middleCount = Math.floor(remMajor / piecesPerMiddleUnit);
    const minorCount = remMajor % piecesPerMiddleUnit;

    const parts: string[] = [];
    if (majorCount > 0) parts.push(`${majorCount} ${majorUnit}`);
    if (middleCount > 0) parts.push(`${middleCount} ${middleUnit}`);
    if (minorCount > 0 || (majorCount === 0 && middleCount === 0)) parts.push(`${minorCount} ${minorUnit}`);

    const text = (isNegative ? 'سالب ' : '') + parts.join(' و ');
    const short = (isNegative ? '-' : '') + parts.join(' + ');

    return {
      majorCount: isNegative ? -majorCount : majorCount,
      middleCount: isNegative ? -middleCount : middleCount,
      minorCount: isNegative ? -minorCount : minorCount,
      displayText: text,
      shortText: short,
    };
  }

  const majorCount = Math.floor(absPieces / piecesPerMajorUnit);
  const minorCount = absPieces % piecesPerMajorUnit;

  let parts: string[] = [];
  if (majorCount > 0) {
    parts.push(`${majorCount} ${majorUnit}`);
  }
  if (minorCount > 0 || majorCount === 0) {
    parts.push(`${minorCount} ${minorUnit}`);
  }

  const text = (isNegative ? 'سالب ' : '') + parts.join(' و ');
  const short = `${isNegative ? '-' : ''}${majorCount > 0 ? `${majorCount} ${majorUnit}` : ''}${majorCount > 0 && minorCount > 0 ? ' + ' : ''}${minorCount > 0 || majorCount === 0 ? `${minorCount} ${minorUnit}` : ''}`;

  return {
    majorCount: isNegative ? -majorCount : majorCount,
    minorCount: isNegative ? -minorCount : minorCount,
    displayText: text,
    shortText: short,
  };
};

/**
 * Get start and end date ISO string for a given report period
 */
export const getDateRangeForPeriod = (period: ReportPeriod, customStart?: string, customEnd?: string): { startDate: string; endDate: string; label: string } => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  // Set end of today
  end.setHours(23, 59, 59, 999);

  let label = 'اليوم';

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      label = 'اليوم';
      break;
    case 'yesterday':
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      label = 'أمس';
      break;
    case 'week':
      // Start of current week (Saturday or Sunday)
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 6 ? 0 : -1); // Adjusted for Arabic week
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      label = 'الأسبوع الحالي';
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      label = 'الشهر الحالي';
      break;
    case 'quarter':
      const currentMonth = now.getMonth();
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      start.setMonth(quarterStartMonth, 1);
      start.setHours(0, 0, 0, 0);
      label = 'الربع الحالي';
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      label = 'السنة الحالية';
      break;
    case 'custom':
      if (customStart) {
        const s = new Date(customStart);
        s.setHours(0, 0, 0, 0);
        return {
          startDate: s.toISOString(),
          endDate: customEnd ? new Date(customEnd + 'T23:59:59').toISOString() : end.toISOString(),
          label: 'فترة مخصصة'
        };
      }
      label = 'فترة مخصصة';
      break;
  }

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    label,
  };
};

/**
 * Calculate Comprehensive Profit & Loss for a specific date range
 */
export const calculateProfitLossReport = (
  sales: SaleInvoice[],
  purchases: PurchaseInvoice[],
  products: Product[],
  period: ReportPeriod,
  customStart?: string,
  customEnd?: string
): ProfitLossReport => {
  const { startDate, endDate } = getDateRangeForPeriod(period, customStart, customEnd);
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  // Filter sales in period
  const periodSales = sales.filter(s => {
    const time = new Date(s.date).getTime();
    return time >= start && time <= end;
  });

  // Filter purchases in period
  const periodPurchases = purchases.filter(p => {
    const time = new Date(p.date).getTime();
    return time >= start && time <= end;
  });

  let totalSalesRevenue = 0;
  let totalCostOfGoodsSold = 0;
  let totalProfit = 0;

  const productPerformanceMap: Record<string, {
    productId: string;
    productName: string;
    quantitySoldPieces: number;
    revenue: number;
    cost: number;
    profit: number;
  }> = {};

  const customerMap: Record<string, {
    customerId?: string;
    customerName: string;
    totalPurchased: number;
    invoiceCount: number;
  }> = {};

  periodSales.forEach(inv => {
    totalSalesRevenue += inv.netAmount;
    totalCostOfGoodsSold += inv.totalCost;
    totalProfit += inv.totalProfit;

    // Customer aggregations
    const custKey = inv.customerId || inv.customerName || 'عميل نقدي';
    if (!customerMap[custKey]) {
      customerMap[custKey] = {
        customerId: inv.customerId,
        customerName: inv.customerName || 'عميل نقدي',
        totalPurchased: 0,
        invoiceCount: 0,
      };
    }
    customerMap[custKey].totalPurchased += inv.netAmount;
    customerMap[custKey].invoiceCount += 1;

    // Item aggregations
    inv.items.forEach(item => {
      if (!productPerformanceMap[item.productId]) {
        productPerformanceMap[item.productId] = {
          productId: item.productId,
          productName: item.productName,
          quantitySoldPieces: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
        };
      }
      productPerformanceMap[item.productId].quantitySoldPieces += item.totalPieces;
      productPerformanceMap[item.productId].revenue += item.subtotal;
      productPerformanceMap[item.productId].cost += item.totalCost;
      productPerformanceMap[item.productId].profit += item.profit;
    });
  });

  const totalPurchasesCost = periodPurchases.reduce((acc, p) => acc + p.netAmount, 0);
  const profitMarginPercentage = totalSalesRevenue > 0 ? (totalProfit / totalSalesRevenue) * 100 : 0;

  const topProfitableProducts = Object.values(productPerformanceMap)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10);

  const topCustomers = Object.values(customerMap)
    .sort((a, b) => b.totalPurchased - a.totalPurchased)
    .slice(0, 10);

  // Inventory valuation
  let totalStockPieces = 0;
  let totalCostValue = 0;
  let totalRetailValue = 0;

  products.forEach(p => {
    if (p.stockPieces > 0) {
      totalStockPieces += p.stockPieces;
      totalCostValue += p.stockPieces * p.purchasePriceMinor;
      totalRetailValue += p.stockPieces * p.salePriceMinor;
    }
  });

  return {
    period,
    startDate,
    endDate,
    totalSalesRevenue,
    totalCostOfGoodsSold,
    grossProfit: totalProfit,
    profitMarginPercentage,
    totalPurchasesCost,
    invoicesCount: periodSales.length + periodPurchases.length,
    salesCount: periodSales.length,
    purchasesCount: periodPurchases.length,
    topProfitableProducts,
    topCustomers,
    inventoryValuation: {
      totalPieces: totalStockPieces,
      totalCostValue,
      totalRetailValue,
      expectedFutureProfit: totalRetailValue - totalCostValue,
    },
  };
};

export const formatArabicDateTime = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'م' : 'ص';
  hours = hours % 12 || 12;

  return `${y}/${m}/${d} - ${hours}:${minutes} ${ampm}`;
};

export const formatArabicDateOnly = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
};

/**
 * Normalizes Arabic text for flexible matching across Excel sheets and database:
 * - Unifies Alef forms (أ, إ, آ -> ا)
 * - Unifies Taa Marbouta (ة -> ه)
 * - Unifies Yaa (ى -> ي)
 * - Removes Arabic diacritics (harakat / tashkeel) and tatweel (ـ)
 * - Strips common packaging tags in parentheses like (وحدتان), (3 وحدات), (قطعة), (كرتونة)
 * - Normalizes multiple spaces
 */
export const normalizeArabicText = (str: string): string => {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F\u0670ـ]/g, '') // remove tashkeel/diacritics and tatweel
    .replace(/\s*\([^)]*\)\s*$/g, '') // strip trailing packaging like "(وحدتان)" or "(3 وحدات)"
    .replace(/\s+/g, ' ');
};

/**
 * Safely parses numbers from Algerian/French Excel spreadsheets and clipboard text:
 * Converts Arabic-Indic (٠-٩) and Persian (۰-۹) digits, handles decimal commas,
 * strips currency symbols, spaces, and scientific notation.
 */
export const parseLocalizedNumber = (val: any): number => {
  if (val === undefined || val === null || val === '') return NaN;
  if (typeof val === 'number') return isNaN(val) ? NaN : val;
  const str = String(val).trim();
  if (!str) return NaN;

  // Convert Arabic-Indic & Persian numerals
  const westernized = str
    .replace(/[٠۰]/g, '0')
    .replace(/[١۱]/g, '1')
    .replace(/[٢۲]/g, '2')
    .replace(/[٣۳]/g, '3')
    .replace(/[٤۴]/g, '4')
    .replace(/[٥۵]/g, '5')
    .replace(/[٦۶]/g, '6')
    .replace(/[٧۷]/g, '7')
    .replace(/[٨۸]/g, '8')
    .replace(/[٩۹]/g, '9')
    .replace(/\s+/g, '') // remove spaces in numbers like "1 200"
    .replace(/,/g, '.'); // convert decimal comma to period

  // Handle scientific notation e.g. 6.281E+11 or direct numbers
  const cleaned = westernized.replace(/[^0-9.eE+-]+/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? NaN : num;
};

/**
 * Checks if an imported product matches an existing product in the database:
 * 1. Barcode match (handling leading zeros and length)
 * 2. Exact or normalized Arabic name match
 * 3. Substring matching when one name contains the other
 */
export const areProductsMatching = (
  p1: { name?: string; barcode?: string },
  p2: { name?: string; barcode?: string }
): boolean => {
  const b1 = (p1.barcode || '').trim().replace(/^0+/, '');
  const b2 = (p2.barcode || '').trim().replace(/^0+/, '');

  if (b1 && b2 && b1.length >= 4 && b2.length >= 4 && b1 === b2) {
    return true;
  }

  const n1 = normalizeArabicText(p1.name || '');
  const n2 = normalizeArabicText(p2.name || '');

  if (n1 && n2) {
    if (n1 === n2) return true;
    // If one is a complete substring of the other (e.g. "مصاصة ساشي" inside "مصاصة ساشي Bifa GOOD POP")
    if (n1.length >= 6 && n2.length >= 6) {
      if (n1.includes(n2) || n2.includes(n1)) return true;
    }
  }

  return false;
};
