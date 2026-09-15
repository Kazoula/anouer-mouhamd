import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  User, 
  UserCheck, 
  UserPlus, 
  Phone, 
  X, 
  Check, 
  Building, 
  ArrowRight,
  Keyboard,
  ChevronDown
} from 'lucide-react';
import { Customer } from '../types';
import { formatCurrency } from '../utils/calculations';
import { 
  normalizeSearchText, 
  extractSearchTokens, 
  matchCustomerBilingual,
  latinToArabicPhonetic,
  arabicToLatinPhonetic
} from '../utils/searchHelpers';

interface CustomerSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  selectedCustomerId: string;
  onSelectCustomer: (customer: Customer | null) => void;
  onQuickAddCustomer?: (name: string, phone: string) => Promise<Customer | void> | Customer | void;
  currency: string;
  initialQuery?: string;
}

/**
 * Highlights parts of the text that match the search query (in Arabic or French/Latin).
 */
const HighlightedText: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query.trim() || !text) return <>{text}</>;

  const rawTokens = extractSearchTokens(query);
  const allTokens = new Set<string>();
  for (const tok of rawTokens) {
    allTokens.add(tok);
    latinToArabicPhonetic(tok).forEach(t => allTokens.add(t));
    arabicToLatinPhonetic(tok).forEach(t => allTokens.add(t));
  }

  const tokens = Array.from(allTokens).filter(t => t.length >= 1);
  if (tokens.length === 0) return <>{text}</>;

  const escapedTokens = tokens
    .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  if (escapedTokens.length === 0) return <>{text}</>;

  try {
    const regex = new RegExp(`(${escapedTokens.join('|')})`, 'gi');
    const parts = text.split(regex);

    return (
      <bdi dir="auto" className="inline text-start">
        {parts.map((part, index) => {
          const isMatch = tokens.some(tok => {
            const normTok = normalizeSearchText(tok);
            const normPart = normalizeSearchText(part);
            return normPart && normTok && (normPart.includes(normTok) || normTok.includes(normPart));
          });

          return isMatch ? (
            <mark 
              key={index} 
              className="bg-amber-400 text-slate-950 font-black px-1 py-0.5 rounded border border-amber-300 shadow-xs not-italic inline"
            >
              {part}
            </mark>
          ) : (
            <span key={index} className="text-white font-black inline">{part}</span>
          );
        })}
      </bdi>
    );
  } catch {
    return <>{text}</>;
  }
};

