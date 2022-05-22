import { Injectable } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import { CompileTemplateCommand } from './compile-template.command';

Handlebars.registerHelper('equals', function (arg1, arg2, options) {
  // eslint-disable-next-line eqeqeq
  return arg1 == arg2 ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('titlecase', function (string) {
  return string
    .split(' ')
    .map((letter) => letter.charAt(0).toUpperCase() + letter.slice(1).toLowerCase())
    .join('');
});

Handlebars.registerHelper('uppercase', function (string) {
  return string.toUpperCase();
});

Handlebars.registerHelper('lowercase', function (string) {
  return string.toLowerCase();
});

Handlebars.registerHelper('pluralize', function (number, single, plural) {
  return number === 1 ? single : plural;
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
      fs.readFile(`${__dirname}/templates/${name}`, (err, content) => {
        if (err) {
          return reject(err);
        }

        return resolve(content.toString());
      });
    });
  }
}
