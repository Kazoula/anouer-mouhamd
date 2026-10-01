import { 
  Product, 
  Supplier, 
  Customer, 
  SaleInvoice, 
  PurchaseInvoice, 
  StockMovement,
  StoreConfig,
  OnlineStoreOrder,
  ThemeMode,
  PartnerPayment,
  PartnerSettlement
} from '../types';
import { initialProducts, initialSuppliers, initialCustomers, initialSales, initialPurchases, initialStockMovements } from '../data/mockData';
import { normalizeProductUnits } from './unitHelpers';
import { classifyProductCategory } from './categoryClassifier';
import { getIdbItem, setIdbItem, deleteIdbItem, clearIdb } from './idbStorage';

export const STORAGE_KEYS = {
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
  PAYMENTS: 'app_inventory_payments_v1',
  SETTLEMENTS: 'app_inventory_settlements_v1',
};

// In-Memory synchronous cache: Immune to localStorage quota limits (~5MB)
const memoryCache = new Map<string, string>();

// Preload cache from localStorage if available
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k) {
        const val = window.localStorage.getItem(k);
        if (val !== null) {
          memoryCache.set(k, val);
        }
      }
    }
  }
} catch (e) {
  console.warn('Initial localStorage cache preload warning:', e);
}

/**
 * Free up non-critical space in localStorage when QuotaExceededError is encountered.
 */
function tryFreeLocalStorageSpace(excludeKey: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;

    // 1. Compact stock movements in localStorage to last 30 entries (full list remains in memoryCache & IndexedDB)
    if (excludeKey !== STORAGE_KEYS.MOVEMENTS) {
      const movRaw = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
      if (movRaw) {
        try {
          const list = JSON.parse(movRaw);
          if (Array.isArray(list) && list.length > 30) {
            localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(list.slice(-30)));
          }
        } catch {}
      }
    }

    // 2. Compact sales in localStorage to last 50 entries
    if (excludeKey !== STORAGE_KEYS.SALES) {
      const salesRaw = localStorage.getItem(STORAGE_KEYS.SALES);
      if (salesRaw) {
        try {
          const list = JSON.parse(salesRaw);
          if (Array.isArray(list) && list.length > 50) {
            localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(list.slice(-50)));
          }
        } catch {}
      }
    }

    // 3. Compact purchases in localStorage to last 50 entries
    if (excludeKey !== STORAGE_KEYS.PURCHASES) {
      const purRaw = localStorage.getItem(STORAGE_KEYS.PURCHASES);
      if (purRaw) {
        try {
          const list = JSON.parse(purRaw);
          if (Array.isArray(list) && list.length > 50) {
            localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(list.slice(-50)));
          }
        } catch {}
      }
    }

    // 4. Remove any temporary / orphan keys not belonging to the app
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i);
      if (key && !key.startsWith('app_inventory_') && !key.startsWith('pos_')) {
        try {
          window.localStorage.removeItem(key);
        } catch {}
      }
    }
  } catch (err) {
    console.warn('Error during localStorage space cleanup:', err);
  }
}

/**
 * Safe Storage Engine:
 * Synchronous reads and writes backed by Memory Cache + LocalStorage + Asynchronous IndexedDB.
 * Completely immune to QuotaExceededError crashes.
 */
export const safeStorage = {
  getItem: (key: string): string | null => {
    // Check in-memory cache first for fastest access
    if (memoryCache.has(key)) {
      return memoryCache.get(key) ?? null;
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) {
          memoryCache.set(key, val);
          return val;
        }
      }
    } catch (e) {
      console.warn(`safeStorage.getItem error for key "${key}":`, e);
    }
    return null;
  },

  setItem: (key: string, value: string): void => {
    // 1. Always update memory cache synchronously (unlimited memory, never throws QuotaExceededError)
    memoryCache.set(key, value);

    // 2. Persist to IndexedDB asynchronously (handles hundreds of megabytes)
    try {
      setIdbItem(key, value).catch((idbErr) => {
        console.warn(`IndexedDB setItem error for key "${key}":`, idbErr);
      });
    } catch {}

    // 3. Persist to localStorage safely with quota recovery
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e: any) {
      // Check for QuotaExceededError (code 22 in Chrome/Safari, 1014 in Firefox, or name QuotaExceededError)
      const isQuotaError = 
        e?.name === 'QuotaExceededError' || 
        e?.name === 'NS_ERROR_DOM_QUOTA_REACHED' || 
        e?.code === 22 || 
        e?.code === 1014 ||
        (typeof e?.message === 'string' && e.message.toLowerCase().includes('quota'));

      if (isQuotaError) {
        console.warn(`[SafeStorage] LocalStorage quota exceeded for "${key}". Attempting smart cleanup...`);
        tryFreeLocalStorageSpace(key);

        // Retry saving after freeing non-critical space
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(key, value);
            return;
          }
        } catch {
          // If still failing after cleanup, safely suppress the error.
          // The data is already securely preserved in memoryCache and IndexedDB.
          console.warn(`[SafeStorage] Could not fit "${key}" into localStorage. Data is safely stored in Memory Cache and IndexedDB.`);
        }
      } else {
        console.warn(`[SafeStorage] Error setting key "${key}" in localStorage:`, e);
      }
    }
  },

  removeItem: (key: string): void => {
    memoryCache.delete(key);
    try {
      deleteIdbItem(key).catch(() => {});
    } catch {}
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`safeStorage.removeItem error for key "${key}":`, e);
    }
  },

  clear: (): void => {
    memoryCache.clear();
    try {
      clearIdb().catch(() => {});
    } catch {}
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch (e) {
      console.warn('safeStorage.clear error:', e);
    }
  }
};