export const CustomerSelectModal: React.FC<CustomerSelectModalProps> = ({
  isOpen,
  onClose,
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onQuickAddCustomer,
  currency,
  initialQuery = '',
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [isSavingNew, setIsSavingNew] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Dismiss/lower phone virtual keyboard to reveal full screen
   */
  const dismissKeyboard = () => {
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
    if (typeof document !== 'undefined') {
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        active.blur();
      }
    }
  };

  // When modal opens: initialize query and ensure phone keyboard is lowered
  useEffect(() => {
    if (isOpen) {
      setSearchQuery(initialQuery || '');
      setIsAddingNew(false);
      // Immediately dismiss phone keyboard so user sees the full customer list comfortably
      dismissKeyboard();
      const timer = setTimeout(() => {
        dismissKeyboard();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialQuery]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        if (isAddingNew) {
          setIsAddingNew(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isAddingNew, onClose]);

  // When user writes in the search bar: auto-dismiss keyboard after brief pause
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    // Automatically lower keyboard after user pauses typing (Arabic or French letters)
    if (val.trim().length >= 1) {
      typingTimerRef.current = setTimeout(() => {
        dismissKeyboard();
      }, 700);
    }
  };

  // Advanced bilingual (Arabic & French) customer search
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;

    return customers.filter(customer => 
      matchCustomerBilingual(customer.name, customer.phone, customer.company, searchQuery)
    );
  }, [customers, searchQuery]);

  if (!isOpen) return null;

  const handleSelect = (customer: Customer) => {
    dismissKeyboard();
    onSelectCustomer(customer);
    onClose();
  };

  const handleCreateCustomer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const nameToSave = newCustomerName.trim() || searchQuery.trim();
    if (!nameToSave) return;

    setIsSavingNew(true);
    try {
      if (onQuickAddCustomer) {
        const res = await onQuickAddCustomer(nameToSave, newCustomerPhone.trim());
        if (res && 'id' in res) {
          handleSelect(res as Customer);
        } else {
          const tempCust: Customer = {
            id: 'temp_' + Date.now(),
            name: nameToSave,
            phone: newCustomerPhone.trim(),
            balance: 0,
            createdAt: new Date().toISOString()
          };
          handleSelect(tempCust);
        }
      } else {
        const tempCust: Customer = {
          id: 'temp_' + Date.now(),
          name: nameToSave,
          phone: newCustomerPhone.trim(),
          balance: 0,
          createdAt: new Date().toISOString()
        };
        handleSelect(tempCust);
      }
    } finally {
      setIsSavingNew(false);
      setIsAddingNew(false);
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[70] bg-slate-950 sm:bg-black/80 backdrop-blur-md flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 animate-in fade-in overflow-hidden"
    >
      {/* Full-Screen on mobile phone, centered modal on desktop */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border-0 sm:border sm:border-amber-500/40 rounded-none sm:rounded-3xl w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:max-w-2xl shadow-2xl text-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95"
      >
        {/* Header - نافذة أسماء العملاء */}
        <div className="flex items-center justify-between px-3.5 sm:px-5 py-3 border-b border-slate-800 shrink-0 bg-slate-900/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
              title="رجوع للفاتورة"
            >
              <ArrowRight className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-bold sm:inline hidden">رجوع</span>
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-amber-500/25 to-amber-600/10 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-white">أسماء العملاء</h3>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {filteredCustomers.length} عميل
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  بحث بالعربية أو الفرنسية، مع تنزيل كيبورد الهاتف لرؤية كامل القائمة
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Direct button to lower mobile keyboard */}
            <button
              type="button"
              onClick={dismissKeyboard}
              className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-amber-300 border border-slate-750 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
              title="تنزيل كيبورد الهاتف"
            >
              <Keyboard className="w-4 h-4 text-amber-400" />
              <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xs:inline sm:inline text-[11px]">تنزيل الكيبورد</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-750 transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar - إطار بحث سريع بالعربية والفرنسية مع تنزيل الكيبورد */}
        <div className="px-3.5 sm:px-5 pt-3 pb-2.5 shrink-0 bg-slate-900 border-b border-slate-800/80 space-y-2">
          <div className="relative group">
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-amber-400 group-focus-within:text-amber-300">
              <Search className="w-5 h-5" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Search') {
                  e.preventDefault();
                  dismissKeyboard();
                }
              }}
              placeholder="اكتب بالعربية أو بالفرنسية (مثل: ادم، lahar، ahmed، 101)..."
              className="w-full bg-slate-950 border-2 border-amber-500/60 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/20 rounded-2xl pr-11 pl-11 py-3 text-sm sm:text-base text-white placeholder-slate-500 font-bold focus:outline-none transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  dismissKeyboard();
                }}
                className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                title="مسح البحث"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>
              مطابقة <strong className="text-amber-400 font-bold">{filteredCustomers.length}</strong> عميل
            </span>
            <button
              type="button"
              onClick={dismissKeyboard}
              className="text-amber-400 hover:text-amber-300 font-bold underline flex items-center gap-1 cursor-pointer"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>إخفاء الكيبورد لرؤية الأسماء</span>
            </button>
          </div>
        </div>

        {/* Customer Names List - قائمة أسماء العملاء فقط */}
        <div 
          onScroll={dismissKeyboard}
          onTouchStart={dismissKeyboard}
          className="flex-1 overflow-y-auto px-3.5 sm:px-5 py-3 space-y-2.5 custom-scrollbar"
        >
          {filteredCustomers.length === 0 ? (
            <div className="py-12 text-center bg-slate-950/40 rounded-2xl border border-slate-800/80 p-6">
              <User className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-base font-bold text-slate-300">لا يوجد عميل يطابق &quot;{searchQuery}&quot;</p>
              <p className="text-xs text-slate-500 mt-1">تأكد من كتابة الاسم بالعربية أو بالفرنسية أو أضفه كعميل جديد فوراً</p>

              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setNewCustomerName(searchQuery.trim());
                    setIsAddingNew(true);
                  }}
                  className="mt-5 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-sm flex items-center justify-center gap-2 mx-auto cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>إضافة &quot;{searchQuery}&quot; كعميل جديد فوراً</span>
                </button>
              )}
            </div>
          ) : (
            filteredCustomers.map(customer => {
              const isSelected = selectedCustomerId === customer.id;
              const hasDebt = (Number(customer.balance) || 0) > 0;

              return (
                <div
                  key={customer.id}
                  onClick={() => handleSelect(customer)}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between text-right cursor-pointer group active:scale-[0.99] ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-850/80 border-slate-800 hover:border-amber-500/40 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                    {/* Avatar Badge */}
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-black text-base shrink-0 border ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                        : hasDebt
                        ? 'bg-red-500/15 text-red-400 border-red-500/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700 group-hover:border-amber-500/40'
                    }`}>
                      {customer.name.slice(0, 1) || 'ع'}
                    </div>

                    {/* Customer Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-sm sm:text-base text-white group-hover:text-amber-300 transition-colors">
                          <HighlightedText text={customer.name} query={searchQuery} />
                        </h4>
                        {isSelected && (
                          <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-500/40">
                            محدد حالياً
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                        {customer.phone && (
                          <span className="flex items-center gap-1 font-mono text-xs text-slate-300">
                            <Phone className="w-3.5 h-3.5 text-slate-500" />
                            <HighlightedText text={customer.phone} query={searchQuery} />
                          </span>
                        )}

                        {customer.company && (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Building className="w-3.5 h-3.5 text-slate-500" />
                            <span>{customer.company}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Customer Debt Balance Badge & Action */}
                  <div className="flex items-center gap-2.5 shrink-0 mr-2">
                    <div className="text-left">
                      {hasDebt ? (
                        <div className="bg-red-500/20 border border-red-500/40 rounded-xl px-2.5 py-1 text-right">
                          <div className="text-[10px] font-bold text-red-400">دين سابق:</div>
                          <div className="text-xs sm:text-sm font-black text-red-300 font-mono">
                            {formatCurrency(customer.balance, currency)}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-2.5 py-1 text-right">
                          <div className="text-[10px] font-bold text-emerald-400">الحساب:</div>
                          <div className="text-xs font-black text-emerald-300">
                            خالص (0.00)
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className={`px-3 sm:px-4 py-2 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer shadow-sm ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-200'
                      }`}
                    >
                      {isSelected ? 'محدد ✓' : 'اختيار'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Actions Bar */}
        {isAddingNew ? (
          <form onSubmit={handleCreateCustomer} className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/80 shrink-0 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-black text-amber-300">
              <span className="flex items-center gap-1.5">
                <UserPlus className="w-4 h-4" />
                <span>إضافة عميل جديد وتحديده فوراً</span>
              </span>
              <button 
                type="button" 
                onClick={() => setIsAddingNew(false)}
                className="text-slate-400 hover:text-white underline cursor-pointer"
              >
                إلغاء
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="اسم العميل الكامل *"
                required
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white font-bold focus:border-amber-400 focus:outline-none"
              />
              <input
                type="tel"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                placeholder="رقم الهاتف (اختياري)"
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white font-mono focus:border-amber-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingNew || !newCustomerName.trim()}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
            >
              <Check className="w-4 h-4" />
              <span>{isSavingNew ? 'جاري الحفظ...' : 'حفظ واختيار هذا العميل'}</span>
            </button>
          </form>
        ) : (
          <div className="px-3.5 sm:px-5 py-3 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setNewCustomerName(searchQuery.trim());
                setIsAddingNew(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ إضافة عميل جديد</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95"
            >
              إغلاق
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
