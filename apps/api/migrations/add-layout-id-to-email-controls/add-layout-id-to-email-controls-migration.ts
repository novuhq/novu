import '../../src/config';

import { NestFactory } from '@nestjs/core';
import { PinoLogger } from '@novu/application-generic';
import { MessageTemplateRepository, OrganizationRepository } from '@novu/dal';
import { StepTypeEnum, UiComponentEnum } from '@novu/shared';

import { AppModule } from '../../src/app.module';

export async function run() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  const logger = await app.resolve(PinoLogger);
  logger.setContext('AddLayoutIdToEmailControlsMigration');

  logger.info('start migration - add layoutId to email controls schema');

  const organizationRepository = app.get(OrganizationRepository);
  const messageTemplateRepository = app.get(MessageTemplateRepository);

  const organizations = await organizationRepository.find({});

  logger.info(`Found ${organizations.length} organizations`);

  for (const organization of organizations) {
    // Find all email message templates that have controls but don't have layoutId in the schema
    const emailTemplates = await messageTemplateRepository.find({
      _organizationId: organization._id,
      type: StepTypeEnum.EMAIL,
      'controls.schema': { $exists: true },
      'controls.uiSchema': { $exists: true },
      'controls.schema.properties.layoutId': { $exists: false },
      'controls.uiSchema.properties.layoutId': { $exists: false },
      deleted: false,
    });

    logger.info(
      `Found ${emailTemplates.length} email message templates to migrate for organization ${organization.name}`
    );

    for (const template of emailTemplates) {
      logger.info(`Migrating template ${template._id}`);

      try {
        // Add layoutId to the schema properties
        const updatePayload = {
          $set: {
            'controls.schema.properties.layoutId': {
              type: ['string', 'null'],
            },
            'controls.uiSchema.properties.layoutId': {
              component: UiComponentEnum.LAYOUT_SELECT,
            },
          },
        };

        await messageTemplateRepository.update(
          {
            _id: template._id,
            _organizationId: organization._id,
          },
          updatePayload
        );

        logger.info(`Template ${template._id} - layoutId field added to controls schema`);
      } catch (error) {
        logger.error(`Failed to migrate template ${template._id}`, error);
      }
    }
  }

  logger.info('end migration');
  await app.close();
}

run()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
