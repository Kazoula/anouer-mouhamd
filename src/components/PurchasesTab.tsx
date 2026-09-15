import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Minus,
  Search, 
  Truck, 
  Calendar, 
  FileText, 
  Trash2, 
  CheckCircle2, 
  Receipt,
  X,
  Boxes,
  Building,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { Product, Supplier, PurchaseInvoice, InvoiceItem } from '../types';
import { formatCurrency, formatStockUnits, formatArabicDateTime } from '../utils/calculations';
import { isDualUnitProduct, getPrimaryUnit, hasThreeUnits, getProductUnitsList } from '../utils/unitHelpers';
import { SearchableProductSelect } from './SearchableProductSelect';
import { soundEffects } from '../utils/soundEffects';

interface PurchasesTabProps {
  products: Product[];
  suppliers: Supplier[];
  purchases: PurchaseInvoice[];
  currency: string;
  onSavePurchase: (purchase: PurchaseInvoice, updateProductPrices: boolean) => void;
  onDeletePurchase?: (purchaseId: string, revertStock: boolean, revertSupplierBalance: boolean) => void;
  onOpenPurchaseInvoiceModal: (invoice: PurchaseInvoice) => void;
  autoOpenNewModal?: boolean;
  prefillProductId?: string;
}

export const PurchasesTab: React.FC<PurchasesTabProps> = ({
  products,
  suppliers,
  purchases,
  currency,
  onSavePurchase,
  onDeletePurchase,
  onOpenPurchaseInvoiceModal,
  autoOpenNewModal = false,
  prefillProductId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewPurchaseModalOpen, setIsNewPurchaseModalOpen] = useState(autoOpenNewModal || !!prefillProductId);
  const [invoiceToDelete, setInvoiceToDelete] = useState<PurchaseInvoice | null>(null);
  const [revertStockOnDelete, setRevertStockOnDelete] = useState<boolean>(true);
  const [revertSupplierBalanceOnDelete, setRevertSupplierBalanceOnDelete] = useState<boolean>(true);
  
  // New Purchase Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(() => suppliers[0]?.id || '');
  const [customSupplierName, setCustomSupplierName] = useState<string>('');
  const [supplierPhone, setSupplierPhone] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [cartItems, setCartItems] = useState<InvoiceItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'credit'>('cash');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paidAmountRaw, setPaidAmountRaw] = useState<string>('0');
  const [updateProductPrices, setUpdateProductPrices] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');

  // Item selector inside modal
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>(prefillProductId || '');
  const [itemUnitType, setItemUnitType] = useState<'minor' | 'middle' | 'major'>('major');
  const [itemQuantity, setItemQuantity] = useState<number>(5);
  const [itemCustomCost, setItemCustomCost] = useState<number>(0);
  const [formError, setFormError] = useState<string>('');

  // DOM Refs for mobile navigation
  const searchSectionRef = useRef<HTMLDivElement>(null);
  const insertItemSectionRef = useRef<HTMLDivElement>(null);
  const addToCartBtnRef = useRef<HTMLButtonElement>(null);
  const paidAmountInputRef = useRef<HTMLInputElement>(null);

  const openNewPurchase = (prodId?: string) => {
    const sup = suppliers[0];
    setSelectedSupplierId(sup?.id || '');
    setCustomSupplierName(sup?.name || '');
    setSupplierPhone(sup?.phone || '');
    setInvoiceDate(new Date().toISOString().slice(0, 16));
    setCartItems([]);
    setDiscount(0);
    setPaymentMethod('cash');
    setPaidAmount(0);
    setPaidAmountRaw('0');
    setUpdateProductPrices(true);
    setNotes('');

    if (prodId) {
      const prod = products.find(p => p.id === prodId);
      if (prod) {
        setSelectedProductToAdd(prodId);
        const units = getProductUnitsList(prod);
        const defaultOpt = units[units.length - 1] || units[0];
        setItemUnitType(defaultOpt.type);
        setItemQuantity(5);
        setItemCustomCost(defaultOpt.purchasePrice);
        if (prod.defaultSupplierId) {
          setSelectedSupplierId(prod.defaultSupplierId);
          const s = suppliers.find(sup => sup.id === prod.defaultSupplierId);
          if (s) {
            setCustomSupplierName(s.name);
            setSupplierPhone(s.phone);
          }
        }
      }
    } else {
      setSelectedProductToAdd('');
      setItemQuantity(1);
    }
    setIsNewPurchaseModalOpen(true);
  };

  const handleSupplierSelect = (supId: string) => {
    setSelectedSupplierId(supId);
    const sup = suppliers.find(s => s.id === supId);
    if (sup) {
      setCustomSupplierName(sup.name);
      setSupplierPhone(sup.phone || '');
    }
  };

  const handleProductSelectToAdd = (prodId: string) => {
    setSelectedProductToAdd(prodId);
    if (!prodId) return;

    const prod = products.find(p => p.id === prodId);
    if (prod) {
      const units = getProductUnitsList(prod);
      // For purchases, default to major unit if exists, or last unit
      const defaultOpt = units[units.length - 1] || units[0];
      setItemUnitType(defaultOpt.type);
      setItemQuantity(5);
      setItemCustomCost(defaultOpt.purchasePrice);

      // Auto-scroll directly to the insert section / "إدراج بالفاتورة" button
      setTimeout(() => {
        if (addToCartBtnRef.current) {
          addToCartBtnRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (insertItemSectionRef.current) {
          insertItemSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 90);
    }
  };

  const handleItemUnitChange = (type: 'minor' | 'middle' | 'major') => {
    setItemUnitType(type);
    const prod = products.find(p => p.id === selectedProductToAdd);
    if (prod) {
      const units = getProductUnitsList(prod);
      const selectedUnitOpt = units.find(u => u.type === type);
      if (selectedUnitOpt) {
        setItemCustomCost(selectedUnitOpt.purchasePrice);
      }
    }
  };

  const handleAddItemToCart = () => {
    if (!selectedProductToAdd) return;
    const prod = products.find(p => p.id === selectedProductToAdd);
    if (!prod) return;

    const units = getProductUnitsList(prod);
    const selectedUnitOpt = units.find(u => u.type === itemUnitType) || units[units.length - 1] || units[0];
    const totalPieces = itemQuantity * selectedUnitOpt.ratio;
    const subtotal = +(itemQuantity * itemCustomCost).toFixed(2);

    const newItem: InvoiceItem = {
      id: `item_p_${Date.now()}_${Math.random()}`,
      productId: prod.id,
      productName: prod.name,
      unitType: selectedUnitOpt.type,
      unitName: selectedUnitOpt.name,
      quantity: itemQuantity,
      piecesPerMajorUnit: prod.piecesPerMajorUnit || 1,
      totalPieces,
      unitPrice: itemCustomCost,
      unitCost: itemCustomCost,
      subtotal,
      totalCost: subtotal,
      profit: 0,
    };

    soundEffects.playAddToCart();
    setCartItems(prev => [...prev, newItem]);
    setSelectedProductToAdd('');
    setItemQuantity(1);

    // Return smoothly back to the search boundaries and refocus search input
    setTimeout(() => {
      if (searchSectionRef.current) {
        searchSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      const searchInput = document.querySelector('#purchases-product-selector input') as HTMLInputElement | null;
      searchInput?.focus();
    }, 110);
  };

  // 1-Tap Direct Add from Full-Screen Search List in Purchases
  const handleDirectAddProductToPurchase = (prod: Product, unitType: 'minor' | 'middle' | 'major' = 'major') => {
    const units = getProductUnitsList(prod);
    const selectedUnitOpt = units.find(u => u.type === unitType) || units[units.length - 1] || units[0];
    const effectiveRatio = selectedUnitOpt.ratio;
    const unitName = selectedUnitOpt.name;
    const unitCost = selectedUnitOpt.purchasePrice;

    const existingIndex = cartItems.findIndex(i => i.productId === prod.id && i.unitType === selectedUnitOpt.type);
    if (existingIndex >= 0) {
      const existing = cartItems[existingIndex];
      const newQty = existing.quantity + 1;
      const totalPieces = newQty * effectiveRatio;
      const subtotal = +(newQty * unitCost).toFixed(2);
      setCartItems(prev => prev.map((item, idx) => idx === existingIndex ? {
        ...item,
        quantity: newQty,
        totalPieces,
        subtotal,
        totalCost: subtotal,
      } : item));
      soundEffects.playIncrease();
    } else {
      const newItem: InvoiceItem = {
        id: `item_p_${Date.now()}_${Math.random()}`,
        productId: prod.id,
        productName: prod.name,
        unitType: selectedUnitOpt.type,
        unitName,
        quantity: 1,
        piecesPerMajorUnit: prod.piecesPerMajorUnit || 1,
        totalPieces: effectiveRatio,
        unitPrice: unitCost,
        unitCost,
        subtotal: +(1 * unitCost).toFixed(2),
        totalCost: +(1 * unitCost).toFixed(2),
        profit: 0,
      };
      setCartItems(prev => [...prev, newItem]);
      soundEffects.playAddToCart();
    }
    setSelectedProductToAdd('');
  };

  const handleRemoveCartItem = (itemId: string) => {
    setCartItems(prev => prev.filter(i => i.id !== itemId));
  };

  const handleUpdateCartItemQuantity = (itemId: string, delta: number) => {
    if (delta > 0) {
      soundEffects.playIncrease();
    } else {
      soundEffects.playDecrease();
    }
    setCartItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const newQty = Math.max(1, item.quantity + delta);
      const prod = products.find(p => p.id === item.productId);
      const units = prod ? getProductUnitsList(prod) : [];
      const unitOpt = units.find(u => u.type === item.unitType);
      const ratio = unitOpt ? unitOpt.ratio : 1;
      const totalPieces = newQty * ratio;
      const subtotal = +(newQty * item.unitPrice).toFixed(2);
      return {
        ...item,
        quantity: newQty,
        totalPieces,
        subtotal,
        totalCost: subtotal,
      };
    }));
  };

  const subtotal = cartItems.reduce((acc, i) => acc + i.subtotal, 0);
  const netAmount = Math.max(0, subtotal - discount);

  const focusPaidAmountInput = () => {
    setTimeout(() => {
      if (paidAmountInputRef.current) {
        paidAmountInputRef.current.focus();
        paidAmountInputRef.current.select();
        try {
          paidAmountInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch {
          // ignore
        }
      }
    }, 70);
  };

  const handlePaymentMethodChange = (method: 'cash' | 'transfer' | 'credit') => {
    setPaymentMethod(method);
    if (method === 'credit') {
      setPaidAmount(0);
      setPaidAmountRaw('');
      focusPaidAmountInput();
    } else {
      setPaidAmount(netAmount);
      setPaidAmountRaw(netAmount.toString());
    }
  };

  useEffect(() => {
    if (paymentMethod !== 'credit') {
      setPaidAmount(netAmount);
      setPaidAmountRaw(netAmount.toString());
    }
  }, [netAmount, paymentMethod]);

  const handleSavePurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (cartItems.length === 0) {
      setFormError('يرجى إضافة صنف واحد على الأقل لفاتورة الشراء');
      return;
    }

    const remainingAmount = Math.max(0, netAmount - paidAmount);
    let paymentStatus: 'paid' | 'partial' | 'credit' = 'paid';
    if (remainingAmount > 0) {
      paymentStatus = paidAmount > 0 ? 'partial' : 'credit';
    }

    const sup = suppliers.find(s => s.id === selectedSupplierId);

    const newInvoice: PurchaseInvoice = {
      id: `pur_${Date.now()}`,
      invoiceNumber: `PUR-${new Date().getFullYear()}-${String(purchases.length + 1).padStart(3, '0')}`,
      date: invoiceDate ? new Date(invoiceDate).toISOString() : new Date().toISOString(),
      supplierId: selectedSupplierId || undefined,
      supplierName: sup ? sup.name : customSupplierName || 'مورد عام',
      supplierPhone: sup?.phone || supplierPhone,
      items: cartItems,
      subtotal,
      discount,
      netAmount,
      paidAmount,
      remainingAmount,
      paymentMethod,
      paymentStatus,
      notes,
    };

    onSavePurchase(newInvoice, updateProductPrices);
    setIsNewPurchaseModalOpen(false);
    onOpenPurchaseInvoiceModal(newInvoice);
  };

  // Filter purchases invoices (by supplier, invoice number, item name, or amount/price)
  const filteredPurchases = purchases.filter(p => {
    const q = searchQuery.toLowerCase();
    return (
      p.supplierName.toLowerCase().includes(q) ||
      p.invoiceNumber.toLowerCase().includes(q) ||
      p.items.some(i => i.productName.toLowerCase().includes(q)) ||
      p.netAmount.toString().includes(q) ||
      p.items.some(i => i.unitCost.toString().includes(q))
    );
  });

  return (
    <div className="space-y-4 pb-20 pt-2 px-3 sm:px-4">
      {/* Top Action Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            placeholder="بحث برقم الفاتورة، اسم المورد، أو الصنف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-2.5 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          id="new-purchase-invoice-btn"
          onClick={() => openNewPurchase()}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-blue-600/30 shrink-0 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>فاتورة شراء</span>
        </button>
      </div>

      {/* Invoices List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>سجل فواتير وتوريدات المشتريات ({filteredPurchases.length})</span>
          <span className="text-blue-400 font-medium">زيادة رصيد المخزون تلقائياً</span>
        </div>

        {filteredPurchases.length === 0 ? (
          <div className="bg-slate-850 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 space-y-3">
            <Truck className="w-12 h-12 mx-auto text-slate-600" />
            <p className="font-bold text-slate-300">لا توجد فواتير شراء مسجلة</p>
            <p className="text-xs text-slate-500">سجل توريد بضاعة جديدة من الموردين لزيادة المخزون وضبط التكاليف</p>
            <button
              onClick={() => openNewPurchase()}
              className="mt-2 inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة فاتورة شراء</span>
            </button>
          </div>
        ) : (
          filteredPurchases.map((purchase) => (
            <div
              key={purchase.id}
              onClick={() => onOpenPurchaseInvoiceModal(purchase)}
              className="bg-slate-850 hover:bg-slate-800/90 border border-slate-800 rounded-2xl p-3.5 cursor-pointer transition-all shadow-md active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                      {purchase.invoiceNumber}
                    </span>
                    <h3 className="font-bold text-sm text-white">{purchase.supplierName}</h3>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>{formatArabicDateTime(purchase.date)}</span>
                  </div>
                </div>

                <div className="text-left">
                  <div className="font-black text-sm text-blue-400">
                    {formatCurrency(purchase.netAmount, currency)}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-block mt-0.5 ${
                    purchase.paymentStatus === 'paid'
                      ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                      : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                  }`}>
                    {purchase.paymentStatus === 'paid' ? 'مسددة' : 'آجلة للمورد'}
                  </span>
                </div>
              </div>

              {/* Items Summary */}
              <div className="text-xs text-slate-300 bg-slate-900/60 rounded-xl p-2 border border-slate-800/80 mb-2">
                <div className="text-[11px] text-slate-400 mb-1">الأصناف الموردة ({purchase.items.length}):</div>
                <div className="space-y-0.5">
                  {purchase.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <span>• {item.productName} ({item.quantity} {item.unitName})</span>
                      <span className="text-slate-300">{formatCurrency(item.subtotal, currency)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Footer */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60 mt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInvoiceToDelete(purchase);
                    setRevertStockOnDelete(true);
                    setRevertSupplierBalanceOnDelete(true);
                  }}
                  className="flex items-center gap-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-rose-500/20 transition-all"
                  title="حذف فاتورة الشراء"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>حذف الفاتورة</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPurchaseInvoiceModal(purchase);
                  }}
                  className="flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-slate-700 transition-all shadow-sm"
                >
                  <Receipt className="w-3.5 h-3.5 text-blue-400" />
                  <span>عرض وطباعة السند</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Purchase Invoice Modal */}
      {isNewPurchaseModalOpen && (
        <div 
          onClick={() => setIsNewPurchaseModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl p-3.5 sm:p-6 shadow-2xl text-slate-100 my-auto max-h-[94vh] overflow-y-auto animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">تسجيل فاتورة شراء وتوريد</h3>
                  <p className="text-[10.5px] sm:text-[11px] text-slate-400">تحديث رصيد المخزون وتكلفة الشراء</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewPurchaseModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchaseSubmit} className="space-y-3.5 text-xs">
              {/* Supplier & Date */}
              <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">المورد *</label>
                    <select
                      value={selectedSupplierId}
                      onChange={(e) => handleSupplierSelect(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
                    >
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.company || s.phone})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">تاريخ ووقت الشراء</label>
                    <input
                      type="datetime-local"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Add Items to Purchase */}
              <div className="bg-slate-850/90 p-3 sm:p-3.5 rounded-2xl border border-slate-750 shadow-md space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)] animate-pulse"></span>
                    <span className="font-extrabold text-slate-100 text-sm">الأصناف المشتراة</span>
                  </div>
                  <span className="text-[11px] font-bold text-blue-300 bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 rounded-xl">
                    حدد الكمية وسعر الشراء
                  </span>
                </div>

                {/* Searchable Product Selector (Search by Name or Price) */}
                <div ref={searchSectionRef}>
                  <SearchableProductSelect
                    id="purchases-product-selector"
                    products={products}
                    selectedProductId={selectedProductToAdd}
                    onSelectProduct={handleProductSelectToAdd}
                    onDirectAddProduct={handleDirectAddProductToPurchase}
                    currency={currency}
                    mode="purchase"
                    accentColor="blue"
                    placeholder="ابحث بأي جزء من الكلمة (مثال: ندوي أو MAX LE) أو السعر أو الباركود..."
                  />
                </div>

                {/* Item Details */}
                {selectedProductToAdd && (() => {
                  const prod = products.find(p => p.id === selectedProductToAdd);
                  if (!prod) return null;

                  const units = getProductUnitsList(prod);
                  const activeUnitOpt = units.find(u => u.type === itemUnitType) || units[units.length - 1] || units[0];
                  const primaryUnit = getPrimaryUnit(prod);
                  const activeUnitName = activeUnitOpt.name;
                  const totalPieces = itemQuantity * activeUnitOpt.ratio;
                  const baseUnitName = prod.minorUnit || primaryUnit;

                  return (
                    <div ref={insertItemSectionRef} className="bg-slate-900/80 p-3 rounded-xl border border-slate-750 space-y-2.5 scroll-mt-20">
                      <div className="flex items-center justify-between text-[11px] text-slate-300">
                        <span>الرصيد الحالي: <strong className="text-emerald-400">{prod.stockPieces} {prod.minorUnit || primaryUnit}</strong></span>
                        {units.length > 1 ? (
                          <span>
                            {prod.piecesPerMajorUnit && `1 ${prod.majorUnit} = ${prod.piecesPerMajorUnit} ${prod.minorUnit}`}
                            {prod.piecesPerMiddleUnit && ` | 1 ${prod.middleUnit} = ${prod.piecesPerMiddleUnit} ${prod.minorUnit}`}
                          </span>
                        ) : (
                          <span className="text-[10.5px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20 font-semibold">
                            الوحدة: {primaryUnit}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                        <div>
                          <label className="block text-slate-400 mb-1 font-semibold text-xs">وحدة الشراء</label>
                          {units.length > 1 ? (
                            <select
                              value={itemUnitType}
                              onChange={(e) => handleItemUnitChange(e.target.value as 'minor' | 'middle' | 'major')}
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-white font-bold text-xs sm:text-sm"
                            >
                              {units.map(u => (
                                <option key={u.type} value={u.type}>
                                  {u.name} {u.ratio > 1 ? `(${u.ratio})` : ''}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-bold text-xs sm:text-sm flex items-center justify-between shadow-xs">
                              <span className="truncate">{primaryUnit}</span>
                              <span className="text-[10px] text-blue-400 bg-blue-500/15 px-1.5 py-0.5 rounded border border-blue-500/30 shrink-0 font-medium">
                                أساسية
                              </span>
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-slate-400 font-semibold text-xs">سعر الشراء (للوحدة)</label>
                            <span className="text-[10px] text-blue-400 font-bold hidden sm:inline">
                              الإجمالي: {formatCurrency(itemQuantity * itemCustomCost, currency)}
                            </span>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={itemCustomCost}
                            onChange={(e) => setItemCustomCost(parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-blue-400 font-bold text-center text-xs sm:text-sm"
                          />
                        </div>

                        {/* Quantity with +/- Stepper (Spans full width on mobile) */}
                        <div className="col-span-2 sm:col-span-1">
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-slate-400 font-semibold text-xs">الكمية المشتراة</label>
                            <span className="text-[10px] text-slate-400 sm:hidden">
                              الإجمالي: <strong className="text-blue-400">{formatCurrency(itemQuantity * itemCustomCost, currency)}</strong>
                            </span>
                          </div>
                          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-inner focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/30 transition-all">
                            <button
                              type="button"
                              onClick={() => {
                                if (itemQuantity <= 1) {
                                  soundEffects.playLimit();
                                } else {
                                  soundEffects.playDecrease();
                                  setItemQuantity(prev => Math.max(1, prev - 1));
                                }
                              }}
                              disabled={itemQuantity <= 1}
                              className="w-10 h-9 bg-slate-750 hover:bg-slate-700 active:bg-slate-650 active:scale-95 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-750 disabled:cursor-not-allowed transition-all border-l border-slate-700 flex items-center justify-center shrink-0 cursor-pointer select-none"
                              title="تقليل الكمية (-1)"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={itemQuantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                if (val > itemQuantity) soundEffects.playIncrease();
                                else if (val < itemQuantity) soundEffects.playDecrease();
                                setItemQuantity(Math.max(1, val));
                              }}
                              className="w-full bg-transparent py-1.5 px-1 text-white font-black text-center text-sm focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                soundEffects.playIncrease();
                                setItemQuantity(prev => prev + 1);
                              }}
                              className="w-10 h-9 bg-slate-750 hover:bg-blue-600 active:bg-blue-700 active:scale-95 text-slate-300 hover:text-white transition-all border-r border-slate-700 flex items-center justify-center shrink-0 cursor-pointer select-none"
                              title="زيادة الكمية (+1)"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800">
                        <div className="text-[11px] text-slate-300 flex items-center gap-2 flex-wrap">
                          <span>الإجمالي: <strong className="text-blue-400 font-bold text-sm">{formatCurrency(itemQuantity * itemCustomCost, currency)}</strong></span>
                          <span className="text-slate-500">({itemQuantity} {activeUnitName})</span>
                          <span className="text-slate-600">•</span>
                          <span>زيادة المخزون: <strong className="text-white font-semibold">+{totalPieces} {baseUnitName}</strong></span>
                        </div>
                        <button
                          ref={addToCartBtnRef}
                          type="button"
                          onClick={handleAddItemToCart}
                          className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-95 hover:scale-[1.02]"
                        >
                          <Plus className="w-4 h-4" />
                          <span>إدراج بالفاتورة</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Cart Items Table */}
                <div className="space-y-2 pt-1">
                  {cartItems.length === 0 ? (
                    <div className="text-center py-5 px-3 text-slate-400 text-xs bg-slate-900/60 rounded-2xl border border-dashed border-slate-850 flex flex-col items-center justify-center gap-1.5">
                      <Truck className="w-5 h-5 text-slate-500" />
                      <span>لم يتم إضافة أصناف بعد. حدد صنفاً بالأعلى لإدراجه بفاتورة الشراء والتوريد</span>
                    </div>
                  ) : (
                    cartItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-900 hover:bg-slate-850/80 p-3 rounded-2xl border border-slate-750 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all shadow-sm"
                      >
                        {/* Top: Product Name (Never truncated) and Delete button on mobile */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-white text-xs sm:text-sm leading-snug break-words">
                              {item.productName}
                            </h5>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-slate-300 font-medium">
                                {item.quantity} {item.unitName} × {formatCurrency(item.unitPrice, currency)}
                              </span>
                              <span className="text-slate-600">•</span>
                              <span className="text-blue-400 font-semibold bg-blue-500/10 px-1.5 py-0.5 rounded text-[10px] border border-blue-500/20">
                                زيادة: +{item.totalPieces} قطعة
                              </span>
                            </div>
                          </div>

                          {/* Delete button (positioned neatly top-left in RTL) */}
                          <button
                            type="button"
                            onClick={() => handleRemoveCartItem(item.id)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-rose-500/15 hover:bg-rose-600 active:bg-rose-700 border border-rose-500/30 hover:border-rose-600 text-rose-400 hover:text-white flex items-center justify-center transition-all shadow-sm group/del cursor-pointer shrink-0"
                            title="حذف هذا الصنف من الفاتورة"
                          >
                            <Trash2 className="w-3.5 h-3.5 transition-transform group-hover/del:scale-110" />
                          </button>
                        </div>

                        {/* Bottom on mobile, Right on desktop: Quantity Stepper & Price Badge */}
                        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800 min-w-0">
                          {/* Cart Item Quantity Stepper */}
                          <div className="flex items-center gap-1 bg-slate-800/90 border border-slate-700/80 rounded-xl p-1 shrink-0 shadow-inner max-w-full">
                            <button
                              type="button"
                              onClick={() => handleUpdateCartItemQuantity(item.id, -1)}
                              disabled={item.quantity <= 1}
                              className="w-6 h-6 rounded-lg bg-slate-700/80 hover:bg-slate-600 active:bg-slate-500 text-slate-200 hover:text-white disabled:opacity-25 disabled:hover:bg-slate-700/80 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer select-none"
                              title="إنقاص الكمية (-1)"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-black text-white px-1.5 min-w-[22px] text-center font-mono">
                              {item.quantity}
                            </span>
                            <span className="unit-badge-purchase text-[11px] font-bold px-2 py-0.5 rounded-md border tracking-wide whitespace-nowrap shadow-xs select-none">
                              {item.unitName}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateCartItemQuantity(item.id, 1)}
                              className="w-6 h-6 rounded-lg bg-blue-600/30 hover:bg-blue-600 active:bg-blue-700 text-blue-300 hover:text-white flex items-center justify-center transition-all border border-blue-500/30 hover:border-blue-600 cursor-pointer select-none"
                              title="زيادة الكمية (+1)"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Price Badge */}
                          <div className="px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-300 font-black text-xs font-mono shadow-inner tracking-tight shrink-0">
                            {formatCurrency(item.subtotal, currency)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Update Product Master Price Option */}
              <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateProductPrices}
                    onChange={(e) => setUpdateProductPrices(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0 focus:outline-none"
                  />
                  <span className="text-xs font-semibold text-slate-300">
                    تحديث أسعار الشراء الافتراضية للأصناف في دليل المنتجات تلقائياً
                  </span>
                </label>
              </div>

              {/* Invoice Totals & Payment */}
              <div className="bg-slate-850 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">خصم من المورد</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={discount}
                      onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">طريقة السداد</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => handlePaymentMethodChange(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-bold"
                    >
                      <option value="cash">نقداً (كاش)</option>
                      <option value="credit">آجل (مستحق للمورد)</option>
                      <option value="transfer">تحويل بنكي</option>
                    </select>
                  </div>
                </div>

                {/* Quick Payment Method Selector */}
                <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handlePaymentMethodChange('cash')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      paymentMethod === 'cash'
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                        : 'bg-slate-900 text-slate-300 border-slate-750 hover:bg-slate-800'
                    }`}
                  >
                    نقداً (كاش)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaymentMethodChange('credit')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                      paymentMethod === 'credit'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black ring-2 ring-amber-400/40'
                        : 'bg-slate-900 text-amber-300 border-amber-500/40 hover:bg-amber-500/15'
                    }`}
                  >
                    <span>آجل للمورد</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${paymentMethod === 'credit' ? 'bg-slate-950' : 'bg-amber-400'}`}></span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaymentMethodChange('transfer')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      paymentMethod === 'transfer'
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : 'bg-slate-900 text-slate-300 border-slate-750 hover:bg-slate-800'
                    }`}
                  >
                    تحويل بنكي
                  </button>
                </div>

                {/* Paid Amount for Credit (Immediately ready to enter without fighting 0) */}
                {paymentMethod === 'credit' && (
                  <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-3 space-y-2.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <label className="block text-amber-300 font-black text-xs sm:text-sm flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                        <span>المبلغ المسدد للمورد مقدماً (دفعة نقدية)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-[10.5px] text-amber-300/80 font-medium">
                          {paidAmount === 0 ? 'آجل بالكامل (0)' : `${formatCurrency(paidAmount, currency)} مسدد`}
                        </span>
                        {paidAmount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setPaidAmount(0);
                              setPaidAmountRaw('');
                              focusPaidAmountInput();
                            }}
                            className="text-[10px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
                          >
                            مسح
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        ref={paidAmountInputRef}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max={netAmount}
                        step="any"
                        placeholder="0.00"
                        value={paidAmountRaw}
                        autoFocus
                        onFocus={(e) => {
                          e.target.select();
                        }}
                        onClick={(e) => {
                          (e.target as HTMLInputElement).select();
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPaidAmountRaw(val);
                          const parsed = parseFloat(val);
                          setPaidAmount(isNaN(parsed) ? 0 : Math.max(0, Math.min(netAmount, parsed)));
                        }}
                        onBlur={() => {
                          if (!paidAmountRaw.trim() || isNaN(parseFloat(paidAmountRaw))) {
                            setPaidAmount(0);
                            setPaidAmountRaw('0');
                          } else {
                            const num = Math.max(0, Math.min(netAmount, parseFloat(paidAmountRaw)));
                            setPaidAmount(num);
                            setPaidAmountRaw(num.toString());
                          }
                        }}
                        className="w-full bg-slate-900 border-2 border-amber-400/80 rounded-xl pr-3 pl-20 py-2 text-amber-300 font-black text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                        <span className="text-xs font-black text-amber-400/90 font-mono">
                          {currency}
                        </span>
                      </div>
                    </div>

                    {/* Quick Shortcuts */}
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setPaidAmount(0);
                          setPaidAmountRaw('0');
                          focusPaidAmountInput();
                        }}
                        className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-extrabold border transition-all cursor-pointer text-center ${
                          paidAmount === 0
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                            : 'bg-slate-900 text-amber-300/90 border-amber-500/30 hover:bg-amber-500/20'
                        }`}
                      >
                        0 (آجل بالكامل)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const half = Math.round((netAmount / 2) * 100) / 100;
                          setPaidAmount(half);
                          setPaidAmountRaw(half.toString());
                          focusPaidAmountInput();
                        }}
                        className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-extrabold border transition-all cursor-pointer text-center ${
                          paidAmount === Math.round((netAmount / 2) * 100) / 100 && paidAmount > 0
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                            : 'bg-slate-900 text-amber-300/90 border-amber-500/30 hover:bg-amber-500/20'
                        }`}
                      >
                        نصف المبلغ (50%)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPaidAmount(netAmount);
                          setPaidAmountRaw(netAmount.toString());
                          focusPaidAmountInput();
                        }}
                        className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-extrabold border transition-all cursor-pointer text-center ${
                          paidAmount === netAmount && netAmount > 0
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                            : 'bg-slate-900 text-amber-300/90 border-amber-500/30 hover:bg-amber-500/20'
                        }`}
                      >
                        كامل المبلغ
                      </button>
                    </div>

                    {/* Remaining Supplier Balance */}
                    <div className="flex items-center justify-between text-xs pt-1 px-1 border-t border-amber-500/20 font-semibold">
                      <span className="text-slate-400">المتبقي مستحق للمورد (آجل):</span>
                      <span className="text-amber-400 font-black text-sm font-mono">
                        {formatCurrency(Math.max(0, netAmount - paidAmount), currency)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="bg-slate-900 p-3 rounded-xl border border-slate-750 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>إجمالي المشتريات:</span>
                    <span>{formatCurrency(subtotal, currency)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-rose-400">
                      <span>الخصم المكتسب:</span>
                      <span>-{formatCurrency(discount, currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-white font-black text-sm pt-1 border-t border-slate-800">
                    <span>صافي الفاتورة الإجمالي:</span>
                    <span className="text-blue-400">{formatCurrency(netAmount, currency)}</span>
                  </div>
                </div>
              </div>

              {formError && (
                <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 px-3 py-2 rounded-xl text-xs font-bold text-center">
                  ⚠️ {formError}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewPurchaseModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={cartItems.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد الشراء وإضافة المخزون</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Purchase Confirmation Modal */}
      {invoiceToDelete && (
        <div 
          onClick={() => setInvoiceToDelete(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 shadow-2xl text-slate-100 my-auto animate-in zoom-in-95"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-base text-white">حذف فاتورة المشتريات</h3>
                <p className="text-xs text-slate-400">تأكيد حذف الفاتورة وضبط رصيد المخزون</p>
              </div>
            </div>

            {/* Invoice Info Card */}
            <div className="bg-slate-850 border border-slate-800 rounded-2xl p-3.5 space-y-2 mb-4 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">رقم الفاتورة:</span>
                <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  {invoiceToDelete.invoiceNumber}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">المورد:</span>
                <span className="font-bold text-white">{invoiceToDelete.supplierName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">تاريخ التوريد:</span>
                <span className="text-slate-300">{formatArabicDateTime(invoiceToDelete.date)}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                <span className="text-slate-400">المبلغ الإجمالي:</span>
                <span className="font-black text-sm text-blue-400">
                  {formatCurrency(invoiceToDelete.netAmount, currency)}
                </span>
              </div>
            </div>

            {/* Revert Options */}
            <div className="space-y-2.5 mb-5">
              <label className="flex items-start gap-2.5 bg-slate-850/80 p-2.5 rounded-xl border border-slate-800 cursor-pointer hover:bg-slate-800/80 transition-all">
                <input
                  type="checkbox"
                  checked={revertStockOnDelete}
                  onChange={(e) => setRevertStockOnDelete(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-rose-500 focus:ring-rose-500 bg-slate-900 w-4 h-4"
                />
                <div className="text-xs">
                  <span className="font-bold text-white block">خصم الكميات المشتراة من المخزن تلقائياً</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    سيتم إنقاص كميات الأصناف الموردة في هذه الفاتورة من رصيد المستودع الحالي.
                  </span>
                </div>
              </label>

              {invoiceToDelete.supplierId && invoiceToDelete.remainingAmount > 0 && (
                <label className="flex items-start gap-2.5 bg-slate-850/80 p-2.5 rounded-xl border border-slate-800 cursor-pointer hover:bg-slate-800/80 transition-all">
                  <input
                    type="checkbox"
                    checked={revertSupplierBalanceOnDelete}
                    onChange={(e) => setRevertSupplierBalanceOnDelete(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-rose-500 focus:ring-rose-500 bg-slate-900 w-4 h-4"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-white block">إلغاء المديونية المستحقة للمورد</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      خصم المبلغ المتبقي ({formatCurrency(invoiceToDelete.remainingAmount, currency)}) من حساب المورد.
                    </span>
                  </div>
                </label>
              )}
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setInvoiceToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeletePurchase && invoiceToDelete) {
                    onDeletePurchase(invoiceToDelete.id, revertStockOnDelete, revertSupplierBalanceOnDelete);
                  }
                  setInvoiceToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/30 transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>تأكيد الحذف نهائياً</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
