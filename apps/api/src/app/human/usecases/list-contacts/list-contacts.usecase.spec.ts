import { HumanChannelViaEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { ListContactsCommand } from './list-contacts.command';
import { ListContacts } from './list-contacts.usecase';

describe('ListContacts', () => {
  it('reports the address verified for this relay, not the shared subscriber email', async () => {
    const subscriberRepository = {
      listSubscribers: sinon.stub().resolves({
        subscribers: [
          {
            subscriberId: 'alice',
            email: 'shared@example.com',
            createdAt: '2026-10-01T00:00:00.000Z',
            updatedAt: '2026-10-01T00:00:00.000Z',
          },
        ],
        next: null,
      }),
    };
    const deliveryService = {
      describeReachabilityForMany: sinon.stub().resolves(
        new Map([
          [
            'alice',
            {
              targets: [
                {
                  via: HumanChannelViaEnum.EMAIL,
                  platform: HumanChannelViaEnum.EMAIL,
                  platformUserId: 'relay-a@example.com',
                  integrationIdentifier: 'email-main',
                  connectedAt: '2026-10-02T00:00:00.000Z',
                },
              ],
              defaultVia: HumanChannelViaEnum.EMAIL,
            },
          ],
        ])
      ),
    };
    const usecase = new ListContacts(
      subscriberRepository as never,
      { findOne: sinon.stub().resolves({ _id: 'agent-1' }) } as never,
      deliveryService as never,
      { findPending: sinon.stub().resolves(new Map()) } as never
    );

    const page = await usecase.execute(
      ListContactsCommand.create({
        environmentId: 'env-1',
        organizationId: 'org-1',
        userId: 'user-1',
      })
    );

    expect(page.data[0].email).to.equal('shared@example.com');
    expect(page.data[0].channels[0]).to.deep.include({
      via: HumanChannelViaEnum.EMAIL,
      address: 'relay-a@example.com',
    });
  });
});
