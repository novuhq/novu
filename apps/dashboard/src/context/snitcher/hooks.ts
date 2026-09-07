import React from 'react';
import { SnitcherContext } from './snitcher-provider';

export const useSnitcher = () => {
  const result = React.useContext(SnitcherContext);

  if (!result) {
    throw new Error('Context used outside of its Provider!');
  }

  return result;
};
