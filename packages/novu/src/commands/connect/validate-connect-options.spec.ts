import { describe, expect, it } from 'vitest';
import { CloudRegionEnum } from '../dev/enums';
import type { ConnectCommandInput } from './resolve-options';
import {
  isCustomCodeReuseMode,
  validateConnectCiInput,
  validateCustomCodeConnectFlags,
} from './validate-connect-options';

function createInput(overrides: Partial<ConnectCommandInput> = {}): ConnectCommandInput {
  return {
    region: CloudRegionEnum.US,
    ...overrides,
  };
}

describe('validateConnectCiInput', () => {
  it('requires a prompt for managed agents', () => {
    expect(validateConnectCiInput(createInput({ channel: 'slack' }), undefined)).toMatch(/requires a prompt/);
  });

  it('allows custom-code without a prompt when agent identifier is set', () => {
    expect(
      validateConnectCiInput(
        createInput({ runtime: 'custom-code', agentIdentifier: 'support-agent', channel: 'slack' }),
        undefined
      )
    ).toBeNull();
  });

  it('requires agent identifier for custom-code in ci mode', () => {
    expect(validateConnectCiInput(createInput({ runtime: 'custom-code', channel: 'slack' }), undefined)).toMatch(
      /requires --agent-identifier/
    );
  });

  it('allows agent identifier reuse without custom-code runtime', () => {
    expect(
      validateConnectCiInput(createInput({ agentIdentifier: 'support-agent', channel: 'email' }), undefined)
    ).toBeNull();
  });
});

describe('isCustomCodeReuseMode', () => {
  it('detects custom-code runtime', () => {
    expect(isCustomCodeReuseMode(createInput({ runtime: 'custom-code' }))).toBe(true);
  });

  it('detects agent identifier reuse', () => {
    expect(isCustomCodeReuseMode(createInput({ agentIdentifier: 'support-agent' }))).toBe(true);
  });
});

describe('validateCustomCodeConnectFlags', () => {
  it('rejects keyless custom-code', () => {
    expect(validateCustomCodeConnectFlags(createInput({ runtime: 'custom-code', keyless: true }))).toMatch(
      /Cannot use --runtime custom-code with --keyless/
    );
  });

  it('rejects managed-only flags', () => {
    expect(
      validateCustomCodeConnectFlags(createInput({ runtime: 'custom-code', anthropicApiKey: 'sk-ant-test' }))
    ).toMatch(/anthropic-api-key/);
  });

  it('returns null for valid custom-code flags', () => {
    expect(
      validateCustomCodeConnectFlags(createInput({ runtime: 'custom-code', agentIdentifier: 'support-agent' }))
    ).toBeNull();
  });
});
