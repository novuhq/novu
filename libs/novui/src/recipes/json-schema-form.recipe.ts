import { defineSlotRecipe } from '@pandacss/dev';

export const JSON_SCHEMA_FORM_SECTION_RECIPE = defineSlotRecipe({
  className: 'jsonSchemaFormSection',
  jsx: ['JsonSchemaFormSection'],
  slots: ['section', 'sectionTitle'],
  base: {
    section: {
      // default color palette
      colorPalette: 'mode.cloud',

      ml: '75',
      pl: '75',
      py: '50',
      '&:first-of-type': { paddingTop: '0' },
      '&:last-of-type': { paddingBottom: '0' },
    },
    sectionTitle: {},

    // depth of 0 or even
  },
  variants: {
    depth: {
      even: {
        section: {
          backgroundColor: 'surface.popover',
        },
      },
      odd: {
        section: {
          backgroundColor: 'surface.panel',
        },
      },
    },
  },
});
