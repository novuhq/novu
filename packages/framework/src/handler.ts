import { createHmac } from 'node:crypto';

import { Client } from './client';
import {
  ErrorCodeEnum,
  GetActionEnum,
  HttpHeaderKeysEnum,
  HttpMethodEnum,
  HttpQueryKeysEnum,
  HttpStatusEnum,
  PostActionEnum,
  SIGNATURE_TIMESTAMP_TOLERANCE,
} from './constants';
import {
  InvalidActionError,
  MethodNotAllowedError,
  NovuError,
  PlatformError,
  SignatureExpiredError,
  SignatureInvalidError,
  SignatureMismatchError,
  SignatureNotFoundError,
  SigningKeyNotFoundError,
} from './errors';
import type { Awaitable, EventTriggerParams, Workflow } from './types';
import { initApiClient } from './utils';
import { FRAMEWORK_VERSION, SDK_VERSION } from './version';

// eslint-disable-next-line @typescript-eslint/naming-convention
export type ServeHandlerOptions = {
  client?: Client;
  workflows: Array<Workflow>;
};

export type INovuRequestHandlerOptions<Input extends any[] = any[], Output = any> = ServeHandlerOptions & {
  frameworkName: string;
  client?: Client;
  workflows: Array<Workflow>;
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

  constructor(options: INovuRequestHandlerOptions<Input, Output>) {
    this.handler = options.handler;
    this.client = options.client ? options.client : new Client();
    this.client.addWorkflows(options.workflows);
    this.http = initApiClient(this.client.secretKey as string);
    this.frameworkName = options.frameworkName;
    this.hmacEnabled = this.client.strictAuthentication;
  }

  public createHandler(): (...args: Input) => Promise<Output> {
    return async (...args: Input) => {
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
      [HttpHeaderKeysEnum.ACCESS_CONTROL_ALLOW_METHODS]: 'GET, POST',
      [HttpHeaderKeysEnum.ACCESS_CONTROL_ALLOW_HEADERS]: '*',
      [HttpHeaderKeysEnum.ACCESS_CONTROL_MAX_AGE]: '604800',
      [HttpHeaderKeysEnum.NOVU_FRAMEWORK_VERSION]: FRAMEWORK_VERSION,
      [HttpHeaderKeysEnum.NOVU_FRAMEWORK_SDK]: SDK_VERSION,
      [HttpHeaderKeysEnum.NOVU_FRAMEWORK_API]: this.frameworkName,
      [HttpHeaderKeysEnum.USER_AGENT]: sdkVersion,
    };
  }

  private createResponse<TBody extends string = string>(status: number, body: any): IActionResponse<TBody> {
    return {
      status,
      body: JSON.stringify(body) as TBody,
      headers: {
        ...this.getStaticHeaders(),
      },
    };
  }

  private createError<TBody extends string = string>(error: NovuError): IActionResponse<TBody> {
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
    const action = url.searchParams.get(HttpQueryKeysEnum.ACTION) || '';
    const workflowId = url.searchParams.get(HttpQueryKeysEnum.WORKFLOW_ID) || '';
    const stepId = url.searchParams.get(HttpQueryKeysEnum.STEP_ID) || '';
    const signatureHeader =
      (await actions.headers(HttpHeaderKeysEnum.NOVU_SIGNATURE)) ||
      (await actions.headers(HttpHeaderKeysEnum.NOVU_SIGNATURE_DEPRECATED)) ||
      '';

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
        this.validateHmac(body, signatureHeader);
      }

      const postActionMap = this.getPostActionMap(body, workflowId, stepId, action);
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
    body: any,
    workflowId: string,
    stepId: string,
    action: string
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
        ...(triggerEvent.tenant && { tenant: triggerEvent.tenant }),
        ...(triggerEvent.bridgeUrl && { bridgeUrl: triggerEvent.bridgeUrl }),
        ...(triggerEvent.controls && { controls: triggerEvent.controls }),
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

  private isClientError(error: unknown): error is NovuError {
    const frameworkThrow = Object.values(ErrorCodeEnum).includes((error as NovuError).code);
    const externalApiThrow = isBadRequest(error);

    return frameworkThrow || externalApiThrow;
  }

  private handleError(error: unknown): IActionResponse {
    if (this.isClientError(error)) {
      if (error.statusCode === HttpStatusEnum.INTERNAL_SERVER_ERROR) {
        // eslint-disable-next-line no-console
        console.error(error);
      }

      return this.createError(error);
    } else {
      // eslint-disable-next-line no-console
      console.error(error);

      return this.createError(new PlatformError());
    }
  }

  private validateHmac(payload: unknown, hmacHeader: string | null): void {
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [signatureVersion, signaturePayload] = signaturePart.split('=');

    if (Number(timestamp) < Date.now() - SIGNATURE_TIMESTAMP_TOLERANCE) {
      throw new SignatureExpiredError();
    }

    const localHash = this.hashHmac(this.client.secretKey as string, `${timestampPayload}.${JSON.stringify(payload)}`);

    const isMatching = localHash === signaturePayload;

    if (!isMatching) {
      throw new SignatureMismatchError();
    }
  }

  private hashHmac(secretKey: string, data: string): string {
    return createHmac('sha256', secretKey).update(data).digest('hex');
  }
}

function isBadRequest(error: unknown) {
  return (error as NovuError)?.statusCode >= 400 && (error as NovuError)?.statusCode < 500;
}
