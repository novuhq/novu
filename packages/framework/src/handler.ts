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
import type { Agent } from './resources/agent';
import type { AgentBridgeRequest } from './resources/agent/agent.types';
import { dispatchAgentEvent } from './resources/agent/agent-dispatch';
import type { Awaitable, EventTriggerParams, Workflow } from './types';
import { createHmacSubtle, initApiClient, timingSafeEqual } from './utils';
import { parseSignatureHeader } from './utils/bridge-signature';

export interface ServeHandlerOptions {
  client?: Client;
  workflows?: Array<Workflow>;
  agents?: Array<Agent>;
  /**
   * Extends the lifetime of the request handler until the given promise settles.
   *
   * Agent events are acknowledged immediately while the turn (LLM calls, replies,
   * tool use) continues in the background. On serverless platforms the runtime is
   * frozen as soon as the response is sent, so the background work is silently
   * dropped unless a platform `waitUntil` primitive is provided.
   *
   * The Next.js adapter (on Next.js >= 15.1) and the Hono adapter (on Cloudflare
   * Workers) wire this automatically. Provide it explicitly for other serverless
   * platforms, or to override the automatic detection.
   *
   * @example Cloudflare Workers (without Hono)
   * ```ts
   * export default {
   *   async fetch(request, env, ctx) {
   *     const handler = serve({ agents: [myAgent], waitUntil: (promise) => ctx.waitUntil(promise) });
   *
   *     return handler(request);
   *   },
   * };
   * ```
   */
  waitUntil?: (promise: Promise<unknown>) => void;
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
  private readonly waitUntil?: (promise: Promise<unknown>) => void;

  constructor(options: INovuRequestHandlerOptions<Input, Output>) {
    this.handler = options.handler;
    this.client = options.client ? options.client : new Client();
    this.workflows = options.workflows || [];
    this.agents = options.agents || [];
    this.http = initApiClient(this.client.secretKey, this.client.apiUrl);
    this.frameworkName = options.frameworkName;
    this.hmacEnabled = this.client.strictAuthentication;
    this.waitUntil = options.waitUntil;
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
        // An explicitly provided `waitUntil` overrides the adapter's automatic detection.
        this.waitUntil ?? actions.waitUntil
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

        const handlerPromise = dispatchAgentEvent({
          agent: registeredAgent,
          event: agentEvent,
          bridge: body as AgentBridgeRequest,
          secretKey: this.client.secretKey,
          logger: this.client.logger,
        });

        if (waitUntil) {
          waitUntil(handlerPromise);
        } else {
          this.warnOnUnprotectedServerlessRuntime(agentId);
        }

        return this.createResponse(HttpStatusEnum.OK, { status: 'ack' });
      },
    };
  }

  /**
   * Agent events are acknowledged immediately and the turn continues in the
   * background. On serverless platforms the runtime freezes once the response
   * is sent, so without a `waitUntil` primitive the turn is silently dropped
   * mid-flight. Detecting the known freeze-prone platforms lets us surface an
   * actionable warning instead of logs that just stop with no error.
   */
  private warnOnUnprotectedServerlessRuntime(agentId: string): void {
    let detectedPlatform: string | undefined;

    try {
      if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
        detectedPlatform = 'AWS Lambda';
      } else if (process.env.VERCEL) {
        detectedPlatform = 'Vercel';
      }
    } catch {
      // `process` is unavailable on some edge runtimes.
    }

    if (!detectedPlatform) {
      return;
    }

    this.client.logger.warn(
      `[agent:${agentId}] Agent event acknowledged without a \`waitUntil\` primitive while running on ${detectedPlatform}. ` +
        `The runtime may freeze once the response is sent, silently dropping the rest of the agent turn. ` +
        `Pass \`waitUntil\` to \`serve()\` (e.g. \`serve({ agents, waitUntil })\`) to extend the invocation lifetime.`
    );
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

  private handleError(error: unknown): IActionResponse {
    if (isFrameworkError(error)) {
      if (error.statusCode >= 500) {
        /*
         * Log bridge server errors to assist the Developer in debugging errors with their integration.
         * This path is reached when the Bridge application throws an error, ensuring they can see the error in their logs.
         */
        this.client.logger.error(error);
      }

      return this.createError(error);
    } else if (isPlatformError(error)) {
      return this.createError(error);
    } else {
      const bridgeError = new BridgeError(error);
      this.client.logger.error(bridgeError);

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

    const parsed = parseSignatureHeader(hmacHeader);
    if (!parsed.v1 || parsed.t === undefined) {
      throw new SignatureInvalidError();
    }

    const now = Date.now();
    if (parsed.t < now - SIGNATURE_TIMESTAMP_TOLERANCE || parsed.t > now + SIGNATURE_TIMESTAMP_TOLERANCE) {
      throw new SignatureExpiredError();
    }

    const localHash = await createHmacSubtle(this.client.secretKey, `${parsed.t}.${JSON.stringify(payload)}`);

    if (!timingSafeEqual(localHash, parsed.v1)) {
      throw new SignatureMismatchError();
    }
  }
}
