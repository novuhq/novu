import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import betterAjvErrors from 'better-ajv-errors';
import { JSONSchema7 } from 'json-schema';
import { JSONSchemaFaker } from 'json-schema-faker';
import { FromSchema } from 'json-schema-to-ts';
import ora from 'ora';

import {
  ChannelStepEnum,
  DEFAULT_NOVU_API_BASE_URL,
  HttpHeaderKeysEnum,
  HttpMethodEnum,
  NovuApiEndpointsEnum,
} from './constants';
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
  StepAlreadyExistsError,
  StepNotFoundError,
  WorkflowAlreadyExistsError,
  WorkflowNotFoundError,
} from './errors';
import {
  channelStepSchemas,
  delayOutputSchema,
  delayResultSchema,
  digestOutputSchema,
  digestResultSchema,
  emptySchema,
  providerSchemas,
} from './schemas';
import {
  ActionStep,
  ClientConfig,
  CodeResult,
  CustomStep,
  DiscoverOutput,
  DiscoverProviderOutput,
  DiscoverStepOutput,
  DiscoverWorkflowOutput,
  Execute,
  ExecuteOutput,
  HealthCheck,
  IEvent,
  StepType,
  Validate,
  WorkflowOptions,
} from './types';
import { Schema } from './types/schema.types';
import { EMOJI, log } from './utils';
import { VERSION } from './version';

JSONSchemaFaker.option({
  useDefaultValue: true,
  alwaysFakeOptionals: true,
});

export class Echo {
  private discoveredWorkflows: Array<DiscoverWorkflowOutput> = [];

  private ajv: Ajv;

  private backendUrl?: string;

  public apiKey?: string;

  public version: string = VERSION;

  public devModeBypassAuthentication: boolean;

  public static NOVU_SIGNATURE_HEADER = HttpHeaderKeysEnum.SIGNATURE;

