import type { Novu } from './novu';

export {};

declare global {
  const NOVU_API_VERSION: string;
  const PACKAGE_NAME: string;
  const PACKAGE_VERSION: string;
  interface Window {
    Novu: typeof Novu;
  }
}
