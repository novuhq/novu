import { JSONSchemaFaker } from 'json-schema-faker';
import { Liquid } from 'liquidjs';
import ora from 'ora';

import {
  ExecutionEventControlsInvalidError,
  ExecutionEventPayloadInvalidError,
  ExecutionProviderOutputInvalidError,
  ExecutionStateControlsInvalidError,
  ExecutionStateCorruptError,
  ExecutionStateOutputInvalidError,
  ExecutionStateResultInvalidError,
  ProviderExecutionFailedError,
  ProviderNotFoundError,
  StepNotFoundError,
  WorkflowAlreadyExistsError,
  WorkflowNotFoundError,
} from './errors';
import type {
  ActionStep,
  ClientOptions,
  CodeResult,
  DiscoverOutput,
  DiscoverProviderOutput,
  DiscoverStepOutput,
  DiscoverWorkflowOutput,
  Event,
  ExecuteOutput,
  HealthCheck,
  Schema,
  Skip,
  ValidationError,
  Workflow,
} from './types';
import { EMOJI, log } from './utils';
import { transformSchema, validateData } from './validators';
import { FRAMEWORK_VERSION, SDK_VERSION } from './version';

/**
 * We want to respond with a consistent string value for preview
 */
JSONSchemaFaker.random.shuffle = function () {
  return ['[placeholder]'];
};

JSONSchemaFaker.option({
  useDefaultValue: true,
  alwaysFakeOptionals: true,
});

function isRuntimeInDevelopment() {
  return process.env.NODE_ENV === 'development';
}

export class Client {
  private discoveredWorkflows: Array<DiscoverWorkflowOutput> = [];

  private templateEngine = new Liquid();

  public secretKey?: string;

  public version: string = SDK_VERSION;

  public strictAuthentication: boolean;

  constructor(options?: ClientOptions) {
    const builtOpts = this.buildOptions(options);
    this.secretKey = builtOpts.secretKey;
    this.strictAuthentication = builtOpts.strictAuthentication;
  }

  private buildOptions(providedOptions?: ClientOptions) {
    const builtConfiguration: { secretKey?: string; strictAuthentication: boolean } = {
      secretKey: undefined,
      strictAuthentication: isRuntimeInDevelopment() ? false : true,
    };

    builtConfiguration.secretKey =
      providedOptions?.secretKey || process.env.NOVU_SECRET_KEY || process.env.NOVU_API_KEY;

    if (providedOptions?.strictAuthentication !== undefined) {
      builtConfiguration.strictAuthentication = providedOptions.strictAuthentication;
    } else if (process.env.NOVU_STRICT_AUTHENTICATION_ENABLED !== undefined) {
      builtConfiguration.strictAuthentication = process.env.NOVU_STRICT_AUTHENTICATION_ENABLED === 'true';
    }

    return builtConfiguration;
  }

  public addWorkflows(workflows: Array<Workflow>) {
    for (const workflow of workflows) {
      if (this.discoveredWorkflows.some((existing) => existing.workflowId === workflow.definition.workflowId)) {
        throw new WorkflowAlreadyExistsError(workflow.definition.workflowId);
      } else {
        this.discoveredWorkflows.push(workflow.definition);
      }
    }
  }

  public healthCheck(): HealthCheck {
    const workflowCount = this.discoveredWorkflows.length;
    const stepCount = this.discoveredWorkflows.reduce((acc, workflow) => acc + workflow.steps.length, 0);

    return {
      status: 'ok',
      sdkVersion: SDK_VERSION,
      frameworkVersion: FRAMEWORK_VERSION,
      discovered: {
        workflows: workflowCount,
        steps: stepCount,
      },
    };
  }

  private getWorkflow(workflowId: string): DiscoverWorkflowOutput {
    const foundWorkflow = this.discoveredWorkflows.find((workflow) => workflow.workflowId === workflowId);

    if (foundWorkflow) {
      return foundWorkflow;
    } else {
      throw new WorkflowNotFoundError(workflowId);
    }
  }

  private getStep(workflowId: string, stepId: string): DiscoverStepOutput {
    const workflow = this.getWorkflow(workflowId);

    const foundStep = workflow.steps.find((step) => step.stepId === stepId);

    if (foundStep) {
      return foundStep;
    } else {
      throw new StepNotFoundError(stepId);
    }
  }

