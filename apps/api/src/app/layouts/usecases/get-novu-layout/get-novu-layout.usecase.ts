import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
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
    return new Promise<string>((resolve, reject) => {
      let path = '';
      if (!process.env.E2E_RUNNER) {
        path = '/src/app/layouts/usecases/get-novu-layout';
      }
      fs.readFile(`${__dirname}${path}/templates/${name}`, (err, content) => {
        if (err) {
          return reject(err);
        }

        return resolve(content.toString());
      });
    });
  }
}
