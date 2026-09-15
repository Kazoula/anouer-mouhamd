import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Minus,
  Search, 
  Filter, 
  AlertTriangle, 
  Edit3, 
  Trash2, 
  SlidersHorizontal, 
  Barcode, 
  Package, 
  Check, 
  X,
  ArrowUpDown,
  History,
  Info,
  FileSpreadsheet,
  Download,
  ArrowDownToLine,
  Upload,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  Layers,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { Product, Supplier, StockMovement } from '../types';
import { formatCurrency, formatStockUnits, formatArabicDateTime } from '../utils/calculations';
import { isDualUnitProduct, getPrimaryUnit, normalizeProductUnits } from '../utils/unitHelpers';
import { soundEffects } from '../utils/soundEffects';
import { ImportProductsModal } from './ImportProductsModal';
import { classifyProductCategory, STORE_CATEGORY_NAMES } from '../utils/categoryClassifier';
import { repairAndClassifyProduct } from '../utils/storage';
import { filterAndRankProducts, extractSearchTokens } from '../utils/searchHelpers';
import { HighlightedProductName } from './SearchableProductSelect';

interface ProductsTabProps {
  products: Product[];
  suppliers: Supplier[];
  currency: string;
  onSaveProduct: (product: Product) => void;
  onBulkImport: (products: Product[], strategy: 'update' | 'skip' | 'replace') => void;
  onDeleteProduct: (productId: string) => void;
  onDeleteAllProducts?: (clearMovements?: boolean) => void;
  onAdjustStock: (productId: string, diffPieces: number, reason: string) => void;
  stockMovements: StockMovement[];
  initialFilterLowStock?: boolean;
}

