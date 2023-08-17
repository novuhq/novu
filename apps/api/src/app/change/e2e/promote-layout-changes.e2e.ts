/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from 'chai';
import { ChangeRepository, EnvironmentRepository, LayoutRepository } from '@novu/dal';
import {
  ChangeEntityTypeEnum,
  ITemplateVariable,
  LayoutDescription,
  LayoutId,
  LayoutIdentifier,
  LayoutName,
  TemplateVariableTypeEnum,
} from '@novu/shared';
import { UserSession } from '@novu/testing';

describe('Promote Layout Changes', () => {
  let session: UserSession;
  const changeRepository: ChangeRepository = new ChangeRepository();
  const layoutRepository = new LayoutRepository();
  const environmentRepository: EnvironmentRepository = new EnvironmentRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should promote a new layout created to production', async () => {
    const layoutName = 'layout-name-creation';
    const layoutIdentifier = 'layout-identifier-creation';
    const layoutDescription = 'Amazing new layout';
    const content = '<html><body><div>Hello {{organizationName}} {{{body}}}</div></body></html>';
    const variables = [
      { name: 'organizationName', type: TemplateVariableTypeEnum.STRING, defaultValue: 'Company', required: false },
    ];
    const isDefault = true;

    const createLayoutPayload = {
      name: layoutName,
      identifier: layoutIdentifier,
      description: layoutDescription,
      content,
      variables,
      isDefault,
    };

    const {
      body: {
        data: { _id: layoutId },
      },
    } = await session.testAgent.post('/v1/layouts').send(createLayoutPayload);

    expect(layoutId).to.be.ok;

    const {
      body: { data: devLayout },
    } = await session.testAgent.get(`/v1/layouts/${layoutId}`);

    const changes = await changeRepository.find(
      {
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        enabled: false,
        _entityId: layoutId,
        type: ChangeEntityTypeEnum.DEFAULT_LAYOUT,
      },
      '',
      {
        sort: { createdAt: 1 },
      }
    );

    expect(changes.length).to.eql(1);
    expect(changes[0]._entityId).to.eql(layoutId);
    expect(changes[0].type).to.eql(ChangeEntityTypeEnum.DEFAULT_LAYOUT);
    expect(changes[0].change).to.deep.include({ op: 'add', path: ['_id'], val: layoutId });

    await session.applyChanges({
      enabled: false,
    });

    const prodEnv = await getProductionEnvironment();

    const prodLayout = await layoutRepository.findOne({
      _environmentId: prodEnv._id,
      _parentId: layoutId,
    });

    expect(prodLayout).to.be.ok;
    expect(prodLayout._parentId).to.eql(devLayout._id);
    expect(prodLayout._environmentId).to.eql(prodEnv._id);
    expect(prodLayout._organizationId).to.eql(session.organization._id);
    expect(prodLayout._creatorId).to.eql(session.user._id);
    expect(prodLayout.name).to.eql(layoutName);
    expect(prodLayout.identifier).to.eql(layoutIdentifier);
    expect(prodLayout.content).to.eql(content);
    // TODO: Awful but it comes from the repository directly.
    const { _id: _, ...prodVariables } = prodLayout.variables?.[0] as any;
    expect(prodVariables).to.deep.include(variables[0]);
    expect(prodLayout.contentType).to.eql(devLayout.contentType);
    expect(prodLayout.isDefault).to.eql(isDefault);
    expect(prodLayout.channel).to.eql(devLayout.channel);
  });

  it('should promote the updates done to a layout existing to production', async () => {
    const layoutName = 'layout-name-update';
    const layoutIdentifier = 'layout-identifier-update';
    const layoutDescription = 'Amazing new layout';
    const content = '<html><body><div>Hello {{organizationName}} {{{body}}}</div></body></html>';
    const variables = [
      { name: 'organizationName', type: TemplateVariableTypeEnum.STRING, defaultValue: 'Company', required: false },
    ];
    const isDefault = false;

    const layoutId = await createLayout(layoutName, layoutIdentifier, layoutDescription, content, variables, isDefault);

    await session.applyChanges({
      enabled: false,
    });

    const updatedLayoutName = 'layout-name-creation-updated';
    const updatedLayoutIdentifier = 'layout-identifier-creation-updated';
    const updatedDescription = 'Amazing new layout updated';
    const updatedContent = '<html><body><div>Hello {{organizationName}}, you all {{{body}}}</div></body></html>';
    const updatedVariables = [
      {
        name: 'organizationName',
        type: TemplateVariableTypeEnum.STRING,
        defaultValue: 'Organization',
        required: true,
      },
    ];
    const updatedIsDefault = false;

    const patchLayoutPayload = {
      name: updatedLayoutName,
      identifier: updatedLayoutIdentifier,
      description: updatedDescription,
      content: updatedContent,
      variables: updatedVariables,
      isDefault: updatedIsDefault,
    };

    const {
      status,
      body: { data: patchedLayout },
    } = await session.testAgent.patch(`/v1/layouts/${layoutId}`).send(patchLayoutPayload);
    expect(status).to.eql(200);

    const changes = await changeRepository.find(
      {
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        enabled: false,
        _entityId: layoutId,
        type: ChangeEntityTypeEnum.LAYOUT,
      },
      '',
      {
        sort: { createdAt: 1 },
      }
    );

    expect(changes.length).to.eql(1);
    expect(changes[0]._entityId).to.eql(layoutId);
    expect(changes[0].type).to.eql(ChangeEntityTypeEnum.LAYOUT);
    expect(changes[0].change).to.deep.include.members([
      {
        op: 'update',
        path: ['name'],
        val: updatedLayoutName,
        oldVal: layoutName,
      },
      {
        op: 'update',
        path: ['identifier'],
        val: updatedLayoutIdentifier,
        oldVal: layoutIdentifier,
      },
      {
        op: 'update',
        path: ['description'],
        val: updatedDescription,
        oldVal: layoutDescription,
      },
      {
        op: 'update',
        path: ['description'],
        val: updatedDescription,
        oldVal: layoutDescription,
      },
      {
        op: 'update',
        path: ['content'],
        val: '<html><body><div>Hello {{organizationName}}, you all {{{body}}}</div></body></html>',
        oldVal: '<html><body><div>Hello {{organizationName}} {{{body}}}</div></body></html>',
      },
      {
        op: 'update',
        path: ['variables', 0, 'defaultValue'],
        val: 'Organization',
        oldVal: 'Company',
      },
      {
        op: 'update',
        path: ['variables', 0, 'required'],
        val: true,
        oldVal: false,
      },
    ]);

    await session.applyChanges({
      enabled: false,
    });

    const prodEnv = await getProductionEnvironment();

    const prodLayout = await layoutRepository.findOne({
      _environmentId: prodEnv._id,
      _parentId: layoutId,
    });

    expect(prodLayout).to.be.ok;
    expect(prodLayout._parentId).to.eql(patchedLayout._id);
    expect(prodLayout._environmentId).to.eql(prodEnv._id);
    expect(prodLayout._organizationId).to.eql(session.organization._id);
    expect(prodLayout._creatorId).to.eql(session.user._id);
    expect(prodLayout.name).to.eql(updatedLayoutName);
    expect(prodLayout.identifier).to.eql(updatedLayoutIdentifier);
    expect(prodLayout.content).to.eql(updatedContent);
    // TODO: Awful but it comes from the repository directly.
    const { _id, ...prodVariables } = prodLayout.variables?.[0] as any;
    expect(prodVariables).to.deep.include(updatedVariables[0]);
    expect(prodLayout.contentType).to.eql(patchedLayout.contentType);
    expect(prodLayout.isDefault).to.eql(updatedIsDefault);
    expect(prodLayout.channel).to.eql(patchedLayout.channel);
  });

  it('should promote the deletion of a layout to production', async () => {
    const layoutName = 'layout-name-deletion';
    const layoutIdentifier = 'layout-identifier-deletion';
    const layoutDescription = 'Amazing new layout';
    const content = '<html><body><div>Hello {{organizationName}} {{{body}}}</div></body></html>';
    const variables = [
      { name: 'organizationName', type: TemplateVariableTypeEnum.STRING, defaultValue: 'Company', required: false },
    ];
    const isDefault = false;

    const layoutId = await createLayout(layoutName, layoutIdentifier, layoutDescription, content, variables, isDefault);
    const {
      body: { data: devLayout },
    } = await session.testAgent.get(`/v1/layouts/${layoutId}`);

    const changes = await changeRepository.find(
      {
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        enabled: false,
        _entityId: layoutId,
        type: ChangeEntityTypeEnum.LAYOUT,
      },
      '',
      {
        sort: { createdAt: 1 },
      }
    );

    expect(changes.length).to.eql(1);
    expect(changes[0]._entityId).to.eql(layoutId);
    expect(changes[0].type).to.eql(ChangeEntityTypeEnum.LAYOUT);
    expect(changes[0].change).to.deep.include({ op: 'add', path: ['_id'], val: layoutId });

    await session.applyChanges({
      enabled: false,
    });

    const {
      body: { data: deletedLayout },
      status,
    } = await session.testAgent.delete(`/v1/layouts/${layoutId}`);

    expect(status).to.eql(204);

    const deletionChanges = await changeRepository.find(
      {
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        enabled: false,
        _entityId: layoutId,
        type: ChangeEntityTypeEnum.LAYOUT,
      },
      '',
      {
        sort: { createdAt: 1 },
      }
    );

    expect(deletionChanges.length).to.eql(1);
    expect(deletionChanges[0]._entityId).to.eql(layoutId);
    expect(deletionChanges[0].type).to.eql(ChangeEntityTypeEnum.LAYOUT);
    expect(deletionChanges[0].change).to.deep.include.members([
      {
        op: 'update',
        path: ['deleted'],
        val: true,
        oldVal: false,
      },
      {
        op: 'add',
        path: ['isDeleted'],
        val: true,
      },
    ]);

    await session.applyChanges({
      enabled: false,
    });

    const prodEnv = await getProductionEnvironment();

    const prodLayout = await layoutRepository.findOne({
      _environmentId: prodEnv._id,
      _parentId: layoutId,
    });

    expect(prodLayout).to.not.be.ok;
  });

  async function createLayout(
    layoutName: LayoutName,
    layoutIdentifier: LayoutIdentifier,
    layoutDescription: LayoutDescription,
    content: string,
    variables: ITemplateVariable[],
    isDefault: boolean
  ): Promise<LayoutId> {
    const createLayoutPayload = {
      name: layoutName,
      identifier: layoutIdentifier,
      description: layoutDescription,
      content,
      variables,
      isDefault,
    };

    const {
      body: {
        data: { _id: layoutId },
      },
    } = await session.testAgent.post('/v1/layouts').send(createLayoutPayload);

    expect(layoutId).to.be.ok;

    return layoutId;
  }

  async function getProductionEnvironment() {
    return await environmentRepository.findOne({
      _parentId: session.environment._id,
    });
  }
});
