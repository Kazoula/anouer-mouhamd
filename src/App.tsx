/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Product, 
  Supplier, 
  Customer, 
  SaleInvoice, 
  PurchaseInvoice, 
  StockMovement, 
  ActiveTab,
  StoreConfig,
  OnlineStoreOrder,
  ThemeMode,
  PartnerPayment
} from './types';
import { 
  getStoredProducts, 
  saveStoredProducts, 
  getStoredSuppliers, 
  saveStoredSuppliers, 
  getStoredCustomers, 
  saveStoredCustomers, 
  getStoredSales, 
  saveStoredSales, 
  getStoredPurchases, 
  saveStoredPurchases, 
  getStoredMovements, 
  saveStoredMovements, 
  getStoredCurrency, 
  setStoredCurrency,
  getStoredTheme,
  saveStoredTheme,
  getStoredStoreConfig,
  saveStoredStoreConfig,
  getStoredOnlineOrders,
  saveStoredOnlineOrders,
  getStoredPayments,
  saveStoredPayments,
  resetAllData,
  exportDataBackup
} from './utils/storage';
import {
  seedInitialFirestoreData,
  subscribeToProducts,
  subscribeToSuppliers,
  subscribeToCustomers,
  subscribeToSales,
  subscribeToPurchases,
  subscribeToMovements,
  subscribeToStoreConfig,
  subscribeToOnlineOrders,
  subscribeToPayments,
  savePaymentToFirestore,
  deletePaymentFromFirestore,
  saveProductToFirestore,
  deleteProductFromFirestore,
  bulkSaveProductsToFirestore,
  clearAllProductsFromFirestore,
  saveSupplierToFirestore,
  deleteSupplierFromFirestore,
  clearAllSuppliersFromFirestore,
  saveCustomerToFirestore,
  deleteCustomerFromFirestore,
  clearAllCustomersFromFirestore,
  saveSaleToFirestore,
  deleteSaleFromFirestore,
  savePurchaseToFirestore,
  deletePurchaseFromFirestore,
  saveMovementToFirestore,
  bulkSaveMovementsToFirestore,
  clearAllMovementsFromFirestore,
  saveStoreConfigToFirestore,
  saveOnlineOrderToFirestore,
  deleteOnlineOrderFromFirestore,
  subscribeToAppPreferences,
  saveAppPreferencesToFirestore,
  pushAllLocalDataToFirestore,
  fetchAllCloudData
} from './services/firestoreService';
import { initFirebaseAuth } from './lib/firebase';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { DashboardTab } from './components/DashboardTab';
import { ProductsTab } from './components/ProductsTab';
import { SalesTab } from './components/SalesTab';
import { PurchasesTab } from './components/PurchasesTab';
import { StoreIntegrationTab } from './components/StoreIntegrationTab';
import { ReportsTab } from './components/ReportsTab';
import { PartnersTab } from './components/PartnersTab';
import { AlertsModal } from './components/AlertsModal';
import { InvoiceModal } from './components/InvoiceModal';
import { SettingsModal } from './components/SettingsModal';
import { CloudSyncModal } from './components/CloudSyncModal';

