import { Product } from '../types';

/**
 * Normalizes text for search:
 * - Converts Arabic-Indic numerals (٠-٩) and Persian numerals (۰-۹) to standard 0-9
 * - Strips Latin accents/diacritics (é, è, ê, à, ç, etc.)
 * - Strips Arabic Tatweel / Kashida (ـ)
 * - Strips Arabic Harakat / Tashkeel (Fatha, Damma, Kasra, Tanween, Shadda, Sukun)
 * - Normalizes Arabic letter variants:
 *   - Alef: [أ إ آ ٱ] -> ا
 *   - Ta' Marbuta: ة -> ه
 *   - Ya' / Alif Maqsura / Hamza on Ya': [ى ي ئ] -> ي
 *   - Hamza on Waw / standalone Hamza: [ؤ] -> و, [ء] -> ''
 *   - Non-standard regional letters: پ -> ب, ڤ -> ف, گ -> ك, چ -> ج
 * - Trims and converts to lowercase
 */
export const normalizeSearchText = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .toString()
    // Convert Arabic-Indic (٠-٩) and Persian (۰-۹) digits to standard 0-9
    .replace(/[\u0660-\u0669]/g, c => (c.charCodeAt(0) - 0x0660).toString())
    .replace(/[\u06F0-\u06F9]/g, c => (c.charCodeAt(0) - 0x06F0).toString())
    // Strip Latin diacritics (e.g. Café -> Cafe, Carré -> Carre)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Strip Tatweel (Kashida ـ)
    .replace(/\u0640/g, '')
    // Remove Arabic vowels/diacritics/tashkeel
    .replace(/[\u064B-\u065F\u0670\u0671]/g, '')
    // Normalize Arabic letter forms
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىيئ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ء/g, '')
    // Regional letters (Perso-Arabic)
    .replace(/پ/g, 'ب')
    .replace(/ڤ/g, 'ف')
    .replace(/گ/g, 'ك')
    .replace(/چ/g, 'ج')
    .toLowerCase()
    .trim();
};

/**
 * Strips all spaces, punctuation, symbols, and separators to allow boundary-free matching.
 * e.g. "ايس كريم" -> "ايسكريم", "6 X 24 pies" -> "6x24pies", "كوكا-كولا" -> "كوكاكولا"
 */
