import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import {
  BullMqService,
  decryptEnvironmentVariableValue,
  GetDecryptedSecretKey,
  GetDecryptedSecretKeyCommand,
  getClaudeManagedAgentWorkerOptions,
  IClaudeManagedAgentDataDto,
  WorkerBaseService,
  WorkerOptions,
  WorkflowInMemoryProviderService,
} from '@novu/application-generic';
import { EnvironmentVariableRepository } from '@novu/dal';
import { JobTopicNameEnum } from '@novu/shared';

const LOG_CONTEXT = 'ClaudeManagedAgentWorker';
const ANTHROPIC_API_KEY_ENV_VAR = 'NOVU_AGENT_ANTHROPIC_API_KEY';

@Injectable()
export class ClaudeManagedAgentWorker extends WorkerBaseService {
  constructor(
    private readonly environmentVariableRepository: EnvironmentVariableRepository,
    private readonly getDecryptedSecretKey: GetDecryptedSecretKey,
    public workflowInMemoryProviderService: WorkflowInMemoryProviderService
  ) {
    super(JobTopicNameEnum.CLAUDE_MANAGED_AGENT, new BullMqService(workflowInMemoryProviderService));

    this.initWorker(this.getWorkerProcessor(), this.getWorkerOptions());
  }

  private getWorkerOptions(): WorkerOptions {
    return getClaudeManagedAgentWorkerOptions();
  }

  private getWorkerProcessor() {
    return async ({ data }: { data: IClaudeManagedAgentDataDto }) => {
      const apiKey = await this.getAnthropicApiKey(data.organizationId, data.environmentId);
      const client = new Anthropic({ apiKey });
      const stream = await client.beta.sessions.events.stream(data.sessionId);
      const chunks: string[] = [];

      for await (const event of stream) {
        if (event.type === 'agent.message') {
          for (const block of event.content) {
            const text = 'text' in block ? block.text : undefined;
            if (text) {
              chunks.push(text);
            }
          }
        }

        if (event.type === 'agent.tool_use') {
          Logger.verbose(
            { name: event.name, sessionId: data.sessionId },
            'Claude managed agent used tool',
            LOG_CONTEXT
          );
        }

        if (event.type === 'session.status_idle') {
          break;
        }
      }

      const markdown = chunks.join('').trim();
      if (!markdown) {
        Logger.warn(
          { sessionId: data.sessionId },
          'Claude managed agent completed without a text response',
          LOG_CONTEXT
        );

        return;
      }

      await this.postReply(data, markdown);
    };
  }

  private async getAnthropicApiKey(organizationId: string, environmentId: string): Promise<string> {
    const variable = await this.environmentVariableRepository.findOne(
      { _organizationId: organizationId, key: ANTHROPIC_API_KEY_ENV_VAR },
      ['values']
    );
    const value = variable?.values?.find((item) => item._environmentId === environmentId)?.value;

    if (!value) {
      throw new Error('Anthropic API key is not configured for this environment.');
    }

    return decryptEnvironmentVariableValue(value);
  }

  private async postReply(data: IClaudeManagedAgentDataDto, markdown: string): Promise<void> {
    const secretKey = await this.getDecryptedSecretKey.execute(
      GetDecryptedSecretKeyCommand.create({
        environmentId: data.environmentId,
        organizationId: data.organizationId,
      })
    );
    const apiRootUrl = process.env.API_ROOT_URL || 'http://localhost:3000';
    const url = `${apiRootUrl}/v1/agents/${encodeURIComponent(data.agentIdentifier)}/reply`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `ApiKey ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId: data.conversationId,
        integrationIdentifier: data.integrationIdentifier,
        reply: { markdown },
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude managed agent reply failed: ${response.status} ${response.statusText}`);
    }
  }
}
