import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export type LlmProvider = 'openai' | 'anthropic';

export type LlmConfig = {
  provider: LlmProvider;
  apiKey: string;
  model: string;
  maxOutputTokens: number;
  temperature: number;
  maxRetries: number;
  isReasoning: boolean;
};

export type GenerateObjectInput<T extends z.ZodType> = {
  systemPrompt: string;
  userPrompt: string;
  schema: T;
  maxOutputTokens?: number;
  temperature?: number;
};

type BaseChatModel = ChatAnthropic | ChatOpenAI;

@Injectable()
export class LlmService {
  private config: LlmConfig;
  private model: BaseChatModel;

  constructor(private readonly logger: PinoLogger) {
    const provider = (process.env.AI_LLM_PROVIDER as LlmProvider) || 'openai';
    const apiKey = process.env.AI_LLM_API_KEY;

    if (!apiKey) {
      this.logger.warn('LLM service AI_LLM_API_KEY not configured.');
    }

    const modelId = process.env.AI_LLM_MODEL || this.getDefaultModel(provider);

    this.config = {
      provider,
      apiKey,
      model: modelId,
      maxOutputTokens: parseInt(process.env.AI_LLM_MAX_OUTPUT_TOKENS || '4096', 10),
      temperature: parseFloat(process.env.AI_LLM_TEMPERATURE || '0'),
      maxRetries: parseInt(process.env.AI_LLM_MAX_RETRIES || '3', 10),
      isReasoning: this.isReasoningModel(modelId),
    };

    this.model = this.createModel(this.config);
    this.logger.info(`LLM service initialized with provider: ${provider}`);
  }

  private isReasoningModel(modelId: string): boolean {
    return (
      modelId.startsWith('o1') || modelId.startsWith('o3') || modelId.startsWith('o4') || modelId.startsWith('gpt-5')
    );
  }

  private createModel(config: LlmConfig): BaseChatModel {
    const isReasoning = this.isReasoningModel(config.model);

    if (config.provider === 'anthropic') {
      return new ChatAnthropic({
        apiKey: config.apiKey,
        model: config.model,
        maxTokens: config?.maxOutputTokens ?? 4096,
        temperature: config?.temperature,
        maxRetries: config?.maxRetries ?? 3,
      });
    }

    return new ChatOpenAI({
      apiKey: config.apiKey,
      model: config.model,
      maxTokens: config?.maxOutputTokens ?? 4096,
      ...(!isReasoning ? { temperature: config?.temperature } : {}),
      maxRetries: config?.maxRetries ?? 3,
      ...(isReasoning ? { reasoning: { effort: 'medium', summary: 'concise' } } : {}),
    });
  }

  private getDefaultModel(provider: LlmProvider): string {
    if (provider === 'anthropic') {
      return 'claude-sonnet-4-20250514';
    }

    return 'gpt-4o';
  }

  getModel(modelId?: string, provider?: LlmProvider): BaseChatModel {
    if (modelId) {
      const modelToUse = modelId ?? this.config.model;
      return this.createModel({
        ...this.config,
        model: modelToUse,
        provider: provider ?? this.config.provider,
        isReasoning: this.isReasoningModel(modelToUse),
      });
    }

    return this.model;
  }

  getConfig(): LlmConfig {
    return this.config;
  }

  async generateObject<T extends z.ZodType>(
    input: GenerateObjectInput<T>,
    options: { modelId?: string; provider?: LlmProvider } = {}
  ): Promise<z.infer<T>> {
    const messages = [new SystemMessage(input.systemPrompt), new HumanMessage(input.userPrompt)];

    let model = options.modelId ? this.getModel(options.modelId, options.provider) : this.model;

    if (input.maxOutputTokens !== undefined || input.temperature !== undefined) {
      model = this.createModel({
        ...this.config,
        maxOutputTokens: input.maxOutputTokens ?? this.config.maxOutputTokens,
        temperature: input.temperature ?? this.config.temperature,
      });
    }

    const structuredModel = model.withStructuredOutput(zodToJsonSchema(input.schema), {
      name: 'structured_output',
    });

    return structuredModel.invoke(messages);
  }
}
