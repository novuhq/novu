import React from 'react';

import { IStoreContext } from '../shared/interfaces';

export const StoreContext = React.createContext<IStoreContext | null>(null);
