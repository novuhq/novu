import { UserSession } from '@novu/testing';
import { expect } from 'chai';

import { LayoutDto } from '../../dtos';
import { LayoutName, TemplateVariableTypeEnum } from '../../types';

const BASE_PATH = '/v1/layouts';

export const createLayout = async (session: UserSession, name: LayoutName, isDefault: boolean): Promise<LayoutDto> => {
  const description = 'Amazing new layout';
  const content = [
    {
      type: 'text',
      content: 'This are the text contents of the template for {{firstName}}',
      styles: { textAlign: 'left' },
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
  const response = await session.testAgent.post(BASE_PATH).send({
    name,
    description,
    content,
    variables,
    isDefault,
  });

  expect(response.statusCode).to.eql(201);

  const { body } = response;
  const createdLayout = body.data;
  expect(createdLayout._id).to.exist;
  expect(createdLayout._id).to.be.string;

  const url = `${BASE_PATH}/${createdLayout._id}`;
  const getResponse = await session.testAgent.get(url);
  expect(getResponse.status).to.eql(200);

  return getResponse.body.data;
};
