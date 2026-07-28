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
  const processTranslations = sinon
    .stub(usecase as never as { processTranslations: unknown }, 'processTranslations')
    .resolves(translatedControls);

  return { usecase, processTranslations };
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

  it('returns only body and does not translate providerOverrides', async () => {
    const providerOverrides = { slack: { blocks: [{ type: 'divider' }] } };
    const { usecase, processTranslations } = buildUsecase({ body: 'translated-body' });

    const output = await usecase.execute(buildCommand({ body: 'hello', providerOverrides, skip: false }));

    expect(output).to.deep.equal({ body: 'translated-body' });
    expect(processTranslations.firstCall.args[0].controls).to.deep.equal({ body: 'hello' });
  });

  it('returns body from translated controls when there are no providerOverrides', async () => {
    const { usecase } = buildUsecase({ body: 'translated-body' });

    const output = await usecase.execute(buildCommand({ body: 'hello' }));

    expect(output).to.deep.equal({ body: 'translated-body' });
  });
});
