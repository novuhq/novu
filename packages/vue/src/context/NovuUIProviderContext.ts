import { NovuUI } from '@novu/js/ui';
import { inject, Ref } from 'vue';

// Create context and hook
export const NovuUIContextSymbol = Symbol('NovuUI');

// Define types
export type NovuUIContextValue = {
  novuUI: NovuUI;
};

// get the UI Context variable
const useNovuUIContext = () => {
  const context = inject(NovuUIContextSymbol) as Ref<NovuUI> | undefined;
  if (!context?.value) {
    throw new Error('useNovuUIContext must be used within a NovuUIProvider');
  }

  return context as Ref<NovuUI>;
};

const useUnsafeNovuUIContext = (): Ref<NovuUI> | undefined => {
  return inject(NovuUIContextSymbol) as Ref<NovuUI> | undefined;
};

export { useNovuUIContext as useNovuUI, useUnsafeNovuUIContext as useUnsafeNovuUI };
