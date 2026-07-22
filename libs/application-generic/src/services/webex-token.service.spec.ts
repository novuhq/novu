import { BadGatewayException } from '@nestjs/common';
import axios from 'axios';
import { expect } from 'chai';
import sinon from 'sinon';
import { WebexTokenService } from './webex-token.service';

const MOCK_REFRESH_TOKEN = 'webex-refresh-token';
const MOCK_CLIENT_ID = 'webex-client-id';
const MOCK_CLIENT_SECRET = 'webex-client-secret';

describe('WebexTokenService', () => {
  let axiosPost: sinon.SinonStub;
  let service: WebexTokenService;

  beforeEach(() => {
    axiosPost = sinon.stub(axios, 'post');
    service = new WebexTokenService();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should exchange a Webex refresh token with a timeout', async () => {
    axiosPost.resolves({
      data: {
        access_token: 'new-access-token',
        expires_in: 3600,
        refresh_token: 'new-refresh-token',
      },
    });

    const response = await service.refreshAccessToken(MOCK_REFRESH_TOKEN, MOCK_CLIENT_ID, MOCK_CLIENT_SECRET);

    expect(response.access_token).to.equal('new-access-token');

    const [url, body, config] = axiosPost.firstCall.args;
    expect(url).to.equal('https://webexapis.com/v1/access_token');
    expect(config.timeout).to.equal(10000);

    const params = new URLSearchParams(body as string);
    expect(params.get('grant_type')).to.equal('refresh_token');
    expect(params.get('refresh_token')).to.equal(MOCK_REFRESH_TOKEN);
    expect(params.get('client_id')).to.equal(MOCK_CLIENT_ID);
    expect(params.get('client_secret')).to.equal(MOCK_CLIENT_SECRET);
  });

  it('should wrap Webex refresh failures with a reconnect hint', async () => {
    sinon.stub(axios, 'isAxiosError').returns(true);
    axiosPost.rejects({
      isAxiosError: true,
      message: 'Request failed with status code 400',
      response: {
        status: 400,
        data: { message: 'invalid_grant' },
      },
    });

    let error: unknown;
    try {
      await service.refreshAccessToken(MOCK_REFRESH_TOKEN, MOCK_CLIENT_ID, MOCK_CLIENT_SECRET);
    } catch (err) {
      error = err;
    }

    expect(error).to.be.instanceOf(BadGatewayException);
    expect((error as Error).message).to.contain('Webex token refresh failed (HTTP 400): invalid_grant');
    expect((error as Error).message).to.contain('Reconnect the Webex channel connection');
  });
});
