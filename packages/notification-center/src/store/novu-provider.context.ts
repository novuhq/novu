import React from 'react';
import { INovuProviderContext } from '../shared/interfaces';

export const NovuContext = React.createContext<INovuProviderContext | null>(null);
