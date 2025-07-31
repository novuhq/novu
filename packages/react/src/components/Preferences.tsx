import React from 'react';
import { useNovuUI } from '../context/NovuUIContext';
import { Mounter } from './Mounter';

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
