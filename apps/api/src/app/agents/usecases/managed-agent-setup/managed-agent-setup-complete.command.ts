import { BaseCommand } from '@novu/application-generic';

import type { McpOAuthState } from '../generate-mcp-oauth-url/mcp-oauth-state';

export class ManagedAgentSetupCompleteCommand extends BaseCommand {
  stateData: McpOAuthState;
}
