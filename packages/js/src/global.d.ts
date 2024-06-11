import { Novu } from './novu';

declare global {
  interface Window {
    Novu: typeof Novu;
  }
}
