import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db, initFirebaseAuth } from '../lib/firebase';
import { 
  Product, 
  Supplier, 
  Customer, 
  SaleInvoice, 
  PurchaseInvoice, 
  StockMovement, 
  StoreConfig, 
  OnlineStoreOrder,
  AppPreferences,
  PartnerPayment
} from '../types';
import { normalizeProductUnits } from '../utils/unitHelpers';

export const COLLECTIONS = {
  PRODUCTS: 'products',
  SUPPLIERS: 'suppliers',
  CUSTOMERS: 'customers',
  SALES: 'sales',
  PURCHASES: 'purchases',
  MOVEMENTS: 'movements',
  SETTINGS: 'settings',
  ONLINE_ORDERS: 'online_orders',
  PAYMENTS: 'payments',
};

/**
 * Deeply removes all `undefined` values from an object or array.
 * Firestore strictly throws `Unsupported field value: undefined` if any property is undefined.
 */
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => cleanForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

/**
 * Seed initial data if Firestore products collection is empty.
 * Uses safe 200-document batches and data sanitization.
 */
export async function seedInitialFirestoreData(
  localProducts: Product[] = [],
  localSuppliers: Supplier[] = [],
  localCustomers: Customer[] = [],
  localSales: SaleInvoice[] = [],
  localPurchases: PurchaseInvoice[] = [],
  localMovements: StockMovement[] = [],
  localStoreConfig?: StoreConfig,
  localOnlineOrders: OnlineStoreOrder[] = []
) {
  try {
    await initFirebaseAuth();

    const prods = Array.isArray(localProducts) ? localProducts : [];
    const sups = Array.isArray(localSuppliers) ? localSuppliers : [];
    const custs = Array.isArray(localCustomers) ? localCustomers : [];
    const salesList = Array.isArray(localSales) ? localSales : [];
    const pursList = Array.isArray(localPurchases) ? localPurchases : [];
    const movsList = Array.isArray(localMovements) ? localMovements : [];
    const ordersList = Array.isArray(localOnlineOrders) ? localOnlineOrders : [];

    // Check if products already exist in Firestore
    const productsSnap = await getDocs(collection(db, COLLECTIONS.PRODUCTS));
    if (productsSnap.empty && prods.length > 0) {
      console.log('Seeding initial data into Firestore in chunks...');

      // 1. Seed products in chunks of 200
      const prodChunkSize = 200;
      for (let i = 0; i < prods.length; i += prodChunkSize) {
        const chunk = prods.slice(i, i + prodChunkSize);
        const batch = writeBatch(db);
        chunk.forEach((p) => {
          const normalized = cleanForFirestore(normalizeProductUnits(p));
          const ref = doc(db, COLLECTIONS.PRODUCTS, normalized.id);
          batch.set(ref, normalized, { merge: true });
        });
        await batch.commit();
      }

      // 2. Seed suppliers & customers
      if (sups.length > 0 || custs.length > 0) {
        const peopleBatch = writeBatch(db);
        sups.forEach((s) => {
          const ref = doc(db, COLLECTIONS.SUPPLIERS, s.id);
          peopleBatch.set(ref, cleanForFirestore(s), { merge: true });
        });
        custs.forEach((c) => {
          const ref = doc(db, COLLECTIONS.CUSTOMERS, c.id);
          peopleBatch.set(ref, cleanForFirestore(c), { merge: true });
        });
        await peopleBatch.commit();
      }

      // 3. Seed store config & meta
      if (localStoreConfig && typeof localStoreConfig === 'object') {
        const configRef = doc(db, COLLECTIONS.SETTINGS, 'store_config');
        await setDoc(configRef, cleanForFirestore(localStoreConfig), { merge: true });
      }

      const metaRef = doc(db, COLLECTIONS.SETTINGS, 'sync_meta');
      await setDoc(metaRef, {
        lastSync: new Date().toISOString(),
        productsCount: prods.length,
        version: '1.0.0',
        device: 'initial_seed'
      }, { merge: true });

      // 4. Seed sales & purchases in chunks
      if (salesList.length > 0) {
        for (let i = 0; i < salesList.length; i += 200) {
          const chunk = salesList.slice(i, i + 200);
          const batch = writeBatch(db);
          chunk.forEach((sale) => {
            const ref = doc(db, COLLECTIONS.SALES, sale.id);
            batch.set(ref, cleanForFirestore(sale), { merge: true });
          });
          await batch.commit();
        }
      }

      if (pursList.length > 0) {
        for (let i = 0; i < pursList.length; i += 200) {
          const chunk = pursList.slice(i, i + 200);
          const batch = writeBatch(db);
          chunk.forEach((pur) => {
            const ref = doc(db, COLLECTIONS.PURCHASES, pur.id);
            batch.set(ref, cleanForFirestore(pur), { merge: true });
          });
          await batch.commit();
        }
      }

      // 5. Seed movements
      if (movsList.length > 0) {
        for (let i = 0; i < movsList.length; i += 200) {
          const chunk = movsList.slice(i, i + 200);
          const batch = writeBatch(db);
          chunk.forEach((m) => {
            const ref = doc(db, COLLECTIONS.MOVEMENTS, m.id);
            batch.set(ref, cleanForFirestore(m), { merge: true });
          });
          await batch.commit();
        }
      }

      // 6. Seed online orders
      if (ordersList.length > 0) {
        const orderBatch = writeBatch(db);
        ordersList.forEach((o) => {
          const ref = doc(db, COLLECTIONS.ONLINE_ORDERS, o.id);
          orderBatch.set(ref, cleanForFirestore(o), { merge: true });
        });
        await orderBatch.commit();
      }

      console.log('Initial data seeded to Firestore successfully');
    }
  } catch (err) {
    console.warn('Error during Firestore initial seed (fallback to local data):', err);
  }
}

