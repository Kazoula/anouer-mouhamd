import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check, CheckCircle2, Package, AlertTriangle, ArrowUpDown, Tag, Keyboard, ChevronDown, Plus, ShoppingCart, ArrowRight, ArrowLeft, Maximize2, Clock, Timer, RotateCcw } from 'lucide-react';
import { Product } from '../types';
import { formatCurrency } from '../utils/calculations';
import { isDualUnitProduct, getPrimaryUnit, hasThreeUnits, getProductUnitsList } from '../utils/unitHelpers';
import { saveAppPreferencesToFirestore } from '../services/firestoreService';
import { filterAndRankProducts, extractSearchTokens, buildHighlightRegex } from '../utils/searchHelpers';

export interface CartItemSummary {
  productId: string;
  productName: string;
  quantity: number;
  unitName?: string;
  unitType?: string;
}

/**
 * Visual highlight for matched tokens in product name.
 * Highlighting tokens like MAX, LE, etc.
 */
export const HighlightedProductName: React.FC<{ name: string; query: string; className?: string }> = ({
  name,
  query,
  className = '',
}) => {
  const trimmed = query.trim();
  if (!trimmed) {
    return (
      <bdi dir="auto" className={`text-white font-black inline text-start ${className}`}>
        {name}
      </bdi>
    );
  }

  const highlightRegex = buildHighlightRegex(trimmed);
  if (!highlightRegex) {
    return (
      <bdi dir="auto" className={`text-white font-black inline text-start ${className}`}>
        {name}
      </bdi>
    );
  }

  const parts = name.split(highlightRegex);
  return (
    <bdi dir="auto" className={`text-white font-black inline text-start ${className}`}>
      {parts.map((part, idx) => {
        if (!part) return null;
        highlightRegex.lastIndex = 0;
        const isMatched = highlightRegex.test(part);
        if (isMatched) {
          return (
            <mark
              key={idx}
              className="bg-amber-400 text-slate-950 font-black rounded px-1 py-0.5 not-italic border border-amber-300 shadow-xs inline"
            >
              {part}
            </mark>
          );
        }
        return (
          <span key={idx} className="text-white font-black inline">
            {part}
          </span>
        );
      })}
    </bdi>
  );
};

interface SearchableProductSelectProps {
  products: Product[];
  selectedProductId: string;
  onSelectProduct: (productId: string) => void;
  onDirectAddProduct?: (product: Product, unitType: 'minor' | 'middle' | 'major') => void;
  currency: string;
  mode?: 'sale' | 'purchase';
  placeholder?: string;
  accentColor?: 'emerald' | 'blue';
  id?: string;
  onSearchFocus?: () => void;
  onSearchBlur?: () => void;
  onKeyboardDismiss?: () => void;
  hasCartItems?: boolean;
  cartItemsCount?: number;
  isOpenBigWindow?: boolean;
  onCloseBigWindow?: () => void;
  cartItems?: CartItemSummary[];
  onUpdateCartItemQuantity?: (productId: string, unitType: 'minor' | 'middle' | 'major', delta: number) => void;
  openAllProductsTrigger?: number;
}

// Normalize Arabic letters for fuzzy search
const normalizeArabic = (text: string): string => {
  return text
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '') // remove diacritics
    .toLowerCase()
    .trim();
};