export const compactString = (text: string): string => {
  return text.replace(/[\s\-_./\\,+()*&^%$#@!~`'":;?<>|{}[\]]+/g, '');
};

/**
 * Checks whether a compact query/token (spaces removed) matches across words in a text.
 * To strictly prevent false-positive collisions (e.g. "Magma Milk" generating "mam" across word boundaries),
 * the token MUST align with word boundaries: it must start at the beginning of some word and match
 * consecutive concatenated words (like "كوكاكولا" matching "كوكا" + "كولا", or "ايسكريم" matching "ايس" + "كريم",
 * or "kitkat" matching "kit" + "kat").
 */
export const checkWordAlignedCompoundMatch = (words: string[], token: string): boolean => {
  if (!token || token.length < 3 || words.length < 2) return false;

  for (let i = 0; i < words.length; i++) {
    let combined = '';
    for (let j = i; j < words.length; j++) {
      combined += words[j];
      if (combined === token || (combined.length >= token.length && combined.startsWith(token))) {
        return true;
      }
      if (token.startsWith(combined)) {
        continue;
      }
      break;
    }
  }
  return false;
};

/**
 * Extracts distinct search tokens from user query.
 * Splits on whitespace and common delimiters (space, comma, plus, slash).
 */
export const extractSearchTokens = (query: string): string[] => {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];

  return normalized
    .split(/[\s+,/\\-]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);
};

/**
 * Generates candidate variations for an Arabic token:
 * - Strips common prefixes: 'ال', 'وال', 'بال', 'فال', 'كال', 'لل', 'و', 'ب', 'ل', 'ف', 'ك'
 * - Strips common suffixes: 'ه' (from 'ة'), 'ات', 'ين', 'ون', 'ية'
 * - Handles phonetic consonant substitutions (ط <-> ت, ق <-> ك)
 */
export const getArabicTokenVariants = (token: string): string[] => {
  const variants = new Set<string>();
  variants.add(token);

  // If token is not Arabic, do not apply Arabic affix rules
  const isArabic = /[\u0600-\u06FF]/.test(token);
  if (!isArabic) {
    return [token];
  }

  // Multi-letter Arabic prefixes: وال, بال, فال, كال, لل
  for (const prefix of ['وال', 'بال', 'فال', 'كال', 'لل']) {
    if (token.startsWith(prefix) && token.length > prefix.length + 1) {
      const stripped = token.slice(prefix.length);
      variants.add(stripped);
      variants.add('ال' + stripped);
    }
  }

  // Definite article 'ال'
  if (token.startsWith('ال') && token.length > 3) {
    variants.add(token.slice(2));
  } else if (!token.startsWith('ال') && token.length >= 3) {
    // If user searched without 'ال', try also with 'ال'
    variants.add('ال' + token);
  }

  // Single-letter prefixes: و, ب, ل, ف, ك (e.g. وبسكويت -> بسكويت)
  for (const prefix of ['و', 'ب', 'ل', 'ف', 'ك']) {
    if (token.startsWith(prefix) && token.length > prefix.length + 2) {
      variants.add(token.slice(prefix.length));
    }
  }

  // Suffixes: trailing 'ه' (representing 'ة')
  if (token.endsWith('ه') && token.length > 2) {
    variants.add(token.slice(0, -1));
  }
  // Trailing 'ات' (plural e.g. بسكويتات -> بسكويت)
  if (token.endsWith('ات') && token.length > 3) {
    variants.add(token.slice(0, -2));
  }
  // Trailing 'ين' or 'ون'
  if ((token.endsWith('ين') || token.endsWith('ون')) && token.length > 3) {
    variants.add(token.slice(0, -2));
  }

  // Dialect substitutions: ط <-> ت (شوكولاطة <-> شوكولاتة, كاطو <-> كاتو)
  if (token.length >= 3) {
    if (token.includes('ط')) {
      variants.add(token.replace(/ط/g, 'ت'));
    }
    if (token.includes('ت')) {
      variants.add(token.replace(/ت/g, 'ط'));
    }
  }

  return Array.from(variants);
};

export interface MatchScoreResult {
  matches: boolean;
  score: number;
  matchedTokensCount: number;
  matchReasons: string[];
}

/**
 * Tests if a product matches search tokens strictly and computes relevance score.
 * Enforces strict matching to the specified terms (الاصناف المحددة فقط):
 * - Contiguous substring / infix matching in product name (e.g. "ندوي" matches "سندويتش", "saa" matches "(di saa)")
 * - Arabic diacritics and character normalization (أ/إ/آ -> ا, ة/ه -> ه, ي/ى/ئ -> ي)
 * - Space-agnostic compound matching (e.g. "ايس كريم" matches "ايسكريم")
 * - Full/partial barcode matching
 * - Exact price match for numeric searches
 */
export const scoreProductMatch = (
  product: Product,
  tokens: string[],
  rawQuery: string
): MatchScoreResult => {
  if (tokens.length === 0) {
    return {
      matches: true,
      score: product.stockPieces > 0 ? 10 : 0,
      matchedTokensCount: 0,
      matchReasons: [],
    };
  }

  const normQuery = normalizeSearchText(rawQuery);
  const compactQuery = compactString(normQuery);

  const normName = normalizeSearchText(product.name);
  const compactName = compactString(normName);
  const nameWords = normName.split(/[\s+,/\\-]+/).filter(w => w.length > 0);

  const normCategory = normalizeSearchText(product.category || '');

  const barcode = (product.barcode || '').toLowerCase().trim();
  const minorSale = product.salePriceMinor;
  const majorSale = product.salePriceMajor;
  const numQuery = parseFloat(rawQuery.trim());
  const isQueryNumber = !isNaN(numQuery) && rawQuery.trim().length > 0 && /^\d+(\.\d+)?$/.test(rawQuery.trim());

  // 1. Direct barcode match
  if (barcode && (barcode === normQuery || barcode === rawQuery.trim().toLowerCase())) {
    return {
      matches: true,
      score: 5000,
      matchedTokensCount: tokens.length,
      matchReasons: ['barcode_exact'],
    };
  }
  if (barcode && barcode.startsWith(normQuery)) {
    return {
      matches: true,
      score: 3000,
      matchedTokensCount: tokens.length,
      matchReasons: ['barcode_prefix'],
    };
  }

  // 2. Direct exact name match
  if (normName === normQuery) {
    return {
      matches: true,
      score: 4000,
      matchedTokensCount: tokens.length,
      matchReasons: ['name_exact'],
    };
  }

  let score = 0;
  const matchReasons: string[] = [];

  if (normName.startsWith(normQuery)) {
    score += 2500;
    matchReasons.push('name_prefix');
  } else if (normName.includes(normQuery)) {
    score += 1800;
    matchReasons.push('name_phrase');
  } else if (compactQuery.length >= 3 && checkWordAlignedCompoundMatch(nameWords, compactQuery)) {
    score += 1600;
    matchReasons.push('name_compact_phrase');
  }

  // 3. Exact Price match (only when the whole query is a valid price number)
  if (isQueryNumber && numQuery > 0) {
    if (
      Math.abs(minorSale - numQuery) < 0.01 ||
      Math.abs(majorSale - numQuery) < 0.01
    ) {
      score += 2000;
      matchReasons.push('price_exact');
    }
  }

  // 4. Token-by-Token Matching: Every token MUST strictly match the product
  let matchedTokensCount = 0;

  for (const token of tokens) {
    const compactToken = compactString(token);
    const variants = getArabicTokenVariants(token);

    let tokenMatched = false;
    let tokenScore = 0;

    // A. Contiguous Substring match in product name (ANY part of word: beginning, middle, end)
    for (const v of variants) {
      if (normName.includes(v)) {
        tokenMatched = true;
        if (nameWords.some(w => w === v)) {
          tokenScore = Math.max(tokenScore, 300); // Exact word
        } else if (nameWords.some(w => w.startsWith(v))) {
          tokenScore = Math.max(tokenScore, 240); // Word starts with token
        } else if (nameWords.some(w => w.endsWith(v))) {
          tokenScore = Math.max(tokenScore, 200); // Word ends with token
        } else {
          tokenScore = Math.max(tokenScore, 180); // Infix / middle of word (e.g. ندوي in سندويتش)
        }
        break;
      }
    }

    // B. Space-agnostic word-aligned compound match (e.g. "كوكاكولا" in "كوكا كولا" or "ايسكريم" in "ايس كريم")
    if (!tokenMatched && compactToken.length >= 3 && checkWordAlignedCompoundMatch(nameWords, compactToken)) {
      tokenMatched = true;
      tokenScore = Math.max(tokenScore, 170);
    }

    // C. Barcode match
    if (!tokenMatched && barcode && barcode.includes(token)) {
      tokenMatched = true;
      tokenScore = Math.max(tokenScore, 250);
    }

    // D. Category match (only if category matches the token or starts with it)
    if (!tokenMatched && normCategory) {
      if (normCategory === token || variants.some(v => normCategory === v)) {
        tokenMatched = true;
        tokenScore = Math.max(tokenScore, 120);
      } else if (variants.some(v => normCategory.startsWith(v) && v.length >= 3)) {
        tokenMatched = true;
        tokenScore = Math.max(tokenScore, 100);
      }
    }

    // E. Price exact match (only for numeric token matching price)
    if (!tokenMatched && /^\d+(\.\d+)?$/.test(token)) {
      const tokNum = parseFloat(token);
      if (tokNum > 0 && (Math.abs(minorSale - tokNum) < 0.01 || Math.abs(majorSale - tokNum) < 0.01)) {
        tokenMatched = true;
        tokenScore = Math.max(tokenScore, 150);
      }
    }

    if (tokenMatched) {
      matchedTokensCount++;
      score += tokenScore;
    } else {
      // If even ONE token fails to match, the product DOES NOT MATCH!
      return {
        matches: false,
        score: 0,
        matchedTokensCount: 0,
        matchReasons: [],
      };
    }
  }

  // Bonus if all tokens match in the name itself
  const allInName = tokens.every(t => {
    const vars = getArabicTokenVariants(t);
    return vars.some(v => normName.includes(v)) || checkWordAlignedCompoundMatch(nameWords, compactString(t));
  });
  if (allInName) {
    score += 500;
    matchReasons.push('all_tokens_in_name');
  }

  // In-order appearance bonus
  if (tokens.length > 1 && allInName) {
    let lastIndex = -1;
    let inOrder = true;
    for (const t of tokens) {
      const vars = getArabicTokenVariants(t);
      let foundIdx = -1;
      for (const v of vars) {
        const idx = normName.indexOf(v);
        if (idx > -1) {
          foundIdx = idx;
          break;
        }
      }
      if (foundIdx > -1 && foundIdx >= lastIndex) {
        lastIndex = foundIdx;
      } else {
        inOrder = false;
        break;
      }
    }
    if (inOrder) {
      score += 250;
      matchReasons.push('in_order_match');
    }
  }

  // In-stock bonus (small boost for sorting order)
  if (product.stockPieces > 0) {
    score += 30;
  }

  return {
    matches: true,
    score,
    matchedTokensCount,
    matchReasons,
  };
};

/**
 * Filters and ranks products according to multi-token query.
 */
export const filterAndRankProducts = (
  products: Product[],
  query: string
): Product[] => {
  const trimmed = query.trim();
  if (!trimmed) {
    return products;
  }

  const tokens = extractSearchTokens(trimmed);
  if (tokens.length === 0) {
    return products;
  }

  const scored: { product: Product; score: number }[] = [];

  for (const p of products) {
    const result = scoreProductMatch(p, tokens, trimmed);
    if (result.matches) {
      scored.push({ product: p, score: result.score });
    }
  }

  // Sort by score descending (highest relevance first)
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Tie-break: in-stock first
    if ((b.product.stockPieces > 0) !== (a.product.stockPieces > 0)) {
      return b.product.stockPieces > 0 ? 1 : -1;
    }
    return a.product.name.localeCompare(b.product.name, 'ar');
  });

  return scored.map(item => item.product);
};

