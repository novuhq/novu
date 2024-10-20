import { Body, Controller, Post } from '@nestjs/common';
import { UserRepository, OrganizationRepository } from '@novu/dal';

@Controller('/support')
export class SupportController {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly organizationRepository: OrganizationRepository
  ) {}

  @Post('plain/cards')
  async getPlainCards(@Body() body: any) {
    const userId = body.customer?.externalId;
    const { email } = body.customer || {};

    console.log('userId', userId);
    console.log('email', email);
    console.log('body', body);
    const userRepo = this.userRepository;

    return {
      data: {},

      cards: [
        {
          key: 'plain-customer-details',
          components: [
            {
              componentSpacer: {
                spacerSize: 'S',
              },
            },
            {
              componentRow: {
                rowMainContent: [
                  {
                    componentText: {
                      text: 'Registered at',
                      textColor: 'MUTED',
                    },
                  },
                ],
                rowAsideContent: [
                  {
                    componentText: {
                      text: '7/18/2024, 1:00 PM',
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
                      text: 'Last signed in',
                      textColor: 'MUTED',
                    },
                  },
                ],
                rowAsideContent: [
                  {
                    componentText: {
                      text: '10/20/2024, 12:57 PM',
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
                      text: 'Last device used',
                      textColor: 'MUTED',
                    },
                  },
                ],
                rowAsideContent: [
                  {
                    componentText: {
                      text: 'iPhone 13 🍎',
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
                      text: 'Marketing preferences',
                      textColor: 'MUTED',
                    },
                  },
                ],
                rowAsideContent: [
                  {
                    componentText: {
                      text: 'Opted out 🙅',
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
  }
}
