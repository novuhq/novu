import { Injectable } from '@nestjs/common';
import { IEmailBlock, OrganizationRepository, OrganizationEntity, IntegrationEntity } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import * as Sentry from '@sentry/node';
import { IEmailOptions } from '@novu/stateless';
import { CompileTemplate } from '../../../content-templates/usecases/compile-template/compile-template.usecase';
import { CompileTemplateCommand } from '../../../content-templates/usecases/compile-template/compile-template.command';
import { MailFactory } from '../../services/mail-service/mail.factory';
import {
  GetDecryptedIntegrations,
  GetDecryptedIntegrationsCommand,
} from '../../../integrations/usecases/get-decrypted-integrations';
import { EnvironmentWithUserCommand } from '@novu/application-generic';

class Command extends EnvironmentWithUserCommand {
  contentType: 'customHtml' | 'editor';
  payload: any;
  subject: string;
  content: string | IEmailBlock[];
  to: string | string[];
}

@Injectable()
export class SendMessageEmail {
  private mailFactory = new MailFactory();

  constructor(
    private compileTemplate: CompileTemplate,
    private organizationRepository: OrganizationRepository,
    private getDecryptedIntegrationsUsecase: GetDecryptedIntegrations
  ) {}

  public async execute(command: Command) {
    const organization: OrganizationEntity = await this.organizationRepository.findById(command.organizationId);
    const email = command.to;

    Sentry.addBreadcrumb({
      message: 'Sending Email',
    });
    const isEditorMode = command.contentType === 'editor';

    const integration = (
      await this.getDecryptedIntegrationsUsecase.execute(
        GetDecryptedIntegrationsCommand.create({
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          channelType: ChannelTypeEnum.EMAIL,
          findOne: true,
          active: true,
        })
      )
    )[0];

    if (!integration) {
      // do something...
    }

    let subject = '';
    let content: string | IEmailBlock[] = '';

    try {
      subject = await this.renderContent(command.subject, command.subject, organization, command);

      content = await this.getContent(isEditorMode, command, subject, organization);
    } catch (e) {
      // do something...

      return;
    }

    const html = await this.compileTemplate.execute(
      CompileTemplateCommand.create({
        templateId: isEditorMode ? 'basic' : 'custom',
        customTemplate: command.contentType === 'customHtml' ? (content as string) : undefined,
        data: {
          subject,
          branding: {
            logo: organization.branding?.logo,
            color: organization.branding?.color || '#f47373',
          },
          blocks: isEditorMode ? content : [],
          step: {
            digest: true,
            events: [],
            total_count: 1,
          },
          subscriber: '?',
          ...command.payload,
        },
      })
    );

    const mailData: IEmailOptions = {
      to: email,
      subject,
      html,
      from: command.payload.$sender_email || integration?.credentials.from || 'no-reply@novu.co',
    };

    if (email && integration) {
      await this.sendMessage(integration, mailData);

      return;
    }
  }

  private async sendMessage(integration: IntegrationEntity, mailData: IEmailOptions) {
    const mailHandler = this.mailFactory.getHandler(integration, mailData.from);

    try {
      await mailHandler.send(mailData);
    } catch (error) {
      // do something...
      return;
    }
  }

  private async getContent(
    isEditorMode,
    command: Command,
    subject,
    organization: OrganizationEntity
  ): Promise<string | IEmailBlock[]> {
    if (isEditorMode) {
      const content: IEmailBlock[] = [...command.content] as IEmailBlock[];
      for (const block of content) {
        /*
         * We need to trim the content in order to avoid mail provider like GMail
         * to display the mail with `[Message clipped]` footer.
         */
        block.content = await this.renderContent(block.content, subject, organization, command);
        block.content = block.content.trim();
        block.url = await this.renderContent(block.url || '', subject, organization, command);
      }

      return content;
    }

    return command.content;
  }

  private async renderContent(content: string, subject, organization: OrganizationEntity, command: Command) {
    return await this.compileTemplate.execute(
      CompileTemplateCommand.create({
        templateId: 'custom',
        customTemplate: content as string,
        data: {
          subject,
          branding: {
            logo: organization.branding?.logo,
            color: organization.branding?.color || '#f47373',
          },
          blocks: [],
          step: {
            digest: true,
            events: [],
            total_count: 1,
          },
          subscriber: '?',
          ...command.payload,
        },
      })
    );
  }
}
