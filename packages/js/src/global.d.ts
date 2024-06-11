import { Novu } from './Novu';

declare global {
  interface Window {
    Novu: typeof Novu;
  }
}
