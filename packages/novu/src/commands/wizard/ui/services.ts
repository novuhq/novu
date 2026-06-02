import type { McpInstaller } from '../mcp/installer';
import type { WizardStore } from './store';

/**
 * Service container injected into screen components via props by
 * `screen-registry.tsx`. The skill rule says: "services injected, never
 * imported in screen files" — that's why this exists.
 */
export type WizardServices = {
  store: WizardStore;
  mcpInstaller: McpInstaller;
  /** Cancels and tears down the wizard. Wired to Ctrl+C / outro press. */
  exit: (code?: number) => void;
};
