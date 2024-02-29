export const COLOR_TOKENS = {
  base: {
    palette: {
      amber: {
        '10': {
          value: '#4e2009ff',
          type: 'color',
        },
        '20': {
          value: '#ad5700ff',
          type: 'color',
        },
        '30': {
          value: '#ffa01cff',
          type: 'color',
        },
        '40': {
          value: '#ffb224ff',
          type: 'color',
        },
        '50': {
          value: '#ee9d2bff',
          type: 'color',
        },
        '60': {
          value: '#f3ba63ff',
          type: 'color',
        },
        '70': {
          value: '#ffd386ff',
          type: 'color',
        },
        '80': {
          value: '#ffe3a2ff',
          type: 'color',
        },
        '90': {
          value: '#ffecbcff',
          type: 'color',
        },
        '100': {
          value: '#fff4d5ff',
          type: 'color',
        },
        '110': {
          value: '#fff9edff',
          type: 'color',
        },
        '120': {
          value: '#fefdfbff',
          type: 'color',
        },
      },
      blue: {
        '10': {
          value: '#00254dff',
          type: 'color',
        },
        '20': {
          value: '#006adcff',
          type: 'color',
        },
        '30': {
          value: '#0081f1ff',
          type: 'color',
        },
        '40': {
          value: '#0077d4ff',
          type: 'color',
        },
        '50': {
          value: '#5eb0efff',
          type: 'color',
        },
        '60': {
          value: '#96c7f2ff',
          type: 'color',
        },
        '70': {
          value: '#b7d9f8ff',
          type: 'color',
        },
        '80': {
          value: '#cee7feff',
          type: 'color',
        },
        '90': {
          value: '#e1f0ffff',
          type: 'color',
        },
        '100': {
          value: '#edf6ffff',
          type: 'color',
        },
        '110': {
          value: '#f5faffff',
          type: 'color',
        },
        '120': {
          value: '#fbfdffff',
          type: 'color',
        },
      },
      green: {
        '10': {
          value: '#153226ff',
          type: 'color',
        },
        '20': {
          value: '#18794eff',
          type: 'color',
        },
        '30': {
          value: '#299764ff',
          type: 'color',
        },
        '40': {
          value: '#30a46cff',
          type: 'color',
        },
        '50': {
          value: '#5bb98cff',
          type: 'color',
        },
        '60': {
          value: '#92ceacff',
          type: 'color',
        },
        '70': {
          value: '#b4dfc4ff',
          type: 'color',
        },
        '80': {
          value: '#ccebd7ff',
          type: 'color',
        },
        '90': {
          value: '#ddf3e4ff',
          type: 'color',
        },
        '100': {
          value: '#e9f9eeff',
          type: 'color',
        },
        '110': {
          value: '#f2fcf5ff',
          type: 'color',
        },
        '120': {
          value: '#fbfefcff',
          type: 'color',
        },
      },
      mauve: {
        '10': {
          value: '#1a1523ff',
          type: 'color',
        },
        '20': {
          value: '#6f6e77ff',
          type: 'color',
        },
        '30': {
          value: '#86848dff',
          type: 'color',
        },
        '40': {
          value: '#908e96ff',
          type: 'color',
        },
        '50': {
          value: '#c8c7cbff',
          type: 'color',
        },
        '60': {
          value: '#dcdbddff',
          type: 'color',
        },
        '70': {
          value: '#e4e2e4ff',
          type: 'color',
        },
        '80': {
          value: '#e9e8eaff',
          type: 'color',
        },
        '90': {
          value: '#eeedefff',
          type: 'color',
        },
        '100': {
          value: '#f3f3f3ff',
          type: 'color',
        },
        '110': {
          value: '#f8f8f8ff',
          type: 'color',
        },
        '120': {
          value: '#fcfcfcff',
          type: 'color',
        },
      },
      red: {
        '10': {
          value: '#381316ff',
          type: 'color',
        },
        '20': {
          value: '#cd2b31ff',
          type: 'color',
        },
        '30': {
          value: '#dc3d43ff',
          type: 'color',
        },
        '40': {
          value: '#e5484dff',
          type: 'color',
        },
        '50': {
          value: '#eb9091ff',
          type: 'color',
        },
        '60': {
          value: '#f3aeafff',
          type: 'color',
        },
        '70': {
          value: '#f9c6c6ff',
          type: 'color',
        },
        '80': {
          value: '#fdd8d8ff',
          type: 'color',
        },
        '90': {
          value: '#ffe5e5ff',
          type: 'color',
        },
        '100': {
          value: '#ffefefff',
          type: 'color',
        },
        '110': {
          value: '#fff8f8ff',
          type: 'color',
        },
        '120': {
          value: '#fffcfcff',
          type: 'color',
        },
      },
    },
  },
  semantic: {
    patterns: {
      button: {
        hovered: {
          background: {
            value: '{color.base.palette.blue.30.value}',
            type: 'color',
          },
          border: {
            value: '{color.base.palette.blue.30.value}',
            type: 'color',
          },
          text: {
            value: '{color.base.palette.blue.120.value}',
            type: 'color',
          },
        },
        pressed: {
          background: {
            value: '{color.base.palette.blue.20.value}',
            type: 'color',
          },
          border: {
            value: '{color.base.palette.blue.20.value}',
            type: 'color',
          },
          text: {
            value: '{color.base.palette.blue.120.value}',
            type: 'color',
          },
        },
        disabled: {
          background: {
            value: '#ffffff00',
            type: 'color',
          },
          border: {
            value: '{color.base.palette.mauve.50.value}',
            type: 'color',
          },
          text: {
            value: '{color.semantic.typography.text.disabled.value}',
            type: 'color',
          },
        },
        background: {
          value: '#0077d4ff',
          type: 'color',
        },
        border: {
          value: '#0077d4ff',
          type: 'color',
        },
        text: {
          value: '{color.base.palette.blue.120.value}',
          type: 'color',
        },
      },
      surface: {
        page: {
          value: '{color.base.palette.mauve.100.value}',
          type: 'color',
        },
        panel: {
          value: '{color.base.palette.mauve.110.value}',
          type: 'color',
        },
        popover: {
          value: '{color.base.palette.mauve.120.value}',
          type: 'color',
        },
      },
    },
    typography: {
      text: {
        feedback: {
          alert: {
            value: '{color.base.palette.red.20.value}',
            type: 'color',
          },
          warning: {
            value: '{color.base.palette.amber.30.value}',
            type: 'color',
          },
          info: {
            value: '{color.base.palette.blue.20.value}',
            type: 'color',
          },
          success: {
            value: '{color.base.palette.green.20.value}',
            type: 'color',
          },
        },
        main: {
          value: '{color.base.palette.mauve.10.value}',
          type: 'color',
        },
        secondary: {
          value: '{color.base.palette.mauve.20.value}',
          type: 'color',
        },
        disabled: {
          value: '{color.base.palette.mauve.30.value}',
          type: 'color',
        },
        accent: {
          value: '{color.base.palette.blue.20.value}',
          type: 'color',
        },
      },
    },
  },
};