/**
 * Creates regex pattern for highlighting matched tokens and their sub-parts in text.
 * Accommodates Arabic letter variations (أ/إ/آ -> ا, ة -> ه, etc.).
 */
export const buildHighlightRegex = (query: string): RegExp | null => {
  const tokens = extractSearchTokens(query);
  if (tokens.length === 0) return null;

  try {
    // Gather all tokens and their prominent variants
    const allSearchTerms = new Set<string>();
    for (const token of tokens) {
      allSearchTerms.add(token);
      const variants = getArabicTokenVariants(token);
      for (const v of variants) {
        if (v.length >= 2) allSearchTerms.add(v);
      }
    }

    const patterns = Array.from(allSearchTerms).map(token => {
      let pattern = '';
      for (const char of token) {
        if ('[.*+?^${}()|\\]'.includes(char)) {
          pattern += '\\' + char;
        } else if (/[اأإآٱ]/.test(char)) {
          pattern += '[اأإآٱ]';
        } else if (/[هة]/.test(char)) {
          pattern += '[هة]';
        } else if (/[يىئ]/.test(char)) {
          pattern += '[يىئ]';
        } else if (/[تط]/.test(char)) {
          pattern += '[تط]';
        } else {
          pattern += char;
        }
      }
      return pattern;
    }).filter(p => p.length > 0);

    if (patterns.length === 0) return null;

    // Sort by length descending so longer matching fragments highlight first
    patterns.sort((a, b) => b.length - a.length);

    return new RegExp(`(${patterns.join('|')})`, 'gi');
  } catch {
    return null;
  }
};

