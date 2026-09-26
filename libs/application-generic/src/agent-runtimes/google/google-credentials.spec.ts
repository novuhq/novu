import { expect } from 'chai';
import { resolveGeminiCredentials } from './google-credentials';

describe('resolveGeminiCredentials', () => {
  it('returns null when projectName or instanceId is missing', () => {
    expect(resolveGeminiCredentials({})).to.equal(null);
    expect(resolveGeminiCredentials({ projectName: 'proj' })).to.equal(null);
    expect(resolveGeminiCredentials({ instanceId: 'engine' })).to.equal(null);
  });

  it('resolves project/engine/location without an agentId', () => {
    const resolved = resolveGeminiCredentials({ projectName: 'proj', instanceId: 'engine' });

    expect(resolved).to.deep.equal({
      projectId: 'proj',
      location: 'global',
      engineId: 'engine',
      quotaProjectId: 'proj',
    });
  });

  it('carries the dashboard-picked agentId through when set', () => {
    const resolved = resolveGeminiCredentials({
      projectName: 'proj',
      instanceId: 'engine',
      agentId: 'deep_research',
    });

    expect(resolved).to.deep.equal({
      projectId: 'proj',
      location: 'global',
      engineId: 'engine',
      quotaProjectId: 'proj',
      agentId: 'deep_research',
    });
  });

  it('omits agentId when blank', () => {
    const resolved = resolveGeminiCredentials({
      projectName: 'proj',
      instanceId: 'engine',
      agentId: '   ',
    });

    expect(resolved).to.not.have.property('agentId');
  });

  it('respects an explicit region override', () => {
    const resolved = resolveGeminiCredentials({
      projectName: 'proj',
      instanceId: 'engine',
      region: 'us-central1',
    });

    expect(resolved?.location).to.equal('us-central1');
  });
});
