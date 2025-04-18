import { NovuUI } from '@novu/js/ui';
import { inject, Ref } from 'vue';

// Create context and hook
export const NovuUIKey = Symbol('NovuUI');

// Define types
export type NovuUIContextValue = {
  novuUI: NovuUI;
};

// get the UI Context variable
const useNovuUIContext = () => {
  const context = inject(NovuUIKey, undefined) as NovuUI | undefined;
  if (!context) throw new Error('useNovuUIContext must be used within a NovuUIProvider');

  return context as NovuUI;
};

const useUnsafeNovuUIContext = (): NovuUI | undefined => {
  return inject(NovuUIKey, undefined) as NovuUI | undefined;
};

export { useNovuUIContext as useNovuUI, useUnsafeNovuUIContext as useUnsafeNovuUI };
