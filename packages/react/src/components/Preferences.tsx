import React from 'react';
import { Mounter } from './Mounter';
import { useNovuUI } from '../context/NovuUIContext';

export const Preferences = () => {
  const { novuUI } = useNovuUI();

  const mount = React.useCallback((element: HTMLElement) => {
    return novuUI.mountComponent({
      name: 'Preferences',
      element,
    });
  }, []);

  return <Mounter mount={mount} />;
};
