/**
 * Smart Category Auto-Classifier for Retail & Grocery Products (especially Algerian / Maghreb stores)
 * Automatically places products into their correct categories/sections based on keywords, brands, and item types.
 */

export interface CategoryDefinition {
  id: string;
  name: string;
  keywords: string[];
}

export const STORE_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'biscuits_sweets',
    name: 'بسكويت وحلويات',
    keywords: [
      'bimo', 'bifa', 'biscuit', 'biscuits', 'cookie', 'cookies', 'tango', 'casse croute', 
      'cassecroute', 'sablé', 'sable', 'wafer', 'gaufrette', 'maxon', 'good pop', 'pop',
      'sucette', 'bonbon', 'bonbons', 'halwa', 'حلوى', 'حلويات', 'سكاكر', 'مصاصة', 'مصاصات', 
      'بسكويت', 'بيمو', 'بيفا', 'تانغو', 'كوكيز', 'قوفريط', 'كوفريط', 'صابلي', 'بتيفور', 
      'شامية', 'حلوة الترك', 'علكة', 'chewing gum', 'flash', 'طوقو'
    ]
  },
  {
    id: 'chocolates_snacks',
    name: 'شوكولاتة وسناكات',
    keywords: [
      'snakbar', 'snackbar', 'snack', 'snacks', 'sando', 'chocolat', 'chocolate', 'choco',
      'nutella', 'maxi', 'kinder', 'mars', 'twix', 'snickers', 'bounty', 'kitkat', 'oreo', 
      'chips', 'doritos', 'lays', 'mahboub', 'ساندو', 'سناك', 'سناكات', 'شوكولاتة', 'شكلاطة', 
      'كاكاو', 'شيبس', 'مقرمشات', 'مكسرات', 'فول سوداني', 'كاوكاو', 'بذور'
    ]
  },
  {
    id: 'groceries_staples',
    name: 'مواد غذائية وتموين',
    keywords: [
      'أرز', 'ارز', 'سكر', 'زيت', 'دقيق', 'فرينة', 'سميد', 'عجين', 'مكرونة', 'سباغيتي', 
      'طماطم', 'صلصة', 'تونة', 'سردين', 'كسكسي', 'ملح', 'بهارات', 'توابل', 'فريك', 'لوبيا', 
      'حمص', 'عدس', 'بقوليات', 'خميرة', 'خل', 'مايونيز', 'هريسة', 'خردل', 'moutarde', 
      'riz', 'sucre', 'huile', 'farine', 'semoule', 'pate', 'pates', 'spaghetti', 'macaroni', 
      'couscous', 'tomate', 'concentré', 'thon', 'sardine', 'sel', 'vinaigre', 'epice', 'elio',
      'afia', 'sim', 'mama', 'amor benamor', 'safina'
    ]
  },
  {
    id: 'drinks_beverages',
    name: 'مشروبات وعصائر',
    keywords: [
      'عصير', 'مشروب', 'ماء', 'مياه', 'مشروبات', 'غازية', 'صودا', 'كوكا', 'كوكاكولا', 'بيبسي', 
      'حمود', 'بوعلام', 'رامي', 'إفروخ', 'قهوة', 'شاي', 'نسكافيه', 'كابتشينو', 'شاي أخضر',
      'jus', 'eau', 'boisson', 'boissons', 'soda', 'coca', 'cola', 'pepsi', 'fanta', 'sprite', 
      'hamoud', 'boualem', 'ramy', 'ngaous', 'rouiba', 'ifri', 'saida', 'lalla khedidja', 
      'cafe', 'café', 'the', 'thé', 'nescafe', 'brik'
    ]
  },
  {
    id: 'dairy_cheese',
    name: 'ألبان وأجبان',
    keywords: [
      'حليب', 'جبن', 'فرماج', 'ياغورت', 'زبادي', 'زبدة', 'لبن', 'رايب', 'قشطة', 'كانديا', 
      'صومام', 'بريدل', 'دانون', 'لافاش كيري', 'شيدر', 'موزاريلا',
      'lait', 'fromage', 'yaourt', 'beurre', 'creme', 'crème', 'candia', 'soummam', 'danone', 
      'bridel', 'tartino', 'berbère', 'camembert', 'mozzarella', 'gouda'
    ]
  },
  {
    id: 'canned_prepared',
    name: 'معلبات ومصبرات',
    keywords: [
      'مربى', 'عسل', 'كاشير', 'باتي', 'سجق', 'مرتديلا', 'ذرة', 'فطر', 'زيتون', 'فواكه مجففة',
      'confiture', 'miel', 'cachir', 'pate', 'pâté', 'olive', 'champignon', 'mais', 'maïs'
    ]
  },
  {
    id: 'detergents_care',
    name: 'منظفات وعناية',
    keywords: [
      'صابون', 'صابونة', 'جافيل', 'غسيل', 'أومو', 'إيزيس', 'شامبو', 'مناديل', 'ورق صحي', 
      'معجون أسنان', 'معجون', 'كلور', 'مطهر', 'معطر', 'فوط', 'حفاظات', 'بامبرز',
      'javel', 'savon', 'lessive', 'omo', 'ariel', 'isis', 'skip', 'shampoing', 'dentifrice', 
      'mouchoir', 'papier', 'essuie-tout', 'couche', 'doliprane', 'pansement', 'bref', 'ajax'
    ]
  }
];

/**
 * Smartly classify a product into a store category using its name and brand.
 */
