import { Novu } from './novu';
import { InboxUI } from './ui';

declare global {
  interface Window {
    Novu: typeof Novu;
    UI: typeof InboxUI;
  }
}
