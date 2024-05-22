import { Injectable } from '@nestjs/common';
import { OrganizationEntity, OrganizationRepository } from '@novu/dal';
import { IMessageButton } from '@novu/shared';
import { ModuleRef } from '@nestjs/core';

import {
  CompileTemplate,
  CompileTemplateCommand,
  CompileTemplateBase,
} from '../compile-template';
import { ApiException } from '../../utils/exceptions';
import { CompileInAppTemplateCommand } from './compile-in-app-template.command';

@Injectable()
export class CompileInAppTemplate extends CompileTemplateBase {
  constructor(
    private compileTemplate: CompileTemplate,
    protected organizationRepository: OrganizationRepository,
    protected moduleRef: ModuleRef
  ) {
    super(organizationRepository, moduleRef);
  }

  public async execute(
    command: CompileInAppTemplateCommand,
    initiateTranslations?: (
      environmentId: string,
      organizationId,
      locale: string
    ) => Promise<void>
  ) {
    const organization = await this.getOrganization(command.organizationId);

    if (initiateTranslations) {
      await initiateTranslations(
        command.environmentId,
        command.organizationId,
        command.locale ||
          command.payload.subscriber?.locale ||
          organization.defaultLocale
      );
    }

    const payload = command.payload || {};

    let content = '';
    const ctaButtons: IMessageButton[] = [];
    let url;

    try {
      content = command.content
        ? await this.compileInAppTemplate(
            command.content,
            payload,
            organization
          )
        : '';

      if (command.cta?.data?.url) {
        url = await this.compileInAppTemplate(
          command.cta?.data?.url,
          payload,
          organization
        );
      }

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

    return { content, ctaButtons, url };
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
