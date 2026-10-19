import { describe, expect, it } from 'vitest';
import {
  installDepsPrompt,
  installingDepsMessage,
  reconcilePlanTitle,
  requirementsFileEnvName,
} from './bridge-reconcile-variant';

describe('bridge-reconcile-variant', () => {
  it('uses chat-sdk copy by default labels', () => {
    expect(reconcilePlanTitle('chat-sdk')).toBe('Chat SDK project setup');
    expect(installDepsPrompt('chat-sdk')).toBe('Install Chat SDK packages?');
    expect(installingDepsMessage('chat-sdk')).toBe('Installing Chat SDK packages…');
    expect(requirementsFileEnvName('chat-sdk')).toBe('NOVU_CONNECT_CHAT_SDK_REQUIREMENTS_FILE');
  });

  it('uses ai-sdk copy', () => {
    expect(reconcilePlanTitle('ai-sdk')).toBe('AI SDK project setup');
    expect(installDepsPrompt('ai-sdk')).toBe('Install Novu framework?');
    expect(installingDepsMessage('ai-sdk')).toBe('Installing Novu framework…');
    expect(requirementsFileEnvName('ai-sdk')).toBe('NOVU_CONNECT_AI_SDK_REQUIREMENTS_FILE');
  });
});
