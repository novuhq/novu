import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import betterAjvErrors from 'better-ajv-errors';
import { JSONSchema7 } from 'json-schema';
import { JSONSchemaFaker } from 'json-schema-faker';
import ora from 'ora';

import { DEFAULT_NOVU_API_BASE_URL, HttpHeaderKeysEnum, HttpMethodEnum, NovuApiEndpointsEnum } from './constants';
import {
  ExecutionEventDataInvalidError,
  ExecutionEventInputInvalidError,
  ExecutionProviderOutputInvalidError,
  ExecutionStateCorruptError,
  ExecutionStateInputInvalidError,
  ExecutionStateOutputInvalidError,
  ExecutionStateResultInvalidError,
  ProviderExecutionFailedError,
  ProviderNotFoundError,
  StepNotFoundError,
  WorkflowAlreadyExistsError,
  WorkflowNotFoundError,
} from './errors';
import {
  ActionStep,
  ClientOptions,
  CodeResult,
  DiscoverOutput,
  DiscoverProviderOutput,
  DiscoverStepOutput,
  DiscoverWorkflowOutput,
  ExecuteOutput,
  HealthCheck,
  IEvent,
  Validate,
} from './types';
import { Schema } from './types/schema.types';
import { EMOJI, log, toConstantCase } from './utils';
import { VERSION } from './version';
import { Skip } from './types/skip.types';
import { Liquid } from 'liquidjs';

JSONSchemaFaker.option({
  useDefaultValue: true,
  alwaysFakeOptionals: true,
});

export class Client {
  private discoveredWorkflows: Array<DiscoverWorkflowOutput> = [];

  private ajv: Ajv;

  private templateEngine = new Liquid();

  private readonly apiUrl: string;

  public apiKey?: string;

  public version: string = VERSION;

  public strictAuthentication: boolean;

  public static NOVU_SIGNATURE_HEADER = HttpHeaderKeysEnum.SIGNATURE;

  constructor(options?: ClientOptions) {
    const builtOpts = this.buildOptions(options);
    this.apiKey = builtOpts.apiKey;
    this.apiUrl = builtOpts.apiUrl;
    this.strictAuthentication = builtOpts.strictAuthentication;

    const ajv = new Ajv({ useDefaults: true });
    addFormats(ajv);
    this.ajv = ajv;
  }

  private buildOptions(providedOptions?: ClientOptions) {
    const builtConfiguration: { apiKey?: string; apiUrl: string; strictAuthentication: boolean } = {
      apiKey: undefined,
      apiUrl: DEFAULT_NOVU_API_BASE_URL,
      strictAuthentication: true,
    };

    if (providedOptions?.apiKey !== undefined) {
      builtConfiguration.apiKey = providedOptions.apiKey;
    } else if (process.env.NOVU_API_KEY !== undefined) {
      builtConfiguration.apiKey = process.env.NOVU_API_KEY;
    }

    if (providedOptions?.apiUrl !== undefined) {
      builtConfiguration.apiUrl = providedOptions.apiUrl;
    } else if (process.env.NOVU_API_URL !== undefined) {
      builtConfiguration.apiUrl = process.env.NOVU_API_URL;
    }

    if (providedOptions?.strictAuthentication !== undefined) {
      builtConfiguration.strictAuthentication = providedOptions.strictAuthentication;
    } else if (process.env.NOVU_STRICT_AUTHENTICATION !== undefined) {
      builtConfiguration.strictAuthentication = process.env.NOVU_STRICT_AUTHENTICATION === 'true';
    }

    return builtConfiguration;
  }

  public addWorkflows(workflows: Array<DiscoverWorkflowOutput>) {
    for (const workflow of workflows) {
      if (this.discoveredWorkflows.some((existing) => existing.workflowId === workflow.workflowId)) {
        throw new WorkflowAlreadyExistsError(workflow.workflowId);
      } else {
        this.discoveredWorkflows.push(workflow);
      }
    }
  }

