import { UserSession } from '@novu/testing';
import { expect } from 'chai';

import { createLayout } from './helpers';

import { LayoutDto } from '../dtos';
import { TemplateVariableTypeEnum } from '../types';

const BASE_PATH = '/v1/layouts';

describe('Layout update - /layouts (PATCH)', async () => {
  let session: UserSession;
  let createdLayout: LayoutDto;

  before(async () => {
    session = new UserSession();
    await session.initialize();
    createdLayout = await createLayout(session, 'layout-name-update', true);
  });

  it('should throw validation error for empty payload when not sending a body', async () => {
    const url = `${BASE_PATH}/${createdLayout._id}`;

    const updateResponse = await session.testAgent.patch(url).send();

    const { body } = updateResponse;
    expect(body.statusCode).to.eql(400);
    expect(body.message).to.eql('Payload can not be empty');
  });

  it('should throw validation error for empty payload when sending a body of an empty object', async () => {
    const url = `${BASE_PATH}/${createdLayout._id}`;

    const updateResponse = await session.testAgent.patch(url).send({});

    const { body } = updateResponse;
    expect(body.statusCode).to.eql(400);
    expect(body.message).to.eql('Payload can not be empty');
  });

  it('should update a new layout successfully', async () => {
    const url = `${BASE_PATH}/${createdLayout._id}`;

    const updatedLayoutName = 'layout-name-update';
    const updatedDescription = 'We thought it was more amazing than it is';
    const updatedContent = [];
    const updatedVariables = [];
    const updatedIsDefault = false;

    const updateResponse = await session.testAgent.patch(url).send({
      name: updatedLayoutName,
      description: updatedDescription,
      content: updatedContent,
      variables: updatedVariables,
      isDefault: updatedIsDefault,
    });

    expect(updateResponse.statusCode).to.eql(200);

    const updatedBody = updateResponse.body.data;
    expect(updatedBody._id).to.eql(createdLayout._id);
    expect(updatedBody._environmentId).to.eql(session.environment._id);
    expect(updatedBody._organizationId).to.eql(session.organization._id);
    expect(updatedBody._creatorId).to.eql(session.user._id);
    expect(updatedBody.name).to.eql(updatedLayoutName);
    expect(updatedBody.description).to.eql(updatedDescription);
    expect(updatedBody.content).to.eql(updatedContent);
    expect(updatedBody.variables).to.eql(updatedVariables);
    expect(updatedBody.contentType).to.eql('customHtml');
    expect(updatedBody.isDefault).to.eql(updatedIsDefault);
    expect(updatedBody.isDeleted).to.eql(false);
    expect(updatedBody.createdAt).to.be.ok;
    expect(updatedBody.updatedAt).to.be.ok;
  });
});
