import { Injectable } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { format } from 'date-fns';
import * as fs from 'fs';
import { HandlebarHelpersEnum } from '@novu/shared';
import { CompileTemplateCommand } from './compile-template.command';

Handlebars.registerHelper(HandlebarHelpersEnum.EQUALS, function (arg1, arg2, options) {
  // eslint-disable-next-line eqeqeq
  return arg1 == arg2 ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper(HandlebarHelpersEnum.TITLECASE, function (value) {
  return value
    ?.split(' ')
    .map((letter) => letter.charAt(0).toUpperCase() + letter.slice(1).toLowerCase())
    .join(' ');
});

Handlebars.registerHelper(HandlebarHelpersEnum.UPPERCASE, function (value) {
  return value?.toUpperCase();
});

Handlebars.registerHelper(HandlebarHelpersEnum.LOWERCASE, function (value) {
  return value?.toLowerCase();
});

Handlebars.registerHelper(HandlebarHelpersEnum.PLURALIZE, function (number, single, plural) {
  return number === 1 ? single : plural;
});

Handlebars.registerHelper(HandlebarHelpersEnum.DATEFORMAT, function (date, dateFormat) {
  // Format date if parameters are valid
  if (date && dateFormat && !isNaN(Date.parse(date))) {
    return format(new Date(date), dateFormat);
  }

  return date;
});

const cache = new Map();

@Injectable()
export class CompileTemplate {
  async execute(command: CompileTemplateCommand): Promise<string> {
    let templateContent = cache.get(command.templateId);
    if (!templateContent) {
      templateContent = await this.loadTemplateContent('basic.handlebars');
      cache.set(command.templateId, templateContent);
    }

    if (command.templateId === 'custom') {
      templateContent = command.customTemplate;
    }

    const template = Handlebars.compile(templateContent);

    return template(command.data);
  }

  private async loadTemplateContent(name: string) {
    return new Promise<string>((resolve, reject) => {
      let path = '';
      if (!process.env.E2E_RUNNER) {
        path = '/src/app/content-templates/usecases/compile-template';
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
