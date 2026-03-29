import { BadRequestException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  AnalyticsService,
  GetLayoutUseCase,
  GetLayoutUseCase as GetLayoutUseCaseV0,
  JSONSchemaDto,
  LayoutCreationSourceEnum,
  LayoutDtoV0,
  layoutControlSchema,
  mapLayoutToResponseDto,
  PinoLogger,
  UpsertControlValuesUseCase,
} from '@novu/application-generic';
import { ControlValuesRepository, JsonSchemaTypeEnum, LayoutRepository } from '@novu/dal';
import {
  ChannelTypeEnum,
  ContentIssueEnum,
  ControlValuesLevelEnum,
  LayoutControlValuesDto,
  LayoutIssuesDto,
  ResourceOriginEnum,
  ResourceTypeEnum,
  slugify,
} from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { CreateLayoutUseCase, UpdateLayoutUseCase } from '../../../layouts-v1/usecases';
import { BuildLayoutIssuesUsecase } from '../build-layout-issues/build-layout-issues.usecase';
import { UpsertLayoutCommand } from './upsert-layout.command';
import { UpsertLayout } from './upsert-layout.usecase';

// Mock the utility functions
const isStringifiedMailyJSONContentStub = sinon.stub();

// Mock modules using require to ensure proper stubbing
sinon
  .stub(require('@novu/application-generic'), 'isStringifiedMailyJSONContent')
  .callsFake(isStringifiedMailyJSONContentStub);

function setupTranslationMocks(moduleRef: sinon.SinonStubbedInstance<ModuleRef>): sinon.SinonStub {
  const manageTranslationsExecuteStub = sinon.stub().resolves();

  (moduleRef as any).get = sinon.stub().returns({
    execute: manageTranslationsExecuteStub,
  });

  return manageTranslationsExecuteStub;
}

