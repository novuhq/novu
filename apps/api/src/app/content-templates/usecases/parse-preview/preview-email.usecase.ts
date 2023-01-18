import { Injectable, NotFoundException } from '@nestjs/common';
import { IEmailBlock, OrganizationRepository, OrganizationEntity } from '@novu/dal';
import { CompileTemplate } from '../compile-template/compile-template.usecase';
import { CompileTemplateCommand } from '../compile-template/compile-template.command';
import { PreviewEmailCommand } from './preview-email.command';
import { ApiException } from '../../../shared/exceptions/api.exception';

const bodyContent = `{{#each blocks}}
                                    <div style="margin-bottom: 10px" data-test-id="block-item-wrapper">
                                      {{#equals type 'text'}}
                                        <div style="
                                                text-align: {{#if styles.textAlign}}{{styles.textAlign}}{{else}}left{{/if}};
                                        ">
                                          <div>
                                            <p>
                                              {{{content}}}
                                            </p>
                                          </div>
                                        </div>
                                      {{/equals}}
                                      {{#equals type 'button'}}
                                        <div>
                                          <div
                                            style="
                                                      font-family: inherit;
                                                      text-align: center;
                                                    "
                                          >
                                            <a style="
                                                        line-height: 30px;
                                                        display: inline-block;
                                                        font-weight: 400;
                                                        white-space: nowrap;
                                                        text-align: center;
                                                        border: 1px solid transparent;
                                                        height: 32px;
                                                        padding: 4px 15px;
                                                        font-size: 14px;
                                                        border-radius: 4px;
                                                        color: white;
                                                        background: {{#if ../branding.color}}{{../branding.color}}{{else}}#ff6f61{{/if}};
                                                        border-color: {{#if ../branding.color}}{{../branding.color}}{{else}}#ff6f61{{/if}};
                                                        text-decoration: none;
                                                      "
                                               href="{{url}}"
                                               target="_blank">
                                              {{content}}
                                            </a>
                                          </div>
                                        </div>
                                      {{/equals}}
                                    </div>
                                  {{/each}}`;

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
    let content: string | IEmailBlock[] = '';
    let layout = '';
    let organization: OrganizationEntity | null;

    try {
      [organization, content] = await Promise.all([
        this.organizationRepository.findById(command.organizationId),
        this.getContent(isEditorMode, command.content, payload),
      ]);

      subject = await this.renderContent(command.subject, payload);
      layout = await this.renderContent(
        layoutContent,
        payload,
        isEditorMode ? bodyContent : (content as string),
        content
      );
    } catch (e) {
      throw new ApiException(e?.message || `Message content could not be generated`);
    }

    if (!organization) throw new NotFoundException(`Organization ${command.organizationId} not found`);

    const html = await this.compileTemplate.execute(
      CompileTemplateCommand.create({
        templateId: isEditorMode ? 'basic' : 'custom',
        customTemplate: !isEditorMode ? (layout as string) : undefined,
        data: {
          blocks: isEditorMode ? content : [],
          branding: {
            logo: organization.branding?.logo,
            color: organization.branding?.color || '#f47373',
          },
          layout,
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

  private async renderContent(
    content: string,
    payload: Record<string, unknown>,
    extra?: string,
    blocks?: IEmailBlock[] | string
  ) {
    const renderedContent = await this.compileTemplate.execute(
      CompileTemplateCommand.create({
        templateId: 'custom',
        customTemplate: content,
        data: {
          body: extra,
          ...payload,
        },
      })
    );

    return renderedContent.trim();
  }
}
