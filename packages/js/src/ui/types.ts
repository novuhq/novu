import { NovuOptions } from '../novu';
import { Appearance, Localization } from './context';

export type NovuProviderProps = {
  appearance?: Appearance;
  localization?: Localization;
  options: NovuOptions;
};
