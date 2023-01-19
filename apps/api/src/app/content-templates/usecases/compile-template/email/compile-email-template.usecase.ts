import { Injectable, NotFoundException } from '@nestjs/common';
import { IEmailBlock, OrganizationRepository, OrganizationEntity } from '@novu/dal';
import { CompileTemplate } from '../compile-template.usecase';
import { CompileTemplateCommand } from '../compile-template.command';
import { ApiException } from '../../../../shared/exceptions/api.exception';
import * as fs from 'fs';
import { CompileEmailTemplateCommand } from './compile-email-template.command';
import { GetLayoutCommand, GetLayoutUseCase } from '../../../../layouts/use-cases';
import { LayoutId } from '@novu/shared';

const helperContent = fs.readFileSync(
  `${__dirname}${
    !process.env.E2E_RUNNER ? '/src/app/content-templates/usecases/compile-template' : '/../../compile-template'
  }/templates/basic.handlebars`,
  'utf8'
);

const defaultLayout = fs.readFileSync(
  `${__dirname}${
    !process.env.E2E_RUNNER ? '/src/app/content-templates/usecases/compile-template' : '/../../compile-template'
  }/templates/layout.handlebars`,
  'utf8'
);

@Injectable()
export class CompileEmailTemplateUsecase {
  constructor(
    private compileTemplate: CompileTemplate,
    private organizationRepository: OrganizationRepository,
    private getLayoutUsecase: GetLayoutUseCase
  ) {}

  public async execute(command: CompileEmailTemplateCommand) {
    const organization: OrganizationEntity | null = await this.organizationRepository.findById(command.organizationId);
    if (!organization) throw new NotFoundException(`Organization ${command.organizationId} not found`);
    let useNovuDefault = !command.layoutId;
    let layout;

    if (!useNovuDefault) {
      try {
        layout = await this.getLayoutUsecase.execute(
          GetLayoutCommand.create({
            layoutId: command.layoutId as LayoutId,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
          })
        );
      } catch (e) {
        useNovuDefault = true;
      }
    }

    const isEditorMode = command.contentType === 'editor';
    let subject = '';
    let content: string | IEmailBlock[] = command.content;
    let preheader = command.preheader;
    const layoutContent = useNovuDefault ? defaultLayout : layout.content;

    const payload = {
      ...command.payload,
      subject: command.subject,
      preheader,
      blocks: [],
      branding: {
        logo: organization.branding?.logo,
        color: organization.branding?.color || '#f47373',
      },
    };

    try {
      subject = await this.renderContent(command.subject, payload);
      if (isEditorMode) {
        content = await this.getContent(content as IEmailBlock[], payload);
      }
      if (preheader) {
        preheader = await this.renderContent(preheader, payload);
      }
    } catch (e) {
      throw new ApiException(e?.message || `Message content could not be generated`);
    }

    const customTemplate = CompileEmailTemplateUsecase.addPreheader(layoutContent as string);

    const templateVariables = {
      ...payload,
      subject,
      preheader,
      body: '',
      blocks: isEditorMode ? content : [],
    };

    const body = await this.compileTemplate.execute(
      CompileTemplateCommand.create({
        templateId: 'custom',
        customTemplate: !isEditorMode ? (content as string) : helperContent,
        data: templateVariables,
      })
    );

    templateVariables.body = body as string;

    const html = await this.compileTemplate.execute(
      CompileTemplateCommand.create({
        templateId: 'custom',
        customTemplate,
        data: templateVariables,
      })
    );

    return { html, content, subject };
  }

  private async renderContent(content: string, payload: Record<string, unknown>) {
    const renderedContent = await this.compileTemplate.execute(
      CompileTemplateCommand.create({
        templateId: 'custom',
        customTemplate: content,
        data: {
          ...payload,
        },
      })
    );

    return renderedContent?.trim() || '';
  }

  private async getContent(content: IEmailBlock[], payload: Record<string, unknown> = {}): Promise<IEmailBlock[]> {
    content = [...content];
    for (const block of content) {
      block.content = await this.renderContent(block.content, payload);
      block.url = await this.renderContent(block.url || '', payload);
    }

    return content;
  }

  public static addPreheader(content: string): string {
    // "&nbsp;&zwnj;&nbsp;&zwnj;" is needed to spacing away the rest of the email from the preheader area in email clients
    return content.replace(
      /<body[^>]*>/g,
      `$&{{#if preheader}}
          <div style="display: none; max-height: 0px; overflow: hidden;">
            {{preheader}}
            &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
          </div>
        {{/if}}`
    );
  }
}