/**
 * Phonetic transliteration from French/Latin to Arabic for customer name search.
 * Handles common North African / Arab names and algorithmic character conversion.
 */
export const latinToArabicPhonetic = (latinText: string): string[] => {
  const norm = normalizeSearchText(latinText).toLowerCase();
  if (!norm || !/^[a-z0-9\s]+$/.test(norm)) return [];

  const commonNames: Record<string, string[]> = {
    adam: ['ادم'],
    adame: ['ادم'],
    lahar: ['لحار', 'لحارة'],
    lahara: ['لحارة'],
    ahmed: ['احمد'],
    ahmad: ['احمد'],
    mohamed: ['محمد'],
    mohammed: ['محمد'],
    med: ['محمد'],
    mhamed: ['محمد'],
    karim: ['كريم'],
    khalil: ['خليل'],
    khaled: ['خالد'],
    ali: ['علي'],
    omar: ['عمر'],
    othman: ['عثمان'],
    otman: ['عثمان'],
    yacine: ['ياسين'],
    yasin: ['ياسين'],
    samir: ['سمير'],
    sami: ['سامي'],
    walid: ['وليد'],
    mostefa: ['مصطفى'],
    mustapha: ['مصطفى'],
    mourad: ['مراد'],
    morad: ['مراد'],
    rachid: ['رشيد'],
    hassan: ['حسن', 'حسان'],
    hasan: ['حسن'],
    amine: ['امين'],
    amin: ['امين'],
    bilal: ['بلال'],
    tarek: ['طارق'],
    tarik: ['طارق'],
    sofiane: ['سفيان'],
    soufiane: ['سفيان'],
    brahim: ['ابراهيم'],
    ibrahim: ['ابراهيم'],
    fouad: ['فؤاد'],
    adel: ['عادل'],
    nabil: ['نبيل'],
    salim: ['سليم'],
    hichem: ['هشام'],
    hisham: ['هشام'],
    ayoub: ['ايوب'],
    hamza: ['حمزة'],
    djamel: ['جمال'],
    djamal: ['جمال'],
    jamel: ['جمال'],
    riad: ['رياض'],
    riadh: ['رياض'],
    redha: ['رضا'],
    reda: ['رضا'],
    sarl: ['سارل', 'شركة'],
    eurl: ['ايورل', 'مؤسسة'],
    ets: ['مؤسسة']
  };

  const results = new Set<string>();
  if (commonNames[norm]) {
    commonNames[norm].forEach(n => results.add(n));
  }

  // Algorithmic phonetic conversion
  let converted = norm
    .replace(/ch|sh/g, 'ش')
    .replace(/kh/g, 'خ')
    .replace(/gh/g, 'غ')
    .replace(/dj/g, 'ج')
    .replace(/th/g, 'ث')
    .replace(/dh/g, 'ذ')
    .replace(/ou/g, 'و')
    .replace(/ph/g, 'ف')
    .replace(/b/g, 'ب')
    .replace(/t/g, 'ت')
    .replace(/j/g, 'ج')
    .replace(/h/g, 'ه')
    .replace(/d/g, 'د')
    .replace(/r/g, 'ر')
    .replace(/z/g, 'ز')
    .replace(/s/g, 'س')
    .replace(/f/g, 'ف')
    .replace(/q/g, 'ق')
    .replace(/k/g, 'ك')
    .replace(/l/g, 'ل')
    .replace(/m/g, 'م')
    .replace(/n/g, 'ن')
    .replace(/w/g, 'و')
    .replace(/y/g, 'ي')
    .replace(/a/g, 'ا')
    .replace(/i/g, 'ي')
    .replace(/o/g, 'و')
    .replace(/u/g, 'و')
    .replace(/e/g, '');

  if (converted.length >= 2) {
    results.add(converted);
  }

  return Array.from(results);
};

