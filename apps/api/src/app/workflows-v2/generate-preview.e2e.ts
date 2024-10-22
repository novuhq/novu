import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { randomUUID } from 'node:crypto';
import { after, beforeEach } from 'mocha';
import { sleep } from '@nestjs/terminus/dist/utils';
import {
  ChannelTypeEnum,
  EmailStepControlSchemaDto,
  FeatureFlagsKeysEnum,
  GeneratePreviewRequestDto,
  GeneratePreviewResponseDto,
  RedirectTargetEnum,
  StepTypeEnum,
  TipTapNode,
} from '@novu/shared';
import { InAppOutput } from '@novu/framework';
import { createWorkflowClient, HttpError, NovuRestResult } from './clients';
import { buildCreateWorkflowDto } from './workflow.controller.e2e';

describe('Control Schema', () => {
  let session: UserSession;
  let workflowsClient: ReturnType<typeof createWorkflowClient>;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    workflowsClient = createWorkflowClient(session.serverUrl, getHeaders());
    // @ts-ignore
    process.env[FeatureFlagsKeysEnum.IS_WORKFLOW_PREFERENCES_ENABLED] = 'true';
  });
  after(async () => {
    await sleep(1000);
  });
  describe('Generate Preview', () => {
    describe('Hydration testing', () => {
      const channelTypes = [{ type: StepTypeEnum.IN_APP, description: 'InApp' }];

      channelTypes.forEach(({ type, description }) => {
        it(`${type}:should match the body in the preview response`, async () => {
          const { stepUuid, workflowId } = await createWorkflowAndReturnId(type);
          const requestDto = buildDtoWithPayload(type);
          const previewResponseDto = await generatePreview(workflowId, stepUuid, requestDto, description);
          console.log('previewResponseDto', JSON.stringify(previewResponseDto));
          expect(previewResponseDto.result!.preview).to.exist;
          const expectedRenderedResult = buildInAppControlValues();
          expectedRenderedResult.subject = buildInAppControlValues().subject!.replace(
            PLACEHOLDER_SUBJECT_INAPP,
            PLACEHOLDER_SUBJECT_INAPP_PAYLOAD_VALUE
          );
          expect(previewResponseDto.result!.preview).to.deep.equal(expectedRenderedResult);
        });
      });
    });
    describe('Happy Path, no payload, expected same response as requested', () => {
      const channelTypes = [
        { type: StepTypeEnum.IN_APP, description: 'InApp' },
        { type: StepTypeEnum.SMS, description: 'SMS' },
        { type: StepTypeEnum.PUSH, description: 'Push' },
        { type: StepTypeEnum.CHAT, description: 'Chat' },
      ];

      channelTypes.forEach(({ type, description }) => {
        it(`${type}:should match the body in the preview response`, async () => {
          const { stepUuid, workflowId } = await createWorkflowAndReturnId(type);
          const requestDto = buildDtoNoPayload(type);
          const previewResponseDto = await generatePreview(workflowId, stepUuid, requestDto, description);
          expect(previewResponseDto.result!.preview).to.exist;
          expect(previewResponseDto.issues).to.exist;
          console.log('previewResponseDto.issues', JSON.stringify(previewResponseDto.issues));

          if (type !== StepTypeEnum.EMAIL) {
            expect(previewResponseDto.result!.preview).to.deep.equal(stepTypeTo[type]);
          } else {
            assertEmail(previewResponseDto);
          }
        });
      });
    });
    describe('Missing Required ControlValues', () => {
      const channelTypes = [{ type: StepTypeEnum.IN_APP, description: 'InApp' }];

      channelTypes.forEach(({ type, description }) => {
        it(`${type}: should assign default values to missing elements`, async () => {
          const { stepUuid, workflowId } = await createWorkflowAndReturnId(type);
          const requestDto = buildDtoWithMissingControlValues(type);
          const previewResponseDto = await generatePreview(workflowId, stepUuid, requestDto, description);
          expect(previewResponseDto.result!.preview.body).to.exist;
          expect(previewResponseDto.result!.preview.body).to.equal('PREVIEW_ISSUE:REQUIRED_CONTROL_VALUE_IS_MISSING');
          const { issues } = previewResponseDto;
          expect(issues).to.exist;
          expect(issues.body).to.exist;
        });
      });
    });
  });

  function getHeaders(): HeadersInit {
    return {
      Authorization: session.token, // Fixed space
      'Novu-Environment-Id': session.environment._id,
    };
  }

  async function generatePreview(
    workflowId: string,
    stepUuid: string,
    dto: GeneratePreviewRequestDto,
    description: string
  ): Promise<GeneratePreviewResponseDto> {
    console.log('dto', JSON.stringify(dto, null, 2));
    const novuRestResult = await workflowsClient.generatePreview(workflowId, stepUuid, dto);
    if (novuRestResult.isSuccessResult()) {
      return novuRestResult.value;
    }
    throw await assertHttpError(description, novuRestResult);
  }

  async function createWorkflowAndReturnId(type: StepTypeEnum) {
    const createWorkflowDto = buildCreateWorkflowDto(`${type}:${randomUUID()}`);
    createWorkflowDto.steps[0].type = type;
    const workflowResult = await workflowsClient.createWorkflow(createWorkflowDto);
    if (!workflowResult.isSuccessResult()) {
      throw new Error(`Failed to create workflow ${JSON.stringify(workflowResult.error)}`);
    }

    return { workflowId: workflowResult.value._id, stepUuid: workflowResult.value.steps[0].stepUuid };
  }
});