  private getRegisteredWorkflows(): Array<DiscoverWorkflowOutput> {
    return this.discoveredWorkflows;
  }

  public discover(): DiscoverOutput {
    return {
      workflows: this.getRegisteredWorkflows(),
    };
  }

  /**
   * Mocks data based on the given schema.
   * The `default` value in the schema is used as the base data.
   * If no `default` value is provided, the data is generated using JSONSchemaFaker.
   *
   * @param schema
   * @returns mocked data
   */
  private mock(schema: Schema): Record<string, unknown> {
    return JSONSchemaFaker.generate(transformSchema(schema) as any) as Record<string, unknown>;
  }

  private async validate<T>(
    data: T,
    schema: Schema,
    component: 'event' | 'step' | 'provider',
    dataType: 'controls' | 'output' | 'result' | 'payload',
    workflowId: string,
    stepId?: string,
    providerId?: string
  ): Promise<T> {
    const result = await validateData(schema, data);

    if (!result.success) {
      switch (component) {
        case 'event':
          this.throwInvalidEvent(dataType, workflowId, result.errors);

        case 'step':
          this.throwInvalidStep(stepId, dataType, workflowId, result.errors);

        case 'provider':
          this.throwInvalidProvider(stepId, providerId, dataType, workflowId, result.errors);

        default:
          throw new Error(`Invalid component: '${component}'`);
      }
    } else {
      return result.data;
    }
  }

  private throwInvalidProvider(
    stepId: string | undefined,
    providerId: string | undefined,
    payloadType: 'controls' | 'output' | 'result' | 'payload',
    workflowId: string,
    errors: Array<ValidationError>
  ) {
    if (!stepId) {
      throw new Error('stepId is required');
    }

    if (!providerId) {
      throw new Error('providerId is required');
    }

    switch (payloadType) {
      case 'output':
        throw new ExecutionProviderOutputInvalidError(workflowId, stepId, providerId, errors);

      default:
        throw new Error(`Invalid payload type: '${payloadType}'`);
    }
  }

  private throwInvalidStep(
    stepId: string | undefined,
    payloadType: 'controls' | 'output' | 'result' | 'payload',
    workflowId: string,
    errors: Array<ValidationError>
  ) {
    if (!stepId) {
      throw new Error('stepId is required');
    }

    switch (payloadType) {
      case 'output':
        throw new ExecutionStateOutputInvalidError(workflowId, stepId, errors);

      case 'result':
        throw new ExecutionStateResultInvalidError(workflowId, stepId, errors);

      case 'controls':
        throw new ExecutionStateControlsInvalidError(workflowId, stepId, errors);

      default:
        throw new Error(`Invalid payload type: '${payloadType}'`);
    }
  }

  private throwInvalidEvent(
    payloadType: 'controls' | 'output' | 'result' | 'payload',
    workflowId: string,
    errors: Array<ValidationError>
  ) {
    switch (payloadType) {
      case 'controls':
        throw new ExecutionEventControlsInvalidError(workflowId, errors);

      case 'payload':
        throw new ExecutionEventPayloadInvalidError(workflowId, errors);

      default:
        throw new Error(`Invalid payload type: '${payloadType}'`);
    }
  }

  private executeStepFactory<T, U>(event: Event, setResult: (result: any) => void): ActionStep<T, U> {
    return async (stepId, stepResolve, options) => {
      const step = this.getStep(event.workflowId, stepId);
      const eventClone = clone<Event>(event);
      const controls = await this.createStepControls(step, eventClone);
      const isPreview = event.action === 'preview';

      if (!isPreview && (await this.shouldSkip(options?.skip, controls))) {
        const skippedResult = { options: { skip: true } };
        setResult(skippedResult);

        return {} as any;
      }

      const previewStepHandler = this.previewStep.bind(this);
      const executeStepHandler = this.executeStep.bind(this);
      const handler = isPreview ? previewStepHandler : executeStepHandler;

      const stepResult = await handler(event, {
        ...step,
        providers: step.providers.map((provider) => {
          const providerResolve = options?.providers?.[provider.type];

          if (!providerResolve) {
            throw new ProviderNotFoundError(provider.type);
          }

          return {
            ...provider,
            resolve: providerResolve,
          };
        }),
        resolve: stepResolve,
      });

      if (stepId === event.stepId) {
        setResult(stepResult);
      }

      return stepResult.outputs as any;
    };
  }

