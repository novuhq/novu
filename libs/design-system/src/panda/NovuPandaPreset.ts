import { definePreset } from '@pandacss/dev';

/**
 * This defines all Novu tokens into a single preset to be used in our various apps (and design-system).
 * https://panda-css.com/docs/customization/presets
 *
 * Future-looking note: this preset and any other associated files may be a good candidate for moving into
 * a standalone package depending on how we interface with Supernova (our design token tool), and if we want
 * the definitions to be separate from token definitions.
 */
export const NovuPandaPreset = definePreset({
  theme: {
    tokens: {
      fontSizes: {
        '075': {
          value: '0.75rem',
          type: 'fontSize',
        },
        '100': {
          value: '1rem',
          type: 'fontSize',
        },
        '125': {
          value: '1.25rem',
          type: 'fontSize',
        },
      },
    },
  },
});