function buildDtoNoPayload(stepTypeEnum: StepTypeEnum): GeneratePreviewRequestDto {
  return {
    validationStrategies: [],
    controlValues: stepTypeTo[stepTypeEnum],
  };
}
function buildDtoWithPayload(stepTypeEnum: StepTypeEnum): GeneratePreviewRequestDto {
  return {
    validationStrategies: [],
    controlValues: stepTypeTo[stepTypeEnum],
    payloadValues: { subject: PLACEHOLDER_SUBJECT_INAPP_PAYLOAD_VALUE },
  };
}

function buildDtoWithMissingControlValues(stepTypeEnum: StepTypeEnum): GeneratePreviewRequestDto {
  const stepTypeToElement = stepTypeTo[stepTypeEnum];
  if (stepTypeEnum === StepTypeEnum.EMAIL) {
    delete stepTypeToElement.subject;
  } else {
    delete stepTypeToElement.body;
  }

  return {
    validationStrategies: [],
    controlValues: stepTypeToElement,
    payloadValues: { subject: PLACEHOLDER_SUBJECT_INAPP_PAYLOAD_VALUE },
  };
}

const SUBJECT_TEST_PAYLOAD = '{{payload.subject.test.payload}}';

const PLACEHOLDER_SUBJECT_INAPP = '{{payload.subject}}';
const PLACEHOLDER_SUBJECT_INAPP_PAYLOAD_VALUE = 'this is the replacement text for the placeholder';
function mailyJsonExample(): TipTapNode {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: '{{payload.intro}} Wow, this editor instance exports its content as JSON.',
          },
        ],
      },
      {
        type: 'for',
        attr: {
          each: '{{payload.comment}}',
        },
        content: [
          {
            type: 'h1',
            content: [
              {
                type: 'text',
                text: FOR_ITEM_VALUE_PLACEHOLDER,
              },
            ],
          },
        ],
      },
      {
        type: 'show',
        attr: {
          when: '{{payload.isPremiumPlan}}',
        },
        content: [
          {
            type: 'h1',
            content: [
              {
                type: 'text',
                text: TEST_SHOW_VALUE,
              },
            ],
          },
        ],
      },
    ],
  };
}
function buildEmailControlValuesPayload(): EmailStepControlSchemaDto {
  return {
    subject: `Hello, World! ${SUBJECT_TEST_PAYLOAD}`,
    emailEditor: mailyJsonExample(),
  };
}
function buildInAppControlValues(): InAppOutput {
  return {
    subject: `Hello, World! ${PLACEHOLDER_SUBJECT_INAPP}`,
    body: 'Hello, World! {{payload.placeholder.body}}',
    avatar: 'https://www.example.com/avatar.png',
    primaryAction: {
      label: 'Primary Action',
      redirect: {
        target: RedirectTargetEnum.BLANK,
        url: 'https://www.example.com/primary-action',
      },
    },
    secondaryAction: {
      label: 'Secondary Action',
      redirect: {
        target: RedirectTargetEnum.BLANK,
        url: 'https://www.example.com/secondary-action',
      },
    },
    data: {
      key: 'value',
    },
    redirect: {
      target: RedirectTargetEnum.BLANK,
      url: 'https://www.example.com/redirect',
    },
  };
}

function buildSmsControlValuesPayload() {
  return {
    body: 'Hello, World!',
  };
}

function buildPushControlValuesPayload() {
  return {
    subject: 'Hello, World!',
    body: 'Hello, World!',
  };
}

function buildChatControlValuesPayload() {
  return {
    body: 'Hello, World!',
  };
}
const FOR_ITEM_VALUE_PLACEHOLDER = '{#item.body#}';
const TEST_SHOW_VALUE = 'TEST_SHOW_VALUE';
const stepTypeTo = {
  [StepTypeEnum.SMS]: buildSmsControlValuesPayload(),
  [StepTypeEnum.EMAIL]: buildEmailControlValuesPayload() as unknown as Record<string, unknown>,
  [StepTypeEnum.PUSH]: buildPushControlValuesPayload(),
  [StepTypeEnum.CHAT]: buildChatControlValuesPayload(),
  [StepTypeEnum.IN_APP]: buildInAppControlValues(),
};

async function assertHttpError(
  description: string,
  novuRestResult: NovuRestResult<GeneratePreviewResponseDto, HttpError>
) {
  if (novuRestResult.error) {
    return new Error(`${description}: Failed to generate preview: ${novuRestResult.error.message}`);
  }

  return new Error(`${description}: Failed to generate preview, bug in response error mapping `);
}

function assertEmail(dto: GeneratePreviewResponseDto) {
  if (dto.result!.type === ChannelTypeEnum.EMAIL) {
    const preview = dto.result!.preview.body;
    expect(preview).to.exist;
    expect(preview).to.not.contain('{{payload.comment}}');
    expect(preview).to.contain(FOR_ITEM_VALUE_PLACEHOLDER);
    expect(preview).to.contain(TEST_SHOW_VALUE);
  }
}
