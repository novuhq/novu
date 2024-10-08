import { Injectable } from '@nestjs/common';
import { workflow } from '@novu/framework';
import { z } from 'zod';
import { UserService } from './user.service';

@Injectable()
export class WorkflowsService {
  constructor(private readonly userService: UserService) {}

  public welcomeWorkflow() {
    const userServiceInstance = this.userService;

    return workflow(
      'welcome-workflow',
      async ({ step, payload }) => {
        await step.email(
          'send-email',
          async (controls) => {
            const user = userServiceInstance.getUser(payload.userId);

            return {
              subject: `${controls.greeting}, ${user.name}`,
              body: `We are glad you are here! Email: ${user.email}`,
            };
          },
          {
            controlSchema: z.object({
              greeting: z.string().default('Welcome to our platform'),
            }),
          },
        );
      },
      {
        payloadSchema: z.object({
          userId: z.string(),
        }),
      },
    );
  }
}
