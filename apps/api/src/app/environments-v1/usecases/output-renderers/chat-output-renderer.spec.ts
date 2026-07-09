import { ModuleRef } from '@nestjs/core';
import { PinoLogger } from '@novu/application-generic';
import { expect } from 'chai';
import sinon from 'sinon';
import { ChatOutputRendererCommand, ChatOutputRendererUsecase } from './chat-output-renderer.usecase';
import { FullPayloadForRender } from './render-command';

/**
 * Sets up mocks for the enterprise translation module (mirrors email-output-renderer.spec.ts).
 * When @novu/ee-translation isn't installed (community/local runs), translations are skipped
 * by the renderer anyway, so a no-op stub is returned.
 */
function setupTranslationMocks(moduleRef: sinon.SinonStubbedInstance<ModuleRef>): sinon.SinonStub {
  let eeTranslation;

  try {
    eeTranslation = require('@novu/ee-translation');
  } catch {
    (moduleRef as any).get = sinon.stub().returns(null);

    return sinon.stub();
  }

  const { Translate } = eeTranslation;

  const translateStub = sinon.stub(Translate.prototype, 'execute').callsFake(async (command: any) => {
    return command.content || '';
  });

  sinon.stub(Translate.prototype, 'createContext').resolves(null);
  sinon.stub(Translate.prototype, 'executeWithContext').callsFake(async (_context: any, content: string) => content);

  const mockLogger = {
    setContext: sinon.stub(),
    assign: sinon.stub(),
    error: sinon.stub(),
    warn: sinon.stub(),
    info: sinon.stub(),
  };

  const mockGetTranslation = {
    execute: sinon.stub().resolves({ content: {} }),
  };

  const mockCommunityOrganizationRepository = {
    findById: sinon.stub().resolves({ defaultLocale: 'en_US' }),
  };

  const mockResourceResolverService = {
    resolveResource: sinon.stub().resolves({ isTranslationEnabled: false }),
  };

  (moduleRef as any).get = sinon.stub().callsFake((token) => {
    if (token === Translate) {
      return new Translate(
        mockGetTranslation as any,
        mockCommunityOrganizationRepository as any,
        mockLogger as any,
        mockResourceResolverService as any
      );
    }
    return null;
  });

  return translateStub;
}

describe('ChatOutputRendererUsecase', () => {
  let moduleRef: sinon.SinonStubbedInstance<ModuleRef>;
  let pinoLoggerMock: sinon.SinonStubbedInstance<PinoLogger>;
  let chatOutputRendererUsecase: ChatOutputRendererUsecase;
  let translateStub: sinon.SinonStub;

  beforeEach(() => {
    moduleRef = sinon.createStubInstance(ModuleRef);
    translateStub = setupTranslationMocks(moduleRef);
    pinoLoggerMock = sinon.createStubInstance(PinoLogger);

    chatOutputRendererUsecase = new ChatOutputRendererUsecase(moduleRef as any, pinoLoggerMock as any);
  });

  afterEach(() => {
    translateStub.restore?.();
    sinon.restore();
  });

  const mockFullPayload: FullPayloadForRender = {
    subscriber: { email: 'test@email.com', firstName: 'John' },
    payload: {},
    steps: {} as Record<string, unknown>,
  };

  const mockDbWorkflow = {
    _id: 'fake_workflow_id',
    _organizationId: 'fake_org_id',
    _environmentId: 'fake_env_id',
    _creatorId: 'fake_creator_id',
  } as any;

  const buildCommand = (body: string, payload: Record<string, unknown> = {}): ChatOutputRendererCommand =>
    ({
      dbWorkflow: mockDbWorkflow,
      controlValues: { body },
      fullPayloadForRender: { ...mockFullPayload, payload },
    }) as ChatOutputRendererCommand;

  describe('legacy plain-string path', () => {
    it('should return plain string body untouched (liquid left for the framework pass)', async () => {
      const result = await chatOutputRendererUsecase.execute(
        buildCommand('Hello {{subscriber.firstName}}, your order shipped')
      );

      expect(result).to.deep.equal({ body: 'Hello {{subscriber.firstName}}, your order shipped' });
    });

    it('should return non-doc JSON strings through the plain-string path', async () => {
      const result = await chatOutputRendererUsecase.execute(buildCommand('{"some": "json"}'));

      expect(result).to.deep.equal({ body: '{"some": "json"}' });
    });

    it('should not include editorType in the output', async () => {
      const command = {
        dbWorkflow: mockDbWorkflow,
        controlValues: { body: 'hello', editorType: 'text' },
        fullPayloadForRender: mockFullPayload,
      } as ChatOutputRendererCommand;

      const result = await chatOutputRendererUsecase.execute(command);

      expect(result).to.deep.equal({ body: 'hello' });
    });
  });

  describe('block editor doc path', () => {
    it('should compile a doc body to card and markdown fallback', async () => {
      const doc = JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello ' },
              { type: 'variable', attrs: { id: 'subscriber.firstName' } },
            ],
          },
          { type: 'button', attrs: { text: 'Open', url: 'https://example.com' } },
        ],
      });

      const result = await chatOutputRendererUsecase.execute(buildCommand(doc));

      expect(result.card).to.deep.equal({
        type: 'card',
        children: [
          { type: 'text', content: 'Hello John' },
          {
            type: 'actions',
            children: [{ type: 'link-button', label: 'Open', url: 'https://example.com' }],
          },
        ],
      });
      expect(result.body).to.equal('Hello John\n\nOpen: https://example.com');
    });

    it('should resolve variable fallbacks via liquid default filter', async () => {
      const doc = JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'variable', attrs: { id: 'payload.missing', fallback: 'fallback-value' } }],
          },
        ],
      });

      const result = await chatOutputRendererUsecase.execute(buildCommand(doc));

      expect(result.body).to.equal('fallback-value');
    });

    it('should evaluate showIfKey conditions and drop hidden nodes', async () => {
      const doc = JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: { showIfKey: 'payload.show' },
            content: [{ type: 'text', text: 'visible' }],
          },
          {
            type: 'paragraph',
            attrs: { showIfKey: 'payload.hide' },
            content: [{ type: 'text', text: 'hidden' }],
          },
        ],
      });

      const result = await chatOutputRendererUsecase.execute(buildCommand(doc, { show: true, hide: false }));

      expect(result.body).to.equal('visible');
    });

    it('should multiply repeat nodes over payload arrays with indexed variables', async () => {
      const doc = JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'repeat',
            attrs: { each: 'payload.items' },
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'variable', attrs: { id: 'payload.items.name' } }],
              },
            ],
          },
        ],
      });

      const result = await chatOutputRendererUsecase.execute(
        buildCommand(doc, { items: [{ name: 'first' }, { name: 'second' }] })
      );

      expect(result.body).to.equal('first\n\nsecond');
      expect(result.card?.children).to.deep.equal([
        { type: 'text', content: 'first' },
        { type: 'text', content: 'second' },
      ]);
    });

    it('should handle payload strings containing quotes and newlines', async () => {
      const doc = JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'variable', attrs: { id: 'payload.note' } }],
          },
        ],
      });

      const result = await chatOutputRendererUsecase.execute(buildCommand(doc, { note: 'a "quoted"\nmultiline note' }));

      expect(result.body).to.equal('a "quoted"\nmultiline note');
    });
  });
});
