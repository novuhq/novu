/* eslint-disable vars-on-top */
/* eslint-disable no-var */
import { Novu } from './novu';

declare global {
  var PACKAGE_NAME: string;
  var PACKAGE_VERSION: string;
  interface Window {
    Novu: typeof Novu;
  }
}
