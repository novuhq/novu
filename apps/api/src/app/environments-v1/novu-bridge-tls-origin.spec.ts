import { ExecuteFrameworkRequest } from '@novu/application-generic';
import { GetActionEnum, PostActionEnum } from '@novu/framework/internal';
import { expect } from 'chai';

/**
 * `getApiUrl` decides which origin a Novu-hosted bridge is called on. It is private
 * and the surrounding use case needs a repository plus a decrypted secret key, so it
 * is exercised directly here: the scheme it picks is what breaks first when the API
 * is switched to an HTTPS-only listener.
 */
type ApiUrlResolver = { getApiUrl(action: PostActionEnum | GetActionEnum): string };

function resolver(): ApiUrlResolver {
  return Object.create(ExecuteFrameworkRequest.prototype) as unknown as ApiUrlResolver;
}

describe('Novu-hosted bridge origin', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env.NOVU_TLS_ENABLED;
    delete process.env.API_INTERNAL_ORIGIN;
    delete process.env.GLOBAL_CONTEXT_PATH;
    delete process.env.API_CONTEXT_PATH;
    process.env.PORT = '3000';
    process.env.API_ROOT_URL = 'https://api.example.com';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('with TLS disabled', () => {
    it('calls preview back over the plain-HTTP loopback', () => {
      expect(resolver().getApiUrl(PostActionEnum.PREVIEW)).to.equal('http://localhost:3000');
    });

    it('keeps using the loopback for preview even when an internal origin is configured', () => {
      process.env.API_INTERNAL_ORIGIN = 'http://api:3000';

      expect(resolver().getApiUrl(PostActionEnum.PREVIEW)).to.equal('http://localhost:3000');
    });

    it('uses API_ROOT_URL for non-preview actions', () => {
      expect(resolver().getApiUrl(PostActionEnum.EXECUTE)).to.equal('https://api.example.com');
    });
  });

  describe('with TLS enabled', () => {
    beforeEach(() => {
      process.env.NOVU_TLS_ENABLED = 'true';
    });

    it('moves the preview loopback to HTTPS, because the listener no longer answers HTTP', () => {
      expect(resolver().getApiUrl(PostActionEnum.PREVIEW)).to.equal('https://localhost:3000');
    });

    it('prefers API_INTERNAL_ORIGIN for preview so the certificate can match a real name', () => {
      process.env.API_INTERNAL_ORIGIN = 'https://api:3000';

      expect(resolver().getApiUrl(PostActionEnum.PREVIEW)).to.equal('https://api:3000');
    });

    it('still prefers API_INTERNAL_ORIGIN for non-preview actions', () => {
      process.env.API_INTERNAL_ORIGIN = 'https://api:3000';

      expect(resolver().getApiUrl(PostActionEnum.EXECUTE)).to.equal('https://api:3000');
    });

    it('applies API_CONTEXT_PATH to the HTTPS loopback, which reaches the server directly', () => {
      process.env.API_CONTEXT_PATH = 'api';

      expect(resolver().getApiUrl(PostActionEnum.PREVIEW)).to.equal('https://localhost:3000/api');
    });

    it('does not apply API_CONTEXT_PATH to API_INTERNAL_ORIGIN, matching non-preview actions', () => {
      process.env.API_CONTEXT_PATH = 'api';
      process.env.API_INTERNAL_ORIGIN = 'https://api:3000';

      expect(resolver().getApiUrl(PostActionEnum.PREVIEW)).to.equal(resolver().getApiUrl(PostActionEnum.EXECUTE));
    });
  });

  describe('API_CONTEXT_PATH with TLS disabled', () => {
    it('keeps applying it to the plain-HTTP preview loopback', () => {
      process.env.API_CONTEXT_PATH = 'api';

      expect(resolver().getApiUrl(PostActionEnum.PREVIEW)).to.equal('http://localhost:3000/api');
    });
  });
});
