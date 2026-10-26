import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import {
  type AgentInboxHttpMethod,
  type AgentInboxRoute,
  type AgentInboxRouteAuth,
  assertNovuDocumentOmitsHumanRoutes,
  projectAgentInboxOpenApi,
} from './src/app/shared/framework/swagger/agent-inbox-openapi';
import { includeProxiedHandlers, routeKey } from './src/app/shared/framework/swagger/include-agent-inbox-controllers';
import { injectDocumentComponents } from './src/app/shared/framework/swagger/injection';
import { readProxyRoutes } from './src/app/shared/framework/swagger/read-proxy-routes';
import { bootstrap } from './src/bootstrap';

const OUTPUT_DIRECTORY = resolve(__dirname, '../human-dashboard/public');
const JSON_PATH = resolve(OUTPUT_DIRECTORY, 'openapi.json');
const YAML_PATH = resolve(OUTPUT_DIRECTORY, 'openapi.yaml');

const load = createRequire(require.resolve('@nestjs/swagger/package.json'));
const yaml = load('js-yaml') as {
  dump: (document: unknown, options?: { noRefs?: boolean; lineWidth?: number }) => string;
};

async function exportAgentInboxOpenAPI() {
  let exitCode = 0;
  process.env.LOCAL_SWAGGER_GENERATION = 'true';
  const { app, document } = await bootstrap({ internalSdkGeneration: true });

  try {
    assertNovuDocumentOmitsHumanRoutes(document);

    const routes = agentInboxRoutes();
    const authByRoute = includeProxiedHandlers(app, routes);
    const source = injectDocumentComponents(
      SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('Agent Inbox').setVersion('0').build(), {
        operationIdFactory: (controllerKey: string, methodKey: string) => `${controllerKey}_${methodKey}`,
        deepScanRoutes: true,
        ignoreGlobalPrefix: false,
        include: [],
      })
    );
    const spec = projectAgentInboxOpenApi({
      document: source,
      routes: withAuth(routes, authByRoute),
      version: readDashboardVersion(),
    });
    const json = `${JSON.stringify(spec, null, 2)}\n`;
    const yamlDocument = dumpYaml(spec);
    if (process.argv.includes('--check')) {
      assertCurrent(json, yamlDocument);
      console.log('Agent Inbox OpenAPI is up to date');
    } else {
      writeFileSync(JSON_PATH, json);
      writeFileSync(YAML_PATH, yamlDocument);
      console.log(`Agent Inbox OpenAPI written to ${JSON_PATH} and ${YAML_PATH}`);
    }
  } catch (error) {
    exitCode = 1;
    const detail = error instanceof Error ? (error.stack ?? error.message) : error;
    console.error(detail);
  } finally {
    await app.close();
  }

  process.exit(exitCode);
}

function agentInboxRoutes(): Array<Omit<AgentInboxRoute, 'auth'>> {
  const source = readFileSync(resolve(__dirname, '../human-dashboard/src/lib/api-proxy-routes.ts'), 'utf8');

  return readProxyRoutes(source).map(([method, path, novuPath]) => ({
    method: method.toLowerCase() as AgentInboxHttpMethod,
    path,
    novuPath,
  }));
}

function withAuth(
  routes: Array<Omit<AgentInboxRoute, 'auth'>>,
  authByRoute: Map<string, AgentInboxRouteAuth>
): AgentInboxRoute[] {
  return routes.map((route) => {
    const auth = authByRoute.get(routeKey(route.method, route.novuPath));
    if (!auth) {
      throw new Error(`No auth classification for ${route.method.toUpperCase()} ${route.novuPath}`);
    }

    return { ...route, auth };
  });
}

function readDashboardVersion(): string {
  const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../human-dashboard/package.json'), 'utf8')) as {
    version?: string;
  };
  if (!packageJson.version) {
    throw new Error('apps/human-dashboard/package.json has no version');
  }

  return packageJson.version;
}

function dumpYaml(document: unknown): string {
  const text = yaml.dump(document, { noRefs: true, lineWidth: 120 });

  return text.endsWith('\n') ? text : `${text}\n`;
}

function assertCurrent(json: string, yamlDocument: string) {
  const currentJson = readFileSync(JSON_PATH, 'utf8');
  const currentYaml = readFileSync(YAML_PATH, 'utf8');
  if (currentJson !== json || currentYaml !== yamlDocument) {
    throw new Error('Agent Inbox OpenAPI is stale. Run pnpm --filter @novu/api-service generate:agent-inbox-openapi');
  }
}

void exportAgentInboxOpenAPI().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