  public healthCheck(): HealthCheck {
    const workflowCount = this.discoveredWorkflows.length;
    const stepCount = this.discoveredWorkflows.reduce((acc, workflow) => acc + workflow.steps.length, 0);

    return {
      status: 'ok',
      version: VERSION,
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

  private getHeaders(anonymous?: string): Record<string, string> {
    const headers = {
      [HttpHeaderKeysEnum.CONTENT_TYPE]: 'application/json',
      [HttpHeaderKeysEnum.AUTHORIZATION]: `ApiKey ${this.apiKey}`,
    };

    if (anonymous) {
      headers[HttpHeaderKeysEnum.ANONYMOUS] = anonymous;
    }

    return headers;
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
    return JSONSchemaFaker.generate(schema as JSONSchema7) as Record<string, unknown>;
  }

  private validate(
    data: unknown,
    validate: Validate,
    schema: Schema,
    component: 'event' | 'step' | 'provider',
    payloadType: 'input' | 'output' | 'result' | 'data',
    workflowId: string,
    stepId?: string,
    providerId?: string
  ): void {
    const valid = validate(data);

    if (!valid) {
      const betterErrors = betterAjvErrors(schema, data, validate.errors || []);
      // eslint-disable-next-line no-console
      console.error(`\n${betterErrors}`);

      switch (component) {
        case 'event':
          this.validateEvent(payloadType, workflowId, validate);

        case 'step':
          this.validateStep(stepId, payloadType, workflowId, validate);

        case 'provider':
          this.validateProvider(stepId, providerId, payloadType, workflowId, validate);
      }
    }
  }

  private validateProvider(
    stepId: string | undefined,
    providerId: string | undefined,
    payloadType: 'input' | 'output' | 'result' | 'data',
    workflowId: string,
    validate: ValidateFunction<unknown>
  ) {
    if (!stepId) {
      throw new Error('stepId is required');
    }

    if (!providerId) {
      throw new Error('providerId is required');
    }

    switch (payloadType) {
      case 'output':
        throw new ExecutionProviderOutputInvalidError(workflowId, stepId, providerId, validate.errors);

      default:
        throw new Error(`Invalid payload type: '${payloadType}'`);
    }
  }

  private validateStep(
    stepId: string | undefined,
    payloadType: 'input' | 'output' | 'result' | 'data',
    workflowId: string,
    validate: ValidateFunction<unknown>
  ) {
    if (!stepId) {
      throw new Error('stepId is required');
    }

    switch (payloadType) {
      case 'output':
        throw new ExecutionStateOutputInvalidError(workflowId, stepId, validate.errors);

      case 'result':
        throw new ExecutionStateResultInvalidError(workflowId, stepId, validate.errors);

      case 'input':
        throw new ExecutionStateInputInvalidError(workflowId, stepId, validate.errors);

      default:
        throw new Error(`Invalid payload type: '${payloadType}'`);
    }
  }

  private validateEvent(
    payloadType: 'input' | 'output' | 'result' | 'data',
    workflowId: string,
    validate: ValidateFunction<unknown>
  ) {
    switch (payloadType) {
      case 'input':
        throw new ExecutionEventInputInvalidError(workflowId, validate.errors);

      case 'data':
        throw new ExecutionEventDataInvalidError(workflowId, validate.errors);

      default:
        throw new Error(`Invalid payload type: '${payloadType}'`);
    }
  }

  private executeStepFactory<T, U>(event: IEvent, setResult: (result: any) => void): ActionStep<T, U> {
    return async (stepId, stepResolve, options) => {
      const step = this.getStep(event.workflowId, stepId);
      const eventClone = clone<IEvent>(event);
      const inputs = this.createStepInputs(step, eventClone);
      const isPreview = event.action === 'preview';

      if (!isPreview && (await this.shouldSkip(options?.skip, inputs))) {
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

  private async shouldSkip(
    skip: Skip<Record<string, unknown>> | undefined,
    inputs: Record<string, unknown>
  ): Promise<boolean> {
    if (!skip) {
      return false;
    }

    return skip(inputs);
  }

  public async executeWorkflow(event: IEvent): Promise<ExecuteOutput> {
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
        !event.data
      ) {
        throw new ExecutionEventInputInvalidError(event.workflowId, {
          message: 'Event `data` is required',
        });
      }

      const executionData = this.createExecutionInputs(event, workflow);
      await Promise.race([
        earlyExitPromise,
        workflow.execute({
          payload: executionData,
          environment: {},
          input: {},
          subscriber: event.subscriber,
          step: {
            email: this.executeStepFactory(event, setResult),
            sms: this.executeStepFactory(event, setResult),
            inApp: this.executeStepFactory(event, setResult),
            digest: this.executeStepFactory(event, setResult),
            delay: this.executeStepFactory(event, setResult),
            push: this.executeStepFactory(event, setResult),
            chat: this.executeStepFactory(event, setResult),
            custom: this.executeStepFactory(event, setResult),
          },
        }),
      ]);
    } catch (error) {
      executionError = error;
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

  private createExecutionInputs(event: IEvent, workflow: DiscoverWorkflowOutput): Record<string, unknown> {
    const executionData = event.data;

    this.validate(event.data, workflow.data.validate, workflow.data.schema, 'event', 'input', event.workflowId);

    return executionData;
  }

  private prettyPrintExecute(payload: IEvent, duration: number, error?: Error): void {
    const successPrefix = error ? EMOJI.ERROR : EMOJI.SUCCESS;
    const actionMessage =
      payload.action === 'execute' ? 'Executed' : payload.action === 'preview' ? 'Previewed' : 'Invalid action';
    const message = error ? 'Failed to execute' : actionMessage;
    const executionLog = error ? log.error : log.success;
    const logMessage = `${successPrefix} ${message} workflowId: '${payload.workflowId}`;
    // eslint-disable-next-line no-console
    console.log(`\n  ${log.bold(executionLog(logMessage))}'`);
    // eslint-disable-next-line no-console
    console.log(`  ├ ${EMOJI.STEP} stepId: '${payload.stepId}'`);
    // eslint-disable-next-line no-console
    console.log(`  ├ ${EMOJI.ACTION} action: '${payload.action}'`);
    // eslint-disable-next-line no-console
    console.log(`  └ ${EMOJI.DURATION} duration: '${duration.toFixed(2)}ms'\n`);
  }

  private async executeProviders(payload: IEvent, step: DiscoverStepOutput): Promise<Record<string, unknown>> {
    return step.providers.reduce(async (acc, provider) => {
      const result = await acc;
      const previewProviderHandler = this.previewProvider.bind(this);
      const executeProviderHandler = this.executeProvider.bind(this);
      const handler = payload.action === 'preview' ? previewProviderHandler : executeProviderHandler;

      const providerResult = await handler(payload, step, provider);

      return {
        ...result,
        [provider.type]: providerResult,
      };
    }, Promise.resolve({} as Record<string, unknown>));
  }

  private previewProvider(payload: IEvent, step: DiscoverStepOutput, provider: DiscoverProviderOutput): unknown {
    // eslint-disable-next-line no-console
    console.log(`  ${EMOJI.MOCK} Mocked provider: \`${provider.type}\``);
    const mockOutput = this.mock(provider.outputs.schema);

    return mockOutput;
  }

  private async executeProvider(
    payload: IEvent,
    step: DiscoverStepOutput,
    provider: DiscoverProviderOutput
  ): Promise<unknown> {
    const spinner = ora({ indent: 2 }).start(`Executing provider: \`${provider.type}\``);
    try {
      if (payload.stepId === step.stepId) {
        const input = this.createStepInputs(step, payload);
        const result = await provider.resolve({
          inputs: input,
        });
        this.validate(
          result,
          provider.outputs.validate,
          provider.outputs.schema,
          'step',
          'output',
          payload.workflowId,
          step.stepId,
          provider.type
        );
        spinner.succeed(`Executed provider: \`${provider.type}\``);

        return result;
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
      throw new ProviderExecutionFailedError(`Failed to execute provider: '${provider.type}'.\n${error.message}`);
    }
  }

  private async executeStep(
    event: IEvent,
    step: DiscoverStepOutput
  ): Promise<Pick<ExecuteOutput, 'outputs' | 'providers'>> {
    if (event.stepId === step.stepId) {
      const spinner = ora({ indent: 1 }).start(`Executing stepId: \`${step.stepId}\``);
      try {
        const templateInputs = this.createStepInputs(step, event);
        const inputs = await this.compileInputs(templateInputs, event);
        const result = await step.resolve(inputs);

        this.validate(
          result,
          step.outputs.validate,
          step.outputs.schema,
          'step',
          'output',
          event.workflowId,
          step.stepId
        );

        const providers = await this.executeProviders(event, step);

        spinner.succeed(`Executed stepId: \`${step.stepId}\``);

        return {
          outputs: result,
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
          this.validate(
            result.outputs,
            step.results.validate,
            step.results.schema,
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
            outputs: result.outputs,
            providers: await this.executeProviders(event, step),
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

  private async compileInputs(templateInputs: Record<string, unknown>, event: IEvent) {
    const templateString = this.templateEngine.parse(JSON.stringify(templateInputs));

    const compiledString = await this.templateEngine.render(templateString, {
      ...event.data,
      subscriber: event.subscriber,
    });

    return JSON.parse(compiledString);
  }

  /**
   * Create the inputs for a step, taking both the event inputs and the default inputs into account
   *
   * @param step The step to create the input for
   * @param event The event that triggered the step
   * @returns The input for the step
   */
  private createStepInputs(step: DiscoverStepOutput, event: IEvent): Record<string, unknown> {
    const stepInputs = event.inputs;

    this.validate(stepInputs, step.inputs.validate, step.inputs.schema, 'step', 'input', event.workflowId, step.stepId);

    return stepInputs;
  }

  private async previewStep(
    payload: IEvent,
    step: DiscoverStepOutput
  ): Promise<Pick<ExecuteOutput, 'outputs' | 'providers'>> {
    const spinner = ora({ indent: 1 }).start(`Previewing stepId: \`${step.stepId}\``);
    try {
      if (payload.stepId === step.stepId) {
        const templateInputs = this.createStepInputs(step, payload);
        const inputs = await this.compileInputs(templateInputs, payload);

        const previewOutput = await step.resolve(inputs);
        this.validate(
          previewOutput,
          step.outputs.validate,
          step.outputs.schema,
          'step',
          'output',
          payload.workflowId,
          step.stepId
        );

        spinner.stopAndPersist({
          symbol: EMOJI.MOCK,
          text: `Mocked stepId: \`${step.stepId}\``,
        });

        return {
          outputs: previewOutput,
          providers: await this.executeProviders(payload, step),
        };
      } else {
        // TODO: add capability to mock parts of the step results during preview
        const mockResult = this.mock(step.results.schema);

        spinner.stopAndPersist({
          symbol: EMOJI.MOCK,
          text: `Mocked stepId: \`${step.stepId}\``,
        });

        return {
          outputs: mockResult,
          providers: await this.executeProviders(payload, step),
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
