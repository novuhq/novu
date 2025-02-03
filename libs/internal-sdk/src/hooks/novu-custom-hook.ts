import {RequestInput} from "../lib/http.js";
import {
    AfterSuccessContext,
    AfterSuccessHook,
    BeforeCreateRequestHook,
    BeforeRequestContext,
    BeforeRequestHook,
    HookContext
} from "./types.js";

export class NovuCustomHook
    implements BeforeRequestHook, AfterSuccessHook, BeforeCreateRequestHook {
    beforeCreateRequest(_hookCtx: HookContext, input: RequestInput): RequestInput {
        const idempotencyKey = 'idempotency-key';
        const headers = input.options?.headers
        if (!headers) {
            return input
        }
        const updatedHeaders = this.updateHeaderValue(headers, idempotencyKey, this.generateIdempotencyKey)

        return {...input, options: {...input.options, headers: updatedHeaders}}
    }

    beforeRequest(_hookCtx: BeforeRequestContext, request: Request): Request {
        const authKey = 'authorization';
        const hasAuthorization = request.headers.has(authKey);
        const apiKeyPrefix = 'ApiKey';
        if (hasAuthorization) {
            const key = request.headers.get(authKey);

            if (key && !key.includes(apiKeyPrefix)) {
                request.headers.set(authKey, `${apiKeyPrefix} ${key}`)
            }
        }

        return request;
    }

    private generateIdempotencyKey(): string {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substr(2, 9); // Generates a random alphanumeric string
        return `${timestamp}${randomString}`.trim(); // Trim any potential whitespace
    }

    async afterSuccess(_hookCtx: AfterSuccessContext, response: Response): Promise<Response> {
        const responseAsText = await response.clone().text();
        const contentType = response.headers.get('content-type') || '';
        if (!responseAsText || responseAsText == '' || contentType.includes('text/html')) {
            return response;
        }
        const jsonResponse = await response.clone().json();

        if (jsonResponse && Object.keys(jsonResponse).length === 1 && 'data' in jsonResponse) {
            return new Response(JSON.stringify(jsonResponse.data), {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
            }); // Return the new Response object
        }

        return response;
    }

    private updateHeaderValue(
        headers: HeadersInit,
        key: string,
        defaultValueFunction: () => string
    ): Record<string, string> {
        const headersRecord = this.convertToRecord(headers);

        if (!(key in headersRecord) || headersRecord[key] == '') {
            headersRecord[key] = defaultValueFunction();
        }

        return headersRecord;
    }

    private convertToRecord(headers: HeadersInit): Record<string, string> {
        if (Array.isArray(headers)) {
            return Object.fromEntries(headers);
        } else if (headers instanceof Headers) {
            return Object.fromEntries(headers.entries());
        } else {
            return {...headers};
        }
    }
}
