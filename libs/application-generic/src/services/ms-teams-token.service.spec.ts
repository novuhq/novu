import axios from 'axios';
import { expect } from 'chai';
import sinon from 'sinon';
import { PinoLogger } from '../logging';
import { MsTeamsTokenService } from './ms-teams-token.service';

const MOCK_CLIENT_ID = 'client-id-abc';
const MOCK_SECRET_KEY = 'secret-key-xyz';
const MOCK_TENANT_ID = 'tenant-id-123';
const MOCK_ACCESS_TOKEN = 'mock-access-token';

function buildService(): MsTeamsTokenService {
  const logger = {
    setContext: sinon.stub(),
    error: sinon.stub(),
  } as unknown as PinoLogger;

  return new MsTeamsTokenService(logger);
}

describe('MsTeamsTokenService', () => {
  let axiosPost: sinon.SinonStub;
  let service: MsTeamsTokenService;

  beforeEach(() => {
    axiosPost = sinon.stub(axios, 'post');
    service = buildService();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getGraphToken', () => {
    it('should request a client_credentials token with the Graph scope', async () => {
      axiosPost.resolves({ data: { access_token: MOCK_ACCESS_TOKEN, expires_in: 3600 } });

      const token = await service.getGraphToken(MOCK_CLIENT_ID, MOCK_SECRET_KEY, MOCK_TENANT_ID);

      expect(token).to.equal(MOCK_ACCESS_TOKEN);

      const [url, body] = axiosPost.firstCall.args;
      expect(url).to.include(`/${MOCK_TENANT_ID}/oauth2/v2.0/token`);

      const params = new URLSearchParams(body as string);
      expect(params.get('grant_type')).to.equal('client_credentials');
      expect(params.get('scope')).to.equal('https://graph.microsoft.com/.default');
      expect(params.get('client_id')).to.equal(MOCK_CLIENT_ID);
    });

    it('should throw when the Graph token request fails', async () => {
      axiosPost.rejects(new Error('Network error'));

      let thrownError: Error | undefined;

      try {
        await service.getGraphToken(MOCK_CLIENT_ID, MOCK_SECRET_KEY, MOCK_TENANT_ID);
      } catch (err) {
        thrownError = err as Error;
      }

      expect(thrownError).to.be.instanceOf(Error);
      expect(thrownError?.message).to.include('Network error');
    });
  });

  describe('getBotFrameworkToken', () => {
    it('should request a client_credentials token with the Bot Framework scope', async () => {
      axiosPost.resolves({ data: { access_token: MOCK_ACCESS_TOKEN, expires_in: 3600 } });

      const token = await service.getBotFrameworkToken(MOCK_CLIENT_ID, MOCK_SECRET_KEY, MOCK_TENANT_ID);

      expect(token).to.equal(MOCK_ACCESS_TOKEN);

      const [url, body] = axiosPost.firstCall.args;
      expect(url).to.include(`/${MOCK_TENANT_ID}/oauth2/v2.0/token`);

      const params = new URLSearchParams(body as string);
      expect(params.get('grant_type')).to.equal('client_credentials');
      expect(params.get('scope')).to.equal('https://api.botframework.com/.default');
    });

    it('should return an empty string and log on network failure (graceful degradation)', async () => {
      axiosPost.rejects(new Error('Network error'));

      const token = await service.getBotFrameworkToken(MOCK_CLIENT_ID, MOCK_SECRET_KEY, MOCK_TENANT_ID);

      expect(token).to.equal('');
    });

    it('should return an empty string and log on HTTP error response', async () => {
      const axiosError = Object.assign(new Error('Unauthorized'), {
        isAxiosError: true,
        response: { status: 401, data: { error: 'unauthorized' } },
      });
      sinon.stub(axios, 'isAxiosError').returns(true);
      axiosPost.rejects(axiosError);

      const token = await service.getBotFrameworkToken(MOCK_CLIENT_ID, MOCK_SECRET_KEY, MOCK_TENANT_ID);

      expect(token).to.equal('');
    });
  });
});
