import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Environment - Feature Flags', () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should have disable by default the feature flag that enables the feature of sending notifications to a topic', () => {
    expect(session.environment.name).to.be.eql('Development');
    expect(process.env.FF_IS_TOPIC_NOTIFICATION_ENABLED).to.be.eql('false');
  });
});
