import { defineSemanticTokens } from '@pandacss/dev';

/**
 * Semantic uses of spacing. May target an individual component or spacing between components.
 */
export const SEMANTIC_SPACING_TOKENS = defineSemanticTokens.spacing({
  molecules: {
    form: {
      input: {
        button: {
          value: `{spacing.150}`,
          description: 'Distance between an input and its submit button',
          type: 'spacing',
        },
      },
    },
  },
  paddings: {
    page: {
      horizontal: {
        type: 'spacing',
        value: '{spacing.150}',
      },
      vertical: {
        type: 'spacing',
        value: '{spacing.150}',
      },
    },
    panel: {
      horizontal: {
        type: 'spacing',
        value: '{spacing.150}',
      },
      vertical: {
        type: 'spacing',
        value: '{spacing.150}',
      },
    },
    popover: {
      horizontal: {
        type: 'spacing',
        value: '{spacing.150}',
      },
      vertical: {
        type: 'spacing',
        value: '{spacing.150}',
      },
    },
    node: {
      horizontal: {
        type: 'spacing',
        value: '{spacing.150}',
      },
      vertical: {
        type: 'spacing',
        value: '{spacing.150}',
      },
    },
    nav: {
      menu: {
        horizontal: {
          type: 'spacing',
          value: '{spacing.100}',
        },
        vertical: {
          type: 'spacing',
          value: '{spacing.100}',
        },
      },
      header: {
        horizontal: {
          type: 'spacing',
          value: '{spacing.50}',
        },
        vertical: {
          type: 'spacing',
          value: '{spacing.50}',
        },
      },
      footer: {
        top: {
          type: 'spacing',
          value: '{spacing.50}',
        },
        bottom: {
          type: 'spacing',
          value: '{spacing.100}',
        },
      },
    },
    WF: {
      WFtop: {
        type: 'spacing',
        value: '{spacing.375}',
      },
      WFheaderHorizontal: {
        type: 'spacing',
        value: '{spacing.100}',
      },
      WFhorizontal: {
        type: 'spacing',
        value: '{spacing.50}',
      },
      MobPreviewTop: {
        type: 'spacing',
        value: '{spacing.250}',
      },
    },
    components: {
      code: {
        horizontal: {
          type: 'spacing',
          value: '{spacing.100}',
        },
        vertical: {
          type: 'spacing',
          value: '{spacing.25}',
        },
      },
      button: {
        horizontal: {
          l: {
            type: 'spacing',
            value: '{spacing.125}',
          },
          m: {
            type: 'spacing',
            value: '{spacing.100}',
          },
          s: {
            type: 'spacing',
            value: '{spacing.75}',
          },
          xs: {
            type: 'spacing',
            value: '{spacing.50}',
          },
        },
      },
      info: {
        spotlight: {
          horizontal: {
            type: 'spacing',
            value: '{spacing.75}',
          },
          vertical: {
            type: 'spacing',
            value: '{spacing.75}',
          },
        },
        hint: {
          horizontal: {
            type: 'spacing',
            value: '{spacing.100}',
          },
          vertical: {
            type: 'spacing',
            value: '{spacing.100}',
          },
        },
      },
      txtInput: {
        horizontal: {
          type: 'spacing',
          value: '{spacing.75}',
        },
      },
    },
  },
  margins: {
    icons: {
      'Icon40-txt': {
        type: 'spacing',
        value: '{spacing.50}',
      },
      'Icon32-txt': {
        type: 'spacing',
        value: '{spacing.50}',
      },
      'Icon20-txt': {
        type: 'spacing',
        value: '{spacing.50}',
      },
      'Icon16-txt': {
        type: 'spacing',
        value: '{spacing.25}',
      },
      'icon20-icon20': {
        type: 'spacing',
        value: '{spacing.50}',
      },
    },
    buttons: {
      'XS-XS': {
        type: 'spacing',
        value: '{spacing.25}',
      },
      WFchannels: {
        type: 'spacing',
        value: '{spacing.50}',
      },
      'XS-status': {
        type: 'spacing',
        value: '{spacing.100}',
      },
      'S-S': {
        type: 'spacing',
        value: '{spacing.100}',
      },
      'M-M': {
        type: 'spacing',
        value: '{spacing.125}',
      },
    },
    layout: {
      tabs: {
        'tab-tab': {
          type: 'spacing',
          value: '{spacing.150}',
        },
        bottom: {
          type: 'spacing',
          value: '{spacing.150}',
        },
      },
      text: {
        'title-body': {
          type: 'spacing',
          value: '{spacing.100}',
        },
        'sub-title-body': {
          type: 'spacing',
          value: '{spacing.50}',
        },
        paragraph: {
          type: 'spacing',
          value: '{spacing.100}',
        },
      },
      Input: {
        titleBottom: {
          type: 'spacing',
          value: '{spacing.50}',
        },
        'input-input': {
          type: 'spacing',
          value: '{spacing.200}',
        },
        error: {
          top: {
            description: "Padding from the top of the Input's error message if shown",
            type: 'spacing',
            value: '{spacing.25}',
          },
          bottom: {
            description: "Padding from the bottom of the Input's error message if shown",
            type: 'spacing',
            value: '{spacing.25}',
          },
        },
        bottom: {
          type: 'spacing',
          value: '{spacing.100}',
        },
      },
      guideSteps: {
        type: 'spacing',
        value: '{spacing.200}',
      },
      page: {
        titleBottom: {
          type: 'spacing',
          value: '{spacing.150}',
        },
        horizontal: {
          type: 'spacing',
          value: '{spacing.250}',
        },
        vertical: {
          type: 'spacing',
          value: '{spacing.200}',
        },
        section: {
          titleBottom: {
            type: 'spacing',
            value: '{spacing.150}',
          },
        },
        'sub-section': {
          titleBottom: {
            type: 'spacing',
            value: '{spacing.100}',
          },
        },
        'content-buttons': {
          type: 'spacing',
          value: '{spacing.150}',
        },
      },
    },
    menu: {
      'item-item': {
        type: 'spacing',
        value: '{spacing.25}',
      },
      'sec-sec': {
        type: 'spacing',
        value: '{spacing.100}',
      },
    },
  },
});
