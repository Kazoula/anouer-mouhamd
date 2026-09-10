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
  } else if (!token.startsWith('ال') && token.length >= 2) {
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

  // Dialect substitutions: ط <-> ت (شوكولاطة <-> شوكولاتة, كاطو <-> كاتو, بطاطا <-> بتاتا)
  if (token.includes('ط')) {
    variants.add(token.replace(/ط/g, 'ت'));
  }
  if (token.includes('ت')) {
    variants.add(token.replace(/ت/g, 'ط'));
  }
  // ق <-> ك (قاطو <-> كاتو, قوفريت <-> كوفريت)
  if (token.includes('ق')) {
    variants.add(token.replace(/ق/g, 'ك'));
  }

  return Array.from(variants);
};

/**
 * Approximate phonetic transliteration between Latin and Arabic
 * Allows searching English/French brand names using Arabic letters and vice-versa
 * (e.g. MAXON <-> ماكسون / ماكس, CARRE <-> كاريه / كاري, SANDWICH <-> سندويتش).
 */
export const getPhoneticEquivalents = (token: string): string[] => {
  const results = new Set<string>();

  // Latin to Arabic transliteration
  if (/^[a-z0-9]+$/i.test(token)) {
    let ar = token.toLowerCase();
    // Multi-letter sounds
    ar = ar.replace(/sh|ch/g, 'ش');
    ar = ar.replace(/th/g, 'ث');
    ar = ar.replace(/kh/g, 'خ');
    ar = ar.replace(/gh/g, 'غ');
    ar = ar.replace(/ph/g, 'ف');
    ar = ar.replace(/x/g, 'كس');
    ar = ar.replace(/ck/g, 'ك');
    ar = ar.replace(/ee|ea/g, 'ي');
    ar = ar.replace(/oo|ou/g, 'و');
    ar = ar.replace(/qu/g, 'ك');
    // Single letters
    ar = ar.replace(/b|p/g, 'ب');
    ar = ar.replace(/c|k|q/g, 'ك');
    ar = ar.replace(/d/g, 'د');
    ar = ar.replace(/f|v/g, 'ف');
    ar = ar.replace(/g/g, 'ج');
    ar = ar.replace(/h/g, 'ه');
    ar = ar.replace(/j/g, 'ج');
    ar = ar.replace(/l/g, 'ل');
    ar = ar.replace(/m/g, 'م');
    ar = ar.replace(/n/g, 'ن');
    ar = ar.replace(/r/g, 'ر');
    ar = ar.replace(/s/g, 'س');
    ar = ar.replace(/t/g, 'ت');
    ar = ar.replace(/w/g, 'و');
    ar = ar.replace(/y|i/g, 'ي');
    ar = ar.replace(/z/g, 'ز');
    ar = ar.replace(/a/g, 'ا');
    ar = ar.replace(/o|u/g, 'و');
    ar = ar.replace(/e/g, 'ي');

    const normAr = normalizeSearchText(ar);
    if (normAr && normAr.length >= 2) results.add(normAr);

    // Also version without long vowels
    const shortAr = normAr.replace(/[اوي]/g, '');
    if (shortAr.length >= 2) results.add(shortAr);
  }

  // Arabic to Latin transliteration
  if (/[\u0600-\u06FF]/.test(token)) {
    let lat = token;
    lat = lat.replace(/كس/g, 'x');
    lat = lat.replace(/ش/g, 'sh');
    lat = lat.replace(/خ/g, 'kh');
    lat = lat.replace(/غ/g, 'gh');
    lat = lat.replace(/ب/g, 'b');
    lat = lat.replace(/ت|ط/g, 't');
    lat = lat.replace(/ث/g, 'th');
    lat = lat.replace(/ج/g, 'j');
    lat = lat.replace(/ح|ه/g, 'h');
    lat = lat.replace(/د|ض/g, 'd');
    lat = lat.replace(/ذ|ز|ظ/g, 'z');
    lat = lat.replace(/ر/g, 'r');
    lat = lat.replace(/س|ص/g, 's');
    lat = lat.replace(/ف/g, 'f');
    lat = lat.replace(/ق|ك/g, 'k');
    lat = lat.replace(/ل/g, 'l');
    lat = lat.replace(/م/g, 'm');
    lat = lat.replace(/ن/g, 'n');
    lat = lat.replace(/و/g, 'o');
    lat = lat.replace(/ي/g, 'i');
    lat = lat.replace(/ا/g, 'a');
    if (lat && lat.length >= 2) results.add(lat.toLowerCase());
  }

  return Array.from(results);
};