  constructor(config?: ClientConfig) {
    this.apiKey = config?.apiKey;
    this.backendUrl = config?.backendUrl ?? DEFAULT_NOVU_API_BASE_URL;
    this.devModeBypassAuthentication = config?.devModeBypassAuthentication || false;

    const ajv = new Ajv({ useDefaults: true });
    addFormats(ajv);
    this.ajv = ajv;
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

  /**
   * Define a new notification workflow.
   */
  public async workflow<
    T_PayloadSchema extends Schema,
    T_InputSchema extends Schema,
    T_Payload = FromSchema<T_PayloadSchema>,
    T_Input = FromSchema<T_InputSchema>
  >(
    workflowId: string,
    execute: Execute<T_Payload, T_Input>,
    workflowOptions?: WorkflowOptions<T_PayloadSchema, T_InputSchema>
  ): Promise<void> {
    // TODO: Transparently register the trigger step here
    this.discoverWorkflow(workflowId, execute, workflowOptions);

    await execute({
      payload: {} as T_Payload,
      subscriber: {},
      environment: {},
      input: {} as T_Input,
      step: {
        ...Object.entries(channelStepSchemas).reduce((acc, [channel, schemas]) => {
          acc[channel] = this.discoverStepFactory(
            workflowId,
            channel as ChannelStepEnum,
            schemas.output,
            schemas.result
          );

          return acc;
        }, {} as Record<ChannelStepEnum, ActionStep<any, any>>),
        /*
         * Temporary workaround for inApp, which has snake_case step type
         * TODO: decouple step types from the channel step types
         */
        inApp: this.discoverStepFactory(
          workflowId,
          'in_app',
          channelStepSchemas.in_app.output,
          channelStepSchemas.in_app.result
        ),
        digest: this.discoverStepFactory(workflowId, 'digest', digestOutputSchema, digestResultSchema),
        delay: this.discoverStepFactory(workflowId, 'delay', delayOutputSchema, delayResultSchema),
        /*
         * custom: this.discoverStepFactory(
         *   workflowId,
         *   'custom',
         *   customOutputResultSchema,
         *   customOutputResultSchema,
         * ),
         */

        /*
         * async custom(outputSchema: Schema) {
         *   this.discoverStepFactory(
         *     workflowId,
         *     'custom',
         *     outputSchema,
         *     outputSchema,
         *   );
         *   return undefined as any;
         * },
         */

        custom: this.discoverCustomStepFactory(workflowId, 'custom'),
      },
    });

    this.prettyPrintDiscovery(workflowId);
  }

  private prettyPrintDiscovery(workflowId: string): void {
    const workflow = this.getWorkflow(workflowId);

    // eslint-disable-next-line no-console
    console.log(`\n${log.bold(log.underline('Discovered workflowId:'))} '${workflowId}'`);
    workflow.steps.forEach((step, i) => {
      const prefix = i === workflow.steps.length - 1 ? '└' : '├';
      // eslint-disable-next-line no-console
      console.log(`${prefix} ${EMOJI.STEP} Discovered stepId: '${step.stepId}'\tType: '${step.type}'`);
      step.providers.forEach((provider, providerIndex) => {
        const providerPrefix = providerIndex === step.providers.length - 1 ? '└' : '├';
        // eslint-disable-next-line no-console
        console.log(`  ${providerPrefix} ${EMOJI.PROVIDER} Discovered provider: '${provider.type}'`);
      });
    });
  }

  private discoverStepFactory<T, U>(
    workflowId: string,
    type: StepType,
    outputSchema: Schema,
    resultSchema: Schema
  ): ActionStep<T, U> {
    return async (stepId, resolve, options = {}) => {
      const inputSchema = options?.inputSchema || emptySchema;

      this.discoverStep(workflowId, stepId, {
        stepId,
        type,
        inputs: {
          schema: inputSchema,
          validate: this.ajv.compile(inputSchema),
        },
        outputs: {
          schema: outputSchema,
          validate: this.ajv.compile(outputSchema),
        },
        results: {
          schema: resultSchema,
          validate: this.ajv.compile(resultSchema),
        },
        resolve,
        code: resolve.toString(),
        options,
        providers: [],
      });

      if (Object.keys(options.providers || {}).length > 0) {
        this.discoverProviders(workflowId, stepId, type, options.providers || {});
      }

      return undefined as any;
    };
  }

  private discoverCustomStepFactory(workflowId: string, type: StepType): CustomStep {
    return async (stepId, resolve, options = {}) => {
      const inputSchema = options?.inputSchema || emptySchema;
      const outputSchema = options?.outputSchema || emptySchema;

      this.discoverStep(workflowId, stepId, {
        stepId,
        type,
        inputs: {
          schema: inputSchema,
          validate: this.ajv.compile(inputSchema),
        },
        outputs: {
          schema: outputSchema,
          validate: this.ajv.compile(outputSchema),
        },
        results: {
          schema: outputSchema,
          validate: this.ajv.compile(outputSchema),
        },
        resolve,
        code: resolve.toString(),
        options,
        providers: [],
      });

      return undefined as any;
    };
  }

  private discoverProviders(
    workflowId: string,
    stepId: string,
    channelType: string,
    providers: Record<string, (payload: unknown) => unknown | Promise<unknown>>
  ): void {
    const step = this.getStep(workflowId, stepId);
    const channelSchemas = providerSchemas[channelType];

    Object.entries(providers).forEach(([type, resolve]) => {
      const schemas = channelSchemas[type];
      step.providers.push({
        type,
        code: resolve.toString(),
        resolve,
        outputs: {
          schema: schemas.output,
          validate: this.ajv.compile(schemas.output),
        },
      });
    });
  }

  private discoverWorkflow(
    workflowId: string,
    execute: Execute<unknown, unknown>,
    options: WorkflowOptions<unknown, unknown> = {}
  ): void {
    if (this.discoveredWorkflows.some((workflow) => workflow.workflowId === workflowId)) {
      throw new WorkflowAlreadyExistsError(workflowId);
    } else {
      this.discoveredWorkflows.push({
        workflowId,
        options,
        steps: [],
        code: execute.toString(),
        data: {
          schema: options.payloadSchema || emptySchema,
          validate: this.ajv.compile(options.payloadSchema || emptySchema),
        },
        inputs: {
          schema: options.inputSchema || emptySchema,
          validate: this.ajv.compile(options.inputSchema || emptySchema),
        },
        execute,
      });
    }
  }

  private discoverStep(workflowId: string, stepId: string, step: DiscoverStepOutput): void {
    if (this.getWorkflow(workflowId).steps.some((workflowStep) => workflowStep.stepId === stepId)) {
      throw new StepAlreadyExistsError(stepId);
    } else {
      const workflow = this.getWorkflow(workflowId);
      workflow.steps.push(step);
    }
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

  public async diff(echoUrl: string, anonymous?: string): Promise<unknown> {
    const workflows = this.discover()?.workflows || [];

    const workflowsResponse = await fetch(this.backendUrl + NovuApiEndpointsEnum.DIFF, {
      method: HttpMethodEnum.POST,
      headers: this.getHeaders(anonymous),
      body: JSON.stringify({ workflows, chimeraUrl: echoUrl }),
    });

    return workflowsResponse.json();
  }

  public async sync(echoUrl: string, anonymous?: string, source?: string): Promise<unknown> {
    const { workflows } = this.discover();

    const workflowsResponse = await fetch(`${this.backendUrl}${NovuApiEndpointsEnum.SYNC}?source=${source || 'sdk'}`, {
      method: HttpMethodEnum.POST,
      headers: this.getHeaders(anonymous),
      body: JSON.stringify({ workflows, chimeraUrl: echoUrl }),
    });

    return workflowsResponse.json();
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

      const previewStepHandler = this.previewStep.bind(this);
      const executeStepHandler = this.executeStep.bind(this);
      const handler = event.action === 'preview' ? previewStepHandler : executeStepHandler;

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
    } = {
      outputs: {},
      providers: {},
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
        const result = await provider.resolve(input);
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
        const input = this.createStepInputs(step, event);
        const result = await step.resolve(input);
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
        const input = this.createStepInputs(step, payload);
        const previewOutput = await step.resolve(input);
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
