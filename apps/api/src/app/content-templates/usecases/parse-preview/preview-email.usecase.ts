import { Injectable, NotFoundException } from '@nestjs/common';
import { IEmailBlock, OrganizationRepository, OrganizationEntity } from '@novu/dal';
import { CompileTemplate } from '../compile-template/compile-template.usecase';
import { CompileTemplateCommand } from '../compile-template/compile-template.command';
import { PreviewEmailCommand } from './preview-email.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import * as fs from 'fs';

const helperContent = fs.readFileSync(
  `${__dirname}${
    !process.env.E2E_RUNNER ? '/src/app/content-templates/usecases/compile-template' : '../compile-template'
  }/templates/basic.handlebars`,
  'utf8'
);

const defaultLayout = fs.readFileSync(
  `${__dirname}${
    !process.env.E2E_RUNNER ? '/src/app/content-templates/usecases/compile-template' : '../compile-template'
  }/templates/layout.handlebars`,
  'utf8'
);

@Injectable()
export class PreviewEmail {
  constructor(private compileTemplate: CompileTemplate, private organizationRepository: OrganizationRepository) {}

  public async execute(command: PreviewEmailCommand) {
    let payload = {};
    try {
      payload = JSON.parse(command.payload);
    } catch (e) {
      console.log('JSON parse failed');
    }
    const layoutContent = '<div style="background-color: #0fa80f">layout {{{body}}} end</div>';

    const isEditorMode = command.contentType === 'editor';
    let subject = '';
    const content: string | IEmailBlock[] = command.content;
    const organization: OrganizationEntity | null = await this.organizationRepository.findById(command.organizationId);

    try {
      subject = await this.renderContent(command.subject, payload);
    } catch (e) {
      throw new ApiException(e?.message || `Message content could not be generated`);
    }

    if (!organization) throw new NotFoundException(`Organization ${command.organizationId} not found`);
    const templateVariables = {
      isEditorMode,
      body: '',
      blocks: isEditorMode ? content : [],
      branding: {
        logo: organization.branding?.logo,
        color: organization.branding?.color || '#f47373',
      },
      ...payload,
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
        customTemplate: layoutContent,
        data: templateVariables,
      })
    );

    return { html, subject };
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
}
