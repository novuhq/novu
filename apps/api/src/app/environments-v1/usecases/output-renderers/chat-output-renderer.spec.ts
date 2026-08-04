import { ModuleRef } from '@nestjs/core';
import { FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { JSONContent as MailyJSONContent } from '@novu/maily-render';
import { CardElement, FeatureFlagsKeysEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { ChatOutputRendererCommand, ChatOutputRendererUsecase } from './chat-output-renderer.usecase';
import { ControlsTranslationService } from './controls-translation.service';
import { FullPayloadForRender } from './render-command';

/**
 * Mocks the enterprise translation module so `processTranslations` returns content unchanged.
 * Mirrors the setup in `email-output-renderer.spec.ts`.
 */
function setupTranslationMocks(moduleRef: sinon.SinonStubbedInstance<ModuleRef>): sinon.SinonStub {
  const eeTranslation = require('@novu/ee-translation');
  if (!eeTranslation) {
    throw new Error('ee-translation does not exist');
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
  const mockGetTranslation = { execute: sinon.stub().resolves({ content: {} }) };
  const mockCommunityOrganizationRepository = { findById: sinon.stub().resolves({ defaultLocale: 'en_US' }) };
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
  let featureFlagsServiceMock: sinon.SinonStubbedInstance<FeatureFlagsService>;
  let usecase: ChatOutputRendererUsecase;
  let translateStub: sinon.SinonStub;

  beforeEach(() => {
    moduleRef = sinon.createStubInstance(ModuleRef);
    translateStub = setupTranslationMocks(moduleRef);
    pinoLoggerMock = sinon.createStubInstance(PinoLogger);
    featureFlagsServiceMock = sinon.createStubInstance(FeatureFlagsService);
    featureFlagsServiceMock.getFlag.resolves(true);

    // Real service wired to the mocked `moduleRef`/`Translate` so translations no-op as before.
    const controlsTranslationService = new ControlsTranslationService(moduleRef as any, pinoLoggerMock as any);

    usecase = new ChatOutputRendererUsecase(
      moduleRef as any,
      pinoLoggerMock as any,
      featureFlagsServiceMock as any,
      controlsTranslationService
    );
  });

  afterEach(() => {
    translateStub.restore();
    sinon.restore();
  });

  const mockFullPayload: FullPayloadForRender = {
    subscriber: { email: 'test@email.com' },
    payload: {},
    steps: {} as Record<string, unknown>,
  };

  const mockDbWorkflow = {
    _id: 'fake_workflow_id',
    _organizationId: 'fake_org_id',
    _environmentId: 'fake_env_id',
    _creatorId: 'fake_creator_id',
  } as any;

  const command = (
    controlValues: Record<string, unknown>,
    payload: Record<string, unknown> = {}
  ): ChatOutputRendererCommand =>
    ({
      dbWorkflow: mockDbWorkflow,
      controlValues,
      fullPayloadForRender: { ...mockFullPayload, payload },
      stepId: 'fake_step_id',
    }) as ChatOutputRendererCommand;

  it('keeps the legacy plain-string body untouched (no card compilation)', async () => {
    const result = await usecase.execute(command({ body: 'Plain chat message' }));

    expect(result).to.deep.equal({ body: 'Plain chat message' });
    expect(result).to.not.have.property('card');
  });

  it('compiles a Maily block body into a CardElement with liquid variables resolved', async () => {
    const maily: MailyJSONContent = {
      type: 'doc',
      content: [
        { type: 'heading', content: [{ type: 'text', text: 'Deployment {{payload.status}}' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Service {{payload.service}} is live' }] },
      ],
    };

    const result = await usecase.execute(
      command({ body: JSON.stringify(maily) }, { status: 'succeeded', service: 'api' })
    );

    // `body` degrades to a provider-agnostic markdown rendering of the compiled card.
    expect(result.body).to.equal('**Deployment succeeded**\n\nService api is live');
    const card = result.card as CardElement;
    expect(card.type).to.equal('card');
    expect(card.children[0]).to.deep.equal({ type: 'text', content: 'Deployment succeeded', style: 'bold' });
    expect(card.children[1]).to.deep.equal({ type: 'text', content: 'Service api is live', style: 'plain' });
  });

  it('compiles cardButton nodes into an actions block with a resolved url', async () => {
    const maily: MailyJSONContent = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'View the run' }] },
        {
          type: 'cardButton',
          attrs: { label: 'Open', url: 'https://novu.co/runs/{{payload.runId}}' },
        } as MailyJSONContent,
      ],
    };

    const result = await usecase.execute(command({ body: JSON.stringify(maily) }, { runId: 'r-42' }));

    const card = result.card as CardElement;
    const actions = card.children.find((child) => child.type === 'actions');
    expect(actions, 'actions block present').to.exist;
    expect(actions).to.deep.equal({
      type: 'actions',
      children: [{ type: 'link-button', label: 'Open', url: 'https://novu.co/runs/r-42' }],
    });
  });

  it('resolves cardButton label, url, and actionId from variable picker paths', async () => {
    const maily: MailyJSONContent = {
      type: 'doc',
      content: [
        {
          type: 'cardButton',
          attrs: {
            label: 'payload.foo',
            isLabelVariable: true,
            url: 'payload.url',
            isUrlVariable: true,
            actionId: 'payload.actionId',
            isActionIdVariable: true,
          },
        } as MailyJSONContent,
      ],
    };

    const result = await usecase.execute(
      command({ body: JSON.stringify(maily) }, { foo: 'hello', url: 'https://novu.co', actionId: 'btn-1' })
    );

    const card = result.card as CardElement;
    expect(card.children[0]).to.deep.equal({
      type: 'actions',
      children: [
        {
          type: 'link-button',
          label: 'hello',
          url: 'https://novu.co',
          id: 'btn-1',
        },
      ],
    });
  });

  it('resolves cardButton attrs stored as bare variable paths without is*Variable flags', async () => {
    const maily: MailyJSONContent = {
      type: 'doc',
      content: [
        {
          type: 'cardButton',
          attrs: {
            label: 'payload.foo',
            url: 'payload.url',
            actionId: 'payload.actionId',
          },
        } as MailyJSONContent,
      ],
    };

    const result = await usecase.execute(
      command({ body: JSON.stringify(maily) }, { foo: 'hello', url: 'https://novu.co', actionId: 'btn-1' })
    );

    const card = result.card as CardElement;
    expect(card.children[0]).to.deep.equal({
      type: 'actions',
      children: [
        {
          type: 'link-button',
          label: 'hello',
          url: 'https://novu.co',
          id: 'btn-1',
        },
      ],
    });
  });
});
