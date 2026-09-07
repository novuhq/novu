import { expect } from 'chai';

import { buildAgentApiRootUrl } from './agent-api-root-url';

describe('buildAgentApiRootUrl', () => {
  const originalApiRootUrl = process.env.API_ROOT_URL;
  const originalAgentApiHostname = process.env.AGENT_API_HOSTNAME;

  afterEach(() => {
    process.env.API_ROOT_URL = originalApiRootUrl;
    process.env.AGENT_API_HOSTNAME = originalAgentApiHostname;
  });

  it('uses API_ROOT_URL when AGENT_API_HOSTNAME is not set', () => {
    process.env.API_ROOT_URL = 'https://api.example.com';
    delete process.env.AGENT_API_HOSTNAME;

    expect(buildAgentApiRootUrl()).to.equal('https://api.example.com');
  });

  it('prefers AGENT_API_HOSTNAME over API_ROOT_URL when both are set', () => {
    process.env.API_ROOT_URL = 'https://api.example.com';
    process.env.AGENT_API_HOSTNAME = 'https://tunnel.ngrok.app';

    expect(buildAgentApiRootUrl()).to.equal('https://tunnel.ngrok.app');
  });

  it('falls back to API_ROOT_URL when AGENT_API_HOSTNAME is empty/whitespace', () => {
    process.env.API_ROOT_URL = 'https://api.example.com';
    process.env.AGENT_API_HOSTNAME = '   ';

    expect(buildAgentApiRootUrl()).to.equal('https://api.example.com');
  });

  it('strips a single trailing slash from the resolved root URL', () => {
    process.env.API_ROOT_URL = 'https://api.example.com/';
    delete process.env.AGENT_API_HOSTNAME;

    expect(buildAgentApiRootUrl()).to.equal('https://api.example.com');
  });

  it('strips multiple trailing slashes from the resolved root URL', () => {
    process.env.API_ROOT_URL = 'https://api.example.com///';
    delete process.env.AGENT_API_HOSTNAME;

    expect(buildAgentApiRootUrl()).to.equal('https://api.example.com');
  });

  it('throws when neither env var is set', () => {
    delete process.env.API_ROOT_URL;
    delete process.env.AGENT_API_HOSTNAME;

    expect(() => buildAgentApiRootUrl()).to.throw(/AGENT_API_HOSTNAME or API_ROOT_URL/i);
  });
});
