import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { UpdateEnvironmentRequestDto } from '../dtos/update-environment-request.dto';

describe('Environment - Regenerate Api Key', async () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should regenerate echo url on api key regeneration as well', async () => {
    const updatePayload: UpdateEnvironmentRequestDto = {
      name: 'Development',
      bridge: { url: 'http://example.com' },
    };

    await session.testAgent.put(`/v1/environments/${session.environment._id}`).send(updatePayload).expect(200);

    const firstResponse = await session.testAgent.get('/v1/environments/me');

    const oldEchoUrl = firstResponse.body.data.echo.url;

    await session.testAgent.post('/v1/environments/api-keys/regenerate').send({});
    const secondResponse = await session.testAgent.get('/v1/environments/me');

    const updatedEchoUrl = secondResponse.body.data.echo.url;

    expect(updatedEchoUrl).to.not.equal(oldEchoUrl);
  });
});
