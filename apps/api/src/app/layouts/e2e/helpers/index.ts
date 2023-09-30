import { UserSession } from '@novu/testing';
import { expect } from 'chai';

import { LayoutDto } from '../../dtos';
import { LayoutName, TemplateVariableTypeEnum, LayoutIdentifier } from '../../types';

const BASE_PATH = '/v1/layouts';

export const createLayout = async (
  session: UserSession,
  name: LayoutName,
  isDefault: boolean,
  identifier: LayoutIdentifier
): Promise<LayoutDto> => {
  const description = 'Amazing new layout';
  const content = '<html><body><div>Hello {{organizationName}} {{{body}}}</div></body></html>';
  const variables = [
    { name: 'organizationName', type: TemplateVariableTypeEnum.STRING, defaultValue: 'Company', required: false },
  ];
  const response = await session.testAgent.post(BASE_PATH).send({
    name,
    identifier,
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
