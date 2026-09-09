import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Minus,
  Search, 
  ShoppingCart, 
  Calendar, 
  User, 
  FileText, 
  Trash2, 
  CheckCircle2, 
  Printer, 
  DollarSign, 
  TrendingUp, 
  Percent, 
  AlertCircle,
  X,
  CreditCard,
  Banknote,
  Receipt,
  Phone,
  Clock,
  UserCheck,
  Edit2,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Keyboard,
  Check,
  Maximize2
} from 'lucide-react';
import { Product, Customer, SaleInvoice, InvoiceItem } from '../types';
import { formatCurrency, formatStockUnits, formatArabicDateTime } from '../utils/calculations';
import { isDualUnitProduct, getPrimaryUnit, hasThreeUnits, getProductUnitsList } from '../utils/unitHelpers';
import { SearchableProductSelect } from './SearchableProductSelect';
import { soundEffects } from '../utils/soundEffects';
import confetti from 'canvas-confetti';

interface SalesTabProps {
  products: Product[];
  customers: Customer[];
  sales: SaleInvoice[];
  currency: string;
  onSaveSale: (sale: SaleInvoice) => void;
  onDeleteSale?: (saleId: string, revertStock: boolean, revertCustomerBalance: boolean) => void;
  onOpenInvoiceModal: (invoice: SaleInvoice) => void;
  onQuickAddCustomer?: (name: string, phone: string) => void;
  autoOpenNewModal?: boolean;
}

