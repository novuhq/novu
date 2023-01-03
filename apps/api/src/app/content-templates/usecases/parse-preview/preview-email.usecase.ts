import { Injectable } from '@nestjs/common';
import { IEmailBlock, OrganizationRepository, OrganizationEntity } from '@novu/dal';
import { CompileTemplate } from '../compile-template/compile-template.usecase';
import { CompileTemplateCommand } from '../compile-template/compile-template.command';
import { PreviewEmailCommand } from './preview-email.command';
import { ApiException } from '../../../shared/exceptions/api.exception';

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

    const isEditorMode = command.contentType === 'editor';
    let subject = '';
    let content: string | IEmailBlock[] = '';
    let organization: OrganizationEntity;

    try {
      [organization, content] = await Promise.all([
        this.organizationRepository.findById(command.organizationId),
        this.getContent(isEditorMode, command.content, payload),
      ]);

      subject = await this.renderContent(command.subject, payload);
    } catch (e) {
      throw new ApiException(e?.message || `Message content could not be generated`);
    }

    const html = await this.compileTemplate.execute(
      CompileTemplateCommand.create({
        templateId: isEditorMode ? 'basic' : 'custom',
        customTemplate: !isEditorMode ? (content as string) : undefined,
        data: {
          blocks: isEditorMode ? content : [],
          branding: {
            logo: organization.branding?.logo,
            color: organization.branding?.color || '#f47373',
          },
          ...payload,
        },
      })
    );

    return { html, subject };
  }

  private async getContent(
    isEditorMode,
    content: string | IEmailBlock[],
    payload: Record<string, unknown> = {}
  ): Promise<string | IEmailBlock[]> {
    if (isEditorMode && Array.isArray(content)) {
      content = [...content] as IEmailBlock[];
      for (const block of content) {
        block.content = await this.renderContent(block.content, payload);
        block.url = await this.renderContent(block.url || '', payload);
      }

      return content;
    }

    return content;
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

    return renderedContent.trim();
  }
}
