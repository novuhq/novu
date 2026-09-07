import { randomUUID } from 'node:crypto';
import { Novu } from '@novu/api';
import {
  CreateLayoutDto,
  CreateWorkflowDto,
  EmailStepResponseDto,
  InAppControlDto,
  LayoutCreationSourceEnum,
  LayoutResponseDto,
  UpdateWorkflowDto,
  WorkflowCreationSourceEnum,
  WorkflowResponseDto,
} from '@novu/api/models/components';
import { ControlValuesRepository, IntegrationRepository } from '@novu/dal';
import {
  CHAT_CARD_BUTTON_LABEL_REQUIRED_MESSAGE,
  CHAT_CARD_BUTTON_URL_REQUIRED_MESSAGE,
  ChannelTypeEnum,
  ChatProviderIdEnum,
  ContentIssueEnum,
  ControlValuesLevelEnum,
  FeatureFlagsKeysEnum,
  StepIssueSeverityEnum,
  StepTypeEnum,
  ToolProviderIdEnum,
} from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { JSONSchemaDto } from '../../shared/dtos/json-schema.dto';
import { initNovuClassSdkInternalAuth } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

interface ITestStepConfig {
  type: StepTypeEnum;
  controlValues: Record<string, string>;
}

describe('Upsert Workflow #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;
  const controlValuesRepository = new ControlValuesRepository();
  const integrationRepository = new IntegrationRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdkInternalAuth(session);
  });

  async function createToolWorkflow(options: {
    name: string;
    workflowId: string;
    includeEmail?: boolean;
  }): Promise<WorkflowResponseDto> {
    const steps: Array<Record<string, unknown>> = [
      {
        name: 'Tool Step',
        type: StepTypeEnum.TOOL,
        controlValues: {
          body: 'default alert',
        },
        providerOverrides: {
          [ToolProviderIdEnum.PagerDuty]: { severity: 'info' },
        },
      },
    ];

    if (options.includeEmail) {
      steps.push({
        name: 'Email Step',
        type: StepTypeEnum.EMAIL,
        controlValues: {
          subject: 'hello',
          body: 'world',
        },
      });
    }

    const createResponse = await session.testAgent.post('/v2/workflows').send({
      __source: WorkflowCreationSourceEnum.Editor,
      name: options.name,
      workflowId: options.workflowId,
      active: true,
      steps,
    });

    expect(createResponse.status).to.equal(201);

    return createResponse.body.data;
  }

  describe('POST /v2/workflows/:workflowId', () => {
    it('should throw error when workflowId is not a valid slug', async () => {
      try {
        await createWorkflow({
          name: 'Test Workflow',
          workflowId: '_test-workflow-123_',
          steps: [],
        });

        // Should not reach this point
        expect.fail('Expected BadRequestException to be thrown');
      } catch (error) {
        expect(error.statusCode).to.equal(422);
        expect(error.message).to.contain('Validation Error');
        expect(error.errors).to.exist;
        expect(error.errors.general.messages[0]).to.contain(
          'must be a valid slug format (letters, numbers, hyphens, dot and underscores only)'
        );
      }
    });

    it('should create a workflow with a preserved workflowId', async () => {
      const workflow = await createWorkflow({
        name: 'Test Workflow',
        workflowId: 'test-workflow-123',
        steps: [],
      });

      expect(workflow.name).to.equal('Test Workflow');
      expect(workflow.workflowId).to.equal('test-workflow-123');
    });

    it('should create a workflow and preserve stepId', async () => {
      const workflow = await createWorkflow({
        name: 'Test Workflow',
        workflowId: 'test-workflow-123',
        steps: [
          {
            name: 'Test Step',
            stepId: 'test-step-123',
            type: StepTypeEnum.IN_APP,
            controlValues: {
              body: 'Test Body',
            },
          },
        ],
      });

      expect(workflow.name).to.equal('Test Workflow');
      expect(workflow.workflowId).to.equal('test-workflow-123');
      expect(workflow.steps.length).to.equal(1);
      expect(workflow.steps[0].id).to.exist;
      expect(workflow.steps[0].type).to.equal(StepTypeEnum.IN_APP);
      expect(workflow.steps[0].stepId).to.equal('test-step-123');
      expect(workflow.steps[0].controls).to.exist;
      expect(workflow.steps[0].controls.values).to.exist;
      expect((workflow.steps[0].controls.values as InAppControlDto).body).to.equal('Test Body');
    });
  });

  describe('tool step providerOverrides', () => {
    it('should persist providerOverrides as a step sibling and keep them out of controlValues', async () => {
      // Raw HTTP — @novu/api SDK may lag behind tool / providerOverrides DTO changes.
      const createResponse = await session.testAgent.post('/v2/workflows').send({
        __source: WorkflowCreationSourceEnum.Editor,
        name: 'Tool Provider Overrides Workflow',
        workflowId: `tool-provider-overrides-${randomUUID()}`,
        active: true,
        steps: [
          {
            name: 'Tool Step',
            type: StepTypeEnum.TOOL,
            controlValues: {
              body: 'default alert',
            },
            providerOverrides: {
              [ToolProviderIdEnum.PagerDuty]: {
                severity: 'warning',
                summary: 'db down',
              },
              [ToolProviderIdEnum.Opsgenie]: {
                priority: 'P2',
              },
            },
          },
        ],
      });

      expect(createResponse.status).to.equal(201);

      const workflow = createResponse.body.data;
      const step = workflow.steps[0];

      expect(step.controls.values.providerOverrides).to.equal(undefined);
      expect(step.controls.values.body).to.equal('default alert');
      expect(step.providerOverrides).to.deep.equal({
        [ToolProviderIdEnum.PagerDuty]: {
          severity: 'warning',
          summary: 'db down',
        },
        [ToolProviderIdEnum.Opsgenie]: {
          priority: 'P2',
        },
      });

      const getResponse = await session.testAgent.get(`/v2/workflows/${workflow._id}`);
      expect(getResponse.status).to.equal(200);
      expect(getResponse.body.data.steps[0].providerOverrides).to.deep.equal(step.providerOverrides);
      expect(getResponse.body.data.steps[0].controls.values.providerOverrides).to.equal(undefined);
    });

    it('should surface unsupported override keys as namespaced step issues', async () => {
      const createResponse = await session.testAgent.post('/v2/workflows').send({
        __source: WorkflowCreationSourceEnum.Editor,
        name: 'Tool Provider Override Issues Workflow',
        workflowId: `tool-provider-override-issues-${randomUUID()}`,
        active: true,
        steps: [
          {
            name: 'Tool Step',
            type: StepTypeEnum.TOOL,
            controlValues: {
              body: 'default alert',
            },
            providerOverrides: {
              [ToolProviderIdEnum.Opsgenie]: {
                message: 'ok',
                notARealKey: true,
              },
            },
          },
        ],
      });

      expect(createResponse.status).to.equal(201);

      const issuePath = `providerOverrides.${ToolProviderIdEnum.Opsgenie}.notARealKey`;
      const issues = createResponse.body.data.steps[0].issues?.controls?.[issuePath];
      expect(issues).to.exist;
      expect(issues[0].issueType).to.equal(ContentIssueEnum.UNSUPPORTED_PROPERTY);
    });

    describe('chat card platform-limit validation', () => {
      const flagKey = FeatureFlagsKeysEnum.IS_CHAT_BLOCK_EDITOR_ENABLED;
      let previousFlag: string | undefined;

      before(() => {
        previousFlag = process.env[flagKey];
        process.env[flagKey] = 'true';
      });

      after(() => {
        if (previousFlag === undefined) {
          delete process.env[flagKey];
        } else {
          process.env[flagKey] = previousFlag;
        }
      });

      // The seeded env only has Slack (hard-limit ERROR) + Discord (no card validator) active. Activating
      // a degradation-only provider (Telegram) lets us assert the non-blocking WARNING severity path.
      async function activateChatProvider(providerId: ChatProviderIdEnum): Promise<void> {
        await integrationRepository.create({
          _environmentId: session.environment._id,
          _organizationId: session.organization._id,
          providerId,
          channel: ChannelTypeEnum.CHAT,
          credentials: {},
          active: true,
          name: providerId,
          identifier: `${providerId}-${randomUUID()}`,
        });
      }

      it('should surface chat card platform-limit findings as blocking body step issues', async () => {
        // A Maily/TipTap body whose 51 paragraphs compile to 51 card blocks, exceeding Slack's 50-block cap.
        const overLimitCard = JSON.stringify({
          type: 'doc',
          content: Array.from({ length: 51 }, (_, index) => ({
            type: 'paragraph',
            content: [{ type: 'text', text: `line ${index}` }],
          })),
        });

        const createResponse = await session.testAgent.post('/v2/workflows').send({
          __source: WorkflowCreationSourceEnum.Editor,
          name: 'Chat Card Limit Workflow',
          workflowId: `chat-card-limit-${randomUUID()}`,
          active: true,
          steps: [
            {
              name: 'Chat Step',
              type: StepTypeEnum.CHAT,
              controlValues: { body: overLimitCard },
            },
          ],
        });

        expect(createResponse.status).to.equal(201);

        const bodyIssues = createResponse.body.data.steps[0].issues?.controls?.body;
        expect(bodyIssues).to.exist;
        expect(bodyIssues[0].issueType).to.equal(ContentIssueEnum.CHAT_CARD_LIMIT_EXCEEDED);
        expect(bodyIssues.some((issue: { message: string }) => issue.message.includes('50'))).to.equal(true);
        // Slack's block cap is API-enforced, so it surfaces as a blocking error severity.
        expect(
          bodyIssues.some((issue: { severity?: string }) => issue.severity === StepIssueSeverityEnum.ERROR)
        ).to.equal(true);
      });

      it('should surface a non-blocking WARNING for a degradation-only provider alongside a blocking ERROR', async () => {
        await activateChatProvider(ChatProviderIdEnum.Telegram);

        // A single 5000-char paragraph: over Slack's 3000-char per-block cap (hard ERROR) and over
        // Telegram's 4096-char whole-message cap (which only truncates, so a WARNING).
        const overLimitCard = JSON.stringify({
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a'.repeat(5000) }] }],
        });

        const createResponse = await session.testAgent.post('/v2/workflows').send({
          __source: WorkflowCreationSourceEnum.Editor,
          name: 'Chat Card Severity Workflow',
          workflowId: `chat-card-severity-${randomUUID()}`,
          active: true,
          steps: [
            {
              name: 'Chat Step',
              type: StepTypeEnum.CHAT,
              controlValues: { body: overLimitCard },
            },
          ],
        });

        expect(createResponse.status).to.equal(201);

        const bodyIssues = createResponse.body.data.steps[0].issues?.controls?.body;
        expect(bodyIssues).to.exist;
        const cardIssues = bodyIssues.filter(
          (issue: { issueType: string }) => issue.issueType === ContentIssueEnum.CHAT_CARD_LIMIT_EXCEEDED
        );
        expect(
          cardIssues.some((issue: { severity?: string }) => issue.severity === StepIssueSeverityEnum.ERROR)
        ).to.equal(true);
        expect(
          cardIssues.some((issue: { severity?: string }) => issue.severity === StepIssueSeverityEnum.WARNING)
        ).to.equal(true);
      });

      it('should not surface chat card issues for a provider that has a content override', async () => {
        // 51 blocks would exceed Slack's 50-block cap, but a Slack content override replaces the card
        // at send time, so its platform-limit finding must be suppressed.
        const overLimitCard = JSON.stringify({
          type: 'doc',
          content: Array.from({ length: 51 }, (_, index) => ({
            type: 'paragraph',
            content: [{ type: 'text', text: `line ${index}` }],
          })),
        });

        const createResponse = await session.testAgent.post('/v2/workflows').send({
          __source: WorkflowCreationSourceEnum.Editor,
          name: 'Chat Card Override Workflow',
          workflowId: `chat-card-override-${randomUUID()}`,
          active: true,
          steps: [
            {
              name: 'Chat Step',
              type: StepTypeEnum.CHAT,
              controlValues: { body: overLimitCard },
              providerOverrides: {
                [ChatProviderIdEnum.Slack]: { text: 'overridden slack content' },
              },
            },
          ],
        });

        expect(createResponse.status).to.equal(201);

        const bodyIssues = createResponse.body.data.steps[0].issues?.controls?.body;
        const cardIssues = (bodyIssues ?? []).filter(
          (issue: { issueType: string }) => issue.issueType === ContentIssueEnum.CHAT_CARD_LIMIT_EXCEEDED
        );
        expect(cardIssues).to.have.length(0);
      });

      it('should keep another active provider’s findings when only one provider has a content override', async () => {
        await activateChatProvider(ChatProviderIdEnum.Telegram);

        // Same 5000-char body: Slack (ERROR) + Telegram (WARNING). Overriding only Slack must suppress the
        // Slack ERROR while leaving the un-overridden Telegram WARNING intact.
        const overLimitCard = JSON.stringify({
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a'.repeat(5000) }] }],
        });

        const createResponse = await session.testAgent.post('/v2/workflows').send({
          __source: WorkflowCreationSourceEnum.Editor,
          name: 'Chat Card Scoped Override Workflow',
          workflowId: `chat-card-scoped-override-${randomUUID()}`,
          active: true,
          steps: [
            {
              name: 'Chat Step',
              type: StepTypeEnum.CHAT,
              controlValues: { body: overLimitCard },
              providerOverrides: {
                [ChatProviderIdEnum.Slack]: { text: 'overridden slack content' },
              },
            },
          ],
        });

        expect(createResponse.status).to.equal(201);

        const bodyIssues = createResponse.body.data.steps[0].issues?.controls?.body;
        expect(bodyIssues).to.exist;
        const cardIssues = bodyIssues.filter(
          (issue: { issueType: string }) => issue.issueType === ContentIssueEnum.CHAT_CARD_LIMIT_EXCEEDED
        );
        // Slack (the only ERROR source) is overridden, so no blocking error should remain...
        expect(
          cardIssues.some((issue: { severity?: string }) => issue.severity === StepIssueSeverityEnum.ERROR)
        ).to.equal(false);
        // ...but Telegram's WARNING is still surfaced because it has no override.
        expect(
          cardIssues.some((issue: { severity?: string }) => issue.severity === StepIssueSeverityEnum.WARNING)
        ).to.equal(true);
      });

      it('should not surface chat card issues for a within-limit card', async () => {
        const withinLimitCard = JSON.stringify({
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
        });

        const createResponse = await session.testAgent.post('/v2/workflows').send({
          __source: WorkflowCreationSourceEnum.Editor,
          name: 'Chat Card Within Limit Workflow',
          workflowId: `chat-card-within-limit-${randomUUID()}`,
          active: true,
          steps: [
            {
              name: 'Chat Step',
              type: StepTypeEnum.CHAT,
              controlValues: { body: withinLimitCard },
            },
          ],
        });

        expect(createResponse.status).to.equal(201);
        expect(createResponse.body.data.steps[0].issues?.controls?.body).to.equal(undefined);
      });

      it('should not surface chat card issues when the rich chat editor flag is disabled', async () => {
        process.env[flagKey] = 'false';

        try {
          const overLimitCard = JSON.stringify({
            type: 'doc',
            content: Array.from({ length: 51 }, (_, index) => ({
              type: 'paragraph',
              content: [{ type: 'text', text: `line ${index}` }],
            })),
          });

          const createResponse = await session.testAgent.post('/v2/workflows').send({
            __source: WorkflowCreationSourceEnum.Editor,
            name: 'Chat Card Flag Off Workflow',
            workflowId: `chat-card-flag-off-${randomUUID()}`,
            active: true,
            steps: [
              {
                name: 'Chat Step',
                type: StepTypeEnum.CHAT,
                controlValues: { body: overLimitCard },
              },
            ],
          });

          expect(createResponse.status).to.equal(201);
          expect(createResponse.body.data.steps[0].issues?.controls?.body).to.equal(undefined);
        } finally {
          process.env[flagKey] = 'true';
        }
      });
    });

    describe('chat card link-button validation', () => {
      const flagKey = FeatureFlagsKeysEnum.IS_CHAT_BLOCK_EDITOR_ENABLED;
      let previousFlag: string | undefined;

      before(() => {
        previousFlag = process.env[flagKey];
        process.env[flagKey] = 'true';
      });

      after(() => {
        if (previousFlag === undefined) {
          delete process.env[flagKey];
        } else {
          process.env[flagKey] = previousFlag;
        }
      });

      function cardBody(buttonAttrs: Record<string, unknown>): string {
        return JSON.stringify({
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'body' }] },
            { type: 'cardActions', content: [{ type: 'cardButton', attrs: buttonAttrs }] },
          ],
        });
      }

      async function createChatWorkflow(body: string) {
        const response = await session.testAgent.post('/v2/workflows').send({
          __source: WorkflowCreationSourceEnum.Editor,
          name: 'Chat Card Button Workflow',
          workflowId: `chat-card-button-${randomUUID()}`,
          active: true,
          steps: [{ name: 'Chat Step', type: StepTypeEnum.CHAT, controlValues: { body } }],
        });

        expect(response.status).to.equal(201);

        return response.body.data.steps[0].issues?.controls?.body as
          | Array<{ issueType: string; severity?: string; message: string }>
          | undefined;
      }

      it('should surface a blocking issue for a link button with an empty url', async () => {
        const bodyIssues = await createChatWorkflow(cardBody({ label: 'View', url: '' }));

        expect(bodyIssues).to.exist;
        const urlIssue = (bodyIssues ?? []).find((issue) =>
          issue.message.includes(CHAT_CARD_BUTTON_URL_REQUIRED_MESSAGE)
        );
        expect(urlIssue).to.exist;
        expect(urlIssue?.issueType).to.equal(ContentIssueEnum.CHAT_CARD_INVALID_BUTTON);
        expect(urlIssue?.severity).to.equal(StepIssueSeverityEnum.ERROR);
      });

      it('should surface a blocking issue for a link button with a malformed url', async () => {
        const bodyIssues = await createChatWorkflow(cardBody({ label: 'View', url: 'not-a-valid-url' }));

        expect(bodyIssues).to.exist;
        const urlIssue = (bodyIssues ?? []).find(
          (issue) => issue.issueType === ContentIssueEnum.CHAT_CARD_INVALID_BUTTON
        );
        expect(urlIssue).to.exist;
        expect(urlIssue?.severity).to.equal(StepIssueSeverityEnum.ERROR);
      });

      it('should surface a blocking issue for a link button with an empty label', async () => {
        const bodyIssues = await createChatWorkflow(cardBody({ label: '', url: 'https://example.com' }));

        expect(bodyIssues).to.exist;
        const labelIssue = (bodyIssues ?? []).find((issue) =>
          issue.message.includes(CHAT_CARD_BUTTON_LABEL_REQUIRED_MESSAGE)
        );
        expect(labelIssue).to.exist;
        expect(labelIssue?.issueType).to.equal(ContentIssueEnum.CHAT_CARD_INVALID_BUTTON);
        expect(labelIssue?.severity).to.equal(StepIssueSeverityEnum.ERROR);
      });

      it('should not surface link-button issues for a valid label + absolute url', async () => {
        const bodyIssues = await createChatWorkflow(
          cardBody({ label: 'View order', url: 'https://example.com/order' })
        );

        const buttonIssues = (bodyIssues ?? []).filter(
          (issue) => issue.issueType === ContentIssueEnum.CHAT_CARD_INVALID_BUTTON
        );
        expect(buttonIssues).to.have.length(0);
      });

      it('should accept a variable-backed url without url-format validation', async () => {
        const bodyIssues = await createChatWorkflow(cardBody({ label: 'View', url: '{{ payload.link }}' }));

        const buttonIssues = (bodyIssues ?? []).filter(
          (issue) => issue.issueType === ContentIssueEnum.CHAT_CARD_INVALID_BUTTON
        );
        expect(buttonIssues).to.have.length(0);
      });

      it('should not surface link-button issues when the rich chat editor flag is disabled', async () => {
        process.env[flagKey] = 'false';

        try {
          const bodyIssues = await createChatWorkflow(cardBody({ label: '', url: '' }));
          const buttonIssues = (bodyIssues ?? []).filter(
            (issue) => issue.issueType === ContentIssueEnum.CHAT_CARD_INVALID_BUTTON
          );
          expect(buttonIssues).to.have.length(0);
        } finally {
          process.env[flagKey] = 'true';
        }
      });
    });

    it('should delete all provider override docs when providerOverrides is null', async () => {
      const createResponse = await session.testAgent.post('/v2/workflows').send({
        __source: WorkflowCreationSourceEnum.Editor,
        name: 'Tool Provider Override Delete Workflow',
        workflowId: `tool-provider-override-delete-${randomUUID()}`,
        active: true,
        steps: [
          {
            name: 'Tool Step',
            type: StepTypeEnum.TOOL,
            controlValues: {
              body: 'default alert',
            },
            providerOverrides: {
              [ToolProviderIdEnum.PagerDuty]: { severity: 'info' },
            },
          },
        ],
      });

      expect(createResponse.status).to.equal(201);
      const workflow = createResponse.body.data;
      const step = workflow.steps[0];
      expect(step.providerOverrides?.[ToolProviderIdEnum.PagerDuty]).to.deep.equal({ severity: 'info' });

      const updateResponse = await session.testAgent.put(`/v2/workflows/${workflow._id}`).send({
        ...workflow,
        steps: [
          {
            _id: step._id,
            stepId: step.stepId,
            name: step.name,
            type: step.type,
            controlValues: step.controls.values,
            providerOverrides: null,
          },
        ],
      });

      expect(updateResponse.status).to.equal(200);
      expect(updateResponse.body.data.steps[0].providerOverrides).to.not.exist;
    });

    it('should delete a tool step from the workflow', async () => {
      const workflow = await createToolWorkflow({
        name: 'Tool Step Delete Workflow',
        workflowId: `tool-step-delete-${randomUUID()}`,
        includeEmail: true,
      });
      expect(workflow.steps).to.have.length(2);

      const emailStep = workflow.steps.find((s) => s.type === StepTypeEnum.EMAIL);
      expect(emailStep).to.exist;

      const updateResponse = await session.testAgent.put(`/v2/workflows/${workflow._id}`).send({
        ...workflow,
        steps: [
          {
            _id: emailStep!._id,
            stepId: emailStep!.stepId,
            name: emailStep!.name,
            type: emailStep!.type,
            controlValues: emailStep!.controls.values,
          },
        ],
      });

      expect(updateResponse.status).to.equal(200);
      expect(updateResponse.body.data.steps).to.have.length(1);
      expect(updateResponse.body.data.steps[0].type).to.equal(StepTypeEnum.EMAIL);
      expect(updateResponse.body.data.steps[0].controls.values.subject).to.equal('hello');
      expect(updateResponse.body.data.steps[0].controls.values.body).to.equal('world');
    });

    it('should delete a tool step when it is the only step', async () => {
      const workflow = await createToolWorkflow({
        name: 'Solo Tool Step Delete Workflow',
        workflowId: `solo-tool-step-delete-${randomUUID()}`,
      });
      const toolStep = workflow.steps[0];
      expect(toolStep).to.exist;

      const overrideDocsBefore = await controlValuesRepository.find({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        _workflowId: workflow._id,
        _stepId: toolStep._id,
        level: ControlValuesLevelEnum.STEP_PROVIDER_CONTROLS,
      });
      expect(overrideDocsBefore.length).to.be.greaterThan(0);

      const updateResponse = await session.testAgent.put(`/v2/workflows/${workflow._id}`).send({
        ...workflow,
        steps: [],
      });

      expect(updateResponse.status).to.equal(200);
      expect(updateResponse.body.data.steps).to.have.length(0);

      const overrideDocsAfter = await controlValuesRepository.find({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        _workflowId: workflow._id,
        _stepId: toolStep._id,
        level: ControlValuesLevelEnum.STEP_PROVIDER_CONTROLS,
      });
      expect(overrideDocsAfter).to.have.length(0);
    });

    it('should keep provider overrides when omitted from the remaining tool step', async () => {
      const workflow = await createToolWorkflow({
        name: 'Keep Tool Step Workflow',
        workflowId: `keep-tool-step-${randomUUID()}`,
        includeEmail: true,
      });
      const toolStep = workflow.steps.find((s) => s.type === StepTypeEnum.TOOL);
      expect(toolStep).to.exist;

      // Dashboard delete omits providerOverrides on remaining steps (leave unchanged).
      const updateResponse = await session.testAgent.put(`/v2/workflows/${workflow._id}`).send({
        ...workflow,
        steps: [
          {
            _id: toolStep!._id,
            stepId: toolStep!.stepId,
            name: toolStep!.name,
            type: toolStep!.type,
            controlValues: toolStep!.controls.values,
          },
        ],
      });

      expect(updateResponse.status).to.equal(200);
      expect(updateResponse.body.data.steps).to.have.length(1);
      expect(updateResponse.body.data.steps[0].type).to.equal(StepTypeEnum.TOOL);
      expect(updateResponse.body.data.steps[0].providerOverrides?.[ToolProviderIdEnum.PagerDuty]).to.deep.equal({
        severity: 'info',
      });
    });

    it('should round-trip a tool step on PUT', async () => {
      const workflow = await createToolWorkflow({
        name: 'Round Trip Tool Workflow',
        workflowId: `round-trip-tool-${randomUUID()}`,
      });

      const updateResponse = await session.testAgent.put(`/v2/workflows/${workflow._id}`).send({
        ...workflow,
      });

      expect(updateResponse.status).to.equal(200);
      expect(updateResponse.body.data.steps[0].type).to.equal(StepTypeEnum.TOOL);
      expect(updateResponse.body.data.steps[0].providerOverrides?.[ToolProviderIdEnum.PagerDuty]).to.deep.equal({
        severity: 'info',
      });
    });
  });

  describe('PUT /v2/workflows/:workflowId', () => {
    describe('single step workflows', () => {
      it('when step is deleted it should not remove variable if it is used in another step', async () => {
        const workflow = await createWorkflow({
          name: 'Test Workflow',
          workflowId: `test-workflow-${Date.now()}`,
          source: WorkflowCreationSourceEnum.Editor,
          active: true,
          payloadSchema: {
            type: 'object',
            properties: {
              first_variable: { type: 'string' },
              second_variable: { type: 'string' },
            },
            required: [],
            additionalProperties: false,
          },
          steps: [
            {
              name: `IN_APP 1`,
              type: StepTypeEnum.IN_APP,
              controlValues: {
                body: '{{payload.first_variable}}',
              },
            },
            {
              name: `IN_APP 2`,
              type: StepTypeEnum.IN_APP,
              controlValues: {
                body: '{{payload.second_variable}}',
              },
            },
            {
              name: `CHAT 1`,
              type: StepTypeEnum.CHAT,
              controlValues: {
                body: '{{payload.first_variable}}',
              },
            },
          ],
        });
        const chatStep = workflow.steps[2];
        const chatPayloadVariables = chatStep.variables.properties?.payload;

        expect(chatPayloadVariables).to.exist;
        expect((chatPayloadVariables as JSONSchemaDto)?.properties).to.have.property('first_variable');
        expect((chatPayloadVariables as JSONSchemaDto)?.properties).to.have.property('second_variable');

        // delete the first step
        const updatedWorkflow = await updateWorkflow(workflow.slug, {
          ...mapResponseToUpdateDto(workflow),
          steps: mapResponseToUpdateDto(workflow).steps.slice(1),
        });

        const updatedChatStep = updatedWorkflow.steps[0];
        const updatedChatPayloadVariables = updatedChatStep.variables.properties?.payload;
        expect(updatedChatPayloadVariables).to.exist;
        expect((updatedChatPayloadVariables as JSONSchemaDto)?.properties).to.have.property('first_variable');
        expect((updatedChatPayloadVariables as JSONSchemaDto)?.properties).to.have.property('second_variable');
      });
    });

    describe('email step layoutId functionality', () => {
      it('should skip layout rendering when converting Maily JSON to HTML with assigned layoutId', async () => {
        // First create a layout with distinctive HTML content
        const layout = await createLayout({
          name: 'Test Layout for skipLayoutRendering',
          layoutId: 'test-layout-skip-rendering',
          source: LayoutCreationSourceEnum.Dashboard,
        });

        const mailyJsonContent = JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'This is email content that should not include layout HTML.',
                },
              ],
            },
          ],
        });

        // Create workflow with email step that has layoutId assigned
        const workflow = await createWorkflow({
          name: 'Test Workflow with Layout',
          workflowId: `test-workflow-layout-${Date.now()}`,
          source: WorkflowCreationSourceEnum.Editor,
          active: true,
          steps: [
            {
              name: `Email Step with Layout`,
              type: StepTypeEnum.EMAIL,
              controlValues: {
                subject: 'Test Email with Layout',
                body: mailyJsonContent,
                editorType: 'block',
                layoutId: layout.layoutId,
              },
            },
          ],
        });

        // Switch to HTML editor - this should trigger skipLayoutRendering
        const updatedWorkflow = await updateWorkflow(workflow.slug, {
          ...workflow,
          steps: [
            {
              ...workflow.steps[0],
              controlValues: {
                ...workflow.steps[0].controls.values,
                editorType: 'html',
              },
            },
          ],
        } as UpdateWorkflowDto);

        const updatedEmailStep = updatedWorkflow.steps[0] as EmailStepResponseDto;

        expect(updatedEmailStep.controls.values.editorType).to.equal('html');
        expect(updatedEmailStep.controls.values.layoutId).to.equal(layout.layoutId);

        // The body should contain the converted HTML from Maily JSON
        expect(updatedEmailStep.controls.values.body).to.not.contain('<!DOCTYPE');
        expect(updatedEmailStep.controls.values.body).to.not.contain('<html');
        expect(updatedEmailStep.controls.values.body).to.contain(
          'This is email content that should not include layout HTML'
        );
      });

      it('should not use layoutId when null is provided', async () => {
        await createLayout({
          name: 'Test Layout',
          layoutId: 'test-layout',
          source: LayoutCreationSourceEnum.Dashboard,
        });

        const workflow = await createWorkflow({
          name: 'Test Email Workflow',
          workflowId: `test-email-workflow-${Date.now()}`,
          source: WorkflowCreationSourceEnum.Editor,
          active: true,
          steps: [
            {
              name: `Email Step`,
              type: StepTypeEnum.EMAIL,
              controlValues: {
                subject: 'Test Subject',
                body: 'Test Body',
                layoutId: null,
              },
            },
          ],
        });

        const emailStep = workflow.steps[0] as EmailStepResponseDto;
        expect(emailStep.type).to.equal(StepTypeEnum.EMAIL);

        expect(emailStep.controls.values.layoutId).to.equal(null);
      });

      it('should keep layoutId as undefined when not specified and there is no default layout', async () => {
        const workflow = await createWorkflow({
          name: 'Test Email Workflow',
          workflowId: `test-email-workflow-${Date.now()}`,
          source: WorkflowCreationSourceEnum.Editor,
          active: true,
          steps: [
            {
              name: `Email Step`,
              type: StepTypeEnum.EMAIL,
              controlValues: {
                subject: 'Test Subject',
                body: 'Test Body',
              },
            },
          ],
        });

        const emailStep = workflow.steps[0] as EmailStepResponseDto;
        expect(emailStep.type).to.equal(StepTypeEnum.EMAIL);
        expect(emailStep.controls.values.layoutId).to.be.undefined;
      });

      it('should keep layoutId as undefined when not specified and there is a default layout', async () => {
        await createLayout({
          name: 'Test Layout',
          layoutId: 'test-layout-id',
          source: LayoutCreationSourceEnum.Dashboard,
        });

        const workflow = await createWorkflow({
          name: 'Test Email Workflow',
          workflowId: `test-email-workflow-${Date.now()}`,
          source: WorkflowCreationSourceEnum.Editor,
          active: true,
          steps: [
            {
              name: `Email Step`,
              type: StepTypeEnum.EMAIL,
              controlValues: {
                subject: 'Test Subject',
                body: 'Test Body',
              },
            },
          ],
        });

        const emailStep = workflow.steps[0] as EmailStepResponseDto;
        expect(emailStep.type).to.equal(StepTypeEnum.EMAIL);
        expect(emailStep.controls.values.layoutId).to.be.undefined;
      });

      it('should throw error when creating email step with invalid layoutId', async () => {
        try {
          await createWorkflow({
            name: 'Test Email Workflow Invalid',
            workflowId: `test-email-workflow-invalid-${Date.now()}`,
            source: WorkflowCreationSourceEnum.Editor,
            active: true,
            steps: [
              {
                name: `Email Step`,
                type: StepTypeEnum.EMAIL,
                controlValues: {
                  subject: 'Test Subject',
                  body: 'Test Body',
                  layoutId: 'non-existent-layout-id-12345',
                },
              },
            ],
          });

          // Should not reach this point
          expect.fail('Expected BadRequestException to be thrown');
        } catch (error) {
          expect(error.message).to.contain('Layout not found');
        }
      });

      it('should throw error when updating email step with invalid layoutId', async () => {
        try {
          const workflow = await createWorkflow({
            name: 'Test Email Workflow Update Invalid',
            workflowId: `test-email-workflow-update-invalid-${Date.now()}`,
            source: WorkflowCreationSourceEnum.Editor,
            active: true,
            steps: [
              {
                name: `Email Step`,
                type: StepTypeEnum.EMAIL,
                controlValues: {
                  subject: 'Test Subject',
                  body: 'Test Body',
                },
              },
            ],
          });

          await updateWorkflow(workflow.slug, {
            ...mapResponseToUpdateDto(workflow),
            steps: [
              {
                ...mapResponseToUpdateDto(workflow).steps[0],
                type: StepTypeEnum.EMAIL,
                controlValues: {
                  subject: 'Test Subject',
                  body: 'Test Body',
                  layoutId: 'invalid-layout-id-67890',
                },
              },
            ],
          });

          // Should not reach this point
          expect.fail('Expected BadRequestException to be thrown');
        } catch (error) {
          expect(error.message).to.contain('Layout not found for id');
        }
      });

      it('should allow updating layoutId to specific value', async () => {
        const layout = await createLayout({
          name: 'Custom Layout',
          layoutId: 'custom-layout',
          source: LayoutCreationSourceEnum.Dashboard,
        });

        const workflow = await createWorkflow({
          name: 'Test Email Workflow',
          workflowId: `test-email-workflow-${Date.now()}`,
          source: WorkflowCreationSourceEnum.Editor,
          active: true,
          steps: [
            {
              name: `Email Step`,
              type: StepTypeEnum.EMAIL,
              controlValues: {
                subject: 'Test Subject',
                body: 'Test Body',
              },
            },
          ],
        });

        // Update the workflow with a specific layoutId
        const updatedWorkflow = await updateWorkflow(workflow.slug, {
          ...mapResponseToUpdateDto(workflow),
          steps: [
            {
              ...mapResponseToUpdateDto(workflow).steps[0],
              type: StepTypeEnum.EMAIL,
              controlValues: {
                subject: 'Test Subject',
                body: 'Test Body',
                layoutId: layout.layoutId,
              },
            },
          ],
        });

        const emailStep = updatedWorkflow.steps[0] as EmailStepResponseDto;
        expect(emailStep.type).to.equal(StepTypeEnum.EMAIL);
        expect(emailStep.controls.values.layoutId).to.equal(layout.layoutId);
      });

      it('should allow updating layoutId to undefined to remove layout', async () => {
        const layout = await createLayout({
          name: 'Custom Layout',
          layoutId: 'custom-layout',
          source: LayoutCreationSourceEnum.Dashboard,
        });

        const workflow = await createWorkflow({
          name: 'Test Email Workflow',
          workflowId: `test-email-workflow-${Date.now()}`,
          source: WorkflowCreationSourceEnum.Editor,
          active: true,
          steps: [
            {
              name: `Email Step`,
              type: StepTypeEnum.EMAIL,
              controlValues: {
                subject: 'Test Subject',
                body: 'Test Body',
                layoutId: layout.layoutId,
              },
            },
          ],
        });

        // Update the workflow to remove layout
        const updatedWorkflow = await updateWorkflow(workflow.slug, {
          ...mapResponseToUpdateDto(workflow),
          steps: [
            {
              ...mapResponseToUpdateDto(workflow).steps[0],
              type: StepTypeEnum.EMAIL,
              controlValues: {
                subject: 'Test Subject',
                body: 'Test Body',
                layoutId: undefined,
              },
            },
          ],
        });

        const emailStep = updatedWorkflow.steps[0] as EmailStepResponseDto;
        expect(emailStep.type).to.equal(StepTypeEnum.EMAIL);
        expect(emailStep.controls.values.layoutId).to.be.undefined;
      });
    });

    it('when switching the editor type it should convert the body value', async () => {
      const workflow = await createWorkflow({
        name: 'Test Workflow',
        workflowId: `test-workflow-${Date.now()}`,
        source: WorkflowCreationSourceEnum.Editor,
        active: true,
        steps: [
          {
            name: `Email`,
            type: StepTypeEnum.EMAIL,
            controlValues: {
              disableOutputSanitization: false,
              editorType: 'block',
              body: '{"type":"doc","content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"test"}]}]}',
              subject: 'subject',
            },
          },
        ],
      });

      const updatedWorkflow = await updateWorkflow(workflow.slug, {
        ...workflow,
        steps: [
          {
            ...workflow.steps[0],
            controlValues: {
              ...workflow.steps[0].controls.values,
              editorType: 'html',
            },
          },
        ],
      } as UpdateWorkflowDto);

      const updatedEmailStep = updatedWorkflow.steps[0] as EmailStepResponseDto;

      expect(updatedEmailStep.controls.values.editorType).to.equal('html');
      expect(updatedEmailStep.controls.values.body).to.contain('<html');
      expect(updatedEmailStep.controls.values.body).to.contain('<body');
      expect(updatedEmailStep.controls.values.body).to.contain(`>
                      test
                    </p>`);
      expect(updatedEmailStep.controls.values.body).to.contain('</body>');
      expect(updatedEmailStep.controls.values.body).to.contain('</html>');

      const updatedWorkflow2 = await updateWorkflow(workflow.slug, {
        ...workflow,
        steps: [
          {
            ...workflow.steps[0],
            controlValues: {
              ...updatedEmailStep.controls.values,
              editorType: 'block',
            },
          },
        ],
      } as UpdateWorkflowDto);

      const updatedEmailStep2 = updatedWorkflow2.steps[0] as EmailStepResponseDto;
      expect(updatedEmailStep2.controls.values.editorType).to.equal('block');
      expect(updatedEmailStep2.controls.values.body).to.equal('');
    });
  });

  describe('chat editorType inference', () => {
    const mailyBody = JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello from blocks' }] }],
    });

    it('sets editorType to block when the chat body is Maily JSON', async () => {
      const createResponse = await session.testAgent.post('/v2/workflows').send({
        __source: WorkflowCreationSourceEnum.Editor,
        name: 'Chat EditorType Block Workflow',
        workflowId: `chat-editor-type-block-${randomUUID()}`,
        active: true,
        steps: [
          {
            name: 'Chat Step',
            type: StepTypeEnum.CHAT,
            controlValues: { body: mailyBody },
          },
        ],
      });

      expect(createResponse.status).to.equal(201);
      expect(createResponse.body.data.steps[0].controls.values.editorType).to.equal('block');
      expect(createResponse.body.data.steps[0].issues?.controls?.editorType).to.equal(undefined);
    });

    it('sets editorType to text when the chat body is plain text', async () => {
      const createResponse = await session.testAgent.post('/v2/workflows').send({
        __source: WorkflowCreationSourceEnum.Editor,
        name: 'Chat EditorType Text Workflow',
        workflowId: `chat-editor-type-text-${randomUUID()}`,
        active: true,
        steps: [
          {
            name: 'Chat Step',
            type: StepTypeEnum.CHAT,
            controlValues: { body: 'hello {{payload.foo}}' },
          },
        ],
      });

      expect(createResponse.status).to.equal(201);
      expect(createResponse.body.data.steps[0].controls.values.editorType).to.equal('text');
      expect(createResponse.body.data.steps[0].issues?.controls?.editorType).to.equal(undefined);
    });

    it('does not report editorType enum issues when editorType is empty and body is Maily JSON', async () => {
      const createResponse = await session.testAgent.post('/v2/workflows').send({
        __source: WorkflowCreationSourceEnum.Editor,
        name: 'Chat EditorType Empty Workflow',
        workflowId: `chat-editor-type-empty-${randomUUID()}`,
        active: true,
        steps: [
          {
            name: 'Chat Step',
            type: StepTypeEnum.CHAT,
            controlValues: { body: mailyBody, editorType: '' },
          },
        ],
      });

      expect(createResponse.status).to.equal(201);
      expect(createResponse.body.data.steps[0].controls.values.editorType).to.equal('block');
      expect(createResponse.body.data.steps[0].issues?.controls?.editorType).to.equal(undefined);
    });
  });

  describe('workflow agent assignment', () => {
    async function createTestAgent(identifier: string, name = identifier) {
      const response = await session.testAgent.post('/v1/agents').send({ name, identifier });
      expect(response.status).to.equal(201);

      return response.body.data;
    }

    it('should set, return, and clear workflow agent', async () => {
      await createTestAgent('devops-agent', 'DevOps Agent');

      const createResponse = await session.testAgent.post('/v2/workflows').send({
        __source: WorkflowCreationSourceEnum.Editor,
        name: 'Agent Assignment Workflow',
        workflowId: `agent-assignment-${randomUUID()}`,
        active: true,
        steps: [
          {
            name: 'Chat Step',
            type: StepTypeEnum.CHAT,
            controlValues: {
              body: 'hello',
            },
          },
        ],
      });

      expect(createResponse.status).to.equal(201);
      const workflow = createResponse.body.data;
      expect(workflow.agent ?? null).to.equal(null);

      const setResponse = await session.testAgent.put(`/v2/workflows/${workflow._id}`).send({
        ...workflow,
        agent: { identifier: 'devops-agent' },
        steps: [
          {
            _id: workflow.steps[0]._id,
            stepId: workflow.steps[0].stepId,
            name: workflow.steps[0].name,
            type: workflow.steps[0].type,
            controlValues: workflow.steps[0].controls.values,
          },
        ],
      });

      expect(setResponse.status).to.equal(200);
      expect(setResponse.body.data.agent).to.deep.include({ identifier: 'devops-agent' });

      const getResponse = await session.testAgent.get(`/v2/workflows/${workflow._id}`);
      expect(getResponse.status).to.equal(200);
      expect(getResponse.body.data.agent).to.deep.include({ identifier: 'devops-agent' });

      const clearResponse = await session.testAgent.put(`/v2/workflows/${workflow._id}`).send({
        ...getResponse.body.data,
        agent: null,
        steps: [
          {
            _id: getResponse.body.data.steps[0]._id,
            stepId: getResponse.body.data.steps[0].stepId,
            name: getResponse.body.data.steps[0].name,
            type: getResponse.body.data.steps[0].type,
            controlValues: getResponse.body.data.steps[0].controls.values,
          },
        ],
      });

      expect(clearResponse.status).to.equal(200);
      expect(clearResponse.body.data.agent).to.equal(null);
    });

    it('should retain agent when duplicating a workflow', async () => {
      await createTestAgent('support-agent', 'Support Agent');

      const createResponse = await session.testAgent.post('/v2/workflows').send({
        __source: WorkflowCreationSourceEnum.Editor,
        name: 'Agent Duplicate Source',
        workflowId: `agent-duplicate-source-${randomUUID()}`,
        active: true,
        agent: { identifier: 'support-agent' },
        steps: [
          {
            name: 'Email Step',
            type: StepTypeEnum.EMAIL,
            controlValues: {
              subject: 'hi',
              body: 'hello',
            },
          },
        ],
      });

      expect(createResponse.status).to.equal(201);
      const workflow = createResponse.body.data;
      expect(workflow.agent).to.deep.include({ identifier: 'support-agent' });

      const duplicateResponse = await session.testAgent.post(`/v2/workflows/${workflow._id}/duplicate`).send({
        name: 'Agent Duplicate Copy',
      });

      expect(duplicateResponse.status).to.equal(201);
      expect(duplicateResponse.body.data.agent).to.deep.include({ identifier: 'support-agent' });
      expect(duplicateResponse.body.data._id).to.not.equal(workflow._id);
    });

    it('should carry agent when syncing a workflow to another environment', async () => {
      await createTestAgent('ops-agent', 'Ops Agent');

      const createResponse = await session.testAgent.post('/v2/workflows').send({
        __source: WorkflowCreationSourceEnum.Editor,
        name: 'Agent Sync Source',
        workflowId: `agent-sync-source-${randomUUID()}`,
        active: true,
        agent: { identifier: 'ops-agent' },
        steps: [
          {
            name: 'Chat Step',
            type: StepTypeEnum.CHAT,
            controlValues: {
              body: 'hello',
            },
          },
        ],
      });

      expect(createResponse.status).to.equal(201);
      const workflow = createResponse.body.data;

      await session.switchToProdEnvironment();
      const prodEnvironmentId = session.environment._id;
      await session.switchToDevEnvironment();

      const syncResponse = await session.testAgent.put(`/v2/workflows/${workflow._id}/sync`).send({
        targetEnvironmentId: prodEnvironmentId,
      });

      expect(syncResponse.status).to.equal(200);
      expect(syncResponse.body.data.agent).to.deep.include({ identifier: 'ops-agent' });
      expect(syncResponse.body.data.workflowId).to.equal(workflow.workflowId);
      expect(syncResponse.body.data._id).to.not.equal(workflow._id);
    });
  });

  async function createLayout(layout: CreateLayoutDto): Promise<LayoutResponseDto> {
    const { result: createLayoutBody } = await novuClient.layouts.create(layout);

    return createLayoutBody;
  }

  async function createWorkflow(workflow: CreateWorkflowDto): Promise<WorkflowResponseDto> {
    const { result: createWorkflowBody } = await novuClient.workflows.create(workflow);

    return createWorkflowBody;
  }

  async function updateWorkflow(workflowSlug: string, workflow: UpdateWorkflowDto): Promise<WorkflowResponseDto> {
    const { result: updateWorkflowBody } = await novuClient.workflows.update(workflow, workflowSlug);

    return updateWorkflowBody;
  }

  function mapResponseToUpdateDto(workflowResponse: WorkflowResponseDto): UpdateWorkflowDto {
    return {
      ...workflowResponse,
      steps: workflowResponse.steps.map((step) => ({
        id: step.id,
        type: step.type,
        name: step.name,
        controlValues: step.controls?.values || {},
      })),
    } as UpdateWorkflowDto;
  }
});
