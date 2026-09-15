import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ArrowRight, 
  RefreshCw, 
  Layers, 
  Table, 
  HelpCircle, 
  Sparkles, 
  FileText, 
  Check, 
  Copy, 
  Plus, 
  Database,
  ArrowDownToLine,
  Sliders,
  Eye,
  Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product, Supplier } from '../types';
import { formatCurrency } from '../utils/calculations';
import { normalizeProductUnits } from '../utils/unitHelpers';
import { classifyProductCategory, STORE_CATEGORY_NAMES } from '../utils/categoryClassifier';

interface ImportProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingProducts: Product[];
  suppliers: Supplier[];
  currency: string;
  onBulkImport: (products: Product[], strategy: 'update' | 'skip' | 'replace') => void;
}

interface ColumnMapping {
  name: string;
  barcode: string;
  category: string;
  unit: string;
  majorUnit: string;
  middleUnit: string;
  minorUnit: string;
  piecesPerMajorUnit: string;
  piecesPerMiddleUnit: string;
  purchasePriceMinor: string;
  purchasePriceMiddle: string;
  purchasePriceMajor: string;
  salePriceMinor: string;
  salePriceMiddle: string;
  salePriceMajor: string;
  tierPrice: string;
  stockPieces: string;
  minStockAlert: string;
  supplierName: string;
  notes: string;
}

interface ParsedRow {
  raw: Record<string, any>;
  mapped: Partial<Product>;
  isDuplicate: boolean;
  existingMatch?: Product;
  hasErrors: boolean;
  errorMessages: string[];
  selected: boolean;
}

// Comprehensive utility to clean Algerian POS unit strings (e.g. "B/4 قطعة", "20Units كرتونة B/4", "MS/ قطعة", "MS/ فاردو Sachi 10", "MAX24 24Units كرتونة", "20/2 كرتونة Bouat 20")
export const cleanUnitString = (raw: string, fallback: string = 'قطعة'): string => {
  if (!raw) return fallback;
  const str = String(raw).trim();
  const lower = str.toLowerCase();

  // 1. Direct keyword detection for known packaging units
  if (str.includes('كرتون') || lower.includes('carton') || lower.includes('colis')) return 'كرتونة';
  if (str.includes('فاردو') || lower.includes('fardeau')) return 'فاردو';
  if (str.includes('علبة') || lower.includes('boite') || lower.includes('box')) return 'علبة';
  if (str.includes('باكت') || str.includes('باكيت') || lower.includes('paquet') || lower.includes('pack')) return 'باكت';
  if (str.includes('صندوق')) return 'صندوق';
  if (str.includes('طرد')) return 'طرد';
  if (str.includes('شوال') || lower.includes('sac') || str.includes('خيشة')) return 'شوال';
  if (str.includes('كيس') || lower.includes('sachet')) return 'كيس';
  if (str.includes('قارورة') || str.includes('قرعة') || lower.includes('bouteille')) return 'قارورة';
  if (str.includes('بيدون') || lower.includes('bidon')) return 'بيدون';
  if (str.includes('كيلو') || str.includes('كغ') || lower.includes('kg')) return 'كيلو';
  if (str.includes('لتر') || lower.includes('litre')) return 'لتر';
  if (str.includes('قطعة') || str.includes('حبة') || lower.includes('piece') || lower.includes('unite') || lower.includes('unit')) return 'قطعة';

  // 2. Strip POS prefixes (e.g. B/4, MS/, MA/, MAX24, 20/2, 12/, etc.)
  let cleaned = str
    .replace(/^[a-zA-Z0-9_\-]+\s*\/\s*[0-9]*\s*/g, '')
    .replace(/^[0-9]+\s*\/\s*[0-9]*\s*/g, '')
    .replace(/^(ms|b|ma|max|ref|code)\s*\/\s*/i, '')
    .replace(/[0-9]+\s*(units?|pies|pieces?|sachi|bouat)\b/gi, '')
    .replace(/\b(units?|pies|pieces?|sachi|bouat)\s*[0-9]*/gi, '')
    .trim();

  return cleaned || fallback;
};

