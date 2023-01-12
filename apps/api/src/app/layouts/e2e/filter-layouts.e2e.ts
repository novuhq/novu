import { UserSession } from '@novu/testing';
import { LayoutRepository } from '@novu/dal';
import { LayoutName, TemplateVariableTypeEnum } from '@novu/shared';
import { expect } from 'chai';

import { CreateLayoutResponseDto } from '../dtos';

const BASE_PATH = '/v1/layouts';

describe('Filter layouts - /layouts (GET)', async () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();

    await createNewLayout(session, 'layout-name-1');
    await createNewLayout(session, 'layout-name-2');
    await createNewLayout(session, 'layout-name-3');
  });

  it('should return a validation error if the params provided are not in the right type', async () => {
    const url = `${BASE_PATH}?page=first&pageSize=big`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(400);
    expect(response.body.error).to.eql('Bad Request');
    expect(response.body.message).to.eql([
      'page must not be less than 0',
      'page must be an integer number',
      'pageSize must not be less than 0',
      'pageSize must be an integer number',
    ]);
  });

  it('should return a validation error if the expected params provided are not integers', async () => {
    const url = `${BASE_PATH}?page=1.5&pageSize=1.5`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(400);
    expect(response.body.error).to.eql('Bad Request');
    expect(response.body.message).to.eql(['page must be an integer number', 'pageSize must be an integer number']);
  });

  it('should return a validation error if the expected params provided are negative integers', async () => {
    const url = `${BASE_PATH}?page=-1&pageSize=-1`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(400);
    expect(response.body.error).to.eql('Bad Request');
    expect(response.body.message).to.eql(['page must not be less than 0', 'pageSize must not be less than 0']);
  });

  it('should return a Bad Request error if the page size requested is bigger than the default one (10)', async () => {
    const url = `${BASE_PATH}?page=1&pageSize=101`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(400);
    expect(response.body.error).to.eql('Bad Request');
    expect(response.body.message).to.eql('Page size can not be larger then 10');
  });

  it('should retrieve all the layouts that exist in the database for the environment if not query params provided', async () => {
    const url = `${BASE_PATH}`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(200);

    const { data, totalCount, page, pageSize } = response.body;

    expect(data.length).to.eql(3);
    expect(totalCount).to.eql(3);
    expect(page).to.eql(0);
    expect(pageSize).to.eql(10);
  });

  it('should retrieve two layouts from the database for the environment if pageSize is set to 2 and page 0 selected', async () => {
    const url = `${BASE_PATH}?page=0&pageSize=2`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(200);

    const { data, totalCount, page, pageSize } = response.body;

    expect(data.length).to.eql(2);
    expect(totalCount).to.eql(3);
    expect(page).to.eql(0);
    expect(pageSize).to.eql(2);

    expect(data[0].name).to.eql('layout-name-1');
    expect(data[1].name).to.eql('layout-name-2');
  });

  it('should retrieve one layout from the database for the environment if pageSize is set to 2 and page 1 selected', async () => {
    const url = `${BASE_PATH}?page=1&pageSize=2`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(200);

    const { data, totalCount, page, pageSize } = response.body;

    expect(data.length).to.eql(1);
    expect(totalCount).to.eql(3);
    expect(page).to.eql(1);
    expect(pageSize).to.eql(2);

    expect(data[0].name).to.eql('layout-name-3');
  });

  it('should retrieve zero layouts from the database for the environment if pageSize is set to 2 and page 2 selected', async () => {
    const url = `${BASE_PATH}?page=2&pageSize=2`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(200);

    const { data, totalCount, page, pageSize } = response.body;

    expect(data.length).to.eql(0);
    expect(totalCount).to.eql(3);
    expect(page).to.eql(2);
    expect(pageSize).to.eql(2);
  });

  it('should ignore other query params and return all the layouts that belong to the environment', async () => {
    const url = `${BASE_PATH}?unsupportedParam=whatever`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(200);

    const { data, totalCount, page, pageSize } = response.body;

    expect(data.length).to.eql(3);
    expect(totalCount).to.eql(3);
    expect(page).to.eql(0);
    expect(pageSize).to.eql(10);
  });
});

const createNewLayout = async (session: UserSession, layoutName: LayoutName): Promise<CreateLayoutResponseDto> => {
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

  const result = await session.testAgent
    .post(BASE_PATH)
    .send({
      name: layoutName,
      content,
      variables,
      isDefault,
    })
    .set('Accept', 'application/json')
    .expect('Content-Type', /json/);

  expect(result.status).to.eql(201);

  const { _id } = result.body.data;

  return {
    _id,
  };
};
