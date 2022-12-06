import React from 'react';
import type { ApiService } from '@novu/client';

export interface IApiContext {
  api: ApiService;
}

export const ApiContext = React.createContext<IApiContext>({
  api: null,
});