/**
 * Force-pushes all current device data to Firestore.
 * Useful when migrating an existing database or syncing from PC to phone.
 */
export async function pushAllLocalDataToFirestore(params: {
  products: Product[];
  suppliers: Supplier[];
  customers: Customer[];
  sales: SaleInvoice[];
  purchases: PurchaseInvoice[];
  movements: StockMovement[];
  storeConfig: StoreConfig;
  onlineOrders: OnlineStoreOrder[];
  preferences?: AppPreferences;
  onProgress?: (step: string, percent: number) => void;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await initFirebaseAuth();
    params.onProgress?.('بدء المزامنة مع السحابة...', 5);

    // 1. Products (chunks of 200)
    const chunkSize = 200;
    const totalProdChunks = Math.ceil(params.products.length / chunkSize) || 1;
    for (let i = 0; i < params.products.length; i += chunkSize) {
      const chunk = params.products.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((p) => {
        const normalized = cleanForFirestore(normalizeProductUnits(p));
        const ref = doc(db, COLLECTIONS.PRODUCTS, normalized.id);
        batch.set(ref, normalized, { merge: true });
      });
      await batch.commit();
      const currentChunk = Math.floor(i / chunkSize) + 1;
      const pct = Math.round(5 + (currentChunk / totalProdChunks) * 45);
      params.onProgress?.(`رفع الأصناف للسحابة (${Math.min(i + chunkSize, params.products.length)}/${params.products.length})...`, pct);
    }

    params.onProgress?.('رفع الموردين والعملاء...', 55);
    // 2. Suppliers
    for (let i = 0; i < params.suppliers.length; i += chunkSize) {
      const chunk = params.suppliers.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((s) => {
        const ref = doc(db, COLLECTIONS.SUPPLIERS, s.id);
        batch.set(ref, cleanForFirestore(s), { merge: true });
      });
      await batch.commit();
    }

    // 3. Customers
    for (let i = 0; i < params.customers.length; i += chunkSize) {
      const chunk = params.customers.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((c) => {
        const ref = doc(db, COLLECTIONS.CUSTOMERS, c.id);
        batch.set(ref, cleanForFirestore(c), { merge: true });
      });
      await batch.commit();
    }

    params.onProgress?.('رفع فواتير المبيعات والمشتريات...', 70);
    // 4. Sales
    for (let i = 0; i < params.sales.length; i += chunkSize) {
      const chunk = params.sales.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((sale) => {
        const ref = doc(db, COLLECTIONS.SALES, sale.id);
        batch.set(ref, cleanForFirestore(sale), { merge: true });
      });
      await batch.commit();
    }

    // 5. Purchases
    for (let i = 0; i < params.purchases.length; i += chunkSize) {
      const chunk = params.purchases.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((pur) => {
        const ref = doc(db, COLLECTIONS.PURCHASES, pur.id);
        batch.set(ref, cleanForFirestore(pur), { merge: true });
      });
      await batch.commit();
    }

    params.onProgress?.('رفع حركات المخزون والإعدادات...', 85);
    // 6. Movements
    for (let i = 0; i < params.movements.length; i += chunkSize) {
      const chunk = params.movements.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((m) => {
        const ref = doc(db, COLLECTIONS.MOVEMENTS, m.id);
        batch.set(ref, cleanForFirestore(m), { merge: true });
      });
      await batch.commit();
    }

    // 7. Store config & preferences
    if (params.storeConfig && typeof params.storeConfig === 'object') {
      const configRef = doc(db, COLLECTIONS.SETTINGS, 'store_config');
      await setDoc(configRef, cleanForFirestore(params.storeConfig), { merge: true });
    }

    if (params.preferences) {
      const prefRef = doc(db, COLLECTIONS.SETTINGS, 'app_preferences');
      await setDoc(prefRef, cleanForFirestore(params.preferences), { merge: true });
    }

    // 8. Sync metadata
    const metaRef = doc(db, COLLECTIONS.SETTINGS, 'sync_meta');
    await setDoc(metaRef, {
      lastSync: new Date().toISOString(),
      productsCount: params.products.length,
      salesCount: params.sales.length,
      version: '1.0.0'
    }, { merge: true });

    params.onProgress?.('اكتملت المزامنة بنجاح!', 100);
    return { success: true };
  } catch (err: any) {
    console.error('Error pushing data to Firestore:', err);
    return { success: false, error: err?.message || 'فشلت المزامنة' };
  }
}

