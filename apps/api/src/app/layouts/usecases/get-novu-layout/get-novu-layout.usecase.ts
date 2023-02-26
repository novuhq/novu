import { Injectable } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { GetNovuLayoutCommand } from './get-novu-layout.command';
import { ApiException } from '../../../shared/exceptions/api.exception';

@Injectable()
export class GetNovuLayout {
  async execute(command: GetNovuLayoutCommand): Promise<string> {
    const template = await this.loadTemplateContent('layout.handlebars');
    if (!template) throw new ApiException('Novu default template not found');

    return template;
  }

  private async loadTemplateContent(name: string) {
    let path = '';
    if (!process.env.E2E_RUNNER) {
      path = '/src/app/layouts/usecases/get-novu-layout';
    }
    const content = await readFile(`${__dirname}${path}/templates/${name}`);

    return content.toString();
  }
}
