import { EmailProviderIdEnum } from '@novu/shared';
import { ResolveAgentInboundAddresses } from './resolve-agent-inbound-addresses.usecase';

describe('ResolveAgentInboundAddresses workflow reply-to', () => {
  it('looks up only the Novu Email inbox, so Agent Email Inbox is not a workflow reply-to', async () => {
    const integrationFind = jest.fn().mockResolvedValue([]);
    const usecase = new ResolveAgentInboundAddresses(
      {
        findOne: jest.fn().mockResolvedValue({ _id: 'agent-1', identifier: 'relay', name: 'Relay' }),
      } as never,
      {
        find: jest.fn().mockResolvedValue([{ _integrationId: 'inbox-1' }]),
      } as never,
      { find: integrationFind, findOne: jest.fn() } as never,
      { find: jest.fn().mockResolvedValue([]) } as never,
      { find: jest.fn() } as never
    );

    const replyTo = await usecase.resolveEffectiveReplyTo({
      agent: { identifier: 'relay' },
      environmentId: 'env-1',
      organizationId: 'org-1',
    });

    expect(replyTo).toBeUndefined();
    expect(integrationFind).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: EmailProviderIdEnum.NovuAgent }),
      '_id credentials'
    );
    const query = integrationFind.mock.calls[0][0] as { providerId: unknown };
    expect(query.providerId).not.toEqual(
      expect.objectContaining({ $in: expect.arrayContaining(['agent-email-inbox']) })
    );
  });
});
