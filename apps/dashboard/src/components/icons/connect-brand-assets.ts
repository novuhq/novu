export type ConnectLogoSurface = 'light' | 'dark';
export type ConnectLogoTreatment = 'color' | 'monochrome';

export type ConnectRasterAsset = {
  src: string;
  intrinsicWidth: number;
  intrinsicHeight: number;
};

const CONNECT_IMAGE_ROOT = '/images/connect';

export const CONNECT_LOCKUP_DISPLAY_HEIGHT = 40;

const LOGOMARK_FILES = {
  color: {
    light: 'logomark-light.png',
    dark: 'logomark-dark.png',
  },
  monochrome: {
    light: 'logomark-monochrome-light.png',
    dark: 'logomark-monochrome-dark.png',
  },
} as const;

// `light` keys hold the dark wordmark (for light surfaces) and vice versa.
const LOGO_WITH_TEXT_FILES = {
  color: {
    light: 'logo-with-text-light.png',
    dark: 'logo-with-text-dark.png',
  },
  monochrome: {
    light: 'logo-with-text-monochrome-light.png',
    dark: 'logo-with-text-monochrome-dark.png',
  },
} as const;

const LOGOMARK_INTRINSIC_SIZE = 1280;
const LOGO_WITH_TEXT_INTRINSIC_WIDTH = 2501;
const LOGO_WITH_TEXT_INTRINSIC_HEIGHT = 960;

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
  return buildAsset(
    LOGO_WITH_TEXT_FILES[treatment][surface],
    LOGO_WITH_TEXT_INTRINSIC_WIDTH,
    LOGO_WITH_TEXT_INTRINSIC_HEIGHT
  );
}

export function connectLockupDisplayWidth(displayHeight: number): number {
  return Math.round(displayHeight * (LOGO_WITH_TEXT_INTRINSIC_WIDTH / LOGO_WITH_TEXT_INTRINSIC_HEIGHT));
}
