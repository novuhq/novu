import React from 'react';
import { useRenderer } from '../context/RendererContext';
import { Mounter } from './Mounter';

export const Preferences = () => {
  const { novuUI } = useRenderer();

  const mount = React.useCallback((element: HTMLElement) => {
    return novuUI.mountComponent({
      name: 'Preferences',
      element,
    });
  }, []);

  return <Mounter mount={mount} />;
};