  private async shouldSkip(skip: Skip<any> | undefined, controls: any): Promise<boolean> {
    if (!skip) {
      return false;
    }

    return skip(controls);
  }

  public async executeWorkflow(event: Event): Promise<ExecuteOutput> {
    const actionMessages = {
      execute: 'Executing',
      preview: 'Previewing',
    };

    const actionMessage = actionMessages[event.action];
    const actionMessageFormatted = `${actionMessage} workflowId:`;
    // eslint-disable-next-line no-console
    console.log(`\n${log.bold(log.underline(actionMessageFormatted))} '${event.workflowId}'`);
    const workflow = this.getWorkflow(event.workflowId);

    const startTime = process.hrtime();

    let result: {
      outputs: Record<string, unknown>;
      providers: Record<string, unknown>;
      options: Record<string, unknown>;
    } = {
      outputs: {},
      providers: {},
      options: {},
    };
    let resolveEarlyExit: (value?: unknown) => void;
    const earlyExitPromise = new Promise((resolve) => {
      resolveEarlyExit = resolve;
    });

    const setResult = (stepResult: any): void => {
      resolveEarlyExit();
      result = stepResult;
    };

    let executionError: Error | undefined;
    try {
      if (
        event.action === 'execute' && // TODO: move this validation to the handler layer
        !event.payload &&
        !event.data
      ) {
        throw new ExecutionEventPayloadInvalidError(event.workflowId, {
          message: 'Event `payload` is required',
        });
      }

      const executionData = await this.createExecutionPayload(event, workflow);
      await Promise.race([
        earlyExitPromise,
        workflow.execute({
          payload: executionData,
          environment: {},
          inputs: {},
          controls: {},
          subscriber: event.subscriber,
          step: {
            // eslint-disable-next-line multiline-comment-style
            // TODO: fix the typing for `type` to use the keyof providerSchema[channelType]
            // @ts-expect-error - Types of parameters 'options' and 'options' are incompatible.
            email: this.executeStepFactory(event, setResult),
            sms: this.executeStepFactory(event, setResult),
            inApp: this.executeStepFactory(event, setResult),
            digest: this.executeStepFactory(event, setResult),
            delay: this.executeStepFactory(event, setResult),
            push: this.executeStepFactory(event, setResult),
            // eslint-disable-next-line multiline-comment-style
            // TODO: fix the typing for `type` to use the keyof providerSchema[channelType]
            // @ts-expect-error - Types of parameters 'options' and 'options' are incompatible.
            chat: this.executeStepFactory(event, setResult),
            custom: this.executeStepFactory(event, setResult),
          },
        }),
      ]);
    } catch (error) {
      executionError = error as Error;
    }
    const endTime = process.hrtime(startTime);

    const elapsedSeconds = endTime[0];
    const elapsedNanoseconds = endTime[1];
    const elapsedTimeInMilliseconds = elapsedSeconds * 1000 + elapsedNanoseconds / 1_000_000;

    const emoji = executionError ? EMOJI.ERROR : EMOJI.SUCCESS;
    const resultMessage =
      event.action === 'execute' ? 'Executed' : event.action === 'preview' ? 'Previewed' : 'Invalid action';
    // eslint-disable-next-line no-console
    console.log(`${emoji} ${resultMessage} workflowId: \`${event.workflowId}\``);

    this.prettyPrintExecute(event, elapsedTimeInMilliseconds, executionError);

    if (executionError) {
      throw executionError;
    }

    return {
      outputs: result.outputs,
      providers: result.providers,
      options: result.options,
      metadata: {
        status: 'success',
        error: false,
        duration: elapsedTimeInMilliseconds,
      },
    };
  }

  private async createExecutionPayload(
    event: Event,
    workflow: DiscoverWorkflowOutput
  ): Promise<Record<string, unknown>> {
    let payload = event.payload || event.data;
    if (event.action === 'preview') {
      const mockResult = this.mock(workflow.payload.schema);

      payload = Object.assign(mockResult, payload);
    }

    const validatedPayload = await this.validate(
      payload,
      workflow.payload.unknownSchema,
      'event',
      'payload',
      event.workflowId
    );

    return validatedPayload;
  }