/**
 * Phonetic transliteration from Arabic to Latin/French for customer search.
 */
export const arabicToLatinPhonetic = (arabicText: string): string[] => {
  const norm = normalizeSearchText(arabicText);
  if (!norm || !/[\u0600-\u06FF]/.test(norm)) return [];

  const commonArabic: Record<string, string[]> = {
    'ادم': ['adam', 'adame'],
    'لحار': ['lahar', 'lahara'],
    'لحارة': ['lahara', 'lahar'],
    'احمد': ['ahmed', 'ahmad'],
    'محمد': ['mohamed', 'mohammed', 'med'],
    'كريم': ['karim'],
    'خليل': ['khalil'],
    'خالد': ['khaled', 'khalid'],
    'علي': ['ali'],
    'عمر': ['omar'],
    'عثمان': ['othman', 'otman'],
    'ياسين': ['yacine', 'yasin'],
    'سمير': ['samir'],
    'سامي': ['sami'],
    'وليد': ['walid'],
    'مصطفى': ['mostefa', 'mustapha'],
    'مراد': ['mourad', 'morad'],
    'رشيد': ['rachid'],
    'حسن': ['hassan', 'hasan'],
    'حسان': ['hassan'],
    'امين': ['amine', 'amin'],
    'بلال': ['bilal'],
    'طارق': ['tarek', 'tarik'],
    'سفيان': ['sofiane', 'soufiane'],
    'ابراهيم': ['brahim', 'ibrahim'],
    'عادل': ['adel'],
    'نبيل': ['nabil'],
    'سليم': ['salim'],
    'هشام': ['hichem', 'hisham'],
    'ايوب': ['ayoub'],
    'حمزة': ['hamza'],
    'جمال': ['djamel', 'jamel'],
    'رياض': ['riad', 'riadh'],
    'رضا': ['redha', 'reda']
  };

  const results = new Set<string>();
  if (commonArabic[norm]) {
    commonArabic[norm].forEach(n => results.add(n));
  }

  // Algorithmic conversion
  let lat = norm
    .replace(/ش/g, 'ch')
    .replace(/خ/g, 'kh')
    .replace(/غ/g, 'gh')
    .replace(/ج/g, 'j')
    .replace(/ث/g, 'th')
    .replace(/ذ/g, 'dh')
    .replace(/ض/g, 'd')
    .replace(/ص/g, 's')
    .replace(/ط/g, 't')
    .replace(/ظ/g, 'z')
    .replace(/ع/g, 'a')
    .replace(/ح/g, 'h')
    .replace(/ف/g, 'f')
    .replace(/ق/g, 'q')
    .replace(/ك/g, 'k')
    .replace(/ل/g, 'l')
    .replace(/م/g, 'm')
    .replace(/ن/g, 'n')
    .replace(/ه/g, 'h')
    .replace(/و/g, 'ou')
    .replace(/ي/g, 'i')
    .replace(/ب/g, 'b')
    .replace(/ت/g, 't')
    .replace(/د/g, 'd')
    .replace(/ر/g, 'r')
    .replace(/ز/g, 'z')
    .replace(/س/g, 's')
    .replace(/ا/g, 'a');

  if (lat.length >= 2) {
    results.add(lat);
  }

  return Array.from(results);
};

