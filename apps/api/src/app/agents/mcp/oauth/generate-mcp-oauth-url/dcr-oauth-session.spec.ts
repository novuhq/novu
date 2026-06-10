import { expect } from 'chai';

import { resolveDcrClientMetadataUris } from './dcr-oauth-session';

describe('resolveDcrClientMetadataUris', () => {
  it('returns client_uri and logo_uri for a public HTTPS base', () => {
    expect(resolveDcrClientMetadataUris('https://dashboard.novu.co')).to.deep.equal({
      client_uri: 'https://dashboard.novu.co',
      logo_uri: 'https://dashboard.novu.co/images/novu.svg',
    });
  });

  it('omits metadata URIs for localhost hostnames', () => {
    expect(resolveDcrClientMetadataUris('http://localhost:4200')).to.deep.equal({});
    expect(resolveDcrClientMetadataUris('http://app.localhost')).to.deep.equal({});
  });

  it('omits metadata URIs for private and loopback IP literals', () => {
    expect(resolveDcrClientMetadataUris('http://127.0.0.1:4200')).to.deep.equal({});
    expect(resolveDcrClientMetadataUris('http://[::1]:4200')).to.deep.equal({});
    expect(resolveDcrClientMetadataUris('http://10.0.0.5')).to.deep.equal({});
    expect(resolveDcrClientMetadataUris('http://192.168.1.10')).to.deep.equal({});
    expect(resolveDcrClientMetadataUris('http://172.16.0.1')).to.deep.equal({});
    expect(resolveDcrClientMetadataUris('http://169.254.1.1')).to.deep.equal({});
  });
});