  private prettyPrintExecute(event: Event, duration: number, error?: Error): void {
    const successPrefix = error ? EMOJI.ERROR : EMOJI.SUCCESS;
    const actionMessage =
      event.action === 'execute' ? 'Executed' : event.action === 'preview' ? 'Previewed' : 'Invalid action';
    const message = error ? 'Failed to execute' : actionMessage;
    const executionLog = error ? log.error : log.success;
    const logMessage = `${successPrefix} ${message} workflowId: '${event.workflowId}`;
    // eslint-disable-next-line no-console
    console.log(`\n  ${log.bold(executionLog(logMessage))}'`);
    // eslint-disable-next-line no-console
    console.log(`  ├ ${EMOJI.STEP} stepId: '${event.stepId}'`);
    // eslint-disable-next-line no-console
    console.log(`  ├ ${EMOJI.ACTION} action: '${event.action}'`);
    // eslint-disable-next-line no-console
    console.log(`  └ ${EMOJI.DURATION} duration: '${duration.toFixed(2)}ms'\n`);
  }

  private async executeProviders(
    event: Event,
    step: DiscoverStepOutput,
    outputs: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return step.providers.reduce(async (acc, provider) => {
      const result = await acc;
      const previewProviderHandler = this.previewProvider.bind(this);
      const executeProviderHandler = this.executeProvider.bind(this);
      const handler = event.action === 'preview' ? previewProviderHandler : executeProviderHandler;

      const providerResult = await handler(event, step, provider, outputs);

      return {
        ...result,
        [provider.type]: providerResult,
      };
    }, Promise.resolve({} as Record<string, unknown>));
  }

  private previewProvider(
    event: Event,
    step: DiscoverStepOutput,
    provider: DiscoverProviderOutput,
    outputs: Record<string, unknown>
  ): unknown {
    // eslint-disable-next-line no-console
    console.log(`  ${EMOJI.MOCK} Mocked provider: \`${provider.type}\``);
    const mockOutput = this.mock(provider.outputs.schema);

    return mockOutput;
  }

  private async executeProvider(
    event: Event,
    step: DiscoverStepOutput,
    provider: DiscoverProviderOutput,
    outputs: Record<string, unknown>
  ): Promise<unknown> {
    const spinner = ora({ indent: 2 }).start(`Executing provider: \`${provider.type}\``);
    try {
      if (event.stepId === step.stepId) {
        const controls = await this.createStepControls(step, event);
        const result = await provider.resolve({
          controls,
          outputs,
        });
        const validatedOutput = await this.validate(
          result,
          provider.outputs.unknownSchema,
          'step',
          'output',
          event.workflowId,
          step.stepId,
          provider.type
        );
        spinner.succeed(`Executed provider: \`${provider.type}\``);

        return validatedOutput;
      } else {
        // No-op. We don't execute providers for hydrated steps
        spinner.stopAndPersist({
          symbol: EMOJI.HYDRATED,
          text: `Hydrated provider: \`${provider.type}\``,
        });
      }
    } catch (error) {
      spinner.stopAndPersist({
        symbol: EMOJI.ERROR,
        text: `Failed to execute provider: \`${provider.type}\``,
      });
      throw new ProviderExecutionFailedError(
        `Failed to execute provider: '${provider.type}'.\n${(error as Error).message}`
      );
    }
  }