/**
 * Hydrates state and memory cache from IndexedDB on startup.
 * Returns hydrated datasets if IndexedDB contains data that was too large for localStorage.
 */
export async function hydrateFromIndexedDB(): Promise<{
  products?: Product[];
  suppliers?: Supplier[];
  customers?: Customer[];
  sales?: SaleInvoice[];
  purchases?: PurchaseInvoice[];
  movements?: StockMovement[];
  storeConfig?: StoreConfig;
  onlineOrders?: OnlineStoreOrder[];
}> {
  const result: {
    products?: Product[];
    suppliers?: Supplier[];
    customers?: Customer[];
    sales?: SaleInvoice[];
    purchases?: PurchaseInvoice[];
    movements?: StockMovement[];
    storeConfig?: StoreConfig;
    onlineOrders?: OnlineStoreOrder[];
  } = {};

  try {
    const rawProds = await getIdbItem<string>(STORAGE_KEYS.PRODUCTS);
    if (rawProds) {
      memoryCache.set(STORAGE_KEYS.PRODUCTS, rawProds);
      try {
        const parsed = JSON.parse(rawProds);
        if (Array.isArray(parsed) && parsed.length > 0) {
          result.products = parsed.map(repairAndClassifyProduct);
        }
      } catch {}
    }

    const rawSales = await getIdbItem<string>(STORAGE_KEYS.SALES);
    if (rawSales) {
      memoryCache.set(STORAGE_KEYS.SALES, rawSales);
      try {
        const parsed = JSON.parse(rawSales);
        if (Array.isArray(parsed) && parsed.length > 0) {
          result.sales = parsed;
        }
      } catch {}
    }

    const rawMovements = await getIdbItem<string>(STORAGE_KEYS.MOVEMENTS);
    if (rawMovements) {
      memoryCache.set(STORAGE_KEYS.MOVEMENTS, rawMovements);
      try {
        const parsed = JSON.parse(rawMovements);
        if (Array.isArray(parsed) && parsed.length > 0) {
          result.movements = parsed;
        }
      } catch {}
    }
  } catch (err) {
    console.warn('hydrateFromIndexedDB warning:', err);
  }

  return result;
}

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
    const raw = safeStorage.getItem(STORAGE_KEYS.STORE_CONFIG);
    return raw ? { ...defaultStoreConfig, ...JSON.parse(raw) } : defaultStoreConfig;
  } catch (e) {
    console.error('Error loading store config', e);
    return defaultStoreConfig;
  }
};

export const saveStoredStoreConfig = (config: StoreConfig) => {
  try {
    safeStorage.setItem(STORAGE_KEYS.STORE_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving store config', e);
  }
};

export const getStoredOnlineOrders = (): OnlineStoreOrder[] => {
  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.ONLINE_ORDERS);
    return raw ? JSON.parse(raw) : initialOnlineOrders;
  } catch (e) {
    console.error('Error loading online orders', e);
    return initialOnlineOrders;
  }
};

export const saveStoredOnlineOrders = (orders: OnlineStoreOrder[]) => {
  try {
    safeStorage.setItem(STORAGE_KEYS.ONLINE_ORDERS, JSON.stringify(orders));
  } catch (e) {
    console.error('Error saving online orders', e);
  }
};

export const getStoredCurrency = (): string => {
  return safeStorage.getItem(STORAGE_KEYS.CURRENCY) || 'د.ج';
};

export const setStoredCurrency = (curr: string) => {
  try {
    safeStorage.setItem(STORAGE_KEYS.CURRENCY, curr);
  } catch (e) {
    console.error('Error setting currency', e);
  }
};

