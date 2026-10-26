import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { OpenAPIObject } from '@nestjs/swagger';
import { expect } from 'chai';
import {
  AGENT_INBOX_API_KEY_SCHEME,
  AGENT_INBOX_KEYLESS_SCHEME,
  AGENT_INBOX_OPENAPI_TITLE,
  AGENT_INBOX_SERVER_URL,
  type AgentInboxRoute,
  novuDocumentIncludesHumanRoutes,
  projectAgentInboxOpenApi,
} from './agent-inbox-openapi';
import { classifyHandlerAuth } from './include-agent-inbox-controllers';
import { readProxyRoutes } from './read-proxy-routes';

const API_SECURITY = 'swagger/apiSecurity';
const KEYLESS_ACCESSIBLE = 'keyless_accessible';

describe('Agent Inbox OpenAPI projection', () => {
  const document = sourceDocument();

  it('rewrites proxy paths and prefers a parameter over a static sibling', () => {
    const projected = projectAgentInboxOpenApi({
      document,
      version: '0.1.0',
      routes: [
        route('get', '/v1/inbox', '/v1/human/inbox', 'apiKeyOrKeyless'),
        route('get', '/v1/inbox/:conversationId', '/v1/human/inbox/:conversationId', 'apiKeyOrKeyless'),
        route('post', '/v1/inbox/messages', '/v1/human/interactions', 'apiKeyOrKeyless'),
      ],
    });

    expect(projected.info.title).to.equal(AGENT_INBOX_OPENAPI_TITLE);
    expect(projected.info.version).to.equal('0.1.0');
    expect(projected.servers?.[0]?.url).to.equal(AGENT_INBOX_SERVER_URL);
    expect(projected.paths['/v1/human/inbox/counts']).to.equal(undefined);
    expect(projected.paths['/v1/inbox']?.get?.operationId).to.equal('listInbox');
    expect(projected.paths['/v1/inbox/messages']?.post?.operationId).to.equal('sendMessage');
    expect(projected.paths['/v1/inbox/{conversationId}']?.get?.operationId).to.equal('getThread');

    const threadParameters = projected.paths['/v1/inbox/{conversationId}']?.get?.parameters ?? [];
    const conversationId = threadParameters.find((parameter) => parameter.name === 'conversationId');
    expect(conversationId?.in).to.equal('path');
    expect(threadParameters.some((parameter) => parameter.name === 'identifier')).to.equal(false);
  });

  it('moves agentIdentifier from the Novu path onto the query', () => {
    const projected = projectAgentInboxOpenApi({
      document,
      version: '0.1.0',
      routes: [route('get', '/v1/channels', '/v1/agents/:agentIdentifier/integrations', 'apiKeyOrKeyless')],
    });

    const parameters = projected.paths['/v1/channels']?.get?.parameters ?? [];
    const agentIdentifier = parameters.find((parameter) => parameter.name === 'agentIdentifier');
    expect(agentIdentifier?.in).to.equal('query');
    expect(agentIdentifier?.required).to.equal(false);
    expect(parameters.some((parameter) => parameter.in === 'path')).to.equal(false);
    expect(projected.paths['/v1/channels']?.get?.['x-speakeasy-name-override']).to.equal(undefined);
    expect(projected['x-speakeasy-retries']).to.equal(undefined);
  });

  it('documents api key and keyless security, and leaves public routes open', () => {
    const projected = projectAgentInboxOpenApi({
      document,
      version: '0.1.0',
      routes: [
        route('get', '/v1/inbox', '/v1/human/inbox', 'apiKeyOrKeyless'),
        route('put', '/v1/agent/picture', '/v1/human/agent/picture', 'apiKey'),
        route('post', '/v1/login', '/v1/cli/device-sessions', 'public'),
      ],
    });

    expect(projected.paths['/v1/inbox']?.get?.security).to.deep.equal([
      { [AGENT_INBOX_API_KEY_SCHEME]: [] },
      { [AGENT_INBOX_KEYLESS_SCHEME]: [] },
    ]);
    const inboxParameters = projected.paths['/v1/inbox']?.get?.parameters ?? [];
    expect(inboxParameters.some((parameter) => parameter.name === 'Novu-Application-Identifier')).to.equal(true);
    expect(projected.paths['/v1/agent/picture']?.put?.security).to.deep.equal([{ [AGENT_INBOX_API_KEY_SCHEME]: [] }]);
    expect(projected.paths['/v1/login']?.post?.security).to.deep.equal([]);
    expect(projected.components?.securitySchemes?.[AGENT_INBOX_API_KEY_SCHEME]).to.include({
      type: 'apiKey',
      in: 'header',
      name: 'Authorization',
    });
  });

  it('keeps schemas that are referenced indirectly and drops the rest', () => {
    const projected = projectAgentInboxOpenApi({
      document,
      version: '0.1.0',
      routes: [route('get', '/v1/inbox', '/v1/human/inbox', 'apiKey')],
    });

    expect(projected.components?.schemas?.InboxPage).to.not.equal(undefined);
    expect(projected.components?.schemas?.Thread).to.not.equal(undefined);
    expect(projected.components?.schemas?.Channels).to.equal(undefined);
    expect(projected.components?.schemas?.Unused).to.equal(undefined);
  });

  it('matches the response body ResponseInterceptor returns', () => {
    const projected = projectAgentInboxOpenApi({
      document: {
        ...document,
        paths: {
          ...document.paths,
          '/v1/human/agent': {
            get: {
              operationId: 'getAgent',
              responses: {
                '200': {
                  description: 'agent',
                  content: { 'application/json': { schema: { $ref: '#/components/schemas/Agent' } } },
                },
              },
            },
          },
          '/v1/agents/{identifier}/integrations': {
            get: {
              operationId: 'listChannels',
              parameters: [{ name: 'identifier', in: 'path', required: true, schema: { type: 'string' } }],
              responses: {
                '200': {
                  description: 'channels',
                  headers: { 'Content-Type': { $ref: '#/components/headers/Content-Type' } },
                  content: {
                    'application/json': {
                      schema: { properties: { data: { $ref: '#/components/schemas/ChannelPage' } } },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            ...document.components?.schemas,
            Agent: { type: 'object', properties: { agentId: { type: 'string' } } },
            ChannelPage: {
              type: 'object',
              properties: { data: { type: 'array', items: { type: 'object' } }, next: { type: 'string' } },
            },
          },
          headers: { 'Content-Type': { schema: { type: 'string' } } },
        },
      },
      version: '0.1.0',
      routes: [
        route('get', '/v1/agent', '/v1/human/agent', 'apiKey'),
        route('get', '/v1/channels', '/v1/agents/:agentIdentifier/integrations', 'apiKey'),
        route('get', '/v1/contacts', '/v1/human/inbox', 'apiKey'),
      ],
    });

    expect(projected.paths['/v1/agent']?.get?.responses?.['200']).to.deep.include({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['data'],
            properties: { data: { $ref: '#/components/schemas/Agent' } },
          },
        },
      },
    });
    expect(projected.paths['/v1/channels']?.get?.responses?.['200']).to.deep.include({
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ChannelPage' } } },
    });
    expect(projected.paths['/v1/contacts']?.get?.responses?.['200']).to.deep.include({
      content: { 'application/json': { schema: { $ref: '#/components/schemas/InboxPage' } } },
    });
    expect(projected.components?.headers?.['Content-Type']).to.deep.equal({ schema: { type: 'string' } });
    expect(projected.components?.schemas?.Agent).to.not.equal(undefined);
    expect(projected.components?.schemas?.ChannelPage).to.not.equal(undefined);
  });

  it('fails when a proxy route has no operation or two routes claim one public operation', () => {
    expect(() =>
      projectAgentInboxOpenApi({
        document,
        version: '0.1.0',
        routes: [route('delete', '/v1/inbox', '/v1/human/inbox', 'apiKey')],
      })
    ).to.throw(/No DELETE operation/);

    expect(() =>
      projectAgentInboxOpenApi({
        document,
        version: '0.1.0',
        routes: [
          route('get', '/v1/inbox', '/v1/human/inbox', 'apiKey'),
          route('get', '/v1/inbox', '/v1/human/inbox/counts', 'apiKey'),
        ],
      })
    ).to.throw(/same public operation/);
  });

  it('does not treat a Novu document description as a human route', () => {
    expect(novuDocumentIncludesHumanRoutes(document)).to.equal(true);
    expect(
      novuDocumentIncludesHumanRoutes({
        ...document,
        paths: { '/v1/subscribers': { get: { responses: { '200': { description: 'A human subscriber' } } } } },
      })
    ).to.equal(false);
  });
});

describe('Agent Inbox proxy route reader', () => {
  const routes = readProxyRoutes(
    readFileSync(resolve(process.cwd(), '../human-dashboard/src/lib/api-proxy-routes.ts'), 'utf8')
  );

  it('reads every route in the dashboard proxy table, including a route split across lines', () => {
    expect(routes).to.deep.include(['GET', '/v1/inbox', '/v1/human/inbox']);
    expect(routes).to.deep.include([
      'POST',
      '/v1/channels/apps/:appId/slack-setup-link',
      '/v1/agents/:agentIdentifier/integrations/:appId/slack/setup-link',
    ]);
    expect(routes.some(([method, path]) => method === 'GET' && path === '/v1/human/inbox/counts')).to.equal(false);
  });
});

describe('Agent Inbox handler auth', () => {
  it('follows Swagger security and the keyless marker on the handler', () => {
    class SecuredController {}
    function publicHandler() {
      return undefined;
    }
    function apiKeyHandler() {
      return undefined;
    }
    function keylessHandler() {
      return undefined;
    }

    Reflect.defineMetadata(API_SECURITY, [{ secretKey: [] }], apiKeyHandler);
    Reflect.defineMetadata(API_SECURITY, [{ bearer: [] }], SecuredController);
    Reflect.defineMetadata(API_SECURITY, [{ secretKey: [] }], keylessHandler);
    Reflect.defineMetadata(KEYLESS_ACCESSIBLE, true, keylessHandler);

    expect(classifyHandlerAuth(SecuredController, publicHandler)).to.equal('apiKey');
    expect(classifyHandlerAuth(class {}, apiKeyHandler)).to.equal('apiKey');
    expect(classifyHandlerAuth(class {}, keylessHandler)).to.equal('apiKeyOrKeyless');
    expect(classifyHandlerAuth(class {}, publicHandler)).to.equal('public');
  });
});

function route(
  method: AgentInboxRoute['method'],
  path: string,
  novuPath: string,
  auth: AgentInboxRoute['auth']
): AgentInboxRoute {
  return { method, path, novuPath, auth };
}

function sourceDocument(): OpenAPIObject {
  return {
    openapi: '3.0.0',
    info: { title: 'Novu API', version: '3.0.0', description: 'Novu human-facing API' },
    paths: {
      '/v1/human/inbox': {
        get: {
          operationId: 'listInbox',
          parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer' } }],
          responses: {
            '200': {
              description: 'threads',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/InboxPage' } } },
            },
          },
          'x-speakeasy-name-override': 'list',
        },
      },
      '/v1/human/inbox/counts': {
        get: { operationId: 'countInbox', responses: { '200': { description: 'counts' } } },
      },
      '/v1/human/inbox/{identifier}': {
        get: {
          operationId: 'getThread',
          parameters: [{ name: 'identifier', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: 'thread',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Thread' } } },
            },
          },
        },
      },
      '/v1/human/interactions': {
        post: { operationId: 'sendMessage', responses: { '201': { description: 'sent' } } },
      },
      '/v1/human/agent/picture': {
        put: { operationId: 'setPicture', responses: { '200': { description: 'agent' } } },
      },
      '/v1/cli/device-sessions': {
        post: { operationId: 'startLogin', responses: { '201': { description: 'started' } } },
      },
      '/v1/agents/{identifier}/integrations': {
        get: {
          operationId: 'listChannels',
          parameters: [
            {
              name: 'identifier',
              in: 'path',
              required: true,
              description: 'Agent identifier',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'channels',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Channels' } } },
            },
          },
          'x-speakeasy-name-override': 'list',
        },
      },
    },
    components: {
      schemas: {
        InboxPage: { type: 'object', properties: { data: { $ref: '#/components/schemas/Thread' } } },
        Thread: { type: 'object' },
        Channels: { type: 'object' },
        Unused: { type: 'object' },
      },
    },
    'x-speakeasy-retries': { strategy: 'backoff' },
  };
}
