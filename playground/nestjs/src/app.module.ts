import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NovuModule } from '@novu/framework/nest';
import { Client } from '@novu/framework';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WorkflowsService } from './workflows.service';
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
      useFactory: (workflowsService: WorkflowsService) => ({
        apiPath: '/api/novu',
        workflows: [workflowsService.welcomeWorkflow()],
      }),
      inject: [WorkflowsService],
    }),
  ],
  controllers: [AppController],
  providers: [AppService, WorkflowsService, UserService],
  exports: [WorkflowsService],
})
export class AppModule {}
