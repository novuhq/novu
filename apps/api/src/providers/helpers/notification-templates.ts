import { UserSession } from '@novu/testing';
import {
  ChannelTypeEnum,
  EmailBlockTypeEnum,
  INotificationTemplate,
  INotificationTemplateStep,
  StepTypeEnum,
} from '@novu/shared';
import { expect } from 'chai';
import { isSameDay } from 'date-fns';

import { CreateNotificationTemplateRequestDto } from '../../app/notification-template/dto';
import { MessageTemplate } from '../../app/shared/dtos/message-template';

export const createRegressionNotificationTemplate = async (session: UserSession, providerId: string): Promise<void> => {
  const name = `Regression email notification template for ${providerId}`;
  const description = 'This is a description for the regression email notification template';
  const tags = ['regression-tag'];

  const regressionTemplate: MessageTemplate = {
    name: 'Message Name',
    subject: `Regression subject for ${providerId}`,
    preheader: 'Regression preheader',
    senderName: 'Regression Regressing',
    content: [{ type: EmailBlockTypeEnum.TEXT, content: 'This is a regression email content block' }],
    type: StepTypeEnum.EMAIL,
  };

  const regressionSteps = [
    {
      template: regressionTemplate,
    },
  ];

  const regressionTemplateRequest: CreateNotificationTemplateRequestDto = {
    active: true,
    draft: false,
    name,
    description,
    tags,
    notificationGroupId: session.notificationGroups[0]._id,
    steps: regressionSteps,
  };

  const response = await session.testAgent.post(`/v1/notification-templates`).send(regressionTemplateRequest);

  expect(response.status).to.eql(201);
  expect(response.body.data).to.be.ok;

  const template: INotificationTemplate = response.body.data;

  expect(template._id).to.be.ok;
  expect(template.description).to.equal(description);
  expect(template.name).to.equal(name);
  expect(template.draft).to.equal(false);
  expect(template.active).to.equal(true);
  expect(template.tags).to.deep.members(tags);
  expect(isSameDay(new Date(template?.createdAt as string), new Date()));

  expect(template.steps.length).to.equal(1);
  expect(template.steps[0].template?.type).to.equal(ChannelTypeEnum.EMAIL);
  expect(template.steps[0].template?.content).to.deep.equal(regressionSteps[0].template.content);
};