  private async executeStep(
    event: Event,
    step: DiscoverStepOutput
  ): Promise<Pick<ExecuteOutput, 'outputs' | 'providers'>> {
    if (event.stepId === step.stepId) {
      const spinner = ora({ indent: 1 }).start(`Executing stepId: \`${step.stepId}\``);
      try {
        const templateControls = await this.createStepControls(step, event);
        const controls = await this.compileControls(templateControls, event);
        const output = await step.resolve(controls);
        const validatedOutput = await this.validate(
          output,
          step.outputs.unknownSchema,
          'step',
          'output',
          event.workflowId,
          step.stepId
        );

        const providers = await this.executeProviders(event, step, validatedOutput);

        spinner.succeed(`Executed stepId: \`${step.stepId}\``);

        return {
          outputs: validatedOutput,
          providers,
        };
      } catch (error) {
        spinner.stopAndPersist({
          prefixText: '',
          symbol: EMOJI.ERROR,
          text: `Failed to execute stepId: \`${step.stepId}\``,
        });
        throw error;
      }
    } else {
      const spinner = ora({ indent: 1 }).start(`Hydrating stepId: \`${step.stepId}\``);
      try {
        const result = event.state.find((state) => state.stepId === step.stepId);

        if (result) {
          const validatedResult = await this.validate(
            result.outputs,
            step.results.unknownSchema,
            'step',
            'result',
            event.workflowId,
            step.stepId
          );
          spinner.stopAndPersist({
            symbol: EMOJI.HYDRATED,
            text: `Hydrated stepId: \`${step.stepId}\``,
          });

          return {
            outputs: validatedResult,
            providers: await this.executeProviders(event, step, validatedResult),
          };
        } else {
          throw new ExecutionStateCorruptError(event.workflowId, step.stepId);
        }
      } catch (error) {
        spinner.stopAndPersist({
          symbol: EMOJI.ERROR,
          text: `Failed to hydrate stepId: \`${step.stepId}\``,
        });
        throw error;
      }
    }
  }

  private async compileControls(templateControls: Record<string, unknown>, event: Event) {
    const templateString = this.templateEngine.parse(JSON.stringify(templateControls));

    const compiledString = await this.templateEngine.render(templateString, {
      ...(event.payload || event.data),
      subscriber: event.subscriber,
    });

    return JSON.parse(compiledString);
  }

  /**
   * Create the controls for a step, taking both the event controls and the default controls into account
   *
   * @param step The step to create the controls for
   * @param event The event that triggered the step
   * @returns The controls for the step
   */
  private async createStepControls(step: DiscoverStepOutput, event: Event): Promise<Record<string, unknown>> {
    const stepControls = event.controls || event.inputs;

    const validatedControls = await this.validate(
      stepControls,
      step.controls.unknownSchema,
      'step',
      'controls',
      event.workflowId,
      step.stepId
    );

    return validatedControls;
  }

  private async previewStep(
    event: Event,
    step: DiscoverStepOutput
  ): Promise<Pick<ExecuteOutput, 'outputs' | 'providers'>> {
    const spinner = ora({ indent: 1 }).start(`Previewing stepId: \`${step.stepId}\``);
    try {
      if (event.stepId === step.stepId) {
        const templateControls = await this.createStepControls(step, event);
        const controls = await this.compileControls(templateControls, event);

        const previewOutput = await step.resolve(controls);
        const validatedOutput = await this.validate(
          previewOutput,
          step.outputs.unknownSchema,
          'step',
          'output',
          event.workflowId,
          step.stepId
        );

        spinner.stopAndPersist({
          symbol: EMOJI.MOCK,
          text: `Mocked stepId: \`${step.stepId}\``,
        });

        return {
          outputs: validatedOutput,
          providers: await this.executeProviders(event, step, validatedOutput),
        };
      } else {
        const mockResult = this.mock(step.results.schema);

        spinner.stopAndPersist({
          symbol: EMOJI.MOCK,
          text: `Mocked stepId: \`${step.stepId}\``,
        });

        return {
          outputs: mockResult,
          providers: await this.executeProviders(event, step, mockResult),
        };
      }
    } catch (error) {
      spinner.stopAndPersist({
        symbol: EMOJI.ERROR,
        text: `Failed to preview stepId: \`${step.stepId}\``,
      });
      throw error;
    }
  }

  private getStepCode(workflowId: string, stepId: string): CodeResult {
    const step = this.getStep(workflowId, stepId);

    return {
      code: step.resolve.toString(),
    };
  }

  private getWorkflowCode(workflowId: string): CodeResult {
    const workflow = this.getWorkflow(workflowId);

    return {
      code: workflow.execute.toString(),
    };
  }

  public getCode(workflowId: string, stepId?: string): CodeResult {
    let getCodeResult: CodeResult;

    if (!workflowId) {
      throw new WorkflowNotFoundError(workflowId);
    } else if (stepId) {
      getCodeResult = this.getStepCode(workflowId, stepId);
    } else {
      getCodeResult = this.getWorkflowCode(workflowId);
    }

    return getCodeResult;
  }
}

function clone<Result>(data: unknown) {
  return JSON.parse(JSON.stringify(data)) as Result;
}
