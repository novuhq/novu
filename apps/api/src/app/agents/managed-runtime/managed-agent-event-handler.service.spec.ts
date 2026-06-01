import { expect } from 'chai';
import { buildErrorMessage } from './managed-agent-event-handler.service';

describe('buildErrorMessage', () => {
  it('maps webhook-deserialized MCP init failures to a connect prompt', () => {
    const message = buildErrorMessage({
      name: 'ThalamusError',
      message:
        "MCP server 'Asana' initialize failed: no credential is stored for this server URL — check that the agent's MCP server URL matches the URL in the vault",
    });

    expect(message).to.contain('**Asana**');
    expect(message).to.contain('Connect');
    expect(message).to.not.contain('temporarily unavailable');
  });

  it('falls back to the generic unavailable message for unknown errors', () => {
    const message = buildErrorMessage({ name: 'ThalamusError', message: 'Upstream provider unavailable' });

    expect(message).to.contain('temporarily unavailable');
  });
});
