/* eslint-disable */

/**
 * The @novu/notification-center package overrides the Vue JSX namespace
 * with the one provided by the React JSX namespace. This is a workaround to fix that.
 * During the development types will be any, but after the build they will be correct.
 * GH issue: https://github.com/vuejs/core/issues/1033
 */
declare module '@novu/notification-center' {
  export const colors: any;
  export const getStyleByPath: any;
  export const getDefaultTheme: any;
  export const getDefaultBellColors: any;
  export const NotificationCenterContentWebComponent: any;
  export interface NotificationCenterContentComponentProps {
    [key: string]: any;
  }
}
