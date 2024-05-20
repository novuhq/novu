import { defineTextStyles } from '@pandacss/dev';

export const TEXT_STYLES = defineTextStyles({
  text: {
    main: {
      description: 'Main text',
      value: {
        fontFamily: 'system',
        fontWeight: 'regular',
        letterSpacing: '0',
        fontSize: '88',
        textDecoration: 'none',
        lineHeight: '125',
      },
    },
    secondary: {
      description: 'Secondary text',
      value: {
        fontFamily: 'system',
        fontWeight: 'regular',
        letterSpacing: '0',
        fontSize: '75',
        textDecoration: 'none',
        lineHeight: '100',
      },
    },
    mono: {
      description: 'Mono-spaced text',
      value: {
        fontFamily: 'mono',
        fontWeight: 'regular',
        letterSpacing: '0',
        fontSize: '88',
        textDecoration: 'none',
        lineHeight: '125',
      },
    },
    strong: {
      description: 'Strong text',
      value: {
        fontWeight: 'strong',
        letterSpacing: '0',
      },
    },
  },
  title: {
    page: {
      description: 'Page title',
      value: {
        fontFamily: 'system',
        fontWeight: 'strong',
        letterSpacing: '0',
        fontSize: '150',
        textDecoration: 'none',
        lineHeight: '200',
      },
    },
    section: {
      description: 'Section title',
      value: {
        fontFamily: 'system',
        fontWeight: 'strong',
        letterSpacing: '0',
        fontSize: '125',
        textDecoration: 'none',
        lineHeight: '175',
      },
    },
    subsection: {
      description: 'Subsection title',
      value: {
        fontFamily: 'system',
        fontWeight: 'strong',
        letterSpacing: '0',
        fontSize: '100',
        textDecoration: 'none',
        lineHeight: '150',
      },
    },
  },
});