export const getStoredTheme = (): ThemeMode => {
  return (safeStorage.getItem(STORAGE_KEYS.THEME) as ThemeMode) || 'dark';
};

export const saveStoredTheme = (theme: ThemeMode) => {
  try {
    safeStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch (e) {
    console.error('Error saving theme', e);
  }
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
    const raw = safeStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const list: Product[] = raw ? JSON.parse(raw) : initialProducts;
    return list.map(repairAndClassifyProduct);
  } catch (e) {
    console.error('Error loading products from storage', e);
    return initialProducts.map(repairAndClassifyProduct);
  }
};

export const saveStoredProducts = (products: Product[]) => {
  try {
    const normalized = products.map(repairAndClassifyProduct);
    safeStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(normalized));
  } catch (e) {
    console.error('Error saving products to storage', e);
  }
};

export const getStoredSuppliers = (): Supplier[] => {
  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.SUPPLIERS);
    return raw !== null ? JSON.parse(raw) : initialSuppliers;
  } catch (e) {
    console.error('Error loading suppliers from storage', e);
    return [];
  }
};

export const saveStoredSuppliers = (suppliers: Supplier[]) => {
  try {
    safeStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
  } catch (e) {
    console.error('Error saving suppliers to storage', e);
  }
};

export const getStoredCustomers = (): Customer[] => {
  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return raw !== null ? JSON.parse(raw) : initialCustomers;
  } catch (e) {
    console.error('Error loading customers from storage', e);
    return [];
  }
};

export const saveStoredCustomers = (customers: Customer[]) => {
  try {
    safeStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  } catch (e) {
    console.error('Error saving customers to storage', e);
  }
};

export const getStoredSales = (): SaleInvoice[] => {
  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.SALES);
    return raw ? JSON.parse(raw) : initialSales;
  } catch (e) {
    console.error('Error loading sales from storage', e);
    return initialSales;
  }
};

export const saveStoredSales = (sales: SaleInvoice[]) => {
  try {
    safeStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
  } catch (e) {
    console.error('Error saving sales to storage', e);
  }
};

export const getStoredPurchases = (): PurchaseInvoice[] => {
  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.PURCHASES);
    return raw ? JSON.parse(raw) : initialPurchases;
  } catch (e) {
    console.error('Error loading purchases from storage', e);
    return initialPurchases;
  }
};

export const saveStoredPurchases = (purchases: PurchaseInvoice[]) => {
  try {
    safeStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases));
  } catch (e) {
    console.error('Error saving purchases to storage', e);
  }
};

export const getStoredMovements = (): StockMovement[] => {
  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.MOVEMENTS);
    return raw ? JSON.parse(raw) : initialStockMovements;
  } catch (e) {
    console.error('Error loading movements from storage', e);
    return initialStockMovements;
  }
};

export const saveStoredMovements = (movements: StockMovement[]) => {
  try {
    safeStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(movements));
  } catch (e) {
    console.error('Error saving movements to storage', e);
  }
};

export const getStoredPayments = (): PartnerPayment[] => {
  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.PAYMENTS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error loading payments from storage', e);
    return [];
  }
};

export const saveStoredPayments = (payments: PartnerPayment[]) => {
  try {
    safeStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  } catch (e) {
    console.error('Error saving payments to storage', e);
  }
};

export const getStoredSettlements = (): PartnerSettlement[] => {
  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.SETTLEMENTS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error loading settlements from storage', e);
    return [];
  }
};

export const saveStoredSettlements = (settlements: PartnerSettlement[]) => {
  try {
    safeStorage.setItem(STORAGE_KEYS.SETTLEMENTS, JSON.stringify(settlements));
  } catch (e) {
    console.error('Error saving settlements to storage', e);
  }
};

export const resetAllData = () => {
  try {
    safeStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(initialProducts));
    safeStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(initialSuppliers));
    safeStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(initialCustomers));
    safeStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(initialSales));
    safeStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(initialPurchases));
    safeStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(initialStockMovements));
  } catch (e) {
    console.error('Error resetting all data', e);
  }
};

export const exportDataBackup = () => {
  try {
    const data = {
      products: getStoredProducts(),
      suppliers: getStoredSuppliers(),
      customers: getStoredCustomers(),
      sales: getStoredSales(),
      purchases: getStoredPurchases(),
      movements: getStoredMovements(),
      payments: getStoredPayments(),
      settlements: getStoredSettlements(),
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
  } catch (e) {
    console.error('Error exporting data backup', e);
  }
};
