import type { AddressInfo } from 'node:net';
import {
  CanActivate,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Get,
  INestApplication,
  Injectable,
  Post,
  UseGuards,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PinoLogger } from '@novu/application-generic';
import { ApiAuthSchemeEnum } from '@novu/shared';
import bodyParser from 'body-parser';
import { expect } from 'chai';
import sinon from 'sinon';
import { accessLogMiddleware } from './access-log.middleware';

/** Stands in for authentication, leaving the session the real guards leave. */
@Injectable()
class SessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.authScheme = ApiAuthSchemeEnum.BEARER;
    request.user = {
      _id: 'user-id',
      organizationId: 'org-id',
      environmentId: 'env-id',
      scheme: ApiAuthSchemeEnum.BEARER,
    };

    return true;
  }
}

/** Stands in for a guard that runs after authentication, such as the permissions guard. */
@Injectable()
class DenyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (context.switchToHttp().getRequest().headers['x-deny']) {
      throw new ForbiddenException();
    }

    return true;
  }
}

@Controller('environments')
@UseGuards(SessionGuard, DenyGuard)
class EnvironmentsTestController {
  @Get('/:environmentId/api-keys')
  listApiKeys() {
    return [];
  }

  @Post('/')
  create() {
    return {};
  }
}

@Controller('events')
@UseGuards(SessionGuard)
class EventsTestController {
  @Post('/trigger')
  trigger() {
    return { acknowledged: true };
  }
}

@Controller('inbox')
class InboxTestController {
  @Get('/notifications')
  list() {
    return [];
  }
}

@Controller('health-check')
class HealthCheckTestController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}

/*
 * Boots Nest with the URI versioning and the middleware order `bootstrap.ts` uses, for what only a running app can
 * show: what a guard, the router and the body parser leave on a request they reject, with and without an API context
 * path. The real guards are covered by `access-log.e2e.ts`.
 */
describe('Access log in a Nest app', () => {
  // nestjs-pino sets the root logger when the logger module starts, which this app does not import.
  const rootLoggerHolder = PinoLogger as unknown as { root: unknown };
  const originalRootLogger = rootLoggerHolder.root;
  const info = sinon.stub();

  before(() => {
    rootLoggerHolder.root = { info };
  });

  after(() => {
    rootLoggerHolder.root = originalRootLogger;
  });

  for (const versionPrefix of ['v', 'api/v']) {
    describe(`with the "${versionPrefix}" version prefix`, () => {
      const contextPath = versionPrefix.replace(/v$/, '');
      let app: INestApplication;
      let baseUrl: string;

      before(async () => {
        const moduleRef = await Test.createTestingModule({
          controllers: [
            EnvironmentsTestController,
            EventsTestController,
            InboxTestController,
            HealthCheckTestController,
          ],
          providers: [SessionGuard, DenyGuard],
        }).compile();

        app = moduleRef.createNestApplication({ logger: false, bodyParser: false });
        app.enableVersioning({ type: VersioningType.URI, prefix: versionPrefix, defaultVersion: '1' });
        app.use(accessLogMiddleware);
        app.use(bodyParser.json());
        await app.listen(0, '127.0.0.1');

        const { port } = app.getHttpServer().address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${port}/${contextPath}`;
      });

      after(async () => {
        await app?.close();
      });

      beforeEach(() => {
        info.resetHistory();
      });

      async function call(method: string, path: string, headers: Record<string, string> = {}, body?: string) {
        const response = await fetch(`${baseUrl}${path}`, { method, headers, body });
        await response.text();

        return response.status;
      }

      /** The lines written once `count` of them are in. A response reaches its caller before its line is written. */
      async function accessLines(count: number): Promise<Record<string, unknown>[]> {
        for (let attempt = 0; attempt < 400 && info.callCount < count; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 5));
        }

        return info.getCalls().map((logCall) => logCall.args[0]);
      }

      it('keeps the session on a request a later guard rejects', async () => {
        const status = await call('GET', 'v1/environments/env-id/api-keys', { 'x-deny': '1' });
        const [line] = await accessLines(1);

        expect(status).to.equal(403);
        expect(line).to.include({
          route: '/v1/environments/:environmentId/api-keys',
          statusCode: 403,
          organizationId: 'org-id',
          userId: 'user-id',
        });
      });

      it('writes a line for a request that matches no route, without the path', async () => {
        const status = await call('GET', 'v1/does-not-exist/path-secret');
        const [line] = await accessLines(1);

        expect(status).to.equal(404);
        expect(line).to.include({ method: 'GET', statusCode: 404 });
        expect(JSON.stringify(line)).not.to.include('path-secret');
      });

      it('writes a line for a body the parser rejects', async () => {
        const status = await call('POST', 'v1/environments', { 'content-type': 'application/json' }, '{"broken');
        const [line] = await accessLines(1);

        expect(status).to.equal(400);
        expect(line).to.include({ method: 'POST', statusCode: 400 });
      });

      it('writes no line for a trigger or an Inbox call, whatever a query string looks like', async () => {
        expect(await call('POST', 'v1/events/trigger')).to.equal(201);
        expect(await call('GET', 'v1/inbox/notifications')).to.equal(200);
        // Responses close in order, so once this line is in, the two calls above have had their turn.
        expect(await call('GET', 'v1/environments/env-id/api-keys?next=/v1/inbox/')).to.equal(200);
        const lines = await accessLines(1);

        expect(lines.map((line) => line.route)).to.deep.equal(['/v1/environments/:environmentId/api-keys']);
      });

      it('writes no line for a health check, with GET or HEAD', async () => {
        expect(await call('GET', 'v1/health-check')).to.equal(200);
        expect(await call('HEAD', 'v1/health-check')).to.equal(200);
        expect(await call('GET', 'v1/environments/env-id/api-keys')).to.equal(200);
        const lines = await accessLines(1);

        expect(lines.map((line) => line.route)).to.deep.equal(['/v1/environments/:environmentId/api-keys']);
      });
    });
  }
});
