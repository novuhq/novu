import { BadRequestException } from '@nestjs/common';
import {
  AnalyticsService,
  GetLayoutUseCase,
  layoutControlSchema,
  UpsertControlValuesUseCase,
} from '@novu/application-generic';
import { ControlValuesRepository, LayoutRepository } from '@novu/dal';
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
import { LayoutDto } from '../../../layouts-v1/dtos';
import { CreateLayoutUseCase, UpdateLayoutUseCase } from '../../../layouts-v1/usecases';
import { LayoutCreationSourceEnum } from '../../types';
import { BuildLayoutIssuesUsecase } from '../build-layout-issues/build-layout-issues.usecase';
import { LayoutVariablesSchemaUseCase } from '../layout-variables-schema';
import { UpsertLayoutCommand } from './upsert-layout.command';
import { UpsertLayout } from './upsert-layout.usecase';

// Mock the utility functions
const isStringifiedMailyJSONContentStub = sinon.stub();

// Mock modules using require to ensure proper stubbing
sinon
  .stub(require('../../../shared/helpers/maily-utils'), 'isStringifiedMailyJSONContent')
  .callsFake(isStringifiedMailyJSONContentStub);

describe('UpsertLayoutUseCase', () => {
  let getLayoutUseCaseMock: sinon.SinonStubbedInstance<GetLayoutUseCase>;
  let createLayoutUseCaseMock: sinon.SinonStubbedInstance<CreateLayoutUseCase>;
  let updateLayoutUseCaseMock: sinon.SinonStubbedInstance<UpdateLayoutUseCase>;
  let controlValuesRepositoryMock: sinon.SinonStubbedInstance<ControlValuesRepository>;
  let upsertControlValuesUseCaseMock: sinon.SinonStubbedInstance<UpsertControlValuesUseCase>;
  let layoutVariablesSchemaUseCaseMock: sinon.SinonStubbedInstance<LayoutVariablesSchemaUseCase>;
  let layoutRepositoryMock: sinon.SinonStubbedInstance<LayoutRepository>;
  let analyticsServiceMock: sinon.SinonStubbedInstance<AnalyticsService>;
  let buildLayoutIssuesUsecaseMock: sinon.SinonStubbedInstance<BuildLayoutIssuesUsecase>;

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

  const mockExistingLayout: LayoutDto & { _id: string } = {
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

  const mockCreatedLayout: LayoutDto & { _id: string } = {
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

  const mockLayoutVariablesSchema = {
    type: 'object',
    properties: {
      subscriber: {
        type: 'object',
        properties: {
          email: { type: 'string' },
          firstName: { type: 'string' },
        },
      },
      content: { type: 'string' },
    },
  };

  beforeEach(() => {
    getLayoutUseCaseMock = sinon.createStubInstance(GetLayoutUseCase);
    createLayoutUseCaseMock = sinon.createStubInstance(CreateLayoutUseCase);
    updateLayoutUseCaseMock = sinon.createStubInstance(UpdateLayoutUseCase);
    controlValuesRepositoryMock = sinon.createStubInstance(ControlValuesRepository);
    upsertControlValuesUseCaseMock = sinon.createStubInstance(UpsertControlValuesUseCase);
    layoutVariablesSchemaUseCaseMock = sinon.createStubInstance(LayoutVariablesSchemaUseCase);
    layoutRepositoryMock = sinon.createStubInstance(LayoutRepository);
    analyticsServiceMock = sinon.createStubInstance(AnalyticsService);
    buildLayoutIssuesUsecaseMock = sinon.createStubInstance(BuildLayoutIssuesUsecase);

    upsertLayoutUseCase = new UpsertLayout(
      getLayoutUseCaseMock as any,
      createLayoutUseCaseMock as any,
      updateLayoutUseCaseMock as any,
      controlValuesRepositoryMock as any,
      upsertControlValuesUseCaseMock as any,
      layoutVariablesSchemaUseCaseMock as any,
      layoutRepositoryMock as any,
      analyticsServiceMock as any,
      buildLayoutIssuesUsecaseMock as any
    );

    // Default mocks setup
    isStringifiedMailyJSONContentStub.returns(false);
    buildLayoutIssuesUsecaseMock.execute.resolves({} as LayoutIssuesDto);
    upsertControlValuesUseCaseMock.execute.resolves(mockControlValues as any);
    layoutVariablesSchemaUseCaseMock.execute.resolves(mockLayoutVariablesSchema as any);
    layoutRepositoryMock.findOne.resolves(undefined);
  });

  afterEach(() => {
    sinon.restore();
    isStringifiedMailyJSONContentStub.reset();
  });

  describe('execute', () => {
    describe('create layout path', () => {
      beforeEach(() => {
        getLayoutUseCaseMock.execute.resolves(undefined);
        createLayoutUseCaseMock.execute.resolves(mockCreatedLayout);
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
        getLayoutUseCaseMock.execute.resolves(mockExistingLayout);
        updateLayoutUseCaseMock.execute.resolves(mockExistingLayout);
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

        expect(getLayoutUseCaseMock.execute.calledOnce).to.be.true;
        const getCommand = getLayoutUseCaseMock.execute.firstCall.args[0];
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
        getLayoutUseCaseMock.execute.resolves(undefined);
        createLayoutUseCaseMock.execute.resolves(mockCreatedLayout);
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

    describe('layout variables schema', () => {
      beforeEach(() => {
        getLayoutUseCaseMock.execute.resolves(undefined);
        createLayoutUseCaseMock.execute.resolves(mockCreatedLayout);
      });

      it('should call layoutVariablesSchemaUseCase with correct parameters', async () => {
        const command = UpsertLayoutCommand.create({
          userId: mockUser._id,
          environmentId: mockUser.environmentId,
          organizationId: mockUser.organizationId,
          layoutDto: mockLayoutDto,
        });

        await upsertLayoutUseCase.execute(command);

        expect(layoutVariablesSchemaUseCaseMock.execute.calledOnce).to.be.true;
        const schemaCommand = layoutVariablesSchemaUseCaseMock.execute.firstCall.args[0];
        expect(schemaCommand.environmentId).to.equal(mockUser.environmentId);
        expect(schemaCommand.organizationId).to.equal(mockUser.organizationId);
        expect(schemaCommand.controlValues).to.deep.equal(mockLayoutDto.controlValues);
      });

      it('should handle empty control values in schema generation', async () => {
        const layoutDtoWithEmptyControls = {
          ...mockLayoutDto,
          controlValues: undefined,
        };

        const command = UpsertLayoutCommand.create({
          userId: mockUser._id,
          environmentId: mockUser.environmentId,
          organizationId: mockUser.organizationId,
          layoutDto: layoutDtoWithEmptyControls,
        });

        await upsertLayoutUseCase.execute(command);

        const schemaCommand = layoutVariablesSchemaUseCaseMock.execute.firstCall.args[0];
        expect(schemaCommand.controlValues).to.deep.equal({});
      });
    });
  });

  describe('validation', () => {
    describe('email content validation', () => {
      beforeEach(() => {
        getLayoutUseCaseMock.execute.resolves(undefined);
        createLayoutUseCaseMock.execute.resolves(mockCreatedLayout);
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
        getLayoutUseCaseMock.execute.resolves(undefined);
        createLayoutUseCaseMock.execute.resolves(mockCreatedLayout);
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
          // The BadRequestException constructor converts the issues object to a string message
          expect(error.response).to.deep.equal(mockIssues);
        }
      });
    });
  });

  describe('error handling', () => {
    it('should propagate errors from getLayoutUseCase', async () => {
      const error = new Error('Failed to get layout');
      getLayoutUseCaseMock.execute.rejects(error);

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
      getLayoutUseCaseMock.execute.resolves(undefined);
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
      getLayoutUseCaseMock.execute.resolves(mockExistingLayout);
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
      getLayoutUseCaseMock.execute.resolves(undefined);
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

    it('should propagate errors from layoutVariablesSchemaUseCase', async () => {
      const error = new Error('Failed to generate schema');
      getLayoutUseCaseMock.execute.resolves(undefined);
      createLayoutUseCaseMock.execute.resolves(mockCreatedLayout);
      layoutVariablesSchemaUseCaseMock.execute.rejects(error);

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
      getLayoutUseCaseMock.execute.resolves(layoutWithoutTypeAndOrigin);
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

      getLayoutUseCaseMock.execute.resolves(undefined);
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
      getLayoutUseCaseMock.execute.resolves(undefined);
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
      expect(getLayoutUseCaseMock.execute.called).to.be.false;
    });
  });

  describe('parameter verification', () => {
    beforeEach(() => {
      getLayoutUseCaseMock.execute.resolves(undefined);
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
      expect(layoutVariablesSchemaUseCaseMock.execute.calledOnce).to.be.true;
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
