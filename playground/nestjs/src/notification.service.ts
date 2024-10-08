import { Injectable } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';

@Injectable()
export class NotificationService {
  constructor(private readonly workflowsService: WorkflowsService) {}

  public async sendWelcomeNotification(userId: string) {
    return this.workflowsService.welcomeWorkflow().trigger({
      payload: { userId },
      to: userId,
    });
  }
}
