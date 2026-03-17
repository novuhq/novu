import { Novu } from '@novu/api';
import { builtInTools, createWorkflowTools } from '../tools/index.js';
import type { NovuToolDefinition, NovuToolkitConfig } from './types.js';

export class NovuToolkit {
  private readonly client: Novu;
  private readonly config: NovuToolkitConfig;
  private tools: NovuToolDefinition[] = [];
  private initialized = false;

  constructor(config: NovuToolkitConfig) {
    this.config = config;
    this.client = new Novu({
      secretKey: config.secretKey,
      serverURL: config.backendUrl,
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const workflowTools = await createWorkflowTools(this.client, this.config);

    this.tools = [...builtInTools, ...workflowTools];
    this.initialized = true;
  }

  getTools(): NovuToolDefinition[] {
    if (!this.initialized) {
      throw new Error('NovuToolkit must be initialized before accessing tools. Call initialize() first.');
    }

    return this.tools;
  }

  getClient(): Novu {
    return this.client;
  }

  getConfig(): NovuToolkitConfig {
    return this.config;
  }
}
