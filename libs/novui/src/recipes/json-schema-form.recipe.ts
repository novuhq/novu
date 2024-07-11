import { defineSlotRecipe } from '@pandacss/dev';

export const JSON_SCHEMA_FORM_SECTION_RECIPE = defineSlotRecipe({
  className: 'jsonSchemaFormSection',
  jsx: ['JsonSchemaFormSection'],
  slots: ['sectionRoot', 'sectionTitle'],
  base: {
    sectionRoot: {
      // default color palette
      colorPalette: 'mode.cloud',

      p: '75',
      borderRadius: '150',
      border: 'solid',
      borderColor: 'input.border',
      // '&:last-of-type': { paddingBottom: '0' },

      '& .form-group': {
        marginBottom: '150',
      },

      '& .form-group:last-of-type': {
        marginBottom: '0',
      },

      // this is quite ugly, but it adds a gap between form-group wrappers
      '& div:has(div.form-group) + div:has(div.form-group)': {
        marginTop: '75',
      },
    },
    sectionTitle: {
      textStyle: 'title.subsection',
      color: 'typography.text.secondary',
    },
  },
  variants: {
    depth: {
      even: {
        sectionRoot: {
          bg: 'surface.panelSection',
        },
      },
      odd: {
        sectionRoot: {
          bg: 'surface.panelSubsection',
        },
      },
    },
  },
  defaultVariants: {
    depth: 'even',
  },
  staticCss: [{ depth: ['*'] }],
});
