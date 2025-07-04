import sinon from 'sinon';
import { expect } from 'chai';
import {
  ChannelTypeEnum,
  ResourceOriginEnum,
  LAYOUT_PREVIEW_EMAIL_STEP,
  LAYOUT_PREVIEW_WORKFLOW_ID,
} from '@novu/shared';
import { EmailControlType, LayoutControlType } from '@novu/application-generic';

import { PreviewLayoutUsecase } from './preview-layout.usecase';
import { PreviewLayoutCommand } from './preview-layout.command';
import { GetLayoutUseCase } from '../get-layout';
import { CreateVariablesObject, CreateVariablesObjectCommand } from '../../../shared/usecases/create-variables-object';
import { SchemaBuilderService } from '../../../workflows-v2/usecases/preview/services/schema-builder.service';
import { ControlValueSanitizerService } from '../../../shared/services/control-value-sanitizer.service';
import { PreviewStep, PreviewStepCommand } from '../../../bridge/usecases/preview-step';
import { PreviewPayloadProcessorService } from '../../../workflows-v2/usecases/preview/services/preview-payload-processor.service';
import { PayloadMergerService } from '../../../workflows-v2/usecases/preview/services/payload-merger.service';

describe('PreviewLayoutUsecase', () => {
  let getLayoutUseCaseMock: sinon.SinonStubbedInstance<GetLayoutUseCase>;
  let createVariablesObjectMock: sinon.SinonStubbedInstance<CreateVariablesObject>;
  let controlValueSanitizerMock: sinon.SinonStubbedInstance<ControlValueSanitizerService>;
  let payloadProcessorMock: sinon.SinonStubbedInstance<PreviewPayloadProcessorService>;
  let payloadMergerMock: sinon.SinonStubbedInstance<PayloadMergerService>;
  let previewStepUsecaseMock: sinon.SinonStubbedInstance<PreviewStep>;

  let previewLayoutUsecase: PreviewLayoutUsecase;

  const mockUser = {
    _id: 'user_id',
    environmentId: 'env_id',
    organizationId: 'org_id',
  };

  const mockLayout = {
    _id: 'layout_id',
    identifier: 'layout_identifier',
    name: 'Test Layout',
    controls: {
      values: {
        email: {
          body: '<html>{{content}}</html>',
          editorType: 'html',
        },
      },
    },
    variables: {
      name: { type: 'string', default: 'John' },
      email: { type: 'string', default: 'john@example.com' },
    },
  };

  const mockLayoutWithoutControls = {
    ...mockLayout,
    controls: {
      values: {},
    },
    variables: {},
  };

  const mockControlValues = {
    email: {
      body: '<html>Custom {{content}}</html>',
      editorType: 'html',
    },
  };

  const mockVariablesObject = {
    name: 'Jane',
    email: 'jane@example.com',
  };

  const mockSanitizedControls = {
    email: {
      body: '<html>Sanitized {{content}}</html>',
      editorType: 'html',
    },
  };

  const mockPreviewTemplateData = {
    controlValues: {
      email: {
        body: '<html>Processed {{content}}</html>',
        editorType: 'html',
      },
    } as LayoutControlType,
    payloadExample: {
      content: 'Test content',
      user: { name: 'Test User' },
    },
  };

  const mockPayloadExample = {
    content: 'Merged content',
    user: { name: 'Merged User' },
  };

  const mockCleanedPayloadExample = {
    payload: { content: 'Cleaned content' },
    subscriber: { email: 'test@example.com' },
  };

  const mockPreviewStepOutput = {
    outputs: {
      body: '<html>Final rendered content</html>',
    },
  };

  beforeEach(() => {
    getLayoutUseCaseMock = sinon.createStubInstance(GetLayoutUseCase);
    createVariablesObjectMock = sinon.createStubInstance(CreateVariablesObject);
    controlValueSanitizerMock = sinon.createStubInstance(ControlValueSanitizerService);
    payloadProcessorMock = sinon.createStubInstance(PreviewPayloadProcessorService);
    payloadMergerMock = sinon.createStubInstance(PayloadMergerService);
    previewStepUsecaseMock = sinon.createStubInstance(PreviewStep);

    previewLayoutUsecase = new PreviewLayoutUsecase(
      getLayoutUseCaseMock as any,
      createVariablesObjectMock as any,
      controlValueSanitizerMock as any,
      payloadProcessorMock as any,
      payloadMergerMock as any,
      previewStepUsecaseMock as any
    );

    // Default mocks setup
    getLayoutUseCaseMock.execute.resolves(mockLayout as any);
    createVariablesObjectMock.execute.resolves(mockVariablesObject);
    controlValueSanitizerMock.sanitizeControlsForPreview.returns(mockSanitizedControls);
    controlValueSanitizerMock.processControlValues.returns({
      previewTemplateData: mockPreviewTemplateData,
      sanitizedControls: mockSanitizedControls,
    });
    payloadMergerMock.mergePayloadExample.resolves(mockPayloadExample);
    payloadProcessorMock.cleanPreviewExamplePayload.returns(mockCleanedPayloadExample);
    previewStepUsecaseMock.execute.resolves(mockPreviewStepOutput as any);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('execute', () => {
    it('should successfully execute with provided control values', async () => {
      const command = PreviewLayoutCommand.create({
        user: mockUser as any,
        layoutIdOrInternalId: 'layout_id',
        layoutPreviewRequestDto: {
          controlValues: mockControlValues,
          previewPayload: { subscriber: { email: 'test@example.com' } },
        },
      });

      const result = await previewLayoutUsecase.execute(command);

      expect(result).to.deep.equal({
        result: {
          preview: { body: '<html>Final rendered content</html>' },
          type: ChannelTypeEnum.EMAIL,
        },
        previewPayloadExample: mockPayloadExample,
      });
    });

    it('should use layout control values when command control values are not provided', async () => {
      const command = PreviewLayoutCommand.create({
        user: mockUser as any,
        layoutIdOrInternalId: 'layout_id',
        layoutPreviewRequestDto: {},
      });

      await previewLayoutUsecase.execute(command);

      // Verify that layout control values were used
      expect(createVariablesObjectMock.execute.calledOnce).to.be.true;
      const createVariablesCall = createVariablesObjectMock.execute.firstCall.args[0];
      expect(createVariablesCall.controlValues).to.deep.equal(Object.values(mockLayout.controls.values.email));
    });

    it('should use empty object when both command and layout control values are missing', async () => {
      getLayoutUseCaseMock.execute.resolves(mockLayoutWithoutControls as any);

      const command = PreviewLayoutCommand.create({
        user: mockUser as any,
        layoutIdOrInternalId: 'layout_id',
        layoutPreviewRequestDto: {},
      });

      await previewLayoutUsecase.execute(command);

      // Verify empty control values were used
      expect(controlValueSanitizerMock.sanitizeControlsForPreview.calledOnce).to.be.true;
      const sanitizeCall = controlValueSanitizerMock.sanitizeControlsForPreview.firstCall.args[0];
      expect(sanitizeCall).to.deep.equal({});
    });

    it('should call all dependencies with correct parameters', async () => {
      const command = PreviewLayoutCommand.create({
        user: mockUser as any,
        layoutIdOrInternalId: 'layout_id',
        layoutPreviewRequestDto: {
          controlValues: mockControlValues,
          previewPayload: { subscriber: { email: 'test@example.com' } },
        },
      });

      await previewLayoutUsecase.execute(command);

      // Verify getLayoutUseCase call
      expect(getLayoutUseCaseMock.execute.calledOnce).to.be.true;
      const getLayoutCall = getLayoutUseCaseMock.execute.firstCall.args[0];
      expect(getLayoutCall).to.deep.equal({
        layoutIdOrInternalId: 'layout_id',
        environmentId: mockUser.environmentId,
        organizationId: mockUser.organizationId,
        userId: mockUser._id,
      });

      // Verify createVariablesObject call
      expect(createVariablesObjectMock.execute.calledOnce).to.be.true;
      const createVariablesCall = createVariablesObjectMock.execute.firstCall.args[0];
      expect(createVariablesCall.environmentId).to.equal(mockUser.environmentId);
      expect(createVariablesCall.organizationId).to.equal(mockUser.organizationId);
      expect(createVariablesCall.variableSchema).to.deep.equal(mockLayout.variables);

      // Verify controlValueSanitizer calls
      expect(controlValueSanitizerMock.sanitizeControlsForPreview.calledOnce).to.be.true;
      const sanitizeCall = controlValueSanitizerMock.sanitizeControlsForPreview.firstCall.args;
      expect(sanitizeCall[0]).to.deep.equal(mockControlValues);
      expect(sanitizeCall[1]).to.equal('layout');
      expect(sanitizeCall[2]).to.equal(ResourceOriginEnum.NOVU_CLOUD);

      expect(controlValueSanitizerMock.processControlValues.calledOnce).to.be.true;
      const processCall = controlValueSanitizerMock.processControlValues.firstCall.args;
      expect(processCall[0]).to.be.true;
      expect(processCall[1]).to.deep.equal(mockSanitizedControls);
      expect(processCall[2]).to.deep.equal(mockLayout.variables);
      expect(processCall[3]).to.deep.equal(mockVariablesObject);

      // Verify payloadMerger call
      expect(payloadMergerMock.mergePayloadExample.calledOnce).to.be.true;
      const mergeCall = payloadMergerMock.mergePayloadExample.firstCall.args[0];
      expect(mergeCall.payloadExample).to.deep.equal(mockPreviewTemplateData.payloadExample);
      expect(mergeCall.userPayloadExample).to.deep.equal(command.layoutPreviewRequestDto.previewPayload);
      expect(mergeCall.user).to.deep.equal(command.user);

      // Verify payloadProcessor call
      expect(payloadProcessorMock.cleanPreviewExamplePayload.calledOnceWith(mockPayloadExample)).to.be.true;

      // Verify previewStepUsecase call
      expect(previewStepUsecaseMock.execute.calledOnce).to.be.true;
      const previewCall = previewStepUsecaseMock.execute.firstCall.args[0];
      expect(previewCall.payload).to.deep.equal(mockCleanedPayloadExample.payload);
      expect(previewCall.subscriber).to.deep.equal(mockCleanedPayloadExample.subscriber);
      expect(previewCall.controls).to.deep.equal({
        subject: 'email-layout-preview',
        body: mockPreviewTemplateData.controlValues.email?.body,
        editorType: mockPreviewTemplateData.controlValues.email?.editorType,
        layoutId: null,
      });
      expect(previewCall.environmentId).to.equal(mockUser.environmentId);
      expect(previewCall.organizationId).to.equal(mockUser.organizationId);
      expect(previewCall.stepId).to.equal(LAYOUT_PREVIEW_EMAIL_STEP);
      expect(previewCall.userId).to.equal(mockUser._id);
      expect(previewCall.workflowId).to.equal(LAYOUT_PREVIEW_WORKFLOW_ID);
      expect(previewCall.workflowOrigin).to.equal(ResourceOriginEnum.NOVU_CLOUD);
      expect(previewCall.state).to.deep.equal([]);
    });

    it('should handle missing previewPayload gracefully', async () => {
      const command = PreviewLayoutCommand.create({
        user: mockUser as any,
        layoutIdOrInternalId: 'layout_id',
        layoutPreviewRequestDto: {
          controlValues: mockControlValues,
        },
      });

      await previewLayoutUsecase.execute(command);

      const mergeCall = payloadMergerMock.mergePayloadExample.firstCall.args[0];
      expect(mergeCall.userPayloadExample).to.be.undefined;
    });

    it('should handle missing variables schema', async () => {
      const layoutWithoutVariables = {
        ...mockLayout,
        variables: undefined,
      };
      getLayoutUseCaseMock.execute.resolves(layoutWithoutVariables as any);

      const command = PreviewLayoutCommand.create({
        user: mockUser as any,
        layoutIdOrInternalId: 'layout_id',
        layoutPreviewRequestDto: {
          controlValues: mockControlValues,
        },
      });

      await previewLayoutUsecase.execute(command);

      const createVariablesCall = createVariablesObjectMock.execute.firstCall.args[0];
      expect(createVariablesCall.variableSchema).to.deep.equal({});
    });

    it('should handle missing email controls in preview template data', async () => {
      const templateDataWithoutEmail = {
        ...mockPreviewTemplateData,
        controlValues: {} as LayoutControlType,
      };
      controlValueSanitizerMock.processControlValues.returns({
        previewTemplateData: templateDataWithoutEmail,
        sanitizedControls: mockSanitizedControls,
      });

      const command = PreviewLayoutCommand.create({
        user: mockUser as any,
        layoutIdOrInternalId: 'layout_id',
        layoutPreviewRequestDto: {
          controlValues: mockControlValues,
        },
      });

      await previewLayoutUsecase.execute(command);

      const previewCall = previewStepUsecaseMock.execute.firstCall.args[0];
      expect(previewCall.controls.body).to.be.undefined;
      expect(previewCall.controls.editorType).to.be.undefined;
    });

    it('should handle missing payload in cleaned payload example', async () => {
      const cleanedPayloadWithoutPayload = {
        payload: undefined,
        subscriber: { email: 'test@example.com' },
      };
      payloadProcessorMock.cleanPreviewExamplePayload.returns(cleanedPayloadWithoutPayload);

      const command = PreviewLayoutCommand.create({
        user: mockUser as any,
        layoutIdOrInternalId: 'layout_id',
        layoutPreviewRequestDto: {
          controlValues: mockControlValues,
        },
      });

      await previewLayoutUsecase.execute(command);

      const previewCall = previewStepUsecaseMock.execute.firstCall.args[0];
      expect(previewCall.payload).to.deep.equal({});
    });

    it('should handle missing subscriber in cleaned payload example', async () => {
      const cleanedPayloadWithoutSubscriber = {
        payload: { content: 'test' },
        subscriber: undefined,
      };
      payloadProcessorMock.cleanPreviewExamplePayload.returns(cleanedPayloadWithoutSubscriber);

      const command = PreviewLayoutCommand.create({
        user: mockUser as any,
        layoutIdOrInternalId: 'layout_id',
        layoutPreviewRequestDto: {
          controlValues: mockControlValues,
        },
      });

      await previewLayoutUsecase.execute(command);

      const previewCall = previewStepUsecaseMock.execute.firstCall.args[0];
      expect(previewCall.subscriber).to.deep.equal({});
    });

    describe('error handling', () => {
      it('should return fallback response when getLayoutUseCase throws error', async () => {
        try {
          const error = new Error('Layout not found');
          getLayoutUseCaseMock.execute.rejects(error);

          const command = PreviewLayoutCommand.create({
            user: mockUser as any,
            layoutIdOrInternalId: 'invalid_layout_id',
            layoutPreviewRequestDto: {
              controlValues: mockControlValues,
            },
          });

          const result = await previewLayoutUsecase.execute(command);
        } catch (error) {
          expect(error.message).to.equal('Layout not found');
        }
      });

      it('should return fallback response when createVariablesObject throws error', async () => {
        const error = new Error('Variables creation failed');
        createVariablesObjectMock.execute.rejects(error);

        const command = PreviewLayoutCommand.create({
          user: mockUser as any,
          layoutIdOrInternalId: 'layout_id',
          layoutPreviewRequestDto: {
            controlValues: mockControlValues,
          },
        });

        const result = await previewLayoutUsecase.execute(command);

        expect(result).to.deep.equal({
          result: {
            type: ChannelTypeEnum.EMAIL,
          },
          previewPayloadExample: {},
        });
      });

      it('should return fallback response when controlValueSanitizer throws error', async () => {
        const error = new Error('Control value sanitization failed');
        controlValueSanitizerMock.sanitizeControlsForPreview.throws(error);

        const command = PreviewLayoutCommand.create({
          user: mockUser as any,
          layoutIdOrInternalId: 'layout_id',
          layoutPreviewRequestDto: {
            controlValues: mockControlValues,
          },
        });

        const result = await previewLayoutUsecase.execute(command);

        expect(result).to.deep.equal({
          result: {
            type: ChannelTypeEnum.EMAIL,
          },
          previewPayloadExample: {},
        });
      });

      it('should return fallback response when payloadMerger throws error', async () => {
        const error = new Error('Payload merge failed');
        payloadMergerMock.mergePayloadExample.rejects(error);

        const command = PreviewLayoutCommand.create({
          user: mockUser as any,
          layoutIdOrInternalId: 'layout_id',
          layoutPreviewRequestDto: {
            controlValues: mockControlValues,
          },
        });

        const result = await previewLayoutUsecase.execute(command);

        expect(result).to.deep.equal({
          result: {
            type: ChannelTypeEnum.EMAIL,
          },
          previewPayloadExample: {},
        });
      });

      it('should return fallback response when payloadProcessor throws error', async () => {
        const error = new Error('Payload processing failed');
        payloadProcessorMock.cleanPreviewExamplePayload.throws(error);

        const command = PreviewLayoutCommand.create({
          user: mockUser as any,
          layoutIdOrInternalId: 'layout_id',
          layoutPreviewRequestDto: {
            controlValues: mockControlValues,
          },
        });

        const result = await previewLayoutUsecase.execute(command);

        expect(result).to.deep.equal({
          result: {
            type: ChannelTypeEnum.EMAIL,
          },
          previewPayloadExample: {},
        });
      });

      it('should return fallback response when previewStepUsecase throws error', async () => {
        const error = new Error('Preview step execution failed');
        previewStepUsecaseMock.execute.rejects(error);

        const command = PreviewLayoutCommand.create({
          user: mockUser as any,
          layoutIdOrInternalId: 'layout_id',
          layoutPreviewRequestDto: {
            controlValues: mockControlValues,
          },
        });

        const result = await previewLayoutUsecase.execute(command);

        expect(result).to.deep.equal({
          result: {
            type: ChannelTypeEnum.EMAIL,
          },
          previewPayloadExample: {},
        });
      });

      it('should not call subsequent dependencies when early dependency fails', async () => {
        const error = new Error('Early failure');
        createVariablesObjectMock.execute.rejects(error);

        const command = PreviewLayoutCommand.create({
          user: mockUser as any,
          layoutIdOrInternalId: 'layout_id',
          layoutPreviewRequestDto: {
            controlValues: mockControlValues,
          },
        });

        await previewLayoutUsecase.execute(command);

        // Verify that dependencies after createVariablesObject were not called
        expect(controlValueSanitizerMock.sanitizeControlsForPreview.called).to.be.false;
        expect(payloadMergerMock.mergePayloadExample.called).to.be.false;
        expect(previewStepUsecaseMock.execute.called).to.be.false;
      });
    });

    describe('edge cases', () => {
      it('should handle empty previewStepOutput', async () => {
        previewStepUsecaseMock.execute.resolves({ outputs: {} } as any);

        const command = PreviewLayoutCommand.create({
          user: mockUser as any,
          layoutIdOrInternalId: 'layout_id',
          layoutPreviewRequestDto: {
            controlValues: mockControlValues,
          },
        });

        const result = await previewLayoutUsecase.execute(command);

        expect(result.result.preview?.body).to.be.undefined;
        expect(result.result.type).to.equal(ChannelTypeEnum.EMAIL);
      });

      it('should handle null previewStepOutput outputs', async () => {
        previewStepUsecaseMock.execute.resolves({ outputs: null } as any);

        const command = PreviewLayoutCommand.create({
          user: mockUser as any,
          layoutIdOrInternalId: 'layout_id',
          layoutPreviewRequestDto: {
            controlValues: mockControlValues,
          },
        });

        const result = await previewLayoutUsecase.execute(command);

        expect(result.result.preview?.body).to.be.undefined;
        expect(result.result.type).to.equal(ChannelTypeEnum.EMAIL);
      });
    });
  });
});
