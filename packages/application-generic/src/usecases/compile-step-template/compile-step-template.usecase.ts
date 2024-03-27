import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { OrganizationRepository } from '@novu/dal';

import { ApiException } from '../../utils/exceptions';
import {
  CompileTemplate,
  CompileTemplateBase,
  CompileTemplateCommand,
} from '../compile-template';
import { CompileStepTemplateCommand } from './compile-step-template.command';

@Injectable()
export class CompileStepTemplate extends CompileTemplateBase {
  constructor(
    private compileTemplate: CompileTemplate,
    protected organizationRepository: OrganizationRepository,
    protected moduleRef: ModuleRef
  ) {
    super(organizationRepository, moduleRef);
  }

  public async execute(
    command: CompileStepTemplateCommand,
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

    let title: string | undefined = undefined;

    try {
      content = await this.compileStepTemplate(command.content, payload);

      if (command.title) {
        title = await this.compileStepTemplate(command.title, payload);
      }
    } catch (e: any) {
      throw new ApiException(
        e?.message || `Message content could not be generated`
      );
    }

    return { content, title };
  }

  private async compileStepTemplate(
    content: string,
    payload: any
  ): Promise<string> {
    return await this.compileTemplate.execute(
      CompileTemplateCommand.create({
        template: content as string,
        data: {
          ...payload,
        },
      })
    );
  }
}
