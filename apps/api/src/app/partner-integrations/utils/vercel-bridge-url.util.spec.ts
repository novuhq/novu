import { expect } from 'chai';
import { buildNovuBridgeUrl, resolveVercelProjectAlias } from './vercel-bridge-url.util';

describe('vercel-bridge-url.util', () => {
  it('should resolve the shortest production alias', () => {
    const alias = resolveVercelProjectAlias(
      {
        production: {
          alias: ['my-app.vercel.app', 'my-app-git-main-org.vercel.app'],
        },
      },
      'Production'
    );

    expect(alias).to.equal('my-app.vercel.app');
  });

  it('should build the Novu bridge URL', () => {
    expect(buildNovuBridgeUrl('my-app.vercel.app')).to.equal('https://my-app.vercel.app/api/novu');
  });
});
