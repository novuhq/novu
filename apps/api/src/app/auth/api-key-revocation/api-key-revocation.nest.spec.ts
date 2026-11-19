import { createHash, randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import {
  CanActivate,
  Controller,
  Delete,
  ExecutionContext,
  Get,
  INestApplication,
  Injectable,
  Post,
  UseGuards,
  VersioningType,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ApiAuthSchemeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { ApiKeyRevocationInterceptor } from './api-key-revocation.interceptor';
import { TRIGGER_ONLY_API_KEY_MESSAGE } from './api-key-revocation.policy';
import { ApiKeyRevocationService } from './api-key-revocation.service';

/** Stands in for authentication, leaving the API key session the real guards leave. */
@Injectable()
class ApiKeySessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest().user = {
      scheme: ApiAuthSchemeEnum.API_KEY,
      organizationId: 'org-id',
      environmentId: 'env-id',
    };

    return true;
  }
}

@Controller('events')
@UseGuards(ApiKeySessionGuard)
class EventsTestController {
  @Post('/trigger')
  trigger() {
    return { acknowledged: true };
  }

  @Delete('/trigger/:transactionId')
  cancel() {
    return { cancelled: true };
  }
}

@Controller('subscribers')
@UseGuards(ApiKeySessionGuard)
class SubscribersTestController {
  @Get('/')
  list() {
    return [];
  }
}

/*
 * Boots Nest with the URI versioning `bootstrap.ts` uses, so the allowed routes are checked against the route
 * patterns Express really reports, with and without an API context path.
 */
describe('API key revocation in a Nest app', () => {
  const oldKey = randomUUID();
  const oldKeyCreatedAt = Math.floor((Date.now() - 48 * 60 * 60 * 1000) / 1000);
  const storedKeys = [
    {
      key: 'encrypted-key',
      _userId: 'user-id',
      hash: createHash('sha256').update(oldKey).digest('hex'),
      _id: `${oldKeyCreatedAt.toString(16).padStart(8, '0')}0000000000000000`,
    },
  ];

  for (const versionPrefix of ['v', 'api/v']) {
    describe(`with the "${versionPrefix}" version prefix`, () => {
      const contextPath = versionPrefix.replace(/v$/, '');
      let app: INestApplication;
      let baseUrl: string;

      before(async () => {
        const service = new ApiKeyRevocationService(
          {
            getFlag: sinon.stub().resolves({
              mode: 'block_except_allowed',
              keysCreatedBefore: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            }),
          } as never,
          { findOne: sinon.stub().resolves({ apiKeys: storedKeys }) } as never,
          { setContext: sinon.stub(), error: sinon.stub() } as never
        );

        const moduleRef = await Test.createTestingModule({
          controllers: [EventsTestController, SubscribersTestController],
          providers: [
            ApiKeySessionGuard,
            { provide: ApiKeyRevocationService, useValue: service },
            { provide: APP_INTERCEPTOR, useClass: ApiKeyRevocationInterceptor },
          ],
        }).compile();

        app = moduleRef.createNestApplication({ logger: false });
        app.enableVersioning({ type: VersioningType.URI, prefix: versionPrefix, defaultVersion: '1' });
        await app.listen(0, '127.0.0.1');

        const { port } = app.getHttpServer().address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${port}/${contextPath}`;
      });

      after(async () => {
        await app?.close();
      });

      const call = (method: string, path: string) =>
        fetch(`${baseUrl}${path}`, { method, headers: { authorization: `ApiKey ${oldKey}` } });

      it('lets an old key trigger a workflow', async () => {
        const response = await call('POST', 'v1/events/trigger');

        expect(response.status).to.equal(201);
      });

      it('lets an old key cancel a triggered event', async () => {
        const response = await call('DELETE', 'v1/events/trigger/transaction-1');

        expect(response.status).to.equal(200);
      });

      it('rejects an old key everywhere else', async () => {
        const response = await call('GET', 'v1/subscribers');
        const body = (await response.json()) as { message?: string };

        expect(response.status).to.equal(401);
        expect(body.message).to.equal(TRIGGER_ONLY_API_KEY_MESSAGE);
      });
    });
  }
});