/**
 * Fetch all collections from Firestore on demand.
 */
export async function fetchAllCloudData(): Promise<{
  products: Product[];
  suppliers: Supplier[];
  customers: Customer[];
  sales: SaleInvoice[];
  purchases: PurchaseInvoice[];
  movements: StockMovement[];
  storeConfig: StoreConfig | null;
  onlineOrders: OnlineStoreOrder[];
  preferences: AppPreferences | null;
}> {
  await initFirebaseAuth();

  const [
    prodSnap,
    supSnap,
    custSnap,
    salesSnap,
    purSnap,
    movSnap,
    configSnap,
    orderSnap,
    prefSnap,
  ] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.PRODUCTS)),
    getDocs(collection(db, COLLECTIONS.SUPPLIERS)),
    getDocs(collection(db, COLLECTIONS.CUSTOMERS)),
    getDocs(collection(db, COLLECTIONS.SALES)),
    getDocs(collection(db, COLLECTIONS.PURCHASES)),
    getDocs(collection(db, COLLECTIONS.MOVEMENTS)),
    getDoc(doc(db, COLLECTIONS.SETTINGS, 'store_config')),
    getDocs(collection(db, COLLECTIONS.ONLINE_ORDERS)),
    getDoc(doc(db, COLLECTIONS.SETTINGS, 'app_preferences')),
  ]);

  const products: Product[] = [];
  prodSnap.forEach((d) => products.push(normalizeProductUnits(d.data() as Product)));

  const suppliers: Supplier[] = [];
  supSnap.forEach((d) => suppliers.push(d.data() as Supplier));

  const customers: Customer[] = [];
  custSnap.forEach((d) => customers.push(d.data() as Customer));

  const sales: SaleInvoice[] = [];
  salesSnap.forEach((d) => sales.push(d.data() as SaleInvoice));
  sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const purchases: PurchaseInvoice[] = [];
  purSnap.forEach((d) => purchases.push(d.data() as PurchaseInvoice));
  purchases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const movements: StockMovement[] = [];
  movSnap.forEach((d) => movements.push(d.data() as StockMovement));
  movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const storeConfig = configSnap.exists() ? (configSnap.data() as StoreConfig) : null;

  const onlineOrders: OnlineStoreOrder[] = [];
  orderSnap.forEach((d) => onlineOrders.push(d.data() as OnlineStoreOrder));
  onlineOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const preferences = prefSnap.exists() ? (prefSnap.data() as AppPreferences) : null;

  return {
    products,
    suppliers,
    customers,
    sales,
    purchases,
    movements,
    storeConfig,
    onlineOrders,
    preferences,
  };
}

