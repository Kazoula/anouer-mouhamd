import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  query,
  orderBy,
  limit
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
  OnlineStoreOrder 
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
};

// Seed initial data if collection is empty
export async function seedInitialFirestoreData(
  localProducts: Product[],
  localSuppliers: Supplier[],
  localCustomers: Customer[],
  localSales: SaleInvoice[],
  localPurchases: PurchaseInvoice[],
  localMovements: StockMovement[],
  localStoreConfig: StoreConfig,
  localOnlineOrders: OnlineStoreOrder[]
) {
  try {
    await initFirebaseAuth();

    // Check if products already exist in Firestore
    const productsSnap = await getDocs(collection(db, COLLECTIONS.PRODUCTS));
    if (productsSnap.empty && localProducts.length > 0) {
      console.log('Seeding initial data into Firestore...');
      const batch = writeBatch(db);

      // Seed products (up to batch limit)
      localProducts.slice(0, 400).forEach((p) => {
        const ref = doc(db, COLLECTIONS.PRODUCTS, p.id);
        batch.set(ref, p);
      });

      // Seed suppliers
      localSuppliers.forEach((s) => {
        const ref = doc(db, COLLECTIONS.SUPPLIERS, s.id);
        batch.set(ref, s);
      });

      // Seed customers
      localCustomers.forEach((c) => {
        const ref = doc(db, COLLECTIONS.CUSTOMERS, c.id);
        batch.set(ref, c);
      });

      // Seed store config
      const configRef = doc(db, COLLECTIONS.SETTINGS, 'store_config');
      batch.set(configRef, localStoreConfig);

      // Seed sales
      localSales.slice(0, 50).forEach((sale) => {
        const ref = doc(db, COLLECTIONS.SALES, sale.id);
        batch.set(ref, sale);
      });

      // Seed purchases
      localPurchases.slice(0, 50).forEach((pur) => {
        const ref = doc(db, COLLECTIONS.PURCHASES, pur.id);
        batch.set(ref, pur);
      });

      // Seed movements
      localMovements.slice(0, 100).forEach((m) => {
        const ref = doc(db, COLLECTIONS.MOVEMENTS, m.id);
        batch.set(ref, m);
      });

      // Seed online orders
      localOnlineOrders.forEach((o) => {
        const ref = doc(db, COLLECTIONS.ONLINE_ORDERS, o.id);
        batch.set(ref, o);
      });

      await batch.commit();
      console.log('Initial data seeded to Firestore successfully');
    }
  } catch (err) {
    console.warn('Error during Firestore initial seed (fallback to local data):', err);
  }
}

// Subscribe to Products collection
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

// Subscribe to Suppliers
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

// Subscribe to Customers
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

// Subscribe to Sales Invoices
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
      // Sort by date descending
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onUpdate(items);
    },
    (err) => {
      console.error('Error listening to sales:', err);
      onError?.(err);
    }
  );
}

// Subscribe to Purchases Invoices
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

// Subscribe to Stock Movements
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

// Subscribe to Store Config
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

// Subscribe to Online Orders
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

/* === Write Operations === */

export async function saveProductToFirestore(product: Product): Promise<void> {
  const normalized = normalizeProductUnits(product);
  const ref = doc(db, COLLECTIONS.PRODUCTS, normalized.id);
  await setDoc(ref, normalized, { merge: true });
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.PRODUCTS, productId);
  await deleteDoc(ref);
}

export async function bulkSaveProductsToFirestore(productsList: Product[]): Promise<void> {
  // Split in batches of 400
  const chunkSize = 400;
  for (let i = 0; i < productsList.length; i += chunkSize) {
    const chunk = productsList.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((p) => {
      const normalized = normalizeProductUnits(p);
      const ref = doc(db, COLLECTIONS.PRODUCTS, normalized.id);
      batch.set(ref, normalized, { merge: true });
    });
    await batch.commit();
  }
}

export async function clearAllProductsFromFirestore(productIds: string[]): Promise<void> {
  const chunkSize = 400;
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
  const ref = doc(db, COLLECTIONS.SUPPLIERS, supplier.id);
  await setDoc(ref, supplier, { merge: true });
}

export async function deleteSupplierFromFirestore(supplierId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.SUPPLIERS, supplierId);
  await deleteDoc(ref);
}

export async function saveCustomerToFirestore(customer: Customer): Promise<void> {
  const ref = doc(db, COLLECTIONS.CUSTOMERS, customer.id);
  await setDoc(ref, customer, { merge: true });
}

export async function deleteCustomerFromFirestore(customerId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.CUSTOMERS, customerId);
  await deleteDoc(ref);
}

export async function saveSaleToFirestore(sale: SaleInvoice): Promise<void> {
  const ref = doc(db, COLLECTIONS.SALES, sale.id);
  await setDoc(ref, sale, { merge: true });
}

export async function deleteSaleFromFirestore(saleId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.SALES, saleId);
  await deleteDoc(ref);
}

export async function savePurchaseToFirestore(purchase: PurchaseInvoice): Promise<void> {
  const ref = doc(db, COLLECTIONS.PURCHASES, purchase.id);
  await setDoc(ref, purchase, { merge: true });
}

export async function deletePurchaseFromFirestore(purchaseId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.PURCHASES, purchaseId);
  await deleteDoc(ref);
}

export async function saveMovementToFirestore(movement: StockMovement): Promise<void> {
  const ref = doc(db, COLLECTIONS.MOVEMENTS, movement.id);
  await setDoc(ref, movement, { merge: true });
}

export async function bulkSaveMovementsToFirestore(movements: StockMovement[]): Promise<void> {
  const chunkSize = 400;
  for (let i = 0; i < movements.length; i += chunkSize) {
    const chunk = movements.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((m) => {
      const ref = doc(db, COLLECTIONS.MOVEMENTS, m.id);
      batch.set(ref, m, { merge: true });
    });
    await batch.commit();
  }
}

export async function clearAllMovementsFromFirestore(movementIds: string[]): Promise<void> {
  const chunkSize = 400;
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
  const ref = doc(db, COLLECTIONS.SETTINGS, 'store_config');
  await setDoc(ref, config, { merge: true });
}

export async function saveOnlineOrderToFirestore(order: OnlineStoreOrder): Promise<void> {
  const ref = doc(db, COLLECTIONS.ONLINE_ORDERS, order.id);
  await setDoc(ref, order, { merge: true });
}

export async function deleteOnlineOrderFromFirestore(orderId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.ONLINE_ORDERS, orderId);
  await deleteDoc(ref);
}
