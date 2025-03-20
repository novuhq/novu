import { ClerkClient } from '@clerk/backend';
import { CommunityUserRepository } from '@novu/dal';
import { EEUserRepository } from '@novu/ee-auth';
import { NewDashboardOptInStatusEnum } from '@novu/shared';

export class UserService {
  private userRepository: EEUserRepository;

  constructor(private clerkClient: ClerkClient) {
    this.userRepository = new EEUserRepository(new CommunityUserRepository(), this.clerkClient);
  }

  async createClerkUser({
    email,
    password,
    firstName,
    lastName,
  }: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    // create clerk user
    return await this.clerkClient.users.createUser({
      emailAddress: [email],
      password,
      firstName,
      lastName,
      legalAcceptedAt: new Date(),
    });
  }

  async createNovuUser({ externalId }: { externalId: string }) {
    // create novu user
    const novuUser = await this.userRepository.create({}, { linkOnly: true, externalId });
    await this.clerkClient.users.updateUser(externalId, {
      externalId: novuUser._id,
      unsafeMetadata: {
        newDashboardOptInStatus: NewDashboardOptInStatusEnum.OPTED_IN,
      },
    });
    return novuUser;
  }

  async deleteClerkUser(externalId: string) {
    await this.clerkClient.users.deleteUser(externalId);
  }
}