export default function App() {
  const [products, setProducts] = useState<Product[]>(() => getStoredProducts());
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => getStoredSuppliers());
  const [customers, setCustomers] = useState<Customer[]>(() => getStoredCustomers());
  const [sales, setSales] = useState<SaleInvoice[]>(() => getStoredSales());
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>(() => getStoredPurchases());
  const [movements, setMovements] = useState<StockMovement[]>(() => getStoredMovements());
  const [payments, setPayments] = useState<PartnerPayment[]>(() => getStoredPayments());
  const [currency, setCurrency] = useState<string>(() => getStoredCurrency());
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme());
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(() => getStoredStoreConfig());
  const [onlineOrders, setOnlineOrders] = useState<OnlineStoreOrder[]>(() => getStoredOnlineOrders());
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('syncing');
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState<boolean>(false);
  const [cloudUnsyncedLocalCount, setCloudUnsyncedLocalCount] = useState<number>(0);
  const [saleCustomerPrefill, setSaleCustomerPrefill] = useState<string | null>(null);
  const [partnersInitialSubTab, setPartnersInitialSubTab] = useState<'customers' | 'suppliers'>('customers');

  // Initialize Firebase Auth & Real-Time Sync Subscriptions
  useEffect(() => {
    let unsubProducts: (() => void) | undefined;
    let unsubSuppliers: (() => void) | undefined;
    let unsubCustomers: (() => void) | undefined;
    let unsubSales: (() => void) | undefined;
    let unsubPurchases: (() => void) | undefined;
    let unsubMovements: (() => void) | undefined;
    let unsubPayments: (() => void) | undefined;
    let unsubStoreConfig: (() => void) | undefined;
    let unsubOnlineOrders: (() => void) | undefined;
    let unsubAppPreferences: (() => void) | undefined;

    const setupFirebaseSync = async () => {
      try {
        setCloudSyncStatus('syncing');
        await initFirebaseAuth();

        // Seed initial local data if Firestore is fresh/empty
        await seedInitialFirestoreData(
          getStoredProducts(),
          getStoredSuppliers(),
          getStoredCustomers(),
          getStoredSales(),
          getStoredPurchases(),
          getStoredMovements(),
          getStoredStoreConfig(),
          getStoredOnlineOrders()
        );

        // Real-time Firestore Subscriptions
        unsubProducts = subscribeToProducts((cloudProds) => {
          if (cloudProds && cloudProds.length > 0) {
            setProducts(cloudProds);
            saveStoredProducts(cloudProds);
            const localCount = getStoredProducts().length;
            if (localCount > cloudProds.length) {
              setCloudUnsyncedLocalCount(localCount - cloudProds.length);
            } else {
              setCloudUnsyncedLocalCount(0);
            }
          } else {
            const localCount = getStoredProducts().length;
            if (localCount > 0) {
              setCloudUnsyncedLocalCount(localCount);
            }
          }
          setCloudSyncStatus('synced');
        });

        unsubSuppliers = subscribeToSuppliers((cloudSups) => {
          if (cloudSups && cloudSups.length > 0) {
            setSuppliers(cloudSups);
            saveStoredSuppliers(cloudSups);
          }
        });

        unsubCustomers = subscribeToCustomers((cloudCusts) => {
          if (cloudCusts && cloudCusts.length > 0) {
            setCustomers(cloudCusts);
            saveStoredCustomers(cloudCusts);
          }
        });

        unsubSales = subscribeToSales((cloudSales) => {
          if (cloudSales && cloudSales.length > 0) {
            setSales(cloudSales);
            saveStoredSales(cloudSales);
          }
        });

        unsubPurchases = subscribeToPurchases((cloudPurchases) => {
          if (cloudPurchases && cloudPurchases.length > 0) {
            setPurchases(cloudPurchases);
            saveStoredPurchases(cloudPurchases);
          }
        });

        unsubMovements = subscribeToMovements((cloudMovements) => {
          if (cloudMovements && cloudMovements.length > 0) {
            setMovements(cloudMovements);
            saveStoredMovements(cloudMovements);
          }
        });

        unsubPayments = subscribeToPayments((cloudPayments) => {
          if (cloudPayments && cloudPayments.length > 0) {
            setPayments(cloudPayments);
            saveStoredPayments(cloudPayments);
          }
        });

        unsubStoreConfig = subscribeToStoreConfig((cloudConfig) => {
          if (cloudConfig) {
            setStoreConfig(cloudConfig);
            saveStoredStoreConfig(cloudConfig);
          }
        });

        unsubOnlineOrders = subscribeToOnlineOrders((cloudOrders) => {
          if (cloudOrders && cloudOrders.length > 0) {
            setOnlineOrders(cloudOrders);
            saveStoredOnlineOrders(cloudOrders);
          }
        });

        unsubAppPreferences = subscribeToAppPreferences((cloudPrefs) => {
          if (cloudPrefs) {
            if (cloudPrefs.currency) {
              setCurrency(cloudPrefs.currency);
              setStoredCurrency(cloudPrefs.currency);
            }
            if (cloudPrefs.theme) {
              setTheme(cloudPrefs.theme);
              saveStoredTheme(cloudPrefs.theme);
            }
            if (cloudPrefs.searchTypingDelaySec !== undefined) {
              localStorage.setItem('pos_search_typing_delay_sec', String(cloudPrefs.searchTypingDelaySec));
              window.dispatchEvent(new CustomEvent('pos_typing_delay_changed', { detail: cloudPrefs.searchTypingDelaySec }));
            }
          }
        });

        setCloudSyncStatus('synced');
      } catch (err) {
        console.warn('Firebase sync initialization fallback to local storage:', err);
        setCloudSyncStatus('synced');
      }
    };

    setupFirebaseSync();

    return () => {
      unsubProducts?.();
      unsubSuppliers?.();
      unsubCustomers?.();
      unsubSales?.();
      unsubPurchases?.();
      unsubMovements?.();
      unsubPayments?.();
      unsubStoreConfig?.();
      unsubOnlineOrders?.();
      unsubAppPreferences?.();
    };
  }, []);

  // Detect system color scheme preference
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const effectiveTheme: 'dark' | 'light' = theme === 'system' 
    ? (systemPrefersDark ? 'dark' : 'light') 
    : theme;

  // Apply theme to document element and body
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;

    if (effectiveTheme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
      body.classList.add('light');
      body.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
      body.classList.add('dark');
      body.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
    }
  }, [effectiveTheme]);

  const handleChangeTheme = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    saveStoredTheme(newTheme);
    saveAppPreferencesToFirestore({ theme: newTheme }).catch(() => {});
  };

  const handleToggleTheme = () => {
    const nextTheme: ThemeMode = effectiveTheme === 'dark' ? 'light' : 'dark';
    handleChangeTheme(nextTheme);
  };

  // UI States
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Invoices Modals
  const [selectedSaleForModal, setSelectedSaleForModal] = useState<SaleInvoice | null>(null);
  const [selectedPurchaseForModal, setSelectedPurchaseForModal] = useState<PurchaseInvoice | null>(null);

  // Quick Action Prefills
  const [prefillPurchaseProductId, setPrefillPurchaseProductId] = useState<string | undefined>(undefined);
  const [prefillSaleCustomerId, setPrefillSaleCustomerId] = useState<string | undefined>(undefined);

  // Save to localStorage whenever state changes
  useEffect(() => {
    saveStoredProducts(products);
  }, [products]);

  useEffect(() => {
    saveStoredSuppliers(suppliers);
  }, [suppliers]);

  useEffect(() => {
    saveStoredCustomers(customers);
  }, [customers]);

  useEffect(() => {
    saveStoredSales(sales);
  }, [sales]);

  useEffect(() => {
    saveStoredPurchases(purchases);
  }, [purchases]);

  useEffect(() => {
    saveStoredMovements(movements);
  }, [movements]);

  useEffect(() => {
    saveStoredStoreConfig(storeConfig);
  }, [storeConfig]);

  useEffect(() => {
    saveStoredOnlineOrders(onlineOrders);
  }, [onlineOrders]);

  // Handlers for Products
  const handleSaveProduct = (newProd: Product) => {
    setProducts(prev => {
      const idx = prev.findIndex(p => p.id === newProd.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newProd;
        return copy;
      }
      return [newProd, ...prev];
    });
    saveProductToFirestore(newProd).catch(console.error);
  };

  const handleBulkImportProducts = (
    importedProducts: Product[],
    strategy: 'update' | 'skip' | 'replace'
  ) => {
    const newMovements: StockMovement[] = [];
    const timestamp = new Date().toISOString();
    let finalUpdated: Product[] = [];

    setProducts(prev => {
      let updatedList = [...prev];

      importedProducts.forEach(imp => {
        const matchIdx = updatedList.findIndex(
          p => (imp.barcode && p.barcode === imp.barcode) || p.name.toLowerCase().trim() === imp.name.toLowerCase().trim()
        );

        if (matchIdx >= 0) {
          const existing = updatedList[matchIdx];

          if (strategy === 'skip') {
            // Do not alter existing product
            return;
          }

          if (strategy === 'update') {
            const addedStock = imp.stockPieces || 0;
            const newStock = existing.stockPieces + addedStock;

            if (addedStock > 0) {
              newMovements.push({
                id: `mov_imp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                productId: existing.id,
                productName: existing.name,
                date: timestamp,
                type: 'adjustment_add',
                quantityPieces: addedStock,
                previousStock: existing.stockPieces,
                newStock: newStock,
                notes: 'استيراد من الشيت (تحديث أسعار وإضافة رصيد)',
              });
            }

            updatedList[matchIdx] = {
              ...existing,
              barcode: imp.barcode || existing.barcode,
              category: imp.category || existing.category,
              majorUnit: imp.majorUnit || existing.majorUnit,
              minorUnit: imp.minorUnit || existing.minorUnit,
              piecesPerMajorUnit: imp.piecesPerMajorUnit || existing.piecesPerMajorUnit,
              purchasePriceMinor: imp.purchasePriceMinor > 0 ? imp.purchasePriceMinor : existing.purchasePriceMinor,
              purchasePriceMajor: imp.purchasePriceMajor > 0 ? imp.purchasePriceMajor : existing.purchasePriceMajor,
              salePriceMinor: imp.salePriceMinor > 0 ? imp.salePriceMinor : existing.salePriceMinor,
              salePriceMajor: imp.salePriceMajor > 0 ? imp.salePriceMajor : existing.salePriceMajor,
              stockPieces: newStock,
              minStockAlert: imp.minStockAlert || existing.minStockAlert,
              defaultSupplierId: imp.defaultSupplierId || existing.defaultSupplierId,
              defaultSupplierName: imp.defaultSupplierName || existing.defaultSupplierName,
              notes: imp.notes || existing.notes,
              updatedAt: timestamp,
            };
          } else if (strategy === 'replace') {
            const newStock = imp.stockPieces || 0;
            if (newStock !== existing.stockPieces) {
              newMovements.push({
                id: `mov_imp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                productId: existing.id,
                productName: existing.name,
                date: timestamp,
                type: newStock >= existing.stockPieces ? 'adjustment_add' : 'adjustment_sub',
                quantityPieces: Math.abs(newStock - existing.stockPieces),
                previousStock: existing.stockPieces,
                newStock: newStock,
                notes: 'استيراد من الشيت (استبدال كلي للرصيد والأسعار)',
              });
            }

            updatedList[matchIdx] = {
              ...imp,
              id: existing.id,
              createdAt: existing.createdAt,
              updatedAt: timestamp,
            };
          }
        } else {
          // New product to be inserted
          updatedList.unshift(imp);

          if (imp.stockPieces > 0) {
            newMovements.push({
              id: `mov_imp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              productId: imp.id,
              productName: imp.name,
              date: timestamp,
              type: 'adjustment_add',
              quantityPieces: imp.stockPieces,
              previousStock: 0,
              newStock: imp.stockPieces,
              notes: 'استيراد من الشيت (صنف جديد - رصيد افتتاحي)',
            });
          }
        }
      });

      finalUpdated = updatedList;
      return updatedList;
    });

    if (newMovements.length > 0) {
      setMovements(prev => [...newMovements, ...prev]);
      bulkSaveMovementsToFirestore(newMovements).catch(console.error);
    }
    bulkSaveProductsToFirestore(finalUpdated).catch(console.error);
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
    deleteProductFromFirestore(productId).catch(console.error);
  };

  const handleDeleteAllProducts = (clearMovements: boolean = false) => {
    const pIds = products.map(p => p.id);
    const mIds = movements.map(m => m.id);
    setProducts([]);
    clearAllProductsFromFirestore(pIds).catch(console.error);
    if (clearMovements) {
      setMovements([]);
      clearAllMovementsFromFirestore(mIds).catch(console.error);
    }
  };

  const handleAdjustStock = (productId: string, diffPieces: number, reason: string) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const oldStock = p.stockPieces;
        const newStock = Math.max(0, oldStock + diffPieces);

        // Record stock movement
        const mov: StockMovement = {
          id: `mov_${Date.now()}_${Math.random()}`,
          productId: p.id,
          productName: p.name,
          date: new Date().toISOString(),
          type: diffPieces >= 0 ? 'adjustment_add' : 'adjustment_sub',
          quantityPieces: Math.abs(diffPieces),
          previousStock: oldStock,
          newStock: newStock,
          notes: reason,
        };
        setMovements(m => [mov, ...m]);
        saveMovementToFirestore(mov).catch(console.error);

        const updatedProd = { ...p, stockPieces: newStock, updatedAt: new Date().toISOString() };
        saveProductToFirestore(updatedProd).catch(console.error);
        return updatedProd;
      }
      return p;
    }));
  };

  // Handlers for Sales
  const handleSaveSale = (newSale: SaleInvoice) => {
    setSales(prev => [newSale, ...prev]);
    saveSaleToFirestore(newSale).catch(console.error);

    // Deduct stock for each item in the sale invoice
    setProducts(prev => prev.map(prod => {
      const itemInInvoice = newSale.items.find(i => i.productId === prod.id);
      if (itemInInvoice) {
        const oldStock = prod.stockPieces;
        const newStock = Math.max(0, oldStock - itemInInvoice.totalPieces);

        // Record Movement
        const mov: StockMovement = {
          id: `mov_s_${Date.now()}_${Math.random()}`,
          productId: prod.id,
          productName: prod.name,
          date: newSale.date,
          type: 'sale',
          quantityPieces: itemInInvoice.totalPieces,
          previousStock: oldStock,
          newStock: newStock,
          unitType: itemInInvoice.unitType,
          unitQuantity: itemInInvoice.quantity,
          unitName: itemInInvoice.unitName,
          referenceInvoice: newSale.invoiceNumber,
          partyName: newSale.customerName,
          notes: `فاتورة بيع رقم ${newSale.invoiceNumber}`,
        };
        setMovements(m => [mov, ...m]);
        saveMovementToFirestore(mov).catch(console.error);

        const updatedProd = { ...prod, stockPieces: newStock, updatedAt: new Date().toISOString() };
        saveProductToFirestore(updatedProd).catch(console.error);
        return updatedProd;
      }
      return prod;
    }));

    // Update customer lastTransactionDate and balance (if credit/partial)
    if (newSale.customerId) {
      setCustomers(prev => prev.map(c => {
        if (c.id === newSale.customerId) {
          const newBal = newSale.remainingAmount > 0 ? +(c.balance + newSale.remainingAmount).toFixed(2) : c.balance;
          const txDate = newSale.date ? (newSale.date.includes('T') ? newSale.date.split('T')[0] : newSale.date) : new Date().toISOString().split('T')[0];
          const updatedCust = { 
            ...c, 
            balance: newBal,
            lastTransactionDate: txDate
          };
          saveCustomerToFirestore(updatedCust).catch(console.error);
          return updatedCust;
        }
        return c;
      }));
    } else if (newSale.remainingAmount > 0 && newSale.customerName && newSale.customerName !== 'عميل نقدي') {
      const existing = customers.find(c => c.name.trim().toLowerCase() === newSale.customerName.trim().toLowerCase());
      const txDate = newSale.date ? (newSale.date.includes('T') ? newSale.date.split('T')[0] : newSale.date) : new Date().toISOString().split('T')[0];
      if (existing) {
        setCustomers(prev => prev.map(c => {
          if (c.id === existing.id) {
            const newBal = +(c.balance + newSale.remainingAmount).toFixed(2);
            const updatedCust = { ...c, balance: newBal, lastTransactionDate: txDate };
            saveCustomerToFirestore(updatedCust).catch(console.error);
            return updatedCust;
          }
          return c;
        }));
      } else {
        const newCust: Customer = {
          id: `cust_${Date.now()}`,
          name: newSale.customerName.trim(),
          phone: newSale.customerPhone || '',
          balance: +newSale.remainingAmount.toFixed(2),
          lastTransactionDate: txDate,
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        setCustomers(prev => [newCust, ...prev]);
        saveCustomerToFirestore(newCust).catch(console.error);
      }
    }
  };

  // Handlers for Purchases
  const handleSavePurchase = (newPurchase: PurchaseInvoice, updatePrices: boolean) => {
    setPurchases(prev => [newPurchase, ...prev]);
    savePurchaseToFirestore(newPurchase).catch(console.error);

    // Increase stock for each item
    setProducts(prev => prev.map(prod => {
      const itemInInvoice = newPurchase.items.find(i => i.productId === prod.id);
      if (itemInInvoice) {
        const oldStock = prod.stockPieces;
        const newStock = oldStock + itemInInvoice.totalPieces;

        // Optionally update product's purchase prices in catalog
        let purchasePriceMinor = prod.purchasePriceMinor;
        let purchasePriceMajor = prod.purchasePriceMajor;
        let purchasePriceMiddle = prod.purchasePriceMiddle;

        if (updatePrices) {
          if (itemInInvoice.unitType === 'major') {
            purchasePriceMajor = itemInInvoice.unitPrice;
            purchasePriceMinor = +(itemInInvoice.unitPrice / (prod.piecesPerMajorUnit || 1)).toFixed(2);
            if (prod.piecesPerMiddleUnit) {
              purchasePriceMiddle = +(purchasePriceMinor * prod.piecesPerMiddleUnit).toFixed(2);
            }
          } else if (itemInInvoice.unitType === 'middle' && prod.piecesPerMiddleUnit) {
            purchasePriceMiddle = itemInInvoice.unitPrice;
            purchasePriceMinor = +(itemInInvoice.unitPrice / prod.piecesPerMiddleUnit).toFixed(2);
            purchasePriceMajor = +(purchasePriceMinor * (prod.piecesPerMajorUnit || 1)).toFixed(2);
          } else {
            purchasePriceMinor = itemInInvoice.unitPrice;
            purchasePriceMajor = +(itemInInvoice.unitPrice * (prod.piecesPerMajorUnit || 1)).toFixed(2);
            if (prod.piecesPerMiddleUnit) {
              purchasePriceMiddle = +(purchasePriceMinor * prod.piecesPerMiddleUnit).toFixed(2);
            }
          }
        }

        // Record Movement
        const mov: StockMovement = {
          id: `mov_p_${Date.now()}_${Math.random()}`,
          productId: prod.id,
          productName: prod.name,
          date: newPurchase.date,
          type: 'purchase',
          quantityPieces: itemInInvoice.totalPieces,
          previousStock: oldStock,
          newStock: newStock,
          unitType: itemInInvoice.unitType,
          unitQuantity: itemInInvoice.quantity,
          unitName: itemInInvoice.unitName,
          referenceInvoice: newPurchase.invoiceNumber,
          partyName: newPurchase.supplierName,
          notes: `فاتورة شراء وتوريد رقم ${newPurchase.invoiceNumber}`,
        };
        setMovements(m => [mov, ...m]);
        saveMovementToFirestore(mov).catch(console.error);

        const updatedProd = {
          ...prod,
          stockPieces: newStock,
          purchasePriceMinor,
          purchasePriceMajor,
          purchasePriceMiddle,
          defaultSupplierId: newPurchase.supplierId || prod.defaultSupplierId,
          defaultSupplierName: newPurchase.supplierName || prod.defaultSupplierName,
          updatedAt: new Date().toISOString(),
        };
        saveProductToFirestore(updatedProd).catch(console.error);
        return updatedProd;
      }
      return prod;
    }));

    // Update supplier lastTransactionDate and balance (if credit/partial)
    if (newPurchase.supplierId) {
      setSuppliers(prev => prev.map(s => {
        if (s.id === newPurchase.supplierId) {
          const newBal = newPurchase.remainingAmount > 0 ? +(s.balance + newPurchase.remainingAmount).toFixed(2) : s.balance;
          const txDate = newPurchase.date ? (newPurchase.date.includes('T') ? newPurchase.date.split('T')[0] : newPurchase.date) : new Date().toISOString().split('T')[0];
          const updatedSup = { 
            ...s, 
            balance: newBal,
            lastTransactionDate: txDate
          };
          saveSupplierToFirestore(updatedSup).catch(console.error);
          return updatedSup;
        }
        return s;
      }));
    }
  };

  const handleDeletePurchase = (
    purchaseId: string,
    revertStock: boolean = true,
    revertSupplierBalance: boolean = true
  ) => {
    const purchaseToDelete = purchases.find(p => p.id === purchaseId);
    if (!purchaseToDelete) return;

    if (revertStock) {
      setProducts(prev => prev.map(prod => {
        const item = purchaseToDelete.items.find(i => i.productId === prod.id);
        if (item) {
          const oldStock = prod.stockPieces;
          const newStock = Math.max(0, oldStock - item.totalPieces);

          // Record reverse movement
          const mov: StockMovement = {
            id: `mov_del_pur_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            productId: prod.id,
            productName: prod.name,
            date: new Date().toISOString(),
            type: 'adjustment_sub',
            quantityPieces: item.totalPieces,
            previousStock: oldStock,
            newStock: newStock,
            unitType: item.unitType,
            unitQuantity: item.quantity,
            unitName: item.unitName,
            referenceInvoice: purchaseToDelete.invoiceNumber,
            partyName: purchaseToDelete.supplierName,
            notes: `إلغاء وحذف فاتورة شراء رقم ${purchaseToDelete.invoiceNumber}`,
          };
          setMovements(m => [mov, ...m]);
          saveMovementToFirestore(mov).catch(console.error);

          const updatedProd = { ...prod, stockPieces: newStock, updatedAt: new Date().toISOString() };
          saveProductToFirestore(updatedProd).catch(console.error);
          return updatedProd;
        }
        return prod;
      }));
    }

    if (revertSupplierBalance && purchaseToDelete.supplierId && purchaseToDelete.remainingAmount > 0) {
      setSuppliers(prev => prev.map(s => {
        if (s.id === purchaseToDelete.supplierId) {
          const updatedSup = { ...s, balance: Math.max(0, +(s.balance - purchaseToDelete.remainingAmount).toFixed(2)) };
          saveSupplierToFirestore(updatedSup).catch(console.error);
          return updatedSup;
        }
        return s;
      }));
    }

    deletePurchaseFromFirestore(purchaseId).catch(console.error);
    setPurchases(prev => prev.filter(p => p.id !== purchaseId));
    if (selectedPurchaseForModal?.id === purchaseId) {
      setSelectedPurchaseForModal(null);
    }
  };

  const handleDeleteSale = (
    saleId: string,
    revertStock: boolean = true,
    revertCustomerBalance: boolean = true
  ) => {
    const saleToDelete = sales.find(s => s.id === saleId);
    if (!saleToDelete) return;

    if (revertStock) {
      setProducts(prev => prev.map(prod => {
        const item = saleToDelete.items.find(i => i.productId === prod.id);
        if (item) {
          const oldStock = prod.stockPieces;
          const newStock = oldStock + item.totalPieces;

          // Record reverse movement
          const mov: StockMovement = {
            id: `mov_del_sale_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            productId: prod.id,
            productName: prod.name,
            date: new Date().toISOString(),
            type: 'adjustment_add',
            quantityPieces: item.totalPieces,
            previousStock: oldStock,
            newStock: newStock,
            unitType: item.unitType,
            unitQuantity: item.quantity,
            unitName: item.unitName,
            referenceInvoice: saleToDelete.invoiceNumber,
            partyName: saleToDelete.customerName,
            notes: `إلغاء وحذف فاتورة بيع رقم ${saleToDelete.invoiceNumber} (إرجاع للمخزن)`,
          };
          setMovements(m => [mov, ...m]);
          saveMovementToFirestore(mov).catch(console.error);

          const updatedProd = { ...prod, stockPieces: newStock, updatedAt: new Date().toISOString() };
          saveProductToFirestore(updatedProd).catch(console.error);
          return updatedProd;
        }
        return prod;
      }));
    }

    if (revertCustomerBalance && saleToDelete.customerId && saleToDelete.remainingAmount > 0) {
      setCustomers(prev => prev.map(c => {
        if (c.id === saleToDelete.customerId) {
          const updatedCust = { ...c, balance: Math.max(0, +(c.balance - saleToDelete.remainingAmount).toFixed(2)) };
          saveCustomerToFirestore(updatedCust).catch(console.error);
          return updatedCust;
        }
        return c;
      }));
    }

    deleteSaleFromFirestore(saleId).catch(console.error);
    setSales(prev => prev.filter(s => s.id !== saleId));
    if (selectedSaleForModal?.id === saleId) {
      setSelectedSaleForModal(null);
    }
  };

  // Supplier & Customer CRUD
  const handleSaveSupplier = (sup: Supplier) => {
    setSuppliers(prev => {
      const idx = prev.findIndex(s => s.id === sup.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = sup;
        return copy;
      }
      return [sup, ...prev];
    });
    saveSupplierToFirestore(sup).catch(console.error);
  };

  const handleDeleteSupplier = (id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
    deleteSupplierFromFirestore(id).catch(console.error);
  };

  const handleBulkImportSuppliers = (
    importedSuppliers: Supplier[],
    strategy: 'update' | 'skip' | 'replace'
  ) => {
    let finalSuppliers: Supplier[] = [];
    setSuppliers(prev => {
      let updatedList = [...prev];

      importedSuppliers.forEach(imp => {
        const matchIdx = updatedList.findIndex(
          s => (imp.phone && s.phone === imp.phone) || s.name.toLowerCase().trim() === imp.name.toLowerCase().trim()
        );

        if (matchIdx >= 0) {
          const existing = updatedList[matchIdx];

          if (strategy === 'skip') {
            return;
          }

          if (strategy === 'update') {
            updatedList[matchIdx] = {
              ...existing,
              phone: imp.phone || existing.phone,
              company: imp.company || existing.company,
              address: imp.address || existing.address,
              balance: imp.balance !== 0 ? imp.balance : existing.balance,
            };
          } else if (strategy === 'replace') {
            updatedList[matchIdx] = {
              ...imp,
              id: existing.id,
              createdAt: existing.createdAt,
            };
          }
        } else {
          updatedList.unshift(imp);
        }
      });

      finalSuppliers = updatedList;
      return updatedList;
    });

    finalSuppliers.forEach(s => saveSupplierToFirestore(s).catch(console.error));
  };

  const handleSaveCustomer = (cust: Customer) => {
    setCustomers(prev => {
      const idx = prev.findIndex(c => c.id === cust.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = cust;
        return copy;
      }
      return [cust, ...prev];
    });
    saveCustomerToFirestore(cust).catch(console.error);
  };

  const handleBulkImportCustomers = (
    importedCustomers: Customer[],
    strategy: 'update' | 'skip' | 'replace'
  ) => {
    let finalCusts: Customer[] = [];
    setCustomers(prev => {
      let updatedList = [...prev];

      importedCustomers.forEach(imp => {
        const matchIdx = updatedList.findIndex(
          c => (imp.phone && c.phone === imp.phone) || c.name.toLowerCase().trim() === imp.name.toLowerCase().trim()
        );

        if (matchIdx >= 0) {
          const existing = updatedList[matchIdx];

          if (strategy === 'skip') {
            return;
          }

          if (strategy === 'update') {
            updatedList[matchIdx] = {
              ...existing,
              phone: imp.phone || existing.phone,
              address: imp.address || existing.address,
              balance: imp.balance !== 0 ? imp.balance : existing.balance,
            };
          } else if (strategy === 'replace') {
            updatedList[matchIdx] = {
              ...imp,
              id: existing.id,
              createdAt: existing.createdAt,
            };
          }
        } else {
          updatedList.unshift(imp);
        }
      });

      finalCusts = updatedList;
      return updatedList;
    });

    finalCusts.forEach(c => saveCustomerToFirestore(c).catch(console.error));
  };

  const handleDeleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    deleteCustomerFromFirestore(id).catch(console.error);
  };

  const handleDeleteAllSuppliers = async () => {
    const ids = suppliers.map(s => s.id);
    setSuppliers([]);
    saveStoredSuppliers([]);
    await clearAllSuppliersFromFirestore(ids).catch(console.error);
  };

  const handleDeleteAllCustomers = async () => {
    const ids = customers.map(c => c.id);
    setCustomers([]);
    saveStoredCustomers([]);
    await clearAllCustomersFromFirestore(ids).catch(console.error);
  };

  const handleDeleteAllPartners = async () => {
    const supIds = suppliers.map(s => s.id);
    const custIds = customers.map(c => c.id);
    setSuppliers([]);
    setCustomers([]);
    saveStoredSuppliers([]);
    saveStoredCustomers([]);
    await Promise.all([
      clearAllSuppliersFromFirestore(supIds).catch(console.error),
      clearAllCustomersFromFirestore(custIds).catch(console.error),
    ]);
  };

  const handleSavePayment = (payment: PartnerPayment) => {
    setPayments(prev => {
      const updated = [payment, ...prev.filter(p => p.id !== payment.id)];
      saveStoredPayments(updated);
      return updated;
    });
    savePaymentToFirestore(payment).catch(console.error);

    const paymentDateStr = payment.date ? (payment.date.includes('T') ? payment.date.split('T')[0] : payment.date) : new Date().toISOString().split('T')[0];

    if (payment.partnerType === 'customer') {
      setCustomers(prev => prev.map(c => {
        if (c.id === payment.partnerId || c.name === payment.partnerName) {
          const newBal = +(c.balance - payment.amount).toFixed(2);
          const updatedCust = {
            ...c,
            balance: newBal,
            lastTransactionDate: paymentDateStr,
          };
          saveCustomerToFirestore(updatedCust).catch(console.error);
          return updatedCust;
        }
        return c;
      }));
    } else {
      setSuppliers(prev => prev.map(s => {
        if (s.id === payment.partnerId || s.name === payment.partnerName) {
          const newBal = +(s.balance - payment.amount).toFixed(2);
          const updatedSup = {
            ...s,
            balance: newBal,
            lastTransactionDate: paymentDateStr,
          };
          saveSupplierToFirestore(updatedSup).catch(console.error);
          return updatedSup;
        }
        return s;
      }));
    }
  };

  const handleDeletePayment = (paymentId: string) => {
    const payToDelete = payments.find(p => p.id === paymentId);
    if (!payToDelete) return;

    if (payToDelete.partnerType === 'customer') {
      setCustomers(prev => prev.map(c => {
        if (c.id === payToDelete.partnerId || c.name === payToDelete.partnerName) {
          const newBal = +(c.balance + payToDelete.amount).toFixed(2);
          const updatedCust = { ...c, balance: newBal };
          saveCustomerToFirestore(updatedCust).catch(console.error);
          return updatedCust;
        }
        return c;
      }));
    } else {
      setSuppliers(prev => prev.map(s => {
        if (s.id === payToDelete.partnerId || s.name === payToDelete.partnerName) {
          const newBal = +(s.balance + payToDelete.amount).toFixed(2);
          const updatedSup = { ...s, balance: newBal };
          saveSupplierToFirestore(updatedSup).catch(console.error);
          return updatedSup;
        }
        return s;
      }));
    }

    setPayments(prev => {
      const updated = prev.filter(p => p.id !== paymentId);
      saveStoredPayments(updated);
      return updated;
    });
    deletePaymentFromFirestore(paymentId).catch(console.error);
  };

  const handleChangeCurrency = (curr: string) => {
    setCurrency(curr);
    setStoredCurrency(curr);
    saveAppPreferencesToFirestore({ currency: curr }).catch(() => {});
  };

  const handleForcePushToCloud = async (onProgress: (step: string, percent: number) => void) => {
    setCloudSyncStatus('syncing');
    const delaySaved = typeof window !== 'undefined' ? localStorage.getItem('pos_search_typing_delay_sec') : null;
    const delayNum = delaySaved !== null ? parseFloat(delaySaved) : 3.5;

    const result = await pushAllLocalDataToFirestore({
      products,
      suppliers,
      customers,
      sales,
      purchases,
      movements,
      storeConfig,
      onlineOrders,
      preferences: {
        currency,
        theme,
        searchTypingDelaySec: !isNaN(delayNum) ? delayNum : 3.5,
      },
      onProgress,
    });

    if (result.success) {
      setCloudUnsyncedLocalCount(0);
      setCloudSyncStatus('synced');
    }
    return result;
  };

  const handleForcePullFromCloud = async () => {
    setCloudSyncStatus('syncing');
    try {
      const data = await fetchAllCloudData();
      if (data.products.length > 0) {
        setProducts(data.products);
        saveStoredProducts(data.products);
      }
      if (data.suppliers.length > 0) {
        setSuppliers(data.suppliers);
        saveStoredSuppliers(data.suppliers);
      }
      if (data.customers.length > 0) {
        setCustomers(data.customers);
        saveStoredCustomers(data.customers);
      }
      if (data.sales.length > 0) {
        setSales(data.sales);
        saveStoredSales(data.sales);
      }
      if (data.purchases.length > 0) {
        setPurchases(data.purchases);
        saveStoredPurchases(data.purchases);
      }
      if (data.movements.length > 0) {
        setMovements(data.movements);
        saveStoredMovements(data.movements);
      }
      if (data.storeConfig) {
        setStoreConfig(data.storeConfig);
        saveStoredStoreConfig(data.storeConfig);
      }
      if (data.onlineOrders.length > 0) {
        setOnlineOrders(data.onlineOrders);
        saveStoredOnlineOrders(data.onlineOrders);
      }
      if (data.preferences) {
        if (data.preferences.currency) {
          setCurrency(data.preferences.currency);
          setStoredCurrency(data.preferences.currency);
        }
        if (data.preferences.theme) {
          setTheme(data.preferences.theme);
          saveStoredTheme(data.preferences.theme);
        }
        if (data.preferences.searchTypingDelaySec !== undefined) {
          localStorage.setItem('pos_search_typing_delay_sec', String(data.preferences.searchTypingDelaySec));
          window.dispatchEvent(new CustomEvent('pos_typing_delay_changed', { detail: data.preferences.searchTypingDelaySec }));
        }
      }
      setCloudUnsyncedLocalCount(0);
      setCloudSyncStatus('synced');
      return { success: true };
    } catch (err: any) {
      setCloudSyncStatus('synced');
      return { success: false, error: err?.message || 'فشل جلب البيانات من السحابة' };
    }
  };

  const handleForceCloudSync = async () => {
    await handleForcePullFromCloud();
  };

  const handleResetData = () => {
    resetAllData();
    setProducts(getStoredProducts());
    setSuppliers(getStoredSuppliers());
    setCustomers(getStoredCustomers());
    setSales(getStoredSales());
    setPurchases(getStoredPurchases());
    setMovements(getStoredMovements());
    handleForceCloudSync();
  };

  // Quick Action Routers
  const handleReorderFromAlerts = (prodId: string) => {
    setPrefillPurchaseProductId(prodId);
    setActiveTab('purchases');
  };

  const handleQuickNewSale = () => {
    setActiveTab('pos');
  };

  const handleQuickNewPurchase = () => {
    setPrefillPurchaseProductId(undefined);
    setActiveTab('purchases');
  };

  const handleQuickNewProduct = () => {
    setActiveTab('products');
  };

  // Online Store Order Handlers
  const handleAcceptOnlineOrder = (order: OnlineStoreOrder) => {
    const invoiceItems = order.items.map(item => {
      const prod = products.find(p => p.id === item.productId);
      const unitCost = prod ? prod.purchasePriceMinor : item.unitPrice * 0.7;
      const totalPieces = item.quantity;
      const totalCost = +(unitCost * totalPieces).toFixed(2);
      const profit = +(item.subtotal - totalCost).toFixed(2);
      return {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        productId: item.productId,
        productName: item.productName,
        unitType: item.unitType,
        unitName: item.unitName,
        quantity: item.quantity,
        piecesPerMajorUnit: prod ? prod.piecesPerMajorUnit : 1,
        totalPieces: totalPieces,
        unitPrice: item.unitPrice,
        unitCost: unitCost,
        subtotal: item.subtotal,
        totalCost: totalCost,
        profit: profit,
      };
    });

    const netAmount = order.totalAmount;
    const totalCost = invoiceItems.reduce((s, i) => s + i.totalCost, 0);
    const totalProfit = invoiceItems.reduce((s, i) => s + i.profit, 0);

    const saleInvoice: SaleInvoice = {
      id: `inv_online_${Date.now()}`,
      invoiceNumber: `INV-STORE-${order.orderNumber.replace(/[^0-9]/g, '') || Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString(),
      customerName: `${order.customerName} (طلب متجر)`,
      customerPhone: order.customerPhone,
      items: invoiceItems,
      subtotal: netAmount,
      discount: 0,
      netAmount: netAmount,
      totalCost: totalCost,
      totalProfit: totalProfit,
      paidAmount: netAmount,
      remainingAmount: 0,
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      notes: `تم اعتماد الطلب الإلكتروني رقم ${order.orderNumber} - التوصيل: ${order.customerAddress || 'الاستلام من المتجر'}`
    };

    handleSaveSale(saleInvoice);
    const updated = onlineOrders.map(o => o.id === order.id ? { ...o, status: 'accepted' as const } : o);
    setOnlineOrders(updated);
    const acceptedOrder = updated.find(o => o.id === order.id);
    if (acceptedOrder) {
      saveOnlineOrderToFirestore(acceptedOrder).catch(console.error);
    }
    setSelectedSaleForModal(saleInvoice);
  };

  const handleRejectOnlineOrder = (orderId: string) => {
    const updated = onlineOrders.map(o => o.id === orderId ? { ...o, status: 'rejected' as const } : o);
    setOnlineOrders(updated);
    const rejectedOrder = updated.find(o => o.id === orderId);
    if (rejectedOrder) {
      saveOnlineOrderToFirestore(rejectedOrder).catch(console.error);
    }
  };

  const handleDeleteOnlineOrder = (orderId: string) => {
    setOnlineOrders(prev => prev.filter(o => o.id !== orderId));
    deleteOnlineOrderFromFirestore(orderId).catch(console.error);
  };

  const handleCreateNewOnlineOrder = (newOrder: OnlineStoreOrder) => {
    setOnlineOrders(prev => [newOrder, ...prev]);
    saveOnlineOrderToFirestore(newOrder).catch(console.error);
  };

  const handleUpdateStoreConfig = (newConfig: StoreConfig) => {
    setStoreConfig(newConfig);
    saveStoreConfigToFirestore(newConfig).catch(console.error);
  };

  const lowStockCount = products.filter(p => p.stockPieces <= p.minStockAlert).length;
  const pendingOrdersCount = onlineOrders.filter(o => o.status === 'pending').length;

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start ${
      isMobileFrame ? 'p-0 sm:py-8 sm:px-4' : 'p-0'
    }`}>
      {/* Mobile Shell Container with Crystal Mauve Frame */}
      <div className={`w-full bg-slate-900 flex flex-col transition-all ${
        isMobileFrame 
          ? 'max-w-md sm:rounded-[36px] sm:border-[8px] sm:border-purple-950/70 dark:sm:border-zinc-800 sm:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] sm:overflow-hidden sm:min-h-[840px] relative'
          : 'max-w-4xl mx-auto min-h-screen'
      }`}>
        {/* Top Header */}
        <Header
          products={products}
          onOpenAlerts={() => setIsAlertsOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isMobileFrame={isMobileFrame}
          setIsMobileFrame={setIsMobileFrame}
          theme={theme}
          effectiveTheme={effectiveTheme}
          onToggleTheme={handleToggleTheme}
          cloudSyncStatus={cloudSyncStatus}
          onOpenCloudSync={() => setIsCloudSyncModalOpen(true)}
        />

        {/* Unsynced Alert Banner if local has more items than cloud */}
        {cloudUnsyncedLocalCount > 0 && (
          <div className="bg-gradient-to-r from-amber-950/90 to-amber-900/90 border-b border-amber-600/60 px-3 py-2 text-xs flex items-center justify-between gap-2 text-amber-200 animate-in fade-in">
            <span className="flex items-center gap-1.5 font-bold truncate">
              <span>⚡</span>
              <span>يوجد {cloudUnsyncedLocalCount} صنف جديد على هذا الجهاز لم يتم رفعهم للسحابة بعد</span>
            </span>
            <button
              type="button"
              onClick={() => setIsCloudSyncModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] shrink-0 transition-all shadow-sm active:scale-95"
            >
              مزامنة مع هاتفك الآن
            </button>
          </div>
        )}

        {/* Tab Views */}
        <main className="flex-1 w-full">
          {activeTab === 'dashboard' && (
            <DashboardTab
              products={products}
              sales={sales}
              purchases={purchases}
              currency={currency}
              setActiveTab={setActiveTab}
              onOpenAlerts={() => setIsAlertsOpen(true)}
              onQuickNewSale={handleQuickNewSale}
              onQuickNewPurchase={handleQuickNewPurchase}
              onQuickNewProduct={handleQuickNewProduct}
              onSelectSaleInvoice={(inv) => setSelectedSaleForModal(inv)}
            />
          )}

          {activeTab === 'products' && (
            <ProductsTab
              products={products}
              suppliers={suppliers}
              currency={currency}
              onSaveProduct={handleSaveProduct}
              onBulkImport={handleBulkImportProducts}
              onDeleteProduct={handleDeleteProduct}
              onDeleteAllProducts={handleDeleteAllProducts}
              onAdjustStock={handleAdjustStock}
              stockMovements={movements}
            />
          )}

          {activeTab === 'pos' && (
            <SalesTab
              products={products}
              customers={customers}
              sales={sales}
              currency={currency}
              initialCustomerId={saleCustomerPrefill}
              onReturnToCustomers={() => {
                setSaleCustomerPrefill(null);
                setPartnersInitialSubTab('customers');
                setActiveTab('partners');
              }}
              onSaveSale={handleSaveSale}
              onDeleteSale={handleDeleteSale}
              onOpenInvoiceModal={(inv) => setSelectedSaleForModal(inv)}
              onQuickAddCustomer={(name, phone) => {
                const newCust: Customer = {
                  id: 'cust_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
                  name: name.trim(),
                  phone: phone.trim(),
                  balance: 0,
                  createdAt: new Date().toISOString()
                };
                handleSaveCustomer(newCust);
                return newCust;
              }}
            />
          )}

          {activeTab === 'store' && (
            <div className="pt-3 px-3 sm:px-5">
              <StoreIntegrationTab
                products={products}
                storeConfig={storeConfig}
                onUpdateStoreConfig={handleUpdateStoreConfig}
                onlineOrders={onlineOrders}
                onAcceptOrder={handleAcceptOnlineOrder}
                onRejectOrder={handleRejectOnlineOrder}
                onDeleteOrder={handleDeleteOnlineOrder}
                onCreateNewOnlineOrder={handleCreateNewOnlineOrder}
                currency={currency}
              />
            </div>
          )}

          {activeTab === 'purchases' && (
            <PurchasesTab
              products={products}
              suppliers={suppliers}
              purchases={purchases}
              currency={currency}
              onSavePurchase={handleSavePurchase}
              onDeletePurchase={handleDeletePurchase}
              onOpenPurchaseInvoiceModal={(inv) => setSelectedPurchaseForModal(inv)}
              prefillProductId={prefillPurchaseProductId}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsTab
              products={products}
              sales={sales}
              purchases={purchases}
              currency={currency}
            />
          )}

          {activeTab === 'partners' && (
            <PartnersTab
              suppliers={suppliers}
              customers={customers}
              sales={sales}
              purchases={purchases}
              currency={currency}
              initialPartnerType={partnersInitialSubTab}
              payments={payments}
              onRecordPayment={handleSavePayment}
              onDeletePayment={handleDeletePayment}
              onSaveSupplier={handleSaveSupplier}
              onDeleteSupplier={handleDeleteSupplier}
              onSaveCustomer={handleSaveCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onBulkImportCustomers={handleBulkImportCustomers}
              onBulkImportSuppliers={handleBulkImportSuppliers}
              onStartSaleForCustomer={(custId) => {
                setSaleCustomerPrefill(custId);
                setPartnersInitialSubTab('customers');
                setActiveTab('pos');
              }}
              onStartPurchaseForSupplier={(supId) => {
                setActiveTab('purchases');
              }}
              onOpenSaleInvoice={(inv) => setSelectedSaleForModal(inv)}
              onOpenPurchaseInvoice={(inv) => setSelectedPurchaseForModal(inv)}
              onDeleteAllSuppliers={handleDeleteAllSuppliers}
              onDeleteAllCustomers={handleDeleteAllCustomers}
              onDeleteAllPartners={handleDeleteAllPartners}
            />
          )}
        </main>

        {/* Bottom Mobile Navigation */}
        <Navigation
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          lowStockCount={lowStockCount}
          pendingOrdersCount={pendingOrdersCount}
          isMobileFrame={isMobileFrame}
        />
      </div>

      {/* Alerts Drawer Modal */}
      <AlertsModal
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        products={products}
        currency={currency}
        onReorderProduct={handleReorderFromAlerts}
      />

      {/* Sale / Purchase Invoice Printable Modal */}
      <InvoiceModal
        saleInvoice={selectedSaleForModal}
        purchaseInvoice={selectedPurchaseForModal}
        currency={currency}
        onDeleteSale={handleDeleteSale}
        onDeletePurchase={handleDeletePurchase}
        onClose={() => {
          setSelectedSaleForModal(null);
          setSelectedPurchaseForModal(null);
        }}
      />

      {/* Global Settings & Data Modal (Always on top) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currency={currency}
        onChangeCurrency={handleChangeCurrency}
        theme={theme}
        onChangeTheme={handleChangeTheme}
        isMobileFrame={isMobileFrame}
        setIsMobileFrame={setIsMobileFrame}
        onResetData={handleResetData}
        onExportBackup={exportDataBackup}
        onOpenStoreTab={() => setActiveTab('store')}
        cloudSyncStatus={cloudSyncStatus}
        onForceCloudSync={handleForceCloudSync}
        onOpenCloudSync={() => setIsCloudSyncModalOpen(true)}
      />

      {/* Cloud Sync Modal (Phone <-> PC) */}
      <CloudSyncModal
        isOpen={isCloudSyncModalOpen}
        onClose={() => setIsCloudSyncModalOpen(false)}
        cloudSyncStatus={cloudSyncStatus}
        localProductsCount={products.length}
        localSalesCount={sales.length}
        localSuppliersCount={suppliers.length}
        localCustomersCount={customers.length}
        onForcePushToCloud={handleForcePushToCloud}
        onForcePullFromCloud={handleForcePullFromCloud}
      />
    </div>
  );
}
