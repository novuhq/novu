import { Client } from './client';
import {
  GetActionEnum,
  HttpHeaderKeysEnum,
  HttpMethodEnum,
  HttpQueryKeysEnum,
  HttpStatusEnum,
  PostActionEnum,
  SIGNATURE_TIMESTAMP_TOLERANCE,
} from './constants';
import {
  BridgeError,
  FrameworkError,
  InvalidActionError,
  isFrameworkError,
  MethodNotAllowedError,
  SignatureExpiredError,
  SignatureInvalidError,
  SignatureMismatchError,
  SignatureNotFoundError,
  SigningKeyNotFoundError,
} from './errors';
import { isPlatformError } from './errors/guard.errors';
import type { Agent, AgentBridgeRequest, MessageContent } from './resources/agent';
import { AgentContextImpl, AgentDeliveryError, AgentEventEnum } from './resources/agent';
import type { Awaitable, EventTriggerParams, Workflow } from './types';
import { createHmacSubtle, initApiClient } from './utils';

export interface ServeHandlerOptions {
  client?: Client;
  workflows?: Array<Workflow>;
  agents?: Array<Agent>;
}

export type INovuRequestHandlerOptions<Input extends any[] = any[], Output = any> = ServeHandlerOptions & {
  frameworkName: string;
  client?: Client;
  workflows?: Array<Workflow>;
  agents?: Array<Agent>;
  handler: Handler<Input, Output>;
};

type Handler<Input extends any[] = any[], Output = any> = (...args: Input) => HandlerResponse<Output>;

type HandlerResponse<Output = any> = {
  body: () => Awaitable<any>;
  headers: (key: string) => Awaitable<string | null | undefined>;
  method: () => Awaitable<string>;
  queryString?: (key: string, url: URL) => Awaitable<string | null | undefined>;
  url: () => Awaitable<URL>;
  transformResponse: (res: IActionResponse<string>) => Output;
  waitUntil?: (promise: Promise<unknown>) => void;
};

export type IActionResponse<TBody extends string = string> = {
  status: number;
  headers: Record<string, string>;
  body: TBody;
};

export class NovuRequestHandler<Input extends any[] = any[], Output = any> {
  public readonly frameworkName: string;

  public readonly handler: Handler<Input, Output>;

  public readonly client: Client;
  private readonly hmacEnabled: boolean;
  private readonly http;
  private readonly workflows: Array<Workflow>;
  private readonly agents: Array<Agent>;

  constructor(options: INovuRequestHandlerOptions<Input, Output>) {
    this.handler = options.handler;
    this.client = options.client ? options.client : new Client();
    this.workflows = options.workflows || [];
    this.agents = options.agents || [];
    this.http = initApiClient(this.client.secretKey, this.client.apiUrl);
    this.frameworkName = options.frameworkName;
    this.hmacEnabled = this.client.strictAuthentication;
    this.client.addAgents(this.agents);
  }

  public createHandler(): (...args: Input) => Promise<Output> {
    return async (...args: Input) => {
      await this.client.addWorkflows(this.workflows);
      const actions = await this.handler(...args);
      const actionResponse = await this.handleAction({
        actions,
      });

      return actions.transformResponse(actionResponse);
    };
  }

  private getStaticHeaders(): Partial<Record<HttpHeaderKeysEnum, string>> {
    const sdkVersion = `novu-framework:v${this.client.version}`;

    return {
      [HttpHeaderKeysEnum.CONTENT_TYPE]: 'application/json',
      [HttpHeaderKeysEnum.ACCESS_CONTROL_ALLOW_ORIGIN]: '*',
      [HttpHeaderKeysEnum.ACCESS_CONTROL_ALLOW_PRIVATE_NETWORK]: 'true',
      [HttpHeaderKeysEnum.ACCESS_CONTROL_ALLOW_METHODS]: 'GET, POST',
      [HttpHeaderKeysEnum.ACCESS_CONTROL_ALLOW_HEADERS]: '*',
      [HttpHeaderKeysEnum.ACCESS_CONTROL_MAX_AGE]: '604800',
      [HttpHeaderKeysEnum.NOVU_FRAMEWORK_VERSION]: FRAMEWORK_VERSION,
      [HttpHeaderKeysEnum.NOVU_FRAMEWORK_SDK]: SDK_VERSION,
      [HttpHeaderKeysEnum.NOVU_FRAMEWORK_SERVER]: this.frameworkName,
      [HttpHeaderKeysEnum.USER_AGENT]: sdkVersion,
    };
  }

