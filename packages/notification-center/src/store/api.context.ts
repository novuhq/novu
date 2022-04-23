import React from 'react';
import { ApiService } from '../api/api.service';

export interface IApiContext {
  api: ApiService;
}

export const ApiContext = React.createContext<IApiContext>({
  api: null,
});
