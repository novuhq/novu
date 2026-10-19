import { expect } from 'chai';
import { enhanceDigestStepOutputs, enhanceStepsMap } from './enhance-digest-step-outputs';

describe('enhanceDigestStepOutputs', () => {
  it('adds digest summary helpers alongside events and eventCount', () => {
    const outputs = enhanceDigestStepOutputs({
      events: [
        { id: '1', time: '2026-07-23T09:00:00.000Z', payload: { name: 'Ada' } },
        { id: '2', time: '2026-07-23T09:01:00.000Z', payload: { name: 'Grace' } },
      ],
      eventCount: 2,
    });

    expect(outputs.eventCount).to.equal(2);
    expect(outputs.countSummary).to.equal('2 notifications');
    expect(outputs.sentenceSummary).to.equal('Ada, Grace');
  });

  it('returns outputs unchanged when events are missing', () => {
    const outputs = enhanceDigestStepOutputs({ eventCount: 0 });

    expect(outputs).to.deep.equal({ eventCount: 0 });
  });
});

describe('enhanceStepsMap', () => {
  it('enhances every step entry that contains digest events', () => {
    const stepsMap = enhanceStepsMap({
      'digest-step': {
        events: [{ id: '1', time: '2026-07-23T09:00:00.000Z', payload: { name: 'Ada' } }],
        eventCount: 1,
      },
      'http-step': { statusCode: 200 },
    });

    expect(stepsMap['digest-step'].countSummary).to.equal('1 notification');
    expect(stepsMap['http-step']).to.deep.equal({ statusCode: 200 });
  });
});