describe('UpsertLayoutUseCase', () => {
  let getLayoutUseV0CaseMock: sinon.SinonStubbedInstance<GetLayoutUseCaseV0>;
  let createLayoutUseCaseMock: sinon.SinonStubbedInstance<CreateLayoutUseCase>;
  let updateLayoutUseCaseMock: sinon.SinonStubbedInstance<UpdateLayoutUseCase>;
  let controlValuesRepositoryMock: sinon.SinonStubbedInstance<ControlValuesRepository>;
  let upsertControlValuesUseCaseMock: sinon.SinonStubbedInstance<UpsertControlValuesUseCase>;
  let layoutRepositoryMock: sinon.SinonStubbedInstance<LayoutRepository>;
  let analyticsServiceMock: sinon.SinonStubbedInstance<AnalyticsService>;
  let buildLayoutIssuesUsecaseMock: sinon.SinonStubbedInstance<BuildLayoutIssuesUsecase>;
  let getLayoutUseCaseMock: sinon.SinonStubbedInstance<GetLayoutUseCase>;
  let moduleRefMock: sinon.SinonStubbedInstance<ModuleRef>;
  let pinoLoggerMock: sinon.SinonStubbedInstance<PinoLogger>;

  let upsertLayoutUseCase: UpsertLayout;

  const mockUser = {
    _id: 'user_id',
    environmentId: 'env_id',
    organizationId: 'org_id',
  };

  const mockLayoutDto = {
    name: 'Test Layout',
    __source: LayoutCreationSourceEnum.DASHBOARD,
    controlValues: {
      email: {
        body: '<html><body>{{content}}</body></html>',
        editorType: 'html' as 'html' | 'block',
      },
    } as LayoutControlValuesDto,
  };

  const mockExistingLayout: LayoutDtoV0 & { _id: string } = {
    _id: 'existing_layout_id',
    identifier: 'existing_layout_identifier',
    name: 'Existing Layout',
    _creatorId: 'creator_id',
    isDefault: false,
    isDeleted: false,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    _environmentId: 'env_id',
    _organizationId: 'org_id',
    origin: ResourceOriginEnum.NOVU_CLOUD,
    type: ResourceTypeEnum.BRIDGE,
    channel: ChannelTypeEnum.EMAIL,
    controls: {
      dataSchema: layoutControlSchema,
      uiSchema: {},
    },
  };

  const mockCreatedLayout: LayoutDtoV0 & { _id: string } = {
    _id: 'new_layout_id',
    identifier: 'test-layout',
    name: 'Test Layout',
    _creatorId: 'creator_id',
    isDefault: true,
    isDeleted: false,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    _environmentId: 'env_id',
    _organizationId: 'org_id',
    origin: ResourceOriginEnum.NOVU_CLOUD,
    type: ResourceTypeEnum.BRIDGE,
    channel: ChannelTypeEnum.EMAIL,
    controls: {
      dataSchema: layoutControlSchema,
      uiSchema: {},
    },
  };

  const mockControlValues = {
    _id: 'control_values_id',
    controls: {
      email: {
        body: '<html><body>{{content}}</body></html>',
        editorType: 'html',
      },
    },
  };

  const mockLayoutVariablesSchema: JSONSchemaDto = {
    type: JsonSchemaTypeEnum.OBJECT,
    properties: {
      subscriber: {
        type: JsonSchemaTypeEnum.OBJECT,
        properties: {
          email: { type: JsonSchemaTypeEnum.STRING },
          firstName: { type: JsonSchemaTypeEnum.STRING },
        },
      },
      content: { type: JsonSchemaTypeEnum.STRING },
    },
  };

  beforeEach(() => {
    getLayoutUseV0CaseMock = sinon.createStubInstance(GetLayoutUseCaseV0);
    createLayoutUseCaseMock = sinon.createStubInstance(CreateLayoutUseCase);
    updateLayoutUseCaseMock = sinon.createStubInstance(UpdateLayoutUseCase);
    controlValuesRepositoryMock = sinon.createStubInstance(ControlValuesRepository);
    upsertControlValuesUseCaseMock = sinon.createStubInstance(UpsertControlValuesUseCase);
    layoutRepositoryMock = sinon.createStubInstance(LayoutRepository);
    analyticsServiceMock = sinon.createStubInstance(AnalyticsService);
    buildLayoutIssuesUsecaseMock = sinon.createStubInstance(BuildLayoutIssuesUsecase);
    getLayoutUseCaseMock = sinon.createStubInstance(GetLayoutUseCase);
    moduleRefMock = sinon.createStubInstance(ModuleRef);
    pinoLoggerMock = sinon.createStubInstance(PinoLogger);

    setupTranslationMocks(moduleRefMock as any);

    upsertLayoutUseCase = new UpsertLayout(
      getLayoutUseV0CaseMock as any,
      createLayoutUseCaseMock as any,
      updateLayoutUseCaseMock as any,
      controlValuesRepositoryMock as any,
      upsertControlValuesUseCaseMock as any,
      layoutRepositoryMock as any,
      analyticsServiceMock as any,
      buildLayoutIssuesUsecaseMock as any,
      getLayoutUseCaseMock as any,
      moduleRefMock as any,
      pinoLoggerMock as any
    );

    // Default mocks setup
    isStringifiedMailyJSONContentStub.returns(false);
    buildLayoutIssuesUsecaseMock.execute.resolves({} as LayoutIssuesDto);
    upsertControlValuesUseCaseMock.execute.resolves(mockControlValues as any);
    layoutRepositoryMock.findOne.resolves(undefined);
  });

  afterEach(() => {
    sinon.restore();
    isStringifiedMailyJSONContentStub.reset();
  });

  describe('execute', () => {
    describe('create layout path', () => {
      beforeEach(() => {
        getLayoutUseV0CaseMock.execute.resolves(undefined);
        createLayoutUseCaseMock.execute.resolves(mockCreatedLayout);
        getLayoutUseCaseMock.execute.resolves(
          mapLayoutToResponseDto({
            layout: mockCreatedLayout,
            controlValues: mockControlValues,
            variables: mockLayoutVariablesSchema,
          })
        );
      });

      it('should successfully create a new layout when no existing layout found', async () => {
        const command = UpsertLayoutCommand.create({
          userId: mockUser._id,
          environmentId: mockUser.environmentId,
          organizationId: mockUser.organizationId,
          layoutDto: mockLayoutDto,
        });

        const result = await upsertLayoutUseCase.execute(command);

        expect(result).to.exist;
        expect(result._id).to.equal(mockCreatedLayout._id);
        expect(result.name).to.equal(mockCreatedLayout.name);
        expect(createLayoutUseCaseMock.execute.calledOnce).to.be.true;
        expect(updateLayoutUseCaseMock.execute.called).to.be.false;
      });

      it('should call createLayoutUseCase with correct parameters', async () => {
        const command = UpsertLayoutCommand.create({
          userId: mockUser._id,
          environmentId: mockUser.environmentId,
          organizationId: mockUser.organizationId,
          layoutDto: mockLayoutDto,
        });

        await upsertLayoutUseCase.execute(command);

        expect(createLayoutUseCaseMock.execute.calledOnce).to.be.true;
        const createCommand = createLayoutUseCaseMock.execute.firstCall.args[0];
        expect(createCommand.environmentId).to.equal(mockUser.environmentId);
        expect(createCommand.organizationId).to.equal(mockUser.organizationId);
        expect(createCommand.userId).to.equal(mockUser._id);
        expect(createCommand.name).to.equal(mockLayoutDto.name);
        expect(createCommand.identifier).to.equal(slugify(mockLayoutDto.name));
        expect(createCommand.type).to.equal(ResourceTypeEnum.BRIDGE);
        expect(createCommand.origin).to.equal(ResourceOriginEnum.NOVU_CLOUD);
        expect(createCommand.isDefault).to.be.true;
      });

      it('should use custom layoutId when provided instead of slugified name', async () => {
        const customLayoutId = 'custom-layout-identifier';
        const layoutDtoWithCustomId = {
          ...mockLayoutDto,
          layoutId: customLayoutId,
        };

        const command = UpsertLayoutCommand.create({
          userId: mockUser._id,
          environmentId: mockUser.environmentId,
          organizationId: mockUser.organizationId,
          layoutDto: layoutDtoWithCustomId,
        });

        await upsertLayoutUseCase.execute(command);

        expect(createLayoutUseCaseMock.execute.calledOnce).to.be.true;
        const createCommand = createLayoutUseCaseMock.execute.firstCall.args[0];
        expect(createCommand.identifier).to.equal(customLayoutId);
        expect(createCommand.name).to.equal(mockLayoutDto.name);
      });

      it('should set isDefault to false when a default layout already exists', async () => {
        const existingDefaultLayout = { ...mockExistingLayout, isDefault: true };
        layoutRepositoryMock.findOne.resolves(existingDefaultLayout as any);

        const command = UpsertLayoutCommand.create({
          userId: mockUser._id,
          environmentId: mockUser.environmentId,
          organizationId: mockUser.organizationId,
          layoutDto: mockLayoutDto,
        });

        await upsertLayoutUseCase.execute(command);

        const createCommand = createLayoutUseCaseMock.execute.firstCall.args[0];
        expect(createCommand.isDefault).to.be.false;
      });

      it('should track "Layout Create" analytics event', async () => {
        const command = UpsertLayoutCommand.create({
          userId: mockUser._id,
          environmentId: mockUser.environmentId,
          organizationId: mockUser.organizationId,
          layoutDto: mockLayoutDto,
        });

        await upsertLayoutUseCase.execute(command);

        expect(analyticsServiceMock.mixpanelTrack.calledOnce).to.be.true;
        const [eventName, userId, props] = analyticsServiceMock.mixpanelTrack.firstCall.args;
        expect(eventName).to.equal('Layout Create - [Layouts]');
        expect(userId).to.equal(mockUser._id);
        expect(props).to.deep.equal({
          _organization: mockUser.organizationId,
          name: mockLayoutDto.name,
          source: mockLayoutDto.__source,
        });
      });
    });

    describe('update layout path', () => {
      beforeEach(() => {
        getLayoutUseV0CaseMock.execute.resolves(mockExistingLayout);
        updateLayoutUseCaseMock.execute.resolves(mockExistingLayout);
        getLayoutUseCaseMock.execute.resolves(
          mapLayoutToResponseDto({
            layout: mockExistingLayout,
            controlValues: mockControlValues,
            variables: mockLayoutVariablesSchema,
          })
        );
      });

      it('should successfully update an existing layout when layoutIdOrInternalId provided', async () => {
        const command = UpsertLayoutCommand.create({
          userId: mockUser._id,
          environmentId: mockUser.environmentId,
          organizationId: mockUser.organizationId,
          layoutDto: mockLayoutDto,
          layoutIdOrInternalId: 'existing_layout_id',
        });

        const result = await upsertLayoutUseCase.execute(command);

        expect(result).to.exist;
        expect(result._id).to.equal(mockExistingLayout._id);
        expect(updateLayoutUseCaseMock.execute.calledOnce).to.be.true;
        expect(createLayoutUseCaseMock.execute.called).to.be.false;
      });

      it('should call getLayoutUseCase with correct parameters', async () => {
        const command = UpsertLayoutCommand.create({
          userId: mockUser._id,
          environmentId: mockUser.environmentId,
          organizationId: mockUser.organizationId,
          layoutDto: mockLayoutDto,
          layoutIdOrInternalId: 'existing_layout_id',
        });

        await upsertLayoutUseCase.execute(command);

        expect(getLayoutUseV0CaseMock.execute.calledOnce).to.be.true;
        const getCommand = getLayoutUseV0CaseMock.execute.firstCall.args[0];
        expect(getCommand.layoutIdOrInternalId).to.equal('existing_layout_id');
        expect(getCommand.environmentId).to.equal(mockUser.environmentId);
        expect(getCommand.organizationId).to.equal(mockUser.organizationId);
        expect(getCommand.type).to.equal(ResourceTypeEnum.BRIDGE);
        expect(getCommand.origin).to.equal(ResourceOriginEnum.NOVU_CLOUD);
      });

      it('should call updateLayoutUseCase with correct parameters', async () => {
        const command = UpsertLayoutCommand.create({
          userId: mockUser._id,
          environmentId: mockUser.environmentId,
          organizationId: mockUser.organizationId,
          layoutDto: mockLayoutDto,
          layoutIdOrInternalId: 'existing_layout_id',
        });

        await upsertLayoutUseCase.execute(command);

        expect(updateLayoutUseCaseMock.execute.calledOnce).to.be.true;
        const updateCommand = updateLayoutUseCaseMock.execute.firstCall.args[0];
        expect(updateCommand.environmentId).to.equal(mockUser.environmentId);
        expect(updateCommand.organizationId).to.equal(mockUser.organizationId);
        expect(updateCommand.userId).to.equal(mockUser._id);
        expect(updateCommand.layoutId).to.equal(mockExistingLayout._id);
        expect(updateCommand.name).to.equal(mockLayoutDto.name);
        expect(updateCommand.type).to.equal(mockExistingLayout.type);
        expect(updateCommand.origin).to.equal(mockExistingLayout.origin);
      });

      it('should track "Layout Update" analytics event', async () => {
        const command = UpsertLayoutCommand.create({
          userId: mockUser._id,
          environmentId: mockUser.environmentId,
          organizationId: mockUser.organizationId,
          layoutDto: mockLayoutDto,
          layoutIdOrInternalId: 'existing_layout_id',
        });

        await upsertLayoutUseCase.execute(command);

        expect(analyticsServiceMock.mixpanelTrack.calledOnce).to.be.true;
        const [eventName, userId, props] = analyticsServiceMock.mixpanelTrack.firstCall.args;
        expect(eventName).to.equal('Layout Update - [Layouts]');
        expect(userId).to.equal(mockUser._id);
        expect(props).to.deep.equal({
          _organization: mockUser.organizationId,
          name: mockLayoutDto.name,
          source: mockLayoutDto.__source,
        });
      });
    });

    describe('control values handling', () => {
      beforeEach(() => {
        getLayoutUseV0CaseMock.execute.resolves(undefined);
        createLayoutUseCaseMock.execute.resolves(mockCreatedLayout);
        getLayoutUseCaseMock.execute.resolves(
          mapLayoutToResponseDto({
            layout: mockCreatedLayout,
            controlValues: mockControlValues,
            variables: mockLayoutVariablesSchema,
          })
        );
      });

      it('should upsert control values when provided', async () => {
        const command = UpsertLayoutCommand.create({
          userId: mockUser._id,
          environmentId: mockUser.environmentId,
          organizationId: mockUser.organizationId,
          layoutDto: mockLayoutDto,
        });

        await upsertLayoutUseCase.execute(command);

        expect(upsertControlValuesUseCaseMock.execute.calledOnce).to.be.true;
        const upsertCommand = upsertControlValuesUseCaseMock.execute.firstCall.args[0];
        expect(upsertCommand.organizationId).to.equal(mockUser.organizationId);
        expect(upsertCommand.environmentId).to.equal(mockUser.environmentId);
        expect(upsertCommand.layoutId).to.equal(mockCreatedLayout._id);
        expect(upsertCommand.level).to.equal(ControlValuesLevelEnum.LAYOUT_CONTROLS);
        expect(upsertCommand.newControlValues).to.deep.equal(mockLayoutDto.controlValues);
      });

      it('should delete control values when set to null', async () => {
        const layoutDtoWithNullControls = {
          ...mockLayoutDto,
          controlValues: null,
        };

        const command = UpsertLayoutCommand.create({
          userId: mockUser._id,
          environmentId: mockUser.environmentId,
          organizationId: mockUser.organizationId,
          layoutDto: layoutDtoWithNullControls,
        });

        await upsertLayoutUseCase.execute(command);

        expect(controlValuesRepositoryMock.delete.calledOnce).to.be.true;
        const deleteParams = controlValuesRepositoryMock.delete.firstCall.args[0];
        expect(deleteParams._environmentId).to.equal(mockUser.environmentId);
        expect(deleteParams._organizationId).to.equal(mockUser.organizationId);
        expect(deleteParams._layoutId).to.equal(mockCreatedLayout._id);
        expect(deleteParams.level).to.equal(ControlValuesLevelEnum.LAYOUT_CONTROLS);
      });

      it('should handle empty control values', async () => {
        const layoutDtoWithEmptyControls = {
          ...mockLayoutDto,
          controlValues: {},
        };

        const command = UpsertLayoutCommand.create({
          userId: mockUser._id,
          environmentId: mockUser.environmentId,
          organizationId: mockUser.organizationId,
          layoutDto: layoutDtoWithEmptyControls,
        });

        await upsertLayoutUseCase.execute(command);

        expect(upsertControlValuesUseCaseMock.execute.calledOnce).to.be.true;
        const upsertCommand = upsertControlValuesUseCaseMock.execute.firstCall.args[0];
        expect(upsertCommand.newControlValues).to.deep.equal({});
      });
    });
  });

  describe('validation', () => {
    describe('email content validation', () => {
      beforeEach(() => {
        getLayoutUseV0CaseMock.execute.resolves(undefined);
        createLayoutUseCaseMock.execute.resolves(mockCreatedLayout);
        getLayoutUseCaseMock.execute.resolves(
          mapLayoutToResponseDto({
            layout: mockCreatedLayout,
            controlValues: mockControlValues,
            variables: mockLayoutVariablesSchema,
          })
        );
      });

      it('should validate HTML content correctly', async () => {
        const htmlLayoutDto = {
          ...mockLayoutDto,
          controlValues: {
            email: {
              body: '<html><body>Valid HTML</body></html>',
              editorType: 'html' as 'html' | 'block',
            },
          },
        };

        const command = UpsertLayoutCommand.create({
          userId: mockUser._id,
          environmentId: mockUser.environmentId,
          organizationId: mockUser.organizationId,
          layoutDto: htmlLayoutDto,
        });

        await upsertLayoutUseCase.execute(command);

        expect(buildLayoutIssuesUsecaseMock.execute.calledOnce).to.be.true;
      });

      it('should throw BadRequestException for invalid HTML content with html editor type', async () => {
        const invalidHtmlLayoutDto = {
          ...mockLayoutDto,
          controlValues: {
            email: {
              body: 'Invalid HTML content',
              editorType: 'html' as 'html' | 'block',
            },
          },
        };

        const command = UpsertLayoutCommand.create({
          userId: mockUser._id,
          environmentId: mockUser.environmentId,
          organizationId: mockUser.organizationId,
          layoutDto: invalidHtmlLayoutDto,
        });

        try {
          await upsertLayoutUseCase.execute(command);
          expect.fail('Should have thrown BadRequestException');
        } catch (error) {
          expect(error).to.be.instanceOf(BadRequestException);
          expect(error.message).to.equal('Content must be a valid HTML content');
        }
      });

      it('should validate Maily JSON content correctly', async () => {
        isStringifiedMailyJSONContentStub.returns(true);

        const mailyLayoutDto = {
          ...mockLayoutDto,
          controlValues: {
            email: {
              body: '{"type":"doc","content":[]}',
              editorType: 'block' as 'html' | 'block',
            },
          },
        };

        const command = UpsertLayoutCommand.create({
          userId: mockUser._id,
          environmentId: mockUser.environmentId,
          organizationId: mockUser.organizationId,
          layoutDto: mailyLayoutDto,
        });

        await upsertLayoutUseCase.execute(command);

        expect(buildLayoutIssuesUsecaseMock.execute.calledOnce).to.be.true;
      });

      it('should throw BadRequestException for invalid Maily JSON content with block editor type', async () => {
        isStringifiedMailyJSONContentStub.returns(false);

        const invalidMailyLayoutDto = {
          ...mockLayoutDto,
          controlValues: {
            email: {
              body: 'Invalid Maily JSON',
              editorType: 'block' as 'html' | 'block',
            },
          },
        };

        const command = UpsertLayoutCommand.create({
          userId: mockUser._id,
          environmentId: mockUser.environmentId,
          organizationId: mockUser.organizationId,
          layoutDto: invalidMailyLayoutDto,
        });

        try {
          await upsertLayoutUseCase.execute(command);
          expect.fail('Should have thrown BadRequestException');
        } catch (error) {
          expect(error).to.be.instanceOf(BadRequestException);
          expect(error.message).to.equal('Content must be a valid Maily JSON content');
        }
      });

      it('should throw BadRequestException for content that is neither HTML nor Maily JSON', async () => {
        isStringifiedMailyJSONContentStub.returns(false);

        const invalidLayoutDto = {
          ...mockLayoutDto,
          controlValues: {
            email: {
              body: 'Neither HTML nor Maily JSON',
              editorType: 'html' as 'html' | 'block',
            },
          },
        };

        const command = UpsertLayoutCommand.create({
          userId: mockUser._id,
          environmentId: mockUser.environmentId,
          organizationId: mockUser.organizationId,
          layoutDto: invalidLayoutDto,
        });

        try {
          await upsertLayoutUseCase.execute(command);
          expect.fail('Should have thrown BadRequestException');
        } catch (error) {
          expect(error).to.be.instanceOf(BadRequestException);
          expect(error.message).to.equal('Content must be a valid HTML content');
        }
      });

      it('should skip email validation when no email controls provided', async () => {
        const noEmailLayoutDto = {
          ...mockLayoutDto,
          controlValues: {},
        };

        const command = UpsertLayoutCommand.create({
          userId: mockUser._id,
          environmentId: mockUser.environmentId,
          organizationId: mockUser.organizationId,
          layoutDto: noEmailLayoutDto,
        });

        await upsertLayoutUseCase.execute(command);

        expect(buildLayoutIssuesUsecaseMock.execute.calledOnce).to.be.true;
      });
    });

    describe('layout issues validation', () => {
      beforeEach(() => {
        getLayoutUseV0CaseMock.execute.resolves(undefined);
        createLayoutUseCaseMock.execute.resolves(mockCreatedLayout);
        getLayoutUseCaseMock.execute.resolves(
          mapLayoutToResponseDto({
            layout: mockCreatedLayout,
            controlValues: mockControlValues,
            variables: mockLayoutVariablesSchema,
          })
        );
      });

      it('should call buildLayoutIssuesUsecase with correct parameters', async () => {
        const command = UpsertLayoutCommand.create({
          userId: mockUser._id,
          environmentId: mockUser.environmentId,
          organizationId: mockUser.organizationId,
          layoutDto: mockLayoutDto,
        });

        await upsertLayoutUseCase.execute(command);

        expect(buildLayoutIssuesUsecaseMock.execute.calledOnce).to.be.true;
        const issuesCommand = buildLayoutIssuesUsecaseMock.execute.firstCall.args[0];
        expect(issuesCommand.controlSchema).to.deep.equal(layoutControlSchema);
        expect(issuesCommand.controlValues).to.deep.equal(mockLayoutDto.controlValues);
        expect(issuesCommand.resourceOrigin).to.equal(ResourceOriginEnum.NOVU_CLOUD);
        expect(issuesCommand.userId).to.deep.equal(mockUser._id);
      });

      it('should use EXTERNAL origin when __source is not provided', async () => {
        const layoutDtoWithoutSource = {
          ...mockLayoutDto,
          __source: undefined,
        };

        const command = UpsertLayoutCommand.create({
          userId: mockUser._id,
          environmentId: mockUser.environmentId,
          organizationId: mockUser.organizationId,
          layoutDto: layoutDtoWithoutSource,
        });

        await upsertLayoutUseCase.execute(command);

        const issuesCommand = buildLayoutIssuesUsecaseMock.execute.firstCall.args[0];
        expect(issuesCommand.resourceOrigin).to.equal(ResourceOriginEnum.EXTERNAL);
      });

      it('should throw BadRequestException when layout issues exist', async () => {
        const mockIssues: LayoutIssuesDto = {
          controls: {
            'email.body': [
              {
                message: 'Body is required',
                issueType: ContentIssueEnum.MISSING_VALUE,
              },
            ],
            'email.editorType': [
              {
                message: 'Invalid editor type',
                issueType: ContentIssueEnum.ILLEGAL_VARIABLE_IN_CONTROL_VALUE,
              },
            ],
          },
        };
        buildLayoutIssuesUsecaseMock.execute.resolves(mockIssues);

        const command = UpsertLayoutCommand.create({
          userId: mockUser._id,
          environmentId: mockUser.environmentId,
          organizationId: mockUser.organizationId,
          layoutDto: mockLayoutDto,
        });

        try {
          await upsertLayoutUseCase.execute(command);
          expect.fail('Should have thrown BadRequestException');
        } catch (error) {
          expect(error).to.be.instanceOf(BadRequestException);
          expect(error.response).to.deep.equal({ message: 'Layout has validation issues', ...mockIssues });
        }
      });
    });
  });

  describe('error handling', () => {
    it('should propagate errors from getLayoutUseCase', async () => {
      const error = new Error('Failed to get layout');
      getLayoutUseV0CaseMock.execute.rejects(error);

      const command = UpsertLayoutCommand.create({
        userId: mockUser._id,
        environmentId: mockUser.environmentId,
        organizationId: mockUser.organizationId,
        layoutDto: mockLayoutDto,
        layoutIdOrInternalId: 'existing_layout_id',
      });

      try {
        await upsertLayoutUseCase.execute(command);
        expect.fail('Should have thrown error');
      } catch (thrownError) {
        expect(thrownError).to.equal(error);
      }
    });

    it('should propagate errors from createLayoutUseCase', async () => {
      const error = new Error('Failed to create layout');
      getLayoutUseV0CaseMock.execute.resolves(undefined);
      createLayoutUseCaseMock.execute.rejects(error);

      const command = UpsertLayoutCommand.create({
        userId: mockUser._id,
        environmentId: mockUser.environmentId,
        organizationId: mockUser.organizationId,
        layoutDto: mockLayoutDto,
      });

      try {
        await upsertLayoutUseCase.execute(command);
        expect.fail('Should have thrown error');
      } catch (thrownError) {
        expect(thrownError).to.equal(error);
      }
    });

    it('should propagate errors from updateLayoutUseCase', async () => {
      const error = new Error('Failed to update layout');
      getLayoutUseV0CaseMock.execute.resolves(mockExistingLayout);
      updateLayoutUseCaseMock.execute.rejects(error);

      const command = UpsertLayoutCommand.create({
        userId: mockUser._id,
        environmentId: mockUser.environmentId,
        organizationId: mockUser.organizationId,
        layoutDto: mockLayoutDto,
        layoutIdOrInternalId: 'existing_layout_id',
      });

      try {
        await upsertLayoutUseCase.execute(command);
        expect.fail('Should have thrown error');
      } catch (thrownError) {
        expect(thrownError).to.equal(error);
      }
    });

    it('should propagate errors from upsertControlValuesUseCase', async () => {
      const error = new Error('Failed to upsert control values');
      getLayoutUseV0CaseMock.execute.resolves(undefined);
      createLayoutUseCaseMock.execute.resolves(mockCreatedLayout);
      upsertControlValuesUseCaseMock.execute.rejects(error);

      const command = UpsertLayoutCommand.create({
        userId: mockUser._id,
        environmentId: mockUser.environmentId,
        organizationId: mockUser.organizationId,
        layoutDto: mockLayoutDto,
      });

      try {
        await upsertLayoutUseCase.execute(command);
        expect.fail('Should have thrown error');
      } catch (thrownError) {
        expect(thrownError).to.equal(error);
      }
    });

    it('should propagate errors from getLayoutUseCase', async () => {
      const error = new Error('Failed to generate schema');
      getLayoutUseV0CaseMock.execute.resolves(undefined);
      createLayoutUseCaseMock.execute.resolves(mockCreatedLayout);
      getLayoutUseCaseMock.execute.rejects(error);

      const command = UpsertLayoutCommand.create({
        userId: mockUser._id,
        environmentId: mockUser.environmentId,
        organizationId: mockUser.organizationId,
        layoutDto: mockLayoutDto,
      });

      try {
        await upsertLayoutUseCase.execute(command);
        expect.fail('Should have thrown error');
      } catch (thrownError) {
        expect(thrownError).to.equal(error);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle layout without type and origin in update path', async () => {
      const layoutWithoutTypeAndOrigin = {
        ...mockExistingLayout,
        type: undefined,
        origin: undefined,
      };
      getLayoutUseV0CaseMock.execute.resolves(layoutWithoutTypeAndOrigin);
      updateLayoutUseCaseMock.execute.resolves(layoutWithoutTypeAndOrigin);

      const command = UpsertLayoutCommand.create({
        userId: mockUser._id,
        environmentId: mockUser.environmentId,
        organizationId: mockUser.organizationId,
        layoutDto: mockLayoutDto,
        layoutIdOrInternalId: 'existing_layout_id',
      });

      await upsertLayoutUseCase.execute(command);

      const updateCommand = updateLayoutUseCaseMock.execute.firstCall.args[0];
      expect(updateCommand.type).to.equal(ResourceTypeEnum.BRIDGE);
      expect(updateCommand.origin).to.equal(ResourceOriginEnum.NOVU_CLOUD);
    });

    it('should handle undefined control values in command', async () => {
      const layoutDtoWithUndefinedControls = {
        ...mockLayoutDto,
        controlValues: undefined,
      };

      getLayoutUseV0CaseMock.execute.resolves(undefined);
      createLayoutUseCaseMock.execute.resolves(mockCreatedLayout);

      const command = UpsertLayoutCommand.create({
        userId: mockUser._id,
        environmentId: mockUser.environmentId,
        organizationId: mockUser.organizationId,
        layoutDto: layoutDtoWithUndefinedControls,
      });

      await upsertLayoutUseCase.execute(command);

      expect(controlValuesRepositoryMock.delete.calledOnce).to.be.false;
      expect(upsertControlValuesUseCaseMock.execute.calledOnce).to.be.false;
    });

    it('should handle empty string layoutIdOrInternalId', async () => {
      getLayoutUseV0CaseMock.execute.resolves(undefined);
      createLayoutUseCaseMock.execute.resolves(mockCreatedLayout);

      const command = UpsertLayoutCommand.create({
        userId: mockUser._id,
        environmentId: mockUser.environmentId,
        organizationId: mockUser.organizationId,
        layoutDto: mockLayoutDto,
        layoutIdOrInternalId: '',
      });

      await upsertLayoutUseCase.execute(command);

      // Should follow create path since empty string is falsy
      expect(createLayoutUseCaseMock.execute.calledOnce).to.be.true;
      expect(getLayoutUseV0CaseMock.execute.called).to.be.false;
    });
  });

  describe('parameter verification', () => {
    beforeEach(() => {
      getLayoutUseV0CaseMock.execute.resolves(undefined);
      createLayoutUseCaseMock.execute.resolves(mockCreatedLayout);
    });

    it('should pass all required parameters to dependencies', async () => {
      const command = UpsertLayoutCommand.create({
        userId: mockUser._id,
        environmentId: mockUser.environmentId,
        organizationId: mockUser.organizationId,
        layoutDto: mockLayoutDto,
      });

      await upsertLayoutUseCase.execute(command);

      // Verify all major dependencies were called with correct basic parameters
      expect(buildLayoutIssuesUsecaseMock.execute.calledOnce).to.be.true;
      expect(createLayoutUseCaseMock.execute.calledOnce).to.be.true;
      expect(upsertControlValuesUseCaseMock.execute.calledOnce).to.be.true;
      expect(getLayoutUseCaseMock.execute.calledOnce).to.be.true;
      expect(analyticsServiceMock.mixpanelTrack.calledOnce).to.be.true;
    });

    it('should use correct identifiers and names', async () => {
      const customLayoutDto = {
        ...mockLayoutDto,
        name: 'Custom Layout Name',
      };

      const command = UpsertLayoutCommand.create({
        userId: mockUser._id,
        environmentId: mockUser.environmentId,
        organizationId: mockUser.organizationId,
        layoutDto: customLayoutDto,
      });

      await upsertLayoutUseCase.execute(command);

      const createCommand = createLayoutUseCaseMock.execute.firstCall.args[0];
      expect(createCommand.name).to.equal('Custom Layout Name');
      expect(createCommand.identifier).to.equal(slugify('Custom Layout Name'));
    });
  });
});
