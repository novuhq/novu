import { Injectable } from '@nestjs/common';
import { ApplicationRepository, SubscriberEntity } from '@notifire/dal';
import { AuthService } from '../../../auth/services/auth.service';
import { CreateSubscriber, CreateSubscriberCommand } from '../../../subscribers/usecases/create-subscriber';
import { InitializeSessionCommand } from './initialize-session.command';

@Injectable()
export class InitializeSession {
  constructor(
    private applicationRepository: ApplicationRepository,
    private createSubscriber: CreateSubscriber,
    private authService: AuthService
  ) {}

  async execute(
    command: InitializeSessionCommand
  ): Promise<{
    token: string;
    profile: Partial<SubscriberEntity>;
  }> {
    const application = await this.applicationRepository.findApplicationByIdentifier(command.applicationIdentifier);

    const commandos = CreateSubscriberCommand.create({
      applicationId: application._id,
      organizationId: application._organizationId,
      subscriberId: command.subscriberId,
      firstName: command.firstName,
      lastName: command.lastName,
      email: command.email,
      phone: command.phone,
    });

    const subscriber = await this.createSubscriber.execute(commandos);

    return {
      token: await this.authService.getSubscriberWidgetToken(subscriber),
      profile: {
        _id: subscriber._id,
        firstName: subscriber.firstName,
        lastName: subscriber.lastName,
        phone: subscriber.phone,
      },
    };
  }
}