/* === Real-Time Firestore Subscriptions === */

export function subscribeToProducts(
  onUpdate: (products: Product[]) => void,
  onError?: (err: Error) => void
) {
  const q = collection(db, COLLECTIONS.PRODUCTS);
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((docSnap) => {
        const rawProd = docSnap.data() as Product;
        items.push(normalizeProductUnits(rawProd));
      });
      onUpdate(items);
    },
    (err) => {
      console.error('Error listening to products:', err);
      onError?.(err);
    }
  );
}

export function subscribeToSuppliers(
  onUpdate: (suppliers: Supplier[]) => void,
  onError?: (err: Error) => void
) {
  const q = collection(db, COLLECTIONS.SUPPLIERS);
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Supplier[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Supplier);
      });
      onUpdate(items);
    },
    (err) => {
      console.error('Error listening to suppliers:', err);
      onError?.(err);
    }
  );
}

export function subscribeToCustomers(
  onUpdate: (customers: Customer[]) => void,
  onError?: (err: Error) => void
) {
  const q = collection(db, COLLECTIONS.CUSTOMERS);
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Customer[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Customer);
      });
      onUpdate(items);
    },
    (err) => {
      console.error('Error listening to customers:', err);
      onError?.(err);
    }
  );
}

export function subscribeToSales(
  onUpdate: (sales: SaleInvoice[]) => void,
  onError?: (err: Error) => void
) {
  const q = collection(db, COLLECTIONS.SALES);
  return onSnapshot(
    q,
    (snapshot) => {
      const items: SaleInvoice[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as SaleInvoice);
      });
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onUpdate(items);
    },
    (err) => {
      console.error('Error listening to sales:', err);
      onError?.(err);
    }
  );
}

export function subscribeToPurchases(
  onUpdate: (purchases: PurchaseInvoice[]) => void,
  onError?: (err: Error) => void
) {
  const q = collection(db, COLLECTIONS.PURCHASES);
  return onSnapshot(
    q,
    (snapshot) => {
      const items: PurchaseInvoice[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as PurchaseInvoice);
      });
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onUpdate(items);
    },
    (err) => {
      console.error('Error listening to purchases:', err);
      onError?.(err);
    }
  );
}

export function subscribeToMovements(
  onUpdate: (movements: StockMovement[]) => void,
  onError?: (err: Error) => void
) {
  const q = collection(db, COLLECTIONS.MOVEMENTS);
  return onSnapshot(
    q,
    (snapshot) => {
      const items: StockMovement[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as StockMovement);
      });
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onUpdate(items);
    },
    (err) => {
      console.error('Error listening to stock movements:', err);
      onError?.(err);
    }
  );
}

export function subscribeToStoreConfig(
  onUpdate: (config: StoreConfig) => void,
  onError?: (err: Error) => void
) {
  const docRef = doc(db, COLLECTIONS.SETTINGS, 'store_config');
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as StoreConfig);
      }
    },
    (err) => {
      console.error('Error listening to store config:', err);
      onError?.(err);
    }
  );
}

export function subscribeToOnlineOrders(
  onUpdate: (orders: OnlineStoreOrder[]) => void,
  onError?: (err: Error) => void
) {
  const q = collection(db, COLLECTIONS.ONLINE_ORDERS);
  return onSnapshot(
    q,
    (snapshot) => {
      const items: OnlineStoreOrder[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as OnlineStoreOrder);
      });
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(items);
    },
    (err) => {
      console.error('Error listening to online orders:', err);
      onError?.(err);
    }
  );
}

