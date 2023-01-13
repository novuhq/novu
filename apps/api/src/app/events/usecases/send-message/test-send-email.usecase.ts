import { Injectable, NotFoundException } from '@nestjs/common';
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
import { TestSendMessageCommand } from './send-message.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { SendMessageEmail } from './send-message-email.usecase';

@Injectable()
export class SendTestEmail {
  constructor(
    private compileTemplate: CompileTemplate,
    private organizationRepository: OrganizationRepository,
    private getDecryptedIntegrationsUsecase: GetDecryptedIntegrations
  ) {}

  public async execute(command: TestSendMessageCommand) {
    const mailFactory = new MailFactory();
    const organization = await this.organizationRepository.findById(command.organizationId);
    if (!organization) throw new NotFoundException('Organization not found');

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
      throw new ApiException(`Missing an active email integration`);
    }

    let subject = '';
    let content: string | IEmailBlock[] = '';

    try {
      subject = (await this.renderContent(
        command.subject,
        command.subject,
        organization,
        command,
        command.preheader
      )) as string;
      content = await this.getContent(isEditorMode, command, subject, organization);
    } catch (e) {
      throw new ApiException(e?.message || `Message content could not be generated`);
    }

    const customTemplate = SendMessageEmail.addPreheader(content as string, command.contentType);

    const html = await this.compileTemplate.execute(
      CompileTemplateCommand.create({
        templateId: isEditorMode ? 'basic' : 'custom',
        customTemplate: customTemplate,
        data: {
          subject,
          preheader: command.preheader,
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
          ...command.payload,
        },
      })
    );

    const mailData: IEmailOptions = {
      to: email,
      subject,
      html: html as string,
      from: command.payload.$sender_email || integration?.credentials.from || 'no-reply@novu.co',
    };

    if (email && integration) {
      await this.sendMessage(integration, mailData, mailFactory);

      return;
    }
  }

  private async sendMessage(integration: IntegrationEntity, mailData: IEmailOptions, mailFactory: MailFactory) {
    const mailHandler = mailFactory.getHandler(integration, mailData.from);

    try {
      await mailHandler.send(mailData);
    } catch (error) {
      throw new ApiException(`Unexpected provider error`);
    }
  }

  private async getContent(
    isEditorMode,
    command: TestSendMessageCommand,
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
        block.content = (await this.renderContent(
          block.content,
          subject,
          organization,
          command,
          command.preheader
        )) as string;
        block.content = block.content.trim();
        block.url = (await this.renderContent(
          block.url || '',
          subject,
          organization,
          command,
          command.preheader
        )) as string;
      }

      return content;
    }

    return command.content;
  }

  private async renderContent(
    content: string,
    subject,
    organization: OrganizationEntity,
    command: TestSendMessageCommand,
    preheader?: string
  ) {
    return await this.compileTemplate.execute(
      CompileTemplateCommand.create({
        templateId: 'custom',
        customTemplate: content as string,
        data: {
          subject,
          preheader,
          branding: {
            logo: organization.branding?.logo,
            color: organization.branding?.color || '#f47373',
          },
          blocks: [],
          step: {
            digest: true,
            events: [],
            total_count: 1,
            ...this.getSystemVariables('step', command),
          },
          subscriber: this.getSystemVariables('subscriber', command),
          ...command.payload,
        },
      })
    );
  }

  private getSystemVariables(variableType: 'subscriber' | 'step' | 'branding', command: TestSendMessageCommand) {
    const variables = {};
    for (const variable in command.payload) {
      const [type, names] = variable.includes('.') ? variable.split('.') : variable;
      if (type === variableType) {
        variables[names] = command.payload[variable];
      }
    }

    return variables;
  }
}
