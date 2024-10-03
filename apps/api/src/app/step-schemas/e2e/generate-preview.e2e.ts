import { UserSession } from '@novu/testing';
import {
  createStepSchemaClient,
  createWorkflowClient,
  EmailRenderResult,
  GeneratePreviewRequestDto,
  GeneratePreviewResponseDto,
  HttpError,
  InAppRenderResult,
  NovuRestResult,
  RedirectTargetEnum,
  TiptapNodeDto,
} from '@novu/shared-internal';
import { expect } from 'chai';
import { randomUUID } from 'node:crypto';
import { after, beforeEach } from 'mocha';
import { sleep } from '@nestjs/terminus/dist/utils';
import { ChannelTypeEnum, FeatureFlagsKeysEnum, StepTypeEnum } from '@novu/shared';
import { buildCreateWorkflowDto } from '../../workflows-v2/workflow.controller.e2e';

async function assertHttpError(
  description: string,
  novuRestResult: NovuRestResult<GeneratePreviewResponseDto, HttpError>
) {
  if (novuRestResult.error) {
    return new Error(`${description}: Failed to generate preview: ${novuRestResult.error.message}`);
  }

  return new Error(`${description}: Failed to generate preview, bug in response error mapping `);
}

describe('Control Schema', () => {
  let session: UserSession;
  let stepSchemaClient: ReturnType<typeof createStepSchemaClient>;
  let workflowsClient: ReturnType<typeof createWorkflowClient>;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    stepSchemaClient = createStepSchemaClient(session.serverUrl, getHeaders());
    workflowsClient = createWorkflowClient(session.serverUrl, getHeaders());
    // @ts-ignore
    process.env[FeatureFlagsKeysEnum.IS_WORKFLOW_PREFERENCES_ENABLED] = 'true';
  });
  after(async () => {
    await sleep(1000);
  });
  describe('Generate Preview', () => {
    describe('Hydration testing', () => {
      it('HYDRATE_VARIABLES_WITH_PAYLOAD_VALUES_IF_EXIST should only hydrate based on strategy', async () => {});
      it('HYDRATE_SYSTEM_VARIABLES_WITH_DEFAULTS should only hydrate based on strategy', async () => {
        // Implement test logic here
      });
      it('HYDRATE_PAYLOAD_VARIABLES_WITH_RANDOM_VALUES should only hydrate based on strategy', async () => {
        // Implement test logic here
      });
      it('When using multiple strategies all should run', async () => {
        // Implement test logic here
      });
    });

    describe('Validation testing', () => {
      // Implement validation tests
    });

    describe('Happy Path', () => {
      const channelTypes = [
        // { type: ChannelTypeEnum.SMS, description: 'SMS' },
        { type: ChannelTypeEnum.EMAIL, description: 'Email' },
        /*
         * { type: ChannelTypeEnum.PUSH, description: 'Push' },
         * { type: ChannelTypeEnum.CHAT, description: 'Chat' },
         * { type: ChannelTypeEnum.IN_APP, description: 'InApp' },
         */
      ];

      channelTypes.forEach(({ type, description }) => {
        it(`${type}:should match the body in the preview response`, async () => {
          const workflowId = await createWorkflowAndReturnId(type);
          const requestDto = buildHappyDto(type, workflowId);
          const previewResponseDto = await generatePreview(type, requestDto, description);

          expect(previewResponseDto.result!.preview).to.exist;
          expect(previewResponseDto.result!.preview).to.deep.equal(dtos[type]);
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
    stepType: ChannelTypeEnum,
    dto: GeneratePreviewRequestDto,
    description: string
  ): Promise<GeneratePreviewResponseDto> {
    const novuRestResult = await stepSchemaClient.generatePreview(stepType, dto);
    if (novuRestResult.isSuccessResult()) {
      return novuRestResult.value;
    }
    throw await assertHttpError(description, novuRestResult);
  }

  async function createWorkflowAndReturnId(type: ChannelTypeEnum) {
    const createWorkflowDto = buildCreateWorkflowDto(type + randomUUID());
    const workflowResult = await workflowsClient.createWorkflow(createWorkflowDto);
    if (!workflowResult.isSuccessResult()) {
      throw new Error(`Failed to create workflow ${JSON.stringify(workflowResult.error)}`);
    }

    return workflowResult.value._id;
  }
});

function buildHappyDto(stepTypeEnum: ChannelTypeEnum, workflowId: string): GeneratePreviewRequestDto {
  return {
    workflowId,
    validationStrategies: [],
    hydrationStrategies: [],
    controlValues: dtos[stepTypeEnum],
    controlSchema: {
      type: 'object',
      properties: {
        body: {
          type: 'string',
        },
      },
      required: ['body'],
      additionalProperties: false,
    },
  };
}

function buildInAppControlValues(): InAppRenderResult {
  return {
    subject: 'Hello, World!',
    body: 'Hello, World!',
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

function mailyJsonExample(): TiptapNodeDto {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: '{{novu.payload.intro}} Wow, this editor instance exports its content as JSON.',
          },
        ],
      },
      {
        type: 'for',
        attr: {
          each: '{{novu.payload.comment}}',
        },
        content: [
          {
            type: 'h1',
            content: [
              {
                type: 'text',
                text: '{{novu.item.body}}',
              },
            ],
          },
        ],
      },
      {
        type: 'show',
        attr: {
          when: '{{novu.payload.isPremiumPlan}}',
        },
        content: [
          {
            type: 'h1',
            content: [
              {
                type: 'text',
                text: 'Hi customer',
              },
            ],
          },
        ],
      },
    ],
  };
}

function buildEmailControls(): EmailRenderResult {
  return {
    subject: 'Hello, World!',
    body: mailyJsonExample(),
  };
}

const dtos: Record<ChannelTypeEnum, Record<string, unknown>> = {
  [StepTypeEnum.SMS]: {
    body: 'Hello, World!',
  },
  [StepTypeEnum.EMAIL]: buildEmailControls(),
  [StepTypeEnum.PUSH]: {
    subject: 'Hello, World!',
    body: 'Hello, World!',
  },
  [StepTypeEnum.CHAT]: {
    body: 'Hello, World!',
  },
  [StepTypeEnum.IN_APP]: buildInAppControlValues(),
};
