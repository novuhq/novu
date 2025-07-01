import sinon from 'sinon';
import { expect } from 'chai';
import { LayoutEntity, LayoutRepository } from '@novu/dal';
import { ChannelTypeEnum, DirectionEnum, ResourceOriginEnum, ResourceTypeEnum } from '@novu/shared';

import { ListLayoutsUseCase } from './list-layouts.use-case';
import { ListLayoutsCommand } from './list-layouts.command';
// eslint-disable-next-line
import * as mapperModule from '../mapper';

describe('ListLayoutsUseCase', () => {
  let layoutRepositoryMock: sinon.SinonStubbedInstance<LayoutRepository>;
  let listLayoutsUseCase: ListLayoutsUseCase;
  let mapToResponseDtoStub: sinon.SinonStub;

  const mockUser = {
    _id: 'user_id',
    environmentId: 'env_id',
    organizationId: 'org_id',
  };

  const mockLayoutEntity: LayoutEntity = {
    _id: 'layout_id_1',
    identifier: 'layout_identifier_1',
    name: 'Test Layout 1',
    isDefault: false,
    channel: ChannelTypeEnum.EMAIL,
    content: '<html><body>{{content}}</body></html>',
    contentType: 'customHtml',
    updatedAt: '2023-01-02T00:00:00.000Z',
    createdAt: '2023-01-01T00:00:00.000Z',
    _environmentId: 'env_id',
    _organizationId: 'org_id',
    _creatorId: 'creator_id',
    deleted: false,
    origin: ResourceOriginEnum.NOVU_CLOUD,
    type: ResourceTypeEnum.BRIDGE,
    controls: {
      schema: {},
      uiSchema: {},
    },
  };

  const mockLayoutEntity2: LayoutEntity = {
    _id: 'layout_id_2',
    identifier: 'layout_identifier_2',
    name: 'Test Layout 2',
    isDefault: true,
    channel: ChannelTypeEnum.EMAIL,
    content: '<html><body>{{content}}</body></html>',
    contentType: 'customHtml',
    updatedAt: '2023-01-02T00:00:00.000Z',
    createdAt: '2023-01-01T00:00:00.000Z',
    _environmentId: 'env_id',
    _organizationId: 'org_id',
    _creatorId: 'creator_id',
    deleted: false,
    origin: ResourceOriginEnum.NOVU_CLOUD,
    type: ResourceTypeEnum.BRIDGE,
    controls: {
      schema: {},
      uiSchema: {},
    },
  };

  const mockRepositoryResponse = {
    data: [mockLayoutEntity, mockLayoutEntity2],
    totalCount: 2,
  };

  const mockLayoutResponseDto = {
    _id: 'layout_id_1',
    layoutId: 'layout_identifier_1',
    name: 'Test Layout 1',
    isDefault: false,
    updatedAt: '2023-01-02T00:00:00.000Z',
    createdAt: '2023-01-01T00:00:00.000Z',
    origin: ResourceOriginEnum.NOVU_CLOUD,
    type: ResourceTypeEnum.BRIDGE,
    variables: {},
    issues: undefined,
    controls: {
      uiSchema: {},
      values: {},
    },
  };

  const mockLayoutResponseDto2 = {
    _id: 'layout_id_2',
    layoutId: 'layout_identifier_2',
    name: 'Test Layout 2',
    isDefault: true,
    updatedAt: '2023-01-04T00:00:00.000Z',
    createdAt: '2023-01-03T00:00:00.000Z',
    origin: ResourceOriginEnum.NOVU_CLOUD,
    type: ResourceTypeEnum.BRIDGE,
    variables: {},
    issues: undefined,
    controls: {
      uiSchema: {},
      values: {},
    },
  };

  beforeEach(() => {
    layoutRepositoryMock = sinon.createStubInstance(LayoutRepository);
    mapToResponseDtoStub = sinon.stub(mapperModule, 'mapToResponseDto');

    listLayoutsUseCase = new ListLayoutsUseCase(layoutRepositoryMock as any);

    // Default mocks
    layoutRepositoryMock.getV2List.resolves(mockRepositoryResponse);
    mapToResponseDtoStub.onFirstCall().returns(mockLayoutResponseDto);
    mapToResponseDtoStub.onSecondCall().returns(mockLayoutResponseDto2);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('execute', () => {
    it('should successfully list layouts with default parameters', async () => {
      const command = ListLayoutsCommand.create({
        user: mockUser as any,
        offset: 0,
        limit: 10,
        orderBy: 'createdAt',
        orderDirection: DirectionEnum.DESC,
      });

      const result = await listLayoutsUseCase.execute(command);

      expect(result).to.deep.equal({
        layouts: [mockLayoutResponseDto, mockLayoutResponseDto2],
        totalCount: 2,
      });

      // Verify repository was called with correct parameters
      expect(layoutRepositoryMock.getV2List.calledOnce).to.be.true;
      const repositoryCall = layoutRepositoryMock.getV2List.firstCall.args[0];
      expect(repositoryCall).to.deep.equal({
        organizationId: 'org_id',
        environmentId: 'env_id',
        skip: 0,
        limit: 10,
        searchQuery: undefined,
        orderBy: 'createdAt',
        orderDirection: DirectionEnum.DESC,
      });
    });

    it('should handle search query parameter', async () => {
      const command = ListLayoutsCommand.create({
        user: mockUser as any,
        offset: 0,
        limit: 10,
        orderBy: 'name',
        orderDirection: DirectionEnum.ASC,
        searchQuery: 'test search',
      });

      await listLayoutsUseCase.execute(command);

      const repositoryCall = layoutRepositoryMock.getV2List.firstCall.args[0];
      expect(repositoryCall.searchQuery).to.equal('test search');
      expect(repositoryCall.orderBy).to.equal('name');
      expect(repositoryCall.orderDirection).to.equal(DirectionEnum.ASC);
    });

    it('should handle pagination parameters', async () => {
      const command = ListLayoutsCommand.create({
        user: mockUser as any,
        offset: 20,
        limit: 5,
        orderBy: 'updatedAt',
        orderDirection: DirectionEnum.DESC,
      });

      await listLayoutsUseCase.execute(command);

      const repositoryCall = layoutRepositoryMock.getV2List.firstCall.args[0];
      expect(repositoryCall.skip).to.equal(20);
      expect(repositoryCall.limit).to.equal(5);
      expect(repositoryCall.orderBy).to.equal('updatedAt');
    });

    it('should return empty result when repository returns null data', async () => {
      layoutRepositoryMock.getV2List.resolves({ data: null, totalCount: 0 });

      const command = ListLayoutsCommand.create({
        user: mockUser as any,
        offset: 0,
        limit: 10,
        orderBy: 'createdAt',
        orderDirection: DirectionEnum.DESC,
      });

      const result = await listLayoutsUseCase.execute(command);

      expect(result).to.deep.equal({
        layouts: [],
        totalCount: 0,
      });
    });

    it('should return empty result when repository returns undefined data', async () => {
      layoutRepositoryMock.getV2List.resolves({ data: undefined, totalCount: 0 });

      const command = ListLayoutsCommand.create({
        user: mockUser as any,
        offset: 0,
        limit: 10,
        orderBy: 'createdAt',
        orderDirection: DirectionEnum.DESC,
      });

      const result = await listLayoutsUseCase.execute(command);

      expect(result).to.deep.equal({
        layouts: [],
        totalCount: 0,
      });
    });

    it('should handle empty data array', async () => {
      layoutRepositoryMock.getV2List.resolves({ data: [], totalCount: 0 });

      const command = ListLayoutsCommand.create({
        user: mockUser as any,
        offset: 0,
        limit: 10,
        orderBy: 'createdAt',
        orderDirection: DirectionEnum.DESC,
      });

      const result = await listLayoutsUseCase.execute(command);

      expect(result).to.deep.equal({
        layouts: [],
        totalCount: 0,
      });
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database connection failed');
      layoutRepositoryMock.getV2List.rejects(error);

      const command = ListLayoutsCommand.create({
        user: mockUser as any,
        offset: 0,
        limit: 10,
        orderBy: 'createdAt',
        orderDirection: DirectionEnum.DESC,
      });

      try {
        await listLayoutsUseCase.execute(command);
        expect.fail('Should have thrown an error');
      } catch (thrownError) {
        expect(thrownError.message).to.equal('Database connection failed');
      }
    });

    it('should call mapToResponseDto for each layout', async () => {
      const command = ListLayoutsCommand.create({
        user: mockUser as any,
        offset: 0,
        limit: 10,
        orderBy: 'createdAt',
        orderDirection: DirectionEnum.DESC,
      });

      await listLayoutsUseCase.execute(command);

      expect(mapToResponseDtoStub.calledTwice).to.be.true;

      // Verify first call
      const firstCallArgs = mapToResponseDtoStub.firstCall.args[0];
      expect(firstCallArgs.layout._id).to.equal('layout_id_1');
      expect(firstCallArgs.layout.identifier).to.equal('layout_identifier_1');
      expect(firstCallArgs.controlValues).to.be.null;
      expect(firstCallArgs.variables).to.deep.equal({});

      // Verify second call
      const secondCallArgs = mapToResponseDtoStub.secondCall.args[0];
      expect(secondCallArgs.layout._id).to.equal('layout_id_2');
      expect(secondCallArgs.layout.identifier).to.equal('layout_identifier_2');
      expect(secondCallArgs.controlValues).to.be.null;
      expect(secondCallArgs.variables).to.deep.equal({});
    });

    it('should handle single layout in result', async () => {
      const singleLayoutResponse = {
        data: [mockLayoutEntity],
        totalCount: 1,
      };
      layoutRepositoryMock.getV2List.resolves(singleLayoutResponse);
      mapToResponseDtoStub.onFirstCall().returns(mockLayoutResponseDto);

      const command = ListLayoutsCommand.create({
        user: mockUser as any,
        offset: 0,
        limit: 10,
        orderBy: 'createdAt',
        orderDirection: DirectionEnum.DESC,
      });

      const result = await listLayoutsUseCase.execute(command);

      expect(result).to.deep.equal({
        layouts: [mockLayoutResponseDto],
        totalCount: 1,
      });
      expect(mapToResponseDtoStub.calledOnce).to.be.true;
    });

    it('should preserve totalCount from repository response', async () => {
      const responseWithDifferentTotal = {
        data: [mockLayoutEntity],
        totalCount: 100, // More than actual data length
      };
      layoutRepositoryMock.getV2List.resolves(responseWithDifferentTotal);
      mapToResponseDtoStub.onFirstCall().returns(mockLayoutResponseDto);

      const command = ListLayoutsCommand.create({
        user: mockUser as any,
        offset: 50,
        limit: 10,
        orderBy: 'createdAt',
        orderDirection: DirectionEnum.DESC,
      });

      const result = await listLayoutsUseCase.execute(command);

      expect(result.totalCount).to.equal(100);
      expect(result.layouts).to.have.length(1);
    });

    it('should handle layouts with deleted flag correctly', async () => {
      const deletedLayoutEntity = {
        ...mockLayoutEntity,
        deleted: true,
      };

      const responseWithDeletedLayout = {
        data: [deletedLayoutEntity],
        totalCount: 1,
      };
      layoutRepositoryMock.getV2List.resolves(responseWithDeletedLayout);

      const command = ListLayoutsCommand.create({
        user: mockUser as any,
        offset: 0,
        limit: 10,
        orderBy: 'createdAt',
        orderDirection: DirectionEnum.DESC,
      });

      await listLayoutsUseCase.execute(command);

      // Verify the mapFromEntity method correctly maps deleted flag
      const mapperCall = mapToResponseDtoStub.firstCall.args[0];
      expect(mapperCall.layout.isDeleted).to.be.true;
    });

    it('should handle layouts without controls', async () => {
      const layoutWithoutControls = {
        ...mockLayoutEntity,
        controls: undefined,
      };

      const responseWithoutControls = {
        data: [layoutWithoutControls],
        totalCount: 1,
      };
      layoutRepositoryMock.getV2List.resolves(responseWithoutControls);

      const command = ListLayoutsCommand.create({
        user: mockUser as any,
        offset: 0,
        limit: 10,
        orderBy: 'createdAt',
        orderDirection: DirectionEnum.DESC,
      });

      await listLayoutsUseCase.execute(command);

      // Verify the mapFromEntity method handles missing controls
      const mapperCall = mapToResponseDtoStub.firstCall.args[0];
      expect(mapperCall.layout.controls).to.deep.equal({});
    });

    it('should correctly map entity properties to DTO', async () => {
      const command = ListLayoutsCommand.create({
        user: mockUser as any,
        offset: 0,
        limit: 10,
        orderBy: 'createdAt',
        orderDirection: DirectionEnum.DESC,
      });

      await listLayoutsUseCase.execute(command);

      const mapperCall = mapToResponseDtoStub.firstCall.args[0];
      const layoutDto = mapperCall.layout;

      // Verify all entity properties are correctly mapped
      expect(layoutDto._id).to.equal(mockLayoutEntity._id);
      expect(layoutDto._organizationId).to.equal(mockLayoutEntity._organizationId);
      expect(layoutDto._environmentId).to.equal(mockLayoutEntity._environmentId);
      expect(layoutDto.identifier).to.equal(mockLayoutEntity.identifier);
      expect(layoutDto.name).to.equal(mockLayoutEntity.name);
      expect(layoutDto.isDefault).to.equal(mockLayoutEntity.isDefault);
      expect(layoutDto.channel).to.equal(mockLayoutEntity.channel);
      expect(layoutDto.content).to.equal(mockLayoutEntity.content);
      expect(layoutDto.contentType).to.equal(mockLayoutEntity.contentType);
      expect(layoutDto.isDeleted).to.equal(mockLayoutEntity.deleted);
      expect(layoutDto.origin).to.equal(mockLayoutEntity.origin);
      expect(layoutDto.type).to.equal(mockLayoutEntity.type);
    });
  });
});