export const SearchableProductSelect: React.FC<SearchableProductSelectProps> = ({
  products,
  selectedProductId,
  onSelectProduct,
  onDirectAddProduct,
  currency,
  mode = 'sale',
  placeholder = 'ابحث بأي جزء من الكلمة (مثال: ندوي أو MAX LE) أو السعر أو الباركود...',
  accentColor = 'emerald',
  id = 'searchable-product-select',
  onSearchFocus,
  onSearchBlur,
  onKeyboardDismiss,
  hasCartItems = false,
  cartItemsCount = 0,
  isOpenBigWindow = false,
  onCloseBigWindow,
  cartItems = [],
  onUpdateCartItemQuantity,
  openAllProductsTrigger,
}) => {
  // Keep list closed initially until the user types or explicitly opens it
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [lastSearchedQuery, setLastSearchedQuery] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('pos_last_product_search') || '';
    }
    return '';
  });
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);
  const [isFullScreenResults, setIsFullScreenResults] = useState<boolean>(false);
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock' | 'in_cart'>('all');
  const [lastAddedName, setLastAddedName] = useState<string | null>(null);

  // User configurable typing delay in seconds (default: 3.5 seconds - "بضع ثوانٍ")
  // 0 means manual (never auto-dismiss), otherwise seconds to wait after last keystroke
  const [typingDelaySec, setTypingDelaySec] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_search_typing_delay_sec');
      if (saved !== null) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && (parsed === 0 || (parsed >= 1 && parsed <= 10))) {
          return parsed;
        }
      }
    }
    return 3.5; // 3.5 seconds default for calm, uninterrupted typing
  });
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(3.5);
  const [showDelaySettings, setShowDelaySettings] = useState<boolean>(false);

  // Sync typing delay across devices and components via custom event
  useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail !== undefined && typeof e.detail === 'number') {
        setTypingDelaySec(e.detail);
      }
    };
    window.addEventListener('pos_typing_delay_changed', handler);
    return () => window.removeEventListener('pos_typing_delay_changed', handler);
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bigInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isBigWindowActive = isOpenBigWindow || isFullScreenResults;

  // Ensure keyboard is dismissed when entering full-screen mode initially
  useEffect(() => {
    if (isBigWindowActive && !isTyping) {
      inputRef.current?.blur();
      if (document.activeElement && 'blur' in document.activeElement) {
        (document.activeElement as HTMLElement).blur();
      }
    }
  }, [isBigWindowActive]);

  const dismissKeyboardAndShowFullResults = () => {
    inputRef.current?.blur();
    if (!isBigWindowActive) {
      bigInputRef.current?.blur();
    }
    if (document.activeElement && 'blur' in document.activeElement) {
      (document.activeElement as HTMLElement).blur();
    }
    setIsInputFocused(false);
    setIsFullScreenResults(true);
    setIsOpen(true);
    setIsTyping(false);
  };

  // Whenever user types a non-empty query, remember it for returning to previous items
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length > 0) {
      setLastSearchedQuery(trimmed);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pos_last_product_search', trimmed);
      }
    }
  }, [query]);

  // When explicitly triggered to search and add another item (e.g. "+ بحث وإضافة صنف آخر للفاتورة"):
  // Opens on all products with query cleared and stock filter set to all
  useEffect(() => {
    if (openAllProductsTrigger && openAllProductsTrigger > 0) {
      setQuery('');
      setStockFilter('all');
      setIsOpen(true);
      setIsFullScreenResults(true);
      setTimeout(() => {
        if (bigInputRef.current) {
          bigInputRef.current.focus();
        } else if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 80);
    }
  }, [openAllProductsTrigger]);

  // When big window opens: ensure it displays open results
  useEffect(() => {
    if (isOpenBigWindow) {
      setIsOpen(true);
      setIsFullScreenResults(true);
      setStockFilter('all');
    }
  }, [isOpenBigWindow]);

  // Give the user a few seconds (default 3.5s) to type the product comfortably.
  // Every keystroke resets the countdown timer so they can type uninterrupted.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setIsTyping(false);
      setRemainingSeconds(typingDelaySec);
      // Keep isFullScreenResults and isOpen intact so user can browse all products with empty query
      return;
    }

    // If typing delay is set to 0 (manual mode), do not auto-dismiss
    if (typingDelaySec <= 0) {
      setIsTyping(false);
      return;
    }

    // Start typing countdown
    setIsTyping(true);
    setRemainingSeconds(typingDelaySec);
    const startTime = Date.now();
    const durationMs = typingDelaySec * 1000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const left = Math.max(0, (durationMs - elapsed) / 1000);
      setRemainingSeconds(Math.round(left * 10) / 10);

      if (elapsed >= durationMs) {
        clearInterval(interval);
        setIsTyping(false);
        dismissKeyboardAndShowFullResults();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [query, isOpenBigWindow, typingDelaySec]);

  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  const prevSelectedIdRef = useRef<string>(selectedProductId);

  // When selectedProductId resets (e.g. item inserted into cart):
  // Preserve the search query (e.g. "mamia") so the user can continue selecting other varieties!
  useEffect(() => {
    if (!selectedProductId) {
      if (prevSelectedIdRef.current) {
        // Just added an item! Keep query and keep results open so varieties remain selectable
        if (query.trim().length > 0) {
          setIsOpen(true);
        }
        setTimeout(() => {
          containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 60);
      }
    } else {
      // Product selected for quantity/unit configuration
      setIsOpen(false);
    }
    prevSelectedIdRef.current = selectedProductId;
  }, [selectedProductId, query]);

  // Color classes depending on mode/accent
  const isEmerald = accentColor === 'emerald';
  const borderFocusClass = isEmerald ? 'focus:border-emerald-500 focus:ring-emerald-500/20' : 'focus:border-blue-500 focus:ring-blue-500/20';
  const activeBgClass = isEmerald ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300' : 'bg-blue-500/15 border-blue-500/50 text-blue-300';
  const priceColorClass = isEmerald ? 'text-emerald-400' : 'text-blue-400';

  // Current parsed search tokens for visual indicators and token matching
  const searchTokens = useMemo(() => extractSearchTokens(query), [query]);

  // Filter products by Name, Barcode, Category, Price using intelligent multi-token search
  // e.g. "MAX LE" matches "MAXON LE CARRE 6X24pies سندويتش"
  const filteredProducts = useMemo(() => {
    return filterAndRankProducts(products, query);
  }, [products, query]);

  // Pre-calculate stock and cart counts
  const inStockCount = useMemo(() => products.filter(p => p.stockPieces > 0).length, [products]);
  const outOfStockCount = useMemo(() => products.filter(p => p.stockPieces <= 0).length, [products]);
  const inCartProductsCount = useMemo(() => {
    if (!cartItems || cartItems.length === 0) return 0;
    return products.filter(p => cartItems.some(ci => ci.productId === p.id)).length;
  }, [products, cartItems]);

  // Helper to check how many pieces/units of a product are currently in the cart
  const getProductCartInfo = (prodId: string) => {
    if (!cartItems || cartItems.length === 0) return null;
    const itemsInCart = cartItems.filter(i => i.productId === prodId);
    if (itemsInCart.length === 0) return null;
    const totalQty = itemsInCart.reduce((sum, i) => sum + i.quantity, 0);
    return {
      count: itemsInCart.length,
      totalQty,
      items: itemsInCart,
    };
  };

  // Combined query + stock filter for display
  const displayedProducts = useMemo(() => {
    return filteredProducts.filter(p => {
      if (stockFilter === 'in_cart') {
        return cartItems?.some(item => item.productId === p.id);
      }
      if (stockFilter === 'in_stock') return p.stockPieces > 0;
      if (stockFilter === 'out_of_stock') return p.stockPieces <= 0;
      return true;
    });
  }, [filteredProducts, stockFilter, cartItems]);

  // Close dropdown on outside click ONLY if a product is already selected
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      // If NO product is selected yet, NEVER close the list! The user needs to see the products!
      if (!selectedProduct) {
        return;
      }
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [selectedProduct]);

  // Reset highlight index when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredProducts]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredProducts.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredProducts.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // On mobile/Enter, dismiss keyboard and expand to full-screen results alone!
      dismissKeyboardAndShowFullResults();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (selectedProduct) {
        setIsOpen(false);
      } else {
        setQuery('');
        setIsFullScreenResults(false);
        inputRef.current?.blur();
      }
    }
  };

  const handleSelect = (prodId: string) => {
    onSelectProduct(prodId);
    setIsOpen(false);
    setIsFullScreenResults(false);
    // Keep query so user can return to their search
    onCloseBigWindow?.();
  };

  const handleItemDirectAdd = (prod: Product, unitType: 'minor' | 'middle' | 'major' = 'minor') => {
    if (onDirectAddProduct) {
      onDirectAddProduct(prod, unitType);
    } else {
      onSelectProduct(prod.id);
    }
    setLastAddedName(prod.name);
    setTimeout(() => setLastAddedName(null), 3500);

    // CRITICAL: DO NOT wipe query and DO NOT close the search window!
    // The user explicitly requested to stay in this window to pick other varieties (e.g. Mamia and its varieties)!
    if (query.trim().length > 0) {
      setIsOpen(true);
    }
    // We intentionally do NOT call onCloseBigWindow() here so the window stays active for multi-item selection
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectProduct('');
    setQuery('');
    setIsFullScreenResults(false);
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleOpenDropdown = () => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Identify match reason for quick visual feedback
  const getMatchHighlight = (p: Product) => {
    if (!query.trim()) return null;
    const rawQ = query.trim();
    const isPriceMatch = 
      p.salePriceMinor.toString().includes(rawQ) ||
      p.salePriceMajor.toString().includes(rawQ) ||
      p.purchasePriceMinor.toString().includes(rawQ) ||
      p.purchasePriceMajor.toString().includes(rawQ);

    if (isPriceMatch) {
      return (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
          مطابقة بالسعر
        </span>
      );
    }

    if (searchTokens.length > 1) {
      return (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30">
          مطابقة بالمقاطع ({searchTokens.length})
        </span>
      );
    }

    return null;
  };

  // 1. THE DEDICATED FULL-SCREEN BIG SEARCH WINDOW (النافذة الكبيرة للبحث عن الأصناف وإضافتها للفاتورة)
  if (isBigWindowActive) {
    return (
      <div 
        ref={containerRef}
        className="fixed inset-0 z-[160] w-full h-full h-[100dvh] bg-slate-950 flex flex-col animate-in fade-in duration-150"
        id={id ? `${id}-big-window` : 'big-search-window'}
        dir="rtl"
      >
        {/* Top Header Bar */}
        <div className="bg-slate-900 border-b border-slate-800 px-3 py-2.5 flex items-center justify-between shrink-0 shadow-md">
          {/* Close / Return button */}
          <button
            type="button"
            onClick={() => {
              setIsFullScreenResults(false);
              setIsOpen(false);
              onCloseBigWindow?.();
              onKeyboardDismiss?.();
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-black transition-all active:scale-95 cursor-pointer shadow-sm shrink-0"
          >
            <ArrowRight className="w-4 h-4 text-emerald-400" />
            <span>{cartItemsCount > 0 ? 'عرض الفاتورة' : 'رجوع'}</span>
            {cartItemsCount > 0 && (
              <span className="bg-emerald-500 text-slate-950 font-mono px-2 py-0.5 rounded-full text-[11px] font-black mr-1 shadow-sm">
                {cartItemsCount}
              </span>
            )}
          </button>

          {/* Window Title & Results Count */}
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-extrabold text-white hidden xs:inline">
              نافذة الأصناف
            </span>
            <span className={`text-[11px] font-mono font-black px-2.5 py-1 rounded-lg border shadow-xs ${
              isEmerald 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
            }`}>
              {query.trim() ? `${displayedProducts.length} صنف مطابق` : `${displayedProducts.length} صنف`}
            </span>
          </div>

          {/* Dismiss Keyboard Action */}
          <button
            type="button"
            onClick={() => {
              bigInputRef.current?.blur();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-bold transition-all cursor-pointer active:scale-95 shrink-0"
            title="إنزال لوحة المفاتيح لإظهار كامل الشاشة"
          >
            <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
            <ChevronDown className="w-3 h-3 text-slate-400" />
            <span className="text-[11px] hidden xxs:inline">الكيبورد</span>
          </button>
        </div>

        {/* Search Input Bar + Stock Filter Chips */}
        <div className="bg-slate-900/95 border-b border-slate-800 px-3 py-2.5 space-y-2.5 shrink-0">
          {/* Direct Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-emerald-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={bigInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث بالاسم، الماركة، السعر، أو الباركود..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-10 pl-10 py-2.5 text-white placeholder-slate-500 text-xs sm:text-sm font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-inner"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="مسح البحث"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Multi-Token Search Indicator Chips */}
          {searchTokens.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5 animate-in fade-in duration-150">
              <span className="text-[11px] font-bold text-amber-400/90">بحث بالمقاطع:</span>
              {searchTokens.map((tok, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-amber-400/20 text-amber-300 border border-amber-500/40 text-[11px] font-mono font-black px-2 py-0.5 rounded-lg shadow-2xs">
                  {tok}
                </span>
              ))}
              <span className="text-[10px] text-slate-400 mr-auto">
                (مطابقة كل مقطع بدقة)
              </span>
            </div>
          )}

          {/* Quick Return to Previous Searched Items (e.g. mamia and its varieties) */}
          {lastSearchedQuery && query !== lastSearchedQuery && (
            <div className="flex items-center gap-2 pt-0.5 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={() => {
                  setQuery(lastSearchedQuery);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                title={`الرجوع إلى بحث "${lastSearchedQuery}"`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                <span>الرجوع لبحث الأصناف السابقة: <strong className="text-white">"{lastSearchedQuery}"</strong></span>
              </button>
            </div>
          )}

          {/* Quick Filter Chips: All, In Stock, Out of Stock, In Cart */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs font-bold">
            <button
              type="button"
              onClick={() => setStockFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl transition-all border whitespace-nowrap cursor-pointer shadow-xs ${
                stockFilter === 'all'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40 font-black'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-850 hover:text-white'
              }`}
            >
              {query.trim() ? `الأصناف المحددة بالبحث (${filteredProducts.length})` : `كافة الأصناف (${products.length})`}
            </button>

            {cartItems && cartItems.length > 0 && (
              <button
                type="button"
                onClick={() => setStockFilter('in_cart')}
                className={`px-3.5 py-1.5 rounded-xl transition-all border whitespace-nowrap cursor-pointer flex items-center gap-1.5 shadow-xs ${
                  stockFilter === 'in_cart'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40 font-black'
                    : 'bg-slate-900 text-emerald-300 border-emerald-500/30 hover:bg-slate-850'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>الأصناف المختارة بالفاتورة ({inCartProductsCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setStockFilter('in_stock')}
              className={`px-3.5 py-1.5 rounded-xl transition-all border whitespace-nowrap cursor-pointer shadow-xs ${
                stockFilter === 'in_stock'
                  ? 'bg-teal-600 text-white border-teal-500 shadow-md font-black'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-850'
              }`}
            >
              {query.trim()
                ? `المتوفرة (${filteredProducts.filter(p => p.stockPieces > 0).length})`
                : `المتوفرة بالمخزن (${inStockCount})`}
            </button>

            <button
              type="button"
              onClick={() => setStockFilter('out_of_stock')}
              className={`px-3.5 py-1.5 rounded-xl transition-all border whitespace-nowrap cursor-pointer shadow-xs ${
                stockFilter === 'out_of_stock'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-md font-black'
                  : 'bg-slate-900 text-rose-300/80 border-slate-800 hover:bg-slate-850'
              }`}
            >
              {query.trim()
                ? `النافدة (${filteredProducts.filter(p => p.stockPieces <= 0).length})`
                : `الأصناف النافدة (${outOfStockCount})`}
            </button>
          </div>
        </div>

        {/* Full-Screen Results Container */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 pb-24 overscroll-contain">
          {displayedProducts.length === 0 ? (
            <div className="h-full min-h-[260px] flex flex-col items-center justify-center p-6 text-center space-y-3 text-slate-400">
              <AlertTriangle className="w-12 h-12 text-amber-400/80 mx-auto" />
              <p className="text-base font-bold text-slate-200">
                {query ? `لا يوجد صنف يطابق "${query}"` : 'لا توجد أصناف مطابقة لهذا التصنيف'}
              </p>
              <p className="text-xs text-slate-400 max-w-xs">
                {stockFilter === 'out_of_stock' 
                  ? 'لا توجد أصناف نافدة المخزون حالياً'
                  : 'تأكد من كتابة الاسم أو السعر أو الباركود بشكل صحيح'}
              </p>
              <div className="flex items-center gap-2 pt-2">
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold text-xs"
                  >
                    مسح البحث
                  </button>
                )}
                {stockFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setStockFilter('all')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
                  >
                    عرض كافة الأصناف
                  </button>
                )}
              </div>
            </div>
          ) : (
            displayedProducts.slice(0, 250).map((prod) => {
              const hasDualUnits = isDualUnitProduct(prod) && 
                (mode === 'sale' 
                  ? prod.salePriceMajor > 0 && prod.salePriceMajor !== prod.salePriceMinor 
                  : prod.purchasePriceMajor > 0 && prod.purchasePriceMajor !== prod.purchasePriceMinor);

              const primaryUnit = getPrimaryUnit(prod);
              const primaryPrice = mode === 'sale' 
                ? (prod.salePriceMajor > 0 ? prod.salePriceMajor : prod.salePriceMinor)
                : (prod.purchasePriceMajor > 0 ? prod.purchasePriceMajor : prod.purchasePriceMinor);

              const matchTag = getMatchHighlight(prod);
              const cartInfo = getProductCartInfo(prod.id);

              return (
                <div
                  key={prod.id}
                  onClick={() => handleItemDirectAdd(prod, hasDualUnits ? 'minor' : 'major')}
                  className={`p-3.5 sm:p-4 rounded-2xl bg-slate-900/95 hover:bg-slate-900 border transition-all cursor-pointer shadow-lg active:scale-[0.99] text-white ${
                    cartInfo 
                      ? 'border-emerald-500 ring-2 ring-emerald-500/40 shadow-emerald-950/40' 
                      : 'border-slate-800 hover:border-emerald-500/60'
                  }`}
                >
                  {/* Top Row: Full-width Product Name and Package/Cart Icon */}
                  <div className="flex items-start gap-3 w-full">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                      cartInfo
                        ? 'bg-emerald-600 text-white shadow-md'
                        : isEmerald 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    }`}>
                      {cartInfo ? <Check className="w-4 h-4 stroke-[3]" /> : <Package className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-white text-base sm:text-lg leading-snug tracking-tight">
                        <HighlightedProductName name={prod.name} query={query} />
                      </h4>
                    </div>

                    {cartInfo && (
                      <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-lg bg-emerald-500/25 text-emerald-200 border border-emerald-500/50 shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>مضاف ({cartInfo.totalQty})</span>
                      </span>
                    )}
                  </div>

                  {/* Metadata Row: Stock Status, Category, Barcode & Match Badges */}
                  <div className="flex items-center gap-2 flex-wrap mt-2.5 pt-2 border-t border-slate-800/80">
                    {/* Stock Status Badge */}
                    <span className={`inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-lg border shadow-xs ${
                      prod.stockPieces <= 0
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : prod.stockPieces <= prod.minStockAlert
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        prod.stockPieces <= 0
                          ? 'bg-rose-400 animate-ping'
                          : prod.stockPieces <= prod.minStockAlert
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`} />
                      <span>
                        {prod.stockPieces <= 0 ? (
                          'صنف نافد'
                        ) : (
                          `متوفر: ${prod.stockPieces} ${hasDualUnits ? prod.minorUnit : primaryUnit}`
                        )}
                      </span>
                    </span>

                    {/* Category Badge */}
                    <span className="text-xs font-bold text-slate-300 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700/80 shadow-xs">
                      {prod.category || 'عام'}
                    </span>

                    {/* Barcode Badge */}
                    {prod.barcode && prod.barcode !== '0000' && (
                      <span className="text-xs font-bold text-amber-300 font-mono bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700/80 shadow-xs">
                        كود: {prod.barcode}
                      </span>
                    )}

                    {/* Search match tag */}
                    {matchTag}
                  </div>

                  {/* 1-Tap Direct Add to Invoice / Purchase */}
                  <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/90">
                    {(() => {
                      const units = getProductUnitsList(prod);
                      if (units.length === 1) {
                        const u = units[0];
                        const price = mode === 'sale' ? u.salePrice : u.purchasePrice;
                        const singleCartItem = cartItems?.find(ci => ci.productId === prod.id);
                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleItemDirectAdd(prod, u.type);
                            }}
                            className={`w-full py-2.5 px-3.5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-between transition-all shadow-md cursor-pointer ${
                              singleCartItem
                                ? 'bg-emerald-700 hover:bg-emerald-600 active:scale-[0.99] text-white shadow-emerald-950/50'
                                : isEmerald
                                ? 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white shadow-emerald-950/50'
                                : 'bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white shadow-blue-950/50'
                            }`}
                          >
                            <span className="flex items-center gap-1.5 text-white">
                              <Plus className="w-4 h-4 stroke-[3] text-white" />
                              <span className="text-white font-extrabold">
                                {singleCartItem ? `إضافة قطعة أخرى (مضاف: ${singleCartItem.quantity})` : 'إدراج بالفاتورة'}
                              </span>
                            </span>
                            <span className="font-mono text-xs sm:text-sm font-black text-white">
                              {formatCurrency(price, currency)} / {u.name}
                            </span>
                          </button>
                        );
                      }

                      return (
                        <div className={`grid gap-2 ${units.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                          {units.map((u) => {
                            const price = mode === 'sale' ? u.salePrice : u.purchasePrice;
                            const isMinor = u.type === 'minor';
                            const isMiddle = u.type === 'middle';
                            const unitCartItem = cartItems?.find(ci => ci.productId === prod.id && ci.unitType === u.type);

                            const colorClasses = unitCartItem
                              ? 'bg-emerald-900/50 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/50 font-black'
                              : isMinor
                              ? isEmerald
                                ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-950 dark:bg-emerald-950/80 dark:hover:bg-emerald-900/90 dark:border-emerald-500/50 dark:text-emerald-200'
                                : 'bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-950 dark:bg-blue-950/80 dark:hover:bg-blue-900/90 dark:border-blue-500/50 dark:text-blue-200'
                              : isMiddle
                                ? 'bg-purple-50 hover:bg-purple-100 border-purple-300 text-purple-950 dark:bg-purple-950/80 dark:hover:bg-purple-900/90 dark:border-purple-500/50 dark:text-purple-200'
                                : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-950 dark:bg-amber-950/80 dark:hover:bg-amber-900/90 dark:border-amber-500/50 dark:text-amber-200';

                            return (
                              <button
                                key={u.type}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleItemDirectAdd(prod, u.type);
                                }}
                                className={`py-2 px-1.5 sm:px-2.5 rounded-xl font-bold text-xs flex flex-col items-center justify-center transition-all border cursor-pointer shadow-xs ${colorClasses}`}
                              >
                                <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold truncate max-w-full">
                                  {unitCartItem ? (
                                    <span className="text-[10px] text-emerald-300 font-mono font-black bg-emerald-500/30 px-1 rounded">
                                      ✓ {unitCartItem.quantity}
                                    </span>
                                  ) : isMinor ? (
                                    <Plus className="w-3 h-3 stroke-[3]" />
                                  ) : (
                                    <Package className="w-3 h-3" />
                                  )}
                                  <span className="truncate">بالـ {u.name} {u.ratio > 1 ? `(${u.ratio})` : ''}</span>
                                </span>
                                <span className="font-mono font-black text-xs sm:text-sm text-slate-900 dark:text-white mt-0.5">
                                  {formatCurrency(price, currency)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Quick Footer for results > 100 */}
        {displayedProducts.length > 100 && (
          <div className="px-3 py-2 bg-slate-900 border-t border-slate-800 text-center text-[11px] text-slate-400 font-medium shrink-0">
            يتم عرض أول 100 صنف متطابق، خصص البحث لتحديد أدق
          </div>
        )}

        {/* Floating Notification Pill when item is added */}
        {lastAddedName && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[150] bg-slate-900/95 border border-emerald-500/80 shadow-[0_10px_35px_rgba(0,0,0,0.8)] px-4 py-2.5 rounded-2xl flex items-center gap-3 backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-[90vw]">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-xs font-bold text-slate-100 truncate">
              تمت إضافة <span className="text-emerald-300 font-black">"{lastAddedName}"</span> للفاتورة
            </div>
            <button
              type="button"
              onClick={() => {
                setIsFullScreenResults(false);
                setIsOpen(false);
                onCloseBigWindow?.();
                onKeyboardDismiss?.();
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl transition-all active:scale-95 shadow-md shrink-0 cursor-pointer"
            >
              عرض الفاتورة
            </button>
          </div>
        )}

        {/* Persistent bottom bar to view invoice when cart has items and no notification is showing */}
        {!lastAddedName && cartItemsCount > 0 && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[140] bg-slate-900/95 border border-emerald-500/50 shadow-2xl px-4 py-2 rounded-2xl flex items-center gap-3 backdrop-blur-md max-w-[92vw] animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <ShoppingCart className="w-4 h-4 text-emerald-400" />
              <span>أصناف الفاتورة: <strong className="text-emerald-300 font-mono font-black">{cartItemsCount}</strong></span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsFullScreenResults(false);
                setIsOpen(false);
                onCloseBigWindow?.();
                onKeyboardDismiss?.();
              }}
              className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs px-3 py-1.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <span>إظهار الفاتورة</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // 2. STANDARD SEARCH FRAME VIEW (When not in full screen results mode)
  return (
    <div 
      ref={containerRef} 
      className="relative w-full text-xs" 
      id={id}
    >
      {/* If product is selected and dropdown is closed, show selected card with change button */}
      {selectedProduct && !isOpen ? (
        <div 
          onClick={handleOpenDropdown}
          className={`w-full p-[2px] rounded-2xl transition-all group cursor-pointer shadow-md ${
            isEmerald 
              ? 'bg-gradient-to-r from-emerald-500/70 via-teal-400 to-cyan-500/70 hover:from-emerald-400 hover:to-cyan-400 shadow-emerald-950/40' 
              : 'bg-gradient-to-r from-blue-500/70 via-sky-400 to-indigo-500/70 hover:from-blue-400 hover:to-indigo-400 shadow-blue-950/40'
          }`}
          title="اضغط لتغيير الصنف أو البحث مجدداً"
        >
          <div className="w-full bg-slate-900 group-hover:bg-slate-850 rounded-[14px] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold mt-0.5 shadow-sm ${
                isEmerald ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40' : 'bg-blue-500/25 text-blue-300 border border-blue-500/40'
              }`}>
                <Package className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-white text-sm sm:text-base leading-snug break-words">
                  {selectedProduct.name}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-300 mt-1 flex-wrap">
                  <span className={`font-bold ${priceColorClass}`}>
                    {mode === 'sale' 
                      ? `سعر البيع: ${formatCurrency(selectedProduct.salePriceMinor, currency)} / ${selectedProduct.minorUnit}`
                      : `سعر الشراء: ${formatCurrency(selectedProduct.purchasePriceMinor, currency)} / ${selectedProduct.minorUnit}`
                    }
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400">
                    المتوفر: <strong className={selectedProduct.stockPieces > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{selectedProduct.stockPieces} {selectedProduct.minorUnit}</strong>
                  </span>
                  {selectedProduct.piecesPerMajorUnit > 1 && selectedProduct.majorUnit !== selectedProduct.minorUnit && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-400">({selectedProduct.majorUnit}: {formatCurrency(mode === 'sale' ? selectedProduct.salePriceMajor : selectedProduct.purchasePriceMajor, currency)})</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-1.5 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800">
              <button
                type="button"
                onClick={handleClearSelection}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                title="إلغاء التحديد والبحث من جديد"
              >
                <X className="w-4 h-4" />
              </button>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border flex items-center gap-1 transition-all ${
                isEmerald 
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 group-hover:bg-emerald-500/30' 
                  : 'bg-blue-500/20 border-blue-400/50 text-blue-300 group-hover:bg-blue-500/30'
              }`}>
                <Search className="w-3 h-3" />
                <span>تغيير</span>
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Search Input Box with Attractive Glowing Colorful Frame */
        <div className="relative shrink-0">
          <div className={`p-[2px] rounded-2xl transition-all duration-300 ${
            isOpen 
              ? (isEmerald 
                  ? 'bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 shadow-[0_0_20px_rgba(52,211,153,0.4)]' 
                  : 'bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 shadow-[0_0_20px_rgba(96,165,250,0.4)]')
              : (isEmerald 
                  ? 'bg-gradient-to-r from-emerald-500/80 via-teal-400/90 to-cyan-500/80 hover:from-emerald-400 hover:to-cyan-400 shadow-[0_0_14px_rgba(52,211,153,0.25)]' 
                  : 'bg-gradient-to-r from-blue-500/80 via-sky-400/90 to-indigo-500/80 hover:from-blue-400 hover:to-indigo-400 shadow-[0_0_14px_rgba(96,165,250,0.25)]')
          }`}>
            <div className="relative flex items-center bg-slate-900 rounded-[14px] px-2.5 py-1 transition-colors">
              {/* Distinctive Search Icon Badge */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                isOpen
                  ? (isEmerald ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30' : 'bg-blue-500 text-white font-bold shadow-md shadow-blue-500/30')
                  : (isEmerald ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30')
              }`}>
                <Search className="w-4 h-4" />
              </div>

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuery(val);
                  setIsOpen(true);
                }}
                onClick={() => {
                  setIsOpen(true);
                }}
                onFocus={() => {
                  setIsInputFocused(true);
                  setIsOpen(true);
                  onSearchFocus?.();
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setIsInputFocused(false);
                    onSearchBlur?.();
                  }, 200);
                }}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full bg-transparent px-3 py-2 text-white placeholder-slate-400 font-bold text-sm sm:text-base focus:outline-none"
              />

              {/* Instant Full Screen Results Trigger Button when user is typing */}
              {query.trim().length > 0 ? (
                <div className="flex items-center gap-1 shrink-0 ml-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      dismissKeyboardAndShowFullResults();
                    }}
                    className={`px-2.5 py-1.5 rounded-xl font-black text-xs flex items-center gap-1 shadow-md active:scale-95 transition-all ${
                      isEmerald
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                        : 'bg-blue-500 hover:bg-blue-400 text-white'
                    }`}
                    title="عرض النتائج في كامل الشاشة وإنزال الكيبورد"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>نتائج ({filteredProducts.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setIsOpen(false);
                      setIsFullScreenResults(false);
                      inputRef.current?.focus();
                    }}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="مسح البحث"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : hasCartItems ? (
                /* Button to Dismiss Keyboard and View Invoice when items already exist in cart */
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsOpen(false);
                    inputRef.current?.blur();
                    setIsInputFocused(false);
                    onKeyboardDismiss?.();
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    setIsOpen(false);
                    inputRef.current?.blur();
                    setIsInputFocused(false);
                    onKeyboardDismiss?.();
                  }}
                  className="px-2.5 py-1 rounded-xl text-emerald-200 hover:text-white bg-emerald-600/40 hover:bg-emerald-600/60 border border-emerald-500/50 transition-colors flex items-center gap-1.5 text-xs font-black shrink-0 cursor-pointer shadow-sm ml-1"
                  title="إنزال لوحة المفاتيح وعرض الفاتورة"
                >
                  <Keyboard className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="whitespace-nowrap">عرض الفاتورة ({cartItemsCount})</span>
                </button>
              ) : isInputFocused ? (
                /* Quick Dismiss Keyboard Button when user is typing on phone and cart is empty */
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    inputRef.current?.blur();
                    setIsInputFocused(false);
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    inputRef.current?.blur();
                    setIsInputFocused(false);
                  }}
                  className="px-2 py-1 rounded-xl text-emerald-300 hover:text-white bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 transition-colors flex items-center gap-1 text-[11px] font-bold shrink-0 cursor-pointer shadow-sm ml-1"
                  title="إنزال لوحة المفاتيح"
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  <ChevronDown className="w-3 h-3" />
                  <span className="text-[10px] hidden xs:inline">إنزال الكيبورد</span>
                </button>
              ) : (
                <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-1 rounded-lg shrink-0 border ${
                  isEmerald ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                }`}>
                  بحث فوري
                </span>
              )}
            </div>
          </div>

          {/* Quick Return to Previous Searched Query (e.g. mamia and its varieties) */}
          {lastSearchedQuery && query !== lastSearchedQuery && (
            <div className="flex items-center gap-2 pt-1.5 px-1 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={() => {
                  setQuery(lastSearchedQuery);
                  setIsOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all shadow-xs cursor-pointer"
                title={`الرجوع لبحث "${lastSearchedQuery}"`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                <span>الرجوع لبحث الأصناف السابقة: <strong className="text-white">"{lastSearchedQuery}"</strong></span>
              </button>
            </div>
          )}

          {/* Multi-Token Search Indicator Chips */}
          {searchTokens.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1.5 px-2 animate-in fade-in duration-150">
              <span className="text-[11px] font-bold text-amber-400">بحث بالمقاطع المفصولة:</span>
              {searchTokens.map((tok, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-amber-400/20 text-amber-300 border border-amber-500/40 text-[11px] font-mono font-black px-2 py-0.5 rounded-lg shadow-2xs">
                  {tok}
                </span>
              ))}
              <span className="text-[10px] text-slate-400">
                (مطابقة كل مقطع)
              </span>
            </div>
          )}

          {/* Quick Helper Subtitle */}
          <div className="flex items-center justify-between px-2 pt-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${isEmerald ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.8)]'}`}></span>
              ابحث بأي جزء من الكلمة (عربي ولاتيني) أو السعر أو الباركود
            </span>
            {filteredProducts.length > 0 && (
              <span className={`font-mono font-bold text-[10.5px] px-2 py-0.5 rounded-lg border ${
                isEmerald 
                  ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' 
                  : 'text-blue-300 bg-blue-500/10 border-blue-500/30'
              }`}>
                {filteredProducts.length} صنف متاح
              </span>
            )}
          </div>

          {/* Active Typing & Countdown Delay Banner */}
          {query.trim().length > 0 && (
            <div className="mt-2.5 p-2.5 rounded-2xl bg-slate-850/95 border border-emerald-500/40 shadow-lg shadow-emerald-950/20 text-xs space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                    <Timer className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-slate-100">
                      <span>جاري كتابة الصنف...</span>
                      {typingDelaySec > 0 && (
                        <span className="text-emerald-400 font-mono font-extrabold bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded text-[11px]">
                          مهلة: {remainingSeconds.toFixed(1)} ثانية
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {typingDelaySec > 0 
                        ? 'تتجدد المهلة مع كل حرف لتكتب براحتك، وتفتح النتائج تلقائياً عند التوقف'
                        : 'وضع الكتابة اليدوي مفعل (اضغط Enter لفتح النتائج)'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => dismissKeyboardAndShowFullResults()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-md active:scale-95 transition-all cursor-pointer"
                    title="فتح النتائج فوراً وتخطي انتظار الثواني"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>فتح فوري (Enter)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDelaySettings(!showDelaySettings)}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-750 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="تعديل مهلة ثواني الكتابة"
                  >
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{typingDelaySec > 0 ? `${typingDelaySec}ث` : 'يدوي'}</span>
                  </button>
                </div>
              </div>

              {/* Smooth visual progress bar */}
              {typingDelaySec > 0 && isTyping && (
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 h-full rounded-full transition-all duration-100 ease-linear"
                    style={{ width: `${Math.min(100, Math.max(0, (remainingSeconds / typingDelaySec) * 100))}%` }}
                  />
                </div>
              )}

              {/* Delay Configuration Selector */}
              {showDelaySettings && (
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] flex-wrap gap-2 text-slate-300">
                  <span className="font-semibold text-slate-400">كم ثانية تفضل لإكمال الكتابة؟</span>
                  <div className="flex items-center gap-1">
                    {[
                      { label: '2 ثانية', val: 2 },
                      { label: '3.5 ثوانٍ (موصى به)', val: 3.5 },
                      { label: '5 ثوانٍ (أطول)', val: 5 },
                      { label: 'يدوي (Enter فقط)', val: 0 },
                    ].map(opt => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => {
                          setTypingDelaySec(opt.val);
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('pos_search_typing_delay_sec', String(opt.val));
                            // Sync preference immediately to Firestore for cross-device consistency
                            saveAppPreferencesToFirestore({ searchTypingDelaySec: opt.val }).catch((err) => {
                              console.warn('Could not sync preference to Firestore:', err);
                            });
                          }
                          setShowDelaySettings(false);
                        }}
                        className={`px-2 py-1 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer ${
                          typingDelaySec === opt.val
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-sm'
                            : 'bg-slate-800 text-slate-400 border-slate-750 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dropdown list if user opens browser dropdown without full screen */}
      {isOpen && !isFullScreenResults && !selectedProduct && (
        <div 
          ref={listRef}
          className={`relative w-full mt-2 bg-slate-900 rounded-2xl shadow-2xl overflow-hidden max-h-[52vh] sm:max-h-80 flex flex-col border-2 animate-in fade-in zoom-in-95 duration-150 ${
            isEmerald ? 'border-emerald-500/60 shadow-emerald-950/50' : 'border-blue-500/60 shadow-blue-950/50'
          }`}
        >
          {/* Header Bar of Results */}
          <div className="px-3 py-2 bg-slate-850 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-300 shrink-0">
            <span className="font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {query.trim() ? `نتائج البحث عن "${query}":` : 'قائمة الأصناف المتوفرة:'}
            </span>
            <button
              type="button"
              onClick={dismissKeyboardAndShowFullResults}
              className="text-[11px] font-bold text-emerald-300 hover:text-white flex items-center gap-1 bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/40"
            >
              <Maximize2 className="w-3 h-3" />
              <span>تكبير لكامل الشاشة</span>
            </button>
          </div>

          {/* Results List */}
          <div className="flex-1 min-h-0 overflow-y-auto sm:max-h-80 p-2 sm:p-2.5 space-y-2.5 pb-28 sm:pb-2.5 overscroll-contain">
            {filteredProducts.slice(0, 50).map((prod) => {
              const hasDualUnits = isDualUnitProduct(prod) && 
                (mode === 'sale' 
                  ? prod.salePriceMajor > 0 && prod.salePriceMajor !== prod.salePriceMinor 
                  : prod.purchasePriceMajor > 0 && prod.purchasePriceMajor !== prod.purchasePriceMinor);

              const primaryUnit = getPrimaryUnit(prod);
              const primaryPrice = mode === 'sale' 
                ? (prod.salePriceMajor > 0 ? prod.salePriceMajor : prod.salePriceMinor)
                : (prod.purchasePriceMajor > 0 ? prod.purchasePriceMajor : prod.purchasePriceMinor);

              const cartInfo = getProductCartInfo(prod.id);

              return (
                <div
                  key={prod.id}
                  onClick={() => handleItemDirectAdd(prod, hasDualUnits ? 'minor' : 'major')}
                  className={`p-3 rounded-2xl cursor-pointer transition-all border shadow-xs text-white ${
                    cartInfo
                      ? 'bg-emerald-950/80 border-emerald-500 ring-1 ring-emerald-500/40 text-white'
                      : 'bg-slate-850 hover:bg-slate-800 border-slate-750 text-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-black text-white text-sm leading-snug">
                          <HighlightedProductName name={prod.name} query={query} />
                        </h4>
                        {cartInfo && (
                          <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/25 px-1.5 py-0.2 rounded border border-emerald-500/40">
                            ✓ بالفاتورة ({cartInfo.totalQty})
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-300 mt-0.5">
                        المتوفر: {prod.stockPieces} {primaryUnit}
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-400 font-mono">
                      {formatCurrency(primaryPrice, currency)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
