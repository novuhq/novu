import React from 'react';
import { useRenderer } from '../context/RenderContext';
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
