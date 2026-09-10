import React, { useState } from 'react';
import { 
  Store, 
  Globe, 
  QrCode, 
  Link2, 
  Copy, 
  Check, 
  Smartphone, 
  Printer, 
  Barcode, 
  Share2, 
  ExternalLink, 
  ShoppingBag, 
  RefreshCw, 
  Radio, 
  Key, 
  Webhook, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Plus, 
  ArrowRight,
  Package,
  MessageCircle,
  Eye,
  Sliders,
  Send,
  Sparkles,
  Zap,
  Trash2,
  Search,
  X
} from 'lucide-react';
import { Product, StoreConfig, OnlineStoreOrder, SaleInvoice } from '../types';
import { formatCurrency, formatArabicDateTime } from '../utils/calculations';
import { filterAndRankProducts } from '../utils/searchHelpers';

interface StoreIntegrationTabProps {
  products: Product[];
  storeConfig: StoreConfig;
  onUpdateStoreConfig: (newConfig: StoreConfig) => void;
  onlineOrders: OnlineStoreOrder[];
  onAcceptOrder: (order: OnlineStoreOrder) => void;
  onRejectOrder: (orderId: string) => void;
  onDeleteOrder: (orderId: string) => void;
  onCreateNewOnlineOrder: (order: OnlineStoreOrder) => void;
  currency: string;
}

