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
    panelSection: {
      value: { base: '{colors.legacy.B98}', _dark: '{colors.legacy.B20}' },
      type: 'color',
    },
    panelSubsection: {
      value: { base: '{colors.legacy.white}', _dark: '{colors.legacy.B17}' },
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
      disabled: {
        value: { base: '{colors.mauve.30.light}', _dark: '{colors.mauve.30.dark}' },
        type: 'color',
      },
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
        required: {
          value: { base: '{colors.red.20.light}', _dark: '{colors.red.20.dark}' },
          type: 'color',
        },
      },
    },
  },
  button: {
    text: {
      filled: {
        value: { base: '{colors.legacy.white}', _dark: '{colors.legacy.white}' },
        type: 'color',
      },
      outline: {
        value: { base: '{colors.legacy.gradientMiddle}', _dark: '{colors.legacy.white}' },
        type: 'color',
      },
    },
    icon: {
      filled: {
        value: { base: '{colors.legacy.white}', _dark: '{colors.legacy.white}' },
        type: 'color',
      },
    },
    secondary: {
      background: {
        value: { base: '{colors.legacy.white}', _dark: '{colors.legacy.B17}' },
        type: 'color',
      },
    },
  },
  table: {
    header: {
      border: {
        value: { base: '{colors.legacy.B98}', _dark: '{colors.legacy.B30}' },
        type: 'color',
      },
    },
    row: {
      border: {
        value: { base: '{colors.legacy.B98}', _dark: '{colors.legacy.B20}' },
        type: 'color',
      },
      surface: {
        hover: {
          value: { base: '{colors.legacy.B98}', _dark: '{colors.legacy.B20}' },
          type: 'color',
        },
      },
    },
    bottom: {
      border: {
        value: { base: '{colors.legacy.B98}', _dark: '{colors.legacy.B30}' },
        type: 'color',
      },
    },
  },
  tabs: {
    border: {
      value: { base: '{colors.legacy.B98}', _dark: '{colors.legacy.B30}' },
      type: 'color',
    },
  },
  badge: {
    border: {
      value: { base: '{colors.legacy.B80}', _dark: '{colors.legacy.B30}' },
      type: 'color',
    },
  },
  icon: {
    main: {
      value: { base: '{colors.legacy.B60}', _dark: '{colors.legacy.B60}' },
      type: 'color',
    },
    secondary: {
      value: { base: '{colors.legacy.B70}', _dark: '{colors.legacy.B40}' },
      type: 'color',
    },
  },
  status: {
    active: {
      value: { base: '{colors.legacy.success}', _dark: '{colors.legacy.success}' },
      type: 'color',
    },
    inactive: {
      value: { base: '{colors.legacy.B40}', _dark: '{colors.legacy.B40}' },
      type: 'color',
    },
  },
  input: {
    border: {
      DEFAULT: {
        value: { base: '{colors.legacy.B80}', _dark: '{colors.legacy.B30}' },
        type: 'color',
      },
      active: {
        value: { base: '{colors.legacy.B60}', _dark: '{colors.legacy.B60}' },
        type: 'color',
      },
      disabled: {
        value: { base: '{colors.legacy.BGLight}', _dark: '{colors.legacy.B30}' },
        type: 'color',
      },
      error: {
        value: { base: '{colors.legacy.error}', _dark: '{colors.legacy.error}' },
        type: 'color',
      },
    },
    surface: {
      DEFAULT: {
        value: { base: '{colors.transparent}', _dark: '{colors.transparent}' },
        type: 'color',
      },
      disabled: {
        value: { base: '{colors.legacy.B98}', _dark: '{colors.legacy.B20}' },
        type: 'color',
      },
    },
  },
  select: {
    option: {
      surface: {
        hover: {
          value: { base: '{colors.legacy.B98}', _dark: '{colors.legacy.B30}' },
          type: 'color',
        },
        selected: {
          value: { base: '{colors.legacy.BGLight}', _dark: '{colors.legacy.B40}' },
          type: 'color',
        },
      },
    },
  },
  codeBlock: {
    surface: {
      value: { base: '{colors.legacy.B80}', _dark: '{colors.legacy.B20}' },
      type: 'color',
    },
    text: {
      value: { base: '{colors.legacy.B40}', _dark: '{colors.legacy.white}' },
      type: 'color',
    },
  },
  variable: {
    surface: {
      value: { base: '{colors.legacy.BGLight}', _dark: '{colors.legacy.B20}' },
      type: 'color',
    },
    text: {
      // TODO: Design owes us base tokens / palette values to use here instead
      value: { base: '#B743FF', _dark: '#AD74FF' },
      type: 'color',
    },
    border: {
      value: { base: '{colors.legacy.B80}', _dark: '{colors.legacy.B30}' },
      type: 'color',
    },
  },
  loader: {
    overlay: {
      value: { base: '{colors.legacy.BGLight}', _dark: '{colors.legacy.BGDark}' },
      type: 'color',
    },
  },
  // color palette semantic testing
  mode: {
    cloud: {
      start: {
        value: { base: '{colors.legacy.gradientEnd}', _dark: '{colors.legacy.gradientEnd}' },
        type: 'color',
      },
      middle: {
        value: { base: '{colors.legacy.gradientMiddle}', _dark: '{colors.legacy.gradientMiddle}' },
        type: 'color',
      },
      end: {
        value: { base: '{colors.legacy.gradientStart}', _dark: '{colors.legacy.gradientStart}' },
        type: 'color',
      },
    },
    local: {
      start: {
        value: { base: '{colors.green.30.light}', _dark: '{colors.green.50.dark}' },
        type: 'color',
      },
      middle: {
        value: { base: '{colors.green.40.light}', _dark: '{colors.green.40.dark}' },
        type: 'color',
      },
      end: {
        value: { base: '{colors.green.50.light}', _dark: '{colors.green.30.dark}' },
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
  icon: {
    main: {
      value: { base: '{colors.mauve.20.light}', _dark: '{colors.mauve.20.dark}' },
      type: 'color',
    },
  },
  scrollbar: {
    color: {
      value: '{colors.scrollbar.thumb} {colors.scrollbar.track}',
      type: 'color',
    },
    track: {
      value: { base: '{colors.transparent}', _dark: '{colors.transparent}' },
      type: 'color',
    },
    thumb: {
      value: { base: '{colors.legacy.B80}', _dark: '{colors.legacy.B30}' },
      type: 'color',
    },
  },
});
