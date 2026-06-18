import { expect } from 'chai';
import { buildVercelProjectDashboardUrl } from './vercel-dashboard-url.util';

describe('vercel-dashboard-url.util', () => {
  it('should build the Vercel deployments dashboard URL', () => {
    expect(buildVercelProjectDashboardUrl('dima-grossmans-projects', 'novu-vercel-agents-starter')).to.equal(
      'https://vercel.com/dima-grossmans-projects/novu-vercel-agents-starter/deployments'
    );
  });
});
