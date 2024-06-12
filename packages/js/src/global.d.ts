import { Novu } from './novu';
import { UI } from './ui';

declare global {
  interface Window {
    Novu: typeof Novu;
    UI: typeof UI;
  }
}
