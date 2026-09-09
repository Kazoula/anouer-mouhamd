import { Product } from '../types';

/**
 * Checks if a product genuinely supports three units (Minor = piece, Middle = box/pack, Major = carton).
 */
export const hasThreeUnits = (prod?: Partial<Product> | null): boolean => {
  if (!prod) return false;
  const middle = (prod.middleUnit || '').trim().toLowerCase();
  const minor = (prod.minorUnit || '').trim().toLowerCase();
  const major = (prod.majorUnit || '').trim().toLowerCase();
  
  if (!middle || middle === minor || middle === major) {
    return false;
  }

  const ratioMiddle = Number(prod.piecesPerMiddleUnit) || 0;
  const ratioMajor = Number(prod.piecesPerMajorUnit) || 0;

  // Middle unit must have ratio > 1 and major ratio must be greater than middle ratio
  if (ratioMiddle <= 1 || ratioMajor <= ratioMiddle) {
    return false;
  }

  return true;
};

/**
 * Checks if a product genuinely supports dual units (e.g., Major = carton, Minor = piece).
 * If majorUnit equals minorUnit, or piecesPerMajorUnit <= 1, it is strictly treated
 * as a single-unit item with no unit repetition or redundant secondary unit dropdowns.
 */
export const isDualUnitProduct = (prod?: Partial<Product> | null): boolean => {
  if (!prod) return false;
  const major = (prod.majorUnit || '').trim().toLowerCase();
  const minor = (prod.minorUnit || '').trim().toLowerCase();
  
  // If either unit is missing or both unit names are identical (e.g. 'كرتونة 6Bouat' and 'كرتونة 6Bouat')
  if (!major || !minor || major === minor) {
    return false;
  }

  const ratio = Number(prod.piecesPerMajorUnit) || 1;
  if (ratio <= 1) {
    return false;
  }

  return true;
};

/**
 * Returns the primary clean display name for a product's unit.
 * For single-unit products (like 'كرتونة 6Bouat'), this returns the main packaging unit.
 */
export const getPrimaryUnit = (prod?: Partial<Product> | null): string => {
  if (!prod) return 'قطعة';
  return (prod.majorUnit || prod.minorUnit || 'قطعة').trim();
};

export interface ProductUnitOption {
  type: 'minor' | 'middle' | 'major';
  name: string;
  ratio: number;
  salePrice: number;
  purchasePrice: number;
}

/**
 * Returns all active units available for a product (1, 2, or 3 units).
 */
export const getProductUnitsList = (prod?: Partial<Product> | null): ProductUnitOption[] => {
  if (!prod) return [];

  const minorName = (prod.minorUnit || 'قطعة').trim();
  const majorName = (prod.majorUnit || prod.minorUnit || 'قطعة').trim();
  const middleName = (prod.middleUnit || '').trim();

  const isThree = hasThreeUnits(prod);
  const isDual = isDualUnitProduct(prod);

  // Case 1: Single unit product
  if (!isDual && !isThree) {
    const singleName = getPrimaryUnit(prod);
    const salePrice = (prod.salePriceMajor && prod.salePriceMajor > 0) ? prod.salePriceMajor : (prod.salePriceMinor || 0);
    const purchasePrice = (prod.purchasePriceMajor && prod.purchasePriceMajor > 0) ? prod.purchasePriceMajor : (prod.purchasePriceMinor || 0);
    return [
      {
        type: 'major',
        name: singleName,
        ratio: 1,
        salePrice,
        purchasePrice,
      },
    ];
  }

  // Case 2: Three units product
  if (isThree) {
    return [
      {
        type: 'minor',
        name: minorName,
        ratio: 1,
        salePrice: prod.salePriceMinor || 0,
        purchasePrice: prod.purchasePriceMinor || 0,
      },
      {
        type: 'middle',
        name: middleName,
        ratio: Number(prod.piecesPerMiddleUnit) || 1,
        salePrice: prod.salePriceMiddle || (prod.salePriceMinor || 0) * (Number(prod.piecesPerMiddleUnit) || 1),
        purchasePrice: prod.purchasePriceMiddle || (prod.purchasePriceMinor || 0) * (Number(prod.piecesPerMiddleUnit) || 1),
      },
      {
        type: 'major',
        name: majorName,
        ratio: Number(prod.piecesPerMajorUnit) || 1,
        salePrice: prod.salePriceMajor || 0,
        purchasePrice: prod.purchasePriceMajor || 0,
      },
    ];
  }

  // Case 3: Dual units product
  return [
    {
      type: 'minor',
      name: minorName,
      ratio: 1,
      salePrice: prod.salePriceMinor || 0,
      purchasePrice: prod.purchasePriceMinor || 0,
    },
    {
      type: 'major',
      name: majorName,
      ratio: Number(prod.piecesPerMajorUnit) || 1,
      salePrice: prod.salePriceMajor || 0,
      purchasePrice: prod.purchasePriceMajor || 0,
    },
  ];
};

/**
 * Normalizes product units and prices:
 * Ensures products where majorUnit == minorUnit (or ratio <= 1) are treated cleanly
 * as single-unit items, eliminating redundant minor unit options and avoiding false
 * stock multiplications.
 */
export const normalizeProductUnits = (prod: Product): Product => {
  if (!prod) return prod;

  const major = (prod.majorUnit || '').trim();
  const minor = (prod.minorUnit || '').trim();
  const ratio = Number(prod.piecesPerMajorUnit) || 1;

  // Single unit condition: names identical OR ratio <= 1 OR missing unit
  const isSingle = !major || !minor || major.toLowerCase() === minor.toLowerCase() || ratio <= 1;

  if (isSingle) {
    const singleUnit = major || minor || 'قطعة';
    const salePrice = prod.salePriceMajor > 0 ? prod.salePriceMajor : (prod.salePriceMinor || 0);
    const purchasePrice = prod.purchasePriceMajor > 0 ? prod.purchasePriceMajor : (prod.purchasePriceMinor || 0);

    return {
      ...prod,
      majorUnit: singleUnit,
      minorUnit: singleUnit,
      piecesPerMajorUnit: 1,
      salePriceMajor: salePrice,
      salePriceMinor: salePrice,
      purchasePriceMajor: purchasePrice,
      purchasePriceMinor: purchasePrice,
      middleUnit: undefined,
      piecesPerMiddleUnit: undefined,
      salePriceMiddle: undefined,
      purchasePriceMiddle: undefined,
    };
  }

  // Clean up invalid middleUnit
  if (prod.middleUnit) {
    const mid = prod.middleUnit.trim().toLowerCase();
    const pMid = Number(prod.piecesPerMiddleUnit) || 0;
    if (!mid || mid === minor.toLowerCase() || mid === major.toLowerCase() || pMid <= 1 || pMid >= ratio) {
      return {
        ...prod,
        middleUnit: undefined,
        piecesPerMiddleUnit: undefined,
        salePriceMiddle: undefined,
        purchasePriceMiddle: undefined,
      };
    }
  }

  return prod;
};
