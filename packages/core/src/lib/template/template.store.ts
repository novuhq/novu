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
      let active = true;
      if (message.active != null) {
        if (typeof message.active === 'boolean') {
          active = message.active;
        } else if (typeof message.active === 'function') {
          active = await message.active(data);
        }
      }

      if (active) {
        messages.push(message);
      }
    }

    return messages;
  }
}
