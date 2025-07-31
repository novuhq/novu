import { Injectable } from '@nestjs/common';
import { OrganizationRepository, UserRepository } from '@novu/dal';
import { uiComponent } from '@team-plain/typescript-sdk';
import { differenceInDays } from 'date-fns';
import { PlainCardsCommand } from './plain-cards.command';

@Injectable()
export class PlainCardsUsecase {
  constructor(
    private organizationRepository: OrganizationRepository,
    private userRepository: UserRepository
  ) {}
  async fetchCustomerDetails(command: PlainCardsCommand) {
    const key = `customer-details-${process.env.NOVU_REGION}`;
    if (!command?.customer?.externalId) {
      return {
        data: {},
        cards: [
          {
            key,
            components: [
              uiComponent.spacer({ size: 'S' }),
              uiComponent.text({
                text: 'This user is not yet registered in this region',
              }),
            ],
          },
        ],
      };
    }

    const organizations = await this.organizationRepository.findUserActiveOrganizations(command?.customer?.externalId);
    if (!organizations) {
      return {
        data: {},
        cards: [
          {
            key,
            components: [
              uiComponent.spacer({ size: 'S' }),
              uiComponent.text({
                text: 'This user is not yet registered in this region',
              }),
            ],
          },
        ],
      };
    }

    const sessions = await this.userRepository.findUserSessions(command?.customer?.externalId);

    return {
      data: {},
      cards: [
        {
          key,
          components: [
            uiComponent.text({
              text: "User's Organizations",
              size: 'L',
            }),
            uiComponent.divider({ spacingSize: 'M' }),
            ...this.organizationsComponent(organizations),
            uiComponent.divider({ spacingSize: 'M' }),
            uiComponent.text({
              text: "User's Sessions",
              size: 'L',
            }),
            uiComponent.divider({ spacingSize: 'M' }),
            ...this.sessionsComponent(sessions),
          ],
        },
      ],
    };
  }

  private organizationsComponent = (organizations) => {
    const activeOrganizations = organizations?.map((organization) => {
      const orgCreatedAt = new Date(organization?.createdAt);
      const isTrialRemaining = differenceInDays(new Date(), orgCreatedAt) < 14;

      const orgTier =
        organization?.apiServiceLevel === 'business' && isTrialRemaining
          ? 'business-trial'
          : (organization?.apiServiceLevel ?? 'NA');

      return uiComponent.container({
        content: [
          uiComponent.spacer({ size: 'XS' }),
          uiComponent.text({
            text: 'Novu Org Id',
            size: 'S',
            color: 'MUTED',
          }),
          uiComponent.spacer({ size: 'XS' }),
          uiComponent.row({
            mainContent: [
              uiComponent.text({
                text: organization?._id,
                size: 'S',
              }),
            ],
            asideContent: [
              uiComponent.copyButton({
                tooltip: 'Copy Novu Org Id',
                value: organization?._id,
              }),
            ],
          }),
          uiComponent.spacer({ size: 'M' }),
          uiComponent.text({
            text: 'Clerk Org Id',
            size: 'S',
            color: 'MUTED',
          }),
          uiComponent.spacer({ size: 'XS' }),
          uiComponent.row({
            mainContent: [
              uiComponent.text({
                text: organization?.externalId,
                size: 'S',
              }),
            ],
            asideContent: [
              uiComponent.copyButton({
                tooltip: 'Copy Clerk Org Id',
                value: organization?.externalId,
              }),
            ],
          }),
          uiComponent.spacer({ size: 'M' }),
          uiComponent.text({
            text: 'Org Name',
            size: 'S',
            color: 'MUTED',
          }),
          uiComponent.spacer({ size: 'XS' }),
          uiComponent.row({
            mainContent: [
              uiComponent.text({
                text: organization?.name,
                size: 'S',
              }),
            ],
            asideContent: [
              uiComponent.copyButton({
                tooltip: 'Copy Org Name',
                value: organization?.name,
              }),
            ],
          }),
          uiComponent.spacer({ size: 'M' }),
          uiComponent.spacer({ size: 'XS' }),
          uiComponent.row({
            mainContent: [
              uiComponent.text({
                text: 'Org Tier',
                size: 'S',
                color: 'MUTED',
              }),
            ],
            asideContent: [
              uiComponent.text({
                text: orgTier,
                size: 'S',
              }),
            ],
          }),
          uiComponent.spacer({ size: 'M' }),
          uiComponent.row({
            mainContent: [
              uiComponent.text({
                text: 'Org Created At',
                size: 'S',
              }),
            ],
            asideContent: [
              uiComponent.text({
                text: organization?.createdAt,
                size: 'S',
              }),
            ],
          }),
        ],
      });
    });

    return activeOrganizations;
  };

  private sessionsComponent = (sessions) => {
    const allSessions = sessions.map((session) => {
      return uiComponent.container({
        content: [
          uiComponent.row({
            mainContent: [
              uiComponent.text({
                text: 'Status',
                size: 'S',
              }),
            ],
            asideContent: [
              uiComponent.text({
                text: session?.status || 'NA',
              }),
            ],
          }),
          uiComponent.row({
            mainContent: [
              uiComponent.text({
                text: 'City',
                size: 'S',
              }),
            ],
            asideContent: [
              uiComponent.text({
                text: session?.latestActivity?.city || 'NA',
              }),
            ],
          }),
          uiComponent.row({
            mainContent: [
              uiComponent.text({
                text: 'Country',
                size: 'S',
              }),
            ],
            asideContent: [
              uiComponent.text({
                text: session?.latestActivity?.country || 'NA',
              }),
            ],
          }),
          uiComponent.row({
            mainContent: [
              uiComponent.text({
                text: 'Device Type',
                size: 'S',
              }),
            ],
            asideContent: [
              uiComponent.text({
                text: session?.latestActivity?.deviceType || 'NA',
              }),
            ],
          }),
          uiComponent.row({
            mainContent: [
              uiComponent.text({
                text: 'Browser Name',
                size: 'S',
              }),
            ],
            asideContent: [
              uiComponent.text({
                text: session?.latestActivity?.browserName || 'NA',
              }),
            ],
          }),
          uiComponent.row({
            mainContent: [
              uiComponent.text({
                text: 'Browser Version',
                size: 'S',
              }),
            ],
            asideContent: [
              uiComponent.text({
                text: session?.latestActivity?.browserVersion || 'NA',
              }),
            ],
          }),
        ],
      });
    });

    return allSessions;
  };
}
