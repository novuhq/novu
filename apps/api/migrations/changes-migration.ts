/* eslint-disable no-console */
import '../src/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import {
  NotificationTemplateRepository,
  MessageTemplateRepository,
  NotificationGroupRepository,
  EnvironmentRepository,
  ChangeRepository,
  MemberRepository,
  OrganizationRepository,
} from '@novu/dal';
import { ChangeEntityTypeEnum, MemberRoleEnum } from '@novu/shared';
import { CreateEnvironment } from '../src/app/environments/usecases/create-environment/create-environment.usecase';
import { CreateEnvironmentCommand } from '../src/app/environments/usecases/create-environment/create-environment.command';
import { ApplyChange } from '../src/app/change/usecases/apply-change/apply-change.usecase';
import { ApplyChangeCommand } from '../src/app/change/usecases/apply-change/apply-change.command';
import { CreateChange, CreateChangeCommand } from '@novu/application-generic';

export async function run(): Promise<void> {
  console.log('Script started');
  console.log('');
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });
  console.log('');
  console.log('App created');

  const memberRepository = app.get(MemberRepository);
  const organizationRepository = app.get(OrganizationRepository);
  const notificationTemplateRepository = app.get(NotificationTemplateRepository);
  const messageTemplateRepository = app.get(MessageTemplateRepository);
  const notificationGroupRepository = app.get(NotificationGroupRepository);
  const environmentRepository = app.get(EnvironmentRepository);
  const createChangeUseCase = app.get(CreateChange);
  const createEnvironment = app.get(CreateEnvironment);
  const applyChange = app.get(ApplyChange);
  console.log('Repositories and usecases created');

  const orgs = await organizationRepository.find({});
  console.log(`${orgs.length} Orgs found`);
  for (const org of orgs) {
    console.log(`Migrating org ${org._id}`);
    const member = await memberRepository.findOne({
      roles: MemberRoleEnum.ADMIN,
      _organizationId: org._id,
    });

    console.log(`Using user ${member._id} to migrate org ${org._id}`);
    console.log('');
    const environments = await environmentRepository.findOrganizationEnvironments(org._id);
    console.log(`Found ${environments.length} environments`);

    if (environments.length === 2) {
      console.log(`Connects Production environment to Development environment`);
      const prod = environments.reduce((prev, current) => {
        return current.name === 'Production' ? current : prev;
      }, environments[1]);
      const dev = environments.reduce((prev, current) => {
        return current.name !== prod.name ? current : prev;
      }, environments[0]);

      await environmentRepository.update(
        {
          _id: prod._id,
        },
        {
          $set: {
            _parentId: dev._id,
          },
        }
      );
    }

    if (environments.length === 1) {
      console.log(`Creating Production environment`);
      const environment = environments[0];
      await createEnvironment.execute(
        CreateEnvironmentCommand.create({
          name: 'Production',
          organizationId: org._id,
          userId: member._id,
          parentEnvironmentId: environment._id,
        })
      );
      console.log(`Production environment created`);
    }

    console.log('');
    const groups = await notificationGroupRepository.find({
      _organizationId: org._id,
      _parentId: { $exists: false, $eq: null },
    });
    let change;
    console.log(`Found ${groups.length} notification groups`);
    for (const group of groups) {
      const found = await notificationGroupRepository.findOne({
        _parentId: group._id,
        _environmentId: group._environmentId,
      });
      if (!found) {
        console.log(`Migrating group ${group._id}`);
        change = await createChangeUseCase.execute(
          CreateChangeCommand.create({
            item: group,
            type: ChangeEntityTypeEnum.NOTIFICATION_GROUP,
            changeId: ChangeRepository.createObjectId(),
            environmentId: group._environmentId,
            organizationId: group._organizationId,
            userId: member._userId,
          })
        );
        console.log(`Change for group ${group._id} created`);
        await applyChange.execute(
          ApplyChangeCommand.create({
            changeId: change._id,
            environmentId: group._environmentId,
            organizationId: group._organizationId,
            userId: member._userId,
          })
        );
        console.log(`Change for group ${group._id} applied`);
      } else {
        console.log(`Migration for group ${group._id} was already done`);
      }
      console.log('');
    }

    const messageTemplates = await messageTemplateRepository.find({
      _organizationId: org._id,
      _parentId: { $exists: false, $eq: null },
    });
    console.log(`Found ${messageTemplates.length} message templates`);
    for (const messageTemplate of messageTemplates) {
      const found = await messageTemplateRepository.findOne({
        _parentId: messageTemplate._id,
        _environmentId: messageTemplate._environmentId,
      });
      if (!found) {
        console.log(`Migrating message template ${messageTemplate._id}`);
        change = await createChangeUseCase.execute(
          CreateChangeCommand.create({
            item: messageTemplate,
            type: ChangeEntityTypeEnum.MESSAGE_TEMPLATE,
            changeId: ChangeRepository.createObjectId(),
            environmentId: messageTemplate._environmentId,
            organizationId: messageTemplate._organizationId,
            userId: member._userId,
          })
        );
        console.log(`Change for message template ${messageTemplate._id} created`);
        await applyChange.execute(
          ApplyChangeCommand.create({
            changeId: change._id,
            environmentId: messageTemplate._environmentId,
            organizationId: messageTemplate._organizationId,
            userId: member._userId,
          })
        );
        console.log(`Change for message template ${messageTemplate._id} applied`);
      } else {
        console.log(`Migration for message template ${messageTemplate._id} was already done`);
      }
      console.log('');
    }

    const notificationTemplates = await notificationTemplateRepository.find({
      _organizationId: org._id,
      _parentId: { $exists: false, $eq: null },
    });
    console.log(`Found ${notificationTemplates.length} notification templates`);
    for (const notificationTemplate of notificationTemplates) {
      const found = await notificationTemplateRepository.findOne({
        _parentId: notificationTemplate._id,
        _environmentId: notificationTemplate._environmentId,
      });
      if (!found) {
        console.log(`Migrating notification template ${notificationTemplate._id}`);
        change = await createChangeUseCase.execute(
          CreateChangeCommand.create({
            item: notificationTemplate,
            type: ChangeEntityTypeEnum.NOTIFICATION_TEMPLATE,
            changeId: ChangeRepository.createObjectId(),
            environmentId: notificationTemplate._environmentId,
            organizationId: notificationTemplate._organizationId,
            userId: member._userId,
          })
        );
        console.log(`Change for notification template ${notificationTemplate._id} created`);
        await applyChange.execute(
          ApplyChangeCommand.create({
            changeId: change._id,
            environmentId: notificationTemplate._environmentId,
            organizationId: notificationTemplate._organizationId,
            userId: member._userId,
          })
        );
        console.log(`Change for notification template ${notificationTemplate._id} applied`);
      } else {
        console.log(`Migration for notification template ${notificationTemplate._id} was already done`);
      }
      console.log('');
    }
    console.log('');
  }

  await app.close();
  console.log('Migration done...');
}

run();
