import { Novu } from '@novu/api';
import { NovuCore } from '@novu/api/core';
import { SDKOptions } from '@novu/api/lib/config';
import { HTTPClient, HTTPClientOptions } from '@novu/api/lib/http';
import { ErrorDto, SDKValidationError, ValidationErrorDto } from '@novu/api/models/errors';
import { HttpRequestHeaderKeysEnum } from '@novu/application-generic';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

export function initNovuClassSdk(session: UserSession, shouldRetry: boolean = false): Novu {
  const options: SDKOptions = {
    security: { secretKey: session.apiKey },
    serverURL: session.serverUrl,
    debugLogger: process.env.LOG_LEVEL === 'debug' ? console : undefined,
  };
  if (!shouldRetry) {
    options.retryConfig = { strategy: 'none' };
  }

  return new Novu(options);
}
export function initNovuClassSdkInternalAuth(session: UserSession, shouldRetry: boolean = false): Novu {
  const options: SDKOptions = {
    security: { bearerAuth: session.token },
    serverURL: session.serverUrl,
    httpClient: new CustomHeaderHTTPClient({
      [HttpRequestHeaderKeysEnum.NOVU_ENVIRONMENT_ID]: session.environment._id,
    }),
    // debugLogger: console,
  };
  if (!shouldRetry) {
    options.retryConfig = { strategy: 'none' };
  }

  return new Novu(options);
}
export function initNovuFunctionSdk(session: UserSession): NovuCore {
  return new NovuCore({ security: { secretKey: session.apiKey }, serverURL: session.serverUrl });
}

function isErrorDto(error: unknown): error is ErrorDto {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'ErrorDto';
}
function isValidationErrorDto(error: unknown): error is ValidationErrorDto {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'ValidationErrorDto';
}

function isSDKValidationError(error: unknown): error is SDKValidationError {
  return (
    error instanceof SDKValidationError &&
    error.name === 'SDKValidationError' &&
    'rawValue' in error &&
    'rawMessage' in error &&
    'cause' in error
  );
}

export function handleSdkError(error: unknown): ErrorDto {
  if (!isErrorDto(error)) {
    throw new Error(`Provided error is not an ErrorDto error found:\n ${JSON.stringify(error, null, 2)}`);
  }
  expect(error.name).to.equal('ErrorDto');

  return error;
}

export function handleSdkZodFailure(error: unknown): SDKValidationError {
  if (!isSDKValidationError(error)) {
    throw new Error(`Provided error is not an ErrorDto error found:\n ${JSON.stringify(error, null, 2)}`);
  }
  expect(error.name).to.equal('SDKValidationError');

  return error;
}
export function handleValidationErrorDto(error: unknown): ValidationErrorDto {
  if (!isValidationErrorDto(error)) {
    throw new Error(`Provided error is not an ValidationErrorDto error found:\n ${JSON.stringify(error, null, 2)}`);
  }
  expect(error.name).to.equal('ValidationErrorDto');
  expect(error.ctx).to.be.ok;

  return error;
}

type AsyncAction<U> = () => Promise<U>;

export async function expectSdkExceptionGeneric<U>(
  action: AsyncAction<U>
): Promise<{ error?: ErrorDto; successfulBody?: U }> {
  try {
    const response = await action();

    return { successfulBody: response };
  } catch (e) {
    return { error: handleSdkError(e) };
  }
}
export async function expectSdkZodError<U>(
  action: AsyncAction<U>
): Promise<{ error?: SDKValidationError; successfulBody?: U }> {
  try {
    const response = await action();

    return { successfulBody: response };
  } catch (e) {
    return { error: handleSdkZodFailure(e) };
  }
}

export async function expectSdkValidationExceptionGeneric<U>(
  action: AsyncAction<U>
): Promise<{ error?: ValidationErrorDto; successfulBody?: U }> {
  try {
    const response = await action();

    return { successfulBody: response };
  } catch (e) {
    return { error: handleValidationErrorDto(e) };
  }
}
export class CustomHeaderHTTPClient extends HTTPClient {
  private defaultHeaders: HeadersInit;

  constructor(defaultHeaders: HeadersInit = {}, options: HTTPClientOptions = {}) {
    super(options);
    this.defaultHeaders = defaultHeaders;
  }

  async request(request: Request): Promise<Response> {
    // Create a new request with merged headers
    const mergedHeaders = new Headers(this.defaultHeaders);

    /*
     * Merge existing request headers with default headers
     * Existing request headers take precedence
     */
    request.headers.forEach((value, key) => {
      mergedHeaders.set(key, value);
    });

    // Create a new request with merged headers
    const modifiedRequest = new Request(request, {
      headers: mergedHeaders,
    });

    // Call the parent class's request method with the modified request
    return super.request(modifiedRequest);
  }
}
