import { UserSession } from '@novu/testing';
import { expect } from 'chai';

import { TemplateVariableTypeEnum } from '../types';

const URL = '/v1/layouts';

describe('Layout creation - /layouts (POST)', async () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should throw validation error for missing request payload information', async () => {
    const { body } = await session.testAgent.post(URL).send({});

    expect(body.statusCode).to.equal(400);
    expect(body.message.find((i) => i.includes('name'))).to.be.ok;
    expect(body.message.find((i) => i.includes('content'))).to.be.ok;
    expect(body.message).to.eql([
      'name should not be null or undefined',
      'name must be a string',
      'content should not be null or undefined',
    ]);
  });

  it('should create a new layout successfully', async () => {
    const layoutName = 'layout-name-creation';
    const layoutDescription = 'Amazing new layout';
    const content = [
      {
        type: 'text',
        content: 'This are the text contents of the template for {{firstName}}',
      },
      {
        type: 'button',
        content: 'SIGN UP',
        url: 'https://url-of-app.com/{{urlVariable}}',
      },
    ];
    const variables = [
      { name: 'firstName', type: TemplateVariableTypeEnum.STRING, defaultValue: 'John', required: false },
    ];
    const isDefault = true;
    const response = await session.testAgent.post(URL).send({
      name: layoutName,
      description: layoutDescription,
      content,
      variables,
      isDefault,
    });

    expect(response.statusCode).to.eql(201);

    const { body } = response;
    expect(body.data._id).to.exist;
    expect(body.data._id).to.be.string;
  });
});