  private createResponse<TBody extends string = string>(status: number, body: unknown): IActionResponse<TBody> {
    return {
      status,
      body: JSON.stringify(body) as TBody,
      headers: {
        ...this.getStaticHeaders(),
      },
    };
  }

  private createError<TBody extends string = string>(error: FrameworkError): IActionResponse<TBody> {
    return {
      status: error.statusCode,
      body: JSON.stringify({
        message: error.message,
        data: error.data,
        code: error.code,
      }) as TBody,
      headers: this.getStaticHeaders(),
    };
  }

  private async handleAction({ actions }: { actions: HandlerResponse<Output> }): Promise<IActionResponse> {
    const url = await actions.url();
    const method = await actions.method();
    const action = url.searchParams.get(HttpQueryKeysEnum.ACTION) || GetActionEnum.HEALTH_CHECK;
    const workflowId = url.searchParams.get(HttpQueryKeysEnum.WORKFLOW_ID) || '';
    const stepId = url.searchParams.get(HttpQueryKeysEnum.STEP_ID) || '';
    const agentId = url.searchParams.get(HttpQueryKeysEnum.AGENT_ID) || '';
    const agentEvent = url.searchParams.get(HttpQueryKeysEnum.EVENT) || '';
    const signatureHeader = (await actions.headers(HttpHeaderKeysEnum.NOVU_SIGNATURE)) || '';

    let body: Record<string, unknown> = {};
    try {
      if (method === HttpMethodEnum.POST) {
        body = await actions.body();
      }
    } catch (error) {
      // NO-OP - body was not provided
    }

    try {
      if (action !== GetActionEnum.HEALTH_CHECK) {
        await this.validateHmac(body, signatureHeader);
      }

      const postActionMap = this.getPostActionMap(
        body,
        workflowId,
        stepId,
        action,
        agentId,
        agentEvent,
        actions.waitUntil
      );
      const getActionMap = this.getGetActionMap(workflowId, stepId);

      if (method === HttpMethodEnum.POST) {
        return await this.handlePostAction(action, postActionMap);
      }

      if (method === HttpMethodEnum.GET) {
        return await this.handleGetAction(action, getActionMap);
      }

      if (method === HttpMethodEnum.OPTIONS) {
        return this.createResponse(HttpStatusEnum.OK, {});
      }
    } catch (error) {
      return this.handleError(error);
    }

    return this.createError(new MethodNotAllowedError(method));
  }

  private getPostActionMap(
    // TODO: add validation for body per action.
    body: any,
    workflowId: string,
    stepId: string,
    action: string,
    agentId: string,
    agentEvent: string,
    waitUntil?: (promise: Promise<unknown>) => void
  ): Record<PostActionEnum, () => Promise<IActionResponse>> {
    return {
      [PostActionEnum.TRIGGER]: this.triggerAction({ workflowId, ...body }),
      [PostActionEnum.EXECUTE]: async () => {
        const result = await this.client.executeWorkflow({
          ...body,
          workflowId,
          stepId,
          action,
        });

        return this.createResponse(HttpStatusEnum.OK, result);
      },
      [PostActionEnum.PREVIEW]: async () => {
        const result = await this.client.executeWorkflow({
          ...body,
          workflowId,
          stepId,
          action,
        });

        return this.createResponse(HttpStatusEnum.OK, result);
      },
      [PostActionEnum.AGENT_EVENT]: async () => {
        const registeredAgent = this.client.getAgent(agentId);

        if (!registeredAgent) {
          return this.createResponse(HttpStatusEnum.NOT_FOUND, { error: `Agent '${agentId}' not registered` });
        }

        const ctx = new AgentContextImpl(body as AgentBridgeRequest, this.client.secretKey);

        const handlerPromise = this.runAgentHandler(registeredAgent, agentEvent, ctx).catch((err) => {
          if (err instanceof AgentDeliveryError) {
            console.error(`[agent:${agentId}] ${err.message}`);
          } else {
            console.error(`[agent:${agentId}] Handler error:`, err);
          }
        });

        if (waitUntil) {
          waitUntil(handlerPromise);
        }

        return this.createResponse(HttpStatusEnum.OK, { status: 'ack' });
      },
    };
  }

