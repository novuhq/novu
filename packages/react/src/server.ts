export * from './utils/types';
/**
 * Exporting all components from the components folder
 * as empty functions to fix build errors in SSR
 * This will be replaced with actual components
 * when we implement the SSR components in @novu/js/ui
 */
export function Inbox() {}
export function InboxContent() {}
export function Notifications() {}
export function Preferences() {}
export function Bell() {}

// Hooks
export { NovuProvider } from './index';
export * from './hooks';
