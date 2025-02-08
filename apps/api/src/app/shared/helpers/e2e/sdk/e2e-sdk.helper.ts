import { Novu } from '@novu/api';
import { NovuCore } from '@novu/api/core';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { ErrorDto, ValidationErrorDto } from '@novu/api/models/errors';
import { SDKOptions } from '@novu/api/lib/config';

export function initNovuClassSdk(session: UserSession, shouldRetry: boolean = false): Novu {
  const options: SDKOptions = {
    security: { secretKey: session.apiKey },
    serverURL: session.serverUrl,
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

export function handleSdkError(error: unknown): ErrorDto {
  if (!isErrorDto(error)) {
    throw new Error(`Provided error is not an ErrorDto error found:\n ${JSON.stringify(error, null, 2)}`);
  }
  expect(error.name).to.equal('ErrorDto');

  return error;
}
export function handleValidationErrorDto(error: unknown): ValidationErrorDto {
  if (!isValidationErrorDto(error)) {
    throw new Error(`Provided error is not an ErrorDto error found:\n ${JSON.stringify(error, null, 2)}`);
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