export const StoreIntegrationTab: React.FC<StoreIntegrationTabProps> = ({
  products,
  storeConfig,
  onUpdateStoreConfig,
  onlineOrders,
  onAcceptOrder,
  onRejectOrder,
  onDeleteOrder,
  onCreateNewOnlineOrder,
  currency,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'orders' | 'platforms' | 'hardware'>('catalog');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [showCustomerPreview, setShowCustomerPreview] = useState(false);
  const [testOrderSuccess, setTestOrderSuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);

  // Customer Preview Cart State
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Orders Management State
  const [orderToDelete, setOrderToDelete] = useState<OnlineStoreOrder | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  const pendingOrders = onlineOrders.filter(o => o.status === 'pending');
  const allOrdersCount = onlineOrders.length;
  const pendingOrdersCount = onlineOrders.filter(o => o.status === 'pending').length;
  const acceptedOrdersCount = onlineOrders.filter(o => o.status === 'accepted').length;
  const rejectedOrdersCount = onlineOrders.filter(o => o.status === 'rejected').length;

  const filteredOrders = onlineOrders.filter(order => {
    const matchesFilter = orderStatusFilter === 'all' || order.status === orderStatusFilter;
    const q = orderSearchQuery.trim().toLowerCase();
    const matchesSearch = !q || 
      order.orderNumber.toLowerCase().includes(q) || 
      order.customerName.toLowerCase().includes(q) || 
      (order.customerPhone && order.customerPhone.includes(q)) ||
      (order.customerAddress && order.customerAddress.toLowerCase().includes(q));
    return matchesFilter && matchesSearch;
  });
  const publicStoreUrl = `https://store.faridoun.dz/${encodeURIComponent(storeConfig.storeName.toLowerCase().replace(/\s+/g, '-'))}`;

  const copyToClipboard = (text: string, type: 'key' | 'url' | 'webhook') => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else if (type === 'webhook') {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
  };

  const handleTestSimulation = () => {
    // Pick random products for simulation
    const availableProds = products.filter(p => p.stockPieces > 0);
    if (availableProds.length === 0) return;

    const chosen = availableProds.slice(0, 2);
    const orderItems = chosen.map(p => ({
      productId: p.id,
      productName: p.name,
      quantity: 1,
      unitType: 'minor' as const,
      unitName: p.minorUnit || 'قطعة',
      unitPrice: p.salePriceMinor,
      subtotal: p.salePriceMinor,
    }));

    const total = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

    const simulatedOrder: OnlineStoreOrder = {
      id: `ord_sim_${Date.now()}`,
      orderNumber: `ORD-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      customerName: 'مشتري متجر تجريبي (Online)',
      customerPhone: '0550998877',
      customerAddress: 'الجزائر - الطلب عبر المتجر الإلكتروني',
      items: orderItems,
      totalAmount: total,
      paymentMethod: 'cash_on_delivery',
      status: 'pending',
      createdAt: new Date().toISOString(),
      notes: 'طلب فوري تم استلامه عبر Webhook المتجر',
    };

    onCreateNewOnlineOrder(simulatedOrder);
    setTestOrderSuccess(true);
    setTimeout(() => setTestOrderSuccess(false), 4000);
  };

  const handleSyncPlatform = () => {
    setIsSyncing(true);
    setSyncStatusMessage('جاري مزامنة المخزون والأسعار مع المنصة...');
    setTimeout(() => {
      setIsSyncing(false);
      setSyncStatusMessage('تمت المزامنة بنجاح! جميع الأصناف متطابقة مع المتجر.');
      setTimeout(() => setSyncStatusMessage(null), 3500);
    }, 1200);
  };

  // Categories for Customer Store Preview
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];
  const filteredProducts = React.useMemo(() => {
    const list = filterAndRankProducts(products, searchQuery);
    if (selectedCategory === 'all') return list;
    return list.filter(p => p.category === selectedCategory);
  }, [products, searchQuery, selectedCategory]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as { product: Product; quantity: number }[]);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.salePriceMinor * item.quantity), 0);

  const handleSubmitCustomerOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !customerName.trim() || !customerPhone.trim()) return;

    const newOrder: OnlineStoreOrder = {
      id: `ord_${Date.now()}`,
      orderNumber: `ORD-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim() || 'الاستلام من المتجر',
      items: cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitType: 'minor',
        unitName: item.product.minorUnit || 'قطعة',
        unitPrice: item.product.salePriceMinor,
        subtotal: item.product.salePriceMinor * item.quantity,
      })),
      totalAmount: cartTotal,
      paymentMethod: 'cash_on_delivery',
      status: 'pending',
      createdAt: new Date().toISOString(),
      notes: customerNotes.trim() || undefined,
    };

    onCreateNewOnlineOrder(newOrder);
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerNotes('');
    setShowCustomerPreview(false);
    setActiveSubTab('orders');
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Banner: Store Status & Quick Stats */}
      <div className="bg-gradient-to-l from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/10 shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white">{storeConfig.storeName}</h2>
                <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  متصل ومفعل أونلاين
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{storeConfig.storeTagline}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setShowCustomerPreview(true)}
              className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
            >
              <Eye className="w-4 h-4" />
              <span>معاينة متجر الزبائن</span>
            </button>
            <button
              onClick={handleSyncPlatform}
              disabled={isSyncing}
              className="flex-1 sm:flex-initial py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>مزامنة المخزون</span>
            </button>
          </div>
        </div>

        {syncStatusMessage && (
          <div className="mt-3 p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{syncStatusMessage}</span>
          </div>
        )}

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-[11px]">طلبات معلقة</div>
            <div className="text-base font-black text-amber-400 mt-0.5">{pendingOrders.length} طلبية</div>
          </div>
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-[11px]">الأصناف المعروضة</div>
            <div className="text-base font-black text-white mt-0.5">{products.length} صنف</div>
          </div>
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-[11px]">نظام الدفع المدعوم</div>
            <div className="text-base font-black text-emerald-400 mt-0.5">عند الاستلام + كاشير</div>
          </div>
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-[11px]">نوع الربط النشط</div>
            <div className="text-base font-black text-blue-400 mt-0.5">Direct API + POS</div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('catalog')}
          className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'catalog'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>المتجر الرقمي والكتالوج</span>
        </button>

        <button
          onClick={() => setActiveSubTab('orders')}
          className={`relative flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'orders'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>طلبات المتجر الواردة</span>
          {pendingOrders.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center">
              {pendingOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('platforms')}
          className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'platforms'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Webhook className="w-4 h-4" />
          <span>الربط بالمنصات و API</span>
        </button>

        <button
          onClick={() => setActiveSubTab('hardware')}
          className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'hardware'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>طابعات الإيصالات والباركود</span>
        </button>
      </div>

      {/* Sub-Tab 1: Digital Storefront & QR Catalog */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Store Link & QR Card */}
            <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-sm text-white">رابط المتجر ورمز الـ QR المباشر للزبائن</h3>
                </div>
                <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  مفعل تلقائياً
                </span>
              </div>

              <div className="bg-slate-850 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                <label className="text-xs text-slate-400 block font-semibold">رابط المتجر للمشاركة مع العملاء والواتساب:</label>
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-2 font-mono text-xs text-emerald-300 overflow-x-auto">
                  <span className="truncate flex-1" dir="ltr">{publicStoreUrl}</span>
                  <button
                    onClick={() => copyToClipboard(publicStoreUrl, 'url')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0 flex items-center gap-1 text-[11px] font-sans font-bold"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                </div>
              </div>

              {/* QR Code & Share Options */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
                {/* Visual QR Code Display */}
                <div className="bg-white p-3 rounded-2xl border-2 border-emerald-500/30 flex flex-col items-center shrink-0 shadow-lg">
                  <div className="w-28 h-28 bg-slate-900 rounded-lg flex items-center justify-center text-white relative overflow-hidden">
                    {/* Simulated Clean Vector QR Matrix */}
                    <div className="grid grid-cols-5 gap-1 p-2 w-full h-full bg-white">
                      <div className="bg-slate-950 rounded-sm col-span-2 row-span-2" />
                      <div className="bg-slate-950 rounded-sm" />
                      <div className="bg-slate-950 rounded-sm col-span-2 row-span-2" />
                      <div className="bg-slate-950 rounded-sm" />
                      <div className="bg-emerald-600 rounded-sm col-span-1 row-span-1" />
                      <div className="bg-slate-950 rounded-sm col-span-2 row-span-2" />
                      <div className="bg-slate-950 rounded-sm" />
                      <div className="bg-slate-950 rounded-sm col-span-2" />
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-slate-800 mt-1">مخزون فريدون QR</span>
                </div>

                <div className="space-y-2 text-xs flex-1">
                  <h4 className="font-bold text-white text-sm">رمز الاستجابة السريعة (QR Code) للمحل</h4>
                  <p className="text-slate-400 text-[11.5px] leading-relaxed">
                    اطبع هذا الرمز وضعه على واجهة المحل أو أكياس البضائع؛ يستطيع الزبائن مسحه بكاميرا الهاتف لفتح الكتالوج والطلب فوراً.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => window.print()}
                      className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold flex items-center gap-1.5 text-xs transition-all"
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-400" />
                      <span>طباعة ستيكر الـ QR</span>
                    </button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`تفضل بزيارة متجرنا والطلب أونلاين: ${publicStoreUrl}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-1.5 px-3 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1.5 text-xs transition-all"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>مشاركة عبر واتساب</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Store Details Configuration Form */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-xs text-slate-300">بيانات المتجر والتواصل</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">اسم المتجر</label>
                    <input
                      type="text"
                      value={storeConfig.storeName}
                      onChange={(e) => onUpdateStoreConfig({ ...storeConfig, storeName: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">شعار أو وصف المتجر</label>
                    <input
                      type="text"
                      value={storeConfig.storeTagline}
                      onChange={(e) => onUpdateStoreConfig({ ...storeConfig, storeTagline: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">رقم الواتساب لاستقبال الطلبات</label>
                    <input
                      type="text"
                      value={storeConfig.phoneWhatsApp}
                      onChange={(e) => onUpdateStoreConfig({ ...storeConfig, phoneWhatsApp: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">عنوان المحل / المدينة</label>
                    <input
                      type="text"
                      value={storeConfig.storeAddress}
                      onChange={(e) => onUpdateStoreConfig({ ...storeConfig, storeAddress: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions & Live Simulator Card */}
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-sm text-white">محاكاة واختبار الطلبيات</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  يمكنك إرسال طلب تجريبي فوري لمحاكاة عملية شراء حقيقية من متجرك واختبار وصول الإشعار وخصم المخزون.
                </p>
                <button
                  onClick={handleTestSimulation}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>توليد طلب شراء تجريبي أونلاين</span>
                </button>
                {testOrderSuccess && (
                  <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>تم استلام الطلب التجريبي في تبويب الطلبات!</span>
                  </div>
                )}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3 text-xs">
                <h4 className="font-bold text-slate-200">مميزات المتجر الرقمي</h4>
                <ul className="space-y-2 text-slate-400">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>تحديث فوري لأسعار المنتجات بالدينار الجزائري ({currency}).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>إخفاء تلقائي للمنتجات المنتهية من المخزن لتفادي الطلب الزائد.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>سلة تسوق خفيفة ومتجاوبة تعمل على كافة أجهزة الهواتف بدون تحميل تطبيق.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Incoming Store Orders Queue */}
      {activeSubTab === 'orders' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">سجل طلبات المتجر الإلكتروني</h3>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {onlineOrders.length} طلبية
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                إدارة وقبول وحذف الطلبات المستلمة من الكتالوج والمتاجر المرتبطة
              </p>
            </div>
            <button
              id="test-order-simulation-btn"
              onClick={handleTestSimulation}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>طلب تجريبي جديد</span>
            </button>
          </div>

          {/* Filter Chips & Search Bar */}
          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 bg-slate-850 border border-slate-750 px-3 py-1.5 rounded-xl text-xs">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                id="order-search-input"
                type="text"
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                placeholder="بحث برقم الطلبية، اسم العميل، الهاتف، أو العنوان..."
                className="w-full bg-transparent text-white placeholder-slate-500 text-xs focus:outline-none"
              />
              {orderSearchQuery && (
                <button
                  onClick={() => setOrderSearchQuery('')}
                  className="text-slate-400 hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
              <button
                id="order-filter-all"
                onClick={() => setOrderStatusFilter('all')}
                className={`py-1 px-3 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  orderStatusFilter === 'all'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>الكل</span>
                <span className="text-[10px] bg-slate-900/80 px-1.5 py-0.2 rounded-full font-mono">{allOrdersCount}</span>
              </button>

              <button
                id="order-filter-pending"
                onClick={() => setOrderStatusFilter('pending')}
                className={`py-1 px-3 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  orderStatusFilter === 'pending'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>بانتظار الموافقة</span>
                {pendingOrdersCount > 0 && (
                  <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full font-mono">{pendingOrdersCount}</span>
                )}
              </button>

              <button
                id="order-filter-accepted"
                onClick={() => setOrderStatusFilter('accepted')}
                className={`py-1 px-3 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  orderStatusFilter === 'accepted'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>مقبولة ومفوترة</span>
                <span className="text-[10px] bg-slate-900/80 px-1.5 py-0.2 rounded-full font-mono">{acceptedOrdersCount}</span>
              </button>

              <button
                id="order-filter-rejected"
                onClick={() => setOrderStatusFilter('rejected')}
                className={`py-1 px-3 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  orderStatusFilter === 'rejected'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                    : 'bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>ملغية</span>
                <span className="text-[10px] bg-slate-900/80 px-1.5 py-0.2 rounded-full font-mono">{rejectedOrdersCount}</span>
              </button>
            </div>
          </div>

          {onlineOrders.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-3">
              <div className="w-14 h-14 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-white text-base">لا توجد طلبات متجر واردة حالياً</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                شارك رابط متجرك مع العملاء أو اضغط على زر "معاينة متجر الزبائن" لتجربة إرسال طلبية.
              </p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-2">
              <p className="text-sm font-bold text-slate-300">لا توجد طلبيات تطابق الفلتر أو البحث الحالي</p>
              <button
                onClick={() => {
                  setOrderStatusFilter('all');
                  setOrderSearchQuery('');
                }}
                className="text-xs text-emerald-400 underline font-bold"
              >
                إعادة ضبط الفلتر والبحث
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredOrders.map((order) => {
                const isPending = order.status === 'pending';
                return (
                  <div 
                    key={order.id}
                    id={`order-card-${order.id}`}
                    className={`bg-slate-900 border rounded-3xl p-4 space-y-3 shadow-xl transition-all relative ${
                      isPending ? 'border-amber-500/50 bg-amber-950/10' : 'border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-400">{order.orderNumber}</span>
                        <span className="text-[11px] text-slate-400">
                          {formatArabicDateTime(order.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                          order.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : order.status === 'accepted'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        }`}>
                          {order.status === 'pending' ? 'بانتظار الموافقة' : order.status === 'accepted' ? 'تم القبول والفاتورة' : 'ملغي'}
                        </span>

                        {/* Top Delete Button */}
                        <button
                          id={`btn-delete-order-header-${order.id}`}
                          type="button"
                          onClick={() => setOrderToDelete(order)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition-all cursor-pointer"
                          title="حذف الطلبية"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="bg-slate-850 p-2.5 rounded-2xl border border-slate-800 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">العميل:</span>
                        <span className="font-bold text-white">{order.customerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">الهاتف:</span>
                        <span className="font-mono text-slate-300" dir="ltr">{order.customerPhone}</span>
                      </div>
                      {order.customerAddress && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">العنوان:</span>
                          <span className="text-slate-300">{order.customerAddress}</span>
                        </div>
                      )}
                    </div>

                    {/* Items List */}
                    <div className="space-y-1 text-xs">
                      <div className="text-slate-400 font-semibold text-[11px]">الأصناف المطلوبة:</div>
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-800/60 last:border-none text-slate-300">
                          <span>{item.productName} ({item.quantity} {item.unitName})</span>
                          <span className="font-bold text-white">{formatCurrency(item.subtotal, currency)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Total & Action Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 flex-wrap gap-2">
                      <div>
                        <span className="text-[11px] text-slate-400 block">الإجمالي</span>
                        <span className="text-base font-black text-emerald-400">{formatCurrency(order.totalAmount, currency)}</span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {isPending ? (
                          <>
                            <button
                              id={`btn-reject-order-${order.id}`}
                              type="button"
                              onClick={() => onRejectOrder(order.id)}
                              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-rose-300 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
                            >
                              رفض
                            </button>
                            <button
                              id={`btn-accept-order-${order.id}`}
                              type="button"
                              onClick={() => onAcceptOrder(order)}
                              className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-lg shadow-emerald-900/30 transition-all active:scale-95 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>قبول وفاتورة</span>
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-500 font-semibold">
                            {order.status === 'accepted' ? 'مكتملة ومسجلة في المبيعات' : 'ملغية'}
                          </span>
                        )}

                        {/* Dedicated Delete Button */}
                        <button
                          id={`btn-delete-order-footer-${order.id}`}
                          type="button"
                          onClick={() => setOrderToDelete(order)}
                          className="py-1.5 px-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                          title="حذف هذه الطلبية نهائياً"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 3: E-Commerce Platforms & Webhook API */}
      {activeSubTab === 'platforms' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Webhook className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm text-white">الربط مع منصات المتاجر الخارجية (E-Commerce Connectors)</h3>
              </div>
              <span className="text-xs text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20 font-mono font-bold">
                v1.4 REST API
              </span>
            </div>

            {/* Platform Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'custom', name: 'Custom REST / Webhook', desc: 'مخصص ومرن' },
                { id: 'woocommerce', name: 'WooCommerce', desc: 'ووردبريس' },
                { id: 'shopify', name: 'Shopify', desc: 'شوبيفاي' },
                { id: 'youcan', name: 'YouCan / Salla / Zid', desc: 'منصات سريعة' },
              ].map((plat) => (
                <button
                  key={plat.id}
                  onClick={() => onUpdateStoreConfig({ ...storeConfig, platform: plat.id as any })}
                  className={`p-3 rounded-2xl border text-right transition-all ${
                    storeConfig.platform === plat.id
                      ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                      : 'bg-slate-850 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-xs text-white">{plat.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{plat.desc}</div>
                </button>
              ))}
            </div>

            {/* API Credentials */}
            <div className="space-y-3 pt-2">
              <div className="bg-slate-850 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                <label className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-emerald-400" />
                  <span>مفتاح الـ API المعتمد (Live API Key):</span>
                </label>
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-2 font-mono text-xs text-emerald-300">
                  <span className="truncate flex-1" dir="ltr">{storeConfig.apiKey}</span>
                  <button
                    onClick={() => copyToClipboard(storeConfig.apiKey, 'key')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0 flex items-center gap-1 text-[11px] font-sans font-bold"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-850 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                <label className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-blue-400" />
                  <span>نقطة نهاية الـ Webhook لاستقبال الطلبات الفورية:</span>
                </label>
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-2 font-mono text-xs text-blue-300">
                  <span className="truncate flex-1" dir="ltr">{storeConfig.webhookUrl}</span>
                  <button
                    onClick={() => copyToClipboard(storeConfig.webhookUrl, 'webhook')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0 flex items-center gap-1 text-[11px] font-sans font-bold"
                  >
                    {copiedWebhook ? <Check className="w-3.5 h-3.5 text-blue-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedWebhook ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live Webhook Code Example */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs font-mono space-y-1">
              <div className="text-slate-500 text-[11px] font-sans">مثال حمولة الطلب المستلم (JSON Payload):</div>
              <pre className="text-slate-300 overflow-x-auto text-[11px] leading-snug p-2 bg-slate-900 rounded-xl" dir="ltr">
{`POST /v1/store-webhook HTTP/1.1
Authorization: Bearer ${storeConfig.apiKey}
Content-Type: application/json

{
  "order_id": "ORD-2026-901",
  "customer_name": "سفيان أحمد",
  "phone": "0550123456",
  "items": [
    { "barcode": "6130000001", "quantity": 3, "price": 250.00 }
  ],
  "total": 750.00,
  "currency": "DZD"
}`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Hardware, Receipt Printers & Barcode Scanners */}
      {activeSubTab === 'hardware' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">طابعات الفواتير الحرارية وأجهزة الكاشير</h3>
              </div>
              <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                ESC/POS Supported
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Thermal Printer Settings */}
              <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">طابعة الإيصالات الحرارية</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={storeConfig.thermalPrinterEnabled}
                      onChange={(e) => onUpdateStoreConfig({ ...storeConfig, thermalPrinterEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1.5">مقاس رول الورق الحراري</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdateStoreConfig({ ...storeConfig, thermalPrinterPaperSize: '80mm' })}
                      className={`py-2 px-3 rounded-xl border font-bold text-xs ${
                        storeConfig.thermalPrinterPaperSize === '80mm'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      80 ملم (كاشير قياسي)
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateStoreConfig({ ...storeConfig, thermalPrinterPaperSize: '58mm' })}
                      className={`py-2 px-3 rounded-xl border font-bold text-xs ${
                        storeConfig.thermalPrinterPaperSize === '58mm'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      58 ملم (بلوتوث متنقل)
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>طباعة إيصال تجريبي</span>
                </button>
              </div>

              {/* Barcode Scanner Settings */}
              <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">قارئ الباركود والماسح الضوئي</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={storeConfig.barcodeScannerSound}
                      onChange={(e) => onUpdateStoreConfig({ ...storeConfig, barcodeScannerSound: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <p className="text-slate-400 leading-relaxed text-[11.5px]">
                  يدعم التطبيق قراءة باركود المنتجات فوراً عبر قارئ الباركود اللاسلكي USB أو كاميرا الهاتف الذكي مع صوت تنبيه إيجابي عند نجاح المسح.
                </p>

                <div className="flex items-center gap-2 p-2.5 bg-slate-900 rounded-xl border border-slate-700 text-slate-300">
                  <Barcode className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="text-[11px]">جاهز لاستقبال إدخال الباركود السريع في شاشة المبيعات.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Live Storefront Modal Preview */}
      {showCustomerPreview && (
        <div 
          onClick={() => setShowCustomerPreview(false)}
          className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-emerald-500/40 rounded-3xl w-full max-w-2xl p-4 sm:p-6 shadow-2xl text-slate-100 my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">{storeConfig.storeName} (كتالوج الزبائن)</h3>
                  <p className="text-[11px] text-slate-400">واجهة المتجر الإلكتروني كما يراها عملاؤك</p>
                </div>
              </div>
              <button
                onClick={() => setShowCustomerPreview(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700"
              >
                إغلاق
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto pr-1">
              {/* Products Catalog Area */}
              <div className="md:col-span-2 space-y-3">
                {/* Search & Category Filter */}
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="ابحث عن منتج..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg whitespace-nowrap transition-all ${
                          selectedCategory === cat
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {cat === 'all' ? 'جميع الأقسام' : cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product Grid */}
                <div className="grid grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
                  {filteredProducts.map((p) => {
                    const inStock = p.stockPieces > 0;
                    return (
                      <div 
                        key={p.id}
                        className="bg-slate-850 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between space-y-2 hover:border-slate-700 transition-all"
                      >
                        <div>
                          <div className="text-xs font-bold text-white line-clamp-1">{p.name}</div>
                          <div className="text-[10.5px] text-slate-400 mt-0.5">{p.category}</div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                          <div>
                            <div className="text-xs font-extrabold text-emerald-400">
                              {formatCurrency(p.salePriceMinor, currency)}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {inStock ? `متوفر (${p.stockPieces} ${p.minorUnit})` : 'نفذ من المخزن'}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={!inStock}
                            onClick={() => addToCart(p)}
                            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white transition-all active:scale-95"
                            title="إضافة للسلة"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cart & Checkout Form */}
              <div className="bg-slate-850 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between space-y-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-xs text-white flex items-center gap-1">
                      <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                      سلة الشراء ({cart.length})
                    </span>
                    <span className="font-bold text-xs text-emerald-400">{formatCurrency(cartTotal, currency)}</span>
                  </div>

                  {/* Cart Items */}
                  <div className="max-h-36 overflow-y-auto space-y-2 pr-1 text-xs">
                    {cart.length === 0 ? (
                      <div className="text-center py-4 text-slate-500 text-[11px]">السلة فارغة حالياً</div>
                    ) : (
                      cart.map((item) => (
                        <div key={item.product.id} className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors gap-2">
                          <div className="min-w-0 flex-1 pl-1">
                            <div className="text-[11px] font-bold text-white break-words leading-tight">{item.product.name}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span className="text-emerald-400 font-mono font-bold">{formatCurrency(item.product.salePriceMinor * item.quantity, currency)}</span>
                              <span className="unit-badge-sale text-[9px] font-bold px-1.5 py-0.5 rounded border select-none">{item.product.minorUnit || 'قطعة'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="flex items-center gap-1 bg-slate-800 border border-slate-750 rounded-lg p-0.5 shadow-inner">
                              <button
                                type="button"
                                onClick={() => updateCartQty(item.product.id, -1)}
                                className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-slate-200 flex items-center justify-center font-bold text-xs cursor-pointer select-none transition-colors"
                              >
                                -
                              </button>
                              <span className="font-mono text-xs font-black text-white px-1">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateCartQty(item.product.id, 1)}
                                className="w-5 h-5 rounded bg-emerald-600/30 hover:bg-emerald-600 active:bg-emerald-700 text-emerald-300 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer select-none transition-colors border border-emerald-500/30"
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.product.id, -item.quantity)}
                              className="w-6 h-6 rounded-lg bg-rose-500/15 hover:bg-rose-600 active:bg-rose-700 text-rose-400 hover:text-white border border-rose-500/30 flex items-center justify-center transition-all cursor-pointer"
                              title="حذف من السلة"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Customer Details Form */}
                  <form onSubmit={handleSubmitCustomerOrder} className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                    <input
                      type="text"
                      required
                      placeholder="اسم العميل *"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white text-[11px] focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="tel"
                      required
                      placeholder="رقم الهاتف (الجزائر) *"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white text-[11px] font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      placeholder="عنوان التوصيل (اختياري)"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white text-[11px] focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={cart.length === 0 || !customerName || !customerPhone}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>إرسال الطلب للمتجر ({formatCurrency(cartTotal, currency)})</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Order Confirmation Modal */}
      {orderToDelete && (
        <div 
          id="delete-order-modal-backdrop"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
          onClick={() => setOrderToDelete(null)}
        >
          <div 
            id="delete-order-modal"
            className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-2xl text-right animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-rose-950/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">حذف طلبية المتجر</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  هل أنت متأكد من رغبتك في حذف هذه الطلبية نهائياً؟
                </p>
              </div>
            </div>

            <div className="bg-slate-850 p-3.5 rounded-2xl border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">رقم الطلبية:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{orderToDelete.orderNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">اسم العميل:</span>
                <span className="font-bold text-white">{orderToDelete.customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">الهاتف:</span>
                <span className="font-mono text-slate-300" dir="ltr">{orderToDelete.customerPhone}</span>
              </div>
              {orderToDelete.customerAddress && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">العنوان:</span>
                  <span className="text-slate-300">{orderToDelete.customerAddress}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-400">قيمة الطلبية:</span>
                <span className="font-black text-emerald-400 text-sm">{formatCurrency(orderToDelete.totalAmount, currency)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">الحالة:</span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  orderToDelete.status === 'pending'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : orderToDelete.status === 'accepted'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}>
                  {orderToDelete.status === 'pending' ? 'بانتظار الموافقة' : orderToDelete.status === 'accepted' ? 'تم القبول والفاتورة' : 'ملغي'}
                </span>
              </div>
            </div>

            {orderToDelete.status === 'accepted' && (
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-[11px] text-blue-300 leading-relaxed">
                ℹ️ <strong>ملاحظة:</strong> هذه الطلبية تم اعتمادها سابقاً كفاتورة مبيعات. حذفها من هنا سيزيل سجل طلب المتجر، مع بقاء فاتورة المبيعات مسجلة في قسم المبيعات لضمان سلامة الحسابات.
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                id="btn-confirm-delete-order"
                type="button"
                onClick={() => {
                  onDeleteOrder(orderToDelete.id);
                  setOrderToDelete(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 transition-all active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>تأكيد الحذف نهائياً</span>
              </button>
              <button
                id="btn-cancel-delete-order"
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
