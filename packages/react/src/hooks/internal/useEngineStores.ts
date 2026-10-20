import { type ResolveStyleArgs, resolveStyle } from '@novu/js/ui-core';
import { useCallback } from 'react';
import { useNovuUI } from '../../context/NovuUIContext';
import { useEngineAccessor } from './useEngineAccessor';

export const useEngineStores = () => useNovuUI().novuUI.stores;

/** The React twin of the engine's `useStyle`: same appearance keys, same classes, same host overrides. */
export const useStyle = () => {
  const { appearance } = useEngineStores();
  const elements = useEngineAccessor(appearance.elements);
  const appearanceKeyToCssInJsClass = useEngineAccessor(appearance.appearanceKeyToCssInJsClass);

  return useCallback(
    (args: ResolveStyleArgs) => resolveStyle(args, { elements, appearanceKeyToCssInJsClass }),
    [elements, appearanceKeyToCssInJsClass]
  );
};

export const useLocalization = () => {
  const { localization } = useEngineStores();
  // subscribe to the dictionary so any string change re-renders, even when the locale stays the same
  useEngineAccessor(localization.dictionary);
  const locale = useEngineAccessor(localization.locale);

  return { t: localization.t, locale };
};
