import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ArrowRight, 
  Users, 
  Truck, 
  HelpCircle, 
  Sparkles, 
  Copy, 
  Table, 
  ArrowDownToLine,
  Phone,
  Building,
  MapPin,
  DollarSign,
  CreditCard,
  Calendar,
  Activity
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Customer, Supplier } from '../types';
import { formatCurrency } from '../utils/calculations';

interface ImportPartnersModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'customers' | 'suppliers';
  existingCustomers: Customer[];
  existingSuppliers: Supplier[];
  currency: string;
  onBulkImportCustomers: (customers: Customer[], strategy: 'update' | 'skip' | 'replace') => void;
  onBulkImportSuppliers: (suppliers: Supplier[], strategy: 'update' | 'skip' | 'replace') => void;
}

interface CustomerMapping {
  name: string;
  phone: string;
  address: string;
  balance: string;
  creditLimit: string;
  lastTransactionDate: string;
  isActive: string;
  notes: string;
}

interface SupplierMapping {
  name: string;
  phone: string;
  company: string;
  address: string;
  balance: string;
  creditLimit: string;
  lastTransactionDate: string;
  isActive: string;
  notes: string;
}

interface ParsedCustomerRow {
  raw: Record<string, any>;
  mapped: Partial<Customer>;
  isDuplicate: boolean;
  existingMatch?: Customer;
  hasErrors: boolean;
  errorMessages: string[];
  selected: boolean;
}

interface ParsedSupplierRow {
  raw: Record<string, any>;
  mapped: Partial<Supplier>;
  isDuplicate: boolean;
  existingMatch?: Supplier;
  hasErrors: boolean;
  errorMessages: string[];
  selected: boolean;
}

