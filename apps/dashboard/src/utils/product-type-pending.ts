import { readClerkAuthParamFromLocation } from '@/utils/product-auth-urls';

// `?product_type=agents` on the auth pages selects the agents onboarding path. The value is captured
// before Clerk's sign-up redirect drops it, persisted in sessionStorage, and resolved after org
// creation to skip the usecase picker and land on the agents setup page.
export const PRODUCT_TYPE_PARAM = 'product_type';

export const PRODUCT_TYPES = ['agents'] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];

const STORAGE_KEY = 'pendingProductType';

function isValidProductType(value: string | null | undefined): value is ProductType {
  return typeof value === 'string' && (PRODUCT_TYPES as readonly string[]).includes(value);
}

// Reads `product_type` from the current location (query string or Clerk hash routing) or the passed
// search params, returning it only when it is a known type.
export function readProductTypeParam(searchParams?: URLSearchParams): ProductType | null {
  const value = readClerkAuthParamFromLocation(PRODUCT_TYPE_PARAM, searchParams);

  return isValidProductType(value) ? value : null;
}

// Resolves the product type for the current page: the live URL param takes priority, falling back to
// the value persisted earlier in the session so the choice survives navigation that drops the param.
export function resolveProductType(searchParams?: URLSearchParams): ProductType | null {
  return readProductTypeParam(searchParams) ?? readPendingProductType();
}

export function storePendingProductType(value: ProductType): void {
  if (typeof window === 'undefined' || !isValidProductType(value)) {
    return;
  }

  sessionStorage.setItem(STORAGE_KEY, value);
}

export function readPendingProductType(): ProductType | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const value = sessionStorage.getItem(STORAGE_KEY);

  return isValidProductType(value) ? value : null;
}

export function clearPendingProductType(): void {
  if (typeof window === 'undefined') {
    return;
  }

  sessionStorage.removeItem(STORAGE_KEY);
}

// Reads the param from the given location/search params and persists it when valid. Safe to call on
// every auth-page render — it only writes when a known product type is present.
export function capturePendingProductType(searchParams?: URLSearchParams): ProductType | null {
  const value = readProductTypeParam(searchParams);

  if (value) {
    storePendingProductType(value);
  }

  return value;
}
