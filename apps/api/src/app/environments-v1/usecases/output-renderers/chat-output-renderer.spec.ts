import { ModuleRef } from '@nestjs/core';
import { PinoLogger } from '@novu/application-generic';
import { NotificationTemplateEntity } from '@novu/dal';
import { expect } from 'chai';
import sinon from 'sinon';
import { ChatOutputRendererCommand, ChatOutputRendererUsecase } from './chat-output-renderer.usecase';
import { FullPayloadForRender } from './render-command';

function buildUsecase(translatedControls: Record<string, unknown>) {
  const usecase = new ChatOutputRendererUsecase(
    sinon.createStubInstance(ModuleRef),
    sinon.createStubInstance(PinoLogger)
  );
  sinon.stub(usecase as never as { processTranslations: unknown }, 'processTranslations').resolves(translatedControls);

  return usecase;
}

function buildCommand(controlValues: Record<string, unknown>): ChatOutputRendererCommand {
  return {
    controlValues,
    fullPayloadForRender: {} as FullPayloadForRender,
    dbWorkflow: { _environmentId: 'env', _organizationId: 'org', _id: 'wf' } as NotificationTemplateEntity,
  } as ChatOutputRendererCommand;
}

describe('ChatOutputRendererUsecase', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('passes provider overrides through to the render output', async () => {
    const providerOverrides = { slack: { blocks: [{ type: 'divider' }] } };
    const usecase = buildUsecase({ body: 'hello', providerOverrides });

    const output = await usecase.execute(buildCommand({ body: 'hello', providerOverrides }));

    expect(output).to.deep.equal({ body: 'hello', providerOverrides });
  });

  it('omits provider overrides when the step has none', async () => {
    const usecase = buildUsecase({ body: 'hello' });

    const output = await usecase.execute(buildCommand({ body: 'hello' }));

    expect(output).to.deep.equal({ body: 'hello' });
  });
});
