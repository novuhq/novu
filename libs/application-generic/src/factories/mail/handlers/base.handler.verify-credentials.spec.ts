import { CheckIntegrationResponseEnum, VerifyCredentialsStatusEnum } from '@novu/stateless';
import { describe, expect, it, vi } from 'vitest';
import { MailgunHandler } from './mailgun.handler';
import { MailjetHandler } from './mailjet.handler';
import { PostmarkHandler } from './postmark.handler';
import { ResendHandler } from './resend.handler';

type CheckResult = { success: boolean; message: string; code: CheckIntegrationResponseEnum };

/** Swaps the built provider's `checkIntegration` for a stub, so no request leaves the test. */
function withCheckResult<T extends { getProvider(): unknown }>(handler: T, result: CheckResult | Error): T {
  const provider = handler.getProvider() as { checkIntegration: unknown };
  provider.checkIntegration =
    result instanceof Error ? vi.fn().mockRejectedValue(result) : vi.fn().mockResolvedValue(result);

  return handler;
}

function postmark(result: CheckResult | Error) {
  const handler = new PostmarkHandler();
  handler.buildProvider({ apiKey: 'key' }, 'hello@example.com');

  return withCheckResult(handler, result);
}

describe('BaseEmailHandler.verifyCredentials', () => {
  it('reports valid when the check succeeds', async () => {
    const result = await postmark({
      success: true,
      message: 'ok',
      code: CheckIntegrationResponseEnum.SUCCESS,
    }).verifyCredentials();

    expect(result?.status).toBe(VerifyCredentialsStatusEnum.VALID);
  });

  it('reports invalid for a provider whose BAD_CREDENTIALS means a rejected key', async () => {
    const result = await postmark({
      success: false,
      message: 'Invalid API key',
      code: CheckIntegrationResponseEnum.BAD_CREDENTIALS,
    }).verifyCredentials();

    expect(result?.status).toBe(VerifyCredentialsStatusEnum.INVALID);
  });

  it('treats BAD_CREDENTIALS as inconclusive where the provider also uses it for other errors', async () => {
    const handler = new MailjetHandler();
    handler.buildProvider({ apiKey: 'key', secretKey: 'secret' }, 'hello@example.com');
    withCheckResult(handler, {
      success: false,
      message: 'socket hang up',
      code: CheckIntegrationResponseEnum.BAD_CREDENTIALS,
    });

    const result = await handler.verifyCredentials();

    expect(result?.status).toBe(VerifyCredentialsStatusEnum.INCONCLUSIVE);
  });

  it('never forwards the raw provider error message', async () => {
    const result = await postmark({
      success: false,
      message: 'POST https://api.example.com?token=SECRET failed',
      code: CheckIntegrationResponseEnum.FAILED,
    }).verifyCredentials();

    expect(result?.status).toBe(VerifyCredentialsStatusEnum.INCONCLUSIVE);
    expect(result?.message).not.toContain('SECRET');
  });

  it('reports unreachable when the check throws', async () => {
    const result = await postmark(new Error('ETIMEDOUT')).verifyCredentials();

    expect(result?.status).toBe(VerifyCredentialsStatusEnum.UNREACHABLE);
  });

  it("uses the provider's own read-only check when it has one, and never sends the test email", async () => {
    const handler = new ResendHandler();
    handler.buildProvider({ apiKey: 're_made_up_key' }, 'hello@example.com');
    const provider = handler.getProvider() as unknown as {
      checkIntegration: unknown;
      resendClient: { domains: { list: unknown } };
    };
    const checkIntegration = vi.fn();
    provider.checkIntegration = checkIntegration;
    // The Resend SDK returns a refusal instead of throwing; this is its answer for a made-up key.
    provider.resendClient.domains.list = vi.fn().mockResolvedValue({
      data: null,
      error: { statusCode: 400, name: 'validation_error', message: 'API key is invalid' },
    });

    const result = await handler.verifyCredentials();

    expect(result?.status).toBe(VerifyCredentialsStatusEnum.INVALID);
    expect(checkIntegration).not.toHaveBeenCalled();
  });

  it('is unsupported for providers whose check never calls the provider', async () => {
    const handler = new MailgunHandler();
    handler.buildProvider({ apiKey: 'key', domain: 'example.com', user: 'api' }, 'hello@example.com');

    expect(await handler.verifyCredentials()).toBeNull();
  });
});
