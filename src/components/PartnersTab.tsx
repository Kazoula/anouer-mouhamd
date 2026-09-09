import React, { useState } from 'react';
import { 
  Users, 
  Truck, 
  UserCheck, 
  Plus, 
  Search, 
  Phone, 
  MapPin, 
  Building, 
  FileText, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  Receipt,
  ShoppingCart,
  Calendar,
  FileSpreadsheet
} from 'lucide-react';
import { Supplier, Customer, SaleInvoice, PurchaseInvoice } from '../types';
import { formatCurrency, formatArabicDateTime } from '../utils/calculations';
import { ImportPartnersModal } from './ImportPartnersModal';

interface PartnersTabProps {
  suppliers: Supplier[];
  customers: Customer[];
  sales: SaleInvoice[];
  purchases: PurchaseInvoice[];
  currency: string;
  onSaveSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
  onSaveCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onBulkImportCustomers?: (customers: Customer[], strategy: 'update' | 'skip' | 'replace') => void;
  onBulkImportSuppliers?: (suppliers: Supplier[], strategy: 'update' | 'skip' | 'replace') => void;
  onStartSaleForCustomer: (customerId: string) => void;
  onStartPurchaseForSupplier: (supplierId: string) => void;
  onOpenSaleInvoice: (invoice: SaleInvoice) => void;
  onOpenPurchaseInvoice: (invoice: PurchaseInvoice) => void;
}

