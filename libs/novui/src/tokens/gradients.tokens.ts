import { defineSemanticTokens } from '@pandacss/dev';

export const GRADIENT_TOKENS = defineSemanticTokens.gradients({
  vertical: {
    value: `linear-gradient(0deg, {colors.legacy.gradientStart} 0%, {colors.legacy.gradientEnd} 100%)`,
    type: 'gradient',
  },
  horizontal: {
    value: `linear-gradient(99deg, {colors.legacy.gradientEnd} 0%, {colors.legacy.gradientStart} 100%)`,
    type: 'gradient',
  },
  disabled: {
    value: {
      base: 'linear-gradient(90deg, #F5C4D8 0%, #FFCBC1 100%)',
      _dark: 'linear-gradient(90deg, #58203E 0%, #612E29 100%)',
    },
    type: 'gradient',
  },
});

export const LEGACY_GRADIENT_TOKENS = defineSemanticTokens.gradients({
  darkDisabled: { value: 'linear-gradient(90deg, #58203E 0%, #612E29 100%)', type: 'gradient' },
});
