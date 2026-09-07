import type { ClerkAppearanceTheme } from '@clerk/shared/types';

const lastAuthenticationStrategyBadgeLight = {
  fontSize: '10px',
  fontWeight: '500',
  lineHeight: '1',
  height: 'auto',
  minHeight: 'unset',
  padding: '2px 6px',
  background: 'hsl(var(--neutral-100))',
  color: 'hsl(var(--neutral-500))',
  border: '1px solid hsl(var(--neutral-200))',
  borderRadius: '4px',
  boxShadow: 'none',
  letterSpacing: 'normal',
  transform: 'translate(8px, calc(-50% - 1px))',
} as const;

const lastAuthenticationStrategyBadgeDark = {
  fontSize: '10px',
  fontWeight: '500',
  lineHeight: '1',
  height: 'auto',
  minHeight: 'unset',
  padding: '2px 6px',
  background: 'rgba(255, 255, 255, 0.08)',
  color: 'rgba(255, 255, 255, 0.55)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '4px',
  boxShadow: 'none',
  letterSpacing: 'normal',
  transform: 'translate(8px, calc(-50% - 1px))',
} as const;

export const clerkSignupAppearance: ClerkAppearanceTheme = {
  elements: {
    lastAuthenticationStrategyBadge: lastAuthenticationStrategyBadgeLight,
    headerTitle: {
      fontWeight: '500',
    },
    headerSubtitle: {
      fontSize: '12px',
    },
    formFieldLabel: {
      fontSize: '12px !important',
      fontWeight: '500',
    },
    footer: {
      background: 'linear-gradient(0deg, rgba(0, 0, 0, 0.02) 0%, rgba(0, 0, 0, 0.02) 100%), #FFF',
    },
    cardBox: {
      boxShadow:
        '0px 0px 2px 0px rgba(0, 0, 0, 0.08), 0px 1px 2px 0px rgba(25, 28, 33, 0.06), 0px 0px 0px 1px rgba(0, 0, 0, 0.03)',
    },
  },
} as const;

export const clerkLandingSignupAppearance: ClerkAppearanceTheme = {
  elements: {
    lastAuthenticationStrategyBadge: lastAuthenticationStrategyBadgeDark,
    headerTitle: {
      fontWeight: '500',
    },
    headerSubtitle: {
      fontSize: '15px',
      color: '#333',
      letterSpacing: '-0.3px',
    },
    formFieldLabel: {
      fontSize: '15px !important',
      fontWeight: '400',
      letterSpacing: '-0.3px',
    },
    formButtonPrimary: {
      backgroundColor: '#000',
      borderRadius: '6px',
      height: '42px',
      textTransform: 'uppercase' as const,
      fontSize: '13px',
      fontWeight: '500',
      letterSpacing: '0.5px',
    },
    card: {
      background: 'linear-gradient(158deg, #f5f7ff 5%, #ebf0ff 99%)',
      borderRadius: '10px',
      padding: '32px 36px',
      boxShadow: 'none',
    },
    cardBox: {
      border: '1px solid rgba(199, 245, 255, 0.3)',
      boxShadow: '0px 10px 64px 0px rgba(19, 13, 27, 0.5)',
      background: 'linear-gradient(158deg, rgb(18, 12, 29) 5%, rgb(18, 16, 34) 99%)',
      padding: '5px',
    },
    footer: {
      background: 'transparent',
    },
    footerAction: {
      color: 'rgba(255, 255, 255, 0.45)',
    },
    footerActionLink: {
      color: '#809fff',
    },
    footerActionText: {
      color: 'rgba(255, 255, 255, 0.45)',
    },
  },
} as const;
