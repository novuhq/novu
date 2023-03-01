import { UserSession } from '@novu/testing';
import { expect } from 'chai';

import { createRegressionNotificationTemplate } from './helpers';

const providerId = 'sendgrid';

let session: UserSession;

describe('Regression test - Provider', () => {
  describe('Email channel', () => {
    describe(`Provider ${providerId}`, () => {
      beforeEach(async () => {
        session = new UserSession();
        await session.initialize();
        await createRegressionNotificationTemplate(session, providerId);
      });

      it('should create notification template properly', async () => {
        expect(1).to.eql(0);
      });
    });
  });
});