export const SalesTab: React.FC<SalesTabProps> = ({
  products,
  customers,
  sales,
  currency,
  onSaveSale,
  onDeleteSale,
  onOpenInvoiceModal,
  onQuickAddCustomer,
  autoOpenNewModal = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewSaleModalOpen, setIsNewSaleModalOpen] = useState(autoOpenNewModal);
  const [invoiceToDelete, setInvoiceToDelete] = useState<SaleInvoice | null>(null);
  const [revertStockOnDelete, setRevertStockOnDelete] = useState<boolean>(true);
  const [revertCustomerBalanceOnDelete, setRevertCustomerBalanceOnDelete] = useState<boolean>(true);
  
  // New Sale Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customCustomerName, setCustomCustomerName] = useState<string>('عميل نقدي');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
  });
  const [cartItems, setCartItems] = useState<InvoiceItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'credit'>('cash');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  // Item selector inside modal
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>('');
  const [itemUnitType, setItemUnitType] = useState<'minor' | 'middle' | 'major'>('minor');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemCustomPrice, setItemCustomPrice] = useState<number>(0);

  // Quick Customer Creation
  const [showAddCustomerSubform, setShowAddCustomerSubform] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [formError, setFormError] = useState('');
  const [saleStep, setSaleStep] = useState<1 | 2>(1);
  const [step2SubView, setStep2SubView] = useState<'search' | 'invoice'>('search');
  const [isBigSearchOpen, setIsBigSearchOpen] = useState<boolean>(false);
  const [openAllProductsTrigger, setOpenAllProductsTrigger] = useState<number>(0);
  const [directAddToast, setDirectAddToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  // DOM Refs for seamless mobile navigation
  const searchSectionRef = useRef<HTMLDivElement>(null);
  const insertItemSectionRef = useRef<HTMLDivElement>(null);
  const addToCartBtnRef = useRef<HTMLButtonElement>(null);

  const openNewSale = () => {
    setSelectedCustomerId('');
    setCustomCustomerName('عميل نقدي');
    setCustomerPhone('');
    setInvoiceDate(new Date().toISOString().slice(0, 16));
    setCartItems([]);
    setDiscount(0);
    setPaymentMethod('cash');
    setPaidAmount(0);
    setNotes('');
    setSaleStep(1);
    setStep2SubView('search');
    setIsBigSearchOpen(false);
    setIsNewSaleModalOpen(true);
  };

  const handleProceedToItems = () => {
    setSaleStep(2);
    setStep2SubView('search'); // Show search frame alone
    setIsBigSearchOpen(false);
    try {
      soundEffects.playIncrease();
    } catch {
      // ignore
    }
    setTimeout(() => {
      if (searchSectionRef.current) {
        searchSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      const searchInput = document.querySelector('#sales-product-selector input') as HTMLInputElement | null;
      searchInput?.focus();
    }, 120);
  };

  // When customer changes
  const handleCustomerSelect = (custId: string) => {
    setSelectedCustomerId(custId);
    if (!custId) {
      setCustomCustomerName('عميل نقدي');
      setCustomerPhone('');
    } else {
      const cust = customers.find(c => c.id === custId);
      if (cust) {
        setCustomCustomerName(cust.name);
        setCustomerPhone(cust.phone || '');
      }
    }
  };

  // When product to add changes
  const handleProductSelectToAdd = (prodId: string) => {
    setSelectedProductToAdd(prodId);
    if (!prodId) return;

    const prod = products.find(p => p.id === prodId);
    if (prod) {
      const units = getProductUnitsList(prod);
      // Default to minor unit if multiple units exist, or major if single
      const defaultOpt = units.find(u => u.type === 'minor') || units[0];
      setItemUnitType(defaultOpt.type);
      setItemQuantity(1);
      setItemCustomPrice(defaultOpt.salePrice);

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

  // When unit type changes during item add
  const handleItemUnitChange = (type: 'minor' | 'middle' | 'major') => {
    setItemUnitType(type);
    const prod = products.find(p => p.id === selectedProductToAdd);
    if (prod) {
      const units = getProductUnitsList(prod);
      const selectedUnitOpt = units.find(u => u.type === type);
      if (selectedUnitOpt) {
        setItemCustomPrice(selectedUnitOpt.salePrice);
      }
    }
  };

  // Add Item to Cart
  const handleAddItemToCart = () => {
    if (!selectedProductToAdd) return;
    const prod = products.find(p => p.id === selectedProductToAdd);
    if (!prod) return;

    const units = getProductUnitsList(prod);
    const selectedUnitOpt = units.find(u => u.type === itemUnitType) || units[0];

    const effectiveRatio = selectedUnitOpt.ratio;
    const totalPieces = itemQuantity * effectiveRatio;
    const unitCost = selectedUnitOpt.purchasePrice;
    const subtotal = +(itemQuantity * itemCustomPrice).toFixed(2);
    const totalCost = +(itemQuantity * unitCost).toFixed(2);
    const profit = +(subtotal - totalCost).toFixed(2);

    const newItem: InvoiceItem = {
      id: `item_${Date.now()}_${Math.random()}`,
      productId: prod.id,
      productName: prod.name,
      unitType: selectedUnitOpt.type,
      unitName: selectedUnitOpt.name,
      quantity: itemQuantity,
      piecesPerMajorUnit: prod.piecesPerMajorUnit || 1,
      totalPieces,
      unitPrice: itemCustomPrice,
      unitCost,
      subtotal,
      totalCost,
      profit,
    };

    soundEffects.playAddToCart();
    setCartItems(prev => [...prev, newItem]);
    setSelectedProductToAdd('');
    setItemQuantity(1);
    setStep2SubView('search'); // Returns to search frame alone

    // Return smoothly back to the search boundaries and refocus search input
    setTimeout(() => {
      if (searchSectionRef.current) {
        searchSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      const searchInput = document.querySelector('#sales-product-selector input') as HTMLInputElement | null;
      searchInput?.focus();
    }, 110);
  };

  // 1-Tap Direct Add from Full-Screen Search List
  const handleDirectAddProductToInvoice = (prod: Product, unitType: 'minor' | 'middle' | 'major' = 'minor') => {
    const units = getProductUnitsList(prod);
    const selectedUnitOpt = units.find(u => u.type === unitType) || units[0];
    const effectiveRatio = selectedUnitOpt.ratio;
    const unitName = selectedUnitOpt.name;
    const unitPrice = selectedUnitOpt.salePrice;
    const unitCost = selectedUnitOpt.purchasePrice;

    // Check if item with same productId and unitType is already in cart
    const existingIndex = cartItems.findIndex(i => i.productId === prod.id && i.unitType === selectedUnitOpt.type);

    if (existingIndex >= 0) {
      const existing = cartItems[existingIndex];
      const newQty = existing.quantity + 1;
      const totalPieces = newQty * effectiveRatio;
      const subtotal = +(newQty * unitPrice).toFixed(2);
      const totalCost = +(newQty * unitCost).toFixed(2);
      const profit = +(subtotal - totalCost).toFixed(2);

      setCartItems(prev => prev.map((item, idx) => idx === existingIndex ? {
        ...item,
        quantity: newQty,
        totalPieces,
        subtotal,
        totalCost,
        profit,
      } : item));
      soundEffects.playIncrease();
    } else {
      const newItem: InvoiceItem = {
        id: `item_${Date.now()}_${Math.random()}`,
        productId: prod.id,
        productName: prod.name,
        unitType: selectedUnitOpt.type,
        unitName,
        quantity: 1,
        piecesPerMajorUnit: prod.piecesPerMajorUnit || 1,
        totalPieces: effectiveRatio,
        unitPrice,
        unitCost,
        subtotal: +(1 * unitPrice).toFixed(2),
        totalCost: +(1 * unitCost).toFixed(2),
        profit: +(unitPrice - unitCost).toFixed(2),
      };
      setCartItems(prev => [...prev, newItem]);
      soundEffects.playAddToCart();
    }

    // Reset selection so search frame is alone
    setSelectedProductToAdd('');
    setItemQuantity(1);
    setStep2SubView('search');

    // Show brief toast notification
    setDirectAddToast({
      message: `تمت إضافة "${prod.name}" (${unitName}) إلى الفاتورة بنجاح`,
      visible: true,
    });
    setTimeout(() => {
      setDirectAddToast(prev => ({ ...prev, visible: false }));
    }, 2200);

    setTimeout(() => {
      const searchInput = document.querySelector('#sales-product-selector input') as HTMLInputElement | null;
      searchInput?.focus();
    }, 80);
  };

  const handleSearchBlur = () => {
    // Keep user in search view while searching or adding products
  };

  const handleDismissKeyboardAndShowInvoice = () => {
    setIsBigSearchOpen(false);
    const searchInput = document.querySelector('#sales-product-selector input') as HTMLInputElement | null;
    searchInput?.blur();
    if (cartItems.length > 0) {
      setStep2SubView('invoice');
    }
  };

  const handleSwitchToSearch = () => {
    setOpenAllProductsTrigger(prev => prev + 1);
    setIsBigSearchOpen(true);
    setStep2SubView('search');
    setTimeout(() => {
      const searchInput = document.querySelector('#sales-product-selector input') as HTMLInputElement | null;
      searchInput?.focus();
    }, 80);
  };

  const handleCloseBigSearch = () => {
    setIsBigSearchOpen(false);
    if (cartItems.length > 0) {
      setStep2SubView('invoice');
    }
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
      const isDual = prod ? isDualUnitProduct(prod) : false;
      const ratio = isDual && item.unitType === 'major' && prod ? prod.piecesPerMajorUnit : 1;
      const totalPieces = newQty * ratio;
      const subtotal = +(newQty * item.unitPrice).toFixed(2);
      const totalCost = +(newQty * item.unitCost).toFixed(2);
      const profit = +(subtotal - totalCost).toFixed(2);
      return {
        ...item,
        quantity: newQty,
        totalPieces,
        subtotal,
        totalCost,
        profit,
      };
    }));
  };

  // Calculate totals
  const subtotal = cartItems.reduce((acc, i) => acc + i.subtotal, 0);
  const totalCost = cartItems.reduce((acc, i) => acc + i.totalCost, 0);
  const netAmount = Math.max(0, subtotal - discount);
  const totalProfit = Math.max(0, netAmount - totalCost);

  // Auto adjust paid amount if payment method is cash / card / transfer
  const handlePaymentMethodChange = (method: 'cash' | 'card' | 'transfer' | 'credit') => {
    setPaymentMethod(method);
    if (method === 'credit') {
      setPaidAmount(0);
    } else {
      setPaidAmount(netAmount);
    }
  };

  const handleSaveSaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (cartItems.length === 0) {
      setFormError('يرجى إضافة صنف واحد على الأقل إلى الفاتورة');
      return;
    }

    const remainingAmount = Math.max(0, netAmount - paidAmount);
    let paymentStatus: 'paid' | 'partial' | 'credit' = 'paid';
    if (remainingAmount > 0) {
      paymentStatus = paidAmount > 0 ? 'partial' : 'credit';
    }

    const newInvoice: SaleInvoice = {
      id: `sale_${Date.now()}`,
      invoiceNumber: `INV-${new Date().getFullYear()}-${String(sales.length + 1).padStart(3, '0')}`,
      date: invoiceDate ? new Date(invoiceDate).toISOString() : new Date().toISOString(),
      customerId: selectedCustomerId || undefined,
      customerName: customCustomerName.trim() || 'عميل نقدي',
      customerPhone: customerPhone.trim() || undefined,
      items: cartItems,
      subtotal,
      discount,
      netAmount,
      totalCost,
      totalProfit,
      paidAmount,
      remainingAmount,
      paymentMethod,
      paymentStatus,
      notes,
    };

    onSaveSale(newInvoice);
    setIsNewSaleModalOpen(false);

    // Play pleasant invoice celebration chime
    soundEffects.playInvoiceSuccess();

    // Trigger celebration effect
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.85 },
    });

    // Open invoice preview
    onOpenInvoiceModal(newInvoice);
  };

  // Filter sales invoices (by customer, invoice number, item name, or amount/price)
  const filteredSales = sales.filter(s => {
    const q = searchQuery.toLowerCase();
    return (
      s.customerName.toLowerCase().includes(q) ||
      s.invoiceNumber.toLowerCase().includes(q) ||
      s.items.some(i => i.productName.toLowerCase().includes(q)) ||
      s.netAmount.toString().includes(q) ||
      s.items.some(i => i.unitPrice.toString().includes(q))
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
            placeholder="بحث برقم الفاتورة، اسم العميل، أو الصنف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
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
          id="new-sale-invoice-btn"
          onClick={openNewSale}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 shrink-0 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>فاتورة بيع</span>
        </button>
      </div>

      {/* Invoices List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>سجل فواتير المبيعات ({filteredSales.length})</span>
          <span className="text-emerald-400 font-medium">تسجيل الخصم وحساب الأرباح تلقائياً</span>
        </div>

        {filteredSales.length === 0 ? (
          <div className="bg-slate-850 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 space-y-3">
            <ShoppingCart className="w-12 h-12 mx-auto text-slate-600" />
            <p className="font-bold text-slate-300">لا توجد فواتير مبيعات مسجلة</p>
            <p className="text-xs text-slate-500">اضغط على زر "فاتورة بيع" لإنشاء أول فاتورة وحساب الأرباح</p>
            <button
              onClick={openNewSale}
              className="mt-2 inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء فاتورة الآن</span>
            </button>
          </div>
        ) : (
          filteredSales.map((sale) => (
            <div
              key={sale.id}
              onClick={() => onOpenInvoiceModal(sale)}
              className="bg-slate-850 hover:bg-slate-800/90 border border-slate-800 rounded-2xl p-3.5 cursor-pointer transition-all shadow-md active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                      {sale.invoiceNumber}
                    </span>
                    <h3 className="font-bold text-sm text-white">{sale.customerName}</h3>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>{formatArabicDateTime(sale.date)}</span>
                  </div>
                </div>

                <div className="text-left">
                  <div className="font-black text-sm text-emerald-400">
                    {formatCurrency(sale.netAmount, currency)}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-block mt-0.5 ${
                    sale.paymentStatus === 'paid'
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      : sale.paymentStatus === 'partial'
                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                  }`}>
                    {sale.paymentStatus === 'paid' ? 'مسددة بالكامل' : sale.paymentStatus === 'partial' ? 'مسددة جزئياً' : 'آجلة (ذمم)'}
                  </span>
                </div>
              </div>

              {/* Items Summary */}
              <div className="text-xs text-slate-300 bg-slate-900/60 rounded-xl p-2 border border-slate-800/80 mb-2">
                <div className="text-[11px] text-slate-400 mb-1">الأصناف ({sale.items.length}):</div>
                <div className="space-y-0.5">
                  {sale.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <span>• {item.productName} ({item.quantity} {item.unitName})</span>
                      <span className="text-slate-300">{formatCurrency(item.subtotal, currency)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Profit & Action Footer */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60 mt-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>صافي ربح الفاتورة: {formatCurrency(sale.totalProfit, currency)}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInvoiceToDelete(sale);
                      setRevertStockOnDelete(true);
                      setRevertCustomerBalanceOnDelete(true);
                    }}
                    className="flex items-center gap-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2 py-1 rounded-lg text-[11px] font-semibold border border-rose-500/20 transition-all"
                    title="حذف فاتورة المبيعات"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span className="hidden sm:inline">حذف</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenInvoiceModal(sale);
                    }}
                    className="flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-slate-700 transition-all shadow-sm"
                  >
                    <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                    <span>عرض وطباعة</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Sale Invoice Fullscreen Modal / Drawer */}
      {isNewSaleModalOpen && (
        <div 
          onClick={() => setIsNewSaleModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in"
        >
          {/* Floating Toast Notification for 1-Tap Direct Add */}
          {directAddToast.visible && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[120] bg-emerald-600 text-white font-black text-xs sm:text-sm px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 border-2 border-emerald-300 shadow-emerald-950/80 animate-in fade-in slide-in-from-top-4 duration-200">
              <Check className="w-4 h-4 stroke-[3] text-white" />
              <span>{directAddToast.message}</span>
            </div>
          )}

          <div 
            onClick={(e) => e.stopPropagation()}
            className={`bg-slate-900 border border-slate-700 rounded-2xl sm:rounded-3xl w-full max-w-xl p-3 sm:p-5 shadow-2xl text-slate-100 my-auto ${
              saleStep === 1 ? 'max-h-[98vh]' : 'max-h-[94vh] overflow-y-auto'
            } animate-in zoom-in-95`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs sm:text-sm text-white">نقطة بيع وفاتورة جديدة</h3>
                  <p className="text-[10px] text-slate-400">
                    {saleStep === 1 ? 'الخطوة 1: حدد بيانات العميل وتاريخ الفاتورة' : 'الخطوة 2: أضف الأصناف والكميات للسلة'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewSaleModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 transition-colors"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step Tracker Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/70 rounded-xl border border-slate-800 mb-2.5">
              <button
                type="button"
                onClick={() => setSaleStep(1)}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-bold transition-all text-xs ${
                  saleStep === 1
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-mono">
                  {saleStep === 2 ? '✓' : '1'}
                </span>
                <span className="truncate">بيانات العميل والوقت</span>
              </button>

              <button
                type="button"
                onClick={handleProceedToItems}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-bold transition-all text-xs ${
                  saleStep === 2
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white/15 flex items-center justify-center text-[10px] font-mono">
                  2
                </span>
                <span className="truncate">إضافة الأصناف ({cartItems.length})</span>
              </button>
            </div>

            <form onSubmit={handleSaveSaleSubmit} className="space-y-3 text-xs">
              {/* STEP 1: Customer & Date Frame ALONE (Fits completely on screen without scrolling) */}
              {saleStep === 1 && (
                <div className="bg-slate-850 p-3 sm:p-4 rounded-2xl border border-slate-750 shadow-xl space-y-2.5 animate-in fade-in duration-200">
                  {/* Frame Header */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="font-extrabold text-slate-100 text-xs sm:text-sm">بيانات العميل والفاتورة</h4>
                    </div>
                    <span className="text-[9.5px] sm:text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-lg">
                      الخطوة 1 من 2
                    </span>
                  </div>

                  {/* 4 Fields Grid: 2 Columns on ALL screens (including mobile) to eliminate vertical scrolling */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                    {/* 1. اسم العميل (قائمة العملاء) */}
                    <div>
                      <label className="block text-[10.5px] sm:text-[11px] text-slate-300 font-bold mb-1 flex items-center gap-1 truncate">
                        <User className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">اسم العميل</span>
                      </label>
                      <select
                        value={selectedCustomerId}
                        onChange={(e) => handleCustomerSelect(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 sm:py-2 text-white font-medium focus:outline-none focus:border-emerald-500 text-xs truncate"
                      >
                        <option value="">عميل نقدي مباشر</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.phone || 'بدون هاتف'})</option>
                        ))}
                      </select>
                    </div>

                    {/* 2. اسم العميل النقدي */}
                    <div>
                      <label className="block text-[10.5px] sm:text-[11px] text-slate-300 font-bold mb-1 flex items-center gap-1 truncate">
                        <UserCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">اسم العميل النقدي</span>
                      </label>
                      <input
                        type="text"
                        value={customCustomerName}
                        onChange={(e) => setCustomCustomerName(e.target.value)}
                        placeholder="عميل نقدي"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 sm:py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* 3. رقم الهاتف */}
                    <div>
                      <label className="block text-[10.5px] sm:text-[11px] text-slate-300 font-bold mb-1 flex items-center gap-1 truncate">
                        <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">رقم الهاتف</span>
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="05xxxxxxxx"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 sm:py-2 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* 4. تاريخ ووقت البيع */}
                    <div>
                      <label className="block text-[10.5px] sm:text-[11px] text-slate-300 font-bold mb-1 flex items-center gap-1 truncate">
                        <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">تاريخ ووقت البيع</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 sm:py-2 text-white text-[11px] font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Complete Button in ONE horizontal row on mobile */}
                  <div className="pt-1.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsNewSaleModalOpen(false)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs transition-colors shrink-0 cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleProceedToItems}
                      className="flex-1 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white font-extrabold py-2 px-3 sm:py-2.5 sm:px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 border border-emerald-500/40 transition-all group cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform shrink-0" />
                      <span className="truncate">أتمم البيانات وانتقل لإضافة الأصناف</span>
                      <ArrowLeft className="w-3.5 h-3.5 text-emerald-200 group-hover:-translate-x-1 transition-transform shrink-0" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Items, Cart, Totals & Save */}
              {saleStep === 2 && (
                <div className="space-y-3.5 animate-in fade-in slide-in-from-left-2 duration-200">
                  {/* Compact Header Summary with Return/Edit Button */}
                  <div className="bg-slate-850/95 p-2.5 sm:p-3 rounded-2xl border border-emerald-500/35 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-xs sm:text-sm">
                            {customCustomerName || (selectedCustomerId ? customers.find(c => c.id === selectedCustomerId)?.name : 'عميل نقدي')}
                          </span>
                          {customerPhone && (
                            <span className="text-[10.5px] sm:text-[11px] text-slate-300 font-mono bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
                              📞 {customerPhone}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{formatArabicDateTime(invoiceDate)}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSaleStep(1)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-bold px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>تعديل العميل</span>
                    </button>
                  </div>

                  {/* Top Switcher Tab when cart has items */}
                  {cartItems.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-750 shadow-inner">
                      <button
                        type="button"
                        onClick={handleSwitchToSearch}
                        className={`py-2 px-3 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          step2SubView === 'search'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/60'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <Search className="w-4 h-4" />
                        <span>إطار بحث الأصناف</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDismissKeyboardAndShowInvoice}
                        className={`py-2 px-3 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          step2SubView === 'invoice'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/60'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <Receipt className="w-4 h-4" />
                        <span>الفاتورة وإتمام البيع</span>
                        <span className="bg-amber-400 text-slate-950 font-black text-[10.5px] px-1.5 py-0.5 rounded-full font-mono mr-1">
                          {cartItems.length}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* VIEW A: Search Frame (Shown alone initially or when adding more items) */}
                  {step2SubView === 'search' && (
                    <div className="space-y-3">
                      {/* Search Frame Container */}
                      <div className="bg-slate-850/90 p-3 sm:p-3.5 rounded-2xl border border-slate-750 shadow-md space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"></span>
                            <span className="font-extrabold text-slate-100 text-sm">إطار البحث عن أصناف</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenAllProductsTrigger(prev => prev + 1);
                                setIsBigSearchOpen(true);
                              }}
                              className="text-[11px] font-extrabold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 rounded-xl hover:bg-emerald-500/30 transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                              title="فتح النافذة الكبيرة للبحث بما في ذلك الأصناف النافدة"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                              <span>النافذة الكبيرة</span>
                            </button>
                            {cartItems.length > 0 && (
                              <button
                                type="button"
                                onClick={handleDismissKeyboardAndShowInvoice}
                                className="text-[11px] font-extrabold text-slate-300 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-xl hover:bg-slate-750 transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Keyboard className="w-3.5 h-3.5" />
                                <span>الفاتورة ({cartItems.length})</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Searchable Product Selector */}
                        <div ref={searchSectionRef}>
                          <SearchableProductSelect
                            id="sales-product-selector"
                            products={products}
                            selectedProductId={selectedProductToAdd}
                            onSelectProduct={handleProductSelectToAdd}
                            onDirectAddProduct={handleDirectAddProductToInvoice}
                            currency={currency}
                            mode="sale"
                            accentColor="emerald"
                            placeholder="ابحث باسم الصنف أو السعر (مثلاً: 25 أو حليب)..."
                            onSearchBlur={handleSearchBlur}
                            onKeyboardDismiss={handleDismissKeyboardAndShowInvoice}
                            hasCartItems={cartItems.length > 0}
                            cartItemsCount={cartItems.length}
                            cartItems={cartItems.map(ci => ({ productId: ci.productId, quantity: ci.quantity, unitType: ci.unitType }))}
                            isOpenBigWindow={isBigSearchOpen}
                            onCloseBigWindow={handleCloseBigSearch}
                            openAllProductsTrigger={openAllProductsTrigger}
                          />
                        </div>

                        {/* Item Details (When Product Selected) */}
                        {selectedProductToAdd && (() => {
                          const prod = products.find(p => p.id === selectedProductToAdd);
                          if (!prod) return null;

                          const units = getProductUnitsList(prod);
                          const activeUnitOpt = units.find(u => u.type === itemUnitType) || units[0];
                          const totalPieces = itemQuantity * activeUnitOpt.ratio;
                          const isStockInsufficient = totalPieces > prod.stockPieces;
                          const unitCost = activeUnitOpt.purchasePrice;
                          const itemProfit = (itemCustomPrice - unitCost) * itemQuantity;
                          const primaryUnit = getPrimaryUnit(prod);
                          const activeUnitName = activeUnitOpt.name;
                          const baseUnitName = prod.minorUnit || primaryUnit;

                          return (
                            <div ref={insertItemSectionRef} className="bg-slate-900/80 p-3 rounded-xl border border-slate-750 space-y-2.5 scroll-mt-20">
                              <div className="flex items-center justify-between text-[11px] text-slate-300">
                                <span>الرصيد بالمخزن: <strong className="text-emerald-400">{prod.stockPieces} {prod.minorUnit || primaryUnit}</strong></span>
                                {units.length > 1 ? (
                                  <span>
                                    {prod.piecesPerMajorUnit && `1 ${prod.majorUnit} = ${prod.piecesPerMajorUnit} ${prod.minorUnit}`}
                                    {prod.piecesPerMiddleUnit && ` | 1 ${prod.middleUnit} = ${prod.piecesPerMiddleUnit} ${prod.minorUnit}`}
                                  </span>
                                ) : (
                                  <span className="text-[10.5px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 font-semibold">
                                    الوحدة: {primaryUnit}
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                                {/* Unit Type */}
                                <div>
                                  <label className="block text-slate-400 mb-1 font-semibold text-xs">وحدة البيع</label>
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
                                      <span className="text-[10px] text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30 shrink-0 font-medium">
                                        أساسية
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Sale Price */}
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="block text-slate-400 font-semibold text-xs">سعر الوحدة</label>
                                    <span className="text-[10px] text-emerald-400 font-bold hidden sm:inline">
                                      الإجمالي: {formatCurrency(itemQuantity * itemCustomPrice, currency)}
                                    </span>
                                  </div>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={itemCustomPrice}
                                    onChange={(e) => setItemCustomPrice(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-emerald-400 font-bold text-center text-xs sm:text-sm"
                                  />
                                </div>

                                {/* Quantity with +/- Stepper */}
                                <div className="col-span-2 sm:col-span-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="block text-slate-400 font-semibold text-xs">الكمية المطلوبة</label>
                                    <span className="text-[10px] text-slate-400 sm:hidden">
                                      الإجمالي: <strong className="text-emerald-400">{formatCurrency(itemQuantity * itemCustomPrice, currency)}</strong>
                                    </span>
                                  </div>
                                  <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-inner focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all">
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
                                      className="w-10 h-9 bg-slate-750 hover:bg-emerald-600 active:bg-emerald-700 active:scale-95 text-slate-300 hover:text-white transition-all border-r border-slate-700 flex items-center justify-center shrink-0 cursor-pointer select-none"
                                      title="زيادة الكمية (+1)"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Stock Warning if insufficient */}
                              {isStockInsufficient && (
                                <div className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 text-[11px]">
                                  <AlertCircle className="w-4 h-4 shrink-0" />
                                  <span>تنبيه: الكمية المطلوبة ({totalPieces} {baseUnitName}) تتجاوز المتوفر ({prod.stockPieces})</span>
                                </div>
                              )}

                              {/* Quick Line Summary & Add Button */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800">
                                <div className="text-[11px] text-slate-300 flex items-center gap-2 flex-wrap">
                                  <span>الإجمالي: <strong className="text-emerald-400 font-bold text-sm">{formatCurrency(itemQuantity * itemCustomPrice, currency)}</strong></span>
                                  <span className="text-slate-500">({itemQuantity} {activeUnitName})</span>
                                  <span className="text-slate-600">•</span>
                                  <span className="text-emerald-400 font-semibold">ربح: {formatCurrency(itemProfit, currency)}</span>
                                </div>
                                <button
                                  ref={addToCartBtnRef}
                                  type="button"
                                  onClick={handleAddItemToCart}
                                  className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 hover:scale-[1.02] cursor-pointer"
                                >
                                  <Plus className="w-4 h-4" />
                                  <span>إدراج بالفاتورة</span>
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Quick Status Bar when items are in cart */}
                      {cartItems.length > 0 && (
                        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 p-3 rounded-2xl border border-emerald-500/30 flex items-center justify-between shadow-lg">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                              <ShoppingCart className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                <span>تمت إضافة <strong className="text-emerald-300 font-mono font-black">{cartItems.length}</strong> أصناف بالفاتورة</span>
                              </div>
                              <p className="text-[11px] text-emerald-400 font-bold font-mono">
                                صافي الفاتورة: {formatCurrency(netAmount, currency)}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleDismissKeyboardAndShowInvoice}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/50 transition-all cursor-pointer"
                          >
                            <Keyboard className="w-3.5 h-3.5" />
                            <span>إنزال الكيبورد وعرض الفاتورة</span>
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* VIEW B: Invoice Details, Cart Items, Totals & Save (Shown when keyboard is dismissed or invoice tab active) */}
                  {step2SubView === 'invoice' && (
                    <div className="space-y-3.5 animate-in fade-in duration-150">
                      {/* Top Action to Add More Items */}
                      <button
                        type="button"
                        onClick={handleSwitchToSearch}
                        className="w-full bg-slate-800/90 hover:bg-slate-750 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 font-extrabold py-2.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm group cursor-pointer"
                      >
                        <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                        <span>بحث وإضافة صنف آخر للفاتورة</span>
                      </button>

                      {/* Cart Items Table */}
                      <div className="space-y-2">
                        {cartItems.length === 0 ? (
                          <div className="text-center py-5 px-3 text-slate-400 text-xs bg-slate-900/60 rounded-2xl border border-dashed border-slate-850 flex flex-col items-center justify-center gap-1.5">
                            <ShoppingCart className="w-5 h-5 text-slate-500" />
                            <span>لم يتم إضافة أصناف بعد. ابحث عن صنف بالأعلى لإدراجه بالفاتورة</span>
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
                                    <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px] border border-emerald-500/20">
                                      ربح: {formatCurrency(item.profit, currency)}
                                    </span>
                                  </div>
                                </div>

                                {/* Delete button */}
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
                                  <span className="unit-badge-sale text-[11px] font-bold px-2 py-0.5 rounded-md border tracking-wide whitespace-nowrap shadow-xs select-none">
                                    {item.unitName}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCartItemQuantity(item.id, 1)}
                                    className="w-6 h-6 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 active:bg-emerald-700 text-emerald-300 hover:text-white flex items-center justify-center transition-all border border-emerald-500/30 hover:border-emerald-600 cursor-pointer select-none"
                                    title="زيادة الكمية (+1)"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Price Badge */}
                                <div className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-black text-xs font-mono shadow-inner tracking-tight shrink-0">
                                  {formatCurrency(item.subtotal, currency)}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Invoice Totals, Discounts, and Payment Method */}
                      <div className="bg-slate-850 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                        {/* Discount & Payment Method */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-slate-400 mb-1 font-semibold text-xs">خصم إضافي بالفاتورة</label>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={discount}
                              onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-bold text-xs sm:text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-400 mb-1 font-semibold text-xs">طريقة الدفع</label>
                            <select
                              value={paymentMethod}
                              onChange={(e) => handlePaymentMethodChange(e.target.value as any)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-bold text-xs sm:text-sm"
                            >
                              <option value="cash">نقداً (كاش)</option>
                              <option value="card">شبكة / مدى / بطاقة</option>
                              <option value="transfer">تحويل بنكي</option>
                              <option value="credit">آجل (ذمم للعميل)</option>
                            </select>
                          </div>
                        </div>

                        {/* Paid Amount (if not pure cash) */}
                        {paymentMethod === 'credit' && (
                          <div>
                            <label className="block text-amber-300 font-semibold mb-1 text-xs">المبلغ المدفوع مقدماً</label>
                            <input
                              type="number"
                              min="0"
                              max={netAmount}
                              value={paidAmount}
                              onChange={(e) => setPaidAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-2.5 py-1.5 text-amber-300 font-bold text-xs sm:text-sm"
                            />
                          </div>
                        )}

                        {/* Final Calculation Summary */}
                        <div className="bg-slate-900 p-3 rounded-xl border border-slate-750 space-y-1.5 text-xs">
                          <div className="flex justify-between text-slate-400">
                            <span>إجمالي الأصناف:</span>
                            <span>{formatCurrency(subtotal, currency)}</span>
                          </div>
                          {discount > 0 && (
                            <div className="flex justify-between text-rose-400">
                              <span>الخصم الممنوح:</span>
                              <span>-{formatCurrency(discount, currency)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-white font-black text-sm pt-1 border-t border-slate-800">
                            <span>صافي الفاتورة:</span>
                            <span className="text-emerald-400">{formatCurrency(netAmount, currency)}</span>
                          </div>
                          <div className="flex justify-between text-emerald-300 font-bold text-xs pt-1 border-t border-slate-800">
                            <span>صافي أرباح الفاتورة المحققة:</span>
                            <span>{formatCurrency(totalProfit, currency)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-slate-400 mb-1 font-semibold text-xs">ملاحظات الفاتورة</label>
                        <input
                          type="text"
                          placeholder="أي شروط أو تفاصيل إضافية..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs sm:text-sm"
                        />
                      </div>

                      {formError && (
                        <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 px-3 py-2 rounded-xl text-xs font-bold text-center">
                          ⚠️ {formError}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => setSaleStep(1)}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold flex items-center justify-center gap-1.5 text-xs order-2 sm:order-1 cursor-pointer"
                        >
                          <ArrowRight className="w-4 h-4" />
                          <span>رجوع لبيانات العميل</span>
                        </button>
                        <div className="w-full sm:w-auto flex items-center justify-end gap-2 order-1 sm:order-2">
                          <button
                            type="button"
                            onClick={() => setIsNewSaleModalOpen(false)}
                            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
                          >
                            إلغاء
                          </button>
                          <button
                            type="submit"
                            disabled={cartItems.length === 0}
                            className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 disabled:opacity-50 text-xs sm:text-sm cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>حفظ الفاتورة والطباعة</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
            </div>
          )}
        </form>
          </div>
        </div>
      )}

      {/* Delete Sale Confirmation Modal */}
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
                <h3 className="font-black text-base text-white">حذف فاتورة المبيعات</h3>
                <p className="text-xs text-slate-400">تأكيد حذف الفاتورة وإرجاع الكميات للمخزن</p>
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
                <span className="text-slate-400">العميل:</span>
                <span className="font-bold text-white">{invoiceToDelete.customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">تاريخ الفاتورة:</span>
                <span className="text-slate-300">{formatArabicDateTime(invoiceToDelete.date)}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                <span className="text-slate-400">المبلغ الصافي:</span>
                <span className="font-black text-sm text-emerald-400">
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
                  <span className="font-bold text-white block">إعادة الأصناف المباعة إلى المخزن تلقائياً</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    سيتم زيادة كميات الأصناف المذكورة في الفاتورة في رصيد المستودع الحالي.
                  </span>
                </div>
              </label>

              {invoiceToDelete.customerId && invoiceToDelete.remainingAmount > 0 && (
                <label className="flex items-start gap-2.5 bg-slate-850/80 p-2.5 rounded-xl border border-slate-800 cursor-pointer hover:bg-slate-800/80 transition-all">
                  <input
                    type="checkbox"
                    checked={revertCustomerBalanceOnDelete}
                    onChange={(e) => setRevertCustomerBalanceOnDelete(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-rose-500 focus:ring-rose-500 bg-slate-900 w-4 h-4"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-white block">إلغاء المديونية المستحقة على العميل</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      خصم المبلغ المتبقي ({formatCurrency(invoiceToDelete.remainingAmount, currency)}) من حساب العميل.
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
                  if (onDeleteSale && invoiceToDelete) {
                    onDeleteSale(invoiceToDelete.id, revertStockOnDelete, revertCustomerBalanceOnDelete);
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
