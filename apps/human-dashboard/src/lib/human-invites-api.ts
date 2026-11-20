import 'server-only';

import type { HumanAccount } from './human-account';
import { requestForAccount } from './human-api-key';

export type InviteLink = {
  /** The invite page the contact opens to pick how the operator's agents reach them. */
  url: string;
  /** ISO timestamp when the link stops working. */
  expiresAt: string;
  /** The apps offered on that page. */
  channels: Array<{ via: 'telegram' | 'slack'; integrationIdentifier: string; connected: boolean }>;
};

/** Makes an invite link for a contact; `contactId` is the id agents will pass to `--to`. */
export function createInviteLink(
  account: HumanAccount,
  invite: { contactId: string; firstName?: string; lastName?: string }
): Promise<InviteLink> {
  return requestForAccount<InviteLink>(account, '/v1/human/invites', {
    method: 'POST',
    body: {
      subscriberId: invite.contactId,
      ...(invite.firstName ? { firstName: invite.firstName } : {}),
      ...(invite.lastName ? { lastName: invite.lastName } : {}),
    },
  });
}
