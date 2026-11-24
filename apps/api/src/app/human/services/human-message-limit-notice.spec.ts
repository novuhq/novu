import { expect } from 'chai';

import { fromNow, limitReachedNotice } from './human-message-limit-notice';

describe('limitReachedNotice', () => {
  it('names the day’s limit, when it starts over and how far off that is', () => {
    const notice = limitReachedNotice(
      'JunoX',
      { cap: 'daily', limit: 50, resetsAt: '2026-11-21T00:00:00.000Z' },
      new Date('2026-11-20T18:10:00.000Z')
    );

    expect(notice).to.equal(
      'JunoX reached today’s limit of 50 messages, so its replies to you and your contacts won’t arrive until ' +
        '00:00 UTC, in about 6 hours. Messages to JunoX still come in.'
    );
  });

  it('names the month’s limit with the day it starts over', () => {
    const notice = limitReachedNotice(
      'JunoX',
      { cap: 'monthly', limit: 300, resetsAt: '2026-12-01T00:00:00.000Z' },
      new Date('2026-11-20T12:00:00.000Z')
    );

    expect(notice).to.include('JunoX reached this month’s limit of 300 messages');
    expect(notice).to.include('until December 1, 00:00 UTC, in about 11 days.');
  });
});

describe('fromNow', () => {
  const now = new Date('2026-11-20T00:00:00.000Z');
  const after = (ms: number) => new Date(now.getTime() + ms);

  it('counts minutes under an hour, hours under two days, and days after that', () => {
    expect(fromNow(after(30_000), now)).to.equal('in 1 minute');
    expect(fromNow(after(40 * 60_000), now)).to.equal('in 40 minutes');
    expect(fromNow(after(65 * 60_000), now)).to.equal('in about 1 hour');
    expect(fromNow(after(6 * 3_600_000), now)).to.equal('in about 6 hours');
    expect(fromNow(after(11.5 * 86_400_000), now)).to.equal('in about 12 days');
  });
});
