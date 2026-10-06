import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  X, 
  Truck, 
  Package, 
  CheckCircle2, 
  ArrowRight,
  ShieldAlert,
  TrendingDown,
  Calendar,
  CalendarX,
  Clock,
  Edit3,
  Save,
  Check,
  Search,
  Filter,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  Percent,
  RefreshCw,
  Sparkles,
  Trash2
} from 'lucide-react';
import { Product } from '../types';
import { formatStockUnits, formatCurrency, isProductPriceLoss, getProductPriceLossInfo, normalizeArabicText } from '../utils/calculations';
import { soundEffects } from '../utils/soundEffects';

export type AlertTabType = 'all' | 'pricing' | 'stock' | 'expiry';

interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currency: string;
  onReorderProduct: (productId: string) => void;
  onUpdateProduct?: (product: Product) => void;
  onDeleteProduct?: (productId: string) => void;
  initialTab?: AlertTabType;
}

export const AlertsModal: React.FC<AlertsModalProps> = ({
  isOpen,
  onClose,
  products,
  currency,
  onReorderProduct,
  onUpdateProduct,
  onDeleteProduct,
  initialTab = 'all',
}) => {
  const [activeTab, setActiveTab] = useState<AlertTabType>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [newSalePriceMinor, setNewSalePriceMinor] = useState<number>(0);
  const [newPurchasePriceMinor, setNewPurchasePriceMinor] = useState<number>(0);
  const [editingExpiryId, setEditingExpiryId] = useState<string | null>(null);
  const [newExpiryDate, setNewExpiryDate] = useState<string>('');
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'expired' | 'near30' | 'near60'>('all');

  // Reset or sync tab on open
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchQuery('');
      setEditingPriceId(null);
      setEditingExpiryId(null);
    }
  }, [isOpen, initialTab]);

  // Today reference
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Helper to deduplicate alert items by normalized product name so each item appears strictly once
  const deduplicateForDisplay = (list: Product[]): Product[] => {
    const map = new Map<string, Product>();
    list.forEach(p => {
      const norm = normalizeArabicText(p.name);
      const isOrig = norm.includes('original') || norm.includes('اصلي') || norm.includes('أصلي');
      const key = `${norm}___${isOrig ? 'orig' : 'std'}`;

      if (!map.has(key)) {
        map.set(key, { ...p });
      } else {
        const existing = map.get(key)!;
        const b1 = (existing.barcode || '').trim();
        const b2 = (p.barcode || '').trim();
        const barcodes = [b1, b2].filter(Boolean);
        const uniqueBarcodes = Array.from(new Set(barcodes)).join(' • ');

        map.set(groupKeyClean(key), {
          ...existing,
          barcode: uniqueBarcodes || existing.barcode,
          stockPieces: (existing.stockPieces || 0) + (p.stockPieces || 0),
        });
      }
    });
    return Array.from(map.values());
  };

  const groupKeyClean = (k: string) => k;

  // 1. Price Loss Products: high-precision evaluation, strictly deduplicated by product name
  const priceLossProducts = useMemo(() => {
    const raw = products.filter(p => isProductPriceLoss(p));
    return deduplicateForDisplay(raw);
  }, [products]);

  // 2. Low Stock Products: strictly deduplicated by product name
  const lowStockProducts = useMemo(() => {
    const raw = products.filter(p => p.stockPieces <= p.minStockAlert);
    return deduplicateForDisplay(raw);
  }, [products]);

  // 3. Expiry Date Analysis: strictly deduplicated by product name
  const expiryAnalysis = useMemo(() => {
    const rawAlerts = products
      .filter(p => !!p.expiryDate && p.expiryDate.trim().length > 0)
      .map(p => {
        const expDate = new Date(p.expiryDate!);
        expDate.setHours(0, 0, 0, 0);
        const diffMs = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const isExpired = diffDays < 0;
        const isNear30 = diffDays >= 0 && diffDays <= 30;
        const isNear60 = diffDays > 30 && diffDays <= 60;
        return {
          product: p,
          diffDays,
          isExpired,
          isNear30,
          isNear60,
          isAlert: isExpired || isNear30 || isNear60,
        };
      })
      .filter(item => item.isAlert);

    const map = new Map<string, typeof rawAlerts[0]>();
    rawAlerts.forEach(item => {
      const norm = normalizeArabicText(item.product.name);
      const isOrig = norm.includes('original') || norm.includes('اصلي') || norm.includes('أصلي');
      const key = `${norm}___${isOrig ? 'orig' : 'std'}`;
      if (!map.has(key)) {
        map.set(key, item);
      }
    });

    return Array.from(map.values());
  }, [products, today]);

  // Filtered expiry list
  const filteredExpiryList = useMemo(() => {
    if (expiryFilter === 'expired') return expiryAnalysis.filter(i => i.isExpired);
    if (expiryFilter === 'near30') return expiryAnalysis.filter(i => i.isNear30);
    if (expiryFilter === 'near60') return expiryAnalysis.filter(i => i.isNear60);
    return expiryAnalysis;
  }, [expiryAnalysis, expiryFilter]);

  // Total alert count
  const totalAlertsCount = priceLossProducts.length + lowStockProducts.length + expiryAnalysis.length;

  // Handle Quick Price Save
  const handleSavePriceChange = (prod: Product) => {
    if (!onUpdateProduct) return;
    if (newSalePriceMinor <= 0) return;

    const norm = normalizeArabicText(prod.name);
    const related = products.filter(p => normalizeArabicText(p.name) === norm);
    
    related.forEach(p => {
      const ratio = p.piecesPerMajorUnit || 1;
      const updatedProd: Product = {
        ...p,
        salePriceMinor: newSalePriceMinor,
        salePriceMajor: newSalePriceMinor * ratio,
        purchasePriceMinor: newPurchasePriceMinor > 0 ? newPurchasePriceMinor : p.purchasePriceMinor,
        purchasePriceMajor: (newPurchasePriceMinor > 0 ? newPurchasePriceMinor : p.purchasePriceMinor) * ratio,
        updatedAt: new Date().toISOString(),
      };
      onUpdateProduct(updatedProd);
    });

    soundEffects.playSuccess();
    setSaveSuccessId(prod.id);
    setEditingPriceId(null);
    setTimeout(() => setSaveSuccessId(null), 2500);
  };

  // Handle Quick Margin Fix (e.g. +15% profit margin)
  const handleAutoMarginFix = (prod: Product, marginPercent: number) => {
    if (!onUpdateProduct) return;
    const targetSalePrice = Math.round(prod.purchasePriceMinor * (1 + marginPercent / 100));
    const norm = normalizeArabicText(prod.name);
    const related = products.filter(p => normalizeArabicText(p.name) === norm);

    related.forEach(p => {
      const ratio = p.piecesPerMajorUnit || 1;
      const updatedProd: Product = {
        ...p,
        salePriceMinor: targetSalePrice,
        salePriceMajor: targetSalePrice * ratio,
        updatedAt: new Date().toISOString(),
      };
      onUpdateProduct(updatedProd);
    });

    soundEffects.playSuccess();
    setSaveSuccessId(prod.id);
    setTimeout(() => setSaveSuccessId(null), 2500);
  };

  // Handle Quick Expiry Date Save
  const handleSaveExpiryChange = (prod: Product) => {
    if (!onUpdateProduct) return;
    const updatedProd: Product = {
      ...prod,
      expiryDate: newExpiryDate || undefined,
      updatedAt: new Date().toISOString(),
    };

    onUpdateProduct(updatedProd);
    soundEffects.playSuccess();
    setSaveSuccessId(prod.id);
    setEditingExpiryId(null);
    setTimeout(() => setSaveSuccessId(null), 2500);
  };

  if (!isOpen) return null;

  // Search filtering
  const filterBySearch = (name: string, barcode: string, category: string) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      name.toLowerCase().includes(q) ||
      barcode.toLowerCase().includes(q) ||
      category.toLowerCase().includes(q)
    );
  };

  const displayedPriceLoss = priceLossProducts.filter(p => filterBySearch(p.name, p.barcode, p.category));
  const displayedLowStock = lowStockProducts.filter(p => filterBySearch(p.name, p.barcode, p.category));
  const displayedExpiry = filteredExpiryList.filter(i => filterBySearch(i.product.name, i.product.barcode, i.product.category));

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in overflow-y-auto"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-3xl p-3.5 sm:p-5 shadow-2xl text-slate-100 my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/35 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-white">مركز الرقابة والتنبيهات الذكية</h3>
                {totalAlertsCount > 0 && (
                  <span className="keep-white bg-rose-600 text-white !text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow-sm animate-pulse" style={{ color: '#ffffff' }}>
                    {totalAlertsCount} تنبيه نشط
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                متابعة الخسائر السعرية، ونواقص حد الطلب، وتواريخ الصلاحية لحظياً
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="pt-3 pb-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {/* Tab: All */}
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-100 text-slate-900 shadow-md font-black'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>نظرة شاملة</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-black ${
              activeTab === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-700 text-slate-200'
            }`}>
              {totalAlertsCount}
            </span>
          </button>

          {/* Tab: Price Loss */}
          <button
            onClick={() => setActiveTab('pricing')}
            className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'pricing'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 font-black'
                : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span>خسارة الأسعار (الشراء &gt; البيع)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-black ${
              activeTab === 'pricing' ? 'bg-white text-rose-600' : 'bg-rose-500/30 text-rose-200'
            }`}>
              {priceLossProducts.length}
            </span>
          </button>

          {/* Tab: Low Stock */}
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'stock'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>أقل من حد الطلب</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-black ${
              activeTab === 'stock' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500/30 text-amber-200'
            }`}>
              {lowStockProducts.length}
            </span>
          </button>

          {/* Tab: Expiry */}
          <button
            onClick={() => setActiveTab('expiry')}
            className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'expiry'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-black'
                : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30'
            }`}
          >
            <CalendarX className="w-4 h-4" />
            <span>تواريخ الصلاحية</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-black ${
              activeTab === 'expiry' ? 'bg-white text-purple-600' : 'bg-purple-500/30 text-purple-200'
            }`}>
              {expiryAnalysis.length}
            </span>
          </button>
        </div>

        {/* Search Bar & Sub-Filters */}
        <div className="pt-1 pb-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث في الأصناف المنبهة بالاسم أو الباركود..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 focus:border-purple-500 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {activeTab === 'expiry' && (
            <div className="flex items-center gap-1 text-[11px] font-bold">
              <button
                onClick={() => setExpiryFilter('all')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  expiryFilter === 'all' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                الكل ({expiryAnalysis.length})
              </button>
              <button
                onClick={() => setExpiryFilter('expired')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  expiryFilter === 'expired' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-rose-400'
                }`}
              >
                منتهية ({expiryAnalysis.filter(i => i.isExpired).length})
              </button>
              <button
                onClick={() => setExpiryFilter('near30')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  expiryFilter === 'near30' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-amber-400'
                }`}
              >
                خلال 30 يوم ({expiryAnalysis.filter(i => i.isNear30).length})
              </button>
            </div>
          )}
        </div>

        {/* Global Summary Mini-Cards (When in 'all' tab) */}
        {activeTab === 'all' && (
          <div className="grid grid-cols-3 gap-2 pb-3 shrink-0">
            {/* Price loss summary */}
            <div 
              onClick={() => setActiveTab('pricing')}
              className="bg-rose-950/30 border border-rose-500/30 hover:border-rose-400 p-2.5 rounded-2xl cursor-pointer transition-all hover:scale-[1.01]"
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-rose-300 font-bold flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                  خسارة أسعار
                </span>
                <span className="keep-white font-black text-xs px-1.5 py-0.2 bg-rose-600 text-white rounded-full">
                  {priceLossProducts.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">سعر الشراء &gt; البيع</p>
            </div>

            {/* Low stock summary */}
            <div 
              onClick={() => setActiveTab('stock')}
              className="bg-amber-950/30 border border-amber-500/30 hover:border-amber-400 p-2.5 rounded-2xl cursor-pointer transition-all hover:scale-[1.01]"
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-amber-300 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  نقص المخزون
                </span>
                <span className="keep-white font-black text-xs px-1.5 py-0.2 bg-amber-600 text-white rounded-full">
                  {lowStockProducts.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">أقل من حد الطلب</p>
            </div>

            {/* Expiry summary */}
            <div 
              onClick={() => setActiveTab('expiry')}
              className="bg-purple-950/30 border border-purple-500/30 hover:border-purple-400 p-2.5 rounded-2xl cursor-pointer transition-all hover:scale-[1.01]"
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-purple-300 font-bold flex items-center gap-1">
                  <CalendarX className="w-3.5 h-3.5 text-purple-400" />
                  الصلاحية
                </span>
                <span className="keep-white font-black text-xs px-1.5 py-0.2 bg-purple-600 text-white rounded-full">
                  {expiryAnalysis.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">منتهية أو وشيكة</p>
            </div>
          </div>
        )}

        {/* Content List Area */}
        <div className="overflow-y-auto space-y-3 py-1 flex-1 pr-0.5 pl-0.5">
          {/* EMPTY STATE */}
          {totalAlertsCount === 0 ? (
            <div className="text-center py-14 text-slate-400 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-black text-white text-base">المتجر في حالة ممتازة وآمنة تماماً!</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                لا توجد أصناف خاسرة، المخزون متوفر فوق حد الطلب، وجميع تواريخ الصلاحية سليمة.
              </p>
            </div>
          ) : (
            <>
              {/* ======================================================== */}
              {/* 1. SECTION: PRICE LOSS PRODUCTS (الشراء > البيع) */}
              {/* ======================================================== */}
              {(activeTab === 'all' || activeTab === 'pricing') && (
                <div className="space-y-2.5">
                  {(activeTab === 'all' && displayedPriceLoss.length > 0) && (
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                        <h4 className="font-black text-xs sm:text-sm text-rose-400">
                          أصناف سعر شرائها أعلى من سعر بيعها ({displayedPriceLoss.length})
                        </h4>
                      </div>
                      <span className="text-[11px] text-rose-400/80 font-bold">خطر خسارة مالية مباشرة</span>
                    </div>
                  )}

                  {displayedPriceLoss.map(product => {
                    const lossInfo = getProductPriceLossInfo(product);
                    const lossAmount = lossInfo.lossAmount;
                    const lossPercent = lossInfo.lossPercentage;
                    const lossUnit = lossInfo.lossUnit;
                    const effPurchasePrice = lossInfo.purchasePrice;
                    const effSalePrice = lossInfo.salePrice;
                    const isMajorPkg = lossUnit === product.majorUnit && (product.piecesPerMajorUnit || 1) > 1;
                    const totalLossAtRisk = isMajorPkg
                      ? +((product.stockPieces / (product.piecesPerMajorUnit || 1)) * lossAmount).toFixed(2)
                      : +(product.stockPieces * lossAmount).toFixed(2);
                    const isEditing = editingPriceId === product.id;
                    const isSuccess = saveSuccessId === product.id;

                    return (
                      <div
                        key={`loss-${product.id}`}
                        className="bg-slate-850 border border-rose-500/40 hover:border-rose-400/70 rounded-2xl p-3.5 shadow-md flex flex-col gap-2.5 transition-all"
                      >
                        {/* Title & Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-sm text-white truncate">{product.name}</h4>
                              <span className="keep-white bg-rose-600/90 text-white !text-white text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 shadow-sm" style={{ color: '#ffffff' }}>
                                <TrendingDown className="w-3 h-3" />
                                <span>خسارة {lossAmount} {currency} / {lossUnit}</span>
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[11px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-300">
                                {product.barcode}
                              </span>
                              <span>•</span>
                              <span>{product.category}</span>
                              <span>•</span>
                              <span className="text-slate-300 font-bold">
                                المخزون: {product.stockPieces} {product.minorUnit}
                              </span>
                            </div>
                          </div>

                          <div className="text-left shrink-0">
                            <span className="text-[10px] text-rose-400 block font-bold">نسبة الخسارة</span>
                            <span className="font-black text-rose-400 text-sm dir-ltr">
                              -{lossPercent}%
                            </span>
                          </div>
                        </div>

                        {/* Price Breakdown Banner */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-900/90 rounded-xl p-2.5 border border-slate-800 text-xs">
                          <div>
                            <span className="text-[11px] text-slate-400 block mb-0.5">سعر الشراء (التكلفة):</span>
                            <span className="font-black text-amber-400 text-xs sm:text-sm">
                              {effPurchasePrice} {currency}
                            </span>
                            <span className="text-[10px] text-slate-500 block">لكل 1 {lossUnit}</span>
                          </div>

                          <div>
                            <span className="text-[11px] text-slate-400 block mb-0.5">سعر البيع الحالي:</span>
                            <span className="font-black text-rose-400 text-xs sm:text-sm line-through decoration-rose-500/70">
                              {effSalePrice} {currency}
                            </span>
                            <span className="text-[10px] text-rose-400/80 block">أقل من التكلفة!</span>
                          </div>

                          <div className="col-span-2 sm:col-span-1">
                            <span className="text-[11px] text-slate-400 block mb-0.5">الخسارة في المخزون:</span>
                            <span className="font-black text-rose-300 text-xs sm:text-sm">
                              {totalLossAtRisk > 0 ? formatCurrency(totalLossAtRisk, currency) : '0 ' + currency}
                            </span>
                            <span className="text-[10px] text-slate-500 block">إذا بيع الرصيد الحالي</span>
                          </div>
                        </div>

                        {/* Quick Interactive Price Fix / Edit */}
                        {isEditing ? (
                          <div className="bg-slate-900 border border-purple-500/50 rounded-xl p-2.5 space-y-2 animate-in fade-in">
                            <div className="text-xs font-bold text-purple-300 flex items-center justify-between">
                              <span>تصحيح فوري للأسعار:</span>
                              <span className="text-[11px] text-slate-400">التكلفة: {product.purchasePriceMinor} {currency}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[11px] text-emerald-400 block font-bold mb-1">
                                  سعر البيع الجديد (المقترح):
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={newSalePriceMinor || ''}
                                  onChange={(e) => setNewSalePriceMinor(parseFloat(e.target.value) || 0)}
                                  className="w-full bg-slate-800 border border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-black focus:outline-none"
                                  placeholder="سعر البيع..."
                                />
                              </div>

                              <div>
                                <label className="text-[11px] text-amber-400 block font-bold mb-1">
                                  سعر الشراء (التكلفة):
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={newPurchasePriceMinor || ''}
                                  onChange={(e) => setNewPurchasePriceMinor(parseFloat(e.target.value) || 0)}
                                  className="w-full bg-slate-800 border border-amber-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-black focus:outline-none"
                                  placeholder="سعر الشراء..."
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 gap-2">
                              {/* Quick margin shortcuts */}
                              <div className="flex items-center gap-1">
                                <span className="text-[10.5px] text-slate-400">ربح سريع:</span>
                                <button
                                  type="button"
                                  onClick={() => setNewSalePriceMinor(Math.round(product.purchasePriceMinor * 1.1))}
                                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded text-[10px] font-bold"
                                >
                                  +10%
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setNewSalePriceMinor(Math.round(product.purchasePriceMinor * 1.2))}
                                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded text-[10px] font-bold"
                                >
                                  +20%
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setNewSalePriceMinor(Math.round(product.purchasePriceMinor * 1.3))}
                                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded text-[10px] font-bold"
                                >
                                  +30%
                                </button>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setEditingPriceId(null)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                                >
                                  إلغاء
                                </button>
                                <button
                                  onClick={() => handleSavePriceChange(product)}
                                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-600/30"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>حفظ وتصحيح</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between pt-1 border-t border-slate-800 gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] text-slate-400">تصحيح تلقائي فوري:</span>
                              <button
                                onClick={() => handleAutoMarginFix(product, 15)}
                                className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-[11px] flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                                title="ضبط سعر البيع بهامش ربح +15% فوق سعر الشراء"
                              >
                                <Sparkles className="w-3 h-3 text-emerald-400" />
                                <span>رفع السعر (+15% ربح)</span>
                              </button>
                              <button
                                onClick={() => handleAutoMarginFix(product, 25)}
                                className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-[11px] flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                                title="ضبط سعر البيع بهامش ربح +25% فوق سعر الشراء"
                              >
                                <span>(+25% ربح)</span>
                              </button>
                            </div>

                            <button
                              onClick={() => {
                                setEditingPriceId(product.id);
                                setNewSalePriceMinor(Math.round(product.purchasePriceMinor * 1.2));
                                setNewPurchasePriceMinor(product.purchasePriceMinor);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition-all cursor-pointer active:scale-95"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>تحديد سعر البيع والشراء يدوياً</span>
                            </button>
                          </div>
                        )}

                        {isSuccess && (
                          <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl p-2 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>تم تصحيح السعر وحفظه بنجاح! تم حل تنبيه الخسارة.</span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {activeTab === 'pricing' && displayedPriceLoss.length === 0 && (
                    <div className="text-center py-10 text-slate-400 space-y-2">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                      <p className="font-bold text-slate-200 text-sm">ممتاز! لا توجد أصناف فيها سعر الشراء أعلى من سعر البيع.</p>
                      <p className="text-xs text-slate-500">جميع الأسعار تحقق هوامش ربح نظامية.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* 2. SECTION: LOW STOCK & REORDER POINT (أقل من حد الطلب) */}
              {/* ======================================================== */}
              {(activeTab === 'all' || activeTab === 'stock') && (
                <div className="space-y-2.5">
                  {(activeTab === 'all' && displayedLowStock.length > 0) && (
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                        <h4 className="font-black text-xs sm:text-sm text-amber-400">
                          أصناف أقل من حد الطلب أو قاربت على النفاد ({displayedLowStock.length})
                        </h4>
                      </div>
                      <span className="text-[11px] text-amber-400/80 font-bold">مخاطر انقطاع المبيعات</span>
                    </div>
                  )}

                  {displayedLowStock.map(product => {
                    const isZeroStock = product.stockPieces <= 0;
                    const stockUnits = formatStockUnits(
                      product.stockPieces,
                      product.piecesPerMajorUnit,
                      product.majorUnit,
                      product.minorUnit
                    );
                    const stockPercent = Math.min(100, Math.max(5, (product.stockPieces / (product.minStockAlert || 1)) * 100));

                    return (
                      <div
                        key={`stock-${product.id}`}
                        className={`bg-slate-850 border rounded-2xl p-3.5 shadow-md flex flex-col gap-2.5 transition-all ${
                          isZeroStock 
                            ? 'border-rose-500/50 hover:border-rose-400' 
                            : 'border-amber-500/40 hover:border-amber-400'
                        }`}
                      >
                        {/* Header info */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-sm text-white">{product.name}</h4>
                              {isZeroStock ? (
                                <span className="keep-white bg-rose-600 text-white !text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs animate-pulse" style={{ color: '#ffffff' }}>
                                  نفد المخزون بالكامل (0)
                                </span>
                              ) : (
                                <span className="keep-white bg-amber-600 text-white !text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs" style={{ color: '#ffffff' }}>
                                  دون حد الطلب
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                              <span className="font-mono text-[11px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-300">
                                {product.barcode}
                              </span>
                              <span>•</span>
                              <span>{product.category}</span>
                            </div>
                          </div>

                          <div className="text-left shrink-0">
                            <span className="text-[10px] text-slate-400 block">المتبقي حالياً:</span>
                            <span className={`font-black text-sm ${isZeroStock ? 'text-rose-400' : 'text-amber-400'}`}>
                              {product.stockPieces} {product.minorUnit}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar & Level */}
                        <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800 text-xs">
                          <div className="flex justify-between items-center text-[11px] text-slate-300 mb-1.5">
                            <span>الرصيد الفعلي: <strong className={isZeroStock ? 'text-rose-400' : 'text-amber-400'}>{stockUnits.shortText}</strong></span>
                            <span className="text-slate-400">حد التنبيه: <strong className="text-slate-200">{product.minStockAlert} {product.minorUnit}</strong></span>
                          </div>

                          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isZeroStock
                                  ? 'bg-rose-600'
                                  : 'bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                              }`}
                              style={{ width: `${isZeroStock ? 4 : stockPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Supplier & 1-Click Purchase Order */}
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800 gap-2 flex-wrap">
                          <span className="text-slate-400 text-[11.5px]">
                            المورد المعتمد: <strong className="text-slate-200">{product.defaultSupplierName || 'غير محدد'}</strong>
                          </span>

                          <button
                            onClick={() => {
                              onClose();
                              onReorderProduct(product.id);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/25 transition-all cursor-pointer active:scale-95"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>طلب توريد فوري (فاتورة شراء)</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {activeTab === 'stock' && displayedLowStock.length === 0 && (
                    <div className="text-center py-10 text-slate-400 space-y-2">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                      <p className="font-bold text-slate-200 text-sm">المخزون ممتاز وفي حالة آمنة!</p>
                      <p className="text-xs text-slate-500">لا توجد أصناف حالياً أقل من حد الطلب المحدد.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* 3. SECTION: EXPIRY DATES (تواريخ الصلاحية) */}
              {/* ======================================================== */}
              {(activeTab === 'all' || activeTab === 'expiry') && (
                <div className="space-y-2.5">
                  {(activeTab === 'all' && displayedExpiry.length > 0) && (
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping" />
                        <h4 className="font-black text-xs sm:text-sm text-purple-400">
                          تنبيهات تواريخ الصلاحية ({displayedExpiry.length})
                        </h4>
                      </div>
                      <span className="text-[11px] text-purple-400/80 font-bold">أصناف منتهية أو قاربت على الانتهاء</span>
                    </div>
                  )}

                  {displayedExpiry.map(({ product, diffDays, isExpired, isNear30 }) => {
                    const isEditing = editingExpiryId === product.id;
                    const isSuccess = saveSuccessId === product.id;
                    const stockRiskValue = (product.purchasePriceMinor || 0) * product.stockPieces;

                    return (
                      <div
                        key={`expiry-${product.id}`}
                        className={`bg-slate-850 border rounded-2xl p-3.5 shadow-md flex flex-col gap-2.5 transition-all ${
                          isExpired 
                            ? 'border-rose-600/60 bg-rose-950/20' 
                            : isNear30 
                              ? 'border-amber-500/50 bg-amber-950/15' 
                              : 'border-purple-500/40 bg-purple-950/10'
                        }`}
                      >
                        {/* Header & Badges */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-sm text-white">{product.name}</h4>
                              {isExpired ? (
                                <span className="keep-white bg-rose-600 text-white !text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm animate-pulse flex items-center gap-1" style={{ color: '#ffffff' }}>
                                  <CalendarX className="w-3 h-3" />
                                  <span>منتهي الصلاحية (ممنوع البيع)</span>
                                </span>
                              ) : isNear30 ? (
                                <span className="keep-white bg-amber-600 text-white !text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1" style={{ color: '#ffffff' }}>
                                  <Clock className="w-3 h-3" />
                                  <span>ينتهي قريباً (خلال {diffDays} يوم)</span>
                                </span>
                              ) : (
                                <span className="keep-white bg-purple-600 text-white !text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm" style={{ color: '#ffffff' }}>
                                  ينتهي خلال {diffDays} يوم
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                              <span className="font-mono text-[11px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-300">
                                {product.barcode}
                              </span>
                              <span>•</span>
                              <span>{product.category}</span>
                            </div>
                          </div>

                          <div className="text-left shrink-0">
                            <span className="text-[10px] text-slate-400 block">تاريخ الانتهاء:</span>
                            <span className={`font-black text-xs sm:text-sm font-mono ${isExpired ? 'text-rose-400' : 'text-amber-400'}`}>
                              {product.expiryDate}
                            </span>
                          </div>
                        </div>

                        {/* Status Breakdown Box */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-900/90 rounded-xl p-2.5 border border-slate-800 text-xs">
                          <div>
                            <span className="text-[11px] text-slate-400 block mb-0.5">الحالة الزمنية:</span>
                            <span className={`font-black text-xs sm:text-sm ${isExpired ? 'text-rose-400' : 'text-amber-300'}`}>
                              {isExpired ? `انتهى منذ ${Math.abs(diffDays)} يوم` : `متبقي ${diffDays} يوم`}
                            </span>
                          </div>

                          <div>
                            <span className="text-[11px] text-slate-400 block mb-0.5">الكمية بالمخزن:</span>
                            <span className="font-bold text-white text-xs sm:text-sm">
                              {product.stockPieces} {product.minorUnit}
                            </span>
                          </div>

                          <div className="col-span-2 sm:col-span-1">
                            <span className="text-[11px] text-slate-400 block mb-0.5">القيمة المعرضة للتلف:</span>
                            <span className="font-bold text-amber-300 text-xs sm:text-sm">
                              {formatCurrency(stockRiskValue, currency)}
                            </span>
                          </div>
                        </div>

                        {/* Quick Edit Expiry Date */}
                        {isEditing ? (
                          <div className="bg-slate-900 border border-purple-500/50 rounded-xl p-2.5 space-y-2 animate-in fade-in">
                            <label className="text-[11px] text-purple-300 block font-bold">
                              تعديل تاريخ انتهاء الصلاحية للصنف:
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="date"
                                value={newExpiryDate}
                                onChange={(e) => setNewExpiryDate(e.target.value)}
                                className="flex-1 bg-slate-800 border border-purple-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none"
                              />
                              <button
                                onClick={() => setEditingExpiryId(null)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold"
                              >
                                إلغاء
                              </button>
                              <button
                                onClick={() => handleSaveExpiryChange(product)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-600/30"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>حفظ</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between pt-1 border-t border-slate-800 gap-2 flex-wrap">
                            <span className="text-[11px] text-slate-400">
                              {isExpired ? '⚠️ يرجى سحب الصنف من الرفوف فوراً' : '💡 يُنصح بتطبيق خصم ترويجي لتصريف الكمية قبل الانتهاء'}
                            </span>

                            <button
                              onClick={() => {
                                setEditingExpiryId(product.id);
                                setNewExpiryDate(product.expiryDate || '');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              <span>تحديث تاريخ الصلاحية</span>
                            </button>
                          </div>
                        )}

                        {isSuccess && (
                          <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl p-2 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>تم تحديث تاريخ الصلاحية بنجاح!</span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {activeTab === 'expiry' && displayedExpiry.length === 0 && (
                    <div className="text-center py-10 text-slate-400 space-y-2">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                      <p className="font-bold text-slate-200 text-sm">جميع المنتجات صالحة وتواريخها آمنة!</p>
                      <p className="text-xs text-slate-500">لا توجد أصناف منتهية أو قاربت على الانتهاء خلال الفترة المحددة.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="text-xs text-slate-400">
            <span>إجمالي التنبيهات: </span>
            <strong className="text-white font-bold">{totalAlertsCount} صنف</strong>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};
