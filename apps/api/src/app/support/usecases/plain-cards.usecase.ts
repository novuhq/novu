import { Injectable } from '@nestjs/common';
import { OrganizationRepository, UserRepository } from '@novu/dal';
import { PlainCardsCommand } from './plain-cards.command';

const divider = [
  {
    componentDivider: {
      dividerSpacingSize: 'M',
    },
  },
];

const organizationDetailsHeading = [
  {
    componentText: {
      text: `User's Organizations`,
      textSize: 'L',
    },
  },
];

const sessionsDetailsHeading = [
  {
    componentText: {
      text: `User's Sessions`,
      textSize: 'L',
    },
  },
];

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
              {
                componentSpacer: {
                  spacerSize: 'S',
                },
              },
              {
                componentText: {
                  text: 'This user is not yet registered in this region',
                },
              },
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
              {
                componentSpacer: {
                  spacerSize: 'S',
                },
              },
              {
                componentText: {
                  text: 'This user is not yet registered in this region',
                },
              },
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
            ...organizationDetailsHeading,
            ...divider,
            ...this.organizationsComponent(organizations),
            ...divider,
            ...sessionsDetailsHeading,
            ...this.sessionsComponent(sessions),
          ],
        },
      ],
    };
  }

  private organizationsComponent = (organizations) => {
    const activeOrganizations = organizations?.map((organization) => {
      return {
        componentContainer: {
          containerContent: [
            {
              componentSpacer: {
                spacerSize: 'XS',
              },
            },
            {
              componentText: {
                text: 'Novu Org Id',
                textSize: 'S',
                textColor: 'MUTED',
              },
            },
            {
              componentSpacer: {
                spacerSize: 'XS',
              },
            },
            {
              componentRow: {
                rowMainContent: [
                  {
                    componentText: {
                      text: organization?._id,
                      textSize: 'S',
                    },
                  },
                ],
                rowAsideContent: [
                  {
                    componentCopyButton: {
                      copyButtonTooltipLabel: 'Copy Novu Org Id',
                      copyButtonValue: organization?._id,
                    },
                  },
                ],
              },
            },
            {
              componentSpacer: {
                spacerSize: 'M',
              },
            },
            {
              componentText: {
                text: 'Clerk Org Id',
                textSize: 'S',
                textColor: 'MUTED',
              },
            },
            {
              componentSpacer: {
                spacerSize: 'XS',
              },
            },
            {
              componentRow: {
                rowMainContent: [
                  {
                    componentText: {
                      text: organization?.externalId,
                      textSize: 'S',
                    },
                  },
                ],
                rowAsideContent: [
                  {
                    componentCopyButton: {
                      copyButtonTooltipLabel: 'Copy Clerk Org Id',
                      copyButtonValue: organization?.externalId,
                    },
                  },
                ],
              },
            },
            {
              componentSpacer: {
                spacerSize: 'M',
              },
            },
            {
              componentText: {
                text: 'Org Name',
                textSize: 'S',
                textColor: 'MUTED',
              },
            },
            {
              componentSpacer: {
                spacerSize: 'XS',
              },
            },
            {
              componentRow: {
                rowMainContent: [
                  {
                    componentText: {
                      text: organization?.name,
                      textSize: 'S',
                    },
                  },
                ],
                rowAsideContent: [
                  {
                    componentCopyButton: {
                      copyButtonTooltipLabel: 'Copy Org Name',
                      copyButtonValue: organization?.name,
                    },
                  },
                ],
              },
            },
            {
              componentSpacer: {
                spacerSize: 'M',
              },
            },
            {
              componentRow: {
                rowMainContent: [
                  {
                    componentText: {
                      text: 'Org Tier',
                      textSize: 'S',
                    },
                  },
                ],
                rowAsideContent: [
                  {
                    componentText: {
                      text: organization?.apiServiceLevel || 'NA',
                    },
                  },
                ],
              },
            },

            {
              componentSpacer: {
                spacerSize: 'M',
              },
            },
            {
              componentRow: {
                rowMainContent: [
                  {
                    componentText: {
                      text: 'Org Created At',
                      textSize: 'S',
                    },
                  },
                ],
                rowAsideContent: [
                  {
                    componentText: {
                      text: organization?.createdAt,
                    },
                  },
                ],
              },
            },
          ],
        },
      };
    });

    return activeOrganizations;
  };

  private sessionsComponent = (sessions) => {
    const allSessions = sessions.map((session) => {
      return {
        componentContainer: {
          containerContent: [
            {
              componentRow: {
                rowMainContent: [
                  {
                    componentText: {
                      text: 'Status',
                      textSize: 'S',
                    },
                  },
                ],
                rowAsideContent: [
                  {
                    componentText: {
                      text: session?.status || 'NA',
                    },
                  },
                ],
              },
            },
            {
              componentRow: {
                rowMainContent: [
                  {
                    componentText: {
                      text: 'City',
                      textSize: 'S',
                    },
                  },
                ],
                rowAsideContent: [
                  {
                    componentText: {
                      text: session?.latestActivity?.city || 'NA',
                    },
                  },
                ],
              },
            },
            {
              componentRow: {
                rowMainContent: [
                  {
                    componentText: {
                      text: 'Country',
                      textSize: 'S',
                    },
                  },
                ],
                rowAsideContent: [
                  {
                    componentText: {
                      text: session?.latestActivity?.country || 'NA',
                    },
                  },
                ],
              },
            },
            {
              componentRow: {
                rowMainContent: [
                  {
                    componentText: {
                      text: 'Device Type',
                      textSize: 'S',
                    },
                  },
                ],
                rowAsideContent: [
                  {
                    componentText: {
                      text: session?.latestActivity?.deviceType || 'NA',
                    },
                  },
                ],
              },
            },
            {
              componentRow: {
                rowMainContent: [
                  {
                    componentText: {
                      text: 'Browser Name',
                      textSize: 'S',
                    },
                  },
                ],
                rowAsideContent: [
                  {
                    componentText: {
                      text: session?.latestActivity?.browserName || 'NA',
                    },
                  },
                ],
              },
            },
            {
              componentRow: {
                rowMainContent: [
                  {
                    componentText: {
                      text: 'Browser Version',
                      textSize: 'S',
                    },
                  },
                ],
                rowAsideContent: [
                  {
                    componentText: {
                      text: session?.latestActivity?.browserVersion || 'NA',
                    },
                  },
                ],
              },
            },
          ],
        },
      };
    });

    return allSessions;
  };
}