/**
 * Robust bilingual (Arabic / French) customer search matching:
 * Matches whether name/query is in Arabic, French, Latin with accents, or phonetic transliteration.
 */
export const matchCustomerBilingual = (
  customerName: string, 
  phone: string | undefined, 
  company: string | undefined, 
  query: string
): boolean => {
  if (!query || !query.trim()) return true;

  const normQuery = normalizeSearchText(query);
  const compactQuery = compactString(normQuery);

  const normName = normalizeSearchText(customerName);
  const compactName = compactString(normName);
  const nameWords = normName.split(/[\s+,/\\-]+/).filter(w => w.length > 0);

  const normPhone = normalizeSearchText(phone || '');
  const compactPhone = compactString(normPhone);

  const normCompany = normalizeSearchText(company || '');
  const compactCompany = compactString(normCompany);

  // Direct exact/substring match
  if (normName.includes(normQuery)) return true;
  if (compactQuery.length >= 3 && checkWordAlignedCompoundMatch(nameWords, compactQuery)) return true;
  if (compactPhone && compactPhone.includes(compactQuery)) return true;
  if (compactCompany && compactCompany.includes(compactQuery)) return true;

  // Bilingual phonetics
  const arPhonetics = latinToArabicPhonetic(normQuery);
  for (const ar of arPhonetics) {
    if (normName.includes(ar) || (compactString(ar).length >= 3 && checkWordAlignedCompoundMatch(nameWords, compactString(ar)))) return true;
  }

  const latPhonetics = arabicToLatinPhonetic(normQuery);
  for (const lat of latPhonetics) {
    if (normName.includes(lat) || (compactString(lat).length >= 3 && checkWordAlignedCompoundMatch(nameWords, compactString(lat)))) return true;
  }

  // Token-by-token
  const tokens = extractSearchTokens(query);
  if (tokens.length > 0) {
    const allTokensMatch = tokens.every(token => {
      const compactTok = compactString(token);
      if (normName.includes(token) || (compactTok.length >= 3 && checkWordAlignedCompoundMatch(nameWords, compactTok))) return true;
      if (normPhone.includes(token) || compactPhone.includes(compactTok)) return true;
      if (normCompany.includes(token) || compactCompany.includes(compactTok)) return true;

      const tokAr = latinToArabicPhonetic(token);
      if (tokAr.some(v => normName.includes(v) || (compactString(v).length >= 3 && checkWordAlignedCompoundMatch(nameWords, compactString(v))))) return true;

      const tokLat = arabicToLatinPhonetic(token);
      if (tokLat.some(v => normName.includes(v) || (compactString(v).length >= 3 && checkWordAlignedCompoundMatch(nameWords, compactString(v))))) return true;

      return false;
    });

    if (allTokensMatch) return true;
  }

  return false;
};


