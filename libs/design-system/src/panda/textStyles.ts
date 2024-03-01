import { defineTextStyles } from '@pandacss/dev';

export const textStyles = defineTextStyles({
  text: {
    main: {
      description: 'Main text',
      value: {
        fontFamily: 'SF Pro',
        fontWeight: 'normal',
        fontSize: '0.875rem',
        textDecoration: 'none',
        lineHeight: '1.25rem',
      },
    },
    secondary: {
      description: 'Secondary text',
      value: {
        fontFamily: 'SF Pro',
        fontWeight: 'normal',
        fontSize: '0.875rem',
        textDecoration: 'none',
        lineHeight: '1.25rem',
      },
    },
    mono: {
      description: 'Mono-spaced text',
      value: {
        fontFamily: 'SF Mono',
        fontWeight: 'normal',
        fontSize: '0.875rem',
        textDecoration: 'none',
        lineHeight: '1.25rem',
      },
    },
    strong: {
      description: 'Strong text',
      value: {
        fontWeight: 'bold',
      },
    },
  },
});