export function subscribeToAppPreferences(
  onUpdate: (prefs: AppPreferences) => void,
  onError?: (err: Error) => void
) {
  const docRef = doc(db, COLLECTIONS.SETTINGS, 'app_preferences');
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as AppPreferences);
      }
    },
    (err) => {
      console.error('Error listening to app preferences:', err);
      onError?.(err);
    }
  );
}

/* === Write Operations with Deep Sanitization === */

export async function saveProductToFirestore(product: Product): Promise<void> {
  const normalized = cleanForFirestore(normalizeProductUnits(product));
  const ref = doc(db, COLLECTIONS.PRODUCTS, normalized.id);
  await setDoc(ref, normalized, { merge: true });
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.PRODUCTS, productId);
  await deleteDoc(ref);
}

export async function bulkSaveProductsToFirestore(productsList: Product[]): Promise<void> {
  const chunkSize = 200;
  for (let i = 0; i < productsList.length; i += chunkSize) {
    const chunk = productsList.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((p) => {
      const normalized = cleanForFirestore(normalizeProductUnits(p));
      const ref = doc(db, COLLECTIONS.PRODUCTS, normalized.id);
      batch.set(ref, normalized, { merge: true });
    });
    await batch.commit();
  }
}

export async function clearAllProductsFromFirestore(productIds: string[]): Promise<void> {
  const chunkSize = 200;
  for (let i = 0; i < productIds.length; i += chunkSize) {
    const chunk = productIds.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((id) => {
      const ref = doc(db, COLLECTIONS.PRODUCTS, id);
      batch.delete(ref);
    });
    await batch.commit();
  }
}

export async function saveSupplierToFirestore(supplier: Supplier): Promise<void> {
  const cleaned = cleanForFirestore(supplier);
  const ref = doc(db, COLLECTIONS.SUPPLIERS, cleaned.id);
  await setDoc(ref, cleaned, { merge: true });
}

export async function deleteSupplierFromFirestore(supplierId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.SUPPLIERS, supplierId);
  await deleteDoc(ref);
}

export async function clearAllSuppliersFromFirestore(supplierIds?: string[]): Promise<void> {
  let idsToDelete = supplierIds && supplierIds.length > 0 ? [...supplierIds] : [];
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.SUPPLIERS));
    const dbIds = snap.docs.map(d => d.id);
    idsToDelete = Array.from(new Set([...idsToDelete, ...dbIds]));
  } catch (e) {
    console.error('Error fetching suppliers to clear from Firestore:', e);
  }

  const chunkSize = 200;
  for (let i = 0; i < idsToDelete.length; i += chunkSize) {
    const chunk = idsToDelete.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((id) => {
      const ref = doc(db, COLLECTIONS.SUPPLIERS, id);
      batch.delete(ref);
    });
    await batch.commit();
  }
}

export async function saveCustomerToFirestore(customer: Customer): Promise<void> {
  const cleaned = cleanForFirestore(customer);
  const ref = doc(db, COLLECTIONS.CUSTOMERS, cleaned.id);
  await setDoc(ref, cleaned, { merge: true });
}

export async function deleteCustomerFromFirestore(customerId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.CUSTOMERS, customerId);
  await deleteDoc(ref);
}

export async function clearAllCustomersFromFirestore(customerIds?: string[]): Promise<void> {
  let idsToDelete = customerIds && customerIds.length > 0 ? [...customerIds] : [];
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.CUSTOMERS));
    const dbIds = snap.docs.map(d => d.id);
    idsToDelete = Array.from(new Set([...idsToDelete, ...dbIds]));
  } catch (e) {
    console.error('Error fetching customers to clear from Firestore:', e);
  }

  const chunkSize = 200;
  for (let i = 0; i < idsToDelete.length; i += chunkSize) {
    const chunk = idsToDelete.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((id) => {
      const ref = doc(db, COLLECTIONS.CUSTOMERS, id);
      batch.delete(ref);
    });
    await batch.commit();
  }
}

