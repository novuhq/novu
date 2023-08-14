import { expect } from 'chai';
import { UserSession } from '@novu/testing';

import { LayoutRepository, EnvironmentRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';

import { addLayoutIdentifierMigration } from './add-layout-identifier-migration';

describe('Add identifier to layout entity', function () {
  let session: UserSession;
  const layoutRepository = new LayoutRepository();
  const environmentRepository = new EnvironmentRepository();

  const createLayout = async (withProd = false) => {
    const layout = await layoutRepository.create({
      name: 'Test Layout',
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _creatorId: session.user._id as string,
      content: '<div>An layout wrapper <div>{{{body}}}</div></div>',
      isDefault: true,
      deleted: false,
      channel: ChannelTypeEnum.EMAIL,
    });
    if (withProd) {
      const prodEnv = await environmentRepository.findOne({
        _parentId: session.environment._id,
      });
      await layoutRepository.create({
        name: 'Test Layout',
        _environmentId: prodEnv?._id,
        _organizationId: session.organization._id,
        _parentId: layout._id,
        _creatorId: session.user._id as string,
        content: '<div>An layout wrapper <div>{{{body}}}</div></div>',
        isDefault: true,
        deleted: false,
        channel: ChannelTypeEnum.EMAIL,
      });
    }

    return layout;
  };

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should add identifier to layout entity and same identifier for a layout in different environments ', async function () {
    await pruneLayouts(layoutRepository);
    const devLayout = await createLayout(true);
    await createLayout();
    await createLayout();

    const createdLayouts = await layoutRepository.find({
      _organizationId: session.organization._id,
    } as any);

    expect(createdLayouts.length).to.equal(4);

    for (const layout of createdLayouts) {
      expect(layout.identifier).to.not.exist;
    }

    await addLayoutIdentifierMigration();

    const updatedLayouts = await layoutRepository.find({
      _organizationId: session.organization._id,
    } as any);

    for (const layout of updatedLayouts) {
      expect(layout.identifier).to.exist;
    }

    const temp = updatedLayouts.filter((layout) => layout._id === devLayout._id || layout._parentId === devLayout._id);
    expect(temp.length).to.equal(2);
    expect(temp[0].identifier).to.equal(temp[1].identifier);
  });

  it('should not change identifier for layout with existing identifier', async function () {
    const existingLayout = await layoutRepository.find({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });
    await createLayout();

    await addLayoutIdentifierMigration();

    const updatedLayouts = await layoutRepository.find({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    } as any);
    updatedLayouts.forEach((layout) => {
      expect(layout.identifier).to.exist;
    });
    const existingLayoutAfterMigration = await layoutRepository.find({
      _id: existingLayout[0]._id,
      _organizationId: session.organization._id,
    });
    expect(existingLayout[0].identifier).to.equal(existingLayoutAfterMigration[0].identifier);
  });
});

async function pruneLayouts(layoutRepository) {
  const old = await layoutRepository.find({});

  for (const layout of old) {
    await layoutRepository.delete({ _id: layout._id, _environmentId: layout._environmentId });
  }
}
