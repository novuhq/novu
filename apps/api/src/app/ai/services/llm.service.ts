import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { BadRequestException, Injectable, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import {
  extractReasoningMiddleware,
  generateObject,
  generateText,
  LanguageModel,
  ModelMessage,
  StreamTextResult,
  stepCountIs,
  streamText,
  ToolSet,
  wrapLanguageModel,
} from 'ai';
import { z } from 'zod';

export type LlmProvider = 'openai' | 'anthropic';

export type LlmConfig = {
  provider: LlmProvider;
  apiKey: string;
  model: string;
  maxOutputTokens: number;
  temperature?: number;
  maxRetries: number;
};

export type GenerateTextInput = {
  systemPrompt: string;
  userPrompt: string;
  maxOutputTokens?: number;
  temperature?: number;
};

export type GenerateObjectInput<T extends z.ZodType> = {
  systemPrompt: string;
  userPrompt: string;
  schema: T;
  maxOutputTokens?: number;
  temperature?: number;
};

export type ChatStreamInput = {
  systemPrompt: string;
  message: string;
  messageHistory: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  maxOutputTokens?: number;
  temperature?: number;
};

export type AgentMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type AgentStreamInput<TTools extends ToolSet> = {
  systemPrompt: string;
  messages: ModelMessage[];
  tools: TTools;
  stopAfterSteps?: number;
  onStepFinish?: Parameters<typeof streamText<TTools, never>>[0]['onStepFinish'];
  onError?: Parameters<typeof streamText<TTools, never>>[0]['onError'];
  maxOutputTokens?: number;
  providerOptions?: Parameters<typeof streamText<TTools, never>>[0]['providerOptions'];
  experimental_transform?: Parameters<typeof streamText<TTools, never>>[0]['experimental_transform'];
};

@Injectable()
export class LlmService implements OnModuleInit {
  private config: LlmConfig | null = null;
  private isConfigured = false;
  private model: LanguageModel | null = null;
  private maxSchemaValidationRetries = 3;
  private requestTimeoutMs = 30000;

  constructor(private readonly logger: PinoLogger) {}

  onModuleInit() {
    this.initializeConfig();
  }

  private initializeConfig(): void {
    const provider = (process.env.AI_LLM_PROVIDER as LlmProvider) || 'openai';
    const apiKey = process.env.AI_LLM_API_KEY;

    if (!apiKey) {
      this.logger.warn('LLM service AI_LLM_API_KEY not configured.');
      this.isConfigured = false;

      return;
    }

    const modelId = process.env.AI_LLM_MODEL || this.getDefaultModel(provider);
    const isReasoning = this.isReasoningModel(modelId);

    this.config = {
      provider,
      apiKey,
      model: modelId,
      maxOutputTokens: parseInt(process.env.AI_LLM_MAX_OUTPUT_TOKENS || '4096', 10),
      ...(isReasoning ? {} : { temperature: parseFloat(process.env.AI_LLM_TEMPERATURE || '0.7') }),
      maxRetries: parseInt(process.env.AI_LLM_MAX_RETRIES || '3', 10),
    };
    this.maxSchemaValidationRetries = parseInt(process.env.AI_LLM_SCHEMA_VALIDATION_RETRIES || '3', 10);
    this.requestTimeoutMs = parseInt(process.env.AI_LLM_REQUEST_TIMEOUT_MS || '30000', 10);

    this.model = this.createModel(provider, apiKey, this.config.model);
    this.isConfigured = true;
    this.logger.info(`LLM service initialized with provider: ${provider}`);
  }

  private isReasoningModel(modelId: string): boolean {
    return (
      modelId.startsWith('o1') || modelId.startsWith('o3') || modelId.startsWith('o4') || modelId.startsWith('gpt-5')
    );
  }

  private createModel(provider: LlmProvider, apiKey: string, modelId: string): LanguageModel {
    if (provider === 'anthropic') {
      const anthropic = createAnthropic({ apiKey });
      const middleware = extractReasoningMiddleware({ tagName: 'thinking' });

      return wrapLanguageModel({ model: anthropic(modelId), middleware: [middleware] });
    }

    const openai = createOpenAI({ apiKey });

    if (this.isReasoningModel(modelId)) {
      return openai.responses(modelId);
    }

    return openai(modelId);
  }

  private getDefaultModel(provider: LlmProvider): string {
    if (provider === 'anthropic') {
      return 'claude-sonnet-4-20250514';
    }

    return 'gpt-4o';
  }

  isAvailable(): boolean {
    return this.isConfigured;
  }

  getModel(): LanguageModel | null {
    return this.model;
  }

  getConfig(): LlmConfig | null {
    return this.config;
  }

  private handleAIError(error: unknown): never {
    const errorObj = error as {
      name?: string;
      message?: string;
      statusCode?: number;
      url?: string;
      responseBody?: string;
      text?: string;
    };
    const errorContext = {
      errorName: errorObj?.name,
      errorMessage: errorObj?.message,
      statusCode: errorObj?.statusCode,
    };

    if (errorObj?.name === 'AbortError' || errorObj?.message?.includes('aborted')) {
      this.logger.error('AI Provider request timed out', errorContext);
      throw new ServiceUnavailableException(
        'Content generation request timed out. Please try again with a simpler prompt.'
      );
    }

    if (errorObj?.statusCode) {
      this.logger.error('AI Provider API call failed', {
        ...errorContext,
        statusCode: errorObj.statusCode,
        url: errorObj.url,
        responseBody: errorObj.responseBody,
      });

      if (errorObj.statusCode === 429) {
        throw new ServiceUnavailableException('AI Provider is currently rate limited. Please try again in a moment.');
      }

      if (errorObj.statusCode === 401 || errorObj.statusCode === 403) {
        this.logger.error('AI authentication failed - check API key configuration');
        throw new ServiceUnavailableException('AI Provider configuration error. Please contact support.');
      }

      if (errorObj.statusCode >= 500) {
        throw new ServiceUnavailableException('AI Provider is temporarily unavailable. Please try again later.');
      }

      throw new BadRequestException('Invalid request to AI Provider. Please check your input and try again.');
    }

    if (errorObj?.name === 'AI_NoObjectGeneratedError') {
      this.logger.error('AI Provider failed to generate valid content after retries', {
        ...errorContext,
        responseText: errorObj?.text?.substring(0, 500),
      });
      throw new BadRequestException('Failed to generate valid content. Please try rephrasing your prompt.');
    }

    this.logger.error(`Unexpected error during AI Provider content generation`, errorContext);
    throw new ServiceUnavailableException('Failed to generate content. Please try again.');
  }

  private async callWithRetries<T>(fn: (signal: AbortSignal) => Promise<T>, retryCount = 0): Promise<T> {
    if (!this.isConfigured || !this.model || !this.config) {
      throw new Error('AI Provider not configured. Please set AI_LLM_API_KEY environment variable.');
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), this.requestTimeoutMs);

    try {
      const result = await fn(abortController.signal);
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);

      if (retryCount < this.maxSchemaValidationRetries && error?.name === 'AI_NoObjectGeneratedError') {
        this.logger.warn(
          `Schema validation failed, retrying... (attempt ${retryCount + 1}/${this.maxSchemaValidationRetries})`,
          {
            errorName: error.name,
            errorMessage: error.message,
            responseText: error.text?.substring(0, 500),
          }
        );

        return await this.callWithRetries(fn, retryCount + 1);
      }

      this.handleAIError(error);
    }
  }

  async generateText(input: GenerateTextInput): Promise<string> {
    if (!this.isConfigured || !this.model || !this.config) {
      throw new Error('LLM service not configured. Please set AI_LLM_API_KEY environment variable.');
    }

    const args = {
      model: this.model,
      system: input.systemPrompt,
      prompt: input.userPrompt,
      maxOutputTokens: input.maxOutputTokens ?? this.config.maxOutputTokens,
      temperature: input.temperature ?? this.config.temperature,
      maxRetries: this.config.maxRetries,
    };

    const { text } = await this.callWithRetries(async (signal) => generateText({ ...args, abortSignal: signal }));

    return text;
  }

  async generateObject<T extends z.ZodType>(input: GenerateObjectInput<T>): Promise<z.infer<T>> {
    if (!this.isConfigured || !this.model || !this.config) {
      throw new Error('LLM service not configured. Please set AI_LLM_API_KEY environment variable.');
    }

    const args = {
      model: this.model,
      system: input.systemPrompt,
      prompt: input.userPrompt,
      schema: input.schema,
      maxOutputTokens: input.maxOutputTokens ?? this.config.maxOutputTokens,
      temperature: input.temperature ?? this.config.temperature,
      maxRetries: this.config.maxRetries,
    };
    const { object } = await this.callWithRetries(async (signal) => generateObject({ ...args, abortSignal: signal }));

    return object;
  }

  private async *streamWithRetries(
    streamFn: (signal: AbortSignal) => Promise<{ textStream: AsyncIterable<string> }>,
    retryCount = 0
  ): AsyncGenerator<string> {
    if (!this.config) {
      throw new Error('LLM service not configured.');
    }

    const abortController = new AbortController();
    let chunkTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let hasYielded = false;

    const clearChunkTimeout = () => {
      if (chunkTimeoutId) {
        clearTimeout(chunkTimeoutId);
        chunkTimeoutId = null;
      }
    };

    const resetChunkTimeout = () => {
      clearChunkTimeout();
      chunkTimeoutId = setTimeout(() => abortController.abort(), this.requestTimeoutMs);
    };

    try {
      resetChunkTimeout();
      const result = await streamFn(abortController.signal);

      for await (const chunk of result.textStream) {
        if (abortController.signal.aborted) {
          const error = new Error('Stream aborted due to inactivity timeout');
          error.name = 'AbortError';
          throw error;
        }
        resetChunkTimeout();
        hasYielded = true;
        yield chunk;
      }

      clearChunkTimeout();
    } catch (error) {
      clearChunkTimeout();

      const isRetryableError =
        error?.name === 'AbortError' ||
        error?.name === 'AI_NoObjectGeneratedError' ||
        error?.statusCode >= 500 ||
        error?.statusCode === 429;

      if (!hasYielded && retryCount < this.maxSchemaValidationRetries && isRetryableError) {
        this.logger.warn(
          { errorName: error?.name, errorMessage: error?.message },
          `Stream failed before yielding, retrying... (attempt ${retryCount + 1}/${this.maxSchemaValidationRetries})`
        );
        yield* this.streamWithRetries(streamFn, retryCount + 1);

        return;
      }

      this.handleAIError(error);
    }
  }

  async *streamChat(input: ChatStreamInput): AsyncGenerator<string> {
    if (!this.isConfigured || !this.model || !this.config) {
      throw new Error('LLM service not configured. Please set AI_LLM_API_KEY environment variable.');
    }

    const messages: ModelMessage[] = input.messageHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    messages.push({ role: 'user', content: input.message });

    const args = {
      model: this.model,
      system: input.systemPrompt,
      messages,
      maxOutputTokens: input.maxOutputTokens ?? this.config.maxOutputTokens,
      temperature: input.temperature ?? this.config.temperature,
      maxRetries: this.config.maxRetries,
    };

    yield* this.streamWithRetries(async (signal) => streamText({ ...args, abortSignal: signal }));
  }

  streamAgent<TTools extends ToolSet>(input: AgentStreamInput<TTools>): StreamTextResult<TTools, never> {
    if (!this.isConfigured || !this.model || !this.config) {
      throw new Error('LLM service not configured. Please set AI_LLM_API_KEY environment variable.');
    }

    const isReasoning = this.isReasoningModel(this.config.model);

    return streamText({
      model: this.model,
      system: input.systemPrompt,
      messages: input.messages,
      tools: input.tools,
      stopWhen: stepCountIs(input.stopAfterSteps ?? 15),
      maxRetries: this.config.maxRetries,
      maxOutputTokens: input.maxOutputTokens ?? this.config.maxOutputTokens,
      onStepFinish: input.onStepFinish,
      onError: input.onError,
      providerOptions: input.providerOptions,
      experimental_transform: input.experimental_transform,
      ...(isReasoning ? {} : { temperature: 0 }),
    });
  }
}
