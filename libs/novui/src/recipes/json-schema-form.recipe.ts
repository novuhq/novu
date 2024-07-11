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

      '& .form-group': {
        flex: 'auto',
      },

      '& .form-group:last-of-type': {
        marginBottom: '0',
      },

      // this is quite ugly, but it adds a gap between form-group wrappers
      '& div:has(div.form-group) + div:has(div.form-group)': {
        marginTop: '150',
      },

      // adds a gap between "sections" (AKA array and object fields)
      '& div:has(div.nv-jsonSchemaFormSection__sectionRoot) + div:has(div.nv-jsonSchemaFormSection__sectionRoot)': {
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

export const JSON_SCHEMA_FORM_ARRAY_TOOLBAR_RECIPE = defineSlotRecipe({
  className: 'jsonSchemaFormArrayToolbar',
  jsx: ['JsonSchemaFormArrayToolbar'],
  slots: ['toolbar', 'toolbarWrapper'],
  base: {
    toolbar: {
      gap: '25',
      '& button': {
        p: '0 !important',
      },
      position: 'absolute',
      top: '0',
      right: '0',
    },
    toolbarWrapper: {
      position: 'relative',
    },
  },
  variants: {
    itemType: {
      // primitive
      string: {},
      number: {},
      boolean: {},
      integer: {},
      // sections
      object: { toolbar: { h: '300', right: '75' }, toolbarWrapper: {} },
      array: { toolbar: { h: '300', right: '75' }, toolbarWrapper: {} },
      null: {},
    },
  },
  staticCss: [{ itemType: ['*'] }],
});