export const ImportPartnersModal: React.FC<ImportPartnersModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'customers',
  existingCustomers,
  existingSuppliers,
  currency,
  onBulkImportCustomers,
  onBulkImportSuppliers,
}) => {
  const [partnerType, setPartnerType] = useState<'customers' | 'suppliers'>(defaultType);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [pastedText, setPastedText] = useState<string>('');
  const [importStrategy, setImportStrategy] = useState<'update' | 'skip' | 'replace'>('update');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Mappings
  const [customerMapping, setCustomerMapping] = useState<CustomerMapping>({
    name: '',
    phone: '',
    address: '',
    balance: '',
    creditLimit: '',
    lastTransactionDate: '',
    isActive: '',
    notes: '',
  });

  const [supplierMapping, setSupplierMapping] = useState<SupplierMapping>({
    name: '',
    phone: '',
    company: '',
    address: '',
    balance: '',
    creditLimit: '',
    lastTransactionDate: '',
    isActive: '',
    notes: '',
  });

  // Parsed rows
  const [processedCustomerRows, setProcessedCustomerRows] = useState<ParsedCustomerRow[]>([]);
  const [processedSupplierRows, setProcessedSupplierRows] = useState<ParsedSupplierRow[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'new' | 'duplicates' | 'errors'>('all');
  const [searchFilter, setSearchFilter] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Auto-detect columns
  const autoDetectMapping = (headers: string[], type: 'customers' | 'suppliers') => {
    const findHeader = (aliases: string[]): string => {
      const match = headers.find(h => {
        const cleaned = h.toLowerCase().trim().replace(/[\s_-]+/g, '');
        return aliases.some(a => cleaned.includes(a.toLowerCase().trim().replace(/[\s_-]+/g, '')));
      });
      return match || '';
    };

    if (type === 'customers') {
      return {
        name: findHeader(['اسم العميل', 'اسم الزبون', 'العميل', 'الزبون', 'اسم_العميل', 'الاسم', 'name', 'customer', 'client', 'nom']),
        phone: findHeader(['رقم الهاتف', 'الهاتف', 'الجوال', 'الموبايل', 'رقم الجوال', 'phone', 'mobile', 'tel', 'telephone']),
        address: findHeader(['العنوان', 'المنطقة', 'المدينة', 'الموقع', 'address', 'city', 'adresse']),
        balance: findHeader(['الرصيد', 'الرصيد الافتتاحي', 'المديونية', 'الحساب', 'المستحق', 'balance', 'solde', 'due']),
        creditLimit: findHeader(['حد الائتمان', 'حد الإئتمان', 'الائتمان', 'الإئتمان', 'سقف الائتمان', 'حد الدين', 'credit limit', 'credit_limit', 'limit', 'plafond']),
        lastTransactionDate: findHeader(['آخر تعامل', 'اخر تعامل', 'تاريخ آخر تعامل', 'تاريخ اخر تعامل', 'اخر حركة', 'آخر حركة', 'تاريخ الحركة', 'last transaction', 'last_transaction', 'last deal', 'last_deal', 'date']),
        isActive: findHeader(['نشط', 'الحالة', 'نشط؟', 'حالة الشريك', 'حالة الحساب', 'حالة العميل', 'active', 'status', 'actif', 'statut']),
        notes: findHeader(['ملاحظات', 'الوصف', 'تفاصيل', 'notes', 'remarques', 'comment']),
      };
    } else {
      return {
        name: findHeader(['اسم المورد', 'المورد', 'اسم_المورد', 'الاسم', 'name', 'supplier', 'fournisseur', 'vendor']),
        phone: findHeader(['رقم الهاتف', 'الهاتف', 'الجوال', 'الموبايل', 'phone', 'mobile', 'tel']),
        company: findHeader(['الشركة', 'المؤسسة', 'اسم الشركة', 'المصنع', 'company', 'societe', 'enterprise']),
        address: findHeader(['العنوان', 'المقر', 'المدينة', 'الموقع', 'address', 'city', 'adresse']),
        balance: findHeader(['الرصيد', 'الرصيد الافتتاحي', 'المستحق للمورد', 'الحساب', 'balance', 'solde']),
        creditLimit: findHeader(['حد الائتمان', 'حد الإئتمان', 'الائتمان', 'الإئتمان', 'سقف الائتمان', 'حد الدين', 'credit limit', 'credit_limit', 'limit', 'plafond']),
        lastTransactionDate: findHeader(['آخر تعامل', 'اخر تعامل', 'تاريخ آخر تعامل', 'تاريخ اخر تعامل', 'اخر حركة', 'آخر حركة', 'تاريخ الحركة', 'last transaction', 'last_transaction', 'last deal', 'last_deal', 'date']),
        isActive: findHeader(['نشط', 'الحالة', 'نشط؟', 'حالة الشريك', 'حالة الحساب', 'حالة المورد', 'active', 'status', 'actif', 'statut']),
        notes: findHeader(['ملاحظات', 'الوصف', 'تفاصيل', 'notes', 'remarques']),
      };
    }
  };

  const handlePartnerTypeSwitch = (type: 'customers' | 'suppliers') => {
    setPartnerType(type);
    setStep('upload');
    setRawHeaders([]);
    setRawRows([]);
    setFileName('');
    setPastedText('');
    setErrorMessage(null);
  };

  // Process File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMessage(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
        
        if (!data || data.length === 0) {
          setErrorMessage('الملف لا يحتوي على أي صفوف صالحة.');
          setIsLoading(false);
          return;
        }

        const headers = Object.keys(data[0] || {});
        setRawHeaders(headers);
        setRawRows(data);

        if (partnerType === 'customers') {
          setCustomerMapping(autoDetectMapping(headers, 'customers') as CustomerMapping);
        } else {
          setSupplierMapping(autoDetectMapping(headers, 'suppliers') as SupplierMapping);
        }

        setIsLoading(false);
        setStep('mapping');
      } catch (err) {
        console.error('Error reading spreadsheet', err);
        setErrorMessage('تعذر قراءة ملف الشيت. يرجى التأكد من صلاحة الملف (.xlsx, .xls, .csv).');
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setErrorMessage('فشل في قراءة الملف.');
      setIsLoading(false);
    };

    reader.readAsBinaryString(file);
  };

  // Process Pasted Text
  const handleProcessPastedText = () => {
    if (!pastedText.trim()) {
      setErrorMessage('يرجى لصق بيانات جدولية من الشيت أولاً.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      setFileName('بيانات ملصوقة من الشيت (Clipboard)');

      const lines = pastedText.trim().split(/\r?\n/);
      if (lines.length === 0) {
        setErrorMessage('النص الملصوق فارغ.');
        setIsLoading(false);
        return;
      }

      const firstLine = lines[0];
      let delimiter = '\t';
      if (firstLine.includes('\t')) delimiter = '\t';
      else if (firstLine.includes(';') && !firstLine.includes('\t')) delimiter = ';';
      else if (firstLine.includes(',') && !firstLine.includes('\t')) delimiter = ',';

      const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
      const rows: Record<string, any>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const values = line.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
        const rowObj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] !== undefined ? values[idx] : '';
        });
        rows.push(rowObj);
      }

      if (rows.length === 0) {
        setErrorMessage('لم يتم العثور على صفوف صالحة في البيانات الملصوقة.');
        setIsLoading(false);
        return;
      }

      setRawHeaders(headers);
      setRawRows(rows);

      if (partnerType === 'customers') {
        setCustomerMapping(autoDetectMapping(headers, 'customers') as CustomerMapping);
      } else {
        setSupplierMapping(autoDetectMapping(headers, 'suppliers') as SupplierMapping);
      }

      setIsLoading(false);
      setStep('mapping');
    } catch (err) {
      console.error('Error parsing pasted text', err);
      setErrorMessage('تعذر معالجة النص الملصوق.');
      setIsLoading(false);
    }
  };

  // Proceed to preview
  const handleProceedToPreview = () => {
    if (partnerType === 'customers') {
      if (!customerMapping.name) {
        setErrorMessage('عمود "اسم العميل" إلزامي. يرجى تحديده للمتابعة.');
        return;
      }

      setErrorMessage(null);

      const processed: ParsedCustomerRow[] = rawRows.map((rawRow, idx) => {
        const nameVal = String(rawRow[customerMapping.name] || '').trim();
        const phoneVal = customerMapping.phone ? String(rawRow[customerMapping.phone] || '').trim() : '';
        const addressVal = customerMapping.address ? String(rawRow[customerMapping.address] || '').trim() : '';
        const balRaw = customerMapping.balance ? parseFloat(String(rawRow[customerMapping.balance]).replace(/[^0-9.-]+/g, '')) : 0;
        const balanceVal = !isNaN(balRaw) ? balRaw : 0;

        const creditLimitRaw = customerMapping.creditLimit ? parseFloat(String(rawRow[customerMapping.creditLimit]).replace(/[^0-9.-]+/g, '')) : undefined;
        const creditLimitVal = creditLimitRaw !== undefined && !isNaN(creditLimitRaw) ? creditLimitRaw : undefined;
        const lastTxDateVal = customerMapping.lastTransactionDate ? String(rawRow[customerMapping.lastTransactionDate] || '').trim() : '';
        let isActiveVal = true;
        if (customerMapping.isActive) {
          const actRaw = String(rawRow[customerMapping.isActive] || '').trim().toLowerCase();
          if (['لا', 'غير نشط', 'معطل', 'موقوف', 'false', '0', 'non', 'inactif', 'inactive', 'no'].includes(actRaw)) {
            isActiveVal = false;
          }
        }

        const errorMessages: string[] = [];
        if (!nameVal) {
          errorMessages.push('اسم العميل مفقود');
        }

        const existingMatch = existingCustomers.find(
          c => (phoneVal && c.phone === phoneVal) || (nameVal && c.name.toLowerCase() === nameVal.toLowerCase())
        );

        const mappedCustomer: Partial<Customer> = {
          id: existingMatch ? existingMatch.id : `cust_imp_${Date.now()}_${idx}`,
          name: nameVal,
          phone: phoneVal,
          address: addressVal,
          balance: balanceVal,
          creditLimit: creditLimitVal,
          lastTransactionDate: lastTxDateVal || (existingMatch ? existingMatch.lastTransactionDate : undefined),
          isActive: customerMapping.isActive ? isActiveVal : (existingMatch?.isActive !== undefined ? existingMatch.isActive : true),
          createdAt: existingMatch ? existingMatch.createdAt : new Date().toISOString(),
        };

        return {
          raw: rawRow,
          mapped: mappedCustomer,
          isDuplicate: !!existingMatch,
          existingMatch: existingMatch,
          hasErrors: errorMessages.length > 0,
          errorMessages: errorMessages,
          selected: errorMessages.length === 0,
        };
      });

      setProcessedCustomerRows(processed);
      setStep('preview');
    } else {
      if (!supplierMapping.name) {
        setErrorMessage('عمود "اسم المورد" إلزامي. يرجى تحديده للمتابعة.');
        return;
      }

      setErrorMessage(null);

      const processed: ParsedSupplierRow[] = rawRows.map((rawRow, idx) => {
        const nameVal = String(rawRow[supplierMapping.name] || '').trim();
        const phoneVal = supplierMapping.phone ? String(rawRow[supplierMapping.phone] || '').trim() : '';
        const companyVal = supplierMapping.company ? String(rawRow[supplierMapping.company] || '').trim() : '';
        const addressVal = supplierMapping.address ? String(rawRow[supplierMapping.address] || '').trim() : '';
        const balRaw = supplierMapping.balance ? parseFloat(String(rawRow[supplierMapping.balance]).replace(/[^0-9.-]+/g, '')) : 0;
        const balanceVal = !isNaN(balRaw) ? balRaw : 0;

        const creditLimitRaw = supplierMapping.creditLimit ? parseFloat(String(rawRow[supplierMapping.creditLimit]).replace(/[^0-9.-]+/g, '')) : undefined;
        const creditLimitVal = creditLimitRaw !== undefined && !isNaN(creditLimitRaw) ? creditLimitRaw : undefined;
        const lastTxDateVal = supplierMapping.lastTransactionDate ? String(rawRow[supplierMapping.lastTransactionDate] || '').trim() : '';
        let isActiveVal = true;
        if (supplierMapping.isActive) {
          const actRaw = String(rawRow[supplierMapping.isActive] || '').trim().toLowerCase();
          if (['لا', 'غير نشط', 'معطل', 'موقوف', 'false', '0', 'non', 'inactif', 'inactive', 'no'].includes(actRaw)) {
            isActiveVal = false;
          }
        }

        const errorMessages: string[] = [];
        if (!nameVal) {
          errorMessages.push('اسم المورد مفقود');
        }

        const existingMatch = existingSuppliers.find(
          s => (phoneVal && s.phone === phoneVal) || (nameVal && s.name.toLowerCase() === nameVal.toLowerCase())
        );

        const mappedSupplier: Partial<Supplier> = {
          id: existingMatch ? existingMatch.id : `sup_imp_${Date.now()}_${idx}`,
          name: nameVal,
          phone: phoneVal,
          company: companyVal,
          address: addressVal,
          balance: balanceVal,
          creditLimit: creditLimitVal,
          lastTransactionDate: lastTxDateVal || (existingMatch ? existingMatch.lastTransactionDate : undefined),
          isActive: supplierMapping.isActive ? isActiveVal : (existingMatch?.isActive !== undefined ? existingMatch.isActive : true),
          createdAt: existingMatch ? existingMatch.createdAt : new Date().toISOString(),
        };

        return {
          raw: rawRow,
          mapped: mappedSupplier,
          isDuplicate: !!existingMatch,
          existingMatch: existingMatch,
          hasErrors: errorMessages.length > 0,
          errorMessages: errorMessages,
          selected: errorMessages.length === 0,
        };
      });

      setProcessedSupplierRows(processed);
      setStep('preview');
    }
  };

  // Toggle selection
  const toggleCustomerRowSelected = (idx: number) => {
    setProcessedCustomerRows(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], selected: !copy[idx].selected };
      return copy;
    });
  };

  const toggleSupplierRowSelected = (idx: number) => {
    setProcessedSupplierRows(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], selected: !copy[idx].selected };
      return copy;
    });
  };

  const toggleSelectAll = (select: boolean) => {
    if (partnerType === 'customers') {
      setProcessedCustomerRows(prev => prev.map(r => r.hasErrors ? r : { ...r, selected: select }));
    } else {
      setProcessedSupplierRows(prev => prev.map(r => r.hasErrors ? r : { ...r, selected: select }));
    }
  };

  // Execute Import
  const handleExecuteImport = () => {
    if (partnerType === 'customers') {
      const validSelected = processedCustomerRows.filter(r => r.selected && !r.hasErrors);
      if (validSelected.length === 0) {
        setErrorMessage('لا توجد صفوف عملاء صالحة ومحددة للاستيراد.');
        return;
      }

      const finalCustomers = validSelected.map(r => r.mapped as Customer);
      onBulkImportCustomers(finalCustomers, importStrategy);

      setSuccessToast(`تم بنجاح استيراد وتحديث ${finalCustomers.length} عميل في النظام!`);
      setTimeout(() => {
        setSuccessToast(null);
        onClose();
      }, 1200);
    } else {
      const validSelected = processedSupplierRows.filter(r => r.selected && !r.hasErrors);
      if (validSelected.length === 0) {
        setErrorMessage('لا توجد صفوف موردين صالحة ومحددة للاستيراد.');
        return;
      }

      const finalSuppliers = validSelected.map(r => r.mapped as Supplier);
      onBulkImportSuppliers(finalSuppliers, importStrategy);

      setSuccessToast(`تم بنجاح استيراد وتحديث ${finalSuppliers.length} مورد في النظام!`);
      setTimeout(() => {
        setSuccessToast(null);
        onClose();
      }, 1200);
    }
  };

  // Download Templates
  const downloadTemplate = (format: 'xlsx' | 'csv') => {
    if (partnerType === 'customers') {
      const sample = [
        {
          'اسم العميل': 'أحمد محمد العلي',
          'رقم الهاتف': '0501234567',
          'العنوان': 'الرياض - حي الملز',
          'الرصيد الافتتاحي': 0.00,
          'ملاحظات': 'عميل دائم'
        },
        {
          'اسم العميل': 'سارة عبد الله الشمري',
          'رقم الهاتف': '0559876543',
          'العنوان': 'جدة - حي الصفا',
          'الرصيد الافتتاحي': 250.00,
          'ملاحظات': 'مستحق سابق'
        },
        {
          'اسم العميل': 'مؤسسة النور للتجارة',
          'رقم الهاتف': '0543322110',
          'العنوان': 'الدمام - السوق المركزي',
          'الرصيد الافتتاحي': 0.00,
          'ملاحظات': ''
        }
      ];

      const ws = XLSX.utils.json_to_sheet(sample);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'العملاء');

      if (format === 'xlsx') {
        XLSX.writeFile(wb, 'قالب_استيراد_العملاء_مخزون_فريدون.xlsx');
      } else {
        XLSX.writeFile(wb, 'قالب_استيراد_العملاء_مخزون_فريدون.csv', { bookType: 'csv' });
      }
    } else {
      const sample = [
        {
          'اسم المورد': 'شركة البركة للمواد الغذائية',
          'اسم الشركة': 'مجموعة البركة الدولية',
          'رقم الهاتف': '0112345678',
          'العنوان': 'الرياض - المنطقة الصناعية الثانية',
          'الرصيد الافتتاحي': 1500.00,
          'ملاحظات': 'مورد رئيسي للأرز والزيوت'
        },
        {
          'اسم المورد': 'مؤسسة الهضاب للتوزيع',
          'اسم الشركة': 'الهضاب للتجارة',
          'رقم الهاتف': '0129876543',
          'العنوان': 'جدة - ميناء جدة الإسلامي',
          'الرصيد الافتتاحي': 0.00,
          'ملاحظات': 'توريد أسبوعي'
        }
      ];

      const ws = XLSX.utils.json_to_sheet(sample);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'الموردين');

      if (format === 'xlsx') {
        XLSX.writeFile(wb, 'قالب_استيراد_الموردين_مخزون_فريدون.xlsx');
      } else {
        XLSX.writeFile(wb, 'قالب_استيراد_الموردين_مخزون_فريدون.csv', { bookType: 'csv' });
      }
    }
  };

  // Export Current
  const exportCurrent = () => {
    if (partnerType === 'customers') {
      const exportData = existingCustomers.map(c => ({
        'اسم العميل': c.name,
        'رقم الهاتف': c.phone,
        'العنوان': c.address || '',
        'الرصيد الحالي': c.balance,
        'تاريخ الإنشاء': c.createdAt
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'سجل العملاء');
      XLSX.writeFile(wb, `سجل_العملاء_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      const exportData = existingSuppliers.map(s => ({
        'اسم المورد': s.name,
        'اسم الشركة': s.company || '',
        'رقم الهاتف': s.phone,
        'العنوان': s.address || '',
        'الرصيد الحالي المستحق': s.balance,
        'تاريخ الإنشاء': s.createdAt
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'سجل الموردين');
      XLSX.writeFile(wb, `سجل_الموردين_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  };

  const currentProcessedRows = partnerType === 'customers' ? processedCustomerRows : processedSupplierRows;

  const displayedRows = currentProcessedRows.filter((r) => {
    const nameVal = r.mapped.name || '';
    const phoneVal = r.mapped.phone || '';
    const matchesSearch = nameVal.toLowerCase().includes(searchFilter.toLowerCase()) || phoneVal.includes(searchFilter);

    if (!matchesSearch) return false;
    if (filterType === 'new') return !r.isDuplicate && !r.hasErrors;
    if (filterType === 'duplicates') return r.isDuplicate && !r.hasErrors;
    if (filterType === 'errors') return r.hasErrors;
    return true;
  });

  const selectedCount = currentProcessedRows.filter(r => r.selected && !r.hasErrors).length;
  const duplicatesCount = currentProcessedRows.filter(r => r.isDuplicate && !r.hasErrors).length;
  const newCount = currentProcessedRows.filter(r => !r.isDuplicate && !r.hasErrors).length;
  const errorsCount = currentProcessedRows.filter(r => r.hasErrors).length;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl p-4 sm:p-6 shadow-2xl text-slate-100 my-auto max-h-[94vh] flex flex-col animate-in zoom-in-95"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg border ${
              partnerType === 'customers' 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-emerald-500/10' 
                : 'bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-blue-500/10'
            }`}>
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-white">
                استيراد {partnerType === 'customers' ? 'العملاء' : 'الموردين'} من الشيت (Excel / Google Sheets)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                استيراد جماعي وفوري مع مطابقة ذكية لأرقام الهواتف والعناوين والأرصدة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Switcher Tab: Customers vs Suppliers */}
        <div className="grid grid-cols-2 gap-2 my-2.5 bg-slate-850 p-1.5 rounded-2xl border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => handlePartnerTypeSwitch('customers')}
            className={`py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              partnerType === 'customers'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>استيراد سجل العملاء (Customers)</span>
          </button>
          <button
            type="button"
            onClick={() => handlePartnerTypeSwitch('suppliers')}
            className={`py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              partnerType === 'suppliers'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>استيراد سجل الموردين (Suppliers)</span>
          </button>
        </div>

        {/* Steps Indicator Bar */}
        <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-slate-800 text-xs shrink-0">
          <div className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
            step === 'upload' ? 'bg-slate-800 border-slate-600 text-white font-bold' : 'bg-slate-850 border-slate-800 text-slate-400'
          }`}>
            <span className="w-5 h-5 rounded-full bg-slate-700 text-center flex items-center justify-center font-bold text-[11px]">1</span>
            <span className="truncate">رفع الملف أو اللصق</span>
          </div>

          <div className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
            step === 'mapping' ? 'bg-slate-800 border-slate-600 text-white font-bold' : 'bg-slate-850 border-slate-800 text-slate-400'
          }`}>
            <span className="w-5 h-5 rounded-full bg-slate-700 text-center flex items-center justify-center font-bold text-[11px]">2</span>
            <span className="truncate">مطابقة الأعمدة</span>
          </div>

          <div className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
            step === 'preview' ? 'bg-slate-800 border-slate-600 text-white font-bold' : 'bg-slate-850 border-slate-800 text-slate-400'
          }`}>
            <span className="w-5 h-5 rounded-full bg-slate-700 text-center flex items-center justify-center font-bold text-[11px]">3</span>
            <span className="truncate">المعاينة والتأكيد ({selectedCount})</span>
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mt-3 p-3 bg-rose-950/70 border border-rose-500/40 rounded-2xl text-xs text-rose-300 flex items-center justify-between shrink-0 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Success Toast */}
        {successToast && (
          <div className="mt-3 p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-2xl text-xs text-emerald-300 flex items-center gap-2 shrink-0 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold">{successToast}</span>
          </div>
        )}

        {/* ================= STEP 1: Upload or Paste ================= */}
        {step === 'upload' && (
          <div className="py-4 space-y-4 overflow-y-auto flex-1 pr-1">
            {/* Quick Actions: Download Template & Export Existing */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-850 border border-slate-800 rounded-2xl text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold">
                  تحميل قالب جاهز لتعبئة بيانات {partnerType === 'customers' ? 'العملاء' : 'الموردين'}:
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadTemplate('xlsx')}
                  className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-bold flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل قالب Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={exportCurrent}
                  className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold flex items-center gap-1.5 transition-all"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>تصدير السجل الحالي</span>
                </button>
              </div>
            </div>

            {/* Drag & Drop Box */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-emerald-500 bg-slate-850/60 hover:bg-slate-850 transition-all rounded-3xl p-6 sm:p-8 text-center cursor-pointer flex flex-col items-center justify-center space-y-3 group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx, .xls, .csv"
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-slate-800 text-emerald-400 border border-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-black text-white text-sm sm:text-base">
                  انقر لاختيار ملف شيت {partnerType === 'customers' ? 'العملاء' : 'الموردين'} أو اسحبه هنا
                </h4>
                <p className="text-xs text-slate-400 mt-1">يدعم ملفات Excel (.xlsx, .xls) وملفات CSV</p>
              </div>
              <span className="text-[11px] font-bold text-slate-300 bg-slate-800 border border-slate-700 px-3 py-1 rounded-full">
                مطابقة تلقائية للهاتف والعنوان والرصيد
              </span>
            </div>

            {/* OR Divider */}
            <div className="flex items-center gap-3 text-slate-500 text-xs font-bold">
              <div className="h-px bg-slate-800 flex-1" />
              <span>أو الصق البيانات مباشرة من Google Sheets / Excel</span>
              <div className="h-px bg-slate-800 flex-1" />
            </div>

            {/* Direct Paste Area */}
            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                <Copy className="w-4 h-4 text-emerald-400" />
                <span>انسخ الصفوف من الشيت والصقها هنا مباشرة (Ctrl+C ثم Ctrl+V):</span>
              </label>
              <textarea
                rows={4}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={
                  partnerType === 'customers'
                    ? "اسم العميل	رقم الهاتف	العنوان	الرصيد\nأحمد محمد	0501234567	الرياض	0\nسارة عبد الله	0559876543	جدة	150"
                    : "اسم المورد	اسم الشركة	رقم الهاتف	العنوان	الرصيد\nشركة البركة	مجموعة البركة	0112345678	الرياض	1500"
                }
                className="w-full bg-slate-850 border border-slate-700 rounded-2xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                dir="auto"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!pastedText.trim() || isLoading}
                  onClick={handleProcessPastedText}
                  className={`py-2 px-5 rounded-xl text-white font-bold text-xs flex items-center gap-2 shadow-lg disabled:opacity-40 transition-all active:scale-95 ${
                    partnerType === 'customers' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>معالجة البيانات الملصوقة ومتابعة</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2: Column Mapping ================= */}
        {step === 'mapping' && (
          <div className="py-4 space-y-4 overflow-y-auto flex-1 pr-1">
            <div className="flex items-center justify-between bg-slate-850 p-3 rounded-2xl border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">الملف المحدد: <strong className="text-white">{fileName}</strong> ({rawRows.length} صف تم اكتشافه)</span>
              </div>
              <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                تمت المطابقة التلقائية
              </span>
            </div>

            <p className="text-xs text-slate-400">
              يقوم النظام بربط أعمدة ملفك تلقائياً بحقول {partnerType === 'customers' ? 'العملاء' : 'الموردين'}. يمكنك تعديل أي عمود إذا لزم الأمر:
            </p>

            {partnerType === 'customers' ? (
              /* Customer Mapping Fields */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {/* Name */}
                <div className="bg-slate-850 p-3 rounded-2xl border border-emerald-500/50 space-y-1">
                  <label className="text-emerald-400 font-bold block">اسم العميل * (إلزامي)</label>
                  <select
                    value={customerMapping.name}
                    onChange={(e) => setCustomerMapping({ ...customerMapping, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- اختر عمود اسم العميل --</option>
                    {rawHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Phone */}
                <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800 space-y-1">
                  <label className="text-slate-300 font-bold block">رقم الهاتف / الجوال</label>
                  <select
                    value={customerMapping.phone}
                    onChange={(e) => setCustomerMapping({ ...customerMapping, phone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- اختر عمود الهاتف --</option>
                    {rawHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Address */}
                <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800 space-y-1">
                  <label className="text-slate-300 font-bold block">العنوان / المنطقة</label>
                  <select
                    value={customerMapping.address}
                    onChange={(e) => setCustomerMapping({ ...customerMapping, address: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- اختر عمود العنوان --</option>
                    {rawHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Balance */}
                <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800 space-y-1">
                  <label className="text-slate-300 font-bold block">الرصيد الافتتاحي (مدين/دائن)</label>
                  <select
                    value={customerMapping.balance}
                    onChange={(e) => setCustomerMapping({ ...customerMapping, balance: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- افتراضي (0) --</option>
                    {rawHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Credit Limit */}
                <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800 space-y-1">
                  <label className="text-slate-300 font-bold flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                    <span>حد الإئتمان</span>
                  </label>
                  <select
                    value={customerMapping.creditLimit}
                    onChange={(e) => setCustomerMapping({ ...customerMapping, creditLimit: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- بدون حد ائتماني (اختياري) --</option>
                    {rawHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Last Transaction */}
                <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800 space-y-1">
                  <label className="text-slate-300 font-bold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    <span>آخر تعامل</span>
                  </label>
                  <select
                    value={customerMapping.lastTransactionDate}
                    onChange={(e) => setCustomerMapping({ ...customerMapping, lastTransactionDate: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- اختر عمود آخر تعامل (اختياري) --</option>
                    {rawHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Active Status */}
                <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800 space-y-1">
                  <label className="text-slate-300 font-bold flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>نشط / حالة العميل</span>
                  </label>
                  <select
                    value={customerMapping.isActive}
                    onChange={(e) => setCustomerMapping({ ...customerMapping, isActive: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- افتراضي (نشط) --</option>
                    {rawHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              /* Supplier Mapping Fields */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {/* Name */}
                <div className="bg-slate-850 p-3 rounded-2xl border border-blue-500/50 space-y-1">
                  <label className="text-blue-400 font-bold block">اسم المورد * (إلزامي)</label>
                  <select
                    value={supplierMapping.name}
                    onChange={(e) => setSupplierMapping({ ...supplierMapping, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-semibold focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- اختر عمود اسم المورد --</option>
                    {rawHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Company */}
                <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800 space-y-1">
                  <label className="text-slate-300 font-bold block">اسم الشركة / المؤسسة</label>
                  <select
                    value={supplierMapping.company}
                    onChange={(e) => setSupplierMapping({ ...supplierMapping, company: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- اختر عمود الشركة --</option>
                    {rawHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Phone */}
                <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800 space-y-1">
                  <label className="text-slate-300 font-bold block">رقم الهاتف / الجوال</label>
                  <select
                    value={supplierMapping.phone}
                    onChange={(e) => setSupplierMapping({ ...supplierMapping, phone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- اختر عمود الهاتف --</option>
                    {rawHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Address */}
                <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800 space-y-1">
                  <label className="text-slate-300 font-bold block">العنوان / المقر</label>
                  <select
                    value={supplierMapping.address}
                    onChange={(e) => setSupplierMapping({ ...supplierMapping, address: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- اختر عمود العنوان --</option>
                    {rawHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Balance */}
                <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800 space-y-1">
                  <label className="text-slate-300 font-bold block">الرصيد الافتتاحي المستحق للمورد</label>
                  <select
                    value={supplierMapping.balance}
                    onChange={(e) => setSupplierMapping({ ...supplierMapping, balance: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- افتراضي (0) --</option>
                    {rawHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Credit Limit */}
                <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800 space-y-1">
                  <label className="text-slate-300 font-bold flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                    <span>حد الإئتمان</span>
                  </label>
                  <select
                    value={supplierMapping.creditLimit}
                    onChange={(e) => setSupplierMapping({ ...supplierMapping, creditLimit: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- بدون حد ائتماني (اختياري) --</option>
                    {rawHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Last Transaction */}
                <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800 space-y-1">
                  <label className="text-slate-300 font-bold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    <span>آخر تعامل</span>
                  </label>
                  <select
                    value={supplierMapping.lastTransactionDate}
                    onChange={(e) => setSupplierMapping({ ...supplierMapping, lastTransactionDate: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- اختر عمود آخر تعامل (اختياري) --</option>
                    {rawHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Active Status */}
                <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800 space-y-1">
                  <label className="text-slate-300 font-bold flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>نشط / حالة المورد</span>
                  </label>
                  <select
                    value={supplierMapping.isActive}
                    onChange={(e) => setSupplierMapping({ ...supplierMapping, isActive: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- افتراضي (نشط) --</option>
                    {rawHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Bottom Actions for Step 2 */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                رجوع
              </button>
              <button
                type="button"
                onClick={handleProceedToPreview}
                className={`py-2.5 px-6 rounded-xl text-white font-bold text-xs flex items-center gap-2 shadow-lg ${
                  partnerType === 'customers' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30'
                }`}
              >
                <span>معاينة السجلات والتحقق</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: Live Preview & Confirm ================= */}
        {step === 'preview' && (
          <div className="py-4 space-y-3.5 overflow-y-auto flex-1 pr-1 flex flex-col">
            {/* Deduplication Strategy & Filter Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-850 p-3.5 rounded-2xl border border-slate-800 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1.5">
                  خطة التعامل مع السجلات الموجودة مسبقاً ({duplicatesCount}):
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setImportStrategy('update')}
                    className={`py-1.5 px-2 rounded-xl font-bold border text-center transition-all ${
                      importStrategy === 'update'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    تحديث البيانات
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportStrategy('skip')}
                    className={`py-1.5 px-2 rounded-xl font-bold border text-center transition-all ${
                      importStrategy === 'skip'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    تخطي المكرر
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportStrategy('replace')}
                    className={`py-1.5 px-2 rounded-xl font-bold border text-center transition-all ${
                      importStrategy === 'replace'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    استبدال كلي
                  </button>
                </div>
              </div>

              {/* Status Chips Filter */}
              <div className="flex flex-col justify-between">
                <span className="text-slate-400 text-[11px] block">فلترة حسب الحالة:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setFilterType('all')}
                    className={`py-1 px-2.5 rounded-lg font-bold text-[11px] ${
                      filterType === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    الكل ({currentProcessedRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('new')}
                    className={`py-1 px-2.5 rounded-lg font-bold text-[11px] ${
                      filterType === 'new' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    جديد ({newCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('duplicates')}
                    className={`py-1 px-2.5 rounded-lg font-bold text-[11px] ${
                      filterType === 'duplicates' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    موجود مسبقاً ({duplicatesCount})
                  </button>
                  {errorsCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterType('errors')}
                      className={`py-1 px-2.5 rounded-lg font-bold text-[11px] ${
                        filterType === 'errors' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      أخطاء ({errorsCount})
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Search & Select/Deselect All */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <input
                type="text"
                placeholder="تصفية السجلات بالاسم أو الهاتف..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs w-64 focus:outline-none focus:border-emerald-500"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleSelectAll(true)}
                  className="text-emerald-400 hover:underline font-bold"
                >
                  تحديد الكل
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={() => toggleSelectAll(false)}
                  className="text-slate-400 hover:underline"
                >
                  إلغاء التحديد
                </button>
              </div>
            </div>

            {/* Live Data Preview Table */}
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900 flex-1 max-h-72 overflow-y-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-800 text-slate-300 font-bold sticky top-0 z-10 text-[11px]">
                  <tr>
                    <th className="p-2.5 w-10 text-center">اختيار</th>
                    <th className="p-2.5">الاسم</th>
                    {partnerType === 'suppliers' && <th className="p-2.5">الشركة</th>}
                    <th className="p-2.5">الهاتف</th>
                    <th className="p-2.5">العنوان</th>
                    <th className="p-2.5">الرصيد الافتتاحي</th>
                    <th className="p-2.5">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {partnerType === 'customers'
                    ? (displayedRows as ParsedCustomerRow[]).map((row, idx) => {
                        const origIndex = processedCustomerRows.indexOf(row);
                        return (
                          <tr 
                            key={idx}
                            className={`hover:bg-slate-800/50 transition-colors ${
                              !row.selected ? 'opacity-40 bg-slate-950/40' : ''
                            }`}
                          >
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                disabled={row.hasErrors}
                                checked={row.selected}
                                onChange={() => toggleCustomerRowSelected(origIndex)}
                                className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 bg-slate-850 border-slate-700"
                              />
                            </td>
                            <td className="p-2.5 font-bold text-white">
                              {row.mapped.name || <span className="text-rose-400 font-normal">اسم مفقود</span>}
                            </td>
                            <td className="p-2.5 font-mono text-slate-300">
                              {row.mapped.phone || <span className="text-slate-500">-</span>}
                            </td>
                            <td className="p-2.5 text-slate-300 truncate max-w-[140px]">
                              {row.mapped.address || <span className="text-slate-500">-</span>}
                            </td>
                            <td className="p-2.5 font-mono font-semibold text-emerald-400">
                              {formatCurrency(row.mapped.balance || 0, currency)}
                            </td>
                            <td className="p-2.5">
                              {row.hasErrors ? (
                                <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  {row.errorMessages.join(', ')}
                                </span>
                              ) : row.isDuplicate ? (
                                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  موجود مسبقاً
                                </span>
                              ) : (
                                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  جديد
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    : (displayedRows as ParsedSupplierRow[]).map((row, idx) => {
                        const origIndex = processedSupplierRows.indexOf(row);
                        return (
                          <tr 
                            key={idx}
                            className={`hover:bg-slate-800/50 transition-colors ${
                              !row.selected ? 'opacity-40 bg-slate-950/40' : ''
                            }`}
                          >
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                disabled={row.hasErrors}
                                checked={row.selected}
                                onChange={() => toggleSupplierRowSelected(origIndex)}
                                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 bg-slate-850 border-slate-700"
                              />
                            </td>
                            <td className="p-2.5 font-bold text-white">
                              {row.mapped.name || <span className="text-rose-400 font-normal">اسم مفقود</span>}
                            </td>
                            <td className="p-2.5 text-slate-300">
                              {row.mapped.company || <span className="text-slate-500">-</span>}
                            </td>
                            <td className="p-2.5 font-mono text-slate-300">
                              {row.mapped.phone || <span className="text-slate-500">-</span>}
                            </td>
                            <td className="p-2.5 text-slate-300 truncate max-w-[140px]">
                              {row.mapped.address || <span className="text-slate-500">-</span>}
                            </td>
                            <td className="p-2.5 font-mono font-semibold text-blue-400">
                              {formatCurrency(row.mapped.balance || 0, currency)}
                            </td>
                            <td className="p-2.5">
                              {row.hasErrors ? (
                                <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  {row.errorMessages.join(', ')}
                                </span>
                              ) : row.isDuplicate ? (
                                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  موجود مسبقاً
                                </span>
                              ) : (
                                <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  جديد
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions for Step 3 */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep('mapping')}
                className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                تعديل مطابقة الأعمدة
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={selectedCount === 0}
                  onClick={handleExecuteImport}
                  className={`py-2.5 px-6 rounded-xl text-white font-bold text-xs flex items-center gap-2 shadow-lg disabled:opacity-40 transition-all active:scale-95 ${
                    partnerType === 'customers' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد استيراد ({selectedCount}) {partnerType === 'customers' ? 'عميل' : 'مورد'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