export const PartnersTab: React.FC<PartnersTabProps> = ({
  suppliers,
  customers,
  sales,
  purchases,
  currency,
  onSaveSupplier,
  onDeleteSupplier,
  onSaveCustomer,
  onDeleteCustomer,
  onBulkImportCustomers,
  onBulkImportSuppliers,
  onStartSaleForCustomer,
  onStartPurchaseForSupplier,
  onOpenSaleInvoice,
  onOpenPurchaseInvoice,
}) => {
  const [partnerType, setPartnerType] = useState<'suppliers' | 'customers'>('suppliers');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierFormData, setSupplierFormData] = useState<Partial<Supplier>>({
    name: '',
    phone: '',
    company: '',
    address: '',
    balance: 0,
  });

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerFormData, setCustomerFormData] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    address: '',
    balance: 0,
  });

  // Deletion Modals
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // Statement Drawer Modal
  const [statementPartner, setStatementPartner] = useState<{ type: 'supplier' | 'customer'; data: Supplier | Customer } | null>(null);

  // Filtered and sorted lists
  const cleanSearch = searchQuery.trim().toLowerCase();
  const isSearching = cleanSearch.length > 0;

  // Counts of zero-balance partners
  const zeroBalanceSuppliersCount = suppliers.filter(s => Math.abs(Number(s.balance) || 0) <= 0.001).length;
  const zeroBalanceCustomersCount = customers.filter(c => Math.abs(Number(c.balance) || 0) <= 0.001).length;

  // Filtered Suppliers:
  // 1. If not searching, hide records with 0 balance
  // 2. If searching, show all matching records including 0 balance
  // 3. Sort from highest balance/price down to lowest
  const filteredSuppliers = suppliers
    .filter(s => {
      const matchesSearch = !isSearching || (
        s.name.toLowerCase().includes(cleanSearch) ||
        (s.phone && s.phone.includes(cleanSearch)) ||
        (s.company && s.company.toLowerCase().includes(cleanSearch)) ||
        (s.address && s.address.toLowerCase().includes(cleanSearch))
      );

      if (!matchesSearch) return false;

      // If search box is empty, hide zero-balance suppliers
      if (!isSearching) {
        return Math.abs(Number(s.balance) || 0) > 0.001;
      }

      return true;
    })
    .sort((a, b) => {
      const balA = Number(a.balance) || 0;
      const balB = Number(b.balance) || 0;
      if (balB !== balA) {
        return balB - balA; // From highest down
      }
      return a.name.localeCompare(b.name, 'ar');
    });

  // Filtered Customers:
  // 1. If not searching, hide records with 0 balance
  // 2. If searching, show all matching records including 0 balance
  // 3. Sort from highest balance/price down to lowest
  const filteredCustomers = customers
    .filter(c => {
      const matchesSearch = !isSearching || (
        c.name.toLowerCase().includes(cleanSearch) ||
        (c.phone && c.phone.includes(cleanSearch)) ||
        (c.address && c.address.toLowerCase().includes(cleanSearch))
      );

      if (!matchesSearch) return false;

      // If search box is empty, hide zero-balance customers
      if (!isSearching) {
        return Math.abs(Number(c.balance) || 0) > 0.001;
      }

      return true;
    })
    .sort((a, b) => {
      const balA = Number(a.balance) || 0;
      const balB = Number(b.balance) || 0;
      if (balB !== balA) {
        return balB - balA; // From highest down
      }
      return a.name.localeCompare(b.name, 'ar');
    });

  // Supplier Add / Edit
  const openAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierFormData({ name: '', phone: '', company: '', address: '', balance: 0 });
    setIsSupplierModalOpen(true);
  };

  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSupplierFormData({ ...s });
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierFormData.name?.trim()) return;

    const newSup: Supplier = {
      id: editingSupplier ? editingSupplier.id : `sup_${Date.now()}`,
      name: supplierFormData.name.trim(),
      phone: supplierFormData.phone?.trim() || '',
      company: supplierFormData.company?.trim() || '',
      address: supplierFormData.address?.trim() || '',
      balance: Number(supplierFormData.balance) || 0,
      createdAt: editingSupplier ? editingSupplier.createdAt : new Date().toISOString(),
    };

    onSaveSupplier(newSup);
    setIsSupplierModalOpen(false);
  };

  // Customer Add / Edit
  const openAddCustomer = () => {
    setEditingCustomer(null);
    setCustomerFormData({ name: '', phone: '', address: '', balance: 0 });
    setIsCustomerModalOpen(true);
  };

  const openEditCustomer = (c: Customer) => {
    setEditingCustomer(c);
    setCustomerFormData({ ...c });
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerFormData.name?.trim()) return;

    const newCust: Customer = {
      id: editingCustomer ? editingCustomer.id : `cust_${Date.now()}`,
      name: customerFormData.name.trim(),
      phone: customerFormData.phone?.trim() || '',
      address: customerFormData.address?.trim() || '',
      balance: Number(customerFormData.balance) || 0,
      createdAt: editingCustomer ? editingCustomer.createdAt : new Date().toISOString(),
    };

    onSaveCustomer(newCust);
    setIsCustomerModalOpen(false);
  };

  return (
    <div className="space-y-4 pb-20 pt-2 px-3 sm:px-4">
      {/* Type Switcher Tabs */}
      <div className="grid grid-cols-2 gap-2 bg-slate-850 p-1.5 rounded-2xl border border-slate-800">
        <button
          onClick={() => setPartnerType('suppliers')}
          className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            partnerType === 'suppliers'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>سجل الموردين ({suppliers.length})</span>
        </button>

        <button
          onClick={() => setPartnerType('customers')}
          className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            partnerType === 'customers'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>سجل العملاء ({customers.length})</span>
        </button>
      </div>

      {/* Search & Add Action Bar */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            placeholder={
              partnerType === 'suppliers' 
                ? "بحث في الموردين (اكتب هنا للبحث وإظهار الأرصدة 0)..." 
                : "بحث في العملاء (اكتب هنا للبحث وإظهار الأرصدة 0)..."
            }
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
          <button
            id="import-partners-sheet-btn"
            onClick={() => setIsImportModalOpen(true)}
            className={`font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 border shadow-md active:scale-95 transition-all ${
              partnerType === 'suppliers'
                ? 'bg-slate-800 hover:bg-slate-750 text-blue-400 border-blue-500/40 hover:border-blue-400'
                : 'bg-slate-800 hover:bg-slate-750 text-emerald-400 border-emerald-500/40 hover:border-emerald-400'
            }`}
            title={`استيراد جماعي لـ ${partnerType === 'suppliers' ? 'الموردين' : 'العملاء'} من ملف Excel أو Google Sheets`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>استيراد من الشيت</span>
          </button>

          <button
            onClick={partnerType === 'suppliers' ? openAddSupplier : openAddCustomer}
            className={`font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 text-white shadow-lg shrink-0 active:scale-95 transition-all ${
              partnerType === 'suppliers' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{partnerType === 'suppliers' ? 'مورد جديد' : 'عميل جديد'}</span>
          </button>
        </div>
      </div>

      {/* Active Sort & Zero-Balance Visibility Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700/80 font-bold text-[11px] shadow-sm">
            <span className="text-amber-400 font-black">↓</span>
            <span>مرتب تنازلياً من أعلى رصيد للأدنى</span>
          </span>

          {!isSearching && (partnerType === 'suppliers' ? zeroBalanceSuppliersCount : zeroBalanceCustomersCount) > 0 && (
            <span className="text-[11px] text-amber-300/90 flex items-center gap-1.5 bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-600/30">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
              <span>
                تم إخفاء {partnerType === 'suppliers' ? zeroBalanceSuppliersCount : zeroBalanceCustomersCount} حساب رصيدهم 0 (اكتب في البحث لعرضهم)
              </span>
            </span>
          )}

          {isSearching && (
            <span className="text-[11px] text-emerald-300 flex items-center gap-1.5 bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-600/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
              <span>
                عرض نتائج البحث بما فيها الأرصدة 0 ({partnerType === 'suppliers' ? filteredSuppliers.length : filteredCustomers.length} نتيجة)
              </span>
            </span>
          )}
        </div>

        <span className="text-[11px] text-slate-400 font-mono">
          معروض: {partnerType === 'suppliers' ? filteredSuppliers.length : filteredCustomers.length} من {partnerType === 'suppliers' ? suppliers.length : customers.length}
        </span>
      </div>

      {/* Partners List */}
      {partnerType === 'suppliers' ? (
        /* Suppliers List */
        <div className="space-y-3">
          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs bg-slate-850 rounded-2xl border border-slate-800 p-6 space-y-2">
              {isSearching ? (
                <>
                  <p className="font-bold text-slate-300">لا يوجد موردين مطابقين للبحث "{searchQuery}"</p>
                  <p className="text-[11px] text-slate-500">تأكد من كتابة الاسم أو رقم الهاتف بشكل صحيح.</p>
                </>
              ) : suppliers.length > 0 && zeroBalanceSuppliersCount === suppliers.length ? (
                <>
                  <p className="font-bold text-slate-300">جميع الموردين ({suppliers.length}) رصيدهم 0 (خالص الحساب)</p>
                  <p className="text-[11px] text-slate-400">
                    تم إخفاؤهم تلقائياً. اكتب اسم المورد في خانة البحث أعلاه لإظهار بطاقته وكشف حسابه فوراً.
                  </p>
                </>
              ) : (
                <p className="text-slate-500">لا يوجد موردين مطابقين للبحث</p>
              )}
            </div>
          ) : (
            filteredSuppliers.map((supplier, idx) => {
              const supplierPurchases = purchases.filter(p => p.supplierId === supplier.id || p.supplierName === supplier.name);
              const totalPurchasedFrom = supplierPurchases.reduce((acc, p) => acc + p.netAmount, 0);

              return (
                <div
                  key={supplier.id}
                  className="bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 shadow-md transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl ${supplier.balance > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'} flex items-center justify-center font-black text-xs shrink-0`}>
                          #{idx + 1}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-white">{supplier.name}</h3>
                          {supplier.company && (
                            <span className="text-[11px] text-slate-400">{supplier.company}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                        {supplier.phone && (
                          <a 
                            href={`tel:${supplier.phone}`}
                            className="flex items-center gap-1 text-blue-400 hover:underline font-mono"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>{supplier.phone}</span>
                          </a>
                        )}
                        {supplier.address && (
                          <span className="flex items-center gap-1 text-slate-400">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            <span>{supplier.address}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditSupplier(supplier)}
                        className="p-1.5 rounded-lg bg-slate-800 text-amber-400 hover:text-amber-300 border border-slate-700"
                        title="تعديل بيانات المورد"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setSupplierToDelete(supplier)}
                        className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:text-white hover:bg-rose-600 border border-rose-500/30 hover:border-rose-600 transition-all cursor-pointer"
                        title="حذف المورد"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Financial Stats Bar */}
                  <div className="bg-slate-900/80 rounded-xl p-2.5 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 block">إجمالي التعاملات والتوريد:</span>
                      <span className="font-bold text-white">{formatCurrency(totalPurchasedFrom, currency)}</span>
                      <span className="text-[10px] text-slate-500 mr-1">({supplierPurchases.length} فواتير)</span>
                    </div>

                    <div className="text-left">
                      <span className="text-[11px] text-slate-400 block">رصيد الحساب المالي:</span>
                      <span className={`font-bold ${supplier.balance > 0 ? 'text-amber-400 font-mono' : 'text-slate-400'}`}>
                        {supplier.balance > 0 ? `مستحق له: ${formatCurrency(supplier.balance, currency)}` : 'خالص الحساب (0)'}
                      </span>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/80">
                    <button
                      onClick={() => setStatementPartner({ type: 'supplier', data: supplier })}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 border border-slate-700"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      <span>كشف الحساب والفواتير</span>
                    </button>
                    <button
                      onClick={() => onStartPurchaseForSupplier(supplier.id)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center gap-1"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>فاتورة شراء جديدة</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Customers List */
        <div className="space-y-3">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs bg-slate-850 rounded-2xl border border-slate-800 p-6 space-y-2">
              {isSearching ? (
                <>
                  <p className="font-bold text-slate-300">لا يوجد عملاء مطابقين للبحث "{searchQuery}"</p>
                  <p className="text-[11px] text-slate-500">تأكد من كتابة الاسم أو رقم الهاتف بشكل صحيح.</p>
                </>
              ) : customers.length > 0 && zeroBalanceCustomersCount === customers.length ? (
                <>
                  <p className="font-bold text-slate-300">جميع العملاء ({customers.length}) رصيدهم 0 (خالص الحساب)</p>
                  <p className="text-[11px] text-slate-400">
                    تم إخفاؤهم تلقائياً. اكتب اسم العميل في خانة البحث أعلاه لإظهار بطاقته وكشف حسابه فوراً.
                  </p>
                </>
              ) : (
                <p className="text-slate-500">لا يوجد عملاء مطابقين للبحث</p>
              )}
            </div>
          ) : (
            filteredCustomers.map((customer, idx) => {
              const customerSales = sales.filter(s => s.customerId === customer.id || s.customerName === customer.name);
              const totalPurchasedBy = customerSales.reduce((acc, s) => acc + s.netAmount, 0);

              return (
                <div
                  key={customer.id}
                  className="bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 shadow-md transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl ${customer.balance > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'} flex items-center justify-center font-black text-xs shrink-0`}>
                          #{idx + 1}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-white">{customer.name}</h3>
                          {customer.address && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              <span>{customer.address}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {customer.phone && (
                        <div className="mt-2">
                          <a 
                            href={`tel:${customer.phone}`}
                            className="inline-flex items-center gap-1 text-emerald-400 hover:underline text-xs font-mono"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>{customer.phone}</span>
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditCustomer(customer)}
                        className="p-1.5 rounded-lg bg-slate-800 text-amber-400 hover:text-amber-300 border border-slate-700"
                        title="تعديل بيانات العميل"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setCustomerToDelete(customer)}
                        className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:text-white hover:bg-rose-600 border border-rose-500/30 hover:border-rose-600 transition-all cursor-pointer"
                        title="حذف العميل"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Financial Stats Bar */}
                  <div className="bg-slate-900/80 rounded-xl p-2.5 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 block">إجمالي مشتريات العميل:</span>
                      <span className="font-bold text-emerald-400">{formatCurrency(totalPurchasedBy, currency)}</span>
                      <span className="text-[10px] text-slate-500 mr-1">({customerSales.length} فواتير)</span>
                    </div>

                    <div className="text-left">
                      <span className="text-[11px] text-slate-400 block">الرصيد والذمم:</span>
                      <span className={`font-bold ${customer.balance > 0 ? 'text-amber-400 font-mono' : 'text-slate-400'}`}>
                        {customer.balance > 0 ? `مطلوب منه: ${formatCurrency(customer.balance, currency)}` : 'خالص الحساب (0)'}
                      </span>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/80">
                    <button
                      onClick={() => setStatementPartner({ type: 'customer', data: customer })}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 border border-slate-700"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      <span>كشف حساب الفواتير</span>
                    </button>
                    <button
                      onClick={() => onStartSaleForCustomer(customer.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>فاتورة بيع جديدة</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add / Edit Supplier Modal */}
      {isSupplierModalOpen && (
        <div 
          onClick={() => setIsSupplierModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-4 sm:p-5 shadow-2xl text-slate-100 my-auto animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">
                  {editingSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
                </h3>
              </div>
              <button
                onClick={() => setIsSupplierModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplierSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">اسم المورد أو المسؤول *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شركة الأغذية المتحدة"
                  value={supplierFormData.name || ''}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">رقم الهاتف / الجوال</label>
                  <input
                    type="text"
                    placeholder="05xxxxxxxx"
                    value={supplierFormData.phone || ''}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">اسم المؤسسة / الشركة</label>
                  <input
                    type="text"
                    placeholder="المؤسسة التجارية"
                    value={supplierFormData.company || ''}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, company: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">العنوان / المدينة</label>
                <input
                  type="text"
                  placeholder="الرياض - حي الملز..."
                  value={supplierFormData.address || ''}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">الرصيد الافتتاحي المستحق له</label>
                <input
                  type="number"
                  step="0.01"
                  value={supplierFormData.balance ?? 0}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, balance: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  <span>حفظ المورد</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {isCustomerModalOpen && (
        <div 
          onClick={() => setIsCustomerModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-4 sm:p-5 shadow-2xl text-slate-100 my-auto animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">
                  {editingCustomer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
                </h3>
              </div>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">اسم العميل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: تموينات البركة / فهد العتيبي"
                  value={customerFormData.name || ''}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">رقم الهاتف / الجوال</label>
                <input
                  type="text"
                  placeholder="05xxxxxxxx"
                  value={customerFormData.phone || ''}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">العنوان / الفرع</label>
                <input
                  type="text"
                  placeholder="الرياض - حي الصحافة..."
                  value={customerFormData.address || ''}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, address: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">الرصيد والمديونية المسبقة</label>
                <input
                  type="number"
                  step="0.01"
                  value={customerFormData.balance ?? 0}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, balance: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  <span>حفظ العميل</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Statement Drawer Modal */}
      {statementPartner && (
        <div 
          onClick={() => setStatementPartner(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-4 sm:p-5 shadow-2xl text-slate-100 my-auto max-h-[90vh] flex flex-col animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-base">
                    كشف حساب {statementPartner.type === 'supplier' ? 'المورد' : 'العميل'}
                  </h3>
                  <p className="text-xs text-slate-400">{statementPartner.data.name}</p>
                </div>
              </div>
              <button
                onClick={() => setStatementPartner(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Statement Summary */}
            <div className="py-3 border-b border-slate-800 bg-slate-850 p-3 rounded-2xl my-2 shrink-0 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">الهاتف:</span>
                <span className="font-mono text-white">{statementPartner.data.phone || 'غير مسجل'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">رصيد الحساب المسجل:</span>
                <span className="font-bold text-amber-400">{formatCurrency(statementPartner.data.balance, currency)}</span>
              </div>
            </div>

            {/* Invoices List */}
            <div className="overflow-y-auto space-y-2 py-2 flex-1">
              {statementPartner.type === 'supplier' ? (
                (() => {
                  const supPurchases = purchases.filter(p => p.supplierId === statementPartner.data.id || p.supplierName === statementPartner.data.name);
                  if (supPurchases.length === 0) {
                    return <div className="text-center py-6 text-slate-500 text-xs">لا توجد فواتير توريد مسجلة لهذا المورد</div>;
                  }
                  return supPurchases.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => {
                        onOpenPurchaseInvoice(p);
                        setStatementPartner(null);
                      }}
                      className="bg-slate-800/80 hover:bg-slate-800 p-2.5 rounded-xl border border-slate-750 flex items-center justify-between text-xs cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-white font-mono">{p.invoiceNumber}</div>
                        <div className="text-[10.5px] text-slate-400 mt-0.5">{formatArabicDateTime(p.date)}</div>
                      </div>
                      <div className="text-left">
                        <div className="font-black text-blue-400">{formatCurrency(p.netAmount, currency)}</div>
                        <span className="text-[10px] text-slate-400">{p.items.length} أصناف</span>
                      </div>
                    </div>
                  ));
                })()
              ) : (
                (() => {
                  const custSales = sales.filter(s => s.customerId === statementPartner.data.id || s.customerName === statementPartner.data.name);
                  if (custSales.length === 0) {
                    return <div className="text-center py-6 text-slate-500 text-xs">لا توجد فواتير بيع مسجلة لهذا العميل</div>;
                  }
                  return custSales.map(s => (
                    <div 
                      key={s.id} 
                      onClick={() => {
                        onOpenSaleInvoice(s);
                        setStatementPartner(null);
                      }}
                      className="bg-slate-800/80 hover:bg-slate-800 p-2.5 rounded-xl border border-slate-750 flex items-center justify-between text-xs cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-white font-mono">{s.invoiceNumber}</div>
                        <div className="text-[10.5px] text-slate-400 mt-0.5">{formatArabicDateTime(s.date)}</div>
                      </div>
                      <div className="text-left">
                        <div className="font-black text-emerald-400">{formatCurrency(s.netAmount, currency)}</div>
                        <span className="text-[10px] text-slate-400">ربح: {formatCurrency(s.totalProfit, currency)}</span>
                      </div>
                    </div>
                  ));
                })()
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 shrink-0">
              <button
                onClick={() => setStatementPartner(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Supplier Confirmation Modal */}
      {supplierToDelete && (
        <div 
          onClick={() => setSupplierToDelete(null)}
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
                <h3 className="font-black text-base text-white">تأكيد حذف المورد</h3>
                <p className="text-xs text-slate-400">سيتم إزالة بيانات المورد من قائمة الشركاء</p>
              </div>
            </div>

            <div className="bg-slate-850 border border-slate-800 rounded-2xl p-3.5 space-y-2 mb-4 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">اسم المورد:</span>
                <span className="font-black text-white">{supplierToDelete.name}</span>
              </div>
              {supplierToDelete.company && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">الشركة:</span>
                  <span className="text-slate-300">{supplierToDelete.company}</span>
                </div>
              )}
              {supplierToDelete.phone && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">الهاتف:</span>
                  <span className="font-mono text-slate-300">{supplierToDelete.phone}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSupplierToDelete(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs border border-slate-700 transition-colors"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteSupplier(supplierToDelete.id);
                  setSupplierToDelete(null);
                }}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-950/50 flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>تأكيد الحذف</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation Modal */}
      {customerToDelete && (
        <div 
          onClick={() => setCustomerToDelete(null)}
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
                <h3 className="font-black text-base text-white">تأكيد حذف العميل</h3>
                <p className="text-xs text-slate-400">سيتم إزالة بيانات العميل من قائمة الشركاء</p>
              </div>
            </div>

            <div className="bg-slate-850 border border-slate-800 rounded-2xl p-3.5 space-y-2 mb-4 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">اسم العميل:</span>
                <span className="font-black text-white">{customerToDelete.name}</span>
              </div>
              {customerToDelete.phone && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">الهاتف:</span>
                  <span className="font-mono text-slate-300">{customerToDelete.phone}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs border border-slate-700 transition-colors"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteCustomer(customerToDelete.id);
                  setCustomerToDelete(null);
                }}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-950/50 flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>تأكيد الحذف</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Partners Modal */}
      <ImportPartnersModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        defaultType={partnerType}
        existingCustomers={customers}
        existingSuppliers={suppliers}
        currency={currency}
        onBulkImportCustomers={onBulkImportCustomers || (() => {})}
        onBulkImportSuppliers={onBulkImportSuppliers || (() => {})}
      />
    </div>
  );
};
