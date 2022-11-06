import { IOrganizationEntity, IMessage } from '@novu/shared';
import { ApiService } from '@novu/client';

import { IStore, Session } from '../../types';
import { createContext } from '../context/createContext';

export interface INovuContext {
  session: {
    isLoading?: boolean;
    data?: Session;
  };
  organization: {
    isLoading?: boolean;
    data?: IOrganizationEntity;
  };
  notifications: {
    isLoading?: boolean;
    data?: IMessage[];
  };
  backendUrl: string;
  socketUrl: string;
  api: ApiService;
  stores?: IStore[];
  activeStore: IStore;
  setActiveStore: (storeId: string) => void;
}

export const initialNovuContext: INovuContext = {
  session: {},
  organization: {},
  notifications: {},
  backendUrl: '',
  socketUrl: '',
  api: null,
  stores: [],
  activeStore: null,
  setActiveStore: null,
};

export const NovuContext = createContext<INovuContext>(initialNovuContext, 'novu-context');
