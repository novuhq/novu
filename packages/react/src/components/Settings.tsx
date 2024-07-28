import React from 'react';
import { useRenderer } from '../context/RenderContext';
import { Mounter } from './Mounter';

const SettingsDefault = () => {
  const { novuUI } = useRenderer();

  const mount = React.useCallback((element: HTMLElement) => {
    return novuUI.mountComponent({
      name: 'Settings',
      element,
    });
  }, []);

  return <Mounter mount={mount} />;
};

export const Settings = () => {
  return <SettingsDefault />;
};
