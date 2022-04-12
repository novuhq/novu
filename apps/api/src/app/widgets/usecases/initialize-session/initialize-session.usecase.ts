import { Injectable } from '@nestjs/common';
import { EnvironmentRepository, SubscriberEntity } from '@novu/dal';
import { AuthService } from '../../../auth/services/auth.service';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { CreateSubscriber, CreateSubscriberCommand } from '../../../subscribers/usecases/create-subscriber';
import { InitializeSessionCommand } from './initialize-session.command';

@Injectable()
export class InitializeSession {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private createSubscriber: CreateSubscriber,
    private authService: AuthService
  ) {}

  async execute(command: InitializeSessionCommand): Promise<{
    token: string;
    profile: Partial<SubscriberEntity>;
  }> {
    const environment = await this.environmentRepository.findEnvironmentByIdentifier(command.applicationIdentifier);

    if (!environment) {
      throw new ApiException('Please provide a valid app identifier');
    }

    const commandos = CreateSubscriberCommand.create({
      environmentId: environment._id,
      organizationId: environment._organizationId,
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
