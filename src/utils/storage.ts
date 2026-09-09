import { 
  Product, 
  Supplier, 
  Customer, 
  SaleInvoice, 
  PurchaseInvoice, 
  StockMovement,
  StoreConfig,
  OnlineStoreOrder,
  ThemeMode
} from '../types';
import { initialProducts, initialSuppliers, initialCustomers, initialSales, initialPurchases, initialStockMovements } from '../data/mockData';
import { normalizeProductUnits } from './unitHelpers';
import { classifyProductCategory } from './categoryClassifier';

const STORAGE_KEYS = {
  PRODUCTS: 'app_inventory_products_v1',
  SUPPLIERS: 'app_inventory_suppliers_v1',
  CUSTOMERS: 'app_inventory_customers_v1',
  SALES: 'app_inventory_sales_v1',
  PURCHASES: 'app_inventory_purchases_v1',
  MOVEMENTS: 'app_inventory_movements_v1',
  CURRENCY: 'app_inventory_currency_v2',
  THEME: 'app_inventory_theme_mode_v1',
  STORE_CONFIG: 'app_inventory_store_config_v1',
  ONLINE_ORDERS: 'app_inventory_online_orders_v1',
};

export const defaultStoreConfig: StoreConfig = {
  storeName: 'مخزون فريدون',
  storeTagline: 'سوق الجملة والتجزئة - جودة وأسعار منافسة',
  phoneWhatsApp: '+213 555 000 111',
  storeAddress: 'الجزائر العاصمة - حي التجارة المركزي',
  storeCurrency: 'د.ج',
  isOnlineStoreActive: true,
  allowWhatsAppOrders: true,
  platform: 'custom',
  apiKey: 'frd_live_89b2c7e491204d1',
  apiSecret: 'sec_live_9941a80c2f7b88e1a',
  webhookUrl: 'https://api.faridoun-inventory.dz/v1/store-webhook',
  externalStoreUrl: 'https://faridoun-store.dz',
  autoDeductStockOnOrder: true,
  thermalPrinterEnabled: true,
  thermalPrinterPaperSize: '80mm',
  barcodeScannerSound: true,
};

export const initialOnlineOrders: OnlineStoreOrder[] = [
  {
    id: 'ord_101',
    orderNumber: 'ORD-2026-081',
    customerName: 'كمال بلقاسم',
    customerPhone: '0555123456',
    customerAddress: 'الجزائر - ديدوش مراد',
    items: [
      {
        productId: 'prod_1',
        productName: 'أرز بسمتي فاخر هندي',
        quantity: 2,
        unitType: 'minor',
        unitName: 'شوال',
        unitPrice: 115.00,
        subtotal: 230.00
      }
    ],
    totalAmount: 230.00,
    paymentMethod: 'cash_on_delivery',
    status: 'pending',
    createdAt: new Date().toISOString(),
    notes: 'يرجى التوصيل بعد العصر'
  }
];

export const getStoredStoreConfig = (): StoreConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STORE_CONFIG);
    return raw ? { ...defaultStoreConfig, ...JSON.parse(raw) } : defaultStoreConfig;
  } catch (e) {
    console.error('Error loading store config', e);
    return defaultStoreConfig;
  }
};

export const saveStoredStoreConfig = (config: StoreConfig) => {
  localStorage.setItem(STORAGE_KEYS.STORE_CONFIG, JSON.stringify(config));
};

export const getStoredOnlineOrders = (): OnlineStoreOrder[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ONLINE_ORDERS);
    return raw ? JSON.parse(raw) : initialOnlineOrders;
  } catch (e) {
    console.error('Error loading online orders', e);
    return initialOnlineOrders;
  }
};

export const saveStoredOnlineOrders = (orders: OnlineStoreOrder[]) => {
  localStorage.setItem(STORAGE_KEYS.ONLINE_ORDERS, JSON.stringify(orders));
};

export const getStoredCurrency = (): string => {
  return localStorage.getItem(STORAGE_KEYS.CURRENCY) || 'د.ج';
};

export const setStoredCurrency = (curr: string) => {
  localStorage.setItem(STORAGE_KEYS.CURRENCY, curr);
};