export const ImportProductsModal: React.FC<ImportProductsModalProps> = ({
  isOpen,
  onClose,
  existingProducts,
  suppliers,
  currency,
  onBulkImport,
}) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [pastedText, setPastedText] = useState<string>('');
  const [importStrategy, setImportStrategy] = useState<'update' | 'skip' | 'replace'>('update');
  const [autoGroupUnits, setAutoGroupUnits] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Column Mapping
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    name: '',
    barcode: '',
    category: '',
    unit: '',
    majorUnit: '',
    middleUnit: '',
    minorUnit: '',
    piecesPerMajorUnit: '',
    piecesPerMiddleUnit: '',
    purchasePriceMinor: '',
    purchasePriceMiddle: '',
    purchasePriceMajor: '',
    salePriceMinor: '',
    salePriceMiddle: '',
    salePriceMajor: '',
    tierPrice: '',
    stockPieces: '',
    minStockAlert: '',
    supplierName: '',
    notes: '',
  });

  // Parsed and Processed Rows
  const [processedRows, setProcessedRows] = useState<ParsedRow[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'new' | 'duplicates' | 'errors'>('all');
  const [searchFilter, setSearchFilter] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Auto-detect matching headers with Arabic and English aliases
  const autoDetectColumnMapping = (headers: string[]): ColumnMapping => {
    const findHeader = (aliases: string[]): string => {
      const match = headers.find(h => {
        const cleaned = h.toLowerCase().trim().replace(/[\s_\-\/\\]+/g, '');
        return aliases.some(a => {
          const aliasCleaned = a.toLowerCase().trim().replace(/[\s_\-\/\\]+/g, '');
          return cleaned === aliasCleaned || cleaned.includes(aliasCleaned);
        });
      });
      return match || '';
    };

    return {
      name: findHeader(['اسم الصنف', 'اسم المنتج', 'اسم_الصنف', 'الاسم', 'المنتج', 'السلعة', 'اسم السلعة', 'البيان', 'المادة', 'اسم المادة', 'name', 'product', 'item', 'title', 'designation', 'description']),
      barcode: findHeader(['الباركود', 'باركود', 'كود الصنف', 'الكود', 'كود', 'رمز', 'الرمز', 'رقم الباركود', 'barcode', 'code', 'sku', 'ean', 'upc', 'reference', 'ref']),
      category: findHeader(['التصنيف', 'القسم', 'الفئة', 'المجموعة', 'النوع', 'العائلة', 'category', 'cat', 'group', 'famille', 'type']),
      unit: findHeader(['الوحدة', 'وحدة', 'نوع الوحدة', 'التعبئة', 'العبوة', 'unit', 'unite', 'unite_mesure', 'packaging', 'cond', 'conditionnement']),
      majorUnit: findHeader(['الوحدة الكبرى', 'وحدة كبرى', 'الكرتونة', 'الشوال', 'الصندوق', 'الفاردو', 'majorunit', 'major_unit', 'box', 'carton', 'pack', 'colis']),
      middleUnit: findHeader(['الوحدة الوسطى', 'وحدة وسطى', 'العلبة', 'الباكت', 'الباكيت', 'الربطة', 'الطرد', 'البكج', 'middleunit', 'middle_unit', 'mid_unit', 'pack', 'box', 'boite', 'paquet']),
      minorUnit: findHeader(['الوحدة الصغرى', 'وحدة صغرى', 'القطعة', 'الحبة', 'الكيلو', 'minorunit', 'minor_unit', 'piece']),
      piecesPerMajorUnit: findHeader(['عدد القطع', 'عدد_القطع', 'عدد قطع', 'معامل التحويل', 'قطع الكرتونة', 'القطع بالكبرى', 'القطع', 'العدد', 'عدد', 'معامل', 'الكمية للعبوة', 'piecespermajor', 'pieces_per_major', 'pieces', 'ratio', 'unites_par_carton', 'qte_colis', 'colisage', 'nb_pieces']),
      piecesPerMiddleUnit: findHeader(['قطع الوسطى', 'قطع العلبة', 'قطع الباكت', 'قطع الباكيت', 'عدد قطع الوسطى', 'معامل الوسطى', 'pieces_middle', 'piecespermid', 'pieces_per_middle']),
      purchasePriceMinor: findHeader(['سعر الشراء', 'سعر التكلفة', 'شراء صغرى', 'سعر القطعة شراء', 'تكلفة القطعة', 'سعر الشراء د.ج', 'ثمن الشراء', 'التكلفة', 'شراء', 'سعر الشراء (التكلفة)', 'cost', 'purchaseprice', 'buy_price', 'prix_achat', 'p_achat']),
      purchasePriceMiddle: findHeader(['سعر شراء الوسطى', 'سعر شراء العلبة', 'شراء وسطى', 'تكلفة الوسطى', 'purchase_middle', 'cost_middle', 'prix_achat_moyen']),
      purchasePriceMajor: findHeader(['سعر شراء الكبرى', 'سعر شراء الكرتونة', 'شراء كبرى', 'تكلفة كبرى', 'purchase_major', 'carton_cost', 'prix_achat_carton']),
      salePriceMinor: findHeader(['سعر البيع', 'سعر_البيع', 'سعر بيع التجزئة', 'سعر التجزئة', 'سعر القطعة بيع', 'سعر', 'السعر', 'ثمن البيع', 'سعر البيع د.ج', 'بيع', 'saleprice', 'sell_price', 'price', 'prix_vente', 'p_vente', 'prix']),
      salePriceMiddle: findHeader(['سعر بيع الوسطى', 'سعر بيع العلبة', 'سعر بيع الباكت', 'سعر الوسطى', 'sale_middle', 'price_middle', 'prix_vente_moyen']),
      salePriceMajor: findHeader(['سعر بيع الكبرى', 'سعر بيع الكرتونة', 'سعر كبرى', 'سعر الكرتونة', 'sale_major', 'carton_price', 'prix_gros']),
      tierPrice: findHeader(['سعر 5 ومافوق', 'سعر 5 وما فوق', 'سعر 5', 'سعر5ومافوق', 'سعر الجملة', 'سعر جملة', 'wholesale_price', 'tier_price', 'prix_5']),
      stockPieces: findHeader(['الرصيد', 'رصيد', 'المخزون', 'الكمية', 'الرصيد الحالي', 'الرصيد الافتتاحي', 'الكمية المتوفرة', 'الكمية بالمخزن', 'stock', 'qty', 'quantity', 'solde', 'qte']),
      minStockAlert: findHeader(['حد التنبيه', 'الحد الأدنى', 'نقص المخزون', 'تنبيه النواقص', 'minalert', 'min_stock', 'alert', 'seuil_alerte']),
      supplierName: findHeader(['المورد', 'اسم المورد', 'الشركة الموردة', 'supplier', 'fournisseur', 'vendor']),
      notes: findHeader(['ملاحظات', 'الوصف', 'تفاصيل', 'notes', 'remarques', 'comment']),
    };
  };

  // Process File (Excel .xlsx, .xls, .csv)
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
        
        // Convert sheet to JSON rows
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
        
        if (!data || data.length === 0) {
          setErrorMessage('الملف لا يحتوي على أي بيانات أو صفوف صالحة.');
          setIsLoading(false);
          return;
        }

        const headers = Object.keys(data[0] || {});
        setRawHeaders(headers);
        setRawRows(data);

        // Auto map columns
        const detected = autoDetectColumnMapping(headers);
        setColumnMapping(detected);

        setIsLoading(false);
        setStep('mapping');
      } catch (err) {
        console.error('Error reading spreadsheet file', err);
        setErrorMessage('حدث خطأ أثناء قراءة ملف الشيت. يرجى التأكد من صيغة الملف (.xlsx أو .xls أو .csv).');
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setErrorMessage('فشل في قراءة الملف.');
      setIsLoading(false);
    };

    reader.readAsBinaryString(file);
  };

  // Process Direct Paste from Clipboard (Google Sheets / Excel)
  const handleProcessPastedText = () => {
    if (!pastedText.trim()) {
      setErrorMessage('يرجى لصق بيانات جدولية من الشيت أولاً.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      setFileName('بيانات ملصوقة من الشيت (Clipboard)');

      // Split lines
      const lines = pastedText.trim().split(/\r?\n/);
      if (lines.length === 0) {
        setErrorMessage('النص الملصوق فارغ.');
        setIsLoading(false);
        return;
      }

      // Check delimiter (Tab \t or Comma , or Semicolon ;)
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
        setErrorMessage('لم يتم العثور على صفوف صالحة في النص الملصوق.');
        setIsLoading(false);
        return;
      }

      setRawHeaders(headers);
      setRawRows(rows);
      setColumnMapping(autoDetectColumnMapping(headers));
      setIsLoading(false);
      setStep('mapping');
    } catch (err) {
      console.error('Error parsing pasted sheet text', err);
      setErrorMessage('تعذر قراءة النص الملصوق. يرجى التأكد من نسخ صفوف كاملة من الشيت.');
      setIsLoading(false);
    }
  };

  // Convert Raw Rows to Processed Rows using Mapping (Import As-Is without arithmetic or invented units)
  const handleProceedToPreview = () => {
    if (!columnMapping.name) {
      setErrorMessage('حقل "اسم الصنف" إلزامي. يرجى تحديد العمود المقابل له.');
      return;
    }

    setErrorMessage(null);

    // Helper to safely parse raw number from cell without any math
    const parseNumberDirect = (val: any): number => {
      if (val === undefined || val === null || val === '') return NaN;
      if (typeof val === 'number') return isNaN(val) ? NaN : val;
      const str = String(val).trim();
      if (!str) return NaN;
      const cleaned = str.replace(/[^0-9.-]+/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? NaN : num;
    };

    // Auto-grouping mode (only when explicit and rows.length >= 2)
    if (autoGroupUnits) {
      const groupsMap = new Map<string, Record<string, any>[]>();

      rawRows.forEach((r) => {
        const nameVal = String(r[columnMapping.name] || '').trim();
        if (!nameVal) return;
        // Group strictly by normalized product name so multiple unit rows and barcode rows are merged!
        const key = nameVal.toLowerCase().replace(/\s+/g, ' ');
        
        if (!groupsMap.has(key)) {
          groupsMap.set(key, []);
        }
        groupsMap.get(key)!.push(r);
      });

      const processed: ParsedRow[] = [];
      let idx = 0;

      groupsMap.forEach((rows) => {
        idx++;
        const firstRow = rows[0];
        const nameVal = String(firstRow[columnMapping.name] || '').trim();
        
        // Find barcodes across all rows for this product
        const allBarcodes: string[] = [];
        if (columnMapping.barcode) {
          rows.forEach(r => {
            const b = String(r[columnMapping.barcode] || '').trim();
            if (b && !allBarcodes.includes(b)) {
              allBarcodes.push(b);
            }
          });
        }
        const barcodeVal = allBarcodes[0] || '';
        const extraBarcodes = allBarcodes.slice(1);

        // Smart Category classification:
        const rawCat = columnMapping.category ? String(firstRow[columnMapping.category] || '').trim() : '';
        const categoryVal = classifyProductCategory(nameVal, rawCat);

        const supplierNameVal = columnMapping.supplierName ? String(firstRow[columnMapping.supplierName] || '').trim() : '';
        const notesVal = columnMapping.notes ? String(firstRow[columnMapping.notes] || '').trim() : '';

        // Extract unit rows details
        interface ParsedUnitRow {
          rawRow: Record<string, any>;
          cleanUnit: string;
          ratio: number;
          salePrice: number;
          purchasePrice: number;
          stock: number;
          tierPrice: number;
        }

        const parsedRowsList: ParsedUnitRow[] = rows.map(r => {
          const rawUnitStr = columnMapping.unit ? String(r[columnMapping.unit] || '') : (columnMapping.majorUnit ? String(r[columnMapping.majorUnit] || '') : (columnMapping.minorUnit ? String(r[columnMapping.minorUnit] || '') : ''));
          const cleanU = cleanUnitString(rawUnitStr, 'قطعة');
          
          let parsedRatio = columnMapping.piecesPerMajorUnit ? parseNumberDirect(r[columnMapping.piecesPerMajorUnit]) : NaN;
          if (isNaN(parsedRatio) || parsedRatio <= 0) {
            // Attempt to extract digits from packaging string (e.g. 20Units, Bouat 20, 12Sachi, 10, 24)
            const numMatch = rawUnitStr.match(/(\d+)\s*(?:units?|pies|pieces?|sachi|bouat)?/i);
            if (numMatch && numMatch[1]) {
              const ext = parseInt(numMatch[1], 10);
              if (!isNaN(ext) && ext > 1) parsedRatio = ext;
            }
          }
          if (isNaN(parsedRatio) || parsedRatio <= 0) {
            if (cleanU === 'كرتونة' || cleanU === 'فاردو' || cleanU === 'صندوق') parsedRatio = 12;
            else if (cleanU === 'علبة' || cleanU === 'باكت') parsedRatio = 6;
            else parsedRatio = 1;
          }

          const sPrice = columnMapping.salePriceMinor ? parseNumberDirect(r[columnMapping.salePriceMinor]) : (columnMapping.salePriceMajor ? parseNumberDirect(r[columnMapping.salePriceMajor]) : NaN);
          const pPrice = columnMapping.purchasePriceMinor ? parseNumberDirect(r[columnMapping.purchasePriceMinor]) : (columnMapping.purchasePriceMajor ? parseNumberDirect(r[columnMapping.purchasePriceMajor]) : NaN);
          const st = columnMapping.stockPieces ? parseNumberDirect(r[columnMapping.stockPieces]) : 0;
          const tp = columnMapping.tierPrice ? parseNumberDirect(r[columnMapping.tierPrice]) : 0;

          return {
            rawRow: r,
            cleanUnit: cleanU,
            ratio: parsedRatio,
            salePrice: !isNaN(sPrice) ? sPrice : 0,
            purchasePrice: !isNaN(pPrice) ? pPrice : 0,
            stock: !isNaN(st) ? st : 0,
            tierPrice: !isNaN(tp) ? tp : 0
          };
        });

        // Group rows by distinct ratios
        const minorRows = parsedRowsList.filter(pr => pr.ratio <= 1);
        const packagingRows = parsedRowsList.filter(pr => pr.ratio > 1);

        // Sort packaging rows by ratio ascending
        packagingRows.sort((a, b) => a.ratio - b.ratio);

        let minorUnit = 'قطعة';
        let middleUnit: string | undefined = undefined;
        let majorUnit = 'قطعة';
        let piecesPerMajorUnit = 1;
        let piecesPerMiddleUnit: number | undefined = undefined;
        let pMinor = 0;
        let pMiddle: number | undefined = undefined;
        let pMajor = 0;
        let sMinor = 0;
        let sMiddle: number | undefined = undefined;
        let sMajor = 0;
        let totalStockPieces = 0;
        let minAlert = 10;
        let tierNote = '';

        // Minor Unit details:
        if (minorRows.length > 0) {
          const mRow = minorRows.find(r => r.salePrice > 0) || minorRows[0];
          minorUnit = mRow.cleanUnit || 'قطعة';
          sMinor = mRow.salePrice;
          pMinor = mRow.purchasePrice;

          // De-duplicate minor stock: in POS sheets, barcode rows repeat identical stock
          const minorStocks = minorRows.map(r => r.stock);
          const uniqueStocks = Array.from(new Set(minorStocks));
          if (uniqueStocks.length === 1) {
            totalStockPieces += uniqueStocks[0];
          } else {
            const maxSt = Math.max(...minorStocks);
            totalStockPieces += maxSt;
          }
        }

        // Deduce distinct packaging units (Middle / Major):
        const distinctPackaging: ParsedUnitRow[] = [];
        packagingRows.forEach(pr => {
          if (!distinctPackaging.some(dp => dp.ratio === pr.ratio)) {
            distinctPackaging.push(pr);
          }
        });

        if (distinctPackaging.length >= 2) {
          // Three units! (Minor, Middle, Major)
          const midRow = distinctPackaging[0];
          const majRow = distinctPackaging[distinctPackaging.length - 1];

          middleUnit = midRow.cleanUnit !== minorUnit ? midRow.cleanUnit : 'علبة';
          piecesPerMiddleUnit = midRow.ratio;
          sMiddle = midRow.salePrice > 0 ? midRow.salePrice : (sMinor * piecesPerMiddleUnit);
          pMiddle = midRow.purchasePrice > 0 ? midRow.purchasePrice : (pMinor * piecesPerMiddleUnit);
          if (midRow.stock !== 0) {
            totalStockPieces += (midRow.stock * piecesPerMiddleUnit);
          }

          majorUnit = majRow.cleanUnit !== minorUnit && majRow.cleanUnit !== middleUnit ? majRow.cleanUnit : 'كرتونة';
          piecesPerMajorUnit = majRow.ratio;
          sMajor = majRow.salePrice > 0 ? majRow.salePrice : (sMinor * piecesPerMajorUnit);
          pMajor = majRow.purchasePrice > 0 ? majRow.purchasePrice : (pMinor * piecesPerMajorUnit);
          if (majRow.stock !== 0) {
            totalStockPieces += (majRow.stock * piecesPerMajorUnit);
          }

          if (majRow.tierPrice > 0) {
            tierNote = `سعر 5 فما فوق للـ${majorUnit}: ${majRow.tierPrice}`;
          }
        } else if (distinctPackaging.length === 1) {
          // Dual units! (Minor, Major)
          const majRow = distinctPackaging[0];

          majorUnit = majRow.cleanUnit !== minorUnit ? majRow.cleanUnit : 'كرتونة';
          piecesPerMajorUnit = majRow.ratio;
          sMajor = majRow.salePrice > 0 ? majRow.salePrice : (sMinor * piecesPerMajorUnit);
          pMajor = majRow.purchasePrice > 0 ? majRow.purchasePrice : (pMinor * piecesPerMajorUnit);
          if (majRow.stock !== 0) {
            totalStockPieces += (majRow.stock * piecesPerMajorUnit);
          }

          if (majRow.tierPrice > 0) {
            tierNote = `سعر 5 فما فوق للـ${majorUnit}: ${majRow.tierPrice}`;
          }
        } else {
          // Only single unit
          majorUnit = minorUnit;
          piecesPerMajorUnit = 1;
          sMajor = sMinor;
          pMajor = pMinor;
        }

        // Tier price from any row if not already set
        if (!tierNote && columnMapping.tierPrice) {
          const rowWithTier = rows.find(r => parseNumberDirect(r[columnMapping.tierPrice]) > 0);
          if (rowWithTier) {
            const tVal = parseNumberDirect(rowWithTier[columnMapping.tierPrice]);
            tierNote = `سعر 5 فما فوق: ${tVal}`;
          }
        }

        // Additional barcodes in notes
        if (extraBarcodes.length > 0) {
          const extraStr = `باركود إضافي: ${extraBarcodes.join(', ')}`;
          tierNote = [tierNote, extraStr].filter(Boolean).join(' | ');
        }

        // Min Stock Alert
        if (columnMapping.minStockAlert && firstRow[columnMapping.minStockAlert]) {
          const al = parseNumberDirect(firstRow[columnMapping.minStockAlert]);
          if (!isNaN(al)) minAlert = al;
        }

        const matchedSupplier = suppliers.find(s => s.name.toLowerCase() === supplierNameVal.toLowerCase());

        const existingMatch = existingProducts.find(
          p => (barcodeVal && p.barcode === barcodeVal) || (nameVal && p.name.toLowerCase() === nameVal.toLowerCase())
        );

        const generatedBarcode = barcodeVal || (existingMatch ? existingMatch.barcode : `628${Math.floor(100000000 + Math.random() * 900000000)}`);

        const errorMessages: string[] = [];
        if (!nameVal) errorMessages.push('اسم الصنف مفقود');

        const finalNotes = [notesVal, tierNote].filter(Boolean).join(' | ');

        const mappedProduct: Partial<Product> = {
          id: existingMatch ? existingMatch.id : `prod_imp_${Date.now()}_${idx}`,
          name: nameVal,
          barcode: generatedBarcode,
          category: categoryVal,
          majorUnit: majorUnit,
          middleUnit: middleUnit,
          minorUnit: minorUnit,
          piecesPerMajorUnit: piecesPerMajorUnit,
          piecesPerMiddleUnit: piecesPerMiddleUnit,
          purchasePriceMinor: Math.max(0, pMinor || 0),
          purchasePriceMiddle: pMiddle !== undefined ? Math.max(0, pMiddle) : undefined,
          purchasePriceMajor: Math.max(0, pMajor || 0),
          salePriceMinor: Math.max(0, sMinor || 0),
          salePriceMiddle: sMiddle !== undefined ? Math.max(0, sMiddle) : undefined,
          salePriceMajor: Math.max(0, sMajor || 0),
          stockPieces: Math.max(0, totalStockPieces || 0),
          minStockAlert: Math.max(0, minAlert || 0),
          defaultSupplierId: matchedSupplier ? matchedSupplier.id : (existingMatch?.defaultSupplierId || ''),
          defaultSupplierName: supplierNameVal || (existingMatch?.defaultSupplierName || ''),
          notes: finalNotes || (existingMatch?.notes || ''),
          createdAt: existingMatch ? existingMatch.createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        processed.push({
          raw: firstRow,
          mapped: mappedProduct,
          isDuplicate: !!existingMatch,
          existingMatch: existingMatch,
          hasErrors: errorMessages.length > 0,
          errorMessages: errorMessages,
          selected: errorMessages.length === 0,
        });
      });

      setProcessedRows(processed);
      setStep('preview');
      return;
    }

    // Default 1:1 Row-by-Row mapping: input exact information from sheet without multiplication, division, or phantom units
    const processed: ParsedRow[] = rawRows.map((rawRow, idx) => {
      const nameVal = String(rawRow[columnMapping.name] || '').trim();
      const barcodeVal = columnMapping.barcode ? String(rawRow[columnMapping.barcode] || '').trim() : '';
      const rawCat = columnMapping.category ? String(rawRow[columnMapping.category] || '').trim() : '';
      const categoryVal = classifyProductCategory(nameVal, rawCat);
      
      // Unit extraction - do not invent "كرتونة" if not present in the sheet
      const rawUnitVal = columnMapping.unit && rawRow[columnMapping.unit] ? cleanUnitString(rawRow[columnMapping.unit], '') : '';
      const rawMinorVal = columnMapping.minorUnit && rawRow[columnMapping.minorUnit] ? cleanUnitString(rawRow[columnMapping.minorUnit], '') : '';
      const rawMiddleVal = columnMapping.middleUnit && rawRow[columnMapping.middleUnit] ? cleanUnitString(rawRow[columnMapping.middleUnit], '') : '';
      const rawMajorVal = columnMapping.majorUnit && rawRow[columnMapping.majorUnit] ? cleanUnitString(rawRow[columnMapping.majorUnit], '') : '';
      
      const rawPiecesMid = columnMapping.piecesPerMiddleUnit ? parseNumberDirect(rawRow[columnMapping.piecesPerMiddleUnit]) : NaN;
      const rawPiecesMaj = columnMapping.piecesPerMajorUnit ? parseNumberDirect(rawRow[columnMapping.piecesPerMajorUnit]) : NaN;

      const hasThreeUnits = Boolean(
        rawMiddleVal &&
        rawMajorVal &&
        rawMinorVal &&
        rawMiddleVal.toLowerCase() !== rawMinorVal.toLowerCase() &&
        rawMiddleVal.toLowerCase() !== rawMajorVal.toLowerCase() &&
        !isNaN(rawPiecesMid) &&
        rawPiecesMid > 1
      );

      const hasTwoUnits = Boolean(
        rawMajorVal && rawMinorVal && rawMajorVal.trim().toLowerCase() !== rawMinorVal.trim().toLowerCase()
      );

      let minorUnitVal = 'قطعة';
      let middleUnitVal: string | undefined = undefined;
      let majorUnitVal = 'قطعة';
      let piecesPerMajorUnit = 1;
      let piecesPerMiddleUnit: number | undefined = undefined;
      let pMiddle: number | undefined = undefined;
      let sMiddle: number | undefined = undefined;

      if (hasThreeUnits) {
        minorUnitVal = rawMinorVal;
        middleUnitVal = rawMiddleVal;
        majorUnitVal = rawMajorVal;
        piecesPerMiddleUnit = rawPiecesMid;
        piecesPerMajorUnit = !isNaN(rawPiecesMaj) && rawPiecesMaj > rawPiecesMid ? rawPiecesMaj : (rawPiecesMid * 2);

        const parsedSMid = columnMapping.salePriceMiddle ? parseNumberDirect(rawRow[columnMapping.salePriceMiddle]) : NaN;
        if (!isNaN(parsedSMid)) sMiddle = parsedSMid;

        const parsedPMid = columnMapping.purchasePriceMiddle ? parseNumberDirect(rawRow[columnMapping.purchasePriceMiddle]) : NaN;
        if (!isNaN(parsedPMid)) pMiddle = parsedPMid;
      } else if (hasTwoUnits) {
        majorUnitVal = rawMajorVal;
        minorUnitVal = rawMinorVal;
        piecesPerMajorUnit = !isNaN(rawPiecesMaj) && rawPiecesMaj > 1 ? rawPiecesMaj : 12;
      } else {
        const singleUnit = rawMajorVal || rawUnitVal || rawMinorVal || 'قطعة';
        majorUnitVal = singleUnit;
        minorUnitVal = singleUnit;
        piecesPerMajorUnit = 1;
      }

      // Sale Prices - take directly as-is without any multiplication or division
      const parsedSMinor = columnMapping.salePriceMinor ? parseNumberDirect(rawRow[columnMapping.salePriceMinor]) : NaN;
      const parsedSMajor = columnMapping.salePriceMajor ? parseNumberDirect(rawRow[columnMapping.salePriceMajor]) : NaN;
      const sMinor = !isNaN(parsedSMinor) ? parsedSMinor : (!isNaN(parsedSMajor) ? parsedSMajor : 0);
      const sMajor = !isNaN(parsedSMajor) ? parsedSMajor : sMinor;

      if (hasThreeUnits && sMiddle === undefined) {
        sMiddle = sMinor * (piecesPerMiddleUnit || 1);
      }

      // Purchase Prices - take directly as-is without any math or artificial markup
      const parsedPMinor = columnMapping.purchasePriceMinor ? parseNumberDirect(rawRow[columnMapping.purchasePriceMinor]) : NaN;
      const parsedPMajor = columnMapping.purchasePriceMajor ? parseNumberDirect(rawRow[columnMapping.purchasePriceMajor]) : NaN;
      const pMinor = !isNaN(parsedPMinor) ? parsedPMinor : (!isNaN(parsedPMajor) ? parsedPMajor : 0);
      const pMajor = !isNaN(parsedPMajor) ? parsedPMajor : pMinor;

      if (hasThreeUnits && pMiddle === undefined) {
        pMiddle = pMinor * (piecesPerMiddleUnit || 1);
      }

      // Stock Quantity - take directly as-is from the sheet
      const parsedStock = columnMapping.stockPieces ? parseNumberDirect(rawRow[columnMapping.stockPieces]) : 0;
      const stockPieces = !isNaN(parsedStock) ? parsedStock : 0;

      // Min Alert
      const alertRaw = columnMapping.minStockAlert ? parseNumberDirect(rawRow[columnMapping.minStockAlert]) : 10;
      const minStockAlert = !isNaN(alertRaw) ? alertRaw : 10;

      const supplierNameVal = columnMapping.supplierName ? String(rawRow[columnMapping.supplierName] || '').trim() : '';
      let notesVal = columnMapping.notes ? String(rawRow[columnMapping.notes] || '').trim() : '';

      if (columnMapping.tierPrice && rawRow[columnMapping.tierPrice]) {
        const tVal = parseNumberDirect(rawRow[columnMapping.tierPrice]);
        if (!isNaN(tVal) && tVal > 0) notesVal = notesVal ? `${notesVal} | سعر 5+: ${tVal}` : `سعر 5+: ${tVal}`;
      }

      const matchedSupplier = suppliers.find(s => s.name.toLowerCase() === supplierNameVal.toLowerCase());

      const errorMessages: string[] = [];
      if (!nameVal) {
        errorMessages.push('اسم الصنف مفقود');
      }

      const existingMatch = existingProducts.find(
        p => (barcodeVal && p.barcode === barcodeVal) || (nameVal && p.name.toLowerCase() === nameVal.toLowerCase())
      );

      const generatedBarcode = barcodeVal || (existingMatch ? existingMatch.barcode : `628${Math.floor(100000000 + Math.random() * 900000000)}`);

      const mappedProduct: Partial<Product> = {
        id: existingMatch ? existingMatch.id : `prod_imp_${Date.now()}_${idx}`,
        name: nameVal,
        barcode: generatedBarcode,
        category: categoryVal || 'عام',
        majorUnit: majorUnitVal,
        middleUnit: middleUnitVal,
        minorUnit: minorUnitVal,
        piecesPerMajorUnit: piecesPerMajorUnit,
        piecesPerMiddleUnit: piecesPerMiddleUnit,
        purchasePriceMinor: Math.max(0, pMinor || 0),
        purchasePriceMiddle: pMiddle !== undefined ? Math.max(0, pMiddle) : undefined,
        purchasePriceMajor: Math.max(0, pMajor || 0),
        salePriceMinor: Math.max(0, sMinor || 0),
        salePriceMiddle: sMiddle !== undefined ? Math.max(0, sMiddle) : undefined,
        salePriceMajor: Math.max(0, sMajor || 0),
        stockPieces: Math.max(0, stockPieces || 0),
        minStockAlert: Math.max(0, minStockAlert || 0),
        defaultSupplierId: matchedSupplier ? matchedSupplier.id : (existingMatch?.defaultSupplierId || ''),
        defaultSupplierName: supplierNameVal || (existingMatch?.defaultSupplierName || ''),
        notes: notesVal || (existingMatch?.notes || ''),
        createdAt: existingMatch ? existingMatch.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return {
        raw: rawRow,
        mapped: mappedProduct,
        isDuplicate: !!existingMatch,
        existingMatch: existingMatch,
        hasErrors: errorMessages.length > 0,
        errorMessages: errorMessages,
        selected: errorMessages.length === 0,
      };
    });

    setProcessedRows(processed);
    setStep('preview');
  };

  // Load Preset Matching POS Sheet with 1-unit, 2-unit, and 3-unit examples
  const handleLoadPOSPresetDemo = () => {
    const samplePasted = `الاسم\tالكود\tالوحدة\tعدد القطع\tسعر البيع\tالرصيد\tسعر 5 ومافوق
بسكويت أوريو الأصلي\t628100777\tMS/ قطعة\t1\t50\t100\t0
بسكويت أوريو الأصلي\t628100777\tMS/ باكت 12 قطعة\t12\t550\t10\t520
بسكويت أوريو الأصلي\t628100777\tMS/ كرتونة 72 قطعة\t72\t3100\t2\t3000
مصاصة ساشي Bifa GOOD POP\t628100123\tMS/ قطعة\t1\t270\t0\t0
مصاصة ساشي Bifa GOOD POP\t628100123\tMS/ فاردو Sachi 10\t10\t2500\t0\t0
شوكولاتة نوتيلا ميني 30 غرام\t628100456\tMS/ قطعة\t1\t120\t50\t0
شوكولاتة نوتيلا ميني 30 غرام\t628100456\tMS/ كرتونة 24\t24\t2600\t2\t2500
حليب مكثف محلى نستله 395غ\t628100999\tMS/ حبة\t1\t450\t25\t0`;

    setPastedText(samplePasted);
  };

  // Toggle selection of row
  const toggleRowSelected = (idx: number) => {
    setProcessedRows(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], selected: !copy[idx].selected };
      return copy;
    });
  };

  // Toggle select all
  const toggleSelectAll = (select: boolean) => {
    setProcessedRows(prev => prev.map(r => r.hasErrors ? r : { ...r, selected: select }));
  };

  // Change category of a specific row
  const handleRowCategoryChange = (idx: number, newCategory: string) => {
    setProcessedRows(prev => {
      const copy = [...prev];
      if (copy[idx]) {
        copy[idx] = {
          ...copy[idx],
          mapped: {
            ...copy[idx].mapped,
            category: newCategory,
          },
        };
      }
      return copy;
    });
  };

  // Execute Bulk Import
  const handleExecuteImport = () => {
    const selectedValidRows = processedRows.filter(r => r.selected && !r.hasErrors);
    if (selectedValidRows.length === 0) {
      setErrorMessage('لا توجد صفوف صالحة ومحددة للاستيراد.');
      return;
    }

    const finalProducts: Product[] = selectedValidRows.map(r => r.mapped as Product);
    onBulkImport(finalProducts, importStrategy);

    setSuccessToast(`تم بنجاح استيراد وتحديث ${finalProducts.length} صنف في المخزن!`);
    setTimeout(() => {
      setSuccessToast(null);
      onClose();
    }, 1200);
  };

  // Template Downloader (.xlsx & .csv) matching exact POS Sheet format with 1, 2, and 3 unit samples
  const downloadSampleTemplate = (format: 'xlsx' | 'csv') => {
    const sampleData = [
      {
        'الاسم': 'بسكويت أوريو الأصلي (3 وحدات)',
        'الكود': '628100777111',
        'الوحدة': 'MS/ قطعة',
        'عدد القطع': 1,
        'سعر البيع': 50,
        'الرصيد': 100,
        'سعر 5 ومافوق': 0
      },
      {
        'الاسم': 'بسكويت أوريو الأصلي (3 وحدات)',
        'الكود': '628100777111',
        'الوحدة': 'MS/ باكت 12 قطعة',
        'عدد القطع': 12,
        'سعر البيع': 550,
        'الرصيد': 10,
        'سعر 5 ومافوق': 520
      },
      {
        'الاسم': 'بسكويت أوريو الأصلي (3 وحدات)',
        'الكود': '628100777111',
        'الوحدة': 'MS/ كرتونة 72 قطعة',
        'عدد القطع': 72,
        'سعر البيع': 3100,
        'الرصيد': 2,
        'سعر 5 ومافوق': 3000
      },
      {
        'الاسم': 'مصاصة ساشي Bifa GOOD POP (وحدتان)',
        'الكود': '628100123456',
        'الوحدة': 'MS/ قطعة',
        'عدد القطع': 1,
        'سعر البيع': 270,
        'الرصيد': 0,
        'سعر 5 ومافوق': 0
      },
      {
        'الاسم': 'مصاصة ساشي Bifa GOOD POP (وحدتان)',
        'الكود': '628100123456',
        'الوحدة': 'MS/ فاردو Sachi 10',
        'عدد القطع': 10,
        'سعر البيع': 2500,
        'الرصيد': 0,
        'سعر 5 ومافوق': 0
      },
      {
        'الاسم': 'حليب مكثف محلى نستله (وحدة واحدة)',
        'الكود': '628100999888',
        'الوحدة': 'MS/ حبة',
        'عدد القطع': 1,
        'سعر البيع': 450,
        'الرصيد': 25,
        'سعر 5 ومافوق': 0
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'شيت نقاط البيع');

    if (format === 'xlsx') {
      XLSX.writeFile(wb, 'قالب_شيت_الاصناف_نقاط_البيع.xlsx');
    } else {
      XLSX.writeFile(wb, 'قالب_شيت_الاصناف_نقاط_البيع.csv', { bookType: 'csv' });
    }
  };

  // Export Current Products
  const exportCurrentProducts = () => {
    const exportData = existingProducts.map(p => ({
      'اسم الصنف': p.name,
      'الباركود': p.barcode,
      'التصنيف': p.category,
      'الوحدة الكبرى': p.majorUnit,
      'الوحدة الصغرى': p.minorUnit,
      'عدد القطع بالكبرى': p.piecesPerMajorUnit,
      'سعر الشراء (للقطعة)': p.purchasePriceMinor,
      'سعر البيع (للقطعة)': p.salePriceMinor,
      'سعر شراء الكبرى': p.purchasePriceMajor,
      'سعر بيع الكبرى': p.salePriceMajor,
      'الكمية المتوفرة (بالقطعة)': p.stockPieces,
      'حد التنبيه': p.minStockAlert,
      'اسم المورد': p.defaultSupplierName || '',
      'ملاحظات': p.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'أصناف المخزون');
    XLSX.writeFile(wb, `تصدير_اصناف_المخزون_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Filtered rows for preview table
  const displayedRows = processedRows.filter((r, idx) => {
    const matchesSearch = 
      (r.mapped.name || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      (r.mapped.barcode || '').includes(searchFilter) ||
      (r.mapped.category || '').toLowerCase().includes(searchFilter.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'new') return !r.isDuplicate && !r.hasErrors;
    if (filterType === 'duplicates') return r.isDuplicate && !r.hasErrors;
    if (filterType === 'errors') return r.hasErrors;
    return true;
  });

  const selectedCount = processedRows.filter(r => r.selected && !r.hasErrors).length;
  const duplicatesCount = processedRows.filter(r => r.isDuplicate && !r.hasErrors).length;
  const newCount = processedRows.filter(r => !r.isDuplicate && !r.hasErrors).length;
  const errorsCount = processedRows.filter(r => r.hasErrors).length;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-emerald-500/30 rounded-3xl w-full max-w-4xl p-4 sm:p-6 shadow-2xl text-slate-100 my-auto max-h-[94vh] flex flex-col animate-in zoom-in-95"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-white">استيراد الأصناف من الشيت (Excel / Google Sheets)</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                استيراد ذكي وفوري لكافة الأعمدة والوحدات والأسعار والمخزون
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="close-circle-btn"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Indicator Bar */}
        <div className="grid grid-cols-3 gap-2 py-3 border-b border-slate-800 text-xs shrink-0">
          <div className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
            step === 'upload' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold' : 'bg-slate-850 border-slate-800 text-slate-400'
          }`}>
            <span className="w-5 h-5 rounded-full bg-slate-800 text-center flex items-center justify-center font-bold text-[11px]">1</span>
            <span className="truncate">رفع الملف أو اللصق</span>
          </div>

          <div className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
            step === 'mapping' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold' : 'bg-slate-850 border-slate-800 text-slate-400'
          }`}>
            <span className="w-5 h-5 rounded-full bg-slate-800 text-center flex items-center justify-center font-bold text-[11px]">2</span>
            <span className="truncate">مطابقة الأعمدة</span>
          </div>

          <div className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
            step === 'preview' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold' : 'bg-slate-850 border-slate-800 text-slate-400'
          }`}>
            <span className="w-5 h-5 rounded-full bg-slate-800 text-center flex items-center justify-center font-bold text-[11px]">3</span>
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
            {/* Quick Actions: Download Template & Export Existing & Sample Loader */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-850 border border-slate-800 rounded-2xl text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold">قوالب ونماذج جاهزة:</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleLoadPOSPresetDemo}
                  className="py-1.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1.5 transition-all"
                  title="تعبئة نموذج تجريبي لشيت نقاط البيع (مصاصة ساشي / شوكولاتة)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>تعبئة نموذج شيت نقاط البيع</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadSampleTemplate('xlsx')}
                  className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-bold flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل قالب Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={exportCurrentProducts}
                  className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold flex items-center gap-1.5 transition-all"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>تصدير المخزون الحالي</span>
                </button>
              </div>
            </div>

            {/* Drag & Drop / File Input Box */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-slate-850/60 hover:bg-slate-850 transition-all rounded-3xl p-6 sm:p-8 text-center cursor-pointer flex flex-col items-center justify-center space-y-3 group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx, .xls, .csv"
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-black text-white text-sm sm:text-base">انقر لاختيار ملف الشيت أو اسحبه وأفلته هنا</h4>
                <p className="text-xs text-slate-400 mt-1">يدعم ملفات Excel (.xlsx, .xls) وملفات CSV</p>
              </div>
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                استيراد تلقائي لكافة الأعمدة والوحدات
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
                placeholder="اسم الصنف	الباركود	التصنيف	سعر الشراء	سعر البيع	الكمية&#10;أرز بسمتي	6281001	مواد غذائية	120	150	50"
                className="w-full bg-slate-850 border border-slate-700 rounded-2xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                dir="auto"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!pastedText.trim() || isLoading}
                  onClick={handleProcessPastedText}
                  className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
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
              يقوم النظام بربط أعمدة ملفك تلقائياً بحقول التطبيق. يمكنك تعديل أي حقل إذا كانت تسميات الأعمدة لديك مختلفة:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {/* Product Name (Mandatory) */}
              <div className="bg-slate-850 p-3 rounded-2xl border border-emerald-500/50 space-y-1">
                <label className="text-emerald-400 font-bold block">اسم الصنف * (إلزامي)</label>
                <select
                  value={columnMapping.name}
                  onChange={(e) => setColumnMapping({ ...columnMapping, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- اختر عمود اسم الصنف --</option>
                  {rawHeaders.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Barcode / Code */}
              <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800 space-y-1">
                <label className="text-slate-300 font-bold block">الباركود / الكود</label>
                <select
                  value={columnMapping.barcode}
                  onChange={(e) => setColumnMapping({ ...columnMapping, barcode: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- توليد تلقائي إن لم يوجد --</option>
                  {rawHeaders.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Unit (From Sheet e.g., MS/ قطعة / MS/ فاردو) */}
              <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800 space-y-1">
                <label className="text-emerald-400 font-bold block">الوحدة (من الشيت)</label>
                <select
                  value={columnMapping.unit}
                  onChange={(e) => setColumnMapping({ ...columnMapping, unit: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- تنظيف تلقائي (MS/ قطعة إلخ) --</option>
                  {rawHeaders.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Pieces Per Major / Number of Pieces */}
              <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800 space-y-1">
                <label className="text-slate-300 font-bold block">عدد القطع (معامل التحويل)</label>
                <select
                  value={columnMapping.piecesPerMajorUnit}
                  onChange={(e) => setColumnMapping({ ...columnMapping, piecesPerMajorUnit: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- افتراضي (12 أو 1) --</option>
                  {rawHeaders.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Sale Price */}
              <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800 space-y-1">
                <label className="text-emerald-400 font-bold block">سعر البيع</label>
                <select
                  value={columnMapping.salePriceMinor}
                  onChange={(e) => setColumnMapping({ ...columnMapping, salePriceMinor: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- اختر عمود سعر البيع --</option>
                  {rawHeaders.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Tier Price (e.g. سعر 5 ومافوق / سعر الجملة) */}
              <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800 space-y-1">
                <label className="text-cyan-400 font-bold block">سعر 5 ومافوق (سعر الجملة)</label>
                <select
                  value={columnMapping.tierPrice}
                  onChange={(e) => setColumnMapping({ ...columnMapping, tierPrice: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- اختياري (سعر 5 فما فوق) --</option>
                  {rawHeaders.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Stock Quantity / Balance */}
              <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800 space-y-1">
                <label className="text-slate-300 font-bold block">الرصيد / الكمية بالمخزن</label>
                <select
                  value={columnMapping.stockPieces}
                  onChange={(e) => setColumnMapping({ ...columnMapping, stockPieces: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- اختر عمود الرصيد --</option>
                  {rawHeaders.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Purchase Price */}
              <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800 space-y-1">
                <label className="text-amber-400 font-bold block">سعر الشراء (التكلفة)</label>
                <select
                  value={columnMapping.purchasePriceMinor}
                  onChange={(e) => setColumnMapping({ ...columnMapping, purchasePriceMinor: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- اختياري (إن وجد) --</option>
                  {rawHeaders.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800 space-y-1">
                <label className="text-slate-300 font-bold block">التصنيف / القسم</label>
                <select
                  value={columnMapping.category}
                  onChange={(e) => setColumnMapping({ ...columnMapping, category: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- افتراضي (عام) --</option>
                  {rawHeaders.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Smart Multi-Unit Grouping Toggle Card */}
            <div className="bg-slate-850/90 border border-emerald-500/40 rounded-2xl p-3.5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">
                    الدمج الذكي للوحدات المتعددة (القطعة + الفاردو / الكرتونة للصنف الواحد)
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    عند تفعيل هذا الخيار، سيتم تجميع الصفوف التي تحمل نفس اسم الصنف (مثل صف &quot;قطعة&quot; بسعر 270 وصف &quot;فاردو 10 قطع&quot; بسعر 2500) في بطاقة صنف واحدة موحدة مع تنظيف بادئات النصوص (MS/).
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={autoGroupUnits}
                  onChange={(e) => setAutoGroupUnits(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

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
                className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/30"
              >
                <span>معاينة الأصناف والتحقق</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: Live Preview & Confirm ================= */}
        {step === 'preview' && (
          <div className="py-4 space-y-3.5 overflow-y-auto flex-1 pr-1 flex flex-col">
            {/* Duplicate Strategy & Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-850 p-3.5 rounded-2xl border border-slate-800 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1.5">
                  خطة التعامل مع الأصناف الموجودة مسبقاً في المخزن ({duplicatesCount}):
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
                    تحديث وإضافة كمية
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
                    الكل ({processedRows.length})
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
                    مكرر ({duplicatesCount})
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
                placeholder="تصفية الأصناف بالاسم أو الباركود..."
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

            {/* Data Preview Table */}
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900 flex-1 max-h-72 overflow-y-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-800 text-slate-300 font-bold sticky top-0 z-10 text-[11px]">
                  <tr>
                    <th className="p-2.5 w-10 text-center">اختيار</th>
                    <th className="p-2.5">اسم الصنف</th>
                    <th className="p-2.5">القسم / التصنيف</th>
                    <th className="p-2.5">الباركود / الكود</th>
                    <th className="p-2.5">الوحدات والتعبئة</th>
                    <th className="p-2.5">سعر التجزئة</th>
                    <th className="p-2.5">سعر الكبرى/الجملة</th>
                    <th className="p-2.5">الرصيد الإجمالي</th>
                    <th className="p-2.5">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {displayedRows.map((row, idx) => {
                    const origIndex = processedRows.indexOf(row);
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
                            checked={row.selected}
                            disabled={row.hasErrors}
                            onChange={() => toggleRowSelected(origIndex)}
                            className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="p-2.5 font-bold text-white max-w-[180px] truncate">
                          {row.mapped.name || <span className="text-rose-400 italic">مفقود</span>}
                          {row.mapped.notes && (
                            <span className="block text-[10px] font-normal text-slate-400 truncate mt-0.5">
                              {row.mapped.notes}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <select
                            value={row.mapped.category || 'عام'}
                            onChange={(e) => handleRowCategoryChange(origIndex, e.target.value)}
                            className="bg-slate-800/90 hover:bg-slate-800 border border-emerald-500/40 text-emerald-400 font-bold rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:border-emerald-400 cursor-pointer max-w-[140px]"
                            title="تغيير قسم الصنف"
                          >
                            {STORE_CATEGORY_NAMES.map(cat => (
                              <option key={cat} value={cat} className="bg-slate-900 text-white font-normal">
                                {cat}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2.5 font-mono text-slate-400 text-[11px]">
                          {row.mapped.barcode}
                        </td>
                        <td className="p-2.5 text-slate-300">
                          {row.mapped.middleUnit && row.mapped.piecesPerMiddleUnit ? (
                            <div className="inline-flex flex-col gap-0.5">
                              <span className="bg-cyan-950/80 px-2 py-0.5 rounded text-[10px] border border-cyan-500/50 text-cyan-300 font-bold">
                                3 وحدات: {row.mapped.minorUnit} • {row.mapped.middleUnit} ({row.mapped.piecesPerMiddleUnit}) • {row.mapped.majorUnit} ({row.mapped.piecesPerMajorUnit})
                              </span>
                            </div>
                          ) : row.mapped.piecesPerMajorUnit && row.mapped.piecesPerMajorUnit > 1 && row.mapped.majorUnit !== row.mapped.minorUnit ? (
                            <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] border border-slate-700">
                              {row.mapped.piecesPerMajorUnit} {row.mapped.minorUnit} / {row.mapped.majorUnit}
                            </span>
                          ) : (
                            <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] border border-slate-700 font-bold text-emerald-400">
                              {row.mapped.minorUnit || 'قطعة'}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 font-bold text-emerald-400">
                          {formatCurrency(row.mapped.salePriceMinor || 0, currency)}
                        </td>
                        <td className="p-2.5 text-slate-300 font-semibold">
                          {row.mapped.middleUnit && row.mapped.salePriceMiddle ? (
                            <div className="text-[11px] leading-tight space-y-0.5">
                              <div className="text-cyan-300 font-medium">وسطى: {formatCurrency(row.mapped.salePriceMiddle, currency)}</div>
                              <div className="text-emerald-300 font-bold">كبرى: {formatCurrency(row.mapped.salePriceMajor || 0, currency)}</div>
                            </div>
                          ) : row.mapped.piecesPerMajorUnit && row.mapped.piecesPerMajorUnit > 1 && row.mapped.majorUnit !== row.mapped.minorUnit ? (
                            formatCurrency(row.mapped.salePriceMajor || 0, currency)
                          ) : (
                            <span className="text-slate-500 font-normal text-xs">-</span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-200 font-bold">
                          {row.mapped.stockPieces} {row.mapped.minorUnit}
                        </td>
                        <td className="p-2.5">
                          {row.hasErrors ? (
                            <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              خطأ في البيانات
                            </span>
                          ) : row.isDuplicate ? (
                            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              موجود مسبقاً
                            </span>
                          ) : (
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              صنف جديد
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Final Execution Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setStep('mapping')}
                className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                تعديل المطابقة
              </button>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  سيتم حفظ <strong className="text-emerald-400">{selectedCount}</strong> صنف في قاعدة البيانات
                </span>
                <button
                  type="button"
                  disabled={selectedCount === 0}
                  onClick={handleExecuteImport}
                  className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/40 transition-all active:scale-95"
                >
                  <Database className="w-4 h-4" />
                  <span>تأكيد واستيراد الأصناف الآن</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
