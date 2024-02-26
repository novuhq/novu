import { Injectable } from '@nestjs/common';
import { merge } from 'lodash';
import { readFile } from 'fs/promises';
import { ModuleRef } from '@nestjs/core';

import { IEmailBlock, OrganizationRepository } from '@novu/dal';

import {
  CompileTemplate,
  CompileTemplateCommand,
  CompileTemplateBase,
} from '../compile-template';
import { ApiException } from '../../utils/exceptions';
import { CompileEmailTemplateCommand } from './compile-email-template.command';
import { LayoutDto, GetLayoutCommand, GetLayoutUseCase } from '../get-layout';
import { VerifyPayloadService } from '../../services';
import { GetNovuLayout } from '../get-novu-layout';

@Injectable()
export class CompileEmailTemplate extends CompileTemplateBase {
  constructor(
    private compileTemplate: CompileTemplate,
    protected organizationRepository: OrganizationRepository,
    private getLayoutUsecase: GetLayoutUseCase,
    private getNovuLayoutUsecase: GetNovuLayout,
    protected moduleRef: ModuleRef
  ) {
    super(organizationRepository, moduleRef);
  }

  public async execute(
    command: CompileEmailTemplateCommand,
    initiateTranslations?: (
      environmentId: string,
      organizationId,
      locale: string
    ) => Promise<void>
  ) {
    const verifyPayloadService = new VerifyPayloadService();
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

    const isEditorMode = command.contentType === 'editor';

    let layout: LayoutDto | null = null;
    let layoutContent: string | null = null;

    if (command.layoutId) {
      layout = await this.getLayoutUsecase.execute(
        GetLayoutCommand.create({
          layoutId: command.layoutId,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
        })
      );

      layoutContent = layout.content;
    } else if (isEditorMode && !command.layoutId) {
      layoutContent = await this.getNovuLayoutUsecase.execute({});
    }

    const layoutVariables = layout?.variables || [];
    const defaultPayload = verifyPayloadService.verifyPayload(
      layoutVariables,
      command.payload
    );

    let helperBlocksContent: string | null = null;
    if (isEditorMode) {
      helperBlocksContent = await this.loadTemplateContent('basic.handlebars');
    }

    let subject = '';
    let senderName;
    const content: string | IEmailBlock[] = command.content;
    let preheader = command.preheader;

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
      subject = await this.renderContent(command.subject, payload);

      if (preheader) {
        preheader = await this.renderContent(preheader, payload);
      }
      if (command.senderName) {
        senderName = await this.renderContent(command.senderName, payload);
      }
    } catch (e: any) {
      throw new ApiException(
        e?.message || `Message content could not be generated`
      );
    }

    const customLayout = CompileEmailTemplate.addPreheader(
      layoutContent as string
    );

    const templateVariables = {
      ...payload,
      subject,
      preheader,
      body: '',
      blocks: isEditorMode ? content : [],
    };

    if (isEditorMode) {
      for (const block of content as IEmailBlock[]) {
        block.content = await this.renderContent(block.content, payload);
        block.url = await this.renderContent(block.url || '', payload);
      }
    }

    const body = await this.compileTemplate.execute(
      CompileTemplateCommand.create({
        template: !isEditorMode
          ? (content as string)
          : (helperBlocksContent as string),
        data: templateVariables,
      })
    );

    templateVariables.body = body as string;

    const html = customLayout
      ? await this.compileTemplate.execute(
          CompileTemplateCommand.create({
            template: customLayout,
            data: templateVariables,
          })
        )
      : body;

    return { html, content, subject, senderName };
  }

  private async renderContent(
    content: string,
    payload: Record<string, unknown>
  ) {
    const renderedContent = await this.compileTemplate.execute(
      CompileTemplateCommand.create({
        template: content,
        data: {
          ...payload,
        },
      })
    );

    return renderedContent?.trim() || '';
  }

  public static addPreheader(content: string): string {
    // "&nbsp;&zwnj;&nbsp;&zwnj;" is needed to spacing away the rest of the email from the preheader area in email clients
    return content?.replace(
      /<body\b[^\<\>]*?>/,
      `$&{{#if preheader}}
          <div style="display: none; max-height: 0px; overflow: hidden;">
            {{preheader}}
            &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
          </div>
        {{/if}}`
    );
  }

  private async loadTemplateContent(name: string) {
    const content = await readFile(`${__dirname}/templates/${name}`);

    return content.toString();
  }
}
