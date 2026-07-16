import { expect } from 'chai';
import { stub } from 'sinon';

import {
  isValidChannelOverridesShape,
  isValidPreferredHoursShape,
  sanitizeInvalidPreferredHours,
  sanitizeMalformedPreferredHoursObjects,
} from './add-preferred-hours-migration';

describe('add-preferred-hours migration', () => {
  it('clears non-object preferredHours values only', async () => {
    const updateMany = stub().resolves({ matchedCount: 3, modifiedCount: 3 });

    const result = await sanitizeInvalidPreferredHours(updateMany);

    expect(result.invalidCleared).to.deep.equal({ matchedCount: 3, modifiedCount: 3 });
    expect(updateMany.calledOnce).to.equal(true);
    const [filter, update] = updateMany.firstCall.args;
    expect(filter).to.deep.equal({
      preferredHours: { $exists: true, $not: { $type: 'object' } },
    });
    expect(update).to.deep.equal({ $unset: { preferredHours: '' } });
  });

  it('isValidPreferredHoursShape accepts HH:mm objects and rejects legacy shapes', () => {
    expect(isValidPreferredHoursShape({ start: '09:00', end: '18:00' })).to.equal(true);
    expect(isValidPreferredHoursShape({ start: '9:00', end: '18:00' })).to.equal(false);
    expect(isValidPreferredHoursShape('09:00-18:00')).to.equal(false);
    expect(isValidPreferredHoursShape({ from: 9, to: 18 })).to.equal(false);
    expect(isValidPreferredHoursShape(null)).to.equal(false);
    expect(isValidPreferredHoursShape(undefined)).to.equal(false);
  });

  it('isValidPreferredHoursShape accepts channelOverrides and rejects invalid ones', () => {
    expect(
      isValidPreferredHoursShape({
        start: '09:00',
        end: '18:00',
        channelOverrides: { sms: 'always', email: 'respect' },
      })
    ).to.equal(true);
    expect(
      isValidPreferredHoursShape({
        start: '09:00',
        end: '18:00',
        channelOverrides: { fax: 'always' },
      })
    ).to.equal(false);
    expect(isValidChannelOverridesShape({ sms: 'always' })).to.equal(true);
    expect(isValidChannelOverridesShape(['sms'])).to.equal(false);
  });

  it('does not clear legacy start/end-only preferredHours when adding channelOverrides support', async () => {
    const docs = [
      { _id: 'legacy', _environmentId: 'env', preferredHours: { start: '09:00', end: '18:00' } },
      {
        _id: 'with-override',
        _environmentId: 'env',
        preferredHours: { start: '09:00', end: '18:00', channelOverrides: { sms: 'always' } },
      },
    ];

    async function* cursor() {
      for (const doc of docs) {
        yield doc;
      }
    }

    const updateOne = stub().resolves();
    const result = await sanitizeMalformedPreferredHoursObjects(cursor, updateOne);
    expect(result).to.deep.equal({ processed: 2, cleared: 0 });
    expect(updateOne.callCount).to.equal(0);
  });

  it('clears malformed object preferredHours via cursor sanitize', async () => {
    const docs = [
      { _id: '1', _environmentId: 'env', preferredHours: { start: '09:00', end: '18:00' } },
      { _id: '2', _environmentId: 'env', preferredHours: { start: '9am', end: '6pm' } },
      { _id: '3', _environmentId: 'env', preferredHours: { from: 9, to: 18 } },
    ];

    async function* cursor() {
      for (const doc of docs) {
        yield doc;
      }
    }

    const updateOne = stub().resolves();

    const result = await sanitizeMalformedPreferredHoursObjects(cursor, updateOne);

    expect(result).to.deep.equal({ processed: 3, cleared: 2 });
    expect(updateOne.callCount).to.equal(2);
    expect(updateOne.firstCall.args[0]).to.deep.equal({ _id: '2', _environmentId: 'env' });
    expect(updateOne.firstCall.args[1]).to.deep.equal({ $unset: { preferredHours: '' } });
  });
});
