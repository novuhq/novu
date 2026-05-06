import { claudeCodeAdapter } from './claude-code';
import { clineAdapter } from './cline';
import { codexAdapter } from './codex';
import { cursorAdapter } from './cursor';
import type { McpClientAdapter } from './types';
import { vscodeAdapter } from './vscode';
import { windsurfAdapter } from './windsurf';

export const ALL_MCP_CLIENT_ADAPTERS: McpClientAdapter[] = [
  cursorAdapter,
  claudeCodeAdapter,
  vscodeAdapter,
  windsurfAdapter,
  codexAdapter,
  clineAdapter,
];

export type { McpClientAdapter } from './types';
