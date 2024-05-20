import { Injectable } from '@nestjs/common';
import { readFile } from 'fs/promises';

import { GetNovuLayoutCommand } from './get-novu-layout.command';
import { ApiException } from '../../utils/exceptions';

@Injectable()
export class GetNovuLayout {
  async execute(command: GetNovuLayoutCommand): Promise<string> {
    const template = await this.loadTemplateContent('layout.handlebars');
    if (!template) throw new ApiException('Novu default template not found');

    return template;
  }

  private async loadTemplateContent(name: string) {
    const content = await readFile(`${__dirname}/templates/${name}`);

    return content.toString();
  }
}
