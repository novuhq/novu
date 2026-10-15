import { expect } from 'chai';
import sinon from 'sinon';
import { TrackHumanSignupStartedCommand } from './track-human-signup-started.command';
import { TrackHumanSignupStarted } from './track-human-signup-started.usecase';

describe('TrackHumanSignupStarted', () => {
  function setup() {
    const analyticsService = { mixpanelTrack: sinon.stub() };

    return { usecase: new TrackHumanSignupStarted(analyticsService as never), analyticsService };
  }

  it('tracks Signup Started with source human for the Human user', () => {
    const { usecase, analyticsService } = setup();

    usecase.execute(TrackHumanSignupStartedCommand.create({ humanUserId: 'user_2abc' }));

    expect(analyticsService.mixpanelTrack.calledOnce).to.equal(true);
    const [event, distinctId, properties] = analyticsService.mixpanelTrack.firstCall.args;
    expect(event).to.equal('Signup Started');
    expect(distinctId).to.equal('user_2abc');
    expect(properties).to.include({ source: 'human' });
    expect(properties.$insert_id).to.match(/^[a-f0-9]{32}$/);
  });

  it('gives a redelivered sign-up the same insert id, so Mixpanel counts it once', () => {
    const { usecase, analyticsService } = setup();

    usecase.execute(TrackHumanSignupStartedCommand.create({ humanUserId: 'user_2abc' }));
    usecase.execute(TrackHumanSignupStartedCommand.create({ humanUserId: 'user_2abc' }));
    usecase.execute(TrackHumanSignupStartedCommand.create({ humanUserId: 'user_other' }));

    const [first, second, other] = analyticsService.mixpanelTrack.getCalls().map((call) => call.args[2].$insert_id);
    expect(first).to.equal(second);
    expect(other).to.not.equal(first);
  });
});
