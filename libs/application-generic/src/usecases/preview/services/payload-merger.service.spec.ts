import { ContextPayload, UserSessionData } from '@novu/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { PayloadMergerService } from './payload-merger.service';

describe('PayloadMergerService', () => {
  let service: PayloadMergerService;

  beforeEach(() => {
    const mockDataGenerator = {
      createFullSubscriberObject: () => ({}),
      createFullActorObject: () => ({}),
    };

    service = new PayloadMergerService(
      mockDataGenerator as never,
      undefined as never, // BuildStepDataUsecase — unused without stepIdOrInternalId
      undefined as never // ControlValuesRepository — unused without stepIdOrInternalId
    );
  });

  const mergeContext = async ({
    extractedContext,
    userContext,
  }: {
    extractedContext?: Record<string, unknown>;
    userContext?: ContextPayload;
  }) => {
    const result = await service.mergePayloadExample({
      payloadExample: { context: extractedContext },
      userPayloadExample: userContext ? { context: userContext } : undefined,
      user: {} as UserSessionData,
    });

    return result.context;
  };

  describe('context resolution', () => {
    it('returns undefined when neither user nor extracted context exists', async () => {
      const context = await mergeContext({});

      expect(context).toBeUndefined();
    });

    it('falls back to context extracted from control values when no user context is provided', async () => {
      const context = await mergeContext({
        extractedContext: { tenant: { data: { companyName: 'companyName' } } },
      });

      expect(context).toEqual({
        tenant: { id: 'example-tenant-id', data: { companyName: 'companyName' } },
      });
    });

    it('keeps user-provided context when nothing is extracted from control values', async () => {
      const context = await mergeContext({
        userContext: { tenant: { id: 'acme', data: { plan: 'pro' } } },
      });

      expect(context).toEqual({ tenant: { id: 'acme', data: { plan: 'pro' } } });
    });

    it('resolves string user context values to { id, data }', async () => {
      const context = await mergeContext({
        userContext: { tenant: 'acme' },
      });

      expect(context).toEqual({ tenant: { id: 'acme', data: {} } });
    });

    it('surfaces newly extracted context fields even when user context already exists', async () => {
      const context = await mergeContext({
        extractedContext: { tenant: { data: { companyName: 'companyName' } } },
        userContext: { tenant: { id: 'acme', data: { plan: 'pro' } } },
      });

      expect(context).toEqual({
        tenant: { id: 'acme', data: { companyName: 'companyName', plan: 'pro' } },
      });
    });

    it('surfaces newly extracted context types alongside existing user context types', async () => {
      const context = await mergeContext({
        extractedContext: { organization: { data: { name: 'name' } } },
        userContext: { tenant: { id: 'acme', data: {} } },
      });

      expect(context).toEqual({
        tenant: { id: 'acme', data: {} },
        organization: { id: 'example-organization-id', data: { name: 'name' } },
      });
    });

    it('prefers user-provided values over extracted example values', async () => {
      const context = await mergeContext({
        extractedContext: { tenant: { data: { plan: 'plan' } } },
        userContext: { tenant: { id: 'acme', data: { plan: 'enterprise' } } },
      });

      expect(context).toEqual({ tenant: { id: 'acme', data: { plan: 'enterprise' } } });
    });
  });
});
