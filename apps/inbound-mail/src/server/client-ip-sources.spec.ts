import { expect } from 'chai';

import { collectClientIpSources } from './client-ip-sources';

describe('collectClientIpSources', () => {
  it('orders SMTP session fields before email headers and Received chain', () => {
    const debug = collectClientIpSources(
      {
        remoteAddress: '10.0.45.33',
        clientHostname: 'ip-10-0-45-33.eu-west-2.compute.internal',
        xForward: new Map([['ADDR', '203.0.113.10']]),
        xClient: new Map([
          ['ADDR', '203.0.113.10'],
          ['ADDR:DEFAULT', '10.0.45.33'],
        ]),
      },
      {
        'x-forwarded-for': '198.51.100.20, 10.0.0.1',
        received: ['from mail.google.com (mail.google.com [209.85.128.123]) by mx.example.com'],
      }
    );

    expect(debug.spfEvaluatedWith).to.deep.equal({
      ip: '10.0.45.33',
      helo: 'ip-10-0-45-33.eu-west-2.compute.internal',
      property: 'session.remoteAddress',
    });

    expect(debug.orderedCandidates[0]).to.include({
      property: 'session.xForward.ADDR',
      value: '203.0.113.10',
      isPrivate: false,
    });

    const headerCandidate = debug.orderedCandidates.find(
      (candidate) => candidate.property === 'headers.x-forwarded-for'
    );
    expect(headerCandidate?.value).to.equal('198.51.100.20');

    const receivedCandidate = debug.orderedCandidates.find((candidate) =>
      candidate.property.startsWith('headers.received[0]')
    );
    expect(receivedCandidate?.value).to.equal('209.85.128.123');

    expect(debug.firstPublicCandidate?.property).to.equal('session.xForward.ADDR');
  });

  it('extracts the first IP from Forwarded headers', () => {
    const debug = collectClientIpSources(
      {
        remoteAddress: '10.0.0.5',
        clientHostname: 'proxy.internal',
      },
      {
        forwarded: 'for=203.0.113.60;proto=smtp;by=203.0.113.1',
      }
    );

    const forwardedCandidate = debug.orderedCandidates.find((candidate) => candidate.property === 'headers.forwarded');

    expect(forwardedCandidate?.value).to.equal('203.0.113.60');
  });
});
