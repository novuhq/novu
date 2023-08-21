import { UserSession } from '@novu/testing';
import { expect } from 'chai';

import { createLayout } from './helpers';

import { LayoutDto } from '../dtos';

const BASE_PATH = '/v1/layouts';

describe('Set layout as default - /layouts/:layoutId/default (POST)', async () => {
  const layoutName = 'layout-name-set-default';
  const layoutIdentifier = 'layout-identifier-set-default';
  const isDefault = false;
  let session: UserSession;
  let createdLayout: LayoutDto;

  before(async () => {
    session = new UserSession();
    await session.initialize();
    createdLayout = await createLayout(session, layoutName, isDefault, layoutIdentifier);
  });

  it('should set the chosen layout as default', async () => {
    expect(createdLayout.isDefault).to.eql(false);

    const url = `${BASE_PATH}/${createdLayout._id}/default`;
    const updateResponse = await session.testAgent.post(url);
    expect(updateResponse.status).to.eql(204);

    const getUrl = `${BASE_PATH}/${createdLayout._id}`;
    const getResponse = await session.testAgent.get(getUrl);
    expect(getResponse.status).to.eql(200);
    expect(getResponse.body.data.isDefault).to.eql(true);
  });

  it('should set the chosen layout as default and the previous default layout is non default anymore', async () => {
    const secondLayoutName = 'layout-name-set-default-2';
    const secondLayoutIdentifier = 'layout-identifier-set-default-2';
    const secondLayout = await createLayout(session, secondLayoutName, false, secondLayoutIdentifier);
    expect(secondLayout.isDefault).to.eql(false);

    const firstLayoutUrl = `${BASE_PATH}/${createdLayout._id}`;
    const firstLayoutResponse = await session.testAgent.get(firstLayoutUrl);
    expect(firstLayoutResponse.body.data.isDefault).to.eql(true);

    const url = `${BASE_PATH}/${secondLayout._id}/default`;
    const updateResponse = await session.testAgent.post(url);
    expect(updateResponse.status).to.eql(204);

    const updatedFirstLayoutResponse = await session.testAgent.get(firstLayoutUrl);
    expect(updatedFirstLayoutResponse.body.data.isDefault).to.eql(false);

    const secondLayoutUrl = `${BASE_PATH}/${secondLayout._id}`;
    const updatedSecondLayoutResponse = await session.testAgent.get(secondLayoutUrl);
    expect(updatedSecondLayoutResponse.body.data.isDefault).to.eql(true);
  });

  it('should throw a not found error when the layout ID does not exist in the database when trying to set it as default', async () => {
    const nonExistingLayoutId = 'ab12345678901234567890ab';
    const url = `${BASE_PATH}/${nonExistingLayoutId}/default`;
    const { body } = await session.testAgent.post(url);

    expect(body.statusCode).to.equal(404);
    expect(body.message).to.eql(
      `Layout not found for id ${nonExistingLayoutId} in the environment ${session.environment._id}`
    );
    expect(body.error).to.eql('Not Found');
  });
});
