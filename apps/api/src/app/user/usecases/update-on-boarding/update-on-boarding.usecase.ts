import { Injectable } from '@nestjs/common';
import { UserRepository } from '@novu/dal';
import { UpdateOnBoardingCommand } from './update-on-boarding.command';

@Injectable()
export class UpdateOnBoardingUsecase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(command: UpdateOnBoardingCommand) {
    await this.userRepository.update(
      {
        _id: command.userId,
      },
      {
        $set: {
          showOnBoarding: command.showOnBoarding,
        },
      }
    );

    return await this.userRepository.findById(command.userId);
  }
}
