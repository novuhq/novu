import { SignInTheme, SignUpTheme } from '@clerk/types';

export const clerkSignupAppearance: SignUpTheme | SignInTheme = {
  elements: {
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