/**
 * Tests if token's characters appear in word in order (sub-sequence / typo tolerance).
 * Handles dropped vowels like "سندوتش" in "سندويتش", "بسكوت" in "بسكويت", "مكسون" in "ماكسون".
 */
export const isSubsequenceMatch = (token: string, text: string): boolean => {
  if (token.length < 3 || text.length < token.length) return false;
  let tIdx = 0;
  for (let i = 0; i < text.length && tIdx < token.length; i++) {
    if (text[i] === token[tIdx]) {
      tIdx++;
    }
  }
  return tIdx === token.length;
};

export interface MatchScoreResult {
  matches: boolean;
  score: number;
  matchedTokensCount: number;
  matchReasons: string[];
}

/**
 * Tests if a product matches search tokens and computes an intelligent relevance score.
 * Supports:
 * - Substring matching across ANY part of any word (beginning, middle, end, infix)
 * - Arabic diacritics, letter normalizations, and prefix/suffix stripping
 * - Space-agnostic compound matching (e.g. "ايس كريم" matches "ايسكريم", "6x24" matches "6 x 24")
 * - Subsequence vowel tolerance (e.g. "سندوتش" matches "سندويتش", "بسكوت" matches "بسكويت")
 * - Phonetic Latin-Arabic cross-language matching (e.g. "ماكس" matches "MAXON")
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

  const normCategory = normalizeSearchText(product.category || '');
  const compactCategory = compactString(normCategory);

  const barcode = (product.barcode || '').toLowerCase().trim();
  const minorSale = product.salePriceMinor.toString();
  const majorSale = product.salePriceMajor.toString();
  const minorPurch = product.purchasePriceMinor.toString();
  const majorPurch = product.purchasePriceMajor.toString();
  const numQuery = parseFloat(rawQuery.trim());
  const isQueryNumber = !isNaN(numQuery) && rawQuery.trim().length > 0;

  // Words in the product name
  const nameWords = normName.split(/[\s+,/\\-]+/).filter(w => w.length > 0);

  const matchReasons: string[] = [];
  let score = 0;

  // 1. Direct barcode match
  if (barcode && (barcode === normQuery || barcode === rawQuery.trim())) {
    return {
      matches: true,
      score: 5000,
      matchedTokensCount: tokens.length,
      matchReasons: ['barcode_exact'],
    };
  }
  if (barcode && barcode.startsWith(normQuery)) {
    score += 2500;
    matchReasons.push('barcode_prefix');
  } else if (barcode && barcode.includes(normQuery)) {
    score += 1500;
    matchReasons.push('barcode_partial');
  }

  // 2. Direct name phrase matches
  if (normName === normQuery) {
    score += 4000;
    matchReasons.push('name_exact');
  } else if (normName.startsWith(normQuery)) {
    score += 2500;
    matchReasons.push('name_prefix');
  } else if (normName.includes(normQuery)) {
    score += 1800;
    matchReasons.push('name_phrase');
  } else if (compactName.includes(compactQuery) && compactQuery.length >= 2) {
    // Space-agnostic match (e.g. "ايس كريم" typed for "ايسكريم" or vice-versa)
    score += 1600;
    matchReasons.push('name_compact_phrase');
  }

  // 3. Exact Price match
  if (isQueryNumber) {
    if (
      Math.abs(product.salePriceMinor - numQuery) < 0.01 ||
      Math.abs(product.salePriceMajor - numQuery) < 0.01 ||
      Math.abs(product.purchasePriceMinor - numQuery) < 0.01 ||
      Math.abs(product.purchasePriceMajor - numQuery) < 0.01
    ) {
      score += 1600;
      matchReasons.push('price_exact');
    }
  }

  // 4. Token-by-Token Matching: Every token MUST match at least one aspect of the product
  let matchedTokensCount = 0;

  for (const token of tokens) {
    const compactToken = compactString(token);
    const variants = getArabicTokenVariants(token);
    const phoneticVariants = getPhoneticEquivalents(token);

    let tokenMatched = false;
    let tokenScore = 0;

    // A. Check token and variants directly in product name (ANY part of word / Infix match)
    for (const v of variants) {
      if (normName.includes(v)) {
        tokenMatched = true;
        // Check how it matches in individual words of the name
        if (nameWords.some(w => w === v)) {
          tokenScore = Math.max(tokenScore, 240); // Exact word match
        } else if (nameWords.some(w => w.startsWith(v))) {
          tokenScore = Math.max(tokenScore, 190); // Word starts with token
        } else if (nameWords.some(w => w.endsWith(v))) {
          tokenScore = Math.max(tokenScore, 160); // Word ends with token
        } else {
          tokenScore = Math.max(tokenScore, 140); // Infix / middle of word
        }
        break;
      }
    }

    // B. Space-agnostic compact match in name (e.g. "6x24" in "6x24pies" or "كوكاكولا" in "كوكا كولا")
    if (!tokenMatched && compactToken.length >= 2 && compactName.includes(compactToken)) {
      tokenMatched = true;
      tokenScore = Math.max(tokenScore, 130);
    }

    // C. Sub-sequence character match in words (vowel dropped / minor typo e.g. "سندوتش" in "سندويتش")
    if (!tokenMatched && token.length >= 3) {
      for (const w of nameWords) {
        if (isSubsequenceMatch(token, w)) {
          tokenMatched = true;
          tokenScore = Math.max(tokenScore, 110);
          break;
        }
      }
    }

    // D. Phonetic / Transliteration match (e.g. "ماكس" for "MAXON", "كار" for "CARRE")
    if (!tokenMatched && phoneticVariants.length > 0) {
      for (const pv of phoneticVariants) {
        if (normName.includes(pv) || compactName.includes(pv)) {
          tokenMatched = true;
          tokenScore = Math.max(tokenScore, 100);
          break;
        }
        if (nameWords.some(w => isSubsequenceMatch(pv, w))) {
          tokenMatched = true;
          tokenScore = Math.max(tokenScore, 85);
          break;
        }
      }
    }

    // E. Check token in Barcode
    if (barcode && barcode.includes(token)) {
      tokenMatched = true;
      tokenScore = Math.max(tokenScore, 200);
    }

    // F. Check token in Category
    if (normCategory && (normCategory.includes(token) || compactCategory.includes(compactToken))) {
      tokenMatched = true;
      tokenScore = Math.max(tokenScore, 80);
    }

    // G. Check token in Prices
    if (
      minorSale.includes(token) ||
      majorSale.includes(token) ||
      minorPurch.includes(token) ||
      majorPurch.includes(token)
    ) {
      tokenMatched = true;
      tokenScore = Math.max(tokenScore, 90);
    }

    if (tokenMatched) {
      matchedTokensCount++;
      score += tokenScore;
    } else {
      // If even ONE token fails to match anything in the product, product does not match!
      return {
        matches: false,
        score: 0,
        matchedTokensCount,
        matchReasons: [],
      };
    }
  }

  // Bonus if all tokens match in the name itself
  const allInName = tokens.every(t => {
    const vars = getArabicTokenVariants(t);
    return vars.some(v => normName.includes(v)) || compactName.includes(compactString(t));
  });
  if (allInName) {
    score += 600;
    matchReasons.push('all_tokens_in_name');
  }

  // Bonus for in-order token appearance in product name
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
      score += 350;
      matchReasons.push('in_order_match');
    }
  }

  // Bonus for product availability in stock
  if (product.stockPieces > 0) {
    score += 50;
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

