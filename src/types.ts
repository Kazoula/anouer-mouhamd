export interface Product {
  id: string;
  name: string;
  barcode: string;
  category: string;
  majorUnit: string;        // e.g., 'كرتونة', 'صندوق', 'شوال'
  middleUnit?: string;      // e.g., 'علبة', 'باكت', 'طرد' (الوحدة الوسطى / الوحدة الثالثة)
  minorUnit: string;        // e.g., 'قطعة', 'حبة', 'علبة', 'كيلو'
  piecesPerMajorUnit: number; // e.g., 24 pieces in 1 carton
  piecesPerMiddleUnit?: number; // e.g., 6 pieces in 1 middle unit (عدد القطع في الوحدة الوسطى)
  purchasePriceMinor: number; // purchase price per 1 piece
  purchasePriceMiddle?: number; // purchase price per middle unit (سعر شراء الوسطى)
  purchasePriceMajor: number; // purchase price per major unit
  salePriceMinor: number;     // sale price per 1 piece
  salePriceMiddle?: number;   // sale price per middle unit (سعر بيع الوسطى)
  salePriceMajor: number;     // sale price per major unit
  stockPieces: number;        // total current stock count in minor pieces
  minStockAlert: number;      // threshold in pieces for low stock alert
  defaultSupplierId?: string; // default supplier ID
  defaultSupplierName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  company?: string;
  address?: string;
  balance: number; // positive = we owe them (creditor), negative = they owe us
  creditLimit?: number; // حد الإئتمان
  lastTransactionDate?: string; // آخر تعامل
  isActive?: boolean; // نشط (افتراضياً true)
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  company?: string;
  address?: string;
  balance: number; // positive = they owe us (debtor), negative = paid in advance
  creditLimit?: number; // حد الإئتمان
  lastTransactionDate?: string; // آخر تعامل
  isActive?: boolean; // نشط (افتراضياً true)
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  unitType: 'minor' | 'middle' | 'major';
  unitName: string;
  quantity: number;
  piecesPerMajorUnit: number;
  piecesPerMiddleUnit?: number;
  totalPieces: number;
  unitPrice: number;        // sale or purchase unit price
  unitCost: number;         // unit cost for profit calculation
  subtotal: number;
  totalCost: number;
  profit: number;           // subtotal - totalCost
}

export interface SaleInvoice {
  id: string;
  invoiceNumber: string;
  date: string;              // ISO format string or YYYY-MM-DD HH:mm
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  netAmount: number;
  totalCost: number;
  totalProfit: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'credit';
  paymentStatus: 'paid' | 'partial' | 'credit';
  notes?: string;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  date: string;              // ISO format string
  supplierId?: string;
  supplierName: string;
  supplierPhone?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  netAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: 'cash' | 'transfer' | 'credit';
  paymentStatus: 'paid' | 'partial' | 'credit';
  notes?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  date: string;
  type: 'sale' | 'purchase' | 'adjustment_add' | 'adjustment_sub';
  quantityPieces: number;
  previousStock: number;
  newStock: number;
  unitType?: 'minor' | 'middle' | 'major';
  unitQuantity?: number;
  unitName?: string;
  referenceInvoice?: string;
  partyName?: string; // customer or supplier
  notes?: string;
}

export type ReportPeriod = 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface ProfitLossReport {
  period: ReportPeriod;
  startDate: string;
  endDate: string;
  totalSalesRevenue: number;
  totalCostOfGoodsSold: number;
  grossProfit: number;
  profitMarginPercentage: number;
  totalPurchasesCost: number;
  invoicesCount: number;
  salesCount: number;
  purchasesCount: number;
  topProfitableProducts: {
    productId: string;
    productName: string;
    quantitySoldPieces: number;
    revenue: number;
    cost: number;
    profit: number;
  }[];
  topCustomers: {
    customerId?: string;
    customerName: string;
    totalPurchased: number;
    invoiceCount: number;
  }[];
  inventoryValuation: {
    totalPieces: number;
    totalCostValue: number;
    totalRetailValue: number;
    expectedFutureProfit: number;
  };
}

export type ActiveTab = 'dashboard' | 'products' | 'pos' | 'purchases' | 'store' | 'reports' | 'partners';

export type ThemeMode = 'dark' | 'light' | 'system';

export interface StoreConfig {
  storeName: string;
  storeTagline: string;
  phoneWhatsApp: string;
  storeAddress: string;
  storeCurrency: string;
  isOnlineStoreActive: boolean;
  allowWhatsAppOrders: boolean;
  platform: 'custom' | 'woocommerce' | 'shopify' | 'youcan' | 'pos_direct';
  apiKey: string;
  apiSecret: string;
  webhookUrl: string;
  externalStoreUrl: string;
  autoDeductStockOnOrder: boolean;
  thermalPrinterEnabled: boolean;
  thermalPrinterPaperSize: '58mm' | '80mm';
  barcodeScannerSound: boolean;
}

export interface OnlineStoreOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitType: 'minor' | 'middle' | 'major';
    unitName: string;
    unitPrice: number;
    subtotal: number;
  }[];
  totalAmount: number;
  paymentMethod: 'cash_on_delivery' | 'online' | 'store_pickup';
  status: 'pending' | 'accepted' | 'rejected' | 'delivered';
  createdAt: string;
  notes?: string;
}

export interface AppPreferences {
  searchTypingDelaySec?: number;
  theme?: ThemeMode;
  currency?: string;
  updatedAt?: string;
}

export interface PartnerPayment {
  id: string;
  receiptNumber: string;
  partnerType: 'customer' | 'supplier';
  partnerId: string;
  partnerName: string;
  partnerPhone?: string;
  amount: number;
  date: string; // ISO format or YYYY-MM-DDTHH:mm
  paymentMethod: 'cash' | 'card' | 'transfer' | 'check';
  previousBalance: number;
  newBalance: number;
  notes?: string;
  createdAt: string;
}
