import { ITemplate, ITriggerPayload } from './template.interface';

export class TemplateStore {
  private readonly templates: ITemplate[] = [];

  async addTemplate(template: ITemplate) {
    this.templates.push(template);
  }

  async getTemplateById(templateId: string) {
    return this.templates.find((template) => template.id === templateId);
  }

  async getTemplates() {
    return this.templates;
  }

  async getActiveMessages(template: ITemplate, data: ITriggerPayload) {
    const messages = [];

    for (const message of template.messages) {
      if (
        (!data.$providerId ||
          data.$providerId.indexOf(message.providerId) > -1) &&
        ((typeof message.active === 'boolean' && message.active) ||
          typeof message.active === 'undefined' ||
          (typeof message.active === 'function' &&
            (await message.active(data))))
      ) {
        messages.push(message);
      }
    }

    return messages;
  }
}
