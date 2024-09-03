import { Injectable } from '@nestjs/common';
import { OrganizationEntity, CommunityOrganizationRepository } from '@novu/dal';
import { IMessageButton } from '@novu/shared';
import { ModuleRef } from '@nestjs/core';

import { CompileTemplate, CompileTemplateBase } from '../compile-template';
import { ApiException } from '../../utils/exceptions';
import { CompileInAppTemplateCommand } from './compile-in-app-template.command';

@Injectable()
export class CompileInAppTemplate extends CompileTemplateBase {
  constructor(
    private compileTemplate: CompileTemplate,
    protected communityOrganizationRepository: CommunityOrganizationRepository,
    protected moduleRef: ModuleRef,
  ) {
    super(communityOrganizationRepository, moduleRef);
  }

  public async execute(
    command: CompileInAppTemplateCommand,
    // we need i18nInstance outside the command on order to avoid command serialization on it.
    i18nInstance?: any,
  ) {
    const organization = await this.getOrganization(command.organizationId);
    const payload = command.payload || {};

    let content = '';
    const ctaButtons: IMessageButton[] = [];
    let url;

    try {
      content = command.content
        ? await this.compileInAppTemplate(
            command.content,
            payload,
            organization,
            i18nInstance,
          )
        : '';

      if (command.cta?.data?.url) {
        url = await this.compileInAppTemplate(
          command.cta?.data?.url,
          payload,
          organization,
          i18nInstance,
        );
      }

      if (command.cta?.action?.buttons) {
        for (const action of command.cta.action.buttons) {
          const buttonContent = await this.compileInAppTemplate(
            action.content,
            payload,
            organization,
            i18nInstance,
          );
          ctaButtons.push({ type: action.type, content: buttonContent });
        }
      }
    } catch (e: any) {
      throw new ApiException(
        e?.message || `In-App Message content could not be generated`,
      );
    }

    return { content, ctaButtons, url };
  }

  private async compileInAppTemplate(
    content: string,
    payload: any,
    organization: OrganizationEntity | null,
    i18nInstance: any,
  ): Promise<string> {
    return await this.compileTemplate.execute(
      {
        template: content as string,
        data: {
          ...payload,
          branding: {
            logo: organization?.branding?.logo,
            color: organization?.branding?.color || '#f47373',
          },
        },
      },
      i18nInstance,
    );
  }
}
