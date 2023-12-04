import { Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationEntity, OrganizationRepository } from '@novu/dal';

import { CompileTemplate } from '../compile-template/compile-template.usecase';
import { CompileTemplateCommand } from '../compile-template/compile-template.command';
import { ApiException } from '../../utils/exceptions';
import { CompileInAppTemplateCommand } from './compile-in-app-template.command';
import { IMessageButton } from '@novu/shared';

@Injectable()
export class CompileInAppTemplate {
  constructor(
    private compileTemplate: CompileTemplate,
    private organizationRepository: OrganizationRepository
  ) {}

  public async execute(command: CompileInAppTemplateCommand) {
    const organization = await this.organizationRepository.findById(
      command.organizationId,
      'branding'
    );

    if (!organization) {
      throw new NotFoundException(
        `Organization ${command.organizationId} not found`
      );
    }

    const payload = command.payload || {};

    let content = '';
    const ctaButtons: IMessageButton[] = [];

    try {
      content = await this.compileInAppTemplate(
        command.content,
        payload,
        organization
      );

      if (command.cta?.action?.buttons) {
        for (const action of command.cta.action.buttons) {
          const buttonContent = await this.compileInAppTemplate(
            action.content,
            payload,
            organization
          );
          ctaButtons.push({ type: action.type, content: buttonContent });
        }
      }
    } catch (e: any) {
      throw new ApiException(
        e?.message || `Message content could not be generated`
      );
    }

    return { content, ctaButtons };
  }

  private async compileInAppTemplate(
    content: string,
    payload: any,
    organization: OrganizationEntity | null
  ): Promise<string> {
    return await this.compileTemplate.execute(
      CompileTemplateCommand.create({
        template: content as string,
        data: {
          ...payload,
          branding: {
            logo: organization?.branding?.logo,
            color: organization?.branding?.color || '#f47373',
          },
        },
      })
    );
  }
}
