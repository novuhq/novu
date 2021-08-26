import { ITemplate } from './template.interface';

export class TemplateStore {
  private readonly templates: ITemplate[] = [];

  async addTemplate(template: ITemplate) {
    this.templates.push(template);
  }

  async getTemplateById(templateId: string) {
    return this.templates.find((template) => template.id === templateId);
  }
}
