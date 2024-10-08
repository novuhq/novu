import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NovuModule } from '@novu/framework/nest';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NotificationService } from './notification.service';
import { UserService } from './user.service';

@Module({
  imports: [
    /*
     * IMPORTANT: ConfigModule must be imported before NovuModule to ensure
     * environment variables are loaded before the NovuModule is initialized.
     *
     * This ensures that NOVU_SECRET_KEY is available when the NovuModule is initialized.
     */
    ConfigModule.forRoot({
      envFilePath: '.env',
    }),
    NovuModule.registerAsync({
      imports: [AppModule],
      useFactory: (notificationService: NotificationService) => ({
        apiPath: '/api/novu',
        workflows: [notificationService.welcomeWorkflow()],
      }),
      inject: [NotificationService],
    }),
  ],
  controllers: [AppController],
  providers: [AppService, NotificationService, UserService],
  exports: [NotificationService],
})
export class AppModule {}
