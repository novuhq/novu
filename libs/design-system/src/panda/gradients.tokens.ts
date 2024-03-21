import { defineSemanticTokens } from '@pandacss/dev';

/**
 * @deprecated
 */
export const LEGACY_GRADIENT_TOKENS = defineSemanticTokens.gradients({
  vertical: { value: `linear-gradient(0deg, {colors.legacy.gradientStart} 0%, {colors.legacy.gradientEnd} 100%)` },
  horizontal: { value: `linear-gradient(99deg, {colors.legacy.gradientEnd} 0%, {colors.legacy.gradientStart} 100%)` },
  disabled: { value: 'linear-gradient(90deg, #F5C4D8 0%, #FFCBC1 100%)' },
  darkDisabled: { value: 'linear-gradient(90deg, #58203E 0%, #612E29 100%)' },
});
