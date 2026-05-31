export type ConnectLogoSurface = 'light' | 'dark';
export type ConnectLogoTreatment = 'color' | 'monochrome';

export type ConnectRasterAsset = {
  src: string;
  intrinsicWidth: number;
  intrinsicHeight: number;
};

const CONNECT_IMAGE_ROOT = '/images/connect';

export const CONNECT_LOCKUP_DISPLAY_HEIGHT = 40;

// Outer keys = treatment, inner keys = the surface the asset is intended for.
// Files are named by what they ARE (ink color / surface tuning), not where they're used:
//   - monochrome ink → `-black` / `-white`
//   - colored ink    → `-color-on-light` / `-color-on-dark`
// The two `-color-on-light` files are still PNG until the matching SVGs land.
const LOGOMARK_FILES = {
  color: {
    light: 'logomark-color-on-light.png',
    dark: 'logomark-color-on-dark.svg',
  },
  monochrome: {
    light: 'logomark-black.svg',
    dark: 'logomark-white.svg',
  },
} as const;

const LOGOTYPE_FILES = {
  color: {
    light: 'logotype-color-on-light.png',
    dark: 'logotype-color-on-dark.svg',
  },
  monochrome: {
    light: 'logotype-black.svg',
    dark: 'logotype-white.svg',
  },
} as const;

const LOGOMARK_INTRINSIC_SIZE = 848;
const LOGOTYPE_INTRINSIC_WIDTH = 1138;
const LOGOTYPE_INTRINSIC_HEIGHT = 442;

function buildAsset(filename: string, intrinsicWidth: number, intrinsicHeight: number): ConnectRasterAsset {
  return {
    src: `${CONNECT_IMAGE_ROOT}/${filename}`,
    intrinsicWidth,
    intrinsicHeight,
  };
}

export function resolveConnectLogomarkAsset(
  surface: ConnectLogoSurface,
  treatment: ConnectLogoTreatment = 'color'
): ConnectRasterAsset {
  return buildAsset(LOGOMARK_FILES[treatment][surface], LOGOMARK_INTRINSIC_SIZE, LOGOMARK_INTRINSIC_SIZE);
}

export function resolveConnectLogoWithTextAsset(
  surface: ConnectLogoSurface,
  treatment: ConnectLogoTreatment = 'color'
): ConnectRasterAsset {
  return buildAsset(LOGOTYPE_FILES[treatment][surface], LOGOTYPE_INTRINSIC_WIDTH, LOGOTYPE_INTRINSIC_HEIGHT);
}

export function connectLockupDisplayWidth(displayHeight: number): number {
  return Math.round(displayHeight * (LOGOTYPE_INTRINSIC_WIDTH / LOGOTYPE_INTRINSIC_HEIGHT));
}
