import { defineSemanticTokens } from '@pandacss/dev';
/** @deprecated */
export const LEGACY_SHADOW_TOKENS = defineSemanticTokens.shadows({
  light: {
    value: '0px 5px 15px rgba(38, 68, 128, 0.05)',
  },
  medium: {
    value: {
      base: '0px 5px 15px rgba(122, 133, 153, 0.25)',
      _dark: '0px 5px 20px rgba(0, 0, 0, 0.2)',
    },
  },
  dark: {
    value: '0px 5px 20px rgba(0, 0, 0, 0.2)',
  },
  color: {
    value: '0px 5px 20px -5px rgba(233, 52, 94, 0.5)',
  },
});
