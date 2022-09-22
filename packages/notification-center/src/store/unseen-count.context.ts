import React from 'react';

export const UnseenCountContext = React.createContext({
  unseenCount: 0,
  setUnseenCount: (count: number) => {},
});
