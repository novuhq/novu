import { describe, expect, it } from 'vitest';

import { AgentRuntimeProviderIdEnum } from '../types/providers';
import {
  buildManagedIntegrationCredentials,
  buildVerifyFingerprint,
  hasCompleteManagedCredentials,
} from './managed-integration-credentials';

describe('buildManagedIntegrationCredentials', () => {
  it('builds Anthropic cloud credentials with optional workspace', () => {
    expect(
      buildManagedIntegrationCredentials(AgentRuntimeProviderIdEnum.Anthropic, {
        apiKey: ' sk-ant ',
        externalWorkspaceId: ' wrkspc_1 ',
      })
    ).toEqual({
      apiKey: 'sk-ant',
      externalWorkspaceId: 'wrkspc_1',
    });
  });

  it('omits empty workspace for Anthropic cloud', () => {
    expect(
      buildManagedIntegrationCredentials(AgentRuntimeProviderIdEnum.Anthropic, {
        apiKey: 'sk-ant',
        externalWorkspaceId: '   ',
      })
    ).toEqual({ apiKey: 'sk-ant' });
  });

  it('builds AWS credentials with required fields', () => {
    expect(
      buildManagedIntegrationCredentials(AgentRuntimeProviderIdEnum.AnthropicAws, {
        apiKey: ' aws-key ',
        region: ' us-east-1 ',
        externalWorkspaceId: ' wrkspc_aws ',
      })
    ).toEqual({
      region: 'us-east-1',
      externalWorkspaceId: 'wrkspc_aws',
      apiKey: 'aws-key',
    });
  });
});

describe('buildVerifyFingerprint', () => {
  it('uses api key only for Anthropic cloud', () => {
    expect(
      buildVerifyFingerprint(AgentRuntimeProviderIdEnum.Anthropic, {
        apiKey: ' sk-ant ',
      })
    ).toBe('sk-ant');
  });

  it('includes region and workspace for AWS', () => {
    expect(
      buildVerifyFingerprint(AgentRuntimeProviderIdEnum.AnthropicAws, {
        apiKey: 'key',
        region: 'us-west-2',
        externalWorkspaceId: 'wrkspc_1',
      })
    ).toBe('us-west-2:wrkspc_1:key');
  });

  it('uses empty segments for missing AWS optional fields', () => {
    expect(
      buildVerifyFingerprint(AgentRuntimeProviderIdEnum.AnthropicAws, {
        apiKey: 'key',
      })
    ).toBe(':key');
  });
});

describe('hasCompleteManagedCredentials', () => {
  it('requires api key for Anthropic cloud', () => {
    expect(
      hasCompleteManagedCredentials(AgentRuntimeProviderIdEnum.Anthropic, {
        apiKey: '',
      })
    ).toBe(false);

    expect(
      hasCompleteManagedCredentials(AgentRuntimeProviderIdEnum.Anthropic, {
        apiKey: 'sk-ant',
      })
    ).toBe(true);
  });

  it('requires region, workspace, and api key for AWS', () => {
    const fields = {
      apiKey: 'aws-key',
      region: 'us-east-1',
      externalWorkspaceId: 'wrkspc_1',
    };

    expect(hasCompleteManagedCredentials(AgentRuntimeProviderIdEnum.AnthropicAws, fields)).toBe(true);
    expect(
      hasCompleteManagedCredentials(AgentRuntimeProviderIdEnum.AnthropicAws, {
        ...fields,
        region: '',
      })
    ).toBe(false);
  });
});
