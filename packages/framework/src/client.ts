import { JSONSchemaFaker } from 'json-schema-faker';
import { Liquid } from 'liquidjs';
import ora from 'ora';
import {} from './types';

import { ChannelStepEnum, FRAMEWORK_VERSION, PostActionEnum, SDK_VERSION } from './constants';
import {
  StepControlCompilationFailedError,
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
import { WithPassthrough } from './types/provider.types';
import { EMOJI, log, sanitizeHtmlInObject } from './utils';
import { transformSchema, validateData } from './validators';

/**
 * We want to respond with a consistent string value for preview
 */
JSONSchemaFaker.random.shuffle = function shuffle() {
  return ['[placeholder]'];
};

JSONSchemaFaker.option({
  useDefaultValue: true,
  alwaysFakeOptionals: true,
});

function isRuntimeInDevelopment() {
  return ['development', undefined].includes(process.env.NODE_ENV);
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
      strictAuthentication: !isRuntimeInDevelopment(),
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return JSONSchemaFaker.generate(transformSchema(schema) as any) as Record<string, unknown>;
  }

  private async validate<T extends Record<string, unknown>>(
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

        // eslint-disable-next-line no-fallthrough
        case 'step':
          this.throwInvalidStep(stepId, dataType, workflowId, result.errors);

        // eslint-disable-next-line no-fallthrough
        case 'provider':
          this.throwInvalidProvider(stepId, providerId, dataType, workflowId, result.errors);

        // eslint-disable-next-line no-fallthrough
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

  private executeStepFactory<T_Outputs extends Record<string, unknown>, T_Result extends Record<string, unknown>>(
    event: Event,
    setResult: (result: Pick<ExecuteOutput, 'outputs' | 'providers' | 'options'>) => void
  ): ActionStep<T_Outputs, T_Result> {
    return async (stepId, stepResolve, options) => {
      const step = this.getStep(event.workflowId, stepId);
      const controls = await this.createStepControls(step, event);
      const isPreview = event.action === 'preview';

      if (!isPreview && (await this.shouldSkip(options?.skip as typeof step.options.skip, controls))) {
        if (stepId === event.stepId) {
          // Only set the result when the step is the current step.
          setResult({
            options: { skip: true },
            outputs: {},
            providers: {},
          });
        }

        /*
         * Return an empty object for results when a step is skipped.
         * TODO: fix typings when `skip` is specified to return `Partial<T_Result>`
         */
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return {} as any;
      }

      const previewStepHandler = this.previewStep.bind(this);
      const executeStepHandler = this.executeStep.bind(this);
      const handler = isPreview ? previewStepHandler : executeStepHandler;

      let stepResult = await handler(event, {
        ...step,
        providers: step.providers.map((provider) => {
          // TODO: Update return type to include ChannelStep and fix typings
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const providerResolve = (options as any)?.providers?.[provider.type] as typeof provider.resolve;

          if (!providerResolve) {
            throw new ProviderNotFoundError(provider.type);
          }

          return {
            ...provider,
            resolve: providerResolve,
          };
        }),
        resolve: stepResolve as typeof step.resolve,
      });

      if (Object.values(ChannelStepEnum).includes(step.type as ChannelStepEnum)) {
        // Sanitize the outputs to avoid XSS attacks via Channel content.
        stepResult = {
          ...stepResult,
          outputs: sanitizeHtmlInObject(stepResult.outputs),
        };
      }

      if (stepId === event.stepId) {
        setResult({
          ...stepResult,
          options: {
            skip: false,
          },
        });
      }

      return stepResult.outputs;
    };
  }

  private async shouldSkip<T_Controls extends Record<string, unknown>>(
    skip: Skip<T_Controls> | undefined,
    controls: T_Controls
  ): Promise<boolean> {
    if (!skip) {
      return false;
    }

    return skip(controls);
  }

  public async executeWorkflow(event: Event): Promise<ExecuteOutput> {
    const actionMessages = {
      [PostActionEnum.EXECUTE]: 'Executing',
      [PostActionEnum.PREVIEW]: 'Previewing',
    };

    const actionMessage = (() => {
      if (event.action === 'execute') return 'Executed';
      if (event.action === 'preview') return 'Previewed';

      return 'Invalid action';
    })();
    const actionMessageFormatted = `${actionMessage} workflowId:`;
    // eslint-disable-next-line no-console
    console.log(`\n${log.bold(log.underline(actionMessageFormatted))} '${event.workflowId}'`);
    const workflow = this.getWorkflow(event.workflowId);

    const startTime = process.hrtime();

    let result: Omit<ExecuteOutput, 'metadata'> = {
      outputs: {},
      providers: {},
      options: { skip: false },
    };

    let concludeExecution: (value?: unknown) => void;
    const concludeExecutionPromise = new Promise((resolve) => {
      concludeExecution = resolve;
    });
    /**
     * Set the result of the workflow execution.
     *
     * In order to exit evaluation of the Workflow's `execute` method when the specified
     * `stepId` is reached, we need to `Promise.race` the `concludeExecutionPromise` with the
     * `workflow.execute` method. By resolving the `concludeExecutionPromise` when setting the result,
     * we can ensure that the `workflow.execute` method is not evaluated after the `stepId` is reached.
     *
     * This function should only be called once per workflow execution.
     *
     * @param stepResult The result of the workflow execution.
     */
    const setResult = (stepResult: Omit<ExecuteOutput, 'metadata'>): void => {
      concludeExecution();
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
      const validatedEvent = {
        ...event,
        payload: executionData,
      };
      await Promise.race([
        concludeExecutionPromise,
        workflow.execute({
          payload: executionData,
          environment: {},
          input: {},
          controls: {},
          subscriber: event.subscriber,
          step: {
            email: this.executeStepFactory(validatedEvent, setResult),
            sms: this.executeStepFactory(validatedEvent, setResult),
            inApp: this.executeStepFactory(validatedEvent, setResult),
            digest: this.executeStepFactory(validatedEvent, setResult),
            delay: this.executeStepFactory(validatedEvent, setResult),
            push: this.executeStepFactory(validatedEvent, setResult),
            chat: this.executeStepFactory(validatedEvent, setResult),
            custom: this.executeStepFactory(validatedEvent, setResult),
          },
        }),
      ]);
    } catch (error) {
      executionError = error as Error;
    }
    const endTime = process.hrtime(startTime);

    const elapsedSeconds = endTime[0];
    const elapsedNanoseconds = endTime[1];
    const elapsedTimeInMilliseconds = elapsedSeconds * 1_000 + elapsedNanoseconds / 1_000_000;

    const emoji = executionError ? EMOJI.ERROR : EMOJI.SUCCESS;
    const resultMessage =
      // eslint-disable-next-line no-nested-ternary
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
      // eslint-disable-next-line no-nested-ternary
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
  ): Promise<Record<string, WithPassthrough<Record<string, unknown>>>> {
    return step.providers.reduce(
      async (acc, provider) => {
        const result = await acc;
        const previewProviderHandler = this.previewProvider.bind(this);
        const executeProviderHandler = this.executeProvider.bind(this);
        const handler = event.action === 'preview' ? previewProviderHandler : executeProviderHandler;

        const providerResult = await handler(event, step, provider, outputs);

        return {
          ...result,
          [provider.type]: providerResult,
        };
      },
      Promise.resolve({} as Record<string, WithPassthrough<Record<string, unknown>>>)
    );
  }

  private previewProvider(
    event: Event,
    step: DiscoverStepOutput,
    provider: DiscoverProviderOutput,

    outputs: Record<string, unknown>
  ): Record<string, unknown> {
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
  ): Promise<WithPassthrough<Record<string, unknown>>> {
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

        return {
          ...validatedOutput,
          _passthrough: result._passthrough,
        };
      } else {
        // No-op. We don't execute providers for hydrated steps
        spinner.stopAndPersist({
          symbol: EMOJI.HYDRATED,
          text: `Hydrated provider: \`${provider.type}\``,
        });

        return {};
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
          const validatedOutput = await this.validate(
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
            outputs: validatedOutput,
            providers: await this.executeProviders(event, step, validatedOutput),
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
    try {
      const templateString = this.templateEngine.parse(JSON.stringify(templateControls));

      const compiledString = await this.templateEngine.render(templateString, {
        payload: event.payload || event.data,
        subscriber: event.subscriber,
        // Backwards compatibility, for allowing usage of variables without namespace (e.g. `{{name}}` instead of `{{payload.name}}`)
        ...(event.payload || event.data),
      });

      return JSON.parse(compiledString);
    } catch (error) {
      throw new StepControlCompilationFailedError(event.workflowId, event.stepId, error);
    }
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
