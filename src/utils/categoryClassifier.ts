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
