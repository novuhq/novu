import { ClerkClient } from '@clerk/backend';
import { CommunityOrganizationRepository } from '@novu/dal';
import { EEOrganizationRepository } from '@novu/ee-auth';

export class OrganizationService {
  constructor(private clerkClient: ClerkClient) {}

  async createClerkOrganization({ name, createdBy }: { name: string; createdBy: string }) {
    return await this.clerkClient.organizations.createOrganization({
      name,
      createdBy,
    });
  }

  async createNovuOrganization({ externalId }: { externalId: string }) {
    // sync clerk organization to novu organization
    const organizationRepository = new EEOrganizationRepository(
      new CommunityOrganizationRepository(),
      this.clerkClient
    );
    const novuOrganization = await organizationRepository.create(
      {
        externalId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {}
    );
    await this.clerkClient.organizations.updateOrganization(externalId, {
      publicMetadata: {
        externalOrgId: novuOrganization._id,
      },
    });

    return novuOrganization;
  }

  async deleteClerkOrganization(externalId: string) {
    await this.clerkClient.organizations.deleteOrganization(externalId);
  }
}