export async function saveSaleToFirestore(sale: SaleInvoice): Promise<void> {
  const cleaned = cleanForFirestore(sale);
  const ref = doc(db, COLLECTIONS.SALES, cleaned.id);
  await setDoc(ref, cleaned, { merge: true });
}

export async function deleteSaleFromFirestore(saleId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.SALES, saleId);
  await deleteDoc(ref);
}

export async function savePurchaseToFirestore(purchase: PurchaseInvoice): Promise<void> {
  const cleaned = cleanForFirestore(purchase);
  const ref = doc(db, COLLECTIONS.PURCHASES, cleaned.id);
  await setDoc(ref, cleaned, { merge: true });
}

export async function deletePurchaseFromFirestore(purchaseId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.PURCHASES, purchaseId);
  await deleteDoc(ref);
}

export async function saveMovementToFirestore(movement: StockMovement): Promise<void> {
  const cleaned = cleanForFirestore(movement);
  const ref = doc(db, COLLECTIONS.MOVEMENTS, cleaned.id);
  await setDoc(ref, cleaned, { merge: true });
}

export async function bulkSaveMovementsToFirestore(movements: StockMovement[]): Promise<void> {
  const chunkSize = 200;
  for (let i = 0; i < movements.length; i += chunkSize) {
    const chunk = movements.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((m) => {
      const cleaned = cleanForFirestore(m);
      const ref = doc(db, COLLECTIONS.MOVEMENTS, cleaned.id);
      batch.set(ref, cleaned, { merge: true });
    });
    await batch.commit();
  }
}

export async function clearAllMovementsFromFirestore(movementIds: string[]): Promise<void> {
  const chunkSize = 200;
  for (let i = 0; i < movementIds.length; i += chunkSize) {
    const chunk = movementIds.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((id) => {
      const ref = doc(db, COLLECTIONS.MOVEMENTS, id);
      batch.delete(ref);
    });
    await batch.commit();
  }
}

export async function saveStoreConfigToFirestore(config: StoreConfig): Promise<void> {
  const cleaned = cleanForFirestore(config);
  const ref = doc(db, COLLECTIONS.SETTINGS, 'store_config');
  await setDoc(ref, cleaned, { merge: true });
}

export async function saveAppPreferencesToFirestore(preferences: Partial<AppPreferences>): Promise<void> {
  const cleaned = cleanForFirestore({
    ...preferences,
    updatedAt: new Date().toISOString(),
  });
  const ref = doc(db, COLLECTIONS.SETTINGS, 'app_preferences');
  await setDoc(ref, cleaned, { merge: true });
}

export async function saveOnlineOrderToFirestore(order: OnlineStoreOrder): Promise<void> {
  const cleaned = cleanForFirestore(order);
  const ref = doc(db, COLLECTIONS.ONLINE_ORDERS, cleaned.id);
  await setDoc(ref, cleaned, { merge: true });
}

export async function deleteOnlineOrderFromFirestore(orderId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.ONLINE_ORDERS, orderId);
  await deleteDoc(ref);
}

export function subscribeToPayments(
  onUpdate: (payments: PartnerPayment[]) => void,
  onError?: (err: Error) => void
) {
  const q = collection(db, COLLECTIONS.PAYMENTS);
  return onSnapshot(
    q,
    (snapshot) => {
      const items: PartnerPayment[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as PartnerPayment);
      });
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onUpdate(items);
    },
    (err) => {
      console.error('Error listening to payments:', err);
      onError?.(err);
    }
  );
}

export async function savePaymentToFirestore(payment: PartnerPayment): Promise<void> {
  const cleaned = cleanForFirestore(payment);
  const ref = doc(db, COLLECTIONS.PAYMENTS, cleaned.id);
  await setDoc(ref, cleaned, { merge: true });
}

export async function deletePaymentFromFirestore(paymentId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.PAYMENTS, paymentId);
  await deleteDoc(ref);
}

export async function getPaymentsFromFirestore(): Promise<PartnerPayment[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.PAYMENTS));
  const items: PartnerPayment[] = [];
  snapshot.forEach((docSnap) => {
    items.push(docSnap.data() as PartnerPayment);
  });
  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return items;
}
