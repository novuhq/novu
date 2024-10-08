import { Controller, Get, Param } from '@nestjs/common';
import { AppService } from './app.service';
import { NotificationService } from './notification.service';
import { UserService } from './user.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly notificationService: NotificationService,
    private readonly userService: UserService
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/welcome/:userId')
  public async sendWelcomeNotification(@Param('userId') userId: string) {
    const user = this.userService.getUser(userId);

    return this.notificationService.welcomeWorkflow().trigger({
      payload: { userId },
      to: {
        subscriberId: userId,
        email: user.email,
      },
    });
  }
}
