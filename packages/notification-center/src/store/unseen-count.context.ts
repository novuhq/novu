import React from 'react';
import { IUnseenCount } from '../index';

export const UnseenCountContext = React.createContext({
  unseenCount: null,
  setUnseenCount: (count: IUnseenCount) => {},
});