export const getStoredTheme = (): ThemeMode => {
  return (localStorage.getItem(STORAGE_KEYS.THEME) as ThemeMode) || 'dark';
};

export const saveStoredTheme = (theme: ThemeMode) => {
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
};

export const repairAndClassifyProduct = (prod: Product): Product => {
  if (!prod) return prod;
  let p = { ...prod };

  // Repair Bimo casse croute specifically if it was imported incompletely or single-unit
  const lowerName = (p.name || '').toLowerCase();
  if (lowerName.includes('bimo') && lowerName.includes('casse') && (Number(p.piecesPerMajorUnit) <= 1 || p.category === 'عام')) {
    p.category = 'بسكويت وحلويات';
    p.majorUnit = 'كرتونة';
    p.minorUnit = 'قطعة';
    p.piecesPerMajorUnit = 20;
    p.salePriceMinor = p.salePriceMinor > 0 ? p.salePriceMinor : 90;
    p.salePriceMajor = (p.salePriceMajor > 0 && p.salePriceMajor !== 90) ? p.salePriceMajor : 1750;
    if (!p.notes || !p.notes.includes('1700')) {
      p.notes = [p.notes, 'سعر 5 فما فوق للكرتونة: 1700 د.ج'].filter(Boolean).join(' | ');
    }
  }

  // Auto-classify category if generic 'عام' or empty
  if (!p.category || p.category === 'عام' || p.category === 'عامة' || p.category.toLowerCase() === 'general') {
    p.category = classifyProductCategory(p.name, p.category);
  }

  return normalizeProductUnits(p);
};

export const getStoredProducts = (): Product[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const list: Product[] = raw ? JSON.parse(raw) : initialProducts;
    return list.map(repairAndClassifyProduct);
  } catch (e) {
    console.error('Error loading products from storage', e);
    return initialProducts.map(repairAndClassifyProduct);
  }
};

export const saveStoredProducts = (products: Product[]) => {
  const normalized = products.map(repairAndClassifyProduct);
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(normalized));
};

export const getStoredSuppliers = (): Supplier[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
    return raw ? JSON.parse(raw) : initialSuppliers;
  } catch (e) {
    console.error('Error loading suppliers from storage', e);
    return initialSuppliers;
  }
};

export const saveStoredSuppliers = (suppliers: Supplier[]) => {
  localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
};

export const getStoredCustomers = (): Customer[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return raw ? JSON.parse(raw) : initialCustomers;
  } catch (e) {
    console.error('Error loading customers from storage', e);
    return initialCustomers;
  }
};

export const saveStoredCustomers = (customers: Customer[]) => {
  localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
};

export const getStoredSales = (): SaleInvoice[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SALES);
    return raw ? JSON.parse(raw) : initialSales;
  } catch (e) {
    console.error('Error loading sales from storage', e);
    return initialSales;
  }
};

export const saveStoredSales = (sales: SaleInvoice[]) => {
  localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
};

export const getStoredPurchases = (): PurchaseInvoice[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PURCHASES);
    return raw ? JSON.parse(raw) : initialPurchases;
  } catch (e) {
    console.error('Error loading purchases from storage', e);
    return initialPurchases;
  }
};

export const saveStoredPurchases = (purchases: PurchaseInvoice[]) => {
  localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases));
};

export const getStoredMovements = (): StockMovement[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
    return raw ? JSON.parse(raw) : initialStockMovements;
  } catch (e) {
    console.error('Error loading movements from storage', e);
    return initialStockMovements;
  }
};

export const saveStoredMovements = (movements: StockMovement[]) => {
  localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(movements));
};

export const resetAllData = () => {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(initialProducts));
  localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(initialSuppliers));
  localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(initialCustomers));
  localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(initialSales));
  localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(initialPurchases));
  localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(initialStockMovements));
};

export const exportDataBackup = () => {
  const data = {
    products: getStoredProducts(),
    suppliers: getStoredSuppliers(),
    customers: getStoredCustomers(),
    sales: getStoredSales(),
    purchases: getStoredPurchases(),
    movements: getStoredMovements(),
    currency: getStoredCurrency(),
    exportedAt: new Date().toISOString(),
  };
  const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", jsonStr);
  downloadAnchor.setAttribute("download", `makhzan_faridoun_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};