export const classifyProductCategory = (productName: string, currentCategory?: string): string => {
  const trimmedName = (productName || '').trim();
  const trimmedCurrent = (currentCategory || '').trim();

  // If a valid custom category is already set and is not generic "عام" or empty
  if (
    trimmedCurrent && 
    trimmedCurrent !== 'عام' && 
    trimmedCurrent !== 'عامة' && 
    trimmedCurrent.toLowerCase() !== 'general' &&
    trimmedCurrent.toLowerCase() !== 'all'
  ) {
    return trimmedCurrent;
  }

  if (!trimmedName) {
    return 'مواد غذائية وتموين';
  }

  const lowerName = trimmedName.toLowerCase();

  // Check each category for keyword matches
  for (const cat of STORE_CATEGORIES) {
    for (const kw of cat.keywords) {
      // Check for exact word or substring
      const kwLower = kw.toLowerCase();
      if (
        lowerName.includes(kwLower) ||
        lowerName.split(/[\s,_\-\/\+]+/).some(word => word === kwLower)
      ) {
        return cat.name;
      }
    }
  }

  // Default category if no specific category matched
  return 'مواد غذائية وتموين';
};

export const STORE_CATEGORY_NAMES: string[] = STORE_CATEGORIES.map(c => c.name);

// Palette of comfortable, pleasant preset colors for categories
export const CATEGORY_COLOR_PRESETS = [
  { id: 'emerald', label: 'أخضر زمردي', bg: 'bg-emerald-600/30', border: 'border-emerald-500', text: 'text-emerald-300', dot: 'bg-emerald-500', chip: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' },
  { id: 'sky', label: 'أزرق سماوي', bg: 'bg-sky-600/30', border: 'border-sky-500', text: 'text-sky-300', dot: 'bg-sky-500', chip: 'bg-sky-500/20 text-sky-300 border-sky-500/50' },
  { id: 'rose', label: 'وردي لطيف', bg: 'bg-rose-600/30', border: 'border-rose-500', text: 'text-rose-300', dot: 'bg-rose-500', chip: 'bg-rose-500/20 text-rose-300 border-rose-500/50' },
  { id: 'amber', label: 'كهرماني دافئ', bg: 'bg-amber-600/30', border: 'border-amber-500', text: 'text-amber-300', dot: 'bg-amber-500', chip: 'bg-amber-500/20 text-amber-300 border-amber-500/50' },
  { id: 'purple', label: 'بنفسجي ملكي', bg: 'bg-purple-600/30', border: 'border-purple-500', text: 'text-purple-300', dot: 'bg-purple-500', chip: 'bg-purple-500/20 text-purple-300 border-purple-500/50' },
  { id: 'indigo', label: 'نيلي هادئ', bg: 'bg-indigo-600/30', border: 'border-indigo-500', text: 'text-indigo-300', dot: 'bg-indigo-500', chip: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' },
  { id: 'teal', label: 'تركواز بحري', bg: 'bg-teal-600/30', border: 'border-teal-500', text: 'text-teal-300', dot: 'bg-teal-500', chip: 'bg-teal-500/20 text-teal-300 border-teal-500/50' },
  { id: 'orange', label: 'برتقالي مشرق', bg: 'bg-orange-600/30', border: 'border-orange-500', text: 'text-orange-300', dot: 'bg-orange-500', chip: 'bg-orange-500/20 text-orange-300 border-orange-500/50' },
  { id: 'fuchsia', label: 'فوشيا زاهي', bg: 'bg-fuchsia-600/30', border: 'border-fuchsia-500', text: 'text-fuchsia-300', dot: 'bg-fuchsia-500', chip: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/50' },
  { id: 'slate', label: 'رمادي كلاسيكي', bg: 'bg-slate-700/40', border: 'border-slate-500', text: 'text-slate-200', dot: 'bg-slate-400', chip: 'bg-slate-700/50 text-slate-200 border-slate-500/50' },
];

const CUSTOM_CATEGORIES_KEY = 'app_inventory_custom_categories_v1';
const CATEGORY_COLORS_KEY = 'app_inventory_category_colors_v1';

// Default harmonious colors for existing categories
export const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  'بسكويت وحلويات': 'emerald',
  'شوكولاتة وسناكات': 'amber',
  'مواد غذائية وتموين': 'sky',
  'مشروبات وعصائر': 'indigo',
  'ألبان وأجبان': 'purple',
  'معلبات ومصبرات': 'orange',
  'منظفات وعناية': 'teal',
  'غير مصنف': 'slate',
};

export const getStoredCategoryColors = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(CATEGORY_COLORS_KEY);
    if (!raw) return DEFAULT_CATEGORY_COLORS;
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null 
      ? { ...DEFAULT_CATEGORY_COLORS, ...parsed } 
      : DEFAULT_CATEGORY_COLORS;
  } catch (e) {
    console.error('Error reading category colors', e);
    return DEFAULT_CATEGORY_COLORS;
  }
};

export const saveStoredCategoryColors = (colors: Record<string, string>) => {
  try {
    localStorage.setItem(CATEGORY_COLORS_KEY, JSON.stringify(colors));
  } catch (e) {
    console.error('Error saving category colors', e);
  }
};

export const getCategoryColorPreset = (colorId?: string) => {
  return CATEGORY_COLOR_PRESETS.find(p => p.id === colorId) || CATEGORY_COLOR_PRESETS[0];
};

export const getStoredCustomCategories = (): string[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
    if (!raw) return STORE_CATEGORY_NAMES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return STORE_CATEGORY_NAMES;
  } catch (e) {
    console.error('Error reading custom categories', e);
    return STORE_CATEGORY_NAMES;
  }
};

export const saveStoredCustomCategories = (categories: string[]) => {
  try {
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(categories));
  } catch (e) {
    console.error('Error saving custom categories', e);
  }
};