  public triggerAction(triggerEvent: EventTriggerParams) {
    return async () => {
      const requestPayload = {
        name: triggerEvent.workflowId,
        to: triggerEvent.to,
        payload: triggerEvent?.payload || {},
        transactionId: triggerEvent.transactionId,
        overrides: triggerEvent.overrides || {},
        ...(triggerEvent.actor && { actor: triggerEvent.actor }),
        ...(triggerEvent.bridgeUrl && { bridgeUrl: triggerEvent.bridgeUrl }),
        ...(triggerEvent.controls && { controls: triggerEvent.controls }),
        ...(triggerEvent.context && { context: triggerEvent.context }),
      };

      const result = await this.http.post('/events/trigger', requestPayload);

      return this.createResponse(HttpStatusEnum.OK, result);
    };
  }

  private getGetActionMap(workflowId: string, stepId: string): Record<GetActionEnum, () => Promise<IActionResponse>> {
    return {
      [GetActionEnum.DISCOVER]: async () => {
        const result = await this.client.discover();

        return this.createResponse(HttpStatusEnum.OK, result);
      },
      [GetActionEnum.HEALTH_CHECK]: async () => {
        const result = await this.client.healthCheck();

        return this.createResponse(HttpStatusEnum.OK, result);
      },
      [GetActionEnum.CODE]: async () => {
        const result = await this.client.getCode(workflowId, stepId);

        return this.createResponse(HttpStatusEnum.OK, result);
      },
    };
  }

  private async handlePostAction(
    action: string,
    postActionMap: Record<PostActionEnum, () => Promise<IActionResponse>>
  ): Promise<IActionResponse> {
    if (Object.values(PostActionEnum).includes(action as PostActionEnum)) {
      const actionFunction = postActionMap[action as PostActionEnum];

      return actionFunction();
    } else {
      throw new InvalidActionError(action, PostActionEnum);
    }
  }

  private async handleGetAction(
    action: string,
    getActionMap: Record<GetActionEnum, () => Promise<IActionResponse>>
  ): Promise<IActionResponse> {
    if (Object.values(GetActionEnum).includes(action as GetActionEnum)) {
      const actionFunction = getActionMap[action as GetActionEnum];

      return actionFunction();
    } else {
      throw new InvalidActionError(action, GetActionEnum);
    }
  }

  private async runAgentHandler(registeredAgent: Agent, event: string, ctx: AgentContextImpl): Promise<void> {
    const handlerMap: Partial<Record<AgentEventEnum, (ctx: AgentContextImpl) => Awaitable<MessageContent | void>>> = {
      [AgentEventEnum.ON_MESSAGE]: registeredAgent.handlers.onMessage,
      [AgentEventEnum.ON_REACTION]: registeredAgent.handlers.onReaction,
      [AgentEventEnum.ON_ACTION]: registeredAgent.handlers.onAction,
      [AgentEventEnum.ON_RESOLVE]: registeredAgent.handlers.onResolve,
    };

    if (!Object.prototype.hasOwnProperty.call(handlerMap, event)) {
      throw new InvalidActionError(event, AgentEventEnum);
    }

    const handler = handlerMap[event as AgentEventEnum];
    if (handler) {
      const result = await handler(ctx);
      if (result != null) await ctx.reply(result);
    }

    await ctx.flush();
  }

  private handleError(error: unknown): IActionResponse {
    if (isFrameworkError(error)) {
      if (error.statusCode >= 500) {
        /*
         * Log bridge server errors to assist the Developer in debugging errors with their integration.
         * This path is reached when the Bridge application throws an error, ensuring they can see the error in their logs.
         */
        console.error(error);
      }

      return this.createError(error);
    } else if (isPlatformError(error)) {
      return this.createError(error);
    } else {
      const bridgeError = new BridgeError(error);
      console.error(bridgeError);

      return this.createError(bridgeError);
    }
  }

  private async validateHmac(payload: unknown, hmacHeader: string | null): Promise<void> {
    if (!this.hmacEnabled) return;
    if (!hmacHeader) {
      throw new SignatureNotFoundError();
    }

    if (!this.client.secretKey) {
      throw new SigningKeyNotFoundError();
    }

    const [timestampPart, signaturePart] = hmacHeader.split(',');
    if (!timestampPart || !signaturePart) {
      throw new SignatureInvalidError();
    }

    const [timestamp, timestampPayload] = timestampPart.split('=');

    const [signatureVersion, signaturePayload] = signaturePart.split('=');

    if (Number(timestamp) < Date.now() - SIGNATURE_TIMESTAMP_TOLERANCE) {
      throw new SignatureExpiredError();
    }

    const localHash = await createHmacSubtle(this.client.secretKey, `${timestampPayload}.${JSON.stringify(payload)}`);

    const isMatching = localHash === signaturePayload;

    if (!isMatching) {
      throw new SignatureMismatchError();
    }
  }
}
