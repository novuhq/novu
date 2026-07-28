import { NotificationStepEntity, NotificationTemplateEntity } from '@novu/dal';
import { providerSchemas } from '@novu/framework';
import {
  CHAT_CONTENT_OVERRIDE_PROVIDER_IDS,
  ChatProviderIdEnum,
  ResourceOriginEnum,
  StepTypeEnum,
  TOOL_CONTENT_OVERRIDE_PROVIDER_IDS,
  ToolProviderIdEnum,
} from '@novu/shared';
import { expect } from 'chai';
import { ConstructFrameworkWorkflow } from './construct-framework-workflow.usecase';

type StepOptions = {
  controlSchema: { properties?: Record<string, unknown> };
  providers: Record<string, (args: { controls: Record<string, unknown> }) => Promise<unknown>>;
};

type ConstructFrameworkWorkflowTestDouble = {
  constructProviderOverrideStepOptions: (
    staticStep: NotificationStepEntity,
    skip: (controlValues: Record<string, unknown>) => Promise<boolean>,
    fullPayloadForRender: unknown,
    dbWorkflow: NotificationTemplateEntity,
    stepType: StepTypeEnum,
    organization?: unknown,
    locale?: string
  ) => StepOptions;
  translateContentOverrideControls: (
    controls: Record<string, unknown>,
    args: {
      fullPayloadForRender: unknown;
      dbWorkflow: NotificationTemplateEntity;
      organization?: unknown;
      locale?: string;
    }
  ) => Promise<Record<string, unknown>>;
  controlsTranslationService: {
    processTranslations: (args: { controls: Record<string, unknown> }) => Promise<Record<string, unknown>>;
  };
};

const usecase = Object.create(ConstructFrameworkWorkflow.prototype) as ConstructFrameworkWorkflowTestDouble;

// Isolation: assert resolve/provider projection, not enterprise translation.
usecase.controlsTranslationService = {
  processTranslations: async ({ controls }) => controls,
};

const staticStep = {
  template: { type: StepTypeEnum.CHAT, controls: { schema: { type: 'object', properties: { body: {} } } } },
} as unknown as NotificationStepEntity;

const dbWorkflow = {
  origin: ResourceOriginEnum.NOVU_CLOUD,
  _id: 'workflow-id',
  _environmentId: 'env-id',
  _organizationId: 'org-id',
} as NotificationTemplateEntity;

const translationArgs = {
  fullPayloadForRender: {},
  dbWorkflow,
};

const noopSkip = async () => false;

function buildOptions(stepType: StepTypeEnum): StepOptions {
  return usecase.constructProviderOverrideStepOptions(staticStep, noopSkip, {}, dbWorkflow, stepType);
}

describe('ConstructFrameworkWorkflow content-override channel steps', () => {
  it('gives a chat step exactly the chat providers, and no tool providers', () => {
    const options = buildOptions(StepTypeEnum.CHAT);

    expect(Object.keys(options.providers).sort()).to.deep.equal([...CHAT_CONTENT_OVERRIDE_PROVIDER_IDS].sort());
    expect(options.providers[ToolProviderIdEnum.PagerDuty]).to.equal(undefined);
  });

  it('gives a tool step exactly the tool providers, and no chat providers', () => {
    const options = buildOptions(StepTypeEnum.TOOL);

    expect(Object.keys(options.providers).sort()).to.deep.equal([...TOOL_CONTENT_OVERRIDE_PROVIDER_IDS].sort());
    expect(options.providers[ChatProviderIdEnum.Slack]).to.equal(undefined);
  });

  it('shares one translation across step resolve and provider resolvers', async () => {
    let translationCalls = 0;
    usecase.controlsTranslationService = {
      processTranslations: async ({ controls }) => {
        translationCalls += 1;

        return controls;
      },
    };

    const options = buildOptions(StepTypeEnum.CHAT);
    const controls = {
      body: 'hi',
      providerOverrides: { [ChatProviderIdEnum.Slack]: { text: 'compiled' } },
    };

    expect(await usecase.translateContentOverrideControls(controls, translationArgs)).to.deep.equal(controls);
    expect(await options.providers[ChatProviderIdEnum.Slack]({ controls })).to.deep.equal({ text: 'compiled' });
    expect(translationCalls).to.equal(1);
  });

  it('resolves an empty payload for a provider the step has no override for', async () => {
    const options = buildOptions(StepTypeEnum.CHAT);

    expect(await options.providers[ChatProviderIdEnum.Discord]({ controls: { body: 'hi' } })).to.deep.equal({});
  });

  /**
   * `discoverProviders` reads `providerSchemas[channel][providerId].output` without a guard, so a
   * provider id the framework does not know about crashes the whole bridge request — including
   * previews of unrelated steps in the same workflow (NV-8397 regression on `novu-slack`,
   * `webex-messaging`, and `line`).
   */
  it('only registers provider ids the framework has schemas for', () => {
    const chatSchemaIds = Object.keys(providerSchemas.chat);
    const toolSchemaIds = Object.keys(providerSchemas.tool);

    expect(chatSchemaIds).to.include.members([...CHAT_CONTENT_OVERRIDE_PROVIDER_IDS]);
    expect(toolSchemaIds).to.include.members([...TOOL_CONTENT_OVERRIDE_PROVIDER_IDS]);
  });

  it('accepts the stitched providerOverrides field the framework would otherwise strip', () => {
    const options = buildOptions(StepTypeEnum.CHAT);
    const providerOverrides = options.controlSchema.properties?.providerOverrides as {
      additionalProperties?: { additionalProperties?: boolean };
    };

    expect(options.controlSchema.properties?.body, 'the step\u2019s own controls must survive').to.exist;
    expect(providerOverrides?.additionalProperties?.additionalProperties).to.equal(true);
  });
});
