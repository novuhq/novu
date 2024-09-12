import { Injectable } from '@nestjs/common';
import { merge } from 'lodash';
import { readFile } from 'fs/promises';
import { ModuleRef } from '@nestjs/core';

import { IEmailBlock, CommunityOrganizationRepository } from '@novu/dal';

import { CompileTemplate, CompileTemplateBase } from '../compile-template';
import { ApiException } from '../../utils/exceptions';
import { CompileEmailTemplateCommand } from './compile-email-template.command';
import { LayoutDto, GetLayoutCommand, GetLayoutUseCase } from '../get-layout';
import { VerifyPayloadService } from '../../services';
import { GetNovuLayout } from '../get-novu-layout';

@Injectable()
export class CompileEmailTemplate extends CompileTemplateBase {
  constructor(
    private compileTemplate: CompileTemplate,
    protected communityOrganizationRepository: CommunityOrganizationRepository,
    private getLayoutUsecase: GetLayoutUseCase,
    private getNovuLayoutUsecase: GetNovuLayout,
    protected moduleRef: ModuleRef,
  ) {
    super(communityOrganizationRepository, moduleRef);
  }

  public async execute(
    command: CompileEmailTemplateCommand,
    // we need i18nInstance outside the command on order to avoid command serialization on it.
    i18nInstance?: any,
  ) {
    const verifyPayloadService = new VerifyPayloadService();
    const organization = await this.getOrganization(command.organizationId);

    const isEditorMode = command.contentType === 'editor';

    let layout: LayoutDto | null = null;
    let layoutContent: string | null = null;

    if (command.layoutId) {
      layout = await this.getLayoutUsecase.execute(
        GetLayoutCommand.create({
          layoutId: command.layoutId,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
        }),
      );

      layoutContent = layout.content;
    } else if (isEditorMode && !command.layoutId) {
      layoutContent = await this.getNovuLayoutUsecase.execute({});
    }

    const layoutVariables = layout?.variables || [];
    const defaultPayload = verifyPayloadService.verifyPayload(
      layoutVariables,
      command.payload,
    );

    let helperBlocksContent: string | null = null;
    if (isEditorMode) {
      helperBlocksContent = await this.loadTemplateContent('basic.handlebars');
    }

    let subject = '';
    let senderName;
    const { content } = command;
    let { preheader } = command;

    // eslint-disable-next-line no-param-reassign
    command.payload = merge({}, defaultPayload, command.payload);

    const payload = {
      ...command.payload,
      preheader,
      blocks: [],
      branding: {
        logo: organization.branding?.logo,
        color: organization.branding?.color || '#f47373',
      },
    };

    try {
      subject = await this.renderContent(
        command.subject,
        payload,
        i18nInstance,
      );

      if (preheader) {
        preheader = await this.renderContent(preheader, payload, i18nInstance);
      }

      if (command.senderName) {
        senderName = await this.renderContent(
          command.senderName,
          payload,
          i18nInstance,
        );
      }
    } catch (e: any) {
      throw new ApiException(
        e?.message || `Email subject message content could not be generated`,
      );
    }

    const customLayout = CompileEmailTemplate.addPreheader(
      layoutContent as string,
    );

    if (isEditorMode) {
      for (const block of content as IEmailBlock[]) {
        block.content = await this.renderContent(
          block.content,
          payload,
          i18nInstance,
        );
        block.url = await this.renderContent(
          block.url || '',
          payload,
          i18nInstance,
        );
      }
    }

    const templateVariables = {
      ...payload,
      subject,
      preheader,
      body: '',
      blocks: isEditorMode ? content : [],
    };

    const body = await this.compileTemplate.execute(
      {
        template: !isEditorMode
          ? (content as string)
          : (helperBlocksContent as string),
        data: templateVariables,
      },
      i18nInstance,
    );

    templateVariables.body = body as string;

    const html = customLayout
      ? await this.compileTemplate.execute(
          {
            template: customLayout,
            data: templateVariables,
          },
          i18nInstance,
        )
      : body;

    return { html, content, subject, senderName };
  }

  private async renderContent(
    content: string,
    payload: Record<string, unknown>,
    i18nInstance: any,
  ) {
    const renderedContent = await this.compileTemplate.execute(
      {
        template: content,
        data: {
          ...payload,
        },
      },
      i18nInstance,
    );

    return renderedContent?.trim() || '';
  }

  public static addPreheader(content: string): string {
    // "&nbsp;&zwnj;&nbsp;&zwnj;" is needed to spacing away the rest of the email from the preheader area in email clients
    return content?.replace(
      // eslint-disable-next-line no-useless-escape
      /<body\b[^\<\>]*?>/,
      `$&{{#if preheader}}
          <div style="display: none; max-height: 0px; overflow: hidden;">
            {{preheader}}
            &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
          </div>
        {{/if}}`,
    );
  }

  private async loadTemplateContent(name: string) {
    const content = await readFile(`${__dirname}/templates/${name}`);

    return content.toString();
  }
}
