import React from 'react';

export const UnseenCountContext = React.createContext({
  unseenCount: null,
  setUnseenCount: (count: number) => {},
});
