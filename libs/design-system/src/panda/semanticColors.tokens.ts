import { defineSemanticTokens } from '@pandacss/dev';

/** @deprecated */
export const LEGACY_COLOR_SEMANTIC_TOKENS = defineSemanticTokens.colors({
  surface: {
    page: {
      value: { base: '{colors.legacy.white}', _dark: '{colors.legacy.B15}' },
      type: 'color',
    },
    panel: {
      value: { base: '{colors.legacy.BGLight}', _dark: '{colors.legacy.BGDark}' },
      type: 'color',
    },
    popover: {
      value: { base: '{colors.legacy.white}', _dark: '{colors.legacy.B20}' },
      type: 'color',
    },
  },
  typography: {
    text: {
      main: {
        value: { base: '{colors.legacy.B40}', _dark: '{colors.legacy.white}' },
        type: 'color',
      },
      secondary: {
        value: { base: '{colors.legacy.B60}', _dark: '{colors.legacy.B60}' },
        type: 'color',
      },
      tertiary: {
        value: { base: '{colors.legacy.B70}', _dark: '{colors.legacy.B40}' },
        type: 'color',
      },
      // not actually legacy, but makes the merging of the two easier for now.
      feedback: {
        alert: {
          value: { base: '{colors.red.20.light}', _dark: '{colors.red.20.dark}' },
          type: 'color',
        },
        warning: {
          value: { base: '{colors.amber.30.light}', _dark: '{colors.amber.30.dark}' },
          type: 'color',
        },
        info: {
          value: { base: '{colors.blue.20.light}', _dark: '{colors.blue.20.dark}' },
          type: 'color',
        },
        success: {
          value: { base: '{colors.green.20.light}', _dark: '{colors.green.20.dark}' },
          type: 'color',
        },
      },
    },
  },
  button: {
    text: {
      outline: {
        value: { base: '{colors.legacy.gradientMiddle}', _dark: '{colors.legacy.white}' },
        type: 'color',
      },
    },
  },
});

export const COLOR_SEMANTIC_TOKENS = defineSemanticTokens.colors({
  typography: {
    text: {
      feedback: {
        alert: {
          value: { base: '{colors.red.20.light}', _dark: '{colors.red.20.dark}' },
          type: 'color',
        },
        warning: {
          value: { base: '{colors.amber.30.light}', _dark: '{colors.amber.30.dark}' },
          type: 'color',
        },
        info: {
          value: { base: '{colors.blue.20.light}', _dark: '{colors.blue.20.dark}' },
          type: 'color',
        },
        success: {
          value: { base: '{colors.green.20.light}', _dark: '{colors.green.20.dark}' },
          type: 'color',
        },
      },
      main: {
        value: { base: '{colors.mauve.10.light}', _dark: '{colors.mauve.10.dark}' },
        type: 'color',
      },
      secondary: {
        value: { base: '{colors.mauve.20.light}', _dark: '{colors.mauve.20.dark}' },
        type: 'color',
      },
      disabled: {
        value: { base: '{colors.mauve.30.light}', _dark: '{colors.mauve.30.dark}' },
        type: 'color',
      },
      accent: {
        value: { base: '{colors.blue.20.light}', _dark: '{colors.blue.20.dark}' },
        type: 'color',
      },
    },
  },
  button: {
    hovered: {
      background: {
        value: { base: '{colors.blue.30.light}', _dark: '{colors.blue.30.dark}' },
        type: 'color',
      },
      border: {
        value: { base: '{colors.blue.30.light}', _dark: '{colors.blue.30.dark}' },
        type: 'color',
      },
      text: {
        value: { base: '{colors.blue.120.light}', _dark: '{colors.blue.120.dark}' },
        type: 'color',
      },
    },
    pressed: {
      background: {
        value: { base: '{colors.blue.20.light}', _dark: '{colors.blue.20.dark}' },
        type: 'color',
      },
      border: {
        value: { base: '{colors.blue.20.light}', _dark: '{colors.blue.20.dark}' },
        type: 'color',
      },
      text: {
        value: { base: '{colors.blue.120.light}', _dark: '{colors.blue.120.dark}' },
        type: 'color',
      },
    },
    disabled: {
      background: {
        value: { base: '{colors.mauve.10.light}', _dark: '{colors.mauve.10.dark}' },
        type: 'color',
      },
      border: {
        value: { base: '{colors.mauve.50.light}', _dark: '{colors.mauve.50.dark}' },
        type: 'color',
      },
      text: {
        // this was a self-referential token (referring to semantic.colors.typography.text.disabled)
        value: { base: '{colors.mauve.30.light}', _dark: '{colors.mauve.30.dark}' },
        type: 'color',
      },
    },
    background: {
      value: { base: '{colors.blue.40.light}', _dark: '{colors.blue.40.dark}' },
      type: 'color',
    },
    border: {
      value: { base: '{colors.blue.40.light}', _dark: '{colors.blue.40.dark}' },
      type: 'color',
    },
    text: {
      value: { base: '{colors.blue.120.light}', _dark: '{colors.blue.120.dark}' },
      type: 'color',
    },
  },
  surface: {
    page: {
      value: { base: '{colors.mauve.100.light}', _dark: '{colors.mauve.100.dark}' },
      type: 'color',
    },
    panel: {
      value: { base: '{colors.mauve.110.light}', _dark: '{colors.mauve.110.dark}' },
      type: 'color',
    },
    popover: {
      value: { base: '{colors.mauve.120.light}', _dark: '{colors.mauve.120.dark}' },
      type: 'color',
    },
  },
});
