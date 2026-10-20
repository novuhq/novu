import { expect } from 'chai';
import { toInclusiveUtcDays, toUtcDay } from './inclusive-utc-days';

describe('toUtcDay', () => {
  it('returns the UTC calendar day', () => {
    expect(toUtcDay(new Date('2026-09-01T14:00:00.000Z'))).to.equal('2026-09-01');
  });
});

describe('toInclusiveUtcDays', () => {
  it('maps a midnight exclusive end to the previous calendar day', () => {
    expect(
      toInclusiveUtcDays(new Date('2024-01-01T00:00:00.000Z'), new Date('2024-02-01T00:00:00.000Z'))
    ).to.deep.equal({
      start: '2024-01-01',
      end: '2024-01-31',
    });
  });

  it('keeps a mid-day exclusive end on that calendar day', () => {
    expect(
      toInclusiveUtcDays(new Date('2026-09-01T14:00:00.000Z'), new Date('2026-10-01T14:00:00.000Z'))
    ).to.deep.equal({
      start: '2026-09-01',
      end: '2026-10-01',
    });
  });
});
