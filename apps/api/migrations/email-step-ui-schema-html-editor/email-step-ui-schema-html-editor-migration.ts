import '../../src/config';
import { NestFactory } from '@nestjs/core';
import { PinoLogger } from '@novu/application-generic';
import { MessageTemplateRepository, OrganizationRepository } from '@novu/dal';
import { UiComponentEnum } from '@novu/shared';
import { AppModule } from '../../src/app.module';

export async function run() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });
  const logger = await app.resolve(PinoLogger);
  logger.setContext('EmailStepUiSchemaHtmlEditorMigration');

  logger.info('Start migration - update email step ui schema to html editor');

  const organizationRepository = app.get(OrganizationRepository);
  const messageTemplateRepository = app.get(MessageTemplateRepository);

  const organizations = await organizationRepository.find({});

  for (const organization of organizations) {
    const messageTemplates = await messageTemplateRepository.find({
      _organizationId: organization._id,
      type: 'email',
      'controls.uiSchema': { $exists: true },
    });

    logger.info(`Found ${messageTemplates.length} notification templates, for organization ${organization.name}`);

    for (const notificationTemplate of messageTemplates) {
      logger.info(`Update notification template ${notificationTemplate._id}`);
      await messageTemplateRepository.update(
        { _id: notificationTemplate._id, _organizationId: organization._id },
        {
          $set: {
            'controls.uiSchema.properties.body': {
              component: UiComponentEnum.EMAIL_BODY,
            },
            'controls.uiSchema.properties.editorType': {
              component: UiComponentEnum.EMAIL_EDITOR_SELECT,
              placeholder: 'block',
            },
          },
        }
      );
      logger.info(`Updated notification template ${notificationTemplate._id}`);
    }
  }

  logger.info('End migration.\n');
  await app.close();
}

run();
