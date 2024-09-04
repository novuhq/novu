import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { CommunityOrganizationRepository } from '@novu/dal';

import { ApiException } from '../../utils/exceptions';
import { CompileTemplate, CompileTemplateBase } from '../compile-template';
import { CompileStepTemplateCommand } from './compile-step-template.command';

@Injectable()
export class CompileStepTemplate extends CompileTemplateBase {
  constructor(
    private compileTemplate: CompileTemplate,
    protected communityOrganizationRepository: CommunityOrganizationRepository,
    protected moduleRef: ModuleRef,
  ) {
    super(communityOrganizationRepository, moduleRef);
  }

  public async execute(
    command: CompileStepTemplateCommand,
    // we need i18nInstance outside the command on order to avoid command serialization on it.
    i18nInstance?: any,
  ) {
    const payload = command.payload || {};

    let content = '';

    let title: string | undefined;

    try {
      content = await this.compileStepTemplate(
        command.content,
        payload,
        i18nInstance,
      );

      if (command.title) {
        title = await this.compileStepTemplate(
          command.title,
          payload,
          i18nInstance,
        );
      }
    } catch (e: any) {
      throw new ApiException(
        e?.message || `Compile step content failed to generate`,
      );
    }

    return { content, title };
  }

  private async compileStepTemplate(
    content: string,
    payload: any,
    i18nInstance?: any,
  ): Promise<string> {
    return await this.compileTemplate.execute(
      {
        template: content as string,
        data: {
          ...payload,
        },
      },
      i18nInstance,
    );
  }
}
