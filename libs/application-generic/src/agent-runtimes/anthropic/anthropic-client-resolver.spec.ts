import { AgentRuntimeProviderIdEnum } from '@novu/shared';

import { AnthropicClientResolver } from './anthropic-client-resolver';
import * as AnthropicAwsClientModule from './anthropic-aws-client';
import * as AnthropicCloudClientModule from './anthropic-cloud-client';

describe('AnthropicClientResolver', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a cloud client from the api key', async () => {
    const cloudClient = { messages: {} };
    jest.spyOn(AnthropicCloudClientModule, 'createAnthropicCloudClient').mockReturnValue(cloudClient as never);

    const resolver = new AnthropicClientResolver(AgentRuntimeProviderIdEnum.Anthropic, 'sk-ant-test');
    const client = await resolver.getClient();

    expect(client).toBe(cloudClient);
    expect(AnthropicCloudClientModule.createAnthropicCloudClient).toHaveBeenCalledWith('sk-ant-test');
  });

  it('creates an AWS client from pre-resolved credentials', async () => {
    const awsClient = { messages: {} };
    jest.spyOn(AnthropicAwsClientModule, 'createAnthropicAwsClient').mockResolvedValue(awsClient as never);

    const resolver = new AnthropicClientResolver(AgentRuntimeProviderIdEnum.AnthropicAws, undefined, {
      region: 'us-east-1',
      workspaceId: 'wrkspc_test',
      apiKey: 'aws-key',
    });

    const client = await resolver.getClient();

    expect(client).toBe(awsClient);
    expect(AnthropicAwsClientModule.createAnthropicAwsClient).toHaveBeenCalledWith({
      region: 'us-east-1',
      workspaceId: 'wrkspc_test',
      apiKey: 'aws-key',
    });
  });

  it('overrides AWS credentials from validate input', async () => {
    const awsClient = { messages: {} };
    jest.spyOn(AnthropicAwsClientModule, 'createAnthropicAwsClient').mockResolvedValue(awsClient as never);

    const resolver = new AnthropicClientResolver(AgentRuntimeProviderIdEnum.AnthropicAws, undefined, {
      region: 'us-east-1',
      workspaceId: 'wrkspc_test',
      apiKey: 'aws-key',
    });

    await resolver.getClient({
      region: 'eu-west-1',
      externalWorkspaceId: 'wrkspc_override',
      apiKey: 'override-key',
    });

    expect(AnthropicAwsClientModule.createAnthropicAwsClient).toHaveBeenCalledWith({
      region: 'eu-west-1',
      workspaceId: 'wrkspc_override',
      apiKey: 'override-key',
    });
  });
});