export const ProductsTab: React.FC<ProductsTabProps> = ({
  products,
  suppliers,
  currency,
  onSaveProduct,
  onBulkImport,
  onDeleteProduct,
  onDeleteAllProducts,
  onAdjustStock,
  stockMovements,
  initialFilterLowStock = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState<boolean>(initialFilterLowStock);
  
  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [clearMovementsWithAll, setClearMovementsWithAll] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Stock Adjust Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustTargetProduct, setAdjustTargetProduct] = useState<Product | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState<number>(1);
  const [adjustUnitType, setAdjustUnitType] = useState<'minor' | 'major'>('minor');
  const [adjustType, setAdjustType] = useState<'add' | 'sub'>('add');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Delete Confirmation Modal
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Movements History Modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTargetProduct, setHistoryTargetProduct] = useState<Product | null>(null);

  // Form State for Add / Edit
  const [isDualUnitMode, setIsDualUnitMode] = useState<boolean>(false);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    barcode: '',
    category: 'مواد غذائية',
    majorUnit: 'كرتونة',
    minorUnit: 'كرتونة',
    piecesPerMajorUnit: 1,
    purchasePriceMinor: 100,
    purchasePriceMajor: 100,
    salePriceMinor: 120,
    salePriceMajor: 120,
    stockPieces: 10,
    minStockAlert: 2,
    defaultSupplierId: '',
    notes: '',
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(30);

  // Quick Category Picker & Toast State
  const [quickCategoryProduct, setQuickCategoryProduct] = useState<Product | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Auto-Repair and Organize on mount if products need classification
  useEffect(() => {
    if (products.length === 0) return;
    const needsRepair = products.some(p => 
      !p.category || 
      p.category === 'عام' || 
      ((p.name || '').toLowerCase().includes('bimo') && (p.name || '').toLowerCase().includes('casse') && p.piecesPerMajorUnit <= 1)
    );
    if (needsRepair) {
      const repairedList = products.map(repairAndClassifyProduct);
      const reallyChanged = repairedList.some((rp, i) => 
        rp.category !== products[i]?.category || 
        rp.piecesPerMajorUnit !== products[i]?.piecesPerMajorUnit
      );
      if (reallyChanged) {
        onBulkImport(repairedList, 'update');
      }
    }
  }, [products.length]);

  // Extract unique categories (Memoized)
  const categories = useMemo(() => ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))], [products]);

  // Auto Organize All Products into their correct departments
  const handleAutoOrganizeCategories = () => {
    let changedCount = 0;
    const updatedList = products.map(prod => {
      const repaired = repairAndClassifyProduct(prod);
      if (repaired.category !== prod.category || repaired.piecesPerMajorUnit !== prod.piecesPerMajorUnit) {
        changedCount++;
        return repaired;
      }
      return prod;
    });

    if (changedCount > 0) {
      onBulkImport(updatedList, 'update');
      soundEffects.success();
      setSuccessToast(`تم فحص وتنظيم الأصناف ووضع ${changedCount} صنف في أقسامها الصحيحة بنجاح!`);
      setTimeout(() => setSuccessToast(null), 4000);
    } else {
      soundEffects.beep();
      setSuccessToast(`جميع الأصناف موضوعة في أقسامها المناسبة ومنظمة بدقة.`);
      setTimeout(() => setSuccessToast(null), 3000);
    }
  };

  // Quick Update Category for a single product
  const handleQuickUpdateCategory = (product: Product, newCategory: string) => {
    const updated = { ...product, category: newCategory };
    onSaveProduct(updated);
    setQuickCategoryProduct(null);
    soundEffects.success();
    setSuccessToast(`تم نقل "${product.name}" إلى قسم "${newCategory}" بنجاح.`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Search tokens for visual chips
  const searchTokens = useMemo(() => extractSearchTokens(searchQuery), [searchQuery]);

  // Filtered Products (Memoized with tokenized multi-keyword search e.g. "MAX LE")
  const filteredProducts = useMemo(() => {
    // 1. Search and relevance rank
    let list = filterAndRankProducts(products, searchQuery);

    // 2. Filter by selected category
    if (selectedCategory !== 'all') {
      list = list.filter(p => p.category === selectedCategory);
    }

    // 3. Filter by low stock
    if (filterLowStockOnly) {
      list = list.filter(p => p.stockPieces <= p.minStockAlert);
    }

    return list;
  }, [products, searchQuery, selectedCategory, filterLowStockOnly]);

  // Total pages
  const totalPages = useMemo(() => {
    if (pageSize === -1) return 1;
    return Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  }, [filteredProducts.length, pageSize]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, filterLowStockOnly, pageSize]);

  // Paginated Products Slice
  const paginatedProducts = useMemo(() => {
    if (pageSize === -1) return filteredProducts;
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const openAddModal = () => {
    const randomBarcode = '628' + Math.floor(100000000 + Math.random() * 900000000);
    setEditingProduct(null);
    setIsDualUnitMode(false);
    setFormData({
      name: '',
      barcode: randomBarcode,
      category: 'مواد غذائية',
      majorUnit: 'كرتونة',
      minorUnit: 'كرتونة',
      piecesPerMajorUnit: 1,
      purchasePriceMinor: 100,
      purchasePriceMajor: 100,
      salePriceMinor: 120,
      salePriceMajor: 120,
      stockPieces: 10,
      minStockAlert: 2,
      defaultSupplierId: suppliers[0]?.id || '',
      defaultSupplierName: suppliers[0]?.name || '',
      notes: '',
    });
    setIsEditModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    const isDual = isDualUnitProduct(p);
    setIsDualUnitMode(isDual);
    setFormData({ ...p });
    setIsEditModalOpen(true);
  };

  const handleFormMinorPurchaseChange = (val: number) => {
    const pieces = Number(formData.piecesPerMajorUnit) || 1;
    setFormData(prev => ({
      ...prev,
      purchasePriceMinor: val,
      purchasePriceMajor: +(val * pieces).toFixed(2),
    }));
  };

  const handleFormMajorPurchaseChange = (val: number) => {
    const pieces = Number(formData.piecesPerMajorUnit) || 1;
    setFormData(prev => ({
      ...prev,
      purchasePriceMajor: val,
      purchasePriceMinor: +(val / pieces).toFixed(2),
    }));
  };

  const handleFormMinorSaleChange = (val: number) => {
    const pieces = Number(formData.piecesPerMajorUnit) || 1;
    setFormData(prev => ({
      ...prev,
      salePriceMinor: val,
      salePriceMajor: +(val * pieces).toFixed(2),
    }));
  };

  const handleFormMajorSaleChange = (val: number) => {
    const pieces = Number(formData.piecesPerMajorUnit) || 1;
    setFormData(prev => ({
      ...prev,
      salePriceMajor: val,
      salePriceMinor: +(val / pieces).toFixed(2),
    }));
  };

  const handlePiecesPerMajorChange = (val: number) => {
    const pMinor = Number(formData.purchasePriceMinor) || 0;
    const sMinor = Number(formData.salePriceMinor) || 0;
    setFormData(prev => ({
      ...prev,
      piecesPerMajorUnit: val,
      purchasePriceMajor: +(pMinor * val).toFixed(2),
      salePriceMajor: +(sMinor * val).toFixed(2),
    }));
  };

  const handleSaveProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    const supplierObj = suppliers.find(s => s.id === formData.defaultSupplierId);
    const unitName = (formData.majorUnit?.trim() || formData.minorUnit?.trim() || 'وحدة');

    const majorUnit = isDualUnitMode ? (formData.majorUnit?.trim() || 'كرتونة') : unitName;
    const minorUnit = isDualUnitMode ? (formData.minorUnit?.trim() || 'قطعة') : unitName;
    const piecesPerMajorUnit = isDualUnitMode ? Math.max(1, Number(formData.piecesPerMajorUnit) || 1) : 1;

    const pMajor = Math.max(0, Number(formData.purchasePriceMajor) || Number(formData.purchasePriceMinor) || 0);
    const pMinor = isDualUnitMode ? Math.max(0, Number(formData.purchasePriceMinor) || 0) : pMajor;
    
    const sMajor = Math.max(0, Number(formData.salePriceMajor) || Number(formData.salePriceMinor) || 0);
    const sMinor = isDualUnitMode ? Math.max(0, Number(formData.salePriceMinor) || 0) : sMajor;

    const rawProduct: Product = {
      id: editingProduct ? editingProduct.id : `prod_${Date.now()}`,
      name: formData.name.trim(),
      barcode: formData.barcode || '0000',
      category: formData.category || 'عام',
      majorUnit,
      minorUnit,
      piecesPerMajorUnit,
      purchasePriceMinor: pMinor,
      purchasePriceMajor: pMajor,
      salePriceMinor: sMinor,
      salePriceMajor: sMajor,
      stockPieces: Number(formData.stockPieces) || 0,
      minStockAlert: Math.max(0, Number(formData.minStockAlert) || 0),
      defaultSupplierId: formData.defaultSupplierId,
      defaultSupplierName: supplierObj ? supplierObj.name : '',
      notes: formData.notes || '',
      createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newProduct = normalizeProductUnits(rawProduct);
    onSaveProduct(newProduct);
    setIsEditModalOpen(false);
  };

  const openAdjustModal = (product: Product) => {
    setAdjustTargetProduct(product);
    setAdjustQuantity(1);
    const isDual = isDualUnitProduct(product);
    setAdjustUnitType(isDual ? 'minor' : 'major');
    setAdjustType('add');
    setAdjustNotes('');
    setIsAdjustModalOpen(true);
  };

  const handleConfirmAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTargetProduct) return;

    const isDual = isDualUnitProduct(adjustTargetProduct);
    const multiplier = (isDual && adjustUnitType === 'major') ? adjustTargetProduct.piecesPerMajorUnit : 1;
    const piecesDelta = (adjustQuantity * multiplier) * (adjustType === 'add' ? 1 : -1);

    onAdjustStock(
      adjustTargetProduct.id, 
      piecesDelta, 
      adjustNotes || (adjustType === 'add' ? 'تسوية إضافة جردية' : 'تسوية سحب وتالف جردي')
    );
    setIsAdjustModalOpen(false);
  };

  const openHistoryModal = (p: Product) => {
    setHistoryTargetProduct(p);
    setIsHistoryModalOpen(true);
  };

  const productMovements = historyTargetProduct 
    ? stockMovements.filter(m => m.productId === historyTargetProduct.id)
    : [];

  return (
    <div className="space-y-4 pb-20 pt-2 px-3 sm:px-4">
      {/* Top Header with Search, Import Sheet, and New Product Buttons */}
      <div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              placeholder="بحث بأي جزء من الكلمة (مثال: ندوي أو MAX LE) أو السعر أو الباركود أو التصنيف..."
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

          <div className="flex items-center gap-1.5 shrink-0">
          {products.length > 0 && onDeleteAllProducts && (
            <button
              id="delete-all-products-btn"
              onClick={() => {
                setClearMovementsWithAll(false);
                setIsDeleteAllModalOpen(true);
              }}
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30 hover:border-rose-500 font-bold text-xs sm:text-sm px-2.5 sm:px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              title="حذف جميع الأصناف بضغطة واحدة"
            >
              <Trash2 className="w-4 h-4 text-rose-500 dark:text-rose-400" />
              <span className="hidden sm:inline font-bold">حذف الكل</span>
            </button>
          )}

          <button
            id="import-products-sheet-btn"
            onClick={() => setIsImportModalOpen(true)}
            className="bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-emerald-500/40 hover:border-emerald-400 font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            title="استيراد أصناف جماعية من ملف Excel أو Google Sheets"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>استيراد من الشيت</span>
          </button>

          <button
            id="add-new-product-btn"
            onClick={openAddModal}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>صنف جديد</span>
          </button>
        </div>
      </div>

        {/* Multi-Token Search Indicator Chips */}
        {searchTokens.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2 px-1 animate-in fade-in duration-150">
            <span className="text-xs font-bold text-amber-400">بحث بالمقاطع المفصولة:</span>
            {searchTokens.map((tok, i) => (
              <span key={i} className="inline-flex items-center bg-amber-400/20 text-amber-300 border border-amber-500/40 font-mono font-bold px-2 py-0.5 rounded-lg text-xs shadow-2xs">
                {tok}
              </span>
            ))}
            <span className="text-[11px] text-slate-400">
              (مطابقة المقاطع في الاسم والباركود والسعر)
            </span>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {successToast && (
        <div className="bg-emerald-600/90 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold border border-emerald-400 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Filter Chips & Low Stock Toggle */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 border transition-all ${
              filterLowStockOnly
                ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>نقص المخزون فقط</span>
          </button>

          {products.length > 0 && (
            <button
              onClick={handleAutoOrganizeCategories}
              className="px-3 py-1.5 rounded-xl font-bold border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 flex items-center gap-1.5 transition-all whitespace-nowrap shadow-sm active:scale-95"
              title="فحص كافة الأصناف وتصنيفها ووضع كل صنف في قسمه الصحيح تلقائياً"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>ترتيب وتصنيف الأقسام تلقائياً</span>
            </button>
          )}

          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl font-semibold border transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat === 'all' ? 'جميع الأصناف' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Counter & Pagination Bar Top */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 px-3 py-2 bg-slate-850 border border-slate-800 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-200">
            عرض {paginatedProducts.length} من أصل <strong className="text-emerald-400 font-black">{filteredProducts.length}</strong> صنف
            {products.length !== filteredProducts.length && (
              <span className="text-slate-400 text-[11px] mr-1">(إجمالي المخزن: {products.length})</span>
            )}
          </span>
          {products.length > 0 && onDeleteAllProducts && (
            <button
              onClick={() => {
                setClearMovementsWithAll(false);
                setIsDeleteAllModalOpen(true);
              }}
              className="text-[11px] text-rose-400 hover:text-rose-300 font-bold underline flex items-center gap-1 transition-colors mr-2"
            >
              <Trash2 className="w-3 h-3" />
              <span>تفريغ كافة الأصناف</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Page size selector */}
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <span>عرض:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value={15}>15 صنف</option>
              <option value={30}>30 صنف</option>
              <option value={60}>60 صنف</option>
              <option value={120}>120 صنف</option>
              <option value={-1}>الكل ({filteredProducts.length})</option>
            </select>
          </div>

          {/* Quick Page Nav if multi-page */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="الصفحة الأولى"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="السابق"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              
              <span className="text-[11px] font-bold text-emerald-400 px-2 min-w-[55px] text-center font-mono">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="التالي"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="الصفحة الأخيرة"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Products List Cards */}
      {filteredProducts.length === 0 ? (
        <div className="bg-slate-850 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 space-y-3">
          <Package className="w-12 h-12 mx-auto text-slate-600" />
          <p className="font-bold text-slate-300">لا توجد أصناف مطابقة للبحث</p>
          <p className="text-xs text-slate-500">جرب تغيير كلمات البحث أو إضافة صنف جديد للمخزن</p>
          <button
            onClick={openAddModal}
            className="mt-2 inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة صنف الآن</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedProducts.map((product) => {
            const isLowStock = product.stockPieces <= product.minStockAlert;
            const stockUnits = formatStockUnits(
              product.stockPieces,
              product.piecesPerMajorUnit,
              product.majorUnit,
              product.minorUnit
            );
            const isDual = isDualUnitProduct(product);
            const primaryUnit = getPrimaryUnit(product);
            const primaryCost = product.purchasePriceMajor > 0 ? product.purchasePriceMajor : product.purchasePriceMinor;
            const primarySale = product.salePriceMajor > 0 ? product.salePriceMajor : product.salePriceMinor;
            const profitPerUnit = isDual ? (product.salePriceMinor - product.purchasePriceMinor) : (primarySale - primaryCost);
            const baseForMargin = isDual ? product.salePriceMinor : primarySale;
            const profitMargin = baseForMargin > 0 ? ((profitPerUnit / baseForMargin) * 100).toFixed(1) : '0';

            return (
              <div
                key={product.id}
                className={`bg-slate-850 border rounded-2xl p-3.5 transition-all shadow-md ${
                  isLowStock
                    ? 'border-red-500/50 bg-gradient-to-br from-slate-850 via-slate-850 to-red-950/25 dark:from-black dark:via-zinc-950 dark:to-red-950/30'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header Row: Name, Category, Badges */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm sm:text-base text-white">
                        <HighlightedProductName name={product.name} query={searchQuery} />
                      </h3>
                      {isLowStock && (
                        <span className="bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/40 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                          <AlertTriangle className="w-3 h-3 text-red-500 animate-pulse" />
                          <span>منخفض ({product.stockPieces} {isDual ? product.minorUnit : primaryUnit})</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
                      <span className="bg-slate-800 px-2 py-0.5 rounded-md font-mono text-[11px]">
                        {product.barcode}
                      </span>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setQuickCategoryProduct(product)}
                        className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold text-[11px] flex items-center gap-1 transition-all active:scale-95"
                        title="نقر لتغيير القسم فوراً"
                      >
                        <Layers className="w-3 h-3 text-emerald-400" />
                        <span>{product.category || 'عام'}</span>
                      </button>
                      {product.notes && (
                        <span className="text-[11px] text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded font-medium max-w-[200px] truncate" title={product.notes}>
                          {product.notes}
                        </span>
                      )}
                      {product.defaultSupplierName && (
                        <>
                          <span>•</span>
                          <span className="text-slate-300">المورد: {product.defaultSupplierName}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions: Edit, History, Adjust, Delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openHistoryModal(product)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                      title="سجل حركات المخزون"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openAdjustModal(product)}
                      className="p-1.5 rounded-lg bg-slate-800 text-blue-400 hover:text-blue-300 border border-slate-700"
                      title="تسوية وتعديل المخزون"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openEditModal(product)}
                      className="p-1.5 rounded-lg bg-slate-800 text-amber-400 hover:text-amber-300 border border-slate-700"
                      title="تعديل بيانات الصنف والأسعار"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`delete-product-btn-${product.id}`}
                      onClick={() => setProductToDelete(product)}
                      className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:text-white hover:bg-rose-600 border border-rose-500/30 hover:border-rose-600 transition-all cursor-pointer"
                      title="حذف الصنف نهائياً"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Stock Display Section */}
                <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 mb-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-xs font-bold text-slate-300 dark:text-slate-300 block mb-1">الرصيد المتوفر بالمخزن:</span>
                    <div className="font-black text-base text-emerald-400">
                      {stockUnits.shortText}
                    </div>
                    {isDual && (
                      <span className="text-xs font-medium text-slate-400 dark:text-slate-400 block mt-0.5">
                        (إجمالي: <strong className="text-slate-200 dark:text-slate-200">{product.stockPieces}</strong> {product.minorUnit})
                      </span>
                    )}
                  </div>

                  <div className="border-r border-slate-800 pr-3">
                    {product.middleUnit && product.piecesPerMiddleUnit ? (
                      <>
                        <span className="text-xs font-bold text-cyan-300 block mb-1">نظام 3 وحدات:</span>
                        <div className="font-bold text-slate-100 dark:text-slate-100 text-xs">
                          {product.minorUnit} • {product.middleUnit} ({product.piecesPerMiddleUnit}) • {product.majorUnit} ({product.piecesPerMajorUnit})
                        </div>
                        <span className="text-xs font-medium text-slate-400 dark:text-slate-400 block mt-0.5">
                          حد التنبيه: <strong className={isLowStock ? "text-red-500 dark:text-red-400 font-black" : "text-slate-300 dark:text-slate-300 font-bold"}>{product.minStockAlert}</strong> {product.minorUnit}
                        </span>
                      </>
                    ) : isDual ? (
                      <>
                        <span className="text-xs font-bold text-slate-300 dark:text-slate-300 block mb-1">معادلة الوحدات:</span>
                        <div className="font-bold text-slate-100 dark:text-slate-100 text-xs">
                          1 {product.majorUnit} = <span className="text-emerald-400 font-extrabold">{product.piecesPerMajorUnit}</span> {product.minorUnit}
                        </div>
                        <span className="text-xs font-medium text-slate-400 dark:text-slate-400 block mt-0.5">
                          حد التنبيه: <strong className={isLowStock ? "text-red-500 dark:text-red-400 font-black" : "text-slate-300 dark:text-slate-300 font-bold"}>{product.minStockAlert}</strong> {product.minorUnit}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs font-bold text-slate-300 dark:text-slate-300 block mb-1">وحدة الصنف:</span>
                        <div className="font-bold text-slate-100 dark:text-slate-100 text-xs flex items-center gap-1.5">
                          <span>{primaryUnit}</span>
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold">
                            وحدة مفردة
                          </span>
                        </div>
                        <span className="text-xs font-medium text-slate-400 dark:text-slate-400 block mt-0.5">
                          حد التنبيه: <strong className={isLowStock ? "text-red-500 dark:text-red-400 font-black" : "text-slate-300 dark:text-slate-300 font-bold"}>{product.minStockAlert}</strong> {primaryUnit}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Price Details Grid */}
                {isDual ? (
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-800/60 p-2.5 rounded-xl border border-slate-800/80">
                    {/* Purchase Prices */}
                    <div className="space-y-1">
                      <div className="text-slate-300 dark:text-slate-300 text-xs font-bold mb-1">سعر الشراء (التكلفة):</div>
                      <div className="text-slate-200 dark:text-slate-200 font-medium">
                        بالـ{product.minorUnit}: <span className="font-black text-amber-400 text-xs">{formatCurrency(product.purchasePriceMinor, currency)}</span>
                      </div>
                      <div className="text-slate-300 dark:text-slate-300 font-medium text-xs">
                        بالـ{product.majorUnit}: <span className="font-bold text-slate-100 dark:text-slate-100">{formatCurrency(product.purchasePriceMajor, currency)}</span>
                      </div>
                    </div>

                    {/* Sale Prices */}
                    <div className="space-y-1 border-r border-slate-800 pr-3">
                      <div className="text-slate-300 dark:text-slate-300 text-xs font-bold mb-1">سعر البيع:</div>
                      <div className="text-slate-200 dark:text-slate-200 font-medium">
                        بالـ{product.minorUnit}: <span className="font-black text-emerald-400 text-xs">{formatCurrency(product.salePriceMinor, currency)}</span>
                      </div>
                      <div className="text-slate-300 dark:text-slate-300 font-medium text-xs">
                        بالـ{product.majorUnit}: <span className="font-bold text-slate-100 dark:text-slate-100">{formatCurrency(product.salePriceMajor, currency)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-800/60 p-2.5 rounded-xl border border-slate-800/80">
                    <div>
                      <div className="text-slate-300 dark:text-slate-300 text-xs font-bold mb-1">سعر الشراء:</div>
                      <div className="font-black text-amber-400 text-sm">
                        {formatCurrency(primaryCost, currency)}
                        <span className="text-[10px] text-slate-400 font-normal mr-1">/ {primaryUnit}</span>
                      </div>
                    </div>
                    <div className="border-r border-slate-800 pr-3">
                      <div className="text-slate-300 dark:text-slate-300 text-xs font-bold mb-1">سعر البيع:</div>
                      <div className="font-black text-emerald-400 text-sm">
                        {formatCurrency(primarySale, currency)}
                        <span className="text-[10px] text-slate-400 font-normal mr-1">/ {primaryUnit}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Profit Margin Bar */}
                <div className="mt-2.5 flex items-center justify-between text-xs text-slate-300 dark:text-slate-300 px-1">
                  <span>الربح للـ{isDual ? product.minorUnit : primaryUnit}: <strong className="text-emerald-400 font-black">{formatCurrency(profitPerUnit, currency)}</strong></span>
                  <span className="bg-emerald-500/15 text-emerald-400 dark:text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-black text-xs">
                    هامش الربح {profitMargin}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Pagination Bar (if multiple pages) */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-850 border border-slate-800 rounded-2xl p-3 text-xs text-slate-400 shadow-md">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-300">
              الصفحة <strong className="text-emerald-400 font-bold">{currentPage}</strong> من <strong className="text-white font-bold">{totalPages}</strong>
            </span>
            <span className="text-slate-500 text-[11px]">
              (عرض {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredProducts.length)} من أصل {filteredProducts.length})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-650 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-700 flex items-center gap-1 font-bold text-xs transition-colors"
              title="الصفحة الأولى"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
              <span>الأولى</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-650 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-700 flex items-center gap-1 font-bold text-xs transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              <span>السابق</span>
            </button>

            {/* Smart page numbers preview */}
            <div className="flex items-center gap-1 px-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                let pNum = currentPage;
                if (currentPage <= 3) {
                  pNum = idx + 1;
                } else if (currentPage >= totalPages - 2) {
                  pNum = totalPages - 4 + idx;
                } else {
                  pNum = currentPage - 2 + idx;
                }
                if (pNum < 1 || pNum > totalPages) return null;

                const isCurrent = pNum === currentPage;
                return (
                  <button
                    key={pNum}
                    type="button"
                    onClick={() => setCurrentPage(pNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-black transition-all ${
                      isCurrent
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-105'
                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {pNum}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-650 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-700 flex items-center gap-1 font-bold text-xs transition-colors"
            >
              <span>التالي</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-650 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-700 flex items-center gap-1 font-bold text-xs transition-colors"
              title="الصفحة الأخيرة"
            >
              <span>الأخيرة</span>
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isEditModalOpen && (
        <div 
          onClick={() => setIsEditModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-5 shadow-2xl text-slate-100 my-auto max-h-[92vh] overflow-y-auto animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-base">
                  {editingProduct ? 'تعديل بيانات الصنف' : 'إضافة صنف جديد'}
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProductSubmit} className="space-y-3.5 text-xs">
              {/* Product Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">اسم الصنف *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثلاً: بسكويت أوريو، شوكولاتة ماكس، زيت..."
                    value={formData.name || ''}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        name: newName,
                        category: (!editingProduct && (!prev.category || prev.category === 'عام' || prev.category === 'مواد غذائية'))
                          ? (classifyProductCategory(newName) || prev.category)
                          : prev.category,
                      }));
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">القسم / التصنيف</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      list="category-suggestions"
                      placeholder="اختر أو اكتب القسم..."
                      value={formData.category || ''}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (formData.name) {
                          const autoCat = classifyProductCategory(formData.name);
                          setFormData(prev => ({ ...prev, category: autoCat }));
                        }
                      }}
                      className="px-2.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40 text-[11px] whitespace-nowrap font-bold flex items-center gap-1"
                      title="اقتراح القسم المناسب ذكياً بناءً على اسم الصنف"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>تلقائي</span>
                    </button>
                  </div>
                  <datalist id="category-suggestions">
                    {STORE_CATEGORY_NAMES.map(c => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Barcode & Supplier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">رقم الباركود</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="628100..."
                      value={formData.barcode || ''}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-3 pl-8 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, barcode: '628' + Math.floor(100000000 + Math.random() * 900000000) })}
                      className="absolute left-2 top-2 text-slate-400 hover:text-emerald-400"
                      title="توليد باركود تلقائي"
                    >
                      <Barcode className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">المورد الافتراضي</label>
                  <select
                    value={formData.defaultSupplierId || ''}
                    onChange={(e) => setFormData({ ...formData, defaultSupplierId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- اختر مورد (اختياري) --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Units Configuration (Major & Minor) */}
              <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <Package className="w-4 h-4" />
                    <span>نظام الوحدات والتعبئة</span>
                  </div>

                  {/* Mode Toggle: Single Unit vs Dual Units */}
                  <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-700 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDualUnitMode(false);
                        const u = formData.majorUnit || formData.minorUnit || 'كرتونة';
                        const price = formData.salePriceMajor || formData.salePriceMinor || 0;
                        const cost = formData.purchasePriceMajor || formData.purchasePriceMinor || 0;
                        setFormData(prev => ({
                          ...prev,
                          majorUnit: u,
                          minorUnit: u,
                          piecesPerMajorUnit: 1,
                          salePriceMajor: price,
                          salePriceMinor: price,
                          purchasePriceMajor: cost,
                          purchasePriceMinor: cost,
                        }));
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        !isDualUnitMode
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      وحدة كبرى فقط (بداخلها القطع)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDualUnitMode(true);
                        setFormData(prev => ({
                          ...prev,
                          majorUnit: prev.majorUnit || 'كرتونة',
                          minorUnit: (prev.minorUnit && prev.minorUnit !== prev.majorUnit) ? prev.minorUnit : 'قطعة',
                          piecesPerMajorUnit: (prev.piecesPerMajorUnit && prev.piecesPerMajorUnit > 1) ? prev.piecesPerMajorUnit : 12,
                        }));
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        isDualUnitMode
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      وحدتان (كرتونة وتجزئة)
                    </button>
                  </div>
                </div>

                {!isDualUnitMode ? (
                  /* Single packaging unit: only the major unit exists, minor unit is hidden */
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      اسم الوحدة الكبرى (مثل: كرتونة 6Bouat / شوال / باكتة / علبة)
                    </label>
                    <input
                      type="text"
                      placeholder="مثلاً: كرتونة 6Bouat"
                      value={formData.majorUnit || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ 
                          ...formData, 
                          majorUnit: val, 
                          minorUnit: val, 
                          piecesPerMajorUnit: 1 
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold"
                    />
                    <p className="text-[11px] text-emerald-400/90 mt-1.5 flex items-center gap-1">
                      <span>✓</span>
                      <span>الصنف يُباع ويُحسب بالوحدة الكبرى فقط دون تكرار للوحدة الصغرى.</span>
                    </p>
                  </div>
                ) : (
                  /* Dual unit setup */
                  <div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">الوحدة الكبرى</label>
                        <input
                          type="text"
                          placeholder="كرتونة / شوال / باكتة"
                          value={formData.majorUnit || ''}
                          onChange={(e) => setFormData({ ...formData, majorUnit: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500 text-center font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">الوحدة الصغرى</label>
                        <input
                          type="text"
                          placeholder="حبة / قطعة / كيس"
                          value={formData.minorUnit || ''}
                          onChange={(e) => setFormData({ ...formData, minorUnit: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500 text-center font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">عدد القطع بالكبرى</label>
                        <input
                          type="number"
                          min="2"
                          value={formData.piecesPerMajorUnit || 12}
                          onChange={(e) => handlePiecesPerMajorChange(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500 text-center font-bold"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 text-center mt-1.5">
                      معادلة الصنف: كل 1 {formData.majorUnit || 'كرتونة'} = {formData.piecesPerMajorUnit || 12} {formData.minorUnit || 'قطعة'}
                    </p>
                  </div>
                )}
              </div>

              {/* Purchase Prices */}
              <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700 space-y-2">
                <span className="text-amber-400 font-bold block">سعر الشراء (التكلفة)</span>
                {isDualUnitMode ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        سعر شراء الـ{formData.minorUnit || 'قطعة'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.purchasePriceMinor ?? ''}
                        onChange={(e) => handleFormMinorPurchaseChange(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        سعر شراء الـ{formData.majorUnit || 'كرتونة'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.purchasePriceMajor ?? ''}
                        onChange={(e) => handleFormMajorPurchaseChange(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      سعر شراء الـ{formData.majorUnit || 'وحدة'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.purchasePriceMajor ?? formData.purchasePriceMinor ?? ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setFormData(prev => ({
                          ...prev,
                          purchasePriceMajor: val,
                          purchasePriceMinor: val,
                        }));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}
              </div>

              {/* Sale Prices */}
              <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700 space-y-2">
                <span className="text-emerald-400 font-bold block">سعر البيع المقترح</span>
                {isDualUnitMode ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        سعر بيع الـ{formData.minorUnit || 'قطعة'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.salePriceMinor ?? ''}
                        onChange={(e) => handleFormMinorSaleChange(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        سعر بيع الـ{formData.majorUnit || 'كرتونة'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.salePriceMajor ?? ''}
                        onChange={(e) => handleFormMajorSaleChange(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      سعر بيع الـ{formData.majorUnit || 'وحدة'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.salePriceMajor ?? formData.salePriceMinor ?? ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setFormData(prev => ({
                          ...prev,
                          salePriceMajor: val,
                          salePriceMinor: val,
                        }));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* Stock and Low Stock Alert Settings */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    الرصيد الحالي (بالـ{isDualUnitMode ? (formData.minorUnit || 'قطعة') : (formData.majorUnit || 'وحدة')})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stockPieces ?? 0}
                    onChange={(e) => setFormData({ ...formData, stockPieces: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-amber-300 font-bold mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>حد التنبيه (بالـ{isDualUnitMode ? (formData.minorUnit || 'قطعة') : (formData.majorUnit || 'وحدة')})</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStockAlert ?? 10}
                    onChange={(e) => setFormData({ ...formData, minStockAlert: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-800 border border-amber-500/50 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>حفظ الصنف</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {isAdjustModalOpen && adjustTargetProduct && (
        <div 
          onClick={() => setIsAdjustModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm p-5 shadow-2xl text-slate-100 my-auto animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">تسوية وجرد المخزون</h3>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 font-semibold mb-3">
              الصنف: <span className="text-emerald-400 font-bold">{adjustTargetProduct.name}</span>
            </p>

            <form onSubmit={handleConfirmAdjust} className="space-y-3 text-xs">
              {/* Type: Add or Subtract */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playIncrease();
                    setAdjustType('add');
                  }}
                  className={`py-2 rounded-xl font-bold border transition-all active:scale-95 ${
                    adjustType === 'add'
                      ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  + إضافة رصيد
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playDecrease();
                    setAdjustType('sub');
                  }}
                  className={`py-2 rounded-xl font-bold border transition-all active:scale-95 ${
                    adjustType === 'sub'
                      ? 'bg-rose-600/30 border-rose-500 text-rose-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  - خصم / تالف
                </button>
              </div>

              {/* Quantity and Unit Choice */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">الكمية</label>
                  <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl overflow-hidden focus-within:border-emerald-500 transition-all">
                    <button
                      type="button"
                      onClick={() => {
                        if (adjustQuantity <= 1) {
                          soundEffects.playLimit();
                        } else {
                          soundEffects.playDecrease();
                          setAdjustQuantity(prev => Math.max(1, prev - 1));
                        }
                      }}
                      disabled={adjustQuantity <= 1}
                      className="w-8 h-9 bg-slate-750 hover:bg-slate-700 active:bg-slate-650 active:scale-95 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border-l border-slate-700 flex items-center justify-center shrink-0 cursor-pointer select-none"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      required
                      value={adjustQuantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        if (val > adjustQuantity) soundEffects.playIncrease();
                        else if (val < adjustQuantity) soundEffects.playDecrease();
                        setAdjustQuantity(Math.max(1, val));
                      }}
                      className="w-full bg-transparent py-1.5 px-1 text-white font-bold text-center text-sm focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playIncrease();
                        setAdjustQuantity(prev => prev + 1);
                      }}
                      className="w-8 h-9 bg-slate-750 hover:bg-emerald-600 active:bg-emerald-700 active:scale-95 text-slate-300 hover:text-white border-r border-slate-700 flex items-center justify-center shrink-0 cursor-pointer select-none"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">الوحدة</label>
                  {isDualUnitProduct(adjustTargetProduct) ? (
                    <select
                      value={adjustUnitType}
                      onChange={(e) => setAdjustUnitType(e.target.value as 'minor' | 'major')}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-bold"
                    >
                      <option value="minor">{adjustTargetProduct.minorUnit}</option>
                      <option value="major">{adjustTargetProduct.majorUnit} ({adjustTargetProduct.piecesPerMajorUnit} {adjustTargetProduct.minorUnit})</option>
                    </select>
                  ) : (
                    <div className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-bold text-center">
                      {getPrimaryUnit(adjustTargetProduct)}
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">ملاحظات وسبب التسوية</label>
                <input
                  type="text"
                  placeholder="مثال: جرد دوري، بضاعة تالفة، هدايا ترويجية..."
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md"
                >
                  تأكيد التسوية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock History Drawer Modal */}
      {isHistoryModalOpen && historyTargetProduct && (
        <div 
          onClick={() => setIsHistoryModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-4 sm:p-5 shadow-2xl text-slate-100 my-auto max-h-[85vh] flex flex-col animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">سجل حركات المخزون</h3>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-2 text-xs border-b border-slate-800 text-slate-300 shrink-0">
              الصنف: <strong className="text-emerald-400">{historyTargetProduct.name}</strong> | الرصيد الحالي: <strong className="text-white">{historyTargetProduct.stockPieces} {historyTargetProduct.minorUnit}</strong>
            </div>

            <div className="overflow-y-auto space-y-2 py-3 flex-1">
              {productMovements.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  لا توجد حركات سابقة مسجلة لهذا الصنف بعد
                </div>
              ) : (
                productMovements.map(m => (
                  <div key={m.id} className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-750 text-xs">
                    <div className="flex items-center justify-between font-bold mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        m.type === 'sale'
                          ? 'bg-blue-500/20 text-blue-400'
                          : m.type === 'purchase'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {m.type === 'sale' ? 'فاتورة بيع' : m.type === 'purchase' ? 'فاتورة شراء' : 'تسوية يدوية'}
                      </span>
                      <span className="text-slate-400 text-[10.5px]">{formatArabicDateTime(m.date)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-200">
                      <span>الكمية: <strong>{m.quantityPieces} {historyTargetProduct.minorUnit}</strong></span>
                      <span className="text-slate-400 text-[11px]">
                        الرصيد: {m.previousStock} ➔ <strong className="text-white">{m.newStock}</strong>
                      </span>
                    </div>
                    {m.partyName && (
                      <div className="text-slate-400 text-[10.5px] mt-1">الطرف: {m.partyName} ({m.referenceInvoice})</div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 shrink-0">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      {productToDelete && (
        <div 
          onClick={() => setProductToDelete(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-5 shadow-2xl text-slate-100 my-auto animate-in zoom-in-95"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-base text-white">تأكيد حذف الصنف</h3>
                <p className="text-xs text-slate-400">سيتم إزالة الصنف وسجلاته نهائياً من القائمة</p>
              </div>
            </div>

            {/* Product Summary Card */}
            <div className="bg-slate-850 border border-slate-800 rounded-2xl p-3.5 space-y-2.5 mb-4 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">اسم الصنف:</span>
                <span className="font-black text-sm text-white">{productToDelete.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">الباركود:</span>
                <span className="font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  {productToDelete.barcode || 'بدون باركود'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">الرصيد المتبقي:</span>
                <span className="font-bold text-amber-400">
                  {productToDelete.stockPieces} {productToDelete.minorUnit}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">التصنيف:</span>
                <span className="text-slate-300">{productToDelete.category}</span>
              </div>
            </div>

            <p className="text-xs text-rose-300/90 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5 mb-5 font-semibold text-center">
              ⚠️ تحذير: هذه العملية لا يمكن التراجع عنها بعد الحذف.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-colors"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                id="confirm-delete-product-btn"
                onClick={() => {
                  onDeleteProduct(productToDelete.id);
                  setProductToDelete(null);
                }}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-950/50 flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>نعم، تأكيد الحذف</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import from Sheet Modal */}
      <ImportProductsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingProducts={products}
        suppliers={suppliers}
        currency={currency}
        onBulkImport={onBulkImport}
      />

      {/* Delete All Products Modal */}
      {isDeleteAllModalOpen && (
        <div 
          onClick={() => setIsDeleteAllModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-rose-500/40 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl text-slate-100 my-auto animate-in zoom-in-95"
          >
            {/* Modal Header */}
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/30">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-black text-base sm:text-lg text-white">حذف كافة الأصناف (تفريغ المخزن)</h3>
                <p className="text-xs text-slate-400">إجراء جماعي لإزالة جميع منتجات وقائمة المخزن</p>
              </div>
            </div>

            {/* Warning Alert Banner */}
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3.5 mb-4 text-xs space-y-1">
              <p className="font-extrabold text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>تنبيه هام جداً:</span>
              </p>
              <p className="text-rose-200/90 leading-relaxed pr-5 font-medium">
                سيتم حذف جميع الأصناف المسجلة حالياً بضغطة واحدة، ولن تتمكن من التراجع عن هذه الخطوة إلا باستيراد شيت جديد أو إضافة أصناف يدوياً.
              </p>
            </div>

            {/* Summary of Data to be deleted */}
            <div className="bg-slate-850 border border-slate-800 rounded-2xl p-4 space-y-3 mb-4 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">إجمالي عدد الأصناف:</span>
                <span className="font-black text-sm text-rose-400">{products.length} صنف</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">إجمالي قطع المخزون:</span>
                <span className="font-black text-slate-200">
                  {products.reduce((acc, p) => acc + (p.stockPieces || 0), 0).toLocaleString()} قطعة
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">إجمالي القيمة المخزنية (التكلفة):</span>
                <span className="font-black text-amber-400">
                  {formatCurrency(products.reduce((acc, p) => acc + ((p.stockPieces || 0) * (p.purchasePriceMinor || 0)), 0), currency)}
                </span>
              </div>
            </div>

            {/* Clear Movements Option */}
            <label className="flex items-center gap-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 rounded-xl p-3 mb-5 cursor-pointer select-none transition-colors">
              <input
                type="checkbox"
                checked={clearMovementsWithAll}
                onChange={(e) => setClearMovementsWithAll(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 bg-slate-900 border-slate-600"
              />
              <span className="text-xs font-bold text-slate-300">
                تصفير سجل حركات التوريد والجرد (Stock Movements) أيضاً
              </span>
            </label>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeleteAllModalOpen(false)}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs border border-slate-700 transition-colors"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                id="confirm-delete-all-btn"
                onClick={() => {
                  if (onDeleteAllProducts) {
                    onDeleteAllProducts(clearMovementsWithAll);
                  }
                  setIsDeleteAllModalOpen(false);
                  setToastMessage(`تم حذف جميع الأصناف (${products.length} صنف) بنجاح`);
                  setTimeout(() => setToastMessage(null), 3500);
                }}
                className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-xl shadow-rose-950/60 flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>نعم، حذف الكل الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Category Selector Modal */}
      {quickCategoryProduct && (
        <div 
          onClick={() => setQuickCategoryProduct(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-emerald-500/40 rounded-3xl w-full max-w-md p-5 shadow-2xl text-slate-100 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">تحديد قسم الصنف</h4>
                  <p className="text-[11px] text-slate-400 truncate max-w-[260px]">{quickCategoryProduct.name}</p>
                </div>
              </div>
              <button
                onClick={() => setQuickCategoryProduct(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Smart Recommendation Chip */}
            {(() => {
              const suggested = classifyProductCategory(quickCategoryProduct.name);
              return (
                <div className="mb-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-[11px] text-slate-300">القسم المقترح ذكياً:</div>
                      <div className="text-xs font-black text-emerald-300">{suggested}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickUpdateCategory(quickCategoryProduct, suggested)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-md transition-all shrink-0 active:scale-95"
                  >
                    اعتماد الاقتراح
                  </button>
                </div>
              );
            })()}

            <p className="text-xs font-semibold text-slate-400 mb-2">أو اختر القسم من الأقسام التالية:</p>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {STORE_CATEGORY_NAMES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleQuickUpdateCategory(quickCategoryProduct, cat)}
                  className={`p-2.5 rounded-xl text-right text-xs font-bold border transition-all flex items-center justify-between active:scale-95 ${
                    quickCategoryProduct.category === cat
                      ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 shadow'
                      : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white'
                  }`}
                >
                  <span className="truncate">{cat}</span>
                  {quickCategoryProduct.category === cat && (
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-2 border border-emerald-400/40 animate-in fade-in slide-in-from-bottom-3">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
