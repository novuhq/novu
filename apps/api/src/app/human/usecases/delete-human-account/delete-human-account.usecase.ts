import { Injectable } from '@nestjs/common';
import { HumanBackingAccounts } from '../../services/human-backing-accounts.service';
import { DeleteHumanAccountCommand } from './delete-human-account.command';

/**
 * Deletes the backing organization behind a Human account the way deleting a Novu organization works
 * today: the hidden Clerk user and organization, Novu's organization and user records, and the Stripe
 * customer. The agent's data in the environments stays behind. Deleting twice is a no-op.
 */
@Injectable()
export class DeleteHumanAccount {
  constructor(private readonly humanBackingAccounts: HumanBackingAccounts) {}

  async execute(command: DeleteHumanAccountCommand): Promise<void> {
    await this.humanBackingAccounts.delete(command.humanUserId);
  }
}
