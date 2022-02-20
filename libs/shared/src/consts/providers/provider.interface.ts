import { ProviderEnum } from './provider.enum';

export interface IProvider {
  id: string;
  displayName: string;
  type: ProviderEnum;
}
