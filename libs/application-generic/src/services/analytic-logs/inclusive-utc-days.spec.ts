import { expect } from 'chai';
import { inclusiveUtcDayBounds, toInclusiveUtcDays, toUtcDay } from './inclusive-utc-days';

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

describe('inclusiveUtcDayBounds', () => {
  it('bounds a mid-day range by the UTC midnights around its inclusive days', () => {
    expect(
      inclusiveUtcDayBounds(new Date('2026-09-30T15:06:44.000Z'), new Date('2026-10-30T15:06:44.000Z'))
    ).to.deep.equal({
      firstDayStart: new Date('2026-09-30T00:00:00.000Z'),
      lastDayEnd: new Date('2026-10-31T00:00:00.000Z'),
      isUtcDayAligned: false,
    });
  });

  it('closes the last day at a midnight exclusive end', () => {
    expect(
      inclusiveUtcDayBounds(new Date('2026-09-30T15:06:44.000Z'), new Date('2026-10-30T00:00:00.000Z'))
    ).to.deep.equal({
      firstDayStart: new Date('2026-09-30T00:00:00.000Z'),
      lastDayEnd: new Date('2026-10-30T00:00:00.000Z'),
      isUtcDayAligned: false,
    });
  });

  it('is not UTC-day aligned when only the end is mid-day', () => {
    expect(
      inclusiveUtcDayBounds(new Date('2026-09-30T00:00:00.000Z'), new Date('2026-10-30T15:06:44.000Z')).isUtcDayAligned
    ).to.equal(false);
  });

  it('is UTC-day aligned when both bounds are UTC midnights', () => {
    expect(
      inclusiveUtcDayBounds(new Date('2026-09-30T00:00:00.000Z'), new Date('2026-10-30T00:00:00.000Z'))
    ).to.deep.equal({
      firstDayStart: new Date('2026-09-30T00:00:00.000Z'),
      lastDayEnd: new Date('2026-10-30T00:00:00.000Z'),
      isUtcDayAligned: true,
    });
  });
});
