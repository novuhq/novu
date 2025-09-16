import { JSONContent as MailyJSONContent } from '@maily-to/render';
import { ModuleRef } from '@nestjs/core';
import { CreateExecutionDetails, DetailEnum, FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { ControlValuesRepository, JobEntity, JobRepository } from '@novu/dal';
import {
  ControlValuesLevelEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  JobStatusEnum,
  LAYOUT_CONTENT_VARIABLE,
  StepTypeEnum,
} from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { GetLayoutUseCase } from '../../../layouts-v2/usecases/get-layout';
import { GetOrganizationSettings } from '../../../organization/usecases/get-organization-settings/get-organization-settings.usecase';
import { EmailOutputRendererCommand, EmailOutputRendererUsecase } from './email-output-renderer.usecase';
import { FullPayloadForRender } from './render-command';

describe('EmailOutputRendererUsecase', () => {
  let featureFlagsServiceMock: sinon.SinonStubbedInstance<FeatureFlagsService>;
  let moduleRef: sinon.SinonStubbedInstance<ModuleRef>;
  let getOrganizationSettingsMock: sinon.SinonStubbedInstance<GetOrganizationSettings>;
  let pinoLoggerMock: sinon.SinonStubbedInstance<PinoLogger>;
  let controlValuesRepositoryMock: sinon.SinonStubbedInstance<ControlValuesRepository>;
  let getLayoutUseCase: sinon.SinonStubbedInstance<GetLayoutUseCase>;
  let jobRepositoryMock: sinon.SinonStubbedInstance<JobRepository>;
  let createExecutionDetailsMock: sinon.SinonStubbedInstance<CreateExecutionDetails>;
  let emailOutputRendererUsecase: EmailOutputRendererUsecase;

  beforeEach(async () => {
    moduleRef = sinon.createStubInstance(ModuleRef);
    featureFlagsServiceMock = sinon.createStubInstance(FeatureFlagsService);
    featureFlagsServiceMock.getFlag.withArgs(sinon.match.has('key', 'IS_TRANSLATION_ENABLED')).resolves(false);
    getOrganizationSettingsMock = sinon.createStubInstance(GetOrganizationSettings);
    getOrganizationSettingsMock.execute.resolves({
      removeNovuBranding: false,
      defaultLocale: 'en_US',
    });
    pinoLoggerMock = sinon.createStubInstance(PinoLogger);
    controlValuesRepositoryMock = sinon.createStubInstance(ControlValuesRepository);
    getLayoutUseCase = sinon.createStubInstance(GetLayoutUseCase);
    jobRepositoryMock = sinon.createStubInstance(JobRepository);
    createExecutionDetailsMock = sinon.createStubInstance(CreateExecutionDetails);

    emailOutputRendererUsecase = new EmailOutputRendererUsecase(
      getOrganizationSettingsMock as any,
      moduleRef as any,
      pinoLoggerMock as any,
      featureFlagsServiceMock as any,
      controlValuesRepositoryMock as any,
      getLayoutUseCase as any,
      jobRepositoryMock as any,
      createExecutionDetailsMock as any
    );
  });

  afterEach(() => {
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

  describe('general flow', () => {
    it('should return subject and body when body is not string', async () => {
      let renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Test Subject',
          body: undefined,
        },
        fullPayloadForRender: mockFullPayload,
        workflowId: mockDbWorkflow._id,
        stepId: 'fake_step_id',
      };

      let result = await emailOutputRendererUsecase.execute(renderCommand);

      expect(result).to.deep.equal({
        subject: 'Test Subject',
        body: undefined,
      });

      renderCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Test Subject',
          body: 123 as any,
        },
        fullPayloadForRender: mockFullPayload,
        workflowId: mockDbWorkflow._id,
        stepId: 'fake_step_id',
      };

      result = await emailOutputRendererUsecase.execute(renderCommand);

      expect(result).to.deep.equal({
        subject: 'Test Subject',
        body: 123,
      });
    });

    it('should process simple text with liquid variables', async () => {
      const mockTipTapNode: MailyJSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Hello {{payload.name}}',
              },
            ],
          },
        ],
      };

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Welcome Email',
          body: JSON.stringify(mockTipTapNode),
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: { name: 'John' },
        },
        workflowId: mockDbWorkflow._id,
        stepId: 'fake_step_id',
      };

      const result = await emailOutputRendererUsecase.execute(renderCommand);

      expect(result).to.have.property('subject', 'Welcome Email');
      expect(result.body).to.include('Hello John');
    });

    it('should handle nested object variables with liquid syntax', async () => {
      const mockTipTapNode: MailyJSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Hello {{payload.user.name}}, your order #{{payload.order.id}} status is {{payload.order.status}}',
              },
            ],
          },
        ],
      };

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Order Update',
          body: JSON.stringify(mockTipTapNode),
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: {
            user: { name: 'John Doe' },
            order: { id: '12345', status: 'shipped' },
          },
        },
        workflowId: mockDbWorkflow._id,
        stepId: 'fake_step_id',
      };

      const result = await emailOutputRendererUsecase.execute(renderCommand);

      expect(result).to.have.property('subject', 'Order Update');
      expect(result.body).to.include('Hello John Doe');
      expect(result.body).to.include('your order #12345');
      expect(result.body).to.include('status is shipped');
    });

    it('should handle liquid variables with default values', async () => {
      const mockTipTapNode: MailyJSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `Hello {{payload.name | default: 'valued customer'}}`,
              },
            ],
          },
        ],
      };

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Welcome',
          body: JSON.stringify(mockTipTapNode),
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: {},
        },
        workflowId: mockDbWorkflow._id,
        stepId: 'fake_step_id',
      };

      const result = await emailOutputRendererUsecase.execute(renderCommand);

      expect(result).to.have.property('subject', 'Welcome');
      expect(result.body).to.include('Hello valued customer');
    });
  });

  describe('variable node transformation to text', () => {
    it('should handle maily variables', async () => {
      const mockTipTapNode: MailyJSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Welcome ',
              },
              {
                type: 'variable',
                attrs: {
                  id: 'payload.name',
                },
              },
              {
                type: 'text',
                text: '! Your order ',
              },
              {
                type: 'variable',
                attrs: {
                  id: 'payload.order.number',
                },
              },
              {
                type: 'text',
                text: ' has been ',
              },
              {
                type: 'variable',
                attrs: {
                  id: 'payload.order.status',
                },
              },
            ],
          },
        ],
      };

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Order Status',
          body: JSON.stringify(mockTipTapNode),
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: {
            name: 'John',
            order: {
              number: '#12345',
              status: 'shipped',
            },
          },
        },
        workflowId: mockDbWorkflow._id,
        stepId: 'fake_step_id',
      };

      const result = await emailOutputRendererUsecase.execute(renderCommand);

      expect(result.subject).to.equal('Order Status');
      expect(result.body).to.include('Welcome');
      expect(result.body).to.include('John');
      expect(result.body).to.include('Your order');
      expect(result.body).to.include('#12345');
      expect(result.body).to.include('has been');
      expect(result.body).to.include('shipped');
    });

    it('should handle maily variables with fallback values', async () => {
      const mockTipTapNode: MailyJSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Hello ',
              },
              {
                type: 'variable',
                attrs: {
                  id: 'payload.name',
                  fallback: 'valued customer',
                },
              },
              {
                type: 'text',
                text: '! Your ',
              },
              {
                type: 'variable',
                attrs: {
                  id: 'payload.subscription.tier',
                  fallback: 'free',
                },
              },
              {
                type: 'text',
                text: ' subscription will expire in ',
              },
              {
                type: 'variable',
                attrs: {
                  id: 'payload.subscription.daysLeft',
                  fallback: '30',
                },
              },
              {
                type: 'text',
                text: ' days.',
              },
            ],
          },
        ],
      };

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Subscription Update',
          body: JSON.stringify(mockTipTapNode),
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: {}, // Empty payload to test fallback values
        },
        workflowId: mockDbWorkflow._id,
        stepId: 'fake_step_id',
      };

      const result = await emailOutputRendererUsecase.execute(renderCommand);

      expect(result.subject).to.equal('Subscription Update');
      expect(result.body).to.include('Hello');
      expect(result.body).to.include('valued customer');
      expect(result.body).to.include('Your');
      expect(result.body).to.include('free');
      expect(result.body).to.include('subscription');
      expect(result.body).to.include('expire in');
      expect(result.body).to.include('30');
      expect(result.body).to.include('days');

      // Test with partial data
      const renderCommandWithPartialData = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Subscription Update',
          body: JSON.stringify(mockTipTapNode),
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: {
            name: 'John',
            subscription: {
              tier: 'premium',
            },
          },
        },
        workflowId: mockDbWorkflow._id,
        stepId: 'fake_step_id',
      };

      const resultWithPartialData = await emailOutputRendererUsecase.execute(renderCommandWithPartialData);

      expect(resultWithPartialData.body).to.include('Hello');
      expect(resultWithPartialData.body).to.include('John'); // variable
      expect(resultWithPartialData.body).to.include('Your');
      expect(resultWithPartialData.body).to.include('premium'); // variable
      expect(resultWithPartialData.body).to.include('subscription');
      expect(resultWithPartialData.body).to.include('expire in');
      expect(resultWithPartialData.body).to.include('30');
      expect(resultWithPartialData.body).to.include('days');
    });
  });

  describe('conditional block transformation (showIfKey)', () => {
    describe('truthy conditions', () => {
      const truthyValues = [
        { value: true, desc: 'boolean true' },
        { value: 1, desc: 'number 1' },
        { value: 'true', desc: 'string "true"' },
        { value: 'TRUE', desc: 'string "TRUE"' },
        { value: 'yes', desc: 'string "yes"' },
        { value: {}, desc: 'empty object' },
        { value: [], desc: 'empty array' },
      ];

      const mockTipTapNode: MailyJSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Before condition',
              },
              {
                type: 'section',
                attrs: {
                  showIfKey: 'payload.isPremium',
                },
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'Premium content',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'text',
                text: 'After condition',
              },
            ],
          },
        ],
      };

      truthyValues.forEach(({ value, desc }) => {
        it(`should render content when showIfKey is ${desc}`, async () => {
          const renderCommand: EmailOutputRendererCommand = {
            environmentId: 'fake_env_id',
            organizationId: 'fake_org_id',
            controlValues: {
              subject: 'Conditional Test',
              body: JSON.stringify(mockTipTapNode),
            },
            fullPayloadForRender: {
              ...mockFullPayload,
              payload: {
                isPremium: value,
              },
            },
            workflowId: mockDbWorkflow._id,
            stepId: 'fake_step_id',
          };

          const result = await emailOutputRendererUsecase.execute(renderCommand);

          expect(result.body).to.include('Before condition');
          expect(result.body).to.include('Premium content');
          expect(result.body).to.include('After condition');
        });
      });
    });

    describe('falsy conditions', () => {
      const falsyValues = [
        { value: false, desc: 'boolean false' },
        { value: 0, desc: 'number 0' },
        { value: '', desc: 'empty string' },
        { value: null, desc: 'null' },
        { value: undefined, desc: 'undefined' },
        { value: 'UNDEFINED', desc: 'string "UNDEFINED"' },
      ];

      const mockTipTapNode: MailyJSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Before condition',
              },
              {
                type: 'section',
                attrs: {
                  showIfKey: 'payload.isPremium',
                },
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'Premium content',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'text',
                text: 'After condition',
              },
            ],
          },
        ],
      };

      falsyValues.forEach(({ value, desc }) => {
        it(`should not render content when showIfKey is ${desc}`, async () => {
          const renderCommand: EmailOutputRendererCommand = {
            environmentId: 'fake_env_id',
            organizationId: 'fake_org_id',
            controlValues: {
              subject: 'Conditional Test',
              body: JSON.stringify(mockTipTapNode),
            },
            fullPayloadForRender: {
              ...mockFullPayload,
              payload: {
                isPremium: value,
              },
            },
            workflowId: mockDbWorkflow._id,
            stepId: 'fake_step_id',
          };

          const result = await emailOutputRendererUsecase.execute(renderCommand);

          expect(result.body).to.include('Before condition');
          expect(result.body).to.not.include('Premium content');
          expect(result.body).to.include('After condition');
        });
      });
    });

    it('should handle nested conditional blocks correctly', async () => {
      const mockTipTapNode: MailyJSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'section',
                attrs: {
                  showIfKey: 'payload.isSubscribed',
                },
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'Subscriber content',
                      },
                      {
                        type: 'section',
                        attrs: {
                          showIfKey: 'payload.isPremium',
                        },
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                type: 'text',
                                text: 'Premium content',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Nested Conditional Test',
          body: JSON.stringify(mockTipTapNode),
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: {
            isSubscribed: true,
            isPremium: true,
          },
        },
        workflowId: mockDbWorkflow._id,
        stepId: 'fake_step_id',
      };

      let result = await emailOutputRendererUsecase.execute(renderCommand);
      expect(result.body).to.include('Subscriber content');
      expect(result.body).to.include('Premium content');

      // Test with outer true, inner false
      renderCommand.fullPayloadForRender.payload = {
        isSubscribed: true,
        isPremium: false,
      };
      result = await emailOutputRendererUsecase.execute(renderCommand);
      expect(result.body).to.include('Subscriber content');
      expect(result.body).to.not.include('Premium content');

      // Test with outer false
      renderCommand.fullPayloadForRender.payload = {
        isSubscribed: false,
        isPremium: true,
      };
      result = await emailOutputRendererUsecase.execute(renderCommand);
      expect(result.body).to.not.include('Subscriber content');
      expect(result.body).to.not.include('Premium content');
    });
  });

  describe('repeat block transformation and expansion', () => {
    it('should handle repeat loop block transformation with array of objects', async () => {
      const mockTipTapNode: MailyJSONContent = {
        type: 'doc',
        content: [
          {
            type: 'repeat',
            attrs: {
              each: 'payload.comments',
              isUpdatingKey: false,
              showIfKey: null,
            },
            content: [
              {
                type: 'paragraph',
                attrs: {
                  textAlign: 'left',
                },
                content: [
                  {
                    type: 'text',
                    text: 'This is an author: ',
                  },
                  {
                    type: 'variable',
                    attrs: {
                      id: 'payload.comments.author',
                      label: null,
                      fallback: null,
                      required: false,
                    },
                  },
                  {
                    type: 'variable',
                    attrs: {
                      // variable not belonging to the loop
                      id: 'payload.postTitle',
                      label: null,
                      fallback: null,
                      required: false,
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Repeat Loop Test',
          body: JSON.stringify(mockTipTapNode),
          disableOutputSanitization: true,
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: {
            postTitle: 'Post Title',
            comments: [{ author: 'John' }, { author: 'Jane' }],
          },
        },
        workflowId: mockDbWorkflow._id,
        stepId: 'fake_step_id',
      };
      const result = await emailOutputRendererUsecase.execute(renderCommand);
      expect(result.body).to.include('This is an author: JohnPost Title');
      expect(result.body).to.include('This is an author: JanePost Title');

      // Verify exact number of items rendered matches input array
      const matches = result.body.match(/This is an author:/g);
      expect(matches).to.have.length(2);
    });

    it('should handle repeat loop block transformation with array of primitives', async () => {
      const mockTipTapNode: MailyJSONContent = {
        type: 'doc',
        content: [
          {
            type: 'repeat',
            attrs: {
              each: 'payload.names',
              isUpdatingKey: false,
              showIfKey: null,
            },
            content: [
              {
                type: 'paragraph',
                attrs: {
                  textAlign: 'left',
                },
                content: [
                  {
                    type: 'variable',
                    attrs: {
                      id: 'payload.names',
                      label: null,
                      fallback: null,
                      required: false,
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Repeat Loop Test',
          body: JSON.stringify(mockTipTapNode),
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: {
            names: ['John', 'Jane'],
          },
        },
        workflowId: mockDbWorkflow._id,
        stepId: 'fake_step_id',
      };
      const result = await emailOutputRendererUsecase.execute(renderCommand);
      expect(result.body).to.include('John');
      expect(result.body).to.include('Jane');
    });

    it('should limit iterations when iterations attribute is smaller than array length', async () => {
      const mockTipTapNode: MailyJSONContent = {
        type: 'doc',
        content: [
          {
            type: 'repeat',
            attrs: {
              each: 'payload.items',
              iterations: 2,
              isUpdatingKey: false,
              showIfKey: null,
            },
            content: [
              {
                type: 'paragraph',
                attrs: {
                  textAlign: 'left',
                },
                content: [
                  {
                    type: 'text',
                    text: 'Item ',
                  },
                  {
                    type: 'variable',
                    attrs: {
                      id: 'payload.items',
                      label: null,
                      fallback: null,
                      required: false,
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Repeat Loop Test Limited Iterations',
          body: JSON.stringify(mockTipTapNode),
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: {
            items: ['item1', 'item2', 'item3', 'item4'],
          },
        },
        workflowId: mockDbWorkflow._id,
        stepId: 'fake_step_id',
      };

      const result = await emailOutputRendererUsecase.execute(renderCommand);

      // Should only create 2 items as iterations is set to 2
      expect(result.body).to.include('Item item1');
      expect(result.body).to.include('Item item2');
      expect(result.body).to.not.include('Item item3');
      expect(result.body).to.not.include('Item item4');
    });

    it('should render entire array when iterations attribute is larger than array length', async () => {
      const mockTipTapNode: MailyJSONContent = {
        type: 'doc',
        content: [
          {
            type: 'repeat',
            attrs: {
              each: 'payload.items',
              iterations: 10,
              isUpdatingKey: false,
              showIfKey: null,
            },
            content: [
              {
                type: 'paragraph',
                attrs: {
                  textAlign: 'left',
                },
                content: [
                  {
                    type: 'text',
                    text: 'Item ',
                  },
                  {
                    type: 'variable',
                    attrs: {
                      id: 'payload.items',
                      label: null,
                      fallback: null,
                      required: false,
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Repeat Loop Test More Iterations',
          body: JSON.stringify(mockTipTapNode),
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: {
            items: ['item1', 'item2', 'item3'],
          },
        },
        workflowId: mockDbWorkflow._id,
        stepId: 'fake_step_id',
      };

      const result = await emailOutputRendererUsecase.execute(renderCommand);

      // Should render all 3 items even though iterations is set to 10
      expect(result.body).to.include('Item item1');
      expect(result.body).to.include('Item item2');
      expect(result.body).to.include('Item item3');

      const matches = result.body.match(/Item item/g);
      expect(matches).to.have.length(3);
    });
  });

  describe('node attrs and marks attrs hydration', () => {
    it('should handle links with href attributes', async () => {
      const mockTipTapNode: MailyJSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Click ',
              },
              {
                type: 'text',
                marks: [
                  {
                    type: 'link',
                    attrs: {
                      href: 'payload.linkUrl',
                      target: '_blank',
                      isUrlVariable: true,
                    },
                  },
                ],
                text: 'here',
              },
              {
                type: 'text',
                text: ' to continue',
              },
            ],
          },
        ],
      };

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Link Test',
          body: JSON.stringify(mockTipTapNode),
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: {
            linkUrl: 'https://example.com',
          },
        },
        workflowId: mockDbWorkflow._id,
        stepId: 'fake_step_id',
      };

      const result = await emailOutputRendererUsecase.execute(renderCommand);
      expect(result.body).to.include('href="https://example.com"');
      expect(result.body).to.include('target="_blank"');
      expect(result.body).to.include('>here</a>');
    });

    it('should handle image nodes with variable attributes', async () => {
      const mockTipTapNode: MailyJSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'image',
                attrs: {
                  src: 'payload.imageUrl',
                  isSrcVariable: true,
                },
              },
            ],
          },
        ],
      };

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Image Test',
          body: JSON.stringify(mockTipTapNode),
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: {
            imageUrl: 'https://example.com/image.jpg',
          },
        },
        workflowId: mockDbWorkflow._id,
        stepId: 'fake_step_id',
      };

      const result = await emailOutputRendererUsecase.execute(renderCommand);
      expect(result.body).to.include('src="https://example.com/image.jpg"');
    });

    it('should handle marks attrs href', async () => {
      const mockTipTapNode: MailyJSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                marks: [
                  {
                    type: 'link',
                    attrs: {
                      href: 'payload.href',
                      isUrlVariable: true,
                    },
                  },
                ],
                text: 'Colored text',
              },
            ],
          },
        ],
      };

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Color Test',
          body: JSON.stringify(mockTipTapNode),
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: {
            href: 'https://example.com',
          },
        },
        workflowId: mockDbWorkflow._id,
        stepId: 'fake_step_id',
      };

      const result = await emailOutputRendererUsecase.execute(renderCommand);
      expect(result.body).to.include('href="https://example.com"');
    });
  });

  describe('enhanceContentVariable functionality', () => {
    it('should process content variable with shouldDangerouslySetInnerHTML behavior', async () => {
      const mockMailyContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'variable',
                attrs: {
                  id: LAYOUT_CONTENT_VARIABLE,
                  label: 'Content',
                },
              },
            ],
          },
        ],
      };

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Content Variable Test',
          body: JSON.stringify(mockMailyContent),
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          [LAYOUT_CONTENT_VARIABLE]: '<strong>Injected Content</strong>',
        },
        workflowId: mockDbWorkflow._id,
        stepId: 'fake_step_id',
      };

      const result = await emailOutputRendererUsecase.execute(renderCommand);

      // The content variable should be processed and the HTML should contain the injected content
      expect(result.body).to.include('<strong>Injected Content</strong>');
      expect(result.subject).to.equal('Content Variable Test');
    });

    it('should process non-content variables normally through liquid templating', async () => {
      const mockMailyContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'variable',
                attrs: {
                  id: 'payload.name',
                  label: 'Name',
                },
              },
            ],
          },
        ],
      };

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Non-Content Variable Test',
          body: JSON.stringify(mockMailyContent),
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: { name: 'John Doe' },
        },
        workflowId: mockDbWorkflow._id,
        stepId: 'fake_step_id',
      };

      const result = await emailOutputRendererUsecase.execute(renderCommand);

      // Regular variables should be processed through liquid templating
      expect(result.body).to.include('John Doe');
      expect(result.subject).to.equal('Non-Content Variable Test');
    });
  });

  describe('skipLayoutRendering functionality', () => {
    const simpleBodyContent = '<p>Step content {{payload.name}}</p>';
    const layoutContent = '<html><body><div class="layout">{{content}}</div></body></html>';

    let mockControlValuesEntity: any;
    let mockLayoutDto: any;

    beforeEach(() => {
      mockControlValuesEntity = {
        controls: {
          email: {
            body: layoutContent,
          },
        },
      };

      mockLayoutDto = {
        _id: 'test_layout_id',
        isDefault: false,
        name: 'test_layout_name',
        layoutId: 'test_layout_id',
      };

      controlValuesRepositoryMock.findOne.resolves(mockControlValuesEntity as any);
      getLayoutUseCase.execute.resolves(mockLayoutDto as any);
    });

    it('should skip layout rendering when skipLayoutRendering is true', async () => {
      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Skip Layout Test',
          body: simpleBodyContent,
          layoutId: 'test_layout_id',
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: { name: 'John' },
        },
        workflowId: mockDbWorkflow._id,
        skipLayoutRendering: true,
        stepId: 'fake_step_id',
      };

      const result = await emailOutputRendererUsecase.execute(renderCommand);

      expect(result.body).to.include('Step content John');
      expect(result.body).to.not.include('class="layout"');
      expect(result.body).to.not.include('<html>');
      expect(result.body).to.not.include('<body>');

      // Verify that layout was fetched but not applied
      expect(getLayoutUseCase.execute.calledOnce).to.be.true;
      expect(controlValuesRepositoryMock.findOne.calledOnce).to.be.true;
    });

    it('should log the execution details when jobId is provided', async () => {
      const mockJob: JobEntity = {
        _id: 'test_job_id',
        _environmentId: 'fake_env_id',
        _organizationId: 'fake_org_id',
        subscriberId: 'fake_subscriber_id',
        providerId: 'fake_provider_id',
        transactionId: 'fake_transaction_id',
        type: StepTypeEnum.EMAIL,
        status: JobStatusEnum.PENDING,
        identifier: 'fake_identifier',
        payload: {},
        overrides: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        step: {
          _id: 'fake_step_id',
          name: 'fake_step_name',
          _templateId: 'fake_template_id',
          active: true,
          replyCallback: {
            active: true,
            url: 'fake_url',
          },
        },
        _notificationId: 'fake_notification_id',
        _subscriberId: 'fake_subscriber_id',
        _userId: 'fake_user_id',
        _templateId: 'fake_template_id',
      };
      jobRepositoryMock.findOne.resolves(mockJob as any);
      createExecutionDetailsMock.execute.resolves();

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Skip Layout Test',
          body: simpleBodyContent,
          layoutId: 'test_layout_id',
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: { name: 'John' },
        },
        workflowId: mockDbWorkflow._id,
        jobId: mockJob._id,
        stepId: 'fake_step_id',
      };

      await emailOutputRendererUsecase.execute(renderCommand);

      expect(getLayoutUseCase.execute.calledOnce).to.be.true;
      expect(controlValuesRepositoryMock.findOne.calledOnce).to.be.true;
      expect(jobRepositoryMock.findOne.calledOnce).to.be.true;
      expect(jobRepositoryMock.findOne.firstCall.args[0]._id).to.equal(mockJob._id);
      expect(jobRepositoryMock.findOne.firstCall.args[0]._environmentId).to.equal('fake_env_id');
      expect(createExecutionDetailsMock.execute.calledOnce).to.be.true;
      expect(createExecutionDetailsMock.execute.firstCall.args[0].jobId).to.equal(mockJob._id);
      expect(createExecutionDetailsMock.execute.firstCall.args[0].detail).to.equal(DetailEnum.LAYOUT_SELECTED);
      expect(createExecutionDetailsMock.execute.firstCall.args[0].source).to.equal(ExecutionDetailsSourceEnum.INTERNAL);
      expect(createExecutionDetailsMock.execute.firstCall.args[0].status).to.equal(ExecutionDetailsStatusEnum.PENDING);
      expect(createExecutionDetailsMock.execute.firstCall.args[0].isTest).to.be.false;
      expect(createExecutionDetailsMock.execute.firstCall.args[0].isRetry).to.be.false;
      expect(createExecutionDetailsMock.execute.firstCall.args[0].raw).to.equal(
        JSON.stringify({ name: 'test_layout_name', layoutId: 'test_layout_id' })
      );
    });

    it('should apply layout rendering when skipLayoutRendering is false', async () => {
      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Apply Layout Test',
          body: simpleBodyContent,
          layoutId: 'test_layout_id',
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: { name: 'John' },
        },
        workflowId: mockDbWorkflow._id,
        skipLayoutRendering: false,
        stepId: 'fake_step_id',
      };

      const result = await emailOutputRendererUsecase.execute(renderCommand);

      expect(result.body).to.include('Step content John');
      expect(result.body).to.include('class="layout"');
      expect(result.body).to.include('<html>');
      expect(result.body).to.include('<body>');

      expect(getLayoutUseCase.execute.calledOnce).to.be.true;
      expect(controlValuesRepositoryMock.findOne.calledOnce).to.be.true;
    });

    it('should apply layout rendering when skipLayoutRendering is undefined', async () => {
      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Default Layout Test',
          body: simpleBodyContent,
          layoutId: 'test_layout_id',
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: { name: 'John' },
        },
        workflowId: mockDbWorkflow._id,
        stepId: 'fake_step_id',
      };

      const result = await emailOutputRendererUsecase.execute(renderCommand);

      expect(result.body).to.include('Step content John');
      expect(result.body).to.include('class="layout"');
      expect(result.body).to.include('<html>');
      expect(result.body).to.include('<body>');

      expect(getLayoutUseCase.execute.calledOnce).to.be.true;
      expect(controlValuesRepositoryMock.findOne.calledOnce).to.be.true;
    });

    it('should skip layout rendering with maily content when skipLayoutRendering is true', async () => {
      const mailyStepContent = JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Hello {{payload.name}}',
              },
            ],
          },
        ],
      });

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Skip Layout Maily Test',
          body: mailyStepContent,
          layoutId: 'test_layout_id',
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: { name: 'John' },
        },
        workflowId: mockDbWorkflow._id,
        skipLayoutRendering: true,
        stepId: 'fake_step_id',
      };

      const result = await emailOutputRendererUsecase.execute(renderCommand);

      expect(result.body).to.include('Hello John');
      expect(result.body).to.not.include('class="layout"');
      expect(result.body).to.not.include('<html>');

      // Should still process the maily content and apply liquid templating
      expect(result.body).to.not.include('{{payload.name}}');
    });

    it('should properly clean content even when skipping layout rendering', async () => {
      const bodyWithDoctype = '<!DOCTYPE html><p>Content {{payload.name}}</p><!--$-->';

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Clean Content Test',
          body: bodyWithDoctype,
          layoutId: 'test_layout_id',
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: { name: 'John' },
        },
        workflowId: mockDbWorkflow._id,
        skipLayoutRendering: true,
        stepId: 'fake_step_id',
      };

      const result = await emailOutputRendererUsecase.execute(renderCommand);

      expect(result.body).to.include('Content John');
      expect(result.body).to.not.include('<!DOCTYPE');
      expect(result.body).to.not.include('<!--$-->');
      expect(result.body).to.not.include('class="layout"');
    });

    it('should handle skipLayoutRendering when no layout controls exist', async () => {
      controlValuesRepositoryMock.findOne.resolves(null);

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'No Layout Test',
          body: simpleBodyContent,
          layoutId: 'non_existent_layout_id',
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: { name: 'John' },
        },
        workflowId: mockDbWorkflow._id,
        skipLayoutRendering: true,
        stepId: 'fake_step_id',
      };

      const result = await emailOutputRendererUsecase.execute(renderCommand);

      expect(result.body).to.include('Step content John');
      expect(result.body).to.not.include('class="layout"');

      // Should still attempt to fetch layout but gracefully handle null result
      expect(getLayoutUseCase.execute.calledOnce).to.be.true;
      expect(controlValuesRepositoryMock.findOne.calledOnce).to.be.true;
    });
  });

  describe('Layout functionality', () => {
    const simpleBodyContent = '<p>Step content {{payload.name}}</p>';
    const layoutContent = '<html><body><div class="layout">{{content}}</div></body></html>';

    let mockControlValuesEntity: any;
    let mockLayoutDto: any;

    beforeEach(() => {
      // Reset mocks
      mockControlValuesEntity = {
        controls: {
          email: {
            body: layoutContent,
          },
        },
      };

      mockLayoutDto = {
        _id: 'default_layout_id',
        isDefault: true,
      };

      // Set default stub returns
      controlValuesRepositoryMock.findOne.resolves(mockControlValuesEntity as any);
      getLayoutUseCase.execute.resolves(mockLayoutDto as any);
    });

    afterEach(() => {
      sinon.restore();
    });

    describe('when layouts feature flag is enabled', () => {
      it('should render with specified layout when layoutId is provided', async () => {
        const renderCommand: EmailOutputRendererCommand = {
          environmentId: 'fake_env_id',
          organizationId: 'fake_org_id',
          controlValues: {
            subject: 'Layout Test',
            body: simpleBodyContent,
            layoutId: 'test_layout_id',
          },
          fullPayloadForRender: {
            ...mockFullPayload,
            payload: { name: 'John' },
          },
          workflowId: mockDbWorkflow._id,
          stepId: 'fake_step_id',
        };
        getLayoutUseCase.execute.resolves({ _id: 'test_layout_id', isDefault: false } as any);

        const result = await emailOutputRendererUsecase.execute(renderCommand);

        expect(result.body).to.include('class="layout"');
        expect(result.body).to.include('Step content John');
        expect(result.body).to.include('<html>');
        expect(result.body).to.include('<body>');

        // Verify repository was called with correct parameters
        expect(controlValuesRepositoryMock.findOne.calledOnce).to.be.true;
        expect(controlValuesRepositoryMock.findOne.firstCall.args[0]).to.deep.eq({
          _organizationId: 'fake_org_id',
          _environmentId: 'fake_env_id',
          _layoutId: 'test_layout_id',
          level: ControlValuesLevelEnum.LAYOUT_CONTROLS,
        });

        expect(getLayoutUseCase.execute.called).to.be.true;
      });

      it('should not use layout when layoutId is null', async () => {
        const renderCommand: EmailOutputRendererCommand = {
          environmentId: 'fake_env_id',
          organizationId: 'fake_org_id',
          controlValues: {
            subject: 'Layout Test',
            body: simpleBodyContent,
            layoutId: null,
          },
          fullPayloadForRender: {
            ...mockFullPayload,
            payload: { name: 'John' },
          },
          workflowId: mockDbWorkflow._id,
          stepId: 'fake_step_id',
        };

        const result = await emailOutputRendererUsecase.execute(renderCommand);

        expect(result.body).to.not.include('class="layout"');
        expect(result.body).to.include('Step content John');
        expect(result.body).to.not.include('<html>');

        expect(getLayoutUseCase.execute.calledOnce).to.be.false;
        expect(controlValuesRepositoryMock.findOne.calledOnce).to.be.false;
      });

      it('should render without layout when no layout controls are found', async () => {
        controlValuesRepositoryMock.findOne.resolves(null);
        getLayoutUseCase.execute.resolves({ _id: 'non_existent_layout_id' } as any);

        const renderCommand: EmailOutputRendererCommand = {
          environmentId: 'fake_env_id',
          organizationId: 'fake_org_id',
          controlValues: {
            subject: 'Layout Test',
            body: simpleBodyContent,
            layoutId: 'non_existent_layout_id',
          },
          fullPayloadForRender: {
            ...mockFullPayload,
            payload: { name: 'John' },
          },
          workflowId: mockDbWorkflow._id,
          stepId: 'fake_step_id',
        };

        const result = await emailOutputRendererUsecase.execute(renderCommand);

        expect(result.body).to.include('Step content John');
        expect(result.body).to.not.include('class="layout"');
        expect(result.body).to.not.include('<html>');

        // Verify repository was called but returned null
        expect(controlValuesRepositoryMock.findOne.calledOnce).to.be.true;
      });

      it('should clean step content before injecting into layout', async () => {
        const bodyWithDoctype = '<!DOCTYPE html><p>Content</p><!--/$-->';

        const renderCommand: EmailOutputRendererCommand = {
          environmentId: 'fake_env_id',
          organizationId: 'fake_org_id',
          controlValues: {
            subject: 'Layout Test',
            body: bodyWithDoctype,
            layoutId: 'test_layout_id',
          },
          fullPayloadForRender: {
            ...mockFullPayload,
            payload: { name: 'John' },
          },
          workflowId: mockDbWorkflow._id,
          stepId: 'fake_step_id',
        };

        const result = await emailOutputRendererUsecase.execute(renderCommand);

        expect(result.body).to.include('class="layout"');
        expect(result.body).to.include('<p>Content</p>');
        expect(result.body).to.not.include('<!DOCTYPE');
        expect(result.body).to.not.include('<!--/$-->');
      });

      it('should handle layout with liquid variables in layout content', async () => {
        const layoutWithVariables =
          '<html><body><h1>{{payload.title}}</h1><div class="layout">{{content}}</div></body></html>';

        controlValuesRepositoryMock.findOne.resolves({
          _id: 'test_layout_id',
          _organizationId: 'fake_org_id',
          _environmentId: 'fake_env_id',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          level: ControlValuesLevelEnum.LAYOUT_CONTROLS,
          priority: 0,
          controls: {
            email: {
              body: layoutWithVariables,
            },
          },
        });

        const renderCommand: EmailOutputRendererCommand = {
          environmentId: 'fake_env_id',
          organizationId: 'fake_org_id',
          controlValues: {
            subject: 'Layout Test',
            body: simpleBodyContent,
            layoutId: 'test_layout_id',
          },
          fullPayloadForRender: {
            ...mockFullPayload,
            payload: { name: 'John', title: 'Welcome' },
          },
          workflowId: mockDbWorkflow._id,
          stepId: 'fake_step_id',
        };

        const result = await emailOutputRendererUsecase.execute(renderCommand);

        expect(result.body).to.include('<h1>Welcome</h1>');
        expect(result.body).to.include('class="layout"');
        expect(result.body).to.include('Step content John');
      });

      it('should handle maily content in layout', async () => {
        const mailyLayoutContent = JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Layout: ',
                },
                {
                  type: 'variable',
                  attrs: {
                    id: 'content',
                  },
                },
              ],
            },
          ],
        });

        controlValuesRepositoryMock.findOne.resolves({
          _id: 'test_layout_id',
          _organizationId: 'fake_org_id',
          _environmentId: 'fake_env_id',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          level: ControlValuesLevelEnum.LAYOUT_CONTROLS,
          priority: 0,
          controls: {
            email: {
              body: mailyLayoutContent,
            },
          },
        });

        const mailyStepContent = JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Hello {{payload.name}}',
                },
              ],
            },
          ],
        });

        const renderCommand: EmailOutputRendererCommand = {
          environmentId: 'fake_env_id',
          organizationId: 'fake_org_id',
          controlValues: {
            subject: 'Layout Test',
            body: mailyStepContent,
            layoutId: 'test_layout_id',
          },
          fullPayloadForRender: {
            ...mockFullPayload,
            payload: { name: 'John' },
          },
          workflowId: mockDbWorkflow._id,
          stepId: 'fake_step_id',
        };

        const result = await emailOutputRendererUsecase.execute(renderCommand);

        expect(result.body).to.include('Layout:');
        expect(result.body).to.include('Hello John');
      });

      it('should handle layout with no email content', async () => {
        controlValuesRepositoryMock.findOne.resolves({
          _id: 'test_layout_id',
          _organizationId: 'fake_org_id',
          _environmentId: 'fake_env_id',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          level: ControlValuesLevelEnum.LAYOUT_CONTROLS,
          priority: 0,
          controls: {
            email: {},
          },
        });

        const renderCommand: EmailOutputRendererCommand = {
          environmentId: 'fake_env_id',
          organizationId: 'fake_org_id',
          controlValues: {
            subject: 'Layout Test',
            body: simpleBodyContent,
            layoutId: 'test_layout_id',
          },
          fullPayloadForRender: {
            ...mockFullPayload,
            payload: { name: 'John' },
          },
          workflowId: mockDbWorkflow._id,
          stepId: 'fake_step_id',
        };

        const result = await emailOutputRendererUsecase.execute(renderCommand);

        // Should render empty layout content
        expect(result.body).to.not.include('Step content John');
        expect(result.body).to.not.include('class="layout"');
      });

      it('should pass correct repository query parameters for specific layout', async () => {
        const renderCommand: EmailOutputRendererCommand = {
          environmentId: 'fake_env_id',
          organizationId: 'fake_org_id',
          controlValues: {
            subject: 'Layout Test',
            body: simpleBodyContent,
            layoutId: 'specific_layout_id',
          },
          fullPayloadForRender: {
            ...mockFullPayload,
            payload: { name: 'John' },
          },
          workflowId: mockDbWorkflow._id,
          stepId: 'fake_step_id',
        };

        getLayoutUseCase.execute.resolves({ _id: 'specific_layout_id', isDefault: false } as any);

        await emailOutputRendererUsecase.execute(renderCommand);

        expect(controlValuesRepositoryMock.findOne.calledOnce).to.be.true;
        expect(controlValuesRepositoryMock.findOne.firstCall.args[0]).to.deep.eq({
          _organizationId: 'fake_org_id',
          _environmentId: 'fake_env_id',
          _layoutId: 'specific_layout_id',
          level: ControlValuesLevelEnum.LAYOUT_CONTROLS,
        });
      });

      it('should not call layout repository when layoutId is null', async () => {
        const renderCommand: EmailOutputRendererCommand = {
          environmentId: 'fake_env_id',
          organizationId: 'fake_org_id',
          controlValues: {
            subject: 'Layout Test',
            body: simpleBodyContent,
            layoutId: null,
          },
          fullPayloadForRender: {
            ...mockFullPayload,
            payload: { name: 'John' },
          },
          workflowId: mockDbWorkflow._id,
          stepId: 'fake_step_id',
        };

        const result = await emailOutputRendererUsecase.execute(renderCommand);

        expect(getLayoutUseCase.execute.called).to.be.false;
        expect(controlValuesRepositoryMock.findOne.called).to.be.false;
        expect(result.body).to.include('Step content John');
        expect(result.body).to.not.include('class="layout"');
      });

      it('should not call layout repository when layoutId is undefined', async () => {
        const renderCommand: EmailOutputRendererCommand = {
          environmentId: 'fake_env_id',
          organizationId: 'fake_org_id',
          controlValues: {
            subject: 'Layout Test',
            body: simpleBodyContent,
          },
          fullPayloadForRender: {
            ...mockFullPayload,
            payload: { name: 'John' },
          },
          workflowId: mockDbWorkflow._id,
          stepId: 'fake_step_id',
        };

        const result = await emailOutputRendererUsecase.execute(renderCommand);

        expect(getLayoutUseCase.execute.called).to.be.false;
        expect(controlValuesRepositoryMock.findOne.called).to.be.false;
        expect(result.body).to.include('Step content John');
        expect(result.body).to.not.include('class="layout"');
      });

      it('should handle layout controls entity with missing email controls', async () => {
        controlValuesRepositoryMock.findOne.resolves({
          _id: 'test_layout_id',
          _organizationId: 'fake_org_id',
          _environmentId: 'fake_env_id',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          level: ControlValuesLevelEnum.LAYOUT_CONTROLS,
          priority: 0,
          controls: {
            // no email property
          },
        });

        const renderCommand: EmailOutputRendererCommand = {
          environmentId: 'fake_env_id',
          organizationId: 'fake_org_id',
          controlValues: {
            subject: 'Layout Test',
            body: simpleBodyContent,
            layoutId: 'test_layout_id',
          },
          fullPayloadForRender: {
            ...mockFullPayload,
            payload: { name: 'John' },
          },
          workflowId: mockDbWorkflow._id,
          stepId: 'fake_step_id',
        };

        const result = await emailOutputRendererUsecase.execute(renderCommand);

        // Should handle missing email controls gracefully
        expect(result.body).to.not.include('Step content John');
        expect(result.body).to.not.include('class="layout"');
      });
    });
  });

  describe('Layout override functionality', () => {
    const simpleBodyContent = '<p>Step content {{payload.name}}</p>';
    const layoutContent = '<html><body><div class="layout">{{content}}</div></body></html>';

    let mockControlValuesEntity: any;
    let mockLayoutDto: any;

    beforeEach(() => {
      mockControlValuesEntity = {
        controls: {
          email: {
            body: layoutContent,
          },
        },
      };

      mockLayoutDto = {
        _id: 'test_layout_id',
        isDefault: false,
        name: 'test_layout_name',
        layoutId: 'test_layout_id',
      };

      controlValuesRepositoryMock.findOne.resolves(mockControlValuesEntity as any);
      getLayoutUseCase.execute.resolves(mockLayoutDto as any);
    });

    it('should use step-level layout override (highest priority)', async () => {
      const mockJob: JobEntity = {
        _id: 'test_job_id',
        _environmentId: 'fake_env_id',
        _organizationId: 'fake_org_id',
        subscriberId: 'fake_subscriber_id',
        providerId: 'fake_provider_id',
        transactionId: 'fake_transaction_id',
        type: StepTypeEnum.EMAIL,
        status: JobStatusEnum.PENDING,
        identifier: 'fake_identifier',
        payload: {},
        overrides: {
          steps: {
            current_step_id: {
              layoutId: 'step_override_layout_id',
            },
          },
          channels: {
            email: {
              layoutId: 'channel_override_layout_id',
            },
          },
          layoutIdentifier: 'deprecated_layout_id',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        step: {
          _id: 'current_step_id',
          name: 'fake_step_name',
          _templateId: 'fake_template_id',
          active: true,
          replyCallback: {
            active: true,
            url: 'fake_url',
          },
        },
        _notificationId: 'fake_notification_id',
        _subscriberId: 'fake_subscriber_id',
        _userId: 'fake_user_id',
        _templateId: 'fake_template_id',
      };

      jobRepositoryMock.findOne.resolves(mockJob as any);
      createExecutionDetailsMock.execute.resolves();

      // Mock the layout for the step override
      getLayoutUseCase.execute.resolves({
        _id: 'step_override_layout_id',
        isDefault: false,
        name: 'step_override_layout_name',
        layoutId: 'step_override_layout_id',
      } as any);

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Step Override Test',
          body: simpleBodyContent,
          layoutId: 'original_layout_id', // This should be overridden
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: { name: 'John' },
        },
        workflowId: mockDbWorkflow._id,
        jobId: mockJob._id,
        stepId: 'current_step_id',
      };

      await emailOutputRendererUsecase.execute(renderCommand);

      // Verify that getLayoutUseCase was called with the step override layout ID
      expect(getLayoutUseCase.execute.calledOnce).to.be.true;
      const layoutCommand = getLayoutUseCase.execute.firstCall.args[0];
      expect(layoutCommand.layoutIdOrInternalId).to.equal('step_override_layout_id');
    });

    it('should use channel-level layout override when no step override exists', async () => {
      const mockJob: JobEntity = {
        _id: 'test_job_id',
        _environmentId: 'fake_env_id',
        _organizationId: 'fake_org_id',
        subscriberId: 'fake_subscriber_id',
        providerId: 'fake_provider_id',
        transactionId: 'fake_transaction_id',
        type: StepTypeEnum.EMAIL,
        status: JobStatusEnum.PENDING,
        identifier: 'fake_identifier',
        payload: {},
        overrides: {
          channels: {
            email: {
              layoutId: 'channel_override_layout_id',
            },
          },
          layoutIdentifier: 'deprecated_layout_id',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        step: {
          _id: 'current_step_id',
          name: 'fake_step_name',
          _templateId: 'fake_template_id',
          active: true,
          replyCallback: {
            active: true,
            url: 'fake_url',
          },
        },
        _notificationId: 'fake_notification_id',
        _subscriberId: 'fake_subscriber_id',
        _userId: 'fake_user_id',
        _templateId: 'fake_template_id',
      };

      jobRepositoryMock.findOne.resolves(mockJob as any);
      createExecutionDetailsMock.execute.resolves();

      // Mock the layout for the channel override
      getLayoutUseCase.execute.resolves({
        _id: 'channel_override_layout_id',
        isDefault: false,
        name: 'channel_override_layout_name',
        layoutId: 'channel_override_layout_id',
      } as any);

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Channel Override Test',
          body: simpleBodyContent,
          layoutId: 'original_layout_id', // This should be overridden
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: { name: 'John' },
        },
        workflowId: mockDbWorkflow._id,
        jobId: mockJob._id,
        stepId: 'current_step_id',
      };

      await emailOutputRendererUsecase.execute(renderCommand);

      // Verify that getLayoutUseCase was called with the channel override layout ID
      expect(getLayoutUseCase.execute.calledOnce).to.be.true;
      const layoutCommand = getLayoutUseCase.execute.firstCall.args[0];
      expect(layoutCommand.layoutIdOrInternalId).to.equal('channel_override_layout_id');
    });

    it('should use deprecated layoutIdentifier override when no step or channel override exists', async () => {
      const mockJob: JobEntity = {
        _id: 'test_job_id',
        _environmentId: 'fake_env_id',
        _organizationId: 'fake_org_id',
        subscriberId: 'fake_subscriber_id',
        providerId: 'fake_provider_id',
        transactionId: 'fake_transaction_id',
        type: StepTypeEnum.EMAIL,
        status: JobStatusEnum.PENDING,
        identifier: 'fake_identifier',
        payload: {},
        overrides: {
          layoutIdentifier: 'deprecated_layout_id',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        step: {
          _id: 'current_step_id',
          name: 'fake_step_name',
          _templateId: 'fake_template_id',
          active: true,
          replyCallback: {
            active: true,
            url: 'fake_url',
          },
        },
        _notificationId: 'fake_notification_id',
        _subscriberId: 'fake_subscriber_id',
        _userId: 'fake_user_id',
        _templateId: 'fake_template_id',
      };

      jobRepositoryMock.findOne.resolves(mockJob as any);
      createExecutionDetailsMock.execute.resolves();

      // Mock the layout for the deprecated override
      getLayoutUseCase.execute.resolves({
        _id: 'deprecated_layout_id',
        isDefault: false,
        name: 'deprecated_layout_name',
        layoutId: 'deprecated_layout_id',
      } as any);

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Deprecated Override Test',
          body: simpleBodyContent,
          layoutId: 'original_layout_id', // This should be overridden
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: { name: 'John' },
        },
        workflowId: mockDbWorkflow._id,
        jobId: mockJob._id,
        stepId: 'current_step_id',
      };

      await emailOutputRendererUsecase.execute(renderCommand);

      // Verify that getLayoutUseCase was called with the deprecated override layout ID
      expect(getLayoutUseCase.execute.calledOnce).to.be.true;
      const layoutCommand = getLayoutUseCase.execute.firstCall.args[0];
      expect(layoutCommand.layoutIdOrInternalId).to.equal('deprecated_layout_id');
    });

    it('should use step configuration layout when no overrides exist', async () => {
      const mockJob: JobEntity = {
        _id: 'test_job_id',
        _environmentId: 'fake_env_id',
        _organizationId: 'fake_org_id',
        subscriberId: 'fake_subscriber_id',
        providerId: 'fake_provider_id',
        transactionId: 'fake_transaction_id',
        type: StepTypeEnum.EMAIL,
        status: JobStatusEnum.PENDING,
        identifier: 'fake_identifier',
        payload: {},
        overrides: {}, // No overrides
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        step: {
          _id: 'current_step_id',
          name: 'fake_step_name',
          _templateId: 'fake_template_id',
          active: true,
          replyCallback: {
            active: true,
            url: 'fake_url',
          },
        },
        _notificationId: 'fake_notification_id',
        _subscriberId: 'fake_subscriber_id',
        _userId: 'fake_user_id',
        _templateId: 'fake_template_id',
      };

      jobRepositoryMock.findOne.resolves(mockJob as any);
      createExecutionDetailsMock.execute.resolves();

      // Mock the layout for the step configuration
      getLayoutUseCase.execute.resolves({
        _id: 'original_layout_id',
        isDefault: false,
        name: 'original_layout_name',
        layoutId: 'original_layout_id',
      } as any);

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'No Override Test',
          body: simpleBodyContent,
          layoutId: 'original_layout_id', // This should be used
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: { name: 'John' },
        },
        workflowId: mockDbWorkflow._id,
        jobId: mockJob._id,
        stepId: 'current_step_id',
      };

      await emailOutputRendererUsecase.execute(renderCommand);

      // Verify that getLayoutUseCase was called with the original layout ID
      expect(getLayoutUseCase.execute.calledOnce).to.be.true;
      const layoutCommand = getLayoutUseCase.execute.firstCall.args[0];
      expect(layoutCommand.layoutIdOrInternalId).to.equal('original_layout_id');
    });

    it('should skip layout when override is explicitly set to null', async () => {
      const mockJob: JobEntity = {
        _id: 'test_job_id',
        _environmentId: 'fake_env_id',
        _organizationId: 'fake_org_id',
        subscriberId: 'fake_subscriber_id',
        providerId: 'fake_provider_id',
        transactionId: 'fake_transaction_id',
        type: StepTypeEnum.EMAIL,
        status: JobStatusEnum.PENDING,
        identifier: 'fake_identifier',
        payload: {},
        overrides: {
          steps: {
            current_step_id: {
              layoutId: null, // Explicitly no layout
            },
          },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        step: {
          _id: 'current_step_id',
          name: 'fake_step_name',
          _templateId: 'fake_template_id',
          active: true,
          replyCallback: {
            active: true,
            url: 'fake_url',
          },
        },
        _notificationId: 'fake_notification_id',
        _subscriberId: 'fake_subscriber_id',
        _userId: 'fake_user_id',
        _templateId: 'fake_template_id',
      };

      jobRepositoryMock.findOne.resolves(mockJob as any);
      createExecutionDetailsMock.execute.resolves();

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Null Override Test',
          body: simpleBodyContent,
          layoutId: 'original_layout_id', // This should be ignored due to null override
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: { name: 'John' },
        },
        workflowId: mockDbWorkflow._id,
        jobId: mockJob._id,
        stepId: 'current_step_id',
      };

      const result = await emailOutputRendererUsecase.execute(renderCommand);

      // Verify that no layout was applied
      expect(result.body).to.include('Step content John');
      expect(result.body).to.not.include('class="layout"');
      expect(result.body).to.not.include('<html>');

      // getLayoutUseCase should not be called when override is null
      expect(getLayoutUseCase.execute.called).to.be.false;
      expect(controlValuesRepositoryMock.findOne.called).to.be.false;
    });

    it('should prioritize step override over channel and deprecated overrides', async () => {
      const mockJob: JobEntity = {
        _id: 'test_job_id',
        _environmentId: 'fake_env_id',
        _organizationId: 'fake_org_id',
        subscriberId: 'fake_subscriber_id',
        providerId: 'fake_provider_id',
        transactionId: 'fake_transaction_id',
        type: StepTypeEnum.EMAIL,
        status: JobStatusEnum.PENDING,
        identifier: 'fake_identifier',
        payload: {},
        overrides: {
          steps: {
            current_step_id: {
              layoutId: 'step_priority_layout_id', // Highest priority
            },
          },
          channels: {
            email: {
              layoutId: 'channel_priority_layout_id', // Lower priority
            },
          },
          layoutIdentifier: 'deprecated_priority_layout_id', // Lowest priority
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        step: {
          _id: 'current_step_id',
          name: 'fake_step_name',
          _templateId: 'fake_template_id',
          active: true,
          replyCallback: {
            active: true,
            url: 'fake_url',
          },
        },
        _notificationId: 'fake_notification_id',
        _subscriberId: 'fake_subscriber_id',
        _userId: 'fake_user_id',
        _templateId: 'fake_template_id',
      };

      jobRepositoryMock.findOne.resolves(mockJob as any);
      createExecutionDetailsMock.execute.resolves();

      // Mock the layout for the step override (highest priority)
      getLayoutUseCase.execute.resolves({
        _id: 'step_priority_layout_id',
        isDefault: false,
        name: 'step_priority_layout_name',
        layoutId: 'step_priority_layout_id',
      } as any);

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Priority Test',
          body: simpleBodyContent,
          layoutId: 'original_layout_id',
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: { name: 'John' },
        },
        workflowId: mockDbWorkflow._id,
        jobId: mockJob._id,
        stepId: 'current_step_id',
      };

      await emailOutputRendererUsecase.execute(renderCommand);

      // Verify that the step override was used (highest priority)
      expect(getLayoutUseCase.execute.calledOnce).to.be.true;
      const layoutCommand = getLayoutUseCase.execute.firstCall.args[0];
      expect(layoutCommand.layoutIdOrInternalId).to.equal('step_priority_layout_id');
    });

    it('should handle step override by step internal ID when step._id differs from stepId', async () => {
      const mockJob: JobEntity = {
        _id: 'test_job_id',
        _environmentId: 'fake_env_id',
        _organizationId: 'fake_org_id',
        subscriberId: 'fake_subscriber_id',
        providerId: 'fake_provider_id',
        transactionId: 'fake_transaction_id',
        type: StepTypeEnum.EMAIL,
        status: JobStatusEnum.PENDING,
        identifier: 'fake_identifier',
        payload: {},
        overrides: {
          steps: {
            different_step_id: {
              layoutId: 'step_id_override_layout_id',
            },
          },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        step: {
          _id: 'step_internal_id', // Different from stepId
          name: 'fake_step_name',
          _templateId: 'fake_template_id',
          active: true,
          replyCallback: {
            active: true,
            url: 'fake_url',
          },
        },
        _notificationId: 'fake_notification_id',
        _subscriberId: 'fake_subscriber_id',
        _userId: 'fake_user_id',
        _templateId: 'fake_template_id',
      };

      jobRepositoryMock.findOne.resolves(mockJob as any);
      createExecutionDetailsMock.execute.resolves();

      // Mock the layout for the stepId override
      getLayoutUseCase.execute.resolves({
        _id: 'step_id_override_layout_id',
        isDefault: false,
        name: 'step_id_override_layout_name',
        layoutId: 'step_id_override_layout_id',
      } as any);

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Step ID Override Test',
          body: simpleBodyContent,
          layoutId: 'original_layout_id',
        },
        fullPayloadForRender: {
          ...mockFullPayload,
          payload: { name: 'John' },
        },
        workflowId: mockDbWorkflow._id,
        jobId: mockJob._id,
        stepId: 'different_step_id', // This should be used for override lookup
      };

      await emailOutputRendererUsecase.execute(renderCommand);

      // Verify that the stepId override was used
      expect(getLayoutUseCase.execute.calledOnce).to.be.true;
      const layoutCommand = getLayoutUseCase.execute.firstCall.args[0];
      expect(layoutCommand.layoutIdOrInternalId).to.equal('step_id_override_layout_id');
    });
  });

  describe('Novu branding functionality', () => {
    const simpleHtmlBody = '<p>Test email content</p>';

    it('should add Novu branding when removeNovuBranding is false', async () => {
      getOrganizationSettingsMock.execute.resolves({
        removeNovuBranding: false,
        defaultLocale: 'en_US',
      });

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Branding Test',
          body: simpleHtmlBody,
        },
        fullPayloadForRender: mockFullPayload,
        workflowId: mockDbWorkflow._id,
        stepId: 'fake_step_id',
      };

      const result = await emailOutputRendererUsecase.execute(renderCommand);

      expect(result.body).to.include('Test email content');
      expect(result.body).to.include('data-novu-branding');
      expect(result.body.length).to.be.greaterThan(simpleHtmlBody.length);
    });

    it('should not add Novu branding when removeNovuBranding is true', async () => {
      getOrganizationSettingsMock.execute.resolves({
        removeNovuBranding: true,
        defaultLocale: 'en_US',
      });

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Branding Test',
          body: simpleHtmlBody,
        },
        fullPayloadForRender: mockFullPayload,
        workflowId: mockDbWorkflow._id,
        stepId: 'fake_step_id',
      };

      const result = await emailOutputRendererUsecase.execute(renderCommand);

      expect(result.body).to.equal(simpleHtmlBody);
    });

    it('should properly insert branding into HTML with body tag', async () => {
      getOrganizationSettingsMock.execute.resolves({
        removeNovuBranding: false,
        defaultLocale: 'en_US',
      });

      const htmlWithBodyTag = '<html><body><p>Content</p></body></html>';
      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Body Tag Test',
          body: htmlWithBodyTag,
        },
        fullPayloadForRender: mockFullPayload,
        workflowId: mockDbWorkflow._id,
        stepId: 'fake_step_id',
      };

      const result = await emailOutputRendererUsecase.execute(renderCommand);

      expect(result.body).to.include('<p>Content</p>');
      expect(result.body).to.include('</body>');
      expect(result.body).to.include('data-novu-branding');
      // Branding should be inserted before the closing body tag
      const brandingIndex = result.body.indexOf('data-novu-branding');
      const bodyCloseIndex = result.body.indexOf('</body>');
      expect(brandingIndex).to.be.lessThan(bodyCloseIndex);
    });
  });

  describe('Gmail clipping prevention', () => {
    beforeEach(() => {
      getOrganizationSettingsMock.execute.resolves({
        removeNovuBranding: false,
        defaultLocale: 'en_US',
      });
    });

    it('should convert paragraphs with only whitespace to empty paragraphs', async () => {
      const mockTipTapNode: MailyJSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Hello World',
              },
            ],
          },
          {
            type: 'paragraph',
            // Empty paragraph that Maily renderer will add space to
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'End content',
              },
            ],
          },
        ],
      };

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Gmail Clipping Test',
          body: JSON.stringify(mockTipTapNode),
        },
        fullPayloadForRender: mockFullPayload,
        workflowId: mockDbWorkflow._id,
        stepId: 'fake_step_id',
      };

      const result = await emailOutputRendererUsecase.execute(renderCommand);

      expect(result.body).to.include('Hello World');
      expect(result.body).to.include('End content');

      // Should not contain paragraphs with only basic whitespace
      expect(result.body).to.not.match(/<p[^>]*>\s+<\/p>/);

      // Should contain empty paragraphs instead
      expect(result.body).to.match(/<p[^>]*><\/p>/);
    });

    it('should preserve paragraph styling when cleaning whitespace', async () => {
      // Simulate HTML that would be generated by Maily with styled empty paragraphs
      const htmlWithWhitespaceParas = `<p style="margin:0 0 20px 0">Content before</p><p style="margin:0 0 20px 0;color:#374151"> </p><p style="margin:0 0 20px 0">Content after</p>`;

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Styling Test',
          body: htmlWithWhitespaceParas,
        },
        fullPayloadForRender: mockFullPayload,
        workflowId: mockDbWorkflow._id,
        stepId: 'fake_step_id',
      };

      const result = await emailOutputRendererUsecase.execute(renderCommand);

      expect(result.body).to.include('Content before');
      expect(result.body).to.include('Content after');

      // Should preserve styles but remove whitespace content
      expect(result.body).to.include('style="margin:0 0 20px 0;color:#374151"></p>');

      // Should not contain basic whitespace content
      expect(result.body).to.not.include('> </p>');
    });

    it('should not modify paragraphs with actual text content', async () => {
      const htmlWithMixedContent = `<p>This has real content</p><p> </p><p>This also has real content with spaces</p><p>More real content</p>`;

      const renderCommand: EmailOutputRendererCommand = {
        environmentId: 'fake_env_id',
        organizationId: 'fake_org_id',
        controlValues: {
          subject: 'Mixed Content Test',
          body: htmlWithMixedContent,
        },
        fullPayloadForRender: mockFullPayload,
        workflowId: mockDbWorkflow._id,
        stepId: 'fake_step_id',
      };

      const result = await emailOutputRendererUsecase.execute(renderCommand);

      // Should preserve all actual text content
      expect(result.body).to.include('This has real content');
      expect(result.body).to.include('This also has real content with spaces');
      expect(result.body).to.include('More real content');

      // Should have converted whitespace-only paragraphs to empty ones
      expect(result.body).to.not.include('> </p>');
      expect(result.body).to.include('<p></p>');
    });
  });
});
